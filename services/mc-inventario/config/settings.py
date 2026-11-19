
"""
Django settings for config project.
Farmacia Díaz - Microservicio de Inventario.
"""

import os

from pathlib import Path
from urllib.parse import urlparse, unquote, parse_qs

from celery.schedules import crontab
from dotenv import load_dotenv


# ======================================
# BASE
# ======================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# ======================================
# SEGURIDAD
# ======================================

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

DEBUG = os.getenv("DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "ALLOWED_HOSTS",
        "127.0.0.1,localhost,mc-inventario,.enzonic.dev"
    ).split(",")
    if host.strip()
]

CSRF_TRUSTED_ORIGINS = [
    "https://*.enzonic.dev",
]


# ======================================
# CONFIGURACIÓN DE SEGURIDAD
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
        "https"
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
    "corsheaders",
    "django_filters",
    "drf_spectacular",

    "inventory",
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
# URLS
# ======================================

ROOT_URLCONF = "config.urls"


# ======================================
# TEMPLATES
# ======================================

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
                "django.template.context_processors.debug",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


# ======================================
# BASE DE DATOS POSTGRESQL
# Enzonic producción / Docker local
# ======================================

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("DATABASE_URL_UNPOOLED")
)

if DATABASE_URL:

    db_url = urlparse(DATABASE_URL)
    db_query = parse_qs(db_url.query)

    if not db_url.hostname or not db_url.path.strip("/"):
        raise ValueError(
            "DATABASE_URL no contiene un host o nombre de base de datos válido."
        )

    local_hosts = {
        "localhost",
        "127.0.0.1",
        "postgres",
        "postgres-inventario",
    }

    default_sslmode = (
        "disable"
        if db_url.hostname in local_hosts
        else "require"
    )

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",

            "NAME": unquote(
                db_url.path.lstrip("/")
            ),

            "USER": unquote(
                db_url.username or ""
            ),

            "PASSWORD": unquote(
                db_url.password or ""
            ),

            "HOST": db_url.hostname,

            "PORT": db_url.port or 5432,

            "OPTIONS": {
                "sslmode": db_query.get(
                    "sslmode",
                    [default_sslmode]
                )[0],
            },

            "CONN_MAX_AGE": 0,
        }
    }

else:

    # Configuración local mediante Docker Compose

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",

            "NAME": os.getenv(
                "POSTGRES_DB",
                "farmacia_inventario"
            ),

            "USER": os.getenv(
                "POSTGRES_USER",
                "inventario_user"
            ),

            "PASSWORD": os.getenv(
                "POSTGRES_PASSWORD",
                "inventario_password"
            ),

            "HOST": os.getenv(
                "POSTGRES_HOST",
                "postgres"
            ),

            "PORT": os.getenv(
                "POSTGRES_PORT",
                "5432"
            ),

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
# CORS
# ======================================

CORS_ALLOW_ALL_ORIGINS = True


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

    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],

    # Autenticación JWT validada mediante mc-usuarios.
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "inventory.authentication.UsuarioERPAuthentication",
    ],

    # Permisos predeterminados.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}


# ======================================
# DOCUMENTACIÓN API
# ======================================

SPECTACULAR_SETTINGS = {
    "TITLE": "Farmacia Díaz ERP API",

    "DESCRIPTION": (
        "API del microservicio de Inventario "
        "del ERP Farmacia Díaz."
    ),

    "VERSION": "1.0.0",
}


# ======================================
# CELERY
# ======================================

CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    "redis://redis:6379/0"
)

CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    "redis://redis:6379/0"
)

CELERY_ACCEPT_CONTENT = ["json"]

CELERY_TASK_SERIALIZER = "json"

CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = "America/La_Paz"


# ======================================
# CELERY BEAT
# TAREAS AUTOMÁTICAS
# ======================================

CELERY_BEAT_SCHEDULE = {

    "verificar-vencimientos-diariamente": {
        "task": "inventory.tasks.verificar_vencimientos",
        "schedule": crontab(
            hour=8,
            minute=0,
        ),
    },

    "verificar-stock-diariamente": {
        "task": "inventory.tasks.verificar_stock",
        "schedule": crontab(
            hour=8,
            minute=5,
        ),
    },
}
