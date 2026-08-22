from fastapi import FastAPI, Depends, HTTPException, Header
from datetime import datetime
import logging

from app.models.schemas import LoginRequest, RiskEvaluationOutput, UserContextProfile, GPSCoordinates
from app.services.risk_engine import ZeroTrustRiskEngine

# Initialize App
app = FastAPI(
    title="SecureAuth AI Risk Service",
    description="Real-time Zero Trust Login Risk Assessment Engine.",
    version="2.0.0"
)

engine = ZeroTrustRiskEngine()

def verify_api_key(authorization: str = Header(...)):
    if not authorization or authorization != "Bearer demo-risk-key-2026":
        raise HTTPException(status_code=401, detail="Invalid API Key")

@app.post("/api/v1/risk-score", response_model=RiskEvaluationOutput)
async def calculate_risk_score(
    login_request: LoginRequest, 
    auth: str = Depends(verify_api_key)
):
    try:
        if login_request.profile:
            mock_profile = login_request.profile
        else:
            # Mocking the User Context Profile for demonstration fallback.
            mock_profile = UserContextProfile(
                user_id=login_request.user_id,
                last_login_timestamp=datetime.utcnow(),
                last_login_location=GPSCoordinates(latitude=37.7749, longitude=-122.4194),
                known_device_ids=[login_request.device_id],
                typical_login_hour=9.0
            )
            
            if login_request.location:
                mock_profile.last_login_location = GPSCoordinates(
                    latitude=login_request.location.latitude + 0.01,
                    longitude=login_request.location.longitude + 0.01
                )
                mock_profile.last_login_timestamp = datetime(2026, 8, 15, 9, 0, 0)

        # Execute Engine
        result = engine.evaluate(login_request, mock_profile)
        
        # Invoke LLM XDR Translation if the score is elevated
        if result.final_score >= 60.0 or result.action in ["BLOCK", "CHALLENGE"]:
            from app.services.llm_xdr import LLMXDRService
            llm_xdr = LLMXDRService()
            explanation = llm_xdr.generate_explanation(
                action=result.action,
                factors=result.factors,
                overrides=result.triggered_overrides
            )
            result.llm_explanation = explanation
        
        # Dispatch Cold Path ML update (Asynchronous)
        try:
            from app.tasks.training_tasks import update_user_sketches
            # Fire and forget. Does not block the HTTP response.
            update_user_sketches.delay(login_request.model_dump_json())
        except Exception as celery_err:
            logging.warning(f"Failed to dispatch Celery task: {celery_err}")
            
        return result
        
    except Exception as e:
        logging.error(f"Risk calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during risk evaluation.")
