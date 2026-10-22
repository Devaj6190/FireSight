import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { hero } from "./fixture.ts";

let app: { request: (url: string, init?: RequestInit) => Response | Promise<Response> };
let cases: string;

beforeAll(async () => {
  cases = mkdtempSync(path.join(tmpdir(), "fs-cases-"));
  process.env.FIRESIGHT_CASES_DIR = cases;
  process.env.NODE_ENV = "test";
  app = (await import("../src/index.ts")).default;
});

const post = (url: string, body: unknown) =>
  app.request(url, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
const line = { id: "b1", text: "Type 5, 4 stories.", pinIds: ["construction-mode"], claim: "verified", status: "pending" };

describe("routes", () => {
  it("rejects invalid JSON with 400", async () => {
    expect((await post("/api/strike", "{not json")).status).toBe(400);
  });
  it("rejects a building id that tries to leave the cases folder", async () => {
    const res = await post("/api/strike", { building: { ...hero(), id: "../../../evil" }, line });
    expect(res.status).toBe(400);
  });
  it("saves a strike inside the cases folder", async () => {
    const res = await post("/api/strike", { building: hero(), line: { ...line, id: "../b1" } });
    expect(res.status).toBe(200);
    const files = readdirSync(cases);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^sf-0874003-___b1-.*\.json$/);
  });
  it("rejects a strike line with no text", async () => {
    expect((await post("/api/strike", { building: hero(), line: { ...line, text: undefined } })).status).toBe(400);
  });
  it("computes compliance", async () => {
    const rows = await (await post("/api/compliance", { building: hero() })).json();
    expect(rows.map((r: { id: string }) => r.id)).toEqual(["C1", "C3", "C4", "C8"]);
  });
});
