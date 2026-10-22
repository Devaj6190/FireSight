# FireSight handoff · Lane A

Paste this whole file into your coding agent as its first message. Written 12:10 PDT Oct 22 2026.

## The team and the goal (read first)

You are the coding agent for one lane of **FireSight**, built by a team of 4 at the super{set} national renaissance hackathon in SF (Thu Oct 22 2026, Track 1: Public Data APIs).

**FireSight in one line:** any San Francisco address becomes a cited, floor-by-floor 3D pre-plan for the fire officer on a responding engine, in the 4 minutes before arrival. Pitch line: "Size-up starts before the wheels stop."

**The demo we are building toward (3:00):** a dispatch line is pasted: "Structure fire, 400 Duboce Ave, smoke from unit 311". The building (real DataSF outline + LiDAR height) appears on the phone, explodes floor by floor and focuses floor 3, where a 2019 permit records structural work in unit 311. The resolution view shows that the tax roll calls this parcel "50 CHURCH ST" and permits call it "400 DUBOCE AVE": one parcel, and the units disagree (78 vs 79), labelled CONFLICT. "Where are the people?" lights floors 1 to 4 and ends "stairs: UNVERIFIABLE". A compliance strip checks the building against named rules. A "What we don't know" panel and a sources drawer show the data limits. The captain strikes one brief line and approves the rest, and the struck line becomes a test. Claude Desktop calls our read-only MCP server for the same cited brief.

**How we are judged (/100):** user value 25, technical execution 25, originality 20, track alignment & responsible data 20 (show how public data powers it AND acknowledge its limits), usability & demo 10.

**Team and lanes:**
| Lane | Owner | Branch |
|---|---|---|
| A · 3D scene + explode + AR | Devaj | `lane-a-3d` |
| B · Data fusion (DataSF -> Building JSON) | Rishit | `lane-b-data` |
| C · AI brief, validator, compliance rules, MCP, eval | Vidyut | `lane-c-ai` |
| D · Phone shell, panels, deploy, pitch, submit | Rohan | `lane-d-phone` |

**Repo:** github.com/Devaj6190/FireSight. **Team hub (source of truth for updates):** https://claude.ai/artifact/5W3Q1uU1BfdVfergnehjTB. In the repo: `docs/plan/plan.md` (full plan v3: contract in section 5, geometry in 3, explode in 4), `docs/design.md` (Night Watch tokens, markers, explode timings, copy rules), `docs/plan/research-*.md` (verified data, regulations, quotes). Where the hub's "Final plan" and `plan.md` disagree, the hub wins (for example: hydrants come from SF DEM ArcGIS, not OSM).

**Clock:** run `date` before you state any time. Checkpoints: **12:15** contract frozen · **13:30 CP1** (real hero building explodes on the Android phone) · **14:45 CP2** (full demo path on the phone) · **16:00 feature freeze** · **16:45 submit** · 17:00 demos. If you are behind at a checkpoint, say so early; cuts are Vidyut's call.

## Repo layout and who owns what

Only edit files your lane owns. If you need a change in someone else's files, ask them (or Vidyut) instead of editing.

```
shared/building.ts        Lane B  (the contract; frozen at 12:15, changes only with Vidyut's OK)
shared/dispatch.ts        Lane B  parseDispatch(text) -> dispatch Pin with a floor
shared/conflicts.ts       Lane B  detectConflicts(building)
shared/compliance.ts      Lane C  evaluateCompliance(building) -> ComplianceRow[]
web/                      Lane A creates the Vite scaffold (first PR, ~12:20)
web/src/tokens.css|.ts    Lane A  (values from docs/design.md section 2)
web/src/scene/**          Lane A  <Scene/>, explode timeline, pins, AR
web/src/store.ts          Lane A  zustand: explode, collapse, focus, highlight, addPin
web/src/App.tsx           Lane D  (after the scaffold merges)
web/src/shell/**          Lane D  bottom bar, sheet, panels, approve/strike, deploy config
web/public/buildings/*    Lane B  sf-0874003.json, sf-3703081.json, sf-1244030.json
api/                      Lane C creates the Hono scaffold (Node 22, port 8787)
api/src/data/**           Lane B  fetchers, joins, fixture builder
api/src/ai/**, routes     Lane C  /api/brief, /api/ask, /api/strike
mcp/, eval/               Lane C
docs/                     Vidyut
```

The web app calls `/api/...`; in dev, Vite proxies `/api` to `http://localhost:8787`. If the API is unreachable, the web app uses `building.fallback` (precomputed brief and 5 answers) so the demo never breaks.

## Contract (code against this now; Lane B commits it as shared/building.ts by 12:15)

