# 만료노트 웹 프론트엔드

Vite + React + TypeScript 기반 SPA입니다. 백엔드(Django + DRF)와는 완전히 분리되어, REST API로만 통신합니다.

## 스택

- Vite, React 19, TypeScript
- Tailwind CSS — 스타일링
- React Router — 라우팅
- TanStack Query — 서버 상태(API 데이터) 캐싱
- React Hook Form + Zod — 폼 상태 및 검증
- Recharts — 통계 화면 차트
- date-fns — 날짜 계산 (캘린더 등)

## 로컬 개발 환경 설정

1. 백엔드가 먼저 실행 중이어야 합니다. [backend/README.md](../backend/README.md) 참고.
2. 의존성 설치

   ```bash
   npm install
   ```

3. 환경 변수 파일 `.envs/.env.dev`를 직접 만듭니다 (git에 커밋되지 않으므로 로컬에 새로 생성해야 합니다).

   ```bash
   mkdir -p .envs
   ```

   `.envs/.env.dev`:

   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1

   # 카카오 로그인용 JavaScript 키(카카오 디벨로퍼스 > 내 애플리케이션 >
   # 앱 설정 > 앱 키 > JavaScript 키). 같은 화면에서 이 도메인
   # (http://localhost:5173)을 "Web 플랫폼 사이트 도메인"으로, 아래 콜백
   # 경로를 "카카오 로그인 > Redirect URI"로도 등록해둬야 로컬에서 동작한다.
   VITE_KAKAO_JS_KEY=<카카오 JavaScript 키>

   # 유료 플랜(베이직/프로) 구독 결제(토스페이먼츠 자동결제)용 클라이언트 키. 개발자센터
   # > 내 개발자센터 > API 키의 "API 개별 연동 키" 클라이언트 키를 쓴다 —
   # "결제위젯 연동 키"는 자동결제 API를 지원하지 않으니 주의. 시크릿
   # 키는 절대 여기 넣지 않는다(백엔드 backend/.envs/.env.dev 전용).
   VITE_TOSS_CLIENT_KEY=<토스페이먼츠 API 개별 연동 클라이언트 키>
   ```

   `VITE_API_BASE_URL`이 실행 중인 백엔드 주소를 가리키는지 확인하세요. 카카오 로그인 버튼을 안 쓸 거면 `VITE_KAKAO_JS_KEY`는, 요금제 페이지의 구독 버튼을 안 쓸 거면 `VITE_TOSS_CLIENT_KEY`는 비워둬도 되지만, 그 경우 해당 버튼은 에러를 띄웁니다.

4. 개발 서버 실행

   ```bash
   npm run dev
   ```

   `http://localhost:5173`에서 확인할 수 있습니다. (`npm run dev`는 내부적으로 `vite --mode dev`를 실행해 `.envs/.env.dev`를 읽습니다.)

## 자주 쓰는 명령어

```bash
npm run dev       # 개발 서버 (HMR)
npm run build     # 타입 체크 + 프로덕션 빌드 (.envs/.env.prod 사용 — 없으면 VITE_API_BASE_URL을 담아 직접 생성)
npm run lint      # oxlint
npm run test      # vitest
npm run preview   # 빌드 결과 미리보기
```

저장소 루트의 `scripts/check-all.sh`가 백엔드 체크에 이어 프론트엔드 린트(`npm run lint`)까지 한 번에 돌려줍니다. `npm run test`는 더 오래 걸려서 `check-all.sh`에는 포함되지 않으니 `frontend/`에서 직접 실행하세요. 같은 체크는 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)을 통해 push/PR마다 자동으로도 실행됩니다.

## 프로젝트 구조

