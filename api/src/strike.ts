// Every line the officer strikes becomes a regression case the eval replays.
import { mkdir, writeFile } from "node:fs/promises";
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
