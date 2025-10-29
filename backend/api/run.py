"""
FastAPI 应用启动脚本
"""
import uvicorn
from dotenv import load_dotenv
import os

if __name__ == "__main__":
    # 加载环境变量
    load_dotenv()
    
    # 从环境变量获取配置，或使用默认值
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    # 生产环境不应该使用 reload
    # Railway 会自动设置 NODE_ENV 或 ENVIRONMENT，检查多个可能的环境变量
    is_production = (
        os.getenv("ENVIRONMENT", "").lower() == "production" or
        os.getenv("NODE_ENV", "").lower() == "production" or
        os.getenv("DEBUG", "False").lower() == "false"
    )
    reload = not is_production and os.getenv("DEBUG", "False").lower() == "true"
    
    # 启动服务器
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )
