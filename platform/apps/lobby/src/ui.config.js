// Настройки витрины лобби. Всё, что раньше было зашито в JSX, живёт здесь —
// менять поведение каталога можно без правок компонентов.
export const UI = {
  /** Сколько карточек показывать за одну «страницу» каталога. */
  pageSize: 24,
  /** Задержка перед отправкой поискового события в аналитику, мс. */
  searchTrackDelayMs: 400,
  /** Ежедневная выдача виртуальных кредитов (используется в тексте награды). */
  dailyRewardCredits: 250,
  /** Дневная миссия: сколько разных игр нужно открыть. */
  dailyMissionTarget: 3,
  /** Максимум студий в витрине платформ. */
  studioRailLimit: 8,
  /** Каталог обложек. */
  coverPath: "/covers-v2",
  /** Минимум уникальных игроков, ниже которого соц-блоки скрыты (приватность). */
  privacyThreshold: 3,
  /** Периоды таблицы лидеров: id для API → ключ перевода. */
  leaderboardPeriods: [
    { id: "daily", labelKey: "social.periodDaily" },
    { id: "weekly", labelKey: "social.periodWeekly" },
    { id: "all-time", labelKey: "social.periodAll" },
  ],
  /** Сортировки каталога: value → ключ перевода. */
  sortOptions: [
    { value: "featured", labelKey: "catalog.sortFeatured" },
    { value: "rating", labelKey: "catalog.sortRating" },
    { value: "new", labelKey: "catalog.sortNew" },
    { value: "name", labelKey: "catalog.sortName" },
  ],
};
