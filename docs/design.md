# FireSight design spec

Written by master-designer, Thu Oct 22 2026, 11:16 PDT. Preview artifact: see board line. Implementable directly in R3F + GSAP; everything below is a token, a timing or a rule.

## 1. Direction: Night Watch (recommended)

Why: it is the plan's own rule made concrete (dark UI, red danger, amber caution, white info, 48 px targets) and it reads at arm's length in a dark rig. Turnout (safety yellow) is the fallback if the team wants louder headings; Blueprint is the stage risk and costs a wireframe material pass. Vidyut picks; if no pick by 12:15, build Night Watch.

One canvas, one action color, three semantic colors, nothing else. No gradients, no glass, no shadows on the phone.

## 2. Tokens

Put these in `web/src/tokens.css` as CSS variables and import the same values into the R3F materials from `web/src/tokens.ts`.

| Token | Value | Use |
|---|---|---|
| `--fs-bg` | `#0d0f12` | app background, canvas clear color |
| `--fs-surface` | `#171a1f` | bottom sheet, cards, info chips |
| `--fs-line` | `#2a2f37` | borders, ground ring, leader lines for info |
| `--fs-ink` | `#f4f3ee` | text, white info pins |
| `--fs-muted` | `#9aa0a8` | secondary text, source and date, unknown chips |
| `--fs-action` | `#ff9f1c` | the one button (EXPLODE / COLLAPSE), edge glow, focus ring |
| `--fs-action-ink` | `#0d0f12` | text on the action button |
| `--fs-danger` | `#e5261f` | severity danger (filled chip, white text) |
| `--fs-caution` | `#ffb020` | severity caution (outline chip) |
| `--fs-info` | `#8ecae6` | hydrants, wind, entrances (ground ring only) |
| `--fs-unknown` | `#9aa0a8` dashed | unknown chips |
| `--fs-dept` | `#4f8cff` | `origin: "department"` pins (pre-plan), Daylight moment |
| `--fs-crew` | `#b388ff` | `origin: "crew"` pins (crew notes) |
| `--fs-slab` | `#262b33` | floor slab side faces (MeshStandardMaterial, roughness 0.9) |
| `--fs-slab-top` | `#3a414b` | floor slab top face |
| `--fs-ground` | `#13161b` | ground disc |

Contrast (computed from the hex values with the WCAG formula, 11:16 PDT): ink on bg 17.3:1; muted on bg 7.3:1 and on surface 6.6:1; action-ink on action 9.3:1; white on danger 4.5:1 (AA for the 12 px bold chip text; `#ff3b30` was 3.5:1 and was rejected); danger chip on bg 4.2:1 (non-text, passes 3:1); caution on bg 10.5:1 and on surface 9.5:1; info on bg 10.7:1.

Fonts (Google Fonts, OFL): `IBM Plex Sans` 400/500/600/700 for UI; `IBM Plex Mono` 400/600 for sources, dates, bearings, ETA. Fallback `system-ui, sans-serif` and `ui-monospace, monospace`.

Type scale (px / line-height): address 22/24 Plex Sans 700; ETA 28/28 700 tabular; hero number in a drill card 40/44 700; brief line 15/20 400; chip label 12/14 700 uppercase, letter-spacing 0.04em; chip sub 10/12 mono; section eyebrow 11/14 mono uppercase 0.1em.

Spacing: 4 px grid; sheet padding 16; chip padding 6 x 10; radius 12 (chips), 14 (button), 18 (sheet top corners); minimum tap target 48 x 48 (chips get an invisible 48 px hit area via padding or `<Html>` wrapper).

## 3. Marker set

Icons: lucide-react (ISC license), stroke 2.25, 18 px inside chips, 16 px on cards.

| Layer | Icon | Default severity | Anchor |
|---|---|---|---|
| construction (type 5 wood, type 3) | `triangle-alert` | danger for type 5, caution for 3 and 4, info for 1 and 2 | building badge, right side mid-height |
| occupancy / units per floor | `users` | info | floor edge, alternate left and right per floor |
| permit: solar PV / ESS / battery | `sun` (PV), `battery-charging` (ESS) | caution (danger if ESS) | roof |
| permit: sprinkler, alarm, standpipe | `shield-check` | info | floor if numbered, else building |
| violation (open) | `octagon-alert` | danger | floor if stated, else floor 1 |
| violation (abated or closed) | `octagon-alert` | caution, stale rule applies | same |
| softstory | `layers` | danger if not retrofitted, caution if "Work Complete" | floor 1 |
| incident (past fire) | `flame` | caution, stale rule applies | history ring, ground, bearing 200 |
| complaint | `message-square-warning` | caution | floor if stated, else building |
| water (hydrant) | `droplet` | info | ground ring at bearing and distance |
| wind | `wind` | info | ground plane arrow, rotates to `wind_direction_10m` |
| inspection | `clipboard-check` | info (caution if overdue) | building badge |
| preplan (department) | `file-text` | uses `--fs-dept` border | as stated |
| crew_note | `pencil` | uses `--fs-crew` border | as stated |
| unknown | `circle-help` | unknown | floor 1 for stairs and standpipe, roof for roof access |

