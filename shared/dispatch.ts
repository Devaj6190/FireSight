// parseDispatch: free-text dispatch line -> a `dispatch` Pin anchored to the floor the call names.
// "Structure fire, 400 Duboce Ave, smoke from unit 311" -> floor 3 (unit 311 -> floor 3).
import type { Anchor, Building, Pin } from "./building";

export interface ParsedDispatch {
  callType: string | null; // "Structure fire"
  address: string | null; // "400 Duboce Ave"
  unit: string | null; // "311"
  floor: number | null; // 3 (0 = basement)
  roof: boolean;
  notes: string; // the rest of the line, e.g. "smoke from unit 311"
}

const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};
const ADDRESS_RE =
  /\b(\d{1,5}(?:\s*-\s*\d{1,5})?)\s+([A-Za-z0-9' ]+?)\s+(st|street|ave|av|avenue|blvd|boulevard|way|wy|pl|place|dr|drive|ter|terrace|ct|court|ln|lane|rd|road|hwy|alley|aly)\b\.?/i;
const UNIT_RE = /\b(?:unit|apt\.?|apartment|suite|ste\.?|room|rm\.?|#)\s*#?\s*([0-9]{1,4}[a-z]?)\b/i;
const FLOOR_NUM_RE = /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:fl(?:oo)?r?|flr|story|storey)\b|\bfloor\s*(\d{1,2})\b/i;
const FLOOR_WORD_RE = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(?:fl(?:oo)?r?|flr|story|storey)\b/i;

export function parseDispatchText(text: string): ParsedDispatch {
  const t = text.trim();
  const parts = t.split(/[,;]\s*/);
  const callType = parts.length > 1 && !/\d/.test(parts[0]) ? parts[0] : null;
  const addr = t.match(ADDRESS_RE);
  const address = addr ? addr[0].replace(/\s+/g, " ").replace(/\.$/, "") : null;
  const afterAddr = addr ? t.slice((addr.index ?? 0) + addr[0].length) : t;
  // the unit can come before the address too: "Smoke from unit 311, 400 Duboce Ave"
  const unitM = afterAddr.match(UNIT_RE) ?? t.match(UNIT_RE);
  const unit = unitM ? unitM[1] : null;

  let floor: number | null = null;
  const fn = t.match(FLOOR_NUM_RE);
  const fw = t.match(FLOOR_WORD_RE);
  if (/\b(basement|cellar|sub-?level)\b/i.test(t)) floor = 0;
  else if (fn) floor = Number(fn[1] ?? fn[2]);
  else if (fw) floor = ORDINALS[fw[1].toLowerCase()];
  else if (/\bground floor\b|\blobby\b/i.test(t)) floor = 1;
  else if (unit && /^\d{3,4}/.test(unit)) floor = Math.floor(Number(unit.match(/^\d+/)![0]) / 100); // 311 -> 3, 1204 -> 12

  const roof = /\broof|attic|penthouse\b/i.test(t);
  const notes = parts.filter((p) => p !== callType && !(address && p.includes(address.split(" ")[0]) && ADDRESS_RE.test(p))).join(", ");
  return { callType, address, unit, floor, roof, notes };
}

/** Build the dispatch pin. Pass the building to clamp the floor to what exists (never above `floors`). */
export function parseDispatch(text: string, building?: Pick<Building, "floors">, receivedAt = new Date().toISOString()): Pin {
  const d = parseDispatchText(text);
  let anchor: Anchor = { kind: "building" };
  let rule = "no floor in the dispatch line";
  if (d.roof) {
    anchor = { kind: "roof" };
    rule = "dispatch mentions roof/attic";
  } else if (d.floor !== null && (!building || d.floor <= building.floors)) {
    anchor = { kind: "floor", floor: d.floor };
    rule = d.unit && !/floor|flr|fl\b|story|basement|ground/i.test(text) ? `unit ${d.unit} -> floor ${d.floor}` : `dispatch names floor ${d.floor}`;
  } else if (d.floor !== null && building) {
    rule = `dispatch floor ${d.floor} is above the building's ${building.floors} floors; pinned to building`;
  }
  const where = anchor.kind === "floor" ? (anchor.floor === 0 ? "BASEMENT" : `FLOOR ${anchor.floor}`) : anchor.kind === "roof" ? "ROOF" : "BUILDING";
  const label = `${(d.callType ?? "DISPATCH").toUpperCase()}: ${d.unit ? `UNIT ${d.unit}` : where}`.slice(0, 48);
  return {
    id: `dispatch-${receivedAt.replace(/\D/g, "").slice(0, 14)}`,
    layer: "dispatch",
    origin: "dispatch",
    severity: "danger",
    label,
    detail: `Dispatch: "${text.trim()}"${anchor.kind === "floor" ? ` (${rule}).` : "."}`,
    anchor,
    claim: "verified",
    evidence: [
      { source: "Dispatch (CAD)", datasetId: "dispatch", recordId: receivedAt, url: "", asOf: receivedAt.slice(0, 10), rule },
    ],
    stale: false,
  };
}
