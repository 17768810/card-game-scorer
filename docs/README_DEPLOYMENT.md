# 棋牌计分平台 - 部署包使用说明

## 📦 部署包已生成

恭喜！部署包已成功创建，可以直接用于宝塔面板部署。

### 生成的文件

```
card-game-scorer/
├── card-game-scorer-deploy.tar.gz  # 部署包（58KB）⭐
├── DEPLOYMENT_GUIDE.md             # 快速部署指南（推荐先看）⭐
├── DEPLOYMENT_CHECKLIST.md         # 部署清单
├── DEPLOYMENT_SUMMARY.txt          # 部署总结
└── deploy/                         # 部署目录（已打包）
    ├── server/                     # 后端代码
    ├── public/                     # 前端静态文件
    ├── ecosystem.config.cjs        # PM2配置
    ├── install.sh                  # 安装脚本
    └── README.md                   # 详细文档
```

## 🚀 快速开始（3步）

### 1. 下载部署包

下载 `card-game-scorer-deploy.tar.gz` 文件（58KB）

### 2. 阅读部署指南

打开 `DEPLOYMENT_GUIDE.md` 查看详细的部署步骤（5分钟完成）

### 3. 上传并部署

按照指南上传到服务器并执行部署命令

## 📖 文档说明

### 🌟 推荐阅读顺序

1. **DEPLOYMENT_GUIDE.md** - 快速部署指南
   - 5分钟快速部署
   - 包含所有必要步骤
   - 适合快速上手

2. **deploy/README.md** - 详细部署文档
   - 完整的部署说明
   - 故障排查指南
   - 性能优化建议

3. **DEPLOYMENT_CHECKLIST.md** - 部署清单
   - 部署前检查项
   - 验证清单
   - 注意事项

4. **DEPLOYMENT_SUMMARY.txt** - 部署总结
   - 快速参考
   - 关键信息汇总

## 🎯 部署流程

```
上传部署包 → 解压 → 安装依赖 → 配置环境 → 启动服务 → 配置Nginx
   (1分钟)   (1分钟)   (1-2分钟)    (1分钟)    (1分钟)     (1分钟)
```

**总计**: 约5-7分钟

## 💡 重要提示

### ⚠️ 部署前必读

1. **服务器要求**
   - Node.js 18+
   - PM2 (全局安装)
   - Nginx
   - 宝塔面板（推荐）

2. **必须修改的配置**
   - `server/.env` 中的 `CLIENT_URL`（改为你的域名）

3. **端口要求**
   - 80/443: Nginx (HTTP/HTTPS)
   - 3000: 后端服务（内部，不对外开放）

### ✅ 部署成功标志

- PM2 显示服务状态为 "online"
- 访问域名能看到游戏大厅
- 能成功创建和加入房间
- 实时功能正常工作

## 🔧 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs card-game-scorer

# 重启服务
pm2 restart card-game-scorer

# 停止服务
pm2 stop card-game-scorer
```

## 📞 获取帮助

### 遇到问题？

1. 查看 `DEPLOYMENT_GUIDE.md` 中的故障排查部分
2. 检查 PM2 日志: `pm2 logs card-game-scorer`
3. 检查 Nginx 日志: `/var/log/nginx/error.log`
4. 查看 `deploy/README.md` 中的常见问题

### 日志位置

- PM2 日志: `logs/out.log` 和 `logs/error.log`
- Nginx 日志: `/var/log/nginx/`
- 应用日志: 在PM2日志中查看

## 🎉 开始部署

准备好了吗？打开 `DEPLOYMENT_GUIDE.md` 开始5分钟快速部署！

---

**版本**: 1.0.0
**更新时间**: 2026-02-18
**包含功能**: 用户全局ID、玩家名称验证、实时更新、移动端优化
