from datetime import date, datetime

from authlib.jose import jwt
from django.conf import settings
from django.contrib.auth import BACKEND_SESSION_KEY, HASH_SESSION_KEY, SESSION_KEY
from django.utils import timezone
from rest_framework import serializers
from rest_framework.mixins import CreateModelMixin
from vstutils.api.serializers import VSTSerializer
from vstutils.oauth2.endpoints import server
from vstutils.oauth2.jwk import jwk_set
from vstutils.utils import get_session_store

from ...main.models.oauth2_token import Oauth2Token


class OAuth2TokenOneSerializer(VSTSerializer):
    expires = serializers.DateField(read_only=True)
    token = serializers.CharField(read_only=True)

    class Meta:
        model = Oauth2Token
        fields = [
            "id",
            "name",
            "expires",
            "token",
        ]


class OAuth2TokenCreateSerializer(OAuth2TokenOneSerializer):
    expires = serializers.DateField()

    def validate_expires(self, value: date):
        today = timezone.now().date()

        if value <= today:
            raise serializers.ValidationError("Expires must be in the future")

        if value - today > timezone.timedelta(
            days=settings.MAX_CUSTOM_OAUTH2_TOKEN_LIFETIME_DAYS
        ):
            raise serializers.ValidationError(
                f"Expires must be less than {settings.MAX_CUSTOM_OAUTH2_TOKEN_LIFETIME_DAYS} days"
            )

        return value

    def create(self, validated_data):
        request = self.context["request"]
        expires: date = validated_data["expires"]
        client = server.query_client("simple-client-id")
        now = int(timezone.now().timestamp())
        exp = int(
            datetime.combine(
                expires,
                datetime.min.time(),
            ).timestamp()
        )

        session = get_session_store()()
        session[SESSION_KEY] = str(request.user.id)
        session[BACKEND_SESSION_KEY] = request.session[BACKEND_SESSION_KEY]
        session[HASH_SESSION_KEY] = request.user.get_session_auth_hash()
        session.set_expiry(exp - now)
        session.save()

        token = jwt.encode(
            {"alg": settings.OAUTH_SERVER_JWT_ALG, "typ": "at+jwt"},
            {
                "iss": settings.OAUTH_SERVER_ISSUER,
                "aud": client.get_client_id(),
                "client_id": client.get_client_id(),
                "jti": str(session.session_key),
                "sub": str(request.user.id),
                "scope": "openid",
                "exp": exp,
                "iat": now,
            },
            key=jwk_set,
        ).decode("utf-8")

        return super().create(
            {
                "user": validated_data["user"],
                "name": validated_data["name"],
                "session_id": session.session_key,
                "token": token,
            }
        )


OAuth2TokenViewSet = Oauth2Token.get_view_class(
    view_class=["history", CreateModelMixin],
    list_fields=[
        "name",
        "expires",
    ],
    extra_serializer_classes={
        "serializer_class_one": OAuth2TokenOneSerializer,
        "serializer_class_create": OAuth2TokenCreateSerializer,
    },
)
