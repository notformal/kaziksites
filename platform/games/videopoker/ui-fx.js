// Визуальные эффекты игр. Ни одного внешнего ассета: частицы, вспышки и роллап
// счётчика рисуются DOM-элементами и Web Animations API, поэтому весят ноль и
// красятся текущей темой игры.
//
// Все длительности и количества — в FX_CONFIG: подкрутить «сочность» можно не
// трогая код эффектов.

export const FX_CONFIG = {
  burst: { count: 26, spread: 180, distance: 190, size: [4, 11], duration: [520, 1100], gravity: 140 },
  coins: { count: 34, duration: [1100, 2000], size: [12, 26], sway: 90 },
  countUp: { duration: 900, minStep: 1 },
  flash: { duration: 420, opacity: 0.5 },
  shake: { duration: 420, amplitude: 9 },
  bigWinMultiplier: 12,
};

const reduceMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const rand = (min, max) => min + Math.random() * (max - min);

function layer() {
  let node = document.querySelector(".fxLayer");
  if (!node) {
    node = document.createElement("div");
    node.className = "fxLayer";
    node.setAttribute("aria-hidden", "true");
    document.body.append(node);
  }
  return node;
}

function themeColors() {
  const style = getComputedStyle(document.documentElement);
  return ["--c-primary", "--c-gold", "--c-secondary", "--c-win"]
    .map((name) => style.getPropertyValue(name).trim())
    .filter(Boolean);
}

/** Точка взрыва частиц: элемент, событие или {x,y}. */
function originOf(target) {
  if (!target) return { x: innerWidth / 2, y: innerHeight / 2 };
  if (typeof target.x === "number") return target;
  const rect = target.getBoundingClientRect?.();
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 };
}

/** Разлёт искр из точки — обратная связь на выигрыш или на удачное действие. */
export function burst(target, options = {}) {
  if (reduceMotion()) return;
  const config = { ...FX_CONFIG.burst, ...options };
  const { x, y } = originOf(target);
  const colors = options.colors || themeColors();
  const host = layer();
  for (let i = 0; i < config.count; i++) {
    const dot = document.createElement("i");
    const size = rand(config.size[0], config.size[1]);
    const angle = ((rand(-config.spread, config.spread) - 90) * Math.PI) / 180;
    const distance = rand(config.distance * 0.35, config.distance);
    const duration = rand(config.duration[0], config.duration[1]);
    Object.assign(dot.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      background: colors[i % colors.length],
      willChange: "transform, opacity",
    });
    host.append(dot);
    dot
      .animate(
        [
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${
              Math.sin(angle) * distance + config.gravity
            }px)) scale(0.2) rotate(${rand(-180, 180)}deg)`,
            opacity: 0,
          },
        ],
        { duration, easing: "cubic-bezier(.2,.7,.3,1)" },
      )
      .finished.finally(() => dot.remove());
  }
}

/** Дождь монет — только для крупных выигрышей, иначе теряет ценность. */
export function coinRain(options = {}) {
  if (reduceMotion()) return;
  const config = { ...FX_CONFIG.coins, ...options };
  const host = layer();
  const gold = getComputedStyle(document.documentElement).getPropertyValue("--c-gold").trim();
  for (let i = 0; i < config.count; i++) {
    const coin = document.createElement("i");
    const size = rand(config.size[0], config.size[1]);
    const startX = rand(0, innerWidth);
    Object.assign(coin.style, {
      position: "absolute",
      left: `${startX}px`,
      top: "-40px",
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: `radial-gradient(circle at 35% 30%, #fff8, ${gold})`,
      boxShadow: `0 0 12px ${gold}66`,
      willChange: "transform, opacity",
    });
    host.append(coin);
    coin
      .animate(
        [
          { transform: "translateY(0) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${rand(-config.sway, config.sway)}px, ${innerHeight + 80}px) rotate(${rand(180, 720)}deg)`,
            opacity: 0.9,
          },
        ],
        { duration: rand(config.duration[0], config.duration[1]), delay: rand(0, 500), easing: "cubic-bezier(.3,.1,.7,1)" },
      )
      .finished.finally(() => coin.remove());
  }
}

/** Плавный набор числа — выигрыш «растёт», а не появляется скачком. */
export function countUp(element, from, to, options = {}) {
  if (!element) return Promise.resolve();
  const duration = reduceMotion() ? 0 : (options.duration ?? FX_CONFIG.countUp.duration);
  const format = options.format || ((value) => Math.round(value).toLocaleString(options.locale || "en"));
  if (!duration) {
    element.textContent = format(to);
    return Promise.resolve();
  }
  const started = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      // Отметка кадра rAF — это НАЧАЛО кадра, и она может быть раньше момента,
      // когда мы запросили анимацию. Без нижней отсечки первый кадр даёт
      // отрицательный progress, а с ним и отрицательное число на табло
      // (наблюдалось «-21» при выигрыше 1958). Прогресс всегда 0…1.
      const progress = Math.min(1, Math.max(0, (now - started) / duration));
      const eased = 1 - (1 - progress) ** 3;
      element.textContent = format(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Вспышка экрана цветом состояния — читается боковым зрением. */
export function flash(state = "win", options = {}) {
  if (reduceMotion()) return;
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue(state === "lose" ? "--c-loss" : "--c-gold").trim();
  const veil = document.createElement("div");
  Object.assign(veil.style, {
    position: "absolute",
    inset: "0",
    background: `radial-gradient(circle at 50% 45%, ${color}, transparent 70%)`,
  });
  layer().append(veil);
  veil
    .animate([{ opacity: 0 }, { opacity: options.opacity ?? FX_CONFIG.flash.opacity }, { opacity: 0 }], {
      duration: options.duration ?? FX_CONFIG.flash.duration,
      easing: "ease-out",
    })
    .finished.finally(() => veil.remove());
}

/** Тряска элемента — проигрыш или отказ действия. */
export function shake(element, options = {}) {
  if (!element || reduceMotion()) return;
  const amplitude = options.amplitude ?? FX_CONFIG.shake.amplitude;
  element.animate(
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${-amplitude}px)` },
      { transform: `translateX(${amplitude * 0.8}px)` },
      { transform: `translateX(${-amplitude * 0.5}px)` },
      { transform: "translateX(0)" },
    ],
    { duration: options.duration ?? FX_CONFIG.shake.duration, easing: "ease-out" },
  );
}

/**
 * Полный отклик на результат раунда: числа, искры, вспышка, монеты.
 * Игре достаточно одного вызова — сила эффекта берётся из множителя.
 */
export function celebrate({ element, from = 0, to = 0, multiplier = 0, locale = "en" } = {}) {
  const win = to > from || multiplier > 0;
  if (element) countUp(element, from, to, { locale });
  if (!win) return;
  burst(element);
  flash("win");
  if (multiplier >= FX_CONFIG.bigWinMultiplier) coinRain();
}
