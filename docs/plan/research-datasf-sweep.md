# DataSF + SF sibling sources sweep for FireSight (finder-datasf)

**Plain answer**
- DataSF has **1,224 public assets** (668 datasets, 265 maps, 229 filtered views). Catalog in `plan/firesight/datasf-catalog.csv` (id, name, category, type, updated dates, row count, all column names, tags, description). The Socrata Discovery API returns only 5 results for this domain; the full list comes from `https://data.sf.gov/api/views/metadata/v1?limit=5000` plus `/api/views.json?page=N`.
- **Biggest find: hydrants were never missing; they are not on DataSF.** SF DEM publishes a public ArcGIS layer, `Firefighting_ESF_4`, with 1,596 AWSS high-pressure hydrants, 8,429 low-pressure hydrants, 180 cisterns, 46 fire stations (engine and truck ids) and first-run station boundaries. It answers in about 0.4 s with `Access-Control-Allow-Origin: *`. **Drop the 36 s OSM Overpass call.**
- **Second find: SFFD Fire Permits `893e-xam6`** lists battery energy storage systems (344), firefighter air systems (43), emergency responder radio systems (362), hazmat (84), underground and aboveground tanks (about 2,300), LPG, cryogenics, high-piled storage, cannabis extraction and places of assembly. No other public source has these.
- The CCSF ArcGIS Online org (`services.arcgis.com/Zs2aNLFN00jrS4gG`, 2,100 services) also has SRO lists with elevator yes/no, sub-sidewalk basements, Muni overhead trolley wires, adult residential and child-care facilities, hazmat facilities and a 3D buildings scene layer. Most of these layers are 2018 to 2021 snapshots, and **none of them states a license**: say "source: SF DEM / DPW public ArcGIS layer, as of <date>" on every pin.
- **Gotcha:** permits filed in the new **PermitSF** system (`tyz3-vt28`) do not appear in `i98e-djp9`. Query both datasets (VERIFIED, see the PermitSF row in the table).

All tests ran 2026-10-22 between 11:17 and 11:31 PDT from this Mac with no keys. Test addresses: **A** = 400 Duboce Ave (APN 0874003, EAS base 275608; the assessor calls it 50 Church St), **M** = 1018 Mission St (APN 3703081, EAS base 364715). Latency is one sample per call. Every data.sf.gov and ArcGIS call below returned `Access-Control-Allow-Origin: *` when sent with an Origin header. SF Planning ArcGIS echoes the caller's origin instead, which also works from a browser.

Scoring: **T** = tactical value to a company officer before entry, **W** = demo wow, **R** = reliability (freshness, join quality, speed), each 1 to 5. The score is T x W x R (125 max). Anchor = where the pin sits on the model: **floor**, **roof**, **bldg** (whole building or facade), **base** (basement), **ground** (street, sidewalk, surroundings).

## 1. Ranked table (new finds and known sources, all VERIFIED live unless marked)

