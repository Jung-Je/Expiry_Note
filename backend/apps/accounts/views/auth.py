from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from apps.accounts.cookies import clear_refresh_cookie, set_refresh_cookie
from apps.accounts.serializers import (
    ChangePasswordSerializer,
    CookieTokenRefreshSerializer,
    EmailTokenObtainPairSerializer,
    EmailVerificationConfirmSerializer,
    KakaoLoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    SignupSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)
from apps.accounts.services import (
    InvalidCurrentPassword,
    InvalidKakaoCode,
    InvalidKakaoToken,
    InvalidResetToken,
    InvalidVerificationToken,
    change_password,
    confirm_password_reset,
    exchange_kakao_code,
    get_or_create_kakao_user,
    request_password_reset,
    signup,
    verify_email,
    withdraw,
)


class SignupView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth-signup"

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
    throttle_scope = "auth-login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # refresh는 응답 바디로 내려주지 않고 httpOnly 쿠키로만 준다 — access와
        # user 정보만 바디에 남긴다.
        refresh = response.data.pop("refresh", None)
        if refresh:
            set_refresh_cookie(response, refresh)
        return response


class TokenRefreshView(BaseTokenRefreshView):
    """refresh token을 요청 바디가 아니라 httpOnly 쿠키에서 읽고,
    로테이션된 새 refresh도 다시 쿠키로 심어준다 (바디에는 access만 남김).
    """

    serializer_class = CookieTokenRefreshSerializer
    throttle_scope = "auth-token-refresh"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh = response.data.pop("refresh", None)
        if refresh:
            set_refresh_cookie(response, refresh)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)

    def delete(self, request):
        withdraw(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth-password-change"

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            change_password(request.user, **serializer.validated_data)
        except InvalidCurrentPassword:
            return Response(
                {"detail": "현재 비밀번호가 올바르지 않습니다."}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response({"detail": "비밀번호가 변경되었습니다."})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # 바디에 refresh가 오면(테스트, 쿠키 도입 전 클라이언트) 그쪽을 쓰고,
        # 없으면 쿠키 값을 쓴다.
        raw_refresh = serializer.validated_data.get("refresh") or request.COOKIES.get(
            settings.JWT_REFRESH_COOKIE_NAME, ""
        )
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                return Response(
                    {"detail": "유효하지 않은 토큰입니다."}, status=status.HTTP_400_BAD_REQUEST
                )
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth-email-verify"

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
    throttle_scope = "auth-password-reset-request"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_password_reset(email=serializer.validated_data["email"])
        # 가입 여부와 무관하게 항상 같은 응답을 준다 (이메일 존재 여부 노출 방지).
        return Response({"detail": "비밀번호 재설정 메일을 보냈습니다."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth-password-reset-confirm"

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
    throttle_scope = "auth-kakao-login"

    def post(self, request):
        serializer = KakaoLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            access_token = exchange_kakao_code(
                code=serializer.validated_data["code"],
                redirect_uri=serializer.validated_data["redirect_uri"],
            )
            user = get_or_create_kakao_user(access_token)
        except (InvalidKakaoCode, InvalidKakaoToken):
            return Response(
                {"detail": "카카오 로그인에 실패했습니다. 다시 시도해주세요."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data,
            }
        )
        set_refresh_cookie(response, str(refresh))
        return response
