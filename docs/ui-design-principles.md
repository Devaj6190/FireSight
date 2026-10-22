# FireSight UI design principles (Apple Maps-style product pass)

Written 2026-10-22 ~14:40 while prototyping a UI overhaul (since scrapped). These are the principles to apply on top of whatever lands on main.

## 1. One palette, defined once

- One set of CSS custom properties in `web/src/index.css`, mirrored in `web/src/tokens.ts` for three.js. Panels (`--p-*`) and the brief sheet (`--b-*`) **alias** these instead of defining their own.
- Apple dark system colors:

| Token | Value | Use |
|---|---|---|
| `--fs-bg` | `#0b0b0d` | scene / window background |
| `--fs-surface` | `#1c1c1e` | elevated surface |
| `--fs-surface-2` | `#2c2c2e` | inputs, cards inside a sheet |
| `--fs-material` | `rgba(28,28,30,0.74)` + `backdrop-filter: blur(28px) saturate(170%)` | floating chrome (header, sheet, secondary buttons) |
| `--fs-line` | `rgba(84,84,88,0.48)` | 0.5 px hairlines |
| `--fs-fill` | `rgba(118,118,128,0.24)` | tonal buttons, pills |
| `--fs-ink` | `#f5f5f7` | primary text |
| `--fs-muted` | `rgba(235,235,245,0.64)` | secondary text (passes 4.5:1 on the material) |
| `--fs-action` | `#0a84ff` | **the only interactive accent** |
| `--fs-danger` | `#ff453a` | hazard: danger |
| `--fs-caution` | `#ff9f0a` | hazard: caution |
| `--fs-info` | `#64d2ff` | info |
| `--fs-verified` | `#30d158` | VERIFIED claim |
| `--fs-conflict` | `#bf5af2` | CONFLICT claim |

- **Blue means "you can tap this". Red and orange mean hazard and nothing else.** The prototype's orange action color collided with "caution".
- Claim chips are tinted fills (green/purple/gray at ~16% alpha with the full color as text), never outlined boxes.

## 2. Type

- System font stack (SF Pro on Apple devices): `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', Roboto, sans-serif`; display sizes use `SF Pro Display`.
- **No monospace for labels.** Mono only for record ids / dataset ids in the provenance card. Numbers use `font-variant-numeric: tabular-nums`.
- **Sentence case in the UI.** Data labels stay upper case in the JSON (for the 3D chips if wanted), but lists, cards and room labels pass through a `displayLabel()` formatter that sentence-cases while keeping acronyms (AWSS, SFFD, DBI, EV, ESS, PV, B1, R2, NFPA, SRO, compass points).
- Section headers: 12 px, 600, uppercase, letter-spacing 0.02em, muted. Titles: 22 px bold display, letter-spacing -0.01em.

## 3. Layout (Apple Maps)

- **The 3D scene is full-bleed**; all chrome floats over it on frosted material with rounded corners (18-20 px) and a soft shadow.
- **Desktop (>= 900 px): Apple Maps for Mac.** One floating sidebar on the left (header card, sheet, action bar stacked, ~400 px wide). The camera's projection centre is shifted right by half the sidebar (`camera.setViewOffset(w, h, -216, 0, w, h)`) so the building sits in the middle of the visible map, not behind the sidebar.
- **Phone:** compact frosted header at the top, frosted bottom sheet, floating action bar. After a dispatch the sheet opens at **half height** so the explode and floor focus stay visible; the grabber opens it fully.
- Transient state (e.g. "Focused floor 22 · Clear") floats as a pill beside / under the header; it never grows the header.
- Tabs are pills (filled white when selected), not underlined text. Wrap on desktop; on phone one horizontally scrolling row with an edge fade.

## 4. Controls

- Primary: filled blue, 16 px radius, 56 px tall, 17 px semibold, sentence case (no letter-spaced CAPS), soft blue shadow.
- Secondary: frosted material, same size.
- Floating map controls ("Paste dispatch", "Rooms · floor 22"): frosted pills, 44 px tall.
- Touch targets >= 44 px. Press state `transform: scale(0.98)`. Focus ring: 2 px blue, 2 px offset.

## 5. The building model

- Lighting: ambient + hemisphere (cool sky, dark ground) + one shadow-casting key light, plus a **local studio environment** built from drei `Lightformer`s (no HDR download, works offline) for soft reflections.
- Materials: matte light-gray tops (`#b8b8c0`), satin gray facades (`#6e6e76`, roughness ~0.55, metalness ~0.15), hairline edges at 70% opacity. Floors with a danger record get a **subtle** red emissive (~0.28), not a saturated band.
- Ground: drei `Grid` (infinite, faded) reads as a map; drei `ContactShadows` anchors the building.
- Explode: keep the existing fan timeline; edges tint blue (the action color) while exploded.

## 6. 3D labels (pins)

- Apple Maps place-label style: **pill** (fully rounded), dark fill, quiet hairline; severity lives in the **dot and the danger glow**, not a red border.
- Two lines max: sentence-case title (13 px semibold) + quiet source line ("Fire permit · May 15, 2017 · 1 more", 11 px muted). Enough height that the lines never collide (~48 px pill, 10 px vertical padding, 14 px horizontal).
- Fewer labels: only the most severe pin per floor (existing clustering), and only full-strength on the focused floor.

## 7. Rooms level (branch `claude/floor-rooms`)

- Tapping the focused floor opens a second explode into rooms. **The layout is schematic** (no public floor plans); only rooms named in records (computer room, server room, fire pump / generator room, assembly) are cited.
- Keep the disclaimer always visible while rooms show, as a quiet frosted pill: "Schematic layout · no public floor plan". Room labels: frosted pills, sentence case ("Computer room", "Verified · Fire permit 76784", "Position on floor is schematic", core: "Core location unverified").
- Windows gotcha: `Rooms.tsx` and `rooms.ts` differ only by case; import them with explicit extensions (`./Rooms.tsx`, `./rooms.ts`) or Windows dev builds resolve the wrong file.

## 8. Copy

- Never "live": "Refreshed from data.sf.gov every 30 minutes".
- The change feed says "No pin changes" and "Checked · 2 sources unavailable", not "+0 -0 ~0 pins" / "PARTIAL".
- The header's refresh time shows the latest successful check from `refresh/log.json`, not only the file's `fetchedAt` (the file is not rewritten when nothing changed).

## References

- Apple HIG, Dark Mode: https://developer.apple.com/design/human-interface-guidelines/dark-mode
- God's Eye View (Bilawal Sidhu): https://github.com/bilawalsidhu/gods-eye-view
- Exploded architectural views (ArchSplit): https://graphics.stanford.edu/papers/archsplit/
