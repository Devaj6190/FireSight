# FireSight data research (finder-data)

Plain answer first:
- **San Francisco has everything the demo needs, free and keyless.** One address resolves to a parcel (block/lot) in about 0.5 s, and 10 DataSF datasets fan out in parallel in **2.4 s wall time** (two slow sources, fire incidents 2.4 s and soft-story 2.1 s; cache cuts it). All 15 DataSF ids below returned HTTP 200 live today.
- **Demo building: 1018 Mission St (SoMa), APN 3703/081.** Live data says: Commercial Hotel (SRO), built 1911, 5 stories, 72 rooms, assessor construction type "C", 1999 permit "seismic retrofit of unreinforced masonry building", fire alarm panel replaced 2025, fire escape repair permit May 2026, 50 SFFD incident records 2019 to 2025 (36 of them false or system alarms, 3 contained trash fires), a 2025 DBI "unsafe building" facade NOV, an SFFD R2 company inspection on 2026-10-08, LiDAR roof height median 17.3 m. That is a strong, honest size-up story.
- **Use `data.sf.gov` directly**, not `data.sfgov.org` (301 redirect adds a hop).
- **Three join keys do all the work:** `parcel_number` (block+lot) for assessor/permits/DBI/footprints, `eas_baseid` for fire violations, and a `within_circle` geo query for fire inspections, incidents and calls (their addresses are free text in mixed formats).
- **Biggest gaps:** hydrants and fire stations are not on DataSF under any name the catalog search found (use OSM, but Overpass took 36 s: pre-cache); NWS station KSFO had null wind (use Open-Meteo for wind); PG&E gas lines are not public; street widths and traffic NOT CHECKED.

All tests: run 2026-10-22 between 11:05 and 11:13 PDT from this Mac, no keys. Latency is one sample each.

## 1. Datasets ranked by tactical impact (pre-entry size-up)

Join key legend: **APN** = `parcel_number` "3703081" (or `block`="3703" + `lot`="081"); **EAS** = Enterprise Addressing System id; **GEO** = Socrata `within_circle(<point col>, lat, lon, meters)`.

