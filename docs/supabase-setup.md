# Supabase 연동 가이드

만료노트는 DB(Postgres)와 Auth/Storage를 Supabase로 사용합니다. 로컬 개발도 별도 로컬 DB 없이 이 프로젝트에 바로 연결합니다.

## 1. 프로젝트 생성

1. https://supabase.com 접속 후 로그인 (GitHub 계정 로그인 가능)
2. **New project** 클릭
3. 값 입력
   - **Name**: 예) `expiry-note` (또는 `expiry-note-dev` / `expiry-note-prod`처럼 환경별로 분리해도 됩니다)
   - **Database Password**: 안전한 비밀번호로 설정하고 별도로 저장해두세요 (연결 문자열에 들어갑니다)
   - **Region**: 서비스 사용자와 가까운 리전 선택 (예: `Northeast Asia (Seoul)`)
4. **Create new project** 클릭 후 프로비저닝 완료까지 1~2분 대기

## 2. DB 연결 문자열 가져오기

1. 프로젝트 대시보드 좌측 메뉴 **Project Settings > Database**
2. **Connection string** 섹션에서 **URI** 탭 선택
3. **Session pooler** 연결 문자열을 복사합니다 (Direct connection이 아닌 pooler를 사용 — Django처럼 오래 유지되는 연결에 적합하고 IPv4/IPv6 모두 지원)
4. 문자열의 `[YOUR-PASSWORD]` 부분을 1번에서 설정한 DB 비밀번호로 교체
5. 끝에 `?sslmode=require`가 없다면 붙여줍니다

결과는 다음과 비슷한 형태입니다.

```
postgresql://postgres.xxxxxxxxxxxx:<DB비밀번호>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
```

이 값을 `backend/.env`의 `DATABASE_URL`에 넣습니다.

## 3. API 키 가져오기

1. **Project Settings > API**
2. 다음 값을 복사합니다.
   - **Project URL** → `SUPABASE_URL`
   - **anon public** 키 → `SUPABASE_ANON_KEY`
   - **service_role** 키 → `SUPABASE_SERVICE_ROLE_KEY`

> **service_role 키는 Row Level Security를 우회합니다.** 절대 프론트엔드/모바일 앱이나 git에 커밋하지 말고, 백엔드 서버 환경 변수로만 사용하세요.

## 4. 백엔드에 적용

```bash
cd backend
cp .env.example .env   # 아직 안 했다면
```

`.env`에 위에서 가져온 값을 채워 넣습니다.

```
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:<DB비밀번호>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=<anon public 키>
SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
```

적용 확인:

```bash
uv run python manage.py migrate
uv run python manage.py runserver
curl http://127.0.0.1:8000/api/health/
```

`migrate`가 성공하면 Supabase 대시보드의 **Table Editor**에서 `django_migrations`, `auth_user` 등 Django가 만든 테이블을 확인할 수 있습니다.

## 5. 팀원과 값 공유

`.env`는 git에 커밋되지 않으므로, 팀원끼리는 별도의 안전한 채널(1Password, 팀 시크릿 매니저 등)로 `DATABASE_URL`/API 키를 공유하세요. Supabase 대시보드에 팀원을 초대하면 각자 위 2~3단계를 반복해 직접 값을 가져올 수도 있습니다 (**Project Settings > Team**).
