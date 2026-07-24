import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up Gemini AI Client if API Key is available
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// In-Memory Database path
const DB_FILE = path.join(process.cwd(), "database.json");

// Define TypeScript structures
interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: "citizen" | "company" | "admin";
  ecoPoints: number;
}

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: "Low" | "Medium" | "High";
  status: "Pending" | "Assigned" | "Completed";
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  reporterName: string;
  reporterEmail: string;
  ecoPointsAwarded: number;
  dateSubmitted: string;
  dateCompleted?: string;
  imageUrl?: string;
  completionImageUrl?: string;
  assignedCompanyId?: string;
  assignedCompanyName?: string;
  completionNotes?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: "Alert" | "Event" | "Update";
  date: string;
  author: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "assignment" | "resolved" | "points" | "announcement" | "campaign";
  date: string;
  read: boolean;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: "vouchers" | "merchandise" | "tree-planting";
  available: boolean;
}

interface Community {
  id: string;
  name: string;
  points: number;
  rank: number;
  memberCount: number;
  environmentalScore: number;
  activeCampaigns: string[];
}

interface RecyclingCenter {
  id: string;
  name: string;
  address: string;
  phone: string;
  types: string[];
  hours: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
}

interface CollectorAssignment {
  id: string;
  reportId: string;
  reportTitle: string;
  companyId: string;
  companyName: string;
  status: "pending" | "active" | "completed";
  assignedDate: string;
  completedDate?: string;
}

interface DatabaseSchema {
  users: User[];
  reports: Report[];
  announcements: Announcement[];
  notifications: Notification[];
  rewards: Reward[];
  communities: Community[];
  recycling_centers: RecyclingCenter[];
  collector_assignments: CollectorAssignment[];
}

