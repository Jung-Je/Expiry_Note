# 진행 상황

마지막 업데이트: 2026-09-03 · 브랜치: `feature/initial-setup`

이 문서는 지금까지 뭘 했고, 뭐가 남았고, 다음에 어디서부터 이어가면 되는지 정리한 작업 로그입니다. 기능/화면 기획은 루트 [`README.md`](../README.md)를 참고하세요.

지금까지의 작업은 전부 파일별로 커밋 완료된 상태입니다.

```bash
bash scripts/check-all.sh   # 백엔드 포맷팅+린트+Django check, 프론트 린트까지 한 번에
bash scripts/test.sh        # 백엔드 테스트+커버리지
cd frontend && npm run test # 프론트 테스트
scripts/dev.sh              # 백엔드+프론트 개발 서버를 한 번에 실행(Ctrl+C로 같이 종료, Postgres는 자동 확인/실행)
```

## 완료된 것

### 프로젝트 구조 / 툴링

- 모노레포: `backend/`(Django+DRF, uv), `frontend/`(Vite+React+TS), `mobile/`(스택 미정), `docs/`
- Django 앱은 `apps/<name>/{models,serializers,services,views,tests}/` 폴더 구조 컨벤션 사용. 새 앱은 `backend/apps/_template/`을 복사해서 시작 (자세한 규칙은 그 안의 README).
- 환경변수: `backend/.envs/`, `frontend/.envs/`에 `.env.dev`/`.env.prod`를 로컬에서 직접 만들어 사용. **어떤 env 파일도 git에 커밋하지 않음** — 필요한 키는 `backend/README.md`/`frontend/README.md`에 문서화되어 있고, 각자 로컬에 파일을 새로 만들어야 함.
- DB: docker-compose 컨테이너 방식을 걷어내고, 로컬에 직접 설치한 PostgreSQL(pgAdmin4로 관리)에 `expiry_note_dev`/`expiry_note_prod` 두 데이터베이스로 연결. 설정은 `DB_ENGINE`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT`/`DB_CONN_MAX_AGE` 분리형 env var를 읽음 (`DATABASE_URL` 한 줄 방식 아님).
- 백엔드 settings: `config/settings.py` 하나였던 걸 `config/settings/{base,dev,prod}.py`로 분리. `DJANGO_ENV_FILE` 환경변수 하나로 `.envs/` 파일과 settings 모듈을 함께 선택.
- 코드 스타일/CI: `scripts/check-all.sh` 한 줄로 백엔드(ruff format+lint+`manage.py check`)와 프론트엔드(oxlint) 전체 검증. `.github/workflows/ci.yml`이 push/PR마다 백엔드(Postgres 서비스 컨테이너 + format check + lint + Django check + pytest 커버리지)와 프론트엔드(lint + vitest) job을 병렬로 실행 — GitHub Actions에서 실제로 그린으로 통과하는 것까지 확인함(처음엔 `push: branches: [main]`으로 걸어놔서 feature 브랜치 push에 안 걸리던 버그가 있었고, 수정 후 재확인함).
- `scripts/dev.sh`: 백엔드(Django)+프론트엔드(Vite) 개발 서버를 한 번에 실행. Postgres가 로컬에 안 떠 있으면 `brew services`로 자동 실행(이미 떠 있으면 손 안 댐, 다른 프로젝트도 같이 쓰는 상시 서비스라 스크립트 종료 시 안 내림). `set -m`으로 job control을 켜고 프로세스 그룹째로 종료시켜서, Django autoreload나 Vite의 자식 프로세스까지 Ctrl+C 한 번에 깔끔하게 정리됨(라이브로 실행/포트 해제 확인함). 기본 포트는 8001/5173(로컬 8000번을 이 프로젝트와 무관한 다른 프로세스가 이미 쓰고 있어서) — `BACKEND_PORT`/`FRONTEND_PORT`로 변경 가능.

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
  - `billing_cycle`(1회성/매월/매년), `contract_end_date`(약정 종료일, 선택), `cancel_url`(공식 해지 링크, 선택), `is_cancelled`(해지 완료 여부) — 피그마 상세 화면에 맞춰 추가한 필드. `is_cancelled=True`인 항목은 `generate_due_notifications`가 건너뛰어서 해지 완료해도 만료 전 알림이 계속 오는 일은 없음
- **`apps/notifications`** — 알림
  - 인앱 알림 목록/읽음 처리(`GET /`, `POST /{id}/read/`, `POST /read-all/`)
  - 푸시 알림 설정 저장(`GET/PATCH /settings/`) — 실제 푸시 발송(FCM/APNs)은 미구현, 설정값만 저장
  - `generate_due_notifications()` 서비스 + `manage.py generate_notifications` 관리 명령어 — 매일 1회 도는 걸 전제로 만듦
- **`apps/core`** — 헬스체크(`health/`) + `manage.py runscheduler`(알림 생성/토큰 정리/구독 갱신 스케줄러, 아래 참고)
- **`apps/billing`** — 요금제 구독/결제(무료/베이직/프로, 토스페이먼츠 자동결제, 아래 "결제/구독" 참고)
- **`apps/support`** — 설정 화면의 "도움말 및 문의"에서 보낸 1:1 문의 저장(`POST /support/inquiries/`) + 관리자에게 알림 메일 발송(문의는 반드시 저장되어야 해서, 메일 발송 실패는 삼키고 로깅만 함)
- **`apps/items`의 `CalendarNote`** — 일정 화면 달력에서 날짜별로 남기는 자유 메모(등록된 항목과 무관, 날짜당 1개). `GET/PUT/DELETE /items/calendar/notes/...`

백엔드 테스트 149개, 커버리지 95%대.

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

### 알림 생성/토큰 정리/구독 갱신 스케줄러

배포 플랫폼이 아직 정해지지 않아 시스템 cron에 의존하는 대신, `apps/core/management/commands/runscheduler.py`가 [APScheduler](https://apscheduler.readthedocs.io/)로 `renew_subscriptions`(매일 08:00)·`generate_notifications`(매일 09:00)·`flushexpiredtokens`(매주 월요일 03:00)를 프로세스 안에서 직접 스케줄링합니다 — `runserver`와는 별개의 독립 프로세스로 띄우면 되고, Docker 별도 서비스든 systemd든 `nohup ... &`든 배포 플랫폼과 무관하게 동일하게 동작합니다. 나중에 배포 플랫폼이 자체 cron 기능을 제공하면 이 워커 대신 그걸 써도 됩니다(관리 명령어 자체는 그대로 재사용).

**아직 안 한 것**: 실제 푸시 발송(FCM/APNs)은 모바일 스택이 정해져야 시작 가능. `runscheduler`가 실제 프로덕션에서 잘 도는지는 배포 이후에나 확인 가능(로컬에서 기동/정상 시작 로그까지만 확인함).

### 결제/구독 (토스페이먼츠 자동결제)

3단계 요금제(무료/베이직/프로)를 [토스페이먼츠 자동결제(빌링)](https://docs.tosspayments.com/guides/v2/billing/integration)로 연동했습니다. 카카오 로그인과 같은 원칙을 그대로 적용 — 시크릿 키가 필요한 작업(빌링키 발급, 결제 승인)은 전부 백엔드에서 하고, 프론트는 공개 키(`TOSS_CLIENT_KEY`)와 1회용 인증 코드(`authKey`)만 다룹니다.

- **요금제**: 무료 0원(항목 5개) / 베이직 월 4,900원(15개) / 프로 월 9,900원(무제한). 처음엔 무료+프리미엄(2,900원) 2단계였는데, 가격이 너무 낮고 중간 단계가 없다는 피드백으로 3단계로 재설계함
- 흐름(신규 구독): 설정>요금제 탭에서 베이직/프로 카드의 "시작하기" → 프론트가 토스 SDK로 카드 등록 결제창을 띄움(`requestBillingAuth`, successUrl에 `?plan=` 쿼리로 어떤 플랜인지 실어 보냄) → 성공 시 `authKey`와 함께 `/billing/success`로 리다이렉트 → `BillingSuccessPage`가 `authKey`+`plan`을 백엔드 `/billing/subscribe/`에 전달 → 백엔드가 빌링키를 발급받고 즉시 첫 결제를 승인해 해당 플랜으로 전환
- 흐름(베이직↔프로 전환): 이미 카드가 등록된 유료 구독자는 `/billing/change-plan/`으로 카드 재등록 없이 즉시 플랜만 바뀜(일할 정산 없음 — 다음 결제부터 새 금액 청구, `apps.billing.services.subscription.change_plan()`)
- 상태 모델: `Subscription.Plan`(FREE/BASIC/PRO) × `Subscription.Status`(ACTIVE/CANCELED) 조합. 해지해도 이미 낸 결제 주기(`current_period_end`)까지는 지금 플랜 유지, 갱신 결제 실패 시 카드 정보(`billing_key`)는 남겨두고 바로 무료로 전환(재구독 시 카드 재등록 불필요)
- 토스 API 호출은 느린 외부 요청이라 DB 트랜잭션으로 감싸지 않고, 각 단계(빌링키 저장, 결제 기록)를 작은 단위로 바로 커밋 — 자세한 이유는 `apps/billing/services/subscription.py` 모듈 docstring 참고
- 매일 갱신 청구는 위 "알림 생성/토큰 정리/구독 갱신 스케줄러"의 `renew_subscriptions`가 처리(플랜별로 다른 금액을 그 플랜 가격대로 청구)
- **플랜별 항목 개수 제한을 실제로 구현**: 피그마 요금제 카드가 "항목 5개"를 광고하는데 그동안 백엔드에 그 제한을 거는 코드가 전혀 없어서(어떤 플랜이든 몇 개를 등록해도 안 막힘) 광고와 실제가 어긋나 있었음. `apps.billing.services.PLAN_ITEM_LIMIT`(무료 5/베이직 15/프로 None=무제한)을 기준으로 `ExpiryItemListCreateView.perform_create`에서 등록 전 개수를 세서 초과 시 400 에러로 막음 — 에러 메시지도 지금 플랜에 맞는 업그레이드 안내(`describe_item_limit()`)를 그대로 보여줌. `SubscriptionSerializer`에 `item_count`/`item_limit`도 추가해서 사이드바 하단 "베이직 · N/15개 사용" 같은 표시와 요금제 카드 카피가 전부 이 실제 값을 씀

**API 키 관련 삽질**: 토스 개발자센터 API 키 화면에 "결제위젯 연동 키"(`test_gck_...`)와 "API 개별 연동 키"(`test_ck_...`) 두 종류가 있는데, 자동결제(빌링) API는 후자만 지원합니다. 처음 문서 예제 키(`test_gck_docs_...`, 위젯용)로 시도했다가 `TossPayments()` SDK가 명확한 에러 메시지로 알려줘서 바로 잡았습니다. 카드 등록 테스트 시 카드번호는 실제 존재하는 BIN(앞 6~8자리)이어야 통과합니다 — 임의의 번호(`4330-0000-...`)는 `NOT_SUPPORTED_CARD_TYPE`로 거절되고, 실제 카드사 BIN(예: 현대카드 `9490-1907`)을 쓰면 통과합니다.

**아직 안 한 것**: 실제 서비스에 적용할 운영(live) 키는 사업자 등록 심사가 필요해서 미발급 — 지금은 테스트 키로만 검증. 배포 확정 시 운영 키로 교체 필요.

**초기 배포는 무료 플랜만 오픈**: 사업자 등록 전이라 운영 키 자체를 발급받을 수 없어서, 실제 배포 시점엔 유료 구독 신규 가입을 막기로 함. `frontend/src/pages/SettingsPage.tsx`의 `PricingTab`에서 베이직/프로 카드의 "시작하기" 버튼(`handleSubscribe` 트리거)만 주석 처리하고 클릭 불가능한 "준비 중" 버튼으로 대체(`TODO: 사업자 등록 완료 후 되돌리기` 주석 남겨둠). 백엔드(`apps/billing`)는 손대지 않음 — 테스트 키만 있어 어차피 실제 결제가 불가능하고, 코드를 건드리면 billing 테스트 4개 파일이 깨질 위험이 커서 그대로 둠. 사업자 등록이 끝나면 위 주석을 풀고 토스 운영 키만 교체하면 됨.

### 이메일 발송 (Gmail SMTP)

회원가입 인증/비밀번호 재설정 메일의 실제 발송을 Gmail SMTP로 연동했습니다. 메일 발송 코드(`apps/accounts/services/email.py`)는 원래부터 Django 표준 `send_mail()`을 쓰고 있어서 새 코드는 필요 없었고, `EMAIL_BACKEND`를 콘솔 백엔드에서 `django.core.mail.backends.smtp.EmailBackend`로 바꾸고 `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD`(Google 계정의 앱 비밀번호, 일반 로그인 비밀번호 아님)만 채우면 끝나는 설정 문제였습니다.

- Gmail은 인증된 계정과 다른 주소로 발신하는 걸 거부하므로 `DEFAULT_FROM_EMAIL`도 `EMAIL_HOST_USER`와 같은 Gmail 주소로 맞춰야 함
- 실제 계정으로 회원가입(인증 메일)과 비밀번호 재설정(재설정 메일) 둘 다 라이브로 발송·수신 확인 완료

**아직 안 한 것**: Gmail SMTP는 일일 발송량 제한(약 500통)이 있어 사용자가 많아지면 전용 이메일 서비스(SendGrid/Resend/AWS SES 등)로 교체가 필요할 수 있음 — 지금은 `EMAIL_BACKEND`/`EMAIL_HOST` 등이 전부 env var라 서비스 교체 시에도 코드 변경 없이 설정만 바꾸면 됨.

### 프론트엔드 — 백엔드 API 연동 사실상 전 영역 완료

Vite+React+TS, 라우팅(`react-router-dom`), TanStack Query(서버 상태), React Hook Form+Zod(폼), Recharts(차트), date-fns(달력). 인증 컨텍스트(`AuthContext`)와 axios 인스턴스(`lib/api.ts`, 401 시 자동 refresh)를 기반으로 화면마다 `features/<domain>/{api.ts,hooks.ts}` 얇은 레이어를 두는 패턴을 씀.

- **인증** — 로그인/회원가입/로그아웃/비밀번호 재설정(요청+확인)/이메일 인증/카카오 로그인까지 전부 연결. 카카오 로그인은 실제 계정으로 끝까지(리다이렉트 → 코드 → 토큰 교환 → 유저 생성 → 대시보드 진입) 검증 완료 — 그 과정에서 카카오 닉네임을 못 읽어와 이름이 "카카오 사용자"로 저장되던 버그(`kakao_account.profile.nickname` 대신 `properties.nickname`에 오는 케이스를 놓침)와, 가입 경로(이메일/카카오/구글)를 구분할 `User.signup_source` 필드 부재도 같이 발견해서 고침. 로그인/회원가입은 피그마의 스플릿 히어로 레이아웃(`AuthLayout`)으로 재구성
- **항목(items)** — 등록/수정(`ItemFormPage`, 폼 하나로 겸용)/상세/삭제(`ItemDetailPage`) 전부 연결. 항목 등록 완료 시 확인 모달(요약 + "일정 보기"/"대시보드로")을 보여줌. 피그마 "항목 추가"/"상세" 프레임에 맞춰 재구성 완료 — 추가 화면은 2단 레이아웃(기본 정보 카드 + 등록 팁 패널)에 알림 시점 칩 선택(7일 전/3일 전/당일), 상세 화면은 다크 히어로 카드(아바타+D-day 배지+다음 결제/예정 금액/알림 3열 통계) + 계약 정보/메모 2단 카드로 교체, 해지 완료 토글도 추가(실패 시 에러 메시지 표시)
- **Dashboard** — 아이콘 배지 통계 카드 3개(이번 달 예정 금액/7일 이내 만료/등록 항목, 전부 실제 데이터), 임박 항목 목록, 이번 달 미니 캘린더(일정 있는 날짜 점 표시), "이번 달 확인할 항목" 알림 카드(가장 임박한 항목 기준)
- **Schedule** — 카드형 월별 달력 + "이번 달 일정" 사이드 목록, 카테고리 필터 칩(전체/구독/계약 등, 실제 개수), 항목 클릭 시 상세 미리보기 드로어, **날짜 클릭 시 자유 메모 추가/수정/삭제**(저장된 메모는 먼저 읽기 전용으로 보여주고 "수정"을 눌러야 편집 가능 — 빈 입력창과 헷갈리지 않게)
- **Stats** — "지출 통계"로 재구성: 요약 카드 3개(이번 달 고정비/다음 달 예정 금액/만료된 항목), 이번 달을 강조 표시하는 월별 고정비 막대그래프, 카테고리별 지출(개수 아닌 실제 금액 기준 막대) — 색상은 `dataviz` 스킬 절차 그대로 따르고 검증함
- **Notifications** — 전체/읽지 않음 필터, 개별·전체 읽음 처리(`GET /notifications/`, `POST .../read/`, `POST read-all/`)
- **Settings** — 탭 레이아웃(프로필/알림/문의/**요금제**/보안)으로 재구성. 프로필 탭엔 이름 이니셜 아바타, 보안 탭엔 비밀번호 변경 + 계정 탈퇴, 알림 탭엔 iOS 스타일 토글, 문의 탭엔 1:1 문의 작성 폼(`apps.support` 연동)
- **결제/구독(요금제)** — 독립 `/pricing` 페이지였던 걸 피그마와 맞춰 설정 화면의 탭으로 옮김(`/pricing`은 `/settings?tab=pricing`으로 리다이렉트, 링크 하위호환 유지). 무료/베이직/프로 3장 카드(무료만 흰 배경+테두리, 나머지 둘은 다크 네이비, 현재 플랜 카드만 브랜드색 테두리로 강조), 카드 등록(토스 결제창)/베이직↔프로 전환(카드 재등록 없이 즉시)/해지/결제 내역 전부 연결. 기능 카피는 실제로 구현된 차이만 적음(항목 개수 상한만 플랜별로 다르고, 알림/캘린더/통계는 전 플랜 동일) — 예전엔 "맞춤 알림"/"우선 고객 지원"처럼 실제로 플랜별 차이가 없는 카피가 있었는데 제거함. 실제 테스트 계정으로 카드 등록 → 결제 → 플랜 전환 → 해지까지 검증 완료
- **사이드바** — 피그마의 모든 WEB 프레임은 사이드바 항목이 정확히 5개(대시보드/일정/항목 추가/통계/설정)뿐이라, 중복이던 "요금제" 항목은 제거(설정 탭으로 흡수). "알림"은 피그마에 진입점 자체가 없었지만(설계 누락으로 보임) 실제 기능이라 제거하지 않고 유지하기로 결정 — 사이드바 하단은 이제 "무료 플랜 · N/5개 사용"처럼 실제 사용량을 보여줌(예전엔 이 수치가 뒷받침할 제한이 없어 계획/이름만 표시하던 걸, 5개 제한을 실제로 구현하면서 되살림)
- **인증 보조 화면** — 비밀번호 찾기/재설정/이메일 인증 화면을 로그인·회원가입과 같은 `AuthLayout`(스플릿 히어로)으로 통일. 이 세 화면은 피그마에 대응하는 WEB 프레임이 없고(모바일 AUTH 04/05만 있는데, AUTH 04는 6자리 인증번호 입력 방식이라 uid+token 링크 방식인 우리 백엔드와 흐름 자체가 달라 그대로 못 씀) 일관성 차원의 리스타일임
- **디자인 시스템** — 피그마 "전체 UI 예시" 파일에서 실측한 값(사이드바 `#22243B`, 활성 메뉴 `#343755`, 브랜드 컬러 `#635BFF`, Noto Sans KR 폰트, 카드 radius/shadow 등)을 `index.css`의 Tailwind v4 `@theme` 토큰으로 반영. 공용 컴포넌트(`Modal`/`ConfirmDialog`/`Drawer`/`Toggle`/`SectionCard`, 인라인 SVG 아이콘 세트) 신설. 사이드바를 확인 없이 바로 실행되던 로그아웃, `window.confirm()`을 쓰던 삭제/탈퇴/구독해지 확인을 전부 `ConfirmDialog`로 교체