| # | Dataset (id) | Why it matters on the fireground | Live test (1018 Mission) | Freshness (rowsUpdatedAt / max date) | Join key | Gotchas | State |
|---|---|---|---|---|---|---|---|
| 1 | **Assessor secured roll** `wv5m-vpq2` | Year built, stories, units, rooms, use, construction type: the core size-up line | 200, 447 ms, 1 row: `use_definition` "Commercial Hotel", `year_property_built` 1911, `number_of_stories` 5, `number_of_units` 2, `number_of_rooms` 72, `construction_type` "C", `zoning_code` C3G | updated 2026-06-26; latest `closed_roll_year` 2025 (annual) | APN; order `closed_roll_year desc`, limit 1 | Many rolls per parcel (one per year). `property_area` was 0.0 for this parcel (missing, not zero: say "unknown"). Construction type code meanings (A/B/C/D/S) not verified from a primary codebook this run: UNRESOLVED | VERIFIED |
| 2 | **DBI building permits** `i98e-djp9` | Recent work, sprinkler, fire alarm, elevator, solar, battery, URM retrofit, renovation (hidden voids, open walls) | 200, 737 ms, 37 rows (1983-05-12 to 2026-05-12). Keyword hits: sprinkler 6, "facp" fire alarm panel replace 2025-03-14, elevator 1 (2005), "seismic rtrofit of unreinforced masonry building" 2 (1999), fire escape 2 (2022, 2026), solar 0, battery 0 | updated 2026-10-22 12:31 UTC (daily) | APN (`block`,`lot`) | No structured "solar" or "ESS" flag: keyword search `description` (solar, photovoltaic, PV, battery, ESS, energy storage). Also has `existing_construction_type_description`, `number_of_existing_stories`, `existing_occupancy` | VERIFIED |
| 3 | **SFFD fire incidents** `wr8u-xric` | History of fires at the address, alarms, injuries | 200, **2432 ms** (slowest), 50 rows (limit hit), 2019-02-23 to 2025-05-24; 36 are 7xx false/system alarms, 3 are "118 Trash or rubbish fire, contained"; no multi-alarm | updated 2026-09-30; max `incident_date` 2026-09-24 (about 4 weeks lag) | address text (`upper(address) like '1018 MISSION%'`) or GEO on `point` | Address format mixes "74 6th St." and "364 EDDY STREET". NFIRS codes in `primary_situation` (111 = building fire). Not live | VERIFIED |
| 4 | **SFFD fire inspections** `wb4c-6hwj` | Is the building on SFFD's radar; R2 (residential) company inspections, complaints | address query returned 0; GEO 15 m returned 50 rows: 26 "Complaint Inspection", 8 "R2 Company Inspection", latest 2026-10-08, address "1018 - 1024 Mission St" | updated 2026-10-22 09:28 UTC | GEO on `location` | Address is a range "1018 - 1024 Mission St", so exact-address match fails: use GEO | VERIFIED |
| 5 | **SFFD fire violations** `4zuq-2cbe` | Open fire code violations (blocked exits, alarm testing) | by `eas_id` prefix: 9 rows (6 abated, 3 closed); sample 2017 "test and maintenance documentation" | updated 2026-10-22 09:24 UTC | **EAS**: `starts_with(eas_id,'364715-')` (`eas_id` = baseid-addressid-x) | Same range-address issue; EAS join is exact | VERIFIED |
| 6 | **DBI notices of violation** `nbtm-fbw5` | Unsafe building flags, facade, electrical, interior | 200, 1364 ms, 100 rows (limit hit); 1 with `unsafe_building`="Y" (2025-11-10, facade inspection program Tier 2) | updated 2026-10-22 12:51 UTC | APN | One row per violation item; dedupe on `complaint_number` | VERIFIED |
| 7 | **DBI complaints** `gm2e-bten` | Recent complaints, open cases | 200, 646 ms, 100 rows (limit hit), 2 "Active" | updated 2026-10-22 12:46 UTC | APN (`parcel_number`) | Overlaps NOVs | VERIFIED |
| 8 | **Building footprints + LiDAR heights** `ynuv-fyni` | 3D extrusion height for the exploded-floor view; high-rise check | 200, 486 ms, 1 polygon: `hgt_median_m` 17.27, `hgt_maxcm` 1931, `mblr` "SF3703081" | updated 2026-10-22 17:29 UTC | GEO `intersects(shape,'POINT(lon lat)')`, or `mblr`="SF"+APN | Heights from 2010 LiDAR (`p2010_name`); building changes since then are missed. 17.3 m / 5 floors is about 3.5 m per floor | VERIFIED |
| 9 | **Soft-story properties** `beah-shgi` | Wood soft-story collapse risk | 0 rows for this parcel with lot "81" and "081"; 4,958 rows total | updated 2026-10-07 | `block` + `lot` **without leading zeros** (sample `parcel_number` "170243" for 1702/43) | Pad-strip the lot. Absence here only means "not on the soft-story list", which is expected for masonry | VERIFIED (ABSENT for this parcel: query output above) |
| 10 | **Fire calls for service** `nuek-vuh3` | Recent activity around the block (alarms, smoke calls) | GEO 25 m: 0 rows; GEO 120 m, last 12 months: Medical 5063, Alarms 879, "Structure Fire / Smoke in Building" 352 unit-rows | updated 2026-10-22 11:14 UTC; max `received_dttm` 2026-10-22T03:14 | GEO on `case_location` (block-level points, need about 120 m) | **Not live:** daily batch, about 8 h behind now. One row per dispatched unit, so count `distinct incident_number`. Addresses are "1000 Block of Mission St" or intersections | VERIFIED |
| 11 | **URM list** | Unreinforced masonry collapse risk | DataSF catalog search "unreinforced" and "masonry" returned 0 datasets | n/a | n/a | Use the permits keyword "unreinforced masonry" (hit here) plus assessor type as a proxy | NOT FOUND (searched: catalog API `q=unreinforced`, `q=masonry`, domain data.sfgov.org, 11:08) |
| 12 | **High-rise status** | High-rise SOPs, standpipes | no dataset; derive from footprint height | n/a | n/a | High-rise threshold is 75 ft to the highest occupied floor (CBC definition; not re-fetched this run, NOT CHECKED) | derived |

