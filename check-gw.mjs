const fs = await import('fs');
const c = fs.readFileSync('./server/src/api/game-gateway.js', 'utf8');
let bc = 0, pc = 0;
for (let i = 0; i < c.length; i++) {
  const ch = c[i];
  if (ch === '{') bc++;
  else if (ch === '}') bc--;
}
console.log('Brace balance:', bc === 0 ? 'OK' : `OFF by ${bc}`);
