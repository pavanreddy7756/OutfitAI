import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models.user import User
from app.models.clothing import ClothingItem, Outfit, OutfitItem, FavoriteOutfit, OutfitHistory
from app.models.style_dna import StyleDNA
from app.schemas.clothing import OutfitCreate, OutfitResponse, SavePreviewOutfitRequest
from pydantic import BaseModel
from app.utils.auth import decode_access_token
from app.services.ai_service import generate_outfit_suggestions
from app.services.usage_stats_service import (
    get_underused_items_details,
    get_recent_outfit_combinations,
    update_item_usage
)
from app.core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from datetime import datetime

class RegenerateRequest(BaseModel):
    occasion: str
    clothing_item_ids: List[int]
    previous_suggestions: Optional[str] = None

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
    db: Session = Depends(get_db),
    preview_only: bool = Query(False, description="If true, don't save to database")
):
    """Generate outfit suggestion (optionally without saving for preview)"""
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
    
    # Fetch user's Style DNA
    style_dna = db.query(StyleDNA).filter(StyleDNA.user_id == current_user.id).first()
    style_dna_dict = None
    if style_dna:
        style_dna_dict = {
            "custom_preferences": style_dna.custom_preferences,
            "body_type": style_dna.body_type,
            "skin_tone": style_dna.skin_tone,
            "favorite_colors": style_dna.favorite_colors,
            "avoid_colors": style_dna.avoid_colors,
            "style_preferences": style_dna.style_preferences,
            "fit_preference": style_dna.fit_preference,
            "preferred_patterns": style_dna.preferred_patterns,
            "avoid_patterns": style_dna.avoid_patterns,
            "formality_level": style_dna.formality_level
        }
    
    # Get underused items for coverage optimization
    underused_items = get_underused_items_details(db, current_user.id, limit=10)
    
    # Get recent outfit combinations to avoid repetition
    recent_combinations = get_recent_outfit_combinations(db, current_user.id, days=14)
    
    # Generate suggestions with enhanced context
    ai_suggestions_list = generate_outfit_suggestions(
        items_data,
        outfit_create.occasion,
        style_dna_dict,
        None,  # No previous suggestions for first generation
        underused_items,
        recent_combinations,
        outfit_create.force_include_item_ids
    )
    
    # Convert suggestions to JSON string for storage
    ai_suggestions = json.dumps(ai_suggestions_list)
    
    # If preview_only, return suggestions without saving to database
    if preview_only:
        # Create a temporary outfit object for response (not saved to DB)
        preview_outfit = Outfit(
            id=0,  # Temporary ID
            user_id=current_user.id,
            occasion=outfit_create.occasion,
            season=outfit_create.season,
            weather=outfit_create.weather,
            ai_suggestions=ai_suggestions,
            favorite=0,
            favorite_combinations=None,
            created_at=datetime.utcnow()  # Required field
        )
        # Set outfit_items to empty list for preview
        preview_outfit.outfit_items = []
        return preview_outfit
    
    # Normal flow: Create and save outfit
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
    
    # Persist outfit history for novelty tracking
    for suggestion in ai_suggestions_list:
        item_ids_json = json.dumps(suggestion.get('item_ids', []))
        history_entry = OutfitHistory(
            user_id=current_user.id,
            occasion=outfit_create.occasion,
            item_ids=item_ids_json,
            outfit_name=suggestion.get('outfit_name', ''),
            score=0.0,  # Score will be calculated on next generation
            shown_at=datetime.utcnow(),
            was_favorited=0,
            was_dismissed=0
        )
        db.add(history_entry)
    
    # Update item usage stats
    for item in clothing_items:
        update_item_usage(db, current_user.id, [item.id], outfit_create.occasion, was_favorited=False)
    
    db.commit()
    
    # Load outfit items relationship
    outfit_items = db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).all()
    # Manually set outfit_items on the object
    outfit.outfit_items = outfit_items
    
    return outfit

@router.get("/", response_model=List[OutfitResponse])
def get_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page")
):
    """Get all outfits for current user with optimized query using joinedload and pagination"""
    # Calculate offset
    offset = (page - 1) * page_size
    
    outfits = (
        db.query(Outfit)
        .options(joinedload(Outfit.outfit_items))
        .filter(Outfit.user_id == current_user.id)
        .offset(offset)
        .limit(page_size)
        .all()
    )
    
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

