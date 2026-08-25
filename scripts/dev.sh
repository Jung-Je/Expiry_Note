#!/usr/bin/env bash
# 백엔드(Django runserver)와 프론트엔드(Vite) 개발 서버를 한 번에 띄운다.
# Ctrl+C 한 번이면 둘 다 같이 종료된다.
#
# 사용법:
#   scripts/dev.sh
#   BACKEND_PORT=8000 FRONTEND_PORT=5173 scripts/dev.sh   # 포트를 바꾸고 싶을 때
set -uo pipefail

# 기본값은 8001 — 로컬에서 8000번 포트를 이 프로젝트와 무관한 다른 프로세스가
# 이미 쓰고 있는 경우가 있어서, frontend/.envs/.env.dev의 VITE_API_BASE_URL도
# 8001을 가리키도록 맞춰뒀다. 8000번이 비어 있다면 BACKEND_PORT=8000으로 덮어써도 된다.
BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "⚠️  포트 $port 이 이미 사용 중입니다. 다른 프로세스를 먼저 종료하거나 BACKEND_PORT/FRONTEND_PORT로 다른 포트를 지정하세요." >&2
    exit 1
  fi
done

cleanup() {
  echo ""
  echo "종료 중..."
  # uv run/npm run은 그 아래로 python·node 자식 프로세스를 몇 겹 더 띄우기
  # 때문에(Django autoreload가 특히 그렇다), 그 PID들을 직접 kill하는 대신
  # 실제로 포트를 물고 있는 프로세스를 찾아서 끝낸다 — 몇 겹을 거치든 항상 먹힌다.
  lsof -ti ":${BACKEND_PORT}" 2>/dev/null | xargs kill 2>/dev/null
  lsof -ti ":${FRONTEND_PORT}" 2>/dev/null | xargs kill 2>/dev/null
  kill $(jobs -p) 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "▶ 백엔드:    http://127.0.0.1:${BACKEND_PORT}"
(
  cd "$ROOT_DIR/backend" && uv run python manage.py runserver "127.0.0.1:${BACKEND_PORT}" 2>&1 \
    | sed -u "s/^/[backend]  /"
) &

echo "▶ 프론트엔드: http://localhost:${FRONTEND_PORT}"
(
  cd "$ROOT_DIR/frontend" && npm run dev -- --port "${FRONTEND_PORT}" 2>&1 \
    | sed -u "s/^/[frontend] /"
) &

wait
