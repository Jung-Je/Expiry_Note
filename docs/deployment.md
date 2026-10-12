# 배포 가이드 (백엔드)

이 문서는 백엔드를 실제 서버에 올릴 때 쓰는 절차입니다. 프론트엔드는 같은 서버의 Caddy가 정적 파일로 서빙합니다(맨 아래 "프론트엔드는?" 참고).

선택한 방식: **AWS 프리티어(Free Tier) EC2 VM + Docker Compose + Caddy**. 이유는 [`docs/progress.md`](progress.md)의 "배포 인프라" 항목 참고 — 상시 실행이 필요한 `runscheduler` 워커가 있어서, 미사용 시 슬립되는 무료 호스팅(Render 등)보다 언제나 켜져 있는 VM이 이 프로젝트에 맞습니다.

> **AWS 프리티어는 2025년 7월 15일부터 정책이 바뀌었습니다.** 그 이전에 만든 계정은 예전 방식(EC2 t2.micro/t3.micro를 매달 750시간씩 12개월간 무료)을 그대로 쓸 수 있지만, **그 이후 신규 가입한 계정은 가입 시 $200 크레딧을 받고, 가입 후 6개월(또는 크레딧을 다 쓰는 시점 중 더 빠른 쪽)까지만 무료**입니다 — EC2 사용량도 이 $200에서 그대로 차감되는 구조라 Oracle Cloud의 Always Free처럼 "영구 무료"가 아닙니다. 가입할 때 본인 계정이 어느 쪽인지(AWS 콘솔의 Billing > Free Tier 또는 가입 당시 안내) 꼭 확인하세요. 또한 free tier 대상 인스턴스(t2.micro/t3.micro)는 **RAM이 1GB**뿐이라, 이 프로젝트의 5개 컨테이너(Postgres+Redis+Django+scheduler+Caddy)를 전부 올리기엔 빠듯합니다 — 아래 "메모리가 빠듯할 때" 참고.

## 전체 그림

```
[사용자 브라우저] → https://api.example.com → [Caddy(TLS)] → [Django(gunicorn)] → [Postgres]
                                                     ↑              ↓
                                              [scheduler 워커]  [Redis(rate limit 캐시)]
```

5개 컨테이너(`docker-compose.prod.yml`)가 한 VM 위에서 돕니다: `db`(Postgres), `redis`, `backend`(gunicorn), `scheduler`(알림/구독 갱신 워커), `caddy`(HTTPS 리버스 프록시).

## 1. AWS EC2 프리티어 VM 준비 (사용자가 직접)

