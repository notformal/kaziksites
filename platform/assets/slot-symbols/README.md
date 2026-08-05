# Slot symbol asset base

Reusable, themed slot symbol sets. **Symbol ids match `slotEngine`/`slotLibrary` reel ids**
(`ten jack queen king ace ruby crown wild scatter`), so a theme drops straight into a slot
definition — the engine references a symbol id, the client renders `royal-gems/<id>.png`.

- **Format:** 512×512 PNG, RGBA (transparent) — usable directly on any reel background.
- **Index:** `manifest.json` (theme → symbols → path); read it to enumerate available sets.

## Regenerate / add a theme

Two interchangeable generators write the same `<theme>/<id>.png` layout:

| Generator | Command | Output | Notes |
|---|---|---|---|
| **Procedural SVG** | `node scripts/generate-slot-symbols-svg.mjs [theme] [ids…]` | `royal-gems` — 512² **transparent** | GPU-independent, crisp, on any reel background. |
| **ComfyUI / FLUX.1-dev** (photoreal) | `node scripts/generate-slot-symbols.mjs [theme] [ids…]` | `royal-gems-flux` — 1024² photoreal | Uses **FLUX** (canonical `FluxGuidance` + KSampler `cfg=1`), fp8 weights. NB: **SDXL** decodes all-black on this GPU (UNet fp16 NaN); FLUX renders correctly and also draws clean symbol text (e.g. WILD). |

Add a new theme by extending the `THEMES` map in either script (an SVG builder per symbol, or a
prompt per symbol), then run it — the output naming and manifest layout stay identical. FLUX symbols
share one studio background per theme; for transparent cutouts, run them through a background remover
(e.g. a `rembg` node) or use the SVG set.
