import os
from celery import Celery

# Use Redis as the broker and backend. 
# In a real environment, this would use a robust Redis cluster.
# For local dev, it falls back to a dummy memory broker or expects localhost redis.
redis_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "ai_risk_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.training_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
