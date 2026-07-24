import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Check, 
  RotateCcw, 
  AlertCircle, 
  Globe, 
  Radio, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  MapPin,
  Languages
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export interface GhanaianLanguage {
  id: string;
  name: string;
  nativeName: string;
  bcp47: string;
  region: string;
  webSpeechSupported: boolean;
  engineNotice: string;
}

export const GHANAIAN_LANGUAGES: GhanaianLanguage[] = [
  { id: "en", name: "English", nativeName: "English (Ghana)", bcp47: "en-GH", region: "National / Greater Accra", webSpeechSupported: true, engineNotice: "Native Browser Speech & Gemini AI" },
  { id: "ak", name: "Twi / Akan", nativeName: "Twi (Akan)", bcp47: "ak-GH", region: "Ashanti / Eastern / Central", webSpeechSupported: true, engineNotice: "Native Browser & Multimodal Audio AI" },
  { id: "fat", name: "Fante", nativeName: "Mfantse", bcp47: "ak-GH", region: "Central / Western Region", webSpeechSupported: true, engineNotice: "Gemini Multimodal Audio AI" },
  { id: "gaa", name: "Ga", nativeName: "Ga-Adangbe", bcp47: "gaa-GH", region: "Greater Accra Region", webSpeechSupported: false, engineNotice: "Gemini Multimodal Audio AI" },
  { id: "ee", name: "Ewe", nativeName: "Eʋegbe", bcp47: "ee-GH", region: "Volta Region", webSpeechSupported: false, engineNotice: "Gemini Multimodal Audio AI" },
  { id: "dag", name: "Dagbani", nativeName: "Dagbanli", bcp47: "dag-GH", region: "Northern Region", webSpeechSupported: false, engineNotice: "Gemini Multimodal Audio AI" },
  { id: "ha", name: "Hausa", nativeName: "Harshen Hausa", bcp47: "ha-GH", region: "Northern / Zongo Communities", webSpeechSupported: true, engineNotice: "Native Browser & Multimodal Audio AI" },
  { id: "nzi", name: "Nzema", nativeName: "Nzema", bcp47: "nzi-GH", region: "Western Region", webSpeechSupported: false, engineNotice: "Gemini Multimodal Audio AI" },
  { id: "dga", name: "Dagaare", nativeName: "Dagaare", bcp47: "dga-GH", region: "Upper West Region", webSpeechSupported: false, engineNotice: "Gemini Multimodal Audio AI" },
  { id: "gjn", name: "Gonja", nativeName: "Ngbanyito", bcp47: "gjn-GH", region: "Savannah Region", webSpeechSupported: false, engineNotice: "Gemini Multimodal Audio AI" },
];

export interface VoiceAnalysisResult {
  originalLanguage: string;
  originalTranscription: string;
  englishTranslation: string;
  title: string;
  description: string;
  category: string;
  severity: "Low" | "Medium" | "High";
  extractedLocation?: string;
  urgency?: string;
  missingFields?: string[];
}

interface GhanaianVoiceReporterProps {
  onApplyReportData: (data: {
    title: string;
    description: string;
    category: string;
    severity: "Low" | "Medium" | "High";
    locationText?: string;
    originalLanguage?: string;
    originalTranscription?: string;
    englishTranslation?: string;
  }) => void;
  onCancel?: () => void;
}

