# 진행 상황

마지막 업데이트: 2026-08-24 · 브랜치: `feature/initial-setup`

이 문서는 지금까지 뭘 했고, 뭐가 남았고, 다음에 어디서부터 이어가면 되는지 정리한 작업 로그입니다. 기능/화면 기획은 루트 [`README.md`](../README.md)를 참고하세요.

## 지금 커밋 안 된 변경사항부터 처리하세요

카카오 로그인 프론트/백엔드 구현이 아직 커밋 전입니다. 이전 커밋들(쿠키 전환, 항목 CRUD, Dashboard/Schedule/Stats/Settings, 비밀번호 재설정/이메일 인증 화면, 인앱 알림)은 이미 파일별로 커밋됐습니다.

- **`backend/apps/accounts/services/kakao.py`** — `exchange_kakao_code()` 추가: 인가 코드(code)를 access_token으로 교환. REST API 키를 `client_id`로 쓰고, `KAKAO_CLIENT_SECRET`이 설정된 경우에만 `client_secret`을 실어 보냄
- **`backend/apps/accounts/serializers/auth.py`** — `KakaoLoginSerializer`가 `access_token` 대신 `code`/`redirect_uri`를 받도록 변경
- **`backend/apps/accounts/views/auth.py`** — `KakaoLoginView`가 코드 교환 → 유저 조회/생성을 이어서 처리
- **`backend/config/settings/base.py`** — `KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET` env var 추가
- **`frontend/src/features/auth/kakao.ts`** (신규) — 카카오 JS SDK 동적 로드 + `Kakao.Auth.authorize()`로 리다이렉트
- **`frontend/src/pages/auth/KakaoCallbackPage.tsx`** (신규) — `/auth/kakao/callback`에서 인가 코드를 받아 백엔드로 전달만 함(access_token 교환은 절대 프론트에서 안 함 — client_secret이 필요할 수 있는 값이라서)
- **`frontend/src/features/auth/{AuthContext.tsx,api.ts,context.ts}`** — `loginWithKakao()` 추가
- **`frontend/src/pages/auth/LoginPage.tsx`** — "카카오로 로그인" 버튼(카카오 브랜드 컬러) 추가
- **`frontend/src/App.tsx`** — `/auth/kakao/callback` 라우트 등록
- 테스트: `backend/apps/accounts/tests/test_auth_flows.py`에 `exchange_kakao_code` 성공/실패/client_secret 케이스 3개, `test_cookie_auth.py`의 카카오 로그인 테스트를 새 계약(`code`/`redirect_uri`)에 맞게 갱신
- 문서: `backend/README.md`(`KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET` env var, 엔드포인트 설명), `frontend/README.md`(`VITE_KAKAO_JS_KEY`, 프로젝트 구조·인증 방식 전반을 최신 상태로 갱신 — 그동안 밀려있던 부분도 같이 정리함)

백엔드 테스트 78개(기존 74 + 신규 4)·`check-all.sh`·프론트 테스트 3개·타입체크 확인 완료. **실제 카카오 계정으로 로그인 끝까지 검증 완료** — 리다이렉트 → 인가 코드 → 토큰 교환(`client_secret` 포함) → 유저 생성/로그인 → 대시보드 진입까지 실제로 동작하는 것 확인함. 커밋만 하면 됩니다.

카카오 개발자 콘솔에서 클라이언트 시크릿이 켜져 있어서 처음엔 `KOE010`(Bad client credentials) 에러가 났었음 — `KAKAO_CLIENT_SECRET`을 로컬 `.envs/.env.dev`에 넣고 나서 정상 동작함. **콘솔에 "카카오 로그인 코드"와 "비즈니스 인증 코드" 두 가지가 있었는데, "카카오 로그인" 쪽이 우리가 필요한 Client Secret이 맞았음.**

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
  - 카카오 로그인 (`kakao/login/` — 프론트가 카카오 JS SDK로 받은 인가 코드(`code`)를 전달하면 백엔드가 access_token으로 교환)
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