### Address resolution (feeds every row above)
| Dataset | Test | Notes | State |
|---|---|---|---|
| **EAS addresses** `3mea-di5p` | forward: `address_number=1018 and street_name='MISSION'`: 200, 467 ms, `parcel_number` 3703081, `eas_baseid` 364715, lat 37.780704, lon -122.409452. Reverse: `within_circle(point,37.78072,-122.40948,30)` ordered by `distance_in_meters`: 200, 694 ms, top 3 = 1018, 1020, 1024 Mission, all APN 3703081 | updated 2026-10-22 03:16 UTC (daily). `ramy-di5m` is the same with units | VERIFIED |
| Parcels `acdm-wktn`, Streets `3psu-pn9h` | metadata 200 (ids exist, updated today) | parcel polygons for tap-to-parcel; streets have centerlines, width not checked | VERIFIED (exists), fields NOT CHECKED |

### Surroundings
| Source | Test | Notes | State |
|---|---|---|---|
| **OSM hydrants + stations (Overpass)** | `overpass-api.de` POST: 200, **35.96 s**. Hydrants within 200 m: 2 (163 m, 171 m; `fire_hydrant:type`=pillar). Stations within 2.5 km: 15; nearest "San Francisco Fire Station 1" at 492 m | OSM is ODbL (share-alike: attribute "© OpenStreetMap contributors"). Coverage is volunteer: 2 hydrants in 200 m of SoMa is surely incomplete. **Pre-fetch a city-wide extract once and serve locally** | VERIFIED (coverage gap is an inference) |
| DataSF hydrants / stations | catalog search `q=hydrant` (2 domain forms), `q=fire station`: 0 matching datasets | SFPUC hydrant layer may exist outside DataSF (not searched) | NOT FOUND (searched: Socrata catalog API, data.sfgov.org, 11:07 to 11:10) |
| **EPA FRS facilities** | `frs-public.epa.gov/.../get_facilities?latitude83&longitude83&search_radius=0.25&output=JSON`: 200, 2.54 s, 289 facilities; with `pgm_sys_acrnm=RCRAINFO` still 178 (filter seemingly ignored) | Too noisy as-is (every small generator). Use as "N regulated facilities within 0.25 mi" only, or filter TRI client-side | VERIFIED (call works); useful filter UNRESOLVED |
| CalEPA CERS (hazmat business plans) | not tested | Best real hazmat source for California; public access path unknown | NOT CHECKED (time) |
| PG&E gas lines | n/a | Not public at street level (PG&E publishes only gas transmission maps; distribution lines are not published). Not re-verified this run | NOT CHECKED |
| Street width / one-ways for apparatus | not tested | Candidate: OSM `oneway`, `width`, `lanes` tags in the same Overpass pull | NOT CHECKED |

### Now (current conditions)
| Source | Test | Notes | State |
|---|---|---|---|
| **Open-Meteo forecast** (wind) | 200, 0.86 s: 18:00 UTC wind 4.0 mph from 113 deg, gusts 5.6 mph, RH 94% | no key, CORS-friendly; free tier is non-commercial per Open-Meteo terms (not re-read this run) | VERIFIED |
| **Open-Meteo air quality** | 200, 0.80 s: US AQI 65, PM2.5 9.7 | same | VERIFIED |
| **NWS api.weather.gov** | `/points/37.7807,-122.4095`: 200, 1.32 s, grid MTR 85,105, fire weather zone CAZ006; hourly forecast 200, 0.85 s; alerts for the point: 200, 0 active; KSFO latest obs: 200 but timestamp 13:15 UTC (5 h old), wind **null** | Needs a `User-Agent` header. Use NWS for alerts and red-flag warnings, Open-Meteo for current wind | VERIFIED |
| Live incident feed | `nuek-vuh3` is daily batch (above). No real-time fire feed found on DataSF (police has `gnap-fj3t` real-time) | Say "calls feed is up to about 8 h old" on screen | VERIFIED (lag); live feed NOT FOUND (catalog search only) |
| Traffic | not tested (511.org needs a key) | | NOT CHECKED |

## 2. Join strategy (tap or address to every dataset in under 2 s)

