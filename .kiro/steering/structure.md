# Webhook Gateway - Project Structure & Code Organization

## Root Directory Organization

### Core Application (`app/`)
Main application package containing all business logic and API endpoints.

```
app/
├── __init__.py              # Package initialization
├── main.py                  # FastAPI application factory and startup logic
├── api/                     # API layer - HTTP endpoints and routing
├── core/                    # Core utilities and shared functionality
├── db/                     # Database layer - models, sessions, and migrations
├── middleware/             # Custom middleware for security and processing
├── monitoring/             # Metrics, logging, and observability
├── schemas/                # Pydantic models for API data validation
├── services/               # Business logic layer - service classes
└── taskiq/                 # Async task processing and event distribution
```

### Infrastructure & Configuration (`config/`)
External service configurations and connection settings.

```
config/
├── mysql/                   # MySQL server configuration
└── rabbitmq/               # RabbitMQ server configuration
```

### Documentation (`docs/`)
Project documentation and API references.

```
docs/
├── api-endpoints.md        # Complete API endpoint documentation
└── guide.md               # User guide and development documentation
```

### Testing Infrastructure (`tests/`)
Comprehensive test suite with factories and test data management.

```
tests/
├── __init__.py            # Test package initialization
├── conftest.py            # Pytest configuration and shared fixtures
├── factories.py           # Test data factories for consistent test data
├── test_api_endpoints.py  # API endpoint integration tests
├── test_basic.py          # Basic functionality tests
└── test_webhook_service.py # Webhook service business logic tests
```

### Scripts & Utilities (`scripts/`)
Development and testing utilities.

```
scripts/
├── e2e_webhook_test.py    # End-to-end webhook testing
├── README.md             # Script documentation
├── run_tests.py          # Test execution wrapper
├── setup_test_data.py     # Test database setup
├── subscriptions_api_demo.py # API demonstration
├── webhook_debug.py      # Webhook debugging utilities
└── webhook_demo.py       # Webhook functionality demonstration
```

## API Layer Structure (`app/api/`)

### Versioned API (`app/api/v1/`)
Current API version with organized endpoint modules.

```
app/api/v1/
├── __init__.py           # API package initialization
├── api_router.py         # Main API router aggregation
├── deps.py              # FastAPI dependencies (DB sessions, auth)
├── ingest.py            # Webhook ingestion endpoints
├── logs.py              # Event log querying and management
├── source.py            # Webhook source management
├── stats.py             # Statistics and metrics endpoints
├── subscriptions.py     # Subscription management endpoints
└── topics.py            # Topic management endpoints
```

### API Organization Patterns
- **Resource-based routing**: `/api/v1/{resource}/` for CRUD operations
- **Webhook ingestion**: `/api/v1/ingest/{topic_id}` for webhook delivery
- **Dependency injection**: Centralized dependency management in `deps.py`
- **Response models**: Consistent response structures across endpoints

## Core Layer Structure (`app/core/`)

### Shared Utilities (`app/core/`)
Common functionality used across the application.

```
app/core/
├── __init__.py          # Core package initialization
├── authentication/      # Authentication and authorization utilities
├── config.py           # Application configuration management
├── error_handler.py    # Global exception handling and formatting
├── exceptions.py       # Custom exception classes
└── ids.py              # ID generation utilities (ULID)
```

### Authentication Module (`app/core/authentication/`)
Security and authentication functionality.

```
app/core/authentication/
├── __init__.py         # Authentication package initialization
├── base.py            # Base authentication validator
├── bearer.py          # Bearer token authentication
├── hmac.py            # HMAC signature verification
├── none.py            # No authentication (for open endpoints)
└── signature.py       # Webhook signature validation
```

## Database Layer Structure (`app/db/`)

### Database Models and Sessions (`app/db/`)
Data persistence layer with SQLAlchemy ORM.

```
app/db/
├── __init__.py         # Database package initialization
├── base.py            # Base model classes and mixins
├── models.py          # Database models (EventLog, Subscription, etc.)
└── session.py         # Database session management and connection pooling
```

### Database Patterns
- **Async-first design**: All database operations use `async with AsyncSessionLocal()`
- **Connection pooling**: Efficient database connection management
- **Transaction management**: Proper transaction boundaries for data consistency
- **Model relationships**: Clear foreign key relationships and associations

## Service Layer Structure (`app/services/`)

