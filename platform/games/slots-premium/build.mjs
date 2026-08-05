import{cp,mkdir,rm}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of['index.html','style.css','game.js','sdk.js','engines.generated.js','theme.generated.css','ui-symbols.js','ui-tokens.css','ui-shell.css','ui-fx.js','ui-audio.js','i18n.js'])await cp(file,`dist/${file}`);
await cp('art','dist/art',{recursive:true,force:true}).catch(()=>{});