```
src/
├── App.tsx                  # 라우터 + Provider 구성
├── main.tsx
├── index.css                 # Tailwind import
├── lib/
│   └── api.ts                 # axios 인스턴스, 401 시 자동 토큰 재발급
├── features/
│   ├── auth/                  # 로그인/회원가입/카카오 로그인/토큰 관리
│   │   ├── api.ts
│   │   ├── context.ts
│   │   ├── AuthContext.tsx
│   │   ├── useAuth.ts
│   │   ├── ProtectedRoute.tsx
│   │   ├── tokenStorage.ts
│   │   └── kakao.ts             # 카카오 JS SDK 로드 + Auth.authorize() 트리거
│   ├── items/                  # 만료 항목 CRUD, 통계, 캘린더/날짜별 메모 API/훅
│   │   ├── api.ts
│   │   ├── constants.ts          # 카테고리/상태/결제 주기/알림 시점 라벨·배지 스타일
│   │   ├── format.ts             # 금액/D-day 포맷
│   │   └── hooks.ts
│   ├── notifications/          # 인앱 알림·알림 설정 API/훅
│   │   ├── api.ts
│   │   └── hooks.ts
│   ├── support/                # 설정 > 문의 탭 1:1 문의 API/훅
│   │   ├── api.ts
│   │   └── hooks.ts
│   └── billing/                # 요금제 구독/결제(토스페이먼츠 자동결제) API/훅
│       ├── api.ts
│       ├── hooks.ts
│       └── toss.ts               # 토스 SDK 로드 + requestBillingAuth() 트리거
├── components/
│   ├── icons.tsx               # 인라인 SVG 아이콘 세트
│   ├── layout/
│   │   ├── AppLayout.tsx        # 로그인 후 공통 사이드바 셸
│   │   └── AuthLayout.tsx       # 로그인/회원가입 등 인증 화면 스플릿 히어로 셸
│   └── ui/                     # Modal/ConfirmDialog/Drawer/Toggle 등 공용 컴포넌트
└── pages/                     # 화면 단위 (Figma 화면 구성 기준)
    ├── auth/
    │   ├── LoginPage.tsx
    │   ├── SignupPage.tsx
    │   ├── ForgotPasswordPage.tsx    # 비밀번호 재설정 요청
    │   ├── ResetPasswordPage.tsx     # 비밀번호 재설정 확인 (이메일 링크)
    │   ├── VerifyEmailPage.tsx       # 이메일 인증 확인 (이메일 링크)
    │   └── KakaoCallbackPage.tsx     # 카카오 로그인 콜백(/auth/kakao/callback)
    ├── DashboardPage.tsx
    ├── SchedulePage.tsx
    ├── ItemFormPage.tsx              # 등록(/items/new)·수정(/items/:id/edit) 겸용
    ├── ItemDetailPage.tsx
    ├── StatsPage.tsx
    ├── NotificationsPage.tsx
    ├── SettingsPage.tsx               # 프로필/알림/문의/요금제/보안 탭 (요금제는 /pricing에서 이 페이지로 통합됨)
    └── billing/
        ├── BillingSuccessPage.tsx    # 토스 카드 등록 성공 콜백(/billing/success)
        └── BillingFailPage.tsx       # 토스 카드 등록 실패 콜백(/billing/fail)
```

로그인/회원가입/비밀번호 재설정/이메일 인증/카카오 로그인, 항목 CRUD, 대시보드, 일정, 통계, 알림, 설정(요금제/구독 포함), 문의 화면이 전부 백엔드 API와 연결돼 있습니다.

## 인증 방식

