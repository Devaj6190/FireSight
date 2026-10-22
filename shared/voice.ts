// Spoken arrival brief, built only from the building's cited records: no model, instant, works offline.
// Life first: where people are, what is on the fire floor, water and access, what to verify. Nothing else is spoken.
// Each fact carries its source and year ("per fire permit 2017"), the radio form of a citation (design.md s6 rule 9).
import type { Building, Pin } from "./building.ts";

const SPOKEN_SOURCE: Record<string, string> = {
  "893e-xam6": "fire permit",
  "i98e-djp9": "building permit",
  "tyz3-vt28": "building permit",
  "wr8u-xric": "incident record",
  "4zuq-2cbe": "fire violation record",
  "wb4c-6hwj": "S F F D inspection",
  "5kya-mfst": "tall building inventory",
  "ynuv-fyni": "LiDAR",
  "wv5m-vpq2": "tax roll",
  "beah-shgi": "soft-story list",
  "Firefighting_ESF_4": "S F emergency management",
};
const COMPASS: Record<string, string> = { n: "north", s: "south", e: "east", w: "west" };
const compass = (d: string): string => (d.length === 3 ? `${COMPASS[d[0]]}-${compass(d.slice(1))}` : d.split("").map((c) => COMPASS[c]).join(""));
const RANK = { danger: 0, caution: 1, info: 2 } as const;

export function spokenSource(p: Pin): string {
  const e = p.evidence[0];
  if (!e) return p.origin === "public" ? "" : `per ${p.origin}`;
  const name = SPOKEN_SOURCE[e.datasetId] ?? SPOKEN_SOURCE[e.datasetId.split("/")[0]] ?? e.source.replace(/^DataSF\s+/, "").replace(/^(SFFD|DBI)\s+/, "").toLowerCase();
  return `per ${name} ${e.asOf.slice(0, 4)}`;
}

