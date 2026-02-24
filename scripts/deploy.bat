@echo off
chcp 65001 >nul
echo ==========================================
echo 棋牌计分平台 - 宝塔部署脚本
echo ==========================================
echo.

REM 1. 清理旧的部署文件
echo [1/6] 清理旧的部署文件...
if exist deploy rmdir /s /q deploy
mkdir deploy

REM 2. 构建前端
echo [2/6] 构建前端...
cd client
call npm run build
cd ..

REM 3. 复制前端构建文件
echo [3/6] 复制前端构建文件...
mkdir deploy\public
xcopy /E /I /Y client\dist\* deploy\public\

REM 4. 复制后端文件
echo [4/6] 复制后端文件...
mkdir deploy\server

REM 复制源代码
xcopy /E /I /Y server\src deploy\server\src\
xcopy /E /I /Y server\database deploy\server\database\

REM 复制配置文件
copy /Y server\package.json deploy\server\
copy /Y server\.env.example deploy\server\.env

REM 5. 创建启动脚本
echo [5/6] 创建启动脚本...

REM 创建PM2配置文件
(
echo module.exports = {
echo   apps: [{
echo     name: 'card-game-scorer',
echo     script: './server/src/index.js',
echo     instances: 1,
echo     exec_mode: 'fork',
echo     autorestart: true,
echo     watch: false,
echo     max_memory_restart: '500M',
echo     env: {
echo       NODE_ENV: 'production',
echo       PORT: 3000
echo     },
echo     error_file: './logs/error.log',
echo     out_file: './logs/out.log',
echo     log_date_format: 'YYYY-MM-DD HH:mm:ss',
echo     merge_logs: true
echo   }]
echo };
) > deploy\ecosystem.config.cjs

REM 创建安装脚本
(
echo @echo off
echo echo ==========================================
echo echo 安装依赖...
echo echo ==========================================
echo.
echo cd server
echo call npm install --production
echo cd ..
echo.
echo echo 初始化数据库...
echo cd server
echo call npm run setup-db
echo cd ..
echo.
echo echo ==========================================
echo echo 安装完成！
echo echo ==========================================
echo echo.
echo echo 下一步：
echo echo 1. 编辑 server\.env 文件，配置环境变量
echo echo 2. 运行: pm2 start ecosystem.config.cjs
echo echo 3. 运行: pm2 save
echo echo 4. 运行: pm2 startup
echo echo.
) > deploy\install.bat

REM 6. 打包
echo [6/6] 打包部署文件...
cd deploy
tar -czf ..\card-game-scorer-deploy.tar.gz .
cd ..

echo.
echo ==========================================
echo 部署包创建成功！
echo ==========================================
echo.
echo 部署包位置: card-game-scorer-deploy.tar.gz
echo.
echo 下一步：
echo 1. 将 card-game-scorer-deploy.tar.gz 上传到服务器
echo 2. 解压: tar -xzf card-game-scorer-deploy.tar.gz
echo 3. 运行: bash install.sh
echo 4. 配置 server/.env 文件
echo 5. 启动: pm2 start ecosystem.config.cjs
echo.
pause
