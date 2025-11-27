"use client";

import { useState } from "react";
import { getApiUrl } from "../utils/api";
import UploadZone from "@/components/UploadZone";
import InspirationGallery from "@/components/InspirationGallery";
import Navbar from "@/components/Navbar";
import FloatingLines from "@/components/FloatingLines";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search } from "lucide-react";
export default function Home() {
  const [activeView, setActiveView] = useState<"generator" | "knowledge">("generator");

  // Generator State
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [context, setContext] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [mode, setMode] = useState("engineer");
  const [showContext, setShowContext] = useState(false);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    setSources([]);
    setContext([]);

    try {
      const res = await fetch(getApiUrl("/api/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, model, mode }),
      });
      const data = await res.json();
      setResponse(data.response);
      setSources(data.sources || []);
      setContext(data.context || []);
    } catch (error) {
      console.error("Error generating prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-hidden relative">
      <AnimatePresence>
        {activeView === "generator" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-0"
          >
            <FloatingLines />
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar activeView={activeView} setActiveView={setActiveView} />

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

                {/* Result Area */}
                <AnimatePresence>
                  {response && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: "auto", scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      className="bg-zinc-900/50 border border-white/10 rounded-xl p-8 overflow-hidden"
                    >
                      <h3 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">Result</h3>
                      <div className="prose prose-invert max-w-none mb-6">
                        <p className="text-lg leading-relaxed whitespace-pre-wrap">{response}</p>
                      </div>

                      {/* Sources & Context */}
                      <div className="border-t border-zinc-800 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Sources Used</span>
                          <button
                            onClick={() => setShowContext(!showContext)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {showContext ? "Hide Context" : "Inspect Context"}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {sources.length > 0 ? (
                            sources.map((source, i) => (
                              <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md border border-zinc-700">
                                {source}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-600 italic">No specific sources cited.</span>
                          )}
                        </div>

                        <AnimatePresence>
                          {showContext && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-black/50 rounded-lg p-4 text-xs text-zinc-400 font-mono overflow-x-auto max-h-60 overflow-y-auto"
                            >
                              {context.map((ctx, i) => (
                                <div key={i} className="mb-4 last:mb-0 border-b border-zinc-800 last:border-0 pb-2 last:pb-0">
                                  <div className="text-zinc-500 mb-1">Chunk {i + 1}</div>
                                  {ctx}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
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
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

