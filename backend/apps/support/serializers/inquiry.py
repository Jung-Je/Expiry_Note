from rest_framework import serializers

from apps.support.models import Inquiry


class InquirySerializer(serializers.ModelSerializer):
    """유저가 문의를 보내거나(POST), 본인 문의 내역을 볼 때(GET) 쓴다.

    reply/is_answered는 생성 시엔 빈 값/False지만, 관리자가 답변을 달면
    목록 조회 응답에 그대로 실려서 유저가 확인할 수 있다.
    """

    class Meta:
        model = Inquiry
        fields = ["id", "category", "title", "content", "reply", "is_answered", "created_at"]
        read_only_fields = ["id", "reply", "is_answered", "created_at"]


class AdminInquirySerializer(serializers.ModelSerializer):
    """관리자 화면용. 문의 내용은 읽기 전용이고, reply만 수정 가능 —
    reply를 쓰면 is_answered가 그 값의 존재 여부로 같이 갱신된다.
    """

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "user_email",
            "user_name",
            "category",
            "title",
            "content",
            "reply",
            "is_answered",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user_email",
            "user_name",
            "category",
            "title",
            "content",
            "is_answered",
            "created_at",
        ]

    def update(self, instance: Inquiry, validated_data: dict) -> Inquiry:
        if "reply" in validated_data:
            instance.reply = validated_data["reply"]
            instance.is_answered = bool(instance.reply.strip())
        instance.save()
        return instance
