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
   ```

   `VITE_API_BASE_URL`이 실행 중인 백엔드 주소를 가리키는지 확인하세요.

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
│   └── auth/                  # 로그인/회원가입/토큰 관리
│       ├── api.ts
│       ├── context.ts
│       ├── AuthContext.tsx
│       ├── useAuth.ts
│       ├── ProtectedRoute.tsx
│       └── tokenStorage.ts
├── components/
│   └── layout/
│       └── AppLayout.tsx      # 로그인 후 공통 사이드바 셸
└── pages/                     # 화면 단위 (Figma 화면 구성 기준)
    ├── auth/
    │   ├── LoginPage.tsx
    │   └── SignupPage.tsx
    ├── DashboardPage.tsx
    ├── SchedulePage.tsx
    ├── ItemFormPage.tsx
    ├── ItemDetailPage.tsx
    ├── StatsPage.tsx
    ├── SettingsPage.tsx
    └── PricingPage.tsx
```

`auth`(로그인/회원가입)는 백엔드 API와 실제로 연결된 상태입니다. 나머지 화면은 Figma 화면 구성에 맞춘 라우팅만 잡아둔 자리표시자(placeholder)이며, 각 도메인 API가 준비되는 대로 채워 나갑니다.

## 인증 방식

- 백엔드가 발급하는 JWT(access/refresh)를 사용합니다.
- **access token**은 메모리에만 보관합니다 (`features/auth/tokenStorage.ts`의 모듈 변수 — React state가 아니라 axios 인터셉터에서도 동기적으로 읽을 수 있게 일부러 평범한 변수로 둠). 새로고침하면 사라지므로, `AuthProvider` 마운트 시 refresh 쿠키로 조용히 재발급받아 채웁니다.
- **refresh token**은 JS가 아예 접근할 수 없는 httpOnly 쿠키로만 오갑니다 — 로그인/재발급/카카오 로그인 응답이 `Set-Cookie`로 심어주고, 프론트는 값을 직접 다루지 않습니다. 두 토큰을 전부 `localStorage`에 저장하던 이전 방식은 XSS 한 번으로 refresh token(수명이 훨씬 긺)까지 같이 탈취될 수 있었습니다.
- 쿠키가 오가려면 axios 인스턴스에 `withCredentials: true`가 필요합니다 (`lib/api.ts`) — 백엔드도 `CORS_ALLOW_CREDENTIALS=True`로 맞춰져 있습니다.
- access token 만료(401) 시 `lib/api.ts`의 axios 인터셉터가 `refreshAccessToken()`으로 자동 재발급 후 원래 요청을 재시도합니다. 이 함수는 `AuthProvider`의 초기 로드 시에도 재사용됩니다.
- 로그아웃(`features/auth/api.ts`의 `logout()`)은 백엔드 `/auth/logout/`을 호출해 refresh token을 블랙리스트 처리하고 쿠키를 지웁니다 — 클라이언트 쪽에서 httpOnly 쿠키를 직접 지울 방법이 없으므로 반드시 서버 응답을 거쳐야 합니다.
