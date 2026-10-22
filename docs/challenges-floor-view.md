# Floor view: open challenges (where we need help)

Status as of 15:25, Oct 22. Branch `claude/jolly-pascal-cuq932`, PR #34. Owner: Rishit (Lane B).

## What exists today

- **Floor rail + floor panel** (merged, #28): tap any floor B1–26; the panel leads with people, then hazards, adjacent floors, recent work, not-on-record.
- **Per-floor data** (merged, #32): `Building.floorFacts` for every floor: permits naming the floor or its units, known units, fire origin, occupant load, occupants by type (business licenses + OSM indoor levels), Planning records, per-unit work.
- **Inside-a-floor view** (PR #34, in progress): being rebuilt right now as an "arrival view": real outline, street names per face (`Building.site.sides`), real OSM entrances, hydrants at real positions, floor size, and an "On this floor" card. Estimated rooms, corridor and elevator boxes are being removed.

## Challenges

### 1. There is no public floor plan, so the interior is mostly unknown
- SF publishes no plan sets as open data. PermitSF (OpenGov) record pages don't expose plan attachments publicly. OSM has almost no indoor mapping for these buildings. The only real drawings found are leasing plans (CBRE, floors 8–9 of 140 New Montgomery), which are copyrighted marketing material.
- Result: we know **what** is on a floor (battery room, cafeteria, 257-person assembly, units, recent work) but not **where** on the floor.
- **Help wanted:** any public, licensable source of floor plans or pre-fire plans for SF high-rises (SFFD high-rise pre-plans? DBI microfilm/3R? building owners' emergency plans?). Even one building would let us demo a real interior.

### 2. Safety rule: never draw stairs, exits or routes
- An estimated stair on a fire officer's screen reads as real and can send a crew the wrong way (Vidyut's 14:58 rule; NIOSH Deutsche Bank case). We removed Stair A/B and show "Stairs: not on public record · verify on arrival".
- Tension: the user story is "where do they come out, where are they going", and the honest answer is that public data cannot say.
- **Help wanted:** a firefighter's view on what is genuinely useful on a floor when stair locations are unknown (orientation by street face? floor size for hose stretch? standpipe code requirements?). Is there anything else safe to show?

### 3. Making the floor view intuitive, not a data slideshow
- The first version had too many labels and cards. The second (estimated architecture) looked clean but was invented. The third (arrival view, in progress) uses only real data.
- **Help wanted:** design review on the arrival view at 1440x900: is it obvious in 3 seconds which side you are arriving on, where the water is, and what's dangerous on this floor?

### 4. Data quality and coverage
- Occupants come from business-license addresses ("Ste 1200" → floor 12). Coverage is partial, and addresses without a suite or floor can't be placed.
- OSM levels use ground = 0; we convert to US floor numbering (+1). A wrongly tagged level would land on the wrong floor.
- Tenant names must never appear: permit and complaint text passes through an allowlist of construction words (`scrub_text` in `scripts/build_fixture.py`), and the floor panel shows a permit category. **Help wanted:** a second pair of eyes grepping `web/public/buildings/*.json` for names we missed.

### 5. Visual contrast in 3D
- The city context is mostly white, so a white floor plate disappears at ground level. The arrival view dims the city; it needs a check on a real screen and projector.

### 6. Infrastructure
- **Scheduled refresh never fired:** `.github/workflows/refresh.yml` has a 30-minute cron, but GitHub has not started it yet (new workflows can be delayed). Manual and backup dispatches work (green runs at 20:35Z, 20:50Z and later). **Help wanted:** anyone who knows why the schedule isn't firing.
- **Vercel previews** for #28 and #31–#34 show Error or Blocked. The build passes locally (`tsc -b`, `vite build`). Likely project or permission configuration; Devaj has access.
- **Windows dev gotcha:** `Rooms.tsx` vs the old `rooms.ts` differed only by case (now `roomPlan.ts`).
- **DataSF throttling:** bursts of evidence-URL checks get connection resets; rerun slowly.

## How to help fast
1. Pull `claude/jolly-pascal-cuq932`, run `cd web && npm i && npx vite`, open `http://localhost:5173/?focus=22`, click **Rooms · floor 22**.
2. Comment on PR #34 with what's confusing or wrong. Screenshots welcome.
3. For data sources (challenge 1), add a link and its license to this file.
