"""
认证�>��.�路�"�
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models import User
from schemas import (
    UserCreate,
    UserResponse,
    Token,
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
    get_current_active_user
)
from utils.email_service import email_service
from utils.verification_service import verification_service
from utils.google_oauth import verify_google_token

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/send-verification-code", response_model=APIResponse)
async def send_verification_code(request: SendVerificationCode):
    """�'�?��,�箱�O证码"""
    try:
        # �"Y�^�6位�.��-�O证码
        code = verification_service.generate_code()
        
        # 保�~�O证码�^5�^?�'Y�o?�.^�oY�?
        if not verification_service.save_code(request.email, code, expire_minutes=5):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="VERIFICATION_CODE_SAVE_FAILED"
            )
        
        # �'�?��O证码�,�件�O使�"�请�,中�s"语�?�,�.�
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
        print(f"�'�?��O证码�,常: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VERIFICATION_CODE_SEND_FAILED"
        )


@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """�"��^�注�?O"""
    # �O证�O证码
    if not verification_service.verify_code(user_data.email, user_data.verification_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VERIFICATION_CODE_INVALID"
        )
    
    # �?�Y��"��^�名�~�否已�~�o�
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_USERNAME_EXISTS"
        )
    
    # �?�Y��,�箱�~�否已�~�o�
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_EMAIL_EXISTS"
        )
    
    # �^>建�-��"��^�
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        date_of_birth=user_data.date_of_birth,
        is_active=True,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # �?��S��"Y�^� token�O�z�Z�注�?O�Z�?��S��T��.
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username},
        expires_delta=access_token_expires
    )
    
    return APIResponse(
        success=True,
        message="AUTH_REGISTER_SUCCESS",
        data={
            "user_id": new_user.id,
            "username": new_user.username,
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """�"��^��T��."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_INVALID_CREDENTIALS",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/google", response_model=Token)
async def google_login(request: GoogleTokenRequest, db: Session = Depends(get_db)):
    """
    ?? Google ID Token ??????
    ?? Google ????????,????????(??? Google ??)?
    ??????(??????),????? google_id ??????
    """
    payload = verify_google_token(request.id_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_GOOGLE_TOKEN_INVALID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    google_id = payload.get("sub")
    email = payload.get("email") or ""
    name = (payload.get("name") or email.split("@")[0] or "user").strip()[:50]

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_GOOGLE_TOKEN_INVALID",
        )

    # ??? google_id ?
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AUTH_USER_DISABLED",
            )
    else:
        # ??????:?????,???? google_id ???
        user = db.query(User).filter(User.email == email).first()
        if user:
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="AUTH_USER_DISABLED",
                )
            # ???????? Google ??,????
            if user.google_id and user.google_id != google_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="AUTH_EMAIL_EXISTS",
                )
            if not user.google_id:
                user.google_id = google_id
                db.commit()
                db.refresh(user)
        else:
            # ???:? Google ??
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
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _user_to_response(
    user: User,
    access_token=None,
    token_type=None,
    expires_in=None,
) -> UserResponse:
    """将 User 转为 UserResponse，并计算 age，可选携带新的访问令牌"""
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        date_of_birth=user.date_of_birth,
        age=compute_age(user.date_of_birth),
        access_token=access_token,
        token_type=token_type,
        expires_in=expires_in,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    """�Z��-�"�?��"��^�信息"""
    return _user_to_response(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    body: CompleteProfileBody,
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
    db.commit()
    db.refresh(current_user)

    # 如果用户名被修改，使用新用户名签发新的访问 token，避免旧 token 中的 sub 不一致导致 401
    if body.username is not None and body.username != original_username:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user.username},
            expires_delta=access_token_expires,
        )
        return _user_to_response(
            current_user,
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    return _user_to_response(current_user)


@router.get("/verify", response_model=APIResponse)
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """�O证 Token �~�否�o?�.^"""
    return APIResponse(
        success=True,
        message="AUTH_TOKEN_VALID",
        data={"username": current_user.username, "user_id": current_user.id}
    )


@router.post("/send-reset-password-code", response_model=APIResponse)
async def send_reset_password_code(request: SendVerificationCode, db: Session = Depends(get_db)):
    """�'�?��?�置�?码�O证码"""
    try:
        # �?�Y��,�箱�~�否�~�o�
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="EMAIL_NOT_FOUND"
            )
        
        # �"Y�^�6位�.��-�O证码
        code = verification_service.generate_code()
        
        # 保�~�O证码�^5�^?�'Y�o?�.^�oY�?
        if not verification_service.save_code(request.email, code, expire_minutes=5):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="VERIFICATION_CODE_SAVE_FAILED"
            )
        
        # �'�?��O证码�,�件�O使�"�请�,中�s"语�?�,�.�
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
        print(f"�'�?��?�置�?码�O证码�,常: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VERIFICATION_CODE_SEND_FAILED"
        )


@router.post("/reset-password", response_model=APIResponse)
async def reset_password(request: ResetPassword, db: Session = Depends(get_db)):
    """�?�置�?码"""
    try:
        # �O证�O证码
        if not verification_service.verify_code(request.email, request.verification_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VERIFICATION_CODE_INVALID"
            )
        
        # �Y��?��"��^�
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="EMAIL_NOT_FOUND"
            )
        
        # �>��-��?码
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
        print(f"�?�置�?码�,常: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PASSWORD_RESET_FAILED"
        )
