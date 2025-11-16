import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models.user import User
from app.models.clothing import ClothingItem, Outfit, OutfitItem, FavoriteOutfit
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
            "subcategory": item.subcategory,
            "color": item.color,
            "style_tags": item.style_tags,
            "occasion_tags": item.occasion_tags,
            "fit_type": item.fit_type,
            "pattern": item.pattern
        }
        for item in clothing_items
    ]
    
    # Generate suggestions
    ai_suggestions_list = generate_outfit_suggestions(
        items_data,
        outfit_create.occasion
    )
    
    # Convert suggestions to JSON string for storage
    ai_suggestions = json.dumps(ai_suggestions_list)
    
    # Create outfit
    outfit = Outfit(
        user_id=current_user.id,
        occasion=outfit_create.occasion,
        season=outfit_create.season,
        weather=outfit_create.weather,
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
    
    # Load outfit items relationship
    outfit_items = db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).all()
    # Manually set outfit_items on the object
    outfit.outfit_items = outfit_items
    
    return outfit

@router.get("/", response_model=List[OutfitResponse])
def get_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all outfits for current user"""
    outfits = db.query(Outfit).filter(Outfit.user_id == current_user.id).all()
    
    # Load outfit_items for each outfit
    for outfit in outfits:
        outfit_items = db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).all()
        outfit.outfit_items = outfit_items
    
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
    
    # Load outfit_items relationship
    outfit_items = db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).all()
    outfit.outfit_items = outfit_items
    
    return outfit

@router.put("/{outfit_id}/favorite")
def toggle_favorite(
    outfit_id: int,
    combination_index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle specific combination as favorite"""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    
    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )
    
    # Get the specific combination
    suggestions = json.loads(outfit.ai_suggestions)
    if combination_index >= len(suggestions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid combination index"
        )
    
    combination = suggestions[combination_index]
    combination_json = json.dumps(combination)
    
    # Check if already favorited
    existing = db.query(FavoriteOutfit).filter(
        FavoriteOutfit.user_id == current_user.id,
        FavoriteOutfit.combination_data == combination_json
    ).first()
    
    if existing:
        # Remove from favorites
        db.delete(existing)
        db.commit()
        return {"success": True, "favorited": False}
    else:
        # Add to favorites
        new_favorite = FavoriteOutfit(
            user_id=current_user.id,
            occasion=outfit.occasion,
            combination_data=combination_json
        )
        db.add(new_favorite)
        db.commit()
        return {"success": True, "favorited": True}
    
    # Load outfit items relationship
    outfit_items = db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).all()
    # Manually set outfit_items on the object
    outfit.outfit_items = outfit_items
    
    return outfit

@router.put("/{outfit_id}/regenerate", response_model=OutfitResponse)
def regenerate_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Regenerate outfit suggestions for an existing outfit"""
    # Get existing outfit
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    
    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )
    
    # Get clothing items for this user
    clothing_items = db.query(ClothingItem).filter(
        ClothingItem.user_id == current_user.id
    ).all()
    
    if not clothing_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No clothing items available"
        )
    
    # Prepare items for AI
    items_data = [
        {
            "id": item.id,
            "category": item.category,
            "subcategory": item.subcategory,
            "color": item.color,
            "style_tags": item.style_tags,
            "occasion_tags": item.occasion_tags,
            "fit_type": item.fit_type,
            "pattern": item.pattern,
            "quality_score": item.quality_score
        }
        for item in clothing_items
    ]
    
    # Generate new suggestions
    ai_suggestions_list = generate_outfit_suggestions(
        items_data,
        outfit.occasion
    )
    
    # Update outfit with new suggestions
    outfit.ai_suggestions = json.dumps(ai_suggestions_list)
    
    db.commit()
    db.refresh(outfit)
    
    # Load outfit items relationship
    outfit_items = db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).all()
    outfit.outfit_items = outfit_items
    
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
