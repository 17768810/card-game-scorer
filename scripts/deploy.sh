#!/bin/bash

# 棋牌计分平台 - 宝塔部署脚本
# 使用方法: bash deploy.sh

set -e

echo "=========================================="
echo "棋牌计分平台 - 宝塔部署脚本"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 清理旧的部署文件
echo -e "${YELLOW}[1/6] 清理旧的部署文件...${NC}"
rm -rf deploy
mkdir -p deploy

# 2. 构建前端
echo -e "${YELLOW}[2/6] 构建前端...${NC}"
cd client
npm run build
cd ..

# 3. 复制前端构建文件
echo -e "${YELLOW}[3/6] 复制前端构建文件...${NC}"
mkdir -p deploy/public
cp -r client/dist/* deploy/public/

# 4. 复制后端文件
echo -e "${YELLOW}[4/6] 复制后端文件...${NC}"
mkdir -p deploy/server

# 复制源代码
cp -r server/src deploy/server/
cp -r server/database deploy/server/

# 复制配置文件
cp server/package.json deploy/server/
cp server/.env.example deploy/server/.env

# 5. 创建启动脚本
echo -e "${YELLOW}[5/6] 创建启动脚本...${NC}"

# 创建PM2配置文件
cat > deploy/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'card-game-scorer',
    script: './server/src/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
EOF

# 创建安装脚本
cat > deploy/install.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "安装依赖..."
echo "=========================================="

# 安装后端依赖
cd server
npm install --production
cd ..

# 初始化数据库
echo "初始化数据库..."
cd server
npm run setup-db
cd ..

echo "=========================================="
echo "安装完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 编辑 server/.env 文件，配置环境变量"
echo "2. 运行: pm2 start ecosystem.config.cjs"
echo "3. 运行: pm2 save"
echo "4. 运行: pm2 startup"
echo ""
EOF

chmod +x deploy/install.sh

# 6. 打包
echo -e "${YELLOW}[6/6] 打包部署文件...${NC}"
cd deploy
tar -czf ../card-game-scorer-deploy.tar.gz .
cd ..

echo -e "${GREEN}=========================================="
echo "部署包创建成功！"
echo "==========================================${NC}"
echo ""
echo "部署包位置: card-game-scorer-deploy.tar.gz"
echo "部署包大小: $(du -h card-game-scorer-deploy.tar.gz | cut -f1)"
echo ""
