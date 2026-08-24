"""
Django settings for config project — dev/prod이 공통으로 상속하는 base.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

import os
from datetime import timedelta
from pathlib import Path

import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# base.py는 config/settings/ 아래에 있으므로 backend/까지 3단계 올라간다
# (config/settings.py 하나였을 때는 2단계였음 — 패키지로 쪼개면서 바뀐 부분).
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)
# .envs/ 아래 어떤 파일을 읽을지 결정한다. 기본값은 .env.dev이고,
# DJANGO_ENV_FILE=.env.prod로 설정하면 .envs/.env.prod를 읽는다. 둘 다
# 커밋되지 않으므로 필요한 키는 README.md 참고. 이 파일은 선택 사항이다 —
# 실제 배포 환경에서는 파일 대신 진짜 환경 변수를 직접 주입한다.
DJANGO_ENV_FILE = os.environ.get("DJANGO_ENV_FILE", ".env.dev")
environ.Env.read_env(BASE_DIR / ".envs" / DJANGO_ENV_FILE)

# Base URL of the web frontend (no trailing slash) — used to build links
# inside emails (email verification, password reset).
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-change-me-in-.env")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env("DJANGO_DEBUG", default=True)

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Local
    "apps.core",
    "apps.accounts",
    "apps.items",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# 이메일을 로그인 아이디로 쓰는 커스텀 유저 모델. (apps/accounts/models/user.py)
AUTH_USER_MODEL = "accounts.User"

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
# 실제 값은 .envs/.env.dev(또는 .env.prod)의 DB_* 변수에서 온다. 아래
# 기본값은 그 변수들이 없을 때만 쓰이는 fallback이라 실제로 접속 가능할
# 필요는 없다.

DATABASES = {
    "default": {
        "ENGINE": env("DB_ENGINE", default="django.db.backends.postgresql"),
        "NAME": env("DB_NAME", default="expiry_note_dev"),
        "USER": env("DB_USER", default="postgres"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
        "CONN_MAX_AGE": env.int("DB_CONN_MAX_AGE", default=60),
    },
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = "ko-kr"

TIME_ZONE = "Asia/Seoul"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django REST Framework
# https://www.django-rest-framework.org/api-guide/settings/

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # ScopedRateThrottle은 뷰에 throttle_scope가 없으면 아무것도 하지 않으므로
    # 전역으로 켜둬도 안전하다 — 실제로는 아래 스코프가 지정된 인증 관련 뷰
    # (로그인, 회원가입, 비밀번호 재설정, 카카오 로그인 등)만 제한된다.
    # 브루트포스/이메일 enumeration/스팸성 가입을 IP 기준으로 막기 위함.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth-login": "10/min",
        "auth-signup": "20/hour",
        "auth-kakao-login": "10/min",
        "auth-password-reset-request": "5/hour",
        "auth-password-reset-confirm": "10/hour",
        "auth-email-verify": "10/hour",
        "auth-password-change": "20/hour",
        "auth-token-refresh": "30/min",
    },
}


# Simple JWT
# https://django-rest-framework-simplejwt.readthedocs.io/en/latest/settings.html

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    # SECRET_KEY(세션/CSRF 서명에도 쓰임)와 분리된 별도 키로 JWT를 서명한다.
    # JWT_SIGNING_KEY가 없으면 지금까지처럼 SECRET_KEY를 그대로 쓴다 — 로컬
    # .envs/.env.dev를 새로 만들 필요는 없고, 배포 시에는 별도 값을 주는 걸
    # 권장한다(둘 중 하나가 새도 다른 하나까지 위험해지지 않도록).
    "SIGNING_KEY": env("JWT_SIGNING_KEY", default=SECRET_KEY),
}


# Refresh token cookie
# refresh token은 프론트 JS가 아예 접근할 수 없는 httpOnly 쿠키로만 오간다
# (access token만 응답 바디로 내려주고 프론트가 메모리에 들고 있음) — XSS로
# access token이 새더라도 훨씬 수명이 긴 refresh token까지 같이 새지 않게
# 하기 위함. 실제로 쿠키를 심고/지우는 코드는 apps/accounts/cookies.py.
JWT_REFRESH_COOKIE_NAME = "refresh_token"
# /api/v1/auth/ 아래 요청에만 브라우저가 이 쿠키를 실어 보내도록 범위를 좁힌다.
JWT_REFRESH_COOKIE_PATH = "/api/v1/auth/"
JWT_REFRESH_COOKIE_SAMESITE = "Lax"
# 로컬 dev(http://localhost)에서는 Secure 쿠키가 아예 저장되지 않으므로 꺼두고,
# DEBUG=False인 환경(배포 준하는 로컬 테스트 포함)에서는 기본으로 켠다.
# 필요하면 JWT_REFRESH_COOKIE_SECURE로 직접 덮어쓸 수 있다.
JWT_REFRESH_COOKIE_SECURE = env.bool("JWT_REFRESH_COOKIE_SECURE", default=not DEBUG)


# CORS
# https://github.com/adamchainz/django-cors-headers
# The web frontend (Vite dev server) runs on a different origin.

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173"],
)
# refresh token을 httpOnly 쿠키로 주고받으려면 브라우저가 크로스오리진
# 요청에도 쿠키를 실어 보내야 한다 — CORS_ALLOWED_ORIGINS가 와일드카드가
# 아니라 명시적 목록이라 True로 켜도 안전하다.
CORS_ALLOW_CREDENTIALS = True


# Email
# https://docs.djangoproject.com/en/5.1/topics/email/
# Defaults to printing emails to the console in local dev. Real SMTP/이메일
# 서비스 연동은 추후 확정.

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@expirynote.local")
