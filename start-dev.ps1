# PowerShell script to start development servers
# 启动开发服务器的PowerShell脚本

Write-Host "正在启动开发服务器..." -ForegroundColor Cyan

# Start server
# 启动后端服务器
Set-Location "$PSScriptRoot\server"
$serverProcess = Start-Process npm -ArgumentList "run", "dev" -RedirectStandardOutput "server.log" -RedirectStandardError "server.log" -PassThru -WindowStyle Normal
Write-Host "服务器已启动，PID: $($serverProcess.Id)" -ForegroundColor Green

# Wait for server to start
# 等待服务器启动
Start-Sleep -Seconds 3

# Start client
# 启动前端客户端
Set-Location "$PSScriptRoot\client"
$clientProcess = Start-Process npm -ArgumentList "run", "dev" -RedirectStandardOutput "client.log" -RedirectStandardError "client.log" -PassThru -WindowStyle Normal
Write-Host "客户端已启动，PID: $($clientProcess.Id)" -ForegroundColor Green

# Wait for client to start
# 等待客户端启动
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "两个服务都在运行中" -ForegroundColor Yellow
Write-Host "服务器: http://localhost:3000" -ForegroundColor Cyan
Write-Host "客户端: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Yellow

# Wait for user interrupt and cleanup
# 等待用户中断并清理进程
try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($serverProcess.HasExited -or $clientProcess.HasExited) {
            Write-Host "检测到服务退出" -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "正在停止服务..." -ForegroundColor Yellow
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $clientProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "所有服务已停止" -ForegroundColor Green
}
