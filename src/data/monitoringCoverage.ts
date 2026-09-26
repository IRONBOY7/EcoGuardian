/**
 * Prototype monitoring-coverage dataset for EcoGuard Ghana.
 *
 * This module is the single source of truth for the "Monitoring Coverage"
 * section. Values below are DEMO data used to render the coverage map,
 * statistics cards and zone detail panels. When real satellite / GIS feeds
 * become available, replace the contents of `MONITORING_ZONES` (and the
 * aggregate `COVERAGE_STATS`) with live data — the UI consumes only these
 * exports, so no component changes are required.
 */

export type MonitoringZoneStatus = "monitoring" | "change" | "high-risk";

export type MonitoringZoneType =
  | "Forest"
  | "Mining-affected area"
  | "Water body"
  | "Agricultural zone"
  | "Sensitive site";

export interface MonitoringZone {
  /** Stable identifier, e.g. "ashanti-kumasi-edge". */
  id: string;
  /** Display name of the monitored location. */
  location: string;
  /** Ghana region the zone belongs to. */
  region: string;
  lat: number;
  lng: number;
  /** Current prototype monitoring status. */
  status: MonitoringZoneStatus;
  /** Category of environment being watched. */
  zoneType: MonitoringZoneType;
  /** Last (simulated) satellite imagery date, ISO format. */
  lastImageryDate: string;
  /** Short human-readable change summary, e.g. "+18% canopy loss". */
  detectedChange: string;
  /** Prototype risk classification. */
  riskLevel: "Low" | "Medium" | "High";
}

export interface CoverageStat {
  value: string;
  label: string;
  hint: string;
}

/**
 * Prototype dashboard values. These are illustrative placeholders —
 * they are NOT real-world statistics.
 */
export const COVERAGE_STATS: CoverageStat[] = [
  { value: "24", label: "Monitoring Zones", hint: "Prototype zone count" },
  { value: "8", label: "Regions Covered", hint: "Prototype coverage" },
  { value: "3", label: "Active Change Alerts", hint: "Prototype alerts" },
  { value: "7", label: "Verified Cases", hint: "Prototype verifications" },
];

/**
 * Sample monitoring zones across Ghana. Coordinates are approximate
 * regional reference points for the prototype map.
 */
export const MONITORING_ZONES: MonitoringZone[] = [
  {
    id: "ashanti-forest-edge",
    location: "Kumasi forest edge",
    region: "Ashanti Region",
    lat: 6.72,
    lng: -1.6,
    status: "change",
    zoneType: "Forest",
    lastImageryDate: "2026-09-12",
    detectedChange: "+18% canopy disturbance",
    riskLevel: "Medium",
  },
  {
    id: "western-tarkwa-mining",
    location: "Tarkwa mining belt",
    region: "Western Region",
    lat: 5.3,
    lng: -1.98,
    status: "high-risk",
    zoneType: "Mining-affected area",
    lastImageryDate: "2026-09-18",
    detectedChange: "+31% surface disturbance",
    riskLevel: "High",
  },
  {
    id: "eastern-atewa-forest",
    location: "Atewa forest reserve",
    region: "Eastern Region",
    lat: 6.2,
    lng: -0.45,
    status: "monitoring",
    zoneType: "Forest",
    lastImageryDate: "2026-09-10",
    detectedChange: "No significant change",
    riskLevel: "Low",
  },
  {
    id: "western-north-sefwi",
    location: "Sefwi Wiawso farmlands",
    region: "Western North Region",
    lat: 6.2,
    lng: -2.48,
    status: "monitoring",
    zoneType: "Agricultural zone",
    lastImageryDate: "2026-09-08",
    detectedChange: "Stable vegetation cover",
    riskLevel: "Low",
  },
  {
    id: "central-pra-estuary",
    location: "Pra estuary wetlands",
    region: "Central Region",
    lat: 5.15,
    lng: -1.3,
    status: "change",
    zoneType: "Water body",
    lastImageryDate: "2026-09-14",
    detectedChange: "+9% water turbidity",
    riskLevel: "Medium",
  },
  {
    id: "bono-sunyani-farms",
    location: "Sunyani farm belt",
    region: "Bono Region",
    lat: 7.35,
    lng: -2.35,
    status: "monitoring",
    zoneType: "Agricultural zone",
    lastImageryDate: "2026-09-09",
    detectedChange: "Stable vegetation cover",
    riskLevel: "Low",
  },
  {
    id: "ahafo-goaso-mining",
    location: "Goaso mining fringe",
    region: "Ahafo Region",
    lat: 6.85,
    lng: -2.5,
    status: "high-risk",
    zoneType: "Mining-affected area",
    lastImageryDate: "2026-09-16",
    detectedChange: "+22% land clearing",
    riskLevel: "High",
  },
];

export const MONITORING_STATUS_META: Record<
  MonitoringZoneStatus,
  { label: string; color: string; softBg: string; legend: string }
> = {
  monitoring: {
    label: "Monitoring",
    color: "#16a34a",
    softBg: "rgba(22, 163, 74, 0.12)",
    legend: "🟢 Monitoring",
  },
  change: {
    label: "Change detected",
    color: "#d97706",
    softBg: "rgba(217, 119, 6, 0.12)",
    legend: "🟡 Change Detected",
  },
  "high-risk": {
    label: "High-risk disturbance",
    color: "#dc2626",
    softBg: "rgba(220, 38, 38, 0.12)",
    legend: "🔴 High Risk",
  },
};

export function getMonitoringZoneById(id: string): MonitoringZone | undefined {
  return MONITORING_ZONES.find((zone) => zone.id === id);
}
