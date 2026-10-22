# FireSight design v2: Night Glass

Handoff for the next design pass on the field shell (`web/src/shell/`). Written Oct 22 2026, after the v1 shell redesign shipped to production (`bcd0558`, https://firesight-ten.vercel.app).

**Goal:** make the shell look professional and futuristic, and make it feel smooth. Think of a pilot's glass cockpit at night: a 3D building on a dark city, controls floating over it on frosted glass, and quiet numbers that light up only when something matters. Keep everything that already works: the controls, the data rules and the tap targets for gloved hands.

**Not in scope:** new data, new panels, changes to the contract in `shared/building.ts`, or changes to the explode choreography in `explode.ts`. Camera framing is the one exception (section 7).

## 0. Status after review (Oct 22, evening)

The product owner reviewed this doc. Their decisions:

- **Keep v1's structure and layout.** The top bar, the 7-tab nav (bottom on phone, right rail on desktop), the bottom sheet and the model controls stay where they are. The layout changes in section 5 (a floating command bar capsule, a 5-tab dock with a "+" action and a "⋯" menu, moving the rail to the left) and the floor tape in section 6.9 are **not adopted**.
- **Do the restyle and smoothness work.** Colors, fonts, glass, lighter controls and the smoothness fixes were implemented on `claude/jolly-pascal-cuq932` (see the checklist in section 12 for what is done).
- **No chips crowding the exploded fan.** See section 7b.
- **Next up, after the UI and the floor view are finished:** the test fire scenario (section 13).

What was built, in short:

| Area | Done |
|---|---|
| Smoothness | The canvas is full-screen and never resizes. The camera frames the building in the area the chrome leaves uncovered (`FrameInset` in `App.tsx`, section 7). The desktop panel overlays the 3D and slides with `transform`. Entrance cascades and the hazard count-ups play once per building, not on every tab visit. The phone sheet snaps by flick speed and rubber-bands past its ends. |
| Tokens | Section 3 colors in `index.css`; `tokens.ts` mirrors them. The `--lg-*` (rooms) and `--fl-*` (floor panel) sets are now aliases of `--fs-*`. |
| Type | Geist and Geist Mono (`@fontsource/geist`, `@fontsource/geist-mono`; the static packages, because the 3D text needs `.woff`). Record labels go through `displayLabel()`. Uppercase is left only for mono eyebrows, small status tags and the notice. |
| Glass | Top bar, nav, sheet, model controls, chips and toasts are frosted glass over the 3D. `?glass=0` gives solid panels; phones with 4 or fewer cores, or under 45 fps after load, switch to solid automatically (`?glass=1` overrides). |
| Controls | Lighter buttons (44–48 px visual, 48 px hit areas kept). Explode is the one blue fill and turns to glass once exploded, with a progress line while it moves. The hazard counters are a single readout row with a share bar. The dispatch floor and the fire marker are danger red, not amber. |
| Night city | The default. `?night=0` brings back the daytime map for comparison. |
| Not done | Motion library springs (CSS easing is used instead; no new dependency), audio-reactive mic ring, number roll per digit, the 3-snap sheet. None of these block the demo. |

## 1. What is wrong with v1

The product owner's verdict on v1: the fonts and colors are wrong, and the big buttons don't feel smooth. Specifically:

| Problem | Where | Why it reads badly |
|---|---|---|
| Condensed, all-caps lettering everywhere (Barlow Condensed 700) | `phone.css`: every `--display` use | It shouts. Uppercase condensed type for every row label, button and heading reads like signage, not a professional tool, and it is slower to read than sentence case. |
| Warm brown-black palette with amber for everything | `index.css` `:root`, `phone.css` | Amber is the action color, the caution color, the selected color and the trim color all at once, so nothing stands out. The brown cast looks muddy beside the cool 3D city. |
| Heavy, chunky blocks (60–66 px tiles, thick inset shadows, 1.5 px borders) | `.fs-stat`, `.fs-floor`, `.fs-explode`, `.fs-quick` | The buttons are big visually, not just in their hit areas. The screen looks crowded, and every block weighs the same. |
| Not smooth: the WebGL canvas is resized during animations | `.fs-stage { transition: bottom }` (phone) and `.fs-sheet { transition: width }` (desktop) | Every animation frame resizes the canvas, so three.js reallocates its buffers and drops frames. This is the main cause of the jank. |
| Not smooth: entrance animations replay on every tab switch | `.fs-rise`, `.fs-pop`, `useCountUp` | Lists cascade in and numbers count up again every time a tab is revisited, so the UI feels busy instead of responsive. |
| CSS transitions instead of springs, no gesture velocity | sheet drag in `PhoneShell.tsx` | The sheet snaps on a fixed threshold and ignores how fast it was flicked, so it feels mechanical. |
| Two visual systems in one app | `fs-*` (v1 shell) vs `lg-*` "liquid glass" in `rooms.css` and blue `--fl-*` in `floor.css` | The rooms overlay and the floor panel were built in an Apple-style glass look with a blue accent; the shell around them is soot and amber. v2 unifies on one system: glass. |

## 2. Principles

1. **The building is the hero.** The 3D view runs full-bleed behind everything and is never resized. UI floats over it.
2. **Glass for chrome, solid for reading.** Floating controls (command bar, dock, model controls) are glass. Panels with long text sit on a near-opaque glass layer so text contrast never depends on what is behind it.
3. **One interactive color, separate hazard colors.** Blue means "you can tap this" or "this is selected". Red and amber only ever mean hazards. Nothing is both.
4. **Quiet until it matters.** Neutral by default; color is earned by hazard severity or selection.
5. **Big hit areas, light visuals.** Keep 48 px minimum hit areas for gloves, but draw buttons lighter (44 px visual or less, with the hit area padded out).
6. **Motion confirms, never decorates.** Every animation answers a touch or a state change. Nothing loops except live states (listening, exploding, a danger pin).

## 3. Tokens

Replace the `:root` block in `web/src/index.css` and the shell-local variables in `phone.css`. Keep the `--fs-*` names so `panels/`, `brief/`, `Floors.tsx`, `Pins.tsx` and `Rooms.tsx` pick up the change without edits. Then delete the duplicate token sets in `rooms.css` (`--lg-*`) and `floor.css` (`--fl-*`), or alias them to `--fs-*`. Mirror the hex values in `web/src/tokens.ts` for the R3F materials.

### Color

| Token | Value | Use |
|---|---|---|
| `--fs-bg` | `#05070a` | page behind the canvas, loading screen |
| `--fs-surface` | `rgba(14, 18, 24, 0.62)` | glass: command bar, dock, model controls |
| `--fs-surface-strong` | `rgba(12, 15, 20, 0.86)` | glass for reading: sheet, inspector, cards with text |
| `--fs-raise` | `rgba(255, 255, 255, 0.05)` | rows and tiles inside a panel |
| `--fs-raise-hover` | `rgba(255, 255, 255, 0.08)` | hover and pressed rows |
| `--fs-line` | `rgba(255, 255, 255, 0.09)` | hairline borders (1 px, or 0.5 px on retina) |
| `--fs-line-strong` | `rgba(255, 255, 255, 0.16)` | focused inputs, the top highlight on glass |
| `--fs-ink` | `#eef2f6` | primary text |
| `--fs-muted` | `#8b95a3` | secondary text, sources, dates |
| `--fs-faint` | `#5b6573` | tertiary text, disabled |
| `--fs-action` | `#3d8bff` | the one interactive color: selected tab, primary button, focus ring, the selected floor |
| `--fs-action-ink` | `#ffffff` | text on action |
| `--fs-action-glow` | `rgba(61, 139, 255, 0.35)` | the soft glow behind a selected control |
| `--fs-danger` | `#ff4d4f` | danger severity only |
| `--fs-caution` | `#ffb020` | caution severity only |
| `--fs-info` | `#5ee1ff` | water, wind and site geometry (the compass dials) |
| `--fs-unknown` | `#8b95a3`, dashed | unknown / no public record |
| `--fs-dept` | `#7c9cff` | department pre-plan pins |
| `--fs-crew` | `#c48bff` | crew notes |
| `--fs-verified` | `#4ade80` | the "Verified" claim chip only |

Rules:
- Amber is never used for a button or a selection again. The dispatch / fire-floor marker becomes **danger red with a soft glow**, because a reported fire is the top hazard.
- Body text sits on `--fs-surface-strong` or more opaque, never directly on `--fs-surface`. Check contrast against the worst case: a white city roof behind the glass.
- Contrast targets (WCAG): ink on surface-strong over white ≥ 7:1; muted ≥ 4.5:1; danger text ≥ 4.5:1 (use `#ff6b6d` for small red text if `#ff4d4f` falls short).

### Night city (3D)

The daylight basemap in `tokens.ts` (`sky #dfe6ed`, `land #ebe7e0`, …) clashes with dark glass. Proposed night palette, tuned so the hero still reads first:

| `fs.` key | Day (now) | Night (v2) |
|---|---|---|
| `sky` | `#dfe6ed` | `#070b11` |
| `land` | `#ebe7e0` | `#0c1118` |
| `sidewalk` | `#d6d1c8` | `#141b24` |
| `street` | `#fbfbf9` | `#1b2430` |
| `park` | `#cde2bd` | `#0f1d17` |
| `roof` | `#d3cfc8` | `#1a222d` |
| `cityGlass` | `#93a3b4` | `#2a3a4d` (windows; add a faint emissive `#3b5574` at 0.15) |
| `cityLabel` | `#6f747b` | `#4c5868` |
| `walls` | stucco … glass | `['#1c242f', '#202935', '#232c38', '#1a212b', '#263447', '#1e2631']` |
| `facade` (hero) | `#d9c6a5` | keep warm, `#cdb38a`, plus a 1 px `--fs-action` edge glow while exploded |

Also: the fog color follows `sky`; drop the hemisphere light to 0.6 and add a cool rim light (`#6fa8ff`, 0.4) from behind so tower edges catch light. Chips in `Pins.tsx` become glass pills (section 6.11).

This is the biggest visual change in v2. Ship it behind `?night=0` so the team can compare.

### Typography

Replace Barlow Condensed and IBM Plex with **Geist** (variable) and **Geist Mono** (variable), both OFL:

```
npm i @fontsource-variable/geist @fontsource-variable/geist-mono   # in web/ (both resolve on npm, 5.3.0)
npm rm @fontsource/barlow-condensed @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono   # once nothing imports them
```

Search for remaining `IBM Plex` and `Barlow` font stacks in `panels.css`, `brief.css`, `voice.css`, `floor.css` and `rooms.css`, and point them at the new variables.

| Role | Font | Size / line | Weight | Notes |
|---|---|---|---|---|
| Address (command bar) | Geist | 20 / 24 (desktop 22 / 28) | 600 | sentence case, `letter-spacing: -0.01em` |
| Panel title | Geist | 17 / 22 | 600 | sentence case |
| Row title | Geist | 15 / 20 | 550 | record labels converted with `displayLabel()` from `Floors.tsx` (sentence case, keeps acronyms) |
| Body | Geist | 15 / 22 | 400 | |
| Caption / source | Geist Mono | 11 / 16 | 450 | `font-variant-numeric: tabular-nums` |
| Readout number | Geist Mono | 28 / 32 | 500 | stats, distances, floor numbers; tabular |
| Eyebrow | Geist Mono | 10.5 / 14 | 500 | uppercase, `letter-spacing: 0.08em`; the **only** uppercase text in the UI |
| Tab label | Geist | 11 / 14 | 500 | |

Record labels arrive in uppercase from the data. Always render them through `displayLabel()` in the UI. The 3D chips can stay uppercase mono.

### Shape, space, elevation

- 4 px grid. Radii: 10 (chips, inputs), 14 (rows, tiles), 20 (cards, dock), 28 (sheet top, command bar). Hit areas ≥ 48 px; visual heights 36–44 px.
- Elevation comes from glass layering and one shadow, not stacked borders. Shadow for floating glass: `0 8px 32px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.06) inset`.
- Remove the grain texture, the turnout-stripe trim, the hazard-stripe pills and the inset "key" shadows from v1.

## 4. The glass recipe

One utility, used by every floating surface. Put it in `phone.css` as `.glass` and `.glass-strong`:

```css
.glass {
  background: var(--fs-surface);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--fs-line);
  box-shadow: inset 0 1px 0 var(--fs-line-strong), 0 8px 32px rgba(0, 0, 0, .45);
}
.glass-strong { background: var(--fs-surface-strong); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: rgba(14, 18, 24, .94); }
}
/* low power: phones that drop frames get solid glass */
.low-power .glass { -webkit-backdrop-filter: none; backdrop-filter: none; background: rgba(14, 18, 24, .94); }
```

Budget: at most **three** blurred layers on screen at once (command bar, dock, sheet). Never blur inside a scrolling list, and never put glass on glass. Rows inside a glass panel use `--fs-raise`, not their own blur.

`low-power`: add the class to `.fs-app` when `navigator.hardwareConcurrency <= 4`, or when the first two seconds after load average under 45 fps (measure with a `requestAnimationFrame` counter). Allow overriding it with `?glass=1`.

## 5. Layout

### Phone (390 × 844)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │  command bar: floating glass capsule, 12 px inset, safe-area aware
│ │ 140 New Montgomery St    ⚠6  ●mic│ │  row 1: address (tap = respond), danger count, mic orb
│ │ 26 fl · Type I · 90% spr · 115 m │ │  row 2: facts in mono, separated by thin dots (not pills)
│ └──────────────────────────────────┘ │
│  Not for operational use · records…  │  notice: one muted mono line under the bar, no pill
│                                      │
│            [ 3D, full bleed ]        │  canvas fills the whole screen behind everything
│                                      │
│  ┌─────┐┌────┐                       │  model controls: one glass cluster, bottom-left above the sheet
│  │Explode││ ⟲ │  FL 22 ×             │
│ ╭──────────────────────────────────╮ │  sheet: glass-strong, 3 snap points
│ │ ─  Hazards                 57    │ │    peek 132 px · half 50% · full (below the command bar)
│ │ 6 danger · 30 caution · 6 unknown│ │
│ ╰──────────────────────────────────╯ │
│ ╭──────────────────────────────────╮ │  dock: floating glass capsule, 64 px, 12 px inset
│ │  ⚠    ▤    💧   ?    ✓    ＋     │ │  5 tabs + Note as a raised "+" action
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

Changes from v1:
- **Command bar replaces the full-width header.** It floats over the 3D, so the city shows around it.
- **Dock: 5 tabs plus an action.** Hazards, Floors, Water, Ask, Brief. **Note** becomes a raised circular "+" at the dock's right end. It opens the quick-note sheet with the focused floor preselected, because adding a note is an action, not a place. **More** moves to a "⋯" button inside the command bar (records, sources, limits, changes, resolution, eval).
- **The canvas never resizes.** Frame the building into the uncovered area with the camera instead (section 7).
- **Model controls**: one glass cluster of Explode/Collapse, Reset and Rooms, with the focus chip beside it. It rides the sheet's top edge at peek and fades out at half.

### Desktop (≥ 900 px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ╭ FireSight │ 140 New Montgomery St · 26 fl · Type I · 90% spr  ⚠6 ⋯ ● ╮ │ command bar, floating, max 1100 px, centered
│                                                                          │
│ ╭──╮                                                   ╭───────────────╮ │
│ │⚠ │                                                   │ Floors     ×  │ │ inspector: glass-strong, 400 px,
│ │▤ │              [ 3D, full bleed ]                   │               │ │ floats 16 px from the right edge,
│ │💧│                                                   │ ...           │ │ slides with transform only
│ │? │                                                   │               │ │
│ │✓ │                                                   │               │ │
│ │＋│  ┌Explode┐┌⟲┐ FL 22 ×                              ╰───────────────╯ │
│ ╰──╯                                                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

- The rail moves to the **left** and floats (glass, 64 px wide, vertically centered). Icons only, with labels in a tooltip after 400 ms hover and a visible label for the selected tab.
- The inspector **overlays** the canvas and slides with `transform: translateX`. Do not animate its width (v1's jank). The camera shifts the building into the uncovered area.

## 6. Components

Each entry lists what the component does, its spec, and its v1 counterpart. Do not add Tailwind or shadcn. Port anything taken from 21st.dev into plain CSS on these tokens (see section 9).

1. **Command bar** (`TopBar` in `PhoneShell.tsx`). Glass capsule, radius 28, padding 10 × 14. The address is a button: tapping it opens Respond (dispatch + cached buildings). Facts are a mono line, not pills: `26 fl · Type I · 90% sprinklered · 115 m · 1925 · B1`. A tone colors only the affected word (wood frame red, the sprinkler gap amber). With a dispatch, a red pill `🔥 Floor 22` leads row 2, with a slow 2 s glow pulse.
2. **Danger badge.** A 36 px round button with the number in Geist Mono 15/600, a 1 px danger ring and a 12 px danger glow. When the count changes, the number rolls vertically (old one out the top, new one in from below, 220 ms).
3. **Mic orb** (`voice/voice.css` overrides). 44 px circle in glass, with the mic icon in ink. Listening: the orb fills with `--fs-action` and an audio-reactive ring (scale 1 → 1.15 driven by input level if available, else a 1.2 s breathe). Speaking: a thin progress arc around the orb for `step i / n`. The caption drops below the command bar as a glass-strong card.
4. **Dock** (`fs-nav`). Glass capsule, 64 px tall, radius 24. Icons 22 px, stroke 1.75 (Lucide). The selected tab gets a pill behind it (`--fs-action` at 16 % with a 1 px action border) that **moves between tabs with a shared-layout spring** (section 8). The icon turns action blue; the label shows under it only on the selected tab (others are icon-only). The danger count sits as a 16 px red dot on Hazards.
5. **Sheet** (`fs-sheet`). Glass-strong, radius 28 at the top, a 36 × 4 grabber. Three snap points: peek (132 px), half (50 %) and full (top at command-bar bottom + 8). Drag uses velocity: a flick faster than 500 px/s goes to the next snap point in that direction; otherwise snap to the nearest. Rubber-band past the ends at 0.3 resistance. The content scrolls only at full; at half, a drag on the content moves the sheet.
6. **Readouts** (replaces `.fs-stat`). Three compact instrument cells in one glass row, not three blocks. Each is a mono number (28/32) over a mono eyebrow, with a 2 px bottom bar in its severity color showing its share of all records. Selected filter: the bar becomes 3 px and the cell gets `--fs-raise`. Count-up runs **only on first mount per building**, never on tab revisit.
7. **Segmented control** (Stacked / Exploded; Crew / Dept). 36 px visual, 48 px hit, radius 10. The thumb is `--fs-raise-hover` with a hairline and moves with a spring. The text color does not change, so there is no flash.
8. **List row** (`PinRow`). 56 px minimum. A 3 px severity bar inset at 12 px from the left, rounded and not full height (14 px tall, vertically centered), then the title (`displayLabel`) and a mono caption, with chips on the right: Stale (amber outline), Conflict (amber fill), Unverified (dashed), New (action). Pressed state: `--fs-raise-hover` plus scale .99, 90 ms. No staggered entrance after first mount.
9. **Floor selector** (replaces the elevator grid). A vertical **floor tape**: a scrollable column of floor numbers, top floor first, 40 px per floor, like an altimeter. Hazard ticks (red or amber dots) sit beside each number, and the dispatch floor carries a red glow. Scrub with a finger to move the focus; the 3D follows after 120 ms of no movement, with a light haptic tick per floor. Tapping a number jumps there. The selected floor is a blue pill that magnifies to 1.15 with a spring. On the phone, the tape sits on the left edge of the Floors sheet, with `FloorPanel` beside it. On desktop it fills the inspector's left 72 px.
10. **Water compass** (`Dial` in `views.tsx`). A 48 px dial with 8 ticks and a cyan needle. On mount the needle swings from north to the bearing with a spring (stiffness 120, damping 14), once only. Distance is a mono readout with the 16-point direction under it. The wind card uses a white needle with a 3 s ±4° idle sway (the only idle loop besides live states).
11. **3D chips** (`Pins.tsx`, `rooms.css`). Glass pills (the v2 glass recipe, at a smaller blur of 12 px) with a severity dot and an uppercase mono label. Danger chips keep their slow pulse but as a glow, not an opacity blink.
12. **Model controls** (`fs-dock`). One glass cluster with 44 px items: `[⤢ Explode]` (action fill when it will explode; glass when it will collapse), `[⟲]` and `[Rooms]` (only when exploded with a focus). While exploding, a thin progress line runs along the bottom of the Explode button over the timeline's real duration. Read it from `gsap.getById` or pass the progress through the store; it is not a looping stripe.
13. **Toasts.** Glass-strong pill, top center under the command bar. Spring in from y −12, auto-dismiss after 2.6 s, swipe up to dismiss.
14. **Inputs.** 44 px, radius 10, `--fs-raise` background, hairline border that turns `--fs-action` on focus with a 3 px action-glow ring.

## 7. Camera framing instead of canvas resizing

v1 resized the canvas so the camera centered the building in the visible area. v2 keeps the canvas full-screen and shifts the projection instead:

```ts
// in Slabs (App.tsx) or a small <FrameInset /> component inside the Canvas
const inset = useStore((s) => s.inset) // { right: px, bottom: px } covered by the inspector or sheet
const { camera, size } = useThree()
useEffect(() => {
  const cam = camera as THREE.PerspectiveCamera
  const w = size.width, h = size.height
  // move the optical center to the middle of the uncovered rectangle
  cam.setViewOffset(w, h, inset.right / 2, inset.bottom / 2, w, h)
  cam.updateProjectionMatrix()
}, [inset.right, inset.bottom, size.width, size.height])
```

- The shell writes `inset` to the store whenever the sheet snap point or the inspector's open state changes (the snap target, not every drag frame).
- Tween the offset over 300 ms with the same spring as the panel: `animate(current, target, { type: 'spring', … , onUpdate })`. Don't jump it.
- `explode.ts`'s `fit()` keeps using `size.width / size.height`. Shrink the effective aspect by the inset when the inspector is open (`aspect = (w - inset.right) / (h - inset.bottom)`) so the fan still fits.

## 7b. Pins on the exploded fan

Product owner: when the building explodes, the chips should not sit on the floors, because they take up too much space.

- Exploded with no focus: every pin is a **dot** on its floor (danger dots glow red). No stems, no chips. The dot keeps a minimum on-screen size (5 px radius) so it stays visible from far out.
- Focus a floor (tap it, pick it in Floors, a dispatch, voice, `?focus=`): that floor's chip grows out of its dot. Floors an Ask answer names get their chips too. Roof records follow the top floor; site records follow the ground floor.
- Tapping a dot still opens its record in the panel.
- Chips are kept inside the uncovered part of the canvas: never under the top bar, the nav or the open panel.

Code: `labelled` in `Slabs` (`App.tsx`) and `PinMarker` / `Declutter` (`Pins.tsx`).

## 8. Motion

Use **Motion** (`npm i motion` in `web/`, import from `motion/react`) for UI motion. Keep GSAP for the 3D timelines (`explode.ts`), and don't mix them on the same element.

| Use | Config |
|---|---|
| Tab pill, segmented thumb, selected floor | `layoutId` shared layout, `{ type: 'spring', stiffness: 520, damping: 40, mass: 0.9 }` |
| Sheet snap and inspector slide | `{ type: 'spring', stiffness: 380, damping: 38 }`, using the drag velocity as `velocity` |
| Panel content change | `AnimatePresence mode="popLayout"`: exit `opacity 0, y -6` over 120 ms, enter `opacity 0 → 1, y 8 → 0` with spring 420/36. Direction-aware x ±16 for tab order |
| Press feedback | `whileTap={{ scale: 0.97 }}`, spring 700/30 (fast, no wobble) |
| Toast | spring 500/32 from y −12 |
| Compass needle | spring 120/14, once |
| Number change (badge, readouts) | vertical roll, 220 ms `easeOut` |

Rules:
- Animate **transform and opacity only**. No `width`, `height`, `top`, `bottom`, `margin` or `grid-template-*` transitions anywhere in the shell.
- Entrance staggers run once per building load (keyed on `building.id`), never on tab revisit. Cap the stagger at 6 items × 24 ms; everything after appears with the 6th.
- Response under 100 ms: the pressed state must show on `pointerdown`, not `click`.
- Reduced motion: wrap the app in `<MotionConfig reducedMotion="user">`, which turns transforms into instant changes and keeps fades at 120 ms. Keep v1's CSS kill-switch for GSAP-free CSS animations.
- Haptics: keep `tap()` from `motion.ts`, renamed to `haptics.ts` so it doesn't collide with the `motion` package name. Ticks: 8 ms on select, 14 ms on commit (note added, dispatch resolved), 20 ms on explode.

## 9. Using 21st.dev

The 21st.dev MCP (`21st:21st-ui` skill) could not be used when this was written. The cloud environment's network policy blocks `21st.dev` (proxy 403), and the plugin's `API_KEY_21ST` is unset. To enable it, add `21st.dev` under the environment's Allowed domains and set a free key from https://21st.dev/mcp. **No 21st component was looked at for this doc. The specs above stand on their own.**

Once it works, run these `search` queries and take the closest match **as a structural and motion reference**. Then port the result into plain CSS on the section 3 tokens. Do not add Tailwind, shadcn or Radix to the repo for this.

| Component | `search` query | What to look for |
|---|---|---|
| Dock | `glass bottom navigation bar animated pill` | a shared-layout selected pill; icon-only unselected items |
| Rail | `floating vertical sidebar icons tooltip glass` | a centered floating rail; hover tooltips |
| Sheet | `bottom sheet drawer snap points drag` | velocity snapping; rubber-banding; scroll handoff at full |
| Command bar | `floating command bar glass header` | a capsule header with a secondary row |
| Segmented | `segmented control animated thumb` | a spring thumb with no text-color flash |
| Readouts | `stat cards minimal dashboard mono numbers` | compact number-over-label cells; a severity bar |
| Floor tape | `vertical range slider scrub ticks` or `wheel picker` | scrubbing with magnification; tick marks |
| Toast | `toast notification glass spring` | a top pill with swipe to dismiss |
| Mic orb | `voice assistant orb animated` | an audio-reactive ring; a progress arc |
| Number roll | `animated number counter rolling digits` | a per-digit vertical roll |

Free tier: catalog search plus 2 component installs a day, so spend the installs on the sheet and the floor tape (the hardest two). `get_inspiration` is worth one call for overall "dark glass dashboard" direction. Do not use `generate` unless `get_usage.aiGenerationEnabled` is true.

## 10. Files

| File | Change |
|---|---|
| `web/src/index.css` | new `:root` tokens (section 3) |
| `web/src/tokens.ts` | mirror the UI tokens; night city palette behind `?night=0` |
| `web/src/shell/phone.css` | rewrite: glass utilities, new components; delete grain, stripes and condensed type |
| `web/src/shell/PhoneShell.tsx` | command bar, 5-tab dock + Note action, ⋯ menu, Motion wrappers, `inset` to the store |
| `web/src/shell/views.tsx` | readouts, rows with `displayLabel`, floor tape, compass springs; first-mount-only staggers |
| `web/src/shell/motion.ts` → `haptics.ts` | rename (the `motion` package now exists); `useCountUp` gets a `once` key |
| `web/src/store.ts` | `inset: { right: number; bottom: number }` and `setInset` |
| `web/src/App.tsx` | `setViewOffset` framing (section 7); night lighting |
| `web/src/Pins.tsx`, `web/src/rooms.css` | glass chips; drop the `--lg-*` duplicates |
| `web/src/shell/floor.css` | drop `--fl-*`; use `--fs-*` |
| `web/src/shell/voice/voice.css` | mic orb and caption card overrides |
| `web/src/shell/panels/panels.css`, `brief/brief.css` | font stacks to Geist; backgrounds transparent inside glass |
| `web/package.json` | add `motion`, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`; remove Barlow and Plex when unused |

## 11. Order of work

1. **Smoothness first (no visual change):** the overlay inspector with transform-only motion, `setViewOffset` framing, first-mount-only staggers, pointerdown press states. Ship this on its own. It fixes "not smooth" even before the restyle.
2. **Tokens and type:** the new `:root`, Geist, sentence case through `displayLabel`. Remove grain, stripes and uppercase.
3. **Glass chrome:** command bar, dock with a `layoutId` pill, model controls, toasts.
4. **Sheet with snap points and velocity**, then the desktop rail and inspector.
5. **Floor tape and readouts.**
6. **Night city** behind `?night=0`; flip the default once the team agrees.
7. **Low-power mode**, then test on a mid-range Android phone (the demo phone).

## 12. Acceptance checklist

Checked items were verified on the branch (build, tests and headless screenshots at 390 × 844 and 1440 × 900). Unchecked items need a real device or have not been done.

- [ ] 60 fps on the demo Android phone during: tab switch, sheet drag, inspector open and close, and explode (Chrome DevTools performance trace, no long frames over 32 ms in the shell).
- [x] The canvas element's size never changes after load (it fills the screen behind the chrome; only the projection changes).
- [x] No uppercase text outside eyebrows, small status tags, 3D chip source lines and the notice.
- [x] Amber and red appear only on hazards; blue only on interactive and selected things.
- [ ] Every tappable control has a hit area of at least 48 × 48 px.
- [ ] Body text contrast is ≥ 4.5:1 over the brightest part of the city (white roof) behind the glass.
- [ ] Reduced motion: no transforms animate; state is still clear.
- [x] `?glass=0` / low-power gives solid panels and no `backdrop-filter`.
- [ ] Data rules unchanged: stale, unknown and conflict are always visible; every fact still opens its source record; "Not for operational use" is always on screen.
- [ ] `npx tsc -b`, `npm run build`, `npx oxlint` and `node --test` for the web tests (`src/shell/facts.test.ts`, `src/store.test.ts`, `src/roomPlan.test.ts`, `src/cityMesh.test.ts`, `src/shell/model.test.ts`) all pass.
- [x] Exploded fan: dots only until a floor is focused (section 7b).

## 13. Future plans: test fire scenario

To build **after** the UI work above and the floor view (inside-a-floor, PR #34 and `docs/challenges-floor-view.md`) are finished. It is the demo's walkthrough:

1. **Start a test fire.** One control ("Run test fire") puts a simulated fire in the building. It is clearly labeled as a drill everywhere it appears ("Test fire · simulated", like today's simulated dispatch) and never mixes with real records.
2. **Fire floor in 3D.** The building explodes and frames the fire floor. That floor glows red and carries its chip. The floors above it are marked as exposure floors, since fire spreads up.
3. **Click into the fire.** Tapping the fire floor opens the floor view for that floor: people on the floor first, then hazards, then what is above and below.
4. **Walk the floors.** Step up and down from the fire floor (the floor panel's up and down steps, or by tapping floors in the fan), seeing people, hazards and recent work on each, so a crew can size up the floors above.
5. **Brief.** The arrival brief and the size-up brief read from the test fire, so the whole flow can be rehearsed end to end.

Open questions for that work: where the "Run test fire" control lives without changing the layout (probably the Respond page, next to the simulated dispatch), whether a test fire can start on any floor or only on preset ones, and how the fire's spread over time is shown, if at all.
