# 앱 템플릿

새 도메인 앱(`accounts`, `items`, `schedules`, `notifications`, `stats` 등)을 추가할 때 이 디렉터리를 복사해서 시작하세요. `_template`은 `INSTALLED_APPS`에 등록되지 않는, 복사 전용 예시입니다.

## 사용법

```bash
cd backend
cp -r apps/_template apps/accounts
rm apps/accounts/README.md
```

복사 후 다음을 바꿉니다.

1. `apps/accounts/apps.py`의 `name`, `label`을 `apps.accounts` / `accounts`로 수정
2. `models/example.py`의 `Meta.app_label`을 새 앱의 `label`로 수정
3. `example`로 되어 있는 파일명/함수명/클래스명을 실제 기능명으로 변경 (예: `user.py`, `create_user`, `UserSerializer`)
4. `config/settings.py`의 `INSTALLED_APPS`에 `"apps.accounts"` 추가
5. `config/urls.py`에 `path("api/v1/accounts/", include("apps.accounts.urls"))` 같은 형태로 연결

## 폴더 구조와 규칙

```
apps/<app_name>/
├── apps.py
├── admin.py
├── urls.py
├── migrations/
├── models/
│   ├── __init__.py       # 모든 모델 클래스를 여기서 import
│   └── <feature>.py       # 기능/도메인 단위로 파일 분리 (예: user.py, profile.py)
├── serializers/
│   ├── __init__.py
│   └── <feature>.py
├── services/
│   ├── __init__.py
│   └── <feature>.py       # view/serializer에 두지 않는 비즈니스 로직
├── views/
│   ├── __init__.py
│   └── <feature>.py
└── tests/
    ├── __init__.py
    └── test_<feature>.py
```

- **`models.py`, `views.py`, `serializers.py`, `services.py` 같은 단일 파일 대신 폴더로 관리합니다.** 앱이 커지면서 하나의 파일에 서로 관련 없는 기능이 계속 쌓이는 것을 막기 위함입니다.
- 폴더 안에서도 기능/도메인 단위로 파일을 나눕니다. 예: `models/user.py`, `models/profile.py` — 하나의 파일에 모든 모델을 몰아넣지 않습니다.
- 각 폴더의 `__init__.py`는 하위 모듈의 클래스/함수를 re-export합니다. 그래야 외부에서는 `from apps.accounts.models import User`처럼 depth를 몰라도 되고, 내부 파일 이름은 자유롭게 리팩터링할 수 있습니다.
  - Django는 `models.py` 대신 `models/` 패키지를 쓰는 것을 공식적으로 지원합니다. 단, `models/__init__.py`에서 모든 모델 클래스를 import해야 앱 레지스트리와 `makemigrations`가 인식합니다.
- **역할 구분**
  - `models/`: 데이터 구조와 DB 제약만. 비즈니스 로직은 두지 않습니다.
  - `serializers/`: 요청/응답 데이터의 직렬화·검증(field-level validation)만.
  - `services/`: view나 serializer에 두면 안 되는 비즈니스 로직 — 여러 모델에 걸친 처리, 외부 API 호출, 트랜잭션 등.
  - `views/`: 요청을 파싱하고 service를 호출한 뒤 serializer로 응답하는 얇은 레이어. 로직을 직접 구현하지 않습니다.
- `tests/`도 기능별로 `test_<feature>.py`로 나눕니다.

## 파일이 언제 폴더가 되어야 하나

새 앱을 만들 때는 처음부터 폴더 구조로 시작합니다(이 템플릿처럼). 이미 단일 파일로 되어 있는 기존 코드는, 그 파일 안에 서로 다른 기능이 2개 이상 섞이기 시작하면 그 시점에 폴더로 쪼갭니다.
