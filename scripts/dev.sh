#!/bin/bash
# 백엔드(Django)와 프론트엔드(Vite) 개발 서버를 한 번에 실행.
# Postgres가 안 떠 있으면 brew services로 같이 띄움(이미 떠 있으면 손 안 댐).
# Postgres는 여러 터미널·다른 프로젝트가 같이 쓰는 상시 서비스라 runserver/vite와
# 달리 스크립트 종료 시(Ctrl+C) 같이 안 내림 — 계속 켜둔 채로 둠.
#
# 사용법:
#   scripts/dev.sh
#   BACKEND_PORT=8000 FRONTEND_PORT=3000 scripts/dev.sh   # 포트를 바꾸고 싶을 때

set -m
# ↑ job control 켜기: 이게 없으면 아래 두 백그라운드 작업이 이 스크립트와
# 같은 프로세스 그룹을 공유해서, runserver의 autoreload 자식 프로세스나
# vite의 node 프로세스처럼 한 단계 더 아래에서 뜨는 손자 프로세스까지는
# 종료 시그널이 안 전달된다 — 포트를 계속 붙잡은 채 좀비로 남는다.
# set -m으로 각 백그라운드 작업을 자기만의 프로세스 그룹으로 분리하면,
# 그 그룹에 음수 PID로 시그널을 보내 자식·손자까지 한 번에 정리할 수 있다.

cd "$(dirname "$0")/.."

BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

cleanup() {
  trap - INT TERM EXIT # 종료 처리 중 다시 트랩이 걸려 cleanup이 중복 실행되는 것 방지
  echo ""
  echo "🛑 개발 서버 종료 중..."
  for pid in $(jobs -p); do
    kill -TERM -- -"$pid" 2>/dev/null
  done
  wait 2>/dev/null
}
trap cleanup INT TERM EXIT

ensure_service() {
  local name="$1" port="$2" formula="$3"

  if lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "✅ $name 이미 실행 중 (:$port)"
    return
  fi

  if ! command -v brew >/dev/null 2>&1; then
    echo "⚠️  ${name}가 :$port 에서 안 떠 있는데 brew가 없어서 직접 못 띄움 — 수동으로 켜주세요."
    return
  fi

  echo "▶️  $name 실행 중... (brew services start $formula)"
  brew services start "$formula" >/dev/null

  for _ in $(seq 1 10); do
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1 && break
    sleep 0.5
  done

  if ! lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "⚠️  ${name}가 :$port 에서 안 떠서 백엔드 연결이 실패할 수 있음 — brew services list로 상태를 확인해보세요."
  fi
}

# postgresql@14처럼 버전 붙은 formula명을 브루에 설치된 것 기준으로 찾음
pg_formula=$(brew list --formula 2>/dev/null | grep '^postgresql' | head -1)
ensure_service "Postgres" 5432 "${pg_formula:-postgresql}"

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "⚠️  포트 $port 이 이미 사용 중입니다. 다른 프로세스를 먼저 종료하거나 BACKEND_PORT/FRONTEND_PORT로 다른 포트를 지정하세요." >&2
    exit 1
  fi
done

echo "🚀 백엔드(Django) 실행 중... (http://127.0.0.1:${BACKEND_PORT})"
(cd backend && uv run python manage.py runserver "127.0.0.1:${BACKEND_PORT}" 2>&1 | sed -u "s/^/[backend]  /") &

echo "🚀 프론트엔드(Vite) 실행 중... (http://localhost:${FRONTEND_PORT})"
(cd frontend && npm run dev -- --port "${FRONTEND_PORT}" 2>&1 | sed -u "s/^/[frontend] /") &

wait
