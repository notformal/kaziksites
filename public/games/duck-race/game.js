/** DUCK RACE - KazikSites | Inspired by 155.io */
const canvas=document.getElementById("dr-canvas");const ctx=canvas.getContext("2d");
let balance=10000,betAmount=10;let running=false,finished=false,winner=null;
let ducks=[],progress={};let selectedDuck=-1;
const duckColors=["#fbbf24","#ef4444","#3b82f6","#22c55e","#a855f7","#ec4896"];
const duckEmojis=["🦆","🐤","🐣","🌟","💎","⭐"];

function resize(){const w=canvas.parentElement.clientWidth,h=Math.min(w*0.6,350);canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;canvas.style.width=w+"px";canvas.style.height=h+"px"}
resize();window.addEventListener("resize",resize);

function initDucks(){ducks=[];for(let i=0;i<6;i++){ducks.push({id:i,color:duckColors[i],emoji:duckEmojis[i],y:35+i*42,progress:0,speed:Math.random()*0.004+0.001,done:false})}}
initDucks();

function drawScene(){const w=canvas.width/devicePixelRatio,h=canvas.height/devicePixelRatio;
ctx.fillStyle="#0a2e27";ctx.fillRect(0,0,w,h);
for(let i=0;i<6;i++){const y=35+i*42;ctx.strokeStyle="rgba(255,255,255,.1)";ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.setLineDash([]);
const fx=w-30;ctx.strokeStyle="#fbbf24";ctx.lineWidth=3;ctx.setLineDash([6,3]);ctx.beginPath();ctx.moveTo(fx,10);ctx.lineTo(fx,h-10);ctx.stroke();ctx.setLineDash([]);
ducks.forEach((d,i)=>{const dx=10+d.progress*(w-50),dy=d.y+10;
ctx.fillStyle=d.color;ctx.globalAlpha=d.done?0.3:1;ctx.beginPath();ctx.arc(dx,dy,13,0,Math.PI*2);ctx.fill();ctx.font="16px serif";ctx.textAlign="center";ctx.fillText(d.emoji,dx,dy+5);
if(d.id===selectedDuck){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(dx,dy,17,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1});
if(winner!==null){const wd=ducks[winner];ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(w/2-90,h/2-25,180,50);ctx.font="bold 18px Poppins";ctx.fillStyle="#fbbf24";ctx.textAlign="center";ctx.fillText("Winner #"+(winner+1)+"!",w/2,h/2+7)}}

function animate(){if(!running)return;ducks.forEach((d,i)=>{if(!d.done){d.progress+=d.speed;if(d.progress>=1){d.done=true;if(winner===null)winner=i}}});
if(ducks.every(d=>d.done))finished=true;drawScene();requestAnimationFrame(animate)}

canvas.addEventListener("click",(e)=>{if(running)return;const rect=canvas.getBoundingClientRect();const my=e.clientY-rect.top;for(let i=0;i<6;i++){const dy=35+i*42+10;if(Math.abs(my-dy)<20)selectedDuck=i}});

document.getElementById("dr-action").addEventListener("click",()=>{if(selectedDuck<0){alert("Click a duck first!");return}betAmount=Math.min(balance,parseInt(document.getElementById("dr-bet").value)||10);
if(betAmount<1||betAmount>balance)return;balance-=betAmount;document.getElementById("dr-bal").textContent="$"+balance.toFixed(2);running=true;finished=false;winner=null;progress={};ducks.forEach(d=>{d.progress=0;d.done=false});
const sel=ducks[selectedDuck];const statusEl=document.getElementById("dr-status");statusEl.textContent="Race started! Go 🦆";animate()});