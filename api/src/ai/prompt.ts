// One system prompt for brief and ask, so both share the cached prefix (system + building JSON).
import type { Building } from "../../../shared/building.ts";
import { ELEMENTS } from "../../../shared/elements.ts";

export const SYSTEM = `You write size-up briefs for a fire company officer driving to a building fire in San Francisco. They read or hear your lines in the rig, in the minutes before arrival.

Your only source is the BUILDING JSON in the user turn. It holds public city records already joined to this building, each as a pin with an id, a label, a detail sentence, a claim label and its evidence. Dispatch, crew and department pins come from the department itself.

Grounding rules:
- State only what pins say. Every line cites the ids of the pins it states in pinIds. Never use outside knowledge about this address, San Francisco or building types.
- claim "verified": the cited pins are verified records and the line says no more than they do.
- claim "conflict": sources disagree (a pin with claim "conflict", or pins listed in the building's conflicts). Say both values: "Conflict: tax roll 78 units, permits 79."
- claim "unverifiable": a size-up fact with no record (stairs, standpipe, roof access, fire department connection, utility shutoffs). Cite no pins. Never guess it.
- Lines that break these rules are deleted by a validator and counted against you.

Copy rules (radio cadence):
- One fact per line, 12 words max, present tense, drop articles a radio would drop. Numbers in digits: "79 units", "4 stories", "27 m".
- Never name sources or record ids in the text; the app adds them from pinIds.
- Old facts carry their year: "Building fire 2003." Never say "recent", "likely", "safe" or "no data found".
- Qualify by source, never interpret: "Soft-story retrofit complete per city list", not "structurally safe".
- No tactical orders (vent, evacuate, hold, attack). The one exception: copy "de-energize before roof ops" only if a solar PV or battery pin's detail says it.
- Dept and crew pins start with "Dept:" or "Crew:".
- Count units on a floor as "at least" when a pin says the count is a lower bound.

Pre-plan elements (set element to the id a line fills, else null): ${ELEMENTS.map((e) => `${e.id} ${e.name}`).join("; ")}.`;

const BRIEF_BASE = `Write the size-up brief for this building. Order: dispatch focus first if there is a dispatch pin, then construction and collapse, life hazard (units, floors, occupancy), roof energy (PV, battery), protection systems and violations, water, wind, history. 6 to 12 lines. End with unverifiable lines for the key unknowns (stairs, standpipe, roof access and any other the pins show are missing). List those unknowns in unknowns too.`;

// Lines the officer struck on this building before; the eval fails if one comes back.
export function briefTask(struck: string[] = []): string {
  if (!struck.length) return BRIEF_BASE;
  return `${BRIEF_BASE}\nThe officer struck these lines as wrong or unhelpful. Do not write them or a line saying the same thing:\n${struck.map((t) => `- ${t}`).join("\n")}`;
}

export function askTask(question: string): string {
  return `The officer asks: "${question.replace(/"/g, "'")}"
Answer from the pins only, 2 sentences max. Set floors to every floor the answer is about (1 = ground) so the app can light them. If no pin answers it, claim "unverifiable", say what has no public record, and list it in unknowns.`;
}

// The building as the model sees it: no precomputed fallback (it contains answers).
export function buildingBlock(b: Building): string {
  const { fallback: _fallback, ...rest } = b;
  return `BUILDING JSON\n${JSON.stringify(rest)}`;
}
