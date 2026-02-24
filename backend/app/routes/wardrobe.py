"""
Wardrobe Analytics API - Expose usage stats and diversity metrics
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models.user import User
from app.utils.auth import decode_access_token
from app.services.usage_stats_service import get_wardrobe_analytics

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])
security = HTTPBearer(auto_error=False)


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


@router.get("/analytics")
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive wardrobe analytics
    
    Returns:
    - total_items: Total clothing items in wardrobe
    - usage_heatmap: Items used in last 7 days
    - diversity_index: Unique item pairings percentage
    - staleness_count: Items not used in 30 days
    - overuse_alerts: Items used more than 2x average
    """
    analytics = get_wardrobe_analytics(db, current_user.id)
    return analytics