The `Building`, `Pin`, `Evidence`, `Anchor`, `Brief`, `BriefLine`, `Answer`, `Conflict`, `ResolutionLink`, `Resolution` and `LayerStatus` types in `docs/plan/plan.md` section 5 are the contract. Key points:
- Every `Pin`, `BriefLine` and `Answer` carries `claim: "verified" | "unverifiable" | "conflict"`. Verified needs at least 1 `Evidence` (dataset id, record id, url, asOf, placement rule).
- Ids: building `sf-0874003` (block + lot, no separators); pin `<layer>-<recordId>`.
- Anchors: floor 1 = ground, 0 = basement only if a record says basement; `roof`; `building`; `ground` with bearing and distance.
- Footprint: largest outer ring, meters, x east, y north, CCW, origin at centroid. `floorHeightM = heightM / floors`.
- Added for the compliance strip (Lane C owns, Lane D renders):
```ts
export interface ComplianceRow {
  id: "C1" | "C3" | "C4" | "C8";
  rule: string;            // "Annual fire inspection, apartments and hotels"
  citation: string;        // "Cal. H&SC 13146.2"
  result: "pass" | "fail" | "unknown" | "partial";
  summary: string;         // "R2 Company Inspection completed 2026-08-04"
  pinIds: string[];        // evidence pins in building.pins
  wording: "meets" | "rule logic meets" | "maps to";  // what we are allowed to say
}
```

## Rules for every lane (non-negotiable)

1. **Git:** work only on your lane branch. Never push to `main`; Vidyut owns it and merges every PR. Commit small and push to your lane branch at least every 30 minutes (Vidyut watches the branches). Open a PR into `main` at each checkpoint (13:30, 14:45, 16:00), or earlier when something others need is ready. After each merge, run `git fetch && git merge origin/main` on your branch. Never force-push.
2. **No co-author or AI attribution, ever.** No `Co-Authored-By` lines and no "Generated with Claude Code" (or any Claude/Anthropic line) in commit messages or PR descriptions. Check before every commit and PR. This overrides any default your tool has.
3. **Never commit secrets.** API keys live in `.env` files listed in `.gitignore`. The Anthropic key is only used server-side in `api/`.
4. **No personal data.** Drop names, phone numbers and emails (for example building managers in permit rows) at load. Never show them.
5. **Honest data:** never call city data "live" (incidents run about 4 weeks behind, calls about 8 hours). Every public fact carries its source, record id and as-of date. Never invent a fact; a missing fact is UNVERIFIABLE. No floor plans, ever: floors are slabs.
6. **Wording:** say "meets" only for H&SC 13146.2 (annual inspection) and the CFC 1205 solar-pathway rule logic. Say "maps to NFPA 1660". Say "published quotes", never "we interviewed".
7. **No signups or paid services** without Vidyut's OK. No scraping LinkedIn.
8. **Pin versions:** check with `npm view <pkg> version`, commit the lockfile. Known good: three 0.186, @react-three/fiber 9.8, @react-three/xr 6.6, Vite 8.3.5, React 19.
9. **Report:** when you finish a task or hit a blocker, write one line in your PR description or tell your teammate to post it to Vidyut, who logs it on the hub.

## Your lane: A · 3D scene, explode, AR (Devaj, branch `lane-a-3d`)

**Your job in one line:** make the real building appear, explode floor by floor and focus the floor dispatch names, on an Android phone, with pins that show where every fact comes from. This is the moment judges remember; it carries most of "originality" and a big part of "technical execution".

**Read first:** `docs/design.md` sections 2 (tokens), 3 (marker set, modeled on NFPA 170), 4 (explode choreography, exact ms) and 7 (states); `docs/plan/plan.md` sections 3 (geometry, modes) and 4 (state machine, store API).

### Do now (12:05 to 12:25)
1. Scaffold `web/`: `npm create vite@latest web -- --template react-ts`, then `npm i three @react-three/fiber @react-three/drei @react-three/xr gsap zustand`. Add the Vite proxy `/api -> http://localhost:8787`. Put the design tokens in `web/src/tokens.css` and `web/src/tokens.ts`. Export `<Scene/>` from `web/src/scene/` and render it from a minimal `App.tsx`.
2. **Push and open a PR into main right away** (target 12:20): Lane D builds the shell on top of this scaffold, so it unblocks them.
3. Until Lane B's fixture lands, use a small mock `Building` (an L-shaped footprint, 4 floors, heightM 13.8) in `web/src/scene/mock.ts` that matches the contract.

