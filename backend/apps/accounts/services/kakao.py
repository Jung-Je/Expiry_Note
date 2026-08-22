"""카카오 로그인.

프론트엔드가 카카오 JS SDK로 access_token을 직접 발급받아 우리 API에
넘겨주는 방식을 가정한다. 백엔드는 그 토큰으로 카카오 사용자 정보 API를
호출해 신뢰성을 검증하고, 로컬 사용자와 매칭/생성한다.
"""

import requests
from django.db import transaction

from apps.accounts.models import User

KAKAO_USER_INFO_URL = "https://kapi.kakao.com/v2/user/me"


class InvalidKakaoToken(Exception):
    pass


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
