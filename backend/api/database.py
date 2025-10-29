"""
数据库连接和会话管理
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# 主数据库连接（用户认证数据库）
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/main_page_db"
)

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 自动重连
    pool_size=10,
    max_overflow=20
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基础模型类
Base = declarative_base()


def get_db():
    """
    获取数据库会话（依赖注入）
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    初始化数据库（创建表）
    """
    Base.metadata.create_all(bind=engine)
