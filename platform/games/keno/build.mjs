import{cp,rm,mkdir}from'node:fs/promises';await rm('dist',{recursive:true,force:true});await mkdir('dist');for(const f of['index.html','style.css','game.js','sdk.js'])await cp(f,`dist/${f}`);
