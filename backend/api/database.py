"""
数据库连接和会话管理
"""
from sqlalchemy import create_engine, text
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
    初始化数据库（创建表 + 兼容旧表结构）
    """
    # 确保所有模型已注册到 Base（用于创建 user_rewards 等新表）
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    ensure_users_table_compatibility()


def ensure_users_table_compatibility():
    """
    向后兼容旧版 users 表结构。
    目前仅在 PostgreSQL 下自动补齐 Google 登录所需字段，避免旧库直接升级时报错。
    """
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as conn:
        # 兼容旧库：补齐 Google 登录字段
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)"))
        # 兼容旧库：允许 Google-only 用户密码为空
        conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
        # 为 google_id 添加唯一索引（NULL 不冲突）
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)"))
        # 兼容旧库：出生日期，用于计算年龄
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE"))
        # Backward compatibility: Google avatar and user-uploaded avatar fields
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_avatar_url VARCHAR(1024)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_object_key VARCHAR(512)"))
        # 兼容旧库：统一资产账户新增鲜花字段
        conn.execute(text("ALTER TABLE user_rewards ADD COLUMN IF NOT EXISTS flowers INTEGER DEFAULT 0"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS game_likes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                game_key VARCHAR(100) NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_game_likes_user_game_key ON game_likes (user_id, game_key)"
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_game_likes_game_key ON game_likes (game_key)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_game_played (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                game_key VARCHAR(100) NOT NULL,
                first_played_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
            )
        """))
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_user_game_played_game "
                "ON user_game_played (user_id, game_key)"
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_user_game_played_user_id ON user_game_played (user_id)"))
        # 兼容旧库：新增全局排行快照字段
        conn.execute(text("ALTER TABLE user_cognitive_scores ADD COLUMN IF NOT EXISTS previous_total_rank INTEGER"))
