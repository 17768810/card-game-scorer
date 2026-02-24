@echo off
REM Build and push images to private registry
REM Usage: scripts\docker-build-push.bat [tag]
setlocal enabledelayedexpansion

REM 启用错误退出（类似 bash 的 set -e）
set "ERRORLEVEL=0"

REM 设置默认参数
set "REGISTRY=8.133.3.7:5000"
set "PROJECT=card-game-scorer"
set "TAG=1.0.2"

REM 如果传入了标签参数，覆盖默认值
if not "%~1"=="" set "TAG=%~1"

REM 拼接镜像名称
set "SERVER_IMAGE=%REGISTRY%/%PROJECT%/server:%TAG%"
set "CLIENT_IMAGE=%REGISTRY%/%PROJECT%/client:%TAG%"

REM 获取脚本所在目录（适配 Windows 路径）
set "SCRIPT_DIR=%~dp0"
REM 去除路径末尾的反斜杠（避免拼接出错）
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
REM 获取项目根目录（脚本目录的上一级）
for %%i in ("%SCRIPT_DIR%\..") do set "ROOT_DIR=%%~fi"

echo ==^> Building server image: %SERVER_IMAGE%
docker build -t "%SERVER_IMAGE%" "%ROOT_DIR%\server"
if errorlevel 1 goto :error

echo ==^> Building client image: %CLIENT_IMAGE%
docker build -t "%CLIENT_IMAGE%" "%ROOT_DIR%\client"
if errorlevel 1 goto :error

echo ==^> Pushing %SERVER_IMAGE%
docker push "%SERVER_IMAGE%"
if errorlevel 1 goto :error

echo ==^> Pushing %CLIENT_IMAGE%
docker push "%CLIENT_IMAGE%"
if errorlevel 1 goto :error

echo ==^> Done. Images pushed to %REGISTRY%
endlocal
exit /b 0

:error
echo ERROR: 执行失败，请检查上述错误信息
endlocal
exit /b 1