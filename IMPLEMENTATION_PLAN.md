# Webhook Gateway: Implementation Plan & TODO

**Project:** Webhook Gateway Service
**Stack:** Python, FastAPI, Pydantic, Celery, RabbitMQ, MySQL, uv, uvicorn
**Note:** This plan is designed to handle multiple payload formats including JSON, XML, and x-www-form-urlencoded.

---

## 1. Project Directory Structure

```
webhook-gateway/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point, run with uvicorn
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── ingest.py       # Endpoint for receiving webhooks
│   │   │   │   └── subscriptions.py # API for managing subscriptions
│   │   │   └── deps.py             # FastAPI dependencies (e.g., DB session, security)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # Pydantic settings management
│   │   └── security.py           # Security functions (e.g., HMAC verification)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py               # Base for SQLAlchemy models
│   │   ├── models.py             # SQLAlchemy ORM models
│   │   └── session.py            # Database session management
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── subscription.py       # Pydantic schemas for subscriptions
│   │   └── topic.py              # Pydantic schemas for topics
│   └── worker/
│       ├── __init__.py
│       ├── celery_app.py         # Celery application instance
│       └── tasks.py              # Celery task definitions (e.g., dispatching)
│
├── tests/                      # Unit and integration tests
│   ├── __init__.py
│   ├── api/
│   └── worker/
│
├── .env                        # Environment variables (for local development)
├── .gitignore
├── docker-compose.yml          # Docker Compose for all services
├── Dockerfile                  # Dockerfile for the FastAPI/Celery app
└── pyproject.toml              # Python project metadata and dependencies (for uv)
```

## 2. Database Schema (MySQL)

We will use SQLAlchemy as the ORM. The primary tables are:

1.  **`sources`**: Stores information about trusted webhook sources and their secrets for verification.
    *   `id` (PK)
    *   `name` (VARCHAR, UNIQUE): e.g., "github", "stripe"
    *   `secret` (VARCHAR): The secret key for HMAC signature validation.
    *   `created_at`, `updated_at`

2.  **`topics`**: Defines the event channels.
    *   `id` (PK)
    *   `name` (VARCHAR, UNIQUE): e.g., "github.push", "stripe.payment.succeeded"
    *   `source_id` (FK to `sources.id`)
    *   `description` (TEXT)
    *   `created_at`, `updated_at`

3.  **`subscriptions`**: Links subscribers to topics.
    *   `id` (PK)
    *   `topic_id` (FK to `topics.id`)
    *   `subscriber_name` (VARCHAR): A human-readable name for the subscriber service.
    *   `target_url` (VARCHAR): The URL to which the webhook should be sent.
    *   `is_active` (BOOLEAN)
    *   `created_at`, `updated_at`

4.  **`event_logs`**: Logs every incoming event for traceability. **(Modified for multi-format support)**
    *   `id` (PK)
    *   `topic_id` (FK to `topics.id`)
    *   `source_ip` (VARCHAR)
    *   `headers` (JSON)
    *   `content_type` (VARCHAR): **New field to store the original Content-Type header.**
    *   `payload` (LONGTEXT): **Changed from JSON to LONGTEXT to store the raw request body.**
    *   `status` (ENUM: "received", "queued", "failed_validation")
    *   `received_at`

5.  **`dispatch_logs`**: Logs every dispatch attempt for a subscription.
    *   `id` (PK)
    *   `event_log_id` (FK to `event_logs.id`)
    *   `subscription_id` (FK to `subscriptions.id`)
    *   `attempt` (INTEGER)
    *   `status` (ENUM: "success", "failed", "retrying")
    *   `response_status_code` (INTEGER)
    *   `response_body` (TEXT)
    *   `dispatched_at`

## 3. Core Components Implementation

### a. FastAPI Application (`app/main.py` served by Uvicorn)
-   Initializes the FastAPI app.
-   Mounts the API routers from `app/api/v1/endpoints`.
-   Handles application lifecycle events (startup/shutdown), like creating an initial DB connection pool.
-   The application will be started using `uvicorn app.main:app`.

### b. Ingestion Endpoint (`app/api/v1/endpoints/ingest.py`)
-   **Endpoint**: `POST /ingest/{source_name}/{topic_name}`
-   **Logic (Modified for multi-format support)**:
    1.  Accepts a raw HTTP `Request` object to access headers and the raw body.
    2.  Reads the raw request body using `await request.body()`.
    3.  Reads the `Content-Type` header from `request.headers`.
    4.  Uses a dependency to verify the source and topic exist in the DB.
    5.  Uses another dependency from `app/core/security.py` to perform HMAC signature validation on the **raw request body**.
    6.  If validation is successful:
        -   Logs the incoming event to the `event_logs` table, storing the **raw payload**, **content_type**, and headers.
        -   Creates a Celery task, sending the `event_log.id`.
        -   Returns an immediate `202 Accepted` response.
    7.  If validation fails, logs the event and returns a `403 Forbidden`.

