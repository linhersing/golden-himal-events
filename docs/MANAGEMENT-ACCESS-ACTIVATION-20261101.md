# Golden Himal Voice 主辦單位總管理後台｜2026年11月1日

## 已完成的程式
網址：https://golden-himal-voice-preview.linhersing.workers.dev/admin-center.html
兩個唯讀API：
/api/staging/management/overview
/api/staging/management/records?source=practice&page=1

資料來源獨立：practice（不同虛構測試工作空間）；e2e（受邀Email測試資料，未建表時回 not_configured 而非假報0）。
管理員可以看報名筆數、去重測試身分、1月與4月梯次、組別、海選／初賽／決賽階段、評分卡張數與平均分、模擬繳費逐筆明細（每頁50筆）。不回傳姓名、私人Email、電話、證件、作品檔或付款憑證。只有GET，不允許寫入；原有D1不改動。
金流尚未正式接通：所有已付款狀態都僅代表模擬付款，真實實收筆數與金額為未知/null，不能說成真實交易。

## 啟用前的必要Cloudflare管理員操作（此步尚未完成）
1. 進入 Cloudflare Dashboard → Workers & Pages → golden-himal-voice-preview → Access / Zero Trust，建立／啟用活動主辦方專用 Cloudflare Access 保護。只保護 admin-center.html 及 /api/staging/management/*（如果帳戶功能支援路徑規則）。如果該Cloudflare方案只支援整個Worker保護，必須改用獨立管理員hostname/Worker，絕對不能把一般活動首頁一起鎖住。授權收件者僅限主辦核准的管理員。
2. 從 Cloudflare Access 取得對應應用的 AUD Tag 與 team domain。
3. 在Cloudflare Worker私密環境設定 GHV_ADMIN_ACCESS_AUD（對應Access App的AUD）、GHV_ADMIN_TEAM_DOMAIN（https://團隊名稱.cloudflareaccess.com）、GHV_ADMIN_EMAILS（管理員Email白名單，逗號分隔）。不要把名單與Secrets寫進GitHub或Google Drive。
4. 確認 Cloudflare Access 管理員可成功登入、一般會員與評審不能取得Access身份；在上述前置條件完成並測試後，最後將 GHV_MANAGEMENT_ENABLED 設為 true。
5. 部署後確認設定沒有被 GitHub Workers Builds 覆蓋；實機測試 GET /api/staging/management/overview：經核准管理員200；未登入/冒充身分/錯誤AUD/過期或假JWT 403；未配置完成 503。
6. 新後台由Cloudflare Access驗證的帳戶身分授權。**舊版公開測試空間自己產生的organizer通關碼絕對不具有跨測試空間的全站管理權。**
7. 若Cloudflare Worker啟用了Static Assets，中介路由不一定傳送ctx.access，API提供對原始 Access JWT header 做RS256/JWKS簽章與issuer/audience驗證的備援；不信任可任意偽造的X-Admin/Email等普通HTTP標頭。

## 實際登入前的狀態
管理中心網頁可以上線，但未配置Access身份與白名單前，統計API應拒絕存取；不能為了展示而讓訪客看到全站資料。正式會員、R2和金流仍需獨立驗收。

## 向王老師展示與紀錄
手機版（320至428px）與電腦版採用相同架構；可列印A4摘要，只含匯總數字，不出示私人聯絡方式與通關碼。所有截圖標記測試版／非正式報名與付款。版面及數字的真實啟用須分開記錄，勿將模擬測試誤認為真正繳費成功。

GitHub PR #35：https://github.com/linhersing/golden-himal-events/pull/35
跨AI交接：https://docs.google.com/document/d/1vWnfXiKo1McKH4mCT7x00VktgXyiGPGzD0DIDyZYOJM/edit
