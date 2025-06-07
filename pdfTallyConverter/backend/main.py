from fastapi import FastAPI, UploadFile, HTTPException, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import uuid
import pdfplumber
import pandas as pd
import cv2
import numpy as np
import pytesseract
from PIL import Image
import io
from typing import List, Dict, Optional, Any
import xml.etree.ElementTree as ET
from datetime import datetime
import aiofiles
import json
from pydantic import BaseModel
import asyncio
from concurrent.futures import ProcessPoolExecutor

app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create necessary directories
UPLOAD_DIR = "uploads"
CONVERTED_DIR = "converted"
CHUNK_SIZE = 1024 * 1024  # 1MB chunks for file handling
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CONVERTED_DIR, exist_ok=True)

# Initialize process pool for CPU-intensive tasks
process_pool = ProcessPoolExecutor()

class ConversionError(Exception):
    pass

class CellMetadata(BaseModel):
    error: Optional[bool] = None
    confidence: Optional[float] = None
    status: Optional[str] = None
    originalValue: Optional[Any] = None

class TableCell(BaseModel):
    value: Any
    metadata: CellMetadata

class TableRow(BaseModel):
    cells: Dict[str, TableCell]

    class Config:
        arbitrary_types_allowed = True

class TableData(BaseModel):
    headers: List[str]
    rows: List[TableRow]

    class Config:
        arbitrary_types_allowed = True

class EditHistory(BaseModel):
    timestamp: int
    rowId: str
    columnKey: str
    oldValue: Any
    newValue: Any

class SavePayload(BaseModel):
    fileId: str
    originalData: TableData
    modifiedData: TableData
    editHistory: List[EditHistory]

