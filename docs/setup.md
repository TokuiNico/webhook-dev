# Installation and Setup Guide

## Prerequisites

- **Docker** and **Docker Compose** (Recommended)
- **Python 3.13+** (For local development)
- **PostgreSQL 15+** (For production)
- **RabbitMQ 3+** (For production)

## Quick Start (Docker)

The easiest way to run the Webhook Gateway is using Docker Compose. This starts the Backend, Frontend, Database (PostgreSQL), and Message Broker (RabbitMQ).

```bash
# Clone the repository
git clone <repository-url>
cd webhook-dev

# For development (uses SQLite + InMemoryBroker)
cp example.env .env

# For production (uses PostgreSQL + RabbitMQ)
cp example.prod.env .env
# Edit .env and change all passwords/secrets!

# Start all services
docker compose up --build -d
```

Access the services:
- **Frontend Dashboard**: http://localhost
- **API Documentation**: http://localhost:8000/docs
- **RabbitMQ Management**: http://localhost:15672 (User: `admin`, Pass: `admin`)

## Local Development

If you want to run the code locally without Docker:

### 1. Install Dependencies

We use `uv` for package management.

```bash
# Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync
```

### 2. Configuration

Create a `.env` file based on `example.env` for development:

```bash
cp example.env .env
```

### 3. Run Backend

```bash
# Run the API server
uv run uvicorn app.main:app --reload

# Run the TaskIQ worker (in a separate terminal)
uv run taskiq worker app.taskiq.broker_manager:broker
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Production Deployment

For production, use `example.prod.env` as a template:

```bash
cp example.prod.env .env
```

Then update your `.env` file with secure credentials:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://prod_user:secure_password@db:5432/webhook_prod
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=webhook_prod

# RabbitMQ
RABBITMQ_URL=amqp://prod_admin:secure_mq_password@rabbitmq:5672/
RABBITMQ_USER=prod_admin
RABBITMQ_PASSWORD=secure_mq_password

# Security - Generate strong random keys!
API_KEY=your-secure-api-key
SECRET_KEY=your-secure-secret-key
CORS_ORIGINS=["https://your-domain.com"]

# Production Mode
DEVELOPMENT=false
USE_SQLITE=false
USE_MEMORY_BROKER=false
```
