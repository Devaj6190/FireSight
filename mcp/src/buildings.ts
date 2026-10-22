// Read-only access to the cached building files Lane B builds (web/public/buildings/sf-<apn>.json).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Building, Pin } from "../../shared/building.ts";

export const BUILDINGS_DIR =
  process.env.FIRESIGHT_BUILDINGS ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/public/buildings");

export function loadAll(): Building[] {
  let files: string[] = [];
  try {
    files = readdirSync(BUILDINGS_DIR).filter((f) => /^sf-\d+\w*\.json$/.test(f));
  } catch {
    return [];
  }
  return files.map((f) => JSON.parse(readFileSync(path.join(BUILDINGS_DIR, f), "utf8")) as Building);
}

// Accepts "0874003", "0874/003", "0874-003" or "sf-0874003".
export function byApn(apn: string): Building | undefined {
  const key = apn.toLowerCase().replace(/^sf-/, "").replace(/[^0-9a-z]/g, "");
  return loadAll().find((b) => b.apn.toLowerCase() === key || b.id === `sf-${key}`);
}

export const normAddress = (s: string) =>
  s
    .toUpperCase()
    .replace(/[.,#]/g, " ")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\s+/g, " ")
    .trim();

export function pinCitation(p: Pin) {
  return {
    pinId: p.id,
    label: p.label,
    claim: p.claim,
    sources: p.evidence.map((e) => ({ datasetId: e.datasetId, recordId: e.recordId, asOf: e.asOf, url: e.url, rule: e.rule })),
  };
}
