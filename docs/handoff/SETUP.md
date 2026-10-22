# FireSight setup and integration guide (all lanes)

For the coding agent in each lane. Read your lane's handoff first (`docs/handoff/lane-X.md`), then the sections of this file it points to. Updated 12:30 PDT Oct 22 2026. If this file and your lane handoff disagree, this file is newer.

Contents: 0 auto-refresh (docs/handoff/refresh.md) · 1 tools · 2 git workflow · 3 repo layout and ports · 4 running the API · 5 building files · 6 calling the API from the web app · 7 compliance strip · 8 eval screen · 9 MCP server · 10 deploying for the phone · 11 secrets and data rules · 12 status of each piece

---

## 1. Tools every laptop needs

| Tool | Check | Notes |
|---|---|---|
| Node 22 or newer | `node -v` | The API uses `process.loadEnvFile` and `AbortSignal.timeout` (Node 22+). |
| npm | `npm -v` | Always commit `package-lock.json`. Install exact versions (`npm i pkg@x.y.z`). |
| git + GitHub CLI | `gh auth status` | Needed to open PRs. Log in with `gh auth login` if it says not logged in. |
| Python 3 + certifi | `python3 -c "import certifi"` | Lane B's data scripts only. `pip install certifi` if missing (macOS Python's TLS fails without it). |
| Android phone with Chrome | | Lane A and D: WebXR AR needs HTTPS (section 10). |

## 2. Git workflow (same for every lane)

```bash
git clone https://github.com/Devaj6190/FireSight.git && cd FireSight   # once
git checkout lane-X-...                   # your lane branch: lane-a-3d, lane-b-data, lane-c-ai, lane-d-phone
git fetch origin && git merge origin/main # after every merge into main (Vidyut posts it on the hub)
git add <files> && git commit -m "Lane X: what changed"
git push                                  # at least every 30 minutes; Vidyut's watcher sees every push
gh pr create --base main --head lane-X-... --title "Lane X: ..." --body "What it does, how to test it, what is not done"
```

Rules:
- Push only to your lane branch. Never push to `main`; Vidyut reviews and merges every PR.
- **No `Co-Authored-By` lines and no "Generated with Claude Code" (or any Claude/Anthropic line) in commits or PR descriptions.** Many coding tools add these by default; remove them before committing. Check with `git log -1 --format=%B`.
- Never force-push. Never rewrite `main`.
- Open a PR at each checkpoint (13:30, 14:45, 16:00), or earlier when something another lane needs is ready.
- If a merge conflicts in a file another lane owns, keep their version and tell them; do not resolve their logic yourself.

## 3. Repo layout, owners and ports

```
shared/building.ts      Lane B   the contract (frozen; changes need Vidyut's OK)
shared/dispatch.ts      Lane B   parseDispatch(text, building) -> dispatch Pin
shared/conflicts.ts     Lane B   detectConflicts(building)
shared/compliance.ts    Lane C   evaluateCompliance(building) -> ComplianceRow[]
shared/elements.ts      Lane C   NFPA pre-plan element list used by compliance C8 and brief lines
shared/client.ts        Lane C   browser client: fetchBrief, ask, strike, compliance, SUGGESTED_QUESTIONS
shared/questions.ts     Lane C   the 5 canned questions (answers precomputed for offline)
web/                    Lane A scaffold; web/src/scene/** and web/src/store.ts Lane A; App.tsx and web/src/shell/** Lane D
web/public/buildings/   Lane B   sf-0874003.json (400 Duboce), sf-3703081.json (1018 Mission), sf-1244030.json (1433 Haight)
web/public/eval/        Lane C   last-run.json for the eval screen
api/                    Lane C   Hono API on port 8787 (api/src/data/** is Lane B's if needed)
mcp/                    Lane C   read-only MCP server (stdio)
eval/                   Lane C   eval/cases/*.json (struck lines), eval/last-run.json
scripts/                Lane B   datasf_probe.py, fetch_sources.py, build_fixture.py
docs/                   Vidyut
```

Ports: web (Vite dev) `5173`, API `8787`. The web app always calls relative URLs (`/api/...`, `/buildings/...`, `/eval/...`). In dev, Vite proxies `/api` to the API. Lane A adds this to `web/vite.config.ts`:

