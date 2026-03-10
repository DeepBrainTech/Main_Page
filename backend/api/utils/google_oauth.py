"""
Google OAuth ID Token 校验
使用 google-auth 库验证前端传来的 Google ID Token，并返回用户信息
"""
import os
from typing import Optional, Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests

# 从环境变量读取 Google 客户端 ID（与前端一致）
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


def verify_google_token(id_token_str: str) -> Optional[Dict[str, Any]]:
    """
    验证 Google ID Token，返回 payload（包含 sub, email, name 等）。
    校验失败或未配置 GOOGLE_CLIENT_ID 时返回 None。
    """
    if not GOOGLE_CLIENT_ID:
        return None
    try:
        payload = id_token.verify_oauth2_token(
            id_token_str,
            requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        return payload
    except Exception:
        return None
