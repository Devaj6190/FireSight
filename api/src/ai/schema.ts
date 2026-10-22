// What the model is asked to return. Ids, status and timestamps are added by our code, never the model.
import { z } from "zod";

export const Claim = z.enum(["verified", "unverifiable", "conflict"]);

export const DraftLine = z.object({
  text: z.string().describe("One fact, radio cadence, 12 words max, no source names"),
  pinIds: z.array(z.string()).describe("Ids of the pins this line states; empty only for an unverifiable line"),
  claim: Claim,
  element: z.string().nullable().describe("Pre-plan element id like E1, or null"),
});

export const DraftBrief = z.object({
  lines: z.array(DraftLine),
  unknowns: z.array(z.string()).describe("Size-up facts with no public record, e.g. stairs, standpipe"),
});

export const DraftAnswer = z.object({
  text: z.string().describe("Answer in radio cadence, 2 sentences max"),
  pinIds: z.array(z.string()),
  claim: Claim,
  floors: z.array(z.number().int()).describe("Floors to light up, 1 = ground"),
  unknowns: z.array(z.string()),
});

export type DraftLine = z.infer<typeof DraftLine>;
export type DraftBrief = z.infer<typeof DraftBrief>;
export type DraftAnswer = z.infer<typeof DraftAnswer>;
