# Idea shoot-out (judge blind, exactly as written). Hackathon super{set}, Track 1 Public Data APIs. Now ~11:45 PDT, projects due 17:00 (about 4 h 15 m of build left for a team of 4 with coding agents).

## Official rubric (100)
User Value & Impact 25 (clear meaningful problem, specific user) · Technical Execution 25 (working core, effective implementation) · Originality & Creativity 20 (novel or meaningful improvement on existing solutions) · Track Alignment & Responsible Data Use 20 (fits track; responsible data, privacy, consent) · Usability & Demo Clarity 10. Track 1 requirement: demonstrate how public data powers the solution AND acknowledge data limitations.

## Ideas from a teammate's report (their own scores in brackets: User/Tech/Orig/Data/Demo)
R1. Recall Radar [23/23/17/19/9 = 91]: investigate emerging vehicle safety signals by clustering NHTSA complaint narratives and linking official recalls. Buyer: fleet operators, used-car platforms, warranty teams. Demo: pick a model, cluster reports, reveal patterns and original complaints. Risk: complaints are self-reported, no exposure denominator. Metric: precision of hand-labelled theme clustering.
R2. ParcelScope [23/21/17/19/9 = 89]: join SF building permits, complaints and violations into an evidence-backed property report; explainable identity resolution plus cross-record contradiction detection. Buyer: property investors, insurers, due diligence. Risk: dirty addresses, ambiguous joins.
R3. PermitPulse [23/23/13/19/9 = 87]: municipal permits into ranked, source-backed sales leads for roofing/HVAC/suppliers. Risk: established category; permit isn't buying intent.
R4. RecallChain [23/23/13/19/9 = 87]: match a retailer inventory CSV against FDA food recall enforcement records with exact/possible/insufficient states.
R5. FacilityWatch [22/22/14/19/9 = 86]: EPA ECHO facility compliance timelines for PE/insurers/procurement.
R6. ContractGraph [22/21/16/18/8 = 85]: USAspending agency-vendor graph and whitespace for govcon BD.
R7. FireFootprint [22/19/14/18/9 = 82]: historical wildfire perimeter proximity for a property, for insurers/lenders.

## Ideas from a teammate's list
L1. Ticket Oracle: drop a pin, "next 2 hours: 34% chance of a ticket; enforcement sweeps ~10:15; street cleaning tomorrow 9" from SFMTA citations (millions of rows), sweeping schedule, meters. Live: judges type where they parked. Backtest last week's tickets for calibration. Buyer: delivery/rideshare fleets; MCP for routing agents. Risk: reads trivial.
L2. Cursed Storefronts: corners where businesses keep dying, "11 businesses since 2014, median 14 months", with permits, construction, 311 as context. Buyer: people signing commercial leases, small-business lenders, brokers. Data: SF Registered Business Locations (open/close dates), permits, 311.
L3. Ghost Bus Detector: log Muni predictions vs actual arrivals from ~11:30 via 511.org (free token needed) to measure prediction error by route; show corrected estimate. Risk: thin data if logger starts late.
L4. Shazam for Buildings: point phone at a crane/scaffolding/boarded building: what's being built, cost, contractor, how long stalled, complaints. Reuses FireSight GPS/compass + explode. Buyer: CRE intelligence, contractor leads, neighbors.
L5. Call a Building (voice): phone a number, say an address, the building answers in first person, grounded ("I don't remember that, no record"). Best as a layer on L4 or FireSight; weak standalone buyer.
L6. 1989, Tonight: replay Loma Prieta USGS shaking over today's buildings: "2,100 soft-story buildings in the red zone, 40% not retrofitted", timeline slider. Buyer: insurers, emergency managers. Risk: usable 1989 ShakeMap download unverified.

## Incumbent plan (already in progress)
F. FireSight: plan at plan/firesight/plan.md and the hub summary. A cited, floor-by-floor 3D pre-plan for any SF address for the officer on a responding engine; 12 public datasets resolved to one parcel (identity resolution: tax roll "50 CHURCH ST" vs permits "400 DUBOCE AVE", conflict 78 vs 79 units); explode in 3D/AR on Android; claims labelled VERIFIED/UNVERIFIABLE/CONFLICT; compliance strip (CA H&SC 13146.2 annual inspection PASS, CFC 1205 PV UNKNOWN, NFPA 1620/1660 elements 7/21); "What we don't know" limits panel + sources drawer; captain approve/strike; real read-only MCP server; first payer: pre-plan vendors (First Due/Tablet Command/ESO). State: ~1 h of research done (data live-tested, hero chosen, contract, design spec, demo script, judge research); no code yet.
