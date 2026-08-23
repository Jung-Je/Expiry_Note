from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.accounts.models import User


def revoke_all_tokens(user: User) -> None:
    """해당 유저에게 발급된 모든 refresh 토큰을 블랙리스트 처리한다.

    비밀번호 변경/재설정, 회원 탈퇴처럼 기존에 로그인해둔 다른 기기·세션을
    전부 끊어야 하는 상황에서 사용한다. access token 자체는 무효화할 수
    없지만(수명이 짧아 곧 만료됨), refresh token을 막아두면 재발급을 통한
    세션 연장은 더 이상 불가능하다. 이미 블랙리스트된 토큰은 건너뛴다.
    """
    outstanding = OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True)
    BlacklistedToken.objects.bulk_create(
        (BlacklistedToken(token=token) for token in outstanding),
        ignore_conflicts=True,
    )
