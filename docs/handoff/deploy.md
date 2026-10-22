# Deploy FireSight to Vercel (owner: Devaj, from 13:00)

For Devaj's coding agent. Goal: an HTTPS URL that the Android phone opens. The web app is at `/`, and the API is at `/api/*` on the same origin. Target: a preview URL working by **14:15**, before CP2 at 14:45.

The recipe was researched against vercel.com docs and the vercel/vercel source, and simulated locally (`docs/handoff/SETUP.md` section 10). It has not been run on a real Vercel build yet, so follow the test steps in order.

## 0. Before you start

- `git fetch && git merge origin/main` on your branch. You need:
  - `api/src/server.ts`: the API no longer listens when imported (merged at 13:03, PR #6)
  - `.vercelignore`
  - this file
- **The account:** use your own Vercel account (Devaj6190 owns the GitHub repo, so importing it is simplest). Tell Vidyut which account before connecting anything.
- **The key:** Vidyut enters `ANTHROPIC_API_KEY` in the Vercel dashboard himself. Never put it in a file, a commit, chat or a screenshot.
- **Deploy from Git (import the GitHub repo), not from the CLI.** The CLI uploads `.env` files unless they are ignored. `.vercelignore` covers that, but Git deploys never see gitignored files at all.

## 1. Files to add (one PR from your branch)

**`web/api/index.ts`**: the only Vercel Function. Vercel turns every file in `web/api/` into a function, so keep exactly one here.
```ts
// The only Vercel Function: every /api/* request is rewritten here (see web/vercel.json).
import app from "../../api/src/index.ts";
export default { fetch(request: Request) { return app.fetch(request); } };
```

**`web/api/tsconfig.json`**: required. Without `rewriteRelativeImportExtensions`, the `.ts` import paths survive into the output and the function crashes with `ERR_MODULE_NOT_FOUND`.
```json
{
  "compilerOptions": {
    "target": "ES2023", "module": "ESNext", "moduleResolution": "Bundler",
    "rewriteRelativeImportExtensions": true, "esModuleInterop": true,
    "skipLibCheck": true, "strict": true, "types": ["node"]
  },
  "include": ["./**/*.ts", "../../api/src/**/*.ts", "../../shared/**/*.ts"]
}
```

**`web/vercel.json`**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm install && npm ci --prefix ../api --omit=dev",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": { "api/index.ts": { "maxDuration": 60 } },
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api" }]
}
```

**`shared/package.json`**
```json
{ "type": "module" }
```

**`web/tsconfig.app.json`:** make sure `include` does not pick up `web/api/` (it has `"src"` and `"../shared"` today, which is fine).

Also add `.vercel` to the repo-root `.gitignore`.

## 2. Vercel dashboard (Add New, then Project, then import Devaj6190/FireSight)

| Setting | Value |
|---|---|
| Root Directory | `web` |
| Include files outside the root directory in the Build Step | **ON** (the function imports `../api` and `../shared`) |
| Framework preset | Vite (build `npm run build`, output `dist`; the install command comes from `vercel.json`) |
| Node.js version | 22.x (Settings, Build and Deployment) |
| Env: `ANTHROPIC_API_KEY` | entered by Vidyut, marked Sensitive, Production + Preview |
| Env: `FIRESIGHT_CASES_DIR` | `/tmp/cases` (the serverless disk is read-only; struck lines last only while the function is warm) |
| Production branch | `main` (every merge redeploys; the 30-min data refresh commits redeploy too) |

## 3. Test in this order

1. **Local function check (optional, needs the Vercel CLI and a login):** run `vercel dev` from the repo root. `curl localhost:3000/api/health` should return `{"ok":true}`. This also proves the rewrite keeps the `/api/...` path.
2. **The preview deploy:**
   - Open the build log and check that the function list shows `api/index`.
   - `curl https://<preview>/api/health` should return `{"ok":true}`.
3. **A real API call:**
   ```bash
   curl -s -X POST https://<preview>/api/compliance -H 'content-type: application/json' \
     -d "{\"building\":$(cat web/public/buildings/sf-3722080.json)}" | head -c 300
   ```
   It should return compliance rows. `/api/brief` should return `"source":"model"` once the key is set, otherwise `"fallback"`.
4. **The phone:** open the HTTPS URL on the Android phone in Chrome. The building should load and explode. Test WebXR AR here: it only works over HTTPS.
5. **Report:** put the URL on the hub. Tell Vidyut, who adds it to the README and the submission.

## 4. If it breaks

| Symptom | Fix |
|---|---|
| `ERR_MODULE_NOT_FOUND ... index.ts` | `web/api/tsconfig.json` is missing, or TypeScript is older than 5.7 (web has 6.0) |
| `Cannot find package 'hono'` or `'@anthropic-ai/sdk'` | the install command didn't run `npm ci --prefix ../api`, or "Include files outside root" is OFF |
| `/api/*` returns 404 | check the function list in the build log; if the path is lost after the rewrite, rename the file to `web/api/[...route].ts` |
| `exports is not defined in ES module scope` | `shared/package.json` is missing, or `"module": "ESNext"` is missing in `web/api/tsconfig.json` |
| Brief always says "OFFLINE BRIEF" | the key isn't set in Vercel env, or the function timed out (raise `maxDuration`) |

**Fallback if the API won't deploy by 14:30:** deploy the web app only (delete `web/api/` from the deploy). The phone runs on the precomputed brief and canned answers, and live questions run from the laptop. Tell Vidyut before choosing this.
