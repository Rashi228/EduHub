# InvoSync

InvoSync is an AI-powered invoice and purchase order reconciliation platform that automates document verification, discrepancy detection, and data export. The system uses OCR technology to extract data from invoices and purchase orders, compares them for mismatches, and provides automated reconciliation workflows.

## Overview

InvoSync streamlines the accounts payable process by automatically extracting data from invoices and purchase orders, comparing them for discrepancies, and generating exportable CSV reports. The platform reduces manual verification time and minimizes human error in financial document processing.

## Features

### Core Functionality

- Dual Document Upload: Upload both purchase orders and invoices simultaneously
- OCR-Based Data Extraction: Automatic extraction of vendor names, invoice numbers, PO numbers, dates, amounts, and line items
- Intelligent Comparison Engine: Automated reconciliation with fuzzy matching for vendor names and item descriptions
- Discrepancy Detection: Identifies mismatches in quantities, prices, totals, and vendor information
- Status Classification: Automatically categorizes records as matched, mismatch, or partial
- Manual Review Interface: Side-by-side comparison view for reviewing extracted data

### Export and Reporting

- CSV Export: Generate corrected invoice CSV files with validated data
- Discrepancy Reports: Export detailed mismatch reports for auditing
- Export History: Track all past exports with metadata
- Scheduled Exports: Configure automatic exports using CRON expressions
- Date Range Filtering: Filter exports by specific date ranges
- Status-Based Filtering: Export only matched, mismatched, or all records

### User Management

- Secure Authentication: JWT-based login and signup system
- User Profiles: Store and manage user account information
- Session Management: Persistent authentication tokens

### Dashboard and Analytics

- Real-Time Statistics: View matched records, discrepancies, and pending verifications
- Recent Activity: Quick view of latest processed documents
- KPI Metrics: Track key performance indicators
- Quick Actions: Fast access to common operations

## Technology Stack

### Frontend

- React 18.3.1
- React Router DOM 6.26.2
- Vite 5.4.8
- Tailwind CSS (CDN)
- Framer Motion 11.8.0
- TanStack Query 5.51.23
- React Hook Form 7.53.0
- Axios 1.7.7

### Backend

- Flask 3.0.3
- Python 3.12+
- MongoDB (via PyMongo 4.8.0)
- PaddleOCR / Tesseract OCR (pytesseract 0.3.13)
- RapidFuzz 3.14.1
- Pandas 2.3.3
- PyJWT 2.9.0
- Passlib 1.7.4

### OCR and Image Processing

- PaddleOCR 2.7.3 (optional)
- pytesseract 0.3.13
- pdf2image 1.17.0
- PyMuPDF 1.26.5
- Pillow 10.4.0
- OpenCV 4.6.0.66

## Prerequisites

### System Requirements

- Python 3.12 or higher
- Node.js 18 or higher
- MongoDB (local or remote instance)
- Tesseract OCR (for Windows, macOS, or Linux)

### Installing Tesseract OCR

**Windows:**
winget install -e --id UB-Mannheim.TesseractOCR


**macOS:**
brew install tesseract


**Linux (Ubuntu/Debian):**
sudo apt-get install tesseract-ocr


**After installation, verify:**
tesseract --version


## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory:
```env
MONGO_URI=mongodb://localhost:27017/invosync
JWT_SECRET=your-secret-key-change-in-production
JWT_EXP_MIN=60
PORT=5000
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
ADMIN_KEY=dev
```

5. Create the uploads directory:
```bash
mkdir uploads
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000
```

## Running the Application

### Start MongoDB

Ensure MongoDB is running on your system. Default connection: `mongodb://localhost:27017`

### Start Backend Server

From the backend directory:
```bash
python app.py
```

The backend will start on `http://localhost:5000`

### Start Frontend Development Server

From the frontend directory:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Project Structure

Create a virtual environment (optional but recommended):
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activateCreates a new user account
- Request Body: `{ "name": "string", "email": "string", "password": "string" }`
- Response: `{ "token": "string", "user": { "id": "string", "email": "string", "name": "string" } }`

**POST /api/auth/login**
- Authenticates user and returns JWT token
- Request Body: `{ "email": "string", "password": "string" }`
- Response: `{ "token": "string", "user": { "id": "string", "email": "string", "name": "string" } }`

