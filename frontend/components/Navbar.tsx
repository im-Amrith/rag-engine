import { motion } from "framer-motion";
import { Sparkles, Database } from "lucide-react";

interface NavbarProps {
    activeView: "generator" | "knowledge";
    setActiveView: (view: "generator" | "knowledge") => void;
}

export default function Navbar({ activeView, setActiveView }: NavbarProps) {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full p-1.5 flex items-center gap-1 shadow-2xl shadow-black/50">
                <button
                    onClick={() => setActiveView("generator")}
                    className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 flex items-center gap-2 ${activeView === "generator" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                >
                    {activeView === "generator" && (
                        <motion.div
                            layoutId="nav-pill"
                            className="absolute inset-0 bg-zinc-800 rounded-full border border-white/5"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Generator
                    </span>
                </button>

                <button
                    onClick={() => setActiveView("knowledge")}
                    className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 flex items-center gap-2 ${activeView === "knowledge" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                >
                    {activeView === "knowledge" && (
                        <motion.div
                            layoutId="nav-pill"
                            className="absolute inset-0 bg-zinc-800 rounded-full border border-white/5"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        <Database className="w-4 h-4" /> Knowledge Base
                    </span>
                </button>
            </div>
        </div>
    );
}
