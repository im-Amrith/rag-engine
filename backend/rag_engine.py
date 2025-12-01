import os
import psycopg2
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from typing import List, Dict
import json
import urllib.parse

load_dotenv()

class RAGEngine:
    def __init__(self, db_url=None):
        self.db_url = db_url or os.getenv("DATABASE_URL")
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
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    content TEXT,
                    metadata JSONB,
                    embedding vector(384)
                );
                CREATE TABLE IF NOT EXISTS chat_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    user_message TEXT,
                    ai_message TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            # Auto-migration for existing tables
            try:
                cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")
                cur.execute("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")
            except Exception as e:
                print(f"Migration warning: {e}")

    def create_user(self, email, hashed_password):
        with self.conn.cursor() as cur:
            try:
                cur.execute("INSERT INTO users (email, hashed_password) VALUES (%s, %s) RETURNING id", (email, hashed_password))
                return cur.fetchone()[0]
            except psycopg2.IntegrityError:
                self.conn.rollback()
                return None

    def get_user(self, email):
        with self.conn.cursor() as cur:
            cur.execute("SELECT id, email, hashed_password FROM users WHERE email = %s", (email,))
            return cur.fetchone()

    def add_document(self, text: str, metadata: Dict, user_id: int):
        embedding = self.model.encode(text).tolist()
        
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO documents (content, metadata, embedding, user_id)
                VALUES (%s, %s, %s, %s)
            """, (text, json.dumps(metadata), embedding, user_id))

    def query(self, query_text: str, user_id: int, n_results: int = 5):
        query_embedding = self.model.encode(query_text).tolist()
        
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT content, metadata, 1 - (embedding <=> %s::vector) as similarity
                FROM documents
                WHERE user_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (query_embedding, user_id, query_embedding, n_results))
            
            rows = cur.fetchall()
            
            results = {
                "documents": [[row[0] for row in rows]],
                "metadatas": [[row[1] for row in rows]],
                "distances": [[1 - row[2] for row in rows]]
            }
            return results

    def list_documents(self, user_id: int, limit: int = 100):
        with self.conn.cursor() as cur:
            # Get total unique documents (files)
            cur.execute("SELECT count(DISTINCT metadata->>'source') FROM documents WHERE user_id = %s", (user_id,))
            count = cur.fetchone()[0]
            
            # Get unique documents by source
            cur.execute("""
                SELECT DISTINCT ON (metadata->>'source') 
                    id, 
                    metadata, 
                    left(content, 200) 
                FROM documents 
                WHERE user_id = %s
                LIMIT %s
            """, (user_id, limit,))
            
            rows = cur.fetchall()
            
            docs = []
            for row in rows:
                docs.append({
                    "id": row[0],
                    "metadata": row[1],
                    "preview": row[2] + "..."
                })
            return {"count": count, "documents": docs}

    def save_chat(self, user_message: str, ai_message: str, user_id: int):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO chat_history (user_message, ai_message, user_id)
                VALUES (%s, %s, %s)
            """, (user_message, ai_message, user_id))

    def get_chat_history(self, user_id: int, limit: int = 50):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT id, user_message, ai_message, timestamp 
                FROM chat_history 
                WHERE user_id = %s
                ORDER BY timestamp DESC 
                LIMIT %s
            """, (user_id, limit))
            rows = cur.fetchall()
            return [
                {"id": row[0], "user": row[1], "ai": row[2], "timestamp": row[3].isoformat()} 
                for row in rows
            ]

    def get_chat_item(self, chat_id: int, user_id: int):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT id, user_message, ai_message, timestamp
                FROM chat_history
                WHERE id = %s AND user_id = %s
            """, (chat_id, user_id))
            row = cur.fetchone()
            if row:
                return {"id": row[0], "user": row[1], "ai": row[2], "timestamp": row[3].isoformat()}
            return None

    def keep_alive(self):
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT 1")
            print("Pinged DB to keep alive")
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")

rag_engine = RAGEngine()