async def save_upload_file(upload_file: UploadFile) -> tuple[str, str]:
    """Save uploaded file and return the file path"""
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(upload_file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")
    
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            while chunk := await upload_file.read(CHUNK_SIZE):
                await out_file.write(chunk)
        
        return file_path, file_id
    except Exception as e:
        # Clean up the file if there's an error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

def extract_tables_from_pdf(file_path: str) -> List[pd.DataFrame]:
    """Extract tables from PDF using pdfplumber"""
    tables = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_tables = page.extract_tables()
                for table in page_tables:
                    if table:  # Check if table is not empty
                        df = pd.DataFrame(table[1:], columns=table[0])
                        tables.append(df)
    except Exception as e:
        raise ConversionError(f"Failed to extract tables from PDF: {str(e)}")
    return tables

def process_image_ocr(file_path: str) -> pd.DataFrame:
    """Process image using OCR to extract tabular data"""
    try:
        # Read image
        img = cv2.imread(file_path)
        if img is None:
            raise ConversionError("Failed to read image file")

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # OCR
        text = pytesseract.image_to_string(gray)
        
        # Convert OCR text to DataFrame
        # This is a simple implementation - you might need to enhance it based on your needs
        lines = text.strip().split('\n')
        if not lines:
            raise ConversionError("No text detected in image")
            
        # Assume first line contains headers
        headers = lines[0].split()
        data = [line.split() for line in lines[1:]]
        
        return pd.DataFrame(data, columns=headers)
    except Exception as e:
        raise ConversionError(f"Failed to process image: {str(e)}")

def create_tally_xml(data: pd.DataFrame, filename: str) -> str:
    """Create Tally-compatible XML from DataFrame"""
    root = ET.Element("ENVELOPE")
    header = ET.SubElement(root, "HEADER")
    ET.SubElement(header, "VERSION").text = "1"
    ET.SubElement(header, "TALLYREQUEST").text = "Import Data"
    
    body = ET.SubElement(root, "BODY")
    importdata = ET.SubElement(body, "IMPORTDATA")
    requestdesc = ET.SubElement(importdata, "REQUESTDESC")
    reportname = ET.SubElement(requestdesc, "REPORTNAME").text = "Custom"
    
    requestdata = ET.SubElement(importdata, "REQUESTDATA")
    
    # Convert DataFrame to XML structure
    for _, row in data.iterrows():
        tallymessage = ET.SubElement(requestdata, "TALLYMESSAGE")
        for col, value in row.items():
            ET.SubElement(tallymessage, str(col)).text = str(value)
    
    # Save XML file
    xml_path = os.path.join(CONVERTED_DIR, f"{filename}.xml")
    tree = ET.ElementTree(root)
    tree.write(xml_path, encoding='utf-8', xml_declaration=True)
    
    return xml_path

def convert_file(file_path: str, file_id: str, output_formats: List[str] = ["xlsx", "csv", "xml"]) -> Dict:
    """Convert file to specified formats"""
    # Extract data based on file type
    file_extension = os.path.splitext(file_path)[1].lower()
    if file_extension == '.pdf':
        dataframes = extract_tables_from_pdf(file_path)
        if not dataframes:
            raise ConversionError("No tables found in PDF")
        # Combine all tables into one if multiple tables found
        data = pd.concat(dataframes, ignore_index=True)
    elif file_extension in ['.png', '.jpg', '.jpeg']:
        data = process_image_ocr(file_path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Convert to requested formats
    output_files = {}
    
    for format in output_formats:
        output_path = os.path.join(CONVERTED_DIR, f"{file_id}.{format}")
        
        if format == 'xlsx':
            data.to_excel(output_path, index=False)
            output_files['xlsx'] = output_path
        elif format == 'csv':
            data.to_csv(output_path, index=False)
            output_files['csv'] = output_path
        elif format == 'xml':
            xml_path = create_tally_xml(data, file_id)
            output_files['xml'] = xml_path
    
    return {
        "status": "success",
        "message": "File converted successfully",
        "file_id": file_id,
        "converted_files": {
            format: f"/download/{os.path.basename(path)}"
            for format, path in output_files.items()
        }
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and return its ID"""
    # Validate file size (e.g., 100MB limit)
    if await file.read(1) == b'':
        raise HTTPException(status_code=400, detail="Empty file")
    await file.seek(0)  # Reset file pointer
    
    # Validate file type
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ['.pdf', '.png', '.jpg', '.jpeg']:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    try:
        file_path, file_id = await save_upload_file(file)
        return JSONResponse({
            "status": "success",
            "message": "File uploaded successfully",
            "file_id": file_id
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/convert/{file_id}")
async def convert_uploaded_file(
    file_id: str,
    output_formats: List[str] = ["xlsx", "csv", "xml"]
):
    """Convert an already uploaded file"""
    try:
        # Find the uploaded file
        for ext in ['.pdf', '.png', '.jpg', '.jpeg']:
            file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
            if os.path.exists(file_path):
                result = convert_file(file_path, file_id, output_formats)
                # Clean up uploaded file after conversion
                os.remove(file_path)
                return JSONResponse(result)
        
        raise HTTPException(status_code=404, detail="File not found")
        
    except ConversionError as e:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Internal server error: {str(e)}"}
        )

@app.post("/convert")
async def convert_new_file(
    file: UploadFile = File(...),
    output_formats: List[str] = ["xlsx", "csv", "xml"]
):
    """Convert a new file upload"""
    try:
        # Save uploaded file
        file_path, file_id = await save_upload_file(file)
        
        # Convert the file
        result = convert_file(file_path, file_id, output_formats)
        
        # Clean up uploaded file
        os.remove(file_path)
        
        return JSONResponse(result)
        
    except ConversionError as e:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Internal server error: {str(e)}"}
        )

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download converted file"""
    file_path = os.path.join(CONVERTED_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

def ensure_directory(path: str):
    if not os.path.exists(path):
        os.makedirs(path)

def save_as_xlsx(data: TableData, filepath: str):
    # Convert to pandas DataFrame
    rows_data = []
    for row in data.rows:
        row_dict = {header: row.cells[header].value for header in data.headers}
        rows_data.append(row_dict)
    
    df = pd.DataFrame(rows_data, columns=data.headers)
    df.to_excel(filepath, index=False)

def save_as_csv(data: TableData, filepath: str):
    # Convert to pandas DataFrame
    rows_data = []
    for row in data.rows:
        row_dict = {header: row.cells[header].value for header in data.headers}
        rows_data.append(row_dict)
    
    df = pd.DataFrame(rows_data, columns=data.headers)
    df.to_csv(filepath, index=False)

def save_as_xml(data: TableData, filepath: str):
    root = ET.Element("ENVELOPE")
    header = ET.SubElement(root, "HEADER")
    ET.SubElement(header, "VERSION").text = "1"
    ET.SubElement(header, "TALLYREQUEST").text = "Import Data"
    
    body = ET.SubElement(root, "BODY")
    importdata = ET.SubElement(body, "IMPORTDATA")
    requestdesc = ET.SubElement(importdata, "REQUESTDESC")
    reportname = ET.SubElement(requestdesc, "REPORTNAME").text = "Custom"
    
    requestdata = ET.SubElement(importdata, "REQUESTDATA")
    
    # Convert rows to XML structure
    for row in data.rows:
        tallymessage = ET.SubElement(requestdata, "TALLYMESSAGE")
        for header in data.headers:
            ET.SubElement(tallymessage, str(header)).text = str(row.cells[header].value)
    
    # Save XML file
    tree = ET.ElementTree(root)
    tree.write(filepath, encoding='utf-8', xml_declaration=True)

def log_changes(file_id: str, edit_history: List[EditHistory]):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_dir = "logs"
    ensure_directory(log_dir)
    
    log_file = os.path.join(log_dir, f"{file_id}_{timestamp}_changes.json")
    with open(log_file, "w") as f:
        json.dump([edit.dict() for edit in edit_history], f, indent=2)

@app.post("/api/save-edits")
async def save_edits(payload: SavePayload):
    try:
        # Ensure the corrected directory exists
        corrected_dir = "corrected"
        ensure_directory(corrected_dir)
        
        # Save in different formats
        base_path = os.path.join(corrected_dir, f"{payload.fileId}_corrected")
        save_as_xlsx(payload.modifiedData, f"{base_path}.xlsx")
        save_as_csv(payload.modifiedData, f"{base_path}.csv")
        save_as_xml(payload.modifiedData, f"{base_path}.xml")
        
        # Log the changes
        log_changes(payload.fileId, payload.editHistory)
        
        return {
            "success": True,
            "downloads": {
                "xlsx": f"/api/download/{payload.fileId}/xlsx",
                "csv": f"/api/download/{payload.fileId}/csv",
                "xml": f"/api/download/{payload.fileId}/xml"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{file_id}/{format}")
async def download_file(file_id: str, format: str):
    if format not in ["xlsx", "csv", "xml"]:
        raise HTTPException(status_code=400, detail="Invalid format")
    
    file_path = f"corrected/{file_id}_corrected.{format}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        media_type={
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "csv": "text/csv",
            "xml": "application/xml"
        }[format],
        filename=f"corrected_data.{format}"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 