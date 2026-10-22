// Spoken size-up, built only from the building's cited records: no model, instant, works offline.
// Each fact carries its source and year ("per fire permit 2017"), the radio form of a citation (design.md s6 rule 9).
import type { Building, Pin } from "./building.ts";
import { evaluateCompliance } from "./compliance.ts";

const SPOKEN_SOURCE: Record<string, string> = {
  "893e-xam6": "fire permit",
  "i98e-djp9": "building permit",
  "tyz3-vt28": "building permit",
  "wr8u-xric": "incident record",
  "4zuq-2cbe": "fire violation record",
  "wb4c-6hwj": "S F F D inspection",
  "5kya-mfst": "tall building inventory",
  "ynuv-fyni": "LiDAR",
  "wv5m-vpq2": "tax roll",
  "beah-shgi": "soft-story list",
};
const RANK = { danger: 0, caution: 1, info: 2 } as const;

export function spokenSource(p: Pin): string {
  const e = p.evidence[0];
  if (!e) return p.origin === "public" ? "" : `per ${p.origin}`;
  const name = SPOKEN_SOURCE[e.datasetId] ?? e.source.replace(/^DataSF\s+/, "").replace(/^(SFFD|DBI)\s+/, "").toLowerCase();
  return `per ${name} ${e.asOf.slice(0, 4)}`;
}

// "BATTERY ROOM 33.6 GAL" -> "Battery room 33.6 gallons"; spoken units and abbreviations.
export function speakable(label: string): string {
  const s = label
    .toLowerCase()
    .replace(/\bgal\b/g, "gallons")
    .replace(/\bft\b/g, "feet")
    .replace(/\bm\b/g, "meters")
    .replace(/\bb1\b/g, "B 1")
    .replace(/\s*[·|]\s*/g, ", ")
    .replace(/:\s*/g, ", ")
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const cite = (p: Pin) => [speakable(p.label), spokenSource(p)].filter(Boolean).join(", ");
const floorName = (f: number) => (f === 0 ? "basement level B 1" : `floor ${f}`);
const isPeople = (p: Pin) => /\b(people|persons|occupants|units|rooms)\b/i.test(p.label);

export type Beat = { text: string; floors: number[]; pinIds: string[] };
const beat = (text: string, pins: Pin[] = [], extra: number[] = []): Beat => ({
  text,
  floors: [...new Set([...extra, ...pins.flatMap((p) => (p.anchor.kind === "floor" ? [p.anchor.floor] : []))])],
  pinIds: pins.map((p) => p.id),
});

// One beat per spoken sentence; each carries the floors and pins it talks about, so the model lights up as it is read.
export function spokenBeats(b: Building, max = 9): Beat[] {
  const used = new Set<string>();
  const take = (p: Pin) => (used.add(p.id), p);
  const out: Beat[] = [];
  const type = b.constructionType?.match(/^\s*(\d|[A-D])\b/)?.[1];
  out.push(beat(`${b.address}. ${b.floors} stories${type ? `, type ${type}` : ""}${b.yearBuilt ? `, built ${b.yearBuilt}` : ""}.`));

  const dispatch = b.pins.find((p) => p.origin === "dispatch");
  const target = dispatch?.anchor.kind === "floor" ? dispatch.anchor.floor : null;
  if (dispatch) {
    const said = dispatch.label.toLowerCase().replace(/^dispatch:?\s*/, "");
    out.push(beat(`Dispatch reports ${said}${target !== null && !/\bfloor\b/.test(said) ? `, ${floorName(target)}` : ""}.`, [dispatch]));
  }

  const verified = b.pins.filter((p) => p.origin === "public" && p.claim !== "unverifiable" && p.evidence.length);
  if (target !== null) {
    const here = verified
      .filter((p) => p.anchor.kind === "floor" && Math.abs(p.anchor.floor - target) <= 1)
      .sort((x, y) => RANK[x.severity] - RANK[y.severity])
      .slice(0, 3)
      .map(take);
    if (here.length) out.push(beat(`Near the fire floor: ${here.map(cite).join(". ")}.`, here));
    else out.push(beat(`No public record places a hazard on ${floorName(target)}.`, [], [target]));
  }

  const people = verified.filter((p) => isPeople(p) && !used.has(p.id)).slice(0, 2).map(take);
  if (people.length) out.push(beat(`People: ${people.map(cite).join(". ")}.`, people));

  const hazards = verified
    .filter((p) => !used.has(p.id) && p.severity !== "info")
    .sort((x, y) => RANK[x.severity] - RANK[y.severity])
    .slice(0, 2)
    .map(take);
  if (hazards.length) out.push(beat(`Also: ${hazards.map(cite).join(". ")}.`, hazards));

  const conflict = b.conflicts[0];
  if (conflict) {
    const ids = conflict.pinIds ?? [conflict.publicPinId, conflict.departmentPinId];
    out.push(beat(`Conflict, records disagree: ${speakable(conflict.summary.replace(/\(.*?\)/g, "")).replace(/[\s.]+$/, "")}.`, b.pins.filter((p) => ids.includes(p.id))));
  }

  const inspection = evaluateCompliance(b).find((r) => (r.id === "C7" || r.id === "C1") && r.result !== "unknown");
  if (inspection) out.push(beat(`${inspection.rule}: ${inspection.result === "pass" ? "current" : "overdue"}, per S F F D records.`));

  if (b.unknowns.length) out.push(beat(`Unverifiable, no public record: ${b.unknowns.slice(0, 3).join(", ")}.`));
  return out.slice(0, max);
}

export function spokenSizeUp(b: Building, max = 9): string[] {
  return spokenBeats(b, max).map((x) => x.text);
}
