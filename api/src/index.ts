import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { BriefLine, Building } from "../../shared/building.ts";
import { evaluateCompliance } from "../../shared/compliance.ts";
import { answer, makeBrief } from "./ai/brief.ts";
import { saveStrike } from "./strike.ts";

try {
  process.loadEnvFile(); // api/.env (gitignored)
} catch {}

const app = new Hono();

const isBuilding = (b: unknown): b is Building =>
  !!b && typeof b === "object" && typeof (b as Building).id === "string" && Array.isArray((b as Building).pins);

app.get("/api/health", (c) => c.json({ ok: true }));

// The client always posts the full building, so pins added on the phone are in the prompt and the citation check.
app.post("/api/brief", async (c) => {
  const { building } = await c.req.json<{ building: unknown }>();
  if (!isBuilding(building)) return c.json({ error: "building required" }, 400);
  try {
    const { brief, dropped } = await makeBrief(building);
    return c.json({ brief, dropped, source: "model" });
  } catch (err) {
    console.error("brief failed:", err);
    if (building.fallback) return c.json({ brief: building.fallback.brief, dropped: [], source: "fallback" });
    return c.json({ error: "brief failed" }, 502);
  }
});

app.post("/api/ask", async (c) => {
  const { building, question } = await c.req.json<{ building: unknown; question: unknown }>();
  if (!isBuilding(building) || typeof question !== "string" || !question.trim()) {
    return c.json({ error: "building and question required" }, 400);
  }
  try {
    const res = await answer(building, question.trim());
    return c.json({ ...res, source: "model" });
  } catch (err) {
    console.error("ask failed:", err);
    const canned = building.fallback?.answers.find((a) => a.question.toLowerCase() === question.trim().toLowerCase());
    if (canned) return c.json({ answer: canned, dropped: null, source: "fallback" });
    return c.json({ error: "ask failed" }, 502);
  }
});

app.post("/api/strike", async (c) => {
  const { building, line, reason } = await c.req.json<{ building: unknown; line: BriefLine; reason?: string }>();
  if (!isBuilding(building) || !line?.id) return c.json({ error: "building and line required" }, 400);
  return c.json(await saveStrike(building, line, reason));
});

app.post("/api/compliance", async (c) => {
  const { building } = await c.req.json<{ building: unknown }>();
  if (!isBuilding(building)) return c.json({ error: "building required" }, 400);
  return c.json(evaluateCompliance(building));
});

export default app;

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port });
  console.log(`FireSight API on http://localhost:${port}`);
}
