from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _import_settings_with_env(overrides: dict[str, str | None]) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.update(
        {
            "APP_ENV": "production",
            "DATABASE_URL": "postgresql+psycopg://cadista:cadista@localhost:5432/cadista_test",
            "SECRET_KEY": "x" * 48,
            "CORS_ORIGINS": "https://app.example.com",
            "TRUSTED_HOSTS": "api.example.com",
        }
    )

    for key, value in overrides.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value

    return subprocess.run(
        [sys.executable, "-c", "import backend.core.settings"],
        cwd=PROJECT_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_production_settings_require_explicit_cors_origins() -> None:
    result = _import_settings_with_env({"CORS_ORIGINS": None})

    assert result.returncode != 0
    assert "CORS_ORIGINS must be explicitly defined in production" in result.stderr


def test_production_settings_require_explicit_trusted_hosts() -> None:
    result = _import_settings_with_env({"TRUSTED_HOSTS": None})

    assert result.returncode != 0
    assert "TRUSTED_HOSTS must be explicitly defined in production" in result.stderr


def test_production_settings_reject_local_or_insecure_cors_origins() -> None:
    result = _import_settings_with_env({"CORS_ORIGINS": "http://localhost:5173"})

    assert result.returncode != 0
    assert "Production CORS_ORIGINS must use https origins" in result.stderr


def test_production_settings_reject_local_trusted_hosts() -> None:
    result = _import_settings_with_env({"TRUSTED_HOSTS": "localhost"})

    assert result.returncode != 0
    assert "Production TRUSTED_HOSTS must not contain local/test hosts" in result.stderr


def test_production_settings_reject_cors_regex() -> None:
    result = _import_settings_with_env({"CORS_ORIGIN_REGEX": r"^https://.*$"})

    assert result.returncode != 0
    assert "CORS_ORIGIN_REGEX must not be used in production" in result.stderr


def test_production_settings_accept_explicit_https_origins_and_hosts() -> None:
    result = _import_settings_with_env({})

    assert result.returncode == 0, result.stderr
