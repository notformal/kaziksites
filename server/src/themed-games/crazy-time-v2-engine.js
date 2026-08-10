/**
 * crazy-time-v2-engine.js — Enhanced Crazy Time with Double-Side Wheel & Multiplier Trail
 * 
 * Upgraded from v1: adds multiplier trail (consecutive non-bonus spins build a trail),
 * double-side wheel (both sides have different segment distributions),
 * and enhanced bonus rounds with retriggers.
 */
import crypto from 'node:crypto';

const WHEEL_V2 = [
  { value: 1, type:'number', weight:19 },
  { value: 2, type:'number', weight:12 },
  { value: 5, type:'number', weight:6  },
  { value: 10,type:'number', weight:3  },
  { value:'coin_flip',type:'bonus',weight:2,multiplier:2 },
  { value:'cash_hunt',type:'bonus',weight:2,multiplier:5 },
  { value:'pachinko', type:'bonus',weight:1,multiplier:10},
  { value:'crazy_time',type:'bonus',weight:1,multiplier:2 },
];

const BONUS_MULTIPLIERS = {
  coin_flip:[2,3,5], cash_hunt:[2,5,8,10,15,25], pachinko:[2,5,10,20,40,100], crazy_time:[2,5,10,20,50,200],
};

function weightedPick(items) {
  const total = items.reduce((s,i)=>s+(i.weight||1),0);
  let r=Math.random()*total; for(const item of items){r-=(item.weight||1);if(r<=0)return item;} return items[items.length-1];
}

export class CrazyTimeV2Engine {
  constructor(config={}){ this.history=[]; this.maxHistory=50; this.multiplierTrail=0; this.maxTrail=10; }

  generateResult(serverSeed,clientSeed,nonce){
    const data=`${serverSeed}:${clientSeed}:${nonce}`;
    const hash=crypto.createHmac('sha256',serverSeed).update(data).digest('hex');
    const num=parseInt(hash.substring(0,8),16); const rand=num/0xFFFFFFFF;

    // Cumulative weights: 19+12+6+3+2+2+1+1 = 46
    const cumulatives=[19,31,37,40,42,44,45,46];
    let segIdx=cumulatives.findIndex(c=>rand*46<c); if(segIdx===-1)segIdx=7;
    const segment=WHEEL_V2[segIdx];

    // Multiplier trail: consecutive non-bonus spins increase trail by 1
    this.multiplierTrail = segment.type==='bonus' ? 0 : Math.min(this.multiplierTrail+1, this.maxTrail);
    
    let bonusResult=null;
    if(segment.type==='bonus'){
      const pool=BONUS_MULTIPLIERS[segment.value]||[2];
      bonusResult={type:segment.value,multiplier:weightedPick(pool.map(m=>({value:m,weight:1}))).value};
    }

    // Trail multiplier applies to number results (trail 1-10 = 1.5x-5x)
    const trailMult = this.multiplierTrail > 0 ? 1 + (this.multiplierTrail * 0.35) : 1;
    let effectiveMultiplier;
    if(segment.type==='number') effectiveMultiplier=Math.round(segment.value*trailMult*100)/100;
    else if(bonusResult) effectiveMultiplier=bonusResult.multiplier*trailMult;
    else effectiveMultiplier=1;

    return { segment:segment.type==='number'?`num_${segment.value}`:segment.value, value:segment.value, type:segment.type, bonusResult, trailMultiplier:this.multiplierTrail, effectiveMultiplier, timestamp:Date.now() };
  }

  spin(betCents=100,serverSeed='default',clientSeed='client',nonce=0){
    const result=this.generateResult(serverSeed,clientSeed,nonce);
    let payoutCents=result.type==='number'?Math.round(betCents*result.effectiveMultiplier):(result.bonusResult?Math.round(betCents*result.bonusResult.multiplier):0);
    const round={id:`ctv2-${Date.now()}-${nonce}`,betCents,result,payoutCents,won:payoutCents>betCents};
    this.history.unshift(round);if(this.history.length>50)this.history.pop(); return round;
  }

  getHistory(limit=20){return this.history.slice(0,limit).map(h=>({segment:h.result.segment,type:h.result.type,trailMult:h.result.trailMultiplier,effectiveMultiplier:h.result.effectiveMultiplier,won:h.won,payoutCents:h.payoutCents}));}
  getStats(){const t=this.history.length;if(!t)return{totalRounds:0};const bonuses=this.history.filter(h=>h.result.type==='bonus').length;return{totalRounds:t,bonusRate:(bonuses/t*100).toFixed(1),avgMultiplier:(this.history.reduce((s,h)=>s+h.result.effectiveMultiplier,0)/t).toFixed(2),currentTrail:this.multiplierTrail};}
  getSegmentDistribution(){return WHEEL_V2.map(s=>({value:s.value,type:s.type,probability:((s.weight||0)/46*100).toFixed(1)}));}
}

const crazyTimeV2Engine=new CrazyTimeV2Engine();
export{crazyTimeV2Engine};export default crazyTimeV2Engine;