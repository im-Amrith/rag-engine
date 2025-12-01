import requests
import sys
import os
import time

# Ensure we can import rag_engine
sys.path.append(os.getcwd())
from rag_engine import rag_engine

BASE_URL = "http://localhost:8000"
EMAIL = "test_history@example.com"
PASSWORD = "password123"

def verify():
    # 1. Register
    print("Registering...")
    resp = requests.post(f"{BASE_URL}/api/register", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code not in [200, 400]: # 400 if already exists
        print(f"Registration failed: {resp.text}")
        return
    
    # 2. Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get user id to inject data
    # We can get it from rag_engine
    user = rag_engine.get_user(EMAIL)
    user_id = user[0]
    
    # 3. Inject Chat History
    print("Injecting chat history...")
    rag_engine.save_chat("Test User Message", "Test AI Message", user_id)
    
    # 4. Get History
    print("Fetching history...")
    resp = requests.get(f"{BASE_URL}/api/history", headers=headers)
    if resp.status_code != 200:
        print(f"Get history failed: {resp.text}")
        return
    
    history = resp.json()
    if not history:
        print("History is empty!")
        return
    
    first_item = history[0]
    if "id" not in first_item:
        print("FAIL: 'id' field missing in history item")
        return
    
    chat_id = first_item["id"]
    print(f"Found chat ID: {chat_id}")
    
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
    if item["user"] != "Test User Message":
        print(f"FAIL: Content mismatch. Got {item['user']}")
        return
        
    print("SUCCESS: All checks passed!")

if __name__ == "__main__":
    try:
        verify()
    except Exception as e:
        print(f"An error occurred: {e}")
