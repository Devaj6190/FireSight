# Planet DOTS and SF building data for FireSight

Plain answer (11:09 PDT, Thu Oct 22 2026):
1. Planet DOTS is Scott Robertson's own, proprietary WebGPU globe ("All rights reserved. Proprietary"). It uses no 3D library (no three.js, deck.gl, Cesium or MapLibre). We can learn its techniques but must not copy its code.
2. Its 3D buildings come from OpenStreetMap through OpenFreeMap vector tiles (OpenMapTiles schema, `building` layer, `render_height`). We can fetch the same tiles ourselves: free, no key, CORS open.
3. For SF, the best height source is DataSF Building Footprints: 177,023 footprints, every one has a lidar height, license PDDL (public domain), and you can query it by bounding box as GeoJSON with no key. Use OSM for addresses, names, hydrants and entrances.
4. OSM in SoMa: 66.0% of buildings have `height`, 12.9% have `building:levels`, 71.0% have one or the other. Roof, material and min_level tags are almost empty (1% or less). There are 355 fire hydrant nodes and 220 entrance nodes in the box.
5. Attribution: show "© OpenStreetMap contributors" (plus "OpenFreeMap © OpenMapTiles" if we use their tiles) in a map corner or on a splash or About screen.

## 1. What Planet DOTS is

| Fact | State | Evidence |
|---|---|---|
| A browser "real-time planet": Earth from open data, 8M simulated ships on Kepler orbits, 16,500+ real satellites (CelesTrak), NOAA GFS weather, OSM 3D cities, landmarks, wildlife, reefs, deep space. "In active development, updated October 20, 2026." | VERIFIED | https://scott-robertson.tech/planet-dots, HTTP 200, 11:04 PDT |
| It needs WebGPU (Chrome, Edge, Safari on iOS 26+ or macOS 26+). Phones get touch controls and "an adaptive render tier". | VERIFIED | same page |
| The stack is WebGPU, WGSL compute shaders, TypeScript, Rust compiled to WASM SIMD, Web Workers, SharedArrayBuffer, OGC 3D Tiles + Draco, Mapbox Vector Tiles, GPU culling with indirect draws, GPU skinning. The page says: "No Unity or other engine ... The only runtime libraries are draco3d (mesh decompression) and earcut (polygon triangulation)." | VERIFIED | same page, "Built with" and "Worth knowing" sections |
| The launch page (`/planet-dots/launch`, a Next.js site) embeds an iframe `/planet-dots/index.html?live=1`, a Vite build. It loads `assets/index-D-ZwpJoW.js` (6 KB), which lazy-loads `assets/App-BgH_SdEc.js` (1.82 MB) plus about 17 `worker-*.js` files and two wasm files (`kepler-*.wasm`, `laz-perf-*.wasm`). | VERIFIED | curl of each, all HTTP 200, 11:05 to 11:06 PDT |
| Code license: the bundle header reads `Copyright (c) 2026 Scott Robertson ... All rights reserved. Proprietary. See LICENSE.txt.` | VERIFIED | App-BgH_SdEc.js, first comment |
| Public GitHub repo, blog post, X or LinkedIn write-up | NOT FOUND (searched: `"Planet DOTS" Scott Robertson WebGPU`, WebSearch standard, 11:07 PDT, no relevant hits). I did not search GitHub directly. | |

How it builds buildings (from reading App-BgH_SdEc.js, VERIFIED):
- `EN = "https://tiles.openfreemap.org/planet"`, attribution string `OpenFreeMap © OpenMapTiles.org Data from OpenStreetMap (ODbL)`, buildings at zoom 14.
- It has a hand-written MVT protobuf decoder. For the `building` layer it reads `render_height`, `render_min_height`, `colour` and `hide_3d`. It defaults to 5 m when there is no height, resets heights over 1100 m to 5 m, and skips `hide_3d` features and any feature where height is not greater than min height. It decodes rings, then triangulates (earcut) and extrudes in workers.
- In Switzerland it uses swisstopo swissBUILDINGS3D as 3D Tiles (`https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/tileset.json`).

## 2. Its data sources and where they come from

