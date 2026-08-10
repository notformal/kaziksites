/** FOOTFALL - KazikSites | Inspired by 155.io concept */
const canvas=document.getElementById("ff-canvas");
const ctx=canvas.getContext("2d");
let balance=10000,betAmount=10,currentMult=1.00,speed=0.003;
let running=false,crashPoint=1,t0=0;
let playerOut=false,crashed=false;

const botNames=["LuckyKing","WinMaster","GoldPlayer","ProGamer","RoyalAce","MegaChaser"];
const avatars=["🎰","🎲","🃏","⚡","🔥","💎"];
const bots=[];
for(let i=0;i<6;i++){
  bots.push({n:botNames[i],a:avatars[i],bet:Math.floor(Math.random()*50+10)*100,coAt:(Math.random()*3+1.2).toFixed(2),out:false,won:0,lost:false});
}

const balEl=document.getElementById("ff-bal");
const statusEl=document.getElementById("ff-status");
const betInput=document.getElementById("ff-bet");
const actionBtn=document.getElementById("ff-action");

function genCrash(){return Math.max(1,(0.96/(Math.random())))}

function resize(){
  const w=canvas.parentElement.clientWidth,h=Math.min(w*0.6,350);
  canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;
  canvas.style.width=w+"px";canvas.style.height=h+"px";
}
resize();window.addEventListener("resize",resize);

function drawScene(){
  const w=canvas.width/devicePixelRatio,h=canvas.height/devicePixelRatio;
  const g=ctx.createLinearGradient(0,0,0,h);
  if(!crashed&&!playerOut){g.addColorStop(0,"#0a0e27");g.addColorStop(1,"#1a1040")}
  else if(crashed){g.addColorStop(0,"#1a0505");g.addColorStop(1,"#3a0a0a")}
  else{g.addColorStop(0,"#0a1a27");g.addColorStop(1,"#104030")}
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.fillStyle="rgba(255,255,255,.03)";
  for(let i=0;i<15;i++){const bw=20+Math.sin(i*2)*30,bh=40+Math.abs(Math.cos(i*3))*80;ctx.fillRect(20+i*(w/15),h-60-bh,bw,bh)}
  ctx.strokeStyle="rgba(255,255,255,.1)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,h-60);ctx.lineTo(w,h-60);ctx.stroke();
  if(currentMult>=crashPoint*0.9&&!crashed&&!playerOut){const pa=(Math.sin(Date.now()/150)+1)/2*0.3;ctx.fillStyle="rgba(239,68,68,"+pa+")";ctx.fillRect(0,0,w,h)}
}

function drawBots(){
  const y=canvas.height/devicePixelRatio-35;
  bots.forEach((b,i)=>{const x=15+(i%3)*140,row=Math.floor(i/3),by=y+row*26;ctx.font="bold 11px Inter";ctx.fillStyle="#64748b";ctx.textAlign="left";ctx.fillText(b.a+" "+b.n,x,by-8);
    if(b.out){ctx.fillStyle="#22c55e";ctx.fillText("+$"+(b.won/100).toFixed(2)+"@"+b.coAt+"x",x+2,by+8)}
    else if(b.lost){ctx.fillStyle="#ef4444";ctx.fillText("-$"+(b.bet/100).toFixed(2),x+2,by+8)}
    else{ctx.fillStyle="#94a3b8";ctx.fillText("$"+(b.bet/100).toFixed(2)+" bet",x+2,by+8)}});
}

function addToHistory(mult,won){
  const el=document.getElementById("ff-history-items");
  if(el.children[0]&&el.children[0].textContent==="History will appear here")el.innerHTML="";
  const s=document.createElement("span");s.className=mult>=3?"h-item win":(mult>=1.5?"h-item mid":"h-item loss");s.textContent=mult.toFixed(2)+"x";el.prepend(s);if(el.children.length>8)el.removeChild(el.lastChild);
}

function startRound(){
  betAmount=Math.min(balance,parseInt(betInput.value)||10);
  if(betAmount<1||betAmount>balance){statusEl.textContent="Insufficient balance";return}
  balance-=betAmount;balEl.textContent="$"+balance.toFixed(2);playerOut=false;crashed=false;currentMult=1.00;crashPoint=genCrash();t0=Date.now();actionBtn.className="bp cashout";actionBtn.textContent="CASH OUT";statusEl.textContent="Multiplier climbing...";bots.forEach(b=>{b.out=false;b.lost=false});running=true;animate();
}

function doCashOut(){if(!running||playerOut)return;playerOut=true;const winAmt=Math.floor(betAmount*currentMult);balance+=winAmt;balEl.textContent="$"+balance.toFixed(2);addToHistory(currentMult,true);}

function doCrash(){running=false;crashed=true;statusEl.textContent="FOOTFALL! Crashed @ "+currentMult.toFixed(2)+"x";actionBtn.className="bp";actionBtn.textContent="NEXT ROUND (Auto)";bots.forEach(b=>{if(!b.out)b.lost=true});addToHistory(currentMult,false);}

function animate(){
  if(!running)return;const el=(Date.now()-t0)/1000;currentMult=Math.pow(Math.E,speed*el*el);
  bots.forEach(b=>{if(!b.out&&!b.lost&&currentMult>=parseFloat(b.coAt)){b.out=true;b.won=Math.floor(b.bet*parseFloat(b.coAt))}});
  if(currentMult>=crashPoint){currentMult=crashPoint;doCrash();return}
  drawScene();drawBots();
  if(playerOut){statusEl.textContent="✓ Cashed out @ "+currentMult.toFixed(2)+"x!";statusEl.className="status win"}else if(crashed)statusEl.className="status loss";
  requestAnimationFrame(animate);
}

actionBtn.addEventListener("click",()=>{if(running&&!playerOut)doCashOut();else startRound()});
