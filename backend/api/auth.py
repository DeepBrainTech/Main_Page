"""
认证相关工具函数
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, Request, Response, status
import os
from dotenv import load_dotenv

from database import get_db
from models import User

load_dotenv()

# JWT 配置
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7天

# ----- Cross-subdomain HttpOnly cookie config -----
# Cookie name carrying the portal access token across *.deepbraintechnology.com
ACCESS_TOKEN_COOKIE_NAME = os.getenv("ACCESS_TOKEN_COOKIE_NAME", "access_token")
# In production set to ".deepbraintechnology.com" so subdomains share the cookie.
# Leave empty in local dev so the browser uses host-only cookie on localhost.
ACCESS_TOKEN_COOKIE_DOMAIN = os.getenv("ACCESS_TOKEN_COOKIE_DOMAIN", "") or None
# "lax" is the right default for same-site cross-origin (e.g. fogchess.* -> api.*).
# Use "none" only if you need cross-site (different eTLD+1) and always pair with Secure=True.
ACCESS_TOKEN_COOKIE_SAMESITE = os.getenv("ACCESS_TOKEN_COOKIE_SAMESITE", "lax").lower()
# Must be True in production (HTTPS). Allow disabling for local http dev.
ACCESS_TOKEN_COOKIE_SECURE = os.getenv("ACCESS_TOKEN_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
ACCESS_TOKEN_COOKIE_PATH = os.getenv("ACCESS_TOKEN_COOKIE_PATH", "/")


def set_access_token_cookie(response: Response, token: str, max_age_seconds: Optional[int] = None) -> None:
    """Attach the portal access token as an HttpOnly cookie on the response.

    Sub-games on sibling subdomains can reuse this cookie automatically when
    they hit the portal API with credentials:"include".
    """
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=token,
        max_age=max_age_seconds if max_age_seconds is not None else ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=ACCESS_TOKEN_COOKIE_SECURE,
        samesite=ACCESS_TOKEN_COOKIE_SAMESITE,
        domain=ACCESS_TOKEN_COOKIE_DOMAIN,
        path=ACCESS_TOKEN_COOKIE_PATH,
    )


def clear_access_token_cookie(response: Response) -> None:
    """Remove the portal access token cookie (used by /logout)."""
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        domain=ACCESS_TOKEN_COOKIE_DOMAIN,
        path=ACCESS_TOKEN_COOKIE_PATH,
    )

# 密码加密
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """加密密码"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def authenticate_user(db: Session, username_or_email: str, password: str) -> Optional[User]:
    """验证用户（支持用户名或邮箱登录）"""
    # 智能判断：如果包含@符号，当作邮箱查询；否则当作用户名
    if "@" in username_or_email:
        user = db.query(User).filter(User.email == username_or_email).first()
    else:
        user = db.query(User).filter(User.username == username_or_email).first()
    
    if not user:
        return None
    # 仅 Google 登录的用户没有密码，不能使用密码登录
    if not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Resolve the current user from the cross-subdomain HttpOnly cookie.

    Cookie-only: the main portal and every sub-game on *.deepbraintechnology.com
    authenticate by sending the cookie with `credentials: "include"`. The legacy
    Authorization: Bearer fallback was removed so we surface client bugs loudly
    instead of silently masking them during the cookie migration.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="AUTH_INVALID_TOKEN",
    )

    raw_token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not raw_token:
        raise credentials_exception

    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前活跃用户"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=400, 
            detail="AUTH_USER_DISABLED"
        )
    return current_user
