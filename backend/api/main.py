from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

# 创建 FastAPI 应用实例
app = FastAPI(
    title="Main Page API",
    description="主页面后端 API",
    version="1.0.0"
)

# 配置 CORS - 允许前端访问
# 从环境变量读取允许的源，支持 Docker 环境
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径 - 健康检查"""
    return {
        "message": "欢迎使用 Main Page API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "main-page-api"
    }


@app.get("/api/test")
async def test():
    """测试端点"""
    return {
        "message": "API 工作正常",
        "timestamp": "2024-01-01T00:00:00Z"
    }
