# 部署包清单

## ✅ 已生成文件

### 1. 部署包
- **文件**: `card-game-scorer-deploy.tar.gz`
- **大小**: 58KB
- **位置**: 项目根目录

### 2. 部署目录结构
```
deploy/
├── server/
│   ├── src/                 # 后端源代码
│   ├── database/            # 数据库文件和迁移脚本
│   ├── package.json         # 后端依赖配置
│   └── .env                 # 环境变量配置（需要修改）
├── public/                  # 前端静态文件
│   ├── index.html
│   └── assets/
├── ecosystem.config.cjs     # PM2配置文件
├── install.sh               # 安装脚本
└── README.md                # 详细部署文档
```

### 3. 文档
- `DEPLOYMENT_GUIDE.md` - 快速部署指南（5分钟部署）
- `deploy/README.md` - 详细部署文档

## 📋 部署前检查

### 服务器要求
- [ ] Node.js 18+ 已安装
- [ ] PM2 已安装 (`npm install -g pm2`)
- [ ] Nginx 已安装
- [ ] 宝塔面板已安装（可选，但推荐）

### 域名和端口
- [ ] 域名已解析到服务器
- [ ] 端口 80/443 已开放（HTTP/HTTPS）
- [ ] 端口 3000 未被占用（后端服务）

### 文件准备
- [ ] `card-game-scorer-deploy.tar.gz` 已下载
- [ ] 已准备好域名信息
- [ ] 已准备好SSL证书（可选）

## 🚀 部署步骤概览

1. **上传部署包** (1分钟)
   - 上传到 `/www/wwwroot/card-game-scorer`
   - 解压文件

2. **安装依赖** (1-2分钟)
   - 运行 `bash install.sh`
   - 等待安装完成

3. **配置环境** (1分钟)
   - 编辑 `server/.env`
   - 修改域名和端口

4. **启动服务** (1分钟)
   - 运行 `pm2 start ecosystem.config.cjs`
   - 保存配置 `pm2 save`

5. **配置Nginx** (1分钟)
   - 添加网站
   - 配置反向代理
   - 重载Nginx

6. **验证部署** (1分钟)
   - 访问域名
   - 测试功能

**总计**: 约5-7分钟

## 🔍 验证清单

### 前端验证
- [ ] 能访问首页
- [ ] 能看到游戏大厅
- [ ] 能创建房间
- [ ] 能加入房间
- [ ] 样式显示正常

### 后端验证
- [ ] PM2显示服务运行中
- [ ] API请求正常
- [ ] Socket.io连接正常
- [ ] 数据库读写正常

### 功能验证
- [ ] 创建房间成功
- [ ] 加入房间成功
- [ ] 开始游戏成功
- [ ] 输入积分成功
- [ ] 实时更新正常
- [ ] 积分榜显示正常
- [ ] 历史记录显示正常

## 📦 部署包内容

### 前端文件 (public/)
- index.html - 主页面
- assets/index-*.css - 样式文件
- assets/index-*.js - JavaScript文件

### 后端文件 (server/)
- src/ - 源代码
  - index.js - 入口文件
  - config/ - 配置文件
  - routes/ - 路由
  - services/ - 业务逻辑
  - sockets/ - Socket.io处理
  - utils/ - 工具函数
- database/ - 数据库
  - schema.sql - 数据库结构
  - migrations/ - 迁移脚本
  - init.js - 初始化脚本

### 配置文件
- ecosystem.config.cjs - PM2配置
- .env - 环境变量
- package.json - 依赖配置

## 🔧 环境变量说明

```env
# 服务器端口（默认3000）
PORT=3000

# 客户端URL（用于CORS，必须修改）
CLIENT_URL=http://your-domain.com

# 数据库路径（默认即可）
DB_PATH=./database/card-game.db

# 日志级别（info/debug/error）
LOG_LEVEL=info
```

## 📊 资源占用

### 预估资源
- **CPU**: 1核心
- **内存**: 256MB
- **磁盘**: 100MB
- **带宽**: 1Mbps

### 实际占用（运行中）
- **CPU**: < 5%
- **内存**: < 100MB
- **磁盘**: < 50MB

## 🔒 安全配置

### 必须配置
- [ ] 修改 CLIENT_URL 为实际域名
- [ ] 配置防火墙规则
- [ ] 设置文件权限

### 推荐配置
- [ ] 启用HTTPS（SSL证书）
- [ ] 配置Nginx访问限制
- [ ] 启用日志监控
- [ ] 设置自动备份

## 📝 注意事项

1. **数据库文件**: 
   - 位于 `server/database/card-game.db`
   - 需要定期备份
   - 确保有写权限

2. **日志文件**:
   - 位于 `logs/` 目录
   - 定期清理避免占用空间

3. **环境变量**:
   - `.env` 文件必须修改
   - 不要提交到版本控制

4. **PM2配置**:
   - 使用fork模式（SQLite不支持cluster）
   - 设置了自动重启
   - 配置了日志轮转

## 🎯 下一步

部署完成后：

1. **测试功能**: 创建房间、加入房间、输入积分
2. **配置SSL**: 启用HTTPS加密
3. **设置监控**: 配置服务器监控
4. **备份数据**: 设置自动备份计划
5. **性能优化**: 根据实际使用情况调整

## 📞 获取帮助

- 查看 `DEPLOYMENT_GUIDE.md` - 快速部署指南
- 查看 `deploy/README.md` - 详细部署文档
- 查看 PM2 日志: `pm2 logs card-game-scorer`
- 查看 Nginx 日志: `/var/log/nginx/error.log`

## ✨ 部署成功标志

当你看到以下内容时，说明部署成功：

1. PM2 显示服务状态为 "online"
2. 访问域名能看到游戏大厅
3. 能成功创建和加入房间
4. 实时功能正常工作

恭喜！🎉