export const GhanaianVoiceReporter: React.FC<GhanaianVoiceReporterProps> = ({
  onApplyReportData,
  onCancel
}) => {
  const [selectedLang, setSelectedLang] = useState<GhanaianLanguage>(GHANAIAN_LANGUAGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<VoiceAnalysisResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Clean up timer and speech on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Format recording timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Start Voice Recording (Dual WebSpeech + MediaRecorder for Gemini Multimodal Audio)
  const startRecording = async () => {
    setParsedResult(null);
    setLiveTranscript("");
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    // 1. Request Microphone Access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
        else mimeType = "";
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/wav" });
        await processAudioWithGemini(audioBlob, mimeType || "audio/wav");
      };

      mediaRecorder.start(500); // chunk every 500ms
      setIsRecording(true);

      // Start Recording Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // 2. Also start Web Speech API if supported for live visualizer
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = selectedLang.bcp47;

          rec.onresult = (event: any) => {
            let currentText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal || event.results[i][0]) {
                currentText += event.results[i][0].transcript + " ";
              }
            }
            if (currentText.trim()) {
              setLiveTranscript(currentText.trim());
            }
          };

          rec.onerror = (e: any) => {
            // Ignore minor no-speech errors
          };

          rec.start();
          speechRecognitionRef.current = rec;
        } catch (e) {
          // ignore speech recognition start failure
        }
      }

      toast.info(`🎙️ Recording in ${selectedLang.nativeName}...`, {
        description: "Speak clearly into your microphone about the environmental hazard."
      });
    } catch (err: any) {
      console.error("Microphone Access Error:", err);
      toast.error("Microphone Access Denied", {
        description: "Please enable microphone permissions in your browser settings to use Voice Reporting."
      });
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Cancel Recording
  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);
    setIsProcessing(false);
    audioChunksRef.current = [];
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    
    setLiveTranscript("");
    toast.info("Voice recording cancelled.");
  };

  // Process recorded audio Blob with server-side Gemini AI Multimodal endpoint
  const processAudioWithGemini = async (blob: Blob, mimeType: string) => {
    setIsProcessing(true);
    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const response = await fetch("/api/analyze-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType,
            targetLanguage: selectedLang.nativeName,
            transcriptText: liveTranscript
          })
        });

        const data = await response.json();
        setIsProcessing(false);

        if (data.success) {
          setParsedResult(data);
          toast.success("Voice report processed successfully!", {
            description: `Transcribed from ${selectedLang.name} and structured.`
          });
        } else {
          toast.error("Speech analysis error", { description: data.error || "Could not analyze voice recording." });
        }
      };
    } catch (err: any) {
      console.error("Audio Processing Error:", err);
      setIsProcessing(false);
      toast.error("Audio Processing Error", { description: "Failed to send audio recording to AI server." });
    }
  };

  // Listen to Report (Text-To-Speech)
  const handleListenToReport = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    if (!parsedResult) return;

    const speechText = `Voice Report Summary. Language: ${parsedResult.originalLanguage}. Category: ${parsedResult.category}. Title: ${parsedResult.title}. Description: ${parsedResult.englishTranslation}. ${parsedResult.extractedLocation ? 'Location: ' + parsedResult.extractedLocation : ''}`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Confirm and Apply Voice Data to Report Form
  const handleApplyToForm = () => {
    if (!parsedResult) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    onApplyReportData({
      title: parsedResult.title || `Voice Report in ${selectedLang.name}`,
      description: parsedResult.englishTranslation || parsedResult.originalTranscription,
      category: parsedResult.category || "General Waste",
      severity: (["Low", "Medium", "High"].includes(parsedResult.severity) ? parsedResult.severity : "Medium") as "Low" | "Medium" | "High",
      locationText: parsedResult.extractedLocation || "",
      originalLanguage: parsedResult.originalLanguage || selectedLang.nativeName,
      originalTranscription: parsedResult.originalTranscription,
      englishTranslation: parsedResult.englishTranslation
    });

    toast.success("Voice data applied to report form!", {
      description: "Review and click Submit Report when ready."
    });
  };

  return (
    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-emerald-500/30 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-emerald-800/60">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Ghanaian Languages AI Voice
            </span>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
              🇬🇭 10 Local Languages
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Report Hazard by Voice</span>
          </h3>
          <p className="text-xs md:text-sm text-emerald-100/80 mt-1">
            Speak naturally in your preferred local language. EcoGuardian AI transcribes, translates, and structures your environmental report automatically.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="self-start md:self-auto text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-gray-700/80 hover:bg-gray-800/60 transition-all"
          >
            Close Voice Tool
          </button>
        )}
      </div>

      {/* Step 1: Language Selector */}
      <div className="relative z-10 mb-6">
        <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-emerald-400" /> Select Your Preferred Spoken Language
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {GHANAIAN_LANGUAGES.map((lang) => {
            const isSelected = selectedLang.id === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                disabled={isRecording || isProcessing}
                onClick={() => setSelectedLang(lang)}
                className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-emerald-600/30 border-emerald-400 text-white ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-900/40"
                    : "bg-slate-900/60 border-slate-700/80 text-gray-300 hover:border-emerald-500/40 hover:bg-slate-800/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm block truncate">{lang.nativeName}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5 truncate">{lang.region}</span>
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono">
                  <span className={lang.webSpeechSupported ? "text-emerald-400" : "text-teal-300"}>
                    {lang.webSpeechSupported ? "Browser + AI" : "AI Audio Engine"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Engine Transparency Banner */}
        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-emerald-200/90 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>
              Active Language: <strong className="text-white">{selectedLang.nativeName}</strong> ({selectedLang.name}). Engine: <span className="text-emerald-300">{selectedLang.engineNotice}</span>.
            </span>
          </div>
        </div>
      </div>

      {/* Step 2: Recording Controls & Status */}
      <div className="relative z-10 my-6 bg-slate-900/90 rounded-2xl border border-emerald-800/40 p-6 text-center">
        {!isRecording && !isProcessing && !parsedResult && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <button
              type="button"
              onClick={startRecording}
              className="group relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-950/80 transition-all transform hover:scale-105 active:scale-95 border-4 border-emerald-300/30"
            >
              <Mic className="w-10 h-10 text-white group-hover:animate-bounce" />
              <span className="absolute -bottom-8 whitespace-nowrap text-xs font-bold text-emerald-300 bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                Tap to Speak ({selectedLang.nativeName})
              </span>
            </button>
            <p className="text-xs text-emerald-200/70 max-w-md pt-4">
              Tap the microphone and speak freely in <strong>{selectedLang.nativeName}</strong>. Example: <em>"There is a large pile of rubbish near Kejetia market that has been there for days."</em>
            </p>
          </div>
        )}

        {isRecording && (
          <div className="flex flex-col items-center justify-center space-y-4 py-2">
            {/* Live Wave Indicator */}
            <div className="flex items-center space-x-1.5 h-12">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: ["12px", `${Math.floor(Math.random() * 36) + 12}px`, "12px"],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.08,
                  }}
                  className="w-1.5 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full"
                />
              ))}
            </div>

            <div className="flex items-center space-x-2 text-red-400 bg-red-950/80 px-4 py-1.5 rounded-full border border-red-500/40 text-sm font-mono font-bold animate-pulse">
              <Radio className="w-4 h-4 text-red-500 animate-spin" />
              <span>RECORDING IN {selectedLang.name.toUpperCase()} — {formatTime(recordingSeconds)}</span>
            </div>

            {liveTranscript && (
              <div className="w-full max-w-lg bg-slate-950/90 p-3 rounded-xl border border-emerald-500/30 text-xs text-emerald-200 text-center font-mono">
                "{liveTranscript}"
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={stopRecording}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finished Speaking</span>
              </button>

              <button
                type="button"
                onClick={cancelRecording}
                className="bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 px-4 py-2.5 rounded-xl text-sm transition-all flex items-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
            </div>
            <h4 className="text-sm font-bold text-white">
              AI Processing Speech ({selectedLang.nativeName})...
            </h4>
            <p className="text-xs text-emerald-200/80">
              Transcribing spoken Ghanaian language, translating to English, and extracting report details...
            </p>
          </div>
        )}

        {/* Step 3: Structured AI Result View */}
        {parsedResult && (
          <div className="text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm text-emerald-300">
                  Voice Report Analysis Complete
                </span>
              </div>

              {/* 🔊 Listen to Report Button */}
              <button
                type="button"
                onClick={handleListenToReport}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isSpeaking
                    ? "bg-amber-500 text-slate-950 border-amber-300 animate-pulse shadow-md"
                    : "bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border-emerald-500/40"
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>🔊 Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>🔊 Listen to Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Original Spoken Language vs English Translation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block mb-1">
                  🗣️ Original Spoken Transcript ({parsedResult.originalLanguage || selectedLang.nativeName})
                </span>
                <p className="text-xs text-gray-200 italic leading-relaxed">
                  "{parsedResult.originalTranscription || "No speech transcription generated."}"
                </p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono uppercase font-bold text-teal-300 block mb-1">
                  🇬🇧 English AI Interpretation
                </span>
                <p className="text-xs text-gray-100 font-medium leading-relaxed">
                  "{parsedResult.englishTranslation || parsedResult.originalTranscription}"
                </p>
              </div>
            </div>

            {/* Structured Fields Summary */}
            <div className="bg-slate-950/90 p-4 rounded-xl border border-emerald-900/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Extracted Title</span>
                  <p className="text-xs font-bold text-white mt-0.5">{parsedResult.title}</p>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Category</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    {parsedResult.category}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Priority / Severity</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                    parsedResult.severity === "High"
                      ? "bg-red-900/60 text-red-300 border-red-700/60"
                      : "bg-amber-900/60 text-amber-300 border-amber-700/60"
                  }`}>
                    {parsedResult.severity} Priority
                  </span>
                </div>
              </div>

              {parsedResult.extractedLocation ? (
                <div className="pt-2 border-t border-slate-800 flex items-center space-x-2 text-xs text-emerald-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Mentioned Location: <strong>{parsedResult.extractedLocation}</strong></span>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800 p-2 rounded-lg bg-amber-950/40 border-amber-800/40 text-[11px] text-amber-200 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Notice: Location was not explicitly mentioned in speech. You can select your exact location on the Ghana Map below.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={startRecording}
                className="w-full sm:w-auto text-xs text-gray-300 hover:text-white px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record Voice</span>
              </button>

              <button
                type="button"
                onClick={handleApplyToForm}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Confirm & Populate Report Form</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