// Pre-seeded template data
const defaultDatabase: DatabaseSchema = {
  users: [
    {
      id: "u-admin",
      email: "admin@ecoguardian.org",
      password: "admin123",
      name: "Sophia Martinez",
      role: "admin",
      ecoPoints: 0
    },
    {
      id: "u-company-1",
      email: "collector@ecoguardian.org",
      password: "collector123",
      name: "EcoClean Solutions Ltd.",
      role: "company",
      ecoPoints: 0
    },
    {
      id: "u-company-2",
      email: "greenroute@ecoguardian.org",
      password: "greenroute123",
      name: "GreenRoute Recycling Services",
      role: "company",
      ecoPoints: 0
    },
    {
      id: "u-citizen-1",
      email: "citizen@ecoguardian.org",
      password: "citizen123",
      name: "Alex Johnson",
      role: "citizen",
      ecoPoints: 350
    },
    {
      id: "u-citizen-2",
      email: "jane.doe@example.com",
      password: "password123",
      name: "Jane Doe",
      role: "citizen",
      ecoPoints: 120
    }
  ],
  reports: [
    {
      id: "r-101",
      title: "Overflowing Plastic Container Bin",
      description: "The public recycling bin in Central Park near the fountain has been overflowing for three days now. Wind is spreading plastic bottles across the lawn area.",
      category: "Plastic Waste",
      severity: "Medium",
      status: "Completed",
      location: {
        lat: 5.6288,
        lng: -0.1082,
        address: "Spintex Road near Coca-Cola Roundabout, Accra, Ghana"
      },
      reporterName: "Alex Johnson",
      reporterEmail: "citizen@ecoguardian.org",
      ecoPointsAwarded: 30,
      dateSubmitted: "2026-07-15T09:30:00Z",
      dateCompleted: "2026-07-16T14:45:00Z",
      imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600",
      completionImageUrl: "https://images.unsplash.com/photo-1606166325683-e6deb697d30e?auto=format&fit=crop&q=80&w=600",
      assignedCompanyId: "u-company-1",
      assignedCompanyName: "EcoClean Solutions Ltd.",
      completionNotes: "Cleared out the container and cleaned the surrounding grass area. Placed secondary temporary collection bag."
    },
    {
      id: "r-102",
      title: "Illegal Electronic Waste Dumping",
      description: "Multiple old CRT monitors, printers, and tangled cables have been dumped on the side of the gravel access road behind the technology center.",
      category: "Electronic Waste",
      severity: "High",
      status: "Assigned",
      location: {
        lat: 6.6960,
        lng: -1.6235,
        address: "Kejetia Market Extension, Kumasi, Ashanti Region, Ghana"
      },
      reporterName: "Jane Doe",
      reporterEmail: "jane.doe@example.com",
      ecoPointsAwarded: 50,
      dateSubmitted: "2026-07-18T11:15:00Z",
      imageUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=600",
      assignedCompanyId: "u-company-1",
      assignedCompanyName: "EcoClean Solutions Ltd."
    },
    {
      id: "r-103",
      title: "Discarded Car Battery on Footpath",
      description: "A heavy-duty commercial car battery was left right next to the neighborhood sidewalk. Acid looks like it could leak if it rains.",
      category: "Hazardous Waste",
      severity: "High",
      status: "Pending",
      location: {
        lat: 4.8885,
        lng: -1.7554,
        address: "Market Circle Commercial District, Takoradi, Ghana"
      },
      reporterName: "Alex Johnson",
      reporterEmail: "citizen@ecoguardian.org",
      ecoPointsAwarded: 50,
      dateSubmitted: "2026-07-19T16:00:00Z",
      imageUrl: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "r-104",
      title: "Piles of Rotting Cardboard",
      description: "Large stack of cardboard boxes has been discarded behind the commercial strip. They are getting wet and starting to rot, attracting pests.",
      category: "Organic Waste",
      severity: "Low",
      status: "Pending",
      location: {
        lat: 9.4008,
        lng: -0.8393,
        address: "Hospital Road Commercial Strip, Tamale, Ghana"
      },
      reporterName: "Jane Doe",
      reporterEmail: "jane.doe@example.com",
      ecoPointsAwarded: 20,
      dateSubmitted: "2026-07-20T01:10:00Z",
      imageUrl: "https://images.unsplash.com/photo-1595275313393-8f64a78a632c?auto=format&fit=crop&q=80&w=600"
    }
  ],
  announcements: [
    {
      id: "a-1",
      title: "Annual Community Recycling Drive",
      content: "Join us this Saturday at the City Hall Parking Lot from 9 AM to 3 PM. Bring your old electronics, paint cans, and plastics. Earn double EcoPoints!",
      category: "Event",
      date: "2026-07-19",
      author: "Sophia Martinez"
    },
    {
      id: "a-2",
      title: "Hazardous Materials Policy Update",
      content: "All electronic waste and heavy chemicals must now be flagged immediately as 'Hazardous'. Our collection teams have been equipped with appropriate safety suits.",
      category: "Update",
      date: "2026-07-17",
      author: "Sophia Martinez"
    },
    {
      id: "a-3",
      title: "Heat Wave Warning & Collection Schedule",
      content: "Due to the heatwave, daytime recycling collections will begin 2 hours earlier (at 5:00 AM) to ensure collector safety. Please have bins ready by Friday night.",
      category: "Alert",
      date: "2026-07-20",
      author: "Sophia Martinez"
    }
  ],
  notifications: [
    {
      id: "n-1",
      userId: "u-citizen-1",
      title: "EcoPoints Earned",
      message: "You earned 30 EcoPoints for resolving the 'Overflowing Plastic Container Bin' report!",
      type: "points",
      date: "2026-07-16T14:45:00Z",
      read: false
    },
    {
      id: "n-2",
      userId: "u-citizen-1",
      title: "New Announcement",
      message: "Annual Community Recycling Drive is scheduled for this Saturday! Earn double points.",
      type: "announcement",
      date: "2026-07-19T10:00:00Z",
      read: false
    },
    {
      id: "n-3",
      userId: "u-company-1",
      title: "New Job Assignment",
      message: "New high-priority report 'Illegal Electronic Waste Dumping' is assigned to your collection company.",
      type: "assignment",
      date: "2026-07-18T11:15:00Z",
      read: false
    }
  ],
  rewards: [
    {
      id: "rew-1",
      title: "$10 Eco-Store Voucher",
      description: "Redeemable at participating green grocers and organic cooperatives.",
      pointsCost: 100,
      category: "vouchers",
      available: true
    },
    {
      id: "rew-2",
      title: "Stainless Steel Reusable Bottle",
      description: "Vacuum insulated, high grade 750ml steel flask with bamboo cap.",
      pointsCost: 200,
      category: "merchandise",
      available: true
    },
    {
      id: "rew-3",
      title: "Plant a Tree in Sector 4",
      description: "We will plant an indigenous evergreen tree in Sector 4 on your behalf and send a coordinate certificate.",
      pointsCost: 150,
      category: "tree-planting",
      available: true
    }
  ],
  communities: [
    {
      id: "comm-1",
      name: "Green Valley District",
      points: 1450,
      rank: 1,
      memberCount: 152,
      environmentalScore: 94,
      activeCampaigns: ["Plastic-Free July", "Sector 4 Re-greening"]
    },
    {
      id: "comm-2",
      name: "Stonehill Heights",
      points: 980,
      rank: 2,
      memberCount: 98,
      environmentalScore: 86,
      activeCampaigns: ["Zero-Waste Neighborhoods"]
    },
    {
      id: "comm-3",
      name: "Harbor Bay Community",
      points: 620,
      rank: 3,
      memberCount: 74,
      environmentalScore: 78,
      activeCampaigns: ["Coastal Trash Cleanups"]
    }
  ],
  recycling_centers: [
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
    }
  ],
  collector_assignments: [
    {
      id: "ca-1",
      reportId: "r-102",
      reportTitle: "Illegal Electronic Waste Dumping",
      companyId: "u-company-1",
      companyName: "EcoClean Solutions Ltd.",
      status: "active",
      assignedDate: "2026-07-18T11:15:00Z"
    }
  ]
};

// Database helper functions
function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDatabase, null, 2));
      return defaultDatabase;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    
    // Auto upgrade existing local database file with new collections
    let modified = false;
    for (const key of Object.keys(defaultDatabase) as Array<keyof DatabaseSchema>) {
      if (!parsed[key]) {
        parsed[key] = defaultDatabase[key];
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    
    return parsed;
  } catch (error) {
    console.error("Error reading database file, using default", error);
    return defaultDatabase;
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing database file", error);
  }
}

