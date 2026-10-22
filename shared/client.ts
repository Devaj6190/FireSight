// Browser client for Lane C's API (Lane D calls these from the shell).
// Every call has a timeout and falls back to building.fallback, so the demo never hangs on the network.
import type { Answer, Brief, BriefLine, Building, ComplianceRow } from "./building.ts";
import { evaluateCompliance } from "./compliance.ts";

export type Source = "model" | "fallback";
export interface Dropped { text: string; pinIds: string[]; claim: string; reason: string }

const BASE = "/api";

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

// Always send the full building: dispatch, crew and department pins added on the phone must be in it.
export async function fetchBrief(building: Building, timeoutMs = 25_000): Promise<{ brief: Brief; dropped: Dropped[]; source: Source }> {
  try {
    return await post("/brief", { building }, timeoutMs);
  } catch (err) {
    if (building.fallback) return { brief: building.fallback.brief, dropped: [], source: "fallback" };
    throw err;
  }
}

export async function ask(building: Building, question: string, timeoutMs = 20_000): Promise<{ answer: Answer; dropped: Dropped | null; source: Source }> {
  try {
    return await post("/ask", { building, question }, timeoutMs);
  } catch (err) {
    const canned = building.fallback?.answers.find((a) => a.question.toLowerCase() === question.trim().toLowerCase());
    if (canned) return { answer: canned, dropped: null, source: "fallback" };
    throw err;
  }
}

// Saves the struck line as an eval case. Fire and forget from the UI; the strike itself is local state.
export async function strike(building: Building, line: BriefLine, reason?: string): Promise<boolean> {
  try {
    await post("/strike", { building, line, reason }, 5_000);
    return true;
  } catch {
    return false;
  }
}

// Pure and local: no network needed for the compliance strip.
export function compliance(building: Building, today = new Date()): ComplianceRow[] {
  return evaluateCompliance(building, today);
}

// The canned questions that work offline (their answers are precomputed into building.fallback).
export { CANNED as SUGGESTED_QUESTIONS } from "./questions.ts";
