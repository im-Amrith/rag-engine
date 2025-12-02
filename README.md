# ⚡ RAG Prompt Engine

<div align="center">

![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_15-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.0-8E75B2?style=flat-square&logo=google)

**A high-performance, aesthetically pleasing Prompt Engineering platform powered by Retrieval-Augmented Generation (RAG).**

[Live Demo](https://rag-engine0.netlify.app/) · [Report Bug](https://github.com/yourusername/repo/issues) · [Request Feature](https://github.com/yourusername/repo/issues)

</div>

---

## 📖 Overview

**RAG Prompt Engine** is a sophisticated workspace designed to bridge the gap between human intent and LLM understanding. By leveraging a custom knowledge base (PDFs, Images, Text), this tool generates highly context-aware prompts that outperform generic inputs.

It features a modern, "Antigravity" aesthetic with glassmorphism UI, real-time voice input, and a dual-pane workspace for iterative refinement.

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🧠 RAG Intelligence** | Upload custom documents (PDF, TXT, IMG) to ground the AI's generation in your specific data. |
| **🗣️ Voice Input** | Dictate complex ideas naturally. The engine transcribes and structures your thoughts in real-time. |
| **🧪 Prompt Lab** | A split-pane IDE to generate, test, and refining prompts with an AI "Co-pilot" chat. |
| **🎭 Specialized Personas** | Switch between **Engineer**, **Critic**, and **Direct Answer** modes to get the exact output style you need. |
| **🔐 Secure Auth** | Enterprise-ready authentication via Google, GitHub, or Email/Password (OAuth + JWT). |
| **🎨 Modern UX** | Built with Framer Motion and Three.js for a fluid, responsive, and visually stunning experience. |

## 🤖 Supported Models

The engine supports dynamic model switching to balance cost, speed, and reasoning capabilities:

* **Gemini 2.5 Pro (Thinking):** High-reasoning model for complex prompt architecture.
* **Gemini 2.5 Flash:** The perfect balance of latency and intelligence.
* **Gemini 2.5 Flash-Lite:** Ultra-fast generation for rapid prototyping.
* **Gemini 1.5 Pro/Flash:** Standard models for high-context tasks.

## 🛠️ Technical Architecture

### Tech Stack

* **Frontend:** Next.js 15, React 19, TailwindCSS, Framer Motion, Lucide Icons.
* **Backend:** FastAPI (Python), Uvicorn.
* **AI & ML:** Google Generative AI (Gemini), LangChain.
* **Database:** PostgreSQL (Neon) with `pgvector` extension for semantic search.
* **Infrastructure:** Netlify (Frontend), Hugging Face Spaces (Backend/Docker).

### System Flow
```mermaid
graph LR
    A[User Input/Voice] --> B(Next.js Frontend)
    B --> C{FastAPI Backend}
    C --> D[Vector DB (Neon)]
    C --> E[Gemini LLM]
    D -.->|Retrieve Context| C
    E -->|Generate Prompt| B
