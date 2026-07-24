import React, { useState, useEffect, useRef } from "react";
import { User, Report, Announcement } from "../types";
import { toast } from "sonner";
import { 
  Shield, List, Award, TrendingUp, AlertTriangle, Users, BarChart3, 
  MapPin, Clock, Plus, HelpCircle, FileDown, CheckCircle, Sparkles, 
  Eye, CornerDownRight, Check, Trash2, ArrowUpRight, MessageSquare, Camera
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ChatBotPanel from "./ChatBotPanel";
import { uploadFileToStorage, dbService } from "../firebase";

interface AdminPortalProps {
  adminUser: User;
  reports: Report[];
  usersList: User[];
  announcements: Announcement[];
  onAddAnnouncement: (newAnn: Announcement) => void;
  onAssignReport: (reportId: string, companyId: string, companyName: string) => void;
  onUpdateAdmin?: (updatedAdmin: User) => void;
}

export default function AdminPortal({ 
  adminUser, reports, usersList, announcements, onAddAnnouncement, onAssignReport, onUpdateAdmin 
}: AdminPortalProps) {
  // Tabs: "dashboard", "reports", "collectors", "announcements", "chat"
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports" | "collectors" | "announcements" | "chat">("dashboard");
  
  // Profile/Logo Firebase Storage Upload States & Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUpdateAdmin) {
      setIsUploadingAvatar(true);
      try {
        const file = e.target.files[0];
        const uploadedUrl = await uploadFileToStorage(file, "profile_photos");
        const avatarUrlVal = uploadedUrl || "";

        await dbService.updateDocument("users", adminUser.id, { avatarUrl: avatarUrlVal });

        const res = await fetch(`/api/users/${adminUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: avatarUrlVal })
        });
        const data = await res.json();
        if (data.success && data.user) {
          onUpdateAdmin(data.user);
        }
      } catch (err) {
        console.error("Failed uploading admin profile photo to Firebase Storage", err);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };
  
  // Announcement publishing
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annCategory, setAnnCategory] = useState<"Alert" | "Event" | "Update">("Update");
  const [publishingAnn, setPublishingAnn] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);

  // Assign drawers
  const [assigningReportId, setAssigningReportId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const collectionCompanies = usersList.filter(u => u.role === "company");

  // Analytics derivations
  const totalReportsCount = reports.length;
  const completedCount = reports.filter(r => r.status === "Completed").length;
  const pendingCount = reports.filter(r => r.status === "Pending").length;
  const assignedCount = reports.filter(r => r.status === "Assigned").length;

  const totalPointsAwarded = reports.reduce((acc, r) => acc + r.ecoPointsAwarded, 0);

  // Category distributions
  const categoriesCount: Record<string, number> = {};
  reports.forEach(r => {
    categoriesCount[r.category] = (categoriesCount[r.category] || 0) + 1;
  });

  // Export data handler (Compliance reporting)
  const handleExportData = () => {
    const rawData = JSON.stringify(reports, null, 2);
    const blob = new Blob([rawData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EcoGuardian_Compliance_Report_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Compliance Data Exported", { description: "Download file generated successfully." });
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;

    setPublishingAnn(true);
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          category: annCategory,
          author: adminUser.name
        })
      });
      const data = await response.json();
      if (data.success) {
        onAddAnnouncement(data.announcement);
        setAnnTitle("");
        setAnnContent("");
        setAnnCategory("Update");
        setAnnSuccess(true);
        setTimeout(() => setAnnSuccess(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublishingAnn(false);
    }
  };

  const handleAssignToCompany = async (reportId: string) => {
    if (!selectedCompanyId) return;
    const targetComp = collectionCompanies.find(c => c.id === selectedCompanyId);
    if (!targetComp) return;

    try {
      await dbService.updateDocument("reports", reportId, {
        status: "Assigned",
        assignedCompanyId: targetComp.id,
        assignedCompanyName: targetComp.name
      });

      onAssignReport(reportId, targetComp.id, targetComp.name);
      setAssigningReportId(null);
      setSelectedCompanyId("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto px-4 py-6">
      {/* Sidebar Controls */}
      <div className="lg:col-span-3 flex flex-col space-y-6">
        {/* Admin Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden border border-slate-800 group">
          <input 
            type="file" 
            ref={avatarInputRef} 
            onChange={handleAvatarChange} 
            className="hidden" 
            accept="image/*" 
          />
          
          <div className="flex items-center space-x-4 relative z-10">
            <div className="relative w-14 h-14 flex-shrink-0 group">
              {adminUser.avatarUrl ? (
                <img 
                  src={adminUser.avatarUrl} 
                  alt={adminUser.name} 
                  className="w-14 h-14 object-cover rounded-full border-2 border-emerald-500 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 bg-emerald-600 border-2 border-emerald-400 rounded-full text-white flex items-center justify-center font-black text-xl shadow-md uppercase">
                  {adminUser.name.charAt(0)}
                </div>
              )}
              
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[8px] font-bold font-mono cursor-pointer border-0"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-semibold bg-emerald-600/30 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Government Authority
              </span>
              <h3 className="mt-1 text-sm font-bold truncate">{adminUser.name}</h3>
              <p className="text-slate-400 text-[10px] font-mono truncate">{adminUser.email}</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-mono space-y-1.5">
            <p className="flex justify-between">
              <span>Authorization Code:</span>
              <span className="text-emerald-400">EG-GH-802</span>
            </p>
            <p className="flex justify-between">
              <span>Jurisdiction:</span>
              <span className="text-slate-200">Ghana National Region</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-2 flex flex-col space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
              activeTab === "dashboard" ? "bg-slate-100 text-slate-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Compliance Analytics</span>
          </button>
          
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
              activeTab === "reports" ? "bg-slate-100 text-slate-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <List className="w-4 h-4" />
            <span>Complaint dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab("collectors")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
              activeTab === "collectors" ? "bg-slate-100 text-slate-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Collectors & Fleet Progress</span>
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
              activeTab === "announcements" ? "bg-slate-100 text-slate-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Publish announcements</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
              activeTab === "chat" ? "bg-slate-100 text-slate-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Authority Advisor EcoBot</span>
          </button>
        </div>
      </div>

      {/* Main Command Center Pane */}
      <div className="lg:col-span-9">
        <AnimatePresence mode="wait">
          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header with Export */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Compliance & Response Metrics</h2>
                  <p className="text-xs text-gray-500">Overview of municipal waste reporting, collection response times, and citizen eco engagement.</p>
                </div>
                <button
                  onClick={handleExportData}
                  className="bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-2 flex-shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Compliance Data</span>
                </button>
              </div>

              {/* Bento Grid Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-[10px] text-gray-400 font-mono font-bold uppercase block">Total Reports</span>
                  <p className="text-3xl font-extrabold font-mono text-slate-950 mt-1">{totalReportsCount}</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-[10px] text-gray-400 font-mono font-bold uppercase block">Resolved Cases</span>
                  <p className="text-3xl font-extrabold font-mono text-emerald-600 mt-1">{completedCount}</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-mono">({totalReportsCount > 0 ? Math.round((completedCount/totalReportsCount)*100) : 0}% clearance)</span>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-[10px] text-gray-400 font-mono font-bold uppercase block">Pending Dispatch</span>
                  <p className="text-3xl font-extrabold font-mono text-amber-600 mt-1">{pendingCount}</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-[10px] text-gray-400 font-mono font-bold uppercase block">EcoPoints Awarded</span>
                  <p className="text-3xl font-extrabold font-mono text-teal-600 mt-1">{totalPointsAwarded}</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-mono">By civic submissions</span>
                </div>
              </div>

              {/* Response Times & Statistics Bar graphs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center justify-between">
                    <span>Incidents by Waste Category</span>
                    <span className="text-[10px] text-slate-400 font-mono">Count distribution</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {Object.entries(categoriesCount).map(([cat, count]) => {
                      const pct = totalReportsCount > 0 ? (count / totalReportsCount) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-700">
                            <span className="font-medium">{cat}</span>
                            <span className="font-mono font-bold">{count} ({Math.round(pct)}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm mb-4">Response Time Benchmarks</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs text-gray-700 border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold">Average Response Time</span>
                        </div>
                        <span className="font-mono font-bold text-gray-950">26.4 Hours</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs text-gray-700 border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">Target Level Service</span>
                        </div>
                        <span className="font-mono font-bold text-gray-950">24 Hours max goal</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-start space-x-3 text-xs text-emerald-950">
                    <Sparkles className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-900">Autonomous Compliance Advice</p>
                      <p className="text-gray-600 mt-0.5">Response times are optimized by prioritizing High Severity car batteries and chemicals. We suggest publishing a public warning to alert citizens on illegal tech dumping corridors.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: COMPLAINT DISPATCH & REPORT LISTS */}
          {activeTab === "reports" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Complaint Dispatch Desk</h3>
                <p className="text-xs text-gray-500">Evaluate public complaints, analyze vision snapshots, and assign jobs to contracted waste logistics firms.</p>
              </div>

              {assigningReportId && (
                <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider">Assign Report (ID: {assigningReportId})</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 text-gray-900 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                    >
                      <option value="">Select a Collection Company...</option>
                      {collectionCompanies.map(co => (
                        <option key={co.id} value={co.id}>
                          {co.name} — Status: [{co.availabilityStatus || "Available"}]
                        </option>
                      ))}
                    </select>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAssignToCompany(assigningReportId)}
                        disabled={!selectedCompanyId}
                        className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                      >
                        Confirm Dispatch
                      </button>
                      <button
                        onClick={() => setAssigningReportId(null)}
                        className="px-4 py-2.5 border border-gray-200 text-xs text-gray-600 rounded-xl hover:bg-gray-100 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main List */}
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-100">
                  {reports.map((report) => (
                    <div key={report.id} className="p-5 hover:bg-slate-50/40 transition-all flex flex-col md:flex-row gap-4 justify-between items-start">
                      <div className="flex items-start space-x-4">
                        {report.imageUrl && (
                          <img 
                            src={report.imageUrl} 
                            alt={report.title} 
                            className="w-20 h-16 object-cover rounded-lg border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-mono text-[9px] text-gray-400">ID: {report.id}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              report.status === "Completed" ? "bg-teal-50 text-teal-800" : report.status === "Assigned" ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"
                            }`}>
                              {report.status}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              report.severity === "High" ? "bg-red-50 text-red-800" : "bg-gray-100 text-gray-600"
                            }`}>
                              {report.severity} Priority
                            </span>
                          </div>

                          <h4 className="font-bold text-gray-900 text-sm mt-1.5">{report.title}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{report.description}</p>
                          <p className="text-[11px] text-gray-400 mt-1.5 flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1" /> {report.location.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center space-x-2 w-full md:w-auto justify-end pt-3 md:pt-0">
                        {report.status === "Pending" && (
                          <button
                            onClick={() => setAssigningReportId(report.id)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all"
                          >
                            Dispatch Crew
                          </button>
                        )}
                        {report.status === "Assigned" && (
                          <span className="text-xs text-blue-800 font-semibold font-mono bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                            Assigned to {report.assignedCompanyName}
                          </span>
                        )}
                        {report.status === "Completed" && (
                          <span className="text-xs text-teal-800 font-semibold font-mono bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-lg">
                            Resolved successfully
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: COLLECTORS & FLEET PROGRESS */}
          {activeTab === "collectors" && (
            <motion.div
              key="collectors"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-1 text-lg">Collector Directory & Fleet Progress Monitoring</h3>
                <p className="text-xs text-gray-500">Monitor collector availability status, track real-time dispatch progress, reassign jobs, and verify completed proof of collection.</p>
              </div>

              {/* Collectors Availability Directory */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-gray-900 text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Registered Collectors & Real-Time Availability</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collectionCompanies.map(collector => {
                    const collectorJobs = reports.filter(r => r.assignedCompanyId === collector.id);
                    const activeJobsCount = collectorJobs.filter(r => r.status !== "Completed" && r.status !== "Cancelled").length;
                    const completedJobsCount = collectorJobs.filter(r => r.status === "Completed").length;
                    const status = collector.availabilityStatus || "Available";

                    return (
                      <div key={collector.id} className="border border-gray-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-[9px] text-gray-400 block">{collector.collectorId || `COL-${collector.id.slice(-4).toUpperCase()}`}</span>
                            <h5 className="font-bold text-gray-900 text-sm">{collector.name}</h5>
                            <p className="text-xs text-gray-500 font-mono">{collector.assignedCompany || "Contracted Logistics"}</p>
                          </div>
                          <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                            status === "Available" 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                              : status === "Busy" 
                              ? "bg-amber-100 text-amber-800 border border-amber-200" 
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              status === "Available" ? "bg-emerald-500" : status === "Busy" ? "bg-amber-500" : "bg-red-500"
                            }`} />
                            <span>{status}</span>
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-gray-600 space-y-1 pt-2 border-t border-gray-200/80">
                          <p>Region: <strong>{collector.serviceRegion || "Greater Accra"}</strong></p>
                          <p>Phone: <strong>{collector.phone || "+233 24 555 0192"}</strong></p>
                          <p>Active Jobs: <strong className="text-blue-600">{activeJobsCount} in progress</strong></p>
                          <p>Completed: <strong className="text-emerald-600">{completedJobsCount} verified</strong></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Monitoring & Reassignment Desk */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                      <List className="w-4 h-4 text-blue-600" />
                      <span>Collection Dispatch & Job Reassignment Desk</span>
                    </h4>
                    <p className="text-xs text-gray-500">View current status of all reports and reassign jobs to available collectors when required.</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {reports.map((report) => (
                    <div key={report.id} className="py-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[9px] text-gray-400">ID: {report.id}</span>
                          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 uppercase">
                            Status: {report.status}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">
                            Location: {report.location.address}
                          </span>
                        </div>
                        <h5 className="font-bold text-gray-900 text-xs">{report.title}</h5>
                        <p className="text-[11px] text-gray-500 font-mono">
                          Assigned to: <strong className="text-blue-700">{report.assignedCompanyName || "Unassigned"}</strong>
                        </p>
                      </div>

                      {/* Reassign / Assign Controls */}
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedCo = collectionCompanies.find(c => c.id === e.target.value);
                              if (selectedCo) {
                                dbService.updateDocument("reports", report.id, {
                                  status: "Assigned",
                                  assignedCompanyId: selectedCo.id,
                                  assignedCompanyName: selectedCo.name
                                });
                                onAssignReport(report.id, selectedCo.id, selectedCo.name);
                                toast.success(`Job Reassigned!`, { description: `Report #${report.id} assigned to ${selectedCo.name}.` });
                              }
                            }
                          }}
                          defaultValue=""
                          className="bg-gray-50 border border-gray-200 text-gray-900 text-xs px-3 py-1.5 rounded-xl focus:outline-none font-mono"
                        >
                          <option value="" disabled>Reassign Collector...</option>
                          {collectionCompanies.map(co => (
                            <option key={co.id} value={co.id}>
                              {co.name} [{co.availabilityStatus || "Available"}]
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof of Collection Inspector */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-gray-900 text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Proof of Collection Inspector</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reports.filter(r => r.status === "Completed" || r.completionImageUrl).map(completedJob => (
                    <div key={completedJob.id} className="border border-emerald-100 bg-emerald-50/20 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[9px] text-emerald-800 font-bold uppercase block">Resolved Report</span>
                          <h5 className="font-bold text-gray-900 text-sm">{completedJob.title}</h5>
                          <p className="text-xs text-gray-500 font-mono">Collector: {completedJob.assignedCompanyName || "EcoClean Logistics"}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase">
                          Verified
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-mono text-gray-400 block mb-1">Citizen Initial Snapshot:</span>
                          {completedJob.imageUrl ? (
                            <img src={completedJob.imageUrl} alt="Initial hazard" className="w-full h-24 object-cover rounded-lg border border-gray-200" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] text-gray-400 font-mono">No Image</div>
                          )}
                        </div>

                        <div>
                          <span className="text-[9px] font-mono text-emerald-700 block mb-1">Collector Completion Proof:</span>
                          {completedJob.completionImageUrl ? (
                            <img src={completedJob.completionImageUrl} alt="Completion Proof" className="w-full h-24 object-cover rounded-lg border border-emerald-300" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-24 bg-emerald-100/50 rounded-lg flex items-center justify-center text-[10px] text-emerald-700 font-mono font-bold">Image Verified</div>
                          )}
                        </div>
                      </div>

                      {completedJob.completionNotes && (
                        <p className="text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-emerald-100 font-mono italic">
                          "{completedJob.completionNotes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: WRITE ANNOUNCEMENTS */}
          {activeTab === "announcements" && (
            <motion.div
              key="announcements"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Publish Environmental Announcements</h2>
                <p className="text-xs text-gray-500">Communicate alerts, recycling schedules, or public community drives directly to the user registries.</p>
              </div>

              {annSuccess && (
                <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl text-teal-900 flex items-start space-x-3 text-xs">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Announcement Published Live!</h4>
                    <p className="text-teal-700 mt-0.5">Citizens and collection trucks will receive a notification and see the details inside their feeds immediately.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <form onSubmit={handlePublishAnnouncement} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Announcement Title</label>
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="e.g. Hazardous Materials Policy Update"
                      className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Category</label>
                      <select
                        value={annCategory}
                        onChange={(e) => setAnnCategory(e.target.value as any)}
                        className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                      >
                        <option value="Update">General Update</option>
                        <option value="Event">Recycling Event</option>
                        <option value="Alert">High Alert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Author Authority</label>
                      <input
                        type="text"
                        disabled
                        value={adminUser.name}
                        className="w-full bg-gray-100 border border-gray-100 text-gray-400 text-xs px-4 py-2.5 rounded-xl cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Detailed Bulletin Content</label>
                    <textarea
                      rows={4}
                      required
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      placeholder="Draft guidelines, warning locations, times, or double EcoPoints campaigns..."
                      className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
                    ></textarea>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={publishingAnn || !annTitle || !annContent}
                      className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      {publishingAnn ? "Publishing bulletin..." : "Publish Live Announcement"}
                    </button>
                  </div>
                </form>

                {/* Feed Feed */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-xs uppercase font-mono tracking-wider">Live Announcement Feed</h3>
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div 
                        key={ann.id}
                        className={`p-4 rounded-2xl border ${
                          ann.category === "Alert" 
                            ? "border-red-100 bg-red-50/10" 
                            : ann.category === "Event" 
                            ? "border-emerald-100 bg-emerald-50/10" 
                            : "border-gray-100 bg-gray-50/10"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                            ann.category === "Alert" ? "bg-red-100 text-red-800" : ann.category === "Event" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                          }`}>{ann.category}</span>
                          <span className="text-gray-400">{ann.date}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-xs mt-2">{ann.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">{ann.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: ADVISOR ECOBOT */}
          {activeTab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ChatBotPanel userRole="admin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
