import crypto from 'node:crypto';

/**
 * Monopoly Live Engine — Evolution Gaming Game Show
 * Main money wheel (54 segments) + 3 bonus rounds:
 *   Cash Bowl, Roll Up, Rich Revival
 */

function uuid() { return crypto.randomBytes(16).toString('hex'); }
function randomFloat(min, max) { return Math.random() * (max - min) + min; }

const WHEEL_SEGMENTS = [
  ...Array(23).fill({ type: 'number', value: 1, multiplier: 1 }),
  ...Array(7).fill({ type: 'number', value: 2, multiplier: 2 }),
  ...Array(13).fill({ type: 'number', value: 5, multiplier: 5 }),
  ...Array(6).fill({ type: 'number', value: 10, multiplier: 10 }),
  { type: 'bonus', name: 'cash_bowl', multiplier: 2 },
  { type: 'bonus', name: 'roll_up', multiplier: 2 },
  { type: 'bonus', name: 'rich_revival', multiplier: 2 },
];

const BONUS_CONFIG = {
  cash_bowl: { name: 'Cash Bowl', icon: '\ud83d\udcb0', description: 'Roll dice on cash board for multipliers', maxMultiplier: 100 },
  roll_up: { name: 'Roll Up', icon: '\u2b50', description: 'Collect multiplier stars by rolling dice', maxMultiplier: 200 },
  rich_revival: { name: 'Rich Revival', icon: '\ud83c\udfe0', description: 'Giant Monopoly board with properties and Chance cards', maxMultiplier: 500 },
};

const BET_TYPES = [
  { id: 'number_1', label: 'x1', payout: 1, color: '#f5f5dc' },
  { id: 'number_2', label: 'x2', payout: 2, color: '#4a90d9' },
  { id: 'number_5', label: 'x5', payout: 5, color: '#e8751a' },
  { id: 'number_10', label: 'x10', payout: 10, color: '#8b5cf6' },
  { id: 'bonus_cash_bowl', label: 'Cash Bowl', payout: 2, color: '#22c55e' },
  { id: 'bonus_roll_up', label: 'Roll Up', payout: 2, color: '#ec4899' },
  { id: 'bonus_rich_revival', label: 'Rich Revival', payout: 2, color: '#eab308' },
];

// Monopoly board properties
const MONOPOLY_PROPERTIES = [
  { name: 'Mediterranean Ave', value: 60 },
  { name: 'Baltic Ave', value: 60 },
  { name: 'Oriental Ave', value: 100 },
  { name: 'Vermont Ave', value: 100 },
  { name: 'Connecticut Ave', value: 120 },
  { name: 'St. Charles Place', value: 140 },
  { name: 'States Ave', value: 140 },
  { name: 'Virginia Ave', value: 160 },
  { name: 'St. James Place', value: 180 },
  { name: 'Tennessee Ave', value: 180 },
  { name: 'New York Ave', value: 200 },
  { name: 'Kentucky Ave', value: 220 },
  { name: 'Indiana Ave', value: 220 },
  { name: 'Illinois Ave', value: 240 },
  { name: 'Atlantic Ave', value: 260 },
  { name: 'Ventnor Ave', value: 260 },
  { name: 'Water Works', value: 150 },
  { name: 'Marvin Garden', value: 280 },
  { name: 'Pacific Ave', value: 300 },
  { name: 'North Carolina Ave', value: 300 },
  { name: 'Pennsylvania Ave', value: 320 },
  { name: 'Short Line', value: 200 },
  { name: 'Park Place', value: 350 },
  { name: 'Boardwalk', value: 400 },
];

const CHANCE_CARDS = [
  { text: 'Advance to Boardwalk', action: 'move', target: 39 },
  { text: 'Bank error in your favor. Collect $200', action: 'cash', value: 200 },
  { text: 'Advance to Go (Collect $200)', action: 'go' },
  { text: 'Go to Jail. Go directly to Jail.', action: 'jail' },
  { text: 'Your building loan matures. Collect $150', action: 'cash', value: 150 },
  { text: 'Advance to Illinois Ave', action: 'move', target: 24 },
  { text: 'Take a trip to Reading Railroad', action: 'move', target: 5 },
  { text: 'Pay poor tax of $150', action: 'pay', value: 150 },
  { text: 'Advance to St. Charles Place', action: 'move', target: 11 },
  { text: 'Get Out of Jail Free card', action: 'jailfree' },
];

