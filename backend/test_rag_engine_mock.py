import sys
from unittest.mock import MagicMock, call
import unittest
import os
from datetime import datetime

# Mock modules
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["psycopg2"] = MagicMock()
sys.modules["psycopg2.extras"] = MagicMock()

# Set env
os.environ["DATABASE_URL"] = "postgres://user:pass@localhost:5432/db"

# Import
sys.path.append(os.getcwd())
# We need to reload rag_engine if it was already imported
if "rag_engine" in sys.modules:
    del sys.modules["rag_engine"]
from rag_engine import RAGEngine

class TestRAGEngine(unittest.TestCase):
    def setUp(self):
        self.engine = RAGEngine()
        # Mock connection and cursor
        self.mock_conn = self.engine.conn
        self.mock_cur = self.mock_conn.cursor.return_value.__enter__.return_value

    def test_get_chat_history(self):
        # Setup mock return
        # id, user_message, ai_message, timestamp
        dt = datetime(2023, 1, 1, 12, 0, 0)
        self.mock_cur.fetchall.return_value = [
            (1, "User Msg", "AI Msg", dt)
        ]
        
        history = self.engine.get_chat_history(user_id=123, limit=10)
        
        # Verify SQL - we check if 'id' is in the SELECT clause
        # The exact string match might be tricky due to whitespace, so we check substring
        call_args = self.mock_cur.execute.call_args
        sql = call_args[0][0]
        params = call_args[0][1]
        
        self.assertIn("SELECT id, user_message", sql)
        self.assertEqual(params, (123, 10))
            
        # Verify result
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["id"], 1)
        self.assertEqual(history[0]["user"], "User Msg")
        self.assertEqual(history[0]["timestamp"], dt.isoformat())

    def test_get_chat_item(self):
        # Setup mock return
        dt = datetime(2023, 1, 1, 12, 0, 0)
        self.mock_cur.fetchone.return_value = (1, "User Msg", "AI Msg", dt)
        
        item = self.engine.get_chat_item(chat_id=1, user_id=123)
        
        # Verify SQL
        call_args = self.mock_cur.execute.call_args
        sql = call_args[0][0]
        params = call_args[0][1]
        
        self.assertIn("SELECT id, user_message", sql)
        self.assertIn("WHERE id = %s AND user_id = %s", sql)
        self.assertEqual(params, (1, 123))
            
        # Verify result
        self.assertIsNotNone(item)
        self.assertEqual(item["id"], 1)
        self.assertEqual(item["user"], "User Msg")

if __name__ == "__main__":
    unittest.main()
