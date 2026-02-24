# 棋牌计分平台 - 宝塔部署指南

## 环境要求

- Node.js 18+
- PM2
- Nginx
- 宝塔面板 7.x+

## 部署步骤

### 1. 上传代码

将项目代码上传到服务器：

```bash
# 使用SCP上传
scp -r card-game-scorer/ root@your-server:/www/wwwroot/

# 或使用宝塔面板的文件管理器上传
```

### 2. 安装依赖

```bash
cd /www/wwwroot/card-game-scorer

# 安装后端依赖
cd server
npm install --production

# 安装前端依赖
cd ../client
npm install
```

### 3. 配置环境变量

创建后端环境配置文件：

```bash
cd /www/wwwroot/card-game-scorer/server
cp .env.example .env
```

编辑 `.env` 文件：

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CLIENT_URL=https://yourdomain.com
```

### 4. 初始化数据库

```bash
cd /www/wwwroot/card-game-scorer/server
npm run setup-db
```

### 5. 构建前端

```bash
cd /www/wwwroot/card-game-scorer/client
npm run build
```

构建完成后，`dist` 目录包含所有前端文件。

### 6. 配置Nginx

在宝塔面板中创建网站，配置Nginx：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态文件
    location / {
        root /www/wwwroot/card-game-scorer/client/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket代理
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

### 7. 启动后端服务

使用PM2启动后端服务：

```bash
cd /www/wwwroot/card-game-scorer/server

# 安装PM2（如果未安装）
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置PM2开机自启
pm2 startup
```

### 8. 验证部署

检查服务状态：

```bash
# 查看PM2进程
pm2 status

# 查看日志
pm2 logs card-game-scorer

# 测试API
curl http://localhost:3000/api/health
```

访问网站：

```
http://yourdomain.com
```

## 使用自动部署脚本

项目提供了自动部署脚本：

```bash
cd /www/wwwroot/card-game-scorer
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

脚本会自动执行：
1. 备份当前版本
2. 安装依赖
3. 初始化数据库
4. 构建前端
5. 重启PM2服务
6. 健康检查

## 常见问题

### 1. PM2进程无法启动

检查日志：
```bash
pm2 logs card-game-scorer --lines 100
```

常见原因：
- 端口被占用（修改 `.env` 中的 `PORT`）
- 数据库文件权限问题（确保 `database/` 目录可写）
- Node.js版本过低（需要18+）

### 2. WebSocket连接失败

检查Nginx配置：
- 确保 `/socket.io` 路径正确代理
- 确保 `proxy_set_header Upgrade` 和 `Connection` 配置正确
- 检查防火墙是否开放端口

### 3. 前端无法访问API

检查：
- Nginx配置中 `/api` 代理是否正确
- 后端服务是否正常运行（`pm2 status`）
- 浏览器控制台是否有CORS错误

### 4. 数据库文件丢失

数据库文件位置：`/www/wwwroot/card-game-scorer/server/database/card-game.db`

备份数据库：
```bash
cp /www/wwwroot/card-game-scorer/server/database/card-game.db /www/backup/
```

恢复数据库：
```bash
cp /www/backup/card-game.db /www/wwwroot/card-game-scorer/server/database/
```

## 维护命令

```bash
# 重启服务
pm2 restart card-game-scorer

# 停止服务
pm2 stop card-game-scorer

# 查看日志
pm2 logs card-game-scorer

# 查看实时日志
pm2 logs card-game-scorer --lines 100 -f

# 清空日志
pm2 flush

# 监控资源使用
pm2 monit
```

## 性能优化

### 1. 启用Nginx缓存

在Nginx配置中添加：

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. 启用Gzip压缩

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

### 3. 数据库优化

定期清理旧数据：

```sql
-- 删除30天前的已完成房间
DELETE FROM rooms WHERE status = 'finished' AND finished_at < strftime('%s', 'now', '-30 days') * 1000;
```

## 安全建议

1. 配置HTTPS（使用宝塔面板的SSL证书功能）
2. 限制API访问频率（使用Nginx rate limiting）
3. 定期备份数据库
4. 更新Node.js和依赖包
5. 配置防火墙规则

## 监控和日志

### 日志位置

- PM2日志：`/root/.pm2/logs/`
- Nginx日志：`/www/wwwlogs/`
- 应用日志：`/www/wwwroot/card-game-scorer/server/logs/`

### 监控指标

使用PM2监控：
```bash
pm2 monit
```

关注指标：
- CPU使用率
- 内存使用率
- 重启次数
- 响应时间

## 更新部署

更新代码后重新部署：

```bash
cd /www/wwwroot/card-game-scorer
git pull  # 如果使用Git
./scripts/deploy.sh
```

## 回滚

如果部署出现问题，可以回滚到备份版本：

```bash
# 查看备份
ls /www/backup/card-game-scorer/

# 回滚
cp -r /www/backup/card-game-scorer/backup-YYYYMMDD-HHMMSS/* /www/wwwroot/card-game-scorer/

# 重启服务
pm2 restart card-game-scorer
```
