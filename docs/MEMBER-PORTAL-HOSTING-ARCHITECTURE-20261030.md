# Golden Himal Voice｜會員系統、報名與主機選型（2026-10-30）
狀態：TEST ONLY，尚未啟用任何真實會員、個資、付款、影片上傳或正式後台登入。

## Alan／前線 Draft 1（待王老師與 Muse 核定）
2027年3、6、9月預定為實體初賽，12月總決賽。線上提交60–90秒Demo作初篩，報名費每人每場NPR500，18歲以上分大學／社會組，年度組別不變；已晉級決賽不得再次參加初賽。線上Demo先審核資格及是否本人演唱，專業評審獨立評分。正式收款主體／銀行在下一階段確認，不在此輪申請商家帳號。

## 這輪已實作
- 入口 /member-portal.html，六工作區：固定虛構會員建立、假身份切換登入、分場報名與假Demo、NPR500假付款、會員個人進度、行政／評審模擬、20案例一鍵建立與匯出／重置。
- 20名固定虛構人物：19位符合18歲、1位17歲專門驗證阻擋；不允許輸入任何真人資訊或密碼。email使用@example.invalid。
- 三個相互獨立的概念：member account、qualifier application、payment order；同場重複拒絕，跨場次產生各自NPR500訂單，已晉級決賽禁止再報，只有模擬付款後才可通過行政審核。
- 管理員頁沒有真正登入權限，每個知道測試網址的人都能操作，絕不可使用真資料。
- 全部localStorage僅瀏覽器假資料，不寫Cloudflare D1，不接任何金流、不寄通知，不存真影片；與既有test-lab/payment-lab隔離。
- Node單元和Playwright真正Chrome手機／桌面測試，不只靜態檢查。
- backend/migrations/0005_membership_architecture_DRAFT_ONLY.sql 僅資料表設計，沒有正式部署。

## 現有GitHub／Cloudflare是否需要另外租用主機？
目前不需要。GitHub（目前公開repo）負責source control、PR、Actions自動測試和GitHub Pages靜態鏡像。Pages只能執行HTML/CSS/瀏覽器JS；但Cloudflare Workers已是獨立的伺服器端JavaScript/TypeScript運算平台，可處理會員API、Session、驗證、付款商回呼；也支援Python Workers、Rust Workers，不存在「GitHub只能寫前端」的程式語言障礙。資料存在Cloudflare D1，私有Demo影片存在R2。不要把影片、密碼、個資、支付鑰匙存進公開GitHub。
官網日後遇大規模影片轉檔、即時直播、高峰投票或專門資料治理，可以評估Cloudflare付費階層與外部託管服務，但不是此刻租一台VPS就會解決。VPS反而需要自行更新作業系統、管理資料庫、安全備份及入侵偵測。

## 下一階段真正會員安全流程（未實作）
1. 會員申請→驗證email或尼泊爾手機OTP，伺服器端節流防暴力猜測；使用HttpOnly/Secure/SameSite session cookie、CSRF、登入撤銷、遺失帳號恢復，不在前端localStorage保管認證token。
2. 伺服器端加密會員姓名、年齡/出生年月及必要的學籍附件；身份及支付資料只有授權行政能看到，專業評審只看匿名Demo編號。
3. 受保護Worker在獨立STAGING D1建唯一會員、每場申請、Demo私有R2物件、審核分數與稽核日誌；支持跨場次組別鎖定及決賽晉級鎖定。
4. 不接受瀏覽器自行提供已付款狀態；正式NPR500付款由Worker建立唯一訂單、向商家Sandbox核對簽章／金額／交易ID／狀態，再原子更新D1；Sofia財務後台負責人工異常與收據。銀行／商家申請屬後期。
5. 裁判身份驗證、利益衝突聲明、3位匿名獨立評分、分數封存／申訴、審核紀錄不可任意刪改。
6. 分離STAGING與PROD、經審查SQL migration、R2限時連結、備份與實際還原、20位虛構會員端到端真D1 API測試及高流量壓力測試。通過才逐步邀請真人測試。

## SQL草案注意
0003_season_registrations.sql、0004_payment_architecture_DRAFT_ONLY.sql及0005_membership_architecture_DRAFT_ONLY.sql須先合併重構審核，不可直接逐檔部署或假設既有D1有會員表。必須處理closed round、身份重複、同年度組別、資料刪除保留及退款例外。

## 官方技術文件
GitHub Pages靜態服務：https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
Cloudflare Workers支援語言：https://developers.cloudflare.com/workers/languages/
Cloudflare D1 Worker SQL綁定：https://developers.cloudflare.com/d1/worker-api/
Cloudflare Workers全端服務：https://developers.cloudflare.com/workers/

## 驗收原則
每次PR都要Node unit＋Chrome Playwright測試，記錄PASS、FAIL、commit、版本與測試截圖到唯一Google Drive MASTER。假會員驗收不得等同真正登入／付款／D1寫入／R2上傳成功。不同AI各自模擬的結果須區分為「離線測試」、「瀏覽器沙盒」與「真正Workers→D1」三類證據。