class MonopolyLiveEngine {
constructor() { this.sessions = new Map(); this.history = []; this.stats = { totalSpins: 0, bonusHits: 0 }; }
createSession(userId) { const sid=`ml_${userId}_${uuid().slice(0,8)}`; this.sessions.set(sid,{id:sid,userId,bets:[],balance:10000,currentSpin:null,roundNumber:1}); return {success:true,sessionId:sid}; }
placeBet(sessionId,betTypeId,amount) { const s=this.sessions.get(sessionId); if(!s||s.currentSpin)return{error:'Session not found'}; if(amount<=0||amount>s.balance)return{error:'Invalid amount'}; const bt=BET_TYPES.find(b=>b.id===betTypeId); if(!bt)return{error:'Unknown bet type'}; s.bets.push({id:uuid().slice(0,12),betTypeId,label:bt.label,payout:bt.payout,amount,status:'pending'}); return {success:true,bets:s.bets}; }
clearBets(sessionId) { const s=this.sessions.get(sessionId); if(!s)return{error:'Session not found'}; s.bets.forEach(b=>{s.balance+=b.amount}); s.bets=[]; return {success:true,balance:s.balance}; }
spin(sessionId) { const s=this.sessions.get(sessionId); if(!s||s.bets.length===0)return{error:'No bets placed'}; const hash=crypto.randomBytes(32).toString('hex'); const segIdx=parseInt(hash.slice(0,8),16)%WHEEL_SEGMENTS.length; const resultSeg=WHEEL_SEGMENTS[segIdx]; s.currentSpin={id:uuid().slice(0,12),roundNumber:s.roundNumber++,hash,segIdx,resultSeg,timestamp:new Date().toISOString(),bets:[...s.bets]}; const totalPayout=this.calcPayouts(s.currentSpin); s.balance+=totalPayout-s.bets.reduce((sum,b)=>sum+b.amount,0); this.stats.totalSpins++; if(resultSeg.type==='bonus')this.stats.bonusHits++; const spinResult={...s.currentSpin,totalPayout,balance:s.balance}; this.history.unshift(spinResult); if(this.history.length>100)this.history.pop(); return {success:true,spin:spinResult}; }
calcPayouts(spin) { let total=0; const seg=spin.resultSeg; for(const bet of spin.bets){if(bet.status!=='pending')continue; let won=false,winAmt=0;if(seg.type==='number'){const map={number_1:1,number_2:2,number_5:5,number_10:10};if(map[bet.betTypeId]===seg.value){won=true;winAmt=bet.amount*seg.multiplier}}else if(seg.type==='bonus'){if(bet.betTypeId===`bonus_${seg.name}`){won=true;winAmt=bet.amount*seg.multiplier}}if(won){total+=winAmt;bet.status='won';bet.winAmount=winAmt}else{bet.status='lost'}}return total; }
playBonus(bonusName,baseMultiplier) { const cfg=BONUS_CONFIG[bonusName]; if(!cfg)return{error:'Unknown bonus'}; let result={}; switch(bonusName){case 'cash_bowl':result=this._playCashBowl(baseMultiplier);break;case 'roll_up':result=this._playRollUp(baseMultiplier);break;case 'rich_revival':result=this._playRichRevival(baseMultiplier);break;} return {bonus:bonusName,...cfg,baseMultiplier,result,finalMultiplier:(baseMultiplier||2)*result.multiplier,timestamp:new Date().toISOString()}; }
_playCashBowl(bm) { const bowls=[]; for(let i=0;i<9;i++){const r=Math.random();let mult;if(r<0.3)mult=[2,4][Math.floor(Math.random()*2)];else if(r<0.6)mult=[6,10][Math.floor(Math.random()*2)];else if(r<0.85)mult=[20,50][Math.floor(Math.random()*2)];else mult=[75,100][Math.floor(Math.random()*2)]; bowls.push({id:i+1,multiplier:mult,revealed:false});} const picked=Math.floor(Math.random()*9); bowls[picked].revealed=true; return {type:'cash_bowl',bowls,selected:picked,multiplier:bowls[picked].multiplier}; }
_playRollUp(bm) { const d1=Math.floor(Math.random()*6)+1,d2=Math.floor(Math.random()*6)+1,total=d1+d2;const starMults=[5,8,10,15,20,25,30,40,50,75,100,150,200];let stars=[]; for(let i=0;i<total&&i<starMults.length;i++)stars.push({step:i+1,multiplier:starMults[i],active:true}); return {type:'roll_up',dice:[d1,d2],totalRoll:total,stars,finalMultiplier:starMults[Math.min(total-1,starMults.length-1)]}; }
_playRichRevival(bm) { const board=Array(40).fill(null); for(let i=2;i<40;i+=Math.floor(Math.random()*3)+1){if(i<MONOPOLY_PROPERTIES.length)board[i]={type:'property',name:MONOPOLY_PROPERTIES[i].name,value:MONOPOLY_PROPERTIES[i].value};} const playerPos=Math.floor(Math.random()*40);const chanceIdx=Math.floor(Math.random()*CHANCE_CARDS.length);const chanceCard=CHANCE_CARDS[chanceIdx];let mult;if(Math.random()<0.2)mult=[5,10][Math.floor(Math.random()*2)];else if(Math.random()<0.4)mult=[20,30][Math.floor(Math.random()*2)];else if(Math.random()<0.6)mult=[50,75][Math.floor(Math.random()*2)];else if(Math.random()<0.85)mult=100;else mult=[200,300,500][Math.floor(Math.random()*3)]; return {type:'rich_revival',board,playerPos,chanceCard,multiplier:mult,collectedProperties:Math.floor(Math.random()*8)}; }
getBetTypes(){return BET_TYPES;} getWheelSegments(){return WHEEL_SEGMENTS;} getBonusConfig(){return BONUS_CONFIG;} getSession(sid){return this.sessions.get(sid)||null;} getHistory(limit=20){return this.history.slice(0,limit);} getStats(){return{...this.stats};}
}

export {MonopolyLiveEngine};
export default MonopolyLiveEngine;
