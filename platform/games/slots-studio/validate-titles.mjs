import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const titlesDir = path.join(here,'titles');
const idPattern = /^slot-original-(00[1-9]|0[1-9][0-9]|1[01][0-9]|12[0-7])$/;
const colorPattern = /^#[0-9a-f]{6}$/i;

export function validateTitle(m) {
  const errors=[];
  const fail=(condition,message)=>{if(!condition)errors.push(message)};
  fail(m && typeof m==='object' && !Array.isArray(m),'manifest must be an object');
  if(!m || typeof m!=='object') return errors;
  fail(m.schemaVersion===1,'schemaVersion must be 1');
  fail(idPattern.test(m.id),'id must be slot-original-001..127');
  fail(typeof m.title==='string' && m.title.length>=4 && m.title.length<=60,'invalid title');
  fail(m.theme && ['accent','background','panel','text'].every(k=>colorPattern.test(m.theme[k])),'theme colors must be #RRGGBB');
  fail(Array.isArray(m.symbols) && m.symbols.length>=8 && m.symbols.length<=12,'symbols must contain 8..12 entries');
  const ids=Array.isArray(m.symbols)?m.symbols.map(s=>s.id):[];
  fail(new Set(ids).size===ids.length,'symbol ids must be unique');
  for(const s of m.symbols||[]) {
    fail(/^[a-z][a-z0-9-]*$/.test(s.id),'invalid symbol id');
    fail(typeof s.label==='string' && s.label.length>0,`missing label for ${s.id}`);
    fail(colorPattern.test(s.color),`invalid color for ${s.id}`);
    fail(['regular','wild','scatter'].includes(s.kind),`invalid kind for ${s.id}`);
  }
  fail(ids.includes('wild') && ids.includes('bonus'),'wild and bonus symbols are required');
  fail(m.paytable && ids.every(id=>Array.isArray(m.paytable[id]) && m.paytable[id].length===5 && m.paytable[id].every(n=>Number.isFinite(n)&&n>=0)),'paytable must cover every symbol');
  fail(m.reels===5 && m.rows===3,'grid must be 5x3');
  fail(Number.isInteger(m.lines)&&m.lines>0&&m.lines<=50,'invalid payline count');
  fail(Array.isArray(m.betOptions)&&m.betOptions.length>=3&&m.betOptions.every(Number.isInteger),'invalid bet options');
  fail(['low','medium','high'].includes(m.volatility),'invalid volatility');
  const p=m.mathProfile;
  fail(p?.version==='1.0.0','invalid math profile version');
  fail(Number.isFinite(p?.hitRate)&&p.hitRate>0&&p.hitRate<1,'hitRate must be between 0 and 1');
  fail(p?.weights&&ids.every(id=>Number.isInteger(p.weights[id])&&p.weights[id]>0),'weights must cover every symbol');
  fail(p?.bonus&&['free-spins','multiplier','respin'].includes(p.bonus.type),'invalid bonus type');
  fail(p?.bonus?.triggerSymbol==='bonus'&&p.bonus.triggerCount===3,'bonus must trigger on three bonus symbols');
  fail(Number.isInteger(p?.bonus?.freeSpins)&&p.bonus.freeSpins>=0&&p.bonus.freeSpins<=25,'invalid free spin count');
  fail(Number.isFinite(p?.bonus?.multiplier)&&p.bonus.multiplier>=1&&p.bonus.multiplier<=10,'invalid bonus multiplier');
  return errors;
}

export async function loadAndValidateAll() {
  const files=(await readdir(titlesDir)).filter(f=>/^slot-original-\d{3}\.json$/.test(f)).sort();
  const titles=[]; const errors=[];
  for(const file of files){
    const item=JSON.parse(await readFile(path.join(titlesDir,file),'utf8'));
    for(const message of validateTitle(item)) errors.push(`${file}: ${message}`);
    if(`${item.id}.json`!==file) errors.push(`${file}: filename does not match id`);
    titles.push(item);
  }
  if(files.length!==127) errors.push(`expected 127 title files, found ${files.length}`);
  if(new Set(titles.map(t=>t.id)).size!==titles.length) errors.push('duplicate ids');
  if(new Set(titles.map(t=>t.title)).size!==titles.length) errors.push('duplicate titles');
  const index=JSON.parse(await readFile(path.join(titlesDir,'index.json'),'utf8'));
  if(JSON.stringify(index)!==JSON.stringify(titles)) errors.push('index.json is stale or out of order');
  return {titles,errors};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const {titles,errors}=await loadAndValidateAll();
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
  else console.log(`Validated ${titles.length} original slot manifests`);
}
