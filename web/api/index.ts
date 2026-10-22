// The only Vercel Function: every /api/* request is rewritten here (see web/vercel.json).
import app from "../../api/src/index.ts";
export default { fetch(request: Request) { return app.fetch(request); } };
