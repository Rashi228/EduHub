"""
ML Models for Smart Features:
1. Recommendation Engine (KNN)
2. Task Prioritization (XGBoost/SVM)
3. Mood Pattern Recognition (XGBoost/KNN)
4. Note Classification (SVM)
"""
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger('ml_models')

try:
    from sklearn.neighbors import NearestNeighbors
    from sklearn.svm import SVC
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.decomposition import PCA
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    import xgboost as xgb
    ML_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ML libraries not available: {e}")
    ML_AVAILABLE = False

# ==================== 1. Recommendation Engine (KNN) ====================

class RecommendationEngine:
    """KNN-based recommendation system for books/playlists."""
    
    def __init__(self):
        self.knn_model = None
        self.user_matrix = None
        self.item_matrix = None
        self.user_ids = []
        self.item_ids = []
        self.item_features = {}
        
    def fit_user_based(self, ratings_data: List[Dict]):
        """
        Fit user-based collaborative filtering.
        ratings_data: [{"userId": str, "itemId": str, "rating": float}, ...]
        """
        if not ML_AVAILABLE or not ratings_data:
            return False
        
        try:
            df = pd.DataFrame(ratings_data)
            if len(df) < 5:  # Need minimum data
                return False
                
            # Create user-item matrix
            pivot = df.pivot_table(
                index='userId', 
                columns='itemId', 
                values='rating', 
                fill_value=0
            )
            
            self.user_matrix = pivot.values
            self.user_ids = pivot.index.tolist()
            self.item_ids = pivot.columns.tolist()
            
            # Fit KNN (k=5)
            self.knn_model = NearestNeighbors(n_neighbors=min(5, len(self.user_ids)), metric='cosine')
            self.knn_model.fit(self.user_matrix)
            
            logger.info(f"User-based KNN fitted with {len(self.user_ids)} users, {len(self.item_ids)} items")
            return True
        except Exception as e:
            logger.error(f"Error fitting user-based KNN: {e}")
            return False
    
    def recommend_for_user(self, user_id: str, ratings_data: List[Dict], n_recommendations: int = 5) -> List[str]:
        """
        Recommend items for a user using user-based collaborative filtering.
        """
        if not self.knn_model or user_id not in self.user_ids:
            return []
        
        try:
            user_idx = self.user_ids.index(user_id)
            user_vector = self.user_matrix[user_idx].reshape(1, -1)
            
            # Find similar users
            distances, indices = self.knn_model.kneighbors(user_vector)
            
            # Get items liked by similar users but not by current user
            user_rated_items = set(
                item['itemId'] for item in ratings_data 
                if item.get('userId') == user_id and item.get('rating', 0) > 3
            )
            
            recommendations = []
            for neighbor_idx in indices[0][1:]:  # Skip self
                neighbor_id = self.user_ids[neighbor_idx]
                neighbor_items = [
                    item['itemId'] for item in ratings_data
                    if item.get('userId') == neighbor_id 
                    and item.get('rating', 0) > 3
                    and item['itemId'] not in user_rated_items
                ]
                recommendations.extend(neighbor_items)
            
            # Return top N unique recommendations
            unique_recs = list(dict.fromkeys(recommendations))[:n_recommendations]
            return unique_recs
        except Exception as e:
            logger.error(f"Error recommending for user {user_id}: {e}")
            return []

# ==================== 2. Task Prioritization (XGBoost/SVM) ====================

