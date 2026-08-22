# 진행 상황

마지막 업데이트: 2026-08-22 · 브랜치: `feature/initial-setup`

이 문서는 지금까지 뭘 했고, 뭐가 남았고, 다음에 어디서부터 이어가면 되는지 정리한 작업 로그입니다. 기능/화면 기획은 루트 [`README.md`](../README.md)를 참고하세요.

## 지금 커밋 안 된 변경사항부터 처리하세요

`config/settings.py`를 `config/settings/{base,dev,prod}.py` 패키지로 쪼갠 작업이 아직 커밋 전입니다:

- `backend/config/settings/base.py` — 기존 `settings.py` 내용 그대로 (`BASE_DIR` 계산만 한 단계 더 깊어진 경로에 맞게 수정)
- `backend/config/settings/dev.py` — `from .base import *`만 있음
- `backend/config/settings/prod.py` — base + `DEBUG = False` 명시 + 배포 전 켜야 할 HTTPS 하드닝 설정 TODO 코멘트
- `backend/config/settings/__init__.py` — 기존 `DJANGO_ENV_FILE` 환경변수로 dev/prod 선택 (`.env.prod`면 prod, 그 외엔 dev). `manage.py`/`wsgi.py`/`asgi.py`/pytest는 전부 그대로 `DJANGO_SETTINGS_MODULE=config.settings`만 가리키면 됨 — 다른 파일 변경 없음
- `backend/README.md` — 프로젝트 구조 설명 갱신

dev/prod 둘 다 `manage.py check` 통과, 테스트 60개·`check-all.sh`·`ruff format --check` 확인 완료. 커밋만 하면 됩니다.

```bash
bash scripts/check-all.sh   # 백엔드 포맷팅+린트+Django check, 프론트 린트까지 한 번에
bash scripts/test.sh        # 백엔드 테스트+커버리지
cd frontend && npm run test # 프론트 테스트
```

## 완료된 것

### 프로젝트 구조 / 툴링

