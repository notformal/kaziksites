// Звук игр — полностью синтезированный через Web Audio. Ни одного mp3: тембр
// собирается из осцилляторов и шума, поэтому звучание уникально для проекта,
// весит ноль байт и подстраивается под настроение темы.
//
// Все ноты, длительности и тембры — в SOUND_CONFIG. Новый звук добавляется
// строкой в VOICES, а не правкой движка.

export const SOUND_CONFIG = {
  masterVolume: 0.32,
  storageKey: "casino_sound_muted",
  /** Настроение темы → базовый тембр и подстройка высоты. */
  moods: {
    calm: { wave: "sine", detune: -60, brightness: 1400 },
    electric: { wave: "triangle", detune: 0, brightness: 2600 },
    hot: { wave: "sawtooth", detune: 40, brightness: 3200 },
    luxe: { wave: "sine", detune: -20, brightness: 1800 },
    deep: { wave: "triangle", detune: -90, brightness: 1100 },
  },
};

/** Голоса: последовательности нот (полутонов от A4) и огибающие. */
const VOICES = {
  click: { notes: [[12, 0, 0.05]], gain: 0.25, noise: 0 },
  bet: { notes: [[7, 0, 0.07], [14, 0.05, 0.08]], gain: 0.3, noise: 0 },
  tick: { notes: [[19, 0, 0.03]], gain: 0.16, noise: 0 },
  spin: { notes: [[-5, 0, 0.5]], gain: 0.22, noise: 0.35, sweep: [180, 900] },
  reelStop: { notes: [[2, 0, 0.09]], gain: 0.28, noise: 0.15 },
  reveal: { notes: [[9, 0, 0.12], [16, 0.08, 0.14]], gain: 0.26, noise: 0 },
  win: { notes: [[0, 0, 0.18], [4, 0.08, 0.2], [7, 0.16, 0.26]], gain: 0.34, noise: 0 },
  bigWin: {
    notes: [[0, 0, 0.2], [4, 0.09, 0.2], [7, 0.18, 0.22], [12, 0.27, 0.3], [16, 0.36, 0.42]],
    gain: 0.4,
    noise: 0,
  },
  cashout: { notes: [[12, 0, 0.12], [19, 0.1, 0.24]], gain: 0.32, noise: 0 },
  lose: { notes: [[-3, 0, 0.16], [-8, 0.1, 0.28]], gain: 0.26, noise: 0.05 },
  error: { notes: [[-10, 0, 0.14], [-10, 0.12, 0.16]], gain: 0.24, noise: 0 },
};

const A4 = 440;
const noteToHz = (semitones) => A4 * 2 ** (semitones / 12);

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.mood = SOUND_CONFIG.moods.electric;
    this.muted = this.readMuted();
  }

  readMuted() {
    try {
      return localStorage.getItem(SOUND_CONFIG.storageKey) === "1";
    } catch {
      return false;
    }
  }

  /** Настраивает тембр под тему игры. Вызывается один раз при старте. */
  setMood(mood) {
    this.mood = SOUND_CONFIG.moods[mood] || SOUND_CONFIG.moods.electric;
  }

  /** Контекст создаётся лениво: браузеры запрещают звук до жеста пользователя. */
  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : SOUND_CONFIG.masterVolume;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(SOUND_CONFIG.storageKey, muted ? "1" : "0");
    } catch {
      /* приватный режим — просто не запоминаем */
    }
    if (this.master) this.master.gain.value = muted ? 0 : SOUND_CONFIG.masterVolume;
  }

  toggle() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  noiseBuffer(seconds) {
    const frames = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    return buffer;
  }

  /** Воспроизводит голос. pitch сдвигает всю фразу (например, рост множителя). */
  play(voiceName, { pitch = 0, gain = 1 } = {}) {
    const voice = VOICES[voiceName];
    if (!voice || this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    for (const [semitone, delay, duration] of voice.notes) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = this.mood.brightness;
      osc.type = this.mood.wave;
      osc.detune.value = this.mood.detune;
      const frequency = noteToHz(semitone + pitch);
      osc.frequency.setValueAtTime(frequency, now + delay);
      if (voice.sweep) {
        osc.frequency.setValueAtTime(voice.sweep[0], now + delay);
        osc.frequency.exponentialRampToValueAtTime(voice.sweep[1], now + delay + duration);
      }
      const peak = voice.gain * gain;
      env.gain.setValueAtTime(0.0001, now + delay);
      env.gain.exponentialRampToValueAtTime(peak, now + delay + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(filter).connect(env).connect(this.master);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.02);
    }

    if (voice.noise) {
      const source = ctx.createBufferSource();
      const env = ctx.createGain();
      const total = voice.notes.at(-1)[1] + voice.notes.at(-1)[2];
      source.buffer = this.noiseBuffer(total);
      env.gain.value = voice.noise * gain * 0.5;
      source.connect(env).connect(this.master);
      source.start(now);
    }
  }
}

export const audio = new GameAudio();

/**
 * Подключает звук к игре: настраивает тембр и вешает клики.
 * Возвращает функцию play, чтобы игра не импортировала объект напрямую.
 */
export function initAudio({ mood = "electric", clickSelector = "button" } = {}) {
  audio.setMood(mood);
  if (clickSelector && typeof document !== "undefined") {
    document.addEventListener("pointerdown", (event) => {
      if (event.target.closest(clickSelector)) audio.play("click");
    });
  }
  return (voice, options) => audio.play(voice, options);
}
