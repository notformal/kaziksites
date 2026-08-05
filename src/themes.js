// ═══════════════════════════════════════════════════════════
// BRAND THEMES — Aurora Play, Ember Club, Royale House
// ═══════════════════════════════════════════════════════════

export const themes = {
  aurora: {
    id: 'aurora',
    name: 'Aurora Play',
    tag: 'PLAY BEYOND',
    accent: '#8cff3f',
    accent2: '#33d6ff',
    hero: 'The next level of play.',
    copy: 'A precision-built social casino floor of original slots and tables.',
    badge: '10K PLAYERS ONLINE',
    // Extended theme properties for advanced UI
    gradient: 'linear-gradient(135deg, #8cff3f 0%, #33d6ff 50%, #a855f7 100%)',
    bgGradient: 'radial-gradient(circle at 80% 5%, rgba(140,255,63,0.09), transparent 28%)',
    orbGradient: 'linear-gradient(135deg, #33d6ff, #20143c 55%, #8cff3f)',
    cardBg: '#10131c',
    headerBg: 'rgba(7,9,16,0.85)',
    glassBorder: 'rgba(255,255,255,0.12)',
    glowColor: 'rgba(140,255,63,0.3)',
    // Typography
    heroFont: "'Manrope', sans-serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    // Animations
    particleColor: '#8cff3f',
    particleCount: 30,
    // Sound theme
    soundTheme: 'ethereal',
    // Features
    dailyRewardMultiplier: 1.2,
    welcomeBonus: '5000 FREE COINS + 10 SPINS',
    loyaltyTier: ['🌱 Sprout', '🌿 Bloom', '🌸 Blossom', '🌺 Aurora'],
    // Social proof
    playerCount: 10247,
    topGame: 'Cosmic Queen',
    bigWinAmount: '2,450,000',
  },
  ember: {
    id: 'ember',
    name: 'Ember Club',
    tag: 'THE NIGHT IS YOURS',
    accent: '#ffb02e',
    accent2: '#ff4d6d',
    hero: 'Turn up the thrill.',
    copy: 'Electric games, live rewards and a members-club atmosphere—every night.',
    badge: 'WEEKEND DROP LIVE',
    // Extended theme properties
    gradient: 'linear-gradient(135deg, #ffb02e 0%, #ff4d6d 50%, #ff8c00 100%)',
    bgGradient: 'radial-gradient(circle at 80% 5%, rgba(255,77,109,0.1), transparent 30%)',
    orbGradient: 'linear-gradient(135deg, #ff4d6d, #3c1420 55%, #ffb02e)',
    cardBg: '#1a0f14',
    headerBg: 'rgba(16,7,10,0.85)',
    glassBorder: 'rgba(255,176,46,0.15)',
    glowColor: 'rgba(255,176,46,0.3)',
    // Typography
    heroFont: "'Manrope', sans-serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    // Animations
    particleColor: '#ffb02e',
    particleCount: 25,
    // Sound theme
    soundTheme: 'energetic',
    // Features
    dailyRewardMultiplier: 1.5,
    welcomeBonus: '8000 FREE COINS + 25 SPINS',
    loyaltyTier: ['🔥 Spark', '🔥 Flame', '🔥 Blaze', '🔥 Inferno'],
    // Social proof
    playerCount: 8934,
    topGame: "Dragon's Fortune",
    bigWinAmount: '5,120,000',
  },
  royale: {
    id: 'royale',
    name: 'Royale House',
    tag: 'CURATED ENTERTAINMENT',
    accent: '#e9c46a',
    accent2: '#72d6c9',
    hero: 'Play, beautifully.',
    copy: 'A refined collection of modern casino classics, selected for exceptional play.',
    badge: "MEMBERS' SELECTION",
    // Extended theme properties
    gradient: 'linear-gradient(135deg, #e9c46a 0%, #72d6c9 50%, #e9c46a 100%)',
    bgGradient: 'radial-gradient(circle at 80% 5%, rgba(233,196,106,0.08), transparent 28%)',
    orbGradient: 'linear-gradient(135deg, #72d6c9, #0f1a18 55%, #e9c46a)',
    cardBg: '#0f1412',
    headerBg: 'rgba(13,17,16,0.85)',
    glassBorder: 'rgba(233,196,106,0.12)',
    glowColor: 'rgba(233,196,106,0.25)',
    // Typography
    heroFont: "'Playfair Display', serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    // Animations
    particleColor: '#e9c46a',
    particleCount: 20,
    // Sound theme
    soundTheme: 'refined',
    // Features
    dailyRewardMultiplier: 2.0,
    welcomeBonus: '10000 FREE COINS + 50 SPINS',
    loyaltyTier: ['🥉 Bronze', '🥈 Silver', '🥇 Gold', '💎 Diamond'],
    // Social proof
    playerCount: 6521,
    topGame: 'Blackjack Pro',
    bigWinAmount: '8,750,000',
  },
};

// Theme helper functions
export function getThemeForBrand(brand) {
  return themes[brand] || themes.aurora;
}

export function applyThemeToDocument(brand) {
  const theme = getThemeForBrand(brand);
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent2', theme.accent2);
  document.documentElement.style.setProperty('--gradient', theme.gradient);
  document.documentElement.style.setProperty('--card-bg', theme.cardBg);
  document.body.style.background = `${theme.bgGradient}, #070910`;
}

// Color utility functions
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

export function mixColors(color1, color2, weight = 0.5) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * weight);
  const g = Math.round(c1.g + (c2.g - c1.g) * weight);
  const b = Math.round(c1.b + (c2.b - c1.b) * weight);
  return `rgb(${r},${g},${b})`;
}

export function withAlpha(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}