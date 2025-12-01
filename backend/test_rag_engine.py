import sys
from unittest.mock import MagicMock
import os
import json
import unittest

# Mock sentence_transformers before importing rag_engine
sys.modules["sentence_transformers"] = MagicMock()

# Also mock psycopg2 if needed, but we want to test DB interaction if possible.
# However, if we want to avoid DB connection issues, we can mock psycopg2 too.
# But testing the SQL query is the main point.
# Let's assume psycopg2 is available (we installed it).
# We need to make sure RAGEngine doesn't fail on __init__ due to model load.
# The mocked SentenceTransformer should handle it.

# We need to set DATABASE_URL
os.environ["DATABASE_URL"] = "postgresql://postgres:password@localhost:5432/rag_engine" # Dummy or real?
# If we use real DB, we need real connection.
# If we mock DB, we verify the SQL string.

# Let's try to use the real DB if available, otherwise mock.
# The user has a DB_URL in .env?
from dotenv import load_dotenv
load_dotenv()

# If we can't connect to DB, we mock psycopg2
try:
    import psycopg2
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    conn.close()
    USE_REAL_DB = True
except:
    USE_REAL_DB = False
    print("Could not connect to real DB, using mocks.")

# Now import
sys.path.append(os.getcwd())
try:
    from rag_engine import RAGEngine
except ImportError:
    # If it fails due to other imports
    print("Failed to import RAGEngine")
    sys.exit(1)

class TestRAGEngine(unittest.TestCase):
    def setUp(self):
        if USE_REAL_DB:
            self.engine = RAGEngine()
            # We need to mock the model attribute since we mocked the class
            self.engine.model = MagicMock()
            self.engine.model.encode.return_value.tolist.return_value = [0.1] * 384
            
            # Create a test user
            self.test_email = "unittest@example.com"
            self.user_id = self.engine.create_user(self.test_email, "hash")
            if not self.user_id:
                # User might exist
                user = self.engine.get_user(self.test_email)
                self.user_id = user[0]
        else:
            self.engine = RAGEngine()
            self.engine.conn = MagicMock()
            self.user_id = 1

    def test_get_chat_history_and_item(self):
        # 1. Save a chat
        self.engine.save_chat("Unit Test User", "Unit Test AI", self.user_id)
        
        # 2. Get History
        history = self.engine.get_chat_history(self.user_id, limit=1)
        self.assertTrue(len(history) > 0)
        item = history[0]
        self.assertIn("id", item)
        self.assertEqual(item["user"], "Unit Test User")
        
        chat_id = item["id"]
        
        # 3. Get Specific Item
        fetched_item = self.engine.get_chat_item(chat_id, self.user_id)
        self.assertIsNotNone(fetched_item)
        self.assertEqual(fetched_item["id"], chat_id)
        self.assertEqual(fetched_item["user"], "Unit Test User")
        self.assertEqual(fetched_item["ai"], "Unit Test AI")
        
        print("Test passed!")

if __name__ == "__main__":
    unittest.main()
