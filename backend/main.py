import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import Base, engine
from app.routes import auth, clothing, outfit, favorites, style_dna, wardrobe
from app.config import settings
from app.core.logging import logger

# Initialize logging
logger.info("Starting Outfit AI API...")

# Create tables (TODO: Replace with Alembic migrations)
Base.metadata.create_all(bind=engine)
logger.info("Database tables initialized")

# Initialize FastAPI app
app = FastAPI(
    title="Outfit AI API",
    description="AI-powered outfit suggestion app",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None
)

# Add CORS middleware with proper configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600
)

logger.info(f"CORS configured for origins: {settings.ALLOWED_ORIGINS}")

# Use absolute path for uploads directory
BACKEND_DIR = Path(__file__).parent
UPLOADS_DIR = BACKEND_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Mount static files for image serving
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(clothing.router)
app.include_router(outfit.router)
app.include_router(favorites.router)
app.include_router(style_dna.router)
app.include_router(wardrobe.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Outfit AI API",
        "docs": "http://localhost:8000/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
