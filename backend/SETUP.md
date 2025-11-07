# Backend Setup Instructions

## Step 1: Create .env File

Create a file named `.env` in the `backend` directory with the following content:

```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/eduhub

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_EXP_MIN=60

# Server Configuration
PORT=5000
CORS_ORIGIN=http://localhost:5173

# Upload Directory
UPLOAD_DIR=./uploads

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Flask Debug (set to 'true' for debug mode, but disabled on Windows by default)
FLASK_DEBUG=false
```

## Step 2: Install Dependencies

Make sure all Python packages are installed:
```bash
pip install --user -r requirements.txt
```

Or install ML packages specifically:
```bash
pip install --user scikit-learn==1.5.2 xgboost==2.1.3 scipy==1.14.1
```

## Step 3: Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

## Troubleshooting

### "ML libraries not available"
- Install: `pip install --user scikit-learn xgboost scipy`

### "GEMINI_API_KEY not found"
- Create `.env` file in backend directory with the API key above

### "401 Unauthorized" errors
- You need to log in first. Go to `/login` and sign in.

### Socket errors on Windows
- Debug mode is automatically disabled on Windows to prevent socket errors

