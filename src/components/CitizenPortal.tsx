import React, { useState, useRef, useEffect } from "react";
import { User, Report, RecyclingCenter, Notification, Reward, Community, Announcement } from "../types";
import { 
  Home, FileText, Camera, Map, Award, Bell, User as UserIcon, Settings,
  MapPin, Sparkles, AlertTriangle, CheckCircle, RefreshCw, Search,
  Trash2, Plus, Info, Check, Link, ArrowRight, ExternalLink,
  Flame, HelpCircle, Trophy, BookOpen, Volume2, VolumeX, Mail, CheckCircle2, XCircle, Leaf,
  BellRing, Compass, ShieldCheck, Heart, Users, ChevronRight, Send, HelpCircle as QuestionIcon,
  Mic, MicOff, Radio, Languages, Satellite
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import ChatBotPanel from "./ChatBotPanel";
import { uploadFileToStorage, dbService, auth } from "../firebase";
import { GhanaMap } from "./GhanaMap";
import { MonitoringCoverage } from "./MonitoringCoverage";
import { GHANA_CAPITAL, DEFAULT_GHANA_RECYCLING_CENTERS } from "../data/ghanaLocations";
import { GhanaianVoiceReporter } from "./GhanaianVoiceReporter";

interface CitizenPortalProps {
  user: User;
  onUpdateUserPoints: (points: number) => void;
  onUpdateUser?: (updatedUser: User) => void;
  reports: Report[];
  onSubmitReport: (newReport: any) => void;
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string) => void;
  rewards?: Reward[];
  onRedeemReward?: (id: string) => Promise<{ success: boolean; message?: string }>;
  communities?: Community[];
  recyclingCenters?: RecyclingCenter[];
  announcements?: Announcement[];
}

// Environmental Tip Of The Day Database
const ECO_TIPS = [
  "Did you know recycling one aluminum can saves enough energy to run a smart TV for three hours? Always rinse aluminum cans first!",
  "Electronic waste accounts for 70% of toxic heavy metal contamination in municipal landfills. Take old gadgets to specialized e-waste centers.",
  "Leaving plastic bottle caps on is actually preferred by modern sorting machines! Empty, crush, and screw the cap back on.",
  "Composting organic kitchen waste reduces landfill methane gas emissions. Coffee grounds are excellent nitrogen enhancers for household composts.",
  "Washing clothes in cold water saves up to 90% of a washing machine's total electricity consumption while preserving fabrics.",
  "Single-use plastic straws can take up to 200 years to decompose. Opt for reusable stainless-steel or bamboo alternatives!"
];

// Interactive Quiz Hub Database
const ECO_QUIZZES = [
  {
    id: "quiz-1",
    title: "Plastic Sorting Masterclass",
    description: "Learn which plastic resins are highly recyclable versus toxic contaminants.",
    rewardPoints: 20,
    questions: [
      {
        question: "Which plastic resin code is universally accepted in municipal recycling bins?",
        options: ["PETE / PET (Code 1)", "PVC (Code 3)", "PS (Polystyrene - Code 6)", "OTHER (Code 7)"],
        answerIndex: 0,
        explanation: "PETE (Code 1) and HDPE (Code 2) are highly recyclable and converted into new bottles and textiles."
      },
      {
        question: "What is the correct procedure before throwing a plastic container into the recycling bin?",
        options: ["Leave food residue to prevent bottle collapsing", "Wash/rinse clean and empty all liquids", "Shred it into tiny fragments", "Seal the lid tightly with dirty paper inside"],
        answerIndex: 1,
        explanation: "Residual liquids and food scraps contaminate other recyclables like paper, turning entire collections into garbage."
      },
      {
        question: "Are thin plastic grocery bags recyclable in standard curbside blue bins?",
        options: ["Yes, they are plastic", "No, they tangle municipal sorting machinery", "Only if they are green colored", "Yes, they decompose fast"],
        answerIndex: 1,
        explanation: "Film plastics and grocery bags easily wrap around municipal rotary sorting screens, requiring workers to shut down operations to cut them loose."
      }
    ]
  },
  {
    id: "quiz-2",
    title: "E-Waste Safety Protocol",
    description: "Master the safe disposal of toxic lithium batteries, circuit boards, and lead-acid cells.",
    rewardPoints: 20,
    questions: [
      {
        question: "Why should rechargeable lithium-ion batteries NEVER be placed in curbside trash cans?",
        options: ["They are too heavy", "They generate toxic smells immediately", "They can explode or cause severe garbage truck fires under compression", "They dissolve in rain"],
        answerIndex: 2,
        explanation: "Lithium batteries pose critical fire hazards when compressed inside collection compactors, threatening operator safety."
      },
      {
        question: "What toxic heavy metal is heavily concentrated inside old CRT computer monitors?",
        options: ["Aluminum", "Lead", "Carbon Fiber", "Helium"],
        answerIndex: 1,
        explanation: "A single classic CRT monitor contains several pounds of lead, which can leach into groundwater if thrown in regular landfills."
      }
    ]
  },
  {
    id: "quiz-3",
    title: "Composting & Organic Recovery",
    description: "Discover how composting food waste reduces municipal greenhouse gas emissions.",
    rewardPoints: 20,
    questions: [
      {
        question: "Which of these materials is completely compostable in municipal green bins?",
        options: ["Polyester rags", "Coffee grounds and raw vegetable scraps", "Pet wastes and plastic wraps", "Coated glossy magazine papers"],
        answerIndex: 1,
        explanation: "Coffee grounds, filters, tea leaves, and organic vegetable peelings are optimal nitrogen sources that enrich soil."
      }
    ]
  }
];

