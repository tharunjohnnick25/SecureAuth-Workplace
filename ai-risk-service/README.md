# AI Risk Service (Behavioral Biometrics)

This microservice provides a complete, production-ready AI system to predict employee risk scores during login using behavioral biometrics and contextual signals, complying with GDPR/DPDP.

## Tech Stack
- FastAPI, XGBoost, scikit-learn, SHAP
- PostgreSQL (for metrics), Redis (for low latency baselines)

## Installation & Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Run the API server locally:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Model Pipeline
The hybrid model combines:
- **XGBoost**: Supervised gradient boosted trees predicting likelihood of account takeover based on geo-velocity, new devices, and time anomalies.
- **Isolation Forest**: Unsupervised anomaly detection that flags behavioral outliers (typing rhythm, mouse dynamics) compared to the user's historical baseline.
- **Explainability (SHAP)**: Every risk score is accompanied by the top 3 contributing factors for transparent auditing.

## DevOps & ML Ops
- **Cron Retraining**: A GitHub Action (`.github/workflows/retrain_model.yml`) triggers `scripts/train.py` weekly to fetch the latest 7 days of logs, retrain the models, and evaluate the AUC threshold (>0.92) before deployment.
- **Docker**: Build via `docker build -t secureauth/ai-risk-service .`
- **Kubernetes**: Helm charts are located in `helm/` with auto-scaling configured between 2 and 10 replicas based on CPU usage.

## API Usage

### `POST /api/v1/risk-score`
Calculates the risk score for a login attempt.

**Headers:**
`Authorization: Bearer <API_KEY>`

**Request Body:**
```json
{
  "user_id": "employee@company.com",
  "location": {
    "ip": "192.168.1.100",
    "city": "San Francisco"
  },
  "device": {
    "fingerprint": "hash123"
  }
}
```

**Response:**
```json
{
  "risk_score": 45.2,
  "risk_level": "medium",
  "contributing_factors": ["New/Unrecognized Device"],
  "timestamp": "2026-08-11T12:00:00Z"
}
```

## Compliance (GDPR/DPDP)
- **Data Minimization:** Raw features are not stored indefinitely; they are converted into derived features (z-scores) and raw data is soft-deleted after 30 days.
- **Right to Erasure:** Users can erase their behavioral biometrics from the Next.js `app/settings/security/page.tsx` UI.
