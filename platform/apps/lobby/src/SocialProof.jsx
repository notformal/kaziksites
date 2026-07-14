import React,{useEffect,useState}from"react";
import{Activity,Trophy}from"lucide-react";
import{api}from"./api";
import{games}from"./catalog";
import"./social-proof.css";

const labels=new Map(games.map(g=>[g.id,g.title]));
export default function SocialProof(){
 const[period,setPeriod]=useState("daily"),[activity,setActivity]=useState(null),[board,setBoard]=useState(null);
 useEffect(()=>{let live=true;api.socialActivity().then(x=>live&&setActivity(x)).catch(()=>live&&setActivity({available:false,games:[]}));return()=>{live=false}},[]);
 useEffect(()=>{let live=true;setBoard(null);api.leaderboard(period).then(x=>live&&setBoard(x)).catch(()=>live&&setBoard({available:false,entries:[]}));return()=>{live=false}},[period]);
 return <section className="socialProof" id="community" aria-labelledby="community-title">
  <div className="sectionHead"><div><span className="eyebrow">REAL COMMUNITY ACTIVITY</span><h2 id="community-title">Played here. Counted here.</h2></div><p>Aggregated virtual-credit play only. No cash prizes, purchased credits or invented activity.</p></div>
  <div className="socialColumns">
   <article className="activityPanel"><header><Activity/><div><b>Last 24 hours</b><small>Shown after 3 unique players</small></div></header>
    {activity?.available?<><div className="activityTotals"><strong>{activity.rounds.toLocaleString()}</strong><span>settled rounds</span><strong>{activity.players}</strong><span>anonymous players</span></div><ul>{activity.games.map(g=><li key={g.gameId}><span>{labels.get(g.gameId)||g.gameId}</span><b>{g.rounds} rounds</b></li>)}</ul></>:<p className="privateEmpty">Activity appears when the privacy threshold is reached.</p>}
   </article>
   <article className="leaderPanel"><header><Trophy/><div><b>Virtual-credit leaderboard</b><small>Anonymous · entertainment only</small></div></header>
    <div className="periodTabs" role="group" aria-label="Leaderboard period">{[["daily","Today"],["weekly","7 days"],["all-time","All time"]].map(([id,label])=><button key={id} className={period===id?"active":""} onClick={()=>setPeriod(id)}>{label}</button>)}</div>
    {board?.available?<ol>{board.entries.slice(0,5).map(x=><li key={x.alias}><i>{x.rank}</i><span>{x.alias}<small>{x.rounds} settled rounds</small></span><b>{x.creditsWon.toLocaleString()} cr</b></li>)}</ol>:<p className="privateEmpty">Leaderboard appears after 3 anonymous players settle rounds in this period.</p>}
   </article>
  </div>
 </section>
}