class TaskPrioritizer:
    """Predict task priority and category using XGBoost or SVM."""
    
    def __init__(self):
        self.priority_model = None
        self.category_model = None
        self.vectorizer = None
        self.priority_encoder = None
        self.category_encoder = None
        
    def extract_features(self, tasks: List[Dict]) -> pd.DataFrame:
        """Extract features from tasks for ML."""
        features = []
        for task in tasks:
            title = str(task.get('title', '')).lower()
            deadline = task.get('deadline')
            created = task.get('createdAt')
            difficulty = task.get('difficulty', 'medium')
            urgency = int(task.get('urgency', 3))
            
            # Text features (keywords)
            keywords = {
                'exam': 'exam' in title or 'test' in title,
                'report': 'report' in title or 'write' in title,
                'urgent': 'urgent' in title or 'asap' in title,
                'meeting': 'meeting' in title or 'call' in title,
                'study': 'study' in title or 'learn' in title,
                'gym': 'gym' in title or 'workout' in title,
                'personal': 'personal' in title or 'home' in title,
            }
            
            # Time features
            now = datetime.now(timezone.utc)
            days_until_deadline = None
            if deadline:
                try:
                    if isinstance(deadline, str):
                        deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                    else:
                        deadline_dt = deadline
                    days_until_deadline = (deadline_dt - now).days
                except:
                    days_until_deadline = None
            
            hours_since_created = None
            if created:
                try:
                    if isinstance(created, str):
                        created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                    else:
                        created_dt = created
                    hours_since_created = (now - created_dt).total_seconds() / 3600
                except:
                    hours_since_created = None
            
            # Difficulty encoding
            difficulty_map = {'easy': 1, 'medium': 2, 'hard': 3}
            difficulty_num = difficulty_map.get(difficulty, 2)
            
            # Time of day
            hour_of_day = now.hour
            day_of_week = now.weekday()
            
            feature_dict = {
                **keywords,
                'days_until_deadline': days_until_deadline if days_until_deadline is not None else 999,
                'hours_since_created': hours_since_created if hours_since_created is not None else 0,
                'difficulty': difficulty_num,
                'urgency': urgency,
                'hour_of_day': hour_of_day,
                'day_of_week': day_of_week,
                'has_deadline': 1 if deadline else 0,
            }
            features.append(feature_dict)
        
        return pd.DataFrame(features)
    
    def fit_priority(self, tasks: List[Dict], priorities: List[str]):
        """
        Fit model to predict task priority.
        priorities: ['high', 'medium', 'low']
        """
        if not ML_AVAILABLE or len(tasks) < 10:
            return False
        
        try:
            X = self.extract_features(tasks)
            y = priorities
            
            # Encode labels
            self.priority_encoder = LabelEncoder()
            y_encoded = self.priority_encoder.fit_transform(y)
            
            # Train XGBoost
            self.priority_model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            )
            self.priority_model.fit(X, y_encoded)
            
            # Evaluate
            y_pred = self.priority_model.predict(X)
            acc = accuracy_score(y_encoded, y_pred)
            logger.info(f"Task priority model fitted with accuracy: {acc:.2%}")
            return True
        except Exception as e:
            logger.error(f"Error fitting priority model: {e}")
            return False
    
    def predict_priority(self, task: Dict) -> str:
        """Predict priority for a single task."""
        if not self.priority_model:
            # Fallback: use urgency and deadline
            urgency = int(task.get('urgency', 3))
            deadline = task.get('deadline')
            if deadline:
                try:
                    if isinstance(deadline, str):
                        deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                    else:
                        deadline_dt = deadline
                    days = (deadline_dt - datetime.now(timezone.utc)).days
                    if days < 0:
                        return 'high'
                    elif days <= 1:
                        return 'high' if urgency <= 2 else 'medium'
                    elif days <= 3:
                        return 'medium' if urgency <= 2 else 'low'
                except:
                    pass
            return 'high' if urgency <= 2 else 'medium' if urgency == 3 else 'low'
        
        try:
            X = self.extract_features([task])
            pred_encoded = self.priority_model.predict(X)[0]
            return self.priority_encoder.inverse_transform([pred_encoded])[0]
        except Exception as e:
            logger.error(f"Error predicting priority: {e}")
            return 'medium'

# ==================== 3. Mood Pattern Recognition (XGBoost/KNN) ====================

