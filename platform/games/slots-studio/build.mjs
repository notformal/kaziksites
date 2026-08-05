import{cp,mkdir,rm}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/titles',{recursive:true});
for(const file of['index.html','style.css','game.js','sdk.js','ui-symbols.js','theme.generated.css','ui-audio.js','ui-fx.js','ui-shell.css','ui-tokens.css','i18n.js'])await cp(file,`dist/${file}`);
await cp('titles','dist/titles',{recursive:true});
