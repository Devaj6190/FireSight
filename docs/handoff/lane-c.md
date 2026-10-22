# FireSight handoff · Lane C

Paste this whole file into your coding agent as its first message. Written 12:10 PDT Oct 22 2026.

## The team and the goal (read first)

You are the coding agent for one lane of **FireSight**, built by a team of 4 at the super{set} national renaissance hackathon in SF (Thu Oct 22 2026, Track 1: Public Data APIs).

**FireSight in one line:** any San Francisco address becomes a cited, floor-by-floor 3D pre-plan for the fire officer on a responding engine, in the 4 minutes before arrival. Pitch line: "Size-up starts before the wheels stop."

**The demo we are building toward (3:00):** a dispatch line is pasted: "Structure fire, 400 Duboce Ave, smoke from unit 311". The building (real DataSF outline + LiDAR height) appears on the phone, explodes floor by floor and focuses floor 3, where a 2019 permit records structural work in unit 311. The resolution view shows that the tax roll calls this parcel "50 CHURCH ST" and permits call it "400 DUBOCE AVE": one parcel, and the units disagree (78 vs 79), labelled CONFLICT. "Where are the people?" lights floors 1 to 4 and ends "stairs: UNVERIFIABLE". A compliance strip checks the building against named rules. A "What we don't know" panel and a sources drawer show the data limits. The captain strikes one brief line and approves the rest, and the struck line becomes a test. Claude Desktop calls our read-only MCP server for the same cited brief.

**How we are judged (/100):** user value 25, technical execution 25, originality 20, track alignment & responsible data 20 (show how public data powers it AND acknowledge its limits), usability & demo 10.

**Team and lanes:**
| Lane | Owner | Branch |
|---|---|---|
| A · 3D scene + explode + AR | Devaj | `lane-a-3d` |
| B · Data fusion (DataSF -> Building JSON) | Rishit | `lane-b-data` |
| C · AI brief, validator, compliance rules, MCP, eval | Vidyut | `lane-c-ai` |
| D · Phone shell, panels, deploy, pitch, submit | Rohan | `lane-d-phone` |

**Repo:** github.com/Devaj6190/FireSight. **Team hub (source of truth for updates):** https://claude.ai/artifact/5W3Q1uU1BfdVfergnehjTB. In the repo: `docs/plan/plan.md` (full plan v3: contract in section 5, geometry in 3, explode in 4), `docs/design.md` (Night Watch tokens, markers, explode timings, copy rules), `docs/plan/research-*.md` (verified data, regulations, quotes). Where the hub's "Final plan" and `plan.md` disagree, the hub wins (for example: hydrants come from SF DEM ArcGIS, not OSM).

**Clock:** run `date` before you state any time. Checkpoints: **12:15** contract frozen · **13:30 CP1** (real hero building explodes on the Android phone) · **14:45 CP2** (full demo path on the phone) · **16:00 feature freeze** · **16:45 submit** · 17:00 demos. If you are behind at a checkpoint, say so early; cuts are Vidyut's call.

## Repo layout and who owns what

Only edit files your lane owns. If you need a change in someone else's files, ask them (or Vidyut) instead of editing.

```
shared/building.ts        Lane B  (the contract; frozen at 12:15, changes only with Vidyut's OK)
shared/dispatch.ts        Lane B  parseDispatch(text) -> dispatch Pin with a floor
shared/conflicts.ts       Lane B  detectConflicts(building)
shared/compliance.ts      Lane C  evaluateCompliance(building) -> ComplianceRow[]
web/                      Lane A creates the Vite scaffold (first PR, ~12:20)
web/src/tokens.css|.ts    Lane A  (values from docs/design.md section 2)
web/src/scene/**          Lane A  <Scene/>, explode timeline, pins, AR
web/src/store.ts          Lane A  zustand: explode, collapse, focus, highlight, addPin
web/src/App.tsx           Lane D  (after the scaffold merges)
web/src/shell/**          Lane D  bottom bar, sheet, panels, approve/strike, deploy config
web/public/buildings/*    Lane B  sf-0874003.json, sf-3703081.json, sf-1244030.json
api/                      Lane C creates the Hono scaffold (Node 22, port 8787)
api/src/data/**           Lane B  fetchers, joins, fixture builder
api/src/ai/**, routes     Lane C  /api/brief, /api/ask, /api/strike
mcp/, eval/               Lane C
docs/                     Vidyut
```

