import { describe, expect, it } from "vitest";
import { NO_RECORD, checkLine, validateAnswer, validateBrief } from "../src/ai/validate.ts";
import { hero } from "./fixture.ts";

const b = hero();

describe("checkLine", () => {
  it("accepts a verified line citing a verified pin with evidence", () => {
    expect(checkLine(b, { text: "Unit 311: load-bearing wall partly removed 2019.", pinIds: ["permit-201910044012"], claim: "verified" })).toBeNull();
  });
  it("accepts dispatch pins without evidence", () => {
    expect(checkLine(b, { text: "Smoke from unit 311, floor 3.", pinIds: ["dispatch-1"], claim: "verified" })).toBeNull();
  });
  it("drops a line citing a pin that does not exist", () => {
    expect(checkLine(b, { text: "Sprinklered throughout.", pinIds: ["permit-made-up"], claim: "verified" })).toBe("unknown_pin");
  });
  it("drops a verified line with no citations", () => {
    expect(checkLine(b, { text: "Two stairwells.", pinIds: [], claim: "verified" })).toBe("uncited");
  });
  it("drops a verified line backed only by an unverifiable public pin", () => {
    expect(checkLine(b, { text: "Something.", pinIds: ["permit-bogus"], claim: "verified" })).toBe("unsupported_verified");
  });
  it("needs a recorded conflict for a conflict line", () => {
    expect(checkLine(b, { text: "Conflict: tax roll 78 units, permits 79.", pinIds: ["occupancy-units"], claim: "conflict" })).toBeNull();
    expect(checkLine(b, { text: "Conflict: alarm.", pinIds: ["violation-alarm"], claim: "conflict" })).toBe("unsupported_conflict");
  });
  it("allows an unverifiable line with no pins, but not with fake pins", () => {
    expect(checkLine(b, { text: "Unknown: stairs, standpipe.", pinIds: [], claim: "unverifiable" })).toBeNull();
    expect(checkLine(b, { text: "Unknown: stairs.", pinIds: ["nope"], claim: "unverifiable" })).toBe("unknown_pin");
  });
  it("drops empty text", () => {
    expect(checkLine(b, { text: "  ", pinIds: [], claim: "unverifiable" })).toBe("empty_text");
  });
});

describe("validateBrief", () => {
  it("keeps good lines, numbers them, and counts drops", () => {
    const { lines, dropped } = validateBrief(b, [
      { text: "Type 5 wood frame, 4 stories.", pinIds: ["construction-mode", "construction-mode"], claim: "verified", element: "E1" },
      { text: "Sprinklered throughout.", pinIds: ["made-up"], claim: "verified", element: null },
      { text: "Unknown: stairs, standpipe.", pinIds: [], claim: "unverifiable", element: null },
    ]);
    expect(lines.map((l) => l.id)).toEqual(["b1", "b2"]);
    expect(lines[0]).toMatchObject({ pinIds: ["construction-mode"], element: "E1", status: "pending" });
    expect(lines[1]).not.toHaveProperty("element");
    expect(dropped).toEqual([{ text: "Sprinklered throughout.", pinIds: ["made-up"], claim: "verified", reason: "unknown_pin" }]);
  });
});

describe("validateAnswer", () => {
  it("returns the answer with highlight floors clamped to the building", () => {
    const { answer, dropped } = validateAnswer(b, "Where are the people?", {
      text: "Units on floors 1 to 4.", pinIds: ["construction-mode"], claim: "verified", floors: [4, 1, 2, 3, 9, 2], unknowns: ["stairs"],
    });
    expect(dropped).toBeNull();
    expect(answer.highlight).toEqual({ floors: [1, 2, 3, 4], pinIds: ["construction-mode"] });
  });
  it("replaces an ungrounded answer with no-record", () => {
    const { answer, dropped } = validateAnswer(b, "Is there a fire pump?", {
      text: "Yes, in the basement.", pinIds: [], claim: "verified", floors: [0], unknowns: [],
    });
    expect(answer).toMatchObject({ text: NO_RECORD, claim: "unverifiable", highlight: { floors: [], pinIds: [] } });
    expect(dropped?.reason).toBe("uncited");
  });
});

import { repeatsStrike, type StrikeCase } from "../src/strike.ts";

describe("repeatsStrike", () => {
  const c: StrikeCase = { id: "x", buildingId: "sf-0874003", reason: null, struckAt: "", line: { id: "b3", text: "Solar hot water on roof.", pinIds: ["permit-solar"], claim: "verified", status: "struck" } };
  it("matches the same text ignoring case and punctuation", () => {
    expect(repeatsStrike({ id: "b1", text: "solar hot water on roof", pinIds: [], claim: "unverifiable", status: "pending" }, c)).toBe(true);
  });
  it("matches the same claim on the same pins", () => {
    expect(repeatsStrike({ id: "b1", text: "Roof: 3,000 gal tank.", pinIds: ["permit-solar"], claim: "verified", status: "pending" }, c)).toBe(true);
  });
  it("does not match a different line", () => {
    expect(repeatsStrike({ id: "b1", text: "Type 5, 4 stories.", pinIds: ["construction-mode"], claim: "verified", status: "pending" }, c)).toBe(false);
  });
});

describe("unverifiable lines cannot assert facts", () => {
  it("drops an unverifiable brief line that is not 'Unknown: ...'", () => {
    const { lines, dropped } = validateBrief(b, [
      { text: "Building fully sprinklered.", pinIds: [], claim: "unverifiable", element: null },
      { text: "Unknown: stairs, standpipe.", pinIds: [], claim: "unverifiable", element: null },
    ]);
    expect(lines.map((l) => l.text)).toEqual(["Unknown: stairs, standpipe."]);
    expect(dropped[0].reason).toBe("unverifiable_asserts");
  });
  it("replaces an unverifiable answer's text with the unknowns", () => {
    const { answer } = validateAnswer(b, "Is it sprinklered?", { text: "Yes, fully.", pinIds: [], claim: "unverifiable", floors: [], unknowns: ["sprinkler coverage"] });
    expect(answer.text).toBe("No public record: sprinkler coverage.");
  });
});
