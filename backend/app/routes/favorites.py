import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models.user import User
from app.models.clothing import FavoriteOutfit
from app.utils.auth import decode_access_token
from pydantic import BaseModel
from datetime import datetime
from app.core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

router = APIRouter(prefix="/api/favorites", tags=["favorites"])
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


class FavoriteCreate(BaseModel):
    occasion: str
    combination_data: str  # JSON string


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    occasion: str
    combination_data: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=FavoriteResponse)
def add_favorite(
    favorite: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a combination to favorites"""
    new_favorite = FavoriteOutfit(
        user_id=current_user.id,
        occasion=favorite.occasion,
        combination_data=favorite.combination_data
    )
    
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    
    return new_favorite


@router.get("/", response_model=List[FavoriteResponse])
def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page")
):
    """Get all favorites for current user with pagination"""
    # Calculate offset
    offset = (page - 1) * page_size
    
    favorites = (
        db.query(FavoriteOutfit)
        .filter(FavoriteOutfit.user_id == current_user.id)
        .order_by(FavoriteOutfit.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    
    return favorites


@router.delete("/{favorite_id}")
def delete_favorite(
    favorite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a favorite"""
    favorite = db.query(FavoriteOutfit).filter(
        FavoriteOutfit.id == favorite_id,
        FavoriteOutfit.user_id == current_user.id
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    db.delete(favorite)
    db.commit()
    
    return {"success": True, "message": "Favorite deleted"}
