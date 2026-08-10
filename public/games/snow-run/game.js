/** SNOW RUN - KazikSites | Inspired by 155.io concept */
const canvas=document.getElementById("sr-canvas");const ctx=canvas.getContext("2d");
let balance=10000,betAmount=10;let running=false,mult=1.00;
let skiers=[],startTime=0,crashMult=0,currentSkier=-1;

function resize(){const w=canvas.parentElement.clientWidth,h=Math.min(w*0.6,350);canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;canvas.style.width=w+"px";canvas.style.height=h+"px"}
resize();window.addEventListener("resize",resize);

function genCrash(){return Math.max(1.1,(0.95/(Math.random()-0.02)))}

function drawScene(){const w=canvas.width/devicePixelRatio,h=canvas.height/devicePixelRatio;
ctx.fillStyle="#e8f0fe";ctx.fillRect(0,0,w,h);
ctx.fillStyle="#b0c4de";ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(w*0.15,h-120);ctx.lineTo(w*0.3,h);ctx.fill();
ctx.fillStyle="#a0b0c8";ctx.beginPath();ctx.moveTo(w*0.6,0);ctx.lineTo(w*0.75,h-140);ctx.lineTo(w,0);ctx.fill();
ctx.fillStyle="rgba(255,255,255,.3)";ctx.beginPath();ctx.moveTo(w/2-40,h);ctx.quadraticCurveTo(w/2-60,h/2,w/2,h*0.3);ctx.lineTo(w/2+40,h*0.3);ctx.quadraticCurveTo(w/2+60,h/2,w/2+20,h);ctx.fill();
if(currentSkier>=0){const sk=skiers[currentSkier];const sx=w/2+Math.sin(sk.y*0.05)*30,sy=h-sk.y;
ctx.fillStyle=sk.color;ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.fill();ctx.font="14px serif";ctx.textAlign="center";ctx.fillText("⛷",sx,sy+4)}
ctx.fillStyle="rgba(0,0,0,.4)";ctx.fillRect(w/2-60,h/2-30,120,60);ctx.font="bold 28px Poppins";ctx.textAlign="center";ctx.fillStyle=mult>crashMult*0.9?"#ef4444":"#fbbf24";ctx.fillText(mult.toFixed(2)+"x",w/2,h/2+8)}

function animate(){if(!running)return;const el=(Date.now()-startTime)/1000;mult=Math.pow(Math.E,0.008*el*el);skiers.forEach((s,i)=>{s.y+=s.speed*(mult-1)*5});
const statusEl=document.getElementById("sr-status");statusEl.textContent="Run! Cash out before crash!";
if(mult>=crashMult){running=false;statusEl.textContent="Crashed @ "+mult.toFixed(2)+"x!";statusEl.className="status loss";document.getElementById("sr-action").className="bp";document.getElementById("sr-action").textContent="RACE AGAIN";return}drawScene();requestAnimationFrame(animate)}

document.getElementById("sr-action").addEventListener("click",()=>{betAmount=Math.min(balance,parseInt(document.getElementById("sr-bet").value)||10);
if(betAmount<1||betAmount>balance)return;balance-=betAmount;document.getElementById("sr-bal").textContent="$"+balance.toFixed(2);running=true;mult=1.00;crashMult=genCrash();startTime=Date.now();skiers=[];const colors=["#ef4444","#3b82f6","#22c55e","#a855f7","#fbbf24"];for(let i=0;i<5;i++)skiers.push({y:Math.random()*20-10,speed:Math.random()*0.03+0.02,color:colors[i],done:false});currentSkier=skiers.length>0?0:-1;
document.getElementById("sr-action").className="bp cashout";document.getElementById("sr-action").textContent="CASH OUT";document.getElementById("sr-status").textContent="Race started! ⛷";animate()});