Chip style by severity:
- danger: fill `--fs-danger`, text white, leader line danger, slow pulse 1.2 s opacity 1 to 0.55 (loops; `prefers-reduced-motion`: no pulse, add a 2 px outer ring instead).
- caution: fill `--fs-bg`, 1.5 px border and text `--fs-caution`, one pulse at settle.
- info: fill `--fs-surface`, 1 px border `--fs-line`, text ink.
- unknown: no fill, 1.5 px dashed border `--fs-muted`, text muted, label ends with "?".
- stale (`stale: true`): the chip at 55 percent opacity plus a mono tag "AGE 2003" after the label. Never hidden.
- origin department / crew: border color overrides the severity border (fill stays), with a 4 letter mono tag "DEPT" or "CREW" at the left.

Chip content: icon, label (3 to 5 words, uppercase), second line mono: source short name and year ("permit 2024", "soft-story 2026"). Max 40 pins; group beyond that into "+N on floor 3".

## 4. Explode choreography (GSAP timeline, ms)

Scene units: meters. Floor slab depth 3.0, gap 0.2 assembled. `floorY(i) = i * 3.2` where `i = 0` is the ground floor. Exploded extra spacing `E = 2.2` m per floor. Camera: drei `PerspectiveCamera` fov 40, assembled target the building centroid at mid height, distance `2.2 * max(heightM, maxFootprintSpan)`.

`explode()` builds one `gsap.timeline({ defaults: { overwrite: "auto" } })`:

| Beat | Start | Duration | Target | From | To | Ease | Stagger |
|---|---|---|---|---|---|---|---|
| Charge: edges | 0 | 400 | `<Edges>` color (all slabs) | `--fs-line` | `--fs-action` | `power2.inOut` | none |
| Charge: dolly | 0 | 400 | camera distance | d | 0.95 d | `power2.inOut` | none |
| Charge: haptic | 0 | | `navigator.vibrate?.(30)` | | | | |
| Separate: lift | 400 | 1000 | slab i position.y (i >= 1) | `floorY(i)` | `floorY(i) + i * E` | `power3.out` | 80 per floor, roof first (`stagger: { each: 0.08, from: "end" }`), ground floor never moves |
| Separate: yaw | 400 | 1000 | slab i rotation.y | 0 | `(i % 2 ? 1 : -1) * 4 deg` | `power3.out` | same stagger |
| Separate: roof plane | 400 | 1000 | roof slab y | top | top + `floors * E` + 0.6 | `power3.out` | first in the stagger |
| Separate: camera | 400 | 1000 | orbit azimuth and polar | current | azimuth +20 deg, polar 58 deg (3/4 view from slightly above) | `power2.inOut` | none |
| Separate: camera target | 400 | 1000 | controls.target.y | mid height | mid of exploded height | `power2.inOut` | none |
| Pins: fly | 1200 | 1400 total | each pin group position | centroid (0, heightM/2, 0) | anchor world position | `power3.out`, 600 per pin, along a quadratic bezier with control point lifted +2.5 m | 60 per pin, order: danger, caution, info, unknown (sort before the timeline) |
| Pins: scale | per pin start | 300 | pin scale | 0.4 | 1 | `back.out(1.4)` (reduced motion: `power2.out`) | same |
| Pins: leader | per pin start + 450 | 150 | `<Line>` dashOffset or `lineLength` | 0 | 1 | `power1.out` | same |
| Settle: pulse | 2600 | 400 | severity chips opacity | 1 | 0.55 and back (yoyo, repeat 1) | `sine.inOut` | none; danger pins then start their 1.2 s loop |
| Settle: sheet | 2600 | 320 | bottom sheet translateY | 100 percent | 0 | `power3.out` | none |

Total 3.0 s. State goes `exploding` at 0 and `exploded` at 3000. Taps on slabs are ignored while `exploding`.

Anchors in world space (Lane A computes from `Pin.anchor`):
- `building`: right edge midpoint at `heightM / 2 + floors * E / 2`, offset +1.5 m outward.
- `floor n`: slab n edge, alternate side per floor index (odd left, even right), +1.2 m outward, y at slab center.
- `roof`: roof plane center, +1.0 m up, +1.5 m toward camera-right.
- `ground`: point on the ground ring at `bearingDeg` and `min(distanceM, ringRadius)` where `ringRadius = 1.4 * max footprint span`; chip sits 0.3 m above the disc.
Collision rule: chips on the same side and floor stack vertically with 0.9 m spacing, sorted by severity.