1. **Resolve:** address text: EAS forward query. Tapped lat/lon: EAS `within_circle(point, lat, lon, 30)` ordered by `distance_in_meters`, take row 1. Output: APN, block, lot, `eas_baseid`, canonical lat/lon. (about 0.5 to 0.7 s)
2. **Fan out in parallel** (one HTTPS client, 10 concurrent): assessor and permits and DBI by APN; soft-story by block + unpadded lot; fire violations by `eas_id` prefix; footprints by `intersects(shape, point)`; inspections GEO 15 m; incidents by address text or GEO; calls GEO 120 m. Measured wall time 2.45 s, dominated by fire incidents (2.43 s) and soft-story (2.12 s); the rest were 0.45 to 1.4 s.
3. **Cache:** (a) pre-fetch the demo building and 5 to 10 backup buildings to JSON on disk (guarantees a fast, offline-safe demo); (b) city-wide static layers once at startup: hydrants and stations (Overpass, 36 s), soft-story (4,958 rows), footprints near demo; (c) per-APN results 24 h (sources update daily at best); (d) weather 10 min.
4. **Unknowns:** any field that is null, 0.0 for area, or a source with zero rows becomes "unknown" or "none on record", never "none".
5. Optional: a free Socrata app token raises rate limits (not needed at demo volume; limits not checked).

### Tiny ready-to-run loader note
Working script (tested, prints status and ms per source): `/Users/vidyutsriram/projects/superset-hack/plan/firesight/datasf_probe.py`. Run: `~/.agent-tools/venv/bin/python -I datasf_probe.py 1018 MISSION out.json` (needs `certifi`; system python 3.12 failed TLS verification without it). Apply these fixes when porting (all tested above):
```python
B = "https://data.sf.gov/resource/"
fire_inspections = ("wb4c-6hwj", {"$where": f"within_circle(location,{lat},{lon},15)", "$order": "inspection_start_date desc", "$limit": 50})
fire_violations  = ("4zuq-2cbe", {"$where": f"starts_with(eas_id,'{eas_baseid}-')"})
soft_story       = ("beah-shgi", {"$where": f"block='{blk}' and lot='{int(lot)}'"})
calls            = ("nuek-vuh3", {"$where": f"within_circle(case_location,{lat},{lon},120)", "$order": "received_dttm desc", "$limit": 200})
```

## 3. Business and pain

**Who buys:** fire departments (operations and fire prevention divisions), often through county 911 or E911 committees. Public price points, all from agency documents:

| Product | Price evidence | State |
|---|---|---|
| First Due (suite incl. "Occupancy Management & Pre-Incident Planning") | North Lake Tahoe FPD quote, FY 2022-2023: "Quote for Software on a one-year contract (one payment): $11,340.00"; pre-incident planning module line $1,235.00 (washoecounty.gov PDF, fetched 11:11) | VERIFIED |
| Tablet Command | Berkeley, CA (Nov 2025): base contract "not to exceed $135,000 which includes one-time startup costs", extensions "not to exceed $85,000" per year (berkeleyca.gov PDF, fetched 11:12) | VERIFIED |
| FlowMSP | FAQ: annual license priced by department size/type; Willits district reported $2,000 per year (2022 local press) | REPORTED (tier 3 press, not fetched) |
| ESO, Zonehaven (Genasys) | not checked | NOT CHECKED |

**How pre-plans are made today:** NFPA 1620 (now Chapter 5 of NFPA 1660, consolidated 2023) is voluntary; crews walk buildings and fill templates (occupancy, construction, fire protection systems, access, hazards, contacts). A coverage percentage (share of buildings with a pre-plan) was NOT FOUND (searched: "percentage of buildings with pre-incident plan ... NFPA 1660", "NFPA fourth needs assessment ... pre-incident plans", WebSearch standard, 11:10 to 11:14). Secondary sources say most departments cannot keep up (Fire Fighting in Canada, 2018; a USFA EFO paper): REPORTED.

**Danger tied to unknown building conditions:**
- UL (FSRI) Fire Safety Journal, primary PDF: "All of the modern rooms transitioned to flashover ... in less than five minutes, while the fastest legacy room ... just over 29 minutes"; "if firefighters arrive at eight minutes, collapse is possible as soon as 90 seconds later"; "an engineered I-joist floor system collapsed in less than one-third the time than did the dimensional-lumber floor system." (code-authorities.ul.com PDF, text extracted 11:12) VERIFIED.
- USFA "Firefighter Fatalities in the United States in 2024": "72 firefighters died in 2024"; 4 (6%) caught or trapped; 1 (1%) structural collapse; residential structures were the leading property type for fireground deaths 2015 to 2024 (usfa.fema.gov PDF, extracted 11:12) VERIFIED. NFPA counts 62 for 2024 (different criteria): REPORTED (secondary press).
- NIOSH FFFIPP reports list "no site pre-incident planning" and "incomplete pre-plan information" among contributing factors in specific deaths: REPORTED (search summary; individual reports not opened).
- Solar PV and lithium battery hazards: NOT CHECKED this run.

