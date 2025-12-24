"""
Django settings for myproject project.
"""

from pathlib import Path
import os
import dj_database_url

# 📍 مسیر پایه پروژه
BASE_DIR = Path(__file__).resolve().parent.parent

# 🛡 SECURITY
SECRET_KEY = os.environ.get("SECRET_KEY", "fallback-secret-for-local")
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

# ❗ تو production باید مقدار واقعی بذاری
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

# ------------------------------
# 📦 Installed apps
# ------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "submissions",
    "corsheaders",   # اگر CORS لازمه
]

# ------------------------------
# 🧱 Middleware
# ------------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",        # اگر CORS لازمه
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",   # برای static
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOW_ALL_ORIGINS = True

# ------------------------------
# 🧭 Root config
# ------------------------------
ROOT_URLCONF = "myproject.urls"
WSGI_APPLICATION = "myproject.wsgi.application"

# ------------------------------
# 📊 Database (PostgreSQL via Render)
# ------------------------------
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL"),
        conn_max_age=600
    )
}

# ------------------------------
# 🔑 Password validators
# ------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------
# 🌍 Internationalization
# ------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------
# 📁 Static files (production)
# ------------------------------
STATIC_URL = "/static/"

# 📦 جایی که static ها بعد از collectstatic جمع میشن
STATIC_ROOT = BASE_DIR / "staticfiles"

# 📌 better production static handling
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ------------------------------
# 🔐 Default primary key
# ------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
