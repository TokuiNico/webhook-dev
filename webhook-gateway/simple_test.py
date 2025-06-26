#!/usr/bin/env python3
"""
最簡單的測試 - 僅測試 FastAPI 基本功能
"""
import sys
import os

# 添加應用路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_basic_fastapi():
    """測試基本的 FastAPI 應用"""
    print("🚀 測試基本 FastAPI 應用...")
    
    try:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        
        # 創建簡單的測試應用
        app = FastAPI(title="Test App")
        
        @app.get("/")
        def read_root():
            return {"status": "ok"}
        
        @app.get("/health")
        def health_check():
            return {"status": "healthy"}
        
        # 創建測試客戶端
        client = TestClient(app)
        
        # 測試根端點
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        print("  ✅ 根端點測試通過")
        
        # 測試健康檢查
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
        print("  ✅ 健康檢查端點測試通過")
        
        return True
        
    except ImportError as e:
        print(f"  ❌ FastAPI 導入失敗: {e}")
        print("     請確保已安裝 FastAPI: uv pip install fastapi")
        return False
    except Exception as e:
        print(f"  ❌ FastAPI 測試失敗: {e}")
        return False

def test_basic_sqlalchemy():
    """測試基本的 SQLAlchemy 功能"""
    print("\n🗄️ 測試基本 SQLAlchemy 功能...")
    
    try:
        from sqlalchemy import create_engine, Column, Integer, String
        from sqlalchemy.ext.declarative import declarative_base
        from sqlalchemy.orm import sessionmaker
        
        # 創建記憶體 SQLite 資料庫
        engine = create_engine("sqlite:///:memory:", echo=False)
        Base = declarative_base()
        
        # 定義簡單模型
        class TestModel(Base):
            __tablename__ = "test"
            id = Column(Integer, primary_key=True)
            name = Column(String(50))
        
        # 創建表格
        Base.metadata.create_all(engine)
        print("  ✅ SQLAlchemy 引擎和模型創建成功")
        
        # 測試資料操作
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # 插入測試資料
        test_record = TestModel(name="test")
        session.add(test_record)
        session.commit()
        
        # 查詢資料
        result = session.query(TestModel).first()
        assert result.name == "test"
        print("  ✅ SQLAlchemy 資料操作測試通過")
        
        session.close()
        return True
        
    except ImportError as e:
        print(f"  ❌ SQLAlchemy 導入失敗: {e}")
        return False
    except Exception as e:
        print(f"  ❌ SQLAlchemy 測試失敗: {e}")
        return False

def test_config():
    """測試配置模組"""
    print("\n⚙️ 測試配置模組...")
    
    try:
        from app.core.config import settings
        
        print(f"  📍 DATABASE_URL: {settings.DATABASE_URL}")
        print(f"  📍 DEVELOPMENT: {settings.DEVELOPMENT}")
        print(f"  📍 USE_FAKE_REDIS: {settings.USE_FAKE_REDIS}")
        print("  ✅ 配置載入成功")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 配置載入失敗: {e}")
        return False

def main():
    """主要測試流程"""
    print("🧪 Webhook Gateway 簡單測試")
    print("=" * 40)
    
    # 基本測試
    tests = [
        ("FastAPI 基本功能", test_basic_fastapi),
        ("SQLAlchemy 基本功能", test_basic_sqlalchemy), 
        ("配置模組", test_config)
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ {name} 測試發生錯誤: {e}")
            results.append((name, False))
    
    # 顯示結果
    print("\n📊 測試結果:")
    print("=" * 20)
    
    all_passed = True
    for name, passed in results:
        status = "✅" if passed else "❌"
        print(f"{status} {name}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 基本測試都通過了！")
        print("💡 現在可以嘗試運行診斷腳本: uv run python debug_test.py")
    else:
        print("\n🚨 發現基本問題，請先解決這些問題:")
        print("  1. 確保已安裝依賴: uv pip sync")
        print("  2. 確保 Python 版本 >= 3.11")
        print("  3. 檢查是否在正確目錄中")

if __name__ == "__main__":
    main() 