class MoodPredictor:
    """Predict mood based on patterns in mood, medication, and task data.
    Uses PCA for feature reduction to improve model performance."""
    
    def __init__(self):
        self.mood_model = None
        self.mood_encoder = None
        self.pca = None
        self.scaler = None
        self.n_components = 3  # Reduce to 3 principal components
        
    def extract_features(self, mood_history: List[Dict], medication_history: List[Dict], 
                        task_completion: List[Dict], focus_sessions: List[Dict] = None) -> pd.DataFrame:
        """
        Extract comprehensive features for mood prediction.
        Creates 10+ features that will be reduced via PCA.
        """
        features = []
        focus_sessions = focus_sessions or []
        
        # Aggregate by day
        daily_data = {}
        for mood in mood_history:
            date = mood.get('date')
            if isinstance(date, str):
                date_key = date.split('T')[0]
            else:
                date_key = date.date().isoformat() if hasattr(date, 'date') else str(date)
            
            if date_key not in daily_data:
                daily_data[date_key] = {
                    'moods': [],
                    'mood_notes': [],
                    'medications': 0,
                    'tasks_completed': 0,
                    'focus_minutes': 0,
                    'time_of_day': None,
                    'day_of_week': None,
                    'hour_of_entry': []
                }
            
            daily_data[date_key]['moods'].append(mood.get('mood', ''))
            if mood.get('note'):
                daily_data[date_key]['mood_notes'].append(mood.get('note', ''))
            if mood.get('date'):
                try:
                    dt = datetime.fromisoformat(str(mood.get('date')).replace('Z', '+00:00'))
                    daily_data[date_key]['hour_of_entry'].append(dt.hour)
                    if not daily_data[date_key]['time_of_day']:
                        daily_data[date_key]['time_of_day'] = dt.hour
                    if not daily_data[date_key]['day_of_week']:
                        daily_data[date_key]['day_of_week'] = dt.weekday()
                except:
                    pass
        
        for med in medication_history:
            date = med.get('date') or med.get('takenAt')
            if isinstance(date, str):
                date_key = date.split('T')[0]
            else:
                date_key = date.date().isoformat() if hasattr(date, 'date') else str(date)
            
            if date_key in daily_data:
                daily_data[date_key]['medications'] += 1
        
        for task in task_completion:
            if task.get('completed'):
                completed_at = task.get('completedAt') or task.get('createdAt')
                if completed_at:
                    if isinstance(completed_at, str):
                        date_key = completed_at.split('T')[0]
                    else:
                        date_key = completed_at.date().isoformat() if hasattr(completed_at, 'date') else str(completed_at)
                    
                    if date_key in daily_data:
                        daily_data[date_key]['tasks_completed'] += 1
        
        # Add focus time
        for session in focus_sessions:
            if session.get('status') == 'completed':
                start_time = session.get('startTime')
                if start_time:
                    if isinstance(start_time, str):
                        date_key = start_time.split('T')[0]
                    else:
                        date_key = start_time.date().isoformat() if hasattr(start_time, 'date') else str(start_time)
                    
                    if date_key in daily_data:
                        duration_minutes = session.get('duration', 0) // 60
                        daily_data[date_key]['focus_minutes'] += duration_minutes
        
        # Build comprehensive feature set
        for date_key, data in daily_data.items():
            if not data['moods']:
                continue
            
            # Most common mood of the day
            current_mood = max(set(data['moods']), key=data['moods'].count)
            
            # Mood encoding (1-10 scale)
            mood_map = {
                'great': 9, 'good': 7, 'okay': 5, 'calm': 6,
                'sad': 3, 'very_sad': 1, 'frustrated': 2, 'tired': 4
            }
            mood_value = mood_map.get(current_mood, 5)
            
            # Energy level (inferred from mood and activity)
            energy_level = max(1, min(10, mood_value + (data['tasks_completed'] * 0.5) + (data['focus_minutes'] / 30)))
            
            # Stress level (inferred from mood, medications, and task load)
            stress_level = max(1, min(10, 10 - mood_value + (data['tasks_completed'] * 0.3)))
            
            # Focus level (from focus sessions)
            focus_level = min(10, (data['focus_minutes'] / 60) * 2)  # 1 hour = 2 focus points, max 10
            
            # Productivity score
            productivity = (data['tasks_completed'] * 2) + (data['focus_minutes'] / 30)
            productivity = max(1, min(10, productivity))
            
            # Time features
            avg_hour = sum(data['hour_of_entry']) / len(data['hour_of_entry']) if data['hour_of_entry'] else (data['time_of_day'] or 12)
            is_weekend = 1 if (data['day_of_week'] or 0) >= 5 else 0
            
            # Note sentiment (simple: positive words = higher score)
            note_text = ' '.join(data['mood_notes']).lower()
            positive_words = ['good', 'great', 'happy', 'excited', 'calm', 'peaceful', 'productive']
            negative_words = ['sad', 'tired', 'stressed', 'anxious', 'frustrated', 'overwhelmed']
            sentiment_score = 5 + (sum(1 for w in positive_words if w in note_text) * 1) - (sum(1 for w in negative_words if w in note_text) * 1)
            sentiment_score = max(1, min(10, sentiment_score))
            
            # Sleep quality (inferred from mood and energy)
            sleep_quality = max(1, min(10, mood_value + (energy_level / 2)))
            
            # Social activity (from mood notes mentioning social events)
            social_activity = 1 if any(word in note_text for word in ['friend', 'family', 'party', 'meeting', 'social']) else 0
            
            # Comprehensive feature vector (10+ features)
            feature_dict = {
                'mood': mood_value,                    # Feature 1
                'energy_level': energy_level,           # Feature 2
                'stress_level': stress_level,           # Feature 3
                'focus_level': focus_level,             # Feature 4
                'productivity': productivity,           # Feature 5
                'medications_taken': data['medications'],  # Feature 6
                'tasks_completed': data['tasks_completed'], # Feature 7
                'focus_minutes': data['focus_minutes'],     # Feature 8
                'time_of_day': avg_hour,                    # Feature 9
                'day_of_week': data['day_of_week'] or 0,   # Feature 10
                'is_weekend': is_weekend,                   # Feature 11
                'sentiment_score': sentiment_score,         # Feature 12
                'sleep_quality': sleep_quality,             # Feature 13
                'social_activity': social_activity,         # Feature 14
            }
            features.append(feature_dict)
        
        return pd.DataFrame(features) if features else pd.DataFrame()
    
    def fit(self, mood_history: List[Dict], medication_history: List[Dict], 
            task_completion: List[Dict], target_moods: List[str], focus_sessions: List[Dict] = None):
        """
        Fit mood prediction model with PCA feature reduction.
        Reduces 10+ features to 3 principal components for better performance.
        """
        if not ML_AVAILABLE or len(mood_history) < 10:
            return False
        
        try:
            X = self.extract_features(mood_history, medication_history, task_completion, focus_sessions)
            if len(X) < 5:
                return False
            
            y = target_moods[:len(X)]  # Align with features
            
            # Encode labels
            self.mood_encoder = LabelEncoder()
            y_encoded = self.mood_encoder.fit_transform(y)
            
            # Standardize features before PCA
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Apply PCA to reduce dimensionality
            n_components = min(self.n_components, X_scaled.shape[1], X_scaled.shape[0] - 1)
            self.pca = PCA(n_components=n_components, random_state=42)
            X_pca = self.pca.fit_transform(X_scaled)
            
            # Log variance explained
            variance_explained = sum(self.pca.explained_variance_ratio_)
            logger.info(f"PCA: Reduced {X.shape[1]} features to {n_components} components, "
                       f"explaining {variance_explained:.1%} of variance")
            
            # Train XGBoost on reduced features
            self.mood_model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            )
            self.mood_model.fit(X_pca, y_encoded)
            
            y_pred = self.mood_model.predict(X_pca)
            acc = accuracy_score(y_encoded, y_pred)
            logger.info(f"Mood prediction model fitted with accuracy: {acc:.2%} (using PCA)")
            return True
        except Exception as e:
            logger.error(f"Error fitting mood model: {e}")
            return False
    
    def predict_next_mood(self, current_context: Dict) -> str:
        """
        Predict next mood based on current context.
        Uses PCA-reduced features for prediction.
        """
        if not self.mood_model or not self.pca or not self.scaler:
            return 'okay'  # Default
        
        try:
            # Build full feature vector matching extract_features structure
            now = datetime.now(timezone.utc)
            mood_value = current_context.get('mood_value', 5)
            energy_level = current_context.get('energy_level', 
                max(1, min(10, mood_value + (current_context.get('tasks_completed', 0) * 0.5))))
            stress_level = current_context.get('stress_level', 
                max(1, min(10, 10 - mood_value + (current_context.get('tasks_completed', 0) * 0.3))))
            focus_level = current_context.get('focus_level', 
                min(10, (current_context.get('focus_minutes', 0) / 60) * 2))
            productivity = current_context.get('productivity',
                max(1, min(10, (current_context.get('tasks_completed', 0) * 2))))
            
            feature_dict = {
                'mood': mood_value,
                'energy_level': energy_level,
                'stress_level': stress_level,
                'focus_level': focus_level,
                'productivity': productivity,
                'medications_taken': current_context.get('medications_taken', 0),
                'tasks_completed': current_context.get('tasks_completed', 0),
                'focus_minutes': current_context.get('focus_minutes', 0),
                'time_of_day': now.hour,
                'day_of_week': now.weekday(),
                'is_weekend': 1 if now.weekday() >= 5 else 0,
                'sentiment_score': current_context.get('sentiment_score', 5),
                'sleep_quality': current_context.get('sleep_quality', 5),
                'social_activity': current_context.get('social_activity', 0),
            }
            
            # Ensure all columns match training data
            X = pd.DataFrame([feature_dict])
            
            # Standardize and apply PCA
            X_scaled = self.scaler.transform(X)
            X_pca = self.pca.transform(X_scaled)
            
            # Predict
            pred_encoded = self.mood_model.predict(X_pca)[0]
            return self.mood_encoder.inverse_transform([pred_encoded])[0]
        except Exception as e:
            logger.error(f"Error predicting mood: {e}")
            return 'okay'

