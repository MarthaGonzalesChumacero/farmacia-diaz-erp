
"""
Django settings for config project.
Farmacia Díaz - Microservicio de Ventas.
"""

import os
from pathlib import Path
from urllib.parse import urlparse, unquote, parse_qs

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
    "farmacia-diaz-ventas.enzonic.dev",
    "localhost",
    "127.0.0.1",
    "mc-ventas",
    ".enzonic.dev",
]

ALLOWED_HOSTS += [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "").split(",")
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

    "ventas",
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
    "http://localhost:5176",
    "http://127.0.0.1:5176",
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

    db_url = urlparse(DATABASE_URL)
    db_query = parse_qs(db_url.query)

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(db_url.path.lstrip("/")),
            "USER": unquote(db_url.username or ""),
            "PASSWORD": unquote(db_url.password or ""),
            "HOST": db_url.hostname,
            "PORT": db_url.port or 5432,
            "OPTIONS": {
                "sslmode": db_query.get(
                    "sslmode", ["require"]
                )[0],
            },
            "CONN_MAX_AGE": 0,
        }
    }

else:

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB"),
            "USER": os.getenv("POSTGRES_USER"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
            "HOST": os.getenv(
                "POSTGRES_HOST",
                "postgres-ventas"
            ),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 0,
        }
    }


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
# CLAVE PRIMARIA POR DEFECTO
# ======================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ======================================
# DJANGO REST FRAMEWORK
# ======================================

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": (
        "drf_spectacular.openapi.AutoSchema"
    ),

    "DEFAULT_AUTHENTICATION_CLASSES": [
        "ventas.authentication.UsuarioERPAuthentication",
    ],

    "DEFAULT_PERMISSION_CLASSES": [
        "ventas.authentication.UsuarioERPActivo",
    ],

    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}


# ======================================
# SWAGGER / OPENAPI
# ======================================

SPECTACULAR_SETTINGS = {
    "TITLE": "Farmacia Díaz - Microservicio de Ventas",
    "DESCRIPTION": (
        "API REST para la gestión de ventas "
        "del sistema ERP Farmacia Díaz."
    ),
    "VERSION": "1.0.0",
}


# ======================================
# EMAIL
# ======================================

EMAIL_BACKEND = (
    "django.core.mail.backends.console.EmailBackend"
)
