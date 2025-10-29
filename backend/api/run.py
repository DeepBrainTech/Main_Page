"""
FastAPI 应用启动脚本
"""
import uvicorn
from dotenv import load_dotenv
import os
import sys

if __name__ == "__main__":
    # 加载环境变量
    load_dotenv()
    
    # 从环境变量获取配置，或使用默认值
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    # 打印调试信息
    print("=" * 50)
    print("Starting FastAPI Application")
    print(f"HOST: {host}")
    print(f"PORT: {port}")
    print(f"ENVIRONMENT: {os.getenv('ENVIRONMENT', 'Not set')}")
    print(f"DEBUG: {os.getenv('DEBUG', 'Not set')}")
    print(f"DATABASE_URL: {'Set' if os.getenv('DATABASE_URL') else 'Not set'}")
    print(f"CORS_ORIGINS: {os.getenv('CORS_ORIGINS', 'Not set')}")
    print("=" * 50)
    sys.stdout.flush()
    
    # 生产环境不应该使用 reload
    # Railway 会自动设置 NODE_ENV 或 ENVIRONMENT，检查多个可能的环境变量
    is_production = (
        os.getenv("ENVIRONMENT", "").lower() == "production" or
        os.getenv("NODE_ENV", "").lower() == "production" or
        os.getenv("DEBUG", "False").lower() == "false"
    )
    reload = not is_production and os.getenv("DEBUG", "False").lower() == "true"
    
    print(f"Production mode: {is_production}")
    print(f"Reload enabled: {reload}")
    print("=" * 50)
    sys.stdout.flush()
    
    # 启动服务器
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info"
        )
    except Exception as e:
        print(f"ERROR: Failed to start server: {e}")
        sys.stdout.flush()
        raise
