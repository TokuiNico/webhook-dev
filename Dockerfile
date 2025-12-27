# =============================================================================
# Stage 1: Builder - Install dependencies with uv
# =============================================================================
FROM python:3.13-slim-bookworm AS builder

# Install system dependencies needed for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    pkg-config \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Configure uv to install venv to /venv (outside /app for easier volume mounting)
ENV UV_PROJECT_ENVIRONMENT=/venv
ENV UV_PYTHON=/usr/local/bin/python

# Install dependencies first (better layer caching)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --no-editable

# Copy application code
COPY . /app

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

# =============================================================================
# Stage 2: Development - Only venv, code is mounted via volumes
# =============================================================================
FROM python:3.13-slim-bookworm AS dev

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the virtual environment from builder
COPY --from=builder /venv /venv

# Set PATH to use venv binaries
ENV PATH="/venv/bin:$PATH"
ENV VIRTUAL_ENV="/venv"
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Default command for development (with hot reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# =============================================================================
# Stage 3: Production - Complete image with venv and application code
# =============================================================================
FROM python:3.13-slim-bookworm AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy the virtual environment from builder
COPY --from=builder --chown=appuser:appuser /venv /venv

# Copy application code
COPY --from=builder --chown=appuser:appuser /app /app

# Set PATH to use venv binaries
ENV PATH="/venv/bin:$PATH"
ENV VIRTUAL_ENV="/venv"
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER appuser

EXPOSE 8000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
