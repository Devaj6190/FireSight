# FireSight: regulations and standards it can provably meet

Owner: finder-regs for Vidyut. Written 2026-10-22 11:31 to 11:50 PDT. Goal: put named regulations on screen with live PASS / FAIL / UNKNOWN and a citation on every line.

## Plain answer (read this first)

1. **Strongest on-screen hook: California H&SC 13146.2 / 13146.3 annual inspections.** The statute text is VERIFIED via the california.public.law mirror (leginfo.legislature.ca.gov blocks automated clients). SFFD publishes the inspections live (`wb4c-6hwj`, updated today) with a type literally named "R2 Company Inspection" (83,606 rows) and "School Annual Inspection" (5,794 rows). For 400 Duboce Ave the last R2 inspection is **2026-08-04, Completed**: a real, live **PASS, 79 days ago, H&SC 13146.2**. 1018 Mission St: **2026-10-08, Completed**.
2. **NFPA pre-incident planning elements are machine-checkable.** NFPA 1660 (2024) carries the old NFPA 1620 content (REPORTED). The 1620 (2020) element list is VERIFIED from NFPA's own committee report: construction, utilities and shutoffs, site, security features, barriers, sprinklers (riser), standpipes (PRVs), fire pumps, FDC (location, size, type, locking), non-water systems, fire alarm (FACU location), special hazards, buildings under construction, on-site representative. FireSight fills 7 of 21 elements from SF public data, partly fills 9, cannot fill 5 (table in section 1). Show "7 filled, 9 partial, 5 need the officer, of 21".
3. **ISO/Verisk gives explicit credit: FSRS Item 580H "Pre-Fire Planning Inspections", 12 of 100 training points = 1.08 of 105.5 PPC points.** VERIFIED in SF's own 2020 PPC report: SF is **PPC 01/1X** and earned **12.00 of 12** on pre-fire planning. So in SF the wedge is "keep the Class 1 credit with less labor and with the records ISO audits (notes and sketches)", not "improve the class". In departments below full credit it is a real but small lever (about 1 percent of the schedule).
4. **NFPA 170 has a whole chapter for pre-incident planning sketch symbols** (Chapter 7, VERIFIED from the 2009 table of contents). No open SVG set found. Draw our own glyphs and label them "modeled on NFPA 170 Ch. 7 categories", never "NFPA 170 certified".
5. **Decision for Vidyut:** say "meets" only for the inspection-mandate check and the 1205 trigger logic; say "maps to" for NFPA 1660 elements (paywalled; we have the 1620 text, not 1660).

## 1. NFPA 1660 (2024) pre-incident planning elements

