export interface GhanaLocationPreset {
  name: string;
  region: string;
  lat: number;
  lng: number;
  category?: string;
  description?: string;
}

export const GHANA_CENTER = {
  lat: 7.9465,
  lng: -1.0232,
  name: "Ghana (Geographic Center)",
  zoom: 7
};

export const GHANA_CAPITAL = {
  lat: 5.6037,
  lng: -0.1870,
  name: "Accra, Greater Accra",
  zoom: 12
};

export const GHANA_PRESET_LOCATIONS: GhanaLocationPreset[] = [
  // Greater Accra Region
  { name: "Accra Central", region: "Greater Accra", lat: 5.5500, lng: -0.2000, category: "Capital City" },
  { name: "Osu, Accra", region: "Greater Accra", lat: 5.5558, lng: -0.1821, category: "Sub-metro" },
  { name: "East Legon, Accra", region: "Greater Accra", lat: 5.6353, lng: -0.1583, category: "Residential" },
  { name: "Cantonments, Accra", region: "Greater Accra", lat: 5.5786, lng: -0.1772, category: "Sub-metro" },
  { name: "Spintex Road, Accra", region: "Greater Accra", lat: 5.6288, lng: -0.1082, category: "Commercial" },
  { name: "Madina, Accra", region: "Greater Accra", lat: 5.6811, lng: -0.1669, category: "Sub-metro" },
  { name: "Dansoman, Accra", region: "Greater Accra", lat: 5.5489, lng: -0.2635, category: "Sub-metro" },
  { name: "Kaneshie Market, Accra", region: "Greater Accra", lat: 5.5683, lng: -0.2319, category: "Market Zone" },
  { name: "Tema Harbour & City", region: "Greater Accra", lat: 5.6698, lng: 0.0166, category: "Port City" },
  { name: "Nkrumah Circle, Accra", region: "Greater Accra", lat: 5.5597, lng: -0.2081, category: "Transit Hub" },

  // Ashanti Region
  { name: "Kumasi Central (Adum)", region: "Ashanti", lat: 6.6917, lng: -1.6214, category: "Major City" },
  { name: "Bantama, Kumasi", region: "Ashanti", lat: 6.7025, lng: -1.6369, category: "Sub-metro" },
  { name: "Kejetia Market, Kumasi", region: "Ashanti", lat: 6.6960, lng: -1.6235, category: "Commercial Hub" },
  { name: "KNUST Campus, Kumasi", region: "Ashanti", lat: 6.6742, lng: -1.5714, category: "University District" },
  { name: "Asafo, Kumasi", region: "Ashanti", lat: 6.6853, lng: -1.6139, category: "Sub-metro" },
  { name: "Obuasi", region: "Ashanti", lat: 6.2003, lng: -1.6836, category: "Mining City" },

  // Western Region & Western North
  { name: "Takoradi (Market Circle)", region: "Western", lat: 4.8885, lng: -1.7554, category: "Port City" },
  { name: "Sekondi Central", region: "Western", lat: 4.9372, lng: -1.7053, category: "Regional Capital" },
  { name: "Tarkwa", region: "Western", lat: 5.3000, lng: -1.9833, category: "Mining Town" },
  { name: "Sefwi Wiawso", region: "Western North", lat: 6.2000, lng: -2.4833, category: "Regional Capital" },

  // Central Region
  { name: "Cape Coast Castle & Town", region: "Central", lat: 5.1054, lng: -1.2466, category: "Coastal Historic City" },
  { name: "Elmina", region: "Central", lat: 5.0833, lng: -1.3500, category: "Historic Coastal" },
  { name: "Winneba", region: "Central", lat: 5.3511, lng: -0.6231, category: "University Town" },
  { name: "Kasoa", region: "Central", lat: 5.5333, lng: -0.4167, category: "Commercial Hub" },

  // Northern Region
  { name: "Tamale Central", region: "Northern", lat: 9.4008, lng: -0.8393, category: "Major Northern City" },
  { name: "Education Ridge, Tamale", region: "Northern", lat: 9.4200, lng: -0.8500, category: "Sub-metro" },
  { name: "Yendi", region: "Northern", lat: 9.4428, lng: -0.0097, category: "Historic Town" },

  // Volta Region & Oti Region
  { name: "Ho Central", region: "Volta", lat: 6.6101, lng: 0.4785, category: "Regional Capital" },
  { name: "Hohoe", region: "Volta", lat: 7.1511, lng: 0.4736, category: "Municipal City" },
  { name: "Dambai", region: "Oti", lat: 8.0667, lng: 0.1833, category: "Regional Capital" },

  // Eastern Region
  { name: "Koforidua Central", region: "Eastern", lat: 6.0941, lng: -0.2591, category: "Regional Capital" },
  { name: "Nkawkaw", region: "Eastern", lat: 6.5500, lng: -0.7667, category: "Commercial City" },

  // Bono, Bono East & Ahafo Regions
  { name: "Sunyani Central", region: "Bono", lat: 7.3349, lng: -2.3123, category: "Regional Capital" },
  { name: "Techiman Market", region: "Bono East", lat: 7.5828, lng: -1.9395, category: "Commercial Center" },
  { name: "Goaso", region: "Ahafo", lat: 6.8000, lng: -2.5167, category: "Regional Capital" },

  // Upper West & Upper East Regions
  { name: "Wa Central", region: "Upper West", lat: 10.0601, lng: -2.5019, category: "Regional Capital" },
  { name: "Bolgatanga Central", region: "Upper East", lat: 10.7856, lng: -0.8514, category: "Regional Capital" },
  { name: "Bawku", region: "Upper East", lat: 11.0616, lng: -0.2417, category: "Border Town" },

  // Savannah & North East Regions
  { name: "Damongo", region: "Savannah", lat: 9.0833, lng: -1.8167, category: "Regional Capital" },
  { name: "Nalerigu", region: "North East", lat: 10.5333, lng: -0.3667, category: "Regional Capital" }
];

