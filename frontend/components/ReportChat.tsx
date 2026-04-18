"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X, Minimize2, Bot, User, Loader2 } from "lucide-react";
import type { AnalysisResult, Lang } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const SUGGESTED: Record<Lang, string[]> = {
  en: [
    "Why is my haemoglobin low?",
    "What does my health score mean?",
    "Why do I need a hematologist?",
    "What should I eat to improve my report?",
    "Which value is most urgent?",
  ],
  hi: [
    "मेरा हीमोग्लोबिन कम क्यों है?",
    "मेरे हेल्थ स्कोर का मतलब क्या है?",
    "मुझे हेमेटोलॉजिस्ट की ज़रूरत क्यों है?",
    "रिपोर्ट सुधारने के लिए क्या खाऊं?",
    "सबसे ज़रूरी मान कौन सा है?",
  ],
  mr: [
    "माझा हिमोग्लोबिन कमी का आहे?",
    "माझ्या आरोग्य स्कोरचा अर्थ काय?",
    "मला हेमॅटोलॉजिस्टची गरज का आहे?",
    "अहवाल सुधारण्यासाठी काय खावे?",
    "सर्वात महत्त्वाचे मूल्य कोणते?",
  ],
};

const PLACEHOLDERS: Record<Lang, string> = {
  en: "Ask about your report...",
  hi: "अपनी रिपोर्ट के बारे में पूछें...",
  mr: "तुमच्या अहवालाबद्दल विचारा...",
};

const TITLES: Record<Lang, string> = {
  en: "Ask Bodh",
  hi: "Bodh से पूछें",
  mr: "Bodh ला विचारा",
};

const GREETINGS: Record<Lang, string> = {
  en: "Hi! I can answer questions about your report. Ask me anything — why a value is abnormal, what a term means, or what to tell your doctor.",
  hi: "नमस्ते! मैं आपकी रिपोर्ट के बारे में सवालों का जवाब दे सकता हूं। कुछ भी पूछें — कोई मान असामान्य क्यों है, किसी शब्द का अर्थ क्या है।",
  mr: "नमस्ते! मी तुमच्या अहवालाबद्दलच्या प्रश्नांची उत्तरे देऊ शकतो. काहीही विचारा — एखादे मूल्य असामान्य का आहे, एखाद्या शब्दाचा अर्थ काय आहे.",
};

interface ReportChatProps {
  result: AnalysisResult;
  lang: Lang;
  elderly?: boolean;
}

export default function ReportChat({ result, lang, elderly = false }: ReportChatProps) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Greeting message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: GREETINGS[lang],
        ts: Date.now(),
      }]);
    }
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, lang]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Serialize report — exclude biomarker explanations to keep payload small
      // but include the key fields the system prompt needs
      const reportPayload = {
        age: 35, // ideally from context — pass if available
        gender: "unknown",
        overall_severity: result.overall_severity,
        specialist_recommendation: result.specialist_recommendation,
        urgency_timeline: result.urgency_timeline,
        emergency_message: result.emergency_message,
        biomarkers: result.biomarkers.map(b => ({
          raw_name:        b.raw_name,
          value:           b.value,
          unit:            b.unit,
          active_ref_low:  b.active_ref_low,
          active_ref_high: b.active_ref_high,
          severity:        b.severity,
          explanation_en:  b.explanation_en,
          diet_tip_en:     b.diet_tip_en,
        })),
      };

      const history = messages
        .filter(m => m.role !== "assistant" || messages.indexOf(m) > 0) // skip greeting
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history, report: reportPayload }),
      });

      if (!res.ok) throw new Error("Chat unavailable");
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply,
        ts: Date.now(),
      }]);

      if (!open) setUnread(u => u + 1);

    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: lang === "hi"
          ? "माफ़ करें, अभी जवाब नहीं दे पा रहा। कृपया फिर से प्रयास करें।"
          : lang === "mr"
          ? "क्षमा करा, आत्ता उत्तर देता येत नाही. पुन्हा प्रयत्न करा."
          : "Sorry, I couldn't respond right now. Please try again.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, result, lang, open]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  // Show only suggestions that are relevant (filter by actual abnormal biomarkers)
  const suggestions = SUGGESTED[lang].slice(0, 3);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-2xl bg-[#0D6B5E] px-4 py-3 text-white shadow-lg transition-all hover:bg-[#0a5a4e] hover:shadow-xl md:bottom-6"
        style={{ display: open ? "none" : "flex" }}
      >
        <MessageSquare size={16} />
        <span className={`font-semibold ${elderly ? "text-sm" : "text-xs"}`}>
          {TITLES[lang]}
        </span>
        {unread > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-0 right-0 z-50 flex flex-col bg-white md:bottom-6 md:right-6 md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl"
          style={{ width: "100%", maxWidth: 400, height: "min(520px, 85vh)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0D6B5E]/10">
                <Bot size={15} className="text-[#0D6B5E]" />
              </div>
              <div>
                <div className={`font-semibold text-slate-900 ${elderly ? "text-base" : "text-sm"}`}>
                  {TITLES[lang]}
                </div>
                <div className="text-[10px] text-slate-400">
                  {lang === "hi" ? "आपकी रिपोर्ट के बारे में" : lang === "mr" ? "तुमच्या अहवालाबद्दल" : "About your report only"}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <Minimize2 size={13} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                  msg.role === "assistant" ? "bg-[#0D6B5E]/10" : "bg-slate-100"
                }`}>
                  {msg.role === "assistant"
                    ? <Bot size={11} className="text-[#0D6B5E]"/>
                    : <User size={11} className="text-slate-500"/>}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${elderly ? "text-sm" : "text-xs"} leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-slate-50 text-slate-700"
                      : "bg-[#0D6B5E] text-white"
                  }`}
                  style={{ borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0D6B5E]/10">
                  <Bot size={11} className="text-[#0D6B5E]"/>
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-slate-50 px-3 py-2" style={{ borderRadius: "4px 16px 16px 16px" }}>
                  <Loader2 size={11} className="text-slate-400 animate-spin"/>
                  <span className="text-xs text-slate-400">
                    {lang === "hi" ? "सोच रहा हूं..." : lang === "mr" ? "विचार करत आहे..." : "Thinking..."}
                  </span>
                </div>
              </div>
            )}

            {/* Suggested questions — only show at start */}
            {messages.length === 1 && !loading && (
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    className={`w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 transition-colors hover:border-[#0D6B5E] hover:text-[#0D6B5E] ${elderly ? "text-sm" : "text-xs"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 px-3 py-3 flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={PLACEHOLDERS[lang]}
                maxLength={500}
                className={`flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 outline-none focus:border-[#0D6B5E] focus:ring-1 focus:ring-[#0D6B5E]/20 transition-all ${elderly ? "text-sm" : "text-xs"}`}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0D6B5E] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0a5a4e] transition-colors"
              >
                <Send size={13}/>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-slate-400">
              {lang === "hi" ? "केवल आपकी रिपोर्ट के आधार पर जवाब" : lang === "mr" ? "फक्त तुमच्या अहवालावर आधारित उत्तरे" : "Answers based only on your report"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
