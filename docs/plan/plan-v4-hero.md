# FireSight plan v4: hero switch to 140 New Montgomery St

By master-planner, 13:01 to 13:05 PDT Thu Oct 22 2026. Supersedes plan.md v3 sections 3 (hero), 6 (demo script) and the hero-specific parts of 8 (cut list). Everything else in v3 stands.
Decision (Vidyut, 13:00): hero = **140 New Montgomery St**, parcel 3722/080, 26 floors above grade + 1 below, LiDAR median height 114.78 m, built 1925, Type I fire resistive. Starting file: Devaj's hand-made `web/public/buildings/sf-3722080.json` on `origin/claude/explode-branch-next-steps-b54010` (9 pins, no layers, no resolution links, no conflicts).

## 0. Spot-checks run live at 13:02 to 13:04 PDT (data.sf.gov)

| # | Fact | Status | Query |
|---|---|---|---|
| S1 | Tall Building Inventory: "Pac Bell Building", 140 New Montgomery Street, 26 stories above grade, **1 below**, built 1925, Type I fire resistive, steel moment frame, office occupancy, **percent_sprinklered 90**, **height_ft 413**, 347,854 sq ft, typical story 13 ft, first story 19 ft, collected 2018-01-18 | VERIFIED | `https://data.sf.gov/resource/5kya-mfst.json?mapblocklot=3722080` |
| S2 | LiDAR footprint SF3722080: median height 11478 cm (114.78 m = 377 ft, matches Devaj's file), **max 13761 cm (137.6 m)** | VERIFIED | `https://data.sf.gov/resource/ynuv-fyni.json?$where=mblr='SF3722080'` |
| S3 | Fire permit 76784: "battery system, storage, use", approved 2017-05-15, holder listed, conditions "floor 22 computer room 33.6 gallons. floor 23 computer room 33.6 gallons. total of 67.2 gallons". **No kWh, no chemistry.** | VERIFIED | `https://data.sf.gov/resource/893e-xam6.json?permit_number=76784` |
| S4 | Fire permit 74045: above-ground stationary tank, 2016-11-02, "basement level b1 - fire pump room/generator room, 2 (two) 300 gallon diesel day tanks" | VERIFIED | `https://data.sf.gov/resource/893e-xam6.json?permit_number=74045` |
| S5 | Fire permit 142618: place of assembly, restaurant, max 325, "main floor 257, second floor 68", 2026-09-28, status **pending inspection** | VERIFIED | `https://data.sf.gov/resource/893e-xam6.json?permit_number=142618` |
| S6 | Inspections at "140 New Montgomery St": **High Rise Annual Inspection, 2025-12-04, Completed** (322 days before today; due again by 2026-12-04, 43 days out). Also a DBI Inspection 2026-01-08 "Open/Follow-Up Needed" and a Permit Approval Inspection 2026-10-21 Pending. Records carry an address, no point, so the join is by address text. | VERIFIED | `https://data.sf.gov/resource/wb4c-6hwj.json?$where=upper(address) like '14% NEW MONTGOMERY%'&$order=inspection_start_date DESC` |
| S7 | Fire violations, eas_id 476469-709915-544154: **41 items, 40 abated + 1 closed, 0 open**; newest 2021-12-30 (closed 2022-01-04). Items include "sprinkler / obstructions" (2018), "firefighter air system records and testing" (2018), "alarm system maintained" (2019). No rows at 138. | VERIFIED | `https://data.sf.gov/resource/4zuq-2cbe.json?$where=eas_street='NEW MONTGOMERY ST' AND eas_street_no in('138','140')` |
| S8 | 20 fire permits at this address since 2013 (assembly, LPG cylinders, open flame, tanks, battery) | VERIFIED | `https://data.sf.gov/resource/893e-xam6.json?$where=upper(permit_address) like '1__ NEW MONTGOMERY%'` |
| U1 | The 3 elevator rescues and the 2014 building fire (wr8u-xric), the 2022 floor 18 server room permit (i98e-djp9 202207279412), the "138 NEW MONTGOMERY" alias | UNVERIFIED by the planner (from Devaj's file; Lane B re-pulls them) | |

**New finding that fixes the hero's biggest gap:** the city disagrees with itself about the height. LiDAR median 377 ft vs Tall Building Inventory 413 ft (36 ft, about 3 stories at 13 ft). That is a real CONFLICT on the hero (S1 + S2). It does not change C7 (both are far over 75 ft).

## 1. Demo script, 3:00

Dispatch line: **"Structure fire, 140 New Montgomery St, smoke reported 22nd floor."** Why 22: it is the one floor with a danger pin (battery storage, 33.6 gal), floor 23 directly above has the same, and floor 18 below has a server room with heavy equipment, so the focus shows a vertical hazard stack a captain cares about (fire spreads up; crews stage two floors below). It is also high enough that "how do we get water up there" (standpipes UNVERIFIABLE, fire pump in B1 VERIFIED) is the obvious next question.

Rubric column: the event published no rubric (submission.md, partial). Labels follow v3: the Track 1 line "show how public data powers it", plus the judge themes (testing, regulated output, business).

| Time | Say | Show | Criterion |
|---|---|---|---|
| 0:00 | User story: "A company officer has 4 minutes in the rig to size up a building they have never been inside." Then the BLUF sentence (v3 section 9). | Phone, model mode on screen, mic checked. | Impact |
| 0:12 | "Dispatch just sent this. Smoke on the 22nd floor of a 26-story tower." | Paste the dispatch line. 26 floors + B1 explode; floor 22 focuses; 23 and 18 stay half-lit. | Design, technical |
| 0:27 | "Every pin is a real San Francisco record, with its date. This one says battery storage in a computer room on 22, 33.6 gallons. It is from 2017, so FireSight marks it stale. The officer decides if it still matters." | Tap the floor 22 pin: provenance card (SFFD Fire Permits 893e-xam6, permit 76784, 2017-05-15, rule "floor 22 computer room -> floor 22", STALE badge). | Public data |
| 0:42 | "Five city systems file this building under three different keys: parcel number, address id and street address. The tall-building list calls it the Pac Bell Building. FireSight joins them and shows how sure each join is. And when the city disagrees with itself, it says so: LiDAR says 377 feet, the tall-building inventory says 413. CONFLICT. We show both." | Resolution view (dataset, key, confidence), then the height CONFLICT card. | Public data, AI trust |
| 0:57 | "Where are the people?" (voice; typed box already open as fallback) | Floors 1 and 2 light: 257 and 68 from the restaurant assembly permit (Sept 28 2026, pending inspection). Floors 3 to 26: "office headcount: UNVERIFIABLE, no public record". Ends "stairs: UNVERIFIABLE". | AI trust, impact |
| 1:12 | "It checks the building against the rules that apply to a high-rise office, and skips the ones that don't." | Compliance strip: C7 high-rise annual inspection PASS (Dec 4 2025, due by Dec 4 2026); C3 open fire code violations PASS (41 on file, 0 open); C5 energy storage UNKNOWN (record gives gallons, not kWh; CFC 1207 may apply); C8 pre-plan coverage n of 21; C1 R-2 annual N/A (office). Tap one citation chip. | Regulated output |
| 1:27 | "What we don't know is on screen too: standpipes, stairs, which 10 percent is unsprinklered, roof access. Refreshed from data.sf.gov every 30 minutes; each source is as fresh as the city publishes it." | Limits panel, then sources drawer with each source's as-of date (Tall Building Inventory 2018 flagged), last refresh time and refresh log. | Public data, limits |
| 1:42 | "Every line is labelled verified, unverifiable or conflict. The officer verifies the AI." | Brief as pre-plan elements; strike one line (the 2014 building fire, "not tactical"); approve the rest; Send to crew. "That struck line is now a test case." | AI trust |
| 1:57 | "And it is tested." | Eval screen: measured numbers from the run that includes 140 New Montgomery (read the real numbers aloud). | Testing |
| 2:07 | "Any agent can ask, and it can't change anything." | Claude Desktop: "size-up for 140 New Montgomery" -> typed, read-only, cited response. Fallback: the clip. | Technical |
| 2:22 | Business slide (v3 section 7; coverage line uses Lane B's recount). | Slide. | Business |
| 2:50 | "Size-up starts before the wheels stop." | Collapse animation. | Close |

Never say "live" or "real-time". Do not speak tenant or permit-holder names on stage or in the video (the card may show the public record).

**400 Duboce as a 15-second second call: recommend NO (option A).** The hero now has its own CONFLICT (height, S1 vs S2) and its own identity story (parcel vs address id vs street address, plus the "Pac Bell Building" name), so the beat lands without a context switch, and the 15 seconds go to the compliance strip, which is where 140 New Montgomery is strongest. Keep 400 Duboce cached for Q&A ("show me a residential building": 50 Church St vs 400 Duboce, 78 vs 79 units) and in the eval set.
**Fallback B (trigger: the height CONFLICT is not in the pipeline JSON by CP2, 14:45):** at 0:42 replace the height sentence with a 15-second second call on 400 Duboce (50 Church St vs 400 Duboce, 78 vs 79 units CONFLICT), and trim the business slide to 20 seconds.

## 2. Lane changes, 13:10 to 14:40

**Lane A, Devaj (3D, pins, now also the Vercel deploy)**
1. By 13:30 CP1: load the hand-made `sf-3722080.json` as is and explode 26 floors + B1 on the Android phone. Scale the explode gap so the whole tower fits portrait; camera fits the exploded bounding box. Confirm with Lane B that floor 0 means B1 (below grade) in the contract, not ground; render it below grade.
2. `focus(22)`: other floors fade to 15 percent, floors 23 and 18 stay at about 40 percent so the hazard stack reads.
3. Pin grouping: building-level pins (90% sprinklered, elevator rescues, 2014 fire, height CONFLICT) collapse into one roof cluster with a count, expand on tap. One record on several floors (76784 on 22 and 23) shows "x2" on the cluster. At most one label per floor visible when exploded.
4. Vercel production deploy, HTTPS, reachable from the Android phone by 13:50; post the URL on the board. Rohan is backup. No secrets in the client bundle.
5. Only if 10 minutes spare: slab heights from S1 (first floor 19 ft, typical 13 ft) instead of a uniform 4.415 m; the rest of the height becomes a roof cap.

**Lane B, Rishit (rebuild through the pipeline)**
1. Add 140 New Montgomery to the pipeline: parcel 3722080, eas_id 476469-709915-544154, address keys "140 NEW MONTGOMERY ST" and "138 NEW MONTGOMERY". Add a `5kya-mfst` fetcher if it is missing. Test: every evidence `recordId` in Devaj's hand file appears in the pipeline output. Target 14:00, PR to main.
2. Layers with status: 893e fire permits (20 rows), i98e building permits, wb4c inspections (address join; must include the High Rise Annual Inspection 2025-12-04), 4zuq violations (41, 0 open), wr8u incidents, ynuv LiDAR, 5kya Tall Building Inventory. Add a FARS note pin from the 2018 violation item as VERIFIED "violation cited firefighter air system records", not "has a FARS".
3. `resolution.links`: one per dataset with join key (parcel, eas_id, address text, distance) and confidence; aliases include "PAC BELL BUILDING" from 5kya.
4. `conflicts`: height, LiDAR median 114.78 m vs Tall Building Inventory 413 ft (125.9 m); rule: differ by more than one typical story (3.96 m). Both evidence entries; LiDAR max 137.6 m in the detail.
5. Add `sf-3722080` to `refresh.py`'s building list and run one refresh before CP2 so the sources drawer and log show a real run. Stale flag on 5kya (2018) and permit 76784 (2017).

**Lane C, Vidyut (compliance, canned answers, eval, MCP)**
1. C7 high-rise annual inspection: trigger LiDAR height over 75 ft; latest wb4c "High Rise Annual Inspection" Completed within 365 days. Expected: PASS, 2025-12-04, 322 days, due by 2026-12-04. Citation chip says "SFFD program; 75 ft height rule REPORTED" (CBC 202 not checked).
2. C5 energy storage: trigger on 76784 "battery system, storage, use". No kWh in the record, so UNKNOWN: "CFC 1207 may apply; record lists 67.2 gal of electrolyte, not kWh; chemistry not stated". Never FAIL.
3. Strip rows for this building, in order: C7 PASS, C3 PASS, C5 UNKNOWN, C8 coverage, C1 N/A (office occupancy per 5kya). C2, C4, C6 hidden when not triggered.
4. Precompute the 5 canned answers in section 3 offline against Lane B's JSON (hand file until it lands), every line citing pin ids, validator green; commit as the fallback set.
5. Eval set = 140 New Montgomery, 400 Duboce, 1018 Mission; rerun after Lane B's JSON lands and quote only those numbers. MCP: "size-up for 140 New Montgomery" returns the cited read-only brief; record the fallback clip right after the first good run.

**Lane D, Rohan (shell, dispatch, provenance, resolution view, pitch)**
1. Dispatch parser: the section 1 line -> `sf-3722080`, floor 22; also accept "floor 22", "22nd floor", "fl 22", "138 New Montgomery". Grep the shell for hardcoded "Duboce", "0874003" and "unit 311" and remove them.
2. Resolution view for 140 New Montgomery: dataset, join key, confidence per link; the height CONFLICT card; "Pac Bell Building" alias.
3. Provenance card with STALE badge (asOf older than the stale rule) for the floor 22 pin; limits panel lists the 4 unknowns; sources drawer shows each source's as-of, last refresh and "Refreshed from data.sf.gov every 30 minutes".
4. Pitch and video script rewritten to section 1; business slide unchanged except Lane B's coverage recount; no tenant names.
5. Timed dry run 1 at CP2 (14:45) on the phone over the Vercel URL; backup owner of the deploy.

## 3. Five canned questions (precomputed offline) and the honest answer shape

1. **"Where are the people?"** Floors 1 and 2: 257 and 68, max 325, restaurant assembly permit 142618 dated 2026-09-28, status pending inspection (VERIFIED). Floors 3 to 26: office, no public headcount (UNVERIFIABLE). Stairs: UNVERIFIABLE. Lights floors 1 and 2 only.
2. **"What hazards are on or near floor 22?"** Floors 22 and 23: battery storage in computer rooms, 33.6 gal each, permit 76784 from 2017, STALE (VERIFIED record; current presence UNVERIFIABLE). Floor 18: server room with heavy MEP equipment, 2022 permit (VERIFIED once Lane B re-pulls). Battery chemistry and kWh: UNVERIFIABLE.
3. **"Is it sprinklered?"** 90 percent per the Tall Building Inventory, collected 2018 (VERIFIED, STALE). Which 10 percent: UNVERIFIABLE. A 2018 "sprinkler / obstructions" violation was abated in 2019 (VERIFIED). Fire pump in B1 (permit 74045, VERIFIED).
4. **"Where are the stairs and standpipes?"** (the eval's all-UNVERIFIABLE case) Stairs, standpipes and FDC location: UNVERIFIABLE, no public record. What is known: fire pump room in B1 with two 300 gal diesel day tanks (VERIFIED); a 2018 violation cited firefighter air system records (VERIFIED; whether one is in service today UNVERIFIABLE).
5. **"How tall is it, and is its high-rise inspection current?"** Height: CONFLICT, 377 ft (LiDAR median) vs 413 ft (Tall Building Inventory 2018); 26 stories above grade, 1 below (VERIFIED). High-rise annual inspection completed 2025-12-04, due by 2026-12-04 (VERIFIED, C7 PASS). Also: 3 stalled-elevator rescues on record (2016, 2017, 2023); elevator recall status UNVERIFIABLE.

## 4. Risks of the switch

| Risk | Mitigation |
|---|---|
| Hand-made JSON lacks layers, resolution, conflicts, so the 0:42 beat is empty | Lane B rebuild by 14:00 with Devaj's record ids as the test oracle; Fallback B at CP2 |
| Floor numbering: Devaj used floor 0 for B1; if the renderer treats 0 as ground, the fire pump shows on the street floor | Lane A and B agree in a board line by 13:30 |
| Stale records (battery 2017, sprinkler 2018) invite "is that still true?" | The STALE badge answers it on screen; say "the officer decides" |
| Eval, canned answers, MCP, refresh and dispatch keyed to 400 Duboce strings | Lane D grep; Lane C reruns eval; quote only the new run |
| Height CONFLICT may have a boring cause (LiDAR median vs crown) | Phrase as "two city sources differ", never "the city is wrong" |
| C3 wording vs the DBI "Open/Follow-Up Needed" inspection (2026-01-08) | Say "no open fire code violations" exactly; it is a different dataset |
| Devaj overloaded (26-floor 3D + deploy) | Deploy after CP1; Rohan is backup |
| Naming a real tenant's computer and battery rooms on stage | No tenant names in pitch or video |

## 5. Cut order if a checkpoint slips

**CP1 (13:30): 26-floor hero not exploding on the phone.**
1. Ship the hand-made JSON as is; the pipeline rebuild continues behind it.
2. Cut AR (model mode on the phone), exposures, 1433 Haight, iOS camera (v3 items 1 to 4).
3. If 26 slabs are slow or unreadable: explode in bands (focus floor plus or minus 2 open, the rest compressed).
4. **Vidyut decides by 13:45:** if 140 New Montgomery still does not explode, revert the hero to 400 Duboce (its pipeline JSON and script exist).

**CP2 (14:45): full path not working.**
1. Use Fallback B (400 Duboce second call) if the height CONFLICT is missing.
2. Cut voice input, OSM hydrants and calls for service, provenance for every pin (keep the floor 22 pin), the refresh change feed (keep "last refreshed" and per-source as-of).
3. Cut the standards element mapping and the C5 row (keep C7, C3, C1 N/A, C8).
4. Live MCP -> clip.
**Never cut:** real hero JSON, dispatch-to-floor explode and collapse, labelled brief, approve/strike with strike-to-test, the eval run, the hero resolution view, the fixture fallback.

## Decisions only Vidyut makes
- Fallback B on or off at CP2 (14:45).
- Revert the hero to 400 Duboce if CP1 fails (by 13:45).
- Whether the "Pac Bell Building" name is spoken (recommend yes: it is a public record and makes the identity point instantly).

## Claims we will make (delta to v3)
- C1 | planned | The 140 New Montgomery model is built from the DataSF footprint and LiDAR height | proof: `sf-3722080.json` heightM 114.78 matches `ynuv-fyni` mblr=SF3722080 (S2)
- C5 | planned | "Smoke on the 22nd floor" focuses floor 22 | proof: CP2 phone run
- C10 | planned | Records from 5+ city datasets resolve to one building with join key and confidence | proof: `resolution.links` in Lane B's `sf-3722080.json`
- C12 | planned | Where city sources disagree, FireSight shows both as CONFLICT (height 377 vs 413 ft) | proof: `conflicts` in Lane B's JSON; S1 + S2
- C13 | planned | The compliance strip applies high-rise rules and skips R-2 rules for an office tower (C7 PASS, C3 PASS, C5 UNKNOWN, C1 N/A) | proof: `evaluateCompliance` unit test on `sf-3722080.json`
- Do not claim: "live"; that the batteries or tenants are there today; that the building has a working firefighter air system; any office headcount.

## Not checked by the planner
- U1 rows (incidents, i98e permit, 138 alias); the repo's current `shared/building.ts` floor semantics; whether `5kya-mfst` already has a fetcher in Lane B's pipeline; CBC 202 high-rise definition; phone performance with 26 slabs.
