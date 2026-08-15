import math
from datetime import datetime
from app.models.schemas import LoginRequest, UserContextProfile, RiskEvaluationOutput, GPSCoordinates

class ZeroTrustRiskEngine:
    # Signal Weights Matrix
    W_LOCATION = 0.35
    W_DEVICE   = 0.25
    W_NETWORK  = 0.15
    W_TEMPORAL = 0.15
    W_BEHAVIOR = 0.10

    # Critical Threat Heuristics
    BLACKLISTED_IPS = {"198.51.100.44", "203.0.113.88"}

    def __init__(self):
        pass

    def _haversine_distance(self, loc1: GPSCoordinates, loc2: GPSCoordinates) -> float:
        """Calculate the great-circle distance between two points on the Earth surface."""
        R = 6371.0 # Earth radius in kilometers
        lat1, lon1 = math.radians(loc1.latitude), math.radians(loc1.longitude)
        lat2, lon2 = math.radians(loc2.latitude), math.radians(loc2.longitude)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _eval_gps_location(self, current: LoginRequest, profile: UserContextProfile) -> float:
        if not profile.last_login_location or not profile.last_login_timestamp:
            return 20.0 # Mild risk for first-time or untracked location
        
        distance_km = self._haversine_distance(current.location, profile.last_login_location)
        time_diff_hours = (current.timestamp - profile.last_login_timestamp).total_seconds() / 3600.0
        
        if time_diff_hours <= 0:
            return 100.0 # Time travel anomaly
            
        velocity = distance_km / time_diff_hours
        
        if velocity > 900.0:
            return 100.0 # Impossible travel
        elif distance_km > 100:
            return 50.0 # Unusual distance, but possible
        return 0.0

    def _eval_device_posture(self, current: LoginRequest, profile: UserContextProfile) -> float:
        score = 0.0
        if current.device_id not in profile.known_device_ids:
            score += 50.0 # Unrecognized device
        if not current.device_is_corporate:
            score += 30.0 # BYOD or personal device introduces mild risk
        if not current.device_is_compliant:
            score += 100.0 # Missing MDM / Jailbroken caps out the severity
        return min(score, 100.0)

    def _eval_network_context(self, current: LoginRequest) -> float:
        network_risks = {
            "VPN": 0.0,
            "ISP": 20.0,
            "PUBLIC_WIFI": 70.0,
            "TOR": 100.0
        }
        return network_risks.get(current.network_type, 50.0)

    def _eval_temporal_time(self, current: LoginRequest, profile: UserContextProfile) -> float:
        current_hour = current.timestamp.hour + (current.timestamp.minute / 60.0)
        baseline_hour = profile.typical_login_hour
        
        # Circular math for 24-hour clock
        diff = abs(current_hour - baseline_hour)
        shortest_diff = min(diff, 24.0 - diff)
        
        # Max deviation is 12 hours (mapped to 100 severity)
        return (shortest_diff / 12.0) * 100.0

    def _eval_typing_behavior(self, current: LoginRequest) -> float:
        return current.typing_anomaly_score

    def evaluate(self, request: LoginRequest, profile: UserContextProfile) -> RiskEvaluationOutput:
        from app.ml.anomaly_model import UserAnomalyModel
        
        start_time = datetime.now()
        triggered_overrides = []
        
        # 1. STATIC/HEURISTIC OVERRIDES (FAIL-FAST)
        if request.ip_address in self.BLACKLISTED_IPS:
            triggered_overrides.append("BLACKLISTED_IP")
        if not request.device_is_compliant:
            triggered_overrides.append("NON_COMPLIANT_DEVICE")
        if request.network_type == "TOR":
            triggered_overrides.append("ANONYMIZING_NETWORK")
            
        if triggered_overrides:
            action = "BLOCK"
            final_score = 100.0
            factors = {"override": True}
        else:
            # 2. DYNAMIC WEIGHTED RISK CALCULATION
            s_loc = self._eval_gps_location(request, profile)
            s_dev = self._eval_device_posture(request, profile)
            s_net = self._eval_network_context(request)
            s_time = self._eval_temporal_time(request, profile)
            s_beh = self._eval_typing_behavior(request)
            
            # 3. MACHINE LEARNING: Isolation Forest Anomaly Detection
            ml_model = UserAnomalyModel(request.user_id)
            current_features = [s_time, s_loc, s_net, s_beh]
            ml_severity = ml_model.predict_anomaly(current_features)
            
            # Blend Heuristics with ML
            # If ML has a model (severity != 0.0 generally, though it could be exactly 0), 
            # we assign it a 25% weight and slightly reduce others.
            if ml_severity > 0.1 or ml_model.model is not None:
                final_score = (
                    (0.25 * s_loc) +
                    (0.20 * s_dev) +
                    (0.10 * s_net) +
                    (0.10 * s_time) +
                    (0.10 * s_beh) +
                    (0.25 * ml_severity)
                )
            else:
                final_score = (
                    (self.W_LOCATION * s_loc) +
                    (self.W_DEVICE * s_dev) +
                    (self.W_NETWORK * s_net) +
                    (self.W_TEMPORAL * s_time) +
                    (self.W_BEHAVIOR * s_beh)
                )
            
            factors = {
                "location_severity": round(s_loc, 2),
                "device_severity": round(s_dev, 2),
                "network_severity": round(s_net, 2),
                "temporal_severity": round(s_time, 2),
                "behavior_severity": round(s_beh, 2),
                "ml_anomaly_severity": round(ml_severity, 2)
            }
            
            # 4. ACTION THRESHOLDS
            if final_score <= 30.0:
                action = "ALLOW"
            elif final_score <= 70.0:
                action = "CHALLENGE"
            else:
                action = "BLOCK"
                
        execution_time_ms = (datetime.now() - start_time).total_seconds() * 1000.0
        
        return RiskEvaluationOutput(
            user_id=request.user_id,
            final_score=round(final_score, 2),
            action=action,
            factors=factors,
            triggered_overrides=triggered_overrides,
            evaluation_time_ms=round(execution_time_ms, 3)
        )