The web app calls `/api/...`; in dev, Vite proxies `/api` to `http://localhost:8787`. If the API is unreachable, the web app uses `building.fallback` (precomputed brief and 5 answers) so the demo never breaks.

## Contract (code against this now; Lane B commits it as shared/building.ts by 12:15)

The `Building`, `Pin`, `Evidence`, `Anchor`, `Brief`, `BriefLine`, `Answer`, `Conflict`, `ResolutionLink`, `Resolution` and `LayerStatus` types in `docs/plan/plan.md` section 5 are the contract. Key points:
- Every `Pin`, `BriefLine` and `Answer` carries `claim: "verified" | "unverifiable" | "conflict"`. Verified needs at least 1 `Evidence` (dataset id, record id, url, asOf, placement rule).
- Ids: building `sf-0874003` (block + lot, no separators); pin `<layer>-<recordId>`.
- Anchors: floor 1 = ground, 0 = basement only if a record says basement; `roof`; `building`; `ground` with bearing and distance.
- Footprint: largest outer ring, meters, x east, y north, CCW, origin at centroid. `floorHeightM = heightM / floors`.
- Added for the compliance strip (Lane C owns, Lane D renders):
```ts
export interface ComplianceRow {
  id: "C1" | "C3" | "C4" | "C8";
  rule: string;            // "Annual fire inspection, apartments and hotels"
  citation: string;        // "Cal. H&SC 13146.2"
  result: "pass" | "fail" | "unknown" | "partial";
  summary: string;         // "R2 Company Inspection completed 2026-08-04"
  pinIds: string[];        // evidence pins in building.pins
  wording: "meets" | "rule logic meets" | "maps to";  // what we are allowed to say
}
```

## Rules for every lane (non-negotiable)

1. **Git:** work only on your lane branch. Never push to `main`; Vidyut owns it and merges every PR. Commit small and push to your lane branch at least every 30 minutes (Vidyut watches the branches). Open a PR into `main` at each checkpoint (13:30, 14:45, 16:00), or earlier when something others need is ready. After each merge, run `git fetch && git merge origin/main` on your branch. Never force-push.
2. **No co-author or AI attribution, ever.** No `Co-Authored-By` lines and no "Generated with Claude Code" (or any Claude/Anthropic line) in commit messages or PR descriptions. Check before every commit and PR. This overrides any default your tool has.
3. **Never commit secrets.** API keys live in `.env` files listed in `.gitignore`. The Anthropic key is only used server-side in `api/`.
4. **No personal data.** Drop names, phone numbers and emails (for example building managers in permit rows) at load. Never show them.
5. **Honest data:** never call city data "live" (incidents run about 4 weeks behind, calls about 8 hours). Every public fact carries its source, record id and as-of date. Never invent a fact; a missing fact is UNVERIFIABLE. No floor plans, ever: floors are slabs.
6. **Wording:** say "meets" only for H&SC 13146.2 (annual inspection) and the CFC 1205 solar-pathway rule logic. Say "maps to NFPA 1660". Say "published quotes", never "we interviewed".
7. **No signups or paid services** without Vidyut's OK. No scraping LinkedIn.
8. **Pin versions:** check with `npm view <pkg> version`, commit the lockfile. Known good: three 0.186, @react-three/fiber 9.8, @react-three/xr 6.6, Vite 8.3.5, React 19.
9. **Report:** when you finish a task or hit a blocker, write one line in your PR description or tell your teammate to post it to Vidyut, who logs it on the hub.

## Your lane: C · AI brief, validator, compliance, MCP, eval (Vidyut, branch `lane-c-ai`)

