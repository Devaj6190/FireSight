// detectConflicts: pure. Re-run whenever a department or crew pin is added.
// Keeps public-vs-public conflicts already in the fixture (e.g. 78 vs 79 units) and adds
// department/crew-vs-public conflicts on the same field.
import type { Building, Conflict, Pin } from "./building";

type Field = "units" | "stories" | "sprinkler" | "fire_alarm" | "solar" | "battery" | "softstory" | "elevator" | "basement";

const FIELDS: [Field, RegExp][] = [
  ["units", /\bunits?\b|\bapartments?\b/i],
  ["stories", /\bstor(?:y|ies|eys?)\b|\bfloors\b/i],
  ["sprinkler", /sprinkl/i],
  ["fire_alarm", /fire alarm|\bfacp\b|alarm panel|nfpa 72/i],
  ["solar", /solar|photovoltaic|\bpv\b/i],
  ["battery", /battery|energy storage|\bess\b|lithium/i],
  ["softstory", /soft[- ]story/i],
  ["elevator", /elevator/i],
  ["basement", /basement/i],
];
const NEGATION = /\b(no|none|not|without|absent|removed|n\/a)\b/i;

const text = (p: Pin) => `${p.label} ${p.detail}`;
const fieldsOf = (p: Pin): Field[] => FIELDS.filter(([, re]) => re.test(text(p))).map(([f]) => f);
const numberFor = (p: Pin, f: Field): number | null => {
  const re = f === "units" ? /(\d{1,4})\s*(?:residential\s+)?(?:units?|apartments?)/i : /(\d{1,3})\s*(?:stor(?:y|ies|eys?)|floors)/i;
  const m = text(p).match(re);
  return m ? Number(m[1]) : null;
};
const newest = (p: Pin) => p.evidence.reduce((a, e) => (e.asOf > a ? e.asOf : a), "");

export function detectConflicts(building: Building): Conflict[] {
  const keep = building.conflicts.filter((c) => c.departmentPinId === "");
  const local = building.pins.filter((p) => p.origin === "department" || p.origin === "crew");
  const pub = building.pins.filter((p) => p.origin === "public" && p.claim !== "unverifiable");
  const out: Conflict[] = [...keep];

  for (const lp of local) {
    for (const f of fieldsOf(lp)) {
      const matches = pub.filter((p) => fieldsOf(p).includes(f)).sort((a, b) => newest(b).localeCompare(newest(a)));
      if (!matches.length) continue;
      const pp = matches[0];
      let summary: string | null = null;
      if (f === "units" || f === "stories") {
        const a = numberFor(lp, f);
        const b = numberFor(pp, f) ?? (f === "units" ? building.units : building.floors);
        if (a !== null && b !== null && a !== b) summary = `${lp.origin === "crew" ? "Crew note" : "Pre-plan"} says ${a} ${f}; ${pp.evidence[0]?.source ?? "public record"} (${newest(pp)}) says ${b}.`;
      } else if (NEGATION.test(text(lp)) !== NEGATION.test(text(pp))) {
        summary = `${lp.origin === "crew" ? "Crew note" : "Pre-plan"}: "${lp.label}"; newer public record (${newest(pp)}): "${pp.label}".`;
      }
      if (summary) {
        out.push({ id: `conflict-${f}-${lp.id}`, field: f, departmentPinId: lp.id, publicPinId: pp.id, summary, pinIds: [lp.id, pp.id] });
      }
    }
  }
  return out;
}

/** Apply detectConflicts and relabel the pins involved as "conflict". Returns a new Building. */
export function withConflicts(building: Building): Building {
  const conflicts = detectConflicts(building);
  const ids = new Set(conflicts.flatMap((c) => c.pinIds ?? [c.departmentPinId, c.publicPinId]).filter(Boolean));
  return { ...building, conflicts, pins: building.pins.map((p) => (ids.has(p.id) ? { ...p, claim: "conflict" } : p)) };
}
