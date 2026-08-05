// Photorealistic game covers via a local ComfyUI (SDXL / JuggernautXL). This is the
// high-quality UPGRADE over the procedural covers in scripts/generate-cover-art.mjs.
// Writes apps/lobby/public/covers-v2/game-<id>.jpg (the id the lobby renders), so a
// run drops straight in. Requires a local ComfyUI running + Playwright (PNG->JPG).
//
//   node scripts/generate-covers.mjs                 # all missing new-game covers
//   node scripts/generate-covers.mjs dice blackjack  # only these slugs
//
// Env: COMFY_URL (default http://127.0.0.1:8188), COMFY_OUTPUT (default C:\ComfyUI\output),
//      COMFY_CKPT (default juggernautXL_v9Rundiffusionphoto2.safetensors).
import { readFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const COMFY_OUTPUT = process.env.COMFY_OUTPUT || "C:/ComfyUI/output";
const CKPT = process.env.COMFY_CKPT || "juggernautXL_v9Rundiffusionphoto2.safetensors";
const COVERS = new URL("../apps/lobby/public/covers-v2/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// slug -> [catalog cover id, subject prompt]. The lobby renders `game-<id>.jpg`.
const GAMES = {
  dice: ["game-11", "two glowing neon casino dice mid-roll with sparks, deep purple and cyan"],
  limbo: ["game-12", "a sleek rocket soaring up a beam of light, a rising multiplier glow, violet"],
  wheel: ["game-13", "a luxurious golden fortune wheel spinning, jewel-toned segments, gold and amber"],
  mines: ["game-14", "a grid of glossy tiles revealing glowing emeralds and one hidden bomb, teal"],
  hilo: ["game-15", "two playing cards floating with glowing higher and lower arrows, gold and orange"],
  sicbo: ["game-16", "three golden dice tumbling inside a jeweled bowl, magenta and purple"],
  baccarat: ["game-17", "an elegant baccarat table with two dealt cards on green felt, gold accents"],
  "roulette-us": ["game-18", "an american roulette wheel with a double-zero pocket, red black green, glossy"],
  blackjack: ["game-19", "an ace and king of spades on green felt with stacked casino chips"],
  holdem: ["game-20", "a poker table with hole cards and community cards, glowing chips, teal and gold"],
  videopoker: ["game-21", "a glowing casino video-poker screen showing a royal flush of hearts, pink neon"],
};
const STYLE = ", premium mobile casino game cover, 3D render, dramatic volumetric lighting, glossy, vibrant neon accents, ultra detailed, cinematic, centered, no text, no watermark, no letters";
const NEG = "text, letters, words, numbers, watermark, logo, caption, ui, frame, border, blurry, low quality, jpeg artifacts, ugly, deformed";

const post = (p, b) => fetch(COMFY_URL + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());
const get = (p) => fetch(COMFY_URL + p).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const workflow = (prompt, seed, prefix) => ({
  1: { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CKPT } },
  2: { class_type: "CLIPTextEncode", inputs: { text: prompt + STYLE, clip: ["1", 1] } },
  3: { class_type: "CLIPTextEncode", inputs: { text: NEG, clip: ["1", 1] } },
  4: { class_type: "EmptyLatentImage", inputs: { width: 832, height: 1216, batch_size: 1 } },
  5: { class_type: "KSampler", inputs: { model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0], seed, steps: 28, cfg: 6, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1 } },
  6: { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
  7: { class_type: "SaveImage", inputs: { images: ["6", 0], filename_prefix: prefix } },
});
async function waitFor(id, timeoutMs = 900000) {
  for (const start = Date.now(); Date.now() - start < timeoutMs; ) {
    const img = (await get(`/history/${id}`))[id]?.outputs?.["7"]?.images?.[0];
    if (img) return img.filename;
    await sleep(2500);
  }
  throw new Error(`timed out waiting for ${id}`);
}

const requested = process.argv.slice(2);
const slugs = (requested.length ? requested : Object.keys(GAMES)).filter((s) => GAMES[s] || (console.warn(`unknown slug: ${s}`), false));
await mkdir(COVERS, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 832, height: 1216 } });
let seed = 77000;
for (const slug of slugs) {
  const [coverId, prompt] = GAMES[slug];
  const dest = join(COVERS, `${coverId}.jpg`);
  seed += 1;
  console.log(`… ${slug} (${coverId}): enqueue`);
  const { prompt_id } = await post("/prompt", { prompt: workflow(prompt, seed, `kazik_${slug}`) });
  const filename = await waitFor(prompt_id);
  // Convert the ComfyUI PNG to the JPG the lobby serves.
  const png = await readFile(join(COMFY_OUTPUT, filename));
  await page.setContent(`<style>*{margin:0}</style><img id="c" src="data:image/png;base64,${png.toString("base64")}" style="width:832px;height:1216px;display:block">`);
  await page.locator("#c").screenshot({ path: dest, type: "jpeg", quality: 90 });
  console.log(`✓ ${slug}: ${filename} -> covers-v2/${coverId}.jpg`);
}
await browser.close();
console.log(`\nDone. ${slugs.length} photorealistic cover(s) written to ${COVERS}`);
