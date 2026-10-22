// The grounding gate. Every line the model writes must cite pins that exist in this building,
// and its label must be backed by those pins. Anything else is dropped and counted.
import type { Answer, BriefLine, Building, Pin } from "../../../shared/building.ts";
import type { DraftAnswer, DraftLine } from "./schema.ts";

export type DropReason =
  | "empty_text"
  | "unknown_pin" // cites a pin id that is not in building.pins
  | "uncited" // verified or conflict line with no pins
  | "unsupported_verified" // verified line, but no cited pin is itself verified with evidence
  | "unsupported_conflict" // conflict line, but no cited pin is in a recorded conflict
  | "unverifiable_asserts"; // unverifiable line that states a fact instead of "Unknown: ..."

export interface Dropped { text: string; pinIds: string[]; claim: string; reason: DropReason }

const isBacked = (p: Pin) => p.claim === "verified" && (p.evidence.length > 0 || p.origin !== "public");

function conflictPinIds(b: Building): Set<string> {
  const ids = new Set(b.pins.filter((p) => p.claim === "conflict").map((p) => p.id));
  for (const c of b.conflicts) {
    for (const id of [c.publicPinId, c.departmentPinId, ...(c.pinIds ?? [])]) if (id) ids.add(id);
  }
  return ids;
}

// An unverifiable brief line may only name what is unknown, never assert it.
export const UNKNOWN_LINE = /^unknown:/i;

export function checkLine(b: Building, line: Pick<DraftLine, "text" | "pinIds" | "claim">): DropReason | null {
  if (!line.text.trim()) return "empty_text";
  const byId = new Map(b.pins.map((p) => [p.id, p]));
  if (line.pinIds.some((id) => !byId.has(id))) return "unknown_pin";
  if (line.claim === "unverifiable") return null;
  if (!line.pinIds.length) return "uncited";
  const pins = line.pinIds.map((id) => byId.get(id)!);
  if (line.claim === "verified" && !pins.some(isBacked)) return "unsupported_verified";
  if (line.claim === "conflict") {
    const conflicted = conflictPinIds(b);
    if (!pins.some((p) => conflicted.has(p.id))) return "unsupported_conflict";
  }
  return null;
}

export function validateBrief(b: Building, drafts: DraftLine[]): { lines: BriefLine[]; dropped: Dropped[] } {
  const lines: BriefLine[] = [];
  const dropped: Dropped[] = [];
  for (const d of drafts) {
    const pinIds = [...new Set(d.pinIds)];
    const reason = checkLine(b, { ...d, pinIds }) ?? (d.claim === "unverifiable" && !UNKNOWN_LINE.test(d.text.trim()) ? "unverifiable_asserts" : null);
    if (reason) {
      dropped.push({ text: d.text, pinIds, claim: d.claim, reason });
      continue;
    }
    lines.push({
      id: `b${lines.length + 1}`,
      text: d.text.trim(),
      pinIds,
      claim: d.claim,
      ...(d.element ? { element: d.element } : {}),
      status: "pending",
    });
  }
  return { lines, dropped };
}

export const NO_RECORD = "No public record answers that.";

// An answer that fails the gate is replaced, not shown: the officer hears "no public record", never a guess.
export function validateAnswer(b: Building, question: string, d: DraftAnswer): { answer: Answer; dropped: Dropped | null } {
  const pinIds = [...new Set(d.pinIds)];
  const reason = checkLine(b, { ...d, pinIds });
  const floors = [...new Set(d.floors)].filter((f) => Number.isInteger(f) && f >= 0 && f <= b.floors).sort((x, y) => x - y);
  if (reason) {
    return {
      answer: { question, text: NO_RECORD, pinIds: [], claim: "unverifiable", highlight: { floors: [], pinIds: [] }, unknowns: d.unknowns },
      dropped: { text: d.text, pinIds, claim: d.claim, reason },
    };
  }
  // An unverifiable answer says only what has no record; the model's own wording could assert a guess.
  const text = d.claim === "unverifiable" ? (d.unknowns.length ? `No public record: ${d.unknowns.join(", ")}.` : NO_RECORD) : d.text.trim();
  return {
    answer: { question, text, pinIds, claim: d.claim, highlight: { floors, pinIds }, unknowns: d.unknowns },
    dropped: null,
  };
}