```ts
server: { host: true, proxy: { "/api": "http://localhost:8787" } }
```

TypeScript imports between `web/`, `api/`, `mcp/` and `shared/`: the API and MCP use `moduleResolution: "Bundler"`, so both `import ... from "./building"` and `"./building.ts"` work. In `web/tsconfig.app.json`, keep Vite's default `"moduleResolution": "bundler"` and `"allowImportingTsExtensions": true`, and add `"../shared"` to `include` so the web app can import `../../shared/client.ts`.

## 4. Running the API locally

Only one laptop needs the Anthropic key: whoever runs the API (Vidyut for development; the deploy for the phone, section 10). Without a key, every AI endpoint fails and the client falls back to the precomputed brief and answers, so the web app still works.

```bash
cd api
npm ci
cp .env.example .env     # then put the key after ANTHROPIC_API_KEY= (ask Vidyut; never commit it, never paste it in chat, PRs or the hub)
npm run dev              # http://localhost:8787, reloads on change
npm test                 # 22+ unit tests (validator, compliance, strike matching)
```

Smoke test once it runs:

```bash
curl -s localhost:8787/api/health
B=$(cat ../web/public/buildings/sf-0874003.json)
curl -s -X POST localhost:8787/api/compliance -H 'content-type: application/json' -d "{\"building\":$B}" | head -c 600
curl -s -X POST localhost:8787/api/brief -H 'content-type: application/json' -d "{\"building\":$B}" | head -c 1200
```

Endpoints (all POST JSON, all take the **full** building):

| Endpoint | Body | Returns |
|---|---|---|
| `/api/brief` | `{ building }` | `{ brief: Brief, dropped: Dropped[], source: "model" \| "fallback" }` |
| `/api/ask` | `{ building, question }` | `{ answer: Answer, dropped: Dropped \| null, source }` |
| `/api/strike` | `{ building, line: BriefLine, reason? }` | the saved case (written to `eval/cases/`) |
| `/api/compliance` | `{ building }` | `ComplianceRow[]` (same as the local `compliance()` function) |
| `/api/health` (GET) | | `{ ok: true }` |

`dropped` is every line the citation validator removed, with its reason (`unknown_pin`, `uncited`, `unsupported_verified`, `unsupported_conflict`, `empty_text`). The eval screen counts them; the UI never shows dropped lines as facts.

Model: Claude Opus 5.5 (`claude-opus-5-5`), medium effort for the brief, low effort for questions. Expect about 5 to 20 s per brief; that is why the client has timeouts and fallbacks.

## 5. Building files (Lane B produces, everyone reads)

- Path: `web/public/buildings/sf-<block><lot>.json`. The web app loads them with `fetch("/buildings/sf-0874003.json")`.
- Shape: `Building` in `shared/building.ts`. Every pin has `claim` (`verified` / `unverifiable` / `conflict`) and `evidence[]` (dataset id, record id, url, asOf, placement rule).
- `building.fallback` holds a precomputed brief and the 5 canned answers. **Lane C writes it** with `cd api && npm run precompute` (needs the key). So:
  1. Lane B regenerates a building file → **Lane B's builder must keep an existing `fallback` field** (read the old file, copy `fallback` across) or tell Lane C to re-run precompute.
  2. Lane C runs `npm run precompute` after each Lane B data change that reaches main, and PRs the updated files.
- Pin formats the compliance strip depends on: inspection pins (layer `inspection`) name the type and "Completed" in label or detail, with the date in `evidence[0].asOf`; violation pins (layer `violation`) carry the status word in `detail`; solar permits (layer `permit`) say "solar" or "photovoltaic".

## 6. Calling the API from the web app (Lane D, and Lane A for highlight)

Use `shared/client.ts`; do not write fetch calls by hand.

