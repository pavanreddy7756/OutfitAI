from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    image_path = Column(String)
    category = Column(String)  # shirt, pants, shoes, dress, etc.
    color = Column(String)
    brand = Column(String, nullable=True)
    style = Column(String, nullable=True)  # casual, formal, sporty, etc.
    season = Column(String, nullable=True)  # spring, summer, fall, winter
    description = Column(Text, nullable=True)
    analyzed = Column(Integer, default=0)  # 1 if AI has analyzed the image
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="clothing_items")
    outfit_items = relationship("OutfitItem", back_populates="clothing_item")

class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    occasion = Column(String)  # casual, formal, workout, etc.
    season = Column(String, nullable=True)
    weather = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    ai_suggestions = Column(Text)  # JSON string of AI suggestions
    is_favorite = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="outfits")
    outfit_items = relationship("OutfitItem", back_populates="outfit")

class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id = Column(Integer, primary_key=True, index=True)
    outfit_id = Column(Integer, ForeignKey("outfits.id"))
    clothing_item_id = Column(Integer, ForeignKey("clothing_items.id"))

    # Relationships
    outfit = relationship("Outfit", back_populates="outfit_items")
    clothing_item = relationship("ClothingItem", back_populates="outfit_items")
