// Photoreal slot symbol-set generator (ComfyUI / FLUX.1-dev). Builds an "asset
// base": one image per engine symbol id, themed + consistent, into
// assets/slot-symbols/<theme>/. Symbol ids match slotEngine/slotLibrary so a set
// drops straight into a slot. FLUX is used (not SDXL) because SDXL decodes all-
// black on this GPU; FLUX dev renders correctly. Fetches via ComfyUI /view.
//
//   node scripts/generate-slot-symbols.mjs                       # default theme, all symbols
//   node scripts/generate-slot-symbols.mjs royal-gems-flux crown ruby
//
// Env: COMFY_URL (default http://127.0.0.1:8188), FLUX_DTYPE (default fp8_e4m3fn).
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const DTYPE = process.env.FLUX_DTYPE || "fp8_e4m3fn"; // fp8 keeps flux1-dev + t5xxl within VRAM

// theme -> { symbolId: subject prompt }. Card ranks re-skinned as gems so the
// whole reel reads as one set. A shared STYLE keeps every symbol consistent.
const THEMES = {
  "royal-gems-flux": {
    ten: "a large faceted sky-blue topaz gemstone, brilliant cut, sparkling internal facets",
    jack: "a large faceted green peridot gemstone, brilliant cut, sparkling",
    queen: "a large faceted purple amethyst gemstone, brilliant cut, sparkling",
    king: "a large faceted deep blue sapphire gemstone, brilliant cut, sparkling",
    ace: "a large faceted brilliant green emerald gemstone, sparkling",
    ruby: "a large faceted glowing red ruby gemstone, brilliant cut, sparkling",
    crown: "an ornate golden royal crown with a red velvet cushion, encrusted with colourful gemstones",
    wild: "a golden emblem plaque with the embossed word WILD, radiant golden star flare behind it",
    scatter: "a radiant golden five-pointed star medallion with sparkles, gemstone at its center",
  },
};
const STYLE =
  ", single centered object, front view, casino slot game icon, clean product photography, " +
  "solid deep teal studio background, soft even studio lighting, crisp sharp focus, ultra detailed 3d render, premium mobile casino game asset";
const NEG = "blurry, out of focus, bloom, glow, haze, extra objects, cluttered, text, watermark, logo, low quality, deformed";

const post = (p, b) => fetch(COMFY_URL + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());
const get = (p) => fetch(COMFY_URL + p).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Canonical FLUX.1-dev txt2img: FluxGuidance + KSampler cfg=1 (the distilled model
// needs guidance via FluxGuidance, not classic CFG) → sharp, clean renders.
const workflow = (prompt, seed, prefix) => ({
  1: { class_type: "UNETLoader", inputs: { unet_name: "flux1-dev.safetensors", weight_dtype: DTYPE } },
  2: { class_type: "DualCLIPLoader", inputs: { clip_name1: "clip_l.safetensors", clip_name2: "t5xxl_fp16.safetensors", type: "flux" } },
  3: { class_type: "VAELoader", inputs: { vae_name: "ae.safetensors" } },
  4: { class_type: "CLIPTextEncode", inputs: { text: prompt + STYLE, clip: ["2", 0] } },
  5: { class_type: "CLIPTextEncode", inputs: { text: NEG, clip: ["2", 0] } },
  6: { class_type: "EmptyLatentImage", inputs: { width: 1024, height: 1024, batch_size: 1 } },
  7: { class_type: "ModelSamplingFlux", inputs: { max_shift: 1.15, base_shift: 0.5, width: 1024, height: 1024, model: ["1", 0] } },
  40: { class_type: "FluxGuidance", inputs: { conditioning: ["4", 0], guidance: 2.8 } },
  8: { class_type: "KSampler", inputs: { seed, steps: 24, cfg: 1, sampler_name: "euler", scheduler: "simple", denoise: 1, model: ["7", 0], positive: ["40", 0], negative: ["5", 0], latent_image: ["6", 0] } },
  9: { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["3", 0] } },
  10: { class_type: "SaveImage", inputs: { filename_prefix: prefix, images: ["9", 0] } },
});

async function render(prompt, seed, prefix) {
  const { prompt_id } = await post("/prompt", { prompt: workflow(prompt, seed, prefix) });
  if (!prompt_id) throw new Error("enqueue failed");
  for (let i = 0; i < 300; i++) {
    const img = (await get(`/history/${prompt_id}`))[prompt_id]?.outputs?.["10"]?.images?.[0];
    if (img) {
      const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder || "", type: img.type || "output" });
      return Buffer.from(await (await fetch(`${COMFY_URL}/view?${q}`)).arrayBuffer());
    }
    await sleep(2000);
  }
  throw new Error(`timed out: ${prefix}`);
}

const [themeArg, ...only] = process.argv.slice(2);
const theme = themeArg && THEMES[themeArg] ? themeArg : "royal-gems-flux";
const map = THEMES[theme];
const symbols = (only.length ? only : Object.keys(map)).filter((s) => map[s] || (console.warn(`unknown symbol: ${s}`), false));
const outDir = fileURLToPath(new URL(`../assets/slot-symbols/${theme}/`, import.meta.url));
await mkdir(outDir, { recursive: true });

let seed = 81000;
for (const sym of symbols) {
  seed += 13;
  process.stdout.write(`… ${theme}/${sym} … `);
  const buf = await render(map[sym], seed, `slotsym_${theme}_${sym}`);
  await writeFile(`${outDir}${sym}.png`, buf);
  console.log(`✓ ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log(`\nDone. ${symbols.length} photoreal symbol(s) -> assets/slot-symbols/${theme}/`);
