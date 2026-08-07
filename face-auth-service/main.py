import os
import base64
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, WebSocket, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import cv2
from dotenv import load_dotenv

from face_utils import check_image_quality, extract_face_embedding, match_face

load_dotenv()

app = FastAPI(title="Face Auth Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

class RegisterRequest(BaseModel):
    user_id: str
    images: List[str] # Base64 encoded images

class VerifyRequest(BaseModel):
    user_id: str
    image: str # Base64 encoded image

def base64_to_cv2(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

@app.post("/register")
def register_face(req: RegisterRequest):
    if len(req.images) == 0:
        raise HTTPException(status_code=400, detail="No images provided")
        
    embeddings = []
    
    # Process the first valid image for embedding (can be improved by averaging embeddings)
    for b64_img in req.images:
        img_np = base64_to_cv2(b64_img)
        if img_np is None:
            continue
            
        is_good, msg = check_image_quality(img_np)
        if not is_good:
            continue
            
        embedding, err = extract_face_embedding(img_np)
        if embedding is not None:
            embeddings.append(embedding)
            break # We just take the first good one for now
            
    if len(embeddings) == 0:
        raise HTTPException(status_code=400, detail="Could not extract face embedding from provided images")
        
    final_embedding = embeddings[0]
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Invalidate old embeddings
        cursor.execute("UPDATE public.face_embeddings SET is_active = FALSE WHERE user_id = %s", (req.user_id,))
        
        # Insert new
        cursor.execute(
            "INSERT INTO public.face_embeddings (user_id, embedding) VALUES (%s, %s)",
            (req.user_id, json.dumps(final_embedding))
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"status": "success", "message": "Face registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/verify")
def verify_face(req: VerifyRequest):
    img_np = base64_to_cv2(req.image)
    if img_np is None:
        raise HTTPException(status_code=400, detail="Invalid image")
        
    is_good, msg = check_image_quality(img_np)
    if not is_good:
        raise HTTPException(status_code=400, detail=msg)
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT embedding FROM public.face_embeddings WHERE user_id = %s AND is_active = TRUE ORDER BY created_at DESC LIMIT 1", (req.user_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="No registered face found for user")
            
        stored_embedding = row['embedding']
        
        is_match, confidence, error = match_face(img_np, stored_embedding)
        
        if error:
            raise HTTPException(status_code=400, detail=error)
            
        if not is_match:
            return {"status": "failed", "message": "Face verification failed", "confidence": confidence}
            
        return {"status": "success", "message": "Face verified", "confidence": confidence}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.websocket("/liveness")
async def liveness_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Simple liveness flow: ask to blink or smile
    actions = ["blink", "smile", "turn_head"]
    import random
    
    try:
        while True:
            data = await websocket.receive_text()
            # expecting JSON like {"action": "start"}
            parsed = json.loads(data)
            
            if parsed.get("action") == "request_prompt":
                action = random.choice(actions)
                await websocket.send_json({"prompt": f"Please {action.replace('_', ' ')}", "required_action": action})
            elif parsed.get("action") == "frame":
                # In a real app, process the frame and check if the action was performed
                # Here we mock the success after receiving a few frames
                await websocket.send_json({"status": "liveness_passed"})
    except Exception as e:
        print(f"WebSocket closed: {e}")
