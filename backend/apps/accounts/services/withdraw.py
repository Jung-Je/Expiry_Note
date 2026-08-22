from apps.accounts.models import User


def withdraw(user: User) -> None:
    """사용자 계정을 완전히 삭제한다(회원 탈퇴).

    사용자의 만료 항목과 알림은 row와 함께 cascade로 삭제되므로
    (ExpiryItem.user / Notification.user 참고), 탈퇴하는 사용자의 데이터가
    한 번에 전부 제거된다.
    """
    user.delete()
