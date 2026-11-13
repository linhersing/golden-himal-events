# Golden Himal Voice｜11月13日前線規則與證件上傳實作規劃

## 依據與本次已完成
前線原檔：Google Drive `Golden Himal Palace 歌唱嘉年華比賽辦法_20261112.docx`（11月13日收到）。
本次只調整首頁／最新消息／會員頁的公開資訊、三語、手機版與測試提示位置。保留所有既有 URL、三主入口、D1 資料庫、Cloudflare secrets／金流／後台權限。April 第二次海選仍不開放。
首頁在靠近頂部顯示主辦 Golden Himal Palace；協辦 Synergy FM、Kalika FM、各大專院校及政府單位（依前線文件，名稱需由主辦核對）。宗旨在主視覺內，詳細五階段賽程及資格說明於 news.html 以可展開項目呈現。
測試提示移至 3 個主要公開頁面底部，三語提醒仍保留；會員登入／報名內部本有的測試註記及不收真款說明未撤銷。

## 私有證件上傳現況與資料庫負擔
依目前 `backend/staging-e2e.js`，已有 TEST 私有媒體上傳及下載處理：`/api/e2e/demo-upload?application=...&kind=eligibility`，PDF/JPEG/PNG 最高 5 MiB；預期儲存在 Cloudflare R2，D1 只儲存一段不可公開的 `eligibility_key`，評審不可下載證件，主辦及本人可取得檔案。這能避免將圖片/PDF bytes 存入 D1。
**但目前 `wrangler.jsonc` 沒有 `STAGING_MEDIA` R2 binding，`STAGING_SUBMISSION_MODE` 仍是 `links`，現有上傳 API 在 links 模式會拒絕。因此不得向用戶展示可用上傳鈕，亦不得直接改 links 模式：它還牽涉 Demo 與 receipt 的 E2E 驗收門檻。** 本次先公布文件格式說明，不蒐集個資與不建立假的成功回條。

## 建議的安全獨立實作
1. 主辦方核准：證件必要種類、資料蒐集目的、保存／刪除期限、補件權限、管理員查閱權與正式隱私聲明。
2. 以私有 R2 bucket（未對公眾映射 URL）存原始檔；D1 只保存 `application_id`、儲存 key、檔案類別及時間。禁止公開 Google Drive、YouTube 或第三方分享連結當作身分證明。
3. 增設只限已登入參賽者的獨立 POST `/api/e2e/eligibility-upload`，不改既有 Demo links 模式。伺服器驗證 session 及擁有者、D1 狀態、限制 5 MiB、PDF/JPG/PNG magic bytes 與 Content-Type、掃毒／掃描風險政策、逾時／重複寫入、不可轉貼／不可被評審取得。
4. 手機端以單一「選擇檔案或拍照」控制選檔；有進度、成功後的私有儲存狀態與重新登入讀回；必要時顯示可刪除或換檔但不得無限期保存舊檔。
5. 後台只有主辦管理員能預覽；下載使用 no-store、`Content-Disposition: attachment` 與安全 MIME，稽核記錄每次存取及刪除；評審不得取得學生證與年齡證明。
6. Cloudflare 安全開關預設 OFF，需完成隔離 D1/R2、雙裝置驗收、不同角色越權測試、備份／刪除測試後，才由有權人員啟用。不得從聊天直接建立真實正式上傳渠道。

## 成本與操作
D1 不放二進位檔；若每份證件上限 5 MiB，1000 名參賽者最壞為 5000 MiB（約 4.88 GiB）R2 原始檔，加上請求與讀取／備份，實際成本依 Cloudflare 當期定價與儲存天數計算。真實平均 300 KiB～1 MiB 的 JPEG/PDF 對儲存壓力更小。
用戶介面不能強迫轉公開連結，優先支持 JPG/PNG/PDF 及手機拍照。此功能正式開放前請勿收真證件。

## 待辦狀態
本 PR：首頁品牌與宗旨、新聞賽程、資格說明、頁尾 TEST 警語、三語與回歸測試。
未完成：證件私有上傳、R2 binding、身分驗證與權限實測、正式繳費與正式報名開放。
