import numpy as np
from sklearn.ensemble import IsolationForest
import pandas as pd

class MLRiskPredictor:
    def __init__(self):
        # In a real-world scenario, we would load a pre-trained model for each user
        # or a generalized model. We'll simulate an IsolationForest here.
        self.model = IsolationForest(contamination=0.1, random_state=42)
        
        # We need to "fit" it on some dummy baseline data to make predictions work
        # Features: [WPM, typing_variance, mouse_distance, face_confidence, time_anomaly]
        dummy_X = np.array([
            [60.0, 5.0, 1000.0, 95.0, 0.0],
            [55.0, 6.0, 1200.0, 90.0, 0.0],
            [65.0, 4.0, 900.0, 98.0, 0.0],
            [58.0, 5.5, 1100.0, 92.0, 0.0],
        ])
        self.model.fit(dummy_X)

    def extract_features(self, telemetry):
        """
        Extract numeric features from raw telemetry JSON.
        """
        wpm = telemetry.get('typing_wpm', 60.0)
        variance = telemetry.get('typing_variance', 5.0)
        mouse_dist = telemetry.get('mouse_distance', 1000.0)
        face_conf = telemetry.get('face_confidence', 95.0)
        time_anomaly = telemetry.get('time_anomaly', 0.0) # 0 = normal, 1 = unusual hour
        
        return np.array([[wpm, variance, mouse_dist, face_conf, time_anomaly]])

    def predict_risk_score(self, telemetry):
        """
        Predicts a risk score (0-100) based on telemetry.
        100 = completely trusted, 0 = highly anomalous.
        """
        X = self.extract_features(telemetry)
        
        # IsolationForest decision_function returns an anomaly score
        # The lower, the more abnormal. Typically between -0.5 and 0.5
        anomaly_score = self.model.decision_function(X)[0]
        
        # Normalize to 0-100
        # Let's say max normal is 0.2, min abnormal is -0.3
        normalized = ((anomaly_score - (-0.3)) / (0.2 - (-0.3))) * 100
        
        # Clamp between 0 and 100
        risk_score = max(0, min(100, normalized))
        
        # Adjust score manually based on hard rules integrated with ML
        if telemetry.get('new_device', False):
            risk_score -= 20
        if telemetry.get('new_location', False):
            risk_score -= 25
        if telemetry.get('failed_attempts', 0) > 0:
            risk_score -= (telemetry.get('failed_attempts') * 15)
            
        final_score = max(0, min(100, risk_score))
        
        # Determine level
        if final_score >= 90: level = 'TRUSTED'
        elif final_score >= 80: level = 'LOW'
        elif final_score >= 60: level = 'MEDIUM'
        elif final_score >= 40: level = 'HIGH'
        else: level = 'CRITICAL'
        
        # Explain top factors
        factors = []
        if telemetry.get('new_location', False): factors.append({"factor": "Unusual Location", "impact": -25})
        if telemetry.get('new_device', False): factors.append({"factor": "Unrecognized Device", "impact": -20})
        if telemetry.get('typing_wpm', 60.0) < 30.0: factors.append({"factor": "Anomalous Typing Speed", "impact": -15})
        if telemetry.get('failed_attempts', 0) > 0: factors.append({"factor": "Failed Authentications", "impact": -15})
        
        if not factors:
            factors.append({"factor": "Normal Behavior", "impact": 0})
            
        return {
            "score": round(final_score, 1),
            "level": level,
            "factors": factors
        }
