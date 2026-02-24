#!/usr/bin/env python3
"""
Delete all clothing items and their images for all users.
"""

import os
import sys
from pathlib import Path

# Add the parent directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.clothing import ClothingItem

def delete_all_clothing():
    """Delete all clothing items and their associated images."""
    db = SessionLocal()
    
    try:
        # Get all clothing items
        items = db.query(ClothingItem).all()
        total = len(items)
        
        if total == 0:
            print("No clothing items found.")
            return
        
        print(f"Deleting {total} clothing items...")
        
        deleted_files = 0
        deleted_records = 0
        
        for item in items:
            # Delete the image file if it exists
            if item.image_path:
                file_path = item.image_path.lstrip("/")
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        deleted_files += 1
                    except Exception as e:
                        print(f"Error deleting file {file_path}: {e}")
            
            # Delete the database record
            db.delete(item)
            deleted_records += 1
        
        # Commit all deletions
        db.commit()
        
        print(f"✅ Deleted {deleted_files} files and {deleted_records} records")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_all_clothing()
