#!/usr/bin/env python3
"""
Development cleanup script - Use with caution!
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.clothing import ClothingItem

def delete_all_clothing():
    """Delete all clothing items - DEVELOPMENT ONLY"""
    
    response = input("⚠️  This will delete ALL clothing items. Type 'DELETE' to confirm: ")
    if response != "DELETE":
        print("❌ Cancelled")
        return
    
    db = SessionLocal()
    
    try:
        items = db.query(ClothingItem).all()
        total = len(items)
        
        if total == 0:
            print("No clothing items found.")
            return
        
        print(f"Deleting {total} clothing items...")
        
        deleted_files = 0
        for item in items:
            if item.image_path:
                file_path = item.image_path.lstrip("/")
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files += 1
            db.delete(item)
        
        db.commit()
        print(f"✅ Deleted {deleted_files} files and {total} records")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_all_clothing()