**GET /api/auth/me**
- Returns current authenticated user information
- Headers: `Authorization: Bearer <token>`
- Response: `{ "user": { "id": "string", "email": "string", "name": "string" } }`

### Document Processing Endpoints

**POST /api/verify**
- Processes invoice and PO documents
- Content-Type: `multipart/form-data`
- Form Fields: `invoice` (file), `po` (file)
- Query Parameters: `debug=1` (optional, for debug output)
- Response: `{ "id": "string", "invoice": {}, "po": {}, "result": {}, "createdAt": "ISO string" }`

### Records Endpoints

**GET /api/records**
- Retrieves list of processed records
- Query Parameters: `limit` (default: 20)
- Response: `{ "items": [] }`

**GET /api/records/:id**
- Retrieves detailed information for a specific record
- Response: `{ "id": "string", "invoice": {}, "po": {}, "result": {}, "createdAt": "ISO string" }`

### Statistics Endpoint

**GET /api/stats**
- Returns dashboard statistics
- Response: `{ "matched": number, "discrepancies": number, "pending": number, "lastExport": "ISO string" }`

### Export Endpoints

**POST /api/export/csv**
- Generates corrected invoice CSV
- Request Body: `{ "recordIds": [], "dateFrom": "ISO string", "dateTo": "ISO string", "status": "string" }`
- Response: `{ "csv": "string", "filename": "string" }`

**POST /api/export/report**
- Generates discrepancy report CSV
- Request Body: `{ "recordIds": [], "dateFrom": "ISO string", "dateTo": "ISO string" }`
- Response: `{ "csv": "string", "filename": "string" }`

**GET /api/export/history**
- Retrieves export history
- Query Parameters: `limit` (default: 20)
- Response: `{ "items": [] }`

### Health Check

**GET /api/health**
- Server health status
- Response: `{ "ok": true }`

## Data Extraction

The system extracts the following fields from documents:

### Purchase Order Fields
- Vendor Name
- PO Number
- Issue Date
- Line Items (Item Name, Quantity, Unit Price, Subtotal)
- Grand Total

### Invoice Fields
- Vendor Name
- Invoice Number
- Order ID
- Invoice Date
- Line Items (Item Name, Quantity, Unit Price, Subtotal)
- Grand Total

## Comparison Logic

Records are classified into three status categories:

- **Matched**: All fields align within configured tolerances
- **Mismatch**: Significant discrepancies detected in critical fields
- **Partial**: Minor quantity or price variations, otherwise matched

Comparison tolerances can be configured in the Settings page.

## CSV Export Format

Exported CSV files include the following columns:
- Item
- Quantity
- Price
- Total
- Status
- Order_ID
- Vendor
- Grand_Total

A summary row with GRAND TOTAL is automatically appended.

## Configuration

### Backend Environment Variables

- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXP_MIN`: JWT token expiration time in minutes
- `PORT`: Backend server port
- `CORS_ORIGIN`: Allowed CORS origin for frontend
- `UPLOAD_DIR`: Directory for temporary file storage
- `ADMIN_KEY`: Admin key for administrative endpoints

### Frontend Environment Variables

- `VITE_API_URL`: Backend API base URL

## Development

### Backend Development

Run in development mode with auto-reload:
```bash
python app.py
```

Note: Auto-reloader is disabled by default to prevent OCR model reload issues.

### Frontend Development

Run Vite development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Troubleshooting

### Common Issues

**OCR Not Extracting Data**
- Verify Tesseract OCR is installed and accessible
- Check that uploaded files are clear and readable
- Review backend logs for OCR error messages
- Ensure Poppler is installed for PDF processing (Linux/macOS)

**MongoDB Connection Errors**
- Verify MongoDB is running
- Check MONGO_URI in .env file
- Ensure network connectivity to MongoDB instance

**CORS Errors**
- Verify CORS_ORIGIN matches frontend URL
- Check backend CORS configuration
- Ensure backend is running

**Import Errors**
- Verify all dependencies are installed
- Check Python and Node.js versions match requirements
- Reinstall dependencies if issues persist

**Port Already in Use**
- Change PORT in .env file
- Kill process using the port
- Use different port for frontend/backend

## Security Considerations

- Store JWT_SECRET securely in production
- Use strong passwords for user accounts
- Configure proper CORS origins for production
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Secure MongoDB with authentication
- Regularly update dependencies for security patches

