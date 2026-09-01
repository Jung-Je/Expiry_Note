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

   # JWT 서명 전용 키(선택). 없으면 DJANGO_SECRET_KEY를 그대로 쓴다. 배포
   # 환경에서는 세션/CSRF 서명(DJANGO_SECRET_KEY)과 분리하기 위해 별도의
   # 랜덤 값을 설정하는 걸 권장한다.
   # JWT_SIGNING_KEY=change-me-to-a-different-random-secret-key

   # refresh token httpOnly 쿠키의 Secure 속성(선택). 기본값은 DJANGO_DEBUG의
   # 반대값 — 로컬 dev(http://localhost)에서는 꺼져 있어야 쿠키가 저장된다.
   # 배포 준하는 로컬 테스트(DJANGO_ENV_FILE=.env.prod)에서 여전히 http로
   # 접속한다면 False로 덮어써야 한다.
   # JWT_REFRESH_COOKIE_SECURE=False

   # 카카오 로그인 인가 코드 -> access_token 교환에 쓴다(카카오 디벨로퍼스
   # > 내 애플리케이션 > 앱 설정 > 앱 키 > REST API 키). client_secret은
   # 카카오 앱에서 "클라이언트 시크릿" 기능을 켰을 때만 필요 — 꺼져 있으면
   # 비워둬도 된다. 둘 다 절대 프론트로 넘기면 안 되는 값이라 백엔드에만 둔다.
   KAKAO_REST_API_KEY=<카카오 REST API 키>
   # KAKAO_CLIENT_SECRET=<카카오 클라이언트 시크릿, 켜져 있는 경우만>

   # 유료 플랜(베이직/프로) 구독 결제(토스페이먼츠 자동결제/빌링). 개발자센터 > 내
   # 개발자센터 > API 키에서 "API 개별 연동 키"의 클라이언트/시크릿 키를
   # 쓴다 — "결제위젯 연동 키"는 자동결제 API를 지원하지 않으니 주의.
   # TOSS_CLIENT_KEY는 프론트 JS SDK 초기화에도 쓰이는 공개 키라 노출돼도
   # 되지만(frontend/.envs의 VITE_TOSS_CLIENT_KEY로 별도 관리), TOSS_SECRET_KEY는
   # 절대 프론트로 넘기면 안 되는 값이라 백엔드에만 둔다.
   TOSS_CLIENT_KEY=<토스페이먼츠 API 개별 연동 클라이언트 키>
   TOSS_SECRET_KEY=<토스페이먼츠 API 개별 연동 시크릿 키>

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

   # 실제로 이메일을 발송하려면(회원가입 인증, 비밀번호 재설정) 위
   # EMAIL_BACKEND를 아래 SMTP 백엔드로 바꾸고 이 네 줄을 채운다. 지금은
   # Gmail SMTP를 쓴다 — Google 계정에서 2단계 인증을 켠 뒤 "앱 비밀번호"를
   # 발급받아 EMAIL_HOST_PASSWORD에 넣는다(일반 로그인 비밀번호 아님).
   # DEFAULT_FROM_EMAIL도 EMAIL_HOST_USER와 같은 Gmail 주소로 맞춰야 한다 —
   # Gmail은 인증된 계정과 다른 주소로 보내는 걸 거부한다.
   # EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   # EMAIL_HOST_USER=<Gmail 주소>
   # EMAIL_HOST_PASSWORD=<Gmail 앱 비밀번호, 16자리>
   # DEFAULT_FROM_EMAIL=<위와 같은 Gmail 주소>
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
uv run python manage.py runscheduler       # 알림 생성/토큰 정리 스케줄러 (아래 참고)
uv run pytest                              # 테스트 실행
uv run ruff check .                        # 린트
uv run ruff format .                       # 포맷팅
```

프론트엔드와 같이 띄워야 할 때는 저장소 루트의 `scripts/dev.sh`로 백엔드·프론트엔드 개발 서버를 한 번에 실행할 수 있습니다(Ctrl+C 한 번으로 둘 다 종료).

## 알림 생성/토큰 정리/구독 갱신 스케줄러

`generate_notifications`(만료 임박 알림 생성), `flushexpiredtokens`(만료된 JWT 블랙리스트 정리), `renew_subscriptions`(오늘이 결제 예정일인 유료 구독 갱신 청구)는 원래 cron 같은 외부 스케줄러로 주기적으로 돌리는 걸 전제로 만든 관리 명령어입니다. 배포 플랫폼이 아직 정해지지 않아 시스템 cron에 의존하는 대신, `apps/core/management/commands/runscheduler.py`가 [APScheduler](https://apscheduler.readthedocs.io/)로 이 셋을 프로세스 안에서 직접 스케줄링합니다(`renew_subscriptions` 매일 08:00, `generate_notifications` 매일 09:00, `flushexpiredtokens` 매주 월요일 03:00, 모두 `TIME_ZONE` 기준).

```bash
uv run python manage.py runscheduler   # 웹 서버(runserver)와는 별개의 독립 프로세스로 계속 띄워둠
```

- **`runserver`(웹 프로세스)와 완전히 별개의 프로세스로 띄워야 합니다** — Docker Compose의 별도 서비스, systemd 유닛, Heroku/Render 같은 곳의 worker 프로세스, 그냥 서버에서 `nohup uv run python manage.py runscheduler &`로 띄워도 전부 동일하게 동작합니다. 배포 플랫폼이 뭐로 정해지든 그대로 씁니다.
- 실제로 배포할 플랫폼이 자체 cron 기능(예: k8s CronJob, 클라우드 스케줄러)을 제공한다면, 이 워커를 안 띄우고 대신 `generate_notifications`/`flushexpiredtokens`/`renew_subscriptions`를 그 기능으로 직접 스케줄링해도 됩니다 — 관리 명령어 자체는 그대로 재사용됩니다.
- `generate_notifications`는 여러 번 실행해도 항목+만료일 조합으로 중복 알림이 생성되지 않습니다(`Notification`의 `unique_together`).
- `renew_subscriptions`는 매일 실행해도 오늘이 결제 예정일(`current_period_end`)인 구독만 청구합니다. 결제가 실패하면 카드 정보(`billing_key`)는 남겨두고 바로 무료 플랜으로 내립니다 — 자세한 내용은 아래 "결제/구독" 절 참고.

## 결제/구독 (`apps/billing`)

무료/베이직(월 4,900원)/프로(월 9,900원) 3단계 요금제입니다. 플랜별 가격/항목 개수 상한은 `apps/billing/services/subscription.py`의 `PLAN_MONTHLY_AMOUNT`/`PLAN_ITEM_LIMIT`가 유일한 소스(프론트 요금제 카드 카피는 이 값을 그대로 옮겨 적은 것이라 값을 바꾸면 프론트도 같이 바꿔야 함). 베이직/프로 구독은 [토스페이먼츠 자동결제(빌링)](https://docs.tosspayments.com/guides/v2/billing/integration)로 처리합니다. 카드 등록 인증(`authKey` 발급)은 프론트에서 토스 SDK로 진행하고, `authKey` → 빌링키 교환과 실제 결제 승인은 시크릿 키가 필요한 작업이라 전부 백엔드(`apps/billing/services/toss.py`, `services/subscription.py`)에서 처리합니다.

- `GET /api/v1/billing/subscription/` — 현재 사용자의 구독 상태(플랜/상태/다음 결제일/항목 사용량 `item_count`·`item_limit`) 조회. 구독 레코드가 없으면 무료 플랜으로 자동 생성.
- `POST /api/v1/billing/subscribe/` — `{"auth_key": "...", "plan": "basic"|"pro"}`로 빌링키를 발급받고 첫 결제를 즉시 청구해 지정한 플랜으로 전환.
- `POST /api/v1/billing/change-plan/` — `{"plan": "basic"|"pro"}`로 이미 카드가 등록된 유료 구독자를 베이직↔프로 사이에서 전환. 새로 카드를 등록하지 않고, 일할 정산 없이 다음 결제부터 새 플랜 금액이 청구됩니다.
- `POST /api/v1/billing/cancel/` — 다음 결제부터 청구를 멈춤(해지). 이미 낸 결제 주기가 끝날 때까지는 지금 플랜이 유지됩니다.
- `GET /api/v1/billing/payments/` — 결제 내역 조회.

토스페이먼츠 API 키는 개발자센터 > 내 개발자센터 > API 키의 **"API 개별 연동 키"**를 씁니다 — "결제위젯 연동 키"는 자동결제 API를 지원하지 않습니다. 환경 변수는 위 "로컬 개발 환경 설정"의 `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY` 참고.

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
├── config/          # Django 프로젝트 설정 (urls, wsgi/asgi)
│   └── settings/     # base.py(공통) + dev.py/prod.py(환경별). DJANGO_ENV_FILE=
│                      # .env.prod면 prod.py, 그 외엔 dev.py를 씀 (settings/__init__.py)
├── apps/            # 도메인별 Django 앱 모음
│   ├── _template/    # 새 앱을 만들 때 복사해서 시작하는 템플릿
│   ├── core/         # 헬스 체크, 알림/토큰 정리/구독 갱신 스케줄러(runscheduler)
│   ├── accounts/     # 회원 인증 (이메일 가입/로그인, 카카오 로그인 등)
│   ├── items/        # 만료 항목 관리 + 일정 + 통계
│   ├── notifications/ # 인앱 알림 + 알림 생성 배치
│   └── billing/      # 요금제 구독/결제 (토스페이먼츠 자동결제)
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
| POST | `login/` | 이메일 로그인 → `{ access, user }` (refresh는 httpOnly 쿠키로) |
| POST | `token/refresh/` | httpOnly 쿠키의 refresh token으로 access token 재발급 → `{ access }` |
| POST | `email/verify/` | 이메일 인증 링크의 `uid`/`token`으로 인증 완료 처리 |
| POST | `password/reset/` | 비밀번호 재설정 메일 발송 (가입 여부와 무관하게 항상 200) |
| POST | `password/reset/confirm/` | `uid`/`token`/`new_password`로 비밀번호 변경 |
| POST | `password/change/` | 로그인 상태에서 `current_password`/`new_password`로 비밀번호 변경 (인증 필요) |
| POST | `logout/` | 쿠키의 refresh token 블랙리스트 처리 + 쿠키 삭제 (인증 필요) |
| POST | `kakao/login/` | 프론트가 카카오 JS SDK로 받은 `code`/`redirect_uri`로 로그인/가입 |
| GET/PATCH | `me/` | 현재 로그인한 사용자 정보 조회/수정 (인증 필요) |
| DELETE | `me/` | 회원 탈퇴 — 연관 항목/알림 cascade 삭제, 발급된 refresh token 전부 블랙리스트 (인증 필요) |

- 로그인 아이디는 이메일입니다 (`AUTH_USER_MODEL = "accounts.User"`, `apps/accounts/models/user.py`).
- 이메일 발송은 `EMAIL_BACKEND`가 기본적으로 콘솔 백엔드라 실제로 나가지 않고 `runserver` 콘솔에 링크가 출력됩니다. 실제 발송은 Gmail SMTP를 씁니다 — 위 "로컬 개발 환경 설정"의 `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` 참고.
- 카카오 로그인은 프론트엔드가 카카오 JS SDK(`Kakao.Auth.authorize()`)로 인가 코드(`code`)만 받아서 넘기고, 그 코드를 `access_token`으로 교환하는 건 반드시 백엔드가 합니다(`exchange_kakao_code`, `apps/accounts/services/kakao.py`) — client_secret처럼 프론트로 넘기면 안 되는 값이 필요할 수 있어서입니다. 교환한 `access_token`으로 카카오 사용자 정보 API를 호출해 검증한 뒤 로컬 사용자와 매칭/생성합니다. `redirect_uri`는 프론트가 `authorize()` 호출 때 쓴 값과 정확히 같아야 합니다(카카오 쪽 검증 대상).
- **토큰 관리**: access 30분/refresh 14일, 재발급마다 refresh를 로테이션하고 옛 토큰은 블랙리스트 처리(`SIMPLE_JWT`). 비밀번호 변경/재설정/회원탈퇴 시점엔 그 유저의 발급된 refresh token을 전부 블랙리스트 처리해 기존 세션을 강제 종료합니다(`apps/accounts/services/token_revocation.py`).
- **refresh token은 httpOnly 쿠키로만 오갑니다** — `login/`·`token/refresh/`·`kakao/login/` 응답 바디에는 access token과 user 정보만 들어있고, refresh token은 JS가 접근할 수 없는 httpOnly 쿠키(`Set-Cookie`, `/api/v1/auth/` 경로로 범위 제한)로만 내려갑니다. 재발급도 그 쿠키를 읽어서 하므로 프론트가 body로 refresh를 보낼 필요가 없습니다 — 브라우저가 쿠키를 자동으로 실어 보냅니다(`apps/accounts/cookies.py`). 크로스오리진(로컬 dev 기준 5173→8000)으로 쿠키를 주고받아야 해서 `CORS_ALLOW_CREDENTIALS=True`이고, 프론트도 axios `withCredentials: true`가 필요합니다.
- **Rate limiting**: 위 표의 `signup/`·`login/`·`token/refresh/`·`email/verify/`·`password/reset/`·`password/reset/confirm/`·`password/change/`·`kakao/login/`은 IP 기준으로 스로틀됩니다(`ScopedRateThrottle`, rate는 `config/settings/base.py`의 `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`).

### 앱 구조 컨벤션

각 앱의 `models`, `serializers`, `services`, `views`는 단일 파일이 아니라 폴더로 관리하고, 폴더 안에서도 기능 단위로 파일을 나눕니다. 하나의 파일에 서로 관련 없는 코드가 계속 쌓이는 것을 방지하기 위함입니다.

새 앱을 추가할 때는 [`apps/_template`](apps/_template/README.md)을 복사해서 시작하세요. 폴더 구조, 각 레이어의 역할 구분, `__init__.py` re-export 규칙이 예시 코드와 함께 정리되어 있습니다.
