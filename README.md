# RAG Prompt Engine

A high-performance, aesthetically pleasing "Prompt Engine" that uses RAG (Retrieval-Augmented Generation) to generate top-tier prompts.

## Prerequisites

- Python 3.8+
- Node.js 18+
- Tesseract OCR (for image ingestion)

## How to Run

### 1. Start the Backend

Open a terminal and run:

```bash
cd backend
# Activate virtual environment
.\venv\Scripts\activate
# Start the server
python main.py
```

The backend will start on `http://localhost:8000`.

### 2. Start the Frontend

Open a new terminal and run:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3001` (or 3000 if available).

## Features

- **Ingestion**: Upload Instagram screenshots or PDFs.
- **Generation**: Ask for prompts based on your knowledge base.
- **Gallery**: View ingested documents.
