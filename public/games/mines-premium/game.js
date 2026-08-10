import{initOverlay} from "../_engine/core/premium-overlay.js";
initOverlay({brand:"aurora"});
let bal=10000,active=false,mins=[],rev=[],bet=10,mcnt=5,gems=0;
const $=id=>document.getElementById(id);
function mult(){let m=1;for(let i=0;i<gems;i++)m*=(25/(25-mcnt-i));return Math.round(m*.97*100)/100}
function makeGrid(){const g=$("grid");g.innerHTML="";for(let i=0;i<25;i++){const c=document.createElement("div");c.className="cl";c.dataset.i=i;c.textContent="\u25A1";c.onclick=(i=>()=>reveal(i))(i);g.appendChild(c)}}
function startGame(){if(active)return;bet=Math.min(10000,parseInt($("bet").value)||10);mcnt=parseInt($("mc").value);if(bet>bal)return;bal-=bet;upd();active=true;gems=0;rev=[];mins=[];while(mins.length<mcnt){const p=Math.floor(Math.random()*25);if(!mins.includes(p))mins.push(p)}makeGrid();$("go").style.display="none";$("co").style.display="block";$("mul").textContent="1.00x";$("prof").textContent=""}
function reveal(i){if(!active||rev.includes(i))return;rev.push(i);const c=document.querySelector(".cl[data-i=\""+i+"\"]");if(mins.includes(i)){c.className="cl rev mine";c.textContent="\uD83D\uDCA3";active=false;mins.forEach(p=>{const d=document.querySelector(".cl[data-i=\""+p+"\"]");if(d&&d!==c){d.className="cl rev mine";d.textContent="\uD83D\uDCA3"}});for(let j=0;j<25;j++){if(!rev.includes(j)&&!mins.includes(j)){const d=document.querySelector(".cl[data-i=\""+j+"\"]");if(d)d.className="cl dim"}};$("mul").textContent="0x";$("prof").textContent="LOST";addToHist(false);setTimeout(()=>{$("go").style.display="block";$("co").style.display="none"},1500)}else{c.className="cl rev gem";c.textContent="\uD83D\uDC8E";gems++;const mt=mult();$("mul").textContent=mt+"x";$("prof").textContent="+"+((bet*mt-bet).toFixed(0))}}
function cashOut(){if(!active||gems===0)return;const m=mult(),w=bet*m;bal+=w;upd();active=false;$("prof").textContent="+"+w.toFixed(2);addToHist(true,m);setTimeout(()=>{$("go").style.display="block";$("co").style.display="none"},1000)}
function upd(){$("bal").textContent="$"+bal.toFixed(2)}
function addToHist(w,mt){const h=$("hist"),s=document.createElement("span");s.className=w?"w":"l";s.textContent=(w?"+":"-")+(w?(bet*(mt||1)).toFixed(0):bet);h.prepend(s);if(h.children.length>8)h.removeChild(h.lastChild)}
$("go").onclick=startGame;$("co").onclick=cashOut;makeGrid();
