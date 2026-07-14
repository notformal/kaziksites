const studios=['Nova Forge','Pixel Harbor','Golden Reel','Orbit Labs','Wild Mint','Neon Fox'];
const types=['Slots','Jackpots','Arcade','Table','Instant','New'];
const nouns=['Fortune','Dragon','Vault','Jungle','Cosmos','Pharaoh','Candy','Pirate','Ember','Tiger','Moon','Diamond','Temple','Rush','Crown','Safari','Cash','Mystic','Wolf','Galaxy'];
const icons=['💎','🐉','👑','🌙','🔥','🍒','⚡','🪙','🦁','🚀','🎯','🏆'];
const playable={
  0:{title:'2048',studio:'Gabriele Cirulli',category:'Arcade',icon:'🔢',url:'./games/2048/index.html',license:'MIT'},
  1:{title:'Canvas Tetris',studio:'Dionysis Zindros',category:'Arcade',icon:'🧱',url:'./games/tetris/index.html',license:'MIT'},
  2:{title:'Night Racer',studio:'Jake Gordon',category:'Arcade',icon:'🏎️',url:'./games/racer/index.html',license:'MIT'},
  3:{title:'Radius Raid',studio:'Jack Rugile',category:'Arcade',icon:'🚀',url:'./games/radius-raid/index.html',license:'MIT'},
  4:{title:'Classic Pong',studio:'Jake Gordon',category:'Arcade',icon:'🏓',url:'./games/pong/index.html',license:'MIT'}
};
export const games=Array.from({length:240},(_,i)=>({
  id:`game-${i+1}`, title:`${nouns[i%nouns.length]} ${nouns[(i*7+3)%nouns.length]}`,
  studio:studios[i%studios.length], category:types[i%types.length], icon:icons[i%icons.length],
  hot:i%7===0, new:i%11===0, rating:(4+(i%10)/10).toFixed(1), hue:(i*37)%360,...playable[i]
}));
export const categories=['All','Popular','Favorites','Recent',...types];
