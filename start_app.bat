@echo off
chcp 65001 >nul
setlocal

:: 切换到脚本所在目录
cd /d "%~dp0"

echo ==========================================
echo       正在启动 共合设设计师选品平台...
echo ==========================================

:: 检查 node_modules 是否存在，不存在则安装
if not exist "node_modules" (
    echo [系统] 检测到首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络或 Node.js 环境。
        pause
        exit /b
    )
)

:: 尝试自动打开浏览器 (等待 3 秒给服务器启动时间)
echo [系统] 准备打开浏览器...
timeout /t 3 >nul
start http://localhost:5173

:: 启动开发服务器
echo [系统] 启动 Vite 开发服务器 (已开启局域网访问)...
echo [提示] 请在下方控制台查看 "Network"开头的网址，如 http://192.168.x.x:5173
call npm run dev

pause
