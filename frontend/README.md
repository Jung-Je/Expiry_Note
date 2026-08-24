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
   ```

   `VITE_API_BASE_URL`이 실행 중인 백엔드 주소를 가리키는지 확인하세요. 카카오 로그인 버튼을 안 쓸 거면 `VITE_KAKAO_JS_KEY`는 비워둬도 되지만, 그 경우 로그인 화면의 "카카오로 로그인" 버튼은 에러를 띄웁니다.

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
│   ├── items/                  # 만료 항목 CRUD, 통계, 캘린더 API/훅
│   │   ├── api.ts
│   │   ├── constants.ts          # 카테고리/상태 라벨·배지 스타일
│   │   ├── format.ts             # 금액/D-day 포맷
│   │   └── hooks.ts
│   └── notifications/          # 인앱 알림·알림 설정 API/훅
│       ├── api.ts
│       └── hooks.ts
├── components/
│   └── layout/
│       └── AppLayout.tsx      # 로그인 후 공통 사이드바 셸
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
    ├── SettingsPage.tsx
    └── PricingPage.tsx
```

로그인/회원가입/비밀번호 재설정/이메일 인증/카카오 로그인, 항목 CRUD, 대시보드, 일정, 통계, 알림, 설정 화면이 전부 백엔드 API와 연결돼 있습니다. `PricingPage`만 아직 자리표시자입니다(결제 연동 전이라 백엔드에 API 자체가 없음).

## 인증 방식

- 백엔드가 발급하는 JWT(access/refresh)를 사용합니다.
- **access token**은 메모리에만 보관합니다 (`features/auth/tokenStorage.ts`의 모듈 변수 — React state가 아니라 axios 인터셉터에서도 동기적으로 읽을 수 있게 일부러 평범한 변수로 둠). 새로고침하면 사라지므로, `AuthProvider` 마운트 시 refresh 쿠키로 조용히 재발급받아 채웁니다.
- **refresh token**은 JS가 아예 접근할 수 없는 httpOnly 쿠키로만 오갑니다 — 로그인/재발급/카카오 로그인 응답이 `Set-Cookie`로 심어주고, 프론트는 값을 직접 다루지 않습니다. 두 토큰을 전부 `localStorage`에 저장하던 이전 방식은 XSS 한 번으로 refresh token(수명이 훨씬 긺)까지 같이 탈취될 수 있었습니다.
- 쿠키가 오가려면 axios 인스턴스에 `withCredentials: true`가 필요합니다 (`lib/api.ts`) — 백엔드도 `CORS_ALLOW_CREDENTIALS=True`로 맞춰져 있습니다.
- access token 만료(401) 시 `lib/api.ts`의 axios 인터셉터가 `refreshAccessToken()`으로 자동 재발급 후 원래 요청을 재시도합니다. 이 함수는 `AuthProvider`의 초기 로드 시에도 재사용됩니다.
- 로그아웃(`features/auth/api.ts`의 `logout()`)은 백엔드 `/auth/logout/`을 호출해 refresh token을 블랙리스트 처리하고 쿠키를 지웁니다 — 클라이언트 쪽에서 httpOnly 쿠키를 직접 지울 방법이 없으므로 반드시 서버 응답을 거쳐야 합니다.
- **카카오 로그인**은 `features/auth/kakao.ts`가 카카오 JS SDK를 동적으로 로드하고 `Kakao.Auth.authorize()`로 카카오 동의 화면으로 리다이렉트합니다. 카카오가 `/auth/kakao/callback?code=...`로 되돌려주면 `KakaoCallbackPage`가 그 인가 코드를 백엔드 `/auth/kakao/login/`에 그대로 전달합니다 — **access_token 교환은 프론트가 하지 않습니다.** client_secret이 필요할 수 있는 값이라 반드시 백엔드에서 처리해야 하기 때문입니다(`backend/apps/accounts/services/kakao.py`). `VITE_KAKAO_JS_KEY`가 없으면 로그인 버튼이 에러를 띄웁니다.
