#!/bin/sh
# 컨테이너 시작 시 매번 실행됨: DB가 뜰 때까지 기다렸다가, (스케줄러가 아닌
# 웹 서비스일 때만) 마이그레이션을 돌리고, 원래 CMD(gunicorn 또는
# runscheduler)를 그대로 실행한다.
set -e

echo "Postgres(${DB_HOST:-db}:${DB_PORT:-5432}) 연결 대기 중..."
until python - <<'PYEOF'
import os
import socket
import sys

host = os.environ.get("DB_HOST", "db")
port = int(os.environ.get("DB_PORT", "5432"))
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(1)
try:
    s.connect((host, port))
except OSError:
    sys.exit(1)
finally:
    s.close()
PYEOF
do
  sleep 1
done
echo "Postgres 연결됨."

# scheduler 서비스는 docker-compose.prod.yml에서 RUN_MIGRATIONS=false로
# 띄운다 — 여러 컨테이너가 동시에 migrate를 돌리는 걸 피하기 위해 웹
# 서비스(backend) 하나만 담당한다.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "마이그레이션 실행..."
  python manage.py migrate --noinput
fi

exec "$@"