`focus(floorId)`: 350 ms. Other slabs and their pins to opacity 0.15 (`power2.out`), camera frames the slab (fit height 1.6x slab span), that floor's chips grow to cards (width 240 px, show `detail`, source, as-of, verified / stale / unknown). Second tap on the same floor or tap "Back" reverses in 250 ms.

`focus(pinId)`: 250 ms. Full-screen card slides up from the sheet (`power3.out`); the 3D view stays, dimmed to 60 percent. Close: swipe down or Back, 200 ms.

`highlight({ floors, pinIds, color })`: 300 ms. Named slabs get emissive `color` at intensity 0.35, named pins pulse 2 times at 0.6 s; everything else to opacity 0.25. Clears on the next question or after 8 s.

`collapse()`: `timeline.timeScale(1.5).reverse()` from the current position, with one override: slab landing uses `back.out(1.02)` (the 2 percent overshoot thud) instead of the reversed `power3.out`. Pins fly back to the centroid and scale to 0.4 over the first 500 ms of the reversed timeline so they disappear before the floors land. Sheet slides down in 240 ms at the start of the collapse. Haptic `vibrate(20)` on landing. State `collapsing`, then `assembled`.

Reduced motion (`matchMedia("(prefers-reduced-motion: reduce)")`): keep every position change but set all durations to 1 ms except the sheet (160 ms) and drop the bezier (straight interpolation); no pulses, no overshoot; danger pins show the 2 px ring instead of pulsing.

Performance: `dpr={[1, 2]}`, no shadows, one `MeshStandardMaterial` per severity shared across chips, `<Html>` chips with `transform` off and `occlude` off (they must never hide behind floors), `frameloop="demand"` with `invalidate()` from the GSAP `onUpdate`.

## 5. Screen layout (390 x 844, one hand)

Top to bottom: status row (app name left, apparatus id and "CACHED hh:mm" right, mono 11); address block (address 22 bold, parcel and occupancy 11 muted) with ETA at right (28 bold, "out" 11 caution); scene fills the middle; bottom sheet (peek 168 px: eyebrow "SIZE-UP" and "n of m pins", three lines with severity dot, source and year; unknown chips row); bottom bar 52 px tall buttons: primary EXPLODE / COLLAPSE (flex 1, action fill), ASK (96 px, outline). Sheet drag handle 36 x 4. Everything tappable is in the lower 60 percent of the screen except the pins themselves.

1920 x 1080 (video frame): the phone sits centered in a frame at 2x; headings must read at 25 percent zoom, which the 22 px address and 15 px lines do at 2x.

## 6. Brief copy rules (Lane C and the sheet)

1. Radio cadence: present tense, no articles where a radio would drop them, one fact per line, 12 words max. "Type 5 wood frame, 4 stories, 79 apartments." Not "The building is a type 5 wood frame structure with four stories."
2. Every line ends with its source short name and year on the sheet (rendered from `pinIds`, never from the model's text). The model writes no sources.
3. Order: construction and collapse, life hazard, roof energy (PV, ESS), exits and suppression, water, wind, history. Three lines in the peek, the rest on expand.
4. Say "unknown" where data is missing, as its own line at the end: "Unknown: standpipe, stairs, sprinklers." Never "no data found", never "likely".
5. Stale facts carry their year in the line: "Building fire 2003, cooking fire 2009." Never say "recent".
6. Qualify by source, never interpret: "retrofit complete per city list" not "safe". "36 solar thermal modules on roof" not "solar risk low".
7. No tactical orders ("vent", "evacuate", "hold"). The only verbs are state verbs plus "de-energize before roof ops" copied verbatim from the pin's `detail` when PV or ESS is present.
8. Numbers in digits, units spelled as on the radio: "12 kt NW", "40 m", "79 units".
9. Voice readout reads the same lines; replace the source tail with "per permit 2024".
10. Department and crew lines start with "Dept:" or "Crew:". Conflicts read "Conflict: pre-plan 2019 lists old alarm panel; 2024 permit upgraded to NFPA 72."

## 7. States on the demo path

- Empty (no building): scene shows the ground disc and north arrow, sheet reads "Pick an address" with the three cached buildings as 48 px rows.
- Loading: slab silhouettes rise one by one (same stagger as separate, 2 loops max), sheet reads "Fusing 6 city datasets" with the dataset short names ticking on; action button disabled at 50 percent.
- Success: assembled building, sheet peek with top 3 lines, EXPLODE enabled.
- Error (fetch failed): sheet reads "City data unreachable. Showing cached 11:04." in caution, or "No records for this parcel" with every chip unknown for the sparse venue building; the model still renders from the footprint.
- Payoff: at the end of the settle beat, the "n of m pins" count in the sheet counts up from 0 to m over 400 ms (reduced motion: appears).

## 8. Not checked

- Fonts render as named on the real phone (Google Fonts load; fallback stacks declared).
- Contrast ratios were computed from the hex values, not measured on a device screen.
- No R3F code was run; timings are a spec for Lane A, tune at CP1 on the phone.
