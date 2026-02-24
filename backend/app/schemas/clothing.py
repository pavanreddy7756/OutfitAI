from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ClothingItemBase(BaseModel):
    category: str
    color: str
    brand: Optional[str] = None
    style: Optional[str] = None
    season: Optional[str] = None
    description: Optional[str] = None

class ClothingItemCreate(ClothingItemBase):
    pass

class ClothingItemResponse(ClothingItemBase):
    id: int
    user_id: int
    image_path: str
    created_at: datetime

    class Config:
        from_attributes = True

class OutfitItemResponse(BaseModel):
    id: int
    outfit_id: int
    clothing_item_id: int
    
    class Config:
        from_attributes = True

class OutfitBase(BaseModel):
    occasion: str
    season: Optional[str] = None
    weather: Optional[str] = None

class OutfitCreate(OutfitBase):
    clothing_item_ids: List[int]
    force_include_item_ids: Optional[List[int]] = None

class SavePreviewOutfitRequest(BaseModel):
    """Request to save and favorite a preview outfit"""
    occasion: str
    ai_suggestions: str
    combination_index: int
    clothing_item_ids: List[int]
    season: Optional[str] = None
    weather: Optional[str] = None


class OutfitResponse(OutfitBase):
    id: int
    user_id: int
    ai_suggestions: str
    favorite: int
    favorite_combinations: Optional[str] = None
    created_at: datetime
    outfit_items: List[OutfitItemResponse]

    class Config:
        from_attributes = True
