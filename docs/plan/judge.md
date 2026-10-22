# FireSight: judge pass on the plan (super{set}, Track 1)

master-auditor, judge mode on a written plan (nothing built yet). Thu Oct 22 2026, 11:11 to 11:16 PDT.

## Bottom line

- **JUDGE: 19/25 (C0 H2 M3 L1) CONFIDENCE: MEDIUM** (k=1, plan only, no build; directional, not proven). Fails the bar (22+, none below 4) on **C1 = 3** only.
- The build is strong (C3, C4 at 4 with a clear path to 5). The weak spots are the business answer (First Due already sells address-based pre-plans from municipal data) and a Daylight join whose department data is a pre-plan the team writes itself.
- Do first (Lane D, 30 min, no code): rewrite the business slide against First Due with a sourced case and a payer with a price. Then make the dispatch record, not a hand-written pre-plan, the Daylight input.
- Needs Vidyut: approve the cuts in change 2 (live MCP and live any-address off the demo path) and the dispatch-driven demo opening (change 3).
- Panel note: the board (11:12 [main]) says the panel is mostly engineers, not s{s} GPs. That raises the weight of C3 and C4 on the night; it does not remove C1 from the team's own rubric.

## Scores (team rubric, plan/rubric.md, equal weights)

Convention: "named person" = a specific user type (per the brief). C1 5 needs that user, a sourced case or number, and a payer with a price.

