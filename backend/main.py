from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import asyncio
import json
import google.generativeai as genai
from contextlib import asynccontextmanager
from auth import auth_handler
from rag_engine import RAGEngine
from ingest import extract_text_from_image, extract_text_from_pdf
from dotenv import load_dotenv
from authlib.integrations.starlette_client import OAuth

# Load environment variables
load_dotenv()

# Initialize RAG Engine
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL environment variable is not set")
rag_engine = RAGEngine(db_url)

async def keep_db_alive():
    while True:
        try:
            rag_engine.keep_alive()
        except Exception as e:
            print(f"Background keep-alive error: {e}")
        await asyncio.sleep(240)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(keep_db_alive())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

# Initialize FastAPI app
app = FastAPI(title="RAG Prompt Engine", lifespan=lifespan)

# Middleware
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "your-secret-key"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
if "GOOGLE_API_KEY" in os.environ:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# OAuth Configuration
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
oauth.register(
    name='github',
    client_id=os.getenv('GITHUB_CLIENT_ID'),
    client_secret=os.getenv('GITHUB_CLIENT_SECRET'),
    access_token_url='https://github.com/login/oauth/access_token',
    access_token_params=None,
    authorize_url='https://github.com/login/oauth/authorize',
    authorize_params=None,
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

# Auth Dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = auth_handler.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = rag_engine.get_user(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"id": user[0], "email": user[1]}

# Models
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class PromptRequest(BaseModel):
    query: str
    model: str = "gemini-1.5-flash"
    mode: str = "engineer" # engineer, critic, direct
    context_files: Optional[List[str]] = None

class RefineRequest(BaseModel):
    current_prompt: str
    instruction: str
    chat_history: List[dict]
    model: str = "gemini-1.5-flash"

# ... (existing code) ...

@app.post("/api/refine")
def refine_prompt(request: RefineRequest, current_user: dict = Depends(get_current_user)):
    try:
        model = genai.GenerativeModel(request.model)
        
        # Format history for context
        history_text = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in request.chat_history[-5:]])
        
        refine_prompt = f"""
        ROLE: You are an expert Prompt Engineer and collaborative assistant.
        
        TASK: 
        1. Analyze the USER'S INSTRUCTION to refine the CURRENT PROMPT.
        2. Rewrite the CURRENT PROMPT to strictly adhere to the instruction.
        3. Provide a brief, helpful response to the user explaining what you changed.
        
        CONTEXT (Chat History):
        {history_text}
        
        CURRENT PROMPT:
        {request.current_prompt}
        
        USER INSTRUCTION:
        {request.instruction}
        
        OUTPUT FORMAT (JSON):
        {{
            "refined_prompt": "The fully rewritten text of the prompt",
            "ai_response": "A brief, friendly message to the user about the changes"
        }}
        """
        
        response = model.generate_content(refine_prompt, generation_config={"response_mime_type": "application/json"})
        result = json.loads(response.text)
        
        return result
    except Exception as e:
        print(f"Refinement Error: {e}")
        return {
            "refined_prompt": request.current_prompt, 
            "ai_response": "I encountered an error while refining. Please try again."
        }

# Auth Routes
@app.get("/api/auth/login/{provider}")
async def login_via_provider(request: Request, provider: str):
    # Force localhost:8000 to avoid mismatch between 127.0.0.1 and localhost
    redirect_uri = f"http://localhost:8000/api/auth/callback/{provider}"
    print(f"DEBUG: Initiating {provider} login with redirect_uri: {redirect_uri}")
    return await oauth.create_client(provider).authorize_redirect(request, redirect_uri)

@app.get("/api/auth/callback/{provider}")
async def auth_callback(request: Request, provider: str):
    token = await oauth.create_client(provider).authorize_access_token(request)
    
    user_email = ""
    if provider == 'google':
        user_info = token.get('userinfo')
        if user_info:
            user_email = user_info.get('email')
    elif provider == 'github':
        resp = await oauth.github.get('user/emails', token=token)
        emails = resp.json()
        for email in emails:
            if email['primary']:
                user_email = email['email']
                break
    
    if not user_email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from provider")

    user = rag_engine.get_user(user_email)
    if not user:
        # Generate a shorter random password (32 hex chars) to fit bcrypt's 72-byte limit
        user_id = rag_engine.create_user(user_email, auth_handler.get_password_hash(os.urandom(16).hex()))
    else:
        user_id = user[0]

    access_token = auth_handler.create_access_token(data={"sub": user_email})
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(url=f"{frontend_url}/?token={access_token}")

