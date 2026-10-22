# FireSight: published voices of firefighters and investigators

Goal: give the pitch real, citable words about going in blind, because we cannot interview users today.
Owner: Vidyut. Written by master-finder at 11:31 PDT, Thu Oct 22 2026.

## Plain answer

- We have 6 verbatim quotes. Five are VERIFIED: the exact text was found in the primary page or PDF in this run (string match on the fetched copy). One is REPORTED: it was seen only in a search snippet.
- The opening slide should use #1 (Ed Smith, North Perth FD, on the Listowel roof collapse) and #2 (NIOSH report F2021-10, Spring Valley NY).
- Present them as "published words of firefighters and fire investigators", with the source on screen. They are not interviews and not our users.
- Gaps: no verbatim quote turned up for solar PV, illegal units or hoarding, or trust in on-scene data. Don't claim one.

## How to present honestly (one line)

On the slide: "From published investigations and firefighters' own words (not our interviews)", with the source and year under each quote. Never write "a firefighter told us".

## Opening slide (the best 2)

> "We definitely would have looked at things a lot different. If we had known that the roof structure in that building was of lightweight construction."
> Ed Smith, North Perth Fire Department (Ontario), on the 2011 Listowel fire that killed firefighters Ken Rea and Ray Walter. CTV News, Aug 19 2016.

> "The fire department had not conducted a formal pre-incident inspection of this facility nor developed a formal pre-incident plan."
> NIOSH Fire Fighter Fatality report F2021-10 (Spring Valley, NY, death of Firefighter Jared Lloyd), Dec 2024.

## All quotes, ranked by pitch strength

| # | Quote (exact text) | Speaker / source | Date | URL | State | Why it lands |
|---|---|---|---|---|---|---|
| 1 | "We definitely would have looked at things a lot different. If we had known that the roof structure in that building was of lightweight construction." Same article, same speaker: "Traditionally that style of building was built with a steel truss-type system ... That's what we thought was probably in the building." | Ed Smith, North Perth Fire Department, quoted by CTV News Kitchener. The article describes him only as "with the North Perth Fire Department". A search snippet called him fire chief, but that title is NOT CHECKED, so don't print it. | Article Aug 19 2016 (first_publish_date in page JSON); fire 2011 | https://kitchener.ctvnews.ca/new-safety-initiative-to-prevent-firefighter-deaths-1.3036110 | VERIFIED (HTTP 200, 11:27 PDT; exact strings found in page JSON) | It is a human voice, it involves two deaths, and the hazard is hidden (lightweight truss). It is the "if we had known" line. |
| 2 | "The fire department had not conducted a formal pre-incident inspection of this facility nor developed a formal pre-incident plan." Also: "Multiple additions and renovations were undertaken at the facility with various building construction materials used. However, records of these renovations and the original building construction were limited or non-existent." | NIOSH FFFIPP Report F2021-10, "Volunteer Firefighter Killed after Becoming Trapped at an Assisted Living Facility Fire and Two Firefighters Injured: New York" (Spring Valley; Jared Lloyd). "Lack of pre-incident planning" is listed among its contributing factors. | Dec 2024 (revised Dec 17 2024) | https://www.cdc.gov/niosh/firefighters/programs/pdfs/face202110.pdf | VERIFIED (fetched with WebFetch about 11:28 PDT; text pulled from the PDF; quotes are from Recommendation #1, p. 26, and the building description, pp. 5-6) | This is the official federal finding. Renovations with no records is the exact gap that permit data fills. Honesty note: the same report says "Firefighters had a familiarity with the various facility buildings" (from routine false alarms). So say the department had no plan. Don't say crews had never seen the building. |
| 3 | "These binders typically contained a hand-drawn diagram of the building, a moment-in-time snapshot. ... they usually didn't get looked at, because of all the other activities the officer had to accomplish, prior to arrival at the incident scene. This, in essence, became the death of the pre-plan program to the Elgin Fire Department." Also: "If responses were to locations without a pre-plan, responders had no information." | David A. Schmidt, Elgin (IL) Fire Department, "Developing a Pre-Incident Planning Program for the Elgin Fire Department", USFA Executive Fire Officer Program paper | Undated. It cites sources up to January 2013, so it is about 2013 (inferred). | https://apps.usfa.fema.gov/pdf/efop/efo47448.pdf | VERIFIED (HTTP 200, 11:30 PDT; text pulled from the PDF) | One quote covers both stale pre-plans (a "moment-in-time snapshot") and overload on the way to the call ("didn't get looked at"). It backs a short brief over a long binder. The same paper says reading pre-plans on scene "took the Battalion Chief's focus away from the incident ... and was a recipe for disaster." |
| 4 | "One of the factors that contributed to the injuries sustained in this incident was the lack of information about the contents of the ESS. Knowledge of the air temperatures throughout the ESS, the status of the battery modules, and the composition of the gases ... would have informed the strategy employed by the HAZMAT team on the scene and may have prevented the injuries sustained in the incident." | UL Firefighter Safety Research Institute (McKinnon, DeCrane, Kerber), "Four Firefighters Injured In Lithium-Ion Battery Energy Storage System Explosion: Arizona" (Surprise, AZ, April 2019) | Released July 28 2020 | https://fsri.org/research-update/report-four-firefighters-injured-lithium-ion-battery-energy-storage-system (PDF: https://d1gi3fvbl0xj2a.cloudfront.net/files/2021-07/Four_Firefighters_Injured_In_Lithium_Ion_Battery_ESS_Explosion_Arizona_0.pdf) | VERIFIED (HTTP 200, about 11:29 PDT; text pulled from the PDF, Recommendation #3 discussion) | The lithium battery hazard. It ties straight to DataSF's SFFD Fire Permits (893e-xam6), which list 344 battery ESS permits (per finder-datasf, 11:25 board). |
| 5 | "Having too much information may be more damaging than having too little." Also: "responders should only be given information if we expect them to do something with it." | Charles Bailey, FireRescue1 column "More information does not make for better decisions". In the column he describes his years as an officer, including on the hazmat unit. | Oct 1 2012 (datePublished in page JSON) | https://www.firerescue1.com/communications-interoperability/articles/more-information-does-not-make-for-better-decisions-XMEGW3w4mL2ZjARs/ | VERIFIED (HTTP 200, 11:27 PDT; exact strings found in page) | The design principle for the MDT: show only what changes the tactic. It heads off the judge's "AI slop" worry, because FireSight says less. |
| 6 | "Fire departments should conduct pre-incident planning inspections of buildings within their jurisdictions to facilitate development of safe fireground strategies and tactics." The same snippet says the size-up "did not fully consider ... the lightweight roof truss system". | NIOSH FFFIPP Report F2011-14 (Muncie, IN church fire, roof collapse), as relayed by FireRescue1 | 2011 to 2012 (NOT CHECKED) | Snippet source: https://www.firerescue1.com/fire-attack/articles/niosh-inadequate-size-up-contributed-to-ind-firefighter-death-zI9ASVgnSooZurya. Primary: https://www.cdc.gov/NIOSH/FIRE/reports/face201114.html | REPORTED (search snippet only; the CDC page returned 403 to curl and 404 to WebFetch at about 11:28 PDT) | A backup truss example. Don't use it on a slide unless someone reads the primary page first. |

