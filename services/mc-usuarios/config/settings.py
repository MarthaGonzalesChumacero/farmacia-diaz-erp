import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


# Seguridad

SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    'mc-usuarios',
    'farmacia-diaz-usuarios.enzonic.dev',
]


# ======================================
# Configuración de seguridad
# En desarrollo (DEBUG=True): sin HTTPS.
# En producción (DEBUG=False): activar
# variables de entorno de seguridad.
# ======================================

if not DEBUG:
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '0'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv(
        'SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False'
    ).lower() == 'true'
    SECURE_HSTS_PRELOAD = os.getenv(
        'SECURE_HSTS_PRELOAD', 'False'
    ).lower() == 'true'
    SECURE_SSL_REDIRECT = os.getenv(
        'SECURE_SSL_REDIRECT', 'False'
    ).lower() == 'true'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


# Aplicaciones

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'drf_spectacular',
    'corsheaders',

    'usuarios',
]


# Middleware

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',

    'corsheaders.middleware.CorsMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


ROOT_URLCONF = 'config.urls'


# Templates

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'config.wsgi.application'


# Base de datos PostgreSQL

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv(
            'POSTGRES_DB',
            'farmacia_usuarios'
        ),
        'USER': os.getenv(
            'POSTGRES_USER',
            'usuarios_user'
        ),
        'PASSWORD': os.getenv(
            'POSTGRES_PASSWORD',
            'usuarios_password'
        ),
        'HOST': os.getenv(
            'POSTGRES_HOST',
            'postgres-usuarios'
        ),
        'PORT': os.getenv(
            'POSTGRES_PORT',
            '5432'
        ),
    }
}


# Modelo de usuario personalizado

AUTH_USER_MODEL = 'usuarios.Usuario'


# Validación de contraseñas

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'UserAttributeSimilarityValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'MinimumLengthValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'CommonPasswordValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'NumericPasswordValidator'
        ),
    },
]


# Idioma y zona horaria

LANGUAGE_CODE = 'es'

TIME_ZONE = 'America/La_Paz'

USE_I18N = True

USE_TZ = True


# Archivos estáticos

STATIC_URL = 'static/'


# CORS
# Permite la comunicación entre React y Django.
# Puertos utilizados durante el desarrollo.

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
]


# Django REST Framework + JWT + Swagger

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),

    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),

    'DEFAULT_SCHEMA_CLASS': (
        'drf_spectacular.openapi.AutoSchema'
    ),
}


# Configuración JWT

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# Documentación Swagger

SPECTACULAR_SETTINGS = {
    'TITLE': 'Farmacia Díaz - Microservicio de Usuarios',
    'DESCRIPTION': (
        'API para autenticación y administración de usuarios '
        'del sistema ERP de Farmacia Díaz.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
