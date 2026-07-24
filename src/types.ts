export type UserRole = "citizen" | "company" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  ecoPoints: number;
  phone?: string;
  communityId?: string;
  avatarUrl?: string;
  achievements?: string[];
  collectorId?: string;
  verificationStatus?: "Verified" | "In Review" | "Pending" | "Unverified";
  assignedCompany?: string;
  serviceRegion?: string;
  serviceDistrict?: string;
  rating?: number;
  totalCompletedCollections?: number;
  earnings?: number;
  availabilityStatus?: "Available" | "Busy" | "Offline";
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: "Low" | "Medium" | "High";
  status: "Pending" | "Assigned" | "Accepted" | "En Route" | "Arrived" | "Collected" | "Completed" | "Cancelled";
  location: {
    lat: number;
    lng: number;
    address: string;
    region?: string;
    district?: string;
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
  assignedCollectorId?: string;
  assignedCollectorName?: string;
  completionNotes?: string;
  originalLanguage?: string;
  originalTranscription?: string;
  englishTranslation?: string;
  isVoiceReport?: boolean;
  aiClassification?: string;
  hazardLevel?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: "Alert" | "Event" | "Update";
  date: string;
  author: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export interface RecyclingCenter {
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

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "assignment" | "resolved" | "points" | "announcement" | "campaign";
  date: string;
  read: boolean;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: "vouchers" | "merchandise" | "tree-planting";
  available: boolean;
  imageUrl?: string;
}

export interface Community {
  id: string;
  name: string;
  points: number;
  rank: number;
  memberCount: number;
  environmentalScore: number; // 0 - 100
  activeCampaigns: string[];
}

export interface CollectorAssignment {
  id: string;
  reportId: string;
  reportTitle: string;
  companyId: string;
  companyName: string;
  status: "pending" | "active" | "completed";
  assignedDate: string;
  completedDate?: string;
}


