import{readFile,readdir,stat}from'node:fs/promises';import{join}from'node:path';
const brands=['aurora','ember','royale'];
const games=[['2048','LICENSE.txt'],['tetris','LICENSE.md'],['racer','LICENSE'],['radius-raid','LICENSE.md'],['pong','LICENSE']];
for(const brand of brands){
 const dir=join('dist',brand),html=await readFile(join(dir,'index.html'),'utf8');
 if(/(?:src|href)="\/assets\//.test(html))throw new Error(`${brand}: absolute asset path breaks subfolder hosting`);
 const refs=[...html.matchAll(/(?:src|href)="\.\/(assets\/[^\"]+)"/g)].map(m=>m[1]);
 if(refs.length<2)throw new Error(`${brand}: built asset references missing`);
 for(const ref of refs)if(!(await stat(join(dir,ref))).isFile())throw new Error(`${brand}: missing ${ref}`);
 for(const file of ['favicon.ico','legal.html','_headers'])if(!(await stat(join(dir,file))).isFile())throw new Error(`${brand}: missing ${file}`);
 for(const[game,license]of games)for(const file of ['index.html',license])if(!(await stat(join(dir,'games',game,file))).isFile())throw new Error(`${brand}: missing ${game}/${file}`);
 console.log(`✓ ${brand}: relative assets, legal, headers and ${games.length} licensed games resolved`);
}
if((await readdir('dist')).length<3)throw new Error('Missing brand output');
