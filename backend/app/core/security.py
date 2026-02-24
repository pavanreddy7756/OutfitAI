"""
Security utilities and validators
"""
import re
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from app.core.constants import MAX_UPLOAD_SIZE_MB, ALLOWED_IMAGE_TYPES


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password strength
    
    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    
    return True, "Password is valid"


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


async def validate_image_upload(file: UploadFile) -> None:
    """
    Validate uploaded image file
    
    Raises:
        HTTPException: If validation fails
    """
    # Check file size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {MAX_UPLOAD_SIZE_MB}MB limit"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    # Check MIME type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type must be one of: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )


def sanitize_filename(filename: str) -> str:
    """Remove potentially dangerous characters from filename"""
    # Remove path traversal attempts
    filename = filename.replace("..", "").replace("/", "").replace("\\", "")
    # Keep only alphanumeric, dots, dashes, underscores
    filename = re.sub(r'[^\w\-.]', '_', filename)
    return filename
