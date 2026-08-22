#!/bin/bash
# 백엔드 코드를 ruff로 린트한다 (파일을 고치지 않고 문제만 보고).

set -e

cd "$(dirname "$0")/.."

echo "==> ruff check (backend)"
cd backend
uv run ruff check .