### Business Logic Services (`app/services/`)
Encapsulated business logic and complex operations.

```
app/services/
├── __init__.py               # Services package initialization
├── base.py                  # Base service class with common functionality
├── log_service.py           # Event log management and querying
├── stats_service.py         # Statistics calculation and aggregation
├── subscription_service.py  # Subscription lifecycle management
├── topic_service.py         # Topic management and validation
└── webhook_service.py       # Core webhook processing logic
```

### Service Layer Patterns
- **Dependency injection**: Services receive dependencies through constructor
- **Repository pattern**: Services act as repositories for business operations
- **Error handling**: Services handle business logic errors and edge cases
- **Transaction management**: Services manage database transactions appropriately

## Async Processing Layer (`app/taskiq/`)

### Task Queue and Event Processing (`app/taskiq/`)
Asynchronous task processing with TaskIQ and RabbitMQ.

```
app/taskiq/
├── __init__.py             # TaskIQ package initialization
├── broker_manager.py       # TaskIQ broker configuration and lifecycle
└── tasks.py               # Async task definitions and handlers
```

### Task Processing Patterns
- **Event-driven architecture**: Webhook events trigger async processing tasks
- **Retry mechanisms**: Failed tasks are retried with exponential backoff
- **Message routing**: Events are routed to appropriate task handlers
- **Error isolation**: Task failures don't affect webhook ingestion

## Middleware Layer (`app/middleware/`)

### Custom Middleware (`app/middleware/`)
HTTP request/response processing middleware.

```
app/middleware/
├── __init__.py           # Middleware package initialization
└── security.py          # Security middleware (rate limiting, validation)
```

### Middleware Patterns
- **Security middleware**: Rate limiting and webhook validation
- **Request processing**: Pre/post processing of HTTP requests
- **Error handling**: Middleware-level error handling and logging

## Monitoring Layer (`app/monitoring/`)

### Observability and Metrics (`app/monitoring/`)
System monitoring, metrics, and logging.

```
app/monitoring/
├── __init__.py          # Monitoring package initialization
└── metrics.py          # Prometheus metrics collection and reporting
```

### Monitoring Patterns
- **Prometheus integration**: Standard metrics collection for monitoring
- **Structured logging**: Consistent logging format across the application
- **Health checks**: Built-in health and readiness endpoints
- **Performance metrics**: Request timing and error rate tracking

## Schema Layer (`app/schemas/`)

### Data Validation Models (`app/schemas/`)
Pydantic models for API data validation and serialization.

```
app/schemas/
├── __init__.py         # Schemas package initialization
├── base.py            # Base schema classes and common fields
├── event_log.py       # Event log request/response schemas
├── source.py          # Webhook source schemas
├── stats.py           # Statistics response schemas
├── subscription.py    # Subscription management schemas
└── topic.py           # Topic management schemas
```

### Schema Patterns
- **Request/Response separation**: Clear distinction between input and output models
- **Validation rules**: Comprehensive input validation with meaningful error messages
- **Optional fields**: Proper handling of optional vs required fields
- **Nested models**: Complex nested data structures for API responses

## Key Architectural Principles

### Separation of Concerns
- **API Layer**: HTTP request handling, routing, and response formatting
- **Service Layer**: Business logic, data transformation, and orchestration
- **Database Layer**: Data persistence, relationships, and query optimization
- **Task Layer**: Async processing, event distribution, and background jobs

### Dependency Flow
```
HTTP Request → API Layer → Service Layer → Database Layer
                     ↓
               TaskIQ Tasks ← Async Processing
```

### Code Organization Guidelines
- **Single Responsibility**: Each module has one clear purpose
- **Import Organization**: Standard library → Third-party → Local imports
- **Type Safety**: Comprehensive type hints throughout the codebase
- **Async Consistency**: All I/O operations use async/await patterns

### File Naming Conventions
- **Modules**: `snake_case.py` (e.g., `webhook_service.py`)
- **Classes**: `PascalCase` (e.g., `WebhookService`)
- **Functions**: `snake_case` (e.g., `process_webhook_event`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)

### Testing Organization
- **Unit Tests**: Test individual functions and methods in isolation
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test complete webhook processing workflows
- **Test Factories**: Consistent test data generation and cleanup

This structure supports the project's goals of reliability, scalability, and maintainability while providing clear separation between different aspects of the webhook gateway functionality.
