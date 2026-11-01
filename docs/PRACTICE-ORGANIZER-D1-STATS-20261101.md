# Golden Himal Voice｜D1 測試管理員統計總覽（11月1日）
## 本輪已實作
網站入口：https://golden-himal-voice-preview.linhersing.workers.dev/practice.html
登入私人測試空間的 organizer 專屬角色後，會看見「我的測試空間｜報名統計總覽」。Worker GET /api/staging/practice/stats 僅對通過 Session 認證的 organizer 提供 Cloudflare D1 統計，查詢以 Session 裡的 workspace_id 限制，不接受網址指定其他 workspace ID。
首頁卡片：不重複虛構測試身分數、報名總筆數、Demo 階段及決賽階段筆數。細分2027年1月／4月、大學組／社會組、Bagmati／Gandaki、Demo／初賽／決賽、模擬繳費、評審打分、測試票及不可兌換餐券。
支持從 D1 重新讀取，顯示尼泊爾當地的資料時間；失敗不顯示舊數字。CSV 僅輸出聚合統計，無姓名電話；A4列印版只印統計，不印參賽者私人聯絡資訊。英文／尼泊爾文／繁體中文支援，測試320／360／375／390／428px和桌機。

## 關鍵限制
這不是全站正式管理員！practice 系統每個人可以建立虛構測試空間，內含兩名虛構會員、三名評審與一名 organizer。即使有人拿到 organizer 測試角色碼，只能看自己測試空間的統計，不能查他人或真實官方報名。
同一虛構測試會員在1月、4月各報一次：不同測試身分=1；報名總筆數=2。所有模擬繳費與優惠券數均不是實際金融交易或可兌換福利。

## 未來真正全站管理員
要顯示全站報名人數，必須先建立活動主辦核准的全站身份與權限管理（如 Cloudflare Access + 安全驗證 JWT 或等級相當的驗證系統），在 Worker 端驗證管理員的身分與操作權限，實施審計與報表資料來源分層，不能只因瀏覽器顯示 organizer 身分就暴露全站資料。此步尚需 Cloudflare 帳戶所有者授權；不能拿測試 organizer 充當正式全站管理員。

## 向王老師報告的截圖
標題必須寫「測試空間報名統計總覽」，畫面保留「非全站／非正式報名」提醒、統計時間和資料來源，僅拍無個資的統計卡與分類表。不要截出測試登入碼、Cookie、私人聯絡資料。
GitHub 工單：https://github.com/linhersing/golden-himal-events/pull/34
跨AI Bridge：https://docs.google.com/document/d/1vWnfXiKo1McKH4mCT7x00VktgXyiGPGzD0DIDyZYOJM/edit
