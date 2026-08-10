let balance=10000,bets={},spinning=false;
const $=id=>document.getElementById(id);
function ub(){$('spinBtn').textContent='SPIN - '+balance}
function gb(){return Math.min(5000,Math.max(1,parseInt($('betInput').value)||10))}

function assignLightning(){
  const ns=[];
  while(ns.length<Math.floor(Math.random()*5)+1){
    const n=Math.floor(Math.random()*37);
    if(!ns.includes(n))ns.push(n);
  }
  return ns.map(n=>({number:n,multiplier:Math.floor(Math.random()*496)+50}));
}

function initBT(){
  const co=$('betTable'),reds=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18',
   '19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36',
   '1-12','13-24','25-36','RED','BLACK','EVEN','ODD'].forEach(label=>{
    const c=document.createElement('div');
    c.className='lge-bet-cell';c.textContent=label;
    const n=parseInt(label);const isRed=n>0&&reds.includes(n);
    if(label==='0')c.style.background='rgba(16,185,129,.15)';
    else if(isRed){c.style.background='rgba(239,68,68,.08)';c.style.color='#f87171'}
    else if(label==='RED'){c.style.color='#f87171'}
    else{c.style.background='rgba(7,7,26,.4)';c.style.color='#e2e8f0'}
    c.addEventListener('click',()=>{
      if(spinning)return;
      if(bets[label]){delete bets[label];c.classList.remove('sel');const ch=c.querySelector('.chip');if(ch)ch.remove()}
      else{bets[label]=gb();c.classList.add('sel');let ch=c.querySelector('.chip');if(!ch){ch=document.createElement('span');ch.className='chip';c.appendChild(ch)}ch.textContent='$'+bets[label]}
    });co.appendChild(c);
  });
}

async function doSpin(){
  if(spinning||Object.keys(bets).length===0)return;
  spinning=true;const tb=Object.values(bets).reduce((a,b)=>a+b,0);
  if(tb>balance){alert('No balance');spinning=false;return}
  balance-=tb;ub();$('spinBtn').disabled=true;
  const canvas=$('wheel'),ctx=canvas.getContext('2d');
  canvas.width=Math.min(960,window.innerWidth-20)||500;
  canvas.height=Math.min(400,(window.innerHeight*0.35))||350;
  const lightning=assignLightning();
  $('ltInfo').textContent=lightning.map(l=>l.number+'x'+l.multiplier).join(', ');
  const result=await LGE.spinWheel(canvas,4000);
  let winAmt=0;const isRed=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(result);
  for(const[k,amt]of Object.entries(bets)){
    if(k===result.toString())winAmt+=amt*36;
    else if(k==='RED'&&isRed)winAmt+=amt*2;
    else if(k==='BLACK'&&!isRed&&result!==0)winAmt+=amt*2;
    else if(k==='EVEN'&&result>0&&result%2===0)winAmt+=amt*2;
    else if(k==='ODD'&&result%2===1)winAmt+=amt*2;
  }
  const lt=lightning.find(l=>l.number===result);
  if(lt&&lt.multiplier>50){const amt=bets[result.toString()];if(amt)winAmt=amt*lt.multiplier}
  if(winAmt>0){balance+=winAmt;LGE.showToast(document.querySelector('.lge-root'),'+'+winAmt.toLocaleString()+(lt?' LIGHTNING!':''),'w');document.querySelectorAll('.lge-bet-cell').forEach(c=>{if(c.textContent===result.toString())c.classList.add('win')})}
  else LGE.showToast(document.querySelector('.lge-root'),'No win. '+result,'l');
  LGE.addHistory($('history'),result);ub();spinning=false;$('spinBtn').disabled=false;
  bets={};document.querySelectorAll('.lge-bet-cell .chip').forEach(c=>c.remove());
  document.querySelectorAll('.lge-bet-cell').forEach(c=>c.classList.remove('sel','win'));
}

$('spinBtn').addEventListener('click',doSpin);
$('halfBtn').addEventListener('click',()=>{$('betInput').value=Math.max(1,Math.floor(gb()/2))});
$('doubleBtn').addEventListener('click',()=>{$('betInput').value=Math.min(5000,gb()*2)});
$('maxBtn').addEventListener('click',()=>{$('betInput').value=Math.min(balance,5000)});
initBT();ub();