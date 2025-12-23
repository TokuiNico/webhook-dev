# Usage Guide

## Concepts

- **Source**: An external service sending webhooks (e.g., GitHub, Stripe).
- **Topic**: A specific event type (e.g., `github.push`).
- **Subscription**: A rule connecting a Topic to a Subscriber URL.
- **Event**: An individual webhook request.

## API Usage

### 1. Authentication

Management endpoints require the `API_KEY` set in your configuration.

Header: `Authorization: Bearer <your-api-key>`

### 2. Create a Source

Define a source and its authentication method.

```bash
POST /api/v1/manage/sources/
{
  "name": "github",
  "auth_type": "signature",
  "auth_config": {
    "format_type": "github",
    "secret": "your-webhook-secret"
  }
}
```

### 3. Create a Topic

```bash
POST /api/v1/manage/topics/
{
  "name": "github.push",
  "source_id": "<source_ulid>"
}
```

### 4. Subscribe to Events

```bash
POST /api/v1/subscriptions/
{
  "topic_id": "<topic_id>",
  "target_url": "https://your-service.com/webhook",
  "subscriber_name": "My Service"
}
```

### 5. Ingest Webhooks

Send webhooks to the ingest URL. This endpoint does **not** require the API Key, but validates the payload signature if configured.

```
POST /api/v1/ingest/{topic_id}
```

**Headers (Example for GitHub):**
- `Content-Type: application/json`
- `X-Hub-Signature-256: sha256=...`

## Monitoring

- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics` (Prometheus format)
- **Stats**: `GET /api/v1/stats/overview`