**What is known.** NFPA 1660-2024 combined NFPA 1600, 1616 and 1620 (REPORTED: emergent.tech/blog/nfpa-1660, tier 3 vendor, fetched 11:26; ANSI webstore listing title in search results). The vendor says the pre-incident planning part "remains rooted in the content of NFPA 1620" and calls it Chapter 5; chapter number in 1660 is **UNRESOLVED** (NFPA's own 1660 page returned only a heading; the Jan 13 2026 1660 first draft minutes, fetched 11:27, name Chapters 4, 10, 11, 16 and Sections 5.4, 12.7 for consolidation work but do not title them). A 2027 revision cycle is under way (same minutes: first draft meeting Jan 13 2026, next meeting expected Aug 2026). VERIFIED from the minutes PDF.

**Element text, VERIFIED from NFPA primary** (NFPA 1620 F2019 Second Revision report, docinfofiles.nfpa.org/files/AboutTheCodes/1620/1620_F2019_PIP_AAA_SRReport.pdf, HTTP 200, fetched 11:27). This is the 1620-2020 text that 1660 absorbed (the carry-over itself is REPORTED). Quotes:
- 5.1: "Physical elements and site considerations shall be classified into the following five groups: Construction (5.2), Building management systems and utilities (5.3), External site conditions (5.4), Internal and external security features (5.5), Fences or other barriers (5.6)."
- 5.3.2.6: location of compressors, storage containers, tanks, pressure vessels "and the nearest shutoff means ... shall be recorded in the pre-incident plan." 5.3.2.7 steam lines, boilers, shutoff valves. 5.3.2.8 fuels: fuel changeover systems; "location of all fuel pumps, tanks, regulating equipment, and shutoff valves."
- 7.3.1: sprinklers "including type of system, location and identification of main riser valves, extent of coverage, and means of manual activation."
- 7.3.2: standpipes "type of system, location and identification of control valves, location of hose valves, and presence of pressure reducing devices (PRV)."
- 7.3.3: fire pumps: location and access, "rated capacity; source of water supply; and areas or systems served."
- 7.3.4: FDC "physical location, size, type, locking means, and area/systems supplied."
- 7.4: non-water systems: type, hazard protected, activation, abort devices, control panel, agent supply, "personnel hazards following agent release."
- 7.5: fire alarm: "area of coverage, location of fire alarm control unit (FACU) and remote annunciator panels, method of system activation, and method and extent of occupant notification."
- 8.2.9: combustible dust operations; 8.4: buildings under construction ("Once the building is completed and occupied, the pre-incident plan shall be updated").
- 9.3.4 / 9.3.5 and 10.3.2: on-site emergency representative and site liaison "by name or job title" with contact information.

**REPORTED only (secondary):** the chapter headings "Occupant Considerations" (Ch 6), "Protection Systems and Water Supplies" (Ch 7), "Special Hazards" (Ch 8), "Emergency Operations Considerations" (Ch 9) and plan testing and maintenance (search summary of fireengineering.com and flashcard decks, tier 3 to 4). The exact water-supply clause text is UNRESOLVED.

**Format guidance:** the vendor page says 1660 "doesn't mandate software"; NFPA 170 Chapter 7 is the symbol set for "Pre-Incident Planning Sketches" (section 2). ISO's FSRS asks that records "include complete and up-to-date notes and sketches, which must be available to the responding incident commander" (VERIFIED, FSRS text, section 3). That sentence is the format bar FireSight should claim.

### Checklist: element | FireSight fills from SF public data? | source

FILL = filled from a cited dataset; PARTIAL = presence or year known, location or detail not; UNKNOWN = not in public data (officer must add on approval).

| # | Element (NFPA 1620-2020 clause; 1660 carry-over REPORTED) | FireSight | Dataset (all DataSF are PDDL unless noted) |
|---|---|---|---|
| 1 | Construction type (5.2) | FILL | Assessor `wv5m-vpq2` construction type; permits `i98e-djp9` |
| 2 | Height, stories, footprint area (5.2) | FILL | Assessor stories; footprints `ynuv-fyni` LiDAR `hgt_median_m` and polygon |
| 3 | Occupancy / use (Ch 6, REPORTED) | FILL | Assessor `use_definition`; permits occupancy |
| 4 | Occupant load, units, rooms (Ch 6) | PARTIAL | Assessor units and rooms; no night population or mobility data |
| 5 | Year built, retrofit status | FILL | Assessor year built; soft-story `beah-shgi`; URM permits keyword |
| 6 | Utilities: electric, gas, steam shutoff locations (5.3) | UNKNOWN | Not public (PG&E lines not public, per research-data.md) |
| 7 | Building management systems, elevators (5.3) | PARTIAL | Permit descriptions |
| 8 | External site: streets, access, exposures (5.4) | FILL | Streets `3psu-pn9h`; neighbor footprints for exposures |
| 9 | Security features, key box (5.5) | PARTIAL | `wb4c-6hwj` "Lockbox Installation" (1,532 rows) and violation "keys provided per fire marshal" (216) prove presence, not mount location |
| 10 | Fences, barriers (5.6) | UNKNOWN | none |
| 11 | Sprinkler system and riser (7.3.1) | PARTIAL | Sprinkler permits; violations "sprinkler / 5-year service" (2,095); "SRO Sprinkler Ordinance Inspection" (353). Riser location UNKNOWN |
| 12 | Standpipe, PRVs (7.3.2) | PARTIAL | Violations "standpipes / missing caps" (681); high-rise flag from height |
| 13 | Fire pump (7.3.3) | UNKNOWN | Permit text only, sparse |
| 14 | FDC location, size, type, locking (7.3.4) | UNKNOWN | Not in DataSF; OSM `fire_service_inlet` not checked |
| 15 | Non-water systems (7.4) | PARTIAL | Permit text |
| 16 | Fire alarm, FACU location (7.5) | PARTIAL | Alarm permits (400 Duboce 2024 upgrade); violations "alarm system maintained"; FACU location UNKNOWN |
| 17 | Water supply: hydrants (Ch 7, REPORTED heading) | PARTIAL | OSM hydrants (ODbL); no flow data |
| 18 | Special hazards: hazmat, PV, ESS, dust (Ch 8) | PARTIAL | Permits keywords (PV; 761 permits mention "energy storage" or "Powerwall"); CERS not checked |
| 19 | Buildings under construction (8.4) | FILL | Active permits `i98e-djp9` status |
| 20 | Incident history (not an NFPA element; size-up context) | FILL | Fire incidents `wr8u-xric`, calls `nuek-vuh3` |
| 21 | On-site representative, site liaison (9.3, 10.3) | UNKNOWN | Deliberately not filled: PII (section 5) |
| 22 | Plan maintenance, review date (Ch 10 or 11, REPORTED) | FILL | FireSight officer approve or strike timestamp plus each source's `data_as_of` |

Count (row 20 is context, not an NFPA element): **21 elements; FILL 7 (rows 1, 2, 3, 5, 8, 19, 22), PARTIAL 9 (4, 7, 9, 11, 12, 15, 16, 17, 18), UNKNOWN 5 (6, 10, 13, 14, 21).** On screen: "7 filled, 9 partial, 5 need the officer, of 21". The UNKNOWN rows are the officer's job and are the honest story: "public data gets you to the door; the riser room is yours".

## 2. NFPA 170 symbols

- **Structure VERIFIED** (NFPA 170-2009 table of contents, images.techstreet.com/direct/tocs/NFPA_FIRE_/NFPA_FIRE_170-09_toc.pdf, HTTP 200, 11:27): Chapter 5 "Symbols for Use by the Fire Service"; Chapter 6 architectural and insurance drawing symbols (6.4 water supply, 6.5 control panels, 6.7 fire alarm, 6.8 extinguishing systems, 6.10 fire-fighting equipment); **Chapter 7 "Symbols for Use in Pre-Incident Planning Sketches"**: 7.2 Access Features, Assessment Features, Ventilation Features, and Utility Shutoffs; 7.3 Detection/Extinguishing Equipment; 7.4 Water Flow Control Valves and Water Sources; 7.5 Equipment Rooms; 7.6 Identification of Hazardous Materials. Chapter 8 emergency management mapping; Chapter 9 evacuation diagrams.
- **Current edition 2024** (REPORTED: globalspec listing in search results). The 2018 edition added FDC symbol details (REPORTED, search summary). Exact glyph shapes: NOT CHECKED (paywalled).
- **Our marker set mapped to 170 Ch. 7 categories:** Knox box / key box (7.2 access), roof hatch and skylight (7.2 ventilation), gas, electric, water shutoffs (7.2 utility shutoffs), sprinkler riser and FACU (7.3), FDC, standpipe, hydrant, PIV (7.4), fire pump room, elevator machine room (7.5), PV array and ESS, hazmat (7.6). Solar and ESS glyphs are FireSight additions unless the 2024 edition has them (UNRESOLVED).
- **Licensing.** The standard is NFPA copyright and sold (ANSI webstore listings in search results). NFPA advertises free online access (page heading "Free access NFPA codes and standards", nfpa.org/freeaccess, fetched 11:29; terms not readable: UNRESOLVED). Practical rule: **draw our own glyphs, do not trace figures from the standard, label them "modeled on NFPA 170 Ch. 7 categories"**. Whether simple geometric symbols are protectable is a legal question: NOT CHECKED (not a lawyer; ask NFPA before selling).
- **Open SVG set: NOT FOUND** (searched: web "NFPA 170 symbols pre-incident plan Knox box FDC SVG free symbol set"; `gh search repos "NFPA 170"`, `"pre-incident plan symbols"`, `"fire preplan svg"`: 0 results each; 2026-10-22 11:27). Hillsboro OR publishes a preplan symbol PDF (hillsboro-oregon.gov), 403 to curl: BLOCKED_FOR_AUTOMATION, not read.

## 3. ISO / Verisk FSRS (PPC): credit for pre-incident planning

- **Item 580H / T8, VERIFIED** (FSRS 2013 text, ISO 2012 filing copy, firesprinklerassoc.org/wp-content/uploads/2014/02/FSRS2013.pdf, HTTP 200, 11:26): "Building Familiarization for Pre-Incident Planning Program (T8): Annual pre-incident planning. Up to 12 points. The fire department should make building familiarization and pre-incident planning tours of each commercial, industrial, institutional, and other similar building at least annually. Records of the inspections (whether in electronic or other formats) should include complete and up-to-date notes and sketches, which must be available to the responding incident commander." It cites "the general criteria of NFPA 1620". Frequency factor: 1 year 1.00, 2 years 0.83, 3 years 0.67, 4 years 0.58, 5 years 0.42, more than 5 years 0.00. Records rule (search summary of the same PDF): partial documentation caps credit at 75 percent; no records, no credit.
- **Weight, VERIFIED** (SF's own PPC Summary Report, Aug 1 2020, sf-fire.org/sites/default/files/2022-01/8-1-20%20CMCI%20Community%20Report.pdf, HTTP 200, 11:29): Training is 9 of the 50 Fire Department points; schedule total 105.5 (Community Risk Reduction 5.5 extra). Training subitems sum to 100 (35, 25, 12, 5, 5, 1, 5, 12), SF earned 95.03 and got CT 8.55 of 9, so **T8 is worth 12 / 100 x 9 = 1.08 PPC points** (derived from the report's own numbers). Note: residential R-2 buildings are outside T8 ("all buildings except 1-4 family dwellings" in the SF report; "commercial, industrial, institutional" in FSRS).
- **SF status, VERIFIED** (sf-fire.org/data-reports/iso-rating-san-francisco, HTTP 200, 11:29): "San Francisco was assigned a PPC of 01/1X." SF earned **12.00 of 12** for "H. Pre-Fire Planning Inspections" and total 97.36 of 105.50.
- **What this means.** In SF, FireSight cannot move the class; the pitch is "you already earn the full 12; FireSight keeps the annual records with notes and sketches that ISO audits, at a fraction of the walk-through time" (time saving UNRESOLVED: no measured number). Outside SF, a department at, say, 2-year frequency (0.83) gains at most about 0.18 PPC points from going annual (derived). Do not pitch "better class, lower premiums" as a headline; pitch "audit-ready T8 records".
- Current FSRS edition and any post-2013 changes: UNRESOLVED (the copy read is the 2012 filing marked "Filed, Not Approved"; the SF 2020 report language matches it).

## 4. California mandates and the SF data that shows them

**Statutes, VERIFIED** (california.public.law mirrors citing leginfo, HTTP 200, 11:28; leginfo itself 403 to curl, browser UA and WebFetch: BLOCKED_FOR_AUTOMATION):
- **H&SC 13146.2(a):** every city or county fire department "shall, annually, inspect all structures subject to subdivision (b) of Section 17921, except dwellings, for compliance with building standards and other regulations of the State Fire Marshal." Section 17921(b) covers hotels, motels, lodging houses and apartment houses, which is how agencies read it as R-1 and R-2 (REPORTED: Pasadena, Los Osos CSD staff reports in search results; 17921 text NOT CHECKED).
- **H&SC 13146.3(a):** inspect "every building used as a public or private school ... not less than once each year."
- **H&SC 13146.4 (added by SB 1205, 2018):** departments "shall report annually to its administering authority on its compliance with Section 13146.2 and 13146.3", at budget time or as the authority decides; the authority acknowledges by resolution. Mirror shows source updated Jan 1, 2019. That SB 1205 enacted 13146.4: REPORTED (city staff reports); consistent with the date.

**SF data, VERIFIED live** (data.sf.gov `wb4c-6hwj` "Fire Inspections", license "Open Data Commons Public Domain Dedication and License", updated daily, queried 11:25 to 11:30; note `hft9-aih3` is only a map view of `wb4c-6hwj`):
- Inspection types: R2 Company Inspection 83,606 (latest 2026-10-21); School Annual Inspection 5,794 (latest 2026-10-21); High Rise Annual Inspection 13,419; Permit Annual Inspection 67,037; Lockbox Installation 1,532; Solar Photovoltaic Review 3; Residential Highrise Sprinkler Ordinance 57.
- 400 Duboce Ave: R2 Company Inspection 2026-08-04 Completed; previous 2025-08-14. 1018 to 1024 Mission St: R2 2026-10-08, 2025-10-29, 2024-10-14, all Completed.
- Fire violations `4zuq-2cbe` (PDDL): status values open 2,498, order to abate 1,066, referred to hearing 3,176, abated 37,127, closed 8,981, rescinded 1,316. 400 Duboce: last violation "alarm system maintained" 2025-10-14, abated.
- So **yes, SF data can show a building's mandated-inspection status**: R2 Company Inspection maps to 13146.2 and School Annual Inspection to 13146.3. The mapping of SFFD's type codes to the statute is our inference (UNRESOLVED until SFFD confirms; the names make it plausible). Join by GEO 15 to 25 m or address `like`, since addresses are ranges.

**CA Fire Code 2025 (effective in the current cycle), VERIFIED via UpCodes** (up.codes/viewer/california/ca-fire-code-2025, chapters 5, 9, 12, HTTP 200, 11:27 to 11:28; ICC codes.iccsafe.org returned 200 but was not parsed):
- **506.1 key box:** "the fire code official is authorized to require a key box ... of an approved type listed in accordance with UL 1037." Required only where the official requires it, so never FAIL a building on it.
- **912.2 / 912.2.1 FDC:** location approved by the fire code official; "located on the street side of buildings or facing approved fire apparatus access roads, fully visible and recognizable from the street."
- **1205.2.1.1 PV, R-3 type roofs:** "Not fewer than two 36-inch-wide (914 mm) pathways on separate roof planes, from lowest roof edge to ridge"; 1205.2.1.2 ridge setback 18 in (array 33 percent of roof or less) or 36 in (more than 33 percent).
- **1205.3.1 PV, other occupancies:** "minimum 6-foot-wide (1829 mm) clear perimeter"; 4 ft "where either axis of the building is 250 feet (76 200 mm) or less." 1205.3.2 interior pathways every 150 ft or less, 4 ft to standpipes and hatches.
- **1205.4 rapid shutdown labels;** **1207.1.3 ESS thresholds (Table 1207.1.3):** lithium-ion 20 kWh, flow 20 kWh, lead-acid 70 kWh, other battery 10 kWh, capacitor 3 kWh. **1207.4.1:** placard at main service disconnect if ESS disconnect is not in sight.
- **High-rise:** SFFD runs a "High Rise Annual Inspection" program (data above). The 75 ft definition (CBC 202) is REPORTED from memory of the code, not fetched this run.

## 5. Data, privacy and AI rules for selling to a fire department

- **DataSF: PDDL** (public domain dedication), VERIFIED from dataset metadata (`license.name` on `4zuq-2cbe` and `wb4c-6hwj` views, 11:25). Attribution courteous, not required.
- **OpenStreetMap: ODbL**, VERIFIED (openstreetmap.org/copyright, HTTP 200, 11:29): "credit OpenStreetMap and its contributors. If you alter or build upon our data, you may distribute the result only under the same license." Show "© OpenStreetMap contributors" on the 3D view; keep OSM-derived layers separable (share-alike flag).
- **PII:** do not show occupant or owner names, unit-level personal data or phone numbers; NFPA 9.3.4 and 10.3.2 want a representative "by name or job title", so store job title only and let the department add names in its own system. Incident records: show counts and types, never patient or caller details.
- **CJIS: not needed, with reason.** CJIS Security Policy governs access to FBI CJIS criminal justice information (criminal history, biometrics, NCIC). FireSight reads only public building data and stores officer annotations; it never touches CJI. Policy text: UNRESOLVED (fbi.gov and le.fbi.gov 403 to curl and WebFetch: BLOCKED_FOR_AUTOMATION). If FireSight is later wired into a CAD that carries CJI, this changes.
- **Accessibility:** Section 508 requires WCAG 2.0 Level A and AA (36 CFR 1194, E205.4, access-board.gov/ict, HTTP 200, 11:29). DOJ ADA Title II rule requires state and local government web content at WCAG 2.1 AA; an April 2026 interim final rule moved the deadline for entities of 50,000 or more to **April 26, 2027** (REPORTED: law-firm and university summaries, tier 2; Federal Register not fetched). SF is in that bucket. Build to WCAG 2.1 AA (designer already fixed danger red to #e5261f for AA).
- **AI guidance, one line:** NIST AI RMF 1.0 is "intended for voluntary use" (VERIFIED, nist.gov, 11:29); NIST-AI-600-1 Generative AI Profile (July 26 2024) is the one to cite for "every line cited, officer approves or strikes" as a human-in-the-loop control.

## 6. Compliance engine spec (live, per building)

Each rule returns `{rule_id, status: PASS|FAIL|UNKNOWN|N/A, evidence, citation, data_as_of}`. UNKNOWN is never shown as FAIL. Thresholds below are from the texts quoted above.

| ID | Rule (as shown on screen) | Trigger | Logic | Citation | Live example |
|---|---|---|---|---|---|
| C1 | Mandated annual inspection (R-1/R-2) | assessor use is apartment, hotel, SRO, lodging | latest `wb4c-6hwj` "R2 Company Inspection" with status Completed within 25 m; PASS if 365 days or less, FAIL if more, UNKNOWN if no rows | H&SC 13146.2(a) | 400 Duboce: PASS, inspected 2026-08-04 (79 days) |
| C2 | Mandated annual inspection (school) | use is school | same with "School Annual Inspection" | H&SC 13146.3(a) | not run |
| C3 | Open fire code violations | always | `4zuq-2cbe` by `eas_id`: PASS if none in open, order to abate, referred to hearing; FAIL lists each item text | SF Fire Code via SFFD record | 400 Duboce: PASS (last item abated 2025-10-14) |
| C4 | Rooftop PV pathways | permit text has solar or photovoltaic | geometry not public, so UNKNOWN; but compute the applicable rule from the footprint: longest axis 250 ft or less gives 4 ft perimeter, else 6 ft; R-3-like gives two 36 in pathways | CFC 2025 §1205.2.1.1, §1205.3.1 | 1433 Haight: UNKNOWN geometry, "4 ft perimeter applies" (axis check not run) |
| C5 | Energy storage over threshold | permit text has energy storage, battery, Powerwall | parse kWh; FAIL never; "CFC 1207 applies" if Li-ion over 20 kWh, UNKNOWN if no kWh | CFC 2025 §1207.1.3, Table 1207.1.3 | not run |
| C6 | Key box on record | any | "Lockbox Installation" inspection within 25 m: EVIDENCE ON FILE, else UNKNOWN; never FAIL (official decides) | CFC 2025 §506.1 | not run |
| C7 | High-rise annual inspection | LiDAR roof height over 75 ft (proxy for CBC definition) | "High Rise Annual Inspection" within 365 days | SFFD program; height rule REPORTED | not run |
| C8 | Pre-plan coverage | always | count section 1 rows filled with a citation | NFPA 1660 (2024) pre-incident planning, via NFPA 1620-2020 clauses | "7 filled, 9 partial, 5 need officer, of 21" |
| C9 | ISO T8 recency | officer approved plan | PASS if approved within 12 months (factor 1.00), else show FSRS factor (0.83 at 2 years) | ISO FSRS Item 580H (T8) | after officer approves in demo |

Build note: C1, C3 and C8 are the demo three (all live today). C4 is the honest UNKNOWN example the judge will like.

## What this means / what to do

1. Lane building the brief: add a "Compliance" strip with C1, C3, C4, C8 and the citation chip on each; tap a chip to show the quoted clause from this doc.
2. Designer: label markers "modeled on NFPA 170 Ch. 7"; add PV and ESS glyphs.
3. Pitch line (true as of 11:30): "400 Duboce is R-2. California H&SC 13146.2 says SFFD must inspect it every year. SFFD's open data says it did, on August 4. That's a PASS with a receipt. The FDC location is not public, so it stays UNKNOWN until the officer pins it."
4. Business slide: "audit-ready ISO T8 records (12 points; SF already earns 12/12)", not "lower premiums".

## Not checked

- NFPA 1660-2024 text itself (paywalled); NFPA 170-2024 glyphs; NFPA free-access terms.
- H&SC 17921(b) text; CBC 202 high-rise definition; SF local amendments to CFC (SF Fire Code).
- CalEPA CERS hazmat; OSM `fire_service_inlet` FDC tags; footprint axis computation for C4.
- Federal Register notice for the ADA Title II extension; CJIS policy text.

## Sources (all fetched 2026-10-22 PDT)

- NFPA 1620 F2019 SR report: docinfofiles.nfpa.org/files/AboutTheCodes/1620/1620_F2019_PIP_AAA_SRReport.pdf (200, 11:27)
- NFPA 1660 first draft minutes Jan 13 2026: docinfofiles.nfpa.org/files/AboutTheCodes/1660/1660_ERRS_A2027_PIP_AAA_FDminutes_01_26.pdf (200, 11:27)
- emergent.tech/blog/nfpa-1660 (tier 3 vendor, 11:25)
- NFPA 170-2009 TOC: images.techstreet.com/direct/tocs/NFPA_FIRE_/NFPA_FIRE_170-09_toc.pdf (200, 11:27)
- FSRS 2013: firesprinklerassoc.org/wp-content/uploads/2014/02/FSRS2013.pdf (200, 11:26)
- SF PPC: sf-fire.org/data-reports/iso-rating-san-francisco and the Aug 1 2020 report PDF (200, 11:29)
- H&SC 13146.2, .3, .4: california.public.law/codes/ca_health_and_safety_code_section_13146.2 (and .3, .4) (200, 11:28)
- CFC 2025 ch 5, 9, 12: up.codes/viewer/california/ca-fire-code-2025/chapter/{5,9,12} (200, 11:27 to 11:28)
- DataSF: data.sf.gov/resource/wb4c-6hwj.json, 4zuq-2cbe.json, i98e-djp9.json; data.sf.gov/api/views/{hft9-aih3,4zuq-2cbe}.json (200, 11:25 to 11:30)
- openstreetmap.org/copyright; nist.gov/itl/ai-risk-management-framework; access-board.gov/ict (200, 11:29)
- ADA Title II extension: plantemoran.com 2026/04 insight, accessibility.arizona.edu (search results only, 11:28)

GOAL: finder-regs met · due 11:55 · finished 11:32
COST: 9 searches + 7 WebFetch + about 20 curl fetches / 40 · 3 files read · 14 runs · 0 sub-agents

CHECKED_AT: Thu Oct 22 11:32:54 PDT 2026
SUBJECT: plan/firesight/research-regs.md (no git repo)
CHECKED: URLs above; DataSF queries for inspection types, 400 Duboce and 1018 Mission inspections, violation status values, ESS permit count
NOT CHECKED: see "Not checked"
UNRESOLVED: 1660 chapter numbering and verbatim 1660 text; SFFD type code to statute mapping; current FSRS edition; NFPA symbol licensing; CJIS text; ADA extension in Federal Register
