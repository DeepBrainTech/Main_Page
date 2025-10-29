"""
Pydantic 数据验证模型
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime


# ========== 用户相关 ==========
class UserBase(BaseModel):
    """用户基础模型"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    """创建用户模型"""
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """用户登录模型"""
    username: str
    password: str


class UserResponse(UserBase):
    """用户响应模型"""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ========== 认证相关 ==========
class Token(BaseModel):
    """Token 响应模型"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # 秒数


class TokenData(BaseModel):
    """Token 数据"""
    username: Optional[str] = None


# ========== 游戏相关 ==========
class GameConfigBase(BaseModel):
    """游戏配置基础模型"""
    game_name: str
    game_display_name: str
    description: Optional[str] = None
    db_type: str
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    game_url: Optional[str] = None
    is_active: bool = True


class GameConfigResponse(BaseModel):
    """游戏配置响应模型"""
    id: int
    game_name: str
    game_display_name: str
    description: Optional[str]
    db_type: str
    game_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class GameAccessResponse(BaseModel):
    """游戏访问响应模型"""
    id: int
    game_id: int
    access_count: int
    last_access_at: Optional[datetime]
    first_access_at: datetime
    can_access: bool
    access_metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True


# ========== API 响应 ==========
class APIResponse(BaseModel):
    """通用 API 响应"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
