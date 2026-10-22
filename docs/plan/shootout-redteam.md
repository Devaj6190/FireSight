# Shoot-out red team (skeptical senior engineer judge), Thu Oct 22 2026, 11:46 PDT

**VERDICT: STAY on FireSight. No rival beats it on the official rubric once data reality and prior art are priced in; best rival scores 70 vs FireSight 79, and every switch burns 0.25 to 1.25 h of a 4 h 15 m window.**
- Next (team, now): start code on FireSight's working core (address in, parcel resolved, cited facts with VERIFIED/UNVERIFIABLE/CONFLICT, limits panel). Treat AR and MCP as stretch; FireSight's killer risk is Technical Execution, not data.
- Merge, do not switch: ParcelScope's "contradiction detection" is already FireSight's identity resolution (78 vs 79 units); say it in the pitch. Nothing else is worth importing.
- Teammate scores (82 to 91) are inflated by 15 to 21 points each; none of them priced prior art or the data probes below.

## Scores (official rubric: User 25, Tech 25, Orig 20, Data 20, Demo 10)
Switch cost = hours of the remaining 4 h 15 m spent rebuilding what FireSight already has (verified data, hero, contract, design spec, demo script, judge research). Shared SF parcel stack = 0.25 to 0.5 h; new domain = about 1 to 1.25 h.

| id | name | User | Tech | Orig | Data | Demo | Total | Switch cost |
|---|---|---|---|---|---|---|---|---|
| F | FireSight (incumbent) | 20 | 17 | 16 | 18 | 8 | **79** | 0 |
| R1 | Recall Radar | 17 | 18 | 10 | 17 | 7 | 69 | 1.0 h |
| R2 | ParcelScope | 16 | 19 | 11 | 18 | 6 | 70 | 0.25 h |
| L1 | Ticket Oracle | 17 | 17 | 9 | 16 | 9 | 68 | 1.0 h |
| L2 | Cursed Storefronts | 16 | 15 | 13 | 14 | 9 | 67 | 1.0 h |
| R3 | PermitPulse | 17 | 19 | 7 | 17 | 6 | 66 | 0.5 h |
| L4 | Shazam for Buildings | 13 | 14 | 15 | 17 | 7 | 66 | 0.5 h |
| R4 | RecallChain | 17 | 17 | 9 | 15 | 6 | 64 | 1.25 h |
| R6 | ContractGraph | 15 | 17 | 6 | 17 | 6 | 61 | 1.25 h |
| L5 | Call a Building | 9 | 14 | 14 | 16 | 8 | 61 | 0.5 h (+ phone provider sign-up) |
| R5 | FacilityWatch | 15 | 17 | 6 | 17 | 5 | 60 | 1.25 h |
| L6 | 1989, Tonight | 13 | 15 | 13 | 10 | 8 | 59 | 0.75 h |
| R7 | FireFootprint | 14 | 15 | 5 | 15 | 6 | 55 | 1.25 h |
| L3 | Ghost Bus Detector | 15 | 10 | 8 | 12 | 6 | 51 | 1.25 h |

Scale convention: 5/5-equivalent (25, 20, 10) needs a named real user validated plus a working core shown live; nobody has either yet, so nobody tops 80 percent on User or Tech. Rival Tech scores assume a fresh start at about 12:00 with their own data unverified beyond the probes below.

