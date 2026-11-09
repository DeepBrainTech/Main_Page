# 本地联调：Freefall Chess

本说明按 Main_Page 和 `D:\DeepBrainTech\ChessMater` 的实际源码核对（2026-11-09），以 Windows PowerShell、门户在宿主机运行、全链路使用 `http://localhost` 为例。仅配置本地测试环境；新游戏应替换为自己的标识和端口，不能复用 `chessmater` 身份。

## 端口与环境文件

- 门户前端：`http://localhost:3000`；配置 `Main_Page/frontend/main_page/.env.local`。
- 门户 API：`http://localhost:8000`；配置 `Main_Page/backend/api/.env`。
- 游戏前端：`http://localhost:5173`；Docker 模式配置游戏根目录 `.env`，直接运行 Vite 时使用根目录 `.env.local`。
- 游戏 API：`http://localhost:3001`；Docker 模式由 `docker-compose.dev.yml` 注入环境变量，直接运行时配置 `ChessMater/backend/.env`。
- 游戏 PostgreSQL：Docker 开发配置映射 `127.0.0.1:5433`，数据库 `chessmater`，用户/密码均为 `postgres`，本地关闭 SSL。容器内部连接 `game-db:5432`。
- 门户 PostgreSQL：独立的本地测试库；源码默认 `localhost:5432/main_page_db`，以门户的 `DATABASE_URL` 为准。游戏数据库不能替代门户数据库。

游戏后端源码默认端口是 **3000**，与门户前端冲突；直接运行必须设置 `PORT=3001`。Vite 默认使用 5173，但端口被占用时可能自动换端口；直接启动时加 `--strictPort`，避免实际 origin 与 CORS/门户入口不一致。

以下 env 块是需要合并到相应文件的配置片段，不要覆盖已有文件。尖括号中的值必须替换。不要将本地 env 或密钥提交到仓库；前端环境变量只放公开 URL。dotenv 默认不覆盖已有进程环境变量，若修改文件无效，也要检查启动终端中已有的环境变量。

## 1. 配置门户

`Main_Page/frontend/main_page/.env.local`：

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_CHESSMATER_URL=http://localhost:5173/
```

`NEXT_PUBLIC_API_BASE_URL` 优先于旧变量 `NEXT_PUBLIC_API_URL`；不要让旧配置把请求指向线上。API base 不带末尾 `/api`。

`Main_Page/backend/api/.env`：

```dotenv
DATABASE_URL=postgresql://postgres:<local-db-password>@localhost:5432/main_page_db
SECRET_KEY=<local-portal-account-signing-secret>
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
ACCESS_TOKEN_COOKIE_NAME=access_token
ACCESS_TOKEN_COOKIE_DOMAIN=
ACCESS_TOKEN_COOKIE_SAMESITE=lax
ACCESS_TOKEN_COOKIE_SECURE=false
CHESSMATER_JWT_SECRET=<same-local-game-secret-on-both-backends>
CHESSMATER_JWT_ALG=HS256
CHESSMATER_JWT_AUD=chessmater
CHESSMATER_JWT_ISS=main-portal
CHESSMATER_TOKEN_EXPIRE_SECONDS=300
CHESSMATER_API_URL=http://localhost:3001
```

门户账户的 `SECRET_KEY` 与游戏的 `CHESSMATER_JWT_SECRET` 用途不同，不要共享。游戏签名密钥在两个后端必须相同，不能使用 `CHESSMATER` 或 `change-this-*` 占位值。可用以下命令分别生成本地密钥，再手动填入正确位置：

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`CHESSMATER_API_URL` 指向本地游戏 API，供门户排行榜/成就适配器调用；游戏后端的 `PORTAL_API_URL` 则是反方向地址。不要只改浏览器 URL 而让后端仍回退访问线上。

先准备好独立的门户 PostgreSQL 测试库和测试账号。从 `backend/api` 启动，确保 dotenv 能找到此处的 `.env`。优先使用项目现有 Python 虚拟环境；首次准备环境时运行：

```powershell
Set-Location D:\DeepBrainTech\Main_Page\backend\api
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

启动门户 API：