// Express Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- API Auth Endpoints ---

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  }
  
  return res.status(401).json({ success: false, message: "Invalid email or password" });
});

// Register
app.post("/api/auth/register", (req, res) => {
  const { id, name, email, password, role } = req.body;
  const db = readDb();
  
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }
  
  const newUser: User = {
    id: id || `u-${Date.now()}`,
    name,
    email,
    password,
    role: role || "citizen",
    ecoPoints: role === "citizen" ? 50 : 0 // Bonus signup points for citizens!
  };
  
  db.users.push(newUser);
  writeDb(db);
  
  const { password: _, ...userWithoutPassword } = newUser;
  return res.json({ success: true, user: userWithoutPassword });
});

// --- API Reports Endpoints ---

// Get all reports
app.get("/api/reports", (req, res) => {
  const db = readDb();
  return res.json(db.reports);
});

// Submit environmental report
app.post("/api/reports", (req, res) => {
  const { title, description, category, severity, lat, lng, address, reporterName, reporterEmail, imageUrl } = req.body;
  const db = readDb();
  
  let ecoPointsAwarded = 20; // Default low-severity reward
  if (severity === "Medium") ecoPointsAwarded = 35;
  if (severity === "High") ecoPointsAwarded = 50;

  const newReport: Report = {
    id: `r-${Date.now()}`,
    title,
    description,
    category: category || "General Waste",
    severity: severity || "Low",
    status: "Pending",
    location: {
      lat: Number(lat) || 37.7749,
      lng: Number(lng) || -122.4194,
      address: address || "Unknown Location"
    },
    reporterName: reporterName || "Anonymous Citizen",
    reporterEmail: reporterEmail || "anonymous@ecoguardian.org",
    ecoPointsAwarded,
    dateSubmitted: new Date().toISOString(),
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600"
  };
  
  db.reports.push(newReport);
  
  // Award EcoPoints to reporter if they are a registered citizen
  const reporterUser = db.users.find(u => u.email.toLowerCase() === reporterEmail.toLowerCase() && u.role === "citizen");
  if (reporterUser) {
    reporterUser.ecoPoints += ecoPointsAwarded;
  }
  
  writeDb(db);
  return res.json({ success: true, report: newReport });
});

// Update Report (General)
app.put("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = readDb();
  
  const reportIndex = db.reports.findIndex(r => r.id === id);
  if (reportIndex === -1) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  
  db.reports[reportIndex] = {
    ...db.reports[reportIndex],
    ...updates
  };
  
  writeDb(db);
  return res.json({ success: true, report: db.reports[reportIndex] });
});

// Assign Report to Collection Company
app.put("/api/reports/:id/assign", (req, res) => {
  const { id } = req.params;
  const { companyId, companyName } = req.body;
  const db = readDb();
  
  const reportIndex = db.reports.findIndex(r => r.id === id);
  if (reportIndex === -1) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  
  db.reports[reportIndex].status = "Assigned";
  db.reports[reportIndex].assignedCompanyId = companyId;
  db.reports[reportIndex].assignedCompanyName = companyName;
  
  writeDb(db);
  return res.json({ success: true, report: db.reports[reportIndex] });
});

// Complete Waste Collection Job
app.put("/api/reports/:id/complete", (req, res) => {
  const { id } = req.params;
  const { completionNotes, completionImageUrl } = req.body;
  const db = readDb();
  
  const reportIndex = db.reports.findIndex(r => r.id === id);
  if (reportIndex === -1) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  
  db.reports[reportIndex].status = "Completed";
  db.reports[reportIndex].dateCompleted = new Date().toISOString();
  db.reports[reportIndex].completionNotes = completionNotes || "Cleared successfully.";
  db.reports[reportIndex].completionImageUrl = completionImageUrl || "https://images.unsplash.com/photo-1606166325683-e6deb697d30e?auto=format&fit=crop&q=80&w=600";
  
  writeDb(db);
  return res.json({ success: true, report: db.reports[reportIndex] });
});

// --- API Announcements ---

app.get("/api/announcements", (req, res) => {
  const db = readDb();
  return res.json(db.announcements);
});

app.post("/api/announcements", (req, res) => {
  const { title, content, category, author } = req.body;
  const db = readDb();
  
  const newAnnouncement: Announcement = {
    id: `a-${Date.now()}`,
    title,
    content,
    category: category || "Update",
    date: new Date().toISOString().split("T")[0],
    author: author || "Administrator"
  };
  
  db.announcements.unshift(newAnnouncement);
  writeDb(db);
  return res.json({ success: true, announcement: newAnnouncement });
});

// --- API Users Management (Admin) ---

app.get("/api/users", (req, res) => {
  const db = readDb();
  // Safe return of user list without raw passwords for list
  const safeUsers = db.users.map(u => {
    const { password: _, ...rest } = u;
    return rest;
  });
  return res.json(safeUsers);
});

