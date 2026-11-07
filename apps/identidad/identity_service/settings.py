"""
Configuración del Identity Service.

Reglas del proyecto (AGENTS.md y .env.example):
  - `DJANGO_SECRET_KEY`: secreto INTERNO de Django (sesiones, firmas de admin).
  - `JWT_SECRET`: secreto con el que se FIRMAN los tokens JWT. Es el MISMO
    que usan los servicios Express para validar la firma (AGENTS.md 4.5),
    por eso NO se reutiliza el DJANGO_SECRET_KEY para firmar.
  - Base de datos: UN solo PostgreSQL (`DB_NAME`), esquema `identidad`
    con su propio usuario `DB_IDENTIDAD_USER` (AGENTS.md 5, decisión D3).
"""
from pathlib import Path
from datetime import timedelta
import os
import sys
import warnings

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar el .env de la raíz del monorepo (mismo patrón que los servicios
# Express). Un .env local de este servicio, si existe, lo pisa.
load_dotenv(BASE_DIR.parent.parent / ".env")
load_dotenv(BASE_DIR / ".env")

# --- Secretos ---------------------------------------------------------------
# AGENTS.md 4.6 y la skill code-review-security: NINGÚN secreto hardcodeado.
# Fuera de las pruebas el servicio FALLA si falta uno, en vez de arrancar con
# una clave conocida que permita falsificar tokens (hallazgo P1/P2 del review).
TESTING = "test" in sys.argv

# Mensaje único: dice exactamente qué hacer en una recién clonada.
_ENV_HELP = (
    "Falta {name} en el entorno. Copia .env.example a .env en la raíz del "
    "monorepo y rellénalo (AGENTS.md 4.6: ningún secreto en el código)."
)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if TESTING:
        SECRET_KEY = "clave-de-pruebas-no-usable-fuera-del-test-runner"
        warnings.warn("DJANGO_SECRET_KEY no definido: modo pruebas.")
    else:
        raise ImproperlyConfigured(_ENV_HELP.format(name="DJANGO_SECRET_KEY"))

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    if TESTING:
        JWT_SECRET = "jwt-de-pruebas-no-usable-fuera-del-test-runner"
        warnings.warn("JWT_SECRET no definido: modo pruebas.")
    else:
        raise ImproperlyConfigured(_ENV_HELP.format(name="JWT_SECRET"))

JWT_EXPIRES_IN = int(os.environ.get("JWT_EXPIRES_IN", "3600"))

DEBUG = os.environ.get("IDENTITY_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("IDENTITY_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# --- Aplicaciones -----------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "accounts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "core.middleware.CorrelationMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "identity_service.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
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

WSGI_APPLICATION = "identity_service.wsgi.application"

# --- Base de datos (PROPIA de este servicio) --------------------------------
# En las pruebas (`manage.py test`) se usa SQLite en memoria: el CI no
# levanta Postgres y así los tests corren en cualquier máquina. En
# desarrollo y producción, siempre PostgreSQL con las variables de
# .env.example (`DB_*` y `DB_IDENTIDAD_*`).
# (TESTING se define arriba, junto a los secretos.)
if TESTING:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            # Un solo PostgreSQL para todo el proyecto (AGENTS.md 5); la base
            # se llama como dice .env.example.
            "NAME": os.environ.get("DB_NAME", "repuestosya"),
            # Este servicio solo entra con SU usuario, dueño del esquema.
            "USER": os.environ.get("DB_IDENTIDAD_USER", "identidad_user"),
            "PASSWORD": os.environ.get("DB_IDENTIDAD_PASSWORD", "identidad_pass"),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5432"),
            # Aislamiento (decisiones.md D3): todas las tablas de este
            # servicio viven en el esquema `identidad`. Si alguien olvida
            # el esquema en una consulta, igual aterriza en el suyo.
            "OPTIONS": {"options": "-c search_path=identidad"},
        }
    }

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Hash de contraseñas: **bcrypt** según docs/contratos-api.md L43.
# Se usa la variante `bcrypt_sha256` de Django: prehashea con SHA256 para
# evitar el truncado de 72 bytes de bcrypt (Django #20138) — con bcrypt>=4
# un password largo lanzaría ValueError en lugar de hashear.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# --- Internacionalización ---------------------------------------------------
LANGUAGE_CODE = "es-bo"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- DRF --------------------------------------------------------------------
# El envelope {status, msg, data} lo construimos nosotros (nunca el default
# de DRF); el handler global traduce excepciones a ese envelope.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # simplejwt ≥6 se llama JWTAuthentication (el viejo
        # TokenAuthentication fue eliminado)
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "EXCEPTION_HANDLER": "core.exception_handler.api_exception_handler",
    "UNAUTHENTICATED_USER": None,
}

# --- SimpleJWT ---------------------------------------------------------------
# Los tokens se FIRMAN y VERIFICAN con JWT_SECRET: es el mismo secreto que
# usan los servicios Express (AGENTS.md 4.5) y el que el Gateway envía
# a validar con `POST /api/v1/auth/verify`.
# OJO: simplejwt >= 5.5 lee `SIMPLE_JWT` (con guion bajo); si se usa
# `SIMPLEJWT` se ignora silenciosamente y firma con SECRET_KEY.
SIMPLE_JWT = {
    "SIGNING_KEY": JWT_SECRET,
    "VERIFYING_KEY": JWT_SECRET,
    "ALGORITHM": "HS256",
    "ACCESS_TOKEN_LIFETIME": timedelta(seconds=JWT_EXPIRES_IN),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# --- RabbitMQ ----------------------------------------------------------------
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.environ.get("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.environ.get("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.environ.get("RABBITMQ_PASS", "guest")

# --- Servicio ----------------------------------------------------------------
# El nombre de la variable es el de .env.example (IDENTIDAD_PORT); se
# acepta tambien IDENTITY_PORT por compatibilidad con configuraciones viejas.
IDENTITY_PORT = int(
    os.environ.get("IDENTIDAD_PORT") or os.environ.get("IDENTITY_PORT") or "5000"
)
