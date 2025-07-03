from fastapi import APIRouter

from app.api.v1.endpoints import ingest, subscriptions, stats, topics

api_router = APIRouter()

# Include all endpoint routers - 使用 FastStream 版本的 ingest
api_router.include_router(ingest.router, prefix="/ingest", tags=["webhook-ingestion"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscription-management"])
api_router.include_router(stats.router, prefix="/stats", tags=["statistics"])
api_router.include_router(topics.router, prefix="/manage", tags=["topic-source-management"])
