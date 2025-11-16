from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import shutil
import os
from datetime import datetime
from app.database import get_db
from app.models.clothing import ClothingItem
from app.services.ai_service import analyze_clothing_image
from app.utils.auth import get_user_id_from_token

router = APIRouter(prefix="/api/clothing", tags=["clothing"])
security = HTTPBearer(auto_error=False)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        print("[Auth] No credentials provided")
        raise HTTPException(status_code=401, detail="No authorization credentials provided")
    
    user_id = get_user_id_from_token(credentials.credentials)
    if user_id is None:
        print(f"[Auth] Token invalid or no user_id found: {credentials.credentials[:50]}")
        raise HTTPException(status_code=401, detail="Invalid token")
    print(f"[Auth] User {user_id} authenticated successfully")
    return user_id


@router.post("/upload")
async def upload_clothing(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a clothing image and analyze it with AI to extract detailed attributes.
    """
    try:
        # Save the uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = file.filename.split(".")[-1]
        new_filename = f"{user_id}_{timestamp}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Analyze the image with AI
        analysis_result = analyze_clothing_image(file_path)
        
        if not analysis_result.get("analysis_successful", False):
            return {
                "success": False,
                "error": analysis_result.get("error", "Analysis failed"),
                "raw_response": analysis_result.get("raw_response")
            }
        
        # Create clothing item with all attributes
        clothing_item = ClothingItem(
            user_id=user_id,
            image_path=f"/uploads/{new_filename}",
            category=analysis_result.get("category"),
            subcategory=analysis_result.get("subcategory"),
            color=analysis_result.get("color"),
            secondary_colors=analysis_result.get("secondary_colors"),
            fit_type=analysis_result.get("fit_type"),
            silhouette=analysis_result.get("silhouette"),
            sleeve_type=analysis_result.get("sleeve_type"),
            sleeve_fit=analysis_result.get("sleeve_fit"),
            neckline=analysis_result.get("neckline"),
            collar_type=analysis_result.get("collar_type"),
            collar_closure=analysis_result.get("collar_closure"),
            texture=analysis_result.get("texture"),
            fabric_type=analysis_result.get("fabric_type"),
            fabric_weight=analysis_result.get("fabric_weight"),
            pattern=analysis_result.get("pattern"),
            pattern_description=analysis_result.get("pattern_description"),
            length=analysis_result.get("length"),
            waist_type=analysis_result.get("waist_type"),
            pant_type=analysis_result.get("pant_type"),
            pant_fit=analysis_result.get("pant_fit"),
            pant_rise=analysis_result.get("pant_rise"),
            condition=analysis_result.get("condition"),
            distressing_level=analysis_result.get("distressing_level"),
            occasion_tags=analysis_result.get("occasion_tags"),
            style_tags=analysis_result.get("style_tags"),
            season_tags=analysis_result.get("season_tags"),
            special_features=analysis_result.get("special_features"),
            detailed_description=analysis_result.get("detailed_description"),
            quality_score=analysis_result.get("quality_score"),
            analyzed=1,
            analysis_timestamp=datetime.utcnow()
        )
        
        db.add(clothing_item)
        db.commit()
        db.refresh(clothing_item)
        
        return {
            "success": True,
            "item_id": clothing_item.id,
            "message": "Clothing item uploaded and analyzed successfully",
            "analysis": {
                "category": clothing_item.category,
                "subcategory": clothing_item.subcategory,
                "color": clothing_item.color,
                "fit_type": clothing_item.fit_type,
                "fabric_type": clothing_item.fabric_type,
                "description": clothing_item.detailed_description,
                "quality_score": clothing_item.quality_score
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/items")
async def get_clothing_items(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all clothing items for the current user with all attributes."""
    items = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    
    return {
        "success": True,
        "count": len(items),
        "items": [
            {
                "id": item.id,
                "image_path": item.image_path,
                "category": item.category,
                "subcategory": item.subcategory,
                "color": item.color,
                "secondary_colors": item.secondary_colors,
                "fit_type": item.fit_type,
                "silhouette": item.silhouette,
                "sleeve_type": item.sleeve_type,
                "sleeve_fit": item.sleeve_fit,
                "neckline": item.neckline,
                "collar_type": item.collar_type,
                "collar_closure": item.collar_closure,
                "texture": item.texture,
                "fabric_type": item.fabric_type,
                "fabric_weight": item.fabric_weight,
                "pattern": item.pattern,
                "pattern_description": item.pattern_description,
                "length": item.length,
                "waist_type": item.waist_type,
                "pant_type": item.pant_type,
                "pant_fit": item.pant_fit,
                "pant_rise": item.pant_rise,
                "condition": item.condition,
                "distressing_level": item.distressing_level,
                "occasion_tags": item.occasion_tags,
                "style_tags": item.style_tags,
                "season_tags": item.season_tags,
                "special_features": item.special_features,
                "detailed_description": item.detailed_description,
                "quality_score": item.quality_score,
                "analyzed": item.analyzed,
                "created_at": item.created_at.isoformat() if item.created_at else None
            }
            for item in items
        ]
    }


@router.delete("/{item_id}")
async def delete_clothing_item(
    item_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a clothing item and its image file."""
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == user_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete the image file
    if item.image_path:
        file_path = item.image_path.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.delete(item)
    db.commit()
    
    return {
        "success": True,
        "message": "Clothing item deleted successfully"
    }


@router.post("/analyze-unanalyzed")
async def analyze_unanalyzed(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch analyze all unanalyzed clothing items for the user."""
    unanalyzed = db.query(ClothingItem).filter(
        ClothingItem.user_id == user_id,
        ClothingItem.analyzed == 0
    ).all()
    
    analyzed_count = 0
    errors = []
    
    for item in unanalyzed:
        try:
            analysis_result = analyze_clothing_image(item.image_path)
            
            if analysis_result.get("analysis_successful"):
                # Update the item with analysis results
                item.category = analysis_result.get("category")
                item.subcategory = analysis_result.get("subcategory")
                item.color = analysis_result.get("color")
                item.secondary_colors = analysis_result.get("secondary_colors")
                item.fit_type = analysis_result.get("fit_type")
                item.silhouette = analysis_result.get("silhouette")
                item.sleeve_type = analysis_result.get("sleeve_type")
                item.sleeve_fit = analysis_result.get("sleeve_fit")
                item.neckline = analysis_result.get("neckline")
                item.collar_type = analysis_result.get("collar_type")
                item.collar_closure = analysis_result.get("collar_closure")
                item.texture = analysis_result.get("texture")
                item.fabric_type = analysis_result.get("fabric_type")
                item.fabric_weight = analysis_result.get("fabric_weight")
                item.pattern = analysis_result.get("pattern")
                item.pattern_description = analysis_result.get("pattern_description")
                item.length = analysis_result.get("length")
                item.waist_type = analysis_result.get("waist_type")
                item.pant_type = analysis_result.get("pant_type")
                item.pant_fit = analysis_result.get("pant_fit")
                item.pant_rise = analysis_result.get("pant_rise")
                item.condition = analysis_result.get("condition")
                item.distressing_level = analysis_result.get("distressing_level")
                item.occasion_tags = analysis_result.get("occasion_tags")
                item.style_tags = analysis_result.get("style_tags")
                item.season_tags = analysis_result.get("season_tags")
                item.special_features = analysis_result.get("special_features")
                item.detailed_description = analysis_result.get("detailed_description")
                item.quality_score = analysis_result.get("quality_score")
                item.analyzed = 1
                item.analysis_timestamp = datetime.utcnow()
                
                analyzed_count += 1
        except Exception as e:
            errors.append(f"Error analyzing item {item.id}: {str(e)}")
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Analyzed {analyzed_count} items",
        "analyzed_count": analyzed_count,
        "errors": errors if errors else None
    }