export default function CitizenPortal({ 
  user, 
  onUpdateUserPoints, 
  onUpdateUser,
  reports, 
  onSubmitReport,
  notifications = [],
  onMarkNotificationRead,
  rewards = [],
  onRedeemReward,
  communities = [],
  recyclingCenters = [],
  announcements = []
}: CitizenPortalProps) {
  // Navigation State (8 Core Tabs)
  const [activeTab, setActiveTab] = useState<"home" | "reports" | "scanner" | "map" | "coverage" | "rewards" | "notifications" | "profile" | "settings">("home");

  // Rotating environmental tip
  const [tipIndex, setTipIndex] = useState(0);

  // Sound effects simulation toggle
  const [settingsSound, setSettingsSound] = useState(true);
  const [settingsPush, setSettingsPush] = useState(true);
  const [settingsEmail, setSettingsEmail] = useState(true);
  const [settingsGPS, setSettingsGPS] = useState(true);
  const [settingsDigest, setSettingsDigest] = useState(true);
  const [customPinLocation, setCustomPinLocation] = useState("Accra, Greater Accra Region, Ghana");

  // Live Simulated Vehicle Positions across Ghana
  const [vehicles, setVehicles] = useState([
    { id: "truck-1", name: "Accra Bio-Fleet Alpha", lat: 5.6288, lng: -0.1082, status: "Active Sweeping" },
    { id: "truck-2", name: "Kumasi Kejetia Collector", lat: 6.6960, lng: -1.6235, status: "Dispatched Route" },
    { id: "truck-3", name: "Takoradi Harbor Recovery", lat: 4.8885, lng: -1.7554, status: "Loading Stations" }
  ]);

  // Quiz game state
  const [quizScores, setQuizScores] = useState<Record<string, boolean>>({}); // quizId: completed
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [quizPointsEarned, setQuizPointsEarned] = useState(0);
  const [quizErrorsCount, setQuizErrorsCount] = useState(0);

  // Map Filter State
  const [mapFilterCategory, setMapFilterCategory] = useState("All");
  const [mapFilterStatus, setMapFilterStatus] = useState("All");
  const [mapHeatmapToggle, setMapHeatmapToggle] = useState(false);
  const [selectedMapPin, setSelectedMapPin] = useState<any | null>(null);

  // Report Submission States
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportCategory, setReportCategory] = useState("Plastic Waste");
  const [reportSeverity, setReportSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [reportLat, setReportLat] = useState<number>(GHANA_CAPITAL.lat);
  const [reportLng, setReportLng] = useState<number>(GHANA_CAPITAL.lng);
  const [reportAddress, setReportAddress] = useState("Accra, Greater Accra Region, Ghana");
  const [reportPhoto, setReportPhoto] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportTime, setReportTime] = useState(new Date().toTimeString().split(" ")[0].slice(0, 5));
  const [dragActive, setDragActive] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);

  // Voice Input States for Hands-Free Reporting
  const [showVoiceReporter, setShowVoiceReporter] = useState(false);
  const [voiceReportData, setVoiceReportData] = useState<{
    originalLanguage?: string;
    originalTranscription?: string;
    englishTranslation?: string;
  } | null>(null);
  const [speakingReportId, setSpeakingReportId] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [activeVoiceTarget, setActiveVoiceTarget] = useState<"description" | "title">("description");
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const toggleVoiceInput = (targetField: "description" | "title" = "description") => {
    setActiveVoiceTarget(targetField);

    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore stop errors
        }
      }
      setIsListening(false);
      toast.success("Voice dictation finished");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech Recognition is not supported in this browser.", {
        description: "Please type your text manually or use Google Chrome/Microsoft Edge."
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      shouldListenRef.current = true;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info(`🎙️ Voice Dictation (${targetField.toUpperCase()}) Active`, {
          description: "Listening... Speak into your microphone."
        });
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          if (targetField === "description") {
            setReportDescription(prev => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
          } else {
            setReportTitle(prev => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
          }
        }
      };

      recognition.onerror = (event: any) => {
        // "no-speech" and "aborted" are harmless operational events in Speech API when pauses occur.
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }

        console.info("Speech recognition notice:", event.error);
        
        if (event.error === "not-allowed") {
          shouldListenRef.current = false;
          setIsListening(false);
          toast.error("Microphone Access Denied", {
            description: "Please allow microphone permissions in browser settings."
          });
        } else if (event.error === "audio-capture") {
          shouldListenRef.current = false;
          setIsListening(false);
          toast.error("Microphone Error", {
            description: "No microphone detected or audio capture failed."
          });
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch (err) {
            shouldListenRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      shouldListenRef.current = false;
      setIsListening(false);
      toast.error("Microphone Error", { description: "Failed to start speech recognition." });
    }
  };

  // AI Scanner States
  const [scannerPhoto, setScannerPhoto] = useState<string | null>(null);
  const [scanningImage, setScanningImage] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScannerDragActive, setIsScannerDragActive] = useState(false);

  // Recycling Finder States
  const [finderLocation, setFinderLocation] = useState("Accra, Ghana");
  const [recyclingCentersList, setRecyclingCentersList] = useState<RecyclingCenter[]>([]);
  const [searchingCenters, setSearchingCenters] = useState(false);
  const [groundingText, setGroundingText] = useState("");
  const [mapsLinks, setMapsLinks] = useState<any[]>([]);

  // Password reset visual state
  const [passwordResetTriggered, setPasswordResetTriggered] = useState(false);
  const [redemptionStatus, setRedemptionStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Firebase Storage Avatar & File Uploading states and refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUpdateUser) {
      setIsUploadingAvatar(true);
      try {
        const file = e.target.files[0];
        const uploadedUrl = await uploadFileToStorage(file, "profile_photos");
        const avatarUrlVal = uploadedUrl || "";

        await dbService.updateDocument("users", user.id, { avatarUrl: avatarUrlVal });

        const res = await fetch(`/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: avatarUrlVal })
        });
        const data = await res.json();
        if (data.success && data.user) {
          onUpdateUser(data.user);
        }
      } catch (err) {
        console.error("Failed uploading avatar to Firebase Storage", err);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleRedeem = async (rewardId: string) => {
    if (onRedeemReward) {
      const res = await onRedeemReward(rewardId);
      if (res.success) {
        setRedemptionStatus({ success: true, message: "Voucher redeemed successfully! Your EcoPoints balance has been updated and a notification has been sent." });
      } else {
        setRedemptionStatus({ success: false, message: res.message || "Failed to redeem reward." });
      }
      setTimeout(() => setRedemptionStatus(null), 6000);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Citizens' own reports list
  const citizenReports = reports.filter(r => r.reporterEmail.toLowerCase() === user.email.toLowerCase());

  // Community Cleanliness Score Calculator
  // Formula: (completed reports / total reports) * 100, or default to a healthy 84% based on active collections
  const communityScore = reports.length > 0 
    ? Math.min(100, Math.round(80 + (reports.filter(r => r.status === "Completed").length / reports.length) * 20))
    : 84;

  // Tip of the Day rotations
  const rotateTip = () => {
    setTipIndex((prev) => (prev + 1) % ECO_TIPS.length);
  };

  // Simulate vehicle slow movements for interactive map experience
  useEffect(() => {
    const timer = setInterval(() => {
      setVehicles(prev => prev.map(truck => {
        // slight jitter in coordinates to represent active moving
        const latJitter = (Math.random() - 0.5) * 0.003;
        const lngJitter = (Math.random() - 0.5) * 0.003;
        return {
          ...truck,
          lat: Number((truck.lat + latJitter).toFixed(4)),
          lng: Number((truck.lng + lngJitter).toFixed(4))
        };
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Handle Drag & Drop events for Report
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsUploadingPhoto(true);
    try {
      const url = await uploadFileToStorage(file, "waste_images");
      setReportPhoto(url);
    } catch (err) {
      console.error("Failed uploading waste image to Firebase Storage", err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle Drag & Drop events for AI Scanner
  const handleScannerDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsScannerDragActive(true);
    } else if (e.type === "dragleave") {
      setIsScannerDragActive(false);
    }
  };

  const handleScannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScannerDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processScannerFile(e.dataTransfer.files[0]);
    }
  };

  const handleScannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processScannerFile(e.target.files[0]);
    }
  };

  const processScannerFile = async (file: File) => {
    setIsUploadingPhoto(true);
    setScanError(null);
    setScanResult(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setScannerPhoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Backup upload to Firebase Storage
      uploadFileToStorage(file, "waste_images").catch((err) =>
        console.warn("Firebase Storage backup upload notice:", err)
      );
    } catch (err: any) {
      console.error("Failed uploading scanner image", err);
      setScanError("Failed reading local image file.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Trigger real backend AI Image Analysis
  const runAiScanner = async () => {
    if (!scannerPhoto) return;
    setScanningImage(true);
    setScanError(null);
    setScanResult(null);
    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: scannerPhoto,
          mimeType: "image/jpeg"
        })
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        setScanError(data.error || data.message || "Failed to analyze image with Gemini API.");
      } else {
        setScanResult(data);
      }
    } catch (error: any) {
      console.error("AI Scan Error:", error);
      setScanError(error.message || "Network error while connecting to Gemini API.");
    } finally {
      setScanningImage(false);
    }
  };

  // Convert scanned AI details into live incident reports instantly
  const handleConvertScanToReport = () => {
    if (!scanResult) return;
    setReportTitle(`AI Scanned ${scanResult.category}`);
    setReportCategory(scanResult.category || "Plastic Waste");
    setReportSeverity(scanResult.severity || "Medium");
    setReportDescription(`Identified via EcoVision AI: ${scanResult.explanation}\n\nAction Plan: ${scanResult.actionPlan}`);
    setReportPhoto(scannerPhoto);
    setReportAddress(customPinLocation);
    setActiveTab("reports");
  };

  // Submit Incident Report Form
  const handleSubmitReportForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle || !reportAddress) return;
    setSubmittingReport(true);

    try {
      let ecoPointsAwarded = 20;
      if (reportSeverity === "Medium") ecoPointsAwarded = 35;
      if (reportSeverity === "High") ecoPointsAwarded = 50;

      const newReportData = {
        title: reportTitle,
        description: reportDescription || `Manual public report regarding ${reportCategory}.`,
        category: reportCategory,
        severity: reportSeverity,
        status: "Pending",
        location: {
          lat: reportLat || GHANA_CAPITAL.lat,
          lng: reportLng || GHANA_CAPITAL.lng,
          address: reportAddress || "Accra, Ghana"
        },
        reporterId: auth?.currentUser?.uid || user.id,
        reporterName: user.name,
        reporterEmail: user.email,
        ecoPointsAwarded,
        dateSubmitted: new Date().toISOString(),
        imageUrl: reportPhoto || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600",
        ...(voiceReportData ? {
          originalLanguage: voiceReportData.originalLanguage,
          originalTranscription: voiceReportData.originalTranscription,
          englishTranslation: voiceReportData.englishTranslation,
          isVoiceReport: true
        } : {})
      };

      const addedReport = await dbService.addDocument("reports", newReportData);
      const reportObj = addedReport || { ...newReportData, id: `r-${Date.now()}` };

      onSubmitReport(reportObj);
      onUpdateUserPoints(user.ecoPoints + ecoPointsAwarded);

      setSuccessReportId(reportObj.id);
      setReportTitle("");
      setReportDescription("");
      setReportAddress("");
      setReportPhoto(null);
      setVoiceReportData(null);
      setShowVoiceReporter(false);

      setTimeout(() => setSuccessReportId(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReport(false);
    }
  };

  // Text-To-Speech for accessibility ("🔊 Listen to Report")
  const handleSpeakReport = (reportText: string, reportId: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (speakingReportId === reportId) {
      window.speechSynthesis.cancel();
      setSpeakingReportId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reportText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingReportId(reportId);
    utterance.onend = () => setSpeakingReportId(null);
    utterance.onerror = () => setSpeakingReportId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Search Recycling Centers (with Maps grounding)
  const searchRecyclingHubs = async () => {
    setSearchingCenters(true);
    setGroundingText("");
    setMapsLinks([]);
    try {
      const response = await fetch("/api/recycling-centers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: finderLocation,
          latitude: GHANA_CAPITAL.lat,
          longitude: GHANA_CAPITAL.lng
        })
      });
      const data = await response.json();
      setRecyclingCentersList(data.centers || []);
      setGroundingText(data.text || "");
      setMapsLinks(data.groundingLinks || []);
    } catch (error) {
      console.error("Finder Error:", error);
    } finally {
      setSearchingCenters(false);
    }
  };

  // Run initial lookup
  useEffect(() => {
    searchRecyclingHubs();
  }, []);

  // Gamified Eco Quizzes Actions
  const startQuiz = (quizId: string) => {
    setActiveQuizId(quizId);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswerRevealed(false);
    setQuizErrorsCount(0);
  };

  const handleSelectQuizOption = (idx: number) => {
    if (isAnswerRevealed) return;
    setSelectedOptionIndex(idx);
  };

  const handleConfirmQuizAnswer = () => {
    if (selectedOptionIndex === null || isAnswerRevealed) return;
    setIsAnswerRevealed(true);
    
    const currentQuiz = ECO_QUIZZES.find(q => q.id === activeQuizId);
    if (currentQuiz) {
      const isCorrect = selectedOptionIndex === currentQuiz.questions[currentQuestionIndex].answerIndex;
      if (!isCorrect) {
        setQuizErrorsCount(prev => prev + 1);
      }
    }
  };

  const handleNextQuizQuestion = () => {
    const currentQuiz = ECO_QUIZZES.find(q => q.id === activeQuizId);
    if (!currentQuiz) return;

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswerRevealed(false);
    } else {
      // Quiz complete!
      const finalPointsReward = quizErrorsCount === 0 ? currentQuiz.rewardPoints : Math.max(5, currentQuiz.rewardPoints - 10);
      
      // Update points state
      onUpdateUserPoints(user.ecoPoints + finalPointsReward);
      
      // Save local complete state
      setQuizScores(prev => ({ ...prev, [currentQuiz.id]: true }));
      setQuizPointsEarned(finalPointsReward);
      setActiveQuizId(null);
    }
  };

  // Rank name derivation based on points
  const currentRankName = user.ecoPoints >= 300 
    ? "Gold EcoGuardian 🌟" 
    : user.ecoPoints >= 100 
      ? "Silver Preserver 🌱" 
      : "Green Novice 🍂";

  const nextRankPointsRemaining = user.ecoPoints >= 300 
    ? 0 
    : user.ecoPoints >= 100 
      ? 300 - user.ecoPoints 
      : 100 - user.ecoPoints;

  // Render Left Navigation Item (Desktop)
  const renderDrawerButton = (tabName: typeof activeTab, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => {
          setActiveTab(tabName);
          setSelectedMapPin(null);
        }}
        className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all relative ${
          isActive 
            ? "bg-emerald-600 text-white shadow-md shadow-emerald-700/10" 
            : "text-gray-600 hover:text-emerald-900 hover:bg-emerald-50/50"
        }`}
      >
        <span className={`${isActive ? "text-white" : "text-gray-400"}`}>{icon}</span>
        <span>{label}</span>
        {isActive && (
          <motion.div 
            layoutId="activeIndicator" 
            className="absolute left-0 w-1.5 h-6 bg-amber-400 rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 300 }}
          />
        )}
      </button>
    );
  };

  // Unified Mobile Bottom Nav Buttons
  const renderBottomNavButton = (tabName: typeof activeTab, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => {
          setActiveTab(tabName);
          setSelectedMapPin(null);
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1 px-2 focus:outline-none transition-colors ${
          isActive ? "text-emerald-700" : "text-gray-400"
        }`}
      >
        <div className={`p-1.5 rounded-full ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-transparent text-gray-400"}`}>
          {icon}
        </div>
        <span className="text-[10px] font-medium tracking-tight mt-0.5">{label}</span>
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Outer Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================================
            DESKTOP LEFT DRAWER (lg:col-span-3)
            ========================================================================= */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col space-y-6">
          {/* EcoCitizen Profile Summary Card */}
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-6 shadow-lg border border-emerald-700/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-emerald-700/20">
              <Trophy className="w-28 h-28" />
            </div>

            <div className="flex items-center space-x-2 bg-emerald-700/40 border border-emerald-600/30 w-max px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest font-mono text-emerald-200">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" /> Level 4 Guard
            </div>

            <h3 className="mt-4 text-xl font-bold tracking-tight">{user.name}</h3>
            <p className="text-emerald-200 text-xs font-mono">{user.email}</p>

            {/* Points & Circular Progress Progress widget */}
            <div className="mt-6 flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center relative shadow-inner">
                <Award className="w-4 h-4 text-amber-300 absolute -top-1 -right-1" />
                <span className="text-2xl font-black font-mono tracking-tighter leading-none text-amber-300">
                  {user.ecoPoints}
                </span>
                <span className="text-[8px] font-mono text-emerald-100 uppercase font-bold mt-1">Points</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-100 font-medium">Rank Status</p>
                <h4 className="text-sm font-black text-amber-300 truncate">{currentRankName}</h4>
                {nextRankPointsRemaining > 0 ? (
                  <p className="text-[9px] text-emerald-200 font-mono mt-0.5">{nextRankPointsRemaining} pts to upgrade</p>
                ) : (
                  <p className="text-[9px] text-amber-300 font-mono mt-0.5">Maximum Rank Unlocked!</p>
                )}
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-emerald-950 h-1.5 rounded-full overflow-hidden border border-emerald-900">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full"
                  style={{ width: `${Math.min(100, (user.ecoPoints / 300) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Core Left Drawer Navigation Links */}
          <nav className="bg-white rounded-3xl border border-gray-100 p-2.5 shadow-sm space-y-1">
            {renderDrawerButton("home", "Home Portal", <Home className="w-4 h-4" />)}
            {renderDrawerButton("reports", "Incident Logs", <FileText className="w-4 h-4" />)}
            {renderDrawerButton("scanner", "AI Waste Scanner", <Camera className="w-4 h-4" />)}
            {renderDrawerButton("map", "Interactive EcoMap", <Map className="w-4 h-4" />)}
            {renderDrawerButton("coverage", "Monitoring Coverage", <Satellite className="w-4 h-4" />)}
            {renderDrawerButton("rewards", "EcoRewards & Quiz", <Award className="w-4 h-4" />)}
            {renderDrawerButton("notifications", "Bulletins & Alerts", <Bell className="w-4 h-4" />)}
            {renderDrawerButton("profile", "User Profile", <UserIcon className="w-4 h-4" />)}
            {renderDrawerButton("settings", "Settings", <Settings className="w-4 h-4" />)}
          </nav>
        </aside>

        {/* =========================================================================
            MAIN STAGE AREA (lg:col-span-9)
            ========================================================================= */}
        <main className="lg:col-span-9 min-h-[500px]">
          <AnimatePresence mode="wait">

            {/* ---------------------------------------------------------------------
                TAB 1: HOME PORTAL
                --------------------------------------------------------------------- */}
            {activeTab === "home" && (
              <motion.div
                key="home-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Visual Welcome Banner & Tip of the day */}
                <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-sm border border-emerald-600/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="space-y-2 max-w-xl">
                    <h2 className="text-2xl font-black tracking-tight font-sans">
                      Welcome, Eco Guardian {user.name.split(" ")[0]}! 🌿
                    </h2>
                    <p className="text-emerald-100 text-xs leading-relaxed">
                      Your environmental vigilance keeps our neighborhoods safe and beautiful. You are currently helping Ghana recover recyclables and report illegal dump spots.
                    </p>
                    
                    {/* Environmental Tip box */}
                    <div className="bg-emerald-950/40 border border-emerald-600/30 p-3.5 rounded-2xl flex items-start space-x-3 text-xs mt-3">
                      <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1">
                        <p className="font-bold text-amber-300 uppercase tracking-wider text-[10px] font-mono">Eco Tip of the Day</p>
                        <p className="text-gray-100 mt-1 leading-relaxed font-sans">{ECO_TIPS[tipIndex]}</p>
                        <button 
                          onClick={rotateTip}
                          className="text-[10px] text-emerald-200 hover:text-white font-bold tracking-wider uppercase mt-1 inline-flex items-center space-x-1 font-mono transition-all"
                        >
                          <span>Next tip</span> <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cleanliness score circle indicator */}
                  <div className="bg-white/10 border border-white/15 p-5 rounded-2xl text-center w-full md:w-max flex flex-row md:flex-col items-center justify-center gap-4 shadow-inner">
                    <div className="w-20 h-20 rounded-full border-4 border-amber-300 border-t-emerald-400 flex flex-col items-center justify-center relative shadow-md">
                      <span className="text-2xl font-black font-mono tracking-tighter text-amber-300 leading-none">{communityScore}%</span>
                      <span className="text-[7px] font-mono text-emerald-200 mt-0.5 uppercase tracking-widest font-bold">Clean</span>
                    </div>
                    <div className="text-left md:text-center">
                      <p className="text-xs text-emerald-200 font-semibold">City Cleanliness Score</p>
                      <p className="text-[10px] text-emerald-100 font-mono mt-0.5">District Area SF-BA</p>
                    </div>
                  </div>
                </div>

                {/* Quick actions panel */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Quick Environmental Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab("reports")}
                      className="p-4 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 rounded-2xl text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                    >
                      <Plus className="w-6 h-6 text-emerald-700 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-emerald-950">File Dump Report</span>
                      <span className="text-[9px] text-emerald-600 font-mono">+Earn Points</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("scanner")}
                      className="p-4 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 rounded-2xl text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                    >
                      <Camera className="w-6 h-6 text-blue-700 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-blue-950">Scan waste with AI</span>
                      <span className="text-[9px] text-blue-600 font-mono">Vision analysis</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("map")}
                      className="p-4 bg-amber-50/50 hover:bg-amber-50 border border-amber-100/50 rounded-2xl text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                    >
                      <Map className="w-6 h-6 text-amber-700 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-amber-950">Locate Recycling</span>
                      <span className="text-[9px] text-amber-600 font-mono">Interactive Map</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("rewards")}
                      className="p-4 bg-purple-50/50 hover:bg-purple-50 border border-purple-100/50 rounded-2xl text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                    >
                      <Trophy className="w-6 h-6 text-purple-700 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-purple-950">Take eco-quiz</span>
                      <span className="text-[9px] text-purple-600 font-mono">Unlock rewards</span>
                    </button>
                  </div>
                </div>

                {/* Bottom half: Recent Reports & Active recycling center */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent reports bento box */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-sm">Recent Neighborhood Incidents</h3>
                        <button onClick={() => setActiveTab("reports")} className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center space-x-1">
                          <span>View all</span> <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {reports.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">No environmental reports have been filed recently.</p>
                      ) : (
                        <div className="space-y-3">
                          {reports.slice(0, 3).map((rep) => (
                            <div key={rep.id} className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl border border-gray-100/50 text-xs">
                              {rep.imageUrl && (
                                <img src={rep.imageUrl} alt="Incident" className="w-12 h-12 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-950 truncate">{rep.title}</p>
                                <p className="text-gray-500 text-[10px] truncate">{rep.location.address}</p>
                                <div className="flex items-center space-x-1.5 mt-1 font-mono text-[9px]">
                                  <span className={`px-1.5 py-0.5 rounded ${
                                    rep.status === "Completed" ? "bg-teal-100 text-teal-800" : rep.status === "Assigned" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                                  }`}>{rep.status}</span>
                                  <span className="text-gray-400">{new Date(rep.dateSubmitted).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Recycling hub & Announcements snippet */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-3">Nearby Collection Partner</h3>
                      {recyclingCentersList.length > 0 ? (
                        <div className="bg-emerald-50/30 border border-emerald-100/30 p-4 rounded-2xl space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900 text-xs">{recyclingCentersList[0].name}</h4>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded">Verified Hub</span>
                          </div>
                          <p className="text-[11px] text-gray-600 flex items-start">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{recyclingCentersList[0].address}</span>
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {recyclingCentersList[0].types.slice(0, 3).map((type, idx) => (
                              <span key={idx} className="bg-white border border-gray-100 text-gray-500 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Loading collection partners...</p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Have difficult bulk scrap?</span>
                      <button
                        onClick={() => setActiveTab("map")}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center space-x-1"
                      >
                        <span>Search Centers Directory</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floating mini helper assistant button */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="bg-emerald-600 p-2.5 rounded-2xl text-emerald-100">
                      <Sparkles className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Ask EcoBot Assistant Anything</h4>
                      <p className="text-xs text-slate-400">Not sure if an old appliance is compostable? Ask EcoBot!</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      // We can swap active tab to the rewards quiz or keep chatbot easily accessible
                      setActiveTab("rewards");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4.5 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Launch AI Chat Advisor
                  </button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 2: INCIDENT REPORT SUBMISSIONS & HISTORY
                --------------------------------------------------------------------- */}
            {activeTab === "reports" && (
              <motion.div
                key="reports-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Form to submit report */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">File Environmental Incident Report</h2>
                      <p className="text-xs text-gray-500">Provide photos, descriptions, and address of environmental contamination hazards</p>
                    </div>
                    <div className="bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" /> Earn up to 50 Pts
                    </div>
                  </div>

                  {/* Ghanaian Language Voice Reporting Mode Banner */}
                  <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-700/60 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300">
                        <Languages className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-white">Voice Environmental Reporting</h4>
                          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            🇬🇭 10 Ghanaian Languages
                          </span>
                        </div>
                        <p className="text-xs text-emerald-100/80 mt-0.5">
                          Report hands-free by speaking in <strong>Twi, Fante, Ga, Ewe, Dagbani, Hausa, Nzema, Dagaare, Gonja, or English</strong>. AI transcribes and structures your report automatically.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowVoiceReporter(!showVoiceReporter)}
                      className="whitespace-nowrap px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-2 self-start sm:self-auto"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{showVoiceReporter ? "Hide Voice Tool" : "Report by Voice (Ghanaian)"}</span>
                    </button>
                  </div>

                  {/* Ghanaian Voice Reporter Component */}
                  {showVoiceReporter && (
                    <div className="mb-6">
                      <GhanaianVoiceReporter
                        onApplyReportData={(data) => {
                          setReportTitle(data.title);
                          setReportDescription(data.description);
                          setReportCategory(data.category);
                          setReportSeverity(data.severity);
                          if (data.locationText) {
                            setReportAddress(data.locationText);
                          }
                          setVoiceReportData({
                            originalLanguage: data.originalLanguage,
                            originalTranscription: data.originalTranscription,
                            englishTranslation: data.englishTranslation
                          });
                        }}
                        onCancel={() => setShowVoiceReporter(false)}
                      />
                    </div>
                  )}

                  {/* Voice Data Confirmation Banner if populating from voice */}
                  {voiceReportData && (
                    <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-teal-600 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
                            🗣️ Voice Report ({voiceReportData.originalLanguage})
                          </span>
                          <span className="text-xs text-teal-800 font-semibold">Form populated from spoken report. You may edit any field before submitting.</span>
                        </div>
                        {voiceReportData.originalTranscription && (
                          <p className="text-xs text-teal-900 italic">
                            Original Speech: "{voiceReportData.originalTranscription}"
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSpeakReport(
                          `Report Title: ${reportTitle}. Category: ${reportCategory}. Description: ${reportDescription}. Location: ${reportAddress}`,
                          "draft-voice-report"
                        )}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 whitespace-nowrap self-start sm:self-auto ${
                          speakingReportId === "draft-voice-report"
                            ? "bg-amber-500 text-slate-950 border-amber-400 animate-pulse"
                            : "bg-teal-600 hover:bg-teal-700 text-white border-teal-700"
                        }`}
                      >
                        {speakingReportId === "draft-voice-report" ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Listening</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>🔊 Listen to Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {successReportId && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 bg-teal-50 border border-teal-200 rounded-2xl p-4 text-teal-900 flex items-start space-x-3"
                    >
                      <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold">Report Filed Successfully!</h4>
                        <p className="text-xs text-teal-700 mt-0.5">
                          Eco Incident logged as ID: <strong>{successReportId}</strong>. Thank you for your support. Your EcoPoints have been instantly credited to your profile.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmitReportForm} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left side details */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-gray-700 uppercase font-mono">Report Title</label>
                            <button
                              type="button"
                              onClick={() => toggleVoiceInput("title")}
                              className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                                isListening && activeVoiceTarget === "title"
                                  ? "bg-red-500 text-white shadow-sm animate-pulse"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60"
                              }`}
                              title="Voice-to-Text Title Dictation"
                            >
                              {isListening && activeVoiceTarget === "title" ? (
                                <>
                                  <MicOff className="w-3 h-3 animate-bounce" />
                                  <span>Stop Mic</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3 h-3 text-emerald-700" />
                                  <span>Dictate</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={reportTitle}
                              onChange={(e) => setReportTitle(e.target.value)}
                              placeholder="e.g. Overflowing plastic heap on Spintex Road"
                              className={`w-full bg-gray-50 border text-gray-950 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all ${
                                isListening && activeVoiceTarget === "title" ? "border-red-400 ring-2 ring-red-100 bg-red-50/20" : "border-gray-100"
                              }`}
                            />
                            {isListening && activeVoiceTarget === "title" && (
                              <div className="absolute right-3 top-2.5 flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold animate-pulse">
                                <Radio className="w-3 h-3 text-red-600 animate-spin" />
                                <span>LISTENING...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-700 uppercase font-mono flex items-center justify-between">
                            <span>Exact Location / Address (Ghana)</span>
                            <span className="text-[10px] text-emerald-600 font-normal">Interactive GPS & Map Picker</span>
                          </label>

                          <div className="relative">
                            <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-emerald-600" />
                            <input
                              type="text"
                              required
                              value={reportAddress}
                              onChange={(e) => setReportAddress(e.target.value)}
                              placeholder="e.g. Spintex Road, Accra or Kejetia Market, Kumasi"
                              className="w-full bg-gray-50 border border-gray-200 text-gray-950 text-sm pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                            />
                          </div>

                          {/* Embedded Ghana Map for location selection */}
                          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-slate-50 p-1 mt-2">
                            <GhanaMap
                              selectedLocation={{ lat: reportLat, lng: reportLng, address: reportAddress }}
                              onSelectLocation={(loc) => {
                                setReportLat(loc.lat);
                                setReportLng(loc.lng);
                                setReportAddress(loc.address);
                              }}
                              interactivePickerMode={true}
                              heightClass="h-[280px]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Category</label>
                            <select
                              value={reportCategory}
                              onChange={(e) => setReportCategory(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-100 text-gray-950 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                            >
                              <option value="Illegal Dumping">Illegal Dumping</option>
                              <option value="Overflowing Bin">Overflowing Bin</option>
                              <option value="Blocked Drain">Blocked Drain</option>
                              <option value="Littering">Littering</option>
                              <option value="Dead Animal">Dead Animal</option>
                              <option value="Construction Waste">Construction Waste</option>
                              <option value="Hazardous Waste">Hazardous Waste</option>
                              <option value="Flood Risk">Flood Risk</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Priority / Severity</label>
                            <select
                              value={reportSeverity}
                              onChange={(e) => setReportSeverity(e.target.value as any)}
                              className="w-full bg-gray-50 border border-gray-100 text-gray-950 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                            >
                              <option value="Low">Low Priority (20 Pts)</option>
                              <option value="Medium">Medium Priority (35 Pts)</option>
                              <option value="High">High Priority (50 Pts)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Date Spotted</label>
                            <input
                              type="date"
                              required
                              value={reportDate}
                              onChange={(e) => setReportDate(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-100 text-gray-950 text-sm px-4 py-2 rounded-xl"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">Time Spotted</label>
                            <input
                              type="time"
                              required
                              value={reportTime}
                              onChange={(e) => setReportTime(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-100 text-gray-950 text-sm px-4 py-2 rounded-xl"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-gray-700 uppercase font-mono">Incident Description</label>
                            <button
                              type="button"
                              onClick={() => toggleVoiceInput("description")}
                              className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                isListening && activeVoiceTarget === "description"
                                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                              title="Voice-to-Text Description Dictation"
                            >
                              {isListening && activeVoiceTarget === "description" ? (
                                <>
                                  <MicOff className="w-3.5 h-3.5 animate-bounce" />
                                  <span>Stop Mic</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3.5 h-3.5" />
                                  <span>Voice-to-Text</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="relative">
                            <textarea
                              rows={3}
                              value={reportDescription}
                              onChange={(e) => setReportDescription(e.target.value)}
                              placeholder="Describe the waste hazard hands-free or type here (e.g. Chemical smell near drainage ditch)..."
                              className={`w-full bg-gray-50 border text-gray-950 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all ${
                                isListening && activeVoiceTarget === "description"
                                  ? "border-red-400 ring-2 ring-red-100 bg-red-50/20"
                                  : "border-gray-100"
                              }`}
                            />

                            {isListening && activeVoiceTarget === "description" && (
                              <div className="absolute top-2.5 right-3 flex items-center space-x-1.5 bg-red-100 text-red-800 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold animate-pulse">
                                <Radio className="w-3 h-3 text-red-600 animate-spin" />
                                <span>LISTENING TO VOICE...</span>
                              </div>
                            )}
                          </div>

                          {isListening && activeVoiceTarget === "description" && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 p-2.5 bg-red-50/90 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-900 shadow-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                                <span className="font-semibold">Hands-free active: Speak clearly into your microphone...</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleVoiceInput("description")}
                                className="text-xs font-bold underline text-red-700 hover:text-red-900 ml-2"
                              >
                                Done
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Right side Photo attachment */}
                      <div className="space-y-4">
                        <label className="block text-xs font-semibold text-gray-700 uppercase font-mono">Incident Photo Attachment</label>
                        
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                          className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col justify-center min-h-[220px] ${
                            dragActive ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 bg-gray-50/40 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingPhoto}
                          />

                          {isUploadingPhoto ? (
                            <div className="py-6 space-y-3 flex flex-col items-center justify-center">
                              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                              <p className="text-sm font-bold text-gray-700 animate-pulse">Uploading file to Storage...</p>
                              <p className="text-xs text-gray-400">Securing environmental assets on Firebase</p>
                            </div>
                          ) : reportPhoto ? (
                            <div className="space-y-3">
                              <img 
                                src={reportPhoto} 
                                alt="Report Attachment" 
                                className="max-h-44 mx-auto rounded-2xl shadow-sm border border-gray-150 object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <p className="text-xs text-gray-400">Click or drop new photo to replace</p>
                            </div>
                          ) : (
                            <div className="py-6 space-y-2">
                              <Camera className="w-12 h-12 mx-auto text-gray-400 stroke-1" />
                              <p className="text-sm font-bold text-gray-700">Drag & Drop incident image here</p>
                              <p className="text-xs text-gray-400">or click to browse local folders</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl flex items-start space-x-3 text-xs text-emerald-950">
                          <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            <strong>Hint:</strong> If you are unsure of the category or sorting details, consider using our <span className="font-bold underline text-emerald-900 cursor-pointer" onClick={() => setActiveTab("scanner")}>AI Waste Scanner</span> first to automatically evaluate the photograph!
                          </p>
                        </div>
                      </div>

                    </div>

                    <div className="border-t border-gray-150 pt-4 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab("home")}
                        className="px-5 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReport || !reportTitle || !reportAddress}
                        className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/10"
                      >
                        {submittingReport ? "Registering Incident..." : "Submit Incident & Earn Points"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Report history logs */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span>My Environmental Report History</span>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      {citizenReports.length} Submissions Total
                    </span>
                  </h3>

                  {citizenReports.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <HelpCircle className="w-12 h-12 mx-auto stroke-1 mb-3 text-emerald-200" />
                      <p className="text-sm">You have not submitted any environmental reports yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {citizenReports.map((rep) => (
                        <div key={rep.id} className="border border-gray-150 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition-all space-y-3 bg-slate-50/50">
                          <div className="flex space-x-3">
                            {rep.imageUrl && (
                              <img src={rep.imageUrl} alt={rep.title} className="w-20 h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0" referrerPolicy="no-referrer" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span>ID: {rep.id}</span>
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                                  rep.status === "Completed" 
                                    ? "bg-teal-100 text-teal-800 border border-teal-200" 
                                    : rep.status === "Assigned" 
                                      ? "bg-blue-100 text-blue-800 border border-blue-200" 
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}>{rep.status}</span>
                              </div>
                              <h4 className="font-bold text-gray-900 text-sm mt-1 truncate">{rep.title}</h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{rep.description}</p>
                            </div>
                          </div>

                          <div className="border-t border-gray-150/50 pt-2 flex items-center justify-between text-[11px] text-gray-400">
                            <div className="flex items-center space-x-1.5">
                              <span className="bg-white border border-gray-150/40 px-2 py-0.5 rounded text-gray-600 font-semibold">{rep.category}</span>
                              {rep.originalLanguage && (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1">
                                  <Mic className="w-2.5 h-2.5" /> {rep.originalLanguage}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleSpeakReport(
                                  `Incident Report: ${rep.title}. Category: ${rep.category}. Description: ${rep.description}. Location: ${rep.location?.address}`,
                                  rep.id
                                )}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                                  speakingReportId === rep.id
                                    ? "bg-amber-500 text-slate-950 border-amber-400 animate-pulse"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                }`}
                                title="Listen to report text spoken aloud"
                              >
                                {speakingReportId === rep.id ? (
                                  <>
                                    <VolumeX className="w-3 h-3" />
                                    <span>Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3 h-3 text-emerald-600" />
                                    <span>🔊 Listen</span>
                                  </>
                                )}
                              </button>

                              <span className="flex items-center text-amber-600 font-bold font-mono">
                                <Award className="w-3.5 h-3.5 mr-0.5" />
                                +{rep.ecoPointsAwarded} Pts
                              </span>
                            </div>
                          </div>

                          {/* Completion Box info */}
                          {rep.status === "Completed" && (
                            <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-teal-900">
                              <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">Cleared by {rep.assignedCompanyName}</p>
                                <p className="text-gray-600 italic">"{rep.completionNotes}"</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 3: AI SCANNER (ECOVISION ANALYZER)
                --------------------------------------------------------------------- */}
            {activeTab === "scanner" && (
              <motion.div
                key="scanner-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6"
              >
                <div className="border-b border-gray-100 pb-4">
                  <span className="text-[10px] font-bold font-mono bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase tracking-widest flex items-center w-max gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Gemini Vision System
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 mt-2">EcoVision Waste Snapper</h2>
                  <p className="text-xs text-gray-500">Upload any trash snapshot and let Gemini predict categories, provide safety instructions, and allocate EcoPoints</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Photo Drag drop */}
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-gray-700 uppercase font-mono">Scanner Camera Attachment</label>
                    <div
                      onDragEnter={handleScannerDrag}
                      onDragOver={handleScannerDrag}
                      onDragLeave={handleScannerDrag}
                      onDrop={handleScannerDrop}
                      onClick={() => scannerInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col justify-center min-h-[250px] ${
                        isScannerDragActive ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-gray-50/40 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="file"
                        ref={scannerInputRef}
                        onChange={handleScannerFileChange}
                        accept="image/*"
                        className="hidden"
                      />

                      {scannerPhoto ? (
                        <div className="space-y-3">
                          <img 
                            src={scannerPhoto} 
                            alt="Scanner Attachment" 
                            className="max-h-56 mx-auto rounded-2xl shadow-md border border-gray-150 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <p className="text-xs text-gray-400">Click or drag new photo to replace</p>
                        </div>
                      ) : (
                        <div className="py-8 space-y-2">
                          <Camera className="w-14 h-14 mx-auto text-blue-400 stroke-1 animate-pulse" />
                          <p className="text-sm font-bold text-gray-700">Drop trash snapshot here</p>
                          <p className="text-xs text-gray-400">or click to browse local camera roll</p>
                        </div>
                      )}
                    </div>

                    {scannerPhoto && (
                      <button
                        onClick={runAiScanner}
                        disabled={scanningImage}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-900/10 disabled:opacity-50"
                      >
                        {scanningImage ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Gemini Vision reasoning...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Scan Snapshot with Gemini AI</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* AI Results */}
                  <div className="bg-slate-50 border border-gray-150 rounded-3xl p-6 flex flex-col justify-between min-h-[320px]">
                    {scanningImage ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="relative">
                          <div className="w-14 h-14 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          <Sparkles className="w-5 h-5 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-800 text-sm">Analyzing Image with Gemini AI...</h4>
                          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                            Evaluating waste category, confidence score, recyclability, safety hazards, and disposal guidelines.
                          </p>
                        </div>
                      </div>
                    ) : scanError ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-3 text-center">
                        <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                          <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-rose-900 text-sm">Scan Analysis Error</h4>
                          <p className="text-xs text-rose-700 max-w-xs">{scanError}</p>
                        </div>
                        <button
                          onClick={runAiScanner}
                          className="mt-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl transition-all shadow"
                        >
                          Retry Scan
                        </button>
                      </div>
                    ) : scanResult ? (
                      <div className="space-y-4">
                        {/* Status Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                          <span className="text-xs font-bold font-mono text-emerald-800 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> Analysis Complete
                          </span>
                          <div className="flex items-center gap-2">
                            {scanResult.confidence && (
                              <span className="text-[11px] font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg">
                                Confidence: {scanResult.confidence}
                              </span>
                            )}
                            <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg">
                              +{scanResult.ecoPoints || 30} Pts
                            </span>
                          </div>
                        </div>

                        {/* Category & Recyclability */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Identified Waste Category</span>
                            <h4 className="text-base font-black text-slate-900">{scanResult.category}</h4>
                            <span className="text-xs text-gray-500 font-medium">{scanResult.severity} Severity Level</span>
                          </div>
                          <div>
                            {scanResult.isRecyclable ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recyclable
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-rose-600" /> Non-Recyclable
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Recommended Disposal Method */}
                        <div className="bg-white border border-gray-200/80 p-3.5 rounded-2xl space-y-1">
                          <span className="text-[10px] uppercase font-mono text-blue-800 font-bold flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5 text-blue-600" /> Recommended Disposal Method
                          </span>
                          <p className="text-xs text-gray-700 leading-relaxed font-medium">
                            {scanResult.disposalMethod || scanResult.actionPlan}
                          </p>
                        </div>

                        {/* Environmental Impact */}
                        {scanResult.environmentalImpact && (
                          <div className="bg-emerald-50/70 border border-emerald-200/60 p-3.5 rounded-2xl space-y-1">
                            <span className="text-[10px] uppercase font-mono text-emerald-800 font-bold flex items-center gap-1">
                              <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Environmental Impact
                            </span>
                            <p className="text-xs text-emerald-900 leading-relaxed">
                              {scanResult.environmentalImpact}
                            </p>
                          </div>
                        )}

                        {/* Safety Warning */}
                        {scanResult.safetyWarning && (
                          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                            <span className="text-[10px] uppercase font-mono text-amber-900 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Safety Caution & Hazard Warning
                            </span>
                            <p className="text-xs text-amber-900 leading-relaxed">
                              {scanResult.safetyWarning}
                            </p>
                          </div>
                        )}

                        {/* Visual Explanation */}
                        {scanResult.explanation && (
                          <div>
                            <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">AI Visual Observation</span>
                            <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{scanResult.explanation}</p>
                          </div>
                        )}

                        <button
                          onClick={handleConvertScanToReport}
                          className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow flex items-center justify-center space-x-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Convert AI Analysis Into Public Incident Report</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
                        <Sparkles className="w-10 h-10 text-blue-300 stroke-1 animate-spin-slow" />
                        <p className="text-sm font-bold text-gray-700">Awaiting Scanner Photo</p>
                        <p className="text-xs max-w-xs leading-relaxed">
                          Once you drop or select a photograph and tap Scan, Gemini Vision AI will analyze the image to identify category, recyclability, disposal method, and safety warnings.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 4: INTERACTIVE ECOMAP & VEHICLE PLOTS
                --------------------------------------------------------------------- */}
            {activeTab === "map" && (
              <motion.div
                key="map-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Search finder bar */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Smart Recycling Center Finder</h3>
                  <p className="text-xs text-gray-500 mb-4">Uses Google Maps grounding to locate actual municipal sorting and hazardous scrap disposal centers</p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={finderLocation}
                        onChange={(e) => setFinderLocation(e.target.value)}
                        placeholder="Search another city or address (e.g., Oakland, CA)..."
                        className="w-full bg-gray-50 border border-gray-150 text-gray-900 text-sm pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                    <button
                      onClick={searchRecyclingHubs}
                      disabled={searchingCenters}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 flex-shrink-0 disabled:opacity-50"
                    >
                      {searchingCenters ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-4 h-4" />
                          <span>Locate Centers</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Grounding response if available */}
                {groundingText && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-3xl p-6 shadow-sm space-y-4 ${
                      groundingText.includes("Google Maps Grounding Offline")
                        ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30"
                        : "bg-white border-emerald-100 dark:bg-zinc-900 dark:border-zinc-800"
                    }`}
                  >
                    {groundingText.includes("Google Maps Grounding Offline") ? (
                      <>
                        <span className="text-[10px] font-bold font-mono bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 rounded-full uppercase tracking-wider flex items-center w-max gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Local Offline Registry Active
                        </span>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-950 dark:text-amber-200">Municipal Directory Cache Loaded</p>
                          <p className="text-xs text-amber-900/90 dark:text-amber-300/80 leading-relaxed font-sans">
                            {groundingText.replace(/\[Google Maps Grounding Offline - .*?\]\.\s*/, "")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-zinc-800 dark:text-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider flex items-center w-max gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Maps Grounded Search Advice
                        </span>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-sans">{groundingText}</p>
                      </>
                    )}
                    
                    {mapsLinks.length > 0 && (
                      <div className="pt-3 border-t border-gray-150">
                        <p className="text-[10px] text-gray-400 font-mono uppercase font-bold mb-2">Verified Maps Pins</p>
                        <div className="flex flex-wrap gap-2">
                          {mapsLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-slate-100 inline-flex items-center space-x-1 transition-all"
                            >
                              <Link className="w-3 h-3 text-emerald-600" />
                              <span>{link.title || "Maps Link"}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Grid of Map and pin overlays */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Map Visual (lg:col-span-8) */}
                  <div className="lg:col-span-8 space-y-3">
                    <GhanaMap
                      reports={reports.filter(r => mapFilterCategory === "All" || r.category === mapFilterCategory)}
                      recyclingCenters={recyclingCentersList.length > 0 ? recyclingCentersList : DEFAULT_GHANA_RECYCLING_CENTERS}
                      vehicles={vehicles}
                      onPinClick={(pin) => setSelectedMapPin(pin)}
                      heightClass="h-[520px]"
                    />
                  </div>

                  {/* Pin details Panel (lg:col-span-4) */}
                  <div className="lg:col-span-4 bg-white border border-gray-150 rounded-3xl p-5 flex flex-col justify-between min-h-[350px]">
                    {selectedMapPin ? (
                      <div className="space-y-4 text-xs text-gray-700">
                        {/* Title header */}
                        <div className="border-b border-gray-100 pb-3">
                          <span className="text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {selectedMapPin.type} detail
                          </span>
                          <h4 className="font-bold text-gray-950 text-sm mt-1.5 leading-snug">
                            {selectedMapPin.title || selectedMapPin.name}
                          </h4>
                        </div>

                        {/* Incident details specific */}
                        {selectedMapPin.type === "incident" && (
                          <div className="space-y-2.5">
                            {selectedMapPin.imageUrl && (
                              <img src={selectedMapPin.imageUrl} alt="Incident" className="w-full h-32 rounded-2xl object-cover border border-gray-250" referrerPolicy="no-referrer" />
                            )}
                            <p className="font-medium text-gray-900 flex items-start">
                              <MapPin className="w-4 h-4 text-emerald-600 mr-1.5 flex-shrink-0 mt-0.5" />
                              <span>Address: {selectedMapPin.location.address}</span>
                            </p>
                            <p><span className="font-bold text-gray-900">Spotted:</span> {new Date(selectedMapPin.dateSubmitted).toLocaleString()}</p>
                            <p><span className="font-bold text-gray-900">Reporter:</span> {selectedMapPin.reporterName}</p>
                            <p className="p-2.5 bg-slate-50 border border-gray-150 rounded-xl italic">"{selectedMapPin.description}"</p>
                          </div>
                        )}

                        {/* Recycling center details specific */}
                        {selectedMapPin.type === "center" && (
                          <div className="space-y-2.5">
                            <p className="font-medium text-gray-900 flex items-start">
                              <MapPin className="w-4 h-4 text-emerald-600 mr-1.5 flex-shrink-0 mt-0.5" />
                              <span>Address: {selectedMapPin.address}</span>
                            </p>
                            <p><span className="font-bold text-gray-900">Hours:</span> {selectedMapPin.hours}</p>
                            <p><span className="font-bold text-gray-900">Phone:</span> {selectedMapPin.phone}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {selectedMapPin.types.map((t: string, i: number) => (
                                <span key={i} className="bg-emerald-50 text-emerald-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-100">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <a 
                              href={selectedMapPin.mapsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full text-center block bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl mt-3"
                            >
                              Navigate to Center
                            </a>
                          </div>
                        )}

                        {/* Truck dispatcher detail specific */}
                        {selectedMapPin.type === "truck" && (
                          <div className="space-y-2.5">
                            <p><span className="font-bold text-gray-900">GPS Signal:</span> EG-SAT-V{selectedMapPin.id.split("-")[1]}</p>
                            <p><span className="font-bold text-gray-900">Fleet Code:</span> MUNICIPAL-TRUCK</p>
                            <p><span className="font-bold text-gray-900">Current Task:</span> {selectedMapPin.status}</p>
                            <div className="p-3.5 bg-blue-50 border border-blue-100 text-blue-950 rounded-xl flex items-center space-x-2.5">
                              <RefreshCw className="w-4 h-4 text-blue-700 animate-spin" />
                              <p className="text-[11px]">Truck coordinates are updating live using district logistics signals.</p>
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => setSelectedMapPin(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 font-bold hover:underline block pt-2"
                        >
                          Clear Selection
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 space-y-2.5">
                        <Map className="w-10 h-10 stroke-1 text-emerald-200" />
                        <p className="text-sm font-bold text-gray-700">Awaiting Selection</p>
                        <p className="text-xs max-w-xs leading-relaxed">
                          Click any active pin on the map viewport to load direct coordinates, photograph attachments, and collection status details.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB: MONITORING COVERAGE (prototype satellite-monitoring overview)
                --------------------------------------------------------------------- */}
            {activeTab === "coverage" && (
              <motion.div
                key="coverage-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <MonitoringCoverage />
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 5: REWARDS & INTERACTIVE ECO QUIZZES
                --------------------------------------------------------------------- */}
            {activeTab === "rewards" && (
              <motion.div
                key="rewards-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Score balance header */}
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 shadow-sm border border-indigo-800/40 relative overflow-hidden flex justify-between items-center">
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[10px] font-bold font-mono bg-indigo-800 text-indigo-200 px-3 py-1 rounded-full uppercase tracking-wider">
                      Gamified Rewards Hub
                    </span>
                    <h2 className="text-2xl font-black tracking-tight font-sans mt-2">Claim EcoPoints & Badges</h2>
                    <p className="text-indigo-200 text-xs max-w-md">
                      Redeem reward vouchers at partner sustainable retail stores, or play educational quizzes to unlock prestigious environmental badges!
                    </p>
                  </div>
                  <div className="bg-white/10 p-5 rounded-2xl border border-white/15 text-center shadow-inner relative z-10">
                    <span className="text-[10px] text-indigo-200 uppercase font-mono tracking-widest block font-bold">Wallet Balance</span>
                    <p className="text-4xl font-black font-mono text-amber-300 leading-none mt-1">{user.ecoPoints}</p>
                    <p className="text-[8px] text-indigo-300 font-mono mt-1 uppercase">EcoPoints Earned</p>
                  </div>
                </div>

                {/* Grid showing interactive quiz and badges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Quizzes hub box */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-1.5">
                        <BookOpen className="w-5 h-5 text-indigo-700 animate-pulse" />
                        <span>Civic Eco-Educational Quiz Hub</span>
                      </h3>

                      {activeQuizId ? (
                        /* CURRENT ACTIVE QUIZ DISPLAY */
                        (() => {
                          const activeQuiz = ECO_QUIZZES.find(q => q.id === activeQuizId);
                          if (!activeQuiz) return null;
                          const currentQuestion = activeQuiz.questions[currentQuestionIndex];
                          
                          return (
                            <div className="space-y-4 bg-slate-50 border border-gray-150 p-4.5 rounded-2xl text-xs text-gray-700">
                              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                <span className="font-mono text-[10px] text-indigo-800 uppercase font-bold">
                                  Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                                </span>
                                <span className="font-bold text-indigo-700">+{activeQuiz.rewardPoints} Pts</span>
                              </div>

                              <p className="font-bold text-gray-950 text-sm">{currentQuestion.question}</p>

                              <div className="space-y-2 pt-2">
                                {currentQuestion.options.map((opt, oIdx) => {
                                  const isSelected = selectedOptionIndex === oIdx;
                                  let bgClass = "bg-white border-gray-200 hover:bg-indigo-50/20";
                                  if (isSelected) bgClass = "bg-indigo-50 border-indigo-500 text-indigo-950";
                                  if (isAnswerRevealed) {
                                    if (oIdx === currentQuestion.answerIndex) {
                                      bgClass = "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold";
                                    } else if (isSelected) {
                                      bgClass = "bg-red-50 border-red-500 text-red-950";
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      onClick={() => handleSelectQuizOption(oIdx)}
                                      disabled={isAnswerRevealed}
                                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${bgClass}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Answer explanation banner */}
                              {isAnswerRevealed && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3 bg-white border border-gray-200 rounded-xl leading-relaxed mt-3"
                                >
                                  <p className="font-bold text-gray-950 uppercase text-[9px] font-mono">Explanation Detail</p>
                                  <p className="text-gray-600 mt-1">{currentQuestion.explanation}</p>
                                </motion.div>
                              )}

                              <div className="flex justify-end pt-3 space-x-2">
                                {!isAnswerRevealed ? (
                                  <button
                                    onClick={handleConfirmQuizAnswer}
                                    disabled={selectedOptionIndex === null}
                                    className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg"
                                  >
                                    Confirm Answer
                                  </button>
                                ) : (
                                  <button
                                    onClick={handleNextQuizQuestion}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-1"
                                  >
                                    <span>
                                      {currentQuestionIndex < activeQuiz.questions.length - 1 ? "Next Question" : "Complete Quiz"}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* LIST OF QUIZZES */
                        <div className="space-y-3.5">
                          {quizPointsEarned > 0 && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-900 flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span>Congratulations! You scored and earned <strong>+{quizPointsEarned} EcoPoints</strong> credited live.</span>
                            </div>
                          )}

                          {ECO_QUIZZES.map((quiz) => {
                            const isDone = quizScores[quiz.id];
                            return (
                              <div key={quiz.id} className="border border-gray-150 p-4 rounded-2xl flex justify-between items-center hover:shadow-sm transition-all bg-slate-50/40">
                                <div className="space-y-1 pr-4">
                                  <h4 className="font-bold text-gray-950 text-sm">{quiz.title}</h4>
                                  <p className="text-gray-500 text-xs">{quiz.description}</p>
                                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                    Reward: {quiz.rewardPoints} Pts
                                  </span>
                                </div>
                                <button
                                  onClick={() => startQuiz(quiz.id)}
                                  disabled={isDone}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                                    isDone 
                                      ? "bg-teal-50 border border-teal-100 text-teal-800 cursor-default" 
                                      : "bg-indigo-700 hover:bg-indigo-800 text-white shadow"
                                  }`}
                                >
                                  {isDone ? "Completed ✓" : "Start Quiz"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Achievements and Badges */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-1.5">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span>Unlocked Badges & Medals</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Badge 1 */}
                      <div className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-1.5 ${
                        user.ecoPoints >= 100 ? "bg-amber-50/50 border-amber-200 text-amber-950" : "bg-slate-50 border-gray-100 opacity-50"
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-black text-amber-600 text-lg">
                          🛡️
                        </div>
                        <h4 className="font-bold text-xs">Zero Waste Hero</h4>
                        <p className="text-[9px] text-gray-400">Achieve 100+ EcoPoints</p>
                      </div>

                      {/* Badge 2 */}
                      <div className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-1.5 ${
                        citizenReports.length >= 3 ? "bg-emerald-50/50 border-emerald-200 text-emerald-950" : "bg-slate-50 border-gray-100 opacity-50"
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-black text-emerald-600 text-lg">
                          🌱
                        </div>
                        <h4 className="font-bold text-xs">Litter Combatant</h4>
                        <p className="text-[9px] text-gray-400">File 3+ Incident Reports</p>
                      </div>

                      {/* Badge 3 */}
                      <div className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-1.5 ${
                        scanResult ? "bg-blue-50/50 border-blue-200 text-blue-950" : "bg-slate-50 border-gray-100 opacity-50"
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center font-black text-blue-600 text-lg">
                          👁️
                        </div>
                        <h4 className="font-bold text-xs">AI Specialist</h4>
                        <p className="text-[9px] text-gray-400">Trigger EcoVision Scan</p>
                      </div>

                      {/* Badge 4 */}
                      <div className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-1.5 ${
                        Object.keys(quizScores).length > 0 ? "bg-purple-50/50 border-purple-200 text-purple-950" : "bg-slate-50 border-gray-100 opacity-50"
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center font-black text-purple-600 text-lg">
                          🎓
                        </div>
                        <h4 className="font-bold text-xs">Eco Scholar</h4>
                        <p className="text-[9px] text-gray-400">Pass an Educational Quiz</p>
                      </div>
                    </div>

                    {/* Global leaderboard */}
                    <div className="border-t border-gray-100 pt-4 mt-5">
                      <h4 className="text-[10px] uppercase font-mono font-bold text-gray-400 mb-3 tracking-wider">Ghana National Leaderboard</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                          <span className="font-bold">1. Sophia Martinez (Authority Admin)</span>
                          <span className="font-mono font-bold text-amber-700">720 Pts</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-amber-50/30 border border-amber-100/50 rounded-xl">
                          <span className="font-bold text-emerald-950">2. Alex Johnson (You)</span>
                          <span className="font-mono font-bold text-amber-700">{user.ecoPoints} Pts</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                          <span>3. Jane Doe</span>
                          <span className="font-mono text-gray-500">120 Pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ---------------------------------------------------------------------
                    REWARDS STORE SUBSECTION (Tab 5 Bottom)
                    --------------------------------------------------------------------- */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <Award className="w-5 h-5 text-emerald-600 animate-pulse" />
                      <span>Redeemable EcoRewards Store</span>
                    </h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                      Partner Outlets Live
                    </span>
                  </div>

                  {redemptionStatus && (
                    <div className={`p-3.5 rounded-2xl text-xs flex items-center space-x-2 ${
                      redemptionStatus.success ? "bg-teal-50 border border-teal-100 text-teal-900" : "bg-red-50 border border-red-100 text-red-900"
                    }`}>
                      <Info className="w-4 h-4" />
                      <span>{redemptionStatus.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rewards.map((rew) => (
                      <div key={rew.id} className="border border-gray-150 rounded-2xl p-4 bg-slate-50/55 flex flex-col justify-between hover:shadow-sm transition-all">
                        <div className="space-y-2">
                          {rew.imageUrl && (
                            <img src={rew.imageUrl} alt={rew.title} className="w-full h-28 object-cover rounded-xl border border-gray-200" referrerPolicy="no-referrer" />
                          )}
                          <div className="space-y-1">
                            <h4 className="font-bold text-gray-950 text-xs">{rew.title}</h4>
                            <p className="text-gray-500 text-[11px] leading-snug">{rew.description}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-amber-600">
                            {rew.pointsCost} Pts
                          </span>
                          <button
                            onClick={() => handleRedeem(rew.id)}
                            disabled={user.ecoPoints < rew.pointsCost}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all uppercase ${
                              user.ecoPoints >= rew.pointsCost
                                ? "bg-indigo-700 hover:bg-indigo-800 text-white shadow cursor-pointer"
                                : "bg-gray-105 text-gray-400 cursor-not-allowed border border-gray-200"
                            }`}
                          >
                            Redeem
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 6: NOTIFICATIONS & BULLETIN REEDS
                --------------------------------------------------------------------- */}
            {activeTab === "notifications" && (
              <motion.div
                key="notifications-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6"
              >
                <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Bulletins & Alerts</h2>
                    <p className="text-xs text-gray-500">Official directives, earned EcoPoints, and resolved incident notifications</p>
                  </div>
                  <div className="relative">
                    <BellRing className="w-6 h-6 text-emerald-600 animate-bounce" />
                    {notifications.filter(n => n.userId === user.id).some(n => !n.read) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Static general alerts */}
                  <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl text-xs text-amber-950 flex items-start space-x-3 shadow-inner">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold">Active Heat Wave Warning</h4>
                      <p className="text-gray-600 mt-1 leading-relaxed">
                        Due to the extreme summer temperatures, municipal logistics crews are starting collections 2 hours earlier (at 5:00 AM) to ensure operator safety. Please have bins in designated loading positions the prior evening.
                      </p>
                    </div>
                  </div>

                  {/* Dynamic system updates */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs uppercase font-mono font-bold text-gray-400 tracking-wider">Your Guard Feed ({notifications.filter(n => n.userId === user.id).length} updates)</h3>
                    
                    {notifications.filter(n => n.userId === user.id).length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs">
                        No customized alerts received yet. File reports or participate in campaigns to populate your guard feed!
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {notifications.filter(n => n.userId === user.id).map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 rounded-2xl border text-xs flex justify-between items-start transition-all ${
                              n.read 
                                ? "bg-slate-50/60 border-gray-100 text-gray-600" 
                                : "bg-emerald-50/30 border-emerald-100 text-emerald-950 font-medium shadow-sm"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-xl mt-0.5 ${
                                n.type === "points" ? "bg-amber-100 text-amber-800" :
                                n.type === "resolved" ? "bg-teal-100 text-teal-800" :
                                n.type === "assignment" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"
                              }`}>
                                {n.type === "points" ? "🪙" :
                                 n.type === "resolved" ? "✓" :
                                 n.type === "assignment" ? "📋" : "🔔"}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                  <span>{n.title}</span>
                                  {!n.read && (
                                    <span className="bg-emerald-600 text-[8px] text-white font-mono uppercase px-1.5 py-0.2 rounded-full font-bold">New</span>
                                  )}
                                </h4>
                                <p className="text-gray-600 leading-relaxed text-[11px]">{n.message}</p>
                                <span className="text-[10px] text-gray-400 font-mono block pt-1">
                                  {new Date(n.date).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {!n.read && onMarkNotificationRead && (
                              <button 
                                onClick={() => onMarkNotificationRead(n.id)}
                                className="bg-white hover:bg-emerald-55 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg border border-emerald-100 hover:border-emerald-200 transition-all flex-shrink-0 cursor-pointer"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 7: PROFILE & GUIDELINES
                --------------------------------------------------------------------- */}
            {activeTab === "profile" && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Profile detail card */}
                <div className="lg:col-span-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between items-center text-center space-y-5">
                  <div className="space-y-3.5 w-full">
                    <div className="relative w-24 h-24 mx-auto group">
                      <input 
                        type="file" 
                        ref={avatarInputRef} 
                        onChange={handleAvatarChange} 
                        className="hidden" 
                        accept="image/*" 
                      />
                      {user.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt={user.name} 
                          className="w-24 h-24 object-cover border-4 border-emerald-100 rounded-full shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-600 border-4 border-emerald-100 rounded-full text-white flex items-center justify-center font-black text-3xl shadow-md uppercase">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold font-mono cursor-pointer border-0"
                      >
                        <Camera className="w-4 h-4 mb-1 text-emerald-300" />
                        {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-black text-gray-950 text-lg leading-tight">{user.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 justify-center">
                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Active Citizen
                      </span>
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Level 4 Guard
                      </span>
                    </div>
                  </div>

                  {/* Real stats and community affiliations */}
                  <div className="w-full bg-slate-50 border border-gray-150 p-4.5 rounded-2xl text-left text-xs space-y-2.5 font-mono">
                    <p className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <span className="text-gray-400">Community Rank:</span>
                      <span className="font-bold text-amber-700">{currentRankName}</span>
                    </p>
                    <p className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <span className="text-gray-400">EcoPoints:</span>
                      <span className="font-bold text-emerald-950 text-sm">{user.ecoPoints} Pts</span>
                    </p>
                    <p className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <span className="text-gray-400">Total Reports filed:</span>
                      <span className="font-bold text-gray-900">{citizenReports.length}</span>
                    </p>
                    <p className="flex justify-between items-center">
                      <span className="text-gray-400">Cleanliness District:</span>
                      <span className="font-bold text-blue-950 truncate max-w-[150px]">Accra Central, Ghana</span>
                    </p>
                  </div>

                  {/* Password Reset simulated button */}
                  <div className="w-full pt-1">
                    {passwordResetTriggered ? (
                      <p className="text-[10px] text-teal-800 bg-teal-50 border border-teal-100 p-2.5 rounded-xl font-medium">
                        ✓ Simulated authentication credentials reset dispatch completed.
                      </p>
                    ) : (
                      <button 
                        onClick={() => setPasswordResetTriggered(true)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition-all font-mono cursor-pointer"
                      >
                        Request Password Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Personal reports history and achievements */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Reports History log */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-950 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      <span>Your Environmental Report History ({citizenReports.length})</span>
                    </h3>

                    {citizenReports.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        No reported incidents found. Use the quick actions panel to file your first environmental report!
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {citizenReports.map((rep) => (
                          <div key={rep.id} className="p-3 bg-slate-50 border border-gray-150 rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                              {rep.imageUrl && (
                                <img src={rep.imageUrl} alt={rep.title} className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0" referrerPolicy="no-referrer" />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-950 truncate">{rep.title}</p>
                                <p className="text-gray-400 text-[10px] truncate">{rep.location.address}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2.5 font-mono text-[10px] self-end sm:self-center">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                                rep.status === "Completed" ? "bg-teal-50 text-teal-800 border border-teal-100" :
                                rep.status === "Assigned" ? "bg-blue-50 text-blue-800 border border-blue-100" :
                                "bg-amber-50 text-amber-800 border border-amber-100"
                              }`}>{rep.status}</span>
                              <span className="text-gray-400">{new Date(rep.dateSubmitted).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Safety guidelines guidelines card */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-950 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>Environmental Safety & Sorting Guidelines</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 leading-relaxed">
                      <div className="p-3 bg-amber-50/20 border border-amber-100/50 rounded-2xl">
                        <h4 className="font-bold text-amber-950 flex items-center gap-1">
                          ⚠️ Hazardous Sorting
                        </h4>
                        <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
                          Heavy chemicals, liquid lead paints, domestic batteries, and gas canisters should never enter default grey waste chutes.
                        </p>
                      </div>

                      <div className="p-3 bg-blue-50/20 border border-blue-100/50 rounded-2xl">
                        <h4 className="font-bold text-blue-950 flex items-center gap-1">
                          ♻️ E-Waste Regulations
                        </h4>
                        <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
                          Lithium batteries can trigger fires if compressed. Circuit boards must be taken to specialized electronic processing centers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 8: PREFERENCES & SETTINGS
                --------------------------------------------------------------------- */}
            {activeTab === "settings" && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6"
              >
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-bold text-gray-900">Application Settings</h2>
                  <p className="text-xs text-gray-500">Configure notifications, tracking preferences, and regional community profiles</p>
                </div>

                <div className="space-y-5 text-xs text-gray-700">
                  {/* Preferences selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4.5 bg-slate-50 border border-gray-150 rounded-2xl space-y-2">
                      <h4 className="font-bold text-gray-950">Select Cleanliness Community</h4>
                      <p className="text-gray-500 text-[10px]">Select your regional community affiliation for rankings and campaigns</p>
                      <select className="w-full bg-white border border-gray-250 text-gray-950 px-3 py-2.5 rounded-xl mt-1.5 focus:outline-none font-medium">
                        <option>Greater Accra Cleanliness Initiative</option>
                        <option>Kumasi Kejetia Eco-Volunteers</option>
                        <option>Takoradi Coastal Guardians</option>
                        <option>Tamale Green Coalition</option>
                      </select>
                    </div>

                    <div className="p-4.5 bg-slate-50 border border-gray-150 rounded-2xl space-y-2">
                      <h4 className="font-bold text-gray-950">Primary Contact Phone</h4>
                      <p className="text-gray-500 text-[10px]">Your phone number for verified municipal follow-ups on hazardous reports</p>
                      <input 
                        type="tel" 
                        placeholder="+1 (555) 019-2834" 
                        className="w-full bg-white border border-gray-250 text-gray-950 px-3 py-2.5 rounded-xl mt-1.5 focus:outline-none font-medium" 
                      />
                    </div>
                  </div>

                  {/* Push toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-950">Enable Real-Time Bulletins</h4>
                      <p className="text-gray-500 text-[11px] mt-0.5">Receive immediate warnings of heat waves or scheduling changes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsPush} 
                        onChange={(e) => setSettingsPush(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  {/* Email toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-950">Email Incident Digest</h4>
                      <p className="text-gray-500 text-[11px] mt-0.5">Transmit weekly reports of resolving compliance actions in San Francisco</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsEmail} 
                        onChange={(e) => setSettingsEmail(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  {/* Sound effects toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-950">Sound Feedback (Gamification)</h4>
                      <p className="text-gray-500 text-[11px] mt-0.5">Simulate alert and award sounds when completing eco quizzes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsSound} 
                        onChange={(e) => setSettingsSound(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  {/* Custom location center settings */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 space-y-3.5">
                    <div>
                      <h4 className="font-bold text-gray-950">Default Pin Coordinates Location</h4>
                      <p className="text-gray-500 text-[11px] mt-0.5">Define your custom neighborhood coordinates for automatic incident pinpoint mapping</p>
                    </div>
                    <input 
                      type="text"
                      value={customPinLocation}
                      onChange={(e) => setCustomPinLocation(e.target.value)}
                      className="w-full max-w-sm bg-white border border-gray-250 text-gray-950 text-xs px-3 py-2.5 rounded-xl focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM FLOATING NAVIGATION BAR (Visible only on md:hidden/lg:hidden)
          ========================================================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 py-1.5 px-3 flex items-center justify-between z-50 shadow-lg">
        {renderBottomNavButton("home", "Home", <Home className="w-4 h-4" />)}
        {renderBottomNavButton("reports", "Reports", <FileText className="w-4 h-4" />)}
        {renderBottomNavButton("scanner", "Scanner", <Camera className="w-4 h-4" />)}
        {renderBottomNavButton("map", "Map", <Map className="w-4 h-4" />)}
        {renderBottomNavButton("coverage", "Coverage", <Satellite className="w-4 h-4" />)}
        {renderBottomNavButton("rewards", "Rewards", <Award className="w-4 h-4" />)}
        {renderBottomNavButton("profile", "Profile", <UserIcon className="w-4 h-4" />)}
      </div>

    </div>
  );
}