**Strongest 3 numbers for the pitch (all VERIFIED):**
1. **90 seconds:** in a modern fire, collapse is possible 90 seconds after an 8-minute arrival (UL).
2. **Under 5 minutes vs 29:** modern rooms flash over in under 5 minutes; legacy rooms took just over 29 (UL).
3. **$11,340 per year** for one small district's First Due suite, and up to **$135,000** for Berkeley's Tablet Command base contract: departments already pay for this category. FireSight's angle: the public data is free and already says "1911, unreinforced masonry, SRO hotel, 72 rooms, alarm panel replaced last year".

## What this means / what to do
- Build on the 10 DataSF calls plus EAS; demo on 1018 Mission St with a pre-fetched JSON snapshot and a live call as a bonus.
- Show freshness on screen ("incidents through 2026-09-24", "calls up to 8 h old") instead of claiming live.
- Hydrants: pre-fetched OSM with an "OSM coverage incomplete" label.
- Wind from Open-Meteo, alerts from NWS.

## Not checked
Overture footprints; CalEPA CERS; ESO and Zonehaven pricing; street widths and one-ways; traffic; Socrata rate limits; assessor construction type codebook; CBC high-rise definition text; Open-Meteo commercial terms; solar PV and lithium battery stats; individual NIOSH reports.

## Sources
- DataSF SODA and `/api/views/<id>.json` metadata for wv5m-vpq2, i98e-djp9, gm2e-bten, nbtm-fbw5, wb4c-6hwj, 4zuq-2cbe, wr8u-xric, nuek-vuh3, beah-shgi, ynuv-fyni, ramy-di5m, 3mea-di5p, acdm-wktn, 3psu-pn9h, gnap-fj3t: all HTTP 200, license "Open Data Commons Public Domain Dedication and License", fetched 2026-10-22 11:05 to 11:13 PDT.
- https://overpass-api.de/api/interpreter (200, 11:09)
- https://api.weather.gov/points/37.7807,-122.4095 , /gridpoints/MTR/85,105/forecast/hourly , /alerts/active , /stations/KSFO/observations/latest (200, 11:09 to 11:12)
- https://api.open-meteo.com/v1/forecast and https://air-quality-api.open-meteo.com/v1/air-quality (200, 11:09)
- https://frs-public.epa.gov/ords/frs_public2/frs_rest_services.get_facilities (200, 11:09 and 11:13)
- https://code-authorities.ul.com/wp-content/uploads/sites/40/2015/02/New_Science_FS_Journal_Issue_1.pdf (200, 11:11)
- https://www.usfa.fema.gov/downloads/pdf/publications/firefighter-fatalities-2024.pdf (200, 11:11)
- https://www.washoecounty.gov/technology/board_committees/911_response/2023/Files/031623/Item%209%20-%20NLTFPD%20-%20First%20Due.pdf (200, 11:11)
- https://berkeleyca.gov/sites/default/files/documents/2025-11-10%20Item%2002%20Contract%20%20Tablet%20Command%20for%20Mobile%20CAD.pdf (200, 11:12)
- https://flowmsp.com/faq/ and https://www.securitysales.com/news/nfpa-report-firefighter-fatalities-2024/612433/ (search results only, not fetched)

CHECKED_AT: Thu Oct 22 11:14:45 PDT 2026
SUBJECT: DataSF, OSM Overpass, NWS, Open-Meteo, EPA FRS, UL, USFA, agency contract PDFs
CHECKED: 15 DataSF metadata calls, 10-source fan-out for 1018 Mission St, reverse geocode, fire violations by EAS, inspections and calls by GEO, soft-story padding test, Overpass, NWS (4 endpoints), Open-Meteo (2), EPA FRS (2), 4 primary PDFs text-extracted, 7 web searches
NOT CHECKED: see "Not checked" above
UNRESOLVED: assessor construction type code meanings (needs Assessor codebook); FRS program filter (needs FRS REST docs); pre-plan coverage percentage (needs NFPA needs assessment full report)
