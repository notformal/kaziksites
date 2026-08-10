// Generate procedural cover images for all games
const fs = require('fs');
const path = require('path');

function generateSVG(name, emoji, color1, color2) {
  const w = 400, h = 225;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1}"/>
        <stop offset="100%" style="stop-color:${color2}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="${w/2}" y="${h/2-10}" text-anchor="middle" dominant-baseline="central" font-size="56">${emoji}</text>
    <text x="${w/2}" y="${h/2+40}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="16" fill="white" letter-spacing="2">${name.toUpperCase()}</text>
  </svg>`;
  return Buffer.from(svg);
}

const covers = [
  { dir: 'plinko-master', name: 'Plinko Master', emoji: '🔻', c1: '#22c55e', c2: '#06b6d4' },
  { dir: 'mines-premium', name: 'Mines Premium', emoji: '💎', c1: '#ef4444', c2: '#a855f7' },
  { dir: 'crash-pro', name: 'Crash Pro', emoji: '🚀', c1: '#a855f7', c2: '#ec4899' },
  { dir: 'lightning-dice', name: 'Lightning Dice', emoji: '⚡', c1: '#fbbf24', c2: '#ef4444' },
  { dir: 'blackjack-pro', name: 'Blackjack Pro', emoji: '🃏', c1: '#10b981', c2: '#059669' },
  { dir: 'baccarat-pro', name: 'Baccarat Pro', emoji: '🎴', c1: '#8b5cf6', c2: '#6d28d9' },
  { dir: 'roulette-royale', name: 'Roulette Royale', emoji: '🎡', c1: '#dc2626', c2: '#991b1b' },
  { dir: 'fruit-shop', name: 'Fruit Shop', emoji: '🍒', c1: '#f59e0b', c2: '#ea580c' },
];

covers.forEach(function(c) {
  const outDir = path.join(__dirname, '..', 'public', 'games', c.dir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const buf = generateSVG(c.name, c.emoji, c.c1, c.c2);
  fs.writeFileSync(path.join(outDir, 'cover.png'), buf);
  console.log(`✓ ${c.dir}: cover generated (${buf.length} bytes)`);
});

console.log('\nAll covers done!');
