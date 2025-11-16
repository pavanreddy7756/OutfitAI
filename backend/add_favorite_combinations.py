import sqlite3

# Connect to the database
conn = sqlite3.connect('/Users/pavanreddy/OutfitAI/backend/test.db')
cursor = conn.cursor()

# Add the favorite_combinations column
try:
    cursor.execute("ALTER TABLE outfits ADD COLUMN favorite_combinations TEXT")
    conn.commit()
    print("✅ Successfully added favorite_combinations column")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("⚠️  Column already exists")
    else:
        print(f"❌ Error: {e}")

conn.close()
