// FireSight MCP server: read-only, cited building intelligence for San Francisco addresses.
// Serves the cached building files; it never writes, never calls out, and never invents a fact.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Building, BriefLine } from "../../shared/building.ts";
import { evaluateCompliance } from "../../shared/compliance.ts";
import { byApn, loadAll, normAddress, pinCitation } from "./buildings.ts";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const Claim = z.enum(["verified", "unverifiable", "conflict"]);
const Source = z.object({ datasetId: z.string(), recordId: z.string(), asOf: z.string(), url: z.string(), rule: z.string() });
const Citation = z.object({ pinId: z.string(), label: z.string(), claim: Claim, sources: z.array(Source) });
const Compliance = z.object({ id: z.string(), rule: z.string(), citation: z.string(), result: z.string(), summary: z.string(), wording: z.string() });
const LIMITS = [
  "Heights from 2010 LiDAR; outlines as of 2023-09.",
  "Hydrants and cisterns: 2018 SF DEM snapshot.",
  "Fire incidents run about 4 weeks behind; calls about 8 hours. Not live.",
  "Units per floor come from permit text: a lower bound.",
  "No floor plans: stairs and standpipe locations are unverifiable.",
];

const server = new McpServer({ name: "firesight", version: "0.1.0" });

const notFound = (apn: string) => ({
  isError: true,
  content: [{ type: "text" as const, text: `No cached building for parcel "${apn}". Cached: ${loadAll().map((b) => `${b.apn} (${b.address})`).join(", ") || "none"}.` }],
});

const ok = <T extends Record<string, unknown>>(data: T) => ({
  structuredContent: data,
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

server.registerTool(
  "resolve_address",
  {
    title: "Resolve an address to a parcel",
    description:
      "Resolve a San Francisco street address (or an alias such as the tax-roll name) to the cached building's parcel number. Returns which alias matched and how.",
    inputSchema: { address: z.string().describe("Street address, e.g. '400 Duboce Ave' or '50 Church St'") },
    outputSchema: {
      matches: z.array(z.object({ apn: z.string(), buildingId: z.string(), address: z.string(), matched: z.string(), aliases: z.array(z.string()) })),
    },
    annotations: { title: "Resolve address", ...READ_ONLY },
  },
  async ({ address }) => {
    const q = normAddress(address);
    const matches = loadAll().flatMap((b) => {
      const names = [b.address, ...b.resolution.aliases, ...b.resolution.links.map((l) => l.example)];
      const hit = names.find((n) => n && (normAddress(n) === q || normAddress(n).startsWith(q) || q.startsWith(normAddress(n))));
      return hit ? [{ apn: b.apn, buildingId: b.id, address: b.address, matched: hit, aliases: b.resolution.aliases }] : [];
    });
    return ok({ matches });
  },
);

server.registerTool(
  "get_building_intel",
  {
    title: "Building intelligence",
    description:
      "Every public-record fact FireSight holds for a parcel: construction, units, floors, hazards by floor, conflicts between sources, unknowns, compliance checks and data limits. Each fact carries its claim label (verified, unverifiable, conflict) and its source records.",
    inputSchema: { apn: z.string().describe("Parcel number, e.g. '0874003' or '0874/003'") },
    outputSchema: {
      buildingId: z.string(),
      address: z.string(),
      aliases: z.array(z.string()),
      floors: z.number(),
      heightM: z.number(),
      yearBuilt: z.number().nullable(),
      constructionType: z.string().nullable(),
      units: z.number().nullable(),
      facts: z.array(z.object({ pinId: z.string(), label: z.string(), detail: z.string(), claim: Claim, severity: z.string(), where: z.string(), sources: z.array(Source) })),
      conflicts: z.array(z.object({ field: z.string(), summary: z.string() })),
      unknowns: z.array(z.string()),
      compliance: z.array(Compliance),
      limits: z.array(z.string()),
      fetchedAt: z.string(),
    },
    annotations: { title: "Building intelligence", ...READ_ONLY },
  },
  async ({ apn }) => {
    const b = byApn(apn);
    if (!b) return notFound(apn);
    return ok({
      buildingId: b.id,
      address: b.address,
      aliases: b.resolution.aliases,
      floors: b.floors,
      heightM: b.heightM,
      yearBuilt: b.yearBuilt,
      constructionType: b.constructionType,
      units: b.units,
      facts: b.pins
        .filter((p) => p.origin === "public")
        .map((p) => ({ ...pinCitation(p), detail: p.detail, severity: p.severity, where: where(p.anchor) })),
      conflicts: b.conflicts.map((c) => ({ field: c.field, summary: c.summary })),
      unknowns: b.unknowns,
      compliance: compliance(b),
      limits: LIMITS,
      fetchedAt: b.fetchedAt,
    });
  },
);

server.registerTool(
  "get_size_up_brief",
  {
    title: "Size-up brief",
    description:
      "A radio-ready size-up brief for a parcel. Every line cites the public records it states and carries a claim label; facts with no public record come back as unverifiable, never guessed. Read-only.",
    inputSchema: { apn: z.string().describe("Parcel number, e.g. '0874003'") },
    outputSchema: {
      buildingId: z.string(),
      address: z.string(),
      lines: z.array(z.object({ text: z.string(), claim: Claim, element: z.string().nullable(), citations: z.array(Citation) })),
      unknowns: z.array(z.string()),
      compliance: z.array(Compliance),
      generatedBy: z.string(),
      createdAt: z.string(),
    },
    annotations: { title: "Size-up brief", ...READ_ONLY },
  },
  async ({ apn }) => {
    const b = byApn(apn);
    if (!b) return notFound(apn);
    const brief = b.fallback?.brief;
    const lines = brief ? brief.lines.filter((l) => l.status !== "struck") : briefFromPins(b);
    const pins = new Map(b.pins.map((p) => [p.id, p]));
    return ok({
      buildingId: b.id,
      address: b.address,
      lines: lines.map((l) => ({
        text: l.text,
        claim: l.claim,
        element: l.element ?? null,
        citations: l.pinIds.flatMap((id) => (pins.has(id) ? [pinCitation(pins.get(id)!)] : [])),
      })),
      unknowns: brief?.unknowns ?? b.unknowns,
      compliance: compliance(b),
      generatedBy: brief ? `${brief.model}, checked by the FireSight citation validator` : "pin labels (no model)",
      createdAt: brief?.createdAt ?? b.fetchedAt,
    });
  },
);

function where(a: Building["pins"][number]["anchor"]): string {
  if (a.kind === "floor") return a.floor === 0 ? "basement" : `floor ${a.floor}`;
  if (a.kind === "ground") return `${Math.round(a.distanceM)} m at ${Math.round(a.bearingDeg)} deg`;
  return a.kind;
}

function compliance(b: Building) {
  return evaluateCompliance(b).map(({ id, rule, citation, result, summary, wording }) => ({ id, rule, citation, result, summary, wording }));
}

// Without a precomputed brief, each public pin is its own line, danger first: no model, nothing added.
function briefFromPins(b: Building): BriefLine[] {
  const rank = { danger: 0, caution: 1, info: 2 } as const;
  return b.pins
    .filter((p) => p.origin === "public" && p.claim !== "unverifiable")
    .sort((x, y) => rank[x.severity] - rank[y.severity])
    .map((p, i) => ({ id: `p${i + 1}`, text: p.label, pinIds: [p.id], claim: p.claim, status: "pending" as const }));
}

await server.connect(new StdioServerTransport());
