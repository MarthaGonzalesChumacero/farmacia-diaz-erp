
"""
Django settings for config project.
Farmacia Díaz - Microservicio de Usuarios.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv


# ======================================
# CONFIGURACIÓN BASE
# ======================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# ======================================
# SEGURIDAD
# ======================================

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "ALLOWED_HOSTS",
        "127.0.0.1,localhost,mc-usuarios,"
        "farmacia-diaz-usuarios.enzonic.dev,.enzonic.dev"
    ).split(",")
    if host.strip()
]


# ======================================
# SEGURIDAD HTTPS
# ======================================

if not DEBUG:

    SECURE_HSTS_SECONDS = int(
        os.getenv("SECURE_HSTS_SECONDS", "0")
    )

    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS", "False"
    ).lower() == "true"

    SECURE_HSTS_PRELOAD = os.getenv(
        "SECURE_HSTS_PRELOAD", "False"
    ).lower() == "true"

    SECURE_SSL_REDIRECT = os.getenv(
        "SECURE_SSL_REDIRECT", "False"
    ).lower() == "true"

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )


# ======================================
# APLICACIONES INSTALADAS
# ======================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "drf_spectacular",
    "corsheaders",

    "usuarios",
]


# ======================================
# MIDDLEWARE
# ======================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ======================================
# CONFIGURACIÓN CORS
# ======================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "https://farmacia-diaz-frontend.enzonic.dev",
]

CORS_ALLOWED_ORIGINS += [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", ""
    ).split(",")
    if origin.strip()
]

CSRF_TRUSTED_ORIGINS = [
    "https://*.enzonic.dev",
    "https://farmacia-diaz-frontend.enzonic.dev",
]

CSRF_TRUSTED_ORIGINS += [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS", ""
    ).split(",")
    if origin.strip()
]


# ======================================
# URLS Y TEMPLATES
# ======================================

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends.django.DjangoTemplates"
        ),
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# ======================================
# BASE DE DATOS POSTGRESQL
# Docker local / Enzonic producción
# ======================================

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("DATABASE_URL_UNPOOLED")
)

if DATABASE_URL:

    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=60,
            conn_health_checks=True,
            ssl_require=True,
        )
    }

else:

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",

            "NAME": os.getenv(
                "POSTGRES_DB",
                "farmacia_usuarios"
            ),

            "USER": os.getenv(
                "POSTGRES_USER",
                "usuarios_user"
            ),

            "PASSWORD": os.getenv(
                "POSTGRES_PASSWORD",
                "usuarios_password"
            ),

            "HOST": os.getenv(
                "POSTGRES_HOST",
                "postgres-usuarios"
            ),

            "PORT": os.getenv(
                "POSTGRES_PORT",
                "5432"
            ),

            "CONN_MAX_AGE": 0,
        }
    }


# ======================================
# MODELO DE USUARIO PERSONALIZADO
# ======================================

AUTH_USER_MODEL = "usuarios.Usuario"


# ======================================
# VALIDACIÓN DE CONTRASEÑAS
# ======================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# ======================================
# IDIOMA Y ZONA HORARIA
# ======================================

LANGUAGE_CODE = "es"

TIME_ZONE = "America/La_Paz"

USE_I18N = True

USE_TZ = True


# ======================================
# ARCHIVOS ESTÁTICOS
# ======================================

STATIC_URL = "static/"


# ======================================
# DJANGO REST FRAMEWORK
# JWT + SWAGGER
# ======================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),

    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),

    "DEFAULT_SCHEMA_CLASS": (
        "drf_spectacular.openapi.AutoSchema"
    ),
}


# ======================================
# CONFIGURACIÓN JWT
# ======================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),

    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),

    "AUTH_HEADER_TYPES": ("Bearer",),
}


# ======================================
# DOCUMENTACIÓN SWAGGER
# ======================================

SPECTACULAR_SETTINGS = {
    "TITLE": "Farmacia Díaz - Microservicio de Usuarios",

    "DESCRIPTION": (
        "API para autenticación y administración de usuarios "
        "del sistema ERP de Farmacia Díaz."
    ),

    "VERSION": "1.0.0",

    "SERVE_INCLUDE_SCHEMA": False,
}


# ======================================
# CLAVE PRIMARIA POR DEFECTO
# ======================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
