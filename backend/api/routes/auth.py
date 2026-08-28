"""
认证相关路由
"""
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import EmailStr
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models import User
from schemas import (
    UserCreate,
    UserResponse,
    APIResponse,
    SendVerificationCode,
    ResetPassword,
    GoogleTokenRequest,
    CompleteProfileBody,
)
from schemas import compute_age
from auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REMEMBER_ME_EXPIRE_MINUTES,
    get_current_active_user,
    set_access_token_cookie,
    clear_access_token_cookie,
)
from utils.email_service import email_service
from utils.verification_service import verification_service
from utils.google_oauth import verify_google_token
from utils.r2_storage import generate_object_read_url, upload_object_bytes

router = APIRouter(prefix="/api/auth", tags=["认证"])

MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_AVATAR_MIME_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}


def _build_avatar_url(user: User) -> Optional[str]:
    if user.avatar_object_key:
        try:
            return generate_object_read_url(object_key=user.avatar_object_key, expires_seconds=86400)
        except Exception:
            return None
    if user.google_avatar_url:
        return user.google_avatar_url
    return None


@router.post("/send-verification-code", response_model=APIResponse)
async def send_verification_code(request: SendVerificationCode):
    """发送邮箱验证码"""
    try:
        # 生成6位数字验证码
        code = verification_service.generate_code()
        
        # 保存验证码，5分钟后过期
        if not verification_service.save_code(request.email, code, expire_minutes=5):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="VERIFICATION_CODE_SAVE_FAILED"
            )
        
        # 发送验证码邮件，支持中英文模板
        language = request.language if request.language in ["zh", "en"] else "zh"
        success = await email_service.send_verification_code(request.email, code, language=language)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="EMAIL_SEND_FAILED"
            )
        
        return APIResponse(
            success=True,
            message="VERIFICATION_CODE_SENT",
            data={"email": request.email}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"发送验证码异常: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VERIFICATION_CODE_SEND_FAILED"
        )


@router.get("/check-availability", response_model=APIResponse)
async def check_availability(
    username: Optional[str] = None,
    email: Optional[EmailStr] = None,
    db: Session = Depends(get_db),
):
    """Check whether a registration username or email is available."""
    if username is None and email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_AVAILABILITY_FIELD_REQUIRED",
        )

    data = {}
    if username is not None:
        normalized_username = username.strip()
        if not 3 <= len(normalized_username) <= 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AUTH_USERNAME_INVALID",
            )
        data["username_available"] = (
            db.query(User).filter(User.username == normalized_username).first() is None
        )

    if email is not None:
        normalized_email = str(email).strip()
        data["email_available"] = db.query(User).filter(User.email == normalized_email).first() is None

    return APIResponse(
        success=True,
        message="AUTH_AVAILABILITY_CHECKED",
        data=data,
    )


@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, response: Response, db: Session = Depends(get_db)):
    """用户注册"""
    # 验证验证码
    if not verification_service.verify_code(user_data.email, user_data.verification_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VERIFICATION_CODE_INVALID"
        )
    
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_USERNAME_EXISTS"
        )
    
    # 检查邮箱是否已存在
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_EMAIL_EXISTS"
        )
    
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        date_of_birth=user_data.date_of_birth,
        country=(user_data.country or "").upper() if user_data.country else None,
        is_active=True,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 注册成功后签发 token 并写入 HttpOnly Cookie，免去再次登录
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username},
        expires_delta=access_token_expires,
    )
    set_access_token_cookie(response, access_token)

    return APIResponse(
        success=True,
        message="AUTH_REGISTER_SUCCESS",
        data={
            "user_id": new_user.id,
            "username": new_user.username,
            "auto_login": True,
        },
    )


