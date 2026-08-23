from apps.accounts.models import User
from apps.accounts.services.token_revocation import revoke_all_tokens


class InvalidCurrentPassword(Exception):
    pass


def change_password(user: User, *, current_password: str, new_password: str) -> None:
    """로그인 상태인 사용자의 비밀번호를 변경한다.

    이메일 토큰을 쓰는 재설정 플로우(services/password_reset.py)와 달리,
    이쪽은 이메일 토큰 대신 현재 비밀번호로 본인 확인을 한다.
    """
    if not user.check_password(current_password):
        raise InvalidCurrentPassword
    user.set_password(new_password)
    user.save(update_fields=["password"])
    # 비밀번호가 바뀌면 그 전에 발급된 refresh token(다른 기기 포함)을 전부
    # 무효화한다 — 계정이 탈취된 상황에서 비밀번호 변경이 실제로 로그아웃
    # 효과를 내도록 한다.
    revoke_all_tokens(user)
