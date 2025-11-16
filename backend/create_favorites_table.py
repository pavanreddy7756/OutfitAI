import sqlite3

# Connect to the database
conn = sqlite3.connect('/Users/pavanreddy/OutfitAI/backend/test.db')
cursor = conn.cursor()

# Create favorite_outfits table
try:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorite_outfits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            occasion TEXT NOT NULL,
            combination_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    print("✅ Successfully created favorite_outfits table")
except Exception as e:
    print(f"❌ Error: {e}")

conn.close()
