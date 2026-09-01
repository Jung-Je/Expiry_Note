# 운영 배포용 이미지. 로컬 개발은 여전히 uv를 직접 써서 실행하며(scripts/dev.sh),
# 이 이미지는 실제 서버(docker-compose.prod.yml)에서만 쓴다.
FROM python:3.12-slim

# psycopg[binary]는 wheel이라 빌드 도구가 필요 없지만, libpq 자체는 런타임에
# 있어야 한다.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# uv 바이너리만 공식 이미지에서 복사 — pip install uv보다 빠르고 가볍다.
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /uvx /usr/local/bin/

WORKDIR /app

COPY . .
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH" \
    DJANGO_ENV_FILE=.env.prod \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# collectstatic은 DB 연결이 필요 없다(SECRET_KEY 등은 base.py에 빌드용
# 기본값이 있어 실제 운영 값 없이도 통과한다). 여기서 모은 정적 파일은
# 컨테이너 안에 그대로 남고, WhiteNoise(config/settings/base.py)가
# gunicorn 프로세스에서 직접 서빙한다.
RUN python manage.py collectstatic --noinput

RUN chmod +x docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
