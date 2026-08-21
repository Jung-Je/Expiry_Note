# 만료노트 백엔드

Django + Django REST Framework 기반 API 서버입니다. 패키지/가상환경 관리는 [uv](https://docs.astral.sh/uv/)를 사용합니다.

## 요구 사항

- Python 3.12
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Docker / Docker Compose (로컬 PostgreSQL 실행용)

## 로컬 개발 환경 설정

1. 저장소 루트에서 PostgreSQL 컨테이너를 실행합니다.

   ```bash
   docker compose up -d db
   ```

   기본적으로 호스트의 `5433` 포트로 노출됩니다(로컬에 5432를 쓰는 다른 Postgres가 있을 수 있어 충돌을 피하기 위함).

2. `backend/` 디렉터리에서 환경 변수 파일을 준비합니다.

   ```bash
   cd backend
   cp .env.example .env
   ```

   필요에 맞게 `.env` 값을 수정하세요. `.env`는 git에 커밋되지 않습니다.

3. 의존성을 설치합니다.

   ```bash
   uv sync
   ```

4. 마이그레이션을 실행합니다.

   ```bash
   uv run python manage.py migrate
   ```

5. 개발 서버를 실행합니다.

   ```bash
   uv run python manage.py runserver
   ```

6. 헬스 체크로 정상 동작을 확인합니다.

   ```bash
   curl http://127.0.0.1:8000/api/health/
   # {"status": "ok"}
   ```

## 자주 쓰는 명령어

```bash
uv run python manage.py migrate            # 마이그레이션 적용
uv run python manage.py makemigrations     # 마이그레이션 생성
uv run python manage.py createsuperuser    # 관리자 계정 생성
uv run python manage.py runserver          # 개발 서버 실행
uv run pytest                              # 테스트 실행
uv run ruff check .                        # 린트
uv run ruff format .                       # 포맷팅
```

## 프로젝트 구조

```
backend/
├── config/          # Django 프로젝트 설정 (settings, urls, wsgi/asgi)
├── apps/            # 도메인별 Django 앱 모음
│   └── core/        # 헬스 체크 등 공통 기능
├── manage.py
├── pyproject.toml   # uv/ruff/pytest 설정
└── .env.example
```

새 도메인 앱은 `apps/` 아래에 추가합니다. 예: `apps/accounts`, `apps/items`, `apps/schedules`, `apps/notifications`.
