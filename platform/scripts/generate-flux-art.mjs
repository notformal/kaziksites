// Авторский рисованный арт через ComfyUI + FLUX.1-dev: обложки 16 core-игр и
// hero-иллюстрации трёх брендов. Граф и параметры взяты из проверенного
// generate-slot-symbols.mjs (FLUX, не SDXL: SDXL на этом GPU декодирует чёрное).
//
//   node scripts/generate-flux-art.mjs               # всё: 16 обложек + 3 hero
//   node scripts/generate-flux-art.mjs game-11 hero-aurora
//
// Env: COMFY_URL (default http://127.0.0.1:8188), FLUX_DTYPE (default fp8_e4m3fn).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { resolveFromRoot } from "../config/index.mjs";

const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const DTYPE = process.env.FLUX_DTYPE || "fp8_e4m3fn";
const STEPS = Number(process.env.FLUX_STEPS || 24);
const COVER_SIZE = { width: 832, height: 1088 }; // портрет карточки каталога (~1:1.3)
const HERO_SIZE = { width: 1216, height: 832 }; // ландшафт hero-сцены бренда
const JPEG_QUALITY = 0.9;

// Единый стиль серии: обложки читаются как один издательский портфель.
const STYLE =
  ", premium online casino game key art, dramatic cinematic lighting, rich saturated colors, " +
  "depth of field, ultra detailed digital painting, high production value, no text, no letters, no watermark";
const NEG =
  "text, letters, words, numbers, watermark, logo, ui, interface, frame, border, blurry, low quality, deformed, extra limbs, photo of a person";

/** Сюжет каждой обложки — тема игры, палитра из config/game-themes.json. */
const COVERS = {
  "game-6": "a majestic classic slot machine with glowing golden seven and jewel symbols on its reels, purple velvet casino backdrop, gold coins in the air",
  "game-7": "a sleek rocket ascending steeply above a neon night city skyline, fiery exhaust trail forming a rising graph curve, red and orange glow",
  "game-8": "a luminous golden orb bouncing down through a pyramid of glowing teal pegs, light trails, dark emerald background",
  "game-9": "an elegant european roulette wheel in close-up, ivory ball landing on a number, deep green felt and polished gold details",
  "game-10": "glowing numbered lottery spheres floating and swirling above a dark teal grid, one sphere shining brighter than the rest",
  "game-11": "two large glowing dice frozen mid-roll above a dark cyan table, sharp light streaks, electric blue energy",
  "game-12": "a small spacecraft climbing a vertical beam of violet light into deep space, stars streaking past, rising multiplier feel",
  "game-13": "an ornate golden wheel of fortune with jeweled segments spinning amid violet mist, sparks flying from its rim",
  "game-14": "glowing green gems scattered on a dark metallic grid with one ominous naval mine among them, tension and treasure",
  "game-15": "two playing cards standing on green felt with a golden arrow rising between them, casino chips around, warm lamp light",
  "game-16": "three ivory dice tumbling inside a glass dome on a crimson silk table, motion blur, red and amber highlights",
  "game-17": "a baccarat table with two face-down cards and towers of golden chips, deep green and gold, banker's shoe nearby",
  "game-18": "an american roulette wheel with double zero pocket highlighted, dark wood and brass, golden bokeh lights",
  "game-19": "a blackjack hand of ace and king sliding across green felt toward stacks of chips, dramatic overhead light",
  "game-20": "hole cards and community cards on a midnight blue poker table, chips pushed all-in, moody spotlight",
  "game-21": "a retro-futuristic video poker cabinet screen glowing with a royal flush of hearts, purple and cyan neon reflections",
  // Флагманские слоты на движке slotEngine — премиум-линейка витрины.
  "game-22": "an opulent royal slot machine of carved gold and lacquer, ten jewelled payline rails converging on its reels, crown motif above",
  "game-23": "a vault of 243 floating gemstones arranged in a glowing lattice, light paths connecting them into countless winning routes",
  "game-24": "a mountain of tumbling crystal blocks collapsing and re-forming in mid-air, cascade of shards catching light on the way down",
};

/** Hero-сцены брендов: настроение из их дизайн-кода, без текста. */
const HEROES = {
  "hero-aurora": "abstract casino floor dissolving into flowing neon signal waves, lime green and cyan light ribbons over deep charcoal blue, sleek high-tech atmosphere, wide establishing shot",
  "hero-ember": "a late-night casino lounge bathed in hot orange and magenta glow, slot reels and sparks blurred in motion, embers drifting in the dark, cinematic wide shot",
  "hero-royale": "an art-deco private casino salon in emerald and gold, geometric golden rays, marble and brass details, quiet luxury, symmetrical wide composition",
};