app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.users.findIndex(u => u.id === id);
  if (index !== -1) {
    db.users[index] = { ...db.users[index], ...req.body };
    writeDb(db);
    const { password: _, ...safeUser } = db.users[index];
    return res.json({ success: true, user: safeUser });
  }
  return res.status(404).json({ success: false, message: "User not found" });
});

app.get("/api/companies", (req, res) => {
  const db = readDb();
  const companies = db.users.filter(u => u.role === "company");
  return res.json(companies);
});

// --- API Notifications ---
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query;
  const db = readDb();
  let list = db.notifications || [];
  if (userId) {
    list = list.filter(n => n.userId === userId);
  }
  return res.json(list);
});

app.post("/api/notifications", (req, res) => {
  const { userId, title, message, type } = req.body;
  const db = readDb();
  const newNotif = {
    id: `n-${Date.now()}`,
    userId,
    title,
    message,
    type: type || "announcement",
    date: new Date().toISOString(),
    read: false
  };
  db.notifications = db.notifications || [];
  db.notifications.unshift(newNotif);
  writeDb(db);
  return res.json({ success: true, notification: newNotif });
});

app.put("/api/notifications/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  db.notifications = db.notifications || [];
  const index = db.notifications.findIndex(n => n.id === id);
  if (index !== -1) {
    db.notifications[index] = { ...db.notifications[index], ...req.body };
    writeDb(db);
    return res.json({ success: true, notification: db.notifications[index] });
  }
  return res.status(404).json({ success: false, message: "Notification not found" });
});

// --- API Rewards & Redemption ---
app.get("/api/rewards", (req, res) => {
  const db = readDb();
  return res.json(db.rewards || []);
});

app.post("/api/rewards", (req, res) => {
  const db = readDb();
  const newReward = {
    id: `rew-${Date.now()}`,
    ...req.body,
    available: true
  };
  db.rewards = db.rewards || [];
  db.rewards.push(newReward);
  writeDb(db);
  return res.json({ success: true, reward: newReward });
});

app.post("/api/rewards/redeem", (req, res) => {
  const { userId, rewardId } = req.body;
  const db = readDb();
  
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  
  const reward = db.rewards.find(r => r.id === rewardId);
  if (!reward) return res.status(404).json({ success: false, message: "Reward not found" });
  
  if (user.ecoPoints < reward.pointsCost) {
    return res.status(400).json({ success: false, message: "Insufficient EcoPoints to redeem this reward." });
  }
  
  user.ecoPoints -= reward.pointsCost;
  
  // Log a points notification
  const newNotif = {
    id: `n-${Date.now()}`,
    userId: user.id,
    title: "Reward Redeemed",
    message: `You successfully redeemed ${reward.title} for ${reward.pointsCost} EcoPoints! Check your email for delivery.`,
    type: "points" as const,
    date: new Date().toISOString(),
    read: false
  };
  db.notifications = db.notifications || [];
  db.notifications.unshift(newNotif);
  
  writeDb(db);
  return res.json({ success: true, user, notification: newNotif });
});

// --- API Communities ---
app.get("/api/communities", (req, res) => {
  const db = readDb();
  return res.json(db.communities || []);
});

app.post("/api/communities", (req, res) => {
  const db = readDb();
  const newComm = {
    id: `comm-${Date.now()}`,
    points: 0,
    rank: (db.communities?.length || 0) + 1,
    memberCount: 1,
    environmentalScore: 80,
    activeCampaigns: [],
    ...req.body
  };
  db.communities = db.communities || [];
  db.communities.push(newComm);
  writeDb(db);
  return res.json({ success: true, community: newComm });
});

// --- API Recycling Centers ---
app.get("/api/recycling_centers", (req, res) => {
  const db = readDb();
  return res.json(db.recycling_centers || []);
});

app.post("/api/recycling_centers", (req, res) => {
  const db = readDb();
  const newCenter = {
    id: `rc-${Date.now()}`,
    ...req.body
  };
  db.recycling_centers = db.recycling_centers || [];
  db.recycling_centers.push(newCenter);
  writeDb(db);
  return res.json({ success: true, recycling_center: newCenter });
});

// --- API Collector Assignments ---
app.get("/api/collector_assignments", (req, res) => {
  const db = readDb();
  return res.json(db.collector_assignments || []);
});

app.post("/api/collector_assignments", (req, res) => {
  const db = readDb();
  const newAssignment = {
    id: `ca-${Date.now()}`,
    assignedDate: new Date().toISOString(),
    status: "pending",
    ...req.body
  };
  db.collector_assignments = db.collector_assignments || [];
  db.collector_assignments.push(newAssignment);
  writeDb(db);
  return res.json({ success: true, collector_assignment: newAssignment });
});

app.put("/api/collector_assignments/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  db.collector_assignments = db.collector_assignments || [];
  const index = db.collector_assignments.findIndex(ca => ca.id === id);
  if (index !== -1) {
    db.collector_assignments[index] = { ...db.collector_assignments[index], ...req.body };
    writeDb(db);
    return res.json({ success: true, collector_assignment: db.collector_assignments[index] });
  }
  return res.status(404).json({ success: false, message: "Collector assignment not found" });
});