export const DEFAULT_GHANA_RECYCLING_CENTERS = [
  {
    id: "rc-gh-1",
    name: "Accra Green Recycling & Material Recovery Facility",
    address: "Off Spintex Road, Near Coca-Cola Roundabout, Accra, Ghana",
    phone: "+233 30 291 8840",
    types: ["Plastics (PET/HDPE)", "Aluminum Cans", "Cardboard", "E-Waste"],
    hours: "Mon-Sat: 7:30 AM - 5:30 PM",
    mapsUrl: "https://maps.google.com/?q=Accra+Recycling+Depot+Ghana",
    lat: 5.6288,
    lng: -0.1082
  },
  {
    id: "rc-gh-2",
    name: "Agbogbloshie Eco E-Waste Management Hub",
    address: "Old Fadama Rd, Near Abossey Okai, Accra, Ghana",
    phone: "+233 24 458 9102",
    types: ["Electronic Waste", "Batteries", "Scrap Metal", "Circuit Boards"],
    hours: "Mon-Sun: 8:00 AM - 6:00 PM",
    mapsUrl: "https://maps.google.com/?q=Agbogbloshie+E-Waste+Hub+Accra",
    lat: 5.5512,
    lng: -0.2230
  },
  {
    id: "rc-gh-3",
    name: "Kumasi Kejetia Bio-Compost & Plastic Processing Depot",
    address: "Kejetia Extension, Kumasi, Ashanti Region, Ghana",
    phone: "+233 32 203 1189",
    types: ["Organic Waste", "Food Scrap Compost", "Plastic Bottles", "Metals"],
    hours: "Mon-Fri: 7:00 AM - 5:00 PM",
    mapsUrl: "https://maps.google.com/?q=Kejetia+Recycling+Depot+Kumasi",
    lat: 6.6960,
    lng: -1.6235
  },
  {
    id: "rc-gh-4",
    name: "Takoradi Port Municipal Plastic Recovery Center",
    address: "Beach Road Industrial Area, Takoradi, Ghana",
    phone: "+233 31 202 4477",
    types: ["Ocean Plastics", "Commercial Cardboard", "Glass Bottles", "Tin Scrap"],
    hours: "Mon-Sat: 8:00 AM - 5:00 PM",
    mapsUrl: "https://maps.google.com/?q=Takoradi+Plastic+Recovery+Ghana",
    lat: 4.8885,
    lng: -1.7554
  },
  {
    id: "rc-gh-5",
    name: "Tamale Central Eco-Station & Composting Center",
    address: "Hospital Road, Tamale, Northern Region, Ghana",
    phone: "+233 37 202 8110",
    types: ["Organic Scrap", "Paper", "Plastics", "Agricultural Drums"],
    hours: "Mon-Sat: 7:00 AM - 4:30 PM",
    mapsUrl: "https://maps.google.com/?q=Tamale+Eco+Station+Ghana",
    lat: 9.4008,
    lng: -0.8393
  }
];

export function findClosestGhanaLocation(lat: number, lng: number): string {
  let closest = GHANA_PRESET_LOCATIONS[0];
  let minDistance = Infinity;

  for (const loc of GHANA_PRESET_LOCATIONS) {
    const d = Math.hypot(loc.lat - lat, loc.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      closest = loc;
    }
  }

  // If reasonably close to a known preset (< ~0.15 deg, approx 15km)
  if (minDistance < 0.25) {
    return `${closest.name}, ${closest.region} Region, Ghana`;
  }

  return `Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°W, Ghana`;
}