The page lists its credits under "Built on open data": NASA, NOAA, CelesTrak, ADSB.lol, Copernicus, EOX, GEBCO, Open Waters, OpenStreetMap, Mapterhorn, OpenFreeMap, swisstopo, IGN, PNOA, PDOK, basemap.at, OpenAerialMap, GSI Japan, NSW Spatial Services, USGS, Smithsonian 3D, Berlin open data and others. It says "Full attributions and licenses are in the app's About panel." (VERIFIED, landing page.) The privacy page lists the tile providers the demo contacts (VERIFIED, https://scott-robertson.tech/privacy, HTTP 200, 11:05 PDT).

| Layer | Endpoint found in the bundle | Origin and license | How we fetch it |
|---|---|---|---|
| Buildings, coastline, land cover (trees, rocks) | `tiles.openfreemap.org/planet` | OpenStreetMap (ODbL) via OpenMapTiles schema. TileJSON attribution: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" | TileJSON `https://tiles.openfreemap.org/planet` returns tiles `https://tiles.openfreemap.org/planet/20261018_080001_pt/{z}/{x}/{y}.pbf`, maxzoom 14. The SF tile 14/2620/6332 returned HTTP 200, 559 KB, `access-control-allow-origin: *`, 0.91 s (VERIFIED 11:06). The building layer fields are `colour, hide_3d, render_height, render_min_height` only, with no address or levels. |
| Terrain | `tiles.mapterhorn.com/{z}/{x}/{y}.webp` | Mapterhorn (credits at mapterhorn.com/attribution) | NOT CHECKED (not needed for FireSight) |
| Satellite imagery | `tiles.maps.eox.at/.../s2cloudless-2023_3857/...` | EOX Sentinel-2 cloudless | NOT CHECKED |
| US aerial imagery | `basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}` | USGS National Map (US public domain, REPORTED) | NOT CHECKED live |
| Sea floor | `tiles.openwaters.io/seascape/...` | Open Waters | NOT CHECKED |
| Lidar (Olana) | `usgs-lidar-public.s3.amazonaws.com/NY_HudsonRiverRegion_1_2020/ept.json` | USGS 3DEP Entwine point tiles | NOT CHECKED |
| Populated places | link to naturalearthdata.com 10m populated places | Natural Earth (public domain, REPORTED) | NOT CHECKED |

## 3. Building data for a phone "exploded building" app in SF

### OSM tag completeness, SoMa (Overpass, VERIFIED)
Query: `way|relation["building"]` in bbox 37.770,-122.411 to 37.790,-122.388, overpass-api.de, HTTP 200, 35.8 s, OSM base 2026-10-22T18:04:20Z. Note: Overpass returned 406 without a User-Agent; send one.

| Tag | Count of 2,528 | % |
|---|---|---|
| height | 1,668 | 66.0 |
| building:levels | 325 | 12.9 |
| height or building:levels | 1,796 | 71.0 |
| addr:housenumber / addr:street | 1,636 / 1,643 | 64.7 / 65.0 |
| name | 512 | 20.3 |
| roof:shape | 25 | 1.0 |
| roof:levels | 11 | 0.4 |
| building:material | 9 | 0.4 |
| building:colour | 12 | 0.5 |
| min_height / building:min_level | 1 / 2 | about 0 |
| building:part | 1 | about 0 |

- `height` values mix units ("50 m" and "17"), so strip " m" before parsing. `source=Bing` on 456 ways.
- Fire tags in the same box (node counts): `emergency=fire_hydrant` 355, of which 297 of the first 300 have `fire_hydrant:type` (296 pillar), 152 have `fire_hydrant:position`, 54 have `water_source`. `entrance=*` 220. Other fire features (`fire_alarm_box`, `fire_extinguisher`, `fire_hose`, `siamese_connection`, `dry_riser_inlet`, `fire_service_inlet`) 34. `emergency_access` ways: 0.
- So interior detail (floors, stairs, rooms) is basically absent in OSM. An "exploded" view must split each building into floors itself: floors = levels, or height / about 3 to 3.5 m.

### Faster and better: DataSF Building Footprints (VERIFIED)
- Dataset `ynuv-fyni` "Building Footprints", license Open Data Commons PDDL, 177,023 rows. All 177,023 have `hgt_median_m` (a lidar height). Other fields include `peak_1st_m`, `gnd_min_m`, `mblr` (block and lot, which joins to SF parcel data) and `shape` (multipolygon). `data_as_of` 2023-09-11 on sampled rows.
- SoMa bbox query: 2,464 footprints. GeoJSON export `https://data.sf.gov/resource/ynuv-fyni.geojson?$where=within_box(shape,37.79,-122.411,37.77,-122.388)&$limit=50000` returned HTTP 200, 4.49 MB, 4.2 s, no key (11:08).
- CORS: `data.sf.gov` returns `Access-Control-Allow-Origin: *`. The old `data.sfgov.org` 301-redirects with ACAO limited to its own origin, so call `data.sf.gov` from the browser.
- Height fields are text; cast with `parseFloat`.
- An SF hydrant dataset on DataSF: NOT FOUND (searched: Socrata catalog `q=hydrant` on domains data.sfgov.org and data.sf.gov, 0 results, 11:08 to 11:09). Use the OSM hydrants.

### Other footprint and height sources
| Source | State | Notes |
|---|---|---|
| Overture Maps buildings, GeoParquet | VERIFIED | Latest release `2026-10-21.0`. Files are `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=buildings/type=building/*.zstd.parquet` (about 533 MB per part, so query by bbox with DuckDB or the `overturemaps` CLI rather than downloading). Buildings theme license: ODbL (OSM) plus Microsoft ML footprints (ODbL), Esri Community Maps and Google Open Buildings (CC BY 4.0) (docs.overturemaps.org/attribution, 11:07). DuckDB is not installed here (installing it needs approval). Too slow for a 5-hour build compared with DataSF. |
| Cesium OSM Buildings (ion) | REPORTED (vendor page via WebFetch) | "over 350 million buildings" from OSM as 3D Tiles; `cesium#estimatedHeight` is levels times 3 m when no height; needs a free Cesium ion account and token; attribution "© OpenStreetMap contributors". Asset id not shown on the page. Pulls in CesiumJS, which is heavy on a phone. |
| OSM Buildings (osmbuildings.org) | UNRESOLVED | the docs page returned HTTP 500 at 11:07; I did not retry |
| OpenFreeMap tiles | VERIFIED (above) | Fastest way to get global OSM footprints with height, but there are no addresses or levels in the tile |

### ODbL attribution rule (VERIFIED)
OSMF Attribution Guidelines (https://osmfoundation.org/wiki/Licence/Attribution_Guidelines, 11:08): "For a browsable map ... the credit should typically appear in a corner of the map ... Alternatively, the attribution may be placed adjacent to the map or on a splash screen or pop-up." It may collapse on interaction or after five seconds, but "the user must still be able to find the licence information", for example from an "(i)" button or an About page. Accepted text: "© OpenStreetMap contributors". Add "OpenFreeMap © OpenMapTiles" if we use their tiles. DataSF (PDDL) needs no attribution, but credit it anyway.

## 4. What we can reuse in 5 hours

Techniques only. Do not copy the code (it is proprietary).
1. **Data path (recommended):** at build time, fetch one GeoJSON per demo block from DataSF (heights) plus one Overpass call (hydrants, entrances, addresses), and ship them as static JSON. Do not call live APIs during the demo. This matches Planet DOTS, which "ship[s] as snapshots with the build".
2. **Extrusion:** triangulate each footprint with earcut (the same library Planet DOTS uses) and extrude to height. In three.js, `ExtrudeGeometry` from a `Shape` does both. For an exploded view, make one extrusion per floor (height / floor count) and offset floor i by `i * gap` on Y when the user taps. This is our design, not taken from Planet DOTS.
3. **Many dots:** draw hydrants and entrances as one `InstancedMesh` or `Points` buffer, not one object each. Planet DOTS goes further, with GPU compute, indirect draws and workers. We do not need WebGPU on a phone: WebGL through three.js reaches more devices. This is a recommendation, not tested here.
4. **Coordinates:** project lon/lat to local meters around a fixed origin (for example 37.7749,-122.4194) so floats stay precise on mobile GPUs.
5. **Height fallback:** like Planet DOTS, default missing heights (5 m there) and reject absurd values (over 1100 m there). Then use DataSF height, then OSM `height`, then levels times 3.2 m.
6. **Attribution chip:** an "(i)" corner button with "© OpenStreetMap contributors · DataSF" meets the OSMF rule.

## Not checked
- I did not run the app in a browser or record its network traffic (it needs WebGPU). The endpoints come from static strings in the bundle.
- The app's About panel and LICENSE.txt / CREDITS.txt were not fetched.
- I did not query Overture by bbox (no DuckDB). Cesium ion was not tried (needs an account). osmbuildings.org returned HTTP 500.
- I did not run a citywide OSM completeness count (SoMa only).
- I did not check how current the DataSF heights are beyond `data_as_of` 2023-09-11 on the sampled rows.

```
GOAL: finder-dots met · due 11:30 PDT · finished 11:09 PDT
COST: 20/25-40 searches+fetches · 0 project files read · ~20 runs · 0 sub-agents
CHECKED_AT: Thu Oct 22 11:09 PDT 2026 (date runs 11:04:42 to 11:08:46)
SUBJECT: https://scott-robertson.tech/planet-dots (+ /launch, /planet-dots/index.html?live=1, assets/App-BgH_SdEc.js), overpass-api.de, data.sf.gov ynuv-fyni, tiles.openfreemap.org, Overture S3 listing
CHECKED: landing, launch, privacy pages; main and App bundles (grep); OpenFreeMap TileJSON plus SF tile 14/2620/6332; two Overpass queries (SoMa buildings, fire features); DataSF metadata, counts, sample rows, GeoJSON export, CORS; Socrata catalog hydrant search; Overture S3 listing and attribution page; OSMF attribution guideline; Cesium OSM Buildings page (WebFetch)
NOT CHECKED: in-browser network trace; app About panel and LICENSE.txt; Overture bbox query; Cesium ion; citywide OSM stats
UNRESOLVED: osmbuildings.org tile terms (docs HTTP 500; retry or read the GitHub repo); author's public write-ups (search GitHub or LinkedIn by hand)
```
