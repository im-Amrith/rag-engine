"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { getApiUrl, getAuthHeaders } from "../utils/api";
import UploadZone from "@/components/UploadZone";
import InspirationGallery from "@/components/InspirationGallery";
import Navbar from "@/components/Navbar";
import FloatingLines from "@/components/FloatingLines";
import HistoryView from "@/components/HistoryView";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, ArrowLeft, Copy, Send, RefreshCw, Mic, MicOff, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

function HomeContent() {
  const [activeView, setActiveView] = useState<"generator" | "knowledge" | "history">("generator");
  const router = useRouter();

  useEffect(() => {
    // Check for token in URL (OAuth callback)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        localStorage.setItem('token', token);
        // Clear query params using router to be safe
        router.replace("/");
      }
    }

    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  // Generator State
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [context, setContext] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [mode, setMode] = useState("engineer");
  const [showContext, setShowContext] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Workspace State
  const [isGenerated, setIsGenerated] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([
    { role: "ai", content: "I've generated a draft based on your request. How would you like to refine it?" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    setSources([]);
    setContext([]);

    try {
      const res = await fetch(getApiUrl("/api/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ query, model, mode }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      setResponse(data.response);
      setSources(data.sources || []);
      setContext(data.context || []);
      setIsGenerated(true); // Switch to Workspace view
    } catch (error) {
      console.error("Error generating prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true; // Enable real-time results
    recognition.lang = "en-US";

    const startQuery = query; // Capture current text

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      setQuery(startQuery + (startQuery && transcript ? " " : "") + transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  const handleRefine = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");

    // Add user message to chat immediately
    const newHistory = [...chatHistory, { role: "user", content: userMessage }];
    setChatHistory(newHistory);

    try {
      const res = await fetch(getApiUrl("/api/refine"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          current_prompt: response,
          instruction: userMessage,
          chat_history: newHistory,
          model: model
        }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();

      // Update chat with AI response
      setChatHistory(prev => [...prev, { role: "ai", content: data.ai_response }]);

      // Update the prompt editor
      setResponse(data.refined_prompt);

    } catch (error) {
      console.error("Error refining prompt:", error);
      setChatHistory(prev => [...prev, { role: "ai", content: "Sorry, I couldn't refine the prompt. Please try again." }]);
    }
  };

  // --- WORKSPACE VIEW (Split Pane) ---
  if (isGenerated && activeView === "generator") {
    return (
      <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
        {/* Workspace Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGenerated(false)}
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <span className="font-mono font-bold text-lg tracking-tight">Prompt Workspace</span>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Mode: Refinement
            </span>
          </div>
        </header>

        {/* Main Split Layout */}
        <main className="flex-1 flex overflow-hidden relative z-10">

          {/* LEFT PANE: The Master Prompt (Editor) */}
          <div className="flex-1 border-r border-zinc-800 flex flex-col bg-zinc-900/30 backdrop-blur-sm relative">
            {/* Background for Left Pane */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
              <FloatingLines
                color1="#2F4BA2"
                color2="#E947F5"
                lineCount={[2]}
                animationSpeed={0.2}
              />
            </div>

            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 z-10">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Master Prompt
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(response || "")}
                className="text-zinc-400 hover:text-white flex items-center gap-2 text-xs hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <textarea
              value={response || ""}
              onChange={(e) => setResponse(e.target.value)}
              className="flex-1 w-full bg-transparent p-8 outline-none font-mono text-sm leading-relaxed resize-none text-zinc-300 z-10 focus:bg-zinc-900/50 transition-colors"
              spellCheck="false"
            />
          </div>

          {/* RIGHT PANE: The Assistant (Chat) */}
          <div className="w-[400px] flex flex-col bg-black border-l border-zinc-800 z-20 shadow-2xl">
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-zinc-800 text-white'
                    : 'bg-indigo-900/20 text-indigo-200 border border-indigo-500/20'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                  placeholder="Refine this prompt..."
                  className="flex-1 bg-black border border-zinc-700 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors text-white placeholder:text-zinc-600"
                />
                <button
                  onClick={handleRefine}
                  className="bg-white text-black p-2 rounded-md hover:bg-zinc-200 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </main>
      </div>
    );
  }

  const handleContinueChat = async (chatId: number) => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/history/${chatId}`), {
        headers: getAuthHeaders()
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();

      // Set the workspace state
      setResponse(data.ai);
      setChatHistory([
        { role: "user", content: data.user },
        { role: "ai", content: data.ai }
      ]);

      // Switch to workspace view
      setIsGenerated(true);
      setActiveView("generator");

    } catch (error) {
      console.error("Error fetching chat item:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HERO VIEW (Original) ---
  return (
    <main className="min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {activeView === "generator" && (
          <motion.div
            key="generator-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-0"
          >
            <FloatingLines />
          </motion.div>
        )}
        {activeView === "history" && (
          <motion.div
            key="history-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-0"
          >
            <FloatingLines
              color1="#FFD700" // Gold
              color2="#FFA500" // Orange
              enabledWaves={['top', 'bottom']}
              lineCount={[3, 3]}
              animationSpeed={0.5}
              brightness={1.2}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar activeView={activeView} setActiveView={setActiveView} />

      {/* Logout Button */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={handleLogout}
          className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-32 pb-20 relative z-10">
        <AnimatePresence mode="wait">
          {activeView === "generator" ? (
            <motion.div
              key="generator"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 relative z-10">
                <h1 className="text-5xl md:text-7xl font-bold font-mono text-white tracking-tighter">
                  Prompt Engine
                </h1>
                <p className="text-lg text-zinc-400 max-w-xl mx-auto">
                  Craft perfect prompts using RAG-powered insights.
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-8">
                {/* Controls */}
                <div className="flex flex-wrap justify-center gap-4">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Thinking)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Best Value)</option>
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Fastest)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </select>

                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="engineer">Prompt Engineer</option>
                    <option value="critic">Critic Mode</option>
                    <option value="direct">Direct Answer</option>
                  </select>
                </div>

                {/* Input Area */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative bg-zinc-900 rounded-xl p-2 flex items-center gap-2 ring-1 ring-white/10">
                    <Search className="w-6 h-6 text-zinc-500 ml-3" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Describe the prompt you need..."
                      className="flex-1 bg-transparent border-none outline-none text-lg px-4 py-3 text-white placeholder:text-zinc-600"
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    />
                    <button
                      onClick={handleVoiceInput}
                      className={`p-2 rounded-full transition-all duration-300 ${isListening
                        ? "bg-red-500/20 text-red-500 animate-pulse"
                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                        }`}
                      title="Voice Input"
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        "Thinking..."
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Generate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeView === "knowledge" ? (
            <motion.div
              key="knowledge"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-white tracking-tight">Knowledge Base</h2>
                <p className="text-zinc-400 max-w-xl mx-auto">
                  Manage your documents and sources.
                </p>
              </div>

              <div className="max-w-4xl mx-auto space-y-12">
                <section>
                  <UploadZone />
                </section>

                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-zinc-800"></div>
                    <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Your Library</span>
                    <div className="h-px flex-1 bg-zinc-800"></div>
                  </div>
                  <InspirationGallery />
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-white tracking-tight">Chat History</h2>
                <p className="text-zinc-400 max-w-xl mx-auto">
                  Review your previous prompts and generations.
                </p>
              </div>
              <div>
                <HistoryView onContinue={handleContinueChat} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