1. [AWS 가입](https://aws.amazon.com/free/) — 카드 등록 필요. 가입 직후 Billing > Free Tier 페이지에서 본인 계정이 "레거시 12개월 무료"인지 "$200 크레딧(6개월)" 방식인지 확인하고, 무료 기간/크레딧이 끝나는 시점을 캘린더에 적어두는 걸 추천(끝나면 자동으로 과금 시작).
2. 인스턴스 생성 (EC2 > 인스턴스 시작)
   - AMI: Ubuntu 최신 LTS
   - 인스턴스 유형: `t2.micro` 또는 `t3.micro`(프리티어 대상, 1 vCPU / RAM 1GB)
   - 키 페어: 새로 생성해서 `.pem` 파일 다운로드(서버 접속에 필요, 분실 시 재발급 불가라 잘 보관)
   - 스토리지: 프리티어 한도(최대 30GB) 안에서 기본값 또는 조금 넉넉하게
3. 보안 그룹(Security Group) 인바운드 규칙에 **80번, 443번 포트**를 0.0.0.0/0으로 열어둡니다(Caddy가 HTTPS 인증서를 발급/서빙하려면 필요). 22번(SSH)은 본인 IP로 좁혀두는 걸 권장.
4. **탄력적 IP(Elastic IP) 할당 후 이 인스턴스에 연결** — EC2 인스턴스는 재시작(stop/start, reboot는 괜찮음)할 때마다 퍼블릭 IP가 바뀝니다. 탄력적 IP를 안 쓰면 재시작할 때마다 DNS를 다시 연결해야 합니다(프리티어 범위 안에서 인스턴스에 연결해두면 무료, 연결 안 하고 놀리면 과금되니 꼭 인스턴스에 붙여둘 것).
5. 도메인: `api.example.com` 같은 서브도메인의 DNS **A 레코드**를 위에서 할당한 탄력적 IP로 연결합니다.
6. SSH로 접속: `ssh -i <다운로드한 .pem 파일> ubuntu@<탄력적 IP>` (키 파일 권한은 `chmod 400 <파일>` 필요)

### 메모리가 빠듯할 때

`t2.micro`/`t3.micro`는 RAM이 1GB뿐이라 Postgres+Redis+Django(gunicorn)+scheduler+Caddy 5개 컨테이너를 한꺼번에 올리면 메모리가 부족해 컨테이너가 죽거나(OOM) 스왑으로 느려질 수 있습니다. 증상이 보이면:

- `backend/Dockerfile`의 gunicorn `--workers 3`을 `--workers 2`나 `1`로 낮추기(워커 하나당 수십~수백MB 절약)
- 스왑 파일 추가(가장 간단한 안전장치):
  ```bash
  sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

## 2. VM에 Docker 설치

```bash
# VM 안에서 실행
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 여기서 한 번 로그아웃 후 재접속해야 docker 명령을 sudo 없이 쓸 수 있음
```

## 3. 코드 가져오기 + 환경 변수 파일 만들기

```bash
git clone <이 리포지토리 URL> expiry-note
cd expiry-note
```

**`.env`** (리포 루트, `docker-compose.prod.yml`과 같은 위치 — Postgres 접속 정보):

```env
DB_NAME=expiry_note_prod
DB_USER=expiry_note
DB_PASSWORD=<랜덤하고 긴 비밀번호로 직접 생성>
```

**`backend/.envs/.env.prod`** — [`backend/README.md`](../backend/README.md)의 `.env.dev` 예시와 같은 형식이되, 값은 운영 기준으로 채웁니다. 추가로 알아둘 점:

- `DB_HOST`/`DB_PORT`/`REDIS_URL`은 `docker-compose.prod.yml`이 자동으로 넣어주므로 이 파일에는 안 적어도 됩니다.
- `DJANGO_ALLOWED_HOSTS`에 실제 API 도메인을 넣습니다 (예: `api.example.com`).
- `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL`에 실제 프론트 도메인을 넣습니다 (예: `https://expirynote.com`).
- `DJANGO_SECRET_KEY`/`JWT_SIGNING_KEY`는 운영용 랜덤 값으로 새로 생성합니다(로컬 dev 값 재사용 금지). `python -c "import secrets; print(secrets.token_urlsafe(50))"`로 생성 가능.
- HTTPS 하드닝(`SECURE_SSL_REDIRECT` 등)은 `config/settings/prod.py`에서 기본 켜짐으로 이미 설정되어 있어 따로 안 넣어도 됩니다.

**`Caddyfile`** (리포 루트):

```bash
cp Caddyfile.example Caddyfile
# 안의 api.example.com을 실제 도메인으로 바꾸기
```

## 4. 실행

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

마이그레이션은 `backend` 컨테이너가 뜰 때 자동으로 실행됩니다(`backend/docker/entrypoint.sh`). 로그 확인:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

`https://<도메인>/api/v1/health/`가 `{"status":"ok"}`를 반환하면 배포 성공입니다. 관리자 계정도 만들어둡니다:

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

## 5. 업데이트 배포

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 6. 배포 후 별도로 해야 하는 것 (이 문서 밖의 작업)

- **카카오 디벨로퍼스**: 내 애플리케이션 > 플랫폼에 실제 프론트 도메인을 Web 플랫폼으로 등록, 카카오 로그인 Redirect URI에 실제 도메인 추가
- **토스페이먼츠**: 사업자 등록 후 운영(live) API 키 발급받아 `backend/.envs/.env.prod`의 `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY` 교체(프론트 쪽 `VITE_TOSS_CLIENT_KEY`도 함께)
- **Gmail SMTP 발송량**: 사용자가 늘면 일일 500통 제한에 걸릴 수 있음 — 그때 SendGrid/Resend 등으로 교체 검토(`EMAIL_*` env var만 바꾸면 됨, 코드 변경 불필요)

## 프론트엔드는?

Vite+React 정적 빌드를 같은 서버의 Caddy가 직접 서빙합니다(프론트 컨테이너는 없음). `docker-compose.prod.yml`이 `./frontend/dist`를 Caddy 컨테이너의 `/srv/frontend`로 마운트하고, `Caddyfile`의 루트 도메인 블록이 `try_files {path} /index.html`로 SPA 라우팅을 처리합니다(`Caddyfile.example` 참고).

- **빌드와 업로드는 자동**: `main`에 `frontend/**` 변경이 들어가면 `.github/workflows/deploy-frontend.yml`이 GitHub 러너에서 빌드해 `dist/`를 서버로 scp합니다(1GB 서버에서 빌드하지 않기 위함). `appleboy/scp-action`은 `overwrite: true`가 없으면 이미 있는 파일을 조용히 건너뛰어 옛 번들이 남으니 지우지 말 것
- **빌드 환경 변수**: `VITE_API_BASE_URL`(`https://api.example.com/api/v1` — `/api/v1`까지 포함), `VITE_KAKAO_JS_KEY`는 GitHub Secrets에 등록 — 자세한 값은 [`frontend/README.md`](../frontend/README.md) 참고
- **Vercel/Cloudflare Pages를 쓰지 않는 이유**: 현재 도메인(`웹.한국` 하위 한글 IDN)을 두 서비스 모두 등록 가능한 도메인으로 인식하지 못해 연결할 수 없었음. 일반 `.com`/`.kr` 도메인이라면 정적 호스팅도 가능
- **한글 도메인 주의**: 브라우저는 퓨니코드로 요청하므로 `backend/.envs/.env.prod`의 `ALLOWED_HOSTS`/`CORS_ALLOWED_ORIGINS`에 한글 표기와 퓨니코드 표기를 둘 다 넣어야 함
