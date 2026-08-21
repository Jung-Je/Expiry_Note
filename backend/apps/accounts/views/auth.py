from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.serializers import (
    EmailTokenObtainPairSerializer,
    EmailVerificationConfirmSerializer,
    KakaoLoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    SignupSerializer,
    UserSerializer,
)
from apps.accounts.services import (
    InvalidKakaoToken,
    InvalidResetToken,
    InvalidVerificationToken,
    confirm_password_reset,
    get_or_create_kakao_user,
    request_password_reset,
    signup,
    verify_email,
)


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = signup(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            name=serializer.validated_data["name"],
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_email(**serializer.validated_data)
        except InvalidVerificationToken:
            return Response(
                {"detail": "유효하지 않거나 만료된 인증 링크입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(UserSerializer(user).data)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_password_reset(email=serializer.validated_data["email"])
        # 가입 여부와 무관하게 항상 같은 응답을 준다 (이메일 존재 여부 노출 방지).
        return Response({"detail": "비밀번호 재설정 메일을 보냈습니다."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirm_password_reset(
                uid=serializer.validated_data["uid"],
                token=serializer.validated_data["token"],
                new_password=serializer.validated_data["new_password"],
            )
        except InvalidResetToken:
            return Response(
                {"detail": "유효하지 않거나 만료된 링크입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "비밀번호가 재설정되었습니다."})


class KakaoLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = KakaoLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = get_or_create_kakao_user(serializer.validated_data["access_token"])
        except InvalidKakaoToken:
            return Response(
                {"detail": "유효하지 않은 카카오 액세스 토큰입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )
