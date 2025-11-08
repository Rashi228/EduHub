"""
ML Models for Smart Features:
1. Recommendation Engine (KNN)
2. Task Prioritization (XGBoost/SVM)
3. Mood Pattern Recognition (XGBoost/KNN)
4. Note Classification (SVM)
"""
import pickle
import random
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
        # Heuristic fallback configuration
        self.heuristic_weights = {
            'urgency': 5.0,
            'days_remaining': -2.0,
            'difficulty': 1.0
        }
        # Thresholds for mapping heuristic scores to labels
        self.heuristic_thresholds = {
            'high': 18.0,
            'medium': 10.0
        }

    # -------- Heuristic Helpers --------
    def calculate_priority_score(self, task: Dict, context: Optional[Dict] = None) -> float:
        """Compute heuristic priority score using weighted factors and fuzzy adjustments."""
        urgency_raw = int(task.get('urgency', 3))
        # Convert urgency scale (1=highest urgency) into positive weight where larger is more urgent
        urgency_score = 6 - max(1, min(5, urgency_raw))

        deadline = task.get('deadline')
        days_remaining = 7  # default neutral value when no deadline is provided
        if deadline:
            try:
                if isinstance(deadline, str):
                    deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                else:
                    deadline_dt = deadline
                delta_days = (deadline_dt - datetime.now(timezone.utc)).days
                days_remaining = max(-7, min(21, delta_days))
            except Exception:
                days_remaining = 7

        difficulty = task.get('difficulty', 'medium')
        difficulty_map = {'easy': 1, 'medium': 2, 'hard': 3}
        difficulty_score = difficulty_map.get(difficulty, 2)

        score = (
            self.heuristic_weights['urgency'] * urgency_score +
            self.heuristic_weights['days_remaining'] * days_remaining +
            self.heuristic_weights['difficulty'] * difficulty_score
        )

        return self.apply_fuzzy_logic(score, task, context)

    def apply_fuzzy_logic(self, score: float, task: Dict, context: Optional[Dict]) -> float:
        """Adjust heuristic score using lightweight fuzzy rules based on context."""
        if not context:
            return score

        mood = (context.get('mood') or '').lower()
        difficulty = task.get('difficulty', 'medium').lower()

        # Rule: medium difficulty + "okay" mood => treat as higher readiness
        if mood in {'okay', 'focused'} and difficulty == 'medium':
            score = max(score, self.heuristic_thresholds['high'])

        # Rule: low mood lowers priority for hard tasks to avoid burnout
        if mood in {'sad', 'very_sad', 'tired'} and difficulty == 'hard':
            score -= 4

        return score

    def map_score_to_priority(self, score: float) -> str:
        if score >= self.heuristic_thresholds['high']:
            return 'high'
        if score >= self.heuristic_thresholds['medium']:
            return 'medium'
        return 'low'

    def heuristic_priority(self, task: Dict, context: Optional[Dict] = None) -> Tuple[str, float]:
        score = self.calculate_priority_score(task, context)
        return self.map_score_to_priority(score), score
        
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
    
    def predict_priority(self, task: Dict, context: Optional[Dict] = None) -> str:
        """Predict priority for a single task."""
        if not self.priority_model:
            label, _ = self.heuristic_priority(task, context)
            return label
        
        try:
            X = self.extract_features([task])
            pred_encoded = self.priority_model.predict(X)[0]
            return self.priority_encoder.inverse_transform([pred_encoded])[0]
        except Exception as e:
            logger.error(f"Error predicting priority: {e}")
            label, _ = self.heuristic_priority(task, context)
            return label

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
        self.class_gans: Dict[int, 'MoodDataGAN'] = {}
        
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
            if X is None or X.empty or len(X) < 5:
                return False
            
            X = X.fillna(0)
            y = target_moods[:len(X)]  # Align with features
            
            # Encode labels
            self.mood_encoder = LabelEncoder()
            y_encoded = self.mood_encoder.fit_transform(y)
            
            feature_matrix = X.astype(float).values
            augmented_matrix = feature_matrix
            augmented_labels = y_encoded

            # Train class-specific GANs to augment data when classes are imbalanced
            synthetic_rows = []
            synthetic_labels = []
            self.class_gans = {}
            if feature_matrix.shape[0] >= 5 and len(np.unique(y_encoded)) > 1:
                class_counts = np.bincount(y_encoded)
                target_count = int(class_counts.max()) if class_counts.size else 0
                for label_idx in np.unique(y_encoded):
                    class_data = feature_matrix[y_encoded == label_idx]
                    if class_data.shape[0] < 3:
                        continue
                    gan = MoodDataGAN(feature_dim=class_data.shape[1])
                    try:
                        gan.train(class_data)
                        need_count = target_count - class_data.shape[0]
                        if need_count > 0:
                            generated = gan.generate(need_count)
                            if generated.size:
                                synthetic_rows.append(generated)
                                synthetic_labels.extend([label_idx] * generated.shape[0])
                    except Exception as gan_err:
                        logger.debug(f"GAN augmentation skipped for label {label_idx}: {gan_err}")
                    else:
                        self.class_gans[label_idx] = gan

            if synthetic_rows:
                augmented_matrix = np.vstack([augmented_matrix, *synthetic_rows])
                augmented_labels = np.concatenate([augmented_labels, np.array(synthetic_labels, dtype=augmented_labels.dtype)])
                logger.info(f"Mood GAN augmentation added {sum(len(r) for r in synthetic_rows)} samples")

            # Standardize features before PCA
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(augmented_matrix)
            
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
            self.mood_model.fit(X_pca, augmented_labels)
            
            y_pred = self.mood_model.predict(X_pca)
            acc = accuracy_score(augmented_labels, y_pred)
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

