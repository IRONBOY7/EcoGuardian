import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, UserRole } from "../types";
import { Send, Bot, User, Sparkles, CheckCircle, AlertTriangle, Cpu, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatBotPanelProps {
  userRole: UserRole;
  userEmail?: string;
}

export default function ChatBotPanel({ userRole, userEmail }: ChatBotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: `Hello! I am EcoBot, your intelligent environmental guardian assistant. As a **${userRole === "citizen" ? "Citizen Partner" : userRole === "company" ? "Waste Logistics Advisor" : "Policy & Compliance Advisor"}**, I am calibrated to help you with:
      
${userRole === "citizen" 
  ? "• Smart sorting tips for recyclables\n• Calculating expected EcoPoints rewards\n• Finding local cleanup events or centers" 
  : userRole === "company" 
  ? "• Guidelines for hazardous waste collection safety\n• Minimizing fuel emissions during pick-up routing\n• Handling vehicle compliance rules"
  : "• Analyzing response times across municipal sectors\n• Preparing compliance and carbon reports\n• Drafting announcements for public distribution"}
  
How can I assist you on our zero-waste journey today?`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [thinkingMode, setThinkingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsgText = inputText;
    setInputText("");

    const newUserMsg: ChatMessage = {
      id: `m-user-${Date.now()}`,
      role: "user",
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    // Build standard chat history for Gemini
    // Limit to last 8 turns to avoid token overflow
    const historyPayload = messages
      .filter(m => m.id !== "welcome")
      .slice(-8)
      .map(m => ({
        role: m.role,
        text: m.text
      }));

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          history: historyPayload,
          thinkingMode,
          role: userRole
        })
      });

      const data = await response.json();
      
      const botMsg: ChatMessage = {
        id: `m-bot-${Date.now()}`,
        role: "model",
        text: data.text || "I apologize, I could not generate a response. Please check back shortly.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `m-bot-err-${Date.now()}`,
        role: "model",
        text: "System communication timeout. If this is a localized preview sandbox, ensure your development server is active or check your GEMINI_API_KEY in secrets.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "model",
        text: "Chat thread refreshed. How can I help you sort, organize, or draft today?",
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[580px] bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-700/60 p-2 rounded-xl text-emerald-200">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm">EcoBot Guardian Advisor</h3>
              <span className="text-[10px] bg-teal-500 text-teal-950 font-semibold px-2 py-0.5 rounded-full uppercase">
                {userRole}
              </span>
            </div>
            <p className="text-[10px] text-emerald-200/80">Active with context specialization</p>
          </div>
        </div>

        {/* Deep Thinking Mode Toggle */}
        <div className="flex items-center space-x-2 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-700/40">
          <button
            onClick={() => setThinkingMode(!thinkingMode)}
            className="flex items-center space-x-1.5 focus:outline-none"
            title="Uses gemini-3.1-pro-preview with HIGH Thinking Level"
          >
            <BrainCircuit className={`w-4 h-4 ${thinkingMode ? "text-amber-400 animate-pulse" : "text-gray-400"}`} />
            <span className="text-xs font-medium font-mono">
              {thinkingMode ? "Thinking: HIGH" : "Standard"}
            </span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isModel = msg.role === "model";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${isModel ? "justify-start" : "justify-end"}`}
              >
                <div className={`flex items-start max-w-[85%] space-x-2.5 ${!isModel && "flex-row-reverse space-x-reverse"}`}>
                  <div className={`p-1.5 rounded-xl ${isModel ? "bg-emerald-50 text-emerald-800" : "bg-emerald-600 text-white"}`}>
                    {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    isModel 
                      ? "bg-white border border-gray-100 text-gray-800 shadow-sm" 
                      : "bg-emerald-600 text-white shadow-sm"
                  }`}>
                    {/* Render newlines and bold formats simply */}
                    <div className="whitespace-pre-line space-y-1">
                      {msg.text.split("\n").map((line, idx) => {
                        // Simple custom parser for bold strings **text**
                        if (line.includes("**")) {
                          const parts = line.split("**");
                          return (
                            <p key={idx}>
                              {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-gray-950">{p}</strong> : p)}
                            </p>
                          );
                        }
                        return <p key={idx}>{line}</p>;
                      })}
                    </div>
                    <span className={`block text-[9px] mt-1.5 text-right font-mono ${isModel ? "text-gray-400" : "text-emerald-200"}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Thinking / Loading Simulator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-start max-w-[85%] space-x-2.5">
              <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-800 animate-bounce">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-gray-100 text-gray-500 shadow-sm flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-mono font-medium text-emerald-700">
                    {thinkingMode ? "Analyzing compliance databases and reasoning (High Thinking Level)..." : "EcoBot is drafting response..."}
                  </span>
                </div>
                <div className="flex space-x-1.5 py-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center space-x-2">
        <button
          type="button"
          onClick={clearChat}
          className="px-2.5 py-2 text-xs text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg font-mono transition-all border border-transparent hover:border-emerald-100"
        >
          Clear Thread
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            thinkingMode 
              ? "Ask a complex environmental regulatory question..." 
              : "Ask sorting, recycling tips, or EcoPoints query..."
          }
          className="flex-1 bg-gray-50 text-gray-900 border border-gray-100 text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-emerald-700 hover:bg-emerald-800 text-white p-2.5 rounded-2xl transition-all shadow-sm focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
