# FireSight — eight judge questions

Use short answers first. Demo claims must match the deployed build and the actual saved eval run.

## 1. Why should a firefighter trust the AI?

We expose the source record, date, placement rule and disagreements, and the officer reviews every brief line. The validator rejects unsupported citations; citation checks alone do not prove a claim is true, and this prototype is not for operational use.

## 2. What happens offline?

If the app and building snapshot are already loaded, a failed API call uses a saved brief when available, then a brief assembled directly from cited records with a “FROM RECORDS · NO AI” label. Questions require saved answers; an offline strike changes the local review but is labelled offline rather than claimed as a saved server test. A cold offline page load is not guaranteed.

## 3. How fresh is the data?

Refreshed from data.sf.gov every 30 minutes; each source is as fresh as the city publishes it. Fetch time and record date are different: the UI shows both, with stale records and failed refresh attempts visible.

## 4. What can't it tell me?

Public data doesn't provide interior floor plans, stair/standpipe/FDC locations or which portion of this tower is unsprinklered. Heights use older LiDAR; water assets use a 2018 snapshot; incident and call feeds lag. A 2017 permit is evidence of a record, not proof that equipment remains installed today.

## 5. How does this scale beyond four buildings or San Francisco?

The demo has four cached buildings; citywide on-demand coverage is not implemented. The reusable layer is the building contract and provenance system. Each new city needs source adapters, identity joins, local rule review and validation against known buildings.

## 6. Who pays, and why wouldn't First Due just build it?

Our intended buyers are pre-plan software vendors such as First Due, Tablet Command and ESO: we'd provide a resolved building layer via API/MCP inside their existing workflow. The commercial hypothesis is that maintaining source adapters, joins and freshness across cities is valuable; we haven't validated paid demand or a defensible moat yet.

## 7. What about privacy?

The pipeline drops personal contact details and the demo avoids tenant and permit-holder names. We use public building records and aggregate incident information; public availability still requires minimisation. Crew notes are session-only, and subsequent AI requests include those notes, so users should not enter personal information.

## 8. Does “maps to NFPA 1660” mean this is certified or compliant?

It describes coverage of pre-incident planning elements using the NFPA 1620 element text referenced by our research. It is not certification. Individual rule checks show their citation, evidence and unknowns; they do not establish whole-building compliance.

## Presenter checks before judging

- Read the actual eval totals and timestamp from the published run. If missing, say the model eval is pending; unit tests are a separate result.
- Confirm the saved-answer fixtures exist before promising question answering offline.
- Do not imply a struck line saved to temporary server storage has durable retention on the deployed host.
- Use the source count supplied by Rishit. “88 sources queried” does not mean 88 successful datasets with records for every building.
- Vendor names are prospective buyers; no current customer or agency endorsement is claimed.
