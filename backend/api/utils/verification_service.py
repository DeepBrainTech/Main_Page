"""
验证码服务
"""
import os
import random
import string
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class VerificationService:
    """验证码服务类"""
    
    def __init__(self):
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", "6379"))
        self.redis_db = int(os.getenv("REDIS_DB", "0"))
        self.redis_password = os.getenv("REDIS_PASSWORD", None)
        
        # 尝试连接Redis，如果失败则使用内存存储
        self.use_redis = False
        self.memory_store = {}
        
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(
                    host=self.redis_host,
                    port=self.redis_port,
                    db=self.redis_db,
                    password=self.redis_password if self.redis_password else None,
                    decode_responses=True
                )
                # 测试连接
                self.redis_client.ping()
                self.use_redis = True
                print("✓ Redis 连接成功，使用 Redis 存储验证码")
            except Exception as e:
                print(f"✗ Redis 连接失败: {str(e)}")
                print("  使用内存存储验证码（重启后会丢失）")
        else:
            print("✗ Redis 未安装，使用内存存储验证码（重启后会丢失）")
    
    def generate_code(self, length: int = 6) -> str:
        """
        生成随机验证码
        
        Args:
            length: 验证码长度，默认6位
        
        Returns:
            验证码字符串
        """
        return ''.join(random.choices(string.digits, k=length))
    
    def save_code(self, email: str, code: str, expire_minutes: int = 5) -> bool:
        """
        保存验证码
        
        Args:
            email: 邮箱地址
            code: 验证码
            expire_minutes: 过期时间（分钟），默认5分钟
        
        Returns:
            是否保存成功
        """
        key = f"verification_code:{email}"
        
        try:
            if self.use_redis:
                # 使用Redis存储
                self.redis_client.setex(
                    key,
                    timedelta(minutes=expire_minutes),
                    code
                )
            else:
                # 使用内存存储
                expire_time = datetime.now() + timedelta(minutes=expire_minutes)
                self.memory_store[key] = {
                    "code": code,
                    "expire_time": expire_time
                }
                # 清理过期的验证码
                self._clean_expired_codes()
            return True
        except Exception as e:
            print(f"保存验证码失败: {str(e)}")
            return False
    
    def verify_code(self, email: str, code: str) -> bool:
        """
        验证验证码
        
        Args:
            email: 邮箱地址
            code: 用户输入的验证码
        
        Returns:
            验证是否成功
        """
        key = f"verification_code:{email}"
        
        try:
            if self.use_redis:
                # 从Redis获取
                stored_code = self.redis_client.get(key)
                if stored_code and stored_code == code:
                    # 验证成功后删除验证码
                    self.redis_client.delete(key)
                    return True
            else:
                # 从内存获取
                stored_data = self.memory_store.get(key)
                if stored_data:
                    if datetime.now() < stored_data["expire_time"]:
                        if stored_data["code"] == code:
                            # 验证成功后删除验证码
                            del self.memory_store[key]
                            return True
                    else:
                        # 验证码已过期，删除
                        del self.memory_store[key]
            return False
        except Exception as e:
            print(f"验证验证码失败: {str(e)}")
            return False
    
    def _clean_expired_codes(self):
        """清理过期的验证码（仅用于内存存储）"""
        if not self.use_redis:
            now = datetime.now()
            expired_keys = [
                key for key, data in self.memory_store.items()
                if data["expire_time"] < now
            ]
            for key in expired_keys:
                del self.memory_store[key]
    
    def delete_code(self, email: str) -> bool:
        """
        删除验证码
        
        Args:
            email: 邮箱地址
        
        Returns:
            是否删除成功
        """
        key = f"verification_code:{email}"
        
        try:
            if self.use_redis:
                self.redis_client.delete(key)
            else:
                if key in self.memory_store:
                    del self.memory_store[key]
            return True
        except Exception as e:
            print(f"删除验证码失败: {str(e)}")
            return False


# 创建全局验证码服务实例
verification_service = VerificationService()
