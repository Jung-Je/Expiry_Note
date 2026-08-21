#!/bin/bash
# 커밋 전 전체 체크 스크립트

set -e

echo "🚀 커밋 전 체크 시작..."
echo ""

cd "$(dirname "$0")/.."

# 1. 코드 포맷팅
echo "1️⃣  코드 포맷팅"
bash scripts/format.sh
echo ""

# 2. 린트 체크
echo "2️⃣  린트 체크"
bash scripts/lint.sh
echo ""

# 3. Django 체크
echo "3️⃣  Django 체크"
cd backend
uv run python manage.py check
cd ..
echo ""

# 4. 프론트엔드 린트
echo "4️⃣  프론트엔드 린트"
cd frontend
npm run lint
cd ..
echo ""

echo "✨ 모든 체크 완료! 커밋할 준비가 되었습니다."
