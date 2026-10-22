import { describe, expect, it } from "vitest";
import { evaluateCompliance, longestAxisM, preplanCoverage } from "../../shared/compliance.ts";
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
  it("longest axis is the footprint diagonal", () => {
    expect(longestAxisM([[0, 0], [3, 0], [3, 4], [0, 4]])).toBe(5);
  });
});
