import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const root = path.resolve('apps/lobby/public/covers-v2');
const qaRoot = path.resolve('output/cover-art');
await fs.mkdir(root, { recursive: true });
await fs.mkdir(qaRoot, { recursive: true });

const little = JSON.parse(await fs.readFile('apps/lobby/src/littlejs.generated.json', 'utf8'));
const slots = JSON.parse(await fs.readFile('apps/lobby/src/slot-titles.generated.json', 'utf8'));
const core = [
  ['game-1','Slots'],['game-2','Crash'],['game-3','Jackpots'],['game-4','Arcade'],['game-5','Table'],
  ['game-6','Slots'],['game-7','Crash'],['game-8','Instant'],['game-9','Table'],['game-10','Table'],
].map(([id, category]) => ({ id, category }));
const games = [...core, ...little, ...slots];
if (games.length !== 200) throw new Error(`Expected 200 games, received ${games.length}`);

const familyFor = (category, id = '') => category === 'Arcade' && hash(id)[0] % 4 === 0 ? 'retro'
  : category === 'Arcade' ? 'arcade'
  : ['Crash','Instant','Jackpots'].includes(category) ? 'instant'
  : category === 'Table' ? 'table'
  : category === 'Slots' ? 'slots' : 'retro';
const palettes = {
  slots: [['#120c2c','#6938ef','#ff4da6','#ffd56a'],['#071f20','#00a88f','#8dffb8','#ffbd59'],['#201008','#b54b16','#ff9e38','#ffe2a7']],
  arcade: [['#050b26','#124cf2','#06e1ff','#ff426f'],['#16052c','#7a1cff','#f635ff','#8dff4f'],['#061b22','#008ba3','#4fffc8','#ff685c']],
  instant: [['#07111f','#0b68ff','#15e8ff','#ff493d'],['#170817','#c4237a','#ff7557','#ffd667'],['#071a18','#00a47d','#a6ff62','#fb5b42']],
  table: [['#0e1513','#174d3a','#d4a44e','#f1eadb'],['#1a0b12','#661b35','#c89b54','#f5e3c6'],['#10151d','#263f62','#c3d4df','#f2b95e']],
  retro: [['#151223','#513a80','#ef6570','#f6c66b'],['#0b2429','#197a7d','#f08e6b','#f3e4b8'],['#23110d','#8e3c2e','#e6a44d','#77b8a9']],
};
const hash = id => crypto.createHash('sha256').update(id).digest();
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;');

