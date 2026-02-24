"""
Authentication Middleware - Centralized authentication handling
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from sqlalchemy.orm import Session
from app.utils.auth import decode_access_token
from app.models.user import User

security = HTTPBearer(auto_error=False)


class AuthMiddleware:
    """Centralized authentication handling"""
    
    @staticmethod
    async def get_current_user(
        credentials: Optional[HTTPAuthorizationCredentials] = None,
        db: Session = None
    ) -> User:
        """
        Extract and validate user from JWT token
        
        Args:
            credentials: HTTP Bearer credentials from request
            db: Database session
            
        Returns:
            User object if authenticated
            
        Raises:
            HTTPException: If authentication fails
        """
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        token = credentials.credentials
        payload = decode_access_token(token)
        
        if payload is None or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        user_id = int(payload["sub"])
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user


def get_current_user_id(credentials: Optional[HTTPAuthorizationCredentials] = None) -> int:
    """
    Fast user ID extraction without DB lookup
    For endpoints that only need user_id, not full user object
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    payload = decode_access_token(credentials.credentials)
    
    if payload is None or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return int(payload["sub"])
