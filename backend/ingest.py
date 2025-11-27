from PIL import Image
import pytesseract
import io
import tempfile
import os
from langchain_community.document_loaders import PyPDFLoader

def extract_text_from_image(image_bytes: bytes) -> list[dict]:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return [{"text": text, "metadata": {"page": 1}}]
    except Exception as e:
        print(f"Error extracting text from image: {e}")
        return []

def extract_text_from_pdf(pdf_bytes: bytes) -> list[dict]:
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(pdf_bytes)
            tmp_path = tmp_file.name
        
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()
        
        # Return list of chunks with page numbers
        result = []
        for page in pages:
            result.append({
                "text": page.page_content,
                "metadata": {"page": page.metadata.get("page", 0) + 1} # 1-based indexing
            })
        
        os.remove(tmp_path)
        return result
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return []

