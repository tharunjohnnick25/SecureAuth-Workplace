import json
import logging
from app.worker import celery_app
from app.ml.anomaly_model import UserAnomalyModel

@celery_app.task(name="update_user_sketches")
def update_user_sketches(payload_json: str):
    """
    Ingests raw login telemetry in the background to update moving averages 
    and fast-sketches without blocking the hot path.
    """
    try:
        data = json.loads(payload_json)
        user_id = data.get("user_id")
        logging.info(f"[Celery] Updating sketches for user {user_id}")
        
        # In a real implementation, we would pull the EMA baseline from Redis, 
        # blend it with the current signal, and write it back.
        # e.g., new_typical_hour = (0.9 * old_hour) + (0.1 * current_hour)
        
        # After updating sketches, we can conditionally trigger a full retrain 
        # if the user has accumulated enough new logs.
        # For demonstration, we trigger it immediately.
        retrain_isolation_forest.delay(user_id)
        
    except Exception as e:
        logging.error(f"[Celery] Error updating sketches: {str(e)}")


@celery_app.task(name="retrain_isolation_forest")
def retrain_isolation_forest(user_id: str):
    """
    Re-fits the Isolation Forest model for the given user.
    """
    logging.info(f"[Celery] Retraining Isolation Forest for user {user_id}")
    
    # Mocking fetching historical login data from a data lake / SQL database.
    # We generate some synthetic historical baselines representing "normal" behavior.
    # Features: [temporal_severity, location_severity, network_severity, behavior_severity]
    # Normal behavior usually sits near 0.
    historical_data = [
        [2.0, 0.0, 10.0, 5.0],
        [1.5, 5.0, 0.0, 4.0],
        [5.0, 0.0, 20.0, 6.0],
        [0.0, 0.0, 0.0, 2.0],
        [3.0, 10.0, 0.0, 5.0],
        [2.5, 0.0, 0.0, 4.5]
    ]
    
    model = UserAnomalyModel(user_id)
    success = model.train(historical_data)
    
    if success:
        logging.info(f"[Celery] Successfully serialized updated Isolation Forest for {user_id}")
    else:
        logging.warning(f"[Celery] Not enough data to train Isolation Forest for {user_id}")
