import{readFile,readdir,stat}from'node:fs/promises';import{join}from'node:path';
import{themes}from'../src/themes.js';
import{games as catalogue}from'../src/catalog.js';
const brands=['aurora','ember','royale'];
// Engine-driven titles are the ones most likely to break in a production build:
// `public/` is copied verbatim, so a bad relative import fails only once
// deployed. Verify the engine, its vendored runtime and every game's artefacts
// actually landed in dist.
const engineFiles=['games/_engine/slot-engine.js','games/_engine/dice-engine.js','vendor/pixi.mjs'];
const isFile=async p=>{try{return(await stat(p)).isFile()}catch{return false}};
for(const brand of brands){
 const dir=join('dist',brand),html=await readFile(join(dir,'index.html'),'utf8'),theme=themes[brand];
 if(/(?:src|href)="\/assets\//.test(html))throw new Error(`${brand}: absolute asset path breaks subfolder hosting`);
 const refs=[...html.matchAll(/(?:src|href)="\.\/(assets\/[^\"]+)"/g)].map(m=>m[1]);
 if(refs.length<2)throw new Error(`${brand}: built asset references missing`);
 for(const ref of refs)if(!(await isFile(join(dir,ref))))throw new Error(`${brand}: missing ${ref}`);
 // Each brand deploys as its own site with its own domain, so absolute URLs are
 // verified for self-consistency rather than against one global SITE_URL.
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"\/>/)?.[1];
 const required=['favicon.ico','legal.html','_headers','icon.svg','og-image.png','site.webmanifest','robots.txt'];
 if(canonical)required.push('sitemap.xml');
 for(const file of required)if(!(await isFile(join(dir,file))))throw new Error(`${brand}: missing ${file}`);
 for(const file of engineFiles)if(!(await isFile(join(dir,file))))throw new Error(`${brand}: missing ${file}`);
 for(const entry of catalogue){
  const id=entry.url.split('/')[2];
  if(!(await isFile(join(dir,'games',id,'index.html'))))throw new Error(`${brand}: catalogue lists ${id} but dist has no page for it`);
  if(entry.cover&&!(await isFile(join(dir,entry.cover.replace(/^\//,'')))))throw new Error(`${brand}: missing cover for ${id}`);
 }

 // ---- SEO / social: crawlers and share scrapers never run our JS ----
 if(!html.includes(`<title>${theme.name} — Social Casino</title>`))throw new Error(`${brand}: index.html is missing the brand-specific <title>`);
 if(/content="Premium social casino showcase"/.test(html))throw new Error(`${brand}: generic placeholder description still shipped`);
 for(const tag of ['og:title','og:description','og:image','og:type','twitter:card','application/ld+json'])
  if(!html.includes(tag))throw new Error(`${brand}: missing ${tag} in document head`);
 if(!html.includes(`content="${theme.accent}"`))throw new Error(`${brand}: theme-color is not the brand accent`);
 const ogUrl=html.match(/<meta property="og:url" content="([^"]+)"\/>/)?.[1];
 if(canonical){
  if(!/^https:\/\/[^\s/]+\/$/.test(canonical))throw new Error(`${brand}: canonical must be an absolute https URL, got "${canonical}"`);
  if(ogUrl!==canonical)throw new Error(`${brand}: og:url "${ogUrl}" does not match canonical "${canonical}"`);
  const sitemap=await readFile(join(dir,'sitemap.xml'),'utf8');
  if(!sitemap.includes(`<loc>${canonical}</loc>`))throw new Error(`${brand}: sitemap.xml does not list the canonical URL`);
  if(!(await readFile(join(dir,'robots.txt'),'utf8')).includes(`${canonical}sitemap.xml`))throw new Error(`${brand}: robots.txt does not point at this site's sitemap`);
 }else if(ogUrl)throw new Error(`${brand}: og:url present without a canonical link`);

 // ---- Performance guard: fonts must not reintroduce a render-blocking @import chain ----
 for(const ref of refs.filter(r=>r.endsWith('.css')))
  if(/@import\s+url\(/.test(await readFile(join(dir,ref),'utf8')))
   throw new Error(`${brand}: CSS @import reintroduced (render-blocking font waterfall)`);

 // ---- Generated assets must be valid, not just present ----
 JSON.parse(await readFile(join(dir,'site.webmanifest'),'utf8'));
 const png=await readFile(join(dir,'og-image.png'));
 if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`${brand}: og-image.png is not a valid PNG`);
 if(png.readUInt32BE(16)!==1200||png.readUInt32BE(20)!==630)throw new Error(`${brand}: og-image.png must be 1200x630`);

 console.log(`✓ ${brand}: assets, legal, headers, SEO/social meta, PWA manifest, OG image, the engine and all ${catalogue.length} catalogue titles verified`);
}
if((await readdir('dist')).length<3)throw new Error('Missing brand output');
console.log('✓ all brands verified (absolute URLs checked for self-consistency where SITE_URL was set at build time)');
