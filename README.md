# 棋牌计分平台

实时棋牌计分平台，支持多人在线同步积分。主要用于中国十三水等棋牌游戏的计分管理。

## 功能特性

- ✅ 房间创建与分享（生成6位房间码）
- ✅ 玩家管理（通过链接加入或手动添加）
- ✅ 实时积分同步（所有玩家实时看到积分变化）
- ✅ 积分校验（每局积分总和必须为0）
- ✅ 统计功能（总分、每局历史、玩家统计）
- ✅ 响应式设计（支持手机、平板、电脑）
- ✅ 纯中文界面

## 技术栈

### 后端
- **Fastify** - 高性能Node.js框架
- **Socket.io** - 实时双向通信
- **Better-SQLite3** - 同步SQLite数据库
- **PM2** - 进程管理

### 前端
- **Vanilla JavaScript** - 轻量级，无框架开销
- **Vite** - 现代化开发工具
- **Socket.io Client** - 实时通信客户端

### 数据库
- **SQLite** - 轻量级数据库

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 本地开发

1. 克隆项目

```bash
git clone <repository-url>
cd card-game-scorer
```

2. 安装后端依赖并启动

```bash
cd server
npm install
npm run setup-db  # 初始化数据库
npm run dev       # 启动开发服务器
```

3. 安装前端依赖并启动（新终端）

```bash
cd client
npm install
npm run dev       # 启动开发服务器
```

4. 访问应用

打开浏览器访问：http://localhost:5173

## 使用说明

### 创建房间

1. 点击"创建房间"
2. 输入您的名称
3. 选择游戏类型（默认：十三水）
4. 点击"创建房间"按钮
5. 系统生成6位房间码和分享链接

### 加入房间

方式1：通过分享链接
- 点击房主分享的链接
- 输入您的名称
- 自动加入房间

方式2：手动输入房间码
- 点击"加入已有房间"
- 输入6位房间码
- 输入您的名称
- 点击"加入房间"

### 开始游戏

1. 等待所有玩家加入（十三水需要4人）
2. 房主点击"开始游戏"按钮
3. 进入积分输入界面

### 记录积分

1. 每局结束后，任意玩家输入所有人的积分
2. 系统自动验证积分总和是否为0
3. 验证通过后点击"提交积分"
4. 所有玩家实时看到积分更新

### 查看统计

- **积分榜**：查看所有玩家的总分、局数、胜局等统计
- **历史记录**：查看每局的详细积分记录

## 游戏规则

### 十三水

- 玩家数量：4人
- 积分规则：每局积分总和必须为0
- 示例：玩家1 +3、玩家2 -1、玩家3 -1、玩家4 -1

## 项目结构

```
card-game-scorer/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── routes/         # API路由
│   │   ├── services/       # 业务逻辑
│   │   ├── sockets/        # Socket.io事件处理
│   │   └── utils/          # 工具函数
│   ├── database/           # 数据库文件
│   └── package.json
├── client/                 # 前端应用
│   ├── src/
│   │   ├── js/             # JavaScript模块
│   │   ├── styles/         # CSS样式
│   │   └── index.html      # 主HTML
│   └── package.json
├── docs/                   # 文档
├── scripts/                # 脚本
└── README.md
```

## API文档

详见 [API.md](docs/API.md)

## 部署指南

详见 [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 开发命令

### 后端

```bash
npm run dev        # 开发模式（热重载）
npm start          # 生产模式
npm run setup-db   # 初始化数据库
```

### 前端

```bash
npm run dev        # 开发服务器
npm run build      # 构建生产版本
npm run preview    # 预览构建结果
```

## 环境变量

### 后端 (server/.env)

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CLIENT_URL=http://localhost:5173
```

### 前端 (client/.env)

```env
VITE_API_URL=http://localhost:3000
```

## 常见问题

### 1. 数据库文件在哪里？

数据库文件位于 `server/database/card-game.db`

### 2. 如何备份数据？

复制数据库文件即可：
```bash
cp server/database/card-game.db backup/
```

### 3. 如何清空所有数据？

删除数据库文件并重新初始化：
```bash
rm server/database/card-game.db
npm run setup-db
```

### 4. WebSocket连接失败？

检查：
- 后端服务是否正常运行
- 防火墙是否开放端口
- Nginx配置是否正确（生产环境）

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交Issue。
