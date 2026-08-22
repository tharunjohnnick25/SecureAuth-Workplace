from fastapi import HTTPException, Security, Request
from fastapi.security import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

# Rate Limiter based on Client IP Address
limiter = Limiter(key_func=get_remote_address)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if not api_key:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Missing Authorization Header"
        )
    
    # Strip "Bearer " if present
    if api_key.startswith("Bearer "):
        api_key = api_key.split(" ")[1]
        
    if api_key != settings.API_KEY:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
        )
    return api_key
