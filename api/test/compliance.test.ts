import { describe, expect, it } from "vitest";
import { evaluateCompliance, footprintAxesM, preplanCoverage } from "../../shared/compliance.ts";
import { hero } from "./fixture.ts";

const today = new Date("2026-10-22T12:00:00-07:00");

describe("evaluateCompliance on 400 Duboce", () => {
  const rows = Object.fromEntries(evaluateCompliance(hero(), today).map((r) => [r.id, r]));

  it("C1 passes on the 2026-08-04 R2 inspection", () => {
    expect(rows.C1).toMatchObject({ result: "pass", pinIds: ["inspection-r2-2026"], wording: "meets" });
    expect(rows.C1.summary).toContain("2026-08-04, 79 days ago");
  });
  it("C3 passes when the only violation is abated", () => {
    expect(rows.C3).toMatchObject({ result: "pass", pinIds: ["violation-alarm"] });
  });
  it("C4 is unknown with the applicable rule when a solar permit exists", () => {
    expect(rows.C4.result).toBe("unknown");
    expect(rows.C4.summary).toContain("4 ft clear perimeter");
  });
  it("C8 reports 7 filled, 9 partial, 5 officer of 21", () => {
    expect(rows.C8).toMatchObject({ result: "partial", wording: "maps to" });
    expect(preplanCoverage(hero()).counts).toEqual({ filled: 7, partial: 9, officer: 5 });
  });
});

describe("edge cases", () => {
  it("C1 fails when the last inspection is over a year old", () => {
    const b = hero();
    b.pins = b.pins.filter((p) => p.id !== "inspection-r2-2026");
    expect(evaluateCompliance(b, today)[0].result).toBe("fail");
  });
  it("C1 is unknown with no inspection pins", () => {
    const b = hero();
    b.pins = b.pins.filter((p) => p.layer !== "inspection");
    expect(evaluateCompliance(b, today)[0].result).toBe("unknown");
  });
  it("C3 fails on an open violation and is unknown when the fetch failed", () => {
    const b = hero();
    b.pins.push({ ...b.pins.find((p) => p.id === "violation-alarm")!, id: "violation-open", label: "EXIT BLOCKED", detail: "Exit blocked, status open." });
    expect(evaluateCompliance(b, today)[1]).toMatchObject({ result: "fail", pinIds: ["violation-open"] });
    b.layers = [{ layer: "violation", status: "fetch_failed" }];
    expect(evaluateCompliance(b, today)[1].result).toBe("unknown");
  });
  it("footprint axes are the bounding rectangle sides, not the diagonal", () => {
    const [s, l] = footprintAxesM([[0, 0], [30, 0], [30, 70], [0, 70]]);
    expect([Math.round(s), Math.round(l)]).toEqual([30, 70]);
    const rot = footprintAxesM([[0, 0], [21.2, 21.2], [-28.3, 70.7], [-49.5, 49.5]]);
    expect(rot.map(Math.round)).toEqual([30, 70]);
  });
});

describe("office tower (140 New Montgomery shape)", () => {
  const tower = () => {
    const b = hero();
    b.id = "sf-3722080"; b.heightM = 114.78; b.floors = 26; b.units = null; b.use = "Office";
    b.pins = b.pins.filter((p) => p.layer !== "inspection" && p.id !== "permit-solar");
    b.pins.push(
      { ...b.pins[0], id: "firepermit-76784-f22", layer: "permit", label: "BATTERY ROOM 33.6 GAL", detail: "Fire permit: battery system storage, floor 22 computer room.", anchor: { kind: "floor", floor: 22 } },
      { ...b.pins[0], id: "inspection-hr", layer: "inspection", label: "HIGH RISE ANNUAL INSPECTION", detail: "High Rise Annual Inspection, status Completed.", evidence: [{ ...b.pins[0].evidence[0], asOf: "2026-03-01" }] },
    );
    return b;
  };
  it("shows C7 instead of C1, and C5 for battery storage", () => {
    const rows = evaluateCompliance(tower(), today);
    expect(rows.map((r) => r.id)).toEqual(["C7", "C3", "C5", "C8"]);
    expect(rows[0]).toMatchObject({ result: "pass", pinIds: ["inspection-hr"] });
    expect(rows[2]).toMatchObject({ result: "unknown", pinIds: ["firepermit-76784-f22"] });
    expect(rows[2].summary).toContain("floor 22");
  });
  it("keeps C1 for apartments and has no C7 below 75 ft", () => {
    expect(evaluateCompliance(hero(), today).map((r) => r.id)).toEqual(["C1", "C3", "C4", "C8"]);
  });
});