class MoodDataGAN:
    """Lightweight GAN to generate synthetic mood feature vectors."""

    def __init__(self, feature_dim: int, noise_dim: int = 8, learning_rate: float = 0.005):
        self.feature_dim = feature_dim
        self.noise_dim = noise_dim
        self.learning_rate = learning_rate

        # Generator parameters
        self.Wg = np.random.randn(noise_dim, feature_dim) * 0.1
        self.bg = np.zeros(feature_dim)

        # Discriminator parameters
        self.Wd = np.random.randn(feature_dim, 1) * 0.1
        self.bd = 0.0

        self.feature_mean = None
        self.feature_std = None
        self.is_trained = False

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-x))

    @staticmethod
    def _tanh(x: np.ndarray) -> np.ndarray:
        return np.tanh(x)

    def _normalize(self, data: np.ndarray) -> np.ndarray:
        if self.feature_mean is None or self.feature_std is None:
            self.feature_mean = data.mean(axis=0)
            self.feature_std = data.std(axis=0)
            self.feature_std[self.feature_std == 0] = 1.0
        return (data - self.feature_mean) / self.feature_std

    def _denormalize(self, data: np.ndarray) -> np.ndarray:
        if self.feature_mean is None or self.feature_std is None:
            return data
        return (data * self.feature_std) + self.feature_mean

    def _generator(self, noise: np.ndarray) -> np.ndarray:
        hidden = noise @ self.Wg + self.bg
        return self._tanh(hidden)

    def train(self, real_data: np.ndarray, epochs: int = 300, batch_size: int = 32):
        real_array = np.asarray(real_data, dtype=float)
        if real_array.ndim != 2 or real_array.shape[0] < 4:
            raise ValueError("Not enough data to train GAN")

        normalized = self._normalize(real_array)
        num_samples = normalized.shape[0]
        batch_size = min(batch_size, num_samples)

        for epoch in range(epochs):
            idx = np.random.choice(num_samples, batch_size, replace=True)
            batch_real = normalized[idx]

            noise = np.random.randn(batch_size, self.noise_dim)
            fake = self._generator(noise)

            # Update discriminator
            combined = np.vstack([batch_real, fake])
            labels = np.concatenate([np.ones(batch_size), np.zeros(batch_size)])
            logits = combined @ self.Wd + self.bd
            preds = self._sigmoid(logits)

            error = preds.flatten() - labels
            grad_Wd = combined.T @ error.reshape(-1, 1) / (2 * batch_size)
            grad_bd = error.mean()

            self.Wd -= self.learning_rate * grad_Wd
            self.bd -= self.learning_rate * grad_bd

            # Update generator
            logits_fake = fake @ self.Wd + self.bd
            preds_fake = self._sigmoid(logits_fake)
            grad_logits = preds_fake - 1
            grad_fake = grad_logits @ self.Wd.T
            grad_hidden = grad_fake * (1 - fake ** 2)
            grad_Wg = noise.T @ grad_hidden / batch_size
            grad_bg = grad_hidden.mean(axis=0)

            self.Wg -= self.learning_rate * grad_Wg
            self.bg -= self.learning_rate * grad_bg

            if epoch % 100 == 0:
                eps = 1e-9
                d_loss = -np.mean(np.log(preds[:batch_size] + eps) + np.log(1 - preds[batch_size:] + eps))
                g_loss = -np.mean(np.log(preds_fake + eps))
                logger.debug(f"MoodDataGAN epoch {epoch}: D_loss={d_loss:.4f}, G_loss={g_loss:.4f}")

        self.is_trained = True

    def generate(self, n_samples: int) -> np.ndarray:
        if not self.is_trained or n_samples <= 0:
            return np.empty((0, self.feature_dim))

        noise = np.random.randn(n_samples, self.noise_dim)
        synthetic = self._generator(noise)
        return self._denormalize(synthetic)

