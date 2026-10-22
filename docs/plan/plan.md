# FireSight plan v3 (super{set}, Track 1, Thu Oct 22 2026)

Owner: Vidyut. Team of 4 with coding agents. Build 11:45 to 16:00, freeze 16:00, submit 16:45, projects due 17:00, demos 17:00 to 18:00.
v1 by master-planner 11:05 to 11:11 PDT; v2 11:17 to 11:19; v3 11:27 to 11:50. v3 inputs: a second judge analysis (all 8 judges, a teammate's agent, relayed by main), Vidit Naik's in-person feedback (board 11:24), research-datasf-sweep.md checkpoint (board 11:25). v2 inputs: judge.md (19/25), research-data.md, research-judges.md, research-planet-dots.md, design.md, the red-team FIX list (relayed by main), board.md through 11:17.
Evidence labels: **VERIFIED** = a primary source or live `data.sf.gov` row was read today (who and when is given); **REPORTED** = secondary; **UNRESOLVED** = open question with the test that settles it.

## v3 changes (read this first; v2 list below still applies unless overridden)

1. **Every claim carries one of three labels: VERIFIED (a cited public record), UNVERIFIABLE (no public record; replaces "unknown"), CONFLICT (sources disagree).** Pins, brief lines and answers all carry it; the eval counts it. Reason: 7 of 8 judges reward "prove the AI is right" (a fact-checker that labels claims "unverifiable", Checksum's test-every-change, Bigged's "data, not guesswork", approval gates before agents act).
2. **Regulated output** (Vidit Naik in person, board 11:24: "if you can build regulated stuff and meet regulations, that's cool"): the brief is structured as a pre-incident plan against named standards (NFPA 1660 pre-plan elements, NFPA 170 symbols, CA H&SC 13146 inspection status). Each required element shows VERIFIED, UNVERIFIABLE or CONFLICT. Exact elements: **pending research-regs.md (about 11:55)**. Lane C has a slot from 14:45 to 15:30 for it.
3. **Business reworked to the fastest payer.** Primary payer: **pre-plan software vendors (First Due, Tablet Command, ESO) buying a per-address hazard and compliance data layer over API/MCP.** They have already sold to departments, so there is no public procurement. Property owners (H&SC 13146 compliance) are the second wedge; insurers come later. Reasoning and the bootstrap path are in section 7.
4. **"Did you talk to users?" answered with published voices, not a visit.** No one leaves the venue (Vidyut). Lane D adds one slide of 3 or 4 real, cited firefighter quotes from public sources (NIOSH line-of-duty death reports, FireRescue1 / Fire Engineering articles, practitioner forums), which a finder is gathering into research-voices.md. They are labelled "published quotes", never "interviews".
5. **The MCP server is back on stage, live.** It is a real stdio server with a typed schema, read-only and cited, demoed from Claude Desktop against the 3 cached buildings (no venue network risk). The recorded clip becomes the fallback. Adding the server to Claude Desktop's config on the demo laptop needs Vidyut's OK.
6. **Resolution view as a visible feature.** It shows how each dataset's records join to one building: block/lot (exact), EAS address id (exact), normalized address including ranges like "1018 - 1024 Mission St" (high or medium), spatial radius (low). Each join shows a rule-based confidence and its record count. Hero example: the assessor names parcel 0874/003 "50 CHURCH ST" while permits say "400 DUBOCE AVE", and FireSight resolves both to one building. Lane B owns the logic, Lane A/D the view; it gets 15 s in the script. The planner did not verify the "50 CHURCH ST" name; Lane B confirms it in the first 20 minutes, and if it is wrong the example becomes 1018 Mission's address range.
7. **New layer: SFFD Fire Permits `893e-xam6`** (battery ESS 344, firefighter air systems 43, ERRCS radio 362, hazmat, LPG/UST tanks, high-piled storage, assembly; finder-datasf, research-datasf-sweep.md). The planner confirmed the fields at 11:27. A full-text `$q=400 DUBOCE` search returned 0 rows, so the hero shows `no_records` for it. Also new: the Tall Building Inventory `5kya-mfst` (percent sprinklered, stories below grade, 180 high-rises), not used by the 3 demo buildings.
8. **Lane load rebalanced** for items 2, 5 and 6: the dispatch parser moves to Lane B, and the crew note and department pin inputs move to Lane D.

## v2 changes

1. **Hero decided: 400 Duboce Ave (parcel 0874/003).** Reason: it is the only candidate with verified floor anchors on every floor (permit text names units on floors 1 to 4, and unit 311 has a 2019 "3rd flr ... structural work" permit), so a dispatch call can drive the explode to a floor. **1018 Mission St (3703/081) is second**: more dramatic (1911 unreinforced-masonry SRO hotel), but almost all its pins are building-level. 1433 Haight St is cached third for the rooftop PV pin. Comparison in section 3.
2. **Demo opens from a dispatch call, not a menu**: "Structure fire, 400 Duboce Ave, smoke from unit 311" focuses floor 3. The dispatch record is the Daylight input (judge change 3). The team-written sample pre-plan is demoted to a generic conflict rule.
3. **Business rewritten**: FireSight does not replace First Due's pre-plans, it **keeps them current** (a hazard-drift feed plus the 3D en-route view). Sourced case: NIOSH, Spring Valley NY 2021. Sourced comparables only (First Due $11,340/yr, Tablet Command up to $135,000); **no price of our own on stage**. One coverage number measured today.
4. **Cut now, not at a checkpoint**: live MCP on stage (now a recorded clip showing the typed, read-only, cited response) and live any-address lookup (demo uses cached buildings only). The saved time goes to two more dry runs.
5. **Grounding eval visible on stage** (for the Checksum judges): a test run across the 3 cached buildings that prints the measured count of briefs, answers and uncited lines. **Every line the officer strikes becomes a regression test case.**
6. **AR pins are 3D meshes** (drei `<Text>` inside `<Billboard>`), not drei `<Html>` (DOM probably does not show in `immersive-ar`; 10 minute spike at 12:15 settles it). AR is IN scope: the team has an Android phone (board 11:12).
7. **Offline claim fixed**: the fixture JSON carries a precomputed hero brief and 5 canned answers as the no-network fallback; bring a phone hotspot. v1's "nothing needs the network after load" was false (the brief and Q&A call Claude).
8. **Contract fixes** (red-team list): `/brief` and `/ask` POST the full `Building` including client-added dispatch, crew and department pins; floor height = `heightM / floors`; MultiPolygon handling and axis mapping; basement anchor; `Answer.unknowns`; brief line ids and status; a `Conflict` type; id format `sf-0874003`; per-layer `fetch_failed` vs `no_records`.
9. **Data corrections**: "Where are the people?" lights **floors 1 to 4** (floor 1 has units). The roof item at 400 Duboce is a solar hot-water system with a 3,000 gallon tank, location not stated: not an electrical hazard, not a roof-load claim. New sprinkler pin. 1433 Haight label is "PV permit issued 2022, completion not recorded". Permit fields are noisy: take the mode across permits.
10. **Never say "live"** for city data: incidents run about 4 weeks behind, calls about 8 hours (research-data.md). Show "as of" dates on screen.
11. **Exposures**: neighbouring footprints within 30 m drawn dim, with their own pins if any (judge change 5), only after CP2.
12. Versions: Vite is 8.3.5 (main). Design tokens, marker set, timings and copy rules come from design.md ("Night Watch").

---

## Verdict

Keep the idea. Three framing decisions stand from v1:
1. **Moment of use is en route, not on scene.** The officer reads it in the rig in the 4 minutes before arrival. Pitch line: "Size-up starts before the wheels stop."
2. **AR is tabletop AR** (WebXR `immersive-ar` + hit-test on Android Chrome). On iOS it falls back to a labelled "camera view". No facade lock.
3. **We own the geometry**: real DataSF footprint plus LiDAR height, extruded per floor in three.js. Google photoreal tiles are not used (cannot be split into floors, cannot be cached).

**Stack:** Vite 8.3.5 + React 19 + three 0.186 + @react-three/fiber 9.8 + @react-three/drei + @react-three/xr 6.6 + GSAP 3 (explode timeline) + zustand (scene store). API: Node 22 + Hono. AI: Claude via the Anthropic SDK with structured output (model id: Lane C checks the console at 11:45; do not guess). MCP: @modelcontextprotocol/sdk (TypeScript), stdio. Tests: Vitest. The three, R3F and XR versions are VERIFIED (npm, research-data-3d.md); Vite from main; pin the rest with `npm view <pkg> version` at 11:45 and commit the lockfile.

---

## 1. Holes a real fire captain would poke (and our answer)

| # | The captain says | Answer we build or say |
|---|---|---|
| 1 | "I'm not holding a phone up at a fire. I'm doing my 360." | Correct. FireSight is for the 4 minutes en route and the battalion chief's tablet at command. |
| 2 | "Your data is from 2014. The building got remodeled." | Every pin shows source and date; older than 5 years is dim with an "AGE" tag; the brief says "per 2019 permit", never "there is". City feeds lag (incidents about 4 weeks, calls about 8 h): shown on screen. |
| 3 | "You don't know the floor plan. Don't draw one." | No interiors, ever. Floors are slabs. Missing facts are shown as UNVERIFIABLE chips (stairs, standpipe), never guessed. |
| 4 | "If your AI is wrong, someone dies." | The AI only rephrases fused, cited facts; a validator drops any uncited line; the officer approves or strikes every line before it goes out; each struck line becomes a test (section 5, Lane C). The grounding eval runs on stage. |
| 5 | "We already have pre-plans in First Due / Tablet Command." | Good: we feed them. FireSight watches permits, violations and soft-story status nightly and flags when a pre-plan has drifted (new PV, alarm work, structural work, open violations), then shows it in 3D en route. |
| 6 | "Gloves, smoke, night, a bouncing rig." | Night Watch design (design.md): dark, high contrast, 48 px targets, one-thumb bottom bar, voice readout. |
| 7 | "No signal." | The building JSON (under 50 KB) is pulled at dispatch and cached, with a precomputed brief and canned answers inside it. Fresh Q&A needs the network. |
| 8 | "What actually changes my tactics?" | Construction and collapse, life hazard (units, rooms, occupancy), fire protection (sprinkler, alarm), roof energy (PV, ESS), open violations, water, wind. Section 2. |
| 9 | "Solar and lithium batteries scare us." | PV and ESS come from permit text; we label exactly what the permit says, including when completion is not recorded. |
| 10 | "Modern fires move faster than your app." | UL/FSRI: modern rooms flashed over in under 5 minutes vs just over 29 for legacy rooms; with an 8 minute arrival, collapse is possible 90 seconds later (VERIFIED, research-data.md). The size-up has to be done before arrival. |

## 2. Public data ranked by tactical impact (San Francisco)

All rows VERIFIED live today on `data.sf.gov` (planner 11:05 to 11:16, finder-data 11:05 to 11:13). Loader: `/Users/vidyutsriram/projects/superset-hack/plan/firesight/datasf_probe.py` (needs certifi; system python TLS fails without it).

| Rank | Layer | Fireground use | Dataset id | Join | Pins to |
|---|---|---|---|---|---|
| 1 | Construction type, year built, stories, units, rooms, use | Collapse, fire spread, life hazard | Assessor roll `wv5m-vpq2` (latest `closed_roll_year`); permits `i98e-djp9` fields as backup | APN | building badge |
| 2 | Permits by keyword: PV, ESS, battery, sprinkler, fire alarm/FACP, URM retrofit, fire escape, structural, elevator; unit numbers | Roof energy, protection systems, hidden voids, per-floor anchors | `i98e-djp9` | `block` + `lot` | roof, floor (from 3-digit unit number), building |
| 2b | SFFD fire permits: battery ESS, firefighter air systems, ERRCS radio, hazmat, LPG/UST tanks, high-piled storage, assembly | Lithium, in-building radio, air refill, tanks | `893e-xam6` (fields confirmed by the planner at 11:27; join rule pending finder-datasf: `permit_address` text) | address norm | building / roof |
| 3 | Fire incidents at the address | Prior fires, sprinkler and alarm malfunctions, alarm fatigue | `wr8u-xric` (about 4 weeks behind) | address text or `within_circle` | history ring |
| 4 | Fire violations | Exits, alarm and sprinkler testing | `4zuq-2cbe` | `starts_with(eas_id,'<baseid>-')` | floor if stated, else building |
| 5 | DBI notices of violation (incl. `unsafe_building`) | Unsafe facade, structural | `nbtm-fbw5` | APN | facade / building |
| 6 | Soft-story list and status | Weak ground floor; retrofit status | `beah-shgi` | `block` + lot **without** leading zeros | floor 1 |
| 7 | Fire inspections | On SFFD's radar; last inspected | `wb4c-6hwj` | `within_circle(location, lat, lon, 15)` | building badge |
| 8 | Footprint + LiDAR height | The model | `ynuv-fyni` (`hgt_median_m`, `mblr` = "SF"+APN) | `mblr`, fallback `intersects(shape, point)` | geometry |
| 9 | DBI complaints | Open cases, illegal units | `gm2e-bten` | APN | building |
| 10 | Calls for service near the block | Recent activity | `nuek-vuh3` (about 8 h behind; count distinct `incident_number`) | `within_circle(case_location, ..., 120)` | history ring |
| 11 | Hydrants and entrances | Water supply, access | OSM via Overpass (36 s, User-Agent required; pre-fetch); coverage incomplete: label it | distance | ground ring |
| 12 | Wind now, alerts | Exposure side, smoke direction | Open-Meteo (wind), NWS (alerts, User-Agent) | lat/lon | ground arrow |

Rules for Lane B: resolve address via EAS `3mea-di5p` to APN and `eas_baseid`; take the **mode** across permits for stories, units and type (400 Duboce permits disagree: stories 3/4/5, units 12/29/79, judge.md M2); map only 3-digit unit numbers to floors and never past `floors`; if a layer has no floor, pin it to the building or ground; record per layer `status: "ok" | "no_records" | "fetch_failed"`. Construction type codes: show the raw code and source ("Type 5 per permits", "Type C per assessor"); the assessor codebook is UNRESOLVED, so no interpretation beyond the raw code.

## 3. Demo buildings, getting them onto the phone, AR and model mode

### Hero comparison (decision: 400 Duboce hero, 1018 Mission second)

| | 400 Duboce Ave (0874/003) | 1018 Mission St (3703/081) |
|---|---|---|
| Drama | Wood frame, 79 apartments, soft-story (retrofit done), 2003 building fire, 2023 sprinkler malfunction | 1911 unreinforced-masonry SRO hotel, 72 rooms, 2025 "unsafe building" facade NOV, 36 of 50 incidents were false or system alarms (alarm fatigue) |
| Per-floor pins | **Yes, all 4 floors**: permit text names units 101 to 116 (7), 203 to 215 (5), 303 to 319 (7, incl. 311), 408 to 420 (7) (planner regex, 11:16) | Few: rooms are not numbered in the rows read; pins mostly building-level |
| Dispatch-to-floor beat | Unit 311: 2019 permit "unit 311 - 3rd flr - remodel kitchen, bath, structural work in kitchen. partial demo of e load-bearing wall" (VERIFIED 11:16) | No unit-level anchor found |
| Data density | permits 40 rows, violations 10, incidents incl. 2019 to 2025, soft-story, footprint 13.8 m | assessor, 37 permits, 50 incidents, 9 violations, NOV, inspections 2026-10-08, footprint 17.3 m |
| Risk | Permit fields noisy (mode rule); assessor names the parcel "50 CHURCH ST" (red-team): key by block/lot, not address | Range address "1018 - 1024 Mission St": needs EAS / GEO joins; 50-row limits hit |
| Verdict | **Hero**: the explode lands on a real floor for a real reason | **Second call** in the script: the drama beat in 15 seconds |

Third cached building: 1433 Haight St (1244/030; soft-story list calls it 1427 Haight): permit filed 2022-12-27, status issued, "rooftop solar. (53) 480w pv modules with optimizers." Label: "PV permit issued 2022, completion not recorded". Optional in the script.

All three are fused at build time to `web/public/buildings/sf-<APN>.json`, keyed by block/lot (`sf-0874003`, `sf-3703081`, `sf-1244030`), with a precomputed brief and 5 canned answers each. The address box searches only these three (live any-address lookup is cut; Lane B keeps the live route working off-stage).

### 400 Duboce pin list (all VERIFIED rows unless marked)
- Building: "TYPE 5, 4 STORIES, 79 UNITS" (mode across permits; Lane B confirms against assessor).
- Floor 1: "SOFT-STORY: RETROFIT COMPLETE" (soft-story list tier 2, "Work Complete, CFC Issued", as of 2026-10-07).
- Floors 1 to 4: "UNITS KNOWN ON THIS FLOOR: n (permits, lower bound)".
- Floor 3: "UNIT 311: 2019 STRUCTURAL WORK, LOAD-BEARING WALL" (dispatch focus pin).
- Building: "SPRINKLER MALFUNCTION 2023" (incident 2023-04-16, "731 Sprinkler activation due to malfunction", planner 11:16) and "SPRINKLER 5-YR TEST VIOLATION 2007, closed" (violation "1001.5.1.2 fire prot equip tested -5 yr spk").
- Building: "FIRE ALARM UPGRADED 2024 (NFPA 72 2022)" (2024-07-02 permit).
- Building: "SOLAR HOT WATER, 3,000 GAL TANK, LOCATION NOT STATED" (2019 permit, judge.md L1).
- History ring: "BUILDING FIRE 2003" (incident 2003-05-25, "111 - Building fire"); "ALARM MALFUNCTION 2019".
- Unknowns: stair count and location, standpipe, roof access, basement.

### Geometry (Lane B produces, Lane A consumes)
- `footprint`: the footprint is a MultiPolygon: take the **largest outer ring**, drop holes; project lon/lat to local meters around the centroid with `x = east`, `y = north`, counter-clockwise. Lane A maps to three.js as `x -> x`, `y -> -z`, height on +y.
- `heightM = hgt_median_m` (400 Duboce 13.8, 1018 Mission 17.3); `floors` = mode of permit stories or assessor stories; `floorHeightM = heightM / floors` (13.8 / 4 = 3.45). Show the footprint "as of" date (2023-09-11 on sampled rows; LiDAR from 2010).
- Lane A extrudes each floor with `THREE.ExtrudeGeometry` (depth `floorHeightM - 0.15`, gap 0.15).

### Modes
- **Model mode (baseline, every device):** R3F `<Canvas dpr={[1, 2]}>`, drei `<OrbitControls>`, dark ground disc, wind and north arrows.
- **AR mode (Android Chrome, in scope):** `@react-three/xr` 6 `createXRStore()` + `<XR>`, `immersive-ar` with `hit-test`; tap to place at 1:100 (400 Duboce about 14 cm tall). Same scene graph. Pins are drei `<Text>` in `<Billboard>` plus a mesh icon and a `<Line>` leader, so they render inside the XR session. Needs HTTPS (Lane D deploy).
- **iOS: "camera view"** (rear-camera `getUserMedia` `<video>` behind a transparent canvas), started by a tap; speech also starts from a tap (iOS gesture rule); `navigator.vibrate` only when supported (Android).
- **12:15 spike (Lane A, 10 minutes):** on the Android phone, does a drei `<Html>` element show inside `immersive-ar`? If yes, the detail card may use it; pins stay 3D regardless.

## 4. The explode sequence (Lane A)

Timings, easings and markers: **design.md section 4 is the source of truth**. This section is the state machine and the hooks.

States: `assembled` -> `exploding` -> `exploded` -> `focus(target)` -> `collapsing` -> `assembled`.
1. **Charge**: edges glow, Android haptic, small camera push-in.
2. **Separate**: floors lift from the roof down with stagger; ground floor stays; camera to 3/4 view.
3. **Data flies out**: pins arc from the centroid to their anchors, severity order (danger first). 
4. **Settle**: one pulse; danger pins keep a slow pulse; bottom sheet shows the top 3.
5. **Dispatch focus**: if the session has a dispatch pin with a floor, the timeline ends in `focus(floor)`: other floors fade to 15 percent and the camera frames that floor (the 0:20 beat in the script).
6. **Drill in**: tap floor -> focus; tap pin -> provenance card (dataset id, record id, as-of date, the rule that placed it). The provenance card is how the depth becomes visible to engineers.
7. **Collapse**: reverse at 1.5x, pins return, floors land with a small overshoot.
8. **Highlight hook**: `highlight({floors, pinIds})` from Lane C answers: emissive on those floors, pulse those pins, dim the rest.

Store API (zustand): `explode()`, `collapse()`, `focus(target)`, `highlight(h)`, `addPin(pin)` (for dispatch, crew and department pins added on the phone). Guardrails: under 40 pins on screen (group per floor beyond that), no shadows on mobile, test on the Android phone by 13:30.

## 5. Contract, lanes and hour-by-hour plan (11:45 to 17:00)

Repo `firesight/`: `web/` (Vite app), `api/` (Hono), `mcp/`, `eval/`, `shared/building.ts`, `web/public/buildings/*.json`. One branch per lane; Lane D merges at each checkpoint. One task of 30 to 90 minutes per coding agent at a time.

### Interface contract, frozen at 12:15 (changes only by board line + Lane D OK)

```ts
// shared/building.ts
export type Severity = "danger" | "caution" | "info";
export type Origin = "public" | "dispatch" | "crew" | "department";
export type Anchor =
  | { kind: "building" }
  | { kind: "floor"; floor: number }        // 1 = ground, 0 = basement (only if a record says basement)
  | { kind: "roof" }
  | { kind: "ground"; bearingDeg: number; distanceM: number };
export interface Evidence {
  source: string;        // "DataSF Building Permits"
  datasetId: string;     // "i98e-djp9"
  recordId: string;      // "201910044012"
  url: string;           // row or query URL that returns this record
  asOf: string;          // ISO date of the record
  rule: string;          // how it was placed: "unit 311 -> floor 3"
}
export interface Pin {
  id: string;            // "<layer>-<recordId>", unique per building
  layer: "construction" | "occupancy" | "permit" | "violation" | "nov" | "softstory" | "incident" | "inspection"
       | "complaint" | "calls" | "water" | "wind" | "dispatch" | "crew_note" | "preplan";
  origin: Origin;
  severity: Severity;
  label: string;         // 3 to 6 words, upper case on chip
  detail: string;        // one plain sentence
  anchor: Anchor;
  claim: "verified" | "unverifiable" | "conflict"; // verified needs >= 1 evidence; conflict needs a Conflict entry
  evidence: Evidence[];  // empty only when claim = "unverifiable" or origin != "public"
  stale: boolean;        // asOf older than 5 years
}
export interface LayerStatus { layer: Pin["layer"]; status: "ok" | "no_records" | "fetch_failed"; asOf?: string; ms?: number }
export interface Conflict {
  id: string;
  field: string;                    // "fire_alarm"
  departmentPinId: string;          // origin "department" or "crew"
  publicPinId: string;              // newest dated public record
  summary: string;                  // "Pre-plan 2019 lists old panel; 2024 permit upgraded alarm"
}
export interface BriefLine {
  id: string;                       // "b1"
  text: string;
  pinIds: string[];                 // all present in building.pins; empty only for an UNVERIFIABLE line
  claim: "verified" | "unverifiable" | "conflict";
  element?: string;                 // pre-plan standard element it fills (ids from research-regs.md)
  status: "pending" | "approved" | "struck";
}
export interface Brief { buildingId: string; lines: BriefLine[]; unknowns: string[]; model: string; createdAt: string }
export interface Answer {
  question: string;
  text: string;
  pinIds: string[];                 // citations
  claim: "verified" | "unverifiable" | "conflict";
  highlight: { floors: number[]; pinIds: string[] };
  unknowns: string[];               // facts asked for with no public record
}
export interface ResolutionLink {
  datasetId: string;                // "i98e-djp9"
  method: "apn" | "eas" | "address_norm" | "address_range" | "spatial";
  key: string;                      // "0874/003", "eas 364715", "1018-1024 MISSION ST", "within 15 m"
  confidence: "exact" | "high" | "medium" | "low"; // rule-based: apn/eas exact, normalized equal high, range medium, spatial low
  records: number;                  // rows matched
  example: string;                  // one raw address string as the source wrote it
}
export interface Resolution { apn: string; easBaseId: string | null; aliases: string[]; links: ResolutionLink[] }
export interface Building {
  id: string;                       // "sf-0874003" (block + lot, no separators)
  apn: string;                      // "0874003"
  address: string;                  // display address "400 Duboce Ave"
  centroid: { lat: number; lon: number };
  footprint: [number, number][];    // largest outer ring, meters, x east, y north, CCW, origin at centroid
  neighbors?: { id: string; footprint: [number, number][]; heightM: number; pins: Pin[] }[]; // exposures, after CP2
  heightM: number;
  floors: number;
  floorHeightM: number;             // heightM / floors
  yearBuilt: number | null;
  constructionType: string | null;  // raw code + source, e.g. "5 (permits)"; null renders UNKNOWN
  units: number | null;
  rooms: number | null;
  pins: Pin[];
  conflicts: Conflict[];
  unknowns: string[];
  layers: LayerStatus[];
  resolution: Resolution;           // how every record joined to this building (resolution view)
  fetchedAt: string;
  fallback?: { brief: Brief; answers: Answer[] }; // precomputed, used when offline or slow
}
```

API: Lane B `GET /api/building/:id` -> `Building` (also served as static JSON). Lane C `POST /api/brief { building: Building }` -> `Brief`; `POST /api/ask { building: Building, question: string }` -> `Answer`; `POST /api/strike { building, line: BriefLine, reason?: string }` -> writes `eval/cases/<id>.json`. The client always sends the **full** building, so dispatch, crew and department pins added on the phone are in the prompt and in the citation check. Conflicts are recomputed by a pure function `detectConflicts(building)` in `shared/` whenever a department or crew pin is added.

### Lanes
- **Lane A (3D/explode):** scene, extrusion, explode timeline per design.md, 3D text pins with claim-label colour, provenance card, dispatch focus, highlight, resolution view (lines from each dataset chip into the one building, labelled by join method), AR mode, camera view, exposures after CP2.
- **Lane B (data fusion):** port `datasf_probe.py` to `api/` (TypeScript) with the join rules in section 2; **resolution logic** (fill `building.resolution` for every dataset: method, key, confidence, records, raw example; confirm the hero's assessor alias); dispatch parser (text to a `dispatch` pin with a floor); permit tagger (regex first: PV/ESS vs alarm or garage-door battery; unit numbers to floors); OSM hydrants pre-fetched; Open-Meteo wind; build the 3 fixtures; per-layer status; `detectConflicts`.
- **Lane C (AI, eval, MCP):** brief and ask with structured output; validator that drops any line whose `pinIds` are missing or not in `building.pins`; three-state claim labels (VERIFIED / UNVERIFIABLE / CONFLICT) on every line and answer; precompute `fallback` for the 3 fixtures; **grounding eval** `npm run eval` that runs the brief plus the 5 canned questions per building and prints the measured counts (briefs, answers, lines, lines per claim label, uncited lines dropped, questions answered UNVERIFIABLE where no record exists); **strike-to-test**: every struck line is saved as a case and the eval asserts that line (or one with the same claim) is not produced again; **live MCP server** (stdio, zod-typed input and output schemas, read-only) with tools `get_building_intel(apn)`, `get_size_up_brief(apn)` and `resolve_address(text)`, serving the 3 cached buildings and returning claim labels and evidence; tested in the MCP inspector, then in Claude Desktop on the demo laptop (config change needs Vidyut's OK); record a fallback clip; **standards slot 14:45 to 15:30**: map brief lines to pre-plan elements from research-regs.md and show each element's claim label.
- **Lane D (UX, phone, demo, business):** phone shell per design.md (bottom bar, address box over the 3 buildings, sheet, dispatch paste box, crew note and department pin inputs, approve/strike UI with claim-label chips, "Send to crew" radio card, eval screen, **resolution view** sheet with Lane A), published-quotes slide from research-voices.md, HTTPS deploy for the phone, merges, business slide, pitch, demo script, rehearsals, submission. Backup video goes to whoever is free after 16:00.

### Schedule

| Time | Lane A | Lane B | Lane C | Lane D | Checkpoint |
|---|---|---|---|---|---|
| 11:45 to 12:15 | Vite + R3F scaffold; extrude a hardcoded polygon into 4 slabs | `shared/building.ts`; hand-built `sf-0874003.json` from the rows in section 3 | Model id; brief prompt + structured output against the fixture | Repo, branches, HTTPS deploy reachable from the Android phone | **12:15 contract frozen**, fixture on main |
| 12:15 to 12:25 | `<Html>` in immersive-ar spike on the phone | | | | spike result on board |
| 12:25 to 13:15 | Explode + collapse on the fixture; 3D text pins | Port loader; footprint ring + projection; permit tagger; real `sf-0874003.json` | Validator + `/brief` + `/ask` with highlight; unit tests for the validator | Shell, dispatch paste box, sheet, Night Watch tokens | |
| 13:15 to 13:30 | | | | Merge, run on the phone | **13:30 CP1: real hero JSON explodes on the Android phone** |
| 13:30 to 14:30 | Dispatch focus, drill-in, provenance card, highlight | `sf-3703081`, `sf-1244030`; resolution links for all 3; dispatch parser; OSM hydrants; wind; layer status; `detectConflicts` | Claim labels; `/strike` writes cases; eval runner v1; MCP server in the inspector | Approve/strike UI, crew and department inputs, Send to crew card, eval screen; business slide draft; quotes slide | |
| 14:30 to 14:45 | | | | Merge, phone run | **14:45 CP2: dispatch -> explode -> focus floor 3 -> brief with claim labels -> ask -> strike, on the phone; MCP answers in the inspector** |
| 14:45 to 15:45 | AR placement and polish; resolution view with Lane D; then exposures if green | Live route hardening off-stage; `893e-xam6` join; exposures data (neighbors within 30 m) | 14:45 to 15:30 standards slot (research-regs.md); then precompute `fallback`; eval across 3 buildings; MCP in Claude Desktop + fallback clip by 15:40 | Pitch, script, Devpost text; dry run 1 at 15:30 | |
| 15:45 to 16:00 | fixes only | fixes only | fixes only | Merge | **16:00 FEATURE FREEZE** |
| 16:00 to 16:40 | phone perf | every evidence URL opens | final eval run; screenshot its output | dry runs 2, 3 and 4 (mic check, typed fallback); backup video (whoever is free) | |
| 16:40 to 17:00 | | | | **Submit by 16:45**; phone charged; hotspot on; fallback path tested in airplane mode | 17:00 due |

Decisions only Vidyut makes: the deploy target and any signup (approval needed); presenter; cuts at CP1 and CP2; whether exposures ship.

## 6. Demo script (3 minutes) and the single most impressive moment

**The moment** (unchanged; the claim labels make it provable): a dispatch line is pasted ("Structure fire, 400 Duboce Ave, smoke from unit 311"). The building appears on the judges' table, explodes, and the third floor stays lit while the rest fades: "Unit 311, 2019 permit: structural work, load-bearing wall partly removed." Then "Where are the people?" lights all four floors with known unit counts, cites the permits, and ends "stair locations: UNVERIFIABLE".

| Time | Say | Do |
|---|---|---|
| 0:00 | User story, one line: "A company officer has 4 minutes in the rig to size up a building they have never been inside." One published quote from research-voices.md, attributed. Then BLUF (section 9, first sentence). | Phone on the table, AR placed beforehand. Mic checked before the slot. |
| 0:15 | "Dispatch just sent this." | Paste the dispatch line. Building explodes; floor 3 focuses. |
| 0:35 | "Every pin is a real San Francisco record, with its date." | Tap the unit 311 pin: provenance card (dataset, record id, date, rule "unit 311 -> floor 3"). |
| 0:50 | "One building, seven city systems that don't agree on its name. The assessor calls this parcel 50 Church St; permits call it 400 Duboce. FireSight resolves them by block and lot, violations by address id, incidents by address within 15 metres, and shows how sure each join is." | Resolution view, 15 s. |
| 1:05 | "Wood frame, 79 apartments, a soft-story ground floor the city lists as retrofitted, a sprinkler malfunction in 2023, a building fire here in 2003." | Pan the exploded model. |
| 1:15 | "Where are the people?" (voice; if the mic fails, type it: the typed box is already open) | Floors 1 to 4 light with unit counts; answer reads aloud, ends "stair locations: UNVERIFIABLE, no public record". |
| 1:30 | "Every line is labelled: verified with a record, unverifiable, or in conflict. The officer verifies the AI." | Generate brief laid out as pre-plan elements (research-regs.md); strike one line; approve the rest; Send to crew. "That struck line is now a test case." |
| 1:50 | "And it is tested." | Eval screen: the measured counts from the last run across 3 buildings (read the real numbers). |
| 2:00 | "Any agent can ask, and it can't change anything." | Live in Claude Desktop: "size-up for 400 Duboce" -> typed, read-only, cited tool response. Fallback: the clip. |
| 2:20 | Business slide (section 7). | (1018 Mission second call is cut from the spoken script; it stays cached for Q&A.) |
| 2:50 | "Size-up starts before the wheels stop." | Collapse animation. |
| after | Q&A backup: open 1018 Mission ("1911 unreinforced masonry SRO hotel, 72 rooms, unsafe facade notice 2025, 36 of 50 incidents were false alarms") and the published-quotes slide. | |

Fallbacks: no network -> fixture `fallback` brief and canned answers (same UI); AR fails -> model mode; Claude Desktop or MCP fails -> clip; everything fails -> backup video. Timing is tight at 3:00: if over in dry run 1, cut the 1:05 recap line first.

## 7. Daylight answer and business slide

**Daylight:** public records (permits, violations, incidents, soft-story, assessor, footprints) are joined with what only the department has at the moment of use: the **dispatch record** (address, reported unit or floor, caller notes), the **crew's notes** (Knox box, dogs, roof access) and the **department's existing pre-plan fields**. The join produces a floor-focused size-up for this call and conflicts between the pre-plan and the newest public record (`detectConflicts`, run on all three buildings). It ends in action: the officer approves or strikes each line, sends the brief to the crew, and accepted conflicts are written back as a pre-plan update; struck lines become test cases.

**Who pays first (decision): pre-plan software vendors.**

| Payer | Speed to first dollar | Fit with what we demo | Risk | Verdict |
|---|---|---|---|---|
| (a) Pre-plan vendors (First Due, Tablet Command, ESO) buying a hazard and compliance data layer over API/MCP | Fast: a B2B contract with a company. They have already sold to departments, so we skip public procurement. | Exact: the API/MCP and resolution logic are the product; firefighters stay the users | Few buyers; they could build it themselves | **Primary** |
| (b) Owners and managers of R-1/R-2 buildings: inspection readiness (H&SC 13146 annual inspections) and open violations | Fast and self-serve; card payment | Same data, different user and screen | It is a second product; the H&SC 13146 details are pending research-regs.md | **Second wedge**, after (a) |
| (c) Commercial property insurers (underwriting) | Slow: enterprise, data-vendor competition | Partial | Long sales cycle | Later |

**Reason:** vendors are the fastest payer that keeps the user we demo. They already hold the department relationship and budget, and resolving messy municipal records into one building, city by city, is work they would rather buy than build. That resolution is exactly what the resolution view shows.
**Bootstrap path to first revenue:** (1) Use the live MCP and API on San Francisco as the sales demo. (2) Sign one vendor as a design partner on a paid pilot, priced per covered address for one metro. (3) Add one city connector at a time, choosing cities where the partner's customers are. (4) Open the owner-facing inspection-readiness report on the same data for card-payment cash flow. No FireSight price on stage.

**Business slide (4 lines):**
1. **Problem, sourced:** NIOSH on the 2021 death of Firefighter Jared Lloyd (Spring Valley, NY) lists "a turned off fire alarm system, lack of sprinklers" and "lack of pre-planning" among contributing factors (VERIFIED, judge.md, firehouse.com).
2. **Coverage, measured today:** SF publishes a LiDAR-height footprint for all 177,023 buildings (finder-dots, research-planet-dots.md), so FireSight can resolve and label a size-up for every one of them. Lane B re-runs the count before freeze, and the slide uses whatever it returns.
3. **Payer and wedge:** pre-plan vendors buy the resolved, labelled building layer by API/MCP, which avoids public procurement. Building owners buy inspection readiness next.
4. **The budget exists (sourced):** a small district's First Due suite quote was $11,340 for one year, and Berkeley's Tablet Command contract runs up to $135,000 (VERIFIED, research-data.md). Departments already pay vendors in this category.

**Published voices slide (Lane D):** 3 or 4 quotes from research-voices.md, each with source, date and link, titled "In their words (published sources)".

## 8. Scope cut list (drop in this order if behind)

Already cut: live any-address lookup on stage, Google tiles, the fire station visit (no one leaves the venue). Live MCP is back in v3 (clip is the fallback).
1. Exposures (neighbors).
1b. Standards element mapping (if research-regs.md is late or Lane C is behind at 15:15; keep the claim labels).
2. 1433 Haight (third building).
3. Camera view on iOS (Android AR and model mode remain).
4. AR mode (model mode on the phone).
5. Voice input (typed questions; keep the voice readout).
6. OSM hydrants, calls for service, inspections layers.
7. Drill-in provenance card for every pin (keep it for the unit 311 pin only).
7b. Live MCP in Claude Desktop (play the clip).
8. **Never cut:** real hero JSON, dispatch-to-floor explode and collapse, brief with VERIFIED / UNVERIFIABLE / CONFLICT labels, approve/strike with strike-to-test, the grounding eval run, the resolution view for the hero, the fixture fallback.

Triggers: CP1 (13:30) hero not exploding on the phone -> cut 1 to 3 now. CP2 (14:45) brief not citing pins or strike not saving -> cut 4 to 7.

## 9. Pitch BLUF

FireSight gives the officer on a responding engine a cited, 3D size-up of the exact building they are driving to, in the 4 minutes before the wheels stop. It joins San Francisco's public building records (construction, units, soft-story status, solar and fire-protection permits, violations, past fires, wind) with the dispatch call and the department's own notes, explodes the building to the floor the call names, and writes a radio-ready pre-plan in which every line is labelled VERIFIED with its record, UNVERIFIABLE, or CONFLICT. The officer approves or strikes each line before it reaches the crew, every struck line becomes a test, and every correction keeps the department's existing pre-plans current. Pre-plan software vendors buy it as a resolved, labelled building layer over API and MCP.

---

## Claims we will make

- C1 | planned | The model is built from the real DataSF footprint and LiDAR height | proof: `sf-0874003.json` footprint and `heightM` match `ynuv-fyni` `mblr=SF0874003`
- C2 | planned | Every public pin has a dataset, record id, date and placement rule | proof: provenance card; evidence URLs open (16:00 check)
- C3 | planned | Every brief line cites at least one pin; uncited lines are dropped | proof: validator unit test + eval output
- C4 | planned | Every line and answer is labelled VERIFIED / UNVERIFIABLE / CONFLICT; missing facts come back UNVERIFIABLE | proof: eval case "where are the stairs?" on all 3 buildings
- C10 | planned | Records from 7+ city datasets resolve to one building, with join method and confidence shown | proof: `building.resolution` in `sf-0874003.json`; resolution view
- C11 | planned | The brief is laid out as named pre-plan standard elements | proof: research-regs.md element list vs brief output (only if the 15:15 slot ships)
- C5 | planned | A dispatch call focuses the named floor | proof: CP2 phone run
- C6 | planned | Struck lines become regression cases | proof: `eval/cases/*.json` after a strike; eval asserts them
- C7 | planned | Runs on an Android phone in AR; model mode elsewhere | proof: CP1 and 15:45 phone runs, screenshots
- C8 | planned | Other agents can read it over MCP with typed, cited, read-only output | proof: live Claude Desktop call; inspector screenshot; clip
- C9 | built (data only) | 177,023 SF footprints have LiDAR height | proof: research-planet-dots.md (finder-dots); Lane B recount before freeze
- Do not claim: "live" city data; any FireSight price; anything First Due cannot do (not checked); "we interviewed firefighters" (the quotes are published sources); compliance with a standard beyond the elements research-regs.md names.

## Attribution on screen
About panel and corner credit: "Building data: DataSF", "© OpenStreetMap contributors" (hydrants), "Weather: Open-Meteo". Planet DOTS is proprietary: inspiration only, no code (research-planet-dots.md).

## Not checked by the planner
- research-regs.md (due about 11:55) and research-voices.md (in progress): standards elements, H&SC 13146 details and quotes are placeholders by reference until they land.
- The second judge analysis (all 8 judges) was relayed by main; the planner did not read its source.
- drei `<Html>` inside `immersive-ar` (12:15 spike).
- Assessor construction type codebook; what the assessor roll says for 400 Duboce (red-team reports it names the parcel "50 CHURCH ST").
- 1018 Mission facts are from research-data.md (finder-data, 11:05 to 11:13), not rerun by the planner.
- The red-team "units 101 to 145 on floor 1": my regex found 101 to 116 (7 distinct units); either way floor 1 is occupied.
- Socrata rate limits without an app token; versions other than three, R3F, XR and Vite; the Claude model id.
