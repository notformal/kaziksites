import{HOST_MESSAGES,isMessage}from'./protocol.js';
export class GameSDK{
 constructor({parentOrigin,gameId}){if(!parentOrigin||parentOrigin==='*')throw new Error('exact parentOrigin required');this.origin=parentOrigin;this.gameId=gameId;this.pending=new Map;this.state=null;window.addEventListener('message',e=>this.receive(e))}
 start(){window.parent.postMessage({type:'GAME_READY',payload:{gameId:this.gameId}},this.origin)}
 receive(e){if(e.source!==window.parent||e.origin!==this.origin||!isMessage(e.data,HOST_MESSAGES))return;if(e.data.type==='INIT'){this.state=e.data.payload;window.dispatchEvent(new CustomEvent('game:init',{detail:this.state}))}const roundId=e.data.payload?.roundId;if(roundId&&this.pending.has(roundId)){this.pending.get(roundId)(e.data);this.pending.delete(roundId)}window.dispatchEvent(new CustomEvent(`game:${e.data.type.toLowerCase()}`,{detail:e.data.payload}))}
 placeBet(amount,roundId){return new Promise(resolve=>{this.pending.set(roundId,m=>resolve(m.type==='BET_APPROVED'?m.payload:false));window.parent.postMessage({type:'BET_PLACED',payload:{amount,gameId:this.gameId,roundId}},this.origin);setTimeout(()=>{if(this.pending.delete(roundId))resolve(false)},8000)})}
 requestSettlement(roundId){window.parent.postMessage({type:'ROUND_RESULT',payload:{gameId:this.gameId,roundId}},this.origin)}
 recoverRound(roundId){return new Promise(resolve=>{this.pending.set(roundId,m=>resolve(m.payload));window.parent.postMessage({type:'ROUND_STATUS_REQUEST',payload:{gameId:this.gameId,roundId}},this.origin);setTimeout(()=>{if(this.pending.delete(roundId))resolve({roundId,status:'unavailable',error:'timeout'})},8000)})}
}