class TaskSchedulerGA:
    """Genetic algorithm to optimize daily task ordering."""

    def __init__(
        self,
        prioritizer: Optional[TaskPrioritizer] = None,
        population_size: int = 60,
        generations: int = 60,
        crossover_rate: float = 0.75,
        mutation_rate: float = 0.15,
    ):
        self.prioritizer = prioritizer or TaskPrioritizer()
        self.population_size = population_size
        self.generations = generations
        self.crossover_rate = crossover_rate
        self.mutation_rate = mutation_rate

    def optimize(self, tasks: List[Dict], context: Optional[Dict] = None) -> Dict:
        if not tasks:
            return {
                "schedule": [],
                "metadata": {"fitness": 0.0, "generations": 0, "prioritySummary": {}},
            }

        context = context or {}
        num_tasks = len(tasks)
        index_list = list(range(num_tasks))

        base_metrics = []
        priority_map = {"high": 3, "medium": 2, "low": 1}
        for idx, task in enumerate(tasks):
            label, score = self.prioritizer.heuristic_priority(task, context)
            weight = priority_map[label]
            base_metrics.append(
                {
                    "index": idx,
                    "label": label,
                    "score": score,
                    "weight": weight,
                }
            )

        # Seed population with heuristic ordering as baseline
        heuristic_order = sorted(index_list, key=lambda i: base_metrics[i]["score"], reverse=True)
        population = [heuristic_order[:]]
        for _ in range(self.population_size - 1):
            shuffled = heuristic_order[:]
            random.shuffle(shuffled)
            population.append(shuffled)

        fitness_history = []
        best_chromosome = None
        best_fitness = float("-inf")
        best_generation = 0

        for generation in range(self.generations):
            scored_population = []
            for chromosome in population:
                fitness_score = self._fitness(chromosome, tasks, base_metrics, context)
                scored_population.append((fitness_score, chromosome))

            scored_population.sort(key=lambda item: item[0], reverse=True)
            fitness_history.append(scored_population[0][0])

            if scored_population[0][0] > best_fitness:
                best_fitness = scored_population[0][0]
                best_chromosome = scored_population[0][1][:]
                best_generation = generation + 1

            elite_count = max(2, self.population_size // 5)
            next_population = [chromosome[:] for _, chromosome in scored_population[:elite_count]]

            while len(next_population) < self.population_size:
                parent1 = self._tournament_select(scored_population)
                parent2 = self._tournament_select(scored_population)
                child = self._crossover(parent1, parent2)
                child = self._mutate(child)
                next_population.append(child)

            population = next_population

        summary = {"high": 0, "medium": 0, "low": 0}
        for metrics in base_metrics:
            summary[metrics["label"]] += 1

        ordered_tasks = []
        if best_chromosome is None:
            best_chromosome = heuristic_order

        for rank, task_idx in enumerate(best_chromosome, start=1):
            task_copy = dict(tasks[task_idx])
            metrics = base_metrics[task_idx]
            task_copy["heuristicPriority"] = metrics["label"]
            task_copy["heuristicScore"] = round(metrics["score"], 2)
            task_copy["gaRank"] = rank
            if "_id" in task_copy:
                task_copy["id"] = str(task_copy["_id"])
                task_copy.pop("_id", None)
            for field in ("deadline", "createdAt", "updatedAt"):
                value = task_copy.get(field)
                if isinstance(value, datetime):
                    task_copy[field] = value.isoformat()
            ordered_tasks.append(task_copy)

        return {
            "schedule": ordered_tasks,
            "metadata": {
                "fitness": best_fitness,
                "evaluatedGenerations": best_generation,
                "fitnessHistory": fitness_history,
                "prioritySummary": summary,
            },
        }

    def _fitness(
        self,
        chromosome: List[int],
        tasks: List[Dict],
        base_metrics: List[Dict],
        context: Dict,
    ) -> float:
        total_score = 0.0
        penalty = 0.0
        mood_bonus = 0.0
        total_tasks = len(chromosome)

        for position, task_idx in enumerate(chromosome):
            metrics = base_metrics[task_idx]
            task = tasks[task_idx]

            priority_component = metrics["weight"] * (total_tasks - position)
            score_component = metrics["score"] * 0.1
            total_score += priority_component + score_component

            days_remaining = self._days_until_deadline(task)
            if days_remaining is not None:
                if days_remaining < 0:
                    penalty += abs(days_remaining) * 5
                elif days_remaining <= 2:
                    total_score += 2
                elif days_remaining > 7:
                    total_score -= 0.5

            mood_bonus += self._mood_bonus(task, context, position, total_tasks)

        return total_score - penalty + mood_bonus

    def _crossover(self, parent1: List[int], parent2: List[int]) -> List[int]:
        if random.random() > self.crossover_rate:
            return parent1[:]

        size = len(parent1)
        start, end = sorted(random.sample(range(size), 2))
        child = [None] * size
        child[start:end] = parent1[start:end]

        pointer = 0
        for gene in parent2:
            if gene not in child:
                while child[pointer] is not None:
                    pointer += 1
                child[pointer] = gene

        return child

    def _mutate(self, chromosome: List[int]) -> List[int]:
        if random.random() > self.mutation_rate:
            return chromosome

        mutated = chromosome[:]
        i, j = random.sample(range(len(mutated)), 2)
        mutated[i], mutated[j] = mutated[j], mutated[i]
        return mutated

    def _tournament_select(self, scored_population: List[Tuple[float, List[int]]]) -> List[int]:
        pool_size = max(3, min(len(scored_population), max(5, len(scored_population) // 2)))
        pool = scored_population[:pool_size]
        k = min(len(pool), 3)
        contenders = random.sample(pool, k)
        contenders.sort(key=lambda item: item[0], reverse=True)
        return contenders[0][1][:]

    def _days_until_deadline(self, task: Dict) -> Optional[int]:
        deadline = task.get("deadline")
        if not deadline:
            return None
        try:
            if isinstance(deadline, str):
                deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            else:
                deadline_dt = deadline
            return (deadline_dt - datetime.now(timezone.utc)).days
        except Exception:
            return None

    def _mood_bonus(self, task: Dict, context: Dict, position: int, total_tasks: int) -> float:
        mood = (context.get("mood") or "").lower()
        if not mood:
            return 0.0

        difficulty = task.get("difficulty", "medium").lower()
        position_factor = max(0, total_tasks - position)

        if mood in {"focused", "okay", "energetic"} and difficulty in {"hard", "medium"}:
            return position_factor * 0.5
        if mood in {"sad", "very_sad", "tired"} and difficulty == "hard":
            return -1.0 * (position + 1)
        return 0.0

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
_task_schedulers = {}

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

def get_task_scheduler(user_id: str) -> TaskSchedulerGA:
    """Get or create GA-based task scheduler for user."""
    if user_id not in _task_schedulers:
        _task_schedulers[user_id] = TaskSchedulerGA(get_task_prioritizer(user_id))
    return _task_schedulers[user_id]

