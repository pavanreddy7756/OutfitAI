from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class StyleDNABase(BaseModel):
    body_type: Optional[str] = None
    body_shape: Optional[str] = None
    height_cm: Optional[float] = None
    skin_tone: Optional[str] = None
    skin_undertone: Optional[str] = None
    body_proportions_json: Optional[str] = None
    best_colors_json: Optional[str] = None
    avoid_colors_json: Optional[str] = None
    complementary_palette_json: Optional[str] = None
    seasonal_palette: Optional[str] = None
    favorite_colors: Optional[str] = None
    avoid_colors: Optional[str] = None
    style_preferences: Optional[str] = None
    dominant_styles_json: Optional[str] = None
    fit_preference: Optional[str] = None
    recommended_fits_json: Optional[str] = None
    preferred_patterns: Optional[str] = None
    avoid_patterns: Optional[str] = None
    pattern_preferences_json: Optional[str] = None
    formality_level: Optional[str] = None
    custom_preferences: Optional[str] = None
    complexion_confidence: Optional[float] = None
    body_analysis_confidence: Optional[float] = None
    style_confidence: Optional[float] = None
    face_photo_analyzed: Optional[bool] = False
    body_photo_analyzed: Optional[bool] = False
    inspiration_analyzed: Optional[bool] = False
    last_analysis_date: Optional[datetime] = None


class StyleDNACreate(StyleDNABase):
    pass


class StyleDNAUpdate(StyleDNABase):
    pass


class StyleDNA(StyleDNABase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FaceAnalysisResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None


class BodyAnalysisResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None


class StyleInspirationResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None
    photos_analyzed: Optional[int] = None


class StyleDNAPhotoResponse(BaseModel):
    id: int
    photo_type: str
    image_path: str
    confidence_score: Optional[float]
    created_at: datetime


class CompleteStyleProfile(BaseModel):
    profile_complete: bool
    complexion_profile: Optional[Dict[str, Any]] = None
    body_profile: Optional[Dict[str, Any]] = None
    style_profile: Optional[Dict[str, Any]] = None
    personalized_tips: List[str] = []
    style_dna: Optional[StyleDNA] = None
