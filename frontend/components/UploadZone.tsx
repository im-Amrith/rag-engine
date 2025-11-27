"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getApiUrl } from "../utils/api";

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function UploadZone() {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        acceptedFiles.forEach((file) => {
            formData.append("file", file);
        });

        try {
            const response = await fetch(getApiUrl("/api/ingest/file"), {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ text: `Successfully uploaded ${acceptedFiles.length} file(s)!`, type: "success" });
            } else {
                setMessage({ text: data.message || "Upload failed", type: "error" });
            }
        } catch (error) {
            setMessage({ text: "Error uploading file.", type: "error" });
        } finally {
            setUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
            'application/pdf': ['.pdf']
        }
    });

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-xl p-10 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4",
                    isDragActive
                        ? "border-blue-500 bg-blue-50/10"
                        : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
                )}
            >
                <input {...getInputProps()} />
                <div className="p-4 rounded-full bg-zinc-800">
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    ) : (
                        <Upload className="w-8 h-8 text-zinc-400" />
                    )}
                </div>
                <div className="text-center">
                    <p className="text-lg font-medium text-zinc-200">
                        {isDragActive ? "Drop files here" : "Click or drag to upload"}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                        Supports Images (OCR) and PDFs
                    </p>
                </div>
            </div>

            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={cn(
                            "mt-4 p-4 rounded-lg text-sm font-medium text-center",
                            message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
