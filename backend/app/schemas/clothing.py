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
    clothing_item: ClothingItemResponse

class OutfitBase(BaseModel):
    occasion: str
    season: Optional[str] = None
    weather: Optional[str] = None
    description: Optional[str] = None

class OutfitCreate(OutfitBase):
    clothing_item_ids: List[int]

class OutfitResponse(OutfitBase):
    id: int
    user_id: int
    ai_suggestions: str
    is_favorite: int
    created_at: datetime
    outfit_items: List[OutfitItemResponse]

    class Config:
        from_attributes = True
