# 진행 상황

마지막 업데이트: 2026-08-24 · 브랜치: `feature/initial-setup`

이 문서는 지금까지 뭘 했고, 뭐가 남았고, 다음에 어디서부터 이어가면 되는지 정리한 작업 로그입니다. 기능/화면 기획은 루트 [`README.md`](../README.md)를 참고하세요.

## 지금 커밋 안 된 변경사항부터 처리하세요

알림 생성/토큰 정리 스케줄러(`runscheduler`)가 아직 커밋 전입니다. 이전 커밋들(카카오 로그인, `User.signup_source` 추가 등)은 이미 파일별로 커밋됐습니다.

- **`backend/apps/core/management/commands/runscheduler.py`** (신규) — APScheduler로 `generate_notifications`(매일 09:00)/`flushexpiredtokens`(매주 월 03:00)를 스케줄링하는 독립 워커 커맨드. 배포 플랫폼이 아직 미정이라 시스템 cron 대신 프로세스 자체적으로 스케줄링 — 어느 플랫폼에 배포하든 그대로 씀
- **`backend/pyproject.toml`** — `apscheduler` 의존성 추가
- **`backend/apps/core/tests/`** (신규 디렉터리, 기존 빈 `tests.py` 대체) — `test_runscheduler.py`: 잡 등록/실패해도 안 죽는지/DB 커넥션 정리 검증
- 문서: `backend/README.md`에 "알림 생성/토큰 정리 스케줄러" 섹션 추가, 프로젝트 구조 트리에 빠져있던 `items`/`notifications` 앱도 같이 채워넣음

백엔드 테스트 85개(기존 81 + 신규 4)·`check-all.sh` 확인 완료. `runscheduler`를 실제로 몇 초 띄워서 정상 기동 로그("스케줄러 시작 (timezone=Asia/Seoul) — ...")까지 확인함 — 실제 스케줄(다음날 09:00 등)이 도는 것 자체는 배포 이후에나 확인 가능. 커밋만 하면 됩니다.

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
  - `generate_due_notifications()` 서비스 + `manage.py generate_notifications` 관리 명령어 — 매일 1회 도는 걸 전제로 만듦
- **`apps/core`** — 헬스체크(`health/`) + `manage.py runscheduler`(알림 생성/토큰 정리 스케줄러, 아래 참고)

백엔드 테스트 85개, 커버리지 90%대.

### 인증 보안 강화 (JWT 토큰 관리)

로그인 방식(JWT)을 보안 관점에서 점검하고 리팩토링했습니다. "짧은 access + 긴 refresh + 블랙리스트"라는 큰 방향은 기존 `SIMPLE_JWT` 설정(access 30분/refresh 14일/로테이션)에 이미 있었지만, 실제로는 지켜지지 않던 지점들을 고쳤습니다.

- **리프레시 로테이션이 프론트 버그로 무력화돼 있던 것 수정** — 백엔드는 재발급마다 새 refresh를 내려주고 옛 것은 블랙리스트하는데, 프론트가 새 토큰을 버리고 옛(이미 블랙리스트된) 토큰을 재저장해서 두 번째 재발급부터 무조건 강제 로그아웃되던 버그
- **비밀번호 변경/재설정/회원탈퇴 시 전체 세션 무효화** — `revoke_all_tokens()`로 해당 유저의 모든 refresh token을 블랙리스트 처리. 이전엔 비밀번호를 바꿔도 이미 탈취된 refresh token이 남은 기간(최대 14일) 계속 유효했음
- **JWT 서명 키를 Django `SECRET_KEY`와 분리** — `JWT_SIGNING_KEY` env var(선택, 없으면 기존처럼 `SECRET_KEY`를 그대로 씀). 세션/CSRF 서명 키와 JWT 서명 키를 분리해 하나가 새도 다른 하나까지 위험해지지 않도록
- **인증 관련 AllowAny 엔드포인트에 IP 기준 rate limiting** — `ScopedRateThrottle`. 로그인/회원가입/비밀번호 재설정(요청·확인)/이메일 인증/카카오 로그인/비밀번호 변경에 스코프별 rate 적용, 브루트포스·이메일 enumeration·스팸성 가입 방지
- **refresh token을 `localStorage`에서 httpOnly 쿠키로 전환** — access token만 응답 바디로 내려주고 프론트가 메모리에 보관(새로고침하면 사라지고, `AuthProvider` 마운트 시 쿠키로 조용히 재발급). refresh token은 JS가 아예 접근 못 하는 httpOnly 쿠키로만 오가서, XSS로 access token이 새더라도 수명이 훨씬 긴 refresh token까지 같이 새지 않음(`apps/accounts/cookies.py`). 겸사겸사 프론트 `logout()`이 실제로 백엔드를 호출하도록 고침 — 이전엔 클라이언트에서 토큰만 지우고 서버에 안 알려서, 로그아웃해도 탈취된 refresh token이 최대 14일 계속 유효했음

