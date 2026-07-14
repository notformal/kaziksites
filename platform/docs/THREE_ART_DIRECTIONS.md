# Three premium art directions

## Why the current result feels generic

The three brands currently share the same DOM, hero split, circular abstract artwork, six-column emoji card grid, pill filters, reward panel and footer. Brand overrides mostly change accent colors and one heading font. The catalog art is generated from emoji and hue values, so it reads as a component demo rather than a credible iGaming product. The redesign must separate **content model, spatial rhythm, imagery, interaction and conversion path**, not merely theme tokens.

Shared product constraints: virtual credits only; visible responsible-play language; wallet and account state must remain server-authoritative; no fabricated jackpots, winners or live counts; game art must be licensed or original.

---

## 1. Aurora — Signal Arcade

**Position:** a fast, intelligent arcade discovery platform. This is the closest to a premium sportsbook/control-room product: precise, dense and exceptionally quick to scan.

### Information architecture

- Persistent 232 px left rail: logo, Home, Live now, Slots, Instant, Table, Tournaments, Favourites.
- Compact top command bar: omnibox search, mission progress, virtual balance and profile.
- Home sequence: Continue playing → live/featured rail → category shelves → personalised picks → all games.
- Game detail opens as a right-side quick-view sheet; Play remains one click away. Fullscreen game mode removes lobby chrome.
- Trust, limits and fairness live in the account utility layer, not as homepage marketing clutter.

### Hero and layout

No conventional marketing hero. The first viewport is an asymmetric **broadcast stage**: one 7-column featured game panel, a 3-column vertical live schedule and a 2-column mission/progress module. A slim ticker below shows real product events only. The catalog uses horizontal shelves with deliberate card-size variation: one spotlight card, landscape feature cards and compact portrait game tiles.

### Typography

- Display: **Druk Condensed** (licensed/self-hosted) or open alternative **Barlow Condensed 700–800**.
- UI/body: **IBM Plex Sans**.
- Balance, timers and odds-like data: **IBM Plex Mono** with tabular numerals.
- Headings are condensed uppercase; body copy stays sentence case. Never use Manrope/DM Sans for this brand.

### Palette

- Void `#05080A`, panel `#0B1114`, raised `#111A1F`, rule `#233039`
- Signal lime `#C7FF3D` used sparingly for primary action and active state
- Cyan telemetry `#31D7F2`, text `#F2F5F2`, muted `#8C9AA1`
- Risk/error `#FF5C5C`, success `#59E391`

### Card system

Cards are 4–8 px radius, cropped edge-to-edge artwork with a hard bottom metadata strip. Hover reveals a diagonal Play shutter and one factual secondary datum (category, licence or last played). No ratings unless backed by real user data. Badges are rectangular broadcast labels, not candy pills. Skeletons preserve exact card aspect ratios.

### Imagery strategy

Original cinematic key art with black negative space, macro metallic textures, arcade hardware, light trails and high-contrast silhouettes. Each game family gets a coherent art kit. Emoji are prohibited. Use responsive AVIF/WebP art direction with a brand-safe fallback poster. UI illustration is generated geometry only; game covers require a documented source/licence.

### Motion

Fast 120–220 ms mechanical transitions: scanline wipes, number rolls, rail snapping and focus shutters. Featured art gets restrained parallax. Respect `prefers-reduced-motion`; never animate balance changes ambiguously.

### Mobile pattern

Bottom navigation with Home, Explore, Play, Rewards, Account. The first viewport is a 16:10 feature card followed by a horizontally snapping Continue rail. Search becomes a full-screen command palette. Game view is true fullscreen with an explicit swipe-safe close handle.

### Conversion hierarchy

1. Continue/Play now for returning users.
2. Explore games for anonymous visitors.
3. Create account to preserve progress and claim clearly labelled virtual credits.
4. Daily mission/reward after authentication.
5. Trust and fairness near the first wager, not as decorative homepage claims.

---

## 2. Ember — Afterdark Social Club

**Position:** an energetic, social, event-led night venue. Ember is not a recoloured lobby; it behaves like a music and nightlife product with hosted drops, scheduled moments and bold personalities.

### Information architecture

- Floating wordmark and minimal top navigation: Tonight, Games, Drops, Club.
- Home sequence: tonight's takeover → live rooms/event schedule → trending games → challenge ladder → community activity → membership.
- Search and categories live in an Explore overlay inspired by a music library.
- Logged-in users see an event pass, streak and virtual-credit wallet in a persistent bottom dock on desktop.

### Hero and layout

Full-bleed editorial hero with a real game/event key visual occupying 70% of the viewport. Typography overlaps the image; the main CTA sits on the visual's focal edge. The next section is a horizontal poster wall, followed by a staggered masonry catalog. Sections alternate dense black and warm bone surfaces so the page has chapters rather than endless dark cards.

### Typography

- Display: **Bebas Neue** for event-scale headlines, tightly tracked.
- Editorial accent: **Fraunces 600 Italic** for human, club-like notes.
- UI/body: **Archivo**.
- Data: **JetBrains Mono**.

### Palette

- Ink `#0A0708`, club black `#121011`, warm paper `#F2E9DC`
- Ember orange `#FF5A1F`, acid pink `#FF3D8D`, flash yellow `#FFD84D`
- Muted rose `#A78C93`, line `#34272B`
- Color is expressive, but primary CTAs remain solid orange or ink—never gradients.

