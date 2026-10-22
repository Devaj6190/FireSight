// Fills building.fallback (validated brief + 5 canned answers) in each cached building file,
// so the demo works with no network. Run after Lane B updates a building: npm run precompute
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Building } from "../../shared/building.ts";
import { answer, makeBrief } from "./ai/brief.ts";
import { CANNED } from "./questions.ts";
import { loadStrikes } from "./strike.ts";

try {
  process.loadEnvFile();
} catch {}


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = process.env.FIRESIGHT_BUILDINGS ?? path.join(root, "web/public/buildings");
const only = process.argv[2]; // optional building id

for (const f of readdirSync(dir).filter((f) => /^sf-\d+\w*\.json$/.test(f))) {
  const file = path.join(dir, f);
  const b: Building = JSON.parse(readFileSync(file, "utf8"));
  if (only && b.id !== only) continue;
  const { fallback: _old, ...clean } = b;
  const strikes = (await loadStrikes(b.id)).map((s) => s.line.text);
  const [{ brief, dropped }, answers] = await Promise.all([
    makeBrief(clean as Building, strikes),
    Promise.all(CANNED.map((q) => answer(clean as Building, q))),
  ]);
  b.fallback = { brief, answers: answers.map((a) => a.answer) };
  writeFileSync(file, JSON.stringify(b, null, 2) + "\n");
  console.log(`${b.id}: ${brief.lines.length} lines (${dropped.length} dropped), ${answers.length} answers -> ${f}`);
}