```ts
import { fetchBrief, ask, strike, compliance, SUGGESTED_QUESTIONS } from "../../shared/client.ts";
import { parseDispatch } from "../../shared/dispatch.ts";

// 1. Dispatch paste box
const pin = parseDispatch(text, building);          // anchored to floor 3 for "unit 311"
store.addPin(pin); store.explode();                 // Lane A's store

// 2. Brief sheet (send the building AFTER adding dispatch/crew/department pins)
const { brief, dropped, source } = await fetchBrief(store.building);
// render brief.lines: text + claim chip (VERIFIED / UNVERIFIABLE / CONFLICT) + source tail from line.pinIds
// (look the pins up in building.pins; show evidence[0].source short name and year; the model never writes sources)
// source === "fallback" -> show a small "offline brief" tag

// 3. Ask
const { answer } = await ask(store.building, "Where are the people?");
store.highlight(answer.highlight);                  // { floors: [1,2,3,4], pinIds: [...] }
// show answer.text, its claim chip, and answer.unknowns as "UNVERIFIABLE: stairs" chips

// 4. Approve / strike
await strike(store.building, line, "wrong floor");  // saves a regression case; returns false if offline (keep the UI state anyway)

// 5. Compliance strip (pure, no network)
const rows = compliance(store.building);            // C1, C3, C4, C8
```

Timeouts: brief 25 s, ask 20 s, strike 5 s. On timeout or error, brief and the 5 canned questions fall back to `building.fallback`; any other question throws, so show "No connection: try a suggested question" and list `SUGGESTED_QUESTIONS`.

Claim chip colors (design.md): verified = solid, unverifiable = dashed grey (`--fs-unknown`), conflict = marked with both values. Severity colors stay on the pins.

## 7. Compliance strip (Lane C computes, Lane D renders)

`compliance(building)` returns 4 rows: `{ id, rule, citation, result, summary, pinIds, wording }`. Render one row each: rule, result chip, summary, citation, and tap to show the evidence pins (`pinIds`). Results for 400 Duboce today: C1 PASS (79 days), C3 PASS, C4 UNKNOWN (4 ft perimeter rule), C8 PARTIAL (7 filled, 9 partial, 5 need the officer, of 21).

Wording on screen and in the pitch comes from `wording`: show "Meets H&SC 13146.2" only when `wording === "meets"` and the result is pass; "Rule logic meets CFC 1205" for C4; "Maps to NFPA 1660" for C8. Never write "compliant" or "meets NFPA". UNKNOWN is grey, never red.

## 8. Eval screen (Lane C produces, Lane D renders)

`cd api && npm run eval` runs the brief and the 5 questions on every cached building and writes `web/public/eval/last-run.json` (and `eval/last-run.json`). The web app fetches `/eval/last-run.json`:

```json
{ "model": "claude-opus-5-5", "ranAt": "...", "seconds": 60,
  "totals": { "buildings": 3, "briefs": 3, "lines": 30, "verified": 24, "unverifiable": 5, "conflict": 1,
              "dropped": 2, "answers": 15, "answersUnverifiable": 4, "answersDropped": 0,
              "strikeCases": 1, "strikesRepeated": 0 },
  "dropReasons": { "unknown_pin": 1, "uncited": 1 },
  "perBuilding": [ { "buildingId": "sf-0874003", "address": "400 Duboce Ave", "lines": 10, "dropped": 1, "answers": [...], "strikesRepeated": [] } ] }
```

(Numbers above are an example of the shape, not results.) Show the totals big, read the real numbers on stage, and show `ranAt`. If the file is missing, show "Eval not run yet".

## 9. MCP server (Lane C; demo laptop setup by whoever presents)

See `mcp/README.md`. Short version: `cd mcp && npm ci && npm run inspect` opens the MCP Inspector. For the Claude Desktop demo, the presenter's laptop gets a `firesight` entry in `~/Library/Application Support/Claude/claude_desktop_config.json` (back the file up first, merge, do not overwrite), then restart Claude Desktop. **Only with Vidyut's OK, on the presenting laptop, after CP2.** If anything fails, play the recorded clip.

## 10. Deploying for the phone (Vercel; Lane D with Vidyut's Claude)

Researched 12:42 against vercel.com docs and the vercel/vercel source, and simulated locally. Not yet run on a real Vercel build. Vidyut picks the account and enters the key himself.

**Security first:** `api/.env` holds the key. The Vercel CLI uploads `.env` files unless ignored. The repo-root `.vercelignore` (on main) excludes them. Prefer deploying from Git (connect the GitHub repo), where gitignored files never upload.

