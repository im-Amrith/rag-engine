"use client";

import { useEffect, useState } from "react";
import { Clock, User, Bot, ChevronDown } from "lucide-react";
import { getApiUrl } from "../utils/api";

interface ChatLog {
    user: string;
    ai: string;
    timestamp: string;
}

export default function HistoryView() {
    const [history, setHistory] = useState<ChatLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(getApiUrl("/api/history"));
                const data = await res.json();
                setHistory(data || []);
            } catch (e) {
                console.error("Failed to fetch history", e);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const toggleExpand = (idx: number) => {
        setExpandedId(expandedId === idx ? null : idx);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-zinc-500">
                <Clock className="w-5 h-5 animate-spin mr-2" /> Loading history...
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-20 text-zinc-500">
                <p>No chat history found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto mt-8 space-y-8 pb-20">
            <h3 className="text-xl font-semibold text-zinc-300 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Recent Conversations
            </h3>

            <div className="space-y-4">
                {history.map((chat, idx) => {
                    const isExpanded = expandedId === idx;
                    return (
                        <div
                            key={idx}
                            className={`bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-blue-500/20' : 'hover:border-zinc-700'}`}
                        >
                            <button
                                onClick={() => toggleExpand(idx)}
                                className="w-full p-6 flex items-start gap-4 text-left hover:bg-zinc-800/30 transition-colors"
                            >
                                <div className="p-2 bg-zinc-800 rounded-lg shrink-0">
                                    <User className="w-4 h-4 text-zinc-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-zinc-300 text-sm leading-relaxed line-clamp-2 font-medium">
                                        {chat.user}
                                    </p>
                                    <p className="text-xs text-zinc-600 mt-2">
                                        {new Date(chat.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-zinc-800' : ''}`}>
                                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="w-full h-px bg-zinc-800/50 mb-6" />

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                                            <Bot className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{chat.ai}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
