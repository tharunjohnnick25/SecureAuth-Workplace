import numpy as np
from app.models.schemas import LoginFeatures

def compute_anomalies(features: LoginFeatures, baselines: dict) -> list:
    """
    Computes numerical anomaly scores (z-scores, distances) based on historical user baselines.
    In a real scenario, this fetches from Redis and computes haversine distance.
    Returns a float array suitable for XGBoost inference.
    """
    # Mock computation for demonstration
    vector = []
    
    # 1. Geographic Anomaly (distance from median location)
    if baselines.get("median_lat") and features.location.latitude:
        distance = abs(baselines["median_lat"] - features.location.latitude)
        vector.append(distance)
    else:
        vector.append(0.0)
        
    # 2. Time Anomaly (difference from typical login hour)
    current_hour = features.timestamp.hour
    baseline_hour = baselines.get("median_hour", 9)
    vector.append(abs(current_hour - baseline_hour))
    
    # 3. Device Anomaly (new device flag)
    is_new_device = 1.0 if features.device.fingerprint != baselines.get("last_device_fp") else 0.0
    vector.append(is_new_device)
    
    # 4. Behavioral Biometrics Anomaly (Typing Speed Z-Score)
    if features.typing_metrics and baselines.get("typing_mean"):
        speed_diff = abs(features.typing_metrics.speed_cps - baselines["typing_mean"])
        z_score = speed_diff / max(baselines.get("typing_std", 1.0), 0.1)
        vector.append(z_score)
    else:
        vector.append(0.0)
        
    # 5. Network (VPN / Tor)
    vector.append(1.0 if features.is_vpn else 0.0)
    
    return [vector] # Return as 2D array for sklearn/xgboost
