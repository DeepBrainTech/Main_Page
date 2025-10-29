# Main Page API

基于 FastAPI 的后端服务。

## 快速开始

### 1. 创建虚拟环境（推荐）

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
# 复制环境变量示例文件
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# 根据需要编辑 .env 文件
```

### 4. 运行开发服务器

```bash
# 使用 uvicorn 运行
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 或使用 Python 直接运行
python main.py
```

### 5. 访问 API

- API 文档 (Swagger): http://localhost:8000/docs
- API 文档 (ReDoc): http://localhost:8000/redoc
- 健康检查: http://localhost:8000/api/health

## 项目结构

```
api/
├── main.py           # FastAPI 应用主文件
├── requirements.txt  # Python 依赖
├── .env.example     # 环境变量示例
└── README.md        # 说明文档
```

## 开发建议

1. 根据需求添加路由模块到 `routes/` 目录
2. 数据库模型放在 `models/` 目录
3. 业务逻辑放在 `services/` 目录
4. 工具函数放在 `utils/` 目录

## 常用命令

```bash
# 开发模式运行（自动重载）
uvicorn main:app --reload

# 生产模式运行
uvicorn main:app --host 0.0.0.0 --port 8000

# 安装新依赖后更新 requirements.txt
pip freeze > requirements.txt
```
