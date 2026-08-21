# 만료노트 백엔드

Django + Django REST Framework 기반 API 서버입니다. 패키지/가상환경 관리는 [uv](https://docs.astral.sh/uv/)를 사용합니다.

## 요구 사항

- Python 3.12
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Supabase 프로젝트 (DB + Auth/Storage). 로컬 개발도 별도 로컬 DB 없이 이 프로젝트에 바로 연결합니다.

## 로컬 개발 환경 설정

1. Supabase 프로젝트가 아직 없다면 먼저 만듭니다. [Supabase 연동 가이드](../docs/supabase-setup.md)를 참고하세요.

2. `backend/` 디렉터리에서 환경 변수 파일을 준비합니다.

   ```bash
   cd backend
   cp .env.example .env
   ```

   Supabase 대시보드에서 확인한 `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 값을 채워 넣으세요. `.env`는 git에 커밋되지 않습니다.

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

## Supabase 사용

- **DB**: Django ORM은 그대로 사용합니다. `DATABASE_URL`이 Supabase의 Postgres를 가리킬 뿐, 모델/마이그레이션 작성 방식은 바뀌지 않습니다.
- **Auth/Storage 등 DB 밖의 Supabase 기능**: `apps.core.services`의 클라이언트 헬퍼를 사용합니다.

  ```python
  from apps.core.services import get_supabase_client, get_supabase_admin_client

  supabase = get_supabase_client()        # anon key, RLS 적용됨
  supabase_admin = get_supabase_admin_client()  # service role key, RLS 우회 — 서버 전용
  ```

  `get_supabase_admin_client()`의 결과나 service role key는 절대 웹/앱 클라이언트로 내려주지 않습니다.

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
│   ├── _template/    # 새 앱을 만들 때 복사해서 시작하는 템플릿
│   └── core/         # 헬스 체크, Supabase 클라이언트 등 공통 기능
├── manage.py
├── pyproject.toml   # uv/ruff/pytest 설정
└── .env.example
```

새 도메인 앱은 `apps/` 아래에 추가합니다. 예: `apps/accounts`, `apps/items`, `apps/schedules`, `apps/notifications`.

### 앱 구조 컨벤션

각 앱의 `models`, `serializers`, `services`, `views`는 단일 파일이 아니라 폴더로 관리하고, 폴더 안에서도 기능 단위로 파일을 나눕니다. 하나의 파일에 서로 관련 없는 코드가 계속 쌓이는 것을 방지하기 위함입니다.

새 앱을 추가할 때는 [`apps/_template`](apps/_template/README.md)을 복사해서 시작하세요. 폴더 구조, 각 레이어의 역할 구분, `__init__.py` re-export 규칙이 예시 코드와 함께 정리되어 있습니다.