백엔드 테스트 78개, 커버리지 90%대.

### 인증 보안 강화 (JWT 토큰 관리)

로그인 방식(JWT)을 보안 관점에서 점검하고 리팩토링했습니다. "짧은 access + 긴 refresh + 블랙리스트"라는 큰 방향은 기존 `SIMPLE_JWT` 설정(access 30분/refresh 14일/로테이션)에 이미 있었지만, 실제로는 지켜지지 않던 지점들을 고쳤습니다.

- **리프레시 로테이션이 프론트 버그로 무력화돼 있던 것 수정** — 백엔드는 재발급마다 새 refresh를 내려주고 옛 것은 블랙리스트하는데, 프론트가 새 토큰을 버리고 옛(이미 블랙리스트된) 토큰을 재저장해서 두 번째 재발급부터 무조건 강제 로그아웃되던 버그
- **비밀번호 변경/재설정/회원탈퇴 시 전체 세션 무효화** — `revoke_all_tokens()`로 해당 유저의 모든 refresh token을 블랙리스트 처리. 이전엔 비밀번호를 바꿔도 이미 탈취된 refresh token이 남은 기간(최대 14일) 계속 유효했음
- **JWT 서명 키를 Django `SECRET_KEY`와 분리** — `JWT_SIGNING_KEY` env var(선택, 없으면 기존처럼 `SECRET_KEY`를 그대로 씀). 세션/CSRF 서명 키와 JWT 서명 키를 분리해 하나가 새도 다른 하나까지 위험해지지 않도록
- **인증 관련 AllowAny 엔드포인트에 IP 기준 rate limiting** — `ScopedRateThrottle`. 로그인/회원가입/비밀번호 재설정(요청·확인)/이메일 인증/카카오 로그인/비밀번호 변경에 스코프별 rate 적용, 브루트포스·이메일 enumeration·스팸성 가입 방지
- **refresh token을 `localStorage`에서 httpOnly 쿠키로 전환** — access token만 응답 바디로 내려주고 프론트가 메모리에 보관(새로고침하면 사라지고, `AuthProvider` 마운트 시 쿠키로 조용히 재발급). refresh token은 JS가 아예 접근 못 하는 httpOnly 쿠키로만 오가서, XSS로 access token이 새더라도 수명이 훨씬 긴 refresh token까지 같이 새지 않음(`apps/accounts/cookies.py`). 겸사겸사 프론트 `logout()`이 실제로 백엔드를 호출하도록 고침 — 이전엔 클라이언트에서 토큰만 지우고 서버에 안 알려서, 로그아웃해도 탈취된 refresh token이 최대 14일 계속 유효했음

**아직 안 한 것** (다음 우선순위 1번 참고):
- `manage.py flushexpiredtokens`(만료된 OutstandingToken/BlacklistedToken 정리)를 주기적으로 도는 크론 스케줄링
- 로컬 dev 캐시가 프로세스 로컬 LocMemCache라, 배포 시 멀티 워커 환경에서는 rate limit 카운트가 워커마다 따로 쌓여 느슨해짐 — Redis 등 공유 캐시로 교체 필요 (배포 인프라 확정 후)
- refresh 쿠키의 `Secure` 속성은 `DEBUG`의 반대값이 기본이라 로컬 dev(http)에서는 꺼져 있음 — 실제 배포(HTTPS) 시 `JWT_REFRESH_COOKIE_SECURE`가 켜지는지 확인 필요(자동으로 켜지긴 하지만, prod.py의 HTTPS 하드닝 TODO와 같이 점검)

### 프론트엔드 — 백엔드 API 연동 사실상 전 영역 완료

Vite+React+TS, 라우팅(`react-router-dom`), TanStack Query(서버 상태), React Hook Form+Zod(폼), Recharts(차트), date-fns(달력). 인증 컨텍스트(`AuthContext`)와 axios 인스턴스(`lib/api.ts`, 401 시 자동 refresh)를 기반으로 화면마다 `features/<domain>/{api.ts,hooks.ts}` 얇은 레이어를 두는 패턴을 씀.