- 백엔드가 발급하는 JWT(access/refresh)를 사용합니다.
- **access token**은 메모리에만 보관합니다 (`features/auth/tokenStorage.ts`의 모듈 변수 — React state가 아니라 axios 인터셉터에서도 동기적으로 읽을 수 있게 일부러 평범한 변수로 둠). 새로고침하면 사라지므로, `AuthProvider` 마운트 시 refresh 쿠키로 조용히 재발급받아 채웁니다.
- **refresh token**은 JS가 아예 접근할 수 없는 httpOnly 쿠키로만 오갑니다 — 로그인/재발급/카카오 로그인 응답이 `Set-Cookie`로 심어주고, 프론트는 값을 직접 다루지 않습니다. 두 토큰을 전부 `localStorage`에 저장하던 이전 방식은 XSS 한 번으로 refresh token(수명이 훨씬 긺)까지 같이 탈취될 수 있었습니다.
- 쿠키가 오가려면 axios 인스턴스에 `withCredentials: true`가 필요합니다 (`lib/api.ts`) — 백엔드도 `CORS_ALLOW_CREDENTIALS=True`로 맞춰져 있습니다.
- access token 만료(401) 시 `lib/api.ts`의 axios 인터셉터가 `refreshAccessToken()`으로 자동 재발급 후 원래 요청을 재시도합니다. 이 함수는 `AuthProvider`의 초기 로드 시에도 재사용됩니다.
- 로그아웃(`features/auth/api.ts`의 `logout()`)은 백엔드 `/auth/logout/`을 호출해 refresh token을 블랙리스트 처리하고 쿠키를 지웁니다 — 클라이언트 쪽에서 httpOnly 쿠키를 직접 지울 방법이 없으므로 반드시 서버 응답을 거쳐야 합니다.
- **카카오 로그인**은 `features/auth/kakao.ts`가 카카오 JS SDK를 동적으로 로드하고 `Kakao.Auth.authorize()`로 카카오 동의 화면으로 리다이렉트합니다. 카카오가 `/auth/kakao/callback?code=...`로 되돌려주면 `KakaoCallbackPage`가 그 인가 코드를 백엔드 `/auth/kakao/login/`에 그대로 전달합니다 — **access_token 교환은 프론트가 하지 않습니다.** client_secret이 필요할 수 있는 값이라 반드시 백엔드에서 처리해야 하기 때문입니다(`backend/apps/accounts/services/kakao.py`). `VITE_KAKAO_JS_KEY`가 없으면 로그인 버튼이 에러를 띄웁니다.

## 구독/결제

무료/베이직/프로 3단계 요금제는 `SettingsPage`의 "요금제" 탭(`/settings?tab=pricing` — 예전 `/pricing` 경로는 이 URL로 리다이렉트됨)에서 관리합니다. 플랜별 가격/항목 개수 카피는 백엔드 `apps/billing/services/subscription.py`의 `PLAN_MONTHLY_AMOUNT`/`PLAN_ITEM_LIMIT` 값을 그대로 옮겨 적은 것이라, 값을 바꾸면 프론트도 같이 바꿔야 합니다.

- **신규 구독(무료 → 베이직/프로)**: 베이직·프로 카드의 "시작하기"가 `features/billing/toss.ts`로 토스페이먼츠 SDK를 동적 로드하고 `payment.requestBillingAuth()`로 카드 등록 결제창을 띄웁니다. successUrl에 어떤 플랜을 구독하려던 건지 `?plan=` 쿼리로 실어 보내고, 토스가 그 위에 `authKey`를 붙여 `/billing/success?plan=...&authKey=...`로 되돌려줍니다(실패/취소는 `/billing/fail?code=...&message=...`). `BillingSuccessPage`가 `authKey`/`plan`을 백엔드 `/billing/subscribe/`에 그대로 전달합니다 — **빌링키 교환과 결제 승인은 프론트가 하지 않습니다.** 시크릿 키가 필요한 작업이라 반드시 백엔드에서 처리해야 하기 때문입니다(`backend/apps/billing/services/toss.py`). `VITE_TOSS_CLIENT_KEY`가 없으면 구독 버튼이 에러를 띄웁니다.
- **베이직 ↔ 프로 전환**: 이미 카드가 등록된 유료 구독자가 다른 유료 카드의 "이 플랜으로 변경"을 누르면 카드 재등록/토스 결제창 없이 백엔드 `/billing/change-plan/`을 바로 호출해 즉시 전환됩니다.
- **해지**: "구독 해지" → 확인 다이얼로그 → `/billing/cancel/`. 이미 낸 결제 주기가 끝날 때까지는 지금 플랜이 유지됩니다.
