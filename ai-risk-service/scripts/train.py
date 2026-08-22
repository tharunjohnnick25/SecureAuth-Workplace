"""
Offline training script for the Isolation Forest model.
Fetches historical telemetry from public.login_history to baseline users.
"""
import os
import sys
import logging
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

# Add the 'app' module to the path so we can import UserAnomalyModel
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.ml.anomaly_model import UserAnomalyModel

logging.basicConfig(level=logging.INFO)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env.local'))

def fetch_training_data():
    logging.info("Fetching last 30 days of login_history from PostgreSQL...")
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        logging.error("SUPABASE_DB_URL is not set. Cannot fetch training data.")
        return {}

    try:
        # Expected connection string: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DB]
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # We need typical login hour, location deviation, network type, typing rhythm
        # Since we don't have all these explicitly populated as floats in login_history for now,
        # we will extract temporal and location features.
        query = """
            SELECT user_id, 
                   created_at,
                   latitude,
                   longitude
            FROM public.login_history 
            WHERE status = 'SUCCESS' 
              AND created_at >= NOW() - INTERVAL '30 days';
        """
        cur.execute(query)
        rows = cur.fetchall()
        
        user_features = {}
        for row in rows:
            user_id = row[0]
            created_at = row[1]
            lat = row[2] or 0.0
            lon = row[3] or 0.0
            
            # Simple feature mapping for Isolation Forest
            # 1. Temporal feature: hour of day
            hour_val = created_at.hour + (created_at.minute / 60.0)
            
            # 2. Location pseudo-feature: distance from 0,0 or basic lat/lon
            loc_val = (lat**2 + lon**2)**0.5
            
            # 3. Network / Typing mocked as baseline for now if missing
            net_val = 0.0
            typ_val = 5.0
            
            feature_vector = [hour_val, loc_val, net_val, typ_val]
            
            if user_id not in user_features:
                user_features[user_id] = []
            user_features[user_id].append(feature_vector)
            
        cur.close()
        conn.close()
        logging.info(f"Fetched historical data for {len(user_features)} users.")
        return user_features

    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        return {}

def retrain_models(user_data):
    logging.info("Training Isolation Forest unsupervised models per user...")
    success_count = 0
    for user_id, features in user_data.items():
        if len(features) >= 5:
            model = UserAnomalyModel(user_id)
            if model.train(features):
                success_count += 1
                
    logging.info(f"Successfully trained models for {success_count} users.")
    return success_count

if __name__ == "__main__":
    logging.info(f"Starting model retraining job at {datetime.utcnow()}")
    user_data = fetch_training_data()
    retrain_models(user_data)
    logging.info("Retraining job complete.")
