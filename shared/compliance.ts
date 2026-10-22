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
    summary: last ? `None open. Last item ${latestAsOf(last).slice(0, 10)}, closed.` : "No fire violations on record.",
    pinIds: last ? [last.id] : [],
  };
}

// Longest distance between footprint vertices, meters.
export function longestAxisM(footprint: [number, number][]): number {
  let max = 0;
  for (const a of footprint) for (const c of footprint) max = Math.max(max, Math.hypot(a[0] - c[0], a[1] - c[1]));
  return max;
}

export function solarPathways(b: Building): ComplianceRow {
  const base = { id: "C4" as const, rule: "Rooftop solar access pathways", citation: "CA Fire Code 2025 §1205", wording: "rule logic meets" as const };
  const solar = b.pins.filter((p) => p.layer === "permit" && SOLAR.test(text(p)));
  if (!solar.length) {
    return { ...base, result: "pass", summary: "Not triggered: no solar permit on record.", pinIds: [] };
  }
  const axisFt = longestAxisM(b.footprint) * 3.28084;
  const perimeter = axisFt <= 250 ? "4 ft" : "6 ft";
  return {
    ...base,
    result: "unknown",
    summary: `Solar permit on file; roof layout not public. Rule that applies: ${perimeter} clear perimeter (longest axis ${Math.round(axisFt)} ft).`,
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

export function evaluateCompliance(b: Building, today = new Date()): ComplianceRow[] {
  const { counts: _counts, ...c8 } = preplanCoverage(b);
  return [annualInspection(b, today), openViolations(b), solarPathways(b), c8];
}
