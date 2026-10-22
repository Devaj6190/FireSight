# FireSight handoff · Lane D

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

## Your lane: D · Phone shell, panels, deploy, pitch, submit (Rohan, branch `lane-d-phone`)

**Your job in one line:** make it usable one-handed on an Android phone and make the story land: the shell, every panel the judges score (limits, sources, resolution, compliance, approve/strike), the HTTPS deploy, the pitch, the dry runs and the submission by 16:45.

**Read first:** `docs/design.md` sections 2 (tokens), 5 (screen layout, 390 x 844, one hand), 6 (copy rules) and 7 (demo states); the hub's "Final plan" (rubric map, limits panel text, demo script) and plan.md sections 6 (demo script) and 7 (business slide); `docs/plan/research-voices.md` (published firefighter quotes).

### Do now (12:05 to 12:25)
1. **Deploy target:** propose Vercel (or similar) to Vidyut and get his OK on which account before any signup. The phone needs HTTPS for WebXR.
2. When Lane A's scaffold PR merges (~12:20), `git merge origin/main`, then deploy a hello page and open it on the Android phone.
3. Meanwhile draft pitch slides 1 to 3 (the hub's Final plan section is the outline; the opening quote is NIOSH, Spring Valley 2021: "had not ... developed a formal pre-incident plan").

### By 13:30 (CP1)
- Phone shell in Night Watch (tokens from `web/src/tokens.css`, IBM Plex Sans/Mono, 48 px targets, dark): address box over the 3 cached buildings, ETA, one action button (EXPLODE / COLLAPSE) calling the store, bottom sheet showing the top 3 pins.
- Dispatch paste box: calls Lane B's `parseDispatch(text)`, then `addPin()` and `explode()`.
- Deploy works on the phone; run CP1 on the phone with Lane A.

### By 14:45 (CP2): the scoring panels (all MUST)
- **Approve/strike UI** on each brief line with claim chips (VERIFIED, UNVERIFIABLE, CONFLICT); strike calls `POST /api/strike`; then **Send to crew** radio card.
- **"What we don't know" panel** (track requirement), one row per limit with its as-of date: heights from 2010 LiDAR, outlines as of 2023-09; hydrants a 2018 SF DEM snapshot; incidents about 4 weeks behind, calls about 8 hours (never "live"); units per floor are a lower bound from permit text; no floor plans (stairs and standpipe UNVERIFIABLE); tax roll 78 vs permits 79 units (CONFLICT); inspection-to-statute link is our inference; NFPA 1660 mapped from the 1620 text; city map layers state no license.
- **Sources drawer:** every dataset with id, record count and as-of date, from `building.resolution.links` + `building.layers`; attribution "Building data: DataSF", "Weather: Open-Meteo", SF DEM layers with dates.
- **Resolution view** sheet (with Lane A): "50 CHURCH ST" and "400 DUBOCE AVE" become one parcel; each dataset's join method and confidence.
- **Compliance strip:** render `evaluateCompliance(building)` rows (from Lane C) with result, evidence and the allowed wording.
- Provenance card sheet when a pin is selected (dataset, record id, as-of, rule).
- Crew note and department pin inputs (`origin: "crew"` / `"department"`), then `addPin()`.

### By 16:00 (freeze), then submit
- Eval screen reading `eval/last-run.json` (Lane C).
- Published-quotes slide titled "In their words (published sources)" (3 or 4 quotes with source, date, link). Business slide (plan.md section 7: pre-plan vendors First Due / Tablet Command / ESO buy the resolved building layer; no FireSight price; 177,023 SF buildings covered, re-counted by Lane B).
- Demo script timing, dry run 1 at 15:30, dry runs 2 and 3 after 16:00, backup video, Devpost text. Phone charged, hotspot on, fallback tested in airplane mode.
- **Submit by 16:45.**

### Don't
- Don't edit `web/src/scene/` or `store.ts` (Lane A) or `shared/` (B and C); ask.
- Never claim "we interviewed firefighters" or show a FireSight price.

## Start
Run `date`, `git fetch && git checkout lane-d-phone`, read the files listed above, then begin with "Do now". Push to your lane branch at least every 30 minutes.

## Setup and integration checklist (added 12:30; details in docs/handoff/SETUP.md)
1. Tools: Node 22+, `gh auth status` OK, the Android phone (SETUP.md section 1).
2. Wait for Lane A's `web/` scaffold on main, then `git merge origin/main`. Until then: deploy plan, pitch slides, and the panel components can be written as plain React files in `web/src/shell/`.
3. Call the API only through `shared/client.ts`: `fetchBrief`, `ask`, `strike`, `compliance`, `SUGGESTED_QUESTIONS`, with `parseDispatch` from `shared/dispatch.ts`. Full example in SETUP.md section 6, including the offline fallback behaviour.
4. Compliance strip rendering and wording rules: SETUP.md section 7. Eval screen reads `/eval/last-run.json`: shape in section 8.
5. Sources drawer: from `building.layers` (each has `datasetId`, `source`, `records`, `asOf`, `status`) and `building.resolution.links`. Limits panel text: hub Final plan.
6. Deploy: SETUP.md section 10. Ask Vidyut which account before any signup. The key goes only into the host's environment settings, entered by Vidyut. Fallback plan if the API deploy fails: web-only deploy works on precomputed answers.
7. Claude Desktop MCP on the presenting laptop (yours or Devaj's): `mcp/README.md` and SETUP.md section 9, only with Vidyut's OK, after CP2.

8. **New roadmap item (12:45): auto-refresh every 30 minutes.** Show "Refreshed HH:MM · every 30 min", a change feed card, NEW tags on new pins and per-source as-of dates (`docs/handoff/refresh.md` section 3). Deploy recipe: SETUP.md section 10 (updated 12:45).

9. **Rebalance (12:57):** the limits panel, sources drawer and compliance strip move to Rishit (`web/src/shell/panels/`); the brief sheet with approve/strike and the eval screen move to Lane C (`web/src/shell/brief/`). You keep: the shell layout, dispatch box, provenance card, resolution view (with Devaj), crew and department inputs, the "Send to crew" radio card, freshness chip and change feed, Vercel deploy, pitch, script, backup video and submission. Place the others' components in your layout (SETUP.md "Rebalance"). **Push what you have now, and at least every 30 minutes.**
