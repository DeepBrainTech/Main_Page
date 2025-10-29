# 认证系统说明

## 功能特性

✅ **用户注册和登录**
- 用户名/邮箱注册
- JWT Token 认证
- 密码加密存储（bcrypt）
- Token 有效期 7 天

✅ **单点登录（SSO）**
- 用户只需登录一次
- Token 存储在 localStorage
- 前端自动验证 Token 有效性
- 支持跨页面访问所有游戏

✅ **数据库设计**
- **User**: 用户表（用户名、邮箱、密码等）
- **GameConfig**: 游戏配置表（存储各游戏数据库连接信息）
- **GameAccess**: 游戏访问记录表（记录用户对游戏的访问统计）

✅ **外部数据库连接支持**
- PostgreSQL（游戏数据库）
- MySQL（游戏数据库）
- MongoDB（游戏数据库）
- 统一的连接管理接口

## API 端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录（OAuth2）
- `GET /api/auth/me` - 获取当前用户信息（需要认证）
- `GET /api/auth/verify` - 验证 Token（需要认证）

## 使用方法

### 1. 启动服务

```bash
# 使用 Docker Compose（推荐）
docker-compose -f docker-compose.dev.yml up -d --build
```

这将启动：
- PostgreSQL 数据库（端口 5432）
- FastAPI 后端（端口 8000）
- Next.js 前端（端口 3000）

### 2. 数据库初始化

数据库表会在应用启动时自动创建。

### 3. 测试 API

访问 http://localhost:8000/docs 查看 API 文档并测试。

### 注册用户示例：

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123"
  }'
```

### 登录示例：

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=test123"
```

## 前端集成

### 登录流程

1. 用户在登录页面输入用户名和密码
2. 前端调用 `/api/auth/login` 获取 Token
3. Token 存储在 `localStorage`
4. 后续请求在 Header 中添加 `Authorization: Bearer <token>`

### 保护路由

```typescript
// 检查是否登录
const token = localStorage.getItem("access_token");
if (!token) {
  router.push("/login");
}

// API 请求时添加 Token
fetch("http://localhost:8000/api/auth/me", {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

## 游戏数据库连接

### 添加游戏数据库配置

通过管理后台或 API 添加游戏配置：

```python
game_config = GameConfig(
    game_name="game1",
    game_display_name="游戏1",
    db_type="postgresql",
    db_host="game-db-host",
    db_port=5432,
    db_name="game1_db",
    db_user="game_user",
    db_password="game_password"
)
```

### 连接游戏数据库

```python
from utils.db_connector import create_connector

connector = create_connector(game_config)
if connector.test_connection():
    results = connector.execute_query("SELECT * FROM users LIMIT 10")
```

## 环境变量

在 `.env` 文件中配置：

```env
# 数据库
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/main_page_db

# JWT 密钥（生产环境必须更改）
SECRET_KEY=your-secret-key-change-in-production

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 安全建议

1. **生产环境**：更改 `SECRET_KEY` 为强随机字符串
2. **HTTPS**：生产环境使用 HTTPS
3. **密码强度**：前端添加密码强度验证
4. **Rate Limiting**：添加请求频率限制
5. **数据库密码加密**：GameConfig 中的密码应加密存储

## 下一步

- [ ] 实现密码重置功能
- [ ] 添加邮箱验证
- [ ] 实现角色权限系统
- [ ] 添加游戏数据查询 API
- [ ] 实现数据分析功能
- [ ] 添加游戏访问统计面板
