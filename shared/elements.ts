// Pre-incident plan elements (NFPA 1620-2020 clauses that NFPA 1660 carries over; we say "maps to NFPA 1660").
// Coverage per element comes from docs/plan/research-regs.md section 1: what SF public data can fill.
import type { Building, Pin } from "./building.ts";

export type Coverage = "filled" | "partial" | "officer";

export interface Element {
  id: string;
  name: string;
  clause: string;
  coverage: Coverage;
  layers: string[]; // pin layers or LayerStatus names that feed it
}

export const ELEMENTS: Element[] = [
  { id: "E1", name: "Construction type", clause: "5.2", coverage: "filled", layers: ["construction"] },
  { id: "E2", name: "Height, stories, footprint", clause: "5.2", coverage: "filled", layers: ["construction"] },
  { id: "E3", name: "Occupancy and use", clause: "Ch 6", coverage: "filled", layers: ["occupancy"] },
  { id: "E4", name: "Occupant load, units, rooms", clause: "Ch 6", coverage: "partial", layers: ["occupancy"] },
  { id: "E5", name: "Year built, retrofit status", clause: "5.2", coverage: "filled", layers: ["construction", "softstory"] },
  { id: "E6", name: "Utility shutoffs", clause: "5.3", coverage: "officer", layers: [] },
  { id: "E7", name: "Building systems, elevators", clause: "5.3", coverage: "partial", layers: ["permit"] },
  { id: "E8", name: "Site access and exposures", clause: "5.4", coverage: "filled", layers: ["exposure", "geo", "aerial"] },
  { id: "E9", name: "Security features, key box", clause: "5.5", coverage: "partial", layers: ["inspection", "violation"] },
  { id: "E10", name: "Fences and barriers", clause: "5.6", coverage: "officer", layers: [] },
  { id: "E11", name: "Sprinkler system and riser", clause: "7.3.1", coverage: "partial", layers: ["permit", "violation", "incident"] },
  { id: "E12", name: "Standpipes and PRVs", clause: "7.3.2", coverage: "partial", layers: ["violation"] },
  { id: "E13", name: "Fire pump", clause: "7.3.3", coverage: "officer", layers: [] },
  { id: "E14", name: "Fire department connection", clause: "7.3.4", coverage: "officer", layers: [] },
  { id: "E15", name: "Non-water systems", clause: "7.4", coverage: "partial", layers: ["permit", "fire_permit"] },
  { id: "E16", name: "Fire alarm and panel", clause: "7.5", coverage: "partial", layers: ["permit", "violation"] },
  { id: "E17", name: "Water supply, hydrants", clause: "Ch 7", coverage: "partial", layers: ["water"] },
  { id: "E18", name: "Special hazards: PV, ESS, hazmat", clause: "Ch 8", coverage: "partial", layers: ["permit", "fire_permit", "hazmat"] },
  { id: "E19", name: "Buildings under construction", clause: "8.4", coverage: "filled", layers: ["permit"] },
  { id: "E21", name: "On-site representative", clause: "9.3", coverage: "officer", layers: [] },
  { id: "E22", name: "Plan maintenance and review date", clause: "Ch 10", coverage: "filled", layers: [] },
];
// E20 (incident history) is size-up context, not an NFPA element, so it is not counted.

export function elementPins(b: Building, el: Element): Pin[] {
  return b.pins.filter((p) => el.layers.includes(p.layer));
}
