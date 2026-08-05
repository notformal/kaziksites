// Авторские FLUX-обложки для всех 127 слот-титулов.
//
// Имя титула = «прилагательное + семейство» (Aurora Orchard, Ruby Harbor …).
// Промпт собирается из ЧЕТЫРЁХ слоёв, поэтому ни одна пара обложек не повторяет
// композицию, а линейка при этом читается как один издательский портфель:
//   1. сюжет      — config/cover-scenes.json, 19 уникальных сцен на семейство
//                   (по одной на титул: индекс = порядковый номер внутри семьи);
//   2. ракурс     — FRAMINGS, шаг ×5 (взаимно прост с 7 → не коррелирует с погодой);
//   3. погода     — CONDITIONS, шаг ×3;
//   4. палитра и фокусный объект — MOODS и SIGNATURE_ELEMENTS по прилагательному.
//
//   node scripts/generate-title-covers.mjs                      # все, кого нет на диске
//   node scripts/generate-title-covers.mjs --force              # перегенерировать всё
//   node scripts/generate-title-covers.mjs slot-original-005    # точечно
//
// Env: COMFY_URL (default http://127.0.0.1:8188), FLUX_DTYPE, FLUX_STEPS.
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { resolveFromRoot } from "../config/index.mjs";

const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const DTYPE = process.env.FLUX_DTYPE || "fp8_e4m3fn";
const STEPS = Number(process.env.FLUX_STEPS || 22);
const SIZE = { width: 832, height: 1088 };
const JPEG_QUALITY = 0.88;

// Время суток и погода — расходится по титулам внутри семейства, поэтому
// одно и то же место у трёх титулов выглядит как три разные картины.
const CONDITIONS = [
  "at deep night under a sky full of stars",
  "at golden sunrise with long warm shadows",
  "during a dramatic thunderstorm, rain and lightning",
  "in dense drifting fog at blue hour",
  "at fiery sunset with the sky ablaze",
  "under heavy falling snow in still air",
  "in the last minutes of twilight, first lamps lit",
];


// Фокусный объект: закреплён за прилагательным, поэтому «Aurora Orchard» и
// «Silver Orchard» — это две разные картины, а не одна в двух оттенках.
const SIGNATURE_ELEMENTS = {
  Aurora: "shimmering ribbons of polar light threading through the scene",
  Velvet: "heavy draped velvet fabric and scattered rose petals",
  Solar: "blinding sun flare and floating motes of gold dust",
  Lunar: "an oversized pale moon dominating the sky and moth wings in the air",
  Neon: "buzzing neon tubing and rain-slick reflective surfaces",
  Crystal: "clusters of raw quartz crystal growing out of every surface",
  Golden: "cascading gold coins and gilded filigree ornament",
  Silver: "antique silver chains, mirrors and mercury-like liquid metal",
  Ruby: "enormous faceted ruby shards catching the light",
  Emerald: "creeping emerald moss and jade carvings",
  Cosmic: "a nebula visible through a torn sky and drifting asteroids",
  Mystic: "floating runic sigils and slow-curling arcane smoke",
  Electric: "arcing lightning filaments and static sparks",
  Royal: "heraldic banners, a jewelled crown and marble columns",
  Lucky: "four-leaf clover motifs and lucky horseshoes wreathed in light",
  Radiant: "blooming god rays and a halo of pure white light",
  Arctic: "hanging icicles, frost patterns and drifting snow",
  Tropical: "monstera leaves, orchids and iridescent hummingbirds",
  Stellar: "constellation lines drawn in light and falling stardust",
};

// Композиционные модификаторы — второй слой различия внутри одного семейства.
const FRAMINGS = [
  "wide cinematic establishing shot",
  "dramatic low angle looking up",
  "intimate close-up with shallow depth of field",
  "symmetrical centered composition",
  "elevated three-quarter view",
  "sweeping diagonal composition",
  "atmospheric long-lens shot with compressed depth",
];

// Прилагательное: палитра и материал — задают характер конкретного титула.
const MOODS = {
  Aurora: "aurora borealis palette of mint green and cyan, cold northern light",
  Velvet: "deep violet and magenta velvet palette, soft plush shadows",
  Solar: "blazing gold and amber palette, sun-drenched highlights",
  Lunar: "silver-blue moonlit palette, pale cold glow",
  Neon: "electric neon palette of hot pink and cyan, glowing tube light",
  Crystal: "clear prismatic crystal palette, refracted rainbow highlights on white",
  Golden: "warm antique gold palette, burnished metal and honey light",
  Silver: "polished silver and pearl grey palette, cool metallic sheen",
  Ruby: "deep ruby red and crimson palette, glowing gemstone light",
  Emerald: "rich emerald green and jade palette, verdant glow",
  Cosmic: "cosmic indigo and starfield palette, nebula clouds",
  Mystic: "mystical purple and teal palette, arcane mist and runic glow",
  Electric: "electric blue and white lightning palette, crackling energy",
  Royal: "royal blue and gold palette, heraldic opulence",
  Lucky: "lucky clover green and gold palette, warm fortunate glow",
  Radiant: "radiant white-gold palette, blooming light rays",
  Arctic: "arctic ice blue and white palette, frozen crystalline air",
  Tropical: "tropical turquoise and coral palette, lush humid light",
  Stellar: "stellar platinum and deep blue palette, distant suns",
};

