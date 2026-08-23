# 진행 상황

마지막 업데이트: 2026-08-23 · 브랜치: `feature/initial-setup`

이 문서는 지금까지 뭘 했고, 뭐가 남았고, 다음에 어디서부터 이어가면 되는지 정리한 작업 로그입니다. 기능/화면 기획은 루트 [`README.md`](../README.md)를 참고하세요.

## 지금 커밋 안 된 변경사항부터 처리하세요

JWT 로그인 방식을 보안 관점에서 점검하고 리팩토링한 작업이 아직 커밋 전입니다 (배경은 아래 "완료된 것 > 인증 보안 강화" 참고):

- `backend/apps/accounts/services/token_revocation.py` (신규) — 유저의 모든 refresh token을 블랙리스트 처리하는 `revoke_all_tokens()`
- `backend/apps/accounts/services/{password_change,password_reset,withdraw}.py` — 위 함수를 비밀번호 변경/재설정/회원탈퇴 시점에 연결
- `backend/config/settings/base.py` — `SIMPLE_JWT.SIGNING_KEY`를 `SECRET_KEY`와 분리(`JWT_SIGNING_KEY` env var, 선택), `REST_FRAMEWORK`에 `ScopedRateThrottle` + 스코프별 rate 추가
- `backend/apps/accounts/views/auth.py` — Signup/Login/ChangePassword/EmailVerify/PasswordReset(요청·확인)/KakaoLogin 뷰에 `throttle_scope` 지정
- `backend/README.md` — `JWT_SIGNING_KEY` env var 문서화
- `frontend/src/lib/api.ts` — 리프레시 로테이션 버그 수정 (재발급 응답의 새 refresh token을 저장하지 않고 옛 토큰을 재저장하던 버그 — 두 번째 재발급부터 강제 로그아웃되는 원인이었음)
- 테스트: `backend/apps/accounts/tests/test_auth_flows.py`에 세션 무효화 검증 3개, `backend/apps/accounts/tests/test_throttling.py`(신규) 4개

백엔드 테스트 67개(기존 60 + 신규 7)·`check-all.sh`·프론트 테스트 4개 확인 완료. 커밋만 하면 됩니다.

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
- 백엔드 settings: `config/settings.py` 하나였던 걸 `config/settings/{base,dev,prod}.py`로 분리. `DJANGO_ENV_FILE` 환경변수 하나로 `.envs/` 파일과 settings 모듈을 함께 선택.
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

백엔드 테스트 67개, 커버리지 90%대.

### 인증 보안 강화 (JWT 토큰 관리)

로그인 방식(JWT)을 보안 관점에서 점검하고 리팩토링했습니다. "짧은 access + 긴 refresh + 블랙리스트"라는 큰 방향은 기존 `SIMPLE_JWT` 설정(access 30분/refresh 14일/로테이션)에 이미 있었지만, 실제로는 지켜지지 않던 지점들을 고쳤습니다.

- **리프레시 로테이션이 프론트 버그로 무력화돼 있던 것 수정** — 백엔드는 재발급마다 새 refresh를 내려주고 옛 것은 블랙리스트하는데, 프론트가 새 토큰을 버리고 옛(이미 블랙리스트된) 토큰을 재저장해서 두 번째 재발급부터 무조건 강제 로그아웃되던 버그
- **비밀번호 변경/재설정/회원탈퇴 시 전체 세션 무효화** — `revoke_all_tokens()`로 해당 유저의 모든 refresh token을 블랙리스트 처리. 이전엔 비밀번호를 바꿔도 이미 탈취된 refresh token이 남은 기간(최대 14일) 계속 유효했음
- **JWT 서명 키를 Django `SECRET_KEY`와 분리** — `JWT_SIGNING_KEY` env var(선택, 없으면 기존처럼 `SECRET_KEY`를 그대로 씀). 세션/CSRF 서명 키와 JWT 서명 키를 분리해 하나가 새도 다른 하나까지 위험해지지 않도록
- **인증 관련 AllowAny 엔드포인트에 IP 기준 rate limiting** — `ScopedRateThrottle`. 로그인/회원가입/비밀번호 재설정(요청·확인)/이메일 인증/카카오 로그인/비밀번호 변경에 스코프별 rate 적용, 브루트포스·이메일 enumeration·스팸성 가입 방지

**아직 안 한 것** (다음 우선순위 1번 참고):
- refresh token을 `localStorage`가 아니라 httpOnly 쿠키로 저장하는 전환 (XSS 탈취 방어) — 프론트 axios 인터셉터와 백엔드 로그인/로그아웃/재발급 뷰를 전부 손대야 하는 별도 작업
- `manage.py flushexpiredtokens`(만료된 OutstandingToken/BlacklistedToken 정리)를 주기적으로 도는 크론 스케줄링
- 로컬 dev 캐시가 프로세스 로컬 LocMemCache라, 배포 시 멀티 워커 환경에서는 rate limit 카운트가 워커마다 따로 쌓여 느슨해짐 — Redis 등 공유 캐시로 교체 필요 (배포 인프라 확정 후)

