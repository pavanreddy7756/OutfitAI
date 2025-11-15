from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import os
from pathlib import Path
from fastapi.security import HTTPBearer
from app.database import get_db
from app.models.user import User
from app.models.clothing import ClothingItem
from app.schemas.clothing import ClothingItemCreate, ClothingItemResponse
from app.utils.auth import decode_access_token
from app.services.ai_service import analyze_clothing_image

router = APIRouter(prefix="/api/clothing", tags=["clothing"])
security = HTTPBearer(auto_error=False)

# Use absolute path for uploads directory
BACKEND_DIR = Path(__file__).parent.parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

def get_current_user(credentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
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

@router.post("/upload", response_model=ClothingItemResponse)
async def upload_clothing_item(
    file: UploadFile = File(...),
    category: str = None,
    color: str = None,
    style: str = None,
    season: str = None,
    brand: str = None,
    description: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload clothing item with image"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Generate unique filename using UUID to avoid conflicts
    import uuid
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{current_user.id}_{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    print(f"✅ File saved to: {file_path}")
    
    # Analyze image if AI fields not provided
    ai_analysis = {}
    analyzed = 0
    if not category or not color:
        ai_analysis = analyze_clothing_image(str(file_path))
        analyzed = 1
    
    # Create clothing item with URL path for image serving
    image_url = f"/uploads/{unique_filename}"
    clothing_item = ClothingItem(
        user_id=current_user.id,
        image_path=image_url,
        category=category or ai_analysis.get("category", "unknown"),
        color=color or ai_analysis.get("color", "unknown"),
        style=style or ai_analysis.get("style", "unknown"),
        season=season,
        brand=brand,
        description=description or ai_analysis.get("description", ""),
        analyzed=analyzed
    )
    
    db.add(clothing_item)
    db.commit()
    db.refresh(clothing_item)
    return clothing_item

@router.get("/items", response_model=list[ClothingItemResponse])
async def get_clothing_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all clothing items for current user"""
    items = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id).all()
    return items

@router.get("/{item_id}", response_model=ClothingItemResponse)
async def get_clothing_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific clothing item"""
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clothing item not found"
        )
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clothing_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a clothing item"""
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clothing item not found"
        )
    
    # Delete the image file
    file_path = UPLOAD_DIR / Path(item.image_path).name
    if file_path.exists():
        file_path.unlink()
    
    db.delete(item)
    db.commit()

@router.post("/analyze-unanalyzed")
async def analyze_unanalyzed_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze all unanalyzed clothing items for current user"""
    unanalyzed = db.query(ClothingItem).filter(
        ClothingItem.user_id == current_user.id,
        ClothingItem.analyzed == 0
    ).all()
    
    analyzed_count = 0
    for item in unanalyzed:
        try:
            # Get the actual file path from image_url
            image_file = UPLOAD_DIR / item.image_path.replace("/uploads/", "")
            if image_file.exists():
                analysis = analyze_clothing_image(str(image_file))
                item.category = analysis.get("category", "unknown")
                item.color = analysis.get("color", "unknown")
                item.style = analysis.get("style", "unknown")
                item.description = analysis.get("description", "")
                item.analyzed = 1
                analyzed_count += 1
        except Exception as e:
            print(f"Error analyzing item {item.id}: {e}")
    
    db.commit()
    return {
        "message": f"Analyzed {analyzed_count} items",
        "count": analyzed_count
    }
