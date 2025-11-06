# 🚀 Quick Start Guide - EduHub

## ✅ What's Fixed:

1. ✅ **ML Libraries Installed** - scikit-learn, xgboost, scipy
2. ✅ **.env File Created** - GEMINI_API_KEY configured
3. ✅ **Flask Debug Mode Fixed** - No more Windows socket errors
4. ✅ **AI Error Handling** - Better error messages

## 📋 Next Steps:

### Step 1: Start MongoDB
Make sure MongoDB is running:
```bash
# Check if MongoDB is running
# If not, start it (usually runs automatically on Windows)
```

### Step 2: Restart Backend Server
```bash
cd backend
python app.py
```

You should see:
- ✅ "Gemini AI initialized successfully"
- ✅ No "ML libraries not available" warning
- ✅ Server running on http://127.0.0.1:5000

### Step 3: Start Frontend
In a new terminal:
```bash
cd frontend
npm run dev
```

### Step 4: Login
1. Go to http://localhost:5173
2. Click "Sign in" or go to `/login`
3. Login with your account (or create one)
4. This will fix the 401 errors

### Step 5: Test AI Features
1. **Chatbot**: Go to `/chatbot` and ask a question
2. **AI Advisor**: Go to `/dashboard` and check "Tasks to Focus On"
3. **ML Features**: Create a task and see auto-priority prediction

## 🔧 Troubleshooting:

### Still seeing "GEMINI_API_KEY not found"
- Make sure `.env` file is in the `backend` directory
- Restart the backend server after creating `.env`

### Still seeing 401 errors
- You need to log in first
- Clear browser cache and localStorage if needed
- Check browser console for errors

### AI Chat not working
- Check backend logs for Gemini API errors
- Verify GEMINI_API_KEY is correct in `.env`
- Make sure you're logged in (401 means not authenticated)

### Socket errors on Windows
- Already fixed! Debug mode is disabled on Windows automatically

## ✨ You're All Set!

The backend should now work perfectly with:
- ✅ ML features enabled
- ✅ Gemini AI chat working
- ✅ AI advisor working
- ✅ All EduHub features functional

