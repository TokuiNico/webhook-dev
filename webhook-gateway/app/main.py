from fastapi import FastAPI
from app.db.base import Base
from app.db.session import engine

app = FastAPI(
    title="Webhook Gateway",
    description="A gateway to receive, process, and dispatch webhooks asynchronously.",
    version="0.1.0",
)

@app.on_event("startup")
async def on_startup():
    """Create database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
def read_root():
    """A simple endpoint to confirm the service is running."""
    return {"status": "ok"}
