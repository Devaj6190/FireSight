// FireSight Building JSON contract (plan.md section 5, frozen 12:15).
// Changes only by board line + Vidyut's OK. Fields marked "additive" were added by Lane B
// at 12:15 as optional/widened fields only; nothing in the plan.md contract was removed.

export type Severity = "danger" | "caution" | "info";
export type Origin = "public" | "dispatch" | "crew" | "department";
export type Claim = "verified" | "unverifiable" | "conflict";

export type Anchor =
  | { kind: "building" }
  | { kind: "floor"; floor: number } // 1 = ground, 0 = basement (only if a record says basement)
  | { kind: "roof" }
  | { kind: "ground"; bearingDeg: number; distanceM: number };

export interface Evidence {
  source: string; // "DataSF Building Permits"
  datasetId: string; // "i98e-djp9"
  recordId: string; // "201910044012"
  url: string; // row or query URL that returns this record
  asOf: string; // ISO date of the record
  rule: string; // how it was placed: "unit 311 -> floor 3"
}

export interface Pin {
  id: string; // "<layer>-<recordId>", unique per building
  layer:
    | "construction" | "occupancy" | "permit" | "violation" | "nov" | "softstory" | "incident" | "inspection"
    | "complaint" | "calls" | "water" | "wind" | "dispatch" | "crew_note" | "preplan"
    // additive: extra public layers found in the data sweep
    | "fire_permit" | "station" | "aerial" | "exposure" | "hazmat" | "geo" | "history" | "air";
  origin: Origin;
  severity: Severity;
  label: string; // 3 to 6 words, upper case on chip
  detail: string; // one plain sentence
  anchor: Anchor;
  claim: Claim; // verified needs >= 1 evidence; conflict needs a Conflict entry
  evidence: Evidence[]; // empty only when claim = "unverifiable" or origin != "public"
  stale: boolean; // asOf older than 5 years
}

export interface LayerStatus {
  layer: Pin["layer"] | string; // additive: widened so each dataset gets its own row ("permits", "esf4_hydrants")
  status: "ok" | "no_records" | "fetch_failed";
  asOf?: string;
  ms?: number;
  datasetId?: string; // additive
  source?: string; // additive: human name for the sources drawer
  records?: number; // additive: rows matched
  fetchedAt?: string; // additive: date of this fetch attempt
  lastGoodAt?: string | null; // additive: date of the last successful fetch (kept when status is fetch_failed)
}

export interface Conflict {
  id: string;
  field: string; // "fire_alarm", "units"
  departmentPinId: string; // origin "department" or "crew"; "" for public-vs-public conflicts
  publicPinId: string; // newest dated public record
  summary: string; // "Pre-plan 2019 lists old panel; 2024 permit upgraded alarm"
  pinIds?: string[]; // additive: every pin in the disagreement (public-vs-public, e.g. 78 vs 79 units)
}

export interface BriefLine {
  id: string; // "b1"
  text: string;
  pinIds: string[]; // all present in building.pins; empty only for an UNVERIFIABLE line
  claim: Claim;
  element?: string; // pre-plan standard element it fills (ids from research-regs.md)
  status: "pending" | "approved" | "struck";
}

export interface Brief {
  buildingId: string;
  lines: BriefLine[];
  unknowns: string[];
  model: string;
  createdAt: string;
}

export interface Answer {
  question: string;
  text: string;
  pinIds: string[]; // citations
  claim: Claim;
  highlight: { floors: number[]; pinIds: string[] };
  unknowns: string[]; // facts asked for with no public record
}

export interface ResolutionLink {
  datasetId: string; // "i98e-djp9"
  method: "apn" | "eas" | "address_norm" | "address_range" | "spatial";
  key: string; // "0874/003", "eas 364715", "1018-1024 MISSION ST", "within 15 m"
  confidence: "exact" | "high" | "medium" | "low"; // apn/eas exact, normalized equal high, range medium, spatial low
  records: number; // rows matched
  example: string; // one raw address string as the source wrote it
}

export interface Resolution {
  apn: string;
  easBaseId: string | null;
  aliases: string[];
  links: ResolutionLink[];
}

export interface Building {
  id: string; // "sf-0874003" (block + lot, no separators)
  apn: string; // "0874003"
  address: string; // display address "400 Duboce Ave"
  centroid: { lat: number; lon: number };
  footprint: [number, number][]; // largest outer ring, meters, x east, y north, CCW, origin at centroid
  neighbors?: { id: string; footprint: [number, number][]; heightM: number; pins: Pin[] }[]; // exposures, after CP2
  heightM: number;
  floors: number;
  floorHeightM: number; // heightM / floors
  yearBuilt: number | null;
  constructionType: string | null; // raw code + source, e.g. "5 (permits)"; null renders UNKNOWN
  units: number | null;
  rooms: number | null;
  use?: string | null; // additive: "Multi-Family Residential (assessor)"
  pins: Pin[];
  conflicts: Conflict[];
  unknowns: string[];
  layers: LayerStatus[];
  resolution: Resolution;
  fetchedAt: string;
  fallback?: { brief: Brief; answers: Answer[] }; // precomputed, used when offline or slow
  floorFacts?: FloorFacts[]; // additive: one entry per floor (B1 only if a record says basement), bottom to top
}

// Per-floor summary (additive, Lane B builds it): everything the public record says about one floor,
// including floors with no pin. Units and permits are lower bounds; nothing here is a floor plan.
export interface FloorFacts {
  floor: number; // contract numbering: 0 = B1, 1 = ground
  label: string; // "Floor 22", "B1"
  pinIds: string[]; // pins anchored to this floor, danger first
  severity: Severity | null; // worst pin severity on the floor; null when no pin
  units: string[]; // unit / suite numbers named in permits for this floor (lower bound)
  permits: {
    count: number; // permits whose text names this floor or one of its units
    last: { date: string; text: string; datasetId: string; recordId: string; url: string } | null; // newest one
  };
  incidents: number; // SFFD incidents whose floor of origin is this floor
  occupantLoad: number | null; // from SFFD assembly permits naming this floor
  rooms: string[]; // rooms named in records: "Computer room", "Server room", "Fire pump room"
  notOnRecord: string[]; // facts with no public record for this floor, e.g. "Stair locations"
}

// Compliance strip (Lane C owns the logic, Lane D renders).
export interface ComplianceRow {
  id: "C1" | "C3" | "C4" | "C5" | "C7" | "C8"; // additive 13:05: C5 energy storage, C7 high-rise inspection
  rule: string; // "Annual fire inspection, apartments and hotels"
  citation: string; // "Cal. H&SC 13146.2"
  result: "pass" | "fail" | "unknown" | "partial";
  summary: string; // "R2 Company Inspection completed 2026-08-04"
  pinIds: string[]; // evidence pins in building.pins
  wording: "meets" | "rule logic meets" | "maps to"; // what we are allowed to say
}