@router.post("/login", response_model=APIResponse)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = Form(False),
    db: Session = Depends(get_db),
):
    """用户登录，凭据通过 HttpOnly Cookie 下发；响应体不再回传令牌。"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_INVALID_CREDENTIALS",
        )

    token_expire_minutes = REMEMBER_ME_EXPIRE_MINUTES if remember_me else ACCESS_TOKEN_EXPIRE_MINUTES
    access_token_expires = timedelta(minutes=token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )
    set_access_token_cookie(
        response,
        access_token,
        max_age_seconds=token_expire_minutes * 60 if remember_me else None,
        persistent=remember_me,
    )

    return APIResponse(
        success=True,
        message="AUTH_LOGIN_SUCCESS",
        data={"username": user.username, "user_id": user.id},
    )


@router.post("/google", response_model=APIResponse)
async def google_login(request: GoogleTokenRequest, response: Response, db: Session = Depends(get_db)):
    """
    使用 Google ID Token 登录，凭据通过 HttpOnly Cookie 下发。
    如果 Google 账号邮箱已存在，则绑定该账号（仅首次 Google 登录）。
    若用户不存在（邮箱也不存在），则自动创建带 google_id 的新用户。
    """
    payload = verify_google_token(request.id_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_GOOGLE_TOKEN_INVALID",
        )

    google_id = payload.get("sub")
    email = payload.get("email") or ""
    name = (payload.get("name") or email.split("@")[0] or "user").strip()[:50]
    google_avatar_url = payload.get("picture") or None

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_GOOGLE_TOKEN_INVALID",
        )

    # 优先按 google_id 查找
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AUTH_USER_DISABLED",
            )
    else:
        # 回退策略：按邮箱查找并补绑 google_id
        user = db.query(User).filter(User.email == email).first()
        if user:
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="AUTH_USER_DISABLED",
                )
            # 已绑定其他 Google 账号，拒绝绑定
            if user.google_id and user.google_id != google_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="AUTH_EMAIL_EXISTS",
                )
            if not user.google_id:
                user.google_id = google_id
            if google_avatar_url:
                user.google_avatar_url = google_avatar_url
            db.commit()
            db.refresh(user)
        else:
            # 新用户：创建 Google 用户
            base_username = (name or email.split("@")[0] or "user")[:50]
            base_username = "".join(c for c in base_username if c.isalnum() or c in "._-") or "user"
            username = base_username
            suffix = 0
            while db.query(User).filter(User.username == username).first():
                suffix += 1
                username = f"{base_username}{suffix}"[:50]

            user = User(
                username=username,
                email=email,
                hashed_password=None,
                google_id=google_id,
                google_avatar_url=google_avatar_url,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    if user and google_avatar_url and user.google_avatar_url != google_avatar_url:
        user.google_avatar_url = google_avatar_url
        db.commit()
        db.refresh(user)

    remember_me = request.remember_me
    token_expire_minutes = REMEMBER_ME_EXPIRE_MINUTES if remember_me is True else ACCESS_TOKEN_EXPIRE_MINUTES
    access_token_expires = timedelta(minutes=token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )
    if remember_me is True:
        set_access_token_cookie(
            response,
            access_token,
            max_age_seconds=REMEMBER_ME_EXPIRE_MINUTES * 60,
        )
    elif remember_me is False:
        set_access_token_cookie(response, access_token, persistent=False)
    else:
        set_access_token_cookie(response, access_token)
    return APIResponse(
        success=True,
        message="AUTH_LOGIN_SUCCESS",
        data={"username": user.username, "user_id": user.id},
    )


def _user_to_response(user: User) -> UserResponse:
    """将 User 转为 UserResponse，并计算 age。

    Auth is delivered via HttpOnly cookie; this response no longer carries any
    token-related fields.
    """
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        date_of_birth=user.date_of_birth,
        country=user.country,
        avatar_url=_build_avatar_url(user),
        age=compute_age(user.date_of_birth),
        membership_plan=getattr(user, "membership_plan", None) or "free",
        membership_expires_at=getattr(user, "membership_expires_at", None),
        membership_billing_interval=getattr(user, "membership_billing_interval", None),
        membership_pending_plan=getattr(user, "membership_pending_plan", None),
        membership_pending_billing_interval=getattr(user, "membership_pending_billing_interval", None),
        membership_pending_effective_at=getattr(user, "membership_pending_effective_at", None),
        stripe_customer_id=getattr(user, "stripe_customer_id", None),
        stripe_subscription_id=getattr(user, "stripe_subscription_id", None),
        membership_trial_used=bool(getattr(user, "membership_trial_used", False)),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    """获取当前用户信息"""
    return _user_to_response(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    body: CompleteProfileBody,
    response: Response,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """补全/更新当前用户资料（用户名、出生日期），用于 Google 登录后补填"""
    original_username = current_user.username

    if body.username is not None:
        if len(body.username) < 3 or len(body.username) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AUTH_USERNAME_INVALID",
            )
        existing = db.query(User).filter(User.username == body.username, User.id != current_user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AUTH_USERNAME_EXISTS",
            )
        current_user.username = body.username
    if body.date_of_birth is not None:
        current_user.date_of_birth = body.date_of_birth
    if "country" in body.model_fields_set:
        current_user.country = (body.country or "").upper() if body.country else None
    db.commit()
    db.refresh(current_user)

    # 如果用户名被修改，使用新用户名签发新的访问 token 并刷新 Cookie，
    # 避免旧 token 中的 sub 不一致导致后续请求 401
    if body.username is not None and body.username != original_username:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user.username},
            expires_delta=access_token_expires,
        )
        set_access_token_cookie(response, access_token)

    return _user_to_response(current_user)


@router.post("/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Upload current user avatar and return the updated profile."""
    mime_type = (file.content_type or "").lower().strip()
    ext = ALLOWED_AVATAR_MIME_TYPES.get(mime_type)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_AVATAR_UNSUPPORTED",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_AVATAR_EMPTY",
        )
    if len(content) > MAX_AVATAR_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_AVATAR_TOO_LARGE",
        )

    object_key = f"Avatar/{current_user.id}/{uuid4().hex}.{ext}"
    try:
        upload_object_bytes(
            object_key=object_key,
            content=content,
            content_type=mime_type,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AUTH_AVATAR_UPLOAD_FAILED: {str(exc)}",
        ) from exc

    current_user.avatar_object_key = object_key
    db.commit()
    db.refresh(current_user)
    return _user_to_response(current_user)


