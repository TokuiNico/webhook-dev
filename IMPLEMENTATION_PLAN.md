# Webhook Gateway: Implementation Plan & TODO

**Project:** Webhook Gateway Service
**Stack:** Python, FastAPI, Pydantic, Celery, RabbitMQ, MySQL

---

## 1. Project Directory Structure

```
webhook-gateway/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
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
└── requirements.txt            # Python dependencies
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

4.  **`event_logs`**: Logs every incoming event for traceability.
    *   `id` (PK)
    *   `topic_id` (FK to `topics.id`)
    *   `source_ip` (VARCHAR)
    *   `headers` (JSON)
    *   `payload` (JSON)
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

### a. FastAPI Application (`app/main.py`)
-   Initializes the FastAPI app.
-   Mounts the API routers from `app/api/v1/endpoints`.
-   Handles application lifecycle events (startup/shutdown), like creating an initial DB connection pool.

### b. Ingestion Endpoint (`app/api/v1/endpoints/ingest.py`)
-   **Endpoint**: `POST /ingest/{source_name}/{topic_name}`
-   **Logic**:
    1.  Accepts a raw HTTP `Request` object to access headers and body.
    2.  Uses a dependency to verify the source and topic exist in the DB.
    3.  Uses another dependency from `app/core/security.py` to perform HMAC signature validation using the stored secret.
    4.  If validation is successful:
        -   Logs the incoming event to the `event_logs` table with "received" status.
        -   Creates a Celery task to handle the dispatch.
        -   Sends the `event_log.id` to the Celery task.
        -   Returns an immediate `202 Accepted` response.
    5.  If validation fails, logs the event with "failed_validation" status and returns a `403 Forbidden`.

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
    2.  Retrieves the event details (payload, headers) and topic from the database.
    3.  Finds all active subscriptions for that topic from the `subscriptions` table.
    4.  For each subscription:
        -   Launch a sub-task `send_to_subscriber(subscription_id, event_data)`.
-   **Sub-Task**: `send_to_subscriber(subscription_id: int, event_data: dict)`
-   **Logic**:
    1.  Makes an HTTP POST request to the `target_url` of the subscription.
    2.  **Retry Logic**: Uses Celery's built-in retry mechanism.
        ```python
        # In tasks.py
        @celery_app.task(bind=True, max_retries=5, default_retry_delay=60) # Exponential backoff
        def send_to_subscriber(self, subscription_id, event_data):
            try:
                # ... make HTTP request ...
                if response.status_code >= 500:
                    raise self.retry(exc=Exception("Service Unavailable"))
            except Exception as exc:
                # Log the failed attempt
                raise self.retry(exc=exc)
        ```
    3.  **Dead-Letter Queue**: After max retries, Celery will automatically route the failed task to a dead-letter queue if configured in `celery_app.py`. This requires manual inspection.
    4.  Logs the outcome of each attempt to the `dispatch_logs` table.

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
- [ ] Initialize project directory structure.
- [ ] Set up `requirements.txt` (fastapi, uvicorn, pydantic, sqlalchemy, mysqlclient, celery, redis).
- [ ] Create `Dockerfile` and `docker-compose.yml`.
- [ ] Implement Pydantic settings in `app/core/config.py`.
- [ ] Define SQLAlchemy models in `app/db/models.py`.
- [ ] Set up database session management (`app/db/session.py`) and Alembic for migrations.

### Phase 2: Ingestion Logic
- [ ] Implement the `POST /ingest/{source}/{topic}` endpoint.
- [ ] Implement HMAC signature verification logic in `app/core/security.py`.
- [ ] Create a FastAPI dependency to perform the verification.
- [ ] Implement logging of incoming events to the `event_logs` table.

### Phase 3: Background Worker & Dispatching
- [ ] Configure Celery application in `app/worker/celery_app.py` to use RabbitMQ broker and a results backend.
- [ ] Create the `dispatch_webhooks` Celery task.
- [ ] Create the `send_to_subscriber` sub-task with retry and error handling.
- [ ] Implement logging to the `dispatch_logs` table from the Celery task.
- [ ] Test the full flow: Ingestion -> Queuing -> Dispatching.

### Phase 4: Management API
- [ ] Implement CRUD endpoints for Subscriptions in `app/api/v1/endpoints/subscriptions.py`.
- [ ] Implement Pydantic schemas for the subscription API.
- [ ] Add API key authentication for management endpoints.

### Phase 5: Testing & Documentation
- [ ] Write unit tests for security functions and business logic.
- [ ] Write integration tests for the API endpoints.
- [ ] Write integration tests for the Celery worker flow.
- [ ] Document API endpoints using OpenAPI/Swagger (auto-generated by FastAPI).
- [ ] Create a `README.md` with setup and usage instructions.
