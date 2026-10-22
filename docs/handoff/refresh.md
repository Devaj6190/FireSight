# Auto-refresh: every building re-pulled from data.sf.gov every 30 minutes

Roadmap item added 12:45 PDT by Vidyut. Tier: **SHOULD, ship by CP2 (14:45)**. Owners: Lane B (job), Lane D (on-screen freshness and change feed), Lane C (brief and compliance react to changes), Vidyut's Claude (workflow review and merge).

## Why judges care

- **Track 1 rubric:** "show how public data powers it". A visible refresh log proves the product runs on public data continuously, not on a one-time scrape.
- **The business story:** pre-plans go stale; FireSight keeps them current. Every refresh diffs the new records against the last ones, and new permits, violations or incidents show up as "NEW since 14:30".
- **The Checksum judges:** automation with a log, a diff and tests is what they build.

## Wording (non-negotiable)

- Say: "**Refreshed from data.sf.gov every 30 minutes.** Each source is as fresh as the city publishes it."
- Never say "live" or "real-time". The city publishes some sources late: fire incidents run about 4 weeks behind, calls for service about 8 hours, and the hydrant layer is a 2018 snapshot. Refreshing every 30 minutes cannot make them newer, and a judge who checks one date will catch it. The Track 1 rubric rewards acknowledging limits.
- On screen, always show both: when FireSight last refreshed, and each source's own as-of date.

## 1. The refresh job (Lane B)

`scripts/refresh.py`, built on `fetch_sources.py` and `build_fixture.py`:

1. For each cached building (`web/public/buildings/sf-*.json`): fetch all sources and rebuild the building JSON. Keep the existing `fallback`; the builder already does.
2. Diff against the previous file by pin id:
   - added pins (new permit, violation, incident)
   - removed pins
   - changed pins (same id, different label, detail or claim)
   - layers whose status changed (`ok`, `no_records` or `fetch_failed`)
3. Write into `building.meta`:
   - `refreshedAt` (ISO time)
   - `refreshIntervalMin: 30`
   - `sourcesQueried`
   - `sourcesWithRecords`
   - `sourcesFailed`
   - `changesSinceLast: { added: [pinId], removed: [pinId], changed: [pinId] }`
4. Append one entry per building to `web/public/refresh/log.json`, keeping the newest 96 (48 hours):
   - `at`, `buildingId`, `sourcesQueried`, `sourcesFailed`, `ms`
   - `added: [{ pinId, label }]`, `removed: [...]`, `changed: [...]`
5. Only write files if something changed besides `refreshedAt`. Otherwise update the log entry only, with "no changes". This keeps git history clean.
6. A layer that fails to fetch keeps its last good pins and is marked `fetch_failed` with its last good `asOf`. Never drop facts because one request failed.
7. Flags:
   - `--once` (default)
   - `--loop 1800`: local loop on the demo laptop as a backup
   - `--building sf-0874003`

Rate limits: about 88 sources × 3 buildings every 30 minutes is fine without a Socrata app token. If you see HTTP 429, back off and retry once. A token needs a signup, which needs Vidyut's OK.

## 2. The schedule (Lane B writes it, Vidyut's Claude reviews it)

`.github/workflows/refresh.yml`:

```yaml
name: Refresh public data
on:
  schedule:
    - cron: "*/30 * * * *"   # GitHub may start scheduled runs a few minutes late
  workflow_dispatch: {}       # "Run workflow" button: use it on stage to show a refresh happening
permissions:
  contents: write
concurrency:
  group: refresh
  cancel-in-progress: false
jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install certifi
      - run: python scripts/refresh.py --once
      - name: Commit if changed
        run: |
          git config user.name "firesight-refresh"
          git config user.email "firesight-refresh@users.noreply.github.com"
          git add web/public/buildings web/public/refresh
          git diff --cached --quiet || git commit -m "data: refresh $(date -u +%Y-%m-%dT%H:%MZ)"
          git push
```

How it fits the rest:
- **The data.** Commits touch only `web/public/buildings/` and `web/public/refresh/`. Each one lands on main, and Vercel redeploys, so the phone gets the new data. The git log becomes the visible audit trail.
- **Lane B's own edits.** These go through a PR as usual. If one conflicts with a refresh commit, keep the refreshed JSON and re-run the builder.
- **No secrets.** The job needs none: all sources are public, and it does not call Claude. The `fallback` brief is refreshed separately by Lane C with `npm run precompute`.
- **Vidyut's Claude reviews the workflow PR**, checking the permissions, that it touches only the paths above, and that it has no secrets.

## 3. What the phone shows (Lane D)

- **Header chip:** "Refreshed 14:30 · every 30 min", from `building.meta.refreshedAt`. Show the relative age ("12 min ago") in mono, not "LIVE".
- **Sources drawer:** each source shows its own `asOf` and status. Sort the stale ones (over 1 year) to the bottom with an "AGE" tag.
- **Change feed card:** "Since last refresh: +1 permit (solar, 2026-10-22) · no new violations", from `meta.changesSinceLast` and `/refresh/log.json`.
- **Pins:** pins in `changesSinceLast.added` get a "NEW" tag.
- **Optional, for the demo:** a "Refresh log" screen listing the last 10 runs, with time, duration, sources and changes.

## 4. What the brief and compliance do (Lane C)

- **The brief.** The prompt already sees every pin. Lane C adds: when `meta.changesSinceLast.added` is not empty, the brief starts with "New since last refresh: ..." lines, cited to those pins.
- **The compliance strip.** It recomputes on every load (pure function), so a new violation flips C3 to FAIL automatically.
- **The eval.** It runs on the current files, so every refresh is checked by the same validator.

## 5. Demo beat (about 10 seconds, in the "limits" section at 1:35)

> "FireSight re-pulls 88 public sources for every building every 30 minutes. Here's the log. Last run 14:30, 4 seconds, one new permit. Each source keeps its own date, because the city publishes incidents about a month late, and we show that rather than hide it."

On screen: the refresh log, then the sources drawer with as-of dates. Backup: the GitHub Actions run history, which shows a green run every 30 minutes.

## 6. Done means

- [ ] `scripts/refresh.py --once` runs locally in under 30 s for 3 buildings and writes `meta.refreshedAt` and `web/public/refresh/log.json`
- [ ] Running it twice in a row produces no data change (idempotent)
- [ ] Workflow merged; one manual run (`workflow_dispatch`) green; one scheduled run green
- [ ] The phone shows "Refreshed HH:MM · every 30 min", the change feed and per-source as-of dates
- [ ] Nowhere in the UI, README or pitch says "live"