```powershell
Set-Location D:\DeepBrainTech\Main_Page\backend\api
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

这里绑定 `0.0.0.0` 是为了允许游戏 Docker 容器通过宿主机地址连接；浏览器仍访问 `localhost`。查看启动日志，确认数据库初始化成功；`/api/health` 返回成功本身不证明数据库可用。

另开终端启动门户前端（首次运行先 `npm ci`）：

```powershell
Set-Location D:\DeepBrainTech\Main_Page\frontend\main_page
npm run dev -- --port 3000
```

## 2. 启动游戏：选择一种方式

### A. 使用现有 Docker 开发配置

需要 Docker Desktop 的 Linux containers。游戏的 `docker-compose.dev.yml` 只启动游戏前端、API 和数据库，不启动门户。不要与生产 `docker-compose.yml` 合并运行。

合并到 `ChessMater/.env`：

```dotenv
LOCAL_CHESSMATER_JWT_SECRET=<same-local-game-secret-on-both-backends>
LOCAL_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PORTAL_URL=http://localhost:3000
PORTAL_API_URL=http://localhost:8000
PORTAL_INTERNAL_API_URL=http://host.docker.internal:8000
```

`LOCAL_CHESSMATER_JWT_SECRET` 优先于根目录 `CHESSMATER_JWT_SECRET`。`PORTAL_API_URL` 给浏览器使用；`PORTAL_INTERNAL_API_URL` 给容器内游戏 API 使用。容器中的 `localhost` 指容器自身，不能填 `http://localhost:8000` 作为宿主机门户地址。上述 `host.docker.internal` 按 Docker Desktop 配置；其他 Docker 环境需单独确认宿主机可达地址。

```powershell
Set-Location D:\DeepBrainTech\ChessMater
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f game-web game-api
```

开发 Compose 固定注入 API 端口 3001、前端 API 地址以及数据库连接；它不会自动转发 `backend/.env` 或根目录里的所有变量。当前配置没有显式转发独立的会话/奖励密钥，后端使用游戏登录密钥回退。如需独立密钥，需明确增加相应 service environment 配置并同步门户奖励密钥。

修改 Compose 注入的环境变量后重新执行 `up -d --build`，仅 `restart` 不会更新容器配置。停止时保留游戏数据库卷：

```powershell
docker compose -f docker-compose.dev.yml down
```

### B. 宿主机直接运行 npm

需要独立的本地 PostgreSQL 游戏库。可以仅启动现有游戏数据库容器，然后用本地 Node 进程连接：

```powershell
Set-Location D:\DeepBrainTech\ChessMater
docker compose -f docker-compose.dev.yml up -d game-db
```

Compose 解析配置仍需要根目录配置游戏签名密钥。不要同时启动 Docker 的 game-api/game-web 和相同端口的本地进程。

合并到 `ChessMater/backend/.env`：

```dotenv
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/chessmater
DATABASE_SSL=false
ALLOWED_ORIGINS=http://localhost:5173
PORTAL_API_URL=http://localhost:8000
CHESSMATER_JWT_SECRET=<same-local-game-secret-on-both-backends>
CHESSMATER_JWT_ALG=HS256
CHESSMATER_JWT_AUD=chessmater
CHESSMATER_JWT_ISS=main-portal
CHESSMATER_SESSION_JWT_SECRET=<separate-local-game-session-secret>
```

如需独立奖励密钥，在门户与游戏后端同时设置相同的 `CHESSMATER_REWARD_SECRET`；否则两端均留空，使用各自一致的游戏登录密钥回退。

从游戏 backend 目录运行，dotenv 才会读取 `backend/.env`，而不是游戏根目录 `.env`（首次运行先 `npm ci`）：

```powershell
Set-Location D:\DeepBrainTech\ChessMater\backend
npm start
```

游戏启动会创建基础表并执行明确列出的启动迁移。确认日志无数据库/唯一索引/迁移错误，不要为了本地启动批量执行历史 SQL 或账号库存迁移脚本。

合并到 `ChessMater/.env.local`：

```dotenv
VITE_API_BASE_URL=http://localhost:3001
VITE_PORTAL_API_BASE_URL=http://localhost:8000
VITE_PORTAL_URL=http://localhost:3000
```

