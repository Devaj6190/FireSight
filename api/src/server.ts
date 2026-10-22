// Local dev entry. On Vercel, web/api/index.ts imports the app instead (no listen there).
import { serve } from "@hono/node-server";
import app from "./index.ts";

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`FireSight API on http://localhost:${port}`);
