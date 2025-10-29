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
    reload = os.getenv("DEBUG", "True").lower() == "true"
    
    # 启动服务器
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )
