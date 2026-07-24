import React, { useState, useRef } from "react";
import { User, Report } from "../types";
import { 
  Truck, CheckCircle, MapPin, Navigation, Calendar, Eye, 
  Upload, Camera, RefreshCw, Sparkles, Compass, Check, AlertTriangle, MessageSquare,
  Phone, Mail, Award, Star, Edit3, ShieldCheck, X, Clock, Play, ArrowRight,
  Search, FileText, AlertCircle, XCircle, Filter, DollarSign, CheckCircle2,
  Building, UserCheck, Layers, ChevronRight, Activity, Map, ExternalLink,
  History, Bell, TrendingUp, BarChart3, PieChart, ArrowUpRight, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ChatBotPanel from "./ChatBotPanel";
import { uploadFileToStorage, dbService, auth } from "../firebase";
import { GhanaMap } from "./GhanaMap";
import { toast } from "sonner";

export const GHANA_REGIONS_LIST = [
  "Greater Accra Region",
  "Ashanti Region",
  "Western Region",
  "Western North Region",
  "Central Region",
  "Volta Region",
  "Oti Region",
  "Eastern Region",
  "Northern Region",
  "Savannah Region",
  "North East Region",
  "Upper East Region",
  "Upper West Region",
  "Bono Region",
  "Bono East Region",
  "Ahafo Region"
];

interface CompanyPortalProps {
  company: User;
  reports: Report[];
  onCompleteReport: (id: string, completionNotes: string, completionImageUrl: string) => void;
  onAcceptReport: (id: string) => void;
  onUpdateCompany?: (updatedCompany: User) => void;
}

export default function CompanyPortal({ 
  company, 
  reports, 
  onCompleteReport, 
  onAcceptReport, 
  onUpdateCompany 
}: CompanyPortalProps) {
  // Navigation Tabs: "dashboard", "assignments", "profile", "map", "chat", "history", "notifications", "performance", "earnings"
  const [activeTab, setActiveTab] = useState<"dashboard" | "assignments" | "profile" | "map" | "chat" | "history" | "notifications" | "performance" | "earnings">("dashboard");
  
  // Collector Availability State (Available, Busy, Offline)
  const [collectorAvailability, setCollectorAvailability] = useState<"Available" | "Busy" | "Offline">(company.availabilityStatus || "Available");

  const handleUpdateAvailability = (status: "Available" | "Busy" | "Offline") => {
    setCollectorAvailability(status);
    onUpdateCompany({
      ...company,
      availabilityStatus: status
    });
    toast.info(`Collector Status: ${status}`, {
      description: status === "Available" 
        ? "You are marked AVAILABLE for auto-dispatched municipal collections."
        : status === "Busy" 
        ? "Status set to BUSY. New automated dispatching paused." 
        : "Status set to OFFLINE. You will not receive auto-assignments."
    });
  };
  
  // Collection History Filter States
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [historyRegionFilter, setHistoryRegionFilter] = useState("ALL");
  const [historyDistrictFilter, setHistoryDistrictFilter] = useState("");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");

  // Notification Center States
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<"ALL" | "ASSIGNMENT" | "SYSTEM" | "PAYOUT">("ALL");
  const [notificationsList, setNotificationsList] = useState([
    {
      id: "notif-1",
      title: "New Job Dispatched",
      message: "You have been assigned to plastic waste collection in Ayawaso West Municipal.",
      type: "ASSIGNMENT",
      timestamp: "10 mins ago",
      read: false
    },
    {
      id: "notif-2",
      title: "EcoPoints & MoMo Payout Processed",
      message: "GHS 225.00 has been transferred to your Mobile Money account for 5 completed collections.",
      type: "PAYOUT",
      timestamp: "1 hour ago",
      read: false
    },
    {
      id: "notif-3",
      title: "Ghana EPA Priority Dispatch Alert",
      message: "High priority E-Waste hazard flag activated in Greater Accra Region.",
      type: "SYSTEM",
      timestamp: "3 hours ago",
      read: true
    },
    {
      id: "notif-4",
      title: "Scheduled Collection Reminder",
      message: "Reminder: You have 2 pending accepted jobs scheduled for collection today.",
      type: "ASSIGNMENT",
      timestamp: "5 hours ago",
      read: true
    },
    {
      id: "notif-5",
      title: "Successful Completion Confirmed",
      message: "Citizen verified proof of collection for #REP-7109. +50 EcoPoints awarded.",
      type: "PAYOUT",
      timestamp: "Yesterday",
      read: true
    }
  ]);
  
  // User Geolocation Coordinates for distance & directions
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.log("Collector location permission not granted or device offline:", err);
        }
      );
    }
  }, []);

  // Distance calculation helper (Haversine formula in KM)
  const calculateDistanceKm = (lat2: number, lng2: number) => {
    if (!userCoords) return null;
    const lat1 = userCoords.lat;
    const lon1 = userCoords.lng;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  // Safe Google Maps Directions Launcher with Fallback
  const handleGetDirections = (job: Report) => {
    let url = "";
    if (userCoords) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${job.location.lat},${job.location.lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location.address || `${job.location.lat},${job.location.lng}`)}`;
    }
    window.open(url, "_blank");
    toast.info("🗺️ Navigation Opened", { description: "Google Maps route launched to collection destination in Ghana." });
  };

  // Assignment Filtering & Search
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection for active modal or detail drawer
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewImageModal, setViewImageModal] = useState<string | null>(null);
  
  // Job Completion Form States
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Profile Edit Modal & Avatar Upload
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(company.name || "");
  const [editPhone, setEditPhone] = useState(company.phone || "+233 24 555 0192");
  const [editCollectorId, setEditCollectorId] = useState(company.collectorId || `COL-GH-${company.id.slice(-4).toUpperCase()}`);
  const [editAssignedCompany, setEditAssignedCompany] = useState(company.assignedCompany || company.name || "EcoClean Solutions Ltd.");
  const [editRegion, setEditRegion] = useState(company.serviceRegion || "Greater Accra Region");
  const [editDistrict, setEditDistrict] = useState(company.serviceDistrict || "Ayawaso West Municipal");
  const [editAvatarUrl, setEditAvatarUrl] = useState(company.avatarUrl || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Quick avatar upload handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingAvatar(true);
      try {
        const file = e.target.files[0];
        const uploadedUrl = await uploadFileToStorage(file, "profile_photos");
        setEditAvatarUrl(uploadedUrl);

        // If not in modal, update user directly
        const updatedUserData: Record<string, any> = { avatarUrl: uploadedUrl || "" };
        await dbService.updateDocument("users", company.id, updatedUserData);
        
        await fetch(`/api/users/${company.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUserData)
        });

        if (onUpdateCompany) {
          onUpdateCompany({ ...company, avatarUrl: uploadedUrl });
        }
        toast.success("Profile photo updated successfully!");
      } catch (err) {
        console.error("Failed uploading profile photo", err);
        toast.error("Failed to upload profile photo");
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // Save full profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updatedData: Record<string, any> = {
        name: editName || company.name || "",
        phone: editPhone || company.phone || "",
        collectorId: editCollectorId || company.collectorId || "",
        assignedCompany: editAssignedCompany || company.assignedCompany || "",
        serviceRegion: editRegion || company.serviceRegion || "",
        serviceDistrict: editDistrict || company.serviceDistrict || "",
        avatarUrl: editAvatarUrl || company.avatarUrl || "",
        verificationStatus: company.verificationStatus || "Verified"
      };

      // 1. Update Firestore
      await dbService.updateDocument("users", company.id, updatedData);

      // 2. Update backend JSON database API
      await fetch(`/api/users/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });

      if (onUpdateCompany) {
        onUpdateCompany({ ...company, ...updatedData });
      }

      setIsEditingProfile(false);
      toast.success("Collector Profile updated successfully!", {
        description: "Your official dispatch profile details have been saved."
      });
    } catch (err: any) {
      console.error("Profile save error:", err);
      toast.error("Error saving profile", { description: err.message || "Could not update user record." });
    } finally {
      setSavingProfile(false);
    }
  };

  // Filter assigned jobs vs general pool
  const myAssignedJobs = reports.filter(
    r => r.assignedCompanyId === company.id || r.assignedCollectorId === company.id
  );
  
  // Available pending pool (unassigned or pending)
  const availablePendingJobs = reports.filter(r => r.status === "Pending");

  // All jobs relevant to this collector/company
  const allCollectorJobs = Array.from(new Set([...myAssignedJobs, ...availablePendingJobs]));

  // Active waypoints for map optimization (non-completed / non-cancelled assigned jobs)
  const activeWaypoints = myAssignedJobs.filter(
    r => ["Assigned", "Accepted", "En Route", "Arrived", "Collected"].includes(r.status)
  );

  // Status Counts for Dashboard Overview Cards
  const countAssigned = myAssignedJobs.filter(r => r.status === "Assigned").length;
  const countPending = availablePendingJobs.length;
  const countAccepted = myAssignedJobs.filter(r => r.status === "Accepted").length;
  const countInProgress = myAssignedJobs.filter(r => ["En Route", "Arrived", "Collected"].includes(r.status)).length;
  const countCompleted = myAssignedJobs.filter(r => r.status === "Completed").length;
  const countCancelled = myAssignedJobs.filter(r => r.status === "Cancelled").length;
  
  // Calculate Today's Collections
  const todayStr = new Date().toISOString().split("T")[0];
  const countToday = myAssignedJobs.filter(
    r => r.status === "Completed" && r.dateCompleted && r.dateCompleted.startsWith(todayStr)
  ).length;

  // Earnings & EcoPoints calculation
  const totalCompletedCount = company.totalCompletedCollections || countCompleted;
  const totalEarningsGHS = company.earnings || (totalCompletedCount * 45) + 150;
  const ratingValue = company.rating || 4.9;
  const verificationStatus = company.verificationStatus || "Verified";

  // Filtered Assignments List
  const filteredAssignments = allCollectorJobs.filter(job => {
    // Status Filter
    if (statusFilter === "ASSIGNED" && job.status !== "Assigned") return false;
    if (statusFilter === "PENDING" && job.status !== "Pending") return false;
    if (statusFilter === "ACCEPTED" && job.status !== "Accepted") return false;
    if (statusFilter === "IN_PROGRESS" && !["En Route", "Arrived", "Collected"].includes(job.status)) return false;
    if (statusFilter === "COMPLETED" && job.status !== "Completed") return false;
    if (statusFilter === "CANCELLED" && job.status !== "Cancelled") return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchId = job.id.toLowerCase().includes(q);
      const matchCategory = job.category.toLowerCase().includes(q);
      const matchAddress = job.location.address.toLowerCase().includes(q);
      const matchReporter = job.reporterName.toLowerCase().includes(q);
      return matchTitle || matchId || matchCategory || matchAddress || matchReporter;
    }

    return true;
  });

  // Action: Update Assignment Status (Accept, Reject, En Route, Arrived, Collected, Complete, Cancel)
  const handleUpdateStatus = async (
    reportId: string, 
    newStatus: "Assigned" | "Accepted" | "En Route" | "Arrived" | "Collected" | "Completed" | "Cancelled",
    extraData: Record<string, any> = {}
  ) => {
    try {
      const firebaseUid = auth?.currentUser?.uid;
      const firebaseEmail = auth?.currentUser?.email;

      const updatePayload = {
        status: newStatus,
        assignedCompanyId: company.id,
        assignedCompanyName: company.name,
        assignedCollectorId: company.id,
        assignedCollectorName: company.name,
        assignedCollectorUid: firebaseUid || company.id,
        assignedCollectorEmail: firebaseEmail || company.email,
        ...extraData
      };

      // 1. Update Firestore
      await dbService.updateDocument("reports", reportId, updatePayload);

      // 2. Update Backend JSON Server API
      await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });

      // Show Toast Notification per status transition
      if (newStatus === "Accepted") {
        toast.success("Assignment Accepted!", {
          description: "Job added to your active dispatch queue."
        });
        onAcceptReport(reportId);
      } else if (newStatus === "En Route") {
        toast.info("🚛 Journey Started!", {
          description: "Status changed to En Route. GPS route active."
        });
      } else if (newStatus === "Arrived") {
        toast.info("📍 Marked Arrived!", {
          description: "Arrival at collection site logged."
        });
      } else if (newStatus === "Collected") {
        toast.info("📦 Marked as Collected!", {
          description: "Waste loaded into collection vehicle. Ready for final completion log."
        });
      } else if (newStatus === "Cancelled") {
        toast.warning("Assignment Cancelled", {
          description: "Job status updated to Cancelled."
        });
      }

      // Refresh selection if opened
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus, ...extraData } : null);
      }
    } catch (err: any) {
      console.error("Failed updating report status:", err);
      toast.error("Failed to update job status", { description: err.message || "Database error." });
    }
  };

  // Handler for Resolution Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingPhoto(true);
      const file = e.target.files[0];
      try {
        const uploadedUrl = await uploadFileToStorage(file, "completion_photos");
        setCompletionPhoto(uploadedUrl);
        toast.success("Resolution proof photo uploaded securely to Firebase Storage!");
      } catch (err: any) {
        console.warn("Firebase Storage notice (Spark Plan / Cloud rules):", err);
        // Fallback gracefully without breaking application functionality
        const localPreview = URL.createObjectURL(file);
        setCompletionPhoto(localPreview);
        toast.warning("Firebase Storage limited (Spark Plan). Proof image attached locally.", {
          description: "Full image hosting requires Firebase Storage upgrade. Proof record retained."
        });
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  // Submit Final Job Completion
  const handleCompleteJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    
    setSubmittingCompletion(true);
    try {
      const finalPhoto = completionPhoto || "https://images.unsplash.com/photo-1606166325683-e6deb697d30e?auto=format&fit=crop&q=80&w=600";
      const firebaseUid = auth?.currentUser?.uid;
      const firebaseEmail = auth?.currentUser?.email;
      
      const completionPayload = {
        status: "Completed" as const,
        completionNotes: completionNotes || "Waste cleared and area sanitized.",
        completionImageUrl: finalPhoto,
        dateCompleted: new Date().toISOString(),
        assignedCompanyId: company.id,
        assignedCollectorId: company.id,
        assignedCollectorUid: firebaseUid || company.id,
        assignedCollectorEmail: firebaseEmail || company.email
      };

      // Update Firestore & Server
      await dbService.updateDocument("reports", selectedReport.id, completionPayload);
      await fetch(`/api/reports/${selectedReport.id}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completionPayload)
      });

      onCompleteReport(selectedReport.id, completionNotes, finalPhoto);
      
      // Update local company completed stats
      if (onUpdateCompany) {
        onUpdateCompany({
          ...company,
          totalCompletedCollections: (company.totalCompletedCollections || 0) + 1,
          earnings: (company.earnings || 150) + 45
        });
      }

      // Reset state
      setSelectedReport(null);
      setCompletionNotes("");
      setCompletionPhoto(null);

      toast.success("🎉 Collection Job Completed!", {
        description: "Proof uploaded, citizen notified, and EcoPoints/Earnings awarded."
      });
    } catch (err: any) {
      console.error("Completion submission error:", err);
      toast.error("Could not complete job", { description: err.message || "Failed to save completion." });
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Helper function to render status action buttons dynamically
  const renderStatusActions = (job: Report) => {
    const s = job.status;

    return (
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        {/* Status: PENDING (Available Pool) */}
        {s === "Pending" && (
          <button
            type="button"
            onClick={() => handleUpdateStatus(job.id, "Accepted")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accept Assignment</span>
          </button>
        )}

        {/* Status: ASSIGNED */}
        {s === "Assigned" && (
          <>
            <button
              type="button"
              onClick={() => handleUpdateStatus(job.id, "Accepted")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept Assignment</span>
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus(job.id, "Cancelled")}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs px-3 py-1.5 rounded-xl border border-red-200 transition-all flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Reject Assignment</span>
            </button>
          </>
        )}

        {/* Status: ACCEPTED */}
        {s === "Accepted" && (
          <>
            <button
              type="button"
              onClick={() => handleUpdateStatus(job.id, "En Route")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 animate-pulse"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Journey (En Route)</span>
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus(job.id, "Cancelled")}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs px-3 py-1.5 rounded-xl border border-stone-300 transition-all"
            >
              Cancel Assignment
            </button>
          </>
        )}

        {/* Status: EN ROUTE */}
        {s === "En Route" && (
          <button
            type="button"
            onClick={() => handleUpdateStatus(job.id, "Arrived")}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Mark Arrived at Location</span>
          </button>
        )}

        {/* Status: ARRIVED */}
        {s === "Arrived" && (
          <button
            type="button"
            onClick={() => handleUpdateStatus(job.id, "Collected")}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Mark as Collected</span>
          </button>
        )}

        {/* Status: COLLECTED */}
        {s === "Collected" && (
          <button
            type="button"
            onClick={() => {
              setSelectedReport(job);
              window.scrollTo({ top: 120, behavior: "smooth" });
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Complete Job (Log Resolution & Proof)</span>
          </button>
        )}

        {/* Status: COMPLETED */}
        {s === "Completed" && (
          <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Collection Completed & Verified ({job.dateCompleted ? new Date(job.dateCompleted).toLocaleDateString() : 'Done'})</span>
          </div>
        )}

        {/* Status: CANCELLED */}
        {s === "Cancelled" && (
          <div className="flex items-center space-x-2 text-xs text-red-800 bg-red-50 px-3 py-1 rounded-xl border border-red-200 font-medium">
            <XCircle className="w-4 h-4 text-red-600" />
            <span>Assignment Cancelled</span>
          </div>
        )}

        {/* Navigation & Directions Button */}
        <button
          type="button"
          onClick={() => handleGetDirections(job)}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1.5"
          title="Get navigation directions in Google Maps"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span>Get Directions {calculateDistanceKm(job.location.lat, job.location.lng) ? `(~${calculateDistanceKm(job.location.lat, job.location.lng)} km)` : ''}</span>
        </button>

        {/* Review/Details Drawer trigger button */}
        <button
          type="button"
          onClick={() => {
            setSelectedReport(job);
            window.scrollTo({ top: 120, behavior: "smooth" });
          }}
          className="ml-auto text-xs text-gray-500 hover:text-gray-800 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1"
        >
          <Eye className="w-3.5 h-3.5 text-gray-400" />
          <span>View Details</span>
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hidden File Input for Quick Avatar Upload */}
      <input 
        type="file" 
        ref={avatarInputRef} 
        onChange={handleAvatarChange} 
        className="hidden" 
        accept="image/*" 
      />

      {/* TOP HEADER & ROLE BADGE */}
      <div className="bg-gradient-to-r from-slate-900 via-stone-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center space-x-4">
            <div className="relative group flex-shrink-0">
              {company.avatarUrl ? (
                <img 
                  src={company.avatarUrl} 
                  alt={company.name} 
                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-2xl border-2 border-blue-500 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 border-2 border-blue-400 rounded-2xl text-white flex items-center justify-center font-black text-2xl shadow-md uppercase">
                  {company.name.charAt(0)}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold cursor-pointer"
                title="Upload Profile Photo"
              >
                <Camera className="w-4 h-4 text-blue-300 mb-0.5" />
                <span>Upload</span>
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Truck className="w-3 h-3 text-blue-400" /> Waste Collector Dispatch
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> {verificationStatus}
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  🇬🇭 {company.serviceRegion || "Greater Accra Region"}
                </span>
              </div>

              <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>{company.name}</span>
              </h2>

              <p className="text-xs md:text-sm text-slate-300 mt-1 flex flex-wrap items-center gap-y-1 gap-x-4 font-mono">
                <span>ID: <strong>{company.collectorId || `COL-GH-${company.id.slice(-4).toUpperCase()}`}</strong></span>
                <span>Org: <strong>{company.assignedCompany || "EcoClean Solutions Ltd."}</strong></span>
                <span>Phone: <strong>{company.phone || "+233 24 555 0192"}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Edit Profile & Availability Status Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start md:self-auto">
            {/* Availability Selector */}
            <div className="bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80 flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400 font-bold px-2 uppercase">Status:</span>
              {(["Available", "Busy", "Offline"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleUpdateAvailability(status)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                    collectorAvailability === status
                      ? status === "Available"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : status === "Busy"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-red-500 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    status === "Available" ? "bg-emerald-300" : status === "Busy" ? "bg-amber-300" : "bg-red-300"
                  }`} />
                  <span>{status}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 border border-blue-400/30 justify-center"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Collector Profile</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS BAR */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "assignments"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Collection Assignments ({myAssignedJobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("earnings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "earnings"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>EcoPoints & Earnings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "profile"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Collector Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "map"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>Optimized Routes Map ({activeWaypoints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>Collection History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === "notifications"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Notifications</span>
            {notificationsList.filter(n => !n.read).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                {notificationsList.filter(n => !n.read).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "performance"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>Performance & Metrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "chat"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Logistics AI EcoBot</span>
          </button>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditingProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative space-y-6 my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Collector Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Profile Photo Row */}
                <div>
                  <label className="block text-[10px] font-bold uppercase font-mono text-gray-500 mb-1">
                    Profile Photo / Avatar
                  </label>
                  <div className="flex items-center space-x-4">
                    <img 
                      src={editAvatarUrl || company.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"} 
                      alt="Avatar Preview" 
                      className="w-14 h-14 object-cover rounded-2xl border-2 border-blue-500"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => editAvatarInputRef.current?.click()}
                      className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Upload New Photo</span>
                    </button>
                    <input
                      type="file"
                      ref={editAvatarInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          try {
                            const url = await uploadFileToStorage(e.target.files[0], "profile_photos");
                            setEditAvatarUrl(url);
                            toast.success("Photo loaded into form!");
                          } catch (err) {
                            toast.error("Failed photo upload");
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono text-gray-500 mb-1">Collector Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm px-3.5 py-2.5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono text-gray-500 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm px-3.5 py-2.5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono text-gray-500 mb-1">Collector ID</label>
                    <input
                      type="text"
                      required
                      value={editCollectorId}
                      onChange={(e) => setEditCollectorId(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm px-3.5 py-2.5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono text-gray-500 mb-1">Assigned Company / Org</label>
                    <input
                      type="text"
                      required
                      value={editAssignedCompany}
                      onChange={(e) => setEditAssignedCompany(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm px-3.5 py-2.5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono text-gray-500 mb-1">Service Region (Ghana)</label>
                    <select
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm px-3.5 py-2.5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      {GHANA_REGIONS_LIST.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono text-gray-500 mb-1">District / Municipality</label>
                    <input
                      type="text"
                      required
                      value={editDistrict}
                      onChange={(e) => setEditDistrict(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm px-3.5 py-2.5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Ayawaso West Municipal"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    {savingProfile ? "Saving Profile..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL OVERLAY / COMPLETION DRAWER */}
      {selectedReport && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50/80 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-2 border-blue-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl space-y-6 relative"
        >
          <div className="flex items-start justify-between pb-3 border-b border-blue-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-blue-800 font-bold bg-blue-100 dark:bg-blue-900/60 dark:text-blue-200 px-2.5 py-0.5 rounded-full uppercase font-mono">
                  Collection Job #{selectedReport.id}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  selectedReport.status === "Completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : selectedReport.status === "Cancelled"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  Status: {selectedReport.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1.5">{selectedReport.title}</h3>
            </div>

            <button 
              type="button"
              onClick={() => setSelectedReport(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Job Details Left Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Category & Priority</span>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">{selectedReport.category}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${
                    selectedReport.severity === "High" ? "bg-red-100 text-red-800" : selectedReport.severity === "Medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {selectedReport.severity} Priority
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Reporter Details</span>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">{selectedReport.reporterName}</p>
                  <p className="text-gray-500 dark:text-gray-400 truncate">{selectedReport.reporterEmail}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Location & Ghana District</span>
                  <button
                    type="button"
                    onClick={() => handleGetDirections(selectedReport)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions {calculateDistanceKm(selectedReport.location.lat, selectedReport.location.lng) ? `(~${calculateDistanceKm(selectedReport.location.lat, selectedReport.location.lng)} km)` : ''}</span>
                  </button>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white flex items-start">
                  <MapPin className="w-4 h-4 text-red-500 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>{selectedReport.location.address}</span>
                </p>
                <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-800">
                  <span>Region: <strong>{selectedReport.location.region || "Greater Accra Region"}</strong></span>
                  <span>District: <strong>{selectedReport.location.district || "Ayawaso West"}</strong></span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-mono text-gray-400 uppercase block">Hazard Description</span>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">"{selectedReport.description}"</p>
                
                {selectedReport.aiClassification && (
                  <div className="mt-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span><strong>AI Classification:</strong> {selectedReport.aiClassification}</span>
                  </div>
                )}
              </div>

              {/* Waste Photo */}
              {selectedReport.imageUrl && (
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Report Photo</span>
                  <img 
                    src={selectedReport.imageUrl} 
                    alt="Waste site" 
                    onClick={() => setViewImageModal(selectedReport.imageUrl || null)}
                    className="max-h-48 rounded-2xl border border-gray-200 dark:border-slate-800 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Completion Form or Action Column */}
            <div className="lg:col-span-5 space-y-4">
              {selectedReport.status === "Completed" ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-5 rounded-2xl space-y-3 text-xs">
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Resolution Summary
                  </h4>
                  <p className="text-emerald-950 dark:text-emerald-100 font-medium">"{selectedReport.completionNotes || 'Resolved successfully.'}"</p>
                  
                  {selectedReport.completionImageUrl && (
                    <div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono block mb-1">Verification Proof Photo</span>
                      <img 
                        src={selectedReport.completionImageUrl} 
                        alt="Completion proof" 
                        className="max-h-36 rounded-xl border border-emerald-300 dark:border-emerald-800 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                    Completed Date: {new Date(selectedReport.dateCompleted || "").toLocaleString()}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCompleteJobSubmit} className="bg-white dark:bg-slate-950 p-5 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" /> Log Collection Completion Proof
                  </h4>
                  
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase font-mono mb-1">
                      Completion Notes / Disposal Log
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="e.g. Dispatched 2-ton compactor truck. Cleared all plastic waste containers, sanitized ground, and delivered to Accra Recycling Facility."
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white text-xs p-3 rounded-xl focus:outline-none focus:border-blue-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase font-mono mb-1">
                      Proof Photo Upload (Firebase Storage)
                    </label>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => document.getElementById("complete-photo-input")?.click()}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                      >
                        {isUploadingPhoto ? (
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-blue-600" />
                        )}
                        <span>{isUploadingPhoto ? "Uploading Photo..." : "Select Proof Photo"}</span>
                      </button>
                      <input
                        id="complete-photo-input"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={isUploadingPhoto}
                      />
                      {completionPhoto && !isUploadingPhoto && (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1">
                          <Check className="w-4 h-4" /> Proof Photo Loaded
                        </span>
                      )}
                    </div>

                    {completionPhoto && !isUploadingPhoto && (
                      <img 
                        src={completionPhoto} 
                        alt="Resolution thumbnail" 
                        className="max-h-24 mt-2 rounded-xl border border-gray-200 dark:border-slate-800 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submittingCompletion || !completionNotes}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all"
                    >
                      {submittingCompletion ? "Submitting Resolution..." : "Submit Completed Collection"}
                    </button>
                  </div>
                </form>
              )}

              {/* Status Action Buttons */}
              <div className="bg-white dark:bg-slate-950 p-4 border border-gray-200 dark:border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Update Assignment Status</span>
                {renderStatusActions(selectedReport)}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* LIGHTBOX IMAGE MODAL */}
      <AnimatePresence>
        {viewImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewImageModal(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-3xl w-full max-h-[85vh]">
              <img 
                src={viewImageModal} 
                alt="Enlarged waste photo" 
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setViewImageModal(null)}
                className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN TAB CONTENTS */}
      <AnimatePresence mode="wait">
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* 8 SUMMARY METRIC CARDS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span>Dispatch Real-time Overview</span>
                </h3>
                <span className="text-xs text-gray-500 font-mono">Live Firestore & Dispatch Stream</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* 1. New Assignments */}
                <div 
                  onClick={() => { setActiveTab("assignments"); setStatusFilter("ASSIGNED"); }}
                  className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-blue-700 dark:text-blue-300">New Assignments</span>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-300">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-blue-900 dark:text-blue-100 font-mono mt-2">{countAssigned}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                    <span>Assigned to fleet</span> <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>

                {/* 2. Pending Collections */}
                <div 
                  onClick={() => { setActiveTab("assignments"); setStatusFilter("PENDING"); }}
                  className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-stone-600 dark:text-stone-400">Pending Pool</span>
                    <div className="p-2 bg-stone-100 dark:bg-slate-800 rounded-xl text-stone-600 dark:text-stone-300">
                      <Compass className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white font-mono mt-2">{countPending}</p>
                  <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                    <span>Unassigned citizen reports</span> <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>

                {/* 3. Accepted Jobs */}
                <div 
                  onClick={() => { setActiveTab("assignments"); setStatusFilter("ACCEPTED"); }}
                  className="bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-teal-700 dark:text-teal-300">Accepted Jobs</span>
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-xl text-teal-600 dark:text-teal-300">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-teal-900 dark:text-teal-100 font-mono mt-2">{countAccepted}</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
                    <span>Accepted & queued</span> <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>

                {/* 4. Jobs In Progress */}
                <div 
                  onClick={() => { setActiveTab("assignments"); setStatusFilter("IN_PROGRESS"); }}
                  className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-amber-700 dark:text-amber-300">In Progress</span>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 animate-pulse">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-amber-900 dark:text-amber-100 font-mono mt-2">{countInProgress}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <span>En Route / Arrived / Collected</span> <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>

                {/* 5. Completed Collections */}
                <div 
                  onClick={() => { setActiveTab("assignments"); setStatusFilter("COMPLETED"); }}
                  className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-emerald-700 dark:text-emerald-300">Completed Collections</span>
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-emerald-900 dark:text-emerald-100 font-mono mt-2">{totalCompletedCount}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <span>Total resolved & verified</span> <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>

                {/* 6. Cancelled Jobs */}
                <div 
                  onClick={() => { setActiveTab("assignments"); setStatusFilter("CANCELLED"); }}
                  className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-red-700 dark:text-red-300">Cancelled Jobs</span>
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-600 dark:text-red-300">
                      <XCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-red-900 dark:text-red-100 font-mono mt-2">{countCancelled}</p>
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                    <span>Cancelled / Rejected</span> <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>

                {/* 7. Today's Collections */}
                <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 p-4 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-purple-700 dark:text-purple-300">Today's Collections</span>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-purple-900 dark:text-purple-100 font-mono mt-2">{countToday}</p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">Cleared today ({new Date().toLocaleDateString()})</p>
                </div>

                {/* 8. Total EcoPoints & Earnings */}
                <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-4 rounded-2xl shadow-md border border-emerald-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-emerald-300">Total Earnings / Points</span>
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-300 border border-emerald-500/30">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-white font-mono mt-2">GHS {totalEarningsGHS}</p>
                  <p className="text-[10px] text-emerald-300 mt-1">
                    +{company.ecoPoints || 850} Dispatch EcoPoints
                  </p>
                </div>
              </div>
            </div>

            {/* QUICK ACTIVE ASSIGNMENTS BOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <span>Active Collection Queue ({myAssignedJobs.filter(j => j.status !== "Completed" && j.status !== "Cancelled").length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("assignments")}
                    className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>View All Assignments</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {myAssignedJobs.filter(j => j.status !== "Completed" && j.status !== "Cancelled").length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 mb-2 stroke-1" />
                    <p className="text-sm font-semibold">No active jobs in queue</p>
                    <p className="text-xs mt-1">Grab pending waste hazard reports from the available pool!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAssignedJobs.filter(j => j.status !== "Completed" && j.status !== "Cancelled").map((job) => (
                      <div 
                        key={job.id}
                        className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-2 py-0.5 rounded-full">
                              #{job.id}
                            </span>
                            <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 rounded-full">
                              {job.status}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              job.severity === "High" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                            }`}>
                              {job.severity} Priority
                            </span>
                          </div>

                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">{job.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            <span>{job.location.address}</span>
                          </p>
                        </div>

                        <div>
                          {renderStatusActions(job)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ROUTE PREVIEW MINI CARD */}
              <div className="lg:col-span-4 bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                    GPS Dispatch Map
                  </span>
                  <span className="text-xs font-bold text-emerald-400">{activeWaypoints.length} Waypoints Active</span>
                </div>

                <h3 className="font-bold text-lg text-white">Route Optimization</h3>
                <p className="text-xs text-slate-300">
                  AI generates shortest fuel routes across active locations in Ghana.
                </p>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Distance:</span>
                    <span className="font-bold text-emerald-400">{(activeWaypoints.length * 4.2 + 8.1).toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Duration:</span>
                    <span className="font-bold text-blue-300">{activeWaypoints.length * 15 + 20} mins</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("map")}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Full Route Map</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: COLLECTION ASSIGNMENTS */}
        {activeTab === "assignments" && (
          <motion.div
            key="assignments-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* SEARCH & FILTERS BAR */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assignments by ID, location, category, or reporter name..."
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs pl-10 pr-4 py-2.5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: "ALL", label: `All (${allCollectorJobs.length})` },
                  { id: "ASSIGNED", label: `New (${countAssigned})` },
                  { id: "ACCEPTED", label: `Accepted (${countAccepted})` },
                  { id: "IN_PROGRESS", label: `In Progress (${countInProgress})` },
                  { id: "COMPLETED", label: `Completed (${countCompleted})` },
                  { id: "CANCELLED", label: `Cancelled (${countCancelled})` },
                  { id: "PENDING", label: `Pending Pool (${countPending})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === tab.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ASSIGNMENTS LIST */}
            {filteredAssignments.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-12 text-center text-gray-400">
                <Filter className="w-12 h-12 mx-auto text-gray-300 mb-3 stroke-1" />
                <p className="text-sm font-semibold">No assignments match your search filter</p>
                <button
                  type="button"
                  onClick={() => { setStatusFilter("ALL"); setSearchQuery(""); }}
                  className="mt-3 text-xs text-blue-600 hover:underline font-bold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold font-mono uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-2.5 py-0.5 rounded-full">
                            Report #{job.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            job.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : job.status === "Cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {job.status}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            job.severity === "High" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                          }`}>
                            {job.severity} Priority
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Category: {job.category}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      </div>

                      <div className="text-right sm:text-right">
                        <span className="text-[10px] text-gray-400 font-mono block">Date Reported</span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                          {new Date(job.dateSubmitted).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                      {/* Image Thumbnail Column */}
                      <div className="md:col-span-3">
                        <img 
                          src={job.imageUrl || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600"} 
                          alt="Waste site photo" 
                          onClick={() => setViewImageModal(job.imageUrl || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600")}
                          className="w-full h-32 object-cover rounded-2xl border border-gray-200 dark:border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Details Column */}
                      <div className="md:col-span-9 space-y-2">
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">Waste Description</span>
                          <p className="text-gray-700 dark:text-gray-200 italic mt-0.5">"{job.description}"</p>
                          
                          {job.originalTranscription && (
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 font-mono">
                              🗣️ Voice Spoken ({job.originalLanguage || 'Local'}): "{job.originalTranscription}"
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                            <span className="text-[10px] text-gray-400 uppercase font-mono block">Location & Address</span>
                            <p className="font-semibold text-gray-900 dark:text-white mt-0.5 truncate flex items-center">
                              <MapPin className="w-3.5 h-3.5 text-red-500 mr-1 flex-shrink-0" />
                              <span>{job.location.address}</span>
                            </p>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono block mt-0.5">
                              {job.location.region || "Greater Accra Region"} • {job.location.district || "Ayawaso West"}
                            </span>
                          </div>

                          <div className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                            <span className="text-[10px] text-gray-400 uppercase font-mono block">Reporter Info</span>
                            <p className="font-bold text-gray-900 dark:text-white mt-0.5">{job.reporterName}</p>
                            <p className="text-gray-500 dark:text-gray-400 font-mono text-[10px] truncate">{job.reporterEmail}</p>
                          </div>
                        </div>

                        {/* AI Classification & Hazard Level Badge */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-mono px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            <span>AI Classification: <strong>{job.aiClassification || `${job.category} - Verified`}</strong></span>
                          </span>

                          <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-mono px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>Hazard Rating: <strong>{job.hazardLevel || (job.severity === "High" ? "Moderate Biohazard" : "Standard Waste")}</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* STATUS ACTION BUTTONS */}
                    {renderStatusActions(job)}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: COLLECTOR PROFILE */}
        {activeTab === "profile" && (
          <motion.div
            key="profile-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center space-x-4">
                  <img 
                    src={company.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"} 
                    alt={company.name} 
                    className="w-20 h-20 object-cover rounded-2xl border-2 border-blue-500 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{company.name}</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {verificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{company.email}</p>
                    <div className="flex items-center space-x-1 text-amber-500 mt-1 text-xs font-bold">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{ratingValue} Rating</span>
                      <span className="text-gray-400 font-normal">({totalCompletedCount} completed jobs)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Collector ID</span>
                  <p className="font-mono font-bold text-base text-gray-900 dark:text-white">
                    {company.collectorId || `COL-GH-${company.id.slice(-4).toUpperCase()}`}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Assigned Organization</span>
                  <p className="font-bold text-base text-gray-900 dark:text-white">
                    {company.assignedCompany || company.name || "EcoClean Solutions Ltd."}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Phone Number</span>
                  <p className="font-bold text-base text-gray-900 dark:text-white">
                    {company.phone || "+233 24 555 0192"}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Service Region (Ghana)</span>
                  <p className="font-bold text-base text-gray-900 dark:text-white">
                    {company.serviceRegion || "Greater Accra Region"}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">District / Municipality</span>
                  <p className="font-bold text-base text-gray-900 dark:text-white">
                    {company.serviceDistrict || "Ayawaso West Municipal"}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Completed Collections</span>
                  <p className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                    {totalCompletedCount} Total Resolved
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: OPTIMIZED ROUTES MAP */}
        {activeTab === "map" && (
          <motion.div
            key="map-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Optimized Logistics Routing</h3>
              <p className="text-xs text-gray-500">Real-time shortest path calculations across your active assigned garbage piles to reduce fuel emissions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Route Steps */}
              <div className="space-y-4">
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full uppercase font-mono tracking-wider w-max block">
                  Turn-By-Turn Waypoint Sequence
                </span>

                {activeWaypoints.length === 0 ? (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-center text-xs text-gray-400">
                    No active waypoints found. Accept or assign jobs to populate optimal routes.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl relative">
                      <div className="flex items-start space-x-3 text-xs">
                        <div className="w-5 h-5 bg-blue-600 rounded-full text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">D</div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">Depot Station: Accra Logistics Station</p>
                          <p className="text-gray-500 dark:text-gray-400 text-[10px]">Municipal Fleet Base</p>
                        </div>
                      </div>
                    </div>

                    {activeWaypoints.map((waypoint, index) => (
                      <div key={waypoint.id} className="p-3 bg-blue-50/40 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl relative">
                        <div className="flex items-start space-x-3 text-xs">
                          <div className="w-5 h-5 bg-emerald-600 rounded-full text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">{index + 1}</div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{waypoint.title}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px]">{waypoint.location.address}</p>
                            <span className="bg-red-100 text-red-800 font-bold font-mono text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block uppercase">
                              {waypoint.severity} Priority
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Map Canvas */}
              <div className="md:col-span-2 space-y-3">
                <div className="bg-slate-900 text-white rounded-2xl p-3 flex items-center justify-between text-xs font-mono shadow-sm">
                  <div>
                    <p className="text-slate-400 text-[10px]">TOTAL RECOVERY DISTANCE</p>
                    <p className="font-bold text-emerald-400">
                      {(activeWaypoints.length * 4.2 + 8.1).toFixed(1)} km <span className="text-[10px] text-emerald-300">(-12% fuel savings)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px]">TIME ESTIMATE</p>
                    <p className="font-bold text-blue-300">{(activeWaypoints.length * 15 + 20)} mins</p>
                  </div>
                </div>

                <GhanaMap
                  reports={activeWaypoints}
                  heightClass="h-[420px]"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: LOGISTICS ECOBOT AI */}
        {activeTab === "chat" && (
          <motion.div
            key="chat-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ChatBotPanel userRole="company" />
          </motion.div>
        )}

        {/* TAB 6: COLLECTION HISTORY */}
        {activeTab === "history" && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-500" />
                    <span>Collection History Archive</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Search and filter completed waste collections, proof photos, locations, and earned EcoPoints.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    {reports.filter(r => r.status === "Completed").length} Resolved Collections
                  </span>
                </div>
              </div>

              {/* FILTER BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                {/* Search Input */}
                <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search ID, location, title..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={historyDateFilter}
                    onChange={(e: any) => setHistoryDateFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="ALL">🗓️ All Dates</option>
                    <option value="TODAY">Today</option>
                    <option value="WEEK">This Week</option>
                    <option value="MONTH">This Month</option>
                  </select>
                </div>

                {/* Region Filter */}
                <div>
                  <select
                    value={historyRegionFilter}
                    onChange={(e) => setHistoryRegionFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="ALL">🇬🇭 All Regions</option>
                    {GHANA_REGIONS_LIST.map((reg) => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                {/* Category / Waste Type Filter */}
                <div>
                  <select
                    value={historyCategoryFilter}
                    onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="ALL">♻️ All Waste Types</option>
                    <option value="Plastics">Plastics</option>
                    <option value="Organic">Organic</option>
                    <option value="E-Waste">E-Waste</option>
                    <option value="Hazardous">Hazardous</option>
                    <option value="Medical">Medical</option>
                    <option value="Mixed Waste">Mixed Waste</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="ALL">📌 All Statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* HISTORY CARDS LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports
                .filter(job => {
                  const isResolved = ["Completed", "Cancelled", "Collected"].includes(job.status) || job.assignedCollectorId === company.id;
                  if (!isResolved) return false;
                  if (historyStatusFilter !== "ALL" && job.status !== historyStatusFilter) return false;
                  if (historyCategoryFilter !== "ALL" && job.category !== historyCategoryFilter) return false;
                  if (historyRegionFilter !== "ALL" && (job.location.region || "Greater Accra Region") !== historyRegionFilter) return false;
                  if (historyDistrictFilter.trim() && !(job.location.district || "").toLowerCase().includes(historyDistrictFilter.toLowerCase())) return false;
                  if (historySearch.trim()) {
                    const q = historySearch.toLowerCase();
                    const matchTitle = job.title.toLowerCase().includes(q);
                    const matchId = job.id.toLowerCase().includes(q);
                    const matchAddress = job.location.address.toLowerCase().includes(q);
                    if (!matchTitle && !matchId && !matchAddress) return false;
                  }
                  return true;
                })
                .map(job => (
                  <div key={job.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-emerald-500/50 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-gray-400 font-bold uppercase">{job.id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                            job.status === "Completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}>
                            {job.status}
                          </span>
                          <span className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                            {job.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{job.title}</h4>
                      </div>

                      <div className="text-right font-mono text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block">+50 EcoPts</span>
                        <span className="text-gray-400 text-[10px]">GHS 45.00 Earned</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                      <p className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                        <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span>{job.location.address}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>Resolved: {job.dateCompleted || job.dateSubmitted || "Recently"}</span>
                      </p>
                    </div>

                    {/* Proof of Collection Photo & Notes */}
                    {(job.completionImageUrl || completionPhoto) && (
                      <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                        <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                          📸 Proof of Collection
                        </span>
                        <div className="flex items-center gap-3">
                          <img
                            src={job.completionImageUrl || completionPhoto || ""}
                            alt="Collection Proof"
                            className="w-14 h-14 object-cover rounded-lg border border-emerald-300 dark:border-emerald-700 cursor-pointer shadow-sm"
                            onClick={() => setViewImageModal(job.completionImageUrl || completionPhoto || null)}
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-xs text-emerald-900 dark:text-emerald-200">
                            <p className="italic text-[11px]">"{job.completionNotes || "Waste successfully collected and site restored."}"</p>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-mono mt-0.5">Verified by Dispatch System</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleGetDirections(job)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>View Location Map</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedReport(job)}
                        className="text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white flex items-center gap-1 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Full Report Details</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* TAB 7: NOTIFICATION CENTER */}
        {activeTab === "notifications" && (
          <motion.div
            key="notifications-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <span>Logistics Notification Center</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Real-time dispatches, assignment changes, EPA system alerts, and MoMo payout updates.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
                  toast.success("All notifications marked as read!");
                }}
                className="bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
              >
                Mark All as Read
              </button>
            </div>

            {/* Notification Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {["ALL", "ASSIGNMENT", "PAYOUT", "SYSTEM"].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNotificationTypeFilter(type as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                    notificationTypeFilter === type
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {type === "ALL" ? "🔔 All Alerts" : type}
                </button>
              ))}
            </div>

            {/* Notification Items List */}
            <div className="space-y-3">
              {notificationsList
                .filter(n => notificationTypeFilter === "ALL" || n.type === notificationTypeFilter)
                .map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                      notif.read
                        ? "bg-gray-50/60 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800"
                        : "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        notif.type === "ASSIGNMENT" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                        notif.type === "PAYOUT" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {notif.type === "ASSIGNMENT" ? <Truck className="w-4 h-4" /> :
                         notif.type === "PAYOUT" ? <DollarSign className="w-4 h-4" /> :
                         <ShieldAlert className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">{notif.title}</h4>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">{notif.message}</p>
                        <span className="text-[10px] font-mono text-gray-400 mt-1 block">{notif.timestamp}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (notif.type === "ASSIGNMENT") setActiveTab("assignments");
                        else if (notif.type === "PAYOUT") setActiveTab("history");
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* TAB 8: COLLECTOR PERFORMANCE & METRICS */}
        {activeTab === "performance" && (
          <motion.div
            key="performance-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase block font-bold">Total Jobs Completed</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalCompletedCount}</p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span>+14.2% vs last month</span>
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase block font-bold">Avg Response Time</span>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">18 <span className="text-xs font-normal">mins</span></p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>Ghana Dispatch Standard</span>
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase block font-bold">Completion Rate</span>
                <p className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">98.5%</p>
                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Top Rating</span>
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase block font-bold">Citizen Rating</span>
                <p className="text-2xl font-black text-amber-500 font-mono flex items-center gap-1">
                  <span>{ratingValue.toFixed(1)}</span>
                  <Star className="w-5 h-5 fill-current text-amber-500" />
                </p>
                <p className="text-[10px] text-gray-500">Based on citizen feedback</p>
              </div>
            </div>

            {/* VISUAL CHARTS & BREAKDOWNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weekly Collection Activity Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span>Weekly Collection Activity</span>
                  </h4>
                  <p className="text-xs text-gray-500">Completed pickups per day (Mon - Sun)</p>
                </div>

                <div className="h-44 flex items-end justify-between gap-2 pt-6 border-b border-gray-100 dark:border-slate-800 pb-2">
                  {[
                    { day: "Mon", count: 8, height: "h-20" },
                    { day: "Tue", count: 12, height: "h-32" },
                    { day: "Wed", count: 15, height: "h-40" },
                    { day: "Thu", count: 10, height: "h-24" },
                    { day: "Fri", count: 18, height: "h-44" },
                    { day: "Sat", count: 14, height: "h-36" },
                    { day: "Sun", count: 6, height: "h-16" }
                  ].map(item => (
                    <div key={item.day} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-mono font-bold text-gray-400 group-hover:text-blue-600 transition-colors">{item.count}</span>
                      <div className={`w-full max-w-[28px] bg-blue-500 dark:bg-blue-600 rounded-t-lg transition-all group-hover:bg-emerald-500 ${item.height}`} />
                      <span className="text-[10px] font-mono text-gray-500 mt-1">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Waste Type Category Breakdown */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-500" />
                    <span>Collected Waste Classification</span>
                  </h4>
                  <p className="text-xs text-gray-500">Distribution across recovery categories</p>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "Plastic Waste & Bottling", pct: 45, color: "bg-blue-500" },
                    { name: "Organic / Market Refuse", pct: 25, color: "bg-emerald-500" },
                    { name: "Electronic Waste (E-Waste)", pct: 18, color: "bg-purple-500" },
                    { name: "Hazardous & Medical Waste", pct: 12, color: "bg-red-500" }
                  ].map(cat => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-800 dark:text-gray-200 font-mono">
                        <span>{cat.name}</span>
                        <span>{cat.pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className={`${cat.color} h-full rounded-full`} style={{ width: `${cat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 9: ECOPOINTS & EARNINGS */}
        {activeTab === "earnings" && (
          <motion.div
            key="earnings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* EARNINGS SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider block font-bold text-emerald-100">Total EcoPoints Earned</span>
                <p className="text-3xl font-black font-mono">{company.ecoPoints || totalCompletedCount * 50} <span className="text-sm font-normal">pts</span></p>
                <span className="text-[10px] text-emerald-100 font-mono block">Awarded for verified collections</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Total Cash Earnings</span>
                <p className="text-3xl font-black font-mono text-gray-900 dark:text-white">
                  GHS {(company.earnings || totalCompletedCount * 45).toFixed(2)}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono block">MTN MoMo / Telecel Cash Direct</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Pending Rewards</span>
                <p className="text-3xl font-black font-mono text-amber-500">GHS 90.00</p>
                <span className="text-[10px] text-gray-400 font-mono block">2 jobs awaiting citizen confirmation</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Redeemed & Paid Out</span>
                <p className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400">GHS 675.00</p>
                <span className="text-[10px] text-gray-400 font-mono block">Transferred to registered MoMo #</span>
              </div>
            </div>

            {/* REWARD HISTORY & RECENT COMPLETED JOBS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-500" />
                    <span>Reward History & Job Compensation Breakdown</span>
                  </h3>
                  <p className="text-xs text-gray-500">Track EcoPoints and MoMo payouts per completed dispatch.</p>
                </div>

                <button
                  type="button"
                  onClick={() => toast.success("Payout Requested!", { description: "Mobile Money direct transfer initiated for available EcoPoints balance." })}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 flex-shrink-0"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Request MoMo Cashout</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-400 font-mono text-[10px] uppercase">
                      <th className="py-3 px-2">Job ID & Title</th>
                      <th className="py-3 px-2">Category</th>
                      <th className="py-3 px-2">Date Completed</th>
                      <th className="py-3 px-2">EcoPoints</th>
                      <th className="py-3 px-2">Cash Value</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {reports
                      .filter(r => r.status === "Completed")
                      .map(job => (
                        <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-2 font-medium">
                            <span className="font-mono text-[10px] text-gray-400 block">{job.id}</span>
                            <span className="text-gray-900 dark:text-white font-bold">{job.title}</span>
                          </td>
                          <td className="py-3 px-2 font-mono text-gray-600 dark:text-gray-300">{job.category}</td>
                          <td className="py-3 px-2 font-mono text-gray-500">{job.dateCompleted || job.dateSubmitted || "Recently"}</td>
                          <td className="py-3 px-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">+50 Pts</td>
                          <td className="py-3 px-2 font-mono font-bold text-gray-900 dark:text-white">GHS 45.00</td>
                          <td className="py-3 px-2">
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Disbursed
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
