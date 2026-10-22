# Floor cutaway and 3D assets: implementation and porting handoff

## Purpose

This branch replaces the flat arrival-view plate with an isolated architectural cutaway of the selected floor. The user requested a view resembling an exploded architectural drawing, with hazards and critical infrastructure represented as actual 3D assets on the floor.

Branch: `codex/floor-cutaway-assets`
Base: `34028e1` on `claude/jolly-pascal-cuq932`.

The latest `origin/main` was NOT merged: GitHub authentication prevented a fresh fetch. The local branch was behind its remote tracking branch. Port this work onto a freshly fetched integration branch; do not treat this checkout as the latest design. In particular, preserve the site card reported as added in PR #43.

## Integrated into main (Night Glass shell)

Merged into the current shell; the notes below describe the original branch. On integration:

- Kept main's shell and design. The branch's light `phone-*` layout overrides (full-height workspace, hidden header/sheet, its own `rooms-toggle` button) were not carried over: the cutaway opens from the dock chip (`Explore floor N` / `Back to floors`) and the floor panel, and records open in the existing sheet.
- The 3D drawing uses a dark drafting sheet under Night Glass; `?night=0` keeps the branch's pale paper.
- The overlay keeps the floor heading, the incident card (report / clear fire), the compass and the illustrative-assets note, restyled with the shell tokens. The four-part floor brief was dropped: people, hazards, floor above and water are already in the sheet's floor panel.
- `PhoneShell` widens the camera inset while the cutaway shows (left column on wide screens, top and dock on phones) so the floor is framed clear of the overlay; the refit uses the visible aspect, not the canvas aspect.
- Unrelated files from the branch (`scripts/__pycache__`, `scripts/open_pr.sh`, `docs/ui-design-principles.md`) were not merged. `archPlan.ts` is removed: nothing imports it any more.

## What changed

### Architectural cutaway

- Rebuilt `Rooms.tsx` as an isolated selected-floor view, retaining the existing Zustand `rooms` states and GSAP transition integration.
- Uses the real cached building footprint with a layered slab, fine outlines, raised facade sections, illustrative window bays, and camera-facing low cut edges.
- Replaced the map backdrop with a warm, pale drawing surface while the cutaway is open.
- Frames the floor rather than including street-level hydrants in the camera bounds.
- Refits the camera when the canvas changes size. This fixes opening the full-height view at phone sizes.
- Hides nonselected floor groups in `App.tsx`. Fading their materials to zero had left invisible geometry occluding the cutaway. Both above-ground floors and the basement obey the visibility rule.
- Removed the floating ceiling outline from the rendered cutaway to keep the selected floor unobstructed.
- Stops the normal auto-orbit through the existing rooms state.

### Actual 3D equipment assets

`EquipmentAsset.tsx` creates lightweight mesh-based illustrations, with no external asset downloads or new packages:

- Battery cabinet banks for battery/electrolyte records.
- Server/electrical cabinets for matching records.
- Cafeteria tables, chairs, and a service counter for recorded food/cafeteria use.
- Pump and pipe assemblies for pump records.
- Horizontal tanks for fuel/tank records.
- Control panels for matching alarm/control/suppression-system records.
- A warning placard for other hazards, rather than pretending every hazard is a particular piece of equipment.

Floor 22 of 140 New Montgomery demonstrates the battery-room and employee-cafeteria assets. The cabinets and tables are diagram symbols: their counts, sizes, equipment configuration, and positions are NOT sourced measurements.

`floorMarkers.ts` selects public records anchored to the selected floor and floor-specific occupancy categories. It computes separated diagram anchors inside the footprint, with boundary clearance. Up to six markers are displayed. Labels are connected to the 3D illustrations and explicitly say that their position is unverified. Source-backed markers and their meshes open the existing provenance panel.

### Incident and operational context

`floorIncident.ts` separates current dispatch/crew reports from historical public incidents. Merely selecting a floor, or finding a historical fire record, does not make that floor an active fire location.

The cutaway includes:

- Reported fire/smoke floor and report origin, with exact position marked unknown.
- A `Report fire on this floor` control for an explicit user-entered crew report, plus `Clear my report` for that locally added report.
- A pale red floor and darker red outline when fire/smoke is reported on that floor. This is a floor-level highlight, not a fire-spread simulation or an exact fire-point marker.
- Reported people, recorded occupancy type, and a clear distinction from live headcount.
- Hazards on the selected floor, stale-record wording, and source links.
- Hazards on the floor above and building-level sprinkler coverage where available.
- Nearest recorded hydrant, explicitly at street level, with its record date.
- Explicit unknowns for stairs, standpipe locations, and interior layout.

Reports are stored in the in-memory building object. They are not saved to a backend or transmitted. Reloading or changing buildings clears them. The report classifier is a simple text heuristic and is not a production incident parser.

### Presentation

