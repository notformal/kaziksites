import slotTitles from "./slot-titles.generated.json";

// Каталог витрины — ТОЛЬКО казино-игры: серверные оригиналы (bet/settle через
// API, ни одного клиентского исхода) плюс 127 слот-титулов движка slots-studio.
// Никаких аркад и «залипалова» — портфель провайдера казино-контента.
//
// Один бандл может обслуживать несколько игр: engineSlug задаёт папку бандла,
// а engineId (?engine=) выбирает внутри неё математический движок. Так три
// премиум-слота slotEngine живут в одном games/slots-premium.
//
// id вида game-N сохранены со старого каталога: на них завязаны обложки
// (covers-v2/game-N.jpg), избранное и история игроков.
const CASINO_STUDIO = "Nova Studio";

const CORE_GAMES = [
  { id: "game-6", title: "Nova Classic Slots", category: "Slots", icon: "🎰", slug: "slots-classic", license: "MIT" },
  { id: "game-7", title: "Skyline Crash", category: "Crash", icon: "📈", slug: "crash", license: "Original" },
  { id: "game-8", title: "Prism Plinko", category: "Instant", icon: "🔻", slug: "plinko", license: "Original" },
  { id: "game-9", title: "European Roulette", category: "Table", icon: "🎡", slug: "roulette", license: "Original" },
  { id: "game-10", title: "Keno Plus", category: "Instant", icon: "🔢", slug: "keno", license: "Original" },
  { id: "game-11", title: "Nova Dice", category: "Instant", icon: "🎲", slug: "dice", license: "Original" },
  { id: "game-12", title: "Limbo", category: "Instant", icon: "🚀", slug: "limbo", license: "Original" },
  { id: "game-13", title: "Fortune Wheel", category: "Instant", icon: "🎯", slug: "wheel", license: "Original" },
  { id: "game-14", title: "Mines", category: "Instant", icon: "💣", slug: "mines", license: "Original" },
  { id: "game-15", title: "Hi-Lo", category: "Table", icon: "🃏", slug: "hilo", license: "Original" },
  { id: "game-16", title: "Sic Bo", category: "Table", icon: "🎲", slug: "sicbo", license: "Original" },
  { id: "game-17", title: "Baccarat", category: "Table", icon: "🎴", slug: "baccarat", license: "Original" },
  { id: "game-18", title: "American Roulette", category: "Table", icon: "🎡", slug: "roulette-us", license: "Original" },
  { id: "game-19", title: "Blackjack", category: "Table", icon: "♠️", slug: "blackjack", license: "Original" },
  { id: "game-20", title: "Casino Hold'em", category: "Table", icon: "🃏", slug: "holdem", license: "Original" },
  { id: "game-21", title: "Video Poker", category: "Table", icon: "🎴", slug: "videopoker", license: "Original" },
  // Премиум-слоты на движке slotEngine: три матпрофиля делят один бандл
  // games/slots-premium — движок выбирается engineId (→ ?engine= в iframe).
  // slug совпадает с id профиля в apps/api/src/gameRegistry.js: именно его
  // хост шлёт в /api/wallet/bet, поэтому ставка уходит в нужную математику.
  { id: "game-22", title: "Royal Lines", category: "Slots", icon: "👑", slug: "classic-lines", engineSlug: "slots-premium", engineId: "classic-lines", license: "Original" },
  { id: "game-23", title: "Gem Ways 243", category: "Slots", icon: "💎", slug: "ways-243", engineSlug: "slots-premium", engineId: "ways-243", license: "Original" },
  { id: "game-24", title: "Tumble Peaks", category: "Slots", icon: "🏔️", slug: "cascade-ways", engineSlug: "slots-premium", engineId: "cascade-ways", license: "Original" },
];

export const games = [
  ...CORE_GAMES.map((game, index) => ({
    studio: CASINO_STUDIO,
    serverGame: true,
    hot: index % 5 === 0,
    new: index % 9 === 0,
    rating: (4 + (index % 10) / 10).toFixed(1),
    hue: (index * 37) % 360,
    ...game,
  })),
  ...slotTitles,
];

export const categories = [
  "All",
  "Popular",
  "Favorites",
  "Recent",
  ...new Set(games.map((game) => game.category)),
];
