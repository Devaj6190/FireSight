# FireSight handoff · Lane B

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

## Your lane: B · Data fusion (Rishit, branch `lane-b-data`)

**Your job in one line:** turn 12 San Francisco public datasets into one resolved, labelled, dated `Building` JSON for the hero building, so every other lane builds on real records. Nothing on screen is real until your fixture lands; it is the first dependency for everyone.

**Read first:** `docs/plan/plan.md` sections 2 (datasets, join rules), 3 (hero facts, pin list, geometry) and 5 (contract); `docs/plan/research-datasf-sweep.md` and `docs/plan/research-data.md` (verified fields); `scripts/datasf_probe.py` (working Python loader; needs `certifi`).

### Do now (12:05 to 12:15): unblock everyone
1. Commit `shared/building.ts` exactly as the contract in plan.md section 5, plus the `ComplianceRow` type from the common section above. **PR it into main by 12:15** (contract freeze).
2. Hand-build a first `web/public/buildings/sf-0874003.json` from the verified pin list in plan.md section 3 ("400 Duboce pin list") so Lanes A and C have real-shaped data right away. Include it in the same PR.

### By 13:30 (CP1): the real hero JSON
Generate `sf-0874003.json` from the data (Python first is fine for speed; a TypeScript port in `api/src/data/` comes after). Use `https://data.sf.gov/resource/<id>.json` (not data.sfgov.org: it 301-redirects and breaks CORS).
- **Footprint + height:** `ynuv-fyni` where `mblr='SF0874003'`. Take the largest outer ring of the MultiPolygon, drop holes, project lon/lat to local meters around the centroid (x east, y north, CCW). `heightM = hgt_median_m` (13.8). Record the footprint as-of date (2023-09) and note heights come from 2010 LiDAR.
- **Identity resolution** (a scored feature; judge Rachana Mansinghka works on exactly this): the assessor roll `wv5m-vpq2` (latest `closed_roll_year`) names parcel 0874/003 **"50 CHURCH ST"** (built 1905, 78 units, 4 stories, class D); permits name it **"400 DUBOCE AVE"** (79 units, type 5). Fill `building.resolution`: `aliases`, and one `ResolutionLink` per dataset with method (apn, eas, address_norm, address_range, spatial), key, confidence (apn/eas exact, normalized equal high, range medium, spatial low), record count and one raw address example. Record **78 vs 79 units as a CONFLICT** pin.
- **Permits:** query **both** `i98e-djp9` and `tyz3-vt28` by block + lot. Take the **mode** across permits for stories, units and type (they disagree). Tag permits with regex: PV/solar, battery/ESS (not garage-door or alarm batteries), sprinkler, fire alarm/FACP, structural, fire escape, elevator. Map **only 3-digit unit numbers** to floors (311 -> floor 3), never above `floors`. Floor 3 pin: 2019 permit "unit 311 - 3rd flr - remodel kitchen, bath, structural work ... partial demo of e load-bearing wall".
- **Fire violations** `4zuq-2cbe` (join `starts_with(eas_id,'<baseid>-')`), **soft-story** `beah-shgi` (block + lot **without** leading zeros; "Work Complete, CFC Issued"), **fire incidents** `wr8u-xric` (2003 building fire, 2023 sprinkler malfunction; about 4 weeks behind), **DBI complaints** `gm2e-bten`, **DBI NOVs** `nbtm-fbw5`. EAS `3mea-di5p` resolves address -> APN and `eas_baseid`.
- Per layer, record `LayerStatus` `ok | no_records | fetch_failed`, as-of date and ms. Every pin: `claim`, `evidence[]` (dataset id, record id, a URL that returns the row, asOf, placement rule), `stale` if older than 5 years.
- **Drop personal data at load:** any name, phone or email field (permit contacts, managers). Never write them to the JSON.

### By 14:45 (CP2)
- **Compliance inputs** for Lane C: SFFD inspections `wb4c-6hwj` (`within_circle(location, lat, lon, 15)`; 400 Duboce "R2 Company Inspection" completed 2026-08-04) as `inspection` pins; open violations from `4zuq-2cbe`.
- **Water layer** from SF DEM Firefighting_ESF_4 (hydrants, cisterns, stations; a 2018 snapshot, label it):
  `https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/Firefighting_ESF_4/FeatureServer/3/query` (check the other layer ids in the same service for cisterns and stations). Ground pins with bearing and distance (hero: hydrant about 27 m, Station 6).
- **Wind:** Open-Meteo current wind at the centroid -> a `wind` ground pin.
- `shared/dispatch.ts`: `parseDispatch("Structure fire, 400 Duboce Ave, smoke from unit 311")` -> a `dispatch` pin anchored to floor 3. `shared/conflicts.ts`: `detectConflicts(building)` (pure; re-run when a crew or department pin is added).
- Sources and limits data for Lane D: the sources drawer is built from `resolution.links` + `layers`, so make those complete and accurate.

### By 16:00 (freeze)
- Second and third buildings cached: `sf-3703081.json` (1018 Mission St: 1911 unreinforced-masonry SRO hotel, address range "1018 - 1024 Mission St", 2025 unsafe-building NOV) and `sf-1244030.json` (1433 Haight St: "PV permit issued 2022, completion not recorded").
- SFFD fire permits `893e-xam6` join (hero returns no_records: show that honestly). Trolley wires and hollow sidewalks if time allows.
- Re-count the SF footprints with LiDAR height (planned 177,023) for the business slide.
- 16:00 to 16:40: check that every evidence URL opens.

### Don't
- Don't guess a construction-type meaning: show the raw code and source ("5 (permits)").
- Don't change `shared/building.ts` after 12:15 without Vidyut's OK (post the change first).
- Never call the data "live".

## Start
Run `date`, `git fetch && git checkout lane-b-data`, read the files listed above, then begin with "Do now". Push to your lane branch at least every 30 minutes.

## Setup and integration checklist (added 12:30; details in docs/handoff/SETUP.md)
1. Tools: Python 3 + certifi, Node 22+, `gh auth status` OK (SETUP.md section 1).
2. **Open your PR into main now** (contract, 3 building files, dispatch, conflicts, URL checker). Vidyut will squash-merge it so the old raw-data commit never reaches main.
3. Your builder must **keep an existing `fallback` field** when it rewrites a building file (read the old file, copy `fallback` across). Lane C fills it with `npm run precompute` (SETUP.md section 5).
4. Pin formats the compliance strip reads are in SETUP.md section 5; your current files already match (C1 PASS 79 days, C3 PASS, C4 UNKNOWN 4 ft rule, C8 7/9/5 of 21 on 400 Duboce).
5. Check the 400 Duboce footprint: about 53 x 59 m (174 x 193 ft) for 79 units on 4 floors looks large. Compare with the assessor lot area; if it includes a neighbour, pick the ring by `mblr` or the largest ring containing the parcel centroid.
6. Your shared files import without extensions (`"./building"`): fine, Lane C switched to bundler resolution.
