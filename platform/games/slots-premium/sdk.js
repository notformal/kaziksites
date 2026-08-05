export class CasinoBridge{
  constructor(gameId){
    this.gameId=gameId;
    this.origin=new URLSearchParams(location.search).get('parentOrigin')||location.origin;
    this.pending=new Map();this.balance=0;
    addEventListener('message',event=>{
      if(event.source!==parent||event.origin!==this.origin||!event.data?.type)return;
      const payload=event.data.payload||{};
      if(event.data.type==='INIT'||event.data.type==='BALANCE_UPDATE'){
        this.balance=Number(payload.balance)||0;
        dispatchEvent(new CustomEvent('casino:balance',{detail:payload}));
      }
      if(payload.roundId&&this.pending.has(payload.roundId))this.pending.get(payload.roundId)(event.data);
    });
  }
  start(){parent.postMessage({type:'GAME_READY',payload:{gameId:this.gameId}},this.origin)}
  send(type,payload){parent.postMessage({type,payload:{gameId:this.gameId,...payload}},this.origin)}
  wait(roundId,types,timeout=10000){return new Promise(resolve=>{
    const timer=setTimeout(()=>{this.pending.delete(roundId);resolve(null)},timeout);
    this.pending.set(roundId,message=>{if(!types.includes(message.type))return;clearTimeout(timer);this.pending.delete(roundId);resolve(message)});
  })}
  async bet(amount,roundId){this.send('BET_PLACED',{amount,roundId});return this.wait(roundId,['BET_APPROVED','BET_REJECTED'])}
  async settle(roundId){this.send('ROUND_RESULT',{roundId});return this.wait(roundId,['ROUND_SETTLED','BET_REJECTED'])}
  async bonusSpin(sessionId,roundId){this.send('BONUS_SPIN',{sessionId,roundId});return this.wait(roundId,['BONUS_SETTLED','BET_REJECTED'])}
}
