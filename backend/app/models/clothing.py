from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from datetime import datetime
from app.database import Base


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    image_path = Column(String)
    
    # Basic attributes
    category = Column(String)  # shirt, pants, dress, jacket, etc.
    subcategory = Column(String)  # t-shirt, polo, dress-shirt, jeans, chino, etc.
    color = Column(String)  # primary color
    secondary_colors = Column(String)  # comma-separated
    
    # Fit and silhouette
    fit_type = Column(String)  # slim, regular, oversized, boxy, athletic, etc.
    silhouette = Column(String)  # fitted, relaxed, loose, tapered, etc.
    
    # Sleeve details (for tops)
    sleeve_type = Column(String)  # full, 3/4, short, sleeveless, cap, flutter, etc.
    sleeve_fit = Column(String)  # fitted, relaxed, puffed, etc.
    
    # Neckline details (for tops)
    neckline = Column(String)  # crew, v-neck, scoop, polo, henley, turtleneck, etc.
    
    # Collar details (if applicable)
    collar_type = Column(String)  # spread, button-down, club, pointed, etc.
    collar_closure = Column(String)  # buttons, zipper, snaps, none, etc.
    
    # Texture and fabric
    texture = Column(String)  # smooth, ribbed, knitted, woven, denim, linen, etc.
    fabric_type = Column(String)  # cotton, polyester, silk, wool, blend, synthetic, etc.
    fabric_weight = Column(String)  # light, medium, heavy
    
    # Pattern and design
    pattern = Column(String)  # solid, striped, plaid, floral, graphic, geometric, etc.
    pattern_description = Column(String)  # detailed description
    
    # Length
    length = Column(String)  # knee-length, midi, maxi, short, cropped, full, etc.
    
    # Waist type (for pants)
    waist_type = Column(String)  # high-waist, mid-rise, low-rise, ultra-low, etc.
    
    # Pant type specifics
    pant_type = Column(String)  # jeans, chino, formal, cargo, joggers, leggings, etc.
    pant_fit = Column(String)  # slim, skinny, straight, tapered, baggy, bootcut, flare, etc.
    pant_rise = Column(String)  # high, mid, low
    
    # Condition and wear
    condition = Column(String)  # new, excellent, good, fair, worn
    distressing_level = Column(String)  # none, minimal, moderate, heavy (for worn-look items)
    
    # Occasion/Style tags
    occasion_tags = Column(String)  # casual, formal, business, athletic, party, etc (comma-separated)
    style_tags = Column(String)  # minimalist, bohemian, streetwear, classic, trendy, etc (comma-separated)
    season_tags = Column(String)  # summer, winter, spring, fall, all-season (comma-separated)
    
    # Special features
    special_features = Column(String)  # pockets, hood, adjustable, drawstring, belt, etc (comma-separated)
    
    # Overall description
    detailed_description = Column(Text)  # comprehensive AI-generated description
    
    # Quality rating
    quality_score = Column(Float)  # 1-10 scale
    
    # Analysis metadata
    analyzed = Column(Integer, default=0)  # 0 = not analyzed, 1 = analyzed
    analysis_timestamp = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    occasion = Column(String)
    season = Column(String)
    weather = Column(String)
    ai_suggestions = Column(Text)
    favorite = Column(Integer, default=0)
    favorite_combinations = Column(Text)  # JSON array of favorite combination indices
    created_at = Column(DateTime, default=datetime.utcnow)


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id = Column(Integer, primary_key=True, index=True)
    outfit_id = Column(Integer)
    clothing_item_id = Column(Integer)


class FavoriteOutfit(Base):
    __tablename__ = "favorite_outfits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    occasion = Column(String)
    combination_data = Column(Text)  # JSON with outfit_name, description, item_ids, styling_tips
    created_at = Column(DateTime, default=datetime.utcnow)