### Card system

Three intentionally different formats: oversized event posters (3:4), game album covers (1:1), and compact ranked rows. Poster cards use type baked into a controlled overlay template, torn-rule separators and sharp 0–2 px corners. Hover has a circular play control and a subtle image zoom. Membership/challenge modules use ticket geometry, not generic rounded rectangles.

### Imagery strategy

Flash photography, saturated gels, grain, halftone and cropped human gestures—without misleading celebrity or winner imagery. Pair original editorial shoots/AI-assisted licensed compositions with abstract game-world objects. Every image receives a consistent duotone treatment and intentional focal-point crop. No generic neon casino chips.

### Motion

Expressive but choreographed: 300 ms poster reveals, kinetic headline masks, magnetic cursor only on fine pointers, ticker motion and beat-like stagger. Game launch uses a stage-curtain wipe. Reduced-motion mode replaces all choreography with fades.

### Mobile pattern

Vertical story-like takeover, thumb-reachable Tonight CTA and horizontally swiped event posters. Explore is a bottom sheet with large genre tiles. A sticky mini-player-style bar returns users to their current game. Membership onboarding is three short slides, not a modal form.

### Conversion hierarchy

1. Enter tonight's featured experience.
2. Browse the trending poster wall.
3. Join the club to save streak/progress and receive virtual credits.
4. Complete a challenge or return for a scheduled drop.
5. Invite/share only if a real referral feature exists.

---

## 3. Royale — The Private Games House

**Position:** quiet luxury and curation. Royale should feel like a private members' club and an editorial culture title, not a gold skin over a casino grid.

### Information architecture

- Restrained masthead: Collection, Salon, New Editions, Journal, Account.
- Homepage sequence: curator's selection → three themed salons → new editions → continue playing → journal/fairness note → membership.
- No visible mega-catalog above the fold. Search opens a typographic index with filters for pace, format and session length.
- Account becomes a “member folio”: virtual balance, history, favourites, fairness receipts and limits.

### Hero and layout

An ivory editorial canvas with a tall 5:7 still-life on the right and oversized serif title crossing the gutter. A numbered issue marker and curator note replace salesy eyebrow copy. Below, generous 12-column compositions alternate single monumental covers, paired landscape stories and narrow text-led lists. Dark green game-room sections punctuate the light editorial pages.

### Typography

- Display/editorial: **Cormorant Garamond 600** (or licensed Canela if budget permits).
- UI/body: **Source Sans 3**.
- Labels and folio data: **IBM Plex Mono**.
- Use italics as editorial voice, small caps for navigation, and large optical sizes. Avoid Playfair Display—it has become the generic luxury shortcut.

### Palette

- Parchment `#F1ECE0`, paper `#FAF7F0`, ink `#17201C`
- Racing green `#163B31`, oxblood `#6E2831`, antique brass `#B58B45`
- Sage `#9AAA96`, hairline `#D8CFBE`
- Dark room: `#0D1814` with paper text `#F3EBDD`

### Card system

Cards are editorial objects, not containers: no default background, shadow or rounded rectangle. Artwork uses 4:5, 3:2 and 1:1 ratios with numbered captions beneath. Hover shifts the image crop 2% and draws a brass underline. Only actionable controls receive a 2 px radius. Dense game lists become elegant alphabetical rows with small cover thumbnails.

### Imagery strategy

Commissioned still-life language: stone, lacquer, velvet, engraved metal, cards, dice and surreal sculptural objects. Soft directional light, museum-like negative space and tactile macro crops. Use original art and a strict photographic grade. Game covers should look like a collectible edition series with consistent spine, number and publisher mark.

### Motion

Slow, restrained 280–500 ms editorial transitions, masked image reveals and gentle crossfades. Scroll never hijacks. Brass rules draw on entry; folio numbers count once. Game launch resembles opening a double door, then gets out of the way.

### Mobile pattern

Magazine cover first, followed by a vertically paged collection. Navigation is a full-screen typographic index. Covers remain large—one per row—and captions stay visible rather than becoming hover-only. A slim sticky “Open game” bar appears only on a detail page.

### Conversion hierarchy

1. Open the curator's selection.
2. Browse a salon or read a concise game note.
3. Become a member to save the collection and receive virtual credits.
4. Return to the folio/continue playing.
5. Daily reward is presented as a member courtesy, not a flashing bonus.

---

## Shared production bar

- Replace generated emoji art before visual sign-off. A 200-title catalog needs an art manifest with desktop/mobile sources, focal coordinates, alt text, provenance and licence.
- Build three separate route shells and component grammars. Share primitives, accessibility and API clients—not page composition.
- Design every state: loading, empty, no results, unauthenticated, insufficient virtual credits, network failure, maintenance, age/territory notice and reduced motion.
- Validate WCAG AA contrast, keyboard operation, focus visibility, 320 px width, 200% zoom and touch targets.
- Measure real conversion events: featured impression → game detail/open → registration start → registration complete → first virtual wager → return session. Never manufacture social proof.

## Recommendation

Implement **Aurora first** because its dense discovery model exercises the complete catalog and interaction architecture. Use its accessible primitives and account/fairness foundations across brands, then build Ember and Royale as genuinely independent shells. The concept board is in `design-previews/index.html`.