- **인증** — 로그인/회원가입/로그아웃/비밀번호 재설정(요청+확인)/이메일 인증/카카오 로그인까지 전부 연결. 비밀번호 변경·프로필 수정·회원 탈퇴는 설정 화면에 있음. 카카오 로그인은 실제 계정으로 끝까지(리다이렉트 → 코드 → 토큰 교환 → 유저 생성 → 대시보드 진입) 검증 완료
- **항목(items)** — 등록/수정(`ItemFormPage`, 폼 하나로 겸용)/상세/삭제(`ItemDetailPage`) 전부 연결
- **Dashboard** — 등록 항목 수·임박 요약 카드 + 임박 항목 목록(`GET /items/stats/`, `GET /items/?status=urgent`)
- **Schedule** — 월별 달력, 날짜별 항목 표시, 월 이동(`GET /items/calendar/`)
- **Stats** — 월별 결제 금액/유형별/상태별 Recharts 차트(`GET /items/stats/`) — 색상은 `dataviz` 스킬 절차 그대로 따르고 검증함
- **Notifications** — 전체/읽지 않음 필터, 개별·전체 읽음 처리(`GET /notifications/`, `POST .../read/`, `POST read-all/`)
- **Settings** — 프로필 수정, 비밀번호 변경, 알림(푸시) 설정 토글, 회원 탈퇴
- **아직 없는 것**: `PricingPage`는 자리표시자(결제 연동 자체가 백엔드에 없음 — 남은 작업 참고)

## 남은 작업

우선순위 순서 제안:

1. **알림 발송 인프라** — `generate_notifications` 크론 스케줄링(플랫폼 미정, `manage.py flushexpiredtokens`도 같이 묶어서 처리), 실제 푸시 발송(FCM/APNs — 모바일 스택 확정 후)
2. **결제/구독** — 프리미엄 플랜(월 2,900원 기획가) 결제 연동. 백엔드에 관련 모델/API 전혀 없음, `PricingPage`도 자리표시자, 처음부터 시작
3. **이메일 발송** — 현재 콘솔 백엔드(개발용). 실제 SMTP/이메일 서비스 선정 필요
4. **모바일 앱** — 스택 자체가 미정
5. **배포 인프라** — 프로덕션 서버/DB 호스팅 미정. `.envs/.env.prod`는 현재 로컬 Postgres를 가리키고 있어 실제 배포 시 값 교체 필요. 배포 확정 시 rate limiting용 캐시를 Redis 등 공유 캐시로 교체하고, refresh 쿠키 `Secure` 속성이 실제로 켜지는지 확인 필요(위 "인증 보안 강화" 참고). 카카오 디벨로퍼스에도 배포 도메인을 Web 플랫폼/Redirect URI로 추가 등록해야 함
6. **출시 이후로 명시적으로 미룬 것** (지금 안 해도 됨): Google 소셜 로그인, 가족 공유 기능

카카오 로그인 포함 프론트엔드-백엔드 연동은 결제(Pricing)만 빼고 전부 끝났고, 실제 계정으로 검증까지 완료됐습니다 — 위 "완료된 것 > 프론트엔드" 참고.

## 다음 세션에서 이어가려면

1. 위 "지금 커밋 안 된 변경사항" 섹션부터 확인하고 커밋
2. `git log --oneline -15`로 최근 커밋 히스토리 확인, `README.md`의 "개발 현황" 체크리스트로 기획 대비 위치 확인
3. 이 문서의 "남은 작업" 1번(알림 발송 인프라)부터 시작하는 걸 추천 — 프론트엔드-백엔드 연동은 결제(Pricing) 빼고 다 끝난 상태
4. 로컬 실행: `backend/README.md`, `frontend/README.md`의 "로컬 개발 환경 설정" 참고 (둘 다 `.envs/.env.dev`를 로컬에 직접 만들어야 함 — git에 없음, 카카오 로그인 테스트하려면 `VITE_KAKAO_JS_KEY`/`KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET`도 필요)
