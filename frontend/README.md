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

3. 환경 변수는 `.envs/.env.dev`에 이미 로컬 개발용 기본값(`VITE_API_BASE_URL=http://localhost:8000/api/v1`)이 커밋되어 있어 따로 준비할 필요가 없습니다. 백엔드를 다른 포트로 띄웠다면 이 파일 값을 직접 수정하세요.

4. 개발 서버 실행

   ```bash
   npm run dev
   ```

   `http://localhost:5173`에서 확인할 수 있습니다. (`npm run dev`는 내부적으로 `vite --mode dev`를 실행해 `.envs/.env.dev`를 읽습니다.)

## 자주 쓰는 명령어

```bash
npm run dev       # 개발 서버 (HMR)
npm run build     # 타입 체크 + 프로덕션 빌드 (.envs/.env.prod 사용, 없으면 직접 생성)
npm run lint      # oxlint
npm run preview   # 빌드 결과 미리보기
```

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
- MVP 단순화를 위해 두 토큰 모두 `localStorage`에 저장합니다 (`features/auth/tokenStorage.ts`). XSS에 노출되면 탈취될 수 있으므로, 정식 출시 전에는 httpOnly 쿠키 기반으로 전환하는 것을 검토하세요.
- access token 만료(401) 시 `lib/api.ts`의 axios 인터셉터가 refresh token으로 자동 재발급 후 원래 요청을 재시도합니다.