**Layout:** one Vercel project, Root Directory `web`, Vite preset, plus a single function that runs our Hono app.

1. `api/src/index.ts` must not listen on Vercel. Lane C moves `serve()` into `api/src/server.ts`; `npm run dev` points at it. (Lane C PR.)
2. New `web/api/index.ts`. Vercel makes every file in `web/api/` a function, so keep exactly one:
```ts
// The only Vercel Function: every /api/* request is rewritten here (see web/vercel.json).
import app from "../../api/src/index.ts";
export default { fetch(request: Request) { return app.fetch(request); } };
```
3. New `web/api/tsconfig.json`. This is required: without `rewriteRelativeImportExtensions`, the `.ts` import paths survive into the output and the function crashes.
```json
{ "compilerOptions": { "target": "ES2023", "module": "ESNext", "moduleResolution": "Bundler",
    "rewriteRelativeImportExtensions": true, "esModuleInterop": true, "skipLibCheck": true, "strict": true, "types": ["node"] },
  "include": ["./**/*.ts", "../../api/src/**/*.ts", "../../shared/**/*.ts"] }
```
4. New `shared/package.json`: `{ "type": "module" }`.
5. New `web/vercel.json`:
```json
{ "$schema": "https://openapi.vercel.sh/vercel.json", "framework": "vite",
  "installCommand": "npm install && npm ci --prefix ../api --omit=dev",
  "buildCommand": "npm run build", "outputDirectory": "dist",
  "functions": { "api/index.ts": { "maxDuration": 60 } },
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api" }] }
```
6. Vercel project settings:
   - Root Directory: `web`.
   - "Include files outside the root directory in the Build Step": ON.
   - Node 22.x.
   - Env vars, Production and Preview: `ANTHROPIC_API_KEY` (entered by Vidyut, marked Sensitive) and `FIRESIGHT_CASES_DIR=/tmp/cases`.
   - Dependencies stay in `api/package.json`: the install command installs them.
   - `web` needs `typescript` 5.7 or newer: it has 6.0.

**Test, in order:**
1. `vercel dev` from the repo root. Check `curl localhost:3000/api/health` returns `{"ok":true}`. This also confirms the rewrite keeps the `/api/...` path.
2. A preview deploy, opened on the phone over HTTPS.
3. POST `/api/brief` with a building. It should return `source: "model"`, or `"fallback"` without a key.

**Likely failures and their fixes:**
- `ERR_MODULE_NOT_FOUND ... .ts`: the tsconfig from step 3 is missing.
- `Cannot find package 'hono'`: the install command or the "outside root" toggle.
- `/api/*` returns 404: check the function list in the build log. If the path is lost after the rewrite, rename the file to `web/api/[...route].ts`.

**Fallback if the API deploy fails by CP2:** deploy the web app only. The phone runs on the precomputed brief and canned answers, and live questions run from the laptop.

## 11. Secrets and data rules

- Keys live only in `api/.env` (gitignored) and the host's environment settings. Never in code, commits, PRs, chat, the hub or screenshots.
- No personal data in anything that ships: drop names, phone numbers and emails at load (permit contacts, managers, inspectors' contact lines inside NOV text). `data/raw/` stays local and untracked.
- Never call city data "live". Every fact shows its source and as-of date. Missing facts are UNVERIFIABLE, never guessed. No floor plans.
- Say "published quotes", never "we interviewed". No FireSight price on stage.

## 12. Status of each piece (12:30)

| Piece | Where | State |
|---|---|---|
| Contract `shared/building.ts` | `lane-b-data` | done; PR to main pending |
| 3 building files, `parseDispatch`, `detectConflicts`, evidence URL checker | `lane-b-data` | done; PR to main pending |
| API, validator, compliance, client, eval, precompute, MCP | `lane-c-ai` | built and unit-tested; live model calls wait for the key; PR after review |
| `web/` scaffold, scene, store | `lane-a-3d` | not pushed yet: **this is the main blocker for Lane D** |
| Shell, panels, deploy | `lane-d-phone` | waiting on the `web/` scaffold |
