import{defineConfig}from'vite';import react from'@vitejs/plugin-react';

const brands={
  aurora:{name:'Aurora Play',color:'#8cff98'},
  ember:{name:'Ember Rush',color:'#ff4d6d'},
  royale:{name:'Royale House',color:'#d5b85a'},
};

export default defineConfig(({mode})=>{
  const brand=brands[mode]?mode:null;
  const identity=brand?brands[brand]:null;
  return{
    base:'./',
    plugins:[
      react(),
      identity&&{
        name:'fixed-brand-html',
        transformIndexHtml(html){
          return html
            .replace('<html lang="en">',`<html lang="en" data-build-brand="${brand}">`)
            .replace('<meta name="theme-color" content="#080b12"/>',`<meta name="theme-color" content="${identity.color}"/><meta name="arcade-brand" content="${brand}"/>`)
            .replace('<title>Arcade Showcase</title>',`<title>${identity.name} — Social Arcade</title>`);
        },
      },
    ].filter(Boolean),
    define:brand?{'import.meta.env.VITE_BRAND':JSON.stringify(brand)}:{},
    build:{sourcemap:false,outDir:brand?`dist/${brand}`:'dist'},
    server:{host:'127.0.0.1'},preview:{host:'127.0.0.1'},
    test:{include:['src/**/*.test.js']},
  };
});
