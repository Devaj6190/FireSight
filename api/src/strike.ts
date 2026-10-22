// Every line the officer strikes becomes a regression case the eval replays.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BriefLine, Building } from "../../shared/building.ts";

export const CASES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../eval/cases");

export interface StrikeCase {
  id: string;
  buildingId: string;
  line: BriefLine;
  reason: string | null;
  struckAt: string;
}

export async function saveStrike(b: Building, line: BriefLine, reason?: string): Promise<StrikeCase> {
  const struckAt = new Date().toISOString();
  const id = `${b.id}-${line.id}-${struckAt.replace(/[:.]/g, "")}`;
  const c: StrikeCase = { id, buildingId: b.id, line: { ...line, status: "struck" }, reason: reason ?? null, struckAt };
  await mkdir(CASES_DIR, { recursive: true });
  await writeFile(path.join(CASES_DIR, `${id}.json`), JSON.stringify(c, null, 2) + "\n");
  return c;
}

export async function loadStrikes(buildingId?: string): Promise<StrikeCase[]> {
  let files: string[] = [];
  try {
    files = (await readdir(CASES_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const cases = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(CASES_DIR, f), "utf8")) as StrikeCase));
  return cases.filter((c) => !buildingId || c.buildingId === buildingId);
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// A struck line counts as repeated if the same text comes back, or the same claim on the same pins.
export function repeatsStrike(line: BriefLine, c: StrikeCase): boolean {
  if (norm(line.text) === norm(c.line.text)) return true;
  const same = (a: string[], b: string[]) => a.length > 0 && a.length === b.length && a.every((x) => b.includes(x));
  return line.claim === c.line.claim && same(line.pinIds, c.line.pinIds);
}
