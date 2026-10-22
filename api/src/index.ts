import { Hono } from "hono";
import type { BriefLine, Building } from "../../shared/building.ts";
import { evaluateCompliance } from "../../shared/compliance.ts";
import { answer, makeBrief } from "./ai/brief.ts";
import { loadStrikes, saveStrike } from "./strike.ts";

try {
  process.loadEnvFile(); // api/.env (gitignored)
} catch {}

const app = new Hono();

const isBuilding = (b: unknown): b is Building => {
  const x = b as Building;
  return (
    !!x && typeof x === "object" && typeof x.id === "string" && /^sf-\w{1,32}$/.test(x.id) &&
    Array.isArray(x.pins) && Array.isArray(x.layers) && Array.isArray(x.conflicts) && typeof x.floors === "number"
  );
};

const isLine = (l: unknown): l is BriefLine => {
  const x = l as BriefLine;
  return (
    !!x && typeof x === "object" && typeof x.id === "string" && typeof x.text === "string" &&
    Array.isArray(x.pinIds) && x.pinIds.every((p) => typeof p === "string") &&
    ["verified", "unverifiable", "conflict"].includes(x.claim)
  );
};

// Bad JSON or a malformed body is the caller's fault: 400, never a crash.
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err instanceof SyntaxError ? "invalid JSON" : "bad request" }, err instanceof SyntaxError ? 400 : 500);
});

app.get("/api/health", (c) => c.json({ ok: true }));

// The client always posts the full building, so pins added on the phone are in the prompt and the citation check.
app.post("/api/brief", async (c) => {
  const { building } = await c.req.json<{ building: unknown }>();
  if (!isBuilding(building)) return c.json({ error: "building required" }, 400);
  try {
    const struck = (await loadStrikes(building.id)).map((s) => s.line.text);
    const { brief, dropped } = await makeBrief(building, struck);
    // If the validator dropped every line, the officer gets the precomputed brief, not an empty sheet.
    if (!brief.lines.length && building.fallback) return c.json({ brief: building.fallback.brief, dropped, source: "fallback" });
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
    const canned = building.fallback?.answers?.find((a) => a.question.toLowerCase() === question.trim().toLowerCase());
    if (canned) return c.json({ answer: canned, dropped: null, source: "fallback" });
    return c.json({ error: "ask failed" }, 502);
  }
});

// Natural voice for the spoken brief (ElevenLabs). Off without a key: the phone falls back to the browser voice.
app.post("/api/tts", async (c) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return c.json({ error: "tts off" }, 503);
  const { text } = await c.req.json<{ text: unknown }>();
  if (typeof text !== "string" || !text.trim() || text.length > 600) return c.json({ error: "text required (600 chars max)" }, 400);
  const voice = process.env.ELEVENLABS_VOICE_ID || "nPczCjzI2devNBz1zQrb";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: text.trim(), model_id: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5" }),
  });
  if (!res.ok) {
    console.error("tts failed:", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return c.json({ error: "tts failed" }, 502);
  }
  return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
});

app.post("/api/strike", async (c) => {
  const { building, line, reason } = await c.req.json<{ building: unknown; line: unknown; reason?: unknown }>();
  if (!isBuilding(building) || !isLine(line)) return c.json({ error: "building and line required" }, 400);
  return c.json(await saveStrike(building, line, typeof reason === "string" ? reason : undefined));
});

app.post("/api/compliance", async (c) => {
  const { building } = await c.req.json<{ building: unknown }>();
  if (!isBuilding(building)) return c.json({ error: "building required" }, 400);
  return c.json(evaluateCompliance(building));
});

export default app;

