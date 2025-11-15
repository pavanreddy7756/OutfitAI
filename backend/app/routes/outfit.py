from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models.user import User
from app.models.clothing import ClothingItem, Outfit, OutfitItem
from app.schemas.clothing import OutfitCreate, OutfitResponse
from app.utils.auth import decode_access_token
from app.services.ai_service import generate_outfit_suggestions

router = APIRouter(prefix="/api/outfits", tags=["outfits"])
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
    
    if payload is None or "user_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

@router.post("/generate", response_model=OutfitResponse)
def generate_outfit(
    outfit_create: OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate outfit suggestion"""
    # Get clothing items
    clothing_items = db.query(ClothingItem).filter(
        ClothingItem.id.in_(outfit_create.clothing_item_ids),
        ClothingItem.user_id == current_user.id
    ).all()
    
    if not clothing_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid clothing items provided"
        )
    
    # Prepare items for AI
    items_data = [
        {
            "id": item.id,
            "category": item.category,
            "color": item.color,
            "style": item.style
        }
        for item in clothing_items
    ]
    
    # Generate suggestions
    ai_suggestions = generate_outfit_suggestions(
        items_data,
        outfit_create.occasion,
        outfit_create.season,
        outfit_create.weather
    )
    
    # Create outfit
    outfit = Outfit(
        user_id=current_user.id,
        occasion=outfit_create.occasion,
        season=outfit_create.season,
        weather=outfit_create.weather,
        description=outfit_create.description,
        ai_suggestions=ai_suggestions
    )
    
    db.add(outfit)
    db.flush()
    
    # Add outfit items
    for item in clothing_items:
        outfit_item = OutfitItem(outfit_id=outfit.id, clothing_item_id=item.id)
        db.add(outfit_item)
    
    db.commit()
    db.refresh(outfit)
    return outfit

@router.get("/", response_model=List[OutfitResponse])
def get_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all outfits for current user"""
    outfits = db.query(Outfit).filter(Outfit.user_id == current_user.id).all()
    return outfits

@router.get("/{outfit_id}", response_model=OutfitResponse)
def get_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific outfit"""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    
    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )
    return outfit

@router.post("/{outfit_id}/favorite")
def toggle_favorite(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle outfit as favorite"""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    
    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )
    
    outfit.is_favorite = 1 - outfit.is_favorite
    db.commit()
    db.refresh(outfit)
    return outfit

@router.delete("/{outfit_id}")
def delete_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete outfit"""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    
    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )
    
    db.delete(outfit)
    db.commit()
    return {"message": "Outfit deleted"}