# ==================== 4. Note Classification (SVM) ====================

class NoteClassifier:
    """Classify notes by subject using SVM."""
    
    def __init__(self):
        self.classifier = None
        self.vectorizer = None
        self.label_encoder = None
        
    def fit(self, notes: List[Dict], labels: List[str]):
        """
        Fit SVM classifier for note classification.
        notes: [{"content": str, "title": str}, ...]
        labels: ['ML', 'Networking', 'Database', ...]
        """
        if not ML_AVAILABLE or len(notes) < 5:
            return False
        
        try:
            # Combine title and content
            texts = [
                f"{note.get('title', '')} {note.get('content', '')}" 
                for note in notes
            ]
            
            # TF-IDF vectorization
            self.vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            X = self.vectorizer.fit_transform(texts)
            
            # Encode labels
            self.label_encoder = LabelEncoder()
            y = self.label_encoder.fit_transform(labels)
            
            # Train SVM
            self.classifier = SVC(kernel='rbf', probability=True, random_state=42)
            self.classifier.fit(X, y)
            
            # Evaluate
            y_pred = self.classifier.predict(X)
            acc = accuracy_score(y, y_pred)
            logger.info(f"Note classifier fitted with accuracy: {acc:.2%}")
            return True
        except Exception as e:
            logger.error(f"Error fitting note classifier: {e}")
            return False
    
    def predict(self, note: Dict) -> Tuple[str, float]:
        """
        Predict subject for a note.
        Returns: (predicted_label, confidence)
        """
        if not self.classifier:
            return ('Other', 0.0)
        
        try:
            text = f"{note.get('title', '')} {note.get('content', '')}"
            X = self.vectorizer.transform([text])
            
            pred_encoded = self.classifier.predict(X)[0]
            proba = self.classifier.predict_proba(X)[0]
            confidence = float(max(proba))
            
            predicted_label = self.label_encoder.inverse_transform([pred_encoded])[0]
            return (predicted_label, confidence)
        except Exception as e:
            logger.error(f"Error predicting note class: {e}")
            return ('Other', 0.0)

# Global instances (will be initialized per user)
_recommendation_engines = {}
_task_prioritizers = {}
_mood_predictors = {}
_note_classifiers = {}

def get_recommendation_engine(user_id: str) -> RecommendationEngine:
    """Get or create recommendation engine for user."""
    if user_id not in _recommendation_engines:
        _recommendation_engines[user_id] = RecommendationEngine()
    return _recommendation_engines[user_id]

def get_task_prioritizer(user_id: str) -> TaskPrioritizer:
    """Get or create task prioritizer for user."""
    if user_id not in _task_prioritizers:
        _task_prioritizers[user_id] = TaskPrioritizer()
    return _task_prioritizers[user_id]

def get_mood_predictor(user_id: str) -> MoodPredictor:
    """Get or create mood predictor for user."""
    if user_id not in _mood_predictors:
        _mood_predictors[user_id] = MoodPredictor()
    return _mood_predictors[user_id]

def get_note_classifier(user_id: str) -> NoteClassifier:
    """Get or create note classifier for user."""
    if user_id not in _note_classifiers:
        _note_classifiers[user_id] = NoteClassifier()
    return _note_classifiers[user_id]