| # | Criterion | Score | Evidence and reason |
|---|---|---|---|
| 1 | Real problem, real user | **3** | User type is clear (company officer on a responding engine, plan.md s1 row 1). No sourced case or number in the plan; pricing and coverage are "pending finder" (plan.md s7 lines 1 and 2, "Not checked" list). Payer named, no price. The outcome sold, "every address in the first-due area has a current, cited pre-plan", is First Due's own pitch (see Business below). |
| 2 | Track + s{s} fit | **4** | Squarely Track 1: six DataSF datasets VERIFIED live by the planner (board 11:08) and the hero rows re-verified by me (below). Equalizer (approve or strike each line) and Data Out (send to crew, write back) are both in. Daylight is the weak part: the department pre-plan is "our own demo file, labelled SAMPLE" (plan.md s6, 1:30), written by the team to produce the conflict chip. |
| 3 | Demo moment | **4** | An exploded, real-data building standing on the judges' table is memorable and unlike any globe. Risks: the hero is only 4 slabs; pins are planned as drei `<Html>` chips, which may not show inside a WebXR immersive-ar session (UNRESOLVED, see Risks); the "Where are the people?" beat as scripted contradicts the data (M1). |
| 4 | Technical depth + novelty | **4** | Parcel join across permits, soft-story and complaints (block+lot), footprint by `mblr` or spatial intersects, address match for incidents, permit-text tagging, per-floor anchoring from unit numbers, a citation validator that drops uncited lines, WebXR. Not seen five times. Held at 4 because most of that depth is invisible on stage: a judge sees "explode, chips, chat answer" unless the provenance is shown. |
| 5 | Ship-able by 17:00 | **4** | All data keyless and verified; hero cached to JSON; a scope-cut list with triggers at 13:30 and 14:45 (plan.md s8). Held at 4 for breadth: AR + camera mode + live lookup + MCP + voice + Equalizer + Daylight inputs + brief in 4h15 of build, with Lane D carrying shell, deploy, merges, Equalizer UI, Daylight inputs, pitch, business, video and submission (M3). |
| | Penalties | 0 | No approval-gated data; not a clone (God's Eye View is a city globe with layers, research-data-3d.md line 9). |
| | **Total** | **19/25** | |

## The four questions

**1. Is the Daylight join real or bolted on? Bolted on as planned, real in mechanism.** The `origin` field, the conflict rule and write-back are real design. The data on the other side is a team-authored SAMPLE pre-plan written to disagree with the 2024 alarm permit, so the "conflict" is staged. An engineer will ask "did you write the pre-plan to disagree?" and the honest answer is yes. The fix is to join something the department truly owns at the moment of use and that the plan already names: the **live dispatch record** (call type, reported unit or floor, caller notes). It is synthetic too, but it is synthetic input to a generic system, not a fixture tuned to produce one output. 400 Duboce has a 2019 permit "unit 311 - 3rd flr - remodel kitchen, bath, structural work in kitchen" (VERIFIED, curl 11:12), so a dispatch line "smoke showing, unit 311" drives the explode straight to floor 3 with a real, relevant pin. Keep the pre-plan conflict, but make the rule generic and run it on all three buildings.

**2. Is the demo moment memorable versus God's Eye View-style globes? Yes, if the pins survive AR.** Globes are wide and ambient; this is one building, one decision, physically on the table. That is the right contrast for this room. What would make it forgettable: four grey slabs with tiny chips, or chips that vanish in AR. Make it a block, not a box: adjacent footprints come from the same DataSF footprint query (exposures are a real fireground concern), drawn dim, with their own soft-story or PV pins.

**3. Is the business answer credible versus First Due, ESO and Tablet Command? Not as written.**
- First Due pre-incident planning: "begin creating world-class pre-plans by simply entering a property address" and "View external occupancy information from municipal data sources or other connected data sets", plus Esri GIS, EagleView imagery and Community Connect (residents submit their own life-safety data). VERIFIED (WebFetch firstdue.com/learnmore/preincidentplanning, by 11:12 PDT). The same page does not mention 3D, solar or PV, or automatic hazard detection (VERIFIED, same fetch). A search snippet attributes "automatic size-ups on 100% of the buildings" to a First Due page; the page I fetched does not say it (UNRESOLVED which page).
- Tablet Command: pre-plans as PDFs or images on an Esri feature service, or "integrated with third-party solutions like First Due and Intterra"; Capterra lists "starting at $30, flat rate, per month" (REPORTED, search snippets of tabletcommand.com/pre-plan and capterra.com, about 11:12).
- ESO: NOT CHECKED (no budget left in the window).
- So "departments buy it to have a current pre-plan for every address" sells against the incumbent's core product. The credible answer: **FireSight does not hold the pre-plan; it keeps it current.** A nightly hazard-drift feed from permits, violations and soft-story status (new PV, battery, alarm work, open exit violations, change of use) pushed into the First Due, Tablet Command or Esri layer the department already runs, plus the 3D floor view as the en-route surface. Buyer: the fire prevention or pre-planning officer. Second channel: sell the feed to the vendors themselves.
- Sourced case for C1 (VERIFIED, firehouse.com NIOSH article, fetched by 11:12): Firefighter Jared Lloyd, Spring Valley NY, 2021, Evergreen Court senior living facility; NIOSH contributing factors include "a turned off fire alarm system, lack of sprinklers" and "lack of pre-planning and lack of crew integrity"; recommendation "Develop a pre-incident plan for high-risk occupancies". Alarm status, sprinklers and occupancy are exactly the layers FireSight pins.

**4. Is 11:45 to 17:00 realistic for 4 people with coding agents? Yes for the core, no for everything.** The never-cut list (real hero JSON, explode and collapse, cited brief with "unknown", approve or strike, one department conflict) is about 2.5 lane-hours each for A, B and C and fits by CP2 at 14:45. AR, live any-address lookup, MCP and voice together do not also fit with rehearsal. Socrata latency matters for live lookup: the hero permit query took 6.3 s (curl 11:12), so live lookup on venue Wi-Fi needs a timeout and the cached path.

## Top 5 changes, ordered by points per build hour

| # | Change | Criterion moved | Hours | New estimate |
|---|---|---|---|---|
| 1 | Business slide rewrite (Lane D, no code): user = SFFD-style company officer and pre-plan officer; case = NIOSH Spring Valley 2021 (quote above); position = "keeps First Due pre-plans current", hazard-drift feed into First Due / Tablet Command / Esri; payer = department pre-planning budget, price stated as a labelled proposal, anchored to a sourced comparable if finder gets one (Tablet Command "from $30/month" is REPORTED only). Never claim First Due cannot do something unless checked. | C1 3 to 4 (5 with a sourced price anchor) | 0.5 | 20 to 21 |
| 2 | Cut now, not at a checkpoint: live MCP becomes a 20 s clip recorded at 15:00; live any-address lookup off the demo path (cached 3 buildings plus a pre-fetched venue JSON). Move that time to two extra dry runs. | C5 4 to 5 | 0 (saves about 1.5) | 21 to 22 |
| 3 | Dispatch-driven Daylight: open the demo with a pasted CAD-style call ("Structure fire, 400 Duboce Ave, smoke from unit 311") so the explode focuses floor 3 and the 2019 "unit 311 - 3rd flr ... structural work" pin lands first; make the pre-plan conflict a generic rule (department field vs newest dated public record) run on all three buildings; show the write-back as a diff. | C2 4 to 5, C3 4 to 5 | 1.5 (Lane C + D) | 23 to 24 |
| 4 | AR-safe pins: render chips as drei `<Text>` in a `<Billboard>` (3D meshes), not `<Html>`; run a 10 minute spike on the team's Android phone at 12:15 to settle whether DOM chips show in immersive-ar. Keep one "provenance" card per pin (dataset id, record id, rule that placed it) so the depth is visible. | protects C3; C4 4 to 5 | 0.75 (Lane A) | 24 (and avoids C3 falling to 3) |
| 5 | Exposures: draw neighbouring footprints from the same DataSF query within 30 m, dim, each with its own soft-story or PV pin; fixes the "lone grey box" look of a 4-slab hero. | C3 (locks 5), C4 | 1 (Lane B + A) | 24 |

Realistic landing if 1 to 4 ship: **23/25**, all criteria at 4 or above. 25 needs a sourced price and a flawless AR run.

## Findings (A4 severities)

- **H1** Business positioning collides with First Due's core product (evidence in Q3). Judge sees it whenever someone in the room knows fire software. Refutation tried: First Due's page shows no 3D, no PV or automatic hazard detection, so differentiation exists, but the plan never names the incumbent. Kept.
- **H2** Daylight data is a team-authored SAMPLE pre-plan written to produce the one conflict (plan.md s6 at 1:30, s7). Refutation tried: the plan labels it SAMPLE (honest), and crew notes are typed live; still, the only department-side "insight" is staged. Kept, scoped to C2.
- **M1** Script says "floors 2 to 4 light up" for "Where are the people?" (plan.md s6). Permits list units 101, 104, 109, 110, 113, 115, 116, 118 (VERIFIED, curl 11:12), so floor 1 has residents too. Script or answer is wrong; fix the script to "all four floors, about 20 units each, stair locations unknown".
- **M2** Permit fields are noisy for the same parcel: stories 3, 4 and 5; units 12, 29 and 79; construction type 1 once among type 5; "unit# 50" (VERIFIED, 40 rows, curl 11:12). Lane B must take the mode across permits and only map 3-digit unit numbers to floors, or a pin lands on a floor 5 that does not exist.
- **M3** Lane D is overloaded (nine jobs, plan.md s5 Lanes). Move "Daylight inputs" to Lane C and the backup video to whoever is free after 16:00.
- **L1** "SOLAR THERMAL, 36 modules" is not an electrical hazard; the same 2019 permit names "(1) 3000 gallon tank for solar plum[bing]" (VERIFIED). Relabel to the tank with "location not stated"; do not claim roof load without the location.
- **UNRESOLVED** drei `<Html>` chips inside an `immersive-ar` session on Android Chrome: they are DOM elements, and the plan assumes "explode works in AR unchanged" (plan.md s3). Not tested here; the 12:15 phone spike in change 4 settles it.

Hero facts re-verified (curl 11:12 PDT, data.sf.gov): 400 Duboce permits 200 (40 rows; latest 79 units, 4 stories, type 5; 2024 NFPA 72 alarm upgrade; 2016 soft-story retrofit permit; 2019 solar thermal); footprint `SF0874003` `hgt_median_m` 13.8 (about 4 floors at 3.2 m); soft-story list tier 2 "Work Complete, CFC Issued", data_as_of 2026-10-07.

Hero path runs: 0/3, not applicable (nothing built). Expo simulation and claims audit wait for a build; rerun this judge at about 16:15 on the frozen main.

GOAL: firesight-judge met (scores, 4 questions, top 5 changes, file and board line) · due 11:35 · finished 11:16
COST: 5/5 searches and fetches (3 searches, 2 fetches) · 8 files read · 6 commands · 0 sub-agents

```
CHECKED_AT: Thu Oct 22 2026 11:11 to 11:16 PDT
SUBJECT: plan/firesight/plan.md as of 11:11 (planner DONE line), board.md through 11:12 [main]
CHECKED: plan/rubric.md, plan/submission.md, plan/research-superset.md, plan/firesight/plan.md, board.md, research-planet-dots.md (headings), research-numbers.md and research-data-3d.md (grep); DataSF i98e-djp9, ynuv-fyni, beah-shgi for 0874/003 (curl); firstdue.com/learnmore/preincidentplanning (WebFetch); firehouse.com NIOSH Spring Valley article (WebFetch); 3 web searches (First Due, Tablet Command, NIOSH)
NOT CHECKED: ESO product and pricing; First Due pricing; research-data.md and research-judges.md (not present at 11:12); 1433 Haight PV permit (planner VERIFIED at 11:10, not rerun); Android WebXR behaviour
UNRESOLVED: drei Html in immersive-ar (10 min phone spike); which First Due page claims "100% of buildings" (fetch the snippet's source); Tablet Command $30/month (open the Capterra page in a browser)
```