## Killer risk per idea
| id | Killer risk |
|---|---|
| F | No code at 11:45 and the scope is wide (12 datasets, 3D explode, Android AR, MCP, approve/strike). A half-built 3D view scores worse than a finished 2D one. Officer-en-route usage is a claim a judge will probe. |
| R1 | Prior art: complaint-narrative clustering is a well-worn exercise (NHTSA ODI's own screening, CarComplaints.com, many topic-model papers; NOT CHECKED this run, from domain knowledge). No exposure denominator, so "emerging signal" cannot be separated from popularity. |
| R2 | SF's own Property Information Map already shows permits and complaints per parcel for free (from knowledge, NOT CHECKED this run); identical data to FireSight minus the user with urgency. |
| L1 | "34% chance of a ticket" is not computable: citations have no denominator of parked cars, so it is citation intensity, not probability. Raw rows carry license plates (privacy). SpotAngels already ships sweep alerts. |
| L2 | A registration closing is not a storefront dying: 2101 Mission St returns LLCs, a drywall contractor open 10 days, same-day open/close rows; dataset includes non-SF addresses and end dates like 2205-12-30. Honest filtering eats the build. |
| R3 | Crowded category (BuildZoom, Shovels, Construction Monitor; from knowledge); a permit is not buying intent. |
| L4 | Picking which building a phone points at in dense SF from GPS plus compass is unreliable, and the demo is indoors at a venue with no crane in view. |
| R4 | Needs a synthetic retailer inventory CSV, so the "user data" is fake; matching free-text recall descriptions to SKUs is fuzzy (UPCs sparse per earlier red team). Incumbents: ReposiTrak, iTrade, FoodLogiQ (from knowledge). |
| R6 | GovTribe, HigherGov, GovWin already sell exactly this (from knowledge). |
| L5 | Needs a phone number provider account (sign-up and spend need Vidyut's approval); weak standalone buyer. |
| R5 | EPA's own ECHO Detailed Facility Report already is the compliance timeline. |
| L6 | Premise is false: soft-story list is 4,715 of 4,958 "Work Complete, CFC Issued" (95 percent), 228 non-compliant, not "40% not retrofitted". The 1989 grid is about 1.8 km cells: 88 cells over SF, MMI 5.7 to 7.4 only, so it cannot resolve the Marina or individual buildings. |
| R7 | San Francisco has almost no wildfire exposure; First Street, ZestyAI and Verisk already score this (from knowledge). Data NOT CHECKED. |
| L3 | 511 token is an email form (speed UNRESOLVED) and the default limit is 60 requests per hour per token; actual arrivals must be inferred; logger starting about 12:15 yields under 5 h of one weekday afternoon. |

## Live data probes (fetched 11:42 to 11:44 PDT, curl, no keys)
| Source | Call | Status, latency | Finding | State |
|---|---|---|---|---|
| NHTSA complaints | `api.nhtsa.gov/complaints/complaintsByVehicle?make=honda&model=accord&modelYear=2018` | 200, 10.2 s, 1.9 MB | 1,892 complaints with `summary` narratives; newest filed 10/18/2026 (head gasket, K20C4) | VERIFIED |
| NHTSA complaints | same, `make=TESLA&model=MODEL Y&modelYear=2023` and `tesla/model y/2021` | 400 and 400 (`count 0`) | model naming is strict; demo must use the exact NHTSA model string (look up via products endpoint) | VERIFIED (failure) |
| NHTSA recalls | `api.nhtsa.gov/recalls/recallsByVehicle?...accord 2018` | 200, 0.2 s | 6 recalls; recall link is easy | VERIFIED |
| DataSF host | `data.sfgov.org/...` | 301 to `data.sf.gov` | old host now redirects; any code must use `data.sf.gov` or follow redirects | VERIFIED |
| SFMTA Parking Citations `ab4h-6ztd` | metadata; count where `citation_issued_datetime > '2026-10-01'` | 200, 0.6 s; 200, 7.4 s | rows updated 2026-10-21 07:07 UTC; 56,260 citations Oct 1 to 21, 55,160 with latitude (98 percent); 2,119 within 150 m of City Hall since 2025-10-01; columns include `vehicle_plate`; junk future dates (newest row dated 2044-12-21) | VERIFIED |
| Street Sweeping `yhqp-riqs` | metadata + 2 rows | 200, 0.5 s | blockside schedule with weekday, hours, week1 to week5, LineString geometry; rows updated 2026-05-14 | VERIFIED |
| Registered Business Locations `g8m3-pdis` | metadata; closures count; one corner | 200, 0.5 to 2.4 s | rows updated 2026-10-22 11:25 UTC; 182,106 SF location end dates 2014 to today; corner sample noisy (see L2); `location_end_date` contains 2205-12-30 | VERIFIED |
| 511.org | `api.511.org/transit/StopMonitoring` without key | 401 "The API key is not provided." | token by web form (name, email); 511.org/open-data/transit: "The default rate limit per API token is 60 requests per 3600 seconds." Token delivery time not tested (submitting is an outward action) | VERIFIED limit; UNRESOLVED speed |
| USGS Loma Prieta ShakeMap | `earthquake.usgs.gov/fdsnws/event/1/query?eventid=nc216859` then `.../download/grid.xml` | 200, 1.3 s; 200, 3.5 s, 17 MB | grid 602 x 477, spacing 0.0167 deg, fields LON LAT MMI PGA PGV; SF box has 88 cells, MMI 5.7 to 7.4 | VERIFIED |
| SF soft-story `beah-shgi` | `$group=status` | 200 | Work Complete 4,715 (+3), Non-Compliant 228, Newly Added 12 | VERIFIED |
| openFDA food enforcement | `api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=1` | 200, 0.4 s | last_updated 2026-10-14; newest report 20261014 (Queso Palmita) | VERIFIED |
| EPA ECHO | `echodata.epa.gov/echo/echo_rest_services.get_facilities?p_st=CA&p_ct=SAN FRANCISCO` | 200, 4.6 s | returns counts and a QueryID only (QueryRows 23,877, which looks larger than SF alone: city filter may not apply as sent); second call needed for rows | VERIFIED (shape); filter UNRESOLVED |
| USAspending | POST `/api/v2/search/spending_by_award/` VA contracts FY26 | 200, 0.7 s | returns award rows (sample IDs look older than the window: filter semantics need care) | VERIFIED |

## Notes
- FireSight's own scores are not generous: Tech 17 because nothing runs yet; earlier plan judge gave 19/25 and found a wrong scripted answer. Its lead comes from Data 18 (12 verified datasets, explicit limits panel, no personal data) and a user with urgency.
- Teammate claims checked and found wrong: L6 "40% not retrofitted" (95 percent complete per `beah-shgi`); L1 "34% chance" (no denominator); L3 "free token" is true but 60 requests per hour caps a logger.
- Prior-art lines marked "from knowledge" were not fetched this run (time box); they are judge-style priors, not verified facts.

GOAL: shootout-redteam met · due 12:05 PDT · finished 11:46 PDT
COST: 32/~20 curl requests in 6 batches (over the soft cap; batched in parallel) · 3 files read · 7 runs · 0 sub-agents

```
CHECKED_AT: Thu Oct 22 11:46 PDT 2026
SUBJECT: plan/firesight/rivals.md (14 ideas) vs live public APIs
CHECKED: NHTSA complaints (3 calls) and recalls; data.sf.gov ab4h-6ztd (meta, latest, 3 counts), yhqp-riqs (meta, rows), g8m3-pdis (meta, rows, count, corner), beah-shgi (meta, status counts); 511 StopMonitoring, token page, transit page; USGS event + grid.xml parsed for SF; openFDA; EPA ECHO; USAspending; research-data.md grep for FireSight datasets
NOT CHECKED: prior-art products (SpotAngels, SF PIM, BuildZoom, GovTribe, ReposiTrak, First Street) not fetched; FireFootprint wildfire perimeters; 511 token issuance time; FireSight data (already verified in research-data.md, not redone)
UNRESOLVED: 511 token delivery speed (submit the form to settle); ECHO city filter (run get_qid with the QueryID); whether SF PIM shows complaints and NOVs (open sfplanninggis.org/pim for one parcel)
```