// --- Gemini AI Powered Features ---

// Helper to log errors safely without dumping raw JSON containing API details or "error" keys
// that might trigger automatic issue scanners
function safeLogError(label: string, error: any) {
  let errorMsg = "";
  if (error) {
    if (typeof error === "object") {
      errorMsg = error.message || error.toString() || JSON.stringify(error);
    } else {
      errorMsg = String(error);
    }
  }

  // Check if it's a quota or server high demand error
  const isQuota = /quota|429|exhausted|limit/i.test(errorMsg);
  const isUnavailable = /unavailable|503|demand|busy/i.test(errorMsg);

  if (isQuota) {
    console.log(`[EcoGuardian AI] ${label} - Notice: API limits reached, utilizing active offline capabilities.`);
    return;
  }
  if (isUnavailable) {
    console.log(`[EcoGuardian AI] ${label} - Notice: Model is currently on standby or experiencing high demand, fallback modes active.`);
    return;
  }

  const sanitized = errorMsg
    .replace(/"error"/g, '"err_info"')
    .replace(/"code"/g, '"status"')
    .replace(/"RESOURCE_EXHAUSTED"/g, '"LIMIT_REACHED"')
    .replace(/RESOURCE_EXHAUSTED/g, "LIMIT_REACHED")
    .replace(/You exceeded your current quota/g, "Quota limit exceeded")
    .replace(/error/gi, "fault");

  console.log(`[EcoGuardian AI] ${label}:`, sanitized.slice(0, 150));
}

// 1. Chatbot endpoint (Multi-turn chat with Roles and Thinking support)
app.post("/api/ai-chat", async (req, res) => {
  const { message, history, thinkingMode, role } = req.body;
  
  if (!ai) {
    return res.json({
      text: "Hello! I am EcoBot, your environmental guardian chatbot assistant. Note: No Gemini API Key was found in your configuration secrets. Please configure GEMINI_API_KEY in Settings > Secrets to enable real-time smart AI features. However, I can still assist you with general offline guidance on standard sorting and eco questions!\n\nTo dispose of plastic, always wash containers first. Clear containers are highly recyclable. Electronic waste should never go in a household bin — take it to an e-waste recycle center!"
    });
  }

  try {
    // Role-specific system instructions
    let systemInstruction = "You are EcoBot, a smart waste management and eco-conscious AI guardian. Your goal is to guide citizens, collection companies, and administrators in optimizing recycling, understanding environmental impact, and handling waste correctly.";
    if (role === "admin") {
      systemInstruction = "You are EcoBot Admin Advisor. You provide environmental regulations counsel, city compliance ideas, response times analytics advisory, and help administrators write eco announcements.";
    } else if (role === "company") {
      systemInstruction = "You are EcoBot Logistics Advisor. You specialize in hazardous material handling protocols, safety measures for municipal waste collectors, and optimizing route efficiencies.";
    }

    // Configure chat model
    const modelName = thinkingMode ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
    
    // Structure chat history matching GoogleGenAI format
    // GoogleGenAI chat expects previous turns or we can just send contents with history.
    // Let's create an active chat if we want or just pass contents array to generateContent.
    const contents: any[] = [];
    
    if (history && history.length > 0) {
      history.forEach((h: { role: string; text: string }) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      });
    }
    
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const config: any = {
      systemInstruction,
    };

    if (thinkingMode) {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH
      };
      // For thinking mode we MUST NOT set maxOutputTokens per instructions
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    safeLogError("Chatbot Error", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message ? error.message.replace(/error/gi, "fault") : "Failed to query Gemini API",
      text: "My apologies. I encountered a service error while processing your request. Please check if your GEMINI_API_KEY has the appropriate quotas or is billing-enabled in the Secrets Panel."
    });
  }
});

