import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('apps/lobby/dist');
const brands={aurora:'Aurora Play',ember:'Ember Rush',royale:'Royale House'};
let checked=0;

for(const [brand,name] of Object.entries(brands)){
  const directory=path.join(root,brand);
  const index=path.join(directory,'index.html');
  if(!fs.existsSync(index))throw new Error(`Missing ${brand} bundle: ${index}`);
  const html=fs.readFileSync(index,'utf8');
  const assertions=[
    [`data-build-brand="${brand}"`,'HTML build marker'],
    [`name="arcade-brand" content="${brand}"`,'brand metadata'],
    [`<title>${name} — Social Arcade</title>`,'fixed title'],
    ['<div id="root"></div>','application root'],
  ];
  for(const [needle,label] of assertions){
    if(!html.includes(needle))throw new Error(`${brand}: missing ${label}`);
    checked++;
  }
  const assets=[...html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)].map(match=>match[1]);
  for(const asset of assets){
    if(!fs.existsSync(path.join(directory,asset)))throw new Error(`${brand}: missing asset ${asset}`);
    checked++;
  }
  const scripts=assets.filter(asset=>asset.endsWith('.js'));
  if(!scripts.length)throw new Error(`${brand}: no JavaScript entrypoint`);
  const javascript=scripts.map(asset=>fs.readFileSync(path.join(directory,asset),'utf8')).join('\n');
  if(!javascript.includes(brand))throw new Error(`${brand}: compiled brand identity is absent`);
  checked++;
  console.log(`PASS ${brand}: ${path.relative(process.cwd(),directory)}`);
}
console.log(`Brand bundles verified: 3/3 (${checked} checks)`);
