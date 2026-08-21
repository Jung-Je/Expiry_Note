# 만료노트 백엔드

Django + Django REST Framework 기반 API 서버입니다. 패키지/가상환경 관리는 [uv](https://docs.astral.sh/uv/)를 사용합니다.

## 요구 사항

- Python 3.12
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- 로컬에 설치된 PostgreSQL (pgAdmin4 등으로 직접 관리). `expiry_note_dev`, `expiry_note_prod` 두 데이터베이스를 미리 만들어둡니다.

## 로컬 개발 환경 설정

1. `backend/` 디렉터리에서 환경 변수 파일 `.envs/.env.dev`를 직접 만듭니다. `.envs/` 아래 파일은 (`.env.dev`, `.env.prod` 등) git에 전혀 커밋되지 않으므로, 아래 내용을 복사해서 로컬에 새로 만들어야 합니다.

   ```bash
   cd backend
   mkdir -p .envs
   ```

   `.envs/.env.dev`:

   ```env
   DJANGO_SECRET_KEY=change-me-to-a-random-secret-key
   DJANGO_DEBUG=True
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

   # 로컬 PostgreSQL(pgAdmin4로 관리)의 expiry_note_dev 데이터베이스.
   DB_ENGINE=django.db.backends.postgresql
   DB_NAME=expiry_note_dev
   DB_USER=<계정>
   DB_PASSWORD=<비밀번호>
   DB_HOST=localhost
   DB_PORT=5432
   DB_CONN_MAX_AGE=60

   # Web frontend origin(s) allowed to call this API (comma-separated).
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   # Base URL of the web frontend, used to build links inside emails.
   FRONTEND_URL=http://localhost:5173

   # Prints emails to the runserver console instead of actually sending them.
   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
   DEFAULT_FROM_EMAIL=no-reply@expirynote.local
   ```

   실제 배포에 준하는 설정으로 로컬에서 테스트하려면 `DB_NAME`을 `expiry_note_prod`로 바꾼 `.envs/.env.prod`를 만들고 `DJANGO_ENV_FILE=.env.prod uv run python manage.py runserver`처럼 실행하세요. 실제 배포 환경에서는 이 파일 대신 진짜 환경 변수를 직접 주입합니다.

2. 의존성을 설치합니다.

   ```bash
   uv sync
   ```

3. 마이그레이션을 실행합니다.

   ```bash
   uv run python manage.py migrate
   ```

4. 개발 서버를 실행합니다.

   ```bash
   uv run python manage.py runserver
   ```

5. 헬스 체크로 정상 동작을 확인합니다.

   ```bash
   curl http://127.0.0.1:8000/api/v1/health/
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

## 커밋 전 체크

저장소 루트의 `scripts/`에 커밋 전 코드 스타일을 맞추는 스크립트가 있습니다.

```bash
# 전체 체크 (백엔드 포맷팅 + 린트 + Django check + 프론트엔드 린트, 테스트는 제외 — 더 오래 걸려서 별도)
scripts/check-all.sh

# 개별 실행
scripts/format.sh   # ruff format . — 파일을 직접 고침 (백엔드)
scripts/lint.sh      # ruff check . — 문제만 보고, 고치지 않음 (백엔드)
scripts/test.sh      # pytest --cov — 테스트 + 커버리지 (백엔드)
```

`scripts/check-all.sh` 한 줄이면 백엔드/프론트엔드 둘 다 검증됩니다 — 4단계로 포맷팅(백엔드), 린트(백엔드), Django check, 린트(프론트엔드)를 순서대로 돌립니다. `format.sh`를 그대로 호출하므로 포맷팅을 검사만 하는 게 아니라 **직접 고칩니다**.

CI(`.github/workflows/ci.yml`)는 같은 체크(포맷팅/린트/Django check/테스트+커버리지, 프론트엔드 린트+테스트)를 push/PR마다 자동으로 실행하지만, 포맷팅 단계는 파일을 고치지 않고 `ruff format --check`로 실패만 시킵니다 — CI 러너에서 고친 내용은 어차피 저장되지 않고 사라지므로, 커밋 전에 포맷이 안 맞았다는 걸 놓치지 않기 위함입니다.

## 프로젝트 구조

```
backend/
├── config/          # Django 프로젝트 설정 (settings, urls, wsgi/asgi)
├── apps/            # 도메인별 Django 앱 모음
│   ├── _template/    # 새 앱을 만들 때 복사해서 시작하는 템플릿
│   ├── core/         # 헬스 체크 등 공통 기능
│   └── accounts/     # 회원 인증 (이메일 가입/로그인, 카카오 로그인 등)
├── manage.py
├── pyproject.toml   # uv/ruff/pytest 설정
└── .envs/           # git에 커밋되지 않음 — 필요한 키는 이 README에 문서화
    ├── .env.dev      # 로컬 개발용, 직접 생성
    └── .env.prod     # 배포 준하는 설정 테스트용, 직접 생성
```

새 도메인 앱은 `apps/` 아래에 추가합니다. 예: `apps/items`, `apps/schedules`, `apps/notifications`.

## API — 회원 인증 (`apps/accounts`)

모든 경로는 `/api/v1/auth/` 아래에 있습니다. 인증이 필요 없는 요청은 `AllowAny`, 나머지는 JWT(`Authorization: Bearer <access>`)가 필요합니다.

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `signup/` | 이메일 회원가입. 가입 직후 인증 메일 발송(자동 로그인 안 됨) |
| POST | `login/` | 이메일 로그인 → `{ access, refresh, user }` |
| POST | `token/refresh/` | refresh token으로 access token 재발급 |
| POST | `email/verify/` | 이메일 인증 링크의 `uid`/`token`으로 인증 완료 처리 |
| POST | `password/reset/` | 비밀번호 재설정 메일 발송 (가입 여부와 무관하게 항상 200) |
| POST | `password/reset/confirm/` | `uid`/`token`/`new_password`로 비밀번호 변경 |
| POST | `kakao/login/` | 프론트가 카카오 JS SDK로 받은 `access_token`으로 로그인/가입 |
| GET | `me/` | 현재 로그인한 사용자 정보 (인증 필요) |

- 로그인 아이디는 이메일입니다 (`AUTH_USER_MODEL = "accounts.User"`, `apps/accounts/models/user.py`).
- 이메일 발송은 `EMAIL_BACKEND`가 기본적으로 콘솔 백엔드라 실제로 나가지 않고 `runserver` 콘솔에 링크가 출력됩니다. 실제 SMTP/이메일 서비스 연동은 추후 확정.
- 카카오 로그인은 백엔드가 OAuth 코드 교환을 하지 않습니다 — 프론트엔드가 카카오 JS SDK로 얻은 `access_token`을 그대로 넘기면, 백엔드가 그 토큰으로 카카오 사용자 정보 API를 호출해 검증합니다 (`apps/accounts/services/kakao.py`).

### 앱 구조 컨벤션

각 앱의 `models`, `serializers`, `services`, `views`는 단일 파일이 아니라 폴더로 관리하고, 폴더 안에서도 기능 단위로 파일을 나눕니다. 하나의 파일에 서로 관련 없는 코드가 계속 쌓이는 것을 방지하기 위함입니다.

새 앱을 추가할 때는 [`apps/_template`](apps/_template/README.md)을 복사해서 시작하세요. 폴더 구조, 각 레이어의 역할 구분, `__init__.py` re-export 규칙이 예시 코드와 함께 정리되어 있습니다.
