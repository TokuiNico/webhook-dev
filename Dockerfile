# Multi-stage build using uv official image and best practices
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS builder

# Enable bytecode compilation for better startup performance
ENV UV_COMPILE_BYTECODE=1
# Copy from cache instead of linking (required for mounted volumes)
ENV UV_LINK_MODE=copy

# Install system dependencies needed for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

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

# Production stage - minimal runtime image
FROM python:3.11-slim-bookworm

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Set working directory
WORKDIR /app

# Copy the virtual environment from builder
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv

# Copy application code
COPY --from=builder --chown=appuser:appuser /app /app

# Make sure the virtual environment is used
ENV PATH="/app/.venv/bin:$PATH"

# Set environment variables for production
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command (optimized for container environments)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
