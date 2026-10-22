// Compliance strip rules (Lane C). Spec: docs/plan/research-regs.md section 6.
// Pure function of the Building JSON; UNKNOWN is never shown as FAIL.
//
// Pin conventions this relies on (Lane B):
// - SFFD inspections (wb4c-6hwj) are layer "inspection"; label or detail names the inspection type
//   ("R2 COMPANY INSPECTION") and the status ("Completed"); evidence[0].asOf is the inspection date.
// - Fire violations (4zuq-2cbe) are layer "violation"; detail includes the status as written
//   ("open", "order to abate", "referred to hearing", "abated", "closed", "rescinded").
// - Permits are layer "permit"; label or detail carries the permit description keywords.
import type { Building, ComplianceRow, Pin } from "./building.ts";
import { ELEMENTS, elementPins, type Coverage } from "./elements.ts";

const DAY = 86_400_000;
const OPEN = /\b(open|order to abate|referred to hearing)\b/i;
const CLOSED = /\b(abated|closed|rescinded|complied)\b/i;
const SOLAR = /\b(solar|photovoltaic|pv)\b/i;

const text = (p: Pin) => `${p.label} ${p.detail}`;
const latestAsOf = (p: Pin) => p.evidence.map((e) => e.asOf).sort().at(-1) ?? "";
const layerFailed = (b: Building, ...names: string[]) =>
  b.layers.some((l) => names.includes(String(l.layer)) && l.status === "fetch_failed");

export function annualInspection(b: Building, today: Date): ComplianceRow {
  const base = {
    id: "C1" as const,
    rule: "Annual fire inspection, apartments and hotels",
    citation: "Cal. H&SC 13146.2(a)",
    wording: "meets" as const,
  };
  const r2 = b.pins
    .filter((p) => p.layer === "inspection" && /\bR-?2\b/i.test(text(p)) && /complet/i.test(text(p)) && p.evidence.length)
    .sort((x, y) => latestAsOf(y).localeCompare(latestAsOf(x)));
  if (!r2.length) {
    return { ...base, result: "unknown", summary: "No completed R2 inspection found in SFFD inspection records.", pinIds: [] };
  }
  const last = r2[0];
  const date = latestAsOf(last).slice(0, 10);
  const days = Math.floor((today.getTime() - Date.parse(date)) / DAY);
  return {
    ...base,
    result: days <= 365 ? "pass" : "fail",
    summary: `R2 Company Inspection completed ${date}, ${days} days ago.`,
    pinIds: [last.id],
  };
}

export function openViolations(b: Building): ComplianceRow {
  const base = { id: "C3" as const, rule: "Open fire code violations", citation: "SF Fire Code, SFFD violation record", wording: "meets" as const };
  const all = b.pins.filter((p) => p.layer === "violation");
  if (layerFailed(b, "violation", "fire_violations", "4zuq-2cbe")) {
    return { ...base, result: "unknown", summary: "Fire violation records could not be fetched.", pinIds: [] };
  }
  const open = all.filter((p) => OPEN.test(p.detail) && !CLOSED.test(p.detail));
  if (open.length) {
    return { ...base, result: "fail", summary: `${open.length} open: ${open.map((p) => p.label).join("; ")}.`, pinIds: open.map((p) => p.id) };
  }
  const last = [...all].sort((x, y) => latestAsOf(y).localeCompare(latestAsOf(x)))[0];
  return {
    ...base,
    result: "pass",
    summary: last ? `None open. Last item ${latestAsOf(last).slice(0, 10)}, resolved.` : "No fire violations on record.",
    pinIds: last ? [last.id] : [],
  };
}

// Sides of the minimum-area rectangle around the footprint, meters [short, long].
// CFC 1205.3.1 gives the 4 ft perimeter "where either axis of the building is 250 feet or less".
export function footprintAxesM(footprint: [number, number][]): [number, number] {
  let best: [number, number] = [0, 0];
  let bestArea = Infinity;
  for (let i = 0; i < footprint.length; i++) {
    const [ax, ay] = footprint[i];
    const [bx, by] = footprint[(i + 1) % footprint.length];
    const len = Math.hypot(bx - ax, by - ay);
    if (!len) continue;
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, y] of footprint) {
      const u = x * ux + y * uy, v = -x * uy + y * ux;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const w = maxU - minU, h = maxV - minV;
    if (w * h < bestArea) { bestArea = w * h; best = [Math.min(w, h), Math.max(w, h)]; }
  }
  return best;
}

export function solarPathways(b: Building): ComplianceRow {
  const base = { id: "C4" as const, rule: "Rooftop solar access pathways", citation: "CA Fire Code 2025 §1205", wording: "rule logic meets" as const };
  const solar = b.pins.filter((p) => p.layer === "permit" && SOLAR.test(text(p)));
  if (!solar.length) {
    return { ...base, result: "pass", summary: "Not triggered: no solar permit on record.", pinIds: [] };
  }
  const [shortFt, longFt] = footprintAxesM(b.footprint).map((m) => Math.round(m * 3.28084));
  const perimeter = shortFt <= 250 ? "4 ft" : "6 ft";
  return {
    ...base,
    result: "unknown",
    summary: `Solar permit on file; roof layout not public. Rule that applies: ${perimeter} clear perimeter (footprint ${shortFt} x ${longFt} ft).`,
    pinIds: solar.map((p) => p.id),
  };
}

