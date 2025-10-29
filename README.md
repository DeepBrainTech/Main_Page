# Main Page 项目

一个基于 Next.js 前端和 FastAPI 后端的全栈网站项目。

## 项目结构

```
Main_Page/
├── backend/
│   └── api/              # FastAPI 后端服务
│       ├── main.py       # FastAPI 应用主文件
│       ├── requirements.txt
│       ├── run.py
│       └── README.md
├── frontend/
│   └── main_page/        # Next.js 前端应用
│       ├── app/
│       ├── package.json
│       └── ...
└── LICENSE
```

## 快速开始

### 前端开发（Next.js）

```bash
cd frontend/main_page

# 安装依赖（如果还没有）
npm install

# 启动开发服务器
npm run dev
```

前端将在 http://localhost:3000 运行。

### 后端开发（FastAPI）

```bash
cd backend/api

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 运行开发服务器
python run.py
# 或使用 uvicorn:
# uvicorn main:app --reload
```

后端将在 http://localhost:8000 运行。
API 文档可以在 http://localhost:8000/docs 查看。

## 开发流程

1. **前端开发**: 在 `frontend/main_page/` 目录下进行 Next.js 开发
2. **后端开发**: 在 `backend/api/` 目录下进行 FastAPI 开发
3. **API 调用**: 前端通过 `http://localhost:8000/api/*` 调用后端接口

## 使用 Docker

### 前置要求

确保已安装：
- [Docker](https://www.docker.com/get-started) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0+)

### 生产模式

一键启动前后端服务：

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问：
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 开发模式（支持热重载）

使用开发配置启动：

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

开发模式下代码修改会自动重载，无需重启容器。

### 常用 Docker 命令

```bash
# 重新构建镜像
docker-compose build

# 强制重新构建（不使用缓存）
docker-compose build --no-cache

# 查看运行中的容器
docker-compose ps

# 进入容器
docker-compose exec backend bash
docker-compose exec frontend sh

# 查看资源使用情况
docker stats
```

### 单独运行服务

```bash
# 只启动后端
docker-compose up backend

# 只启动前端
docker-compose up frontend
```

## 技术栈

- **前端**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **后端**: FastAPI, Python, Uvicorn
- **容器化**: Docker, Docker Compose

## 下一步

- [ ] 配置数据库连接
- [ ] 添加认证和授权
- [ ] 实现具体业务功能
- [x] 配置 Docker 容器化部署
