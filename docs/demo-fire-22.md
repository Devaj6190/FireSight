# Demo: test fire, floor 22, 140 New Montgomery St

A scripted walk-through of one simulated call, from dispatch to the inside of the fire floor, in about 3 minutes.
Everything about the fire is **simulated**: the dispatch line is made up, and the fire area comes from that line's
"east wing". The building, the battery rooms and the hydrants come from the cited public records, as everywhere else in
FireSight. The floor plan is an estimate, and the screen says so.

## Setup

- Laptop, Chrome, full screen. Open **https://firesight-ten.vercel.app/?scenario=fire22**, or run it locally with
  `cd web && npm run dev` and open `http://localhost:5173/?scenario=fire22`.
- With `?scenario=fire22` the dispatch fires on its own once the fly-in lands (about 4.5 s). Leave the parameter off to
  fire it by hand in step 2.
- To reset, reload the page.

The scenario dispatch line (`web/src/scenario.ts`):

> Structure fire, 140 New Montgomery St, smoke and flames reported 22nd floor, east wing.

## What you can tap

| Where | Tap | What happens |
|---|---|---|
| Assembled tower | anywhere on the building | The floors fan out (same as **Explode**) |
| Fanned floors | any floor | That floor opens into its rooms (estimated plan) |
| Red fire area or its **FIRE · EAST** tag | the fire, from any view | Straight to floor 22's plan, framed on the fire. From the assembled tower it explodes first |
| **Floor 22** chip in the top bar | | Same as tapping the fire |
| **FIRE · EAST** tag on the plan | | Opens the dispatch record (simulated) |

A tap that ends a camera drag (more than 6 px) is ignored, so you can still orbit freely. The pointer turns into a hand
over anything you can tap.

## The flow

### 1. Open (0:00 to 0:15)

The camera flies in over San Francisco to the tower.

> "A company officer has a few minutes in the rig. This is 140 New Montgomery, 26 stories, built 1925. Everything you
> see comes from city records."

### 2. Dispatch (0:15 to 0:35)

With `?scenario=fire22` this happens on its own. By hand: tap the address in the top bar (**Responding to**), then
**Test scenario → Simulated fire · floor 22, east wing**.

The tower fans out at floor 22. The **east end of floor 22 is a red block**, flickering, with a **FIRE · EAST
· simulated** tag. The block covers the rooms of the estimated plan at that end of the floor, not a dot.

> "Dispatch says flames on 22, east wing. FireSight puts the fire where the call says, on the real shape of the floor."

### 3. Arrival brief (0:35 to 1:00)

Panel on the right: **Hazards** shows the arrival brief, people first, then the fire floor (after the automatic
dispatch the panel opens on **Floors**; tap **Hazards** in the rail). Point at the **battery room
on floor 22** (33.6 gal electrolyte, SFFD fire permit) and the one on **floor 23**, directly above the fire.

> "There's a battery room on the fire floor and another one the floor above. Each line has its source and year."

Tap a brief line: its floors light up in the fan.

### 4. Into the fire floor (1:00 to 1:40)

**Tap the red fire area** (or its tag). The other floors disappear and the camera comes down onto floor 22's cutaway,
framed on the fire:

- **Red area at the east wing end:** the room where it started is solid red, the rooms next to it lighter (spread).
- **Battery room · 33.6 gal electrolyte** and the **employee cafeteria**: numbered record markers, positions unverified.
- **Reported incident** card, top left: fire/smoke reported on floor 22, from dispatch, unverified.

> "The outline of this floor is exact. Where things sit on it is illustrative, and the screen says so."

Tap the **FIRE · EAST** tag on the cutaway: the record panel shows it came from the dispatch line, marked unverifiable.

### 5. The floor above (1:40 to 2:10)

Tap **Back to floors** to go back to the fan. Then **tap floor 23** in the fan: it opens straight into
its plan, with its own battery room.

> "Fire goes up. One tap and we're on 23, where the second battery room is."

### 6. Tap to explode (2:10 to 2:35)

**Collapse** (dock, bottom left). The tower stands assembled with the **red band at the east end of floor 22** showing
through the facade.

**Tap the tower**: it fans out again. **Collapse** once more, then **tap the red band**: the tower explodes and lands
directly in floor 22's plan at the fire, in one move.

> "No buttons needed. Tap the building to open it, tap a floor to go inside, tap the fire to go to the fire."

### 7. Close (2:35 to 3:00)

> "Nothing here is an order. It's what the records say and what they don't, and the officer decides."

Optional: **Ask** "What is above the fire floor?" or the mic for a spoken brief.

## If something goes wrong

- **The dispatch didn't fire:** use the **Test scenario** button on the Respond page (step 2).
- **The fire area doesn't show:** the dispatch line has to name a floor and a side ("east wing", "northwest corner").
  The plain hero dispatch ("smoke reported 22nd floor") draws no fire area, by design.
- **Stuck mid-animation or on the wrong floor:** reload. `?scenario=fire22` runs it again.
- **Slow laptop:** add `&glass=0` for solid panels.

## How the fire area is placed

`web/src/scenario.ts` reads the side from the dispatch line ("east wing" becomes east). `archPlan()` in
`web/src/archPlan.ts` then takes the estimated plan of that floor and picks the full-size room farthest toward that side
as the origin, plus its neighbours toward the same end as the spread. The hazard rooms are placed first, so naming a
side never moves them. The same cells are drawn as a red block on the stacked tower (`web/src/Fire.tsx`) and as red
the red area on the cutaway (`web/src/Rooms.tsx`). Any dispatch that names a floor and a side gets a fire area, not just this
scenario.