Extra line, usable as a caption (VERIFIED, same FSRI page, Steve Kerber, VP and Executive Director, UL FSRI, July 2020): "We're dealing with new technology, which brings about new fire-related hazards."

## What this means for the pitch

- Story arc: hidden hazard (#1) leads to no plan or missing records (#2). Plans that do exist go stale and go unread on the way in (#3). New hazards like batteries (#4) make it worse. So the answer is a short, current, sourced brief (#5), not more data.
- Every quote maps to a FireSight layer: building permits and renovations (#2), construction type (#1), the battery ESS permits (#4), and the brief-length rule (#5).

## Not found (searched, not claimed absent)

- Solar PV, illegal units or hoarding, trust in on-scene data: NOT FOUND (searched: "pre-plan outdated out of date building had changed fire captain"; "NIOSH hoarding pre-incident recommendation"; "MDT information overload pre-plan tablet firerescue1", all on WebSearch standard, Oct 22 2026). Leads not read in time: NIOSH F2026-05 (Virginia, hoarding, firefighter injured), https://www.cdc.gov/niosh/firefighters/programs/pdfs/f202605RS.pdf; the 2014 Brooklyn FDNY lieutenant LODD report (cluttered apartment).

## Not checked

- Ed Smith's exact title (#1). The Muncie primary text (#6). Any video or audio of these speakers.

GOAL: finder-voices met (6 quotes, 5 VERIFIED, top 2 picked, honesty line) · due 11:55 · finished 11:31 PDT
COST: 17/25 searches and fetches · 0 project files read beyond board tail · 12 runs · 0 sub-agents

CHECKED_AT: Thu Oct 22 11:31 PDT 2026
SUBJECT: 6 web sources listed above
CHECKED: CTV Kitchener page, NIOSH F2021-10 PDF, USFA EFO efo47448 PDF, UL FSRI page and PDF, FireRescue1 Bailey column, Firehouse Dec 10 2024 summary of F2021-10. Each verbatim string confirmed by grep on the fetched copy.
NOT CHECKED: Ed Smith title; NIOSH F2011-14 primary; hoarding and solar sources
UNRESOLVED: quote #6 wording (settle by reading face201114 in a browser)
