#!/bin/bash

# 验证项目结构和依赖

echo "========================================="
echo "棋牌计分平台 - 项目验证"
echo "========================================="

# 检查Node.js版本
echo ""
echo "检查Node.js版本..."
node_version=$(node -v)
echo "Node.js版本: $node_version"

if [[ "$node_version" < "v18" ]]; then
  echo "⚠️  警告: Node.js版本过低，建议使用18+版本"
else
  echo "✓ Node.js版本符合要求"
fi

# 检查项目结构
echo ""
echo "检查项目结构..."

required_dirs=(
  "server/src"
  "server/database"
  "client/src"
  "docs"
  "scripts"
)

for dir in "${required_dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "✓ $dir"
  else
    echo "✗ $dir 不存在"
  fi
done

# 检查关键文件
echo ""
echo "检查关键文件..."

required_files=(
  "server/package.json"
  "server/src/index.js"
  "server/database/schema.sql"
  "client/package.json"
  "client/src/index.html"
  "client/src/main.js"
  "README.md"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file 不存在"
  fi
done

echo ""
echo "========================================="
echo "验证完成"
echo "========================================="
echo ""
echo "下一步:"
echo "1. cd server && npm install"
echo "2. cd client && npm install"
echo "3. cd server && npm run dev"
echo "4. cd client && npm run dev (新终端)"
echo "5. 访问 http://localhost:5173"