const post = (p, body) =>
  fetch(COMFY_URL + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const get = (p) => fetch(COMFY_URL + p).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const workflow = (prompt, seed, size, prefix) => ({
  1: { class_type: "UNETLoader", inputs: { unet_name: "flux1-dev.safetensors", weight_dtype: DTYPE } },
  2: { class_type: "DualCLIPLoader", inputs: { clip_name1: "clip_l.safetensors", clip_name2: "t5xxl_fp16.safetensors", type: "flux" } },
  3: { class_type: "VAELoader", inputs: { vae_name: "ae.safetensors" } },
  4: { class_type: "CLIPTextEncode", inputs: { text: prompt + STYLE, clip: ["2", 0] } },
  5: { class_type: "CLIPTextEncode", inputs: { text: NEG, clip: ["2", 0] } },
  6: { class_type: "EmptyLatentImage", inputs: { width: size.width, height: size.height, batch_size: 1 } },
  7: { class_type: "ModelSamplingFlux", inputs: { max_shift: 1.15, base_shift: 0.5, width: size.width, height: size.height, model: ["1", 0] } },
  8: { class_type: "FluxGuidance", inputs: { guidance: 2.8, conditioning: ["4", 0] } },
  9: {
    class_type: "KSampler",
    inputs: {
      model: ["7", 0], positive: ["8", 0], negative: ["5", 0], latent_image: ["6", 0],
      seed, steps: STEPS, cfg: 1, sampler_name: "euler", scheduler: "simple", denoise: 1,
    },
  },
  10: { class_type: "VAEDecode", inputs: { samples: ["9", 0], vae: ["3", 0] } },
  11: { class_type: "SaveImage", inputs: { images: ["10", 0], filename_prefix: prefix } },
});

/** Детерминированный сид из id — перегенерация не меняет удачные обложки. */
const seedOf = (id) => [...id].reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) >>> 0, 5381);

async function waitForResult(promptId) {
  for (let i = 0; i < 240; i++) {
    await sleep(2000);
    const history = await get(`/history/${promptId}`);
    const entry = history[promptId];
    if (entry?.status?.completed) {
      for (const output of Object.values(entry.outputs || {}))
        if (output.images?.length) return output.images[0];
      throw new Error("completed without images");
    }
    if (entry?.status?.status_str === "error") throw new Error("comfy error");
  }
  throw new Error("timeout waiting for generation");
}

const only = process.argv.slice(2);
const jobs = [
  ...Object.entries(COVERS).map(([id, prompt]) => ({ id, prompt, size: COVER_SIZE, out: resolveFromRoot("apps/lobby/public/covers-v2", `${id}.jpg`) })),
  ...Object.entries(HEROES).map(([id, prompt]) => ({ id, prompt, size: HERO_SIZE, out: resolveFromRoot("apps/lobby/public/brand", `${id.replace("hero-", "hero-")}.jpg`) })),
].filter((job) => !only.length || only.includes(job.id));

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

/** PNG из ComfyUI → JPEG через canvas (SaveImage умеет только PNG). */
async function toJpeg(pngBytes) {
  const dataUri = `data:image/png;base64,${Buffer.from(pngBytes).toString("base64")}`;
  const jpeg = await page.evaluate(
    async ([src, quality]) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      return canvas.toDataURL("image/jpeg", quality).split(",")[1];
    },
    [dataUri, JPEG_QUALITY],
  );
  return Buffer.from(jpeg, "base64");
}

for (const job of jobs) {
  const started = Date.now();
  const queued = await post("/prompt", { prompt: workflow(job.prompt, seedOf(job.id), job.size, `nova-${job.id}`) });
  if (!queued.prompt_id) { console.error(`${job.id}: очередь отклонила задание`, queued); process.exitCode = 1; continue; }
  const image = await waitForResult(queued.prompt_id);
  const bytes = await fetch(`${COMFY_URL}/view?filename=${encodeURIComponent(image.filename)}&type=${image.type || "output"}&subfolder=${encodeURIComponent(image.subfolder || "")}`).then((r) => r.arrayBuffer());
  await mkdir(path.dirname(job.out), { recursive: true });
  await writeFile(job.out, await toJpeg(bytes));
  console.log(`${job.id}: ${((Date.now() - started) / 1000).toFixed(0)}s → ${path.relative(process.cwd(), job.out)}`);
}

await browser.close();
console.log(`Готово: ${jobs.length} изображений.`);
