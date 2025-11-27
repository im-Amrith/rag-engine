from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os

app = FastAPI(title="RAG Prompt Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    query: str
    context_files: Optional[List[str]] = None

@app.get("/")
def read_root():
    return {"message": "RAG Prompt Engine API is running"}

from rag_engine import rag_engine
from ingest import extract_text_from_image, extract_text_from_pdf

import google.generativeai as genai
import os

# Configure Gemini API
if "GOOGLE_API_KEY" in os.environ:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

class PromptRequest(BaseModel):
    query: str
    model: str = "gemini-1.5-flash"
    mode: str = "engineer" # engineer, critic, direct
    context_files: Optional[List[str]] = None

# Simple in-memory chat history (Global for now, ideally per session)
chat_history = []

@app.post("/api/generate")
def generate_prompt(request: PromptRequest):
    # Retrieve relevant context
    results = rag_engine.query(request.query)
    context_docs = results['documents'][0] if results['documents'] else []
    context_metadatas = results['metadatas'][0] if results['metadatas'] else []
    
    context_text = "\n\n".join(context_docs)
    
    # Extract unique sources
    sources = list(set([m.get('source', 'Unknown') for m in context_metadatas]))

    # Define System Prompts based on Mode
    system_instructions = {
        "engineer": """
ROLE: You are an expert Prompt Engineer and Research Assistant.
TASK: The user will provide a goal or a rough question. You must rewrite this into a highly effective, detailed, and structured prompt that will get the best possible results from a Large Language Model.
GUIDELINES:
1. Do not just repeat the user's input.
2. Add specific instructions for formatting.
3. If the user mentions "Knowledge Base", explicitly instruct the model to "Search the vector database thoroughly".
4. Use advanced prompting techniques like Chain of Thought.
INPUT: {user_input}
OUTPUT: [Only the optimized prompt]
""",
        "critic": """
ROLE: You are a Critical Reviewer.
TASK: Analyze the user's request and the provided context. Identify gaps, vague terms, or potential misunderstandings.
GUIDELINES:
1. Be constructive but strict.
2. Point out what is missing from the user's request.
3. Suggest specific improvements.
INPUT: {user_input}
OUTPUT: [Critique and Suggestions]
""",
        "direct": """
ROLE: You are a Knowledge Base Assistant.
TASK: Answer the user's question directly using ONLY the provided context.
GUIDELINES:
1. Do not hallucinate. If the answer isn't in the context, say so.
2. Cite the specific documents (e.g., [Source: filename]) when making claims.
INPUT: {user_input}
OUTPUT: [Direct Answer]
"""
    }

    selected_instruction = system_instructions.get(request.mode, system_instructions["engineer"])

    if not context_text:
        context_text = "No specific documents found in knowledge base."

    # Format history
    history_text = "\n".join([f"User: {h['user']}\nAI: {h['ai']}" for h in chat_history[-5:]])

    full_prompt = f"""
Context from Knowledge Base:
{context_text}

Chat History:
{history_text}

User Input: {request.query}
"""

    try:
        if "GOOGLE_API_KEY" not in os.environ:
             return {
                "response": "⚠️ API Key Missing. Please set GOOGLE_API_KEY environment variable.\n\nSystem Prompt:\n" + selected_instruction,
                "context": context_docs,
                "sources": sources
            }

        # Use selected model (sanitize input slightly to avoid injection, though low risk here)
        valid_models = [
            "gemini-1.5-flash", "gemini-1.5-pro", 
            "gemini-2.0-flash", "gemini-2.0-flash-lite",
            "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"
        ]
        model_name = request.model if request.model in valid_models else "gemini-1.5-flash"
        
        model = genai.GenerativeModel(model_name)
        
        final_prompt = f"{selected_instruction}\n\n{full_prompt}"
        
        response = model.generate_content(final_prompt)
        generated_text = response.text
        
        # Update history
        chat_history.append({"user": request.query, "ai": generated_text})
        
        return {
            "response": generated_text,
            "context": context_docs, # For "Inspect Brain"
            "sources": sources
        }
    except Exception as e:
        print(f"Error generating content: {e}")
        return {
            "response": f"Error generating prompt: {str(e)}",
            "context": context_docs,
            "sources": sources
        }

@app.post("/api/ingest/text")
def ingest_text(text: str = Form(...), source: str = Form(...)):
    rag_engine.add_document(text, {"source": source, "type": "text"})
    return {"message": "Text ingested successfully"}

@app.post("/api/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    content = await file.read()
    chunks = []
    
    if file.content_type.startswith("image/"):
        chunks = extract_text_from_image(content)
    elif file.content_type == "application/pdf":
        chunks = extract_text_from_pdf(content)
    else:
        return {"message": "Unsupported file type", "error": True}
        
    if chunks:
        for chunk in chunks:
            rag_engine.add_document(
                chunk["text"], 
                {
                    "source": file.filename, 
                    "type": file.content_type,
                    "page": chunk["metadata"]["page"]
                }
            )
        return {
            "message": f"File {file.filename} ingested successfully ({len(chunks)} pages/chunks)", 
            "extracted_text_preview": chunks[0]["text"][:100] if chunks else ""
        }
    else:
        return {"message": "Failed to extract text", "error": True}

@app.get("/api/documents")
def list_documents(limit: int = 100):
    return rag_engine.list_documents(limit=limit)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
