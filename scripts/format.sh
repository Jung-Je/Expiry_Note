#!/bin/bash
# 백엔드 코드를 ruff로 포맷팅한다 (파일을 직접 고친다).

set -e

cd "$(dirname "$0")/.."

echo "==> ruff format (backend)"
cd backend
uv run ruff format .
