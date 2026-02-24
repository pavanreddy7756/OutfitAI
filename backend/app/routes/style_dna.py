from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models.user import User
from app.models.style_dna import StyleDNA as StyleDNAModel, StyleDNAPhoto
from app.schemas.style_dna import (
    StyleDNA, StyleDNACreate, StyleDNAUpdate, 
    FaceAnalysisResponse, BodyAnalysisResponse, StyleInspirationResponse,
    CompleteStyleProfile
)
from app.utils.auth import decode_access_token
from app.services.style_dna_analyzer import (
    analyze_face_photo, analyze_body_photo, analyze_style_inspiration,
    generate_personalized_summary
)
import os
import shutil
import json
from datetime import datetime

router = APIRouter(prefix="/api/style-dna", tags=["style-dna"])
security = HTTPBearer(auto_error=False)

UPLOAD_DIR = "uploads/style_dna"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


@router.post("/analyze-face", response_model=FaceAnalysisResponse)
async def analyze_face(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and analyze face photo for complexion and color recommendations"""
    
    try:
        # Save uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = file.filename.split(".")[-1]
        new_filename = f"{current_user.id}_face_{timestamp}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Analyze with AI
        analysis_result = analyze_face_photo(file_path)
        
        if not analysis_result.get("analysis_successful", False):
            return FaceAnalysisResponse(
                success=False,
                message=analysis_result.get("error", "Analysis failed")
            )
        
        analysis_data = analysis_result.get("data", {})
        
        # Save photo record
        photo_record = StyleDNAPhoto(
            user_id=current_user.id,
            photo_type="face",
            image_path=f"/uploads/style_dna/{new_filename}",
            analysis_result=json.dumps(analysis_data),
            confidence_score=analysis_data.get("confidence_score", 0.0)
        )
        db.add(photo_record)
        
        # Get or create StyleDNA record
        style_dna = db.query(StyleDNAModel).filter(StyleDNAModel.user_id == current_user.id).first()
        
        if not style_dna:
            style_dna = StyleDNAModel(user_id=current_user.id)
            db.add(style_dna)
        
        # Update StyleDNA with face analysis
        style_dna.skin_tone = analysis_data.get("skin_tone")
        style_dna.skin_undertone = analysis_data.get("undertone")
        style_dna.best_colors_json = json.dumps(analysis_data.get("best_colors", []))
        style_dna.avoid_colors_json = json.dumps(analysis_data.get("avoid_colors", []))
        style_dna.complementary_palette_json = json.dumps(analysis_data.get("complementary_palette", {}))
        style_dna.seasonal_palette = analysis_data.get("seasonal_palette")
        style_dna.complexion_confidence = analysis_data.get("confidence_score", 0.0)
        style_dna.face_photo_analyzed = True
        style_dna.last_analysis_date = datetime.utcnow()
        
        db.commit()
        
        return FaceAnalysisResponse(
            success=True,
            message="Face analysis completed successfully",
            analysis=analysis_data,
            confidence_score=analysis_data.get("confidence_score", 0.0)
        )
    
    except Exception as e:
        db.rollback()
        print(f"Face analysis error: {str(e)}")
        return FaceAnalysisResponse(
            success=False,
            message=f"Error: {str(e)}"
        )


@router.post("/analyze-body", response_model=BodyAnalysisResponse)
async def analyze_body(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and analyze full-body photo for body shape and fit recommendations"""
    
    try:
        # Save uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = file.filename.split(".")[-1]
        new_filename = f"{current_user.id}_body_{timestamp}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Analyze with AI
        analysis_result = analyze_body_photo(file_path)
        
        if not analysis_result.get("analysis_successful", False):
            return BodyAnalysisResponse(
                success=False,
                message=analysis_result.get("error", "Analysis failed")
            )
        
        analysis_data = analysis_result.get("data", {})
        
        # Save photo record
        photo_record = StyleDNAPhoto(
            user_id=current_user.id,
            photo_type="body",
            image_path=f"/uploads/style_dna/{new_filename}",
            analysis_result=json.dumps(analysis_data),
            confidence_score=analysis_data.get("confidence_score", 0.0)
        )
        db.add(photo_record)
        
        # Get or create StyleDNA record
        style_dna = db.query(StyleDNAModel).filter(StyleDNAModel.user_id == current_user.id).first()
        
        if not style_dna:
            style_dna = StyleDNAModel(user_id=current_user.id)
            db.add(style_dna)
        
        # Update StyleDNA with body analysis
        style_dna.body_shape = analysis_data.get("body_shape")
        style_dna.body_proportions_json = json.dumps(analysis_data.get("proportions", {}))
        style_dna.height_cm = analysis_data.get("height_estimate")
        style_dna.recommended_fits_json = json.dumps(analysis_data.get("recommended_fits", {}))
        
        # Extract recommended fit preference
        recommended_fits = analysis_data.get("recommended_fits", {})
        tops_fit = recommended_fits.get("tops", {}).get("fit", "regular")
        style_dna.fit_preference = tops_fit
        
        style_dna.body_analysis_confidence = analysis_data.get("confidence_score", 0.0)
        style_dna.body_photo_analyzed = True
        style_dna.last_analysis_date = datetime.utcnow()
        
        db.commit()
        
        return BodyAnalysisResponse(
            success=True,
            message="Body analysis completed successfully",
            analysis=analysis_data,
            confidence_score=analysis_data.get("confidence_score", 0.0)
        )
    
    except Exception as e:
        db.rollback()
        print(f"Body analysis error: {str(e)}")
        return BodyAnalysisResponse(
            success=False,
            message=f"Error: {str(e)}"
        )


@router.post("/analyze-inspiration", response_model=StyleInspirationResponse)
async def analyze_inspiration(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and analyze multiple outfit inspiration photos for style preferences"""
    
    try:
        if len(files) == 0:
            return StyleInspirationResponse(
                success=False,
                message="No files provided"
            )
        
        # Save uploaded files
        saved_paths = []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for idx, file in enumerate(files[:5]):  # Limit to 5 photos
            file_extension = file.filename.split(".")[-1]
            new_filename = f"{current_user.id}_inspiration_{timestamp}_{idx}.{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, new_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_paths.append(file_path)
            
            # Save photo record
            photo_record = StyleDNAPhoto(
                user_id=current_user.id,
                photo_type="inspiration",
                image_path=f"/uploads/style_dna/{new_filename}",
                analysis_result=None,
                confidence_score=None
            )
            db.add(photo_record)
        
        # Analyze all photos together
        analysis_result = analyze_style_inspiration(saved_paths)
        
        if not analysis_result.get("analysis_successful", False):
            return StyleInspirationResponse(
                success=False,
                message=analysis_result.get("error", "Analysis failed")
            )
        
        analysis_data = analysis_result.get("data", {})
        
        # Get or create StyleDNA record
        style_dna = db.query(StyleDNAModel).filter(StyleDNAModel.user_id == current_user.id).first()
        
        if not style_dna:
            style_dna = StyleDNAModel(user_id=current_user.id)
            db.add(style_dna)
        
        # Update StyleDNA with style analysis
        dominant_styles = analysis_data.get("dominant_styles", [])
        style_dna.style_preferences = ", ".join(dominant_styles) if dominant_styles else None
        style_dna.dominant_styles_json = json.dumps(analysis_data.get("dominant_styles", []))
        style_dna.pattern_preferences_json = json.dumps(analysis_data.get("pattern_preferences", {}))
        
        # Extract formality
        formality = analysis_data.get("formality_level", {})
        style_dna.formality_level = formality.get("primary", "casual")
        
        style_dna.style_confidence = analysis_data.get("confidence_score", 0.0)
        style_dna.inspiration_analyzed = True
        style_dna.last_analysis_date = datetime.utcnow()
        
        db.commit()
        
        return StyleInspirationResponse(
            success=True,
            message="Style inspiration analysis completed successfully",
            analysis=analysis_data,
            photos_analyzed=len(saved_paths)
        )
    
    except Exception as e:
        db.rollback()
        print(f"Style inspiration analysis error: {str(e)}")
        return StyleInspirationResponse(
            success=False,
            message=f"Error: {str(e)}"
        )


@router.get("/profile", response_model=CompleteStyleProfile)
def get_complete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete Style DNA profile with personalized summary"""
    
    style_dna = db.query(StyleDNAModel).filter(StyleDNAModel.user_id == current_user.id).first()
    
    if not style_dna:
        return CompleteStyleProfile(
            profile_complete=False,
            personalized_tips=["Complete your Style DNA profile to get personalized recommendations"]
        )
    
    # Generate personalized summary
    style_dna_dict = {
        "face_photo_analyzed": style_dna.face_photo_analyzed,
        "body_photo_analyzed": style_dna.body_photo_analyzed,
        "inspiration_analyzed": style_dna.inspiration_analyzed,
        "skin_tone": style_dna.skin_tone,
        "skin_undertone": style_dna.skin_undertone,
        "seasonal_palette": style_dna.seasonal_palette,
        "complexion_confidence": style_dna.complexion_confidence,
        "body_shape": style_dna.body_shape,
        "fit_preference": style_dna.fit_preference,
        "body_analysis_confidence": style_dna.body_analysis_confidence,
        "style_preferences": style_dna.style_preferences,
        "formality_level": style_dna.formality_level,
        "style_confidence": style_dna.style_confidence
    }
    
    summary = generate_personalized_summary(style_dna_dict)
    
    # Convert StyleDNA model to schema
    from app.schemas.style_dna import StyleDNA as StyleDNASchema
    style_dna_response = StyleDNASchema.from_orm(style_dna)
    
    return CompleteStyleProfile(
        profile_complete=summary["profile_complete"],
        complexion_profile=summary.get("complexion_profile"),
        body_profile=summary.get("body_profile"),
        style_profile=summary.get("style_profile"),
        personalized_tips=summary.get("personalized_tips", []),
        style_dna=style_dna_response
    )


@router.get("/", response_model=Optional[StyleDNA])
def get_style_dna(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's Style DNA preferences"""
    user_id = current_user.id
    
    style_dna = db.query(StyleDNAModel).filter(StyleDNAModel.user_id == user_id).first()
    
    return style_dna


@router.put("/", response_model=StyleDNA)
def update_style_dna(
    style_dna_update: StyleDNAUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's Style DNA preferences (for manual adjustments)"""
    user_id = current_user.id
    
    # Find existing style DNA
    db_style_dna = db.query(StyleDNAModel).filter(StyleDNAModel.user_id == user_id).first()
    
    if not db_style_dna:
        # Create new if doesn't exist
        db_style_dna = StyleDNAModel(
            user_id=user_id,
            **style_dna_update.dict(exclude_unset=True)
        )
        db.add(db_style_dna)
    else:
        # Update existing
        update_data = style_dna_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_style_dna, key, value)
    
    db.commit()
    db.refresh(db_style_dna)
    
    return db_style_dna


@router.delete("/")
def delete_style_dna(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user's Style DNA preferences and photos"""
    user_id = current_user.id
    
    # Delete photos
    photos = db.query(StyleDNAPhoto).filter(StyleDNAPhoto.user_id == user_id).all()
    for photo in photos:
        # Delete file
        file_path = photo.image_path.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
        db.delete(photo)
    
    # Delete StyleDNA
    db_style_dna = db.query(StyleDNAModel).filter(StyleDNAModel.user_id == user_id).first()
    
    if db_style_dna:
        db.delete(db_style_dna)
    
    db.commit()
    
    return {"message": "Style DNA deleted successfully"}
