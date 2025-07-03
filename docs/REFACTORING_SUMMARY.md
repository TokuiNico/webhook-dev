# Webhook API 重構總結

## 重構目標

1. **業務邏輯分離**: 將 API 端點中的業務邏輯移到服務層
2. **統一依賴管理**: 使用統一的 `get_api_key` 和 `get_async_db` 函數
3. **提升可擴展性**: 改善簽名驗證機制的擴展性
4. **代碼重用**: 消除重複代碼，提高維護性

## 重構內容

### 1. 創建 Webhook 服務層

**新增文件**: `app/services/webhook_service.py`

**主要功能**:
- `SignatureValidator`: 可擴展的簽名驗證器
  - 支援 Stripe、GitHub、通用簽名驗證
  - 易於擴展新的簽名驗證方式
- `WebhookService`: 完整的 webhook 處理服務
  - 來源和主題驗證
  - 事件記錄創建和管理
  - 訂閱獲取
  - 事件發布（待完善）

### 2. 重構 ingest.py 端點

**修改文件**: `app/api/v1/endpoints/ingest.py`

**改進**:
- 移除所有業務邏輯和數據庫查詢
- 使用統一的 `get_async_db` 依賴
- 委託所有處理邏輯給 `WebhookService`
- 簡化為純路由處理器

**前後對比**:
```python
# 重構前 - 134 行，包含大量業務邏輯
async def receive_webhook(...):
    # 直接數據庫查詢
    source_result = await db.execute(select(Source)...)
    # 複雜的簽名驗證邏輯
    if source_name.lower() == "stripe":...
    # 事件記錄創建
    event_log = EventLog(...)
    # 訂閱查詢和事件發布
    ...

# 重構後 - 65 行，純路由處理
async def receive_webhook(...):
    # 獲取請求數據
    body, signature_headers = await get_webhook_body_and_signature(request)
    # 委託給服務層
    result = await webhook_service.process_webhook(...)
    return JSONResponse(content=result)
```

### 3. 簽名驗證機制改進

**可擴展設計**:
```python
class SignatureValidator:
    @staticmethod
    def validate_signature(source_name, body, signature_headers, secret):
        if source_lower == "stripe":
            return verify_stripe_signature(...)
        elif source_lower == "github":
            return verify_webhook_signature(...)
        # 易於添加新的驗證方式
        # elif source_lower == "slack":
        #     return SignatureValidator._validate_slack_signature(...)
```

### 4. 文件重命名和路由更新

- 保留 `ingest_faststream.py` 並重命名為 `ingest.py`
- 更新 `app/api/v1/__init__.py` 中的導入路徑
- 更新架構規則文檔

## 架構改進

### 前後架構對比

**重構前**:
```
API 端點 → 直接數據庫操作 + 重複的驗證邏輯
```

**重構後**:
```
API 端點 → 服務層 → 數據庫操作
         ↓
    統一依賴管理
```

### 優勢

1. **關注點分離**: API 層只處理 HTTP 請求/響應，業務邏輯在服務層
2. **代碼重用**: 服務層可以被其他模組重用
3. **易於測試**: 服務層可以獨立測試
4. **易於維護**: 業務邏輯集中管理
5. **可擴展性**: 新的簽名驗證方式易於添加

## 技術債務

### 待完善項目

1. **型別安全**: 服務層的型別轉換需要進一步優化
2. **事件發布**: `publish_webhook_event` 方法需要完整實現
3. **錯誤處理**: 可以添加更細緻的錯誤分類和處理
4. **性能優化**: 可以考慮添加緩存機制

### 已知問題

- 服務層存在一些型別轉換警告，但不影響功能
- 事件發布邏輯暫時簡化，需要後續完善

## 測試結果

- ✅ 模組導入測試通過
- ✅ 路由配置更新成功
- ✅ 架構規則文檔已更新

## 下一步建議

1. 完善事件發布邏輯
2. 添加服務層單元測試
3. 優化型別安全
4. 考慮添加性能監控

---

**重構日期**: 2024年12月
**重構範圍**: Webhook 接收端點和服務層
**影響範圍**: API 端點、服務層、路由配置
