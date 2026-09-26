import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  MapPin,
  Satellite,
  X,
} from "lucide-react";
import {
  COVERAGE_STATS,
  COMPARISON_SITES,
  ComparisonSite,
  MONITORING_STATUS_META,
  MONITORING_ZONES,
  MonitoringZone,
} from "../data/monitoringCoverage";

const GHANA_OVERVIEW_CENTER: [number, number] = [7.9465, -1.0232];

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | EcoGuard Ghana (prototype)';
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community | Simulated layer";

function createZoneIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "monitoring-zone-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        transform: translate(-50%, -50%);
      "></div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

interface LayerToggles {
  satellite: boolean;
  zones: boolean;
  change: boolean;
  risk: boolean;
}

type RiskFilter = "all" | "high" | "medium" | "low";

const RISK_FILTER_OPTIONS: Array<{ value: RiskFilter; label: string }> = [
  { value: "all", label: "All sites" },
  { value: "high", label: "High risk" },
  { value: "medium", label: "Medium risk" },
  { value: "low", label: "Low risk" },
];

const SITE_RISK_COLORS: Record<ComparisonSite["risk"], string> = {
  high: "#c7463f",
  medium: "#d97706",
  low: "#5d9c55",
};

export const MonitoringCoverage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const changeLayerRef = useRef<L.LayerGroup | null>(null);
  const riskLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [siteId, setSiteId] = useState<ComparisonSite["id"]>("oda");
  const [layers, setLayers] = useState<LayerToggles>({
    satellite: false,
    zones: true,
    change: true,
    risk: true,
  });

  const selectedZone: MonitoringZone | undefined = MONITORING_ZONES.find(
    (zone) => zone.id === selectedZoneId
  );
  const selectedSite: ComparisonSite =
    COMPARISON_SITES.find((site) => site.id === siteId) ?? COMPARISON_SITES[0];

  const handleZoneSelect = (zone: MonitoringZone) => {
    setSelectedZoneId(zone.id);
    if (mapRef.current) {
      mapRef.current.flyTo([zone.lat, zone.lng], 8, { duration: 0.8 });
    }
  };

  const toggleLayer = (key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Initialize the coverage map once.
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: GHANA_OVERVIEW_CENTER,
      zoom: 6.2,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    osmLayerRef.current = L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    satelliteLayerRef.current = L.tileLayer(SATELLITE_TILE_URL, {
      attribution: SATELLITE_ATTRIBUTION,
      maxZoom: 19,
    });

    // Monitoring zone markers are populated by the risk-filter effect below.
    const zonesGroup = L.layerGroup();
    zonesGroup.addTo(map);
    zonesLayerRef.current = zonesGroup;

    // Simulated change-detection halos (amber) over changed / high-risk zones.
    const changeGroup = L.layerGroup();
    MONITORING_ZONES.filter((zone) => zone.status !== "monitoring").forEach(
      (zone) => {
        changeGroup.addLayer(
          L.circle([zone.lat, zone.lng], {
            radius: 30000,
            color: "#d97706",
            weight: 1.5,
            dashArray: "6 4",
            fillColor: "#f59e0b",
            fillOpacity: 0.12,
          })
        );
      }
    );
    changeGroup.addTo(map);
    changeLayerRef.current = changeGroup;

    // Simulated risk-area shading (red) over high-risk zones.
    const riskGroup = L.layerGroup();
    MONITORING_ZONES.filter((zone) => zone.status === "high-risk").forEach(
      (zone) => {
        riskGroup.addLayer(
          L.circle([zone.lat, zone.lng], {
            radius: 22000,
            color: "#dc2626",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 0.16,
          })
        );
      }
    );
    riskGroup.addTo(map);
    riskLayerRef.current = riskGroup;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      osmLayerRef.current = null;
      satelliteLayerRef.current = null;
      zonesLayerRef.current = null;
      changeLayerRef.current = null;
      riskLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Populate / refresh zone markers for the active risk filter.
  useEffect(() => {
    const group = zonesLayerRef.current;
    if (!group) return;

    group.clearLayers();
    MONITORING_ZONES.filter(
      (zone) =>
        riskFilter === "all" || zone.riskLevel.toLowerCase() === riskFilter
    ).forEach((zone) => {
      const meta = MONITORING_STATUS_META[zone.status];
      const marker = L.marker([zone.lat, zone.lng], {
        icon: createZoneIcon(meta.color),
        title: `${zone.location} — ${meta.label}`,
      });
      marker.on("click", () => handleZoneSelect(zone));
      marker.bindTooltip(
        `<strong>${zone.location}</strong><br/>${zone.region} · ${meta.label}`,
        { direction: "top", offset: [0, -14] }
      );
      group.addLayer(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskFilter]);

  // 3. Toggle base + overlay layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layers.satellite) {
      if (osmLayerRef.current) map.removeLayer(osmLayerRef.current);
      if (satelliteLayerRef.current) satelliteLayerRef.current.addTo(map);
    } else {
      if (satelliteLayerRef.current) map.removeLayer(satelliteLayerRef.current);
      if (osmLayerRef.current) osmLayerRef.current.addTo(map);
    }
  }, [layers.satellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zonesLayerRef.current) return;
    if (layers.zones) zonesLayerRef.current.addTo(map);
    else map.removeLayer(zonesLayerRef.current);
  }, [layers.zones]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !changeLayerRef.current) return;
    if (layers.change) changeLayerRef.current.addTo(map);
    else map.removeLayer(changeLayerRef.current);
  }, [layers.change]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !riskLayerRef.current) return;
    if (layers.risk) riskLayerRef.current.addTo(map);
    else map.removeLayer(riskLayerRef.current);
  }, [layers.risk]);

  const centerGhana = () => {
    if (mapRef.current) {
      mapRef.current.setView(GHANA_OVERVIEW_CENTER, 6.2);
    }
  };

  const layerButtons: Array<{
    key: keyof LayerToggles;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: "satellite", label: "Satellite", icon: <Satellite className="w-3.5 h-3.5" /> },
    { key: "zones", label: "Monitoring Zones", icon: <MapPin className="w-3.5 h-3.5" /> },
    { key: "change", label: "Change Detection", icon: <Activity className="w-3.5 h-3.5" /> },
    { key: "risk", label: "Risk Areas", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION HEAD — reference monitoring header + filters                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-[11px] tracking-[1.6px] font-extrabold text-[#559f45] dark:text-[#7ed957] mb-2.5">
            LIVE-STYLE DEMO
          </p>
          <h2 className="text-[26px] md:text-[30px] leading-tight font-bold text-[#17231b] dark:text-stone-100">
            Monitoring Coverage
          </h2>
          <p className="text-sm font-semibold text-[#559f45] dark:text-[#7ed957] mt-1.5">
            See where EcoGuard Ghana is monitoring environmental change.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
            aria-label="Filter monitoring sites by risk"
            className="border border-[#d3ddd4] dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 px-3 py-2.5 text-xs font-semibold text-[#24342a] dark:text-stone-200 cursor-pointer"
          >
            {RISK_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={centerGhana}
            className="bg-[#173322] text-white rounded-[9px] px-3 py-2.5 text-[11px] font-bold hover:bg-[#1e4230] transition-all cursor-pointer"
          >
            📍 Center Ghana
          </button>
        </div>
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-3xl -mt-2">
        EcoGuard Ghana is designed to watch selected forests, mining-affected
        areas, water bodies, agricultural zones and other environmentally
        sensitive locations across Ghana. The zones below are prototype
        examples — coverage will expand as additional satellite datasets and
        monitoring zones are integrated.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* COVERAGE STATISTICS — reference stats row                           */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="bg-white dark:bg-stone-900 border border-[#e1e8e1] dark:border-stone-700 rounded-xl px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-5 md:gap-y-0 md:divide-x md:divide-[#e3e9e4] dark:md:divide-stone-700">
          {COVERAGE_STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex gap-3 items-center md:px-4 first:md:pl-0 last:md:pr-0"
            >
              <span className="text-[25px] leading-none">{stat.icon}</span>
              <div>
                <b className="block font-display text-[22px] leading-none font-bold text-[#17231b] dark:text-stone-100">
                  {stat.value}
                </b>
                <small className="block text-[11px] text-[#66736b] dark:text-stone-400 mt-1">
                  {stat.label}
                </small>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#7b857e] dark:text-stone-500 mt-2.5 px-1">
          Prototype dashboard values for illustration — not real-world
          statistics.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MAP — reference map-wrap with legend + prototype note               */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative rounded-[18px] overflow-hidden shadow-[0_10px_35px_rgba(24,48,32,0.08)] bg-stone-900">
        {/* Layer controls overlay */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-1.5 max-w-[calc(100%-1.5rem)]">
          {layerButtons.map((btn) => {
            const active = layers[btn.key];
            return (
              <button
                key={btn.key}
                type="button"
                onClick={() => toggleLayer(btn.key)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[11px] font-bold shadow-md border transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-700 text-white border-emerald-800"
                    : "bg-white/95 dark:bg-stone-900/95 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Prototype badge overlay */}
        <div className="absolute top-3 right-3 z-[1000] px-2.5 py-1.5 rounded-lg bg-slate-950/80 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-slate-700 backdrop-blur">
          Simulated layers
        </div>

        <div ref={mapContainerRef} className="w-full h-[420px] md:h-[480px] z-0" />

        {/* Legend overlay — reference map-legend box */}
        <div className="absolute right-[15px] bottom-[15px] z-[1000] bg-white/95 dark:bg-stone-900/95 rounded-[10px] p-3 text-[11px] leading-[2] shadow-[0_2px_12px_rgba(0,0,0,0.13)] text-[#17231b] dark:text-stone-100">
          <b className="block font-extrabold">Legend</b>
          <div className="flex items-center gap-1.5">
            <i className="w-[9px] h-[9px] inline-block rounded-full bg-[#d94b42]" />
            High risk
          </div>
          <div className="flex items-center gap-1.5">
            <i className="w-[9px] h-[9px] inline-block rounded-full bg-[#e0a32d]" />
            Medium risk
          </div>
          <div className="flex items-center gap-1.5">
            <i className="w-[9px] h-[9px] inline-block rounded-full bg-[#5d9c55]" />
            Low risk
          </div>
          <div className="flex items-center gap-1.5">
            <i className="w-4 h-[3px] inline-block bg-[#3186c5]" />
            Water body
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ZONE DETAILS — shown when a marker is selected                      */}
      {/* ------------------------------------------------------------------ */}
      {selectedZone && (
        <motion.div
          key={selectedZone.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-stone-900 border border-[#e1e8e1] dark:border-stone-700 rounded-[13px] p-5"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-display text-base font-bold text-[#17231b] dark:text-stone-100">
                Zone Details
              </h3>
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                style={{
                  color: MONITORING_STATUS_META[selectedZone.status].color,
                  backgroundColor:
                    MONITORING_STATUS_META[selectedZone.status].softBg,
                  borderColor:
                    MONITORING_STATUS_META[selectedZone.status].color + "55",
                }}
              >
                {MONITORING_STATUS_META[selectedZone.status].legend}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedZoneId(null)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Location", value: selectedZone.location },
              { label: "Region", value: selectedZone.region },
              { label: "Zone type", value: selectedZone.zoneType },
              { label: "Last imagery date", value: selectedZone.lastImageryDate },
              { label: "Detected change", value: selectedZone.detectedChange },
              { label: "Risk level", value: selectedZone.riskLevel.toUpperCase() },
            ].map((field) => (
              <div
                key={field.label}
                className="bg-[#f4f7f3] dark:bg-stone-800 rounded-[10px] p-3.5"
              >
                <b className="block text-[10px] font-extrabold uppercase tracking-wide text-[#718077] dark:text-stone-400">
                  {field.label}
                </b>
                <strong
                  className={`block text-sm font-bold mt-1 text-[#17231b] dark:text-stone-100 ${
                    field.label === "Risk level"
                      ? selectedZone.riskLevel === "High"
                        ? "text-[#c7463f]"
                        : selectedZone.riskLevel === "Medium"
                        ? "text-[#d97706]"
                        : "text-[#5d9c55]"
                      : ""
                  }`}
                >
                  {field.value}
                </strong>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mt-3">
            Prototype / Demo Data — illustrative values, not live satellite
            readings.
          </p>
        </motion.div>
      )}

      {/* Prototype notice — reference .notice style */}
      <div className="bg-[#eef5ed] dark:bg-[#152419] border-l-4 border-[#6aaa59] p-3.5 text-xs leading-relaxed text-[#4e5e53] dark:text-stone-300">
        <b className="font-extrabold text-[#17231b] dark:text-stone-100">
          Prototype note:
        </b>{" "}
        Map markers and satellite layers in this first version are demonstration
        data. A deployed system would connect to regularly updated satellite
        imagery and automated change-detection services. Click any monitoring
        marker to inspect that zone ({MONITORING_ZONES.length} sample zones
        shown).
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BEFORE / AFTER COMPARISON — reference change-detection section      */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white dark:bg-stone-900 border border-[#e1e8e1] dark:border-stone-700 rounded-[22px] p-6 md:p-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-5">
          <div>
            <p className="text-[11px] tracking-[1.6px] font-extrabold text-[#559f45] dark:text-[#7ed957] mb-2.5">
              CHANGE DETECTION
            </p>
            <h2 className="text-[26px] md:text-[30px] leading-tight font-bold text-[#17231b] dark:text-stone-100">
              Before / After Comparison
            </h2>
          </div>
          <select
            value={siteId}
            onChange={(event) =>
              setSiteId(event.target.value as ComparisonSite["id"])
            }
            aria-label="Select comparison site"
            className="border border-[#d3ddd4] dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 px-3 py-2.5 text-xs font-semibold text-[#24342a] dark:text-stone-200 cursor-pointer"
          >
            {COMPARISON_SITES.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_55px_1fr] items-center gap-3">
          <div className="h-[260px] md:h-[330px] relative overflow-hidden rounded-[15px] bg-[#23452c]">
            <span className="absolute top-3 left-3 z-[2] bg-[#10271dcc] text-white px-2.5 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
              Before
            </span>
            <div className="eg-mock-forest h-full bg-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-[#10271dcc] text-white px-3 py-2.5 text-[11px]">
              2019 • Example imagery
            </div>
          </div>

          <div className="text-2xl text-center text-[#657168] dark:text-stone-400 py-2 md:py-0">
            ↔
          </div>

          <div className="h-[260px] md:h-[330px] relative overflow-hidden rounded-[15px] bg-[#23452c]">
            <span className="absolute top-3 left-3 z-[2] bg-[#10271dcc] text-white px-2.5 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
              After
            </span>
            <div className="eg-mock-disturbed h-full bg-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-[#10271dcc] text-white px-3 py-2.5 text-[11px]">
              2025 • Example imagery
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-4">
          <div className="bg-[#f4f7f3] dark:bg-stone-800 rounded-[10px] p-3.5">
            <b className="block text-[10px] font-extrabold uppercase tracking-wide text-[#718077] dark:text-stone-400">
              Detected change
            </b>
            <strong className="block text-lg font-bold mt-1 text-[#17231b] dark:text-stone-100">
              {selectedSite.change}
            </strong>
          </div>
          <div className="bg-[#f4f7f3] dark:bg-stone-800 rounded-[10px] p-3.5">
            <b className="block text-[10px] font-extrabold uppercase tracking-wide text-[#718077] dark:text-stone-400">
              Risk level
            </b>
            <strong
              className="block text-lg font-bold mt-1"
              style={{ color: SITE_RISK_COLORS[selectedSite.risk] }}
            >
              {selectedSite.risk.toUpperCase()}
            </strong>
          </div>
          <div className="bg-[#f4f7f3] dark:bg-stone-800 rounded-[10px] p-3.5">
            <b className="block text-[10px] font-extrabold uppercase tracking-wide text-[#718077] dark:text-stone-400">
              Suggested action
            </b>
            <strong className="block text-lg font-bold mt-1 text-[#17231b] dark:text-stone-100">
              {selectedSite.action}
            </strong>
          </div>
        </div>

        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mt-4">
          Prototype / Demo Data — illustrative values, not live satellite
          readings. Satellite detections require verification before
          enforcement action.
        </p>
      </section>
    </div>
  );
};

export default MonitoringCoverage;