**아직 안 한 것**:
- 로컬 dev 캐시가 프로세스 로컬 LocMemCache라, 배포 시 멀티 워커 환경에서는 rate limit 카운트가 워커마다 따로 쌓여 느슨해짐 — Redis 등 공유 캐시로 교체 필요 (배포 인프라 확정 후)
- refresh 쿠키의 `Secure` 속성은 `DEBUG`의 반대값이 기본이라 로컬 dev(http)에서는 꺼져 있음 — 실제 배포(HTTPS) 시 `JWT_REFRESH_COOKIE_SECURE`가 켜지는지 확인 필요(자동으로 켜지긴 하지만, prod.py의 HTTPS 하드닝 TODO와 같이 점검)

`manage.py flushexpiredtokens` 크론 스케줄링은 아래 "알림 생성/토큰 정리 스케줄러"에서 처리했습니다.

### 알림 생성/토큰 정리 스케줄러

배포 플랫폼이 아직 정해지지 않아 시스템 cron에 의존하는 대신, `apps/core/management/commands/runscheduler.py`가 [APScheduler](https://apscheduler.readthedocs.io/)로 `generate_notifications`(매일 09:00)와 `flushexpiredtokens`(매주 월요일 03:00)를 프로세스 안에서 직접 스케줄링합니다 — `runserver`와는 별개의 독립 프로세스로 띄우면 되고, Docker 별도 서비스든 systemd든 `nohup ... &`든 배포 플랫폼과 무관하게 동일하게 동작합니다. 나중에 배포 플랫폼이 자체 cron 기능을 제공하면 이 워커 대신 그걸 써도 됩니다(관리 명령어 자체는 그대로 재사용).

**아직 안 한 것**: 실제 푸시 발송(FCM/APNs)은 모바일 스택이 정해져야 시작 가능. `runscheduler`가 실제 프로덕션에서 잘 도는지는 배포 이후에나 확인 가능(로컬에서 기동/정상 시작 로그까지만 확인함).

### 프론트엔드 — 백엔드 API 연동 사실상 전 영역 완료

Vite+React+TS, 라우팅(`react-router-dom`), TanStack Query(서버 상태), React Hook Form+Zod(폼), Recharts(차트), date-fns(달력). 인증 컨텍스트(`AuthContext`)와 axios 인스턴스(`lib/api.ts`, 401 시 자동 refresh)를 기반으로 화면마다 `features/<domain>/{api.ts,hooks.ts}` 얇은 레이어를 두는 패턴을 씀.

- **인증** — 로그인/회원가입/로그아웃/비밀번호 재설정(요청+확인)/이메일 인증/카카오 로그인까지 전부 연결. 비밀번호 변경·프로필 수정·회원 탈퇴는 설정 화면에 있음. 카카오 로그인은 실제 계정으로 끝까지(리다이렉트 → 코드 → 토큰 교환 → 유저 생성 → 대시보드 진입) 검증 완료 — 그 과정에서 카카오 닉네임을 못 읽어와 이름이 "카카오 사용자"로 저장되던 버그(`kakao_account.profile.nickname` 대신 `properties.nickname`에 오는 케이스를 놓침)와, 가입 경로(이메일/카카오/구글)를 구분할 `User.signup_source` 필드 부재도 같이 발견해서 고침
- **항목(items)** — 등록/수정(`ItemFormPage`, 폼 하나로 겸용)/상세/삭제(`ItemDetailPage`) 전부 연결
- **Dashboard** — 등록 항목 수·임박 요약 카드 + 임박 항목 목록(`GET /items/stats/`, `GET /items/?status=urgent`)
- **Schedule** — 월별 달력, 날짜별 항목 표시, 월 이동(`GET /items/calendar/`)
- **Stats** — 월별 결제 금액/유형별/상태별 Recharts 차트(`GET /items/stats/`) — 색상은 `dataviz` 스킬 절차 그대로 따르고 검증함
- **Notifications** — 전체/읽지 않음 필터, 개별·전체 읽음 처리(`GET /notifications/`, `POST .../read/`, `POST read-all/`)
- **Settings** — 프로필 수정, 비밀번호 변경, 알림(푸시) 설정 토글, 회원 탈퇴
- **아직 없는 것**: `PricingPage`는 자리표시자(결제 연동 자체가 백엔드에 없음 — 남은 작업 참고)

## 남은 작업

우선순위 순서 제안:

1. **결제/구독** — 어떤 PG사(토스페이먼츠/아임포트-포트원 등)를 쓸지부터 결정 필요. 프리미엄 플랜(월 2,900원 기획가) 결제 연동, 백엔드에 관련 모델/API 전혀 없음, `PricingPage`도 자리표시자, 처음부터 시작
2. **이메일 발송** — 어떤 SMTP/이메일 서비스(SendGrid, AWS SES 등)를 쓸지부터 결정 필요. 현재 콘솔 백엔드(개발용)
3. **모바일 앱** — 스택 자체가 미정
4. **배포 인프라** — 프로덕션 서버/DB 호스팅 미정. `.envs/.env.prod`는 현재 로컬 Postgres를 가리키고 있어 실제 배포 시 값 교체 필요. 배포 확정 시 rate limiting용 캐시를 Redis 등 공유 캐시로 교체하고, refresh 쿠키 `Secure` 속성이 실제로 켜지는지 확인 필요(위 "인증 보안 강화" 참고). 카카오 디벨로퍼스에도 배포 도메인을 Web 플랫폼/Redirect URI로 추가 등록해야 함. `runscheduler` 워커도 실제로 띄워야 함(위 "알림 생성/토큰 정리 스케줄러" 참고)
5. **실제 푸시 발송(FCM/APNs)** — 모바일 스택 확정 후. 알림 생성 자체(크론 스케줄링 포함)는 이미 끝남
6. **출시 이후로 명시적으로 미룬 것** (지금 안 해도 됨): Google 소셜 로그인, 가족 공유 기능

카카오 로그인 포함 프론트엔드-백엔드 연동은 결제(Pricing)만 빼고 전부 끝났고, 실제 계정으로 검증까지 완료됐습니다 — 위 "완료된 것 > 프론트엔드" 참고.

## 다음 세션에서 이어가려면

1. 위 "지금 커밋 안 된 변경사항" 섹션부터 확인하고 커밋
2. `git log --oneline -15`로 최근 커밋 히스토리 확인, `README.md`의 "개발 현황" 체크리스트로 기획 대비 위치 확인
3. "남은 작업"이 전부 사용자 쪽 외부 결정(PG사, 이메일 서비스, 배포 플랫폼, 모바일 스택)이 필요한 항목들뿐이라, 다음 세션 시작할 때 어느 걸 먼저 할지 사용자에게 확인부터 하는 걸 추천
4. 로컬 실행: `backend/README.md`, `frontend/README.md`의 "로컬 개발 환경 설정" 참고 (둘 다 `.envs/.env.dev`를 로컬에 직접 만들어야 함 — git에 없음, 카카오 로그인 테스트하려면 `VITE_KAKAO_JS_KEY`/`KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET`도 필요)
