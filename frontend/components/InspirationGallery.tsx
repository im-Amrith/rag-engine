"use client";

import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { getApiUrl } from "../utils/api";

interface Doc {
    id: string;
    metadata: {
        source: string;
        type: string;
    };
    preview: string;
}

export default function InspirationGallery() {
    const [docs, setDocs] = useState<Doc[]>([]);

    const fetchDocs = async () => {
        try {
            const res = await fetch(getApiUrl("/api/documents"));
            const data = await res.json();
            setDocs(data.documents || []);
        } catch (e) {
            console.error("Failed to fetch docs", e);
        }
    };

    useEffect(() => {
        fetchDocs();
        // Poll every 5 seconds to update after upload
        const interval = setInterval(fetchDocs, 5000);
        return () => clearInterval(interval);
    }, []);

    if (docs.length === 0) return null;

    return (
        <div className="mt-12">
            <h3 className="text-xl font-semibold mb-4 text-zinc-300">Knowledge Base ({docs.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                    <div key={doc.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg hover:border-zinc-600 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
                            {doc.metadata.type?.includes("image") ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            <span className="truncate">{doc.metadata.source}</span>
                        </div>
                        <p className="text-zinc-500 text-xs line-clamp-3">{doc.preview}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
