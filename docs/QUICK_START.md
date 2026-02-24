# 快速开始指南

## 5分钟快速启动

### 前置要求

- Node.js 18+ 已安装
- npm 已安装

### 步骤1: 安装依赖

打开两个终端窗口。

**终端1 - 后端:**
```bash
cd card-game-scorer/server
npm install
```

**终端2 - 前端:**
```bash
cd card-game-scorer/client
npm install
```

### 步骤2: 初始化数据库

在终端1（后端）中运行：
```bash
npm run setup-db
```

你应该看到：
```
数据库初始化完成
数据库路径: /path/to/card-game-scorer/server/database/card-game.db
```

### 步骤3: 启动服务

**终端1 - 启动后端:**
```bash
npm run dev
```

你应该看到：
```
[INFO] 2026-02-16T... - 服务器启动成功
[INFO] 2026-02-16T... - HTTP服务: http://0.0.0.0:3000
[INFO] 2026-02-16T... - WebSocket服务已启动
```

**终端2 - 启动前端:**
```bash
npm run dev
```

你应该看到：
```
  VITE v5.1.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 步骤4: 访问应用

打开浏览器访问：**http://localhost:5173**

## 测试流程

### 创建房间

1. 点击"创建房间"
2. 输入名称："玩家1"
3. 点击"创建房间"按钮
4. 记下房间码（如：ABC123）

### 加入房间（使用另一个浏览器或隐身窗口）

1. 打开新的浏览器窗口（或隐身模式）
2. 访问 http://localhost:5173
3. 点击"加入已有房间"
4. 输入房间码和名称："玩家2"
5. 点击"加入房间"

### 重复加入（需要4名玩家）

重复上述步骤，添加"玩家3"和"玩家4"

### 开始游戏

1. 在房主（玩家1）的窗口中
2. 点击"开始游戏"按钮
3. 所有玩家窗口自动刷新，显示积分输入界面

### 记录积分

1. 在任意玩家窗口中输入积分：
   - 玩家1: +3
   - 玩家2: -1
   - 玩家3: -1
   - 玩家4: -1
2. 观察"总和"显示为0，状态为"✓ 有效"
3. 点击"提交积分"
4. 所有窗口实时更新积分榜和历史记录

### 查看统计

在任意窗口中查看：
- **积分榜**: 显示所有玩家的总分、局数、胜局等
- **历史记录**: 显示每局的详细积分

## 常见问题

### Q: 后端启动失败？

**A:** 检查端口3000是否被占用：
```bash
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000
```

如果被占用，修改 `server/.env` 中的 `PORT` 值。

### Q: 前端无法连接后端？

**A:** 确保：
1. 后端服务正在运行（终端1）
2. 浏览器控制台没有CORS错误
3. 检查 `client/vite.config.js` 中的代理配置

### Q: Socket.io连接失败？

**A:** 检查浏览器控制台，应该看到：
```
Socket连接成功
```

如果看到错误，确保后端服务正常运行。

### Q: 数据库文件在哪里？

**A:** 数据库文件位于：
```
card-game-scorer/server/database/card-game.db
```

### Q: 如何清空所有数据？

**A:** 删除数据库文件并重新初始化：
```bash
cd card-game-scorer/server
rm database/card-game.db
npm run setup-db
```

## 下一步

- 阅读 [README.md](../README.md) 了解完整功能
- 查看 [API.md](API.md) 了解API详情
- 参考 [DEPLOYMENT.md](DEPLOYMENT.md) 部署到生产环境

## 需要帮助？

如果遇到问题：
1. 检查终端输出的错误信息
2. 查看浏览器控制台
3. 检查 `server/logs/` 目录中的日志文件
4. 参考文档中的"常见问题"部分
