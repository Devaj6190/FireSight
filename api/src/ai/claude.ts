import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { Building } from "../../../shared/building.ts";
import { SYSTEM, buildingBlock } from "./prompt.ts";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
// An org-level key needs the workspace header; a workspace-scoped key needs nothing extra.
const getClient = () =>
  (client ??= new Anthropic(
    process.env.ANTHROPIC_WORKSPACE_ID ? { defaultHeaders: { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } } : {},
  ));

export class ModelError extends Error {}

// One structured call: system + building (both cached) + the task. Refusals fall back server-side.
export async function callStructured<S extends z.ZodType>(
  b: Building,
  task: string,
  schema: S,
  effort: "low" | "medium" | "high",
): Promise<{ data: z.infer<S>; model: string; usage: Anthropic.Beta.BetaUsage }> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system: [{ type: "text", text: SYSTEM }],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildingBlock(b), cache_control: { type: "ephemeral" } },
          { type: "text", text: task },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new ModelError(`refused: ${res.stop_details?.category ?? "unknown"}`);
  if (res.stop_reason === "max_tokens") throw new ModelError("hit max_tokens");
  if (!res.parsed_output) throw new ModelError("no parsed output");
  return { data: res.parsed_output as z.infer<S>, model: res.model, usage: res.usage };
}
