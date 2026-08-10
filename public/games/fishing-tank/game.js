/** FISHING TANK - KazikSites | Inspired by 155.io concept */
const canvas=document.getElementById("ft-canvas");const ctx=canvas.getContext("2d");
let balance=10000,betAmount=10;let running=false,mult=1.00,fish=[],sharkX=-1,sharkActive=false;
let startTime=0,crashMult=0;
function resize(){const w=canvas.parentElement.clientWidth,h=Math.min(w*0.6,350);canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;canvas.style.width=w+"px";canvas.style.height=h+"px"}
resize();window.addEventListener("resize",resize);
function genCrash(){return Math.max(1.1,(0.94/(Math.random()-0.02)))}
const fishEmojis=["🐟","🐠","🐡","🦈","🐙","🐚"],fishColors=["#3b82f6","#fbbf24","#f97316","#ef4444","#a855f7","#ec4899"];
function initFish(){fish=[];for(let i=0;i<8;i++)fish.push({x:Math.random()*400,y:30+Math.random()*200,speed:Math.random()*1.5+0.5,emoji:fishEmojis[i%6],color:fishColors[i%6],size:12+Math.random()*8})}
initFish();
function drawScene(){const w=canvas.width/devicePixelRatio,h=canvas.height/devicePixelRatio;
ctx.fillStyle="#0a3d5c";ctx.fillRect(0,0,w,h);
for(let i=0;i<15;i++){const bx=(Date.now()/20+i*60)%w,by=((Date.now()/10+i*40)%(h+40))-20;ctx.fillStyle="rgba(255,255,255,.08)";ctx.beginPath();ctx.arc(bx,by,3+Math.sin(Date.now()/500+i)*1.5,0,Math.PI*2);ctx.fill()}
ctx.fillStyle="#2d1a0e";ctx.fillRect(0,h-30,w,30);ctx.font="14px serif";for(let i=0;i<10;i++)ctx.fillText("🌿",i*(w/10)+5,h-8);
fish.forEach((f,i)=>{if(sharkActive&&Math.abs(f.x-sharkX)<25){ctx.globalAlpha=0.3}else{ctx.font=f.size+"px serif";ctx.textAlign="center";ctx.fillText(f.emoji,f.x,f.y+5);if(i===0&&!sharkActive){ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.beginPath();ctx.arc(f.x,f.y,f.size,0,Math.PI*2);ctx.stroke()}}});
if(sharkActive){ctx.font="28px serif";ctx.textAlign="center";ctx.fillText("🦈",sharkX,h/2)}
ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(w/2-70,h/2-35,140,70);ctx.font="bold 32px Poppins";ctx.textAlign="center";ctx.fillStyle=mult>crashMult*0.9?"#ef4444":"#06b6d4";ctx.fillText(mult.toFixed(2)+"x",w/2,h/2+10)}
function animate(){if(!running)return;const el=(Date.now()-startTime)/1000;mult=Math.pow(Math.E,0.007*el*el);fish.forEach(f=>{f.x+=f.speed;if(f.x>canvas.width/devicePixelRatio+20)f.x=-20});
if(!sharkActive&&Math.random()<0.005){sharkActive=true;sharkX=canvas.width/devicePixelRatio}
if(sharkActive){sharkX-=3;if(sharkX<-30){sharkActive=false;sharkX=-1}}
const statusEl=document.getElementById("ft-status");statusEl.textContent=sharkActive?"Shark approaching!":"Fish swimming... Cash out!";
if(mult>=crashMult){running=false;statusEl.textContent="Shark ate your fish! @ "+mult.toFixed(2)+"x";statusEl.className="status loss";document.getElementById("ft-action").className="bp";document.getElementById("ft-action").textContent="FISH AGAIN";return}drawScene();requestAnimationFrame(animate)}
document.getElementById("ft-action").addEventListener("click",()=>{betAmount=Math.min(balance,parseInt(document.getElementById("ft-bet").value)||10);if(betAmount<1||betAmount>balance)return;balance-=betAmount;document.getElementById("ft-bal").textContent="$"+balance.toFixed(2);running=true;mult=1.00;crashMult=genCrash();startTime=Date.now();sharkActive=false;sharkX=-1;fish=[];for(let i=0;i<8;i++)fish.push({x:Math.random()*400,y:30+Math.random()*200,speed:Math.random()*1.5+0.5,emoji:fishEmojis[i%6],color:fishColors[i%6],size:12+Math.random()*8});document.getElementById("ft-action").className="bp cashout";document.getElementById("ft-action").textContent="CASH OUT";animate()});