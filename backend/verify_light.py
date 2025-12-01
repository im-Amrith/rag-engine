import requests
import os
import psycopg2
from dotenv import load_dotenv
import json
import time
from datetime import datetime

load_dotenv()

BASE_URL = "http://localhost:8000"
EMAIL = "test_light@example.com"
PASSWORD_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" # "password"
DB_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    try:
        return psycopg2.connect(DB_URL)
    except:
        # Try parsing if direct fails (copied from rag_engine.py logic)
        import urllib.parse
        url = urllib.parse.urlparse(DB_URL)
        return psycopg2.connect(
            dbname=url.path[1:],
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port,
            sslmode='require'
        )

def verify():
    print("Connecting to DB...")
    conn = get_db_connection()
    conn.autocommit = True
    cur = conn.cursor()
    
    # 1. Create User directly in DB
    print("Creating user...")
    cur.execute("SELECT id FROM users WHERE email = %s", (EMAIL,))
    row = cur.fetchone()
    if row:
        user_id = row[0]
    else:
        cur.execute("INSERT INTO users (email, hashed_password) VALUES (%s, %s) RETURNING id", (EMAIL, PASSWORD_HASH))
        user_id = cur.fetchone()[0]
    
    # 2. Insert Chat History
    print("Inserting chat history...")
    cur.execute("""
        INSERT INTO chat_history (user_message, ai_message, user_id, timestamp)
        VALUES (%s, %s, %s, NOW())
        RETURNING id
    """, ("Light User Msg", "Light AI Msg", user_id))
    chat_id = cur.fetchone()[0]
    print(f"Inserted chat ID: {chat_id}")
    
    # 3. Login to get token (using API)
    # We need to register first via API? No, we inserted into DB.
    # But we need to make sure the password matches. I used a hash for "password".
    # Let's try to login.
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/login", json={"email": EMAIL, "password": "password"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        # Maybe the hash algorithm is different or salt.
        # Let's just register via API to be safe, then insert chat.
        # But registration might fail if user exists.
        # Let's delete user first.
        cur.execute("DELETE FROM chat_history WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM documents WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        print("Deleted old user data.")
        
        # Register via API
        print("Registering via API...")
        resp = requests.post(f"{BASE_URL}/api/register", json={"email": EMAIL, "password": "password"})
        if resp.status_code != 200:
            print(f"Registration failed: {resp.text}")
            return
        
        # Login
        resp = requests.post(f"{BASE_URL}/api/login", json={"email": EMAIL, "password": "password"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return
            
        # Get user_id again
        cur.execute("SELECT id FROM users WHERE email = %s", (EMAIL,))
        user_id = cur.fetchone()[0]
        
        # Insert chat again
        cur.execute("""
            INSERT INTO chat_history (user_message, ai_message, user_id, timestamp)
            VALUES (%s, %s, %s, NOW())
            RETURNING id
        """, ("Light User Msg", "Light AI Msg", user_id))
        chat_id = cur.fetchone()[0]
        print(f"Inserted chat ID: {chat_id}")

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 4. Get History
    print("Fetching history...")
    resp = requests.get(f"{BASE_URL}/api/history", headers=headers)
    if resp.status_code != 200:
        print(f"Get history failed: {resp.text}")
        return
    
    history = resp.json()
    found = False
    for item in history:
        if item["id"] == chat_id:
            found = True
            break
    
    if not found:
        print(f"FAIL: Chat ID {chat_id} not found in history")
        return
    
    # 5. Get Specific Chat Item
    print(f"Fetching specific chat item {chat_id}...")
    resp = requests.get(f"{BASE_URL}/api/history/{chat_id}", headers=headers)
    if resp.status_code != 200:
        print(f"Get chat item failed: {resp.text}")
        return
    
    item = resp.json()
    if item["id"] != chat_id:
        print(f"FAIL: Returned ID {item['id']} does not match requested {chat_id}")
        return
    if item["user"] != "Light User Msg":
        print(f"FAIL: Content mismatch. Got {item['user']}")
        return
        
    print("SUCCESS: All checks passed!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    try:
        verify()
    except Exception as e:
        print(f"An error occurred: {e}")
