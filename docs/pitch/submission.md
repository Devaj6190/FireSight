# FireSight — submission copy

Owner: Rohan. Ready for Vidyut's review; submission target 16:30 PDT, final submission by 16:45 PDT on October 22, 2026. Do not submit an external form until Vidyut approves the final entry. Devaj owns the video, due 16:20.

## Project name

FireSight

## Tagline

Size-up starts before the wheels stop.

## Track

Track 1: Hacking with Public Data APIs

## Short description

FireSight turns a San Francisco dispatch address into a cited, floor-by-floor 3D building pre-plan on a phone. It brings scattered city records together, labels what is verified, unknown or conflicting, and puts the officer in charge of reviewing the brief.

## What we built

A company officer may have only minutes in the engine to understand a building. Construction, permits, inspections and water assets are spread across city systems with different addresses and identifiers.

FireSight resolves those records to one parcel and places each fact on the floor, roof or surrounding site supported by its source. A dispatch naming floor 22 separates a real 26-story building and focuses that floor. Tapping a pin shows its dataset, record id, date and placement rule. When two public height sources differ, both remain visible as a conflict. Missing stairs and standpipe locations stay unverifiable.

A cited size-up brief supports approval and strike on individual lines; connected strikes are saved as regression cases. The phone also exposes rule checks, data limits, source status and refresh history. A read-only MCP server returns the same structured building information to agents.

The prototype demonstrates four cached San Francisco buildings. It is not for operational use and is not affiliated with or endorsed by SFFD or another public agency.

## Links

- Repository: https://github.com/Devaj6190/FireSight
- Demo URL: https://firesight-ten.vercel.app
- Demo video: **PENDING — Devaj's unlisted final link, due 16:20 PDT.**

Demo verification on October 22: `/api/health` returned `{"ok":true}`. The root page initially showed the older scene-only interface, without the merged phone shell. Devaj must redeploy current `main` and the team must repeat the phone walkthrough before this entry is submitted. An API health check alone does not verify the complete demo.

The repository is currently private; confirm judges have access before submission. Do not change repository visibility automatically.

## Public data used

The pipeline queries 88 public sources per cached building; successful records and source failures are shown per building. Core sources include:

- DataSF addressing (`3mea-di5p`) and assessor roll (`wv5m-vpq2`) for parcel identity, building type, age and occupancy.
- Building permits (`i98e-djp9`) and SFFD fire permits (`893e-xam6`) for floor references, battery storage, tanks and assembly occupancy.
- Fire inspections (`wb4c-6hwj`), violations (`4zuq-2cbe`), incidents (`wr8u-xric`), DBI notices (`nbtm-fbw5`) and complaints (`gm2e-bten`).
- Building footprints (`ynuv-fyni`) and Tall Building Inventory (`5kya-mfst`) for the model and the height conflict.
- SF Department of Emergency Management ArcGIS layers for hydrants, cisterns and fire stations; Open-Meteo for weather; OpenStreetMap where used.

Each factual pin carries source evidence. The resolver records the key, join method, confidence and matched record count for each dataset. Refreshes run every 30 minutes and retain each record's own date.

## Data limits and responsible use

- Heights come from 2010 LiDAR scans; footprints date to September 2023. The Tall Building Inventory was collected in 2018.
- Hydrant and cistern positions come from a 2018 SF DEM snapshot. Fire incidents lag about four weeks; calls for service about eight hours.
- Permit text provides partial occupancy evidence. It does not establish current occupancy or office headcount. Permit maxima are not the number of people currently present.
- Public interior floor plans are unavailable. Stairs, standpipes, FDC locations and unrecorded layouts remain unverifiable; the model uses floor slabs, not invented interiors.
- Battery records list gallons of electrolyte, not kWh or chemistry. Historical equipment records may not reflect current conditions.
- Public records can be incomplete, wrong or stale. Source failures and disagreements remain visible.
- Personal contact details are dropped; tenant and permit-holder names are excluded from the demo. Incident information is aggregated.
- DataSF core datasets use the source-specific licenses listed in the README. SF DEM layers have no stated license and Tall Building Inventory licensing remains unchecked. OpenStreetMap attribution and Open-Meteo terms apply where used.

## Team

- Devaj — 3D scene, deployment and video
- Rishit — data fusion and refresh
- Rohan — phone shell, pitch and submission preparation
- Vidyut — AI brief, compliance checks, MCP and integration

Use members' preferred full names in the form after confirmation; this draft uses the names in the README.

## Trust and standards wording

Say “maps to NFPA 1660” for pre-plan element coverage. State rule-check results with their citations and unknowns. Do not claim certification, complete building compliance, AI factual accuracy or agency endorsement.

## Outstanding fields and checks

- [ ] Devaj's final video link and playback check
- [ ] Current main deployed; phone dispatch → floor 22 → provenance → resolution → compliance → brief approval/strike → crew card tested
- [ ] Lane C's published eval totals/timestamp; only insert measured numbers after they exist
- [ ] Saved offline answers confirmed before promising offline question answering
- [ ] Submission platform, field limits and team identity fields confirmed
- [ ] Judges can access the repository
- [ ] Vidyut reviews final text and submits or authorises Rohan to submit
