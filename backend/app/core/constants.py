"""
Application Constants - Single source of truth for all hardcoded values
"""

# API Configuration
API_VERSION = "v1"
MAX_UPLOAD_SIZE_MB = 10
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 500  # Increased to handle larger wardrobes

# Clothing Categories
CATEGORIES = {
    "TOPS": ["shirt", "t-shirt", "blouse", "sweater", "tank", "polo"],
    "BOTTOMS": ["pants", "jeans", "shorts", "skirt", "leggings"],
    "OUTERWEAR": ["jacket", "coat", "blazer", "cardigan", "hoodie"],
    "SHOES": ["sneakers", "boots", "heels", "sandals", "loafers"],
    "ACCESSORIES": ["watch", "bag", "hat", "jewelry", "belt", "sunglasses"]
}

# Occasions
OCCASIONS = [
    "casual", "work", "business", "formal", "party", 
    "date", "athletic", "weekend", "travel", "lounge"
]

# Seasons
SEASONS = ["spring", "summer", "fall", "winter", "all-season"]

# Style Tags
STYLE_TAGS = [
    "minimalist", "classic", "trendy", "streetwear", "bohemian",
    "preppy", "athletic", "edgy", "romantic", "vintage", "luxury"
]

# Formality Levels
FORMALITY_LEVELS = {
    "VERY_CASUAL": 0,
    "CASUAL": 2,
    "SMART_CASUAL": 4,
    "BUSINESS_CASUAL": 6,
    "BUSINESS": 8,
    "FORMAL": 10
}

# Pattern Types
PATTERNS = [
    "solid", "striped", "plaid", "checkered", "floral",
    "geometric", "graphic", "paisley", "polka-dot", "tie-dye"
]

# Colors
PRIMARY_COLORS = [
    "black", "white", "gray", "navy", "brown",
    "beige", "red", "blue", "green", "pink"
]

# AI Configuration
AI_MAX_RETRIES = 3
AI_TIMEOUT_SECONDS = 30
MAX_OUTFIT_SUGGESTIONS = 3

# Cache Configuration
CACHE_TTL_SECONDS = 3600  # 1 hour
OUTFIT_CACHE_TTL = 1800   # 30 minutes

# Rate Limiting
RATE_LIMIT_PER_MINUTE = 60
RATE_LIMIT_PER_HOUR = 1000

# File Storage
UPLOAD_DIR = "uploads"
STYLE_DNA_DIR = "uploads/style_dna"
TEMP_DIR = "temp"