function svgFor(game) {
  const h = hash(game.id), family = familyFor(game.category, game.id);
  const p = palettes[family][h[0] % palettes[family].length];
  const rot = (h[1] % 80) - 40, x = 90 + h[2] % 180, y = 150 + h[3] % 170;
  const circles = Array.from({length: 13}, (_,i) => {
    const cx=(h[(i+4)%32]*13+i*47)%400, cy=(h[(i+11)%32]*17+i*83)%520, r=10+(h[(i+18)%32]%58);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p[2+(i%2)]}" opacity="${(.05+(h[i]%20)/100).toFixed(2)}"/>`;
  }).join('');
  const common = `<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${p[0]}"/><stop offset=".58" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[0]}"/></linearGradient><radialGradient id="glow"><stop stop-color="${p[3]}" stop-opacity=".92"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="20"/></filter><filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity=".6"/></filter><pattern id="grain" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".7" fill="#fff" opacity=".08"/><circle cx="7" cy="6" r=".6" fill="#000" opacity=".14"/></pattern></defs><rect width="400" height="520" rx="28" fill="url(#bg)"/><circle cx="${x}" cy="${y}" r="180" fill="url(#glow)" filter="url(#blur)"/>${circles}`;
  let motif='';
  if(family==='slots') {
    const forms=[
      `<path d="M0-112 86-45 62 65 0 116-62 65-86-45Z" fill="${p[2]}"/><path d="M0-112 0 116-62 65-86-45Z" fill="${p[3]}" opacity=".62"/><path d="M0-112 86-45 0-12-86-45Z" fill="#fff" opacity=".28"/><circle r="28" fill="${p[0]}" opacity=".48"/>`,
      `<circle r="112" fill="none" stroke="${p[3]}" stroke-width="25" stroke-dasharray="24 15"/><circle r="69" fill="${p[2]}" opacity=".76"/><circle r="31" fill="#fff" opacity=".64"/><path d="M0-145V-91M145 0H91M0 145V91M-145 0H-91" stroke="${p[2]}" stroke-width="10"/>`,
      `<path d="m-126 78 24-154 70 76 37-120 47 120 72-76 20 154z" fill="${p[3]}"/><path d="m-126 78 270 0-38 48h-195z" fill="${p[2]}"/><circle cy="34" r="32" fill="${p[0]}"/>`,
      `<path d="M0 132C-24 45-118 29-120-47-44-57-20-17 0 20 20-51 63-97 127-81 112 4 47 35 0 132Z" fill="${p[2]}"/><path d="M0 132C20 36 78 27 102-25" fill="none" stroke="${p[3]}" stroke-width="16"/><circle cx="-78" cy="-63" r="25" fill="${p[3]}"/>`,
      `<circle r="103" fill="${p[2]}"/><ellipse rx="158" ry="51" fill="none" stroke="${p[3]}" stroke-width="17"/><ellipse rx="51" ry="158" fill="none" stroke="#fff" stroke-width="7" opacity=".48"/><circle cx="-29" cy="-26" r="28" fill="#fff" opacity=".44"/>`,
      `<path d="M-132 92-65-98 0-27 64-121 135 92Z" fill="${p[2]}"/><path d="m-132 92 267 0-44 51h-181z" fill="${p[3]}"/><path d="m-58-78 60 51 62-74" fill="none" stroke="#fff" stroke-width="9" opacity=".42"/>`,
    ];
    motif=`<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#shadow)">${forms[h[5]%forms.length]}</g>`;
  }
  if(family==='arcade') {
    const forms=[
      `<path d="M-150 76 Q-48-130 142-50" fill="none" stroke="${p[3]}" stroke-width="30" stroke-linecap="round"/><path d="M-150 76 Q-48-130 142-50" fill="none" stroke="${p[2]}" stroke-width="7"/><circle cx="142" cy="-50" r="39" fill="${p[3]}"/><path d="m125-50 34-20v40z" fill="${p[0]}"/>`,
      `<path d="M-145-105H140L76-38h-151L-10 24h81L4 93h-140" fill="none" stroke="${p[3]}" stroke-width="28" stroke-linejoin="round"/><circle cx="4" cy="93" r="26" fill="${p[2]}"/>`,
      `<rect x="-112" y="-112" width="94" height="94" rx="17" fill="${p[2]}"/><rect x="18" y="-60" width="112" height="112" rx="23" fill="${p[3]}"/><rect x="-72" y="44" width="90" height="90" rx="14" fill="#fff" opacity=".55"/>`,
      `<circle r="121" fill="none" stroke="${p[2]}" stroke-width="7"/><ellipse rx="151" ry="54" fill="none" stroke="${p[3]}" stroke-width="19"/><circle cx="-118" cy="-51" r="32" fill="${p[3]}"/><path d="m-15-43 62 43-62 43z" fill="#fff" opacity=".74"/>`,
      `<path d="m-128 112 34-216 54 154 47-177 51 177 59-143 20 205z" fill="none" stroke="${p[3]}" stroke-width="22" stroke-linejoin="round"/><circle cy="15" r="34" fill="${p[2]}"/>`,
      `<path d="M-118-86H95V-22H-42V35H122V101H-118Z" fill="none" stroke="${p[2]}" stroke-width="25"/><circle cx="94" cy="-86" r="28" fill="${p[3]}"/><circle cx="-118" cy="101" r="22" fill="#fff" opacity=".7"/>`,
    ];
    motif=`<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#shadow)">${forms[h[6]%forms.length]}</g>`;
  }
  if(family==='instant') motif=`<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#shadow)"><path d="M-155 95 C-55 100-64-104 112-105" fill="none" stroke="${p[2]}" stroke-width="18" stroke-linecap="round"/><path d="M64-132 159-110 83-43 100-91Z" fill="${p[3]}"/><circle cx="-155" cy="95" r="27" fill="${p[3]}"/></g>`;
  if(family==='table') motif=`<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#shadow)"><circle r="121" fill="${p[0]}" stroke="${p[3]}" stroke-width="14"/><circle r="78" fill="none" stroke="${p[2]}" stroke-width="26" stroke-dasharray="18 14"/><circle r="31" fill="${p[3]}"/><path d="M0-121V-78M121 0H78M0 121V78M-121 0H-78" stroke="#fff" stroke-width="5" opacity=".65"/></g>`;
  if(family==='retro') motif=`<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#shadow)"><path d="m-130 94 62-118 47 54 44-88 118 152z" fill="${p[2]}"/><path d="m-130 94 108-64 163 64z" fill="${p[3]}" opacity=".8"/><circle cx="82" cy="-92" r="43" fill="${p[3]}"/><path d="M-180 118H180M-160 145H160M-130 172H130" stroke="${p[2]}" stroke-width="5" opacity=".45"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520" aria-label="${esc(family)} original abstract cover">${common}${motif}<rect width="400" height="520" rx="28" fill="url(#grain)"/><path d="M25 472 Q190 420 375 464V520H25Z" fill="#000" opacity=".18"/></svg>`;
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({ viewport: { width: 400, height: 520 }, deviceScaleFactor: 1 });
for (let i=0;i<games.length;i++) {
  const game=games[i];
  await page.setContent(`<style>*{margin:0}body{background:transparent}</style>${svgFor(game)}`);
  await page.locator('svg').screenshot({path:path.join(root,`${game.id}.jpg`),type:'jpeg',quality:88});
  if((i+1)%25===0) console.log(`Rendered ${i+1}/200`);
}
const cells=games.map(g=>`<figure><img src="../../apps/lobby/public/covers-v2/${g.id}.jpg"><figcaption>${g.id}</figcaption></figure>`).join('');
await fs.writeFile(path.join(qaRoot,'contact-sheet.html'),`<!doctype html><meta charset="utf-8"><style>body{margin:20px;background:#080a10;color:#b9c0cf;font:11px system-ui;display:grid;grid-template-columns:repeat(10,1fr);gap:8px}figure{margin:0}img{width:100%;aspect-ratio:10/13;object-fit:cover;border-radius:7px}figcaption{overflow:hidden}</style>${cells}`);
await page.setViewportSize({width:1600,height:10620});
await page.goto(`file:///${path.join(qaRoot,'contact-sheet.html').replaceAll('\\','/')}`);
await page.screenshot({path:path.join(qaRoot,'contact-sheet.jpg'),type:'jpeg',quality:85,fullPage:true});
await browser.close();

const manifest={version:2,generatedAt:new Date().toISOString(),count:games.length,license:'Original project artwork; AI-assisted concept generation was attempted but returned no artifact. Final shipped assets are deterministic procedural raster art produced by scripts/generate-cover-art.mjs.',provenance:{externalAssets:[],generator:'scripts/generate-cover-art.mjs',method:'original SVG compositions rasterized to high-quality JPEG with Playwright'},families:['slots','arcade','instant','table','retro'],assets:Object.fromEntries(games.map(g=>[g.id,{file:`${g.id}.jpg`,family:familyFor(g.category,g.id),source:'procedural-original'}]))};
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Wrote ${games.length} covers and QA contact sheet.`);
