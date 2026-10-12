from rest_framework import serializers

from apps.accounts.models import User


class AdminUserSerializer(serializers.ModelSerializer):
    """관리자 화면의 회원 목록/상세. is_active만 쓰기 가능 —
    나머지는 가입 경로/이메일 인증 여부 등 사용자가 직접 바꾸는 값이라
    관리자가 덮어쓸 일이 없다.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "is_active",
            "is_staff",
            "is_email_verified",
            "signup_source",
            "date_joined",
        ]
        # is_staff는 조회만(관리자 계정인지 프론트가 구분해서 비활성화
        # 버튼을 숨기는 용도) — 다른 관리자로 승격/강등하는 기능은 없다.
        read_only_fields = [
            "id",
            "email",
            "name",
            "is_staff",
            "is_email_verified",
            "signup_source",
            "date_joined",
        ]