@router.post("/save-preview", response_model=OutfitResponse)
def save_and_favorite_preview(
    request: SavePreviewOutfitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a preview outfit to database and favorite the specified combination"""
    # Get clothing items to verify they exist
    clothing_items = db.query(ClothingItem).filter(
        ClothingItem.id.in_(request.clothing_item_ids),
        ClothingItem.user_id == current_user.id
    ).all()
    
    if not clothing_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid clothing items provided"
        )
    
    # Create outfit in database
    outfit = Outfit(
        user_id=current_user.id,
        occasion=request.occasion,
        season=request.season,
        weather=request.weather,
        ai_suggestions=request.ai_suggestions
    )
    
    db.add(outfit)
    db.flush()
    
    # Add outfit items
    for item in clothing_items:
        outfit_item = OutfitItem(outfit_id=outfit.id, clothing_item_id=item.id)
        db.add(outfit_item)
    
    db.commit()
    db.refresh(outfit)
    
    # Now favorite the specified combination
    suggestions = json.loads(request.ai_suggestions)
    if request.combination_index < len(suggestions):
        combination = suggestions[request.combination_index]
        combination_json = json.dumps(combination)
        
        # Check if not already favorited
        existing = db.query(FavoriteOutfit).filter(
            FavoriteOutfit.user_id == current_user.id,
            FavoriteOutfit.combination_data == combination_json
        ).first()
        
        if not existing:
            new_favorite = FavoriteOutfit(
                user_id=current_user.id,
                occasion=request.occasion,
                combination_data=combination_json
            )
            db.add(new_favorite)
            db.commit()
    
    # Load outfit_items for response
    outfit_items = db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).all()
    outfit.outfit_items = outfit_items
    
    return outfit


@router.put("/{outfit_id}/regenerate", response_model=OutfitResponse)
def regenerate_outfit(
    outfit_id: int,
    regenerate_req: RegenerateRequest,
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
    
    # Get clothing items
    clothing_items = db.query(ClothingItem).filter(
        ClothingItem.id.in_(regenerate_req.clothing_item_ids),
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
    
    # Fetch user's Style DNA
    style_dna = db.query(StyleDNA).filter(StyleDNA.user_id == current_user.id).first()
    style_dna_dict = None
    if style_dna:
        style_dna_dict = {
            "custom_preferences": style_dna.custom_preferences,
            "body_type": style_dna.body_type,
            "skin_tone": style_dna.skin_tone,
            "favorite_colors": style_dna.favorite_colors,
            "avoid_colors": style_dna.avoid_colors,
            "style_preferences": style_dna.style_preferences,
            "fit_preference": style_dna.fit_preference,
            "preferred_patterns": style_dna.preferred_patterns,
            "avoid_patterns": style_dna.avoid_patterns,
            "formality_level": style_dna.formality_level
        }
    
    # Get underused items for coverage optimization
    underused_items = get_underused_items_details(db, current_user.id, limit=10)
    
    # Get recent outfit combinations to avoid repetition
    recent_combinations = get_recent_outfit_combinations(db, current_user.id, days=14)
    
    # Generate new suggestions (pass previous suggestions to avoid duplicates)
    ai_suggestions_list = generate_outfit_suggestions(
        items_data,
        regenerate_req.occasion,
        style_dna_dict,
        regenerate_req.previous_suggestions,
        underused_items,
        recent_combinations
    )
    
    # Update outfit with new suggestions
    outfit.ai_suggestions = json.dumps(ai_suggestions_list)
    outfit.occasion = regenerate_req.occasion
    
    db.commit()
    db.refresh(outfit)
    
    # Persist new outfit history
    for suggestion in ai_suggestions_list:
        item_ids_json = json.dumps(suggestion.get('item_ids', []))
        history_entry = OutfitHistory(
            user_id=current_user.id,
            occasion=regenerate_req.occasion,
            item_ids=item_ids_json,
            outfit_name=suggestion.get('outfit_name', ''),
            score=0.0,
            shown_at=datetime.utcnow(),
            was_favorited=0,
            was_dismissed=0
        )
        db.add(history_entry)
    
    db.commit()
    
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
