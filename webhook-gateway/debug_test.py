#!/usr/bin/env python3
"""
診斷腳本 - 逐步檢查各個組件是否正常運行
"""
import sys
import os

def test_imports():
    """測試所有必要的模組導入"""
    print("🔍 測試模組導入...")
    
    try:
        # 測試基本模組
        import asyncio
        print("  ✅ asyncio")
        
        import sqlite3
        print("  ✅ sqlite3")
        
        # 測試第三方模組
        try:
            import pydantic
            print("  ✅ pydantic")
        except ImportError as e:
            print(f"  ❌ pydantic: {e}")
            return False
            
        try:
            import fastapi
            print("  ✅ fastapi")
        except ImportError as e:
            print(f"  ❌ fastapi: {e}")
            return False
            
        try:
            import sqlalchemy
            print("  ✅ sqlalchemy")
        except ImportError as e:
            print(f"  ❌ sqlalchemy: {e}")
            return False
            
        try:
            import celery
            print("  ✅ celery")
        except ImportError as e:
            print(f"  ❌ celery: {e}")
            return False
            
        try:
            import fakeredis
            print("  ✅ fakeredis")
        except ImportError as e:
            print(f"  ❌ fakeredis: {e}")
            return False
            
        return True
        
    except Exception as e:
        print(f"  ❌ 基本模組導入失敗: {e}")
        return False

def test_app_imports():
    """測試應用模組導入"""
    print("\n🔍 測試應用模組導入...")
    
    # 添加應用路徑
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
    
    try:
        from app.core.config import settings
        print("  ✅ app.core.config")
        print(f"      DATABASE_URL: {settings.DATABASE_URL}")
        print(f"      DEVELOPMENT: {settings.DEVELOPMENT}")
        print(f"      USE_FAKE_REDIS: {settings.USE_FAKE_REDIS}")
        
        from app.db.base import Base
        print("  ✅ app.db.base")
        
        from app.db.models import Source, Topic, Subscription, EventLog
        print("  ✅ app.db.models")
        
        from app.db.session import engine, AsyncSessionLocal
        print("  ✅ app.db.session")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 應用模組導入失敗: {e}")
        print(f"      錯誤詳情: {type(e).__name__}: {e}")
        return False

def test_database_connection():
    """測試資料庫連接"""
    print("\n🔍 測試資料庫連接...")
    
    try:
        import asyncio
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
        
        from app.db.session import engine
        from app.db.base import Base
        
        async def test_db():
            try:
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                print("  ✅ 資料庫連接成功，表格創建完成")
                return True
            except Exception as e:
                print(f"  ❌ 資料庫連接失敗: {e}")
                return False
        
        return asyncio.run(test_db())
        
    except Exception as e:
        print(f"  ❌ 資料庫測試失敗: {e}")
        return False

def test_fakeredis():
    """測試 FakeRedis"""
    print("\n🔍 測試 FakeRedis...")
    
    try:
        import fakeredis
        
        # 創建 FakeRedis 實例
        redis_client = fakeredis.FakeRedis()
        
        # 測試基本操作
        redis_client.set("test_key", "test_value")
        value = redis_client.get("test_key")
        
        if value == b"test_value":
            print("  ✅ FakeRedis 基本操作正常")
            return True
        else:
            print(f"  ❌ FakeRedis 操作異常: 期望 b'test_value', 得到 {value}")
            return False
            
    except Exception as e:
        print(f"  ❌ FakeRedis 測試失敗: {e}")
        return False

def test_celery_basic():
    """測試 Celery 基本配置"""
    print("\n🔍 測試 Celery 基本配置...")
    
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
        
        from app.core.redis_client import get_redis_url
        redis_url = get_redis_url()
        print(f"  📍 Redis URL: {redis_url}")
        
        from app.worker.celery_app import celery_app
        print(f"  📍 Celery Broker: {celery_app.conf.broker_url}")
        print("  ✅ Celery 配置載入成功")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Celery 配置測試失敗: {e}")
        return False

def show_environment():
    """顯示環境資訊"""
    print("\n🔍 環境資訊:")
    print(f"  Python 版本: {sys.version}")
    print(f"  當前目錄: {os.getcwd()}")
    print(f"  Python 路徑: {sys.path[:3]}...")

def main():
    """主要診斷流程"""
    print("🚨 Webhook Gateway 問題診斷工具")
    print("=" * 50)
    
    show_environment()
    
    # 逐步診斷
    tests = [
        ("基本模組導入", test_imports),
        ("應用模組導入", test_app_imports),
        ("資料庫連接", test_database_connection),
        ("FakeRedis", test_fakeredis),
        ("Celery 配置", test_celery_basic)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"  ❌ {name} 測試過程中發生錯誤: {e}")
            results.append((name, False))
    
    # 顯示總結
    print("\n📊 診斷結果總結:")
    print("=" * 30)
    
    all_passed = True
    for name, passed in results:
        status = "✅ 通過" if passed else "❌ 失敗"
        print(f"  {name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 所有測試都通過了！您可以嘗試運行完整測試。")
    else:
        print("\n🚨 發現問題，請檢查上述失敗的項目。")
        print("\n💡 常見解決方案:")
        print("  1. 確保已安裝所有依賴: uv pip sync")
        print("  2. 確保在正確的目錄中運行: cd webhook-gateway")
        print("  3. 檢查 Python 版本是否 >= 3.11")
        print("  4. 檢查是否有權限創建檔案")

if __name__ == "__main__":
    main() 