"""
Pydantic 数据验证模型
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date


def compute_age(birth: Optional[date]) -> Optional[int]:
    """根据出生日期计算年龄（周岁），未提供则返回 None"""
    if not birth:
        return None
    today = date.today()
    age = today.year - birth.year
    if (today.month, today.day) < (birth.month, birth.day):
        age -= 1
    return age


# ========== 用户相关 ==========
class UserBase(BaseModel):
    """用户基础模型"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    """创建用户模型"""
    password: str = Field(..., min_length=6, max_length=100)
    verification_code: str = Field(..., min_length=6, max_length=6)
    date_of_birth: Optional[date] = None  # 出生日期，可选（测试阶段用于年龄分析）


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
    date_of_birth: Optional[date] = None
    age: Optional[int] = None  # 由 date_of_birth 计算，序列化时由路由填充
    access_token: Optional[str] = None  # 可选：用户名变更后返回新的访问令牌
    token_type: Optional[str] = None
    expires_in: Optional[int] = None  # 秒数，可选

    class Config:
        from_attributes = True


class CompleteProfileBody(BaseModel):
    """Google 用户补全资料：用户名、出生日期"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    date_of_birth: Optional[date] = None


# ========== 认证相关 ==========
class Token(BaseModel):
    """Token 响应模型"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # 秒数


class TokenData(BaseModel):
    """Token 数据"""
    username: Optional[str] = None


class GoogleTokenRequest(BaseModel):
    """Google 登录请求：前端传入 Google ID Token"""
    id_token: str = Field(..., min_length=1)


class SendVerificationCode(BaseModel):
    """发送验证码请求模型"""
    email: EmailStr
    language: Optional[str] = "zh"  # 语言：zh(中文) 或 en(英文)，默认中文


class ResetPassword(BaseModel):
    """重置密码请求模型"""
    email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=100)


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


# ========== 用户奖励 / 签到 / 任务 / 认知分数 ==========
class RewardsState(BaseModel):
    """用户奖励与签到状态"""
    coins: int = 0
    diamonds: int = 0
    check_in_dates: list[str] = []  # 本月已签到日期 YYYY-MM-DD
    has_checked_in_today: bool = False
    current_streak: int = 0
    daily_progress: Dict[str, int] = {}  # task_id -> count (来自游戏)
    monthly_progress: int = 0  # 本月棋境之旅完成局数
    task_claimed_today: List[str] = []  # 今日已领取的 daily task_id
    monthly_claimed: bool = False


class CognitiveScoresBody(BaseModel):
    """六维分数（单维或全量）"""
    memory: Optional[int] = None
    logic: Optional[int] = None
    focus: Optional[int] = None
    reaction: Optional[int] = None
    strategy: Optional[int] = None
    spatial: Optional[int] = None


class CognitiveScoresResponse(BaseModel):
    """六维分数响应"""
    memory: int = 0
    logic: int = 0
    focus: int = 0
    reaction: int = 0
    strategy: int = 0
    spatial: int = 0


class LeaderboardEntry(BaseModel):
    """排行榜单项"""
    rank: int
    user_id: int
    username: str
    score: int


# ========== API 响应 ==========
class APIResponse(BaseModel):
    """通用 API 响应"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
