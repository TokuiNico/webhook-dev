# Development Workflow & Tooling

## Package Management with uv

This project uses **uv** as the primary Python package management tool instead of pip/pipenv/poetry. uv provides faster installation, better dependency resolution, and improved developer experience.

### Core uv Commands

```bash
# Install/sync all dependencies (including dev dependencies)
uv sync --dev

# Run Python scripts with proper environment
uv run python script.py

# Run pytest with test dependencies
uv run python -m pytest tests/ -v

# Run FastAPI development server
uv run uvicorn app.main:app --reload

# Run IPython for interactive development
uv run ipython

# Run linting and formatting tools
uv run ruff check app/
uv run ruff format app/
```

## Development Workflow Guidelines

### Environment Setup
1. **Always use `uv run`** for executing Python commands, pytest, and development tools
2. **Use `uv sync --dev`** to install all dependencies including development tools
3. **Never use `pip install`** directly - let uv handle dependency management

### Running Tests
```bash
# Run all tests
uv run python -m pytest tests/ -v

# Run specific test file
uv run python -m pytest tests/test_webhook_service.py -v

# Run with coverage
uv run python -m pytest tests/ --cov=app --cov-report=html

# Run end-to-end tests
uv run python scripts/e2e_webhook_test.py
```

### Code Quality Tools
```bash
# Check code style
uv run ruff check app/

# Format code
uv run ruff format app/

# Fix auto-fixable issues
uv run ruff check --fix app/
```

### TaskIQ Worker
```bash
# Start async task worker
uv run -m taskiq worker app.taskiq.broker_manager:broker --workers 1
```

## Makefile Integration

The project includes a comprehensive Makefile that wraps uv commands with convenient shortcuts:

```bash
# Development
make install      # uv sync
make install-dev  # uv sync --dev
make dev          # Start development server
make test         # Run tests

# Code Quality
make lint         # Code style check
make format       # Format code

# Docker
make build        # Build and start services
make start        # Start services
make logs         # View logs
```

## Rationale

- **Performance**: uv is significantly faster than pip for dependency resolution and installation
- **Reproducibility**: uv.lock ensures consistent dependency versions across environments
- **Developer Experience**: `uv run` automatically manages virtual environments and dependencies
- **Modern Standards**: Uses PEP 621 (pyproject.toml) and modern Python packaging standards

## Integration Points

- **Testing**: All test execution uses `uv run python -m pytest`
- **Development Server**: `uv run uvicorn` for FastAPI development
- **Code Quality**: `uv run ruff` for linting and formatting
- **Scripts**: All utility scripts use `uv run python`

<!-- Inclusion Mode: Conditional: ["*.py", "pytest.ini", "Makefile", "scripts/**/*", "tests/**/*"] -->