### c. Subscription API (`app/api/v1/endpoints/subscriptions.py`)
-   Standard CRUD operations for subscriptions.
-   `POST /subscriptions/`: Creates a new subscription.
-   `GET /subscriptions/`: Lists all subscriptions, with filtering.
-   `DELETE /subscriptions/{sub_id}`: Deactivates a subscription.
-   All endpoints should be protected by an internal API key.

### d. Celery Worker (`app/worker/tasks.py`)
-   **Task**: `dispatch_webhooks(event_log_id: int)`
-   **Logic**:
    1.  Receives `event_log_id`.
    2.  Retrieves the full event log from the database, including the **raw payload** and **content_type**.
    3.  Finds all active subscriptions for that topic.
    4.  For each subscription, launch a sub-task `send_to_subscriber(subscription_id, event_log)`.
-   **Sub-Task**: `send_to_subscriber(subscription_id: int, event_log: dict)`
-   **Logic (Modified for multi-format support)**:
    1.  Constructs an HTTP POST request to the `target_url`.
    2.  **Crucially, sets the `Content-Type` header of the outgoing request to the `content_type` from the `event_log`.**
    3.  **Uses the raw `payload` string from the `event_log` as the request body.**
    4.  Implements retry logic using Celery's built-in mechanisms.
    5.  Logs the outcome of each attempt to the `dispatch_logs` table.

## 4. Environment & Deployment (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: webhook_db
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  rabbitmq:
    image: rabbitmq:3.9-management
    container_name: webhook_rabbitmq
    ports:
      - "5672:5672"  # AMQP
      - "15672:15672" # Management UI

  api:
    build: .
    container_name: webhook_api
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
      - rabbitmq
    env_file:
      - .env

  worker:
    build: .
    container_name: webhook_worker
    command: celery -A app.worker.celery_app worker --loglevel=info
    volumes:
      - .:/app
    depends_on:
      - db
      - rabbitmq
    env_file:
      - .env

volumes:
  mysql_data:
```

## 5. TODO List

### Phase 1: Core Setup & Database
- [x] Initialize project directory structure.
- [x] Create `pyproject.toml` and define dependencies.
- [x] Use `uv` to create a virtual environment and install dependencies (`uv venv` & `uv pip sync`).
- [x] **Dependencies**: `fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `mysqlclient`, `celery`, `redis`, `alembic`, `python-multipart`, `lxml`.
- [ ] Create `Dockerfile` and `docker-compose.yml`.
- [x] Implement Pydantic settings in `app/core/config.py`.
- [x] **Define SQLAlchemy models in `app/db/models.py` (ensure `event_logs` has `content_type` and `payload` as LONGTEXT).**
- [x] Set up database session management (`app/db/session.py`) and initialize Alembic for migrations.

### Phase 2: Ingestion Logic
- [ ] **Implement the `POST /ingest/{source}/{topic}` endpoint to handle raw bodies and content types.**
- [ ] Implement HMAC signature verification logic in `app/core/security.py` to work with the raw body.
- [ ] Create a FastAPI dependency to perform the verification.
- [ ] Implement logging of incoming events to the modified `event_logs` table.

### Phase 3: Background Worker & Dispatching
- [ ] Configure Celery application in `app/worker/celery_app.py`.
- [ ] Create the `dispatch_webhooks` Celery task.
- [ ] **Create the `send_to_subscriber` sub-task, ensuring it forwards the original `Content-Type` and raw payload.**
- [ ] Implement logging to the `dispatch_logs` table from the Celery task.
- [ ] Test the full flow with JSON, form-data, and XML payloads.

### Phase 4: Management API
- [ ] Implement CRUD endpoints for Subscriptions in `app/api/v1/endpoints/subscriptions.py`.
- [ ] Implement Pydantic schemas for the subscription API.
- [ ] Add API key authentication for management endpoints.

### Phase 5: Testing & Documentation
- [ ] Write unit tests for security functions and business logic.
- [ ] Write integration tests for the API endpoints with various content types.
- [ ] Write integration tests for the Celery worker flow.
- [ ] Document API endpoints using OpenAPI/Swagger (auto-generated by FastAPI).
- [ ] Create a `README.md` with setup and usage instructions.