- 모노레포: `backend/`(Django+DRF, uv), `frontend/`(Vite+React+TS), `mobile/`(스택 미정), `docs/`
- Django 앱은 `apps/<name>/{models,serializers,services,views,tests}/` 폴더 구조 컨벤션 사용. 새 앱은 `backend/apps/_template/`을 복사해서 시작 (자세한 규칙은 그 안의 README).
- 환경변수: `backend/.envs/`, `frontend/.envs/`에 `.env.dev`/`.env.prod`를 로컬에서 직접 만들어 사용. **어떤 env 파일도 git에 커밋하지 않음** — 필요한 키는 `backend/README.md`/`frontend/README.md`에 문서화되어 있고, 각자 로컬에 파일을 새로 만들어야 함.
- DB: docker-compose 컨테이너 방식을 걷어내고, 로컬에 직접 설치한 PostgreSQL(pgAdmin4로 관리)에 `expiry_note_dev`/`expiry_note_prod` 두 데이터베이스로 연결. 설정은 `DB_ENGINE`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT`/`DB_CONN_MAX_AGE` 분리형 env var를 읽음 (`DATABASE_URL` 한 줄 방식 아님).
- 백엔드 settings: `config/settings.py` 하나였던 걸 `config/settings/{base,dev,prod}.py`로 분리 (커밋 대기 중 — 위 섹션 참고). `DJANGO_ENV_FILE` 환경변수 하나로 `.envs/` 파일과 settings 모듈을 함께 선택.
- 코드 스타일/CI: `scripts/check-all.sh` 한 줄로 백엔드(ruff format+lint+`manage.py check`)와 프론트엔드(oxlint) 전체 검증. `.github/workflows/ci.yml`이 push/PR마다 백엔드(Postgres 서비스 컨테이너 + format check + lint + Django check + pytest 커버리지)와 프론트엔드(lint + vitest) job을 병렬로 실행 — GitHub Actions에서 실제로 그린으로 통과하는 것까지 확인함(처음엔 `push: branches: [main]`으로 걸어놔서 feature 브랜치 push에 안 걸리던 버그가 있었고, 수정 후 재확인함).

### 백엔드 API — MVP 기능 전 영역 구현 완료

모든 엔드포인트는 `/api/v1/` 아래, JWT 인증(`Authorization: Bearer <access>`) 기반. 상세는 `backend/README.md`.

- **`apps/accounts`** — 회원 인증 전체
  - 이메일 회원가입/로그인/토큰 재발급/로그아웃(refresh 토큰 블랙리스트)
  - 이메일 인증, 비밀번호 재설정(이메일 토큰), 로그인 상태 비밀번호 변경
  - 카카오 로그인 (`kakao/login/` — 프론트가 카카오 JS SDK로 받은 access_token을 그대로 전달)
  - 프로필 조회/수정(`me/` GET/PATCH), 회원 탈퇴(`me/` DELETE — 연관 항목/알림 cascade 삭제)
- **`apps/items`** — 만료 항목 관리 + 일정 + 통계
  - 등록/목록/상세/수정/삭제, `category`/`status`/`search`/`date` 쿼리 파라미터로 필터링
  - `status`(만료됨/임박/예정/여유)와 `days_until_expiry`는 계산된 값
  - `calendar/` — 월별 일정 조회 (날짜별로 그룹핑)
  - `stats/` — 등록 항목 요약, 유형별/상태별 집계, 월별 결제 금액(6개월치)
  - `notify_days_before` 필드로 항목별 알림 시점 설정
- **`apps/notifications`** — 알림
  - 인앱 알림 목록/읽음 처리(`GET /`, `POST /{id}/read/`, `POST /read-all/`)
  - 푸시 알림 설정 저장(`GET/PATCH /settings/`) — 실제 푸시 발송(FCM/APNs)은 미구현, 설정값만 저장
  - `generate_due_notifications()` 서비스 + `manage.py generate_notifications` 관리 명령어 — 매일 1회 크론으로 돌리는 걸 전제. **실제 크론/스케줄러는 아직 안 걸려있음**
- **`apps/core`** — 헬스체크(`health/`)만

백엔드 테스트 60개, 커버리지 90%.

### 프론트엔드

- Vite+React+TS 스캐폴드, 라우팅(`react-router-dom`), 인증 컨텍스트(`AuthContext`), axios 인스턴스(401 시 자동 refresh)
- **실제로 API에 연결된 것**: 로그인(`LoginPage`), 회원가입(`SignupPage`)
- **API 함수는 있지만 화면(라우트)이 없는 것**: 비밀번호 재설정 요청/확인, 이메일 인증 (`features/auth/api.ts`에 `requestPasswordReset`/`confirmPasswordReset`/`verifyEmail` 함수는 있음)
- **아예 없는 것**: 카카오 로그인 연동, 비밀번호 변경 화면, 회원 탈퇴 화면
- **자리표시자(placeholder)뿐인 화면**: Dashboard, Schedule, ItemForm, ItemDetail, Stats, Settings, Pricing — 전부 "~가 표시될 예정입니다" 문구만 있고 백엔드 API 연결 없음

## 남은 작업

우선순위 순서 제안:

1. **프론트엔드-백엔드 연동** (다음 작업으로 가장 유력)
   - Dashboard: `GET /items/stats/`, `GET /items/?status=urgent` 등으로 요약/임박 항목 표시
   - ItemForm/ItemDetail: `apps/items` CRUD 연결 (등록/수정/삭제/상세조회)
   - Schedule: `GET /items/calendar/` 연동, 월별 달력 UI
   - Stats: `GET /items/stats/`를 Recharts로 시각화
   - Settings: 프로필 수정(`PATCH /auth/me/`), 비밀번호 변경, 알림 설정(`GET/PATCH /notifications/settings/`), 회원 탈퇴(`DELETE /auth/me/`), 로그아웃(`POST /auth/logout/`) 화면
   - 이메일 인증/비밀번호 재설정 화면(라우트) 추가 — 백엔드 API는 이미 있음
   - 카카오 로그인 버튼/SDK 연동
   - 인앱 알림 목록 UI (`GET /notifications/`)
2. **알림 발송 인프라** — `generate_notifications` 크론 스케줄링(플랫폼 미정), 실제 푸시 발송(FCM/APNs — 모바일 스택 확정 후)
3. **결제/구독** — 프리미엄 플랜(월 2,900원 기획가) 결제 연동. 백엔드에 관련 모델/API 전혀 없음, 처음부터 시작
4. **이메일 발송** — 현재 콘솔 백엔드(개발용). 실제 SMTP/이메일 서비스 선정 필요
5. **모바일 앱** — 스택 자체가 미정
6. **배포 인프라** — 프로덕션 서버/DB 호스팅 미정. `.envs/.env.prod`는 현재 로컬 Postgres를 가리키고 있어 실제 배포 시 값 교체 필요
7. **출시 이후로 명시적으로 미룬 것** (지금 안 해도 됨): Google 소셜 로그인, 가족 공유 기능

## 다음 세션에서 이어가려면

1. 위 "지금 커밋 안 된 변경사항" 섹션부터 확인하고 커밋
2. `git log --oneline -15`로 최근 커밋 히스토리 확인, `README.md`의 "개발 현황" 체크리스트로 기획 대비 위치 확인
3. 이 문서의 "남은 작업" 1번(프론트엔드-백엔드 연동)부터 시작하는 걸 추천 — 백엔드 API는 이미 다 준비되어 있고, 화면 자리표시자만 채우면 되는 상태
4. 로컬 실행: `backend/README.md`, `frontend/README.md`의 "로컬 개발 환경 설정" 참고 (둘 다 `.envs/.env.dev`를 로컬에 직접 만들어야 함 — git에 없음)