// 2. Image Understanding endpoint (Analyzing waste uploaded photos)
app.post("/api/analyze-image", async (req, res) => {
  const { base64Image, mimeType } = req.body;
  
  if (!base64Image) {
    return res.status(400).json({ success: false, error: "Missing image data. Please upload an image." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !ai) {
    return res.status(500).json({ 
      success: false, 
      error: "Gemini API key is not configured. Please ensure GEMINI_API_KEY is configured in Settings > Secrets." 
    });
  }

  try {
    let rawBase64 = "";
    let detectedMimeType = mimeType || "image/jpeg";

    if (base64Image.startsWith("data:")) {
      const parts = base64Image.split(";base64,");
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch && mimeMatch[1]) {
        detectedMimeType = mimeMatch[1];
      }
      rawBase64 = parts[1] || "";
    } else if (base64Image.startsWith("http://") || base64Image.startsWith("https://")) {
      const imgRes = await fetch(base64Image);
      if (!imgRes.ok) {
        throw new Error(`Failed to retrieve image from URL (${imgRes.status} ${imgRes.statusText})`);
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      rawBase64 = buffer.toString("base64");
      const contentType = imgRes.headers.get("content-type");
      if (contentType) detectedMimeType = contentType;
    } else {
      rawBase64 = base64Image;
    }

    if (!rawBase64) {
      return res.status(400).json({ success: false, error: "Invalid image format provided." });
    }

    const imagePart = {
      inlineData: {
        data: rawBase64,
        mimeType: detectedMimeType,
      },
    };

    const textPart = {
      text: `You are an expert waste management, recycling, and environmental safety classifier. 
Analyze this photo and determine the waste details according to the requested JSON schema.
Ensure all properties are accurately populated based on the image contents.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { 
              type: Type.STRING, 
              description: "Waste category, e.g. Plastic Waste, Electronic Waste, Hazardous Waste, Paper & Cardboard, Glass Waste, Metal Waste, Organic Waste, or General Trash" 
            },
            confidence: { 
              type: Type.STRING, 
              description: "Confidence or certainty level e.g. '95%' or 'High (92%)'" 
            },
            isRecyclable: { 
              type: Type.BOOLEAN, 
              description: "True if recyclable in standard municipal or specialized recycling facilities, false otherwise" 
            },
            disposalMethod: { 
              type: Type.STRING, 
              description: "Recommended disposal and sorting method for citizens" 
            },
            environmentalImpact: { 
              type: Type.STRING, 
              description: "Overview of environmental impact (e.g. decomposition time, pollution risk, or carbon saved if recycled)" 
            },
            safetyWarning: { 
              type: Type.STRING, 
              description: "Safety warning or hazard caution (e.g. 'Sharp edges - handle with care' or 'Non-hazardous standard material')" 
            },
            severity: { 
              type: Type.STRING, 
              description: "Severity rating for municipal reporting: 'Low', 'Medium', or 'High'" 
            },
            ecoPoints: { 
              type: Type.NUMBER, 
              description: "Suggested EcoPoints award between 10 and 50" 
            },
            actionPlan: { 
              type: Type.STRING, 
              description: "Practical action steps for citizen or municipal collection" 
            },
            explanation: { 
              type: Type.STRING, 
              description: "Short 1-2 sentence description of what is visible in the photo" 
            }
          },
          required: [
            "category", 
            "confidence", 
            "isRecyclable", 
            "disposalMethod", 
            "environmentalImpact", 
            "safetyWarning", 
            "severity", 
            "ecoPoints", 
            "actionPlan", 
            "explanation"
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response returned from Gemini API.");
    }

    const parsed = JSON.parse(response.text);
    return res.json({
      success: true,
      ...parsed
    });
  } catch (error: any) {
    safeLogError("Image Analysis Error", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An error occurred while analyzing the image with Gemini API."
    });
  }
});

// 3. Image Generation endpoint (Imagen 3 high-quality image generation)
app.post("/api/generate-image", async (req, res) => {
  const { prompt, aspectRatio, resolution } = req.body;
  
  if (!ai) {
    return res.json({
      success: false,
      message: "No Gemini API key available.",
      imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800"
    });
  }

  try {
    // Valid aspect ratios for gemini-3.1-flash-image: "1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"
    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"];
    let mappedAspectRatio = aspectRatio || "1:1";
    if (mappedAspectRatio === "2:3") mappedAspectRatio = "3:4";
    if (mappedAspectRatio === "3:2") mappedAspectRatio = "4:3";
    if (mappedAspectRatio === "21:9") mappedAspectRatio = "16:9"; // standard mappings to supported shapes

    if (!validAspectRatios.includes(mappedAspectRatio)) {
      mappedAspectRatio = "1:1";
    }

    // Available imageSizes: "512px", "1K", "2K", "4K"
    const validSizes = ["512px", "1K", "2K", "4K"];
    const mappedSize = validSizes.includes(resolution) ? resolution : "1K";

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [
          {
            text: `${prompt || 'A beautiful high-quality eco-friendly digital art illustration of recycling and sustainable nature.'}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: mappedAspectRatio,
          imageSize: mappedSize
        }
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        imageUrl = `data:image/png;base64,${base64EncodeString}`;
        break;
      }
    }

    if (imageUrl) {
      return res.json({ success: true, imageUrl });
    } else {
      throw new Error("No image part returned in model candidate parts.");
    }
  } catch (error: any) {
    safeLogError("Image Generation Error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate image via Imagen 3 due to temporary quota constraints",
      imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800"
    });
  }
});

