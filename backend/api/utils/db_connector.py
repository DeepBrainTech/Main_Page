"""
外部游戏数据库连接管理工具
支持多种数据库类型：PostgreSQL, MySQL, MongoDB 等
"""
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any, Optional, List
import pymongo
from pymongo import MongoClient
from models import GameConfig
import logging

logger = logging.getLogger(__name__)


class DatabaseConnector:
    """数据库连接器基类"""
    
    def __init__(self, config: GameConfig):
        self.config = config
        self.connection = None
    
    def connect(self) -> bool:
        """建立连接"""
        raise NotImplementedError
    
    def disconnect(self):
        """断开连接"""
        raise NotImplementedError
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """执行查询"""
        raise NotImplementedError
    
    def test_connection(self) -> bool:
        """测试连接"""
        raise NotImplementedError


class PostgreSQLConnector(DatabaseConnector):
    """PostgreSQL 连接器"""
    
    def connect(self) -> bool:
        try:
            connection_string = (
                f"postgresql://{self.config.db_user}:{self.config.db_password}"
                f"@{self.config.db_host}:{self.config.db_port}/{self.config.db_name}"
            )
            self.engine = create_engine(
                connection_string,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10
            )
            self.connection = self.engine.connect()
            logger.info(f"成功连接到 PostgreSQL 数据库: {self.config.game_name}")
            return True
        except Exception as e:
            logger.error(f"连接 PostgreSQL 失败: {str(e)}")
            return False
    
    def disconnect(self):
        if self.connection:
            self.connection.close()
        if hasattr(self, 'engine'):
            self.engine.dispose()
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        try:
            if not self.connection:
                self.connect()
            
            result = self.connection.execute(text(query))
            columns = result.keys()
            rows = result.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]
        except SQLAlchemyError as e:
            logger.error(f"查询执行失败: {str(e)}")
            raise
    
    def test_connection(self) -> bool:
        try:
            if not self.connection:
                if not self.connect():
                    return False
            self.connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"连接测试失败: {str(e)}")
            return False


class MySQLConnector(DatabaseConnector):
    """MySQL 连接器"""
    
    def connect(self) -> bool:
        try:
            connection_string = (
                f"mysql+pymysql://{self.config.db_user}:{self.config.db_password}"
                f"@{self.config.db_host}:{self.config.db_port}/{self.config.db_name}"
            )
            self.engine = create_engine(
                connection_string,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10
            )
            self.connection = self.engine.connect()
            logger.info(f"成功连接到 MySQL 数据库: {self.config.game_name}")
            return True
        except Exception as e:
            logger.error(f"连接 MySQL 失败: {str(e)}")
            return False
    
    def disconnect(self):
        if self.connection:
            self.connection.close()
        if hasattr(self, 'engine'):
            self.engine.dispose()
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        try:
            if not self.connection:
                self.connect()
            
            result = self.connection.execute(text(query))
            columns = result.keys()
            rows = result.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]
        except SQLAlchemyError as e:
            logger.error(f"查询执行失败: {str(e)}")
            raise
    
    def test_connection(self) -> bool:
        try:
            if not self.connection:
                if not self.connect():
                    return False
            self.connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"连接测试失败: {str(e)}")
            return False


class MongoDBConnector(DatabaseConnector):
    """MongoDB 连接器"""
    
    def connect(self) -> bool:
        try:
            connection_string = (
                f"mongodb://{self.config.db_user}:{self.config.db_password}"
                f"@{self.config.db_host}:{self.config.db_port}/"
            )
            self.client = MongoClient(connection_string)
            self.db = self.client[self.config.db_name]
            # 测试连接
            self.client.admin.command('ping')
            logger.info(f"成功连接到 MongoDB 数据库: {self.config.game_name}")
            return True
        except Exception as e:
            logger.error(f"连接 MongoDB 失败: {str(e)}")
            return False
    
    def disconnect(self):
        if hasattr(self, 'client'):
            self.client.close()
    
    def execute_query(self, query: Dict[str, Any], collection: str) -> List[Dict[str, Any]]:
        """执行 MongoDB 查询（query 是 MongoDB 查询字典）"""
        try:
            if not hasattr(self, 'db'):
                self.connect()
            
            collection_obj = self.db[collection]
            results = collection_obj.find(query)
            return list(results)
        except Exception as e:
            logger.error(f"查询执行失败: {str(e)}")
            raise
    
    def test_connection(self) -> bool:
        try:
            if not hasattr(self, 'client'):
                if not self.connect():
                    return False
            self.client.admin.command('ping')
            return True
        except Exception as e:
            logger.error(f"连接测试失败: {str(e)}")
            return False


def create_connector(config: GameConfig) -> Optional[DatabaseConnector]:
    """根据配置创建相应的数据库连接器"""
    db_type = config.db_type.lower()
    
    if db_type == "postgresql":
        return PostgreSQLConnector(config)
    elif db_type == "mysql":
        return MySQLConnector(config)
    elif db_type == "mongodb":
        return MongoDBConnector(config)
    else:
        logger.error(f"不支持的数据库类型: {db_type}")
        return None