直接运行 Vite 会读取根目录 env；`VITE_PORTAL_*` 优先于兼容变量 `PORTAL_API_URL` / `PORTAL_URL`。另开终端启动（首次运行先 `npm ci`）：

```powershell
Set-Location D:\DeepBrainTech\ChessMater
npm run dev -- --port 5173 --strictPort
```

## 3. 浏览器联调验收

1. 检查 `http://localhost:8000/api/health` 和 `http://localhost:3001/health`，并确认两端数据库启动日志正常。
2. 打开 `http://localhost:3000/zh/login`，使用本地门户测试账号登录。浏览器应保存门户 HttpOnly `access_token` Cookie。
3. 从门户 Brain Games 进入「自由落体国际象棋」，确认目标为 `http://localhost:5173/`。Network 中门户 `POST /api/games/chessmater/token` 应成功，随后游戏 `POST http://localhost:3001/api/auth/verify` 通过 Bearer 凭证换取 HttpOnly `cm_session`。
4. 验证后的游戏用户 `portal_user_id` 应对应门户账户的数字 ID。URL 中 token 应被移除，不要复制含 token 的启动 URL 或把凭证写入日志。
5. 刷新游戏，确认通过门户 `GET /api/games/chessmater/session` 获取新 token 并再次验证，不额外调用 `/token` 记录启动。检查 `GET /api/auth/me` 的游戏会话恢复行为，不能把本地会话回退视为门户即时注销/封禁同步。
6. 切换门户测试账号后重新进入游戏，确认进度和库存归属正确。仅在独立测试库中按需验证首通奖励、购买/发货及重试，具体见 [acceptance](acceptance.md)。

Cookie 不按端口隔离，因此 `access_token` 与 `cm_session` 必须保持不同名称。这里四个服务都使用相同协议和 hostname，属于同站点的不同 origin，适用本地 `SameSite=lax`、`Secure=false`、空 Domain；跨 origin 请求仍必须 `credentials: 'include'` 并通过精确 CORS 白名单。游戏后端对 localhost HTTP 自动使用非 Secure 的 lax Cookie。不要把这组 HTTP Cookie 设置复制到 HTTPS 生产环境。

## 常见故障

- **端口占用/页面到了错误服务**：检查实际监听进程；游戏后端必须是 3001，门户前端是 3000。换端口时同时更新入口 URL、浏览器 API URL、两端 CORS 和服务间 API URL。
- **CORS blocked / OPTIONS 失败**：门户 `CORS_ORIGINS` 要包含游戏前端 `http://localhost:5173`；游戏 `ALLOWED_ORIGINS` 也要包含实际游戏前端 origin。不是填写 API 地址，也不能附路径或末尾斜杠。
- **门户登录后游戏仍 401**：检查是否混用了 `127.0.0.1` 与 `localhost`、Cookie Domain 是否还指向生产域名、是否残留 Secure Cookie，以及请求是否携带 credentials。修改 Cookie 配置后清理旧 Cookie 并重新登录。
- **invalid signature / game_signing_not_configured**：核对两个后端的实际游戏密钥、算法、issuer、audience 和所加载 env；重启后端后重新从门户启动，不复用过期的 300 秒 token。
- **数据库 SSL/连接失败**：Docker 本地游戏库用宿主机 5433，游戏容器内部用 `game-db:5432`；本地游戏 Node 后端需 `DATABASE_SSL=false`。门户有自己的数据库连接，两个库不共享表。
- **浏览器登录正常但奖励、头像或排行榜失败**：检查游戏后端 `PORTAL_API_URL` 与门户 `CHESSMATER_API_URL`；Docker 游戏 API 应通过 `host.docker.internal:8000` 访问宿主机门户，不能使用容器自己的 localhost。同时核对奖励凭证配置。
- **改 env 后未生效/仍访问线上**：重启 Next/Vite 和直接运行的后端；Docker 环境变量变化要重建/重建容器。核对 env 优先级及浏览器实际 Network 地址，不只看配置文件。

交付时记录四个实际 origin、数据库目标（不含密码）、配置文件位置、启动方式和已执行结果。文档/静态检查通过不等于浏览器联调通过；未启动服务或缺少配置时明确列出未验证项。
