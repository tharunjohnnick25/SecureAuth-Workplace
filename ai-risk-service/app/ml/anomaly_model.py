import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

MODEL_DIR = "/tmp/models"
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR, exist_ok=True)

class UserAnomalyModel:
    """
    Manages the Isolation Forest model for a specific user to detect 
    multi-dimensional anomalies in their login patterns.
    """
    
    MODEL_VERSION = "isolation_forest_v1"
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.model_path = os.path.join(MODEL_DIR, f"iforest_{user_id}.joblib")
        self.model = self._load_model()
        self.confidence = 0.8 if self.model else 0.0
        
    def _load_model(self) -> IsolationForest:
        if os.path.exists(self.model_path):
            try:
                return joblib.load(self.model_path)
            except Exception:
                pass
        return None

    def train(self, historical_features: list[list[float]]):
        """
        Train the Isolation Forest on the user's historical telemetry.
        Features typically include:
        [hour_of_day, distance_from_baseline_km, network_risk_score, typing_rhythm]
        """
        # We require at least 5 data points to train a meaningful model
        if len(historical_features) < 5:
            return False
            
        X = np.array(historical_features)
        
        # Fit the Isolation Forest
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.model.fit(X)
        
        # Serialize and save to disk (or Redis/S3 in production)
        joblib.dump(self.model, self.model_path)
        return True

    def predict_anomaly(self, current_features: list[float]) -> tuple[float, float, str]:
        """
        Predict if the current login is an anomaly.
        Returns (severity, confidence, model_version).
        Severity is between 0.0 (normal) and 100.0 (highly anomalous).
        """
        if not self.model:
            return 0.0, 0.0, self.MODEL_VERSION # Fail-open with low confidence
            
        X = np.array([current_features])
        
        # decision_function returns > 0 for normal, < 0 for anomaly.
        # It typically ranges from -0.5 to 0.5.
        score = self.model.decision_function(X)[0]
        
        # Map score to a 0-100 severity scale
        # Normal (score > 0) -> Severity 0-20
        # Anomalous (score < 0) -> Severity 50-100
        if score > 0:
            severity = max(0, 20.0 - (score * 40.0))
        else:
            severity = min(100.0, 50.0 + (abs(score) * 100.0))
            
        return severity, self.confidence, self.MODEL_VERSION