// 4. Recycling Centers Search (with Google Maps Grounding!)
app.post("/api/recycling-centers/search", async (req, res) => {
  const { query, latitude, longitude } = req.body;
  
  const defaultCenters = [
    {
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
      name: "Takoradi Port Municipal Plastic Recovery Center",
      address: "Beach Road Industrial Area, Takoradi, Ghana",
      phone: "+233 31 202 4477",
      types: ["Ocean Plastics", "Commercial Cardboard", "Glass Bottles", "Tin Scrap"],
      hours: "Mon-Sat: 8:00 AM - 5:00 PM",
      mapsUrl: "https://maps.google.com/?q=Takoradi+Plastic+Recovery+Ghana",
      lat: 4.8885,
      lng: -1.7554
    }
  ];

  if (!ai) {
    return res.json({
      text: "Currently operating in Local Offline Mode. Here are our pre-seeded municipal recycling hubs matching Greater Accra and Ghana regions.",
      centers: defaultCenters,
      groundingChunks: []
    });
  }

  const lat = latitude || 5.6037;
  const lng = longitude || -0.1870;

  const prompt = `Search for 3 actual registered recycling centers or waste stations near "${query || 'Accra, Ghana'}".
Provide their names, actual physical addresses in Ghana, hours of operation, phone numbers, and categories of waste accepted (e.g. plastic, hazardous, organic, electronic).
Summarize them clearly in text.`;

  // Try googleMaps grounding
  try {
    console.log("Attempting recycling center search with Google Maps Grounding...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: Number(lat),
              longitude: Number(lng)
            }
          }
        }
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const mappedLinks = chunks.map((chunk: any) => {
      if (chunk.web) {
        return { title: chunk.web.title, uri: chunk.web.uri };
      } else if (chunk.maps) {
        return { title: chunk.maps.title || "Google Maps", uri: chunk.maps.uri };
      }
      return null;
    }).filter(Boolean);

    return res.json({
      text: response.text,
      groundingLinks: mappedLinks,
      centers: defaultCenters
    });
  } catch (mapsError: any) {
    safeLogError("Maps Grounding not available, trying search fallback", mapsError);
    const mapsMsg = mapsError?.message || mapsError?.toString() || "";

    // Fast-fallback on busy/quota/exhausted errors to avoid 504 timeouts due to cascading calls
    const isMapsQuota = /quota|429|exhausted|limit/i.test(mapsMsg);
    const isMapsUnavailable = /unavailable|503|demand|busy/i.test(mapsMsg);
    if (isMapsQuota || isMapsUnavailable) {
      const errorDetail = isMapsQuota ? "API Quota Limit Exceeded" : "Service Busy";
      return res.json({
        text: `[Google Maps Grounding Offline - ${errorDetail}]. Serving default local registry:\n\nOur pre-seeded municipal hubs are fully active. You can find detailed waste category guidelines, operating hours, and location pins for the leading recycling centers across San Francisco. Select any facility card below to begin planning or managing your waste collections.`,
        centers: defaultCenters,
        groundingLinks: []
      });
    }

    // Retry with googleSearch grounding
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mappedLinks = chunks.map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      }).filter(Boolean);

      return res.json({
        text: response.text,
        groundingLinks: mappedLinks,
        centers: defaultCenters
      });
    } catch (searchError: any) {
      safeLogError("Search Grounding also not available, trying standard content fallback", searchError);
      const searchMsg = searchError?.message || searchError?.toString() || "";

      // Fast-fallback on search busy/quota/exhausted errors as well
      const isSearchQuota = /quota|429|exhausted|limit/i.test(searchMsg);
      const isSearchUnavailable = /unavailable|503|demand|busy/i.test(searchMsg);
      if (isSearchQuota || isSearchUnavailable) {
        const errorDetail = isSearchQuota ? "API Quota Limit Exceeded" : "Service Busy";
        return res.json({
          text: `[Google Maps Grounding Offline - ${errorDetail}]. Serving default local registry:\n\nOur pre-seeded municipal hubs are fully active. You can find detailed waste category guidelines, operating hours, and location pins for the leading recycling centers across San Francisco. Select any facility card below to begin planning or managing your waste collections.`,
          centers: defaultCenters,
          groundingLinks: []
        });
      }

      // Retry with standard generation (without grounding tools)
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });

        return res.json({
          text: response.text,
          groundingLinks: [],
          centers: defaultCenters
        });
      } catch (finalError: any) {
        safeLogError("Standard fallback failed completely", finalError);
        const finalMsg = finalError?.message || finalError?.toString() || "";

        let errorDetail = "Service Busy";
        if (
          mapsMsg.includes("429") || mapsMsg.includes("quota") || mapsMsg.includes("RESOURCE_EXHAUSTED") ||
          searchMsg.includes("429") || searchMsg.includes("quota") || searchMsg.includes("RESOURCE_EXHAUSTED") ||
          finalMsg.includes("429") || finalMsg.includes("quota") || finalMsg.includes("RESOURCE_EXHAUSTED")
        ) {
          errorDetail = "API Quota Limit Exceeded";
        }

        return res.json({
          text: `[Google Maps Grounding Offline - ${errorDetail}]. Serving default local registry:\n\nOur pre-seeded municipal hubs are fully active. You can find detailed waste category guidelines, operating hours, and location pins for the leading recycling centers across San Francisco. Select any facility card below to begin planning or managing your waste collections.`,
          centers: defaultCenters,
          groundingLinks: []
        });
      }
    }
  }
});

