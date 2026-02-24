#!/usr/bin/env python3
"""
Initialize database with proper migrations support
TODO: Replace with Alembic migrations for production
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import Base, engine
from app.models.user import User
from app.models.clothing import ClothingItem, Outfit, OutfitItem, FavoriteOutfit
from app.models.style_dna import StyleDNA, StyleDNAPhoto

def init_database():
    """Create all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully")

if __name__ == "__main__":
    init_database()
