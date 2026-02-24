# CLAUDE.md

## 项目概述

**棋牌计分平台** - 实时多人在线棋牌游戏计分系统，支持十三水等游戏。

## 技术栈

- **后端**: Fastify + Socket.io + Better-SQLite3
- **前端**: Vanilla JavaScript + Vite + Socket.io Client
- **数据库**: SQLite
- **部署**: docker-compose

## 开发命令

```bash
# 后端开发
cd server
npm install
npm run setup-db  # 初始化数据库
npm run dev       # 启动开发服务器

# 前端开发
cd client
npm install
npm run dev       # 启动开发服务器
```

## 项目结构

- `server/` - 后端服务（Fastify + Socket.io）
- `client/` - 前端应用（Vanilla JS + Vite）
- `docs/` - 文档（API文档、部署指南）
- `scripts/` - 部署脚本

## 核心功能

1. 房间管理（创建、加入、分享）
2. 实时积分同步（Socket.io）
3. 积分验证（总和必须为0）
4. 统计功能（总分、历史记录）

## 需求说明

### 游戏类型

支持 9 种预置游戏 + 自定义游戏：

| 游戏 | 人数 | 积分验证 | 积分范围 |
|------|------|----------|----------|
| 十三水 🃏 | 4人 | 总和=0 | -100~100 |
| 德州扑克 ♠️ | 2-10人 | 无 | -10000~10000 |
| 五十K 🎴 | 3-4人 | 无 | -500~500 |
| 3带2 🎲 | 3-6人 | 无 | -200~200 |
| 跑得快 🏃 | 3-4人 | 无 | -100~100 |
| 炸金花 💥 | 2-6人 | 无 | -500~500 |
| 牛牛 🐂 | 2-10人 | 无 | -1000~1000 |
| 麻将 🀄 | 4人 | 总和=0 | -500~500 |
| 牌九 🎰 | 2-8人 | 无 | -1000~1000 |

自定义游戏可配置：名称、图标、人数范围、积分验证规则、积分范围、游戏说明。

### 房间

**创建参数：**
- `gameTypeId` 游戏类型（必填）
- `creatorName` 创建者名称（必填）
- `password` 房间密码（可选，bcrypt 加密）
- `customMaxPlayers` 自定义最大人数（可选）
- `allowOverflow` 是否允许超出人数上限（默认 false）
- `userGlobalId` 用户全局ID，用于跨设备识别（可选）

**状态流转：** `waiting` → `active`（开始游戏，至少2人）→ `finished`

**加入规则：** 6位房间码加入；密码房间需验证；同一 `userGlobalId` 重新加入自动恢复身份；不允许同名玩家（同一用户除外）。

### 玩家角色

- **创建者**：提交积分、踢出玩家、删除局次
- **普通玩家**：只读，实时同步房主输入内容

### 积分规则

- `validation_type`：`none`（无验证）/ `sum_equals`（总和等于 `validation_value`）/ `custom`（预留）
- 每个玩家积分必须在游戏类型定义的 `score_range_min ~ score_range_max` 范围内
- 验证失败时拒绝提交并通过 Socket.io 返回错误
- 提交成功后自动更新玩家统计（总分、局数、胜局、最高/最低分、平均分）
- 房主可删除任意局次，统计自动回滚重算

### Socket.io 事件

**客户端 → 服务器：**

| 事件 | 说明 |
|------|------|
| `join-room` | 加入房间（roomCode, playerId, password） |
| `leave-room` | 离开房间 |
| `start-game` | 开始游戏（房主） |
| `submit-round-scores` | 提交本局积分 |
| `score-input-change` | 实时积分输入同步（300ms 防抖） |
| `update-player-name` | 更新玩家名称 |
| `kick-player` | 踢出玩家（房主） |
| `delete-round` | 删除局次（房主） |

**服务器 → 客户端：**

| 事件 | 说明 |
|------|------|
| `room-updated` | 房间信息更新 |
| `player-joined` / `player-left` / `player-kicked` | 玩家变动 |
| `game-started` | 游戏开始 |
| `scores-submitted` | 积分提交成功 |
| `score-input-updated` | 实时积分输入广播 |
| `score-validation-error` | 积分验证失败 |
| `stats-updated` | 统计更新 |
| `round-deleted` | 局次删除 |
| `error` | 错误消息 |

### API 路由

```
GET    /api/health
GET    /api/game-types          # 获取游戏类型列表（?includeCustom=true）
GET    /api/game-types/:id
POST   /api/game-types          # 创建自定义游戏类型

POST   /rooms                   # 创建房间
GET    /rooms/:code             # 获取房间信息
POST   /rooms/:code/verify-password
GET    /rooms/:code/players
POST   /rooms/:code/players     # 加入房间
PATCH  /rooms/:code/players/:playerId
DELETE /rooms/:code/players/:playerId
GET    /rooms/:code/rounds
POST   /rooms/:code/rounds      # 提交本局积分
GET    /rooms/:code/stats
```

## 重要文件

- `server/src/index.js` - 后端入口
- `server/src/services/scoreService.js` - 积分验证核心逻辑
- `client/src/main.js` - 前端入口
- `client/src/js/components/RoundInput.js` - 积分输入组件

## 镜像仓库

私有 Registry：`8.133.3.7:5000`

| 服务 | 镜像 | 当前版本 |
|------|------|----------|
| 后端 | `8.133.3.7:5000/card-game-scorer/server` | `1.0.2` |
| 前端 | `8.133.3.7:5000/card-game-scorer/client` | `1.0.0` |

构建并推送：

```bash
docker build -t 8.133.3.7:5000/card-game-scorer/server:x.x.x ./server
docker push 8.133.3.7:5000/card-game-scorer/server:x.x.x

docker build -t 8.133.3.7:5000/card-game-scorer/client:x.x.x ./client
docker push 8.133.3.7:5000/card-game-scorer/client:x.x.x
```

## 部署

使用 `docker-compose.yml`，client 依赖 server healthcheck 通过后才启动。

```bash
# 首次部署
docker compose up -d

# 更新镜像后重新部署
docker compose pull
docker compose up -d

# 清除数据重新部署
docker compose down -v
docker compose up -d
```

访问地址：`http://<服务器IP>:8081`

## 数据持久化

| Volume | 容器路径 | 说明 |
|--------|----------|------|
| `db-data` | `/app/data` | SQLite 数据库文件 |
| `server-logs` | `/app/logs` | 服务端日志 |

数据库文件路径由环境变量 `DB_PATH` 控制，默认 `/app/data/card-game.db`。

## 数据库初始化

容器启动时自动执行 `database/init.js`，依次运行：

1. `database/schema.sql` - 基础表结构
2. `database/migrations/001_add_game_types.sql` - 游戏类型表及预置数据
3. `database/migrations/002_add_room_enhancements.sql` - 房间扩展字段
4. `database/migrations/003_add_user_global_id.sql` - 用户全局ID

migration 已做幂等处理，重复执行安全。

## 注意事项

- `/app/database` 目录存放 SQL 文件，**不可被 volume 挂载覆盖**，否则 init 失败
- SQLite 单实例运行，docker-compose 中 server 只启动一个副本
- 积分验证在服务端进行，确保数据一致性
- 所有 UI 文本使用中文
