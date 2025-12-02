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

# 🧠 RAG Prompt Engine

A high-performance, aesthetically pleasing Prompt Engineering platform powered by Retrieval-Augmented Generation (RAG). This tool helps you craft the perfect prompts for Large Language Models by leveraging your own knowledge base.

## ✨ Key Features

*   **RAG-Powered Generation:** Upload your own documents (PDFs, Images, Text) to create a custom knowledge base. The engine uses this context to generate highly specific and relevant prompts.
*   **Multi-Model Support:** Choose from the latest Gemini models to suit your speed and intelligence needs.
*   ** specialized Modes:** Switch between different personas (Engineer, Critic, Direct) to get the exact output you need.
*   **Voice Input:** Dictate your prompt ideas directly into the app for a seamless workflow.
*   **Interactive Refinement:** Don't settle for the first draft. Use the built-in chat workspace to iteratively refine and polish your prompts with the AI.
*   **Chat History:** Access your previous sessions and pick up right where you left off.
*   **Secure Authentication:** Support for Email/Password registration as well as Google and GitHub OAuth.
*   **Modern UI:** A stunning, responsive interface featuring glassmorphism, animated backgrounds, and smooth transitions.

## 🤖 Available Models

Select the best model for your task:

*   **Gemini 2.5 Pro (Thinking):** High-reasoning model for complex prompt architecture.
*   **Gemini 2.5 Flash (Best Value):** The perfect balance of speed and intelligence.
*   **Gemini 2.5 Flash-Lite (Fastest):** Ultra-fast generation for quick iterations.
*   **Gemini 2.0 Flash:** Previous generation speed-optimized model.
*   **Gemini 1.5 Pro:** High-context window model for massive knowledge bases.
*   **Gemini 1.5 Flash:** Efficient and capable standard model.

## 🎭 Generation Modes

*   **🛠️ Prompt Engineer:**
    *   **Goal:** Create the ultimate prompt.
    *   **Behavior:** Rewrites your rough input into a structured, highly effective prompt using advanced techniques like Chain of Thought. It explicitly instructs the model on formatting and how to use the knowledge base.

*   **🧐 Critic Mode:**
    *   **Goal:** Improve your thinking.
    *   **Behavior:** Acts as a critical reviewer. It analyzes your request and the provided context to identify gaps, vague terms, or potential misunderstandings. It offers constructive feedback rather than just writing the prompt for you.

*   **💡 Direct Answer:**
    *   **Goal:** Get answers fast.
    *   **Behavior:** Acts as a Knowledge Base Assistant. It answers your question directly using **ONLY** the provided context, citing specific documents and pages. Perfect for extracting information without generating a prompt.

## 🎙️ Voice Input

Press the microphone icon in the input bar to activate voice recognition. Speak your request naturally, and the engine will transcribe it in real-time.

## 🛠️ Tech Stack

*   **Frontend:** Next.js 15, React 19, TailwindCSS, Framer Motion, Three.js (for animated backgrounds).
*   **Backend:** FastAPI, Python, Google Generative AI (Gemini), PostgreSQL (pgvector) for vector storage.
*   **Authentication:** Authlib (OAuth), Passlib (bcrypt).
*   **Deployment:** Netlify (Frontend), Hugging Face Spaces (Backend).

## 🚀 Getting Started

1.  **Clone the repository.**
2.  **Backend Setup:**
    *   Navigate to `/backend`.
    *   Install dependencies: `pip install -r requirements.txt`.
    *   Set up `.env` with API keys and Database URL.
    *   Run: `python main.py`.
3.  **Frontend Setup:**
    *   Navigate to `/frontend`.
    *   Install dependencies: `npm install`.
    *   Set up `.env.local` with `NEXT_PUBLIC_API_URL`.
    *   Run: `npm run dev`.
