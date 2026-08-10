/** Sports Betting Bot System — simulates real bettor behavior */
import crypto from 'node:crypto';
const SPORTS_EVENTS = [
  { sport:'Football',league:'NFL',home:'Kansas City Chiefs',away:'Buffalo Bills',moneylineHome:-140,moneylineAway:+120,spread:'-2.5',total:'47.5' },
  { sport:'Basketball',league:'NBA',home:'LA Lakers',away:'Boston Celtics',moneylineHome:-115,moneylineAway:-105,spread:'-1.5',total:'225.5' },
  { sport:'Soccer',league:'Premier League',home:'Manchester City',away:'Liverpool',moneylineHome:-80,moneylineAway:+190,spread:'0',total:'2.5' },
  { sport:'Hockey',league:'NHL',home:'Edmonton Oilers',away:'Colorado Avalanche',moneylineHome:-130,moneylineAway:+110,spread:'-1.5',total:'6.5' },
  { sport:'Tennis',league:'ATP Finals',home:'Djokovic N.',away:'Alcaraz C.',moneylineHome:-175,moneylineAway:+150,spread:'-3.5',total:'22.5' },
];
const BET_TYPES = ['moneyline','spread','total'];
function rand(a,b){return Math.random()*(b-a)+a}
function randInt(a,b){return Math.floor(rand(a,b+1))}
function pick(a){return a[randInt(0,a.length-1)]}
function genBotName(){const p=['Lucky','Gold','Pro','Ace','Mega','Win'],s=['Bet','Winner','King','Gamer'];return`${pick(p)}${pick(s)}${randInt(1,999)}`}

class SportsBettingBot {
  constructor(){
    this.id=`sport_bot_${crypto.randomBytes(6).toString('hex')}`;
    this.name=genBotName();
    const profiles=[{profile:'casual',bb:[500,5000]},{profile:'regular',bb:[5000,50000]},{profile:'highRoller',bb:[50000,500000]}];
    const bk=pick(profiles);this.profile=bk.profile;this.balance=rand(bk.bb[0],bk.bb[1]);
    this.betRange=[rand(500,2000),rand(2000,20000)];this.totalBet=0;this.totalWin=0;
    this.betsPlaced=0;this.activeBets=[];this.lastBetTime=Date.now()-randInt(5000,60000);
    this.winStreak=0;this.lossStreak=0;this.isOnline=true;this.favSport=pick(['Football','Basketball','Soccer']);this.mood='neutral';
  }
  shouldBetNow(){return Date.now()>this.lastBetTime+randInt(30000,180000)}
  placeBet(event){
    const bt=pick(BET_TYPES),isHome=Math.random()>0.5;let sel='',odds=1.91;
    if(bt==='moneyline'){sel=isHome?event.home:event.away;const ml=isHome?event.moneylineHome:event.moneylineAway;odds=ml>0?(ml/100)+1:(100/Math.abs(ml))+1}
    else{sel=isHome?`${event.home}`:`${event.away}`+(bt==='spread'?` ${event.spread}`:' Over')}
    const betSize=randInt(this.betRange[0],this.betRange[1]);
    let finalBet=betSize;if(this.mood==='hot')finalBet=Math.min(betSize*2,this.balance*.1);if(this.mood==='cold')finalBet=Math.floor(betSize*.5);
    const willWin=Math.random()<(.4+odds/50);const win=willWin?Math.floor(finalBet*odds):0;
    this.balance+=win-finalBet;this.totalBet+=finalBet;this.totalWin+=win;this.betsPlaced++;this.lastBetTime=Date.now();
    if(willWin){this.winStreak++;this.lossStreak=0;if(this.winStreak>=3)this.mood='hot';else if(this.winStreak>=2)this.mood='neutral'}
    else{this.lossStreak++;this.winStreak=0;if(this.lossStreak>=4)this.mood='cold';else this.mood='cautious'}
    return{botId:this.id,botName:this.name,event,betType:bt,selection:sel,betSize:finalBet,odds,potentialWin:win,won:willWin,timestamp:Date.now()};
  }
  getSummary(){return{id:this.id,name:this.name,avatar:pick(['🎰','🎲','⚽','🏀','🏈']),profile:this.profile,balance:this.balance/100,totalBet:this.totalBet/100,totalWin:this.totalWin/100,betsPlaced:this.betsPlaced,mood:this.mood}}
}

class SportsBettingBotManager {
  constructor({maxBots=50,tickInterval=8000}={}){this.maxBots=maxBots;this.tickInterval=tickInterval;this.bots=new Map();this.betFeed=[];this.stats={totalSportsBets:0,totalSportsWinnings:0};this.isRunning=false;this.tickTimer=null}
  start(){if(this.isRunning)return;this.isRunning=true;for(let i=0;i<Math.min(20,this.maxBots);i++)this.bots.set(`sport_${crypto.randomBytes(6).toString('hex')}`,new SportsBettingBot());this.tickTimer=setInterval(()=>this.tick(),this.tickInterval)}
  stop(){this.isRunning=false;if(this.tickTimer){clearInterval(this.tickTimer);this.tickTimer=null}}
  tick(){for(const[id,b]of this.bots){if(b.balance<1000&&b.betsPlaced>5){b.balance=rand(20000,100000);b.mood='cautious'}if(!b.isOnline&&Date.now()-b.lastBetTime>3600000)this.bots.delete(id)}
    const oc=this.getOnlineCount();if(oc<this.maxBots*.7)for(let i=0;i<Math.min(3,this.maxBots-oc);i++){const b=new SportsBettingBot();this.bots.set(b.id,b)}
    for(const bot of this.bots.values()){if(!bot.isOnline||!bot.shouldBetNow()||bot.balance<500)continue;const ev=pick(SPORTS_EVENTS.filter(e=>e.sport===bot.favSport||Math.random()>.7));if(ev){const r=bot.placeBet(ev);this.betFeed.push(r);this.stats.totalSportsBets+=r.betSize;this.stats.totalSportsWinnings+=r.potentialWin;if(this.betFeed.length>100)this.betFeed=this.betFeed.slice(-50)}}}
  getOnlineCount(){return this.bots.size}getAllBots(){return Array.from(this.bots.values()).map(b=>b.getSummary())}getRecentBets(l=20){return[...this.betFeed].reverse().slice(0,l)}getStats(){return{...this.stats,onlineBots:this.getOnlineCount(),totalBots:this.bots.size,feedSize:this.betFeed.length}}
}

export{SportsBettingBotManager,SportsBettingBot,SPORTS_EVENTS};export default SportsBettingBotManager;