| # | Source (id or layer) | T W R = score | Live test (status, latency, rows) | Freshness | Join key | Anchor | Sample pin text (real value) |
|---|---|---|---|---|---|---|---|
| 1 | **Firefighting ESF-4: high-pressure (AWSS) hydrants, low-pressure hydrants, cisterns** (AGOL `Firefighting_ESF_4` layers 3, 4, 2) | 5 5 4 = 100 | 200, 350 to 700 ms. A: LP hydrant 27 m, cistern 156 m, AWSS hydrant 192 m. M: AWSS hydrant 41 m, LP hydrant 54 m, cistern 211 m | layers edited 2018-09-19 | point buffer (`distance=250`, meters) | ground | "AWSS high-pressure hydrant #1462, 41 m" / "LP hydrant 6 in, 2006, University Mound zone, 54 m" / "Cistern, Sanchez & Duboce, 156 m" |
| 2 | **Fire stations + first-run boundaries** (ESF-4 layers 0 and 9) | 5 4 4 = 80 | 200, 260 to 860 ms. A: first-run 06, Station 6 at 135 Sanchez, E06/T06, 306 m. M: first-run 01, Station 1 at 935 Folsom, 477 m | stations 2025-04-02; boundaries 2024-02-16 | point-in-polygon; nearest point | ground | "First due: Station 6 (E06, T06), 306 m" |
| 3 | **SFFD Fire Permits** `893e-xam6` | 5 5 3 = 75 | 200; M within 60 m: 7 rows in 9.5 s (one slow sample); A: 0 | newest application 2026-10-21; 87,464 rows; PDDL | `within_circle(location,...)` or `permit_address` range text ("80 - 96 06th St") | base / roof / bldg | "Aboveground stationary tank, storage (80-96 6th St)"; citywide sample "Battery system, storage, use: Four Seasons, 757-765 Market, approved 2026-04-10" |
| 4 | **Fire-safety complaints** `2wsq-7wmv` | 4 4 4 = 64 | 200, 743 ms, A: 14 rows by address | newest 2026-10-21; PDDL | `upper(address) like '400 DUBOCE%'` (M needs GEO: 134 rows within 60 m) | bldg | "Complaint 2025-08-14: alarm systems, violation issued 2025-10-14" |
| 5 | **City SRO list with elevator flag** (AGOL `City_Funded_or_Operated_SROs_List_`) + 2016 SRO unit counts (`CMTL_SROs`) | 5 4 3 = 60 | 200, 360 ms; M matched exactly | SRO list edited 2026-01-16; CMTL 2016-12-16 | address text / `BLOCKLOT` "3703 081" | bldg | "SRO, **no elevator**, 76 hotel units, 65 residential (2016), 6 residential vacant" |
| 6 | **Muni overhead trolley wires** (AGOL `Public Works Emergency Response Layers` L5) | 5 4 3 = 60 | 200, 240 to 330 ms; 4 segments within 200 m of A, 5 of M | 2021-08-16 | line within 200 m | ground (overhead) | "Muni overhead trolley wire, circuit CH14, on this block: aerial ladder hazard" |
| 7 | **Sub-sidewalk basements** (DPW `ClaritiMapLayers2_WFL1` L61 "Yes", 1,665 pts; L60 "Maybe", 433) | 4 5 3 = 60 | 200, 185 ms; M: 3 within 100 m incl. 3703/004 | layer edited 2026-01-27; survey date 2015-06-09 | point buffer or `blocklot` | ground | "Hollow sidewalk (basement under sidewalk), 3703/004: check outrigger placement" |
| 8 | **PermitSF permits (new system)** `tyz3-vt28` | 4 3 5 = 60 | 200, 783 ms, A: 3 rows; M: 0 | newest submitted 2026-10-22 09:56; 10,370 rows; PDDL | `parcel_number` | floor / bldg | "BLDG-26-3352 kitchen or bath remodel, active, submitted 2026-10-01". Legacy `i98e-djp9` has 0 `BLDG%` permits and nothing for 0874/003 since 2026-09-01 (VERIFIED by query) |
| 9 | **Boiler permits** `5dp4-gtxk` | 4 3 5 = 60 | 200, 1.1 s, A: 61 rows; M: 42 | newest 2026-10-21; PDDL | block + lot | base | "Boiler permit to operate, cast iron, issued 2026-07-16, expires 2027-07-14" |
| 10 | **Electrical permits (legacy)** `ftty-kx6y` | 4 3 5 = 60 | 200, 1.25 s, A: 46; M: 22 | newest 2026-10-21; PDDL | block + lot | floor / bldg | "Fire alarm upgrade to SFFC 1103.7.6.1, completed 2026-03-05" |
| 11 | **Section 604 affidavits** `75h8-2zhw` (DBI exterior elevated elements: balconies, decks, exit stairs, fire escapes) | 4 4 3 = 48 | 200, 480 ms, A: 1 row | newest inspection date 2026-12-11 (future-dated row); no license field | block + lot | bldg (facade) | "Balconies, stairs, fire escapes: inspection affidavit 2019-05-10" |
| 12 | **Adult residential, RCFE, day-care facilities** (AGOL `Mass_Care_Housing_Human_Services_ESF_6` L2, L3, L5) | 4 4 3 = 48 | 200, 300 to 600 ms. A: Maitri Residential Care (chronically ill), 401 Duboce, across the street; Friends of St Francis Childcare nearby | L2 edited 2025-10-21; L3 2025-11-15 | point buffer | ground (exposure) | "Exposure: Maitri residential care, 401 Duboce (residents may be non-ambulatory)" |
| 13 | **Liquefaction zone** `i4t7-35u3` (Bay Area, "liq" class) + Planning layer 39 (state Seismic Hazard Zone) + `re79-p8j5` | 3 4 4 = 48 | 200; M: liq = "VH" (16.5 s, one sample; the two 400 Duboce calls took 1.0 and 7.3 s); A: none | static (2020 upload) | point-in-polygon | ground | "Very high liquefaction zone" |
| 14 | **SFPD real-time calls** `gnap-fj3t` | 3 4 4 = 48 | 200, 4.8 s for max(); A: 2 within 60 m | newest 2026-10-22 11:09 at check time 11:29 (about 20 min lag) | `within_circle(intersection_point,...)` | ground | "Police call at this corner within the last hours" (redact call type if sensitive) |
| 15 | **Plumbing permits (legacy)** `a6aw-rudh` | 3 3 5 = 45 | 200, 1.4 s, A: 45; M: 13 | newest 2026-10-21; PDDL | block + lot (also `parcel_number`) | floor | "Unit 408: kitchen and bath remodel, washer/dryer added (2024-12)" leads to a floor 4 pin |
| 16 | **Tall Building Inventory** `5kya-mfst` (180 high-rises) | 5 4 2 = 40 | 200, 2.7 s; 0 rows at A and M (expected, not tall); 650 California: 33 stories + 2 below, 100% sprinklered, Type I | collected 2018-09-26 (stale) | `mapblocklot` | floor / base | "650 California: 465 ft, 33 floors + 2 basements, 100% sprinklered, Type I fire-resistive" |
| 17 | **1906 fire burn area** `ff3a-iqhv` | 2 5 4 = 40 | 200, 640 ms; M inside, A outside | static | point-in-polygon | ground | "This block burned in the 1906 fire" |
| 18 | **Historic resource status, Article 11, historic districts, 1976 survey PDF** (`3tsw-4idn`, `6m3x-8fu4`, `63x5-g3m4`, Planning layer 30) | 2 4 5 = 40 | 200, about 0.6 s each. A: CEQA code A, built 1905; 1976 survey PDF 200 (295 KB). M: Article 11 "I", Heritage rating "B, Major Importance", in "Sixth Street Lodging House Historic District" | daily | APN / point-in | bldg | "Historic resource (CEQA A): expect original balloon-frame voids" (the inference needs an SME before it goes on screen) |
| 19 | **Building permit routing (incl. SFFD plan review)** `87xy-gk8d` | 3 3 4 = 36 | 200, 3.5 s; A permit 202410223487: 9 steps, SFFD step "Not Applicable" | 4.0 M rows; PDDL | `application_number` = `permit_number` from i98e | bldg | "SFFD plan check: n/a for SFFD (kitchen remodel, 2024-10-22)" |
| 20 | **Streets (one-way flag)** `3psu-pn9h` | 3 2 5 = 30 | 200, 0.7 s; 7 segments within about 100 m of A | daily; PDDL | line bbox / `cnn` | ground | "Fillmore St: two-way (`oneway`=B)" |
| 21 | **Rent Board housing inventory** `gdc7-dmcn` | 3 3 3 = 27 | 200, 1.0 s; block 0874: 400 block of Duboce, built 1905, 22 one-bedroom units 501-750 sq ft per year; block 3703: 619 renter, 23 owner, 98 vacant unit rows | submissions through 2026; PDDL | `block_num` + `block_address` (no lot; block-level point) | floor (approx) | "Mostly 1-bedroom units, 501-750 sq ft (2025 filing)" |
| 22 | **Public Works emergency routes + FEMA priority routes** (AGOL) | 3 3 3 = 27 | 200; Mission St 1000-1098 is an emergency route | 2019 to 2021 | line buffer | ground | "Mission St: designated emergency route" |
| 23 | **EV chargers** (AGOL `SF_EV_CHARGERS`, `ChargeUp_SF_(view)`) | 3 3 3 = 27 | 200, 0.6 s; A: 55 Fillmore St, 2 Level 2 (itselectric) | edited 2026-06-18 and 2026-10-19 | point buffer | ground | "Curbside EV charger, 55 Fillmore (lithium vehicle fires)" |
| 24 | **Active hazmat facilities, contaminated land** (AGOL `Oil_and_Hazards_ESF_10`) | 4 3 2 = 24 | 200, 350 to 680 ms; M: NRG Energy Center 460 Jessie (small-quantity generator) within 200 m | 2018 | point buffer | ground | "Hazmat generator nearby: NRG Energy Center, 460 Jessie" |
| 25 | **Land use (residential units)** `c5ge-t6pj` | 3 2 4 = 24 | 200, about 9 s (slow); A: `resunits` 79 | 2026-08-17 | `mapblklot` | bldg | "79 residential units" |
| 26 | **Entertainment permits / places of entertainment** `86e8-rfem`, `76g9-59eq` | 3 2 4 = 24 | 200; 0 at A and M (expected) | 2026-10-01 | point / address | bldg | "Place of entertainment (assembly occupancy)" when present |
| 27 | **Fire station 30-day calls** `pnbj-y63g` | 2 3 4 = 24 | 200, 4.4 s, station 06: 2 rows | data_as_of 2026-10-21 | `station_id` from row 2 | ground | "Station 6, last 30 days: 98 fire/rescue emergencies, emergency_response 1:44" (the metric's definition was not checked) |
| 28 | **Seismic shaking scenarios** `d6pi-gknj` (Hayward M7.0), `akmp-ztcg` / AGOL L10 (San Andreas M7.8) | 2 3 4 = 24 | 200; A: Hayward value 6.8; San Andreas 8 (A), 8.2 (M) | 2012 model | point-in | ground | "Hayward M7.0 scenario intensity 6.8 here" |
| 29 | **Zoning height district** `h9wh-cg3m` / `usp2-teig` | 2 2 5 = 20 | 200; A: "50//85-R-4", height 85 | current | point-in | roof | "Zoned up to 85 ft" |
| 30 | **Building inspections** `vckc-dh2h` | 2 2 5 = 20 | 200, 1.6 s, A: 68 | newest 2026-11-02 (scheduled) | block + lot, `eas_baseid` | bldg | "Final inspection approved 2025-02-28" |
| 31 | **Sidewalk widths** `4g86-grxu` | 3 2 3 = 18 | 200, 0.8 s; A: Church St sidewalk 19 ft | 2014 survey | line bbox / `cnn` | ground | "Sidewalk 19 ft (Church St)" |
| 32 | **Elevation contours** `6d73-6c4f` | 2 3 3 = 18 | 200, 1 to 4 s; A: 4 contours, e.g. 100 | 2023-10-17 | line bbox | ground | "Grade: 100 ft contour on this block" (datum not checked) |
| 33 | **Schools** `7e7j-59qk` | 2 2 4 = 16 | 200; 0 within 60 m | 2026-08-17 | point | ground | exposure when present |
| 34 | **Street trees** `tkzw-k3nq` | 2 2 4 = 16 | 200, 0.8 s; A: Red Ironbark, Red Flowering Gum in sidewalk cutouts | 2026-10-22; PDDL | lat/lon bbox (`point` is text) | ground | "Street trees at curb: Red Ironbark (ladder placement)" |
| 35 | **Stormwater inlets** `jtgq-b7c5` | 2 2 4 = 16 | 200; A: 6, M: 7 within 60 m | 2026-05-14 | point | ground | "Storm drain inlet: hazmat runoff path" |
| 36 | **Energy benchmarking** `96ck-qcfe` | 2 2 3 = 12 | 200, 585 ms, A: 8 rows; floor area 61,414 sq ft, multifamily, built 1905 | annual | `parcel_number` "0874/003" (slash) | bldg | "61,414 sq ft multifamily" |
| 37 | **Registered businesses** `g8m3-pdis` | 2 2 3 = 12 | 200, 0.7 s; A: 42 within 60 m incl. "Trick Woodworks, 400 Duboce Apt 415" | daily | point / `full_business_address` with unit | floor | "Woodworking business registered in unit 415" (combustibles; light on privacy) |
| 38 | **Taxable commercial spaces (vacancy)** `rzkk-54yv` | 2 2 3 = 12 | 200; A: 4 within 60 m (401 Duboce, Maitri, not vacant) | 2026-10-21 | block + lot (`parcelnumber` "3537-001") | bldg | "Commercial space vacant: yes/no" |
| 39 | **SB 79 transit parcels** (Planning layer 143) | 1 2 5 = 10 | 200, 0.5 s; A: Tier 2, 200 ft from Duboce & Church; M: Tier 2, Mission & 6th | current | point-in / `blklot` | none for fire | not tactical; skip unless for a planning angle |
| 40 | **SF 3D Buildings scene layer** (AGOL SceneServer, 85,986 multipatch) | 1 4 2 = 8 | 200; feature query hit A in 6.2 s | 2010 model, SoMa updated 2019 | point | n/a | alternative 3D source; LiDAR-height extrusion of `ynuv-fyni` is simpler; NOT CHECKED for I3S loading in the app |
| 41 | **Bureau of Fire Prevention districts** `knrt-8a7e` | 1 1 5 = 5 | 200; A: district 2 | static | point-in | none | low value |
| 42 | **Planning records** `y673-d69b`, `qvu5-m3a2` | 1 1 4 = 4 | 200; A: 9; M: 8 + 3 | daily | block + lot | none | low value |
| 43 | **311 cases** `vw6y-z8j6` | 1 1 4 = 4 | 200, 1.5 s; A: 200 rows (overflowing cans, graffiti) | 2026-10-21 23:48 | `address` | ground | low value |
| 44 | **Parking regulations** `hi6h-neyh` | 1 1 3 = 3 | 200; A: 2 hr M-F 8am to 9pm, RPP area S | 2017 edit | line bbox | ground | low value |

**Known to the team already (not re-ranked, re-tested here for freshness):** building permits `i98e-djp9` (200, A 64 rows, newest filed 2026-10-21), fire violations `4zuq-2cbe` (EAS join, A 10, M 9), soft-story `beah-shgi` (A 1 row: on the list), fire incidents `wr8u-xric` (newest 2026-09-24, about 4 weeks lag), DBI complaints `gm2e-bten`, DBI NOVs `nbtm-fbw5`, footprints `ynuv-fyni` (join `mblr`="SF"+APN works for both addresses), fire inspections `wb4c-6hwj` / map `hft9-aih3` (A: R2 company inspection 2026-08-04), assessor `wv5m-vpq2`, fire calls `nuek-vuh3` (newest call_date 2026-10-22), EAS `3mea-di5p` / `ramy-di5m`.

Full raw results: `/private/tmp/claude-501/-Users-vidyutsriram/c8ed2182-c3f9-43a6-bd6e-ca5eb15204ff/scratchpad/live1.json` (115 DataSF ids), `.../agol1.json` and `.../agol2.json` (ArcGIS layers).

### How to call the ArcGIS layers (copy-paste)
```
https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/Firefighting_ESF_4/FeatureServer/3/query
  ?geometry=-122.409452,37.780704&geometryType=esriGeometryPoint&inSR=4326&outSR=4326
  &distance=250&units=esriSRUnit_Meter&outFields=*&returnGeometry=true&f=json
```
Layers: 0 stations, 1 call boxes, 2 cisterns, 3 high-pressure (AWSS) hydrants, 4 low-pressure hydrants, 5 NERT staging, 6 battalions, 7 fire control channels, 8 divisions, 9 first-run boundaries. Sort by distance on the client. Item `bf8559fcacbb4a62a74ab7bd5c6c008a`, owner `nancy.milholland_sfdem`, access public, licenseInfo empty.

## 2. Hidden gems (top 10 the team does not have yet)
1. **SF DEM Firefighting ESF-4 hydrants, cisterns and stations**: real AWSS and low-pressure hydrants with pressure zone and size, in 0.4 s. Replaces the 36 s, incomplete OSM call.
2. **SFFD Fire Permits `893e-xam6`**: the only public list of lithium battery ESS, firefighter air replenishment systems, in-building radio (ERRCS), tanks, LPG and hazmat by address. These are high-value pins for a size-up.
3. **SRO list with "Elevator: N"**: for 1018 Mission, "5-story SRO, no elevator, 76 rooms" changes how a crew plans the rescue.
4. **Muni overhead trolley wires**: an aerial ladder hazard drawn as a line over the street. It is easy to see in 3D and few tools show it.
5. **Sub-sidewalk basements (DPW)**: "hollow sidewalk here" in red at the curb, where the aerial outriggers would go.
6. **Section 604 affidavits**: when the balconies, exit stairs and fire escapes were last certified. Pin it on the facade.
7. **Adult residential / RCFE / day-care facilities (ESF-6, 2025)**: exposure pins for occupants who may not self-evacuate (Maitri residential care, across from 400 Duboce).
8. **Tall Building Inventory**: percent sprinklered, stories below grade, structural system and atrium for 180 high-rises. Good for a second demo building.
9. **1906 fire burn area + liquefaction "VH" + shaking scenario**: one ground layer with a strong story for 1018 Mission.
10. **PermitSF `tyz3-vt28`**: the city's new permit system. Without it, the app misses every permit filed there since the switch (a reliability fix, not a pin).

Runners-up: boiler permits (basement pin with boiler type), fire-safety complaints, permit routing with SFFD review notes, EV chargers, Rent Board unit mix, station 30-day response times.

## 3. Dead ends and gaps (searched, not found)
Search method: regex over every catalog row's name, tags, all column names and the description (1,224 assets), run 11:20.
- **On DataSF: hydrants, cisterns, Knox boxes, elevators, battery/ESS, EV chargers, URM, RCFE/assisted living, PG&E.** NOT FOUND (searched: `hydrant`, `cistern`, `knox`, `elevator`, `battery|energy storage`, `ev charg|charging station`, `unreinforced|\burm\b`, `assisted living|residential care|rcfe|skilled nursing`, `pg&e|pacific gas`: 0 hits each). `awss` matched only as a ROW exception code in `yrgu-vakm`; `solar` only in Green_Roofs. Hydrants, cisterns, RCFE and EV chargers turned up on CCSF ArcGIS (above). Battery ESS is in Fire Permits.
- **Knox box locations:** NOT FOUND (DataSF regex above; CCSF AGOL service names searched for `knox`: 0).
- **Elevator inventory or elevator permits:** NOT FOUND on DataSF or CCSF AGOL service names. Use a keyword search on `i98e-djp9.description`. The California DIR elevator registry was NOT CHECKED.
- **URM list:** NOT FOUND on DataSF (also confirmed by finder-data at 11:08). Proxy: permit keyword "unreinforced masonry" plus assessor construction type.
- **PG&E gas distribution lines:** NOT FOUND (DataSF 0 hits). AGOL `Water_and_Utilities_ESF_12` has a 2018 national-scale natural gas pipeline layer (0 within 200 m of either address). PG&E's own transmission pipeline map was NOT CHECKED.
- **Street curb-to-curb widths:** NOT FOUND (regex `street width|roadway width|curb.to.curb`: 0). Sidewalk widths exist (`4g86-grxu`). Curbs and islands polygons `emxt-b6yg` (2016) could yield widths by geometry; NOT CHECKED.
- **SFPUC 2026 low-pressure hydrant layer** (`SF_PUC_Low_Pressure_Hydrants`, edited 2026-07-10): its capabilities are Create, Editing, Sync, ChangeTracking with no Query, and query returns 400 "This operation is not supported". UNRESOLVED (the newer layer cannot be read; use the ESF-4 2018 copy).
- **`services.sfgov.org` and `sfgis-svc.sfgov.org` ArcGIS:** timed out at 20 s; `gis.sfgov.org` had no connection. UNRESOLVED (could not reach, not "absent").
- **DataSF GitHub org:** 30+ repos, none with fire or hydrant data (newest relevant: `sf-building-explorer`, 2019). GitHub's unauthenticated API was rate-limited; listed via `gh api`.
- **Socrata Discovery API for data.sf.gov / data.sfgov.org:** returns only 5 results (a known trap). Use `/api/views/metadata/v1`.
- **No hits at the test addresses (expected):** tall buildings, landmarks, temporary street closures, clearance heights, green roofs, wireless facilities, POPOS, night noise permits, tsunami / flood / dam zones, slopes 20%+, Installed_Solar (5 polygons, 2017), Leaking USTs (103), Emergency_Generator (47).

## 4. What this means / what to do
- **Builder, now:** swap the OSM hydrant/station call for ESF-4 layers 0, 2, 3, 4 and 9 (one request each, about 0.4 s, CORS ok). Pre-cache all of them city-wide (about 10k points) as a static JSON so the demo never depends on ArcGIS.
- Add `893e-xam6` fire permits (GEO 60 m plus `permit_address` match), `5dp4-gtxk` boilers, `75h8-2zhw` Section 604, `tyz3-vt28` PermitSF, and the SRO elevator flag to the per-building fan-out. All are keyless and CORS ok.
- Add the overhead-wire and sub-sidewalk-basement layers as ground hazards for the "apparatus placement" moment in the demo.
- Label the source date on AGOL pins (most are 2018 to 2021) and keep the planner's 3-state claim labels. Several AGOL layers carry personal contact data (`high_rise_w_reg` has building manager names, phones and emails; the childcare layer has emails). Do not render those fields.

## 5. Not checked
- Whether the 2018 ESF-4 hydrant positions still match the field (no second source; OSM shows fewer). The hydrant counts are VERIFIED; their currency is UNRESOLVED.
- ArcGIS item licenses: `licenseInfo` is blank on the ESF-4 item, so terms are not stated. Other AGOL items were not opened one by one.
- SF Fire Department website (sf-fire.org) for downloadable pre-plan or high-rise data, the California DIR elevator registry, CalEPA CERS (CUPA) facility data, and PG&E pipeline maps: NOT CHECKED (time).
- Distances are flat-earth approximations at SF latitude (good to a few meters at these ranges).
- `re79-p8j5` carries only an `id` per polygon, so the hazard type (liquefaction or landslide) for M comes from Planning layer 39 and `i4t7-35u3`.
- Landslide `bna4-itif` `gridcode` meaning (A returned 7) is not decoded: UNRESOLVED.

GOAL: datasf-sweep met (catalog enumerated, 115 DataSF + about 70 ArcGIS layers live-tested, ranked, gems, dead ends) · due 12:20 (checkpoint 11:50) · checkpoint 11:25, final 11:33
COST: about 32 manual fetch/command rounds (plus scripted sweeps: 1,224 metadata pulls, about 600 SoQL and ArcGIS test queries) / 25 to 40 budget · 5 files read · about 20 runs · 0 sub-agents

```
CHECKED_AT: Thu Oct 22 11:33 PDT 2026
SUBJECT: data.sf.gov (1,224 assets), sfplanninggis.org/arcgiswa PlanningData MapServer, services.arcgis.com/Zs2aNLFN00jrS4gG (CCSF ArcGIS Online), github.com/datasf
CHECKED: metadata/v1 + views.json + views/<id>.json for every asset; SoQL tests for 115 ids at 400 Duboce and 1018 Mission (live1.json); ArcGIS point and buffer queries for about 70 layers (agol1.json, agol2.json); Planning layers 13, 23, 28, 29, 30, 39, 40, 143; 1976 survey PDF HEAD; ArcGIS Online search (7 queries); item metadata for ESF-4 and SF_3D_Buildings
NOT CHECKED: sf-fire.org, CalEPA CERS, DIR elevators, PG&E maps, AGOL licenses beyond ESF-4, I3S scene loading
UNRESOLVED: field currency of 2018 hydrant layer; SFPUC 2026 hydrant layer (query disabled); services.sfgov.org reachability; bna4-itif gridcode meaning
```
