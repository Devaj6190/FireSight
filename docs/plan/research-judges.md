# FireSight judges: who they are and what to tweak (super{set} hack, Thu Oct 22 2026)

Written by master-finder 11:12 to 11:16 PDT. Public sources only. No LinkedIn pages were opened; LinkedIn handles below come from the event's own Luma host JSON or from the person's own GitHub or website.

## Bottom line (read this first)
1. The panel is engineer-heavy and two judges (Vidit, Harshal) work at Checksum, which sells AI-written Playwright tests with a human engineer verifying the AI. A visible **"the brief never invents a fact" test harness** plus the officer approve/strike step framed as "human verifies the AI" speaks their language directly. Highest leverage tweak.
2. Two judges run Bigged (quant analytics for Meta ad spend, "decisions with data, not guesswork"), one is a VC: put **one coverage number and one buyer line** on screen, and only numbers we measured ourselves.
3. Vignesh (Meta) builds agentic commerce infrastructure and protocols and writes about tech governance: the **MCP clip should show a typed, read-only, cited tool response**, not just "an agent called it".
4. Identity is weak for 3 judges (Harshal, Triyansha, Fricative company): treat tweaks aimed at them as UNVERIFIED guesses.
5. No decision needed from Vidyut; Lane C owns tweak 1, Lane D owns tweaks 2, 4, 5.

## Companies
| Company | One line | State | Evidence |
|---|---|---|---|
| Checksum.ai | AI-generated, self-healing Playwright E2E and API tests; "Results as a Service" with "human engineer final verification"; "every bug becomes a test". A super{set} portfolio company. | VERIFIED | https://checksum.ai/ (HTTP 200, 11:13 PDT), quotes: "Your coding agent needs a testing buddy", "Monitors production errors: every bug becomes a test", "includes human engineer final verification so Checksum delivers 100% ready-to-go, working Playwright tests". Portfolio status from plan/research-superset.md (same day). |
| Bigged | "Research lab optimizing $200m/yr of Meta ads spend"; "Quantitative analysis for paid social advertising. Make decisions with data, not guesswork." Bigged Ltd, London address on contact page; blog posts on Meta API tokens and partner access (Mar 2026). | VERIFIED (self-description, the $200m figure is their claim) | https://www.bigged.com/ , /contact, /blog, /reports (HTTP 200, 11:10 to 11:16 PDT). No team page (/about, /team, /company all 404). |
| Fricative | NOT FOUND. fricative.ai is a parked page (JS redirect to /lander); fricative.com returns an empty page. "Fricative" is a speech-sound term, which hints at voice AI, but that is a guess (UNVERIFIED). | NOT FOUND (searched: "Kanika Gupta engineer Fricative", "Fricative AI startup voice San Francisco", "\"Fricative\" startup engineer AI company 2026" on WebSearch; curl fricative.ai, fricative.com, fricative.co; Oct 22 2026) | Ask Kanika at demo time if relevant. |

