#!/bin/bash
# 백엔드 테스트 + 커버리지. check-all.sh에는 포함되지 않으며, 로컬에서 직접
# 돌리거나 CI(.github/workflows/ci.yml)에서 실행한다.

set -e

cd "$(dirname "$0")/.."

echo "==> pytest --cov (backend)"
cd backend
uv run pytest --cov --cov-report=term-missing
