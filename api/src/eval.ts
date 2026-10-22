// Grounding eval: brief + 5 questions per cached building, through the same validator the app uses.
// Prints measured counts and writes eval/last-run.json for the eval screen. Exit 1 if a struck line returns.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Building } from "../../shared/building.ts";
import { answer, makeBrief } from "./ai/brief.ts";
import { MODEL } from "./ai/claude.ts";
import { CANNED } from "../../shared/questions.ts";
import { loadStrikes, repeatsStrike } from "./strike.ts";

try {
  process.loadEnvFile();
} catch {}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = process.env.FIRESIGHT_BUILDINGS ?? path.join(root, "web/public/buildings");
const QUESTIONS = CANNED;

const buildings: Building[] = readdirSync(dir)
  .filter((f) => /^sf-\d+\w*\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));
if (!buildings.length) {
  console.error(`No buildings in ${dir}`);
  process.exit(1);
}

const totals = { buildings: 0, briefs: 0, lines: 0, verified: 0, unverifiable: 0, conflict: 0, dropped: 0, answers: 0, answersUnverifiable: 0, answersDropped: 0, strikeCases: 0, strikesRepeated: 0 };
const perBuilding = [];
const dropReasons: Record<string, number> = {};
const started = Date.now();

for (const b of buildings) {
  const strikes = await loadStrikes(b.id);
  const { brief, dropped } = await makeBrief(b, strikes.map((s) => s.line.text));
  const repeated = strikes.filter((s) => brief.lines.some((l) => repeatsStrike(l, s)));
  const answers = await Promise.all(QUESTIONS.map((q) => answer(b, q)));
  for (const d of [...dropped, ...answers.flatMap((a) => (a.dropped ? [a.dropped] : []))]) dropReasons[d.reason] = (dropReasons[d.reason] ?? 0) + 1;

  totals.buildings++;
  totals.briefs++;
  totals.lines += brief.lines.length;
  for (const l of brief.lines) totals[l.claim]++;
  totals.dropped += dropped.length;
  totals.answers += answers.length;
  totals.answersUnverifiable += answers.filter((a) => a.answer.claim === "unverifiable").length;
  totals.answersDropped += answers.filter((a) => a.dropped).length;
  totals.strikeCases += strikes.length;
  totals.strikesRepeated += repeated.length;
  perBuilding.push({
    buildingId: b.id,
    address: b.address,
    lines: brief.lines.length,
    dropped: dropped.length,
    answers: answers.map((a) => ({ question: a.answer.question, claim: a.answer.claim, cited: a.answer.pinIds.length, dropped: !!a.dropped })),
    strikesRepeated: repeated.map((s) => s.id),
  });
  console.log(`${b.id}  ${brief.lines.length} lines kept, ${dropped.length} dropped, ${answers.filter((a) => a.dropped).length}/${answers.length} answers replaced, ${repeated.length}/${strikes.length} struck lines repeated`);
}

const run = { model: MODEL, ranAt: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), totals, dropReasons, perBuilding };
const out = JSON.stringify(run, null, 2) + "\n";
writeFileSync(path.join(root, "eval/last-run.json"), out);
// Copy the web app can fetch at /eval/last-run.json for the eval screen.
mkdirSync(path.join(root, "web/public/eval"), { recursive: true });
writeFileSync(path.join(root, "web/public/eval/last-run.json"), out);
console.log("\nGROUNDING EVAL");
console.log(`buildings ${totals.buildings} · briefs ${totals.briefs} · lines ${totals.lines} (verified ${totals.verified}, unverifiable ${totals.unverifiable}, conflict ${totals.conflict})`);
console.log(`uncited or unsupported lines dropped: ${totals.dropped} · answers ${totals.answers}, unverifiable ${totals.answersUnverifiable}, replaced by validator ${totals.answersDropped}`);
console.log(`struck lines: ${totals.strikeCases} cases, ${totals.strikesRepeated} repeated · ${run.seconds}s · wrote eval/last-run.json and web/public/eval/last-run.json`);
process.exit(totals.strikesRepeated ? 1 : 0);
