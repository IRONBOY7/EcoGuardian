import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Search,
  Check,
  AlertTriangle,
  RefreshCw,
  Compass,
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  Info,
  Globe,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import {
  GHANA_CAPITAL,
  GHANA_CENTER,
  GHANA_PRESET_LOCATIONS,
  GhanaLocationPreset,
  findClosestGhanaLocation
} from "../data/ghanaLocations";

// Custom Marker Icons for Leaflet
const createCustomIcon = (color: string, labelSymbol: string = "") => {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 13px;
        transform: translate(-50%, -50%);
      ">
        ${labelSymbol || "📍"}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Google Earth Engine satellite access gate constants
const EARTH_ENGINE_STORAGE_KEY = "ecoGuardianEarthEngineAccessGranted";
const EARTH_ENGINE_SIGNUP_URL = "https://signup.earthengine.google.com/";
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community | EcoGuardian Ghana';

const userLocationIcon = L.divIcon({
  className: "custom-user-marker",
  html: `
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
      transform: translate(-50%, -50%);
    ">
      <div style="
        position: absolute;
        inset: -6px;
        background-color: rgba(16, 185, 129, 0.35);
        border-radius: 50%;
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        background: linear-gradient(135deg, #059669, #10b981);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 6px 14px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        🎯
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

interface GhanaMapProps {
  selectedLocation?: { lat: number; lng: number; address?: string };
  onSelectLocation?: (loc: { lat: number; lng: number; address: string }) => void;
  reports?: any[];
  recyclingCenters?: any[];
  vehicles?: any[];
  onPinClick?: (pinData: any) => void;
  interactivePickerMode?: boolean;
  heightClass?: string;
}

export const GhanaMap: React.FC<GhanaMapProps> = ({
  selectedLocation,
  onSelectLocation,
  reports = [],
  recyclingCenters = [],
  vehicles = [],
  onPinClick,
  interactivePickerMode = false,
  heightClass = "h-[450px]"
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeMarkerRef = useRef<L.Marker | null>(null);
  const reportsLayerRef = useRef<L.LayerGroup | null>(null);
  const centersLayerRef = useRef<L.LayerGroup | null>(null);
  const vehiclesLayerRef = useRef<L.LayerGroup | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);

  // States
  const [currentLat, setCurrentLat] = useState<number>(
    selectedLocation?.lat || GHANA_CAPITAL.lat
  );
  const [currentLng, setCurrentLng] = useState<number>(
    selectedLocation?.lng || GHANA_CAPITAL.lng
  );
  const [currentAddress, setCurrentAddress] = useState<string>(
    selectedLocation?.address || "Accra, Greater Accra Region, Ghana"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ name: string; region?: string; lat: number; lng: number }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const [locationStatusType, setLocationStatusType] = useState<"success" | "error" | "info" | null>(null);

  const [mapLayerFilter, setMapLayerFilter] = useState<"all" | "incidents" | "centers" | "trucks">("all");

  // Google Earth Engine access gate state. Satellite imagery is only available
  // to users who have created (or already have) a Google Earth Engine account.
  const [showEarthEngineModal, setShowEarthEngineModal] = useState(false);
  const [acknowledgeHasAccount, setAcknowledgeHasAccount] = useState(false);
  const [isSatelliteLayer, setIsSatelliteLayer] = useState(false);
  const [earthEngineConfirmed, setEarthEngineConfirmed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(EARTH_ENGINE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Reverse Geocoding helper
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en"
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          // Format address concisely
          const parts = data.display_name.split(",");
          if (parts.length > 4) {
            return parts.slice(0, 4).join(", ") + ", Ghana";
          }
          return data.display_name;
        }
      }
    } catch (err) {
      console.warn("Osm reverse geocoding fallback used:", err);
    }
    return findClosestGhanaLocation(lat, lng);
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const initialCenter: [number, number] = [
      selectedLocation?.lat || GHANA_CAPITAL.lat,
      selectedLocation?.lng || GHANA_CAPITAL.lng
    ];

    const initialZoom = selectedLocation?.lat ? 13 : 8;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true
    });

    osmLayerRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | EcoGuardian Ghana',
        maxZoom: 19
      }
    ).addTo(map);

    // Initialize layer groups
    reportsLayerRef.current = L.layerGroup().addTo(map);
    centersLayerRef.current = L.layerGroup().addTo(map);
    vehiclesLayerRef.current = L.layerGroup().addTo(map);

    // Create user/picker active marker
    const marker = L.marker(initialCenter, {
      icon: userLocationIcon,
      draggable: true
    }).addTo(map);

    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      setCurrentLat(pos.lat);
      setCurrentLng(pos.lng);
      setLocationStatusMessage("Updating location address from pinpoint...");
      setLocationStatusType("info");

      const addr = await reverseGeocode(pos.lat, pos.lng);
      setCurrentAddress(addr);
      setLocationStatusMessage(`Location set to: ${addr}`);
      setLocationStatusType("success");

      if (onSelectLocation) {
        onSelectLocation({ lat: pos.lat, lng: pos.lng, address: addr });
      }
    });

    activeMarkerRef.current = marker;

    // Handle map clicks
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCurrentLat(lat);
      setCurrentLng(lng);

      setLocationStatusMessage("Fetching location details...");
      setLocationStatusType("info");

      const addr = await reverseGeocode(lat, lng);
      setCurrentAddress(addr);
      setLocationStatusMessage(`Selected Location: ${addr}`);
      setLocationStatusType("success");

      if (onSelectLocation) {
        onSelectLocation({ lat, lng, address: addr });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Render Incident Reports, Centers, Vehicles on Map Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    if (reportsLayerRef.current) reportsLayerRef.current.clearLayers();
    if (centersLayerRef.current) centersLayerRef.current.clearLayers();
    if (vehiclesLayerRef.current) vehiclesLayerRef.current.clearLayers();

    // Plot Incident Reports
    if (mapLayerFilter === "all" || mapLayerFilter === "incidents") {
      reports.forEach((rep) => {
        if (!rep.location?.lat || !rep.location?.lng) return;
        const color =
          rep.status === "Completed"
            ? "#0d9488"
            : rep.status === "Assigned"
            ? "#2563eb"
            : "#d97706";
        const icon = createCustomIcon(color, "⚠️");
        const m = L.marker([rep.location.lat, rep.location.lng], { icon });

        m.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #0f172a; font-size: 13px;">${rep.title}</strong><br/>
            <span style="font-size: 11px; color: #475569;">${rep.location.address || "Ghana"}</span><br/>
            <span style="display:inline-block; margin-top:4px; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; font-size: 10px; font-weight: bold;">Status: ${rep.status}</span>
          </div>
        `);

        m.on("click", () => {
          if (onPinClick) onPinClick({ type: "incident", ...rep });
        });

        reportsLayerRef.current?.addLayer(m);
      });
    }

    // Plot Recycling Centers
    if (mapLayerFilter === "all" || mapLayerFilter === "centers") {
      recyclingCenters.forEach((center) => {
        if (!center.lat || !center.lng) return;
        const icon = createCustomIcon("#059669", "♻️");
        const m = L.marker([center.lat, center.lng], { icon });

        m.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #065f46; font-size: 13px;">${center.name}</strong><br/>
            <span style="font-size: 11px; color: #475569;">${center.address}</span><br/>
            <span style="font-size: 10px; color: #059669; font-weight: bold;">${center.hours || "Open"}</span>
          </div>
        `);

        m.on("click", () => {
          if (onPinClick) onPinClick({ type: "center", ...center });
        });

        centersLayerRef.current?.addLayer(m);
      });
    }

    // Plot Vehicles / Fleet
    if (mapLayerFilter === "all" || mapLayerFilter === "trucks") {
      vehicles.forEach((truck) => {
        if (!truck.lat || !truck.lng) return;
        const icon = createCustomIcon("#4f46e5", "🚛");
        const m = L.marker([truck.lat, truck.lng], { icon });

        m.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #3730a3; font-size: 13px;">${truck.name}</strong><br/>
            <span style="font-size: 11px; color: #475569;">Status: ${truck.status}</span>
          </div>
        `);

        m.on("click", () => {
          if (onPinClick) onPinClick({ type: "truck", ...truck });
        });

        vehiclesLayerRef.current?.addLayer(m);
      });
    }
  }, [reports, recyclingCenters, vehicles, mapLayerFilter]);

  // 3. Pan map when external selectedLocation changes
  useEffect(() => {
    if (selectedLocation?.lat && selectedLocation?.lng && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      map.setView([selectedLocation.lat, selectedLocation.lng], 14, {
        animate: true
      });
      activeMarkerRef.current?.setLatLng([
        selectedLocation.lat,
        selectedLocation.lng
      ]);
      setCurrentLat(selectedLocation.lat);
      setCurrentLng(selectedLocation.lng);
      if (selectedLocation.address) {
        setCurrentAddress(selectedLocation.address);
      }
    }
  }, [selectedLocation]);

  // 4. "Use My Current Location" Handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatusMessage("Geolocation API is not supported by your browser or device.");
      setLocationStatusType("error");
      return;
    }

    setIsLocating(true);
    setLocationStatusMessage("Accessing device GPS coordinates...");
    setLocationStatusType("info");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLat(latitude);
        setCurrentLng(longitude);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15, {
            animate: true
          });
          activeMarkerRef.current?.setLatLng([latitude, longitude]);
        }

        setLocationStatusMessage(`GPS Lock achieved (±${Math.round(accuracy)}m accuracy). Fetching Ghanaian address...`);
        setLocationStatusType("info");

        const fetchedAddress = await reverseGeocode(latitude, longitude);
        setCurrentAddress(fetchedAddress);

        setLocationStatusMessage(`Updated to your current location: ${fetchedAddress}`);
        setLocationStatusType("success");

        if (onSelectLocation) {
          onSelectLocation({
            lat: latitude,
            lng: longitude,
            address: fetchedAddress
          });
        }
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation permission error:", error);
        let msg = "Unable to retrieve your current location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission was denied. Defaulting to Ghana region. You can manually pick a location or search below.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "GPS position unavailable. Map remains centered on Ghana.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please try again or search manually.";
        }
        setLocationStatusMessage(msg);
        setLocationStatusType("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // 5. Search Ghana Places
  const handleSearchInputChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setShowSearchResults(true);

    // First filter presets
    const queryLower = val.toLowerCase();
    const presetMatches = GHANA_PRESET_LOCATIONS.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.region.toLowerCase().includes(queryLower)
    ).slice(0, 6);

    setSearchResults(presetMatches);

    // If query is longer than 2 chars, query OSM Nominatim Ghana API dynamically
    if (val.length >= 3) {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            val
          )}&countrycodes=gh&format=json&limit=5&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          const dynamicResults = data.map((item: any) => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));

          // Merge without duplicate coordinates
          setSearchResults((prev) => {
            const combined = [...presetMatches];
            dynamicResults.forEach((d: any) => {
              if (
                !combined.some(
                  (c) =>
                    Math.abs(c.lat - d.lat) < 0.005 &&
                    Math.abs(c.lng - d.lng) < 0.005
                )
              ) {
                combined.push(d);
              }
            });
            return combined.slice(0, 8);
          });
        }
      } catch (err) {
        console.warn("OSM Ghana search notice:", err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSelectSearchResult = (res: {
    name: string;
    lat: number;
    lng: number;
  }) => {
    setCurrentLat(res.lat);
    setCurrentLng(res.lng);
    setCurrentAddress(res.name);
    setShowSearchResults(false);
    setSearchQuery("");

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([res.lat, res.lng], 14, { animate: true });
      activeMarkerRef.current?.setLatLng([res.lat, res.lng]);
    }

    setLocationStatusMessage(`Selected Location: ${res.name}`);
    setLocationStatusType("success");

    if (onSelectLocation) {
      onSelectLocation({
        lat: res.lat,
        lng: res.lng,
        address: res.name
      });
    }
  };

  // Quick preset jump
  const handleQuickPresetJump = (preset: GhanaLocationPreset) => {
    handleSelectSearchResult({
      name: `${preset.name}, ${preset.region} Region, Ghana`,
      lat: preset.lat,
      lng: preset.lng
    });
  };

  // Google Earth Engine access gate. Every user who clicks the Google Earth
  // satellite view must create an Earth Engine account before access is granted.
  const handleGoogleEarthClick = () => {
    if (earthEngineConfirmed) {
      toggleSatelliteLayer();
    } else {
      setShowEarthEngineModal(true);
    }
  };

  const grantEarthEngineAccess = () => {
    try {
      window.localStorage.setItem(EARTH_ENGINE_STORAGE_KEY, "true");
    } catch (err) {
      console.warn("Unable to persist Earth Engine access state:", err);
    }
    setEarthEngineConfirmed(true);
    setShowEarthEngineModal(false);
    setAcknowledgeHasAccount(false);
    if (!isSatelliteLayer) {
      toggleSatelliteLayer();
    }
  };

  const toggleSatelliteLayer = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (isSatelliteLayer) {
      satelliteLayerRef.current?.remove();
      satelliteLayerRef.current = null;
      if (osmLayerRef.current) {
        osmLayerRef.current.addTo(map);
      }
      setIsSatelliteLayer(false);
    } else {
      if (osmLayerRef.current) {
        osmLayerRef.current.remove();
      }
      satelliteLayerRef.current = L.tileLayer(SATELLITE_TILE_URL, {
        attribution: SATELLITE_ATTRIBUTION,
        maxZoom: 19
      }).addTo(map);
      setIsSatelliteLayer(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Location Action Bar */}
      <div className="bg-white rounded-3xl border border-gray-150 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Prominent Use My Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-sm flex items-center justify-center space-x-2 flex-shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isLocating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                <span>Locking GPS Signal...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>Use My Current Location</span>
              </>
            )}
          </button>

          {/* Search Ghana Places Input */}
          <div className="relative flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true);
                }}
                placeholder="Search Ghana towns, streets or cities (e.g., Osu, Kejetia, Tamale, Takoradi)..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs pl-10 pr-8 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              {isSearching && (
                <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-3.5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Dropdown Suggestions */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span>GHANA LOCATION MATCHES</span>
                  <button
                    onClick={() => setShowSearchResults(false)}
                    className="text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/70 border-b border-gray-100 last:border-0 flex items-center space-x-2.5 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {res.name}
                      </p>
                      {res.region && (
                        <p className="text-[10px] text-gray-500 font-mono">
                          {res.region} Region, Ghana
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Ghana City Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-mono no-scrollbar">
          <span className="text-gray-400 font-bold flex-shrink-0 text-[10px] uppercase">
            Ghana Jump:
          </span>
          {[
            GHANA_PRESET_LOCATIONS[0], // Accra
            GHANA_PRESET_LOCATIONS[10], // Kumasi
            GHANA_PRESET_LOCATIONS[16], // Takoradi
            GHANA_PRESET_LOCATIONS[20], // Cape Coast
            GHANA_PRESET_LOCATIONS[24], // Tamale
            GHANA_PRESET_LOCATIONS[27], // Ho
            GHANA_PRESET_LOCATIONS[30] // Koforidua
          ].map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuickPresetJump(preset)}
              className="bg-slate-100 hover:bg-emerald-100 text-slate-800 hover:text-emerald-900 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 font-medium"
            >
              {preset.name.split(",")[0]}
            </button>
          ))}
        </div>

        {/* Location Status Alert Banner */}
        {locationStatusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center space-x-2.5 transition-all ${
              locationStatusType === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : locationStatusType === "error"
                ? "bg-amber-50 text-amber-900 border border-amber-200"
                : "bg-blue-50 text-blue-900 border border-blue-200"
            }`}
          >
            {locationStatusType === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : locationStatusType === "error" ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
            <p className="flex-1 font-medium leading-relaxed">
              {locationStatusMessage}
            </p>
            <button
              onClick={() => setLocationStatusMessage(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-sm bg-slate-900">
        {/* Layer Filters Overlay */}
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur border border-gray-200 p-1.5 rounded-2xl shadow-md flex items-center space-x-1 text-[11px] font-mono">
          <span className="text-gray-400 font-bold px-2 flex items-center space-x-1">
            <Layers className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">Layers:</span>
          </span>
          {(
            [
              { id: "all", label: "All Pins" },
              { id: "incidents", label: "Reports" },
              { id: "centers", label: "Centers" },
              { id: "trucks", label: "Fleet" }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMapLayerFilter(item.id)}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                mapLayerFilter === item.id
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Google Earth / Earth Engine Satellite Toggle */}
        <div className="absolute top-3 left-3 z-[1000]">
          <button
            type="button"
            onClick={handleGoogleEarthClick}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl text-xs font-bold shadow-md border transition-all cursor-pointer ${
              isSatelliteLayer
                ? "bg-emerald-700 text-white border-emerald-800"
                : earthEngineConfirmed
                ? "bg-white/95 text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                : "bg-white/95 text-stone-700 border-stone-200 hover:bg-amber-50"
            }`}
            title={
              earthEngineConfirmed
                ? "Toggle Google Earth satellite imagery"
                : "An Earth Engine account is required to access satellite imagery"
            }
          >
            {earthEngineConfirmed ? (
              <Globe className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            )}
            <span>
              {isSatelliteLayer ? "Earth Engine: ON" : "Google Earth View"}
            </span>
          </button>
        </div>

        {/* Leaflet Map DOM mount point */}
        <div ref={mapContainerRef} className={`w-full ${heightClass} z-0`} />

        {/* Selected Location Footer Bar */}
        <div className="bg-slate-950/90 text-white p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="p-1.5 bg-emerald-600/30 text-emerald-400 rounded-xl flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-xs truncate">
                {currentAddress}
              </p>
              <p className="text-[10px] text-emerald-400 font-mono">
                GPS Coordinates: {currentLat.toFixed(5)}°N, {currentLng.toFixed(5)}°W
              </p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 flex-shrink-0">
            Tap map or drag marker to adjust
          </div>
        </div>
      </div>

      {/* Earth Engine Account Required Modal */}
      {showEarthEngineModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-2xl w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setShowEarthEngineModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-emerald-600 text-white p-3 rounded-2xl">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                  Google Earth Engine Account Required
                </h3>
                <p className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  Satellite access verification
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-4">
              To access the <strong>Google Earth satellite view</strong> of Ghana, every user
              must first create a free <strong>Google Earth Engine</strong> account. Earth Engine
              is used to load live satellite imagery and change-detection layers across the map.
            </p>

            <a
              href={EARTH_ENGINE_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-2xl transition-all mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Create a Free Earth Engine Account</span>
            </a>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1" />
              <span className="text-[10px] font-mono uppercase text-stone-400">or</span>
              <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1" />
            </div>

            <label className="flex items-start space-x-2.5 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledgeHasAccount}
                onChange={(e) => setAcknowledgeHasAccount(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                I already have a Google Earth Engine account and understand satellite imagery
                access is restricted to registered Earth Engine users.
              </span>
            </label>

            <button
              type="button"
              disabled={!acknowledgeHasAccount}
              onClick={grantEarthEngineAccess}
              className="w-full bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-stone-900 font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Access Satellite View</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