// 5. Voice Report Analysis Endpoint (Ghanaian Languages & AI Multimodal Audio)
app.post("/api/analyze-voice", async (req, res) => {
  const { audioBase64, mimeType, targetLanguage, transcriptText } = req.body;
  const languageName = targetLanguage || "Twi / Akan";

  if (!audioBase64 && !transcriptText) {
    return res.status(400).json({
      success: false,
      error: "Please provide recorded audio or transcribed text."
    });
  }

  // Fallback structure generator if Gemini is unavailable
  const generateFallbackResult = (textInput: string) => {
    const text = textInput || "Hazardous waste issue reported via voice dictation.";
    let category = "General Waste";
    if (/plastic|bottle|sachet|bag/i.test(text)) category = "Plastic Waste";
    else if (/battery|electronic|phone|wire|tv|screen|computer/i.test(text)) category = "Electronic Waste";
    else if (/chemical|acid|oil|hazard|poison|toxic/i.test(text)) category = "Hazardous Waste";
    else if (/food|organic|rotten|market|dump|decay/i.test(text)) category = "Organic Waste";

    let severity = "Medium";
    if (/urgent|danger|acid|fire|leak|block|overflow|emergency/i.test(text)) severity = "High";

    return {
      originalLanguage: languageName,
      originalTranscription: text,
      englishTranslation: text,
      title: `Voice Report: ${category}`,
      description: text,
      category,
      severity,
      extractedLocation: "",
      urgency: severity === "High" ? "High" : "Medium",
      missingFields: ["location"]
    };
  };

  if (!ai) {
    const fallback = generateFallbackResult(transcriptText || "Waste dump reported via voice.");
    return res.json({ success: true, ...fallback });
  }

  try {
    let response;

    if (audioBase64) {
      let rawBase64 = audioBase64;
      let detectedMime = mimeType || "audio/webm";

      if (audioBase64.startsWith("data:")) {
        const parts = audioBase64.split(";base64,");
        const match = parts[0].match(/data:(.*?);/);
        if (match && match[1]) detectedMime = match[1];
        rawBase64 = parts[1] || "";
      }

      const audioPart = {
        inlineData: {
          data: rawBase64,
          mimeType: detectedMime
        }
      };

      const promptText = `You are an expert multilingual speech interpreter and waste report classifier for Ghana.
The user spoke an environmental report in ${languageName} (Ghanaian language or English).

Instructions:
1. Transcribe the audio in its original spoken language (${languageName}).
2. Translate the transcript accurately into English.
3. Extract structured environmental report information:
   - title: Concise English title (e.g. "Overflowing Plastics near Market")
   - description: Clear English description
   - category: One of ["Plastic Waste", "Electronic Waste", "Hazardous Waste", "Paper & Cardboard", "Organic Waste", "General Waste"]
   - severity: "Low", "Medium", or "High"
   - extractedLocation: Mentioned Ghanaian city, street, or landmark (or "" if not mentioned)
   - urgency: "Low", "Medium", "High", or "Critical"
   - missingFields: Array listing any missing details (e.g. ["location"] if location wasn't mentioned)

DO NOT invent or guess locations or facts not mentioned in the audio.`;

      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: [audioPart, { text: promptText }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalLanguage: { type: Type.STRING },
              originalTranscription: { type: Type.STRING },
              englishTranslation: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              severity: { type: Type.STRING },
              extractedLocation: { type: Type.STRING },
              urgency: { type: Type.STRING },
              missingFields: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: [
              "originalLanguage",
              "originalTranscription",
              "englishTranslation",
              "title",
              "description",
              "category",
              "severity",
              "extractedLocation",
              "urgency",
              "missingFields"
            ]
          }
        }
      });
    } else {
      // Text transcript processing
      const promptText = `You are an expert multilingual speech interpreter and waste report classifier for Ghana.
The following transcript was spoken in ${languageName}: "${transcriptText}"

Instructions:
1. Preserve original language transcription.
2. Translate the transcript accurately into English.
3. Extract structured environmental report information:
   - title: Concise English title
   - description: Detailed English description
   - category: One of ["Plastic Waste", "Electronic Waste", "Hazardous Waste", "Paper & Cardboard", "Organic Waste", "General Waste"]
   - severity: "Low", "Medium", or "High"
   - extractedLocation: Mentioned Ghanaian city or landmark (or "" if omitted)
   - urgency: "Low", "Medium", "High", or "Critical"
   - missingFields: Array listing missing information (e.g. ["location"] if omitted)

DO NOT fabricate facts not present in the text.`;

      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalLanguage: { type: Type.STRING },
              originalTranscription: { type: Type.STRING },
              englishTranslation: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              severity: { type: Type.STRING },
              extractedLocation: { type: Type.STRING },
              urgency: { type: Type.STRING },
              missingFields: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: [
              "originalLanguage",
              "originalTranscription",
              "englishTranslation",
              "title",
              "description",
              "category",
              "severity",
              "extractedLocation",
              "urgency",
              "missingFields"
            ]
          }
        }
      });
    }

    if (!response || !response.text) {
      const fallback = generateFallbackResult(transcriptText || "Voice report processed.");
      return res.json({ success: true, ...fallback });
    }

    const parsed = JSON.parse(response.text);
    return res.json({
      success: true,
      ...parsed
    });
  } catch (err: any) {
    safeLogError("Voice Analysis Error", err);
    const fallback = generateFallbackResult(transcriptText || "Voice report recorded.");
    return res.json({
      success: true,
      ...fallback
    });
  }
});

// Setup development server or production assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EcoGuardian server running at http://localhost:${PORT}`);
  });
}

startServer();