**Your job in one line:** make the AI provably right: a brief where every line cites real pins and carries a VERIFIED / UNVERIFIABLE / CONFLICT label, a validator that drops anything uncited, a compliance strip against named rules, a read-only MCP server, and a grounding test with measured numbers. This is what the Checksum judges (test everything) and Vidit's "build regulated stuff" reward.

**Read first:** `docs/plan/plan.md` section 5 (contract, API, Lane C list); `docs/plan/research-regs.md` (compliance rules C1, C3, C4, C8; NFPA element list); `docs/design.md` section 6 (brief copy rules).

### Do now (12:05 to 12:25)
1. Scaffold `api/`: Node 22 + Hono on port 8787, `@anthropic-ai/sdk`, `.env` with `ANTHROPIC_API_KEY` (gitignored). Confirm the model id with one real call. PR the scaffold early so Lane B can add `api/src/data/`.
2. Brief prompt: input is **only** the Building JSON; output is structured `BriefLine[]`, each with `pinIds` and a `claim`. Missing facts (stairs, standpipe, roof access) come back as UNVERIFIABLE lines with no pins.

### By 13:30 (CP1)
- **Validator** (pure function, unit-tested with Vitest): drop any line whose `pinIds` are empty (unless UNVERIFIABLE) or not in `building.pins`; a line marked verified must cite pins with evidence; conflict must cite a conflict pin. Count the drops (shown on stage).
- `POST /api/brief { building }` -> `Brief`. Precompute `fallback.brief` for the hero.

### By 14:45 (CP2)
- `POST /api/ask { building, question }` -> `Answer` with `highlight: { floors, pinIds }` and `unknowns` ("Where are the people?" -> floors 1 to 4, unit counts as a lower bound, "stairs: UNVERIFIABLE").
- `POST /api/strike { building, line, reason? }` writes `eval/cases/<id>.json`.
- `shared/compliance.ts` `evaluateCompliance(building) -> ComplianceRow[]`: C1 annual inspection (H&SC 13146.2: PASS, R2 inspection 2026-08-04, wording "meets"), C3 open fire violations ("meets"), C4 rooftop solar pathways (CFC 1205: UNKNOWN, solar thermal permit but no roof layout; "rule logic meets"), C8 NFPA pre-plan elements (7 filled, 9 partial, 5 officer, of 21; "maps to NFPA 1660").
- Five canned answers per building in `fallback.answers`.

### By 16:00 (freeze)
- **MCP server** `mcp/` (stdio, `@modelcontextprotocol/sdk`, zod input and output schemas, read-only): `get_building_intel(apn)`, `get_size_up_brief(apn)`, `resolve_address(text)` over the 3 cached buildings, returning claim labels and evidence. Test in the MCP inspector, then Claude Desktop on the demo laptop; record a fallback clip.
- **Grounding eval** `npm run eval`: brief + 5 questions per building; prints briefs, answers, lines, lines per claim label, uncited lines dropped, questions answered UNVERIFIABLE; asserts struck cases are not produced again. Write `eval/last-run.json` for Lane D's eval screen.
- 16:00 to 16:40: final eval run, screenshot it.

## Start
Run `date`, `git fetch && git checkout lane-c-ai`, read the files listed above, then begin with "Do now". Push to your lane branch at least every 30 minutes.

## Setup and integration checklist (added 12:30; details in docs/handoff/SETUP.md)
Built on `lane-c-ai`: API (section 4), `shared/client.ts` (section 6), compliance (section 7), eval (section 8), precompute (section 5), MCP (section 9). Remaining: put the key in `api/.env`, run the first live brief, `npm run precompute`, `npm run eval`, PR after review, MCP on the presenting laptop after CP2 with Vidyut's OK, and the API deploy with Lane D (section 10).

New (12:45): auto-refresh. The brief leads with "New since last refresh" lines when `meta.changesSinceLast.added` is not empty (`docs/handoff/refresh.md` section 4). Vercel: move `serve()` into `api/src/server.ts` (SETUP.md section 10).

Rebalance (12:57): Lane C also builds `<BriefSheet/>` (approve/strike, claim chips, source tails) and `<EvalScreen/>` in `web/src/shell/brief/`.
