FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml README.md requirements.txt /app/
COPY backend /app/backend
COPY frontend /app/frontend

RUN uv pip install --system -r requirements.txt

RUN useradd --create-home --shell /usr/sbin/nologin appuser && chown -R appuser:appuser /app

EXPOSE 8000

USER appuser

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
