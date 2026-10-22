import type { Answer, Brief, Building } from "../../../shared/building.ts";
import { callStructured } from "./claude.ts";
import { BRIEF_TASK, askTask } from "./prompt.ts";
import { DraftAnswer, DraftBrief } from "./schema.ts";
import { validateAnswer, validateBrief, type Dropped } from "./validate.ts";

export async function makeBrief(b: Building): Promise<{ brief: Brief; dropped: Dropped[] }> {
  const { data, model } = await callStructured(b, BRIEF_TASK, DraftBrief, "medium");
  const { lines, dropped } = validateBrief(b, data.lines);
  return {
    brief: { buildingId: b.id, lines, unknowns: data.unknowns, model, createdAt: new Date().toISOString() },
    dropped,
  };
}

export async function answer(b: Building, question: string): Promise<{ answer: Answer; dropped: Dropped | null }> {
  const { data } = await callStructured(b, askTask(question), DraftAnswer, "low");
  return validateAnswer(b, question, data);
}
