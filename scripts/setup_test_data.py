#!/usr/bin/env python3
"""
測試設置腳本 - 初始化 SQLite 資料庫並插入測試資料
"""
import asyncio

from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base
from app.db.models import Source, Topic, Subscription
from app.core.config import settings

async def init_database():
    """初始化資料庫表"""
    print("🗄️ 初始化資料庫...")
    async with engine.begin() as conn:
        # 創建所有表
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 資料庫表創建完成")

async def insert_test_data():
    """插入測試資料"""
    print("📝 插入測試資料...")

    session = AsyncSessionLocal()
    try:
        # 檢查並創建 GitHub 來源
        from sqlalchemy import select

        # 檢查 GitHub 來源是否存在
        result = await session.execute(select(Source).where(Source.name == "github"))
        github_source = result.scalar_one_or_none()

        if not github_source:
            github_source = Source(
                name="github",
                secret="github_test_secret_123"
            )
            session.add(github_source)
            await session.commit()
            await session.refresh(github_source)
            print("✅ 創建 GitHub 來源")
        else:
            print("ℹ️ GitHub 來源已存在")

        # 創建 GitHub push 主題
        push_topic = Topic(
            name="push",
            source_id=github_source.id,
            description="GitHub push events"
        )
        session.add(push_topic)
        await session.commit()
        await session.refresh(push_topic)

        # 創建 Stripe 來源
        stripe_source = Source(
            name="stripe",
            secret="stripe_test_secret_456"
        )
        session.add(stripe_source)
        await session.commit()
        await session.refresh(stripe_source)

        # 創建 Stripe payment 主題
        payment_topic = Topic(
            name="payment.succeeded",
            source_id=stripe_source.id,
            description="Stripe payment succeeded events"
        )
        session.add(payment_topic)
        await session.commit()
        await session.refresh(payment_topic)

        # 創建測試訂閱
        test_subscription = Subscription(
            topic_id=push_topic.id,
            subscriber_name="Test Service",
            target_url="https://httpbin.org/post",  # 測試用端點
            is_active=True
        )
        session.add(test_subscription)
        await session.commit()

        print(f"✅ 測試資料插入完成:")
        print(f"   - 來源: GitHub (ID: {github_source.id}), Stripe (ID: {stripe_source.id})")
        print(f"   - 主題: push (ID: {push_topic.id}), payment.succeeded (ID: {payment_topic.id})")
        print(f"   - 訂閱: Test Service (ID: {test_subscription.id})")
    finally:
        await session.close()

async def show_test_info():
    """顯示測試資訊"""
    print("\n🧪 測試環境配置:")
    print(f"   - 資料庫: {settings.DATABASE_URL}")
    print(f"   - 開發模式: {settings.DEVELOPMENT}")
    print(f"   - 使用 SQLite: {settings.USE_SQLITE}")

    print("\n🚀 可以進行的測試:")
    print("   1. 啟動 API 服務:")
    print("      uv run uvicorn app.main:app --reload")
    print("\n   2. FastStream 已整合到主應用，無需額外 worker 服務")
    print("\n   3. 測試 GitHub webhook:")
    print("      curl -X POST http://localhost:8000/api/v1/ingest/github/push \\")
    print("        -H 'Content-Type: application/json' \\")
    print("        -H 'X-Hub-Signature-256: sha256=dummy' \\")
    print("        -d '{\"test\": \"data\"}'")

    print("\n   4. 檢查健康狀態:")
    print("      curl http://localhost:8000/health")

async def main():
    """主要執行流程"""
    print("🎯 Webhook Gateway 測試環境設置")
    print("=" * 50)

    try:
        await init_database()
        await insert_test_data()
        await show_test_info()

        print("\n✅ 測試環境設置完成！")
        print("🎉 現在可以開始測試了！")

    except Exception as e:
        print(f"❌ 設置失敗: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