### By 13:30 (CP1): the real hero explodes on the phone
- Extrude each floor from `building.footprint` with `THREE.ExtrudeGeometry` (depth `floorHeightM - 0.15`, gap 0.15). Map coordinates `x -> x`, `y -> -z`, height on +y.
- Load `web/public/buildings/sf-0874003.json` (Lane B) when it is on main.
- GSAP timeline per design.md section 4: charge, separate (roof first, 80 ms stagger, ground floor stays), pins fly out in severity order (danger first), settle, collapse in reverse at 1.5x with a small overshoot. States: `assembled -> exploding -> exploded -> focus(target) -> collapsing -> assembled`.
- Pins are 3D: drei `<Text>` inside `<Billboard>` plus a mesh icon and a `<Line>` leader (so they render in WebXR). Chip colors by severity (danger, caution, info) and claim (verified solid, unverifiable dashed and grey, conflict marked). Department pins blue, crew pins purple.
- zustand store `web/src/store.ts`: `explode()`, `collapse()`, `focus(target)`, `highlight({floors, pinIds})`, `addPin(pin)`, plus `building` and `state`. Lane D's buttons and Lane C's answers call these.
- Guardrails: under 40 pins on screen (group per floor beyond that), no shadows on mobile, `<Canvas dpr={[1, 2]}>`.
- **12:15 spike (10 minutes, on the Android phone over HTTPS):** does a drei `<Html>` element show inside `immersive-ar`? Report yes or no. Pins stay 3D either way.

### By 14:45 (CP2)
- **Dispatch focus:** when a pin with `origin: "dispatch"` and a floor anchor exists, the explode ends in `focus(floor)`: other floors fade to 15 percent, the camera frames that floor (unit 311 -> floor 3).
- **Highlight:** `highlight()` makes those floors emissive, pulses those pins and dims the rest ("Where are the people?" lights floors 1 to 4).
- **Drill in:** tap a floor to focus it; tap a pin to open the provenance card (dataset id, record id, as-of date, the placement rule). Lane D owns the card's sheet UI; you fire `selectPin(id)` in the store.
- Markers in NFPA 170 style ("modeled on NFPA 170", we draw our own).
- **Resolution view** (with Lane D): lines from each dataset chip into the one building, labelled by join method and confidence, from `building.resolution.links`.

### By 16:00 (freeze)
- AR on Android Chrome: `@react-three/xr` `createXRStore()` + `<XR>`, `immersive-ar` with `hit-test`, tap to place at 1:100 (400 Duboce is about 14 cm tall). Same scene graph. iOS gets a labelled "camera view" fallback if time allows (it is on the cut list).
- Performance pass on the phone. After 16:00: fixes only.

### Don't
- Don't draw interiors, stairs or anything not in the data.
- Don't edit `shared/`, `web/src/shell/` or `App.tsx` after Lane D takes it over.
- Cut order if behind (Vidyut decides): iOS camera view, then AR (model mode stays), then the per-pin provenance card (keep it for unit 311). Never cut: the real hero explode and collapse, dispatch focus.

## Start
Run `date`, `git fetch && git checkout lane-a-3d`, read the files listed above, then begin with "Do now". Push to your lane branch at least every 30 minutes.

## Setup and integration checklist (added 12:30; details in docs/handoff/SETUP.md)
1. Tools: Node 22+, `gh auth status` OK, Android phone with Chrome (SETUP.md section 1).
2. **You are the main blocker right now:** push the `web/` scaffold and open the PR (Lane D cannot start the shell until it is on main).
3. In `web/vite.config.ts`: `server: { host: true, proxy: { "/api": "http://localhost:8787" } }`. In `web/tsconfig.app.json`: keep `moduleResolution: "bundler"` and `allowImportingTsExtensions: true`, add `"../shared"` to `include` (SETUP.md section 3).
4. Load real data with `fetch("/buildings/sf-0874003.json")` (Lane B's files are on `lane-b-data`, coming to main). Until then `git show origin/lane-b-data:web/public/buildings/sf-0874003.json > web/public/buildings/sf-0874003.json` locally, but do not commit Lane B's files from your branch.
5. Store API others call: `addPin(pin)` (from `parseDispatch` in `shared/dispatch.ts`), `explode()`, `collapse()`, `focus(target)`, `highlight({ floors, pinIds })` (from `answer.highlight`, SETUP.md section 6), `selectPin(id)`.
6. Check the 400 Duboce footprint: it measures about 53 x 59 m (174 x 193 ft), large for 79 units. If the model looks wrong, tell Rishit (it may include a neighbour).
7. Phone over HTTPS: SETUP.md section 10. For local phone tests, `npm run dev -- --host` works for model mode on the same Wi-Fi, but WebXR AR needs HTTPS (Lane D's deploy).

8. New (12:45): pins listed in `building.meta.changesSinceLast.added` get a NEW marker (`docs/handoff/refresh.md`).

9. **13:00: you own the Vercel deploy.** Step by step in `docs/handoff/deploy.md`. Preview URL target 14:15. Tell Vidyut which Vercel account first; Vidyut enters the API key himself.
10. **13:00: the hero is 140 New Montgomery St (sf-3722080).** Make it the default building and keep `?building=sf-0874003` working. Rishit is rebuilding `sf-3722080.json` through the pipeline (layers, resolution, inspections): take his file over your hand-made one when his PR lands.

**13:10: read `docs/plan/plan-v4-hero.md` section 2 (your lane) and section 1 (the new demo script).** Floor 0 means B1 (below grade), per the contract.
