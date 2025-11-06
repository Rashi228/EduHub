# EduHub - AI-Powered Personal Productivity & Mood Companion

EduHub is an intelligent productivity platform that combines task management, mood tracking, focus time analytics, and AI-powered recommendations to help you optimize your daily workflow and wellbeing.

## Overview

EduHub uses **Gemini AI** and **Machine Learning** to provide personalized productivity insights, task prioritization, mood pattern recognition, and intelligent recommendations. The platform learns from your habits and adapts to help you achieve your goals.

## Features

### Core Functionality

- **Task Management**: Smart task prioritization with ML-powered priority prediction
- **Mood Tracking**: Track your mood patterns with AI-powered predictions
- **Focus Time**: Pomodoro-style focus sessions with analytics
- **Medication Tracker**: Manage medications with reminders
- **Opportunities**: Track internships, jobs, scholarships, and more
- **Resources**: Books and playlists with ML-based recommendations
- **Streaks**: Build and maintain productive habits
- **AI Advisor**: Get personalized productivity recommendations based on your mood and tasks
- **AI Chatbot**: Chat with Gemini AI about productivity and mood

### AI & ML Features

- **Task Priority Prediction**: XGBoost model predicts task priority (high/medium/low)
- **Mood Pattern Recognition**: XGBoost + PCA model predicts mood based on patterns
- **Recommendations**: KNN collaborative filtering for books/playlists
- **Note Classification**: SVM classifier for automatic note categorization
- **Gemini AI Integration**: Context-aware AI advisor and chatbot

### Smart Features

- **Auto-Priority**: ML automatically predicts task priority as you type
- **Mood Insights**: AI analyzes patterns between mood, medication, tasks, and focus time
- **Personalized Recommendations**: Get book/playlist suggestions based on similar users
- **Focus Analytics**: Track your most productive times and patterns

## Technology Stack

### Frontend
- React 18.3.1
- React Router DOM 6.26.2
- Vite 5.4.8
- Tailwind CSS
- Framer Motion 11.8.0

### Backend
- Flask 3.0.3
- Python 3.12+
- MongoDB (via PyMongo 4.8.0)
- Google Generative AI (Gemini)
- Scikit-learn 1.5.2
- XGBoost 2.1.3

### ML Models
- **XGBoost**: Task prioritization and mood prediction
- **PCA**: Feature reduction for mood prediction (14 features → 3 components)
- **KNN**: Collaborative filtering for recommendations
- **SVM**: Text classification for notes

## Prerequisites

- Python 3.12 or higher
- Node.js 18 or higher
- MongoDB (local or remote instance)

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
MONGO_URI=mongodb://localhost:27017/eduhub
JWT_SECRET=your-secret-key-change-in-production
JWT_EXP_MIN=60
PORT=5000
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your-gemini-api-key
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

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### EduHub Features
- `GET /api/eduhub/streak` - Get streak data
- `POST /api/eduhub/streak/update` - Update streak
- `GET /api/eduhub/resources` - Get resources
- `POST /api/eduhub/resources` - Create resource
- `DELETE /api/eduhub/resources/<id>` - Delete resource
- `POST /api/eduhub/focus/start` - Start focus session
- `POST /api/eduhub/focus/stop` - Stop focus session
- `GET /api/eduhub/focus/today` - Get today's focus time
- `GET /api/eduhub/todos` - Get todos
- `POST /api/eduhub/todos` - Create todo
- `PUT /api/eduhub/todos/<id>` - Update todo
- `DELETE /api/eduhub/todos/<id>` - Delete todo
- `POST /api/eduhub/todos/reorder` - Reorder todos
- `GET /api/eduhub/moods` - Get moods
- `POST /api/eduhub/moods` - Create mood
- `DELETE /api/eduhub/moods/<id>` - Delete mood
- `GET /api/eduhub/medications` - Get medications
- `POST /api/eduhub/medications` - Create medication
- `PUT /api/eduhub/medications/<id>` - Update medication
- `DELETE /api/eduhub/medications/<id>` - Delete medication
- `POST /api/eduhub/medications/<id>/log` - Log medication taken
- `GET /api/eduhub/opportunities` - Get opportunities
- `POST /api/eduhub/opportunities` - Create opportunity
- `PUT /api/eduhub/opportunities/<id>` - Update opportunity
- `DELETE /api/eduhub/opportunities/<id>` - Delete opportunity
- `GET /api/eduhub/settings` - Get settings
- `PUT /api/eduhub/settings` - Update settings

### AI Features
- `POST /api/eduhub/ai/advisor` - Get AI advisor recommendations
- `POST /api/eduhub/ai/chat` - Chat with AI

### ML Features
- `POST /api/ml/recommendations` - Get ML recommendations
- `POST /api/ml/tasks/predict-priority` - Predict task priority
- `POST /api/ml/mood/predict` - Predict mood
- `POST /api/ml/notes/classify` - Classify note

## Project Structure

```
Futurix AI/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── ml_models.py        # ML models (XGBoost, KNN, SVM, PCA)
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # React components
│   │   ├── lib/          # API client
│   │   └── utils/        # Utilities
│   └── package.json      # Node dependencies
└── README.md
```

## Development

### Backend Development

Run in development mode:
```bash
python app.py
```

### Frontend Development

Run Vite development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## ML Models

### Task Priority Prediction
- **Model**: XGBoost Classifier
- **Features**: Keywords, deadline, difficulty, urgency, time context
- **Output**: High/Medium/Low priority

### Mood Prediction
- **Model**: XGBoost + PCA
- **Features**: 14 features (mood, energy, stress, focus, productivity, etc.)
- **PCA**: Reduces to 3 principal components
- **Output**: Predicted mood category

### Recommendations
- **Model**: KNN (User-based collaborative filtering)
- **Features**: User ratings and item preferences
- **Output**: Recommended items

### Note Classification
- **Model**: SVM with TF-IDF
- **Features**: Note text content
- **Output**: Subject category

## Security Considerations

- Store JWT_SECRET securely in production
- Use strong passwords for user accounts
- Configure proper CORS origins for production
- Use HTTPS in production
- Secure MongoDB with authentication
- Keep GEMINI_API_KEY private

## License

This project is part of the Futurix AI platform.