// "BATTERY ROOM 33.6 GAL" -> "Battery room 33.6 gallons"; spoken units and abbreviations.
export function speakable(label: string): string {
  const s = label
    .toLowerCase()
    .replace(/\bgal\b/g, "gallons")
    .replace(/\bft\b/g, "feet")
    .replace(/\bm\b/g, "meters")
    .replace(/\bb1\b/g, "B 1")
    .replace(/\bawss\s*/g, "")
    .replace(/\bfdc\b/g, "F D C")
    .replace(/\s\+\s/g, " and ")
    .replace(/\b(meters|from|to) (n|s|e|w|ne|nw|se|sw|nne|nnw|ene|ese|sse|ssw|wsw|wnw)\b/g, (_m, w, d) => `${w} ${compass(d)}`)
    .replace(/\s*[·|]\s*/g, ", ")
    .replace(/:\s*/g, ", ")
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const cite = (p: Pin) => [speakable(p.label), spokenSource(p)].filter(Boolean).join(", ");
const floorName = (f: number) => (f === 0 ? "basement level B 1" : `floor ${f}`);
const isPeople = (p: Pin) => /\b(people|persons|occupants|units|rooms)\b/i.test(p.label);

export type Section = "call" | "people" | "fire" | "bring" | "access" | "verify";
export type Beat = { text: string; floors: number[]; pinIds: string[]; section?: Section };
const beat = (text: string, pins: Pin[] = [], extra: number[] = [], section?: Section): Beat => ({
  section,
  text,
  floors: [...new Set([...extra, ...pins.flatMap((p) => (p.anchor.kind === "floor" ? [p.anchor.floor] : []))])],
  pinIds: pins.map((p) => p.id),
});
const floorOf = (p: Pin) => (p.anchor.kind === "floor" ? p.anchor.floor : null);
const join = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const REPORT = /\b(people|persons?|victims?|occupants?|someone|trapped|caller|child|children|kids?)\b/i;

// Ceiling, not a count: California Building Code Table 1004.5 allows 1 person per 150 gross sq ft in business (office) areas.
export function officeLoadPerFloor(b: Building): number | null {
  if (!/office|\bB\b/i.test(b.use ?? "") || b.footprint.length < 3) return null;
  let a = 0;
  b.footprint.forEach(([x, y], i) => {
    const [u, v] = b.footprint[(i + 1) % b.footprint.length];
    a += x * v - u * y;
  });
  return Math.round((Math.abs(a / 2) * 10.764) / 150 / 10) * 10;
}

// Short noun for an unknown: "Stair count and locations: no public floor plans" -> "stair count and locations".
const SHORT: [RegExp, string][] = [[/^stair/i, "stairs"], [/^standpipe/i, "standpipe and F D C"], [/^roof/i, "roof access"], [/^gas|shutoff/i, "utility shutoffs"], [/knox/i, "Knox box"]];
const unknownName = (u: string) => SHORT.find(([re]) => re.test(u))?.[1] ?? u.split(":")[0].trim().toLowerCase();

function peopleBeats(b: Building, verified: Pin[], fire: number | null, reports: Pin[]): Beat[] {
  const out: Beat[] = [];
  for (const r of reports) {
    const f = floorOf(r);
    out.push(beat(`Dispatch reports people${f !== null ? `, ${floorName(f)}` : ""}${f !== null && fire !== null && f !== fire ? `, ${Math.abs(f - fire) === 1 ? "one floor" : `${Math.abs(f - fire)} floors`} ${f > fire ? "above" : "below"} the fire` : ""}.`, [r]));
  }
  const counts = verified.filter(isPeople).sort((x, y) => (floorOf(x) ?? 999) - (floorOf(y) ?? 999));
  const placed = counts.filter((p) => floorOf(p) !== null).slice(0, 3);
  const loose = counts.filter((p) => floorOf(p) === null).slice(0, 1);
  const count = (p: Pin) => p.label.match(/(\d[\d,]*)\s+(people|persons|occupants|units|rooms)/i);
  const parts = placed.map((p) => {
    const m = count(p);
    return m ? `${m[1]} ${m[2].toLowerCase()} on ${floorName(floorOf(p)!)}` : speakable(p.label);
  });
  for (const p of loose) {
    const m = count(p);
    parts.push(p.claim === "conflict" || !m ? `${speakable(p.label).replace(/(,\s*records disagree)?$/i, " in total$1")}` : `${m[1]} more ${m[2].toLowerCase()}, floor not stated`);
  }
  if (parts.length) {
    const src = spokenSource(placed[0] ?? loose[0]);
    out.push(beat(`People on record: ${join(parts)}${src ? `, ${src}` : ""}.`, [...placed, ...loose]));
  }
  if (fire !== null && !counts.some((p) => floorOf(p) === fire)) {
    const load = officeLoadPerFloor(b);
    const above = fire < b.floors ? (fire + 1 === b.floors ? `, or on floor ${b.floors} above it` : `, or on floors ${fire + 1} to ${b.floors} above it`) : "";
    const span = above ? Array.from({ length: b.floors - fire + 1 }, (_, i) => fire + i) : [fire];
    out.push(beat(`No public headcount on ${floorName(fire)}${above}.${load ? ` Office code allows up to about ${load} people per floor.` : ""}`, [], span));
  }
  return out;
}

const floorsOf = (ps: Pin[]) => [...new Set(ps.map(floorOf).filter((f): f is number => f !== null))].sort((x, y) => x - y);
const floorsText = (fs: number[]) => (fs.length === 1 ? floorName(fs[0]) : `floors ${join(fs.map((f) => (f === 0 ? "B 1" : String(f))))}`);

// What the records say to bring or check: each item names its records, never an order.
export function bringBeat(b: Building, verified: Pin[], fire: number | null): Beat | null {
  const near = (p: Pin) => fire === null || (floorOf(p) !== null && Math.abs(floorOf(p)! - fire) <= 1);
  const items: { text: string; pins: Pin[] }[] = [];
  const energy = verified.filter((p) => /battery|energy storage|electrolyte|\bups\b/i.test(p.label) && near(p));
  if (energy.length) items.push({ text: `battery and electrolyte hazard on ${floorsText(floorsOf(energy))}`, pins: energy });
  const haz = verified.filter((p) => p.layer === "hazmat" && floorOf(p) !== null && near(p));
  if (haz.length) items.push({ text: `hazardous materials on ${floorsText(floorsOf(haz))}`, pins: haz });
  const fuel = verified.filter((p) => /diesel|fuel|propane|lpg|gasoline/i.test(p.label));
  const fuelAt = floorsOf(fuel.slice(0, 1));
  if (fuel.length) items.push({ text: `fuel on site${fuelAt.length ? `, ${fuelAt[0] === 0 ? "basement B 1" : floorsText(fuelAt)}` : ""}`, pins: fuel.slice(0, 1) });
  const high = b.floors >= 7 || b.heightM > 22.86;
  const stories = verified.find((p) => /stories/i.test(p.label));
  if (high) items.push({ text: "high-rise, plan on standpipe operations; standpipe outlets are not on public record", pins: stories ? [stories] : [] });
  const lift = verified.find((p) => /elevator rescue/i.test(p.label));
  if (lift) items.push({ text: speakable(lift.label).toLowerCase(), pins: [lift] });
  const build = verified.filter((p) => /build-out|tenant improvement/i.test(p.label) && near(p));
  if (build.length) items.push({ text: `layout may have changed, recent build-out on ${floorsText(floorsOf(build))}`, pins: build });
  if (!items.length) return null;
  const pins = items.flatMap((i) => i.pins);
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  return beat(`Bring and check: ${items.slice(0, 4).map((i) => cap(i.text)).join(". ")}.`, pins, [], "bring");
}

// One beat per spoken sentence; each carries the floors and pins it talks about, so the model lights up as it is read.
export function spokenBeats(b: Building, max = 8): Beat[] {
  const out: Beat[] = [];
  const dispatches = b.pins.filter((p) => p.origin === "dispatch");
  const call = dispatches.find((p) => !REPORT.test(p.label)) ?? dispatches[0];
  const reports = dispatches.filter((p) => p !== call && REPORT.test(p.label));
  const fire = call ? floorOf(call) : null;
  const type = b.constructionType?.match(/^\s*(\d|[A-D])\b/)?.[1];

  // 1. The call.
  const said = call?.label.toLowerCase().replace(/^dispatch:?\s*/, "") ?? "";
  out.push(
    beat(
      `${b.address}. ${b.floors} stories${type ? `, type ${type}` : ""}.${call ? ` Dispatch: ${said === "building" ? "fire reported" : said.replace(/:\s*/g, ", ")}${fire !== null && !/\bfloor\b/.test(said) ? `, ${floorName(fire)}` : ""}.` : ""}`,
      call ? [call] : [],
      [],
      "call",
    ),
  );

  const verified = b.pins.filter((p) => p.origin === "public" && p.claim !== "unverifiable" && p.evidence.length);
  // 2. Life.
  out.push(...peopleBeats(b, verified, fire, reports).map((x) => ({ ...x, section: "people" as const })));

  // 3. Fire floor, one above, one below: only what changes the job.
  if (fire !== null) {
    const near = verified
      .filter((p) => !isPeople(p) && ["fire_permit", "hazmat", "incident", "permit"].includes(p.layer))
      .filter((p) => floorOf(p) !== null && Math.abs(floorOf(p)! - fire) <= 1)
      .sort((x, y) => RANK[x.severity] - RANK[y.severity] || Math.abs(floorOf(x)! - fire) - Math.abs(floorOf(y)! - fire))
      .slice(0, 3);
    // What occupies the fire floor and the floor above, by type only (business licenses, OpenStreetMap indoor levels).
    const uses = [fire, fire + 1].flatMap((f) => {
      const occ = b.floorFacts?.find((x) => x.floor === f)?.occupants ?? [];
      return occ.slice(0, 2).map((o) => `${floorName(f)}, ${o.kind.toLowerCase()}${o.hazard ? `, ${o.hazard.toLowerCase()}` : ""}, per ${o.source.replace(/\s*\(.*\)$/, "").replace(/^SF /, "S F ")}`);
    });
    const useText = uses.length ? `Use on record: ${uses.join(". ")}. ` : "";
    out.push(
      near.length
        ? beat(`${useText}Near the fire floor: ${near.map(cite).join(". ")}.`, near, [fire], "fire")
        : beat(`${useText}No public record places a hazard on ${floorName(fire)} or the floors beside it.`, [], [fire], "fire"),
    );
  }
  const bring = bringBeat(b, verified, fire);
  if (bring) out.push(bring);

  // 4. Water and access.
  const pick = (re: RegExp, layers?: string[]) => verified.find((p) => re.test(p.label) && (!layers || layers.includes(p.layer)));
  const access = [
    pick(/sprinklered/i),
    pick(/fire pump|standpipe|\bfdc\b/i),
    pick(/high-pressure hydrant/i, ["water"]) ?? pick(/hydrant/i, ["water"]),
    pick(/^wind\b/i, ["wind"]),
  ].filter((p): p is Pin => !!p);
  if (access.length) out.push(beat(`Water and access: ${access.map(cite).join(". ")}.`, access, [], "access"));

  // 5. Verify on arrival.
  const unknowns = b.unknowns.slice(0, 3).map(unknownName);
  if (unknowns.length) out.push(beat(`No public record, verify on arrival: ${join(unknowns)}.`, [], [], "verify"));
  return out.slice(0, max);
}

export function spokenSizeUp(b: Building, max = 8): string[] {
  return spokenBeats(b, max).map((x) => x.text);
}

// After a dispatch update ("people trapped on 23"): only that floor, what is on it, and what to verify.
export function reportBeats(b: Building, report: Pin): Beat[] {
  const f = floorOf(report);
  const call = b.pins.find((p) => p.origin === "dispatch" && p !== report && !REPORT.test(p.label));
  const fire = call ? floorOf(call) : null;
  if (f === null) return [beat("Copy, people reported. No floor given.", [report])];
  const out = [beat(`Copy. People reported, ${floorName(f)}${fire !== null && f !== fire ? `, ${Math.abs(f - fire) === 1 ? "one floor" : `${Math.abs(f - fire)} floors`} ${f > fire ? "above" : "below"} the fire` : ""}.`, [report])];
  const verified = b.pins.filter((p) => p.origin === "public" && p.claim !== "unverifiable" && p.evidence.length);
  const here = verified.filter((p) => floorOf(p) === f).sort((x, y) => RANK[x.severity] - RANK[y.severity]).slice(0, 2);
  if (here.length) out.push(beat(`${floorName(f)[0].toUpperCase()}${floorName(f).slice(1)} records: ${here.map(cite).join(". ")}.`, here));
  const load = officeLoadPerFloor(b);
  if (!verified.some((p) => isPeople(p) && floorOf(p) === f)) out.push(beat(`No public headcount for ${floorName(f)}${load ? `; office code allows up to about ${load}` : ""}.`, [], [f]));
  out.push(beat(`Stairs to ${floorName(f)}: no public record, verify on arrival.`, [], [f]));
  return out;
}
