import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Info,
  Layers,
  MapPin,
  Satellite,
  X,
} from "lucide-react";
import {
  COVERAGE_STATS,
  MONITORING_STATUS_META,
  MONITORING_ZONES,
  MonitoringZone,
} from "../data/monitoringCoverage";

const GHANA_OVERVIEW_CENTER: [number, number] = [7.9465, -1.0232];

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | EcoGuardian Ghana (prototype)';
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

export const MonitoringCoverage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const changeLayerRef = useRef<L.LayerGroup | null>(null);
  const riskLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerToggles>({
    satellite: false,
    zones: true,
    change: true,
    risk: true,
  });

  const selectedZone: MonitoringZone | undefined = MONITORING_ZONES.find(
    (zone) => zone.id === selectedZoneId
  );

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
      zoom: 6,
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

    // Monitoring zone markers.
    const zonesGroup = L.layerGroup();
    MONITORING_ZONES.forEach((zone) => {
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
      zonesGroup.addLayer(marker);
    });
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Toggle base + overlay layers.
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
      {/* Section heading */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Prototype monitoring coverage
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Prototype / Demo Data
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Monitoring Coverage
        </h2>
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
          See where EcoGuard Ghana is monitoring environmental change.
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mt-2 max-w-3xl">
          EcoGuard Ghana is designed to watch selected forests, mining-affected
          areas, water bodies, agricultural zones and other environmentally
          sensitive locations across Ghana. The zones below are prototype
          examples — coverage will expand as additional satellite datasets and
          monitoring zones are integrated.
        </p>
      </div>

      {/* Coverage statistics */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {COVERAGE_STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all text-center"
            >
              <p className="font-display text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                {stat.value}
              </p>
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-1">
                {stat.label}
              </p>
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 mt-0.5">
                {stat.hint}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 mt-2 flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Prototype dashboard values for illustration — not real-world statistics.
        </p>
      </div>

      {/* Map + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Ghana coverage map panel */}
        <div className="lg:col-span-2 relative rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm bg-stone-900">
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-bold shadow-md border transition-all cursor-pointer ${
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
          <div className="absolute top-3 right-3 z-[1000] px-2.5 py-1.5 rounded-xl bg-slate-950/80 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-slate-700 backdrop-blur">
            Simulated layers
          </div>

          <div ref={mapContainerRef} className="w-full h-[420px] md:h-[520px] z-0" />

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-stone-900/95 backdrop-blur border border-stone-200 dark:border-stone-700 rounded-2xl shadow-md px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" /> Legend:
            </span>
            <span>🟢 Monitoring</span>
            <span>🟡 Change Detected</span>
            <span>🔴 High Risk</span>
          </div>
        </div>

        {/* Zone information panel */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
              Zone Details
            </h3>
            {selectedZone && (
              <button
                type="button"
                onClick={() => setSelectedZoneId(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedZone ? (
            <motion.div
              key={selectedZone.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Location
                </p>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {selectedZone.location}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Region
                </p>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {selectedZone.region} · {selectedZone.zoneType}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
              <dl className="space-y-2.5 text-xs border-t border-stone-100 dark:border-stone-800 pt-3">
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-stone-400 dark:text-stone-500 uppercase text-[10px] tracking-wider">
                    Monitoring status
                  </dt>
                  <dd className="font-semibold text-stone-800 dark:text-stone-200 text-right">
                    {MONITORING_STATUS_META[selectedZone.status].label}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-stone-400 dark:text-stone-500 uppercase text-[10px] tracking-wider">
                    Last imagery date
                  </dt>
                  <dd className="font-semibold text-stone-800 dark:text-stone-200 text-right">
                    {selectedZone.lastImageryDate}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-stone-400 dark:text-stone-500 uppercase text-[10px] tracking-wider">
                    Detected change
                  </dt>
                  <dd className="font-semibold text-stone-800 dark:text-stone-200 text-right">
                    {selectedZone.detectedChange}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-stone-400 dark:text-stone-500 uppercase text-[10px] tracking-wider">
                    Risk level
                  </dt>
                  <dd
                    className={`font-bold text-right ${
                      selectedZone.riskLevel === "High"
                        ? "text-red-600 dark:text-red-400"
                        : selectedZone.riskLevel === "Medium"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {selectedZone.riskLevel.toUpperCase()}
                  </dd>
                </div>
              </dl>
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                Prototype / Demo Data — illustrative values, not live satellite readings.
              </p>
            </motion.div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 leading-relaxed">
                Click any monitoring marker on the map to inspect that zone.
              </p>
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500">
                {MONITORING_ZONES.length} sample zones shown · Prototype / Demo Data
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expansion note */}
      <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3">
        Prototype monitoring coverage — this view does not claim real-time
        monitoring of all of Ghana. Coverage will expand as additional satellite
        datasets and monitoring zones are integrated.
      </p>
    </div>
  );
};

export default MonitoringCoverage;
