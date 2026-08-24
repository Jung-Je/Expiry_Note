from apps.accounts.models import User
from apps.accounts.services.token_revocation import revoke_all_tokens


def withdraw(user: User) -> None:
    """사용자 계정을 완전히 삭제한다(회원 탈퇴).

    사용자의 만료 항목과 알림은 row와 함께 cascade로 삭제되므로
    (ExpiryItem.user / Notification.user 참고), 탈퇴하는 사용자의 데이터가
    한 번에 전부 제거된다.

    OutstandingToken.user는 유저 삭제 시 SET_NULL이라 refresh token
    row 자체는 delete 이후에도 남는다. 삭제 전에 먼저 블랙리스트 처리해서
    탈퇴 후에도 그 refresh token으로 재발급을 시도할 수 없게 한다.
    """
    revoke_all_tokens(user)
    user.delete()