- Opening the cutaway creates a full-height workspace instead of squeezing the model between the original mobile header and sheet.
- Wide layouts retain the existing information sidebar; narrower layouts open it for a selected source record.
- The current layout uses CSS selectors tied to the existing `phone-app`, `phone-stage`, `phone-sheet`, and provenance structure. These selectors must be adapted when porting to a redesigned shell.
- A compact incident panel and four-part floor brief accompany the model.
- Renamed the existing floor-panel action from `Show rooms` to `Explore floor · illustrative shell`. This is the only change in `Floors.tsx`; keep the newer site card and other design changes when integrating it.

## File map

| File | Responsibility |
| --- | --- |
| `web/src/Rooms.tsx` | Cutaway scene, animation, camera fit, source interactions, incident and brief overlays |
| `web/src/cutawayGeometry.ts` | Slab, facade, glazing, linework, clipped drafting-grid geometry |
| `web/src/EquipmentAsset.tsx` | Mesh-based battery, server, cafeteria, pump, tank, panel and warning assets |
| `web/src/floorMarkers.ts` | Floor-specific records and unverified diagram placements |
| `web/src/floorIncident.ts` | Dispatch/crew incident context, floor hazards, water and protection records |
| `web/src/arrival.ts` | Existing arrival-data helper adopted as a dependency; estimated columns removed and assembly capacity copy clarified |
| `web/src/rooms.css` | Architectural styling, markers, incident brief and responsive workspace rules |
| `web/src/App.tsx` | Hide other floor groups and wire source selection into the overlay |
| `web/src/shell/Floors.tsx` | One action-label change only |
| `web/src/cutaway.test.ts` | Cached-building geometry/placement checks and incident-state regression tests |

## Data boundaries to preserve

1. The building outline is recorded; the facade styling is illustrative. It is not a surveyed floor plan, and the outer footprint may not describe setbacks on every story.
2. A record naming floor 22 does not locate equipment within floor 22. Never remove the unverified-position labels unless actual coordinates are supplied by a source.
3. Do not invent stair, exit, standpipe, FDC, interior wall, or evacuation-route locations.
4. Do not infer a current fire from public historical incident records or from the selected-floor number.
5. Do not label permit assembly capacity as a current number of people.
6. Building-wide systems remain building-wide context. Do not arbitrarily anchor them to the selected floor.
7. Keep stale record dates and provenance accessible. The example battery record is from 2017 and does not confirm current equipment presence.

## Porting onto the existing designs

1. Authenticate GitHub and fetch the latest main. Start a fresh integration branch from the intended current design branch.
2. Bring over `cutawayGeometry.ts`, `EquipmentAsset.tsx`, `floorMarkers.ts`, `floorIncident.ts`, `arrival.ts`, and the tests first. These contain most of the reusable implementation.
3. Integrate the scene and transition logic from `Rooms.tsx` into the current floor-view component. It uses existing `Ctx`, `play`, `fadeFor`, `near`, `t`, and the `rooms` state machine; it does not require a new global store.
4. Preserve the `App.tsx` nonselected-floor visibility fix. Keep the selected floor's cutaway group visible, and restore the complete floor stack when exiting.
5. Route `onSelectPin` through the existing provenance UI.
6. Restyle the overlays with the current design tokens. Avoid copying the shell-wide `:has(...)` layout overrides blindly: adapt them to the current sidebar/sheet structure.
7. Merge only the action wording from this branch's `Floors.tsx`, retaining the latest site card from PR #43 and any other incoming floor-panel work.
8. Re-test opening/closing, floor changes, B1, source selection, fire-report add/clear, and browser resizing. Confirm that the selected floor stays unobstructed.

## Validation

Commands from the FireSight root:

```powershell
npm.cmd run build --prefix web
node --experimental-strip-types --test web/src/cutaway.test.ts
```

- Production TypeScript/Vite build passed. Vite still reports the large-bundle warning.
- Five regression tests passed: finite generated geometry and valid floor-marker anchors for each of the four cached buildings; historical/public incidents and different selected floors do not become current fire locations.
- Visually checked the live floor-22 cutaway at the normal preview size and 390 x 844. Verified battery/cafeteria assets and fixed the phone camera refit.
- Verified source-link interaction opens the battery permit provenance.
- Verified adding a temporary crew fire report changes the incident panel and floor highlight. Reloaded afterwards so the preview does not retain that test report.

## Remaining integration work and limits

- Fetch/merge latest main and validate the PR #43 site card after integration. This was blocked by GitHub authentication here.
- No accurate interior layout, equipment coordinates, or equipment models are available from these records. The assets are deliberately illustrative.
- Marker placement is geometric, not a full screen-space collision solver. Dense floors and unusual camera angles may need label decluttering. Six markers is the current display cap.
- Asset selection and fire-report detection use text matching; structured source fields would be better for a production implementation.
- Closing the existing provenance sheet can return to the broader floor view under the current shell behavior.
- The working directory contained an already-deleted `archPlan.ts`, untracked design notes, and unrelated scripts before this handoff. Those unrelated changes are excluded from this feature commit. The new cutaway does not import `archPlan.ts` or render its old stair/core layout.
- No deployment, push to main, or automatic merge is part of this change.
