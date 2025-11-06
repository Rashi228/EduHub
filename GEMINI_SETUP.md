# Gemini AI Setup Guide

## Issue
The chatbot is showing "thinking" but not responding because the Gemini model names don't match your API version.

## Solution

### Option 1: Update the SDK (Recommended)
```bash
cd backend
pip install --upgrade google-generativeai
```

This will update from version 0.3.2 to the latest version which supports newer model names.

### Option 2: Check Available Models
The code now automatically tries to find available models. When you restart the backend, check the logs for:
- "Available models: ..." - This shows what models your API key supports

### Option 3: Manual Model Configuration
If needed, you can manually set the model name in `backend/app.py` by finding a model that works with your API key.

## Common Model Names
- `gemini-1.5-pro-latest` - Latest Pro model
- `gemini-1.5-pro` - 1.5 Pro
- `gemini-1.5-flash-latest` - Latest Flash model
- `gemini-1.5-flash` - 1.5 Flash
- `gemini-pro` - Older Pro model

## After Updating
1. Restart the backend server
2. Check logs for "Gemini AI initialized successfully with..."
3. Test the chatbot