@app.post("/api/register")
def register(user: UserCreate):
    existing_user = rag_engine.get_user(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth_handler.get_password_hash(user.password)
    user_id = rag_engine.create_user(user.email, hashed_password)
    
    if not user_id:
        raise HTTPException(status_code=500, detail="Failed to create user")
        
    return {"message": "User created successfully", "user_id": user_id}

@app.post("/api/login")
def login(user: UserLogin):
    db_user = rag_engine.get_user(user.email)
    if not db_user or not auth_handler.verify_password(user.password, db_user[2]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = auth_handler.create_access_token(data={"sub": db_user[1]})
    return {"access_token": access_token, "token_type": "bearer"}

# API Routes
@app.post("/api/generate")
def generate_prompt(request: PromptRequest, current_user: dict = Depends(get_current_user)):
    # 1. Retrieve relevant context
    results = rag_engine.query(request.query, user_id=current_user['id'])
    context = results["documents"][0]
    sources = [m["source"] for m in results["metadatas"][0]]
    
    # 2. Construct prompt with context
    context_str = "\n\n".join(context)
    
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

    full_prompt = f"""
    You are an expert Prompt Engineer. Your goal is to create a highly optimized prompt based on the user's request and the provided context.
    
    USER REQUEST: {request.query}
    
    CONTEXT FROM KNOWLEDGE BASE:
    {context_str}
    
    INSTRUCTIONS:
    - Analyze the user's request and the context.
    - Create a structured prompt (Role, Context, Task, Constraints).
    - If the context is relevant, incorporate it into the generated prompt.
    - If the context is NOT relevant, ignore it.
    """
    
    # 3. Generate response using Gemini
    try:
        model = genai.GenerativeModel(request.model)
        response = model.generate_content(full_prompt)
        generated_prompt = response.text
        
        # 4. Save to history
        rag_engine.save_chat(request.query, generated_prompt, user_id=current_user['id'])
        
        return {"response": generated_prompt, "sources": sources, "context": context}
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"response": "Error generating prompt. Please try again.", "sources": [], "context": []}

@app.post("/api/ingest/text")
def ingest_text(text: str = Form(...), metadata: str = Form(...), current_user: dict = Depends(get_current_user)):
    try:
        meta_dict = json.loads(metadata)
        rag_engine.add_document(text, meta_dict, user_id=current_user['id'])
        return {"message": "Text ingested successfully"}
    except Exception as e:
        return {"message": f"Error: {str(e)}", "error": True}

@app.post("/api/ingest/file")
async def ingest_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content = await file.read()
    chunks = []
    
    if file.content_type.startswith("image/"):
        chunks = extract_text_from_image(content)
    elif file.content_type == "application/pdf":
        chunks = extract_text_from_pdf(content)
        
    if chunks:
        for chunk in chunks:
            rag_engine.add_document(
                chunk["text"], 
                {
                    "source": file.filename, 
                    "type": "file", 
                    "page": chunk["metadata"]["page"]
                },
                user_id=current_user['id']
            )
        return {
            "message": f"File {file.filename} ingested successfully ({len(chunks)} pages/chunks)", 
            "extracted_text_preview": chunks[0]["text"][:100] if chunks else ""
        }
    else:
        return {"message": "Failed to extract text", "error": True} 

@app.get("/api/documents")
def list_documents(limit: int = 100, current_user: dict = Depends(get_current_user)):
    return rag_engine.list_documents(user_id=current_user['id'], limit=limit)

@app.get("/api/history")
def get_history(limit: int = 50, current_user: dict = Depends(get_current_user)):
    return rag_engine.get_chat_history(user_id=current_user['id'], limit=limit)

@app.get("/api/history/{chat_id}")
def get_chat_item(chat_id: int, current_user: dict = Depends(get_current_user)):
    item = rag_engine.get_chat_item(chat_id=chat_id, user_id=current_user['id'])
    if not item:
        raise HTTPException(status_code=404, detail="Chat item not found")
    return item

@app.get("/")
def read_root():
    return {"message": "RAG Prompt Engine API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
