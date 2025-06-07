# PDF Tally Converter Backend

FastAPI backend for handling PDF and image file uploads with metadata extraction.

## Features

- File upload endpoint with MIME type validation
- Automatic UUID generation for uploaded files
- Metadata extraction for PDFs and images
- File listing and individual file info endpoints
- CORS support for frontend integration

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install system dependencies:
   - On Windows: No additional steps needed
   - On Ubuntu/Debian: `sudo apt-get install libmagic1`
   - On macOS: `brew install libmagic`

## Running the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

The server will start at http://localhost:8000

## API Endpoints

- `POST /api/upload` - Upload a new file (PDF/image)
- `GET /api/files/{file_id}` - Get metadata for a specific file
- `GET /api/files` - List all uploaded files

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc 