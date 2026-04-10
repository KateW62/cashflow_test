#!/bin/bash

echo "🚀 启动 Electric Velocity - PC端现金流游戏"
echo "================================================"
echo ""

# 检查是否在正确的目录
target_dir="cashflow_test"
if [[ "$(basename "$PWD")" != "$target_dir" ]]; then
    if [ -d "$target_dir" ]; then
        cd "$target_dir"
        echo "✅ 进入项目目录: $target_dir"
    else
        echo "❌ 错误: 找不到 $target_dir 目录"
        exit 1
    fi
fi

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 检测到未安装依赖，正在安装..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

# 检查端口是否被占用
PORT=5173
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在终止占用进程..."
    lsof -ti:$PORT | xargs kill -9
    sleep 2
fi

echo ""
echo "🎮 启动开发服务器..."
echo "ℹ️  服务器将在 http://localhost:$PORT 运行"
echo "ℹ️  按 Ctrl + C 停止服务器"
echo "💡 在桌面端按 Ctrl + D 可切换桌面模式"
echo ""
echo "================================================"

# 启动开发服务器
npm run dev