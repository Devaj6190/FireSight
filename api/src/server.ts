// Local dev server only. Vercel imports index.ts through web/api/index.ts and never runs this file.
import { serve } from "@hono/node-server";
import app from "./index.ts";

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`FireSight API on http://localhost:${port}`);