// C8: coverage of pre-incident plan elements. Coverage is what SF public data can fill for an element;
// an element drops to "officer" when every layer that feeds it failed to fetch.
export function preplanCoverage(b: Building): ComplianceRow & { counts: Record<Coverage, number> } {
  const counts: Record<Coverage, number> = { filled: 0, partial: 0, officer: 0 };
  const pinIds = new Set<string>();
  for (const el of ELEMENTS) {
    const failed = el.layers.length > 0 && el.layers.every((l) => layerFailed(b, l));
    const cov: Coverage = failed ? "officer" : el.coverage;
    counts[cov]++;
    if (cov !== "officer") elementPins(b, el).forEach((p) => pinIds.add(p.id));
  }
  return {
    id: "C8",
    rule: "Pre-incident plan elements",
    citation: "NFPA 1660 (2024), via NFPA 1620-2020 clauses",
    result: "partial",
    summary: `${counts.filled} filled, ${counts.partial} partial, ${counts.officer} need the officer, of ${ELEMENTS.length}.`,
    pinIds: [...pinIds],
    wording: "maps to",
    counts,
  };
}

const RESIDENTIAL = /\b(residential|apartment|dwelling|hotel|motel|sro|lodging|condo)/i;
const HIGH_RISE_M = 22.86; // 75 ft, CBC 202 high-rise definition (REPORTED in research-regs.md)
const BATTERY = /\b(batter(y|ies)|energy storage|powerwall|\bess\b|ups)\b/i;
const NOT_ESS = /\b(garage door|smoke (alarm|detector)|alarm panel batter)/i;

// C1 applies to apartments and hotels (H&SC 17921(b)); an office tower gets C7 instead.
export function isResidential(b: Building): boolean {
  return RESIDENTIAL.test(b.use ?? "") || (b.units ?? 0) >= 3 || b.pins.some((p) => p.layer === "inspection" && /\bR-?[12]\b/i.test(text(p)));
}

export function highRiseInspection(b: Building, today: Date): ComplianceRow {
  const base = {
    id: "C7" as const,
    rule: "High-rise annual inspection",
    citation: "SFFD High Rise Annual Inspection program; high-rise over 75 ft",
    wording: "rule logic meets" as const,
  };
  const hr = b.pins
    .filter((p) => p.layer === "inspection" && /high[- ]?rise/i.test(text(p)) && /complet/i.test(text(p)) && p.evidence.length)
    .sort((x, y) => latestAsOf(y).localeCompare(latestAsOf(x)));
  if (!hr.length) {
    return { ...base, result: "unknown", summary: `Over 75 ft (${Math.round(b.heightM * 3.28084)} ft); no completed high-rise inspection found in SFFD records.`, pinIds: [] };
  }
  const date = latestAsOf(hr[0]).slice(0, 10);
  const days = Math.floor((today.getTime() - Date.parse(date)) / DAY);
  return { ...base, result: days <= 365 ? "pass" : "fail", summary: `High Rise Annual Inspection completed ${date}, ${days} days ago.`, pinIds: [hr[0].id] };
}

// C5: CFC 1207 thresholds by battery type (Table 1207.1.3). Never FAIL: capacity is rarely on record.
export function energyStorage(b: Building): ComplianceRow | null {
  const ess = b.pins.filter((p) => ["permit", "fire_permit", "hazmat"].includes(p.layer) && BATTERY.test(text(p)) && !NOT_ESS.test(text(p)));
  if (!ess.length) return null;
  const kwh = ess.map((p) => text(p).match(/(\d+(?:\.\d+)?)\s*kwh/i)?.[1]).filter(Boolean).map(Number);
  const floors = [...new Set(ess.flatMap((p) => (p.anchor.kind === "floor" ? [p.anchor.floor] : [])))].sort((x, y) => x - y);
  const where = floors.length ? `floor${floors.length > 1 ? "s" : ""} ${floors.join(", ")}` : "location not stated";
  return {
    id: "C5",
    rule: "Battery energy storage",
    citation: "CA Fire Code 2025 §1207.1.3 (Li-ion 20 kWh, lead-acid 70 kWh)",
    result: kwh.length && Math.max(...kwh) > 20 ? "partial" : "unknown",
    summary: kwh.length
      ? `Battery storage on ${where}, up to ${Math.max(...kwh)} kWh on record; §1207 applies above the threshold for its type.`
      : `Battery storage on ${where}; capacity in kWh not on record, so whether §1207 applies is unknown.`,
    pinIds: ess.map((p) => p.id),
    wording: "rule logic meets",
  };
}

export function evaluateCompliance(b: Building, today = new Date()): ComplianceRow[] {
  const { counts: _counts, ...c8 } = preplanCoverage(b);
  const rows: (ComplianceRow | null)[] = [
    isResidential(b) ? annualInspection(b, today) : null,
    b.heightM > HIGH_RISE_M ? highRiseInspection(b, today) : null,
    openViolations(b),
    solarPathways(b),
    energyStorage(b),
    c8,
  ];
  return rows.filter((r): r is ComplianceRow => r !== null);
}