## The judges
Match method is stated per person. "Host" means listed as an event host in the Luma page JSON (https://luma.com/superset-hy5n, fetched 11:12 PDT).

### 1. Harshal Hirpara, Lead Engineer, Checksum.ai
- **Match: UNRESOLVED.** Luma lists a host named only "Harshal" (no surname, no links). GitHub has `harshal-swe` ("Harshal J Hirpara", no bio) and `Hjhirp` ("Harshal Hirpara", bio "MS CS student at the University of Illinois Chicago... Computer Vision, Deep Learning", links linkedin.com/in/harshaljhirpara). Neither profile names Checksum, so I cannot tie them to him. `harshal-swe` forked `openwhispr` (privacy-first local voice dictation), weak signal at best.
- **Role-based read (UNVERIFIED, inferred from Checksum's product):** a lead engineer at a test-automation company will probe reliability: what happens on bad input, how do you know the AI is right, is the demo flaky.
- **Impress:** a passing test run on screen; graceful "UNKNOWN" on a sparse address; no crash on a live address. **Annoy:** accuracy claims with no test behind them; a demo that only works on the one rehearsed building.
- Hackathons judged: NOT FOUND (searched: "Harshal Hirpara hackathon OR judge OR checksum", "Harshal Hirpara Checksum lead engineer linkedin").

### 2. Vidit Naik, Software Engineer (Forward Deployed Engineer), Checksum AI
- **Match: VERIFIED.** GitHub `vidit1906` ("Vidit Naik") links to viditnaik.netlify.app, whose meta description reads "Software engineer shipping LLM systems into production at Checksum AI" and shows "Position: FDE · CHECKSUM AI · Base: SAN FRANCISCO" (fetched 11:14 PDT). Same name, employer and city as the slide.
- **What he builds (VERIFIED, his repo `vidit1906/portfolio` file `src/data/knowledge-base.md`):** at Checksum since Nov 2025, "architecting self-healing QA pipelines by integrating LLM models like Claude to automatically analyze DOM changes and patch broken selectors", internal LLM agents for code quality, live demos and workshops for enterprise clients. Before: Neo4j knowledge graph with LLM entity extraction (biomedical digital twins); a UCR robotics lab project putting an LLM on drone control with a RAG pipeline that cut hallucination ("increasing command execution accuracy by 68%"). Testing stack listed: Playwright, PyTest. Repos include `spotify_mcp`, `llmdronecontrol`, `ros_chatbot`. His portfolio is styled as "an engineer's atlas" (maps and cities motif).
- **Impress (inferred from the above):** grounding with a measured hallucination check; Claude used well; an MCP server he can imagine calling; a data join that looks like a knowledge graph (parcel, permits, violations, incidents). **Annoy:** "the AI is accurate" with no number; hand-waved data joins.
- Hackathons judged: NOT FOUND (one search on name; no record).

### 3. Aaron Morris, Co-Founder and CTO, Bigged
- **Match: UNRESOLVED.** No public page found tying an Aaron Morris to Bigged (searched "\"Aaron Morris\" Bigged CTO", "Bigged startup Zara Paul Aaron Morris"; Bigged site has no team page). Namesakes found and **not** him: an Annalect data director (theorg.com), an insider at The Network Connection. Do not cite these.
- **Read via company (VERIFIED company facts, inferred taste):** CTO of a quant analytics product built on the Meta Ads API. Likely values clean data pipelines, rate limits, caching, and numbers that are measured.
- **Impress:** a crisp "data in, how joined, how fresh" diagram; one measured coverage number. **Annoy:** vanity metrics, unsourced market sizes.

### 4. Rachana Mansighnka (likely Rachana Mansinghka), PM; Stealth AI Founder
- **Match: REPORTED, likely.** Happenstance profile `rachana-2182` (fetched 11:13 PDT): "Rachana Mansinghka, GM, AI Product Leader, Co-Founder, Startup Advisor, ex-Meta, Gusto, Wayfair", San Francisco; summary says she led AI-driven personalization at Wayfair, co-founded a wellness marketplace scaled across two countries and acquired, mentors women in product (Women In Product, First Round Fast Track). Aggregator profile (tier 3), and it does not mention a stealth company, so the match is name plus city plus PM/founder role only.
- **Impress (inferred):** a named user (the officer on the engine), the exact moment of use (the 4 minutes en route), and a workflow fit (approve/strike, send to crew). **Annoy:** feature tour without a user story; "for everyone" positioning.

### 5. Kanika Gupta, Engineer at Fricative
- **Match: VERIFIED as event host**, Luma host JSON: "kanika gupta", bio "Ai engineer @ seed startup + foodie!!!", twitter `kxg5522`, instagram `builtbykanika`, LinkedIn handle `/in/kanikagupta16`. **GitHub `KanikaGupta16` is a likely match by handle only (UNVERIFIED):** repos `dating_voice` ("voice agent to help in social skills", Feb 2026), `reseller` ("End to end automation ... Depop and FB Marketplace, negotiator"), `AutoML` ("no code platform ... with just natural language prompt"), `mapmysite`. Namesakes not her: Kanik Gupta (Google), several student Kanika Guptas in India.
- **Impress (UNVERIFIED, from the likely GitHub):** voice agents and end-to-end agent automation, so the voice ask and radio readout, and agents acting through MCP. **Annoy:** a voice feature that lags or mishears on stage.

### 6. Triyansha Vijayvargiya, VC and 2x AI Founder
- **Match: NOT FOUND** (searched: "Triyansha Vijayvargiya", "\"Triyansha\" founder VC AI", "Triyansha Vijayvargiya founder linkedin" on WebSearch; GitHub user search "Triyansha": 7 accounts, none with name, bio or links; Oct 22 2026). Nothing beyond the slide.
- **Role-based read (UNVERIFIED):** a VC who has founded twice will ask who pays, how you get in the door, and why now. **Impress:** one buyer line and a wedge ("every address in a station's first-due area gets a current draft pre-plan"). **Annoy:** TAM slides from listicles, numbers we cannot source.

### 7. Vignesh Sreedhar, Meta; CalHacks judge
- **Match: VERIFIED.** GitHub `vig-star` ("Vignesh Sreedhar", company "meta", bio "eng @ meta | fintech + ai", San Francisco) links to vigneshsreedhar.com (fetched 11:13 PDT).
- **What he builds (VERIFIED, his site):** joined Meta in early 2025 as a software engineer in fintech; "I work on agentic commerce infra across Meta surfaces (Muse, Ads, Meta AI), shape industry protocols ... and build systems that process hundreds of billions of dollars in payments." Building page: "Pay with Muse: enabling agentic tokens and virtual cards for Muse's browser-use agents", AI checkout on Meta Ads with Stripe, Adyen, PayPal, Shopify. GitHub has a fork of `agentic-commerce-protocol` (OpenAI and Stripe spec) and an ARC-AGI symbolic solver ("3rd of 91 students"). Georgia Tech CS; coauthored AI-governance papers; "I want to help build a world where everyone can use technology safely and reliably."
- **Impress:** agent-to-agent interfaces done as a protocol (typed MCP tools, explicit scopes, citations in the payload), safety and human approval before anything reaches the crew. **Annoy:** an agent that acts without guardrails; unclear data provenance.
- CalHacks judging: per the slide only. NOT FOUND publicly (searched "Vignesh Sreedhar Meta CalHacks judge"). What won at CalHacks: NOT CHECKED (time).

### 8. Zara Paul, Co-Founder and CEO, Bigged
- **Match: VERIFIED as event host** (Luma host JSON: first "Zara", last "Paul", LinkedIn handle `/in/zaraanita`). Bigged role: per slide only; no public page found tying her to Bigged (searched "Bigged startup Zara Paul Aaron Morris", "\"Bigged\" Meta ads quantitative founders Zara Paul", "\"Zara Anita Paul\" OR zaraanita Bigged", "bigged.com co-founder CEO Zara Paul linkedin").
- **Read via company (inferred):** a CEO selling "decisions with data, not guesswork" to ad spenders will reward a clear buyer, a measurable outcome, and a demo that shows a decision changing because of data.

## Five tweaks for this panel
Each one is cheap (under 45 minutes) and fits the plan's lanes. None needs new data.

| # | Tweak | Targets | Why (evidence) | Owner, cost |
|---|---|---|---|---|
| 1 | **Show the "never invents a fact" harness on stage (10 s).** Run the validator and canned-question test (plan claims C3, C4) live or as a terminal still: e.g. "N questions x 3 buildings: 0 uncited lines shipped, X of Y missing facts answered UNKNOWN". Add one adversarial prompt ("what floor is the standpipe on?") that must return UNKNOWN. Report only the numbers the run actually prints. | Vidit, Harshal, Kanika, Aaron | Checksum sells verified AI tests ("Your coding agent needs a testing buddy"); Vidit's own work is LLM self-healing QA and RAG to cut hallucination (knowledge-base.md). | Lane C, ~30 min (tests exist in plan as C3/C4; add a printable summary line) |
| 2 | **Frame approve/strike as "human verifies the AI, and every strike becomes a test case."** When the captain strikes a line, show a toast "added to regression set" and count it. One sentence: "same idea as a QA engineer signing off AI-written tests." | Vidit, Harshal (Checksum), Vignesh (safety), Rachana (workflow) | Checksum homepage: "human engineer final verification" and "every bug becomes a test". Vignesh: "use technology safely and reliably". | Lane D UI + Lane C append to a JSON file, ~30 min |
| 3 | **Make the MCP clip about the contract, not the call.** Show the tool schema (`get_size_up_brief(address)` returns lines with `pinIds`, sources, `unknowns[]`, read-only), then a dispatch agent receiving it and quoting "standpipe: unknown". Say "read-only, cited, the officer still approves". | Vignesh, Vidit, Aaron, Kanika | Vignesh builds agentic commerce infra and industry protocols, forked the Agentic Commerce Protocol; Vidit has a `spotify_mcp` repo and builds Claude agents; Kanika's likely repos are agent automations (UNVERIFIED match). | Lane C, ~20 min on top of the planned clip |
| 4 | **One measured data number and one buyer line, nothing unsourced.** On the business slide: a coverage number we compute today from DataSF (for example share of footprints in the demo area with a permit join and a construction type, run by Lane B), plus "buyer: the department's pre-planning officer; wedge: a current draft pre-plan for every address in one station's first-due area". Leave pricing off unless research-data.md sources it. | Zara, Aaron (Bigged), Triyansha (VC), Rachana | Bigged: "Make decisions with data, not guesswork"; VC and founder roles per slide; plan s7 already says pricing is pending finder and not to state unsourced numbers. | Lane B query ~15 min, Lane D slide ~15 min |
| 5 | **Open with a 1-line user story and keep voice tight.** BLUF first sentence: "Engine 6's captain has 4 minutes before the wheels stop; here is 400 Duboce." Then the voice ask "Where are the people?" with the radio readout. Pre-test the mic in the room; have the typed fallback one tap away so a voice miss never stalls. | Rachana (PM), Kanika (voice, UNVERIFIED), Triyansha, all | Rachana's AI product and PM background (Happenstance, REPORTED); Kanika's likely `dating_voice` repo (UNVERIFIED match); super{set} rewards BLUF (plan/research-superset.md, Tom Chavez "Judgement" post). | Lane D, ~10 min script + 5 min mic test |

**What would annoy this panel (avoid):** a stated accuracy or market number with no test or source behind it; the demo only working on one rehearsed building; a flaky step (testers notice flakes); calling tabletop AR "locked onto the real building"; implying the AI replaces the officer.

## Not checked
- Each judge's X/Twitter posts (x.com needs login for automation; not attempted). Podcasts and talks: not searched (time).
- What won at past CalHacks or other events these judges judged: not checked (time, and no judging record found).
- Fricative's product, Harshal's identity, Aaron Morris and Zara Paul's Bigged roles, Triyansha anything: UNRESOLVED (see each entry). Settling it: ask at demos, or a human glance at their LinkedIn.

## Sources
- https://luma.com/superset-hy5n (host JSON in __NEXT_DATA__), 200, 11:12 PDT
- https://checksum.ai/ , 200, 11:13 PDT
- https://www.bigged.com/ , /blog, /reports, /contact (200); /about, /team, /company (404), 11:10 to 11:16 PDT
- https://fricative.ai (parked, JS redirect to /lander), https://fricative.com (200, empty), 11:10 PDT
- https://vigneshsreedhar.com/ , /building, /writing, 200, 11:13 PDT; GitHub `vig-star` (gh api)
- https://viditnaik.netlify.app , 200, 11:14 PDT; GitHub `vidit1906` profile, README, `portfolio/src/data/knowledge-base.md` (gh api)
- https://happenstance.ai/u/rachana-2182 , 200, 11:13 PDT (tier 3 aggregator)
- GitHub users `KanikaGupta16`, `harshal-swe`, `Hjhirp`, `HJHirpara`, search "Triyansha" (gh api, 11:10 to 11:14 PDT)
- 21 WebSearch queries (listed per entry above); none of their result pages were cited except as noted
- /Users/vidyutsriram/projects/superset-hack/plan/research-superset.md and plan/firesight/plan.md (same day)

GOAL: finder-judges met (identity weak for 3 of 8 judges, stated) · due 11:45 · finished 11:16
COST: 33/40 searches plus fetches · 3 files read · 12 runs · 0 sub-agents

CHECKED_AT: Thu Oct 22 11:16 PDT 2026
SUBJECT: public web profiles of the 8 judges on the opening slide; Bigged, Checksum, Fricative sites
CHECKED: URLs and gh api calls listed in Sources; 21 web searches
NOT CHECKED: LinkedIn (standing rule), X/Twitter posts, podcasts, talks, past CalHacks winners
UNRESOLVED: Harshal Hirpara identity (ask or LinkedIn glance); Aaron Morris and Zara Paul roles at Bigged beyond the slide; Fricative product; Triyansha Vijayvargiya background; Rachana stealth company