### 프론트엔드

- Vite+React+TS 스캐폴드, 라우팅(`react-router-dom`), 인증 컨텍스트(`AuthContext`), axios 인스턴스(401 시 자동 refresh)
- **실제로 API에 연결된 것**: 로그인(`LoginPage`), 회원가입(`SignupPage`)
- **API 함수는 있지만 화면(라우트)이 없는 것**: 비밀번호 재설정 요청/확인, 이메일 인증 (`features/auth/api.ts`에 `requestPasswordReset`/`confirmPasswordReset`/`verifyEmail` 함수는 있음)
- **아예 없는 것**: 카카오 로그인 연동, 비밀번호 변경 화면, 회원 탈퇴 화면
- **자리표시자(placeholder)뿐인 화면**: Dashboard, Schedule, ItemForm, ItemDetail, Stats, Settings, Pricing — 전부 "~가 표시될 예정입니다" 문구만 있고 백엔드 API 연결 없음

## 남은 작업

우선순위 순서 제안:

1. **JWT 인증 보안 리팩토링 마저 진행** (진행 중 — 지금 이어가기 가장 유력)
   - refresh token을 `localStorage`에서 httpOnly 쿠키로 전환 (access는 메모리 보관 검토) — 프론트 axios 인터셉터, 백엔드 로그인/로그아웃/`token/refresh/` 뷰를 다 같이 손대야 하는 별도 작업이라 분리해서 진행 권장
   - `manage.py flushexpiredtokens` 크론 스케줄링 — 아래 2번(알림 발송 인프라)의 크론 작업과 같이 묶어서 처리하면 자연스러움
2. **프론트엔드-백엔드 연동**
   - Dashboard: `GET /items/stats/`, `GET /items/?status=urgent` 등으로 요약/임박 항목 표시
   - ItemForm/ItemDetail: `apps/items` CRUD 연결 (등록/수정/삭제/상세조회)
   - Schedule: `GET /items/calendar/` 연동, 월별 달력 UI
   - Stats: `GET /items/stats/`를 Recharts로 시각화
   - Settings: 프로필 수정(`PATCH /auth/me/`), 비밀번호 변경, 알림 설정(`GET/PATCH /notifications/settings/`), 회원 탈퇴(`DELETE /auth/me/`), 로그아웃(`POST /auth/logout/`) 화면
   - 이메일 인증/비밀번호 재설정 화면(라우트) 추가 — 백엔드 API는 이미 있음
   - 카카오 로그인 버튼/SDK 연동
   - 인앱 알림 목록 UI (`GET /notifications/`)
3. **알림 발송 인프라** — `generate_notifications` 크론 스케줄링(플랫폼 미정, `flushexpiredtokens`와 같이 처리), 실제 푸시 발송(FCM/APNs — 모바일 스택 확정 후)
4. **결제/구독** — 프리미엄 플랜(월 2,900원 기획가) 결제 연동. 백엔드에 관련 모델/API 전혀 없음, 처음부터 시작
5. **이메일 발송** — 현재 콘솔 백엔드(개발용). 실제 SMTP/이메일 서비스 선정 필요
6. **모바일 앱** — 스택 자체가 미정
7. **배포 인프라** — 프로덕션 서버/DB 호스팅 미정. `.envs/.env.prod`는 현재 로컬 Postgres를 가리키고 있어 실제 배포 시 값 교체 필요. 배포 확정 시 rate limiting용 캐시도 Redis 등 공유 캐시로 교체 필요(위 "인증 보안 강화" 참고)
8. **출시 이후로 명시적으로 미룬 것** (지금 안 해도 됨): Google 소셜 로그인, 가족 공유 기능

## 다음 세션에서 이어가려면

1. 위 "지금 커밋 안 된 변경사항" 섹션부터 확인하고 커밋
2. `git log --oneline -15`로 최근 커밋 히스토리 확인, `README.md`의 "개발 현황" 체크리스트로 기획 대비 위치 확인
3. 이 문서의 "남은 작업" 1번(JWT 인증 보안 리팩토링 — httpOnly 쿠키 전환, `flushexpiredtokens` 크론)부터 이어가는 걸 추천. 그 다음이 2번(프론트엔드-백엔드 연동) — 백엔드 API는 이미 다 준비되어 있고, 화면 자리표시자만 채우면 되는 상태
4. 로컬 실행: `backend/README.md`, `frontend/README.md`의 "로컬 개발 환경 설정" 참고 (둘 다 `.envs/.env.dev`를 로컬에 직접 만들어야 함 — git에 없음)
