import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from dotenv import load_dotenv
from ml_model import MLRiskPredictor

load_dotenv()

app = FastAPI(title="AI Risk Prediction Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")
predictor = MLRiskPredictor()

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

class RiskEvaluationRequest(BaseModel):
    user_id: str
    session_id: str = "default_session"
    telemetry: Dict[str, Any]

@app.post("/evaluate")
def evaluate_risk(req: RiskEvaluationRequest):
    try:
        # Calculate risk score via ML model
        result = predictor.predict_risk_score(req.telemetry)
        
        # Log to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            INSERT INTO public.ml_risk_logs 
            (user_id, session_id, risk_score, risk_level, top_factors, telemetry_data) 
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                req.user_id, 
                req.session_id, 
                result["score"], 
                result["level"], 
                json.dumps(result["factors"]), 
                json.dumps(req.telemetry)
            )
        )
        log_id = cursor.fetchone()['id']
        conn.commit()
        cursor.close()
        conn.close()
        
        # Determine necessary actions based on level
        action = "ALLOW"
        if result["level"] == "CRITICAL":
            action = "BLOCK"
        elif result["level"] == "HIGH":
            action = "REQUIRE_APPROVAL"
        elif result["level"] == "MEDIUM":
            action = "REQUIRE_MFA"
            
        return {
            "status": "success",
            "log_id": log_id,
            "risk_report": result,
            "recommended_action": action
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
