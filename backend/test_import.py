try:
    import fastapi
    print("FastAPI imported successfully")
    import uvicorn
    print("Uvicorn imported successfully")
    import chromadb
    print("ChromaDB imported successfully")
except ImportError as e:
    print(f"Import failed: {e}")
except Exception as e:
    print(f"Error: {e}")
