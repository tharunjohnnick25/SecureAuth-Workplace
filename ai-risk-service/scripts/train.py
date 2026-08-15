"""
Offline training script for the XGBoost and Isolation Forest models.
This script is triggered weekly via GitHub Actions.
"""
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)

def fetch_training_data():
    logging.info("Fetching last 7 days of login_attempts from PostgreSQL...")
    # Mock data fetch
    return []

def retrain_models(data):
    logging.info("Training XGBoost supervised model (binary:logistic)...")
    logging.info("Training Isolation Forest unsupervised model...")
    # Mock training loop
    auc = 0.94 # Target > 0.92
    return auc

def deploy_model_if_better(auc):
    if auc > 0.92:
        logging.info(f"Model AUC {auc} exceeds threshold. Deploying new version.")
        # Save ONNX / PKL to S3/GCS or model registry
    else:
        logging.warning(f"Model AUC {auc} below threshold. Aborting deployment.")

if __name__ == "__main__":
    logging.info(f"Starting weekly model retraining job at {datetime.utcnow()}")
    data = fetch_training_data()
    auc = retrain_models(data)
    deploy_model_if_better(auc)
    logging.info("Retraining job complete.")
