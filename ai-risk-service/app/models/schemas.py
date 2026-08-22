from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GPSCoordinates(BaseModel):
    latitude: float
    longitude: float

class UserContextProfile(BaseModel):
    user_id: str
    last_login_timestamp: Optional[datetime] = None
    last_login_location: Optional[GPSCoordinates] = None
    known_device_ids: List[str] = []
    typical_login_hour: float = 9.0  # e.g., 9.0 = 9:00 AM

class LoginRequest(BaseModel):
    user_id: str
    timestamp: datetime
    ip_address: str
    location: GPSCoordinates
    device_id: str
    device_is_corporate: bool = False
    device_is_compliant: bool = True
    network_type: str = Field(..., description="VPN, ISP, PUBLIC_WIFI, TOR")
    typing_anomaly_score: float = Field(..., ge=0.0, le=100.0, description="0=Normal, 100=Bot/Anomalous")
    profile: Optional[UserContextProfile] = None

class RiskEvaluationOutput(BaseModel):
    user_id: str
    anomaly_score: float
    ai_risk_score: float
    confidence: float
    risk_level: str
    signals: List[str]
    model_version: str
    action: str = Field(..., description="ALLOW, CHALLENGE, BLOCK")
    factors: dict
    triggered_overrides: List[str]
    evaluation_time_ms: float
    llm_explanation: Optional[str] = None