const STYLE =
  ", premium online slot game key art, cinematic composition, dramatic volumetric lighting, " +
  "rich saturated colors, ultra detailed digital painting, high production value, " +
  "no text, no letters, no words, no watermark, no people";
const NEG =
  "text, letters, words, numbers, watermark, signature, logo, ui, interface, frame, border, " +
  "people, face, hands, blurry, low quality, deformed, jpeg artifacts";

const post = (p, body) =>
  fetch(COMFY_URL + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const get = (p) => fetch(COMFY_URL + p).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const workflow = (prompt, seed, prefix) => ({
  1: { class_type: "UNETLoader", inputs: { unet_name: "flux1-dev.safetensors", weight_dtype: DTYPE } },
  2: { class_type: "DualCLIPLoader", inputs: { clip_name1: "clip_l.safetensors", clip_name2: "t5xxl_fp16.safetensors", type: "flux" } },
  3: { class_type: "VAELoader", inputs: { vae_name: "ae.safetensors" } },
  4: { class_type: "CLIPTextEncode", inputs: { text: prompt + STYLE, clip: ["2", 0] } },
  5: { class_type: "CLIPTextEncode", inputs: { text: NEG, clip: ["2", 0] } },
  6: { class_type: "EmptyLatentImage", inputs: { width: SIZE.width, height: SIZE.height, batch_size: 1 } },
  7: { class_type: "ModelSamplingFlux", inputs: { max_shift: 1.15, base_shift: 0.5, width: SIZE.width, height: SIZE.height, model: ["1", 0] } },
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

const seedOf = (id) => [...id].reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) >>> 0, 5381);

async function waitForResult(promptId) {
  for (let i = 0; i < 300; i++) {
    await sleep(1500);
    const history = await get(`/history/${promptId}`);
    const entry = history[promptId];
    if (entry?.status?.completed) {
      for (const output of Object.values(entry.outputs || {}))
        if (output.images?.length) return output.images[0];
      throw new Error("completed without images");
    }
    if (entry?.status?.status_str === "error") throw new Error("comfy error");
  }
  throw new Error("timeout");
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const titles = JSON.parse(await readFile(resolveFromRoot("apps/lobby/src/slot-titles.generated.json"), "utf8"));
// 19 уникальных сюжетов на каждое семейство — по одному на титул.
const SUBJECTS = JSON.parse(await readFile(resolveFromRoot("config/cover-scenes.json"), "utf8"));
const outDir = resolveFromRoot("apps/lobby/public/covers-v2");
await mkdir(outDir, { recursive: true });

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const jobs = [];
for (const title of titles) {
  if (only.length && !only.includes(title.id)) continue;
  const [adjective, ...rest] = title.title.split(" ");
  const subject = rest.join(" ");
  // Индекс титула внутри семейства даёт свою сцену и свой ракурс.
  const ordinal = Number(title.id.slice(-3)) - 1;
  const scenes = SUBJECTS[subject];
  const scene = scenes?.[ordinal % scenes.length]; // 19 сцен на 19 титулов семейства
  const framing = FRAMINGS[(ordinal * 5) % FRAMINGS.length];
  const condition = CONDITIONS[(ordinal * 3) % CONDITIONS.length];
  const mood = MOODS[adjective];
  const element = SIGNATURE_ELEMENTS[adjective];
  if (!scene || !mood || !element) {
    console.error(`${title.id}: нет словаря для «${title.title}»`);
    process.exitCode = 1;
    continue;
  }
  const out = path.join(outDir, `${title.id}.jpg`);
  if (!force && (await exists(out))) continue;
  jobs.push({ id: title.id, name: title.title, prompt: `${framing} of ${scene}, ${condition}, ${element}, ${mood}`, out });
}

if (!jobs.length) {
  console.log("Все обложки уже на месте (--force для перегенерации).");
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

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

console.log(`К генерации: ${jobs.length} обложек.`);
let done = 0;
for (const job of jobs) {
  const started = Date.now();
  try {
    const queued = await post("/prompt", { prompt: workflow(job.prompt, seedOf(job.id), `nova-${job.id}`) });
    if (!queued.prompt_id) throw new Error(JSON.stringify(queued).slice(0, 200));
    const image = await waitForResult(queued.prompt_id);
    const bytes = await fetch(
      `${COMFY_URL}/view?filename=${encodeURIComponent(image.filename)}&type=${image.type || "output"}&subfolder=${encodeURIComponent(image.subfolder || "")}`,
    ).then((r) => r.arrayBuffer());
    await writeFile(job.out, await toJpeg(bytes));
    done++;
    console.log(`[${done}/${jobs.length}] ${job.id} «${job.name}» — ${((Date.now() - started) / 1000).toFixed(0)}s`);
  } catch (error) {
    console.error(`[!] ${job.id}: ${error.message}`);
    process.exitCode = 1;
  }
}

await browser.close();
console.log(`Готово: ${done}/${jobs.length}.`);
