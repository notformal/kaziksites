# Self-hosted game license inventory

Only the five entries below are presented as installed playable games. The remaining generated lobby cards are interaction prototypes and are labelled as such when opened.

| Game | Local path | Upstream | Pinned commit | License |
|---|---|---|---|---|
| 2048 | `public/games/2048` | https://github.com/gabrielecirulli/2048 | `478b6ec346e3787f589e4af751378d06ded4cbbc` | MIT (`LICENSE.txt` shipped) |
| Canvas Tetris | `public/games/tetris` | https://github.com/dionyziz/canvas-tetris | `4e497d1c858914f0a1f0818698029d1c7dad090b` | MIT (`LICENSE.md` shipped) |
| JavaScript Racer | `public/games/racer` | https://github.com/jakesgordon/javascript-racer | pinned vendor checkout | MIT (`LICENSE` shipped) |
| Radius Raid | `public/games/radius-raid` | https://github.com/jackrugile/radius-raid | pinned vendor checkout | MIT (`LICENSE.md` shipped) |
| JavaScript Pong | `public/games/pong` | https://github.com/jakesgordon/javascript-pong | pinned vendor checkout | MIT (`LICENSE` shipped) |

Every integrated game is served from the first-party site origin without a CDN dependency and is isolated in a sandboxed iframe. GPL and unclear-asset candidates are not included in `public/games`.

Before adding another title, record its upstream URL, exact commit, code license, asset/audio license, attribution requirement, mobile status, CSP needs and browser QA evidence. Repository visibility or “free to play” is not redistribution permission.