## 완료된 것 (계속) — 배포 준비 (Docker + Oracle Cloud 프리티어)

배포 인프라 자체(VM/도메인)는 아직 사용자가 준비해야 하지만, 리포 쪽 배포 설정은 끝났습니다. 상세 절차는 [`docs/deployment.md`](deployment.md).

- **`backend/Dockerfile`** — uv로 의존성 설치 + `collectstatic`까지 끝낸 이미지. `backend/docker/entrypoint.sh`가 Postgres 연결을 기다렸다가 마이그레이션(웹 서비스만) 후 원래 CMD(gunicorn 또는 `runscheduler`)를 실행
- **`docker-compose.prod.yml`**(리포 루트) — `db`(Postgres)/`redis`/`backend`(gunicorn)/`scheduler`(`runscheduler`)/`caddy`(TLS 리버스 프록시, Let's Encrypt 자동 발급) 5개 컨테이너. `Caddyfile.example`을 `Caddyfile`로 복사해 도메인만 채우면 됨
- **정적 파일**: WhiteNoise 미들웨어 추가(`STATIC_ROOT`/`STORAGES`, `config/settings/base.py`) — nginx 없이 gunicorn 프로세스가 직접 서빙
- **Rate limiting 캐시를 Redis로 교체**: `config/settings/prod.py`에 `django_redis` 기반 `CACHES` 추가 — 기존 "아직 안 한 것"(멀티 워커 환경에서 카운트가 워커별로 따로 쌓이던 문제)이 해결됨
- **HTTPS 하드닝 활성화**: `SECURE_SSL_REDIRECT`/`SECURE_HSTS_*`/`SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE`를 `prod.py`에서 기본 켜짐으로 설정(전부 env var로 개별 오버라이드 가능) — 이전 TODO였던 "실제 배포 전 HTTPS 하드닝 켜기" 항목 해결
- **로컬 Docker Desktop으로 전체 스택 실제 기동 검증 완료**: `db`/`redis`/`backend`/`scheduler` 컨테이너를 올려서 마이그레이션 자동 실행, `/api/v1/health/` 200 응답, 정적 파일(`/static/admin/...`) 200 응답, Redis 캐시 왕복까지 확인함(검증용 컨테이너/파일은 작업 후 정리함 — `Caddyfile`이 없어 TLS는 로컬에서 검증 못 함, 실제 도메인 확보 후 서버에서 확인 필요)

**아직 안 한 것**: Oracle Cloud 계정 가입/VM 생성/도메인 연결은 사용자가 직접 해야 함(계정 생성이라 대행 불가). 이후 카카오 디벨로퍼스 도메인 등록, 토스페이먼츠 운영 키 교체는 여전히 남음(아래 "남은 작업" 참고).

## 남은 작업

우선순위 순서 제안:

1. **모바일 앱** — 스택 자체가 미정
2. **배포 인프라** — 리포 쪽 준비(Docker/Compose/HTTPS 하드닝/Redis 캐시)는 끝남(위 참고). 남은 건 전부 사용자가 직접 해야 하는 계정/인프라 작업: Oracle Cloud 가입 및 VM 생성, 도메인 연결, `docs/deployment.md` 절차대로 실제 배포. 오라클 프리티어 홈 리전을 한국으로 잡으면 Ampere A1(ARM) 무료 셰이프가 용량 부족(Out of Capacity)으로 자주 막히는 이슈가 있어 도쿄/오사카/싱가포르 등 여유 있는 인접 리전으로 가입하는 걸 권장(지연시간 차이는 미미). 프론트엔드는 백엔드와 별도로 Vercel/Netlify/Cloudflare Pages 등 정적 호스팅에 무료 배포(`docs/deployment.md`의 "프론트엔드는?" 참고). 그 다음 카카오 디벨로퍼스에 배포 도메인을 Web 플랫폼/Redirect URI로 추가 등록. 토스페이먼츠는 **사업자 등록 전까지는 무료 플랜만 오픈**(위 "결제/구독" 참고) — 사업자 등록 완료 후 운영 키 발급받아 교체 + 프론트 주석 되돌리기. Gmail SMTP는 사용자가 많아지면 전용 이메일 서비스로 교체 검토(위 "이메일 발송" 참고)
3. **실제 푸시 발송(FCM/APNs)** — 모바일 스택 확정 후. 알림 생성 자체(크론 스케줄링 포함)는 이미 끝남
4. **UI 디자인 미세 조정** — 피그마 대비 1차 반영은 끝났음(로그인/회원가입/대시보드/일정/통계/설정/요금제/항목 추가·상세/비밀번호 찾기·재설정/이메일 인증 전부 재구성 또는 확인 완료). 남은 후보:
   - **알림 목록 화면**: 피그마에 대응하는 WEB 프레임 자체가 없음(모바일 "알림 설정" 토글 화면뿐, 목록 아님) — Figma 매칭이 아니라 다른 화면과 카드/그림자/radius를 맞추는 일반 디자인 일관성 작업으로 처리해야 함. 아직 안 함
   - 항목 추가 폼의 약정 종료일/금액 값에 대한 교차 검증(예: 약정 종료일이 다음 결제일보다 빠른 경우 등)은 아직 안 막혀 있음 — 우선순위 낮음으로 보류 중
5. **출시 이후로 명시적으로 미룬 것** (지금 안 해도 됨): Google 소셜 로그인, 가족 공유 기능

카카오 로그인·결제/구독·이메일 발송·문의·날짜별 메모 포함 프론트엔드-백엔드 연동은 전부 끝났고, 실제 계정/테스트 키로 검증까지 완료됐습니다 — 위 "완료된 것" 각 절 참고.

## 다음 세션에서 이어가려면

1. `git log --oneline -20`으로 최근 커밋 히스토리 확인, `README.md`의 "개발 현황" 체크리스트로 기획 대비 위치 확인
2. "남은 작업"이 전부 사용자 쪽 외부 결정(배포 플랫폼, 모바일 스택)이거나 UI 미세 조정이라, 다음 세션 시작할 때 어느 걸 먼저 할지 사용자에게 확인부터 하는 걸 추천
3. 로컬 실행: `scripts/dev.sh`로 백엔드+프론트를 한 번에 띄우거나, `backend/README.md`/`frontend/README.md`의 "로컬 개발 환경 설정" 참고해 따로 실행 (둘 다 `.envs/.env.dev`를 로컬에 직접 만들어야 함 — git에 없음, 카카오 로그인 테스트하려면 `VITE_KAKAO_JS_KEY`/`KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET`, 결제 테스트하려면 `VITE_TOSS_CLIENT_KEY`/`TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`, 실제 이메일 발송을 테스트하려면 `EMAIL_BACKEND`를 SMTP로 바꾸고 `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD`도 필요)
4. 피그마 원본: 루트 `README.md`의 "디자인" 절에 링크된 Figma 파일 — UI를 더 다듬을 땐 해당 화면 프레임을 직접 열어서 실측(크기/색상/여백)하고 반영하는 방식으로 진행함(대시보드/로그인/설정 작업 때 이 방식으로 정확도를 크게 높임)
