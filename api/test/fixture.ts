// Small 400 Duboce building for tests, shaped by the contract; values from plan.md section 3.
import type { Building, Evidence, Pin } from "../../shared/building.ts";

const ev = (datasetId: string, recordId: string, asOf: string, rule: string): Evidence => ({
  source: "DataSF", datasetId, recordId, url: `https://data.sf.gov/resource/${datasetId}.json`, asOf, rule,
});
const pin = (p: Partial<Pin> & Pick<Pin, "id" | "layer" | "label" | "detail">): Pin => ({
  origin: "public", severity: "info", anchor: { kind: "building" }, claim: "verified", evidence: [], stale: false, ...p,
});

export function hero(): Building {
  return {
    id: "sf-0874003", apn: "0874003", address: "400 Duboce Ave",
    centroid: { lat: 37.7695, lon: -122.4295 },
    footprint: [[-10, -8], [10, -8], [10, 8], [-10, 8]],
    heightM: 13.8, floors: 4, floorHeightM: 3.45, yearBuilt: 1905, constructionType: "5 (permits)",
    units: 79, rooms: null,
    pins: [
      pin({ id: "construction-mode", layer: "construction", label: "TYPE 5, 4 STORIES", detail: "Type 5 wood frame, 4 stories per permits.", evidence: [ev("i98e-djp9", "mode", "2024-07-02", "mode across permits")] }),
      pin({ id: "occupancy-units", layer: "occupancy", label: "UNITS: 78 OR 79", detail: "Tax roll says 78 units; permits say 79.", claim: "conflict", evidence: [ev("wv5m-vpq2", "0874003", "2025-01-01", "apn"), ev("i98e-djp9", "mode", "2024-07-02", "mode")] }),
      pin({ id: "permit-201910044012", layer: "permit", severity: "danger", label: "UNIT 311 STRUCTURAL WORK", detail: "2019 permit: unit 311, 3rd floor, partial demo of load-bearing wall.", anchor: { kind: "floor", floor: 3 }, evidence: [ev("i98e-djp9", "201910044012", "2019-10-04", "unit 311 -> floor 3")] }),
      pin({ id: "permit-solar", layer: "permit", label: "SOLAR HOT WATER, 3,000 GAL", detail: "2019 permit: solar hot water system, 3,000 gallon tank, location not stated.", anchor: { kind: "roof" }, evidence: [ev("i98e-djp9", "2019solar", "2019-03-01", "keyword solar")] }),
      pin({ id: "softstory-0874003", layer: "softstory", label: "SOFT-STORY: RETROFIT COMPLETE", detail: "Soft-story tier 2, work complete, CFC issued.", anchor: { kind: "floor", floor: 1 }, evidence: [ev("beah-shgi", "874-3", "2026-10-07", "block+lot")] }),
      pin({ id: "inspection-r2-2026", layer: "inspection", label: "R2 COMPANY INSPECTION", detail: "R2 Company Inspection, status Completed.", evidence: [ev("wb4c-6hwj", "insp1", "2026-08-04", "within 15 m")] }),
      pin({ id: "inspection-r2-2025", layer: "inspection", label: "R2 COMPANY INSPECTION", detail: "R2 Company Inspection, status Completed.", evidence: [ev("wb4c-6hwj", "insp0", "2025-08-14", "within 15 m")] }),
      pin({ id: "violation-alarm", layer: "violation", label: "ALARM SYSTEM MAINTAINED", detail: "Alarm system maintained, status abated.", evidence: [ev("4zuq-2cbe", "v1", "2025-10-14", "eas_id")] }),
      pin({ id: "incident-2003", layer: "incident", label: "BUILDING FIRE 2003", detail: "Building fire, 2003-05-25.", stale: true, evidence: [ev("wr8u-xric", "03001", "2003-05-25", "address")] }),
      pin({ id: "dispatch-1", layer: "dispatch", origin: "dispatch", severity: "danger", label: "SMOKE FROM UNIT 311", detail: "Dispatch: smoke from unit 311.", anchor: { kind: "floor", floor: 3 } }),
      pin({ id: "permit-bogus", layer: "permit", label: "NO EVIDENCE", detail: "Public pin without evidence.", claim: "unverifiable" }),
    ],
    conflicts: [{ id: "c-units", field: "units", departmentPinId: "", publicPinId: "occupancy-units", summary: "Tax roll 78 units, permits 79", pinIds: ["occupancy-units"] }],
    unknowns: ["stairs", "standpipe"],
    layers: [{ layer: "violation", status: "ok" }, { layer: "inspection", status: "ok" }],
    resolution: { apn: "0874003", easBaseId: null, aliases: ["50 CHURCH ST", "400 DUBOCE AVE"], links: [] },
    fetchedAt: "2026-10-22T19:00:00Z",
  };
}
