"""카카오 로그인.

프론트엔드는 카카오 JS SDK(Kakao.Auth.authorize())로 인가 코드(code)만
받아서 우리 API에 넘긴다. 그 코드를 access_token으로 교환하는 과정은
반드시 이 백엔드에서 한다 — 카카오 앱에 client_secret이 켜져 있으면 토큰
교환 요청에 그 값이 필요한데, 프론트(브라우저)로는 절대 넘길 수 없는
값이기 때문이다. access_token을 얻은 뒤에는 카카오 사용자 정보 API를
호출해 신뢰성을 검증하고, 로컬 사용자와 매칭/생성한다.
"""

import requests
from django.conf import settings
from django.db import transaction

from apps.accounts.models import User

KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
KAKAO_USER_INFO_URL = "https://kapi.kakao.com/v2/user/me"


class InvalidKakaoCode(Exception):
    pass


class InvalidKakaoToken(Exception):
    pass


def exchange_kakao_code(*, code: str, redirect_uri: str) -> str:
    """인가 코드를 access_token으로 교환한다.

    client_id는 REST API 키를 쓴다(JavaScript 키가 아님 — 카카오 REST API
    스펙). client_secret은 카카오 앱에서 "클라이언트 시크릿" 기능이 켜져
    있을 때만 필요하므로, KAKAO_CLIENT_SECRET이 설정된 경우에만 실어 보낸다.
    """
    payload = {
        "grant_type": "authorization_code",
        "client_id": settings.KAKAO_REST_API_KEY,
        "redirect_uri": redirect_uri,
        "code": code,
    }
    if settings.KAKAO_CLIENT_SECRET:
        payload["client_secret"] = settings.KAKAO_CLIENT_SECRET

    response = requests.post(KAKAO_TOKEN_URL, data=payload, timeout=5)
    if response.status_code != 200:
        raise InvalidKakaoCode(response.text)
    return response.json()["access_token"]


def fetch_kakao_profile(access_token: str) -> dict:
    response = requests.get(
        KAKAO_USER_INFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=5,
    )
    if response.status_code != 200:
        raise InvalidKakaoToken(response.text)
    return response.json()


@transaction.atomic
def get_or_create_kakao_user(access_token: str) -> User:
    profile = fetch_kakao_profile(access_token)
    kakao_id = str(profile["id"])
    kakao_account = profile.get("kakao_account", {})
    email = kakao_account.get("email")
    name = kakao_account.get("profile", {}).get("nickname", "")

    user = User.objects.filter(kakao_id=kakao_id).first()
    if user is not None:
        return user

    # 이메일 동의를 받은 카카오 계정이 이미 이메일 회원가입으로 가입되어 있다면 계정을 연결한다.
    if email:
        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            user.kakao_id = kakao_id
            user.save(update_fields=["kakao_id"])
            return user

    user = User(
        email=email or f"kakao_{kakao_id}@users.noreply.expirynote",
        name=name or "카카오 사용자",
        kakao_id=kakao_id,
        is_email_verified=bool(email),
    )
    user.set_unusable_password()
    user.save()
    return user
