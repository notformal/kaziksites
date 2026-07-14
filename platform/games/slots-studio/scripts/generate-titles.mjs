import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'titles');
const adjectives = ['Aurora','Velvet','Solar','Lunar','Neon','Crystal','Golden','Silver','Ruby','Emerald','Cosmic','Mystic','Electric','Royal','Lucky','Radiant','Arctic','Tropical','Stellar'];
const subjects = ['Orchard','Voyage','Bazaar','Comet','Garden','Harbor','Horizon','Lantern','Meadow','Mirage','Monsoon','Odyssey','Parade','Phoenix','Reef','Summit','Temple','Thunder','Tide','Trail','Treasure','Valley','Wings'];
const palettes = [
  ['#78f7ff','#071524','#102940','#f5fbff'], ['#ffcd57','#1c102d','#332050','#fff8e8'],
  ['#ff6ea9','#210c23','#401639','#fff3f8'], ['#9cff6e','#071e19','#153a2e','#f4fff0'],
  ['#a990ff','#100d2b','#28205a','#f7f3ff'], ['#ff845c','#24100b','#482419','#fff6ed'],
  ['#5de2c2','#061d26','#123747','#effffc'], ['#f5df65','#17180b','#30331a','#fffdeb']
];
const iconSets = [
  [['crown','Crown','♛'],['gem','Gem','◆'],['star','Star','★'],['bell','Bell','●'],['moon','Moon','☾'],['spark','Spark','✦'],['wild','Wild','W'],['bonus','Bonus','B']],
  [['sun','Sun','☀'],['wave','Wave','≋'],['leaf','Leaf','♣'],['pearl','Pearl','○'],['kite','Kite','◇'],['bloom','Bloom','✿'],['wild','Wild','W'],['bonus','Bonus','B']],
  [['rocket','Rocket','▲'],['planet','Planet','◉'],['orbit','Orbit','◎'],['nova','Nova','✷'],['signal','Signal','⌁'],['dust','Dust','✧'],['wild','Wild','W'],['bonus','Bonus','B']]
];
const profiles = {
  low: { hitRate: 0.34, weights: [5,7,10,13,17,22,3,2], payouts: [12,9,7,6,5,4,18,0] },
  medium: { hitRate: 0.27, weights: [4,6,9,12,16,21,3,2], payouts: [18,13,10,8,6,5,25,0] },
  high: { hitRate: 0.19, weights: [3,5,8,11,15,20,2,1], payouts: [30,22,16,12,8,6,40,0] }
};
const bonusTypes = ['free-spins','multiplier','respin'];

function manifest(index) {
  const id = `slot-original-${String(index).padStart(3,'0')}`;
  const title = `${adjectives[(index - 1) % adjectives.length]} ${subjects[Math.floor((index - 1) / adjectives.length) % subjects.length]}`;
  const volatility = ['low','medium','high'][(index - 1) % 3];
  const p = profiles[volatility];
  const colors = palettes[(index - 1) % palettes.length];
  const symbols = iconSets[(index - 1) % iconSets.length].map(([sid,label,glyph], n) => ({ id:sid, label:`${glyph} ${label}`, color:colors[(n % 2) + 0], kind:sid === 'wild' ? 'wild' : sid === 'bonus' ? 'scatter' : 'regular' }));
  const paytable = Object.fromEntries(symbols.map((symbol,n) => [symbol.id,[0,0,p.payouts[n],p.payouts[n]*3,p.payouts[n]*8]]));
  const bonusType = bonusTypes[(index - 1) % bonusTypes.length];
  return { schemaVersion:1,id,title,theme:{accent:colors[0],background:colors[1],panel:colors[2],text:colors[3]},symbols,paytable,reels:5,rows:3,lines:10,betOptions:[10,25,50,100,250],volatility,mathProfile:{version:'1.0.0',hitRate:p.hitRate,weights:Object.fromEntries(symbols.map((s,n)=>[s.id,p.weights[n]])),bonus:{type:bonusType,triggerSymbol:'bonus',triggerCount:3,freeSpins:bonusType==='free-spins'?8+(index%5):0,multiplier:bonusType==='multiplier'?2+(index%4):1}} };
}

await mkdir(root,{recursive:true});
const titles=[];
for(let i=1;i<=127;i++){
  const item=manifest(i); titles.push(item);
  await writeFile(path.join(root,`${item.id}.json`),`${JSON.stringify(item,null,2)}\n`);
}
await writeFile(path.join(root,'index.json'),`${JSON.stringify(titles,null,2)}\n`);
console.log(`Generated ${titles.length} original slot manifests`);
