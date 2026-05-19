#!/bin/bash
# راه‌اندازی سریع اسم فامیل چندنفره

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        🎯  اسم فامیل — راه‌اندازی           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌  Node.js پیدا نشد."
    echo "   از https://nodejs.org نصب کن و دوباره امتحان کن."
    exit 1
fi

NODE_VER=$(node -v)
echo "✅  Node.js $NODE_VER پیدا شد"

# Install ws if needed
if [ ! -d "node_modules/ws" ]; then
    echo "📦  در حال نصب ws..."
    npm install ws
fi

echo "🚀  سرور رو شروع میکنیم..."
echo ""
node server.js
