import os
import psycopg2
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from typing import List, Dict
import json
import urllib.parse

load_dotenv()

class RAGEngine:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable is not set")
        
        try:
            self.conn = psycopg2.connect(self.db_url)
        except Exception as e:
            print(f"Direct connection failed: {e}, attempting manual parsing...")
            url = urllib.parse.urlparse(self.db_url)
            self.conn = psycopg2.connect(
                dbname=url.path[1:],
                user=url.username,
                password=url.password,
                host=url.hostname,
                port=url.port,
                sslmode='require'
            )
        self.conn.autocommit = True
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self._init_db()

    def _init_db(self):
        with self.conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    content TEXT,
                    metadata JSONB,
                    embedding vector(384)
                );
                CREATE TABLE IF NOT EXISTS chat_history (
                    id SERIAL PRIMARY KEY,
                    user_message TEXT,
                    ai_message TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

    def add_document(self, text: str, metadata: Dict):
        embedding = self.model.encode(text).tolist()
        
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO documents (content, metadata, embedding)
                VALUES (%s, %s, %s)
            """, (text, json.dumps(metadata), embedding))

    def query(self, query_text: str, n_results: int = 5):
        query_embedding = self.model.encode(query_text).tolist()
        
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT content, metadata, 1 - (embedding <=> %s::vector) as similarity
                FROM documents
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (query_embedding, query_embedding, n_results))
            
            rows = cur.fetchall()
            
            results = {
                "documents": [[row[0] for row in rows]],
                "metadatas": [[row[1] for row in rows]],
                "distances": [[1 - row[2] for row in rows]]
            }
            return results

    def list_documents(self, limit: int = 100):
        with self.conn.cursor() as cur:
            # Get total unique documents (files)
            cur.execute("SELECT count(DISTINCT metadata->>'source') FROM documents")
            count = cur.fetchone()[0]
            
            # Get unique documents by source
            cur.execute("""
                SELECT DISTINCT ON (metadata->>'source') 
                    id, 
                    metadata, 
                    left(content, 200) 
                FROM documents 
                LIMIT %s
            """, (limit,))
            
            rows = cur.fetchall()
            
            docs = []
            for row in rows:
                docs.append({
                    "id": row[0],
                    "metadata": row[1],
                    "preview": row[2] + "..."
                })
            return {"count": count, "documents": docs}

    def save_chat(self, user_message: str, ai_message: str):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO chat_history (user_message, ai_message)
                VALUES (%s, %s)
            """, (user_message, ai_message))

    def get_chat_history(self, limit: int = 50):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT user_message, ai_message, timestamp 
                FROM chat_history 
                ORDER BY timestamp DESC 
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            return [
                {"user": row[0], "ai": row[1], "timestamp": row[2].isoformat()} 
                for row in rows
            ]

    def keep_alive(self):
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT 1")
            print("Pinged DB to keep alive")
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")

rag_engine = RAGEngine()
