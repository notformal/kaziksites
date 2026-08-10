/**
 * LIVE GAME ENGINE v5.0 — Shared rendering core for live dealer games.
 */
const LGE = (() => {
  function drawWheel(ctx, w, h, result, spinning, angle) {
    const cx = w/2, cy = h/2, r = Math.min(w,h)*0.42;
    ctx.clearRect(0,0,w,h);
    // Outer glow ring
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r+8,0,Math.PI*2);
    ctx.strokeStyle = spinning ? '#a855f7' : 'rgba(168,85,247,.3)';
    ctx.lineWidth = spinning?4:2;
    ctx.shadowColor='#a855f7'; ctx.shadowBlur=spinning?30:10;
    ctx.stroke(); ctx.restore();
    // Draw 37 segments (European roulette)
    for(let i=0;i<37;i++){
      const sa=(i/37)*Math.PI*2+angle, ea=((i+1)/37)*Math.PI*2+angle;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,sa,ea); ctx.closePath();
      // Red/black/green coloring
      const n=i-(i>=19?19:0), reds=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      ctx.fillStyle = i===0?'#10b981' : (n>0&&reds.includes(n))?'#ef4444':'#1a1a4e';
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; ctx.stroke();
      // Number text
      const ma=(sa+ea)/2, tr=r*0.78, tx=cx+Math.cos(ma)*tr, ty=cy+Math.sin(ma)*tr;
      ctx.fillStyle='#fff'; ctx.font=Math.max(9,r*.085)+'px Inter,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(n===0?'0':n.toString(),tx,ty);
    }
    // Center hub
    ctx.beginPath(); ctx.arc(cx,cy,r*.28,0,Math.PI*2);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r*.28);
    g.addColorStop(0,'#1a1a4e'); g.addColorStop(1,'#0d0d2b');
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='rgba(168,85,247,.4)'; ctx.lineWidth=2; ctx.stroke();
    // Result circle
    if(result!==null&&!spinning){
      const resNum=result-(result>=19?19:0);
      ctx.save();
      const rcx=cx,rcy=cy-r*0.5;
      ctx.fillStyle=resNum===0?'#10b981':(reds.includes(resNum)?'#ef4444':'#1a1a4e');
      ctx.beginPath(); ctx.arc(rcx,rcy,24,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 18px Inter,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(result.toString(),rcx,rcy);
      ctx.restore();
    }
  }
  function createBetTable(container, cells){
    container.innerHTML='';
    const t=document.createElement('div');
    t.className='lge-bet-table';
    // Zero row
    const z=document.createElement('div');
    z.className='lge-bet-cell'; z.textContent='0';
    z.style.gridColumn='1/-1'; z.style.background='rgba(16,185,129,.15)';
    z.addEventListener('click',()=>cellClick(z)); t.appendChild(z);
    // 1-36
    const reds=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    for(let i=1;i<=36;i++){
      const c=document.createElement('div');
      c.className='lge-bet-cell'; c.textContent=i;
      c.style.background=reds.includes(i)?'rgba(239,68,68,.1)':'rgba(7,7,26,.5)';
      c.style.color=reds.includes(i)?'#f87171':'#e2e8f0';
      c.addEventListener('click',()=>cellClick(c)); t.appendChild(c);
    }
    // Outside bets
    const ob=document.createElement('div'); ob.className='lge-bet-table';
    ob.style.marginTop='4px';
    ['1-12','13-24','25-36','RED','BLACK','EVEN','ODD'].forEach(l=>{
      const c=document.createElement('div');
      c.className='lge-bet-cell'; c.textContent=l;
      if(l==='RED')c.style.color='#f87171';
      if(l==='BLACK')c.style.color='#94a3b8';
      c.addEventListener('click',()=>cellClick(c)); ob.appendChild(c);
    });
    t.appendChild(ob); container.appendChild(t);
  }
  function cellClick(cell){
    document.querySelectorAll('.lge-bet-cell').forEach(c=>c.classList.remove('sel'));
    cell.classList.add('sel');
    if(!cell.querySelector('.chip')){
      const cp=document.createElement('span');cp.className='chip';cp.textContent='$1';
      cell.appendChild(cp);
    }
  }
  function spinWheel(canvas, duration=4000){
    return new Promise(resolve=>{
      const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height;
      let st=null, angle=0;
      function tick(ts){if(!st)st=ts;const p=Math.min((ts-st)/duration,1);
        const e=1-Math.pow(1-p,3); angle=e*Math.PI*20+(Math.random()-.5)*.1;
        drawWheel(ctx,w,h,null,true,angle);
        if(p<1)requestAnimationFrame(tick);
        else{const r=Math.floor(Math.random()*37);drawWheel(ctx,w,h,r,false,angle);resolve(r);}
      }
      requestAnimationFrame(tick);
    });
  }
  function showToast(root,msg,type){
    let t=root.querySelector('.lge-toast');if(t)t.remove();
    t=document.createElement('div');t.className='lge-toast '+(type||'');
    t.textContent=msg;root.appendChild(t);setTimeout(()=>t.remove(),3000);
  }
  function addHistory(hEl,result){
    const i=document.createElement('span');i.className='lge-hist-item';i.textContent=result;
    if(result===0)i.classList.add('high');else if(result>=19)i.classList.add('mid');else i.classList.add('low');
    hEl.prepend(i);if(hEl.children.length>20)hEl.removeChild(hEl.lastChild);
  }
  return {drawWheel,createBetTable,spinWheel,showToast,addHistory};
})();