@router.get("/verify", response_model=APIResponse)
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """验证 Token 是否有效"""
    return APIResponse(
        success=True,
        message="AUTH_TOKEN_VALID",
        data={"username": current_user.username, "user_id": current_user.id}
    )


@router.post("/logout", response_model=APIResponse)
async def logout(response: Response):
    """Clear the cross-subdomain HttpOnly cookie.

    Idempotent: callable even when the caller is already unauthenticated,
    so it's safe to invoke from any UI without a prior auth check.
    """
    clear_access_token_cookie(response)
    return APIResponse(success=True, message="AUTH_LOGOUT_SUCCESS", data=None)


@router.post("/send-reset-password-code", response_model=APIResponse)
async def send_reset_password_code(request: SendVerificationCode, db: Session = Depends(get_db)):
    """发送重置密码验证码"""
    try:
        # 检查邮箱是否存在
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="EMAIL_NOT_FOUND"
            )
        
        # 生成6位数字验证码
        code = verification_service.generate_code()
        
        # 保存验证码，5分钟后过期
        if not verification_service.save_code(request.email, code, expire_minutes=5):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="VERIFICATION_CODE_SAVE_FAILED"
            )
        
        # 发送验证码邮件，支持中英文模板
        language = request.language if request.language in ["zh", "en"] else "zh"
        success = await email_service.send_verification_code(request.email, code, language=language)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="EMAIL_SEND_FAILED"
            )
        
        return APIResponse(
            success=True,
            message="VERIFICATION_CODE_SENT",
            data={"email": request.email}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"发送重置密码验证码异常: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VERIFICATION_CODE_SEND_FAILED"
        )


@router.post("/reset-password", response_model=APIResponse)
async def reset_password(request: ResetPassword, db: Session = Depends(get_db)):
    """重置密码"""
    try:
        # 验证验证码
        if not verification_service.verify_code(request.email, request.verification_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VERIFICATION_CODE_INVALID"
            )
        
        # 查找用户
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="EMAIL_NOT_FOUND"
            )
        
        # 更新密码
        user.hashed_password = get_password_hash(request.new_password)
        db.commit()
        
        return APIResponse(
            success=True,
            message="PASSWORD_RESET_SUCCESS",
            data={"email": request.email}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"重置密码异常: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PASSWORD_RESET_FAILED"
        )
