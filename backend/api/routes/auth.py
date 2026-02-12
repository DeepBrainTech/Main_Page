"""
认证相关路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models import User
from schemas import UserCreate, UserResponse, Token, APIResponse, SendVerificationCode, ResetPassword
from auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_active_user
)
from utils.email_service import email_service
from utils.verification_service import verification_service

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/send-verification-code", response_model=APIResponse)
async def send_verification_code(request: SendVerificationCode):
    """发送邮箱验证码"""
    try:
        # 生成6位数字验证码
        code = verification_service.generate_code()
        
        # 保存验证码（5分钟有效期）
        if not verification_service.save_code(request.email, code, expire_minutes=5):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="VERIFICATION_CODE_SAVE_FAILED"
            )
        
        # 发送验证码邮件，使用请求中的语言参数
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


@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
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
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 自动生成 token，实现注册后自动登录
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
    """用户登录"""
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


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前用户信息"""
    return current_user


@router.get("/verify", response_model=APIResponse)
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """验证 Token 是否有效"""
    return APIResponse(
        success=True,
        message="AUTH_TOKEN_VALID",
        data={"username": current_user.username, "user_id": current_user.id}
    )


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
        
        # 保存验证码（5分钟有效期）
        if not verification_service.save_code(request.email, code, expire_minutes=5):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="VERIFICATION_CODE_SAVE_FAILED"
            )
        
        # 发送验证码邮件，使用请求中的语言参数
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
