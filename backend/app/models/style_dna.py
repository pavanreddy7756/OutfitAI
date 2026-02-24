from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class StyleDNA(Base):
    __tablename__ = "style_dna"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Physical attributes (AI-detected)
    body_type = Column(String, nullable=True)  # e.g., "athletic", "slim", "curvy", "average"
    body_shape = Column(String, nullable=True)  # rectangle, triangle, inverted_triangle, hourglass, pear, apple
    height_cm = Column(Float, nullable=True)  # Height in centimeters
    skin_tone = Column(String, nullable=True)  # fair, light, medium, tan, deep, dark
    skin_undertone = Column(String, nullable=True)  # cool, warm, neutral
    
    # Body proportions (AI-detected, stored as JSON)
    body_proportions_json = Column(Text, nullable=True)  # JSON: shoulders, waist, hips, torso, legs
    
    # Color analysis (AI-detected, stored as JSON)
    best_colors_json = Column(Text, nullable=True)  # JSON array of color objects with names and hex
    avoid_colors_json = Column(Text, nullable=True)  # JSON array of colors to avoid
    complementary_palette_json = Column(Text, nullable=True)  # JSON: neutrals, accents, metallics
    seasonal_palette = Column(String, nullable=True)  # spring, summer, autumn, winter
    
    # Style preferences (AI-detected from inspiration photos)
    favorite_colors = Column(Text, nullable=True)  # Comma-separated (legacy support)
    avoid_colors = Column(Text, nullable=True)  # Comma-separated (legacy support)
    style_preferences = Column(Text, nullable=True)  # Comma-separated style types
    dominant_styles_json = Column(Text, nullable=True)  # JSON array from AI analysis
    
    # Fit recommendations (AI-detected)
    fit_preference = Column(String, nullable=True)  # slim, regular, relaxed, oversized
    recommended_fits_json = Column(Text, nullable=True)  # JSON: tops, bottoms details
    
    # Pattern preferences
    preferred_patterns = Column(Text, nullable=True)  # Comma-separated
    avoid_patterns = Column(Text, nullable=True)  # Comma-separated
    pattern_preferences_json = Column(Text, nullable=True)  # JSON from AI analysis
    
    # Formality
    formality_level = Column(String, nullable=True)  # casual, business-casual, formal
    
    # User preferences (custom text input)
    custom_preferences = Column(Text, nullable=True)  # User's personal styling notes and preferences
    
    # Confidence scores
    complexion_confidence = Column(Float, nullable=True)  # 0.0-1.0
    body_analysis_confidence = Column(Float, nullable=True)  # 0.0-1.0
    style_confidence = Column(Float, nullable=True)  # 0.0-1.0
    
    # Analysis status flags
    face_photo_analyzed = Column(Boolean, default=False)
    body_photo_analyzed = Column(Boolean, default=False)
    inspiration_analyzed = Column(Boolean, default=False)
    last_analysis_date = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="style_dna")


class StyleDNAPhoto(Base):
    __tablename__ = "style_dna_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    photo_type = Column(String, nullable=False)  # 'face', 'body', 'inspiration'
    image_path = Column(String, nullable=False)
    analysis_result = Column(Text, nullable=True)  # JSON
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="style_dna_photos")
