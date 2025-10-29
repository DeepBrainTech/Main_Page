"""
数据库模型
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    """用户模型"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联游戏访问记录
    game_accesses = relationship("GameAccess", back_populates="user")


class GameConfig(Base):
    """游戏配置模型 - 存储各个游戏数据库的连接信息"""
    __tablename__ = "game_configs"

    id = Column(Integer, primary_key=True, index=True)
    game_name = Column(String(100), unique=True, index=True, nullable=False)
    game_display_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # 数据库连接配置（加密存储）
    db_type = Column(String(50), nullable=False)  # postgresql, mysql, mongodb, etc.
    db_host = Column(String(200), nullable=False)
    db_port = Column(Integer, nullable=False)
    db_name = Column(String(100), nullable=False)
    db_user = Column(String(100), nullable=False)
    db_password = Column(String(255), nullable=False)  # 实际应用中应该加密
    
    # 游戏访问URL
    game_url = Column(String(500))
    
    # 是否启用
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联游戏访问记录
    game_accesses = relationship("GameAccess", back_populates="game")


class GameAccess(Base):
    """游戏访问记录 - 记录用户对游戏的访问情况"""
    __tablename__ = "game_accesses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("game_configs.id"), nullable=False)
    
    # 访问统计
    access_count = Column(Integer, default=0)
    last_access_at = Column(DateTime)
    first_access_at = Column(DateTime, default=datetime.utcnow)
    
    # 权限相关
    can_access = Column(Boolean, default=True)
    
    # 扩展数据（存储游戏特定的用户数据）
    access_metadata = Column(JSON, default=dict)

    # 关系
    user = relationship("User", back_populates="game_accesses")
    game = relationship("GameConfig", back_populates="game_accesses")
