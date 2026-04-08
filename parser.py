"""
parser.py — Resume text extraction from PDF and DOCX
"""
import io
import os


def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Extract text from a PDF or DOCX file.
    Returns the extracted text as a string.
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        return _extract_pdf(file_bytes)
    elif ext == ".docx":
        return _extract_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyPDF2."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        texts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                texts.append(text)
        return "\n".join(texts)
    except ImportError:
        raise ImportError("PyPDF2 is not installed. Run: pip install PyPDF2")
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")


def _extract_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX using docx2txt."""
    try:
        import docx2txt
        import tempfile

        # docx2txt requires a file path, so write to temp file
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            text = docx2txt.process(tmp_path)
        finally:
            os.unlink(tmp_path)

        return text or ""
    except ImportError:
        raise ImportError("docx2txt is not installed. Run: pip install docx2txt")
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {str(e)}")
