# Golden Himal Voice — 實際 D1／Email／R2／評審 Staging 驗收操作說明
**2026年10月30日｜TEST ONLY，與正式比賽資料隔離**

> **重要**：此版提供真正使用 Cloudflare Worker＋D1 持久化的技術程式和可操作頁面，**但只有完成 D1 migration、Email 寄件網域／binding、私人 R2 binding、Worker Secrets 和部署驗證後才能開始真實的寄信與跨裝置測試**。GitHub 代碼合併不代表這些 Cloudflare 設定已完成。預設所有 `/api/e2e/*` 返回 503，不會假裝成功，也不會要求填真實密碼。

## 1. 技術架構
- GitHub：公開原始碼、PR、單元與瀏覽器驗收；絕不存放帳密、郵件驗證碼、真實報名與音樂檔。
- Cloudflare Worker：`/api/e2e/*` 收件、一次性 Email code 驗證、12小時 HttpOnly+Secure+SameSite session、依登入身分限制 API、模擬付款及評審評分。
- Cloudflare D1：`ghv-staging` 中 **e2e_ 前綴專用表**；會真正 INSERT 會員、報名、模擬付款事件、評分，重新登入也會保留。
- Cloudflare Email Sending：由 Cloudflare 綁定 `EMAIL` 傳送六碼限時10分鐘的測試驗證碼；不能用 GitHub Actions 或私人 Gmail 收發機器測試信。
- Cloudflare R2：私有 `STAGING_MEDIA` bucket，可儲存20MB以內音檔/影片；不是公開 URL，只有本人與獲授權評審可透過 Worker 取回。
- 受核准的測試 Email 白名單：`STAGING_ALLOWED_EMAILS`（參賽者）及 `STAGING_REVIEWER_EMAILS`（評審）。二者不要使用同一信箱；不得邀請未同意測試的人。
- **付款只是 D1 持久化的模擬交易**：永遠叫 `simulated_paid`，不扣款、不接銀行、不宣稱已實收。
- **目前驗收登入採真正寄信的 Email OTP，沒有帳號密碼功能**。這是可實際驗證的安全入口，但不是終版 Email＋密碼。正式變更／忘記密碼應交由受管身份服務；不得以共享測試密碼冒充正式驗證。這一點未完成前不准宣稱「會員密碼已經做完」。

## 2. Cloudflare 管理員必須完成的配置（需要帳號授權）
現有 Worker：`golden-himal-voice-preview`，D1：`ghv-staging`。先在 Cloudflare D1 Console 對 **ghv-staging（測試庫）**執行 `backend/migrations/1000_e2e_staging_acceptance_ONLY.sql`。備份後再執行，**禁止對未來 PROD 執行**。SQL建六表：帳戶、驗證挑戰、Session、報名、假付款、評審打分。新表都以 `e2e_` 開頭，不覆蓋既有 `ghv_test_registrations`。

在 Cloudflare → Compute → Email Service → Email Sending，選擇已由 Cloudflare DNS 管理的寄件網域，完成 SPF、DKIM 等驗證；建立 `EMAIL` Workers email binding，從已核准的寄件地址發信。官方文件：
- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/

建立私有 R2 bucket，例如 `ghv-acceptance-private`；不開公開讀取；對 Worker 綁定 `STAGING_MEDIA`。建議用獨立 bucket，避免與將來正式參賽作品混雜。

在 Cloudflare Worker 的 **Secrets（不是 GitHub 公開變數）**配置：
- `STAGING_IDENTITY_SECRET`：至少32字元的高熵隨機秘密，供 Email 指紋、OTP與Session HMAC 使用，嚴禁寄送或貼進聊天／GitHub。建議以密碼管理器或 `openssl rand -hex 32` 本地生成。
- `STAGING_ALLOWED_EMAILS`：由參賽測試人員自願提供的測試信箱白名單，逗號分隔；只要名單裡的人才能收到驗證信。
- `STAGING_REVIEWER_EMAILS`：專用評審測試信箱，與參賽者名單分開；不能讓前台自選 reviewer 角色。
- `STAGING_FROM_EMAIL`：已驗證的寄件地址（非私人 Gmail），例如 `tests@verified-domain.example`（僅格式示例，不能照抄成實際地址）。
- `STAGING_E2E_ENABLED`：**最後一項才設定成字串 `true`**，開啟前須完成上面綁定、白名單、資料庫與安全驗收。此值**沒有寫入 GitHub 或 wrangler vars**，避免自動部署覆蓋開關。

對 Worker 加入官方綁定：
```jsonc
// Cloudflare Worker 參考配置（僅在已建立資源後加入，不可直接用假 bucket/domain 上線）
"send_email": [{ "name": "EMAIL" }],
"r2_buckets": [{ "binding": "STAGING_MEDIA", "bucket_name": "ghv-acceptance-private" }]
```
**Cloudflare 網域實際綁定需由擁有權限的管理員於控制台/部署操作完成**，本 GitHub connector 沒有 Cloudflare 資源管理權限，不能把紙上指令寫成「已完成設定」。

## 3. 真正要給 Gemini 進行的測試（需要 staging 已啟用）
兩個測試頁：
- 參賽者：`https://golden-himal-voice-preview.linhersing.workers.dev/e2e-stage.html`
- 評審：`https://golden-himal-voice-preview.linhersing.workers.dev/judge-stage.html`

**參賽者端**
1. 打開專用測試頁，輸入白名單內測試 Email。按「寄送驗證碼」；若寄信服務未設定，不得宣稱寄信成功。
2. 收到真正 Email，輸入六碼；系統在 D1 建立匿名識別會員（只存 Email HMAC 指紋，不存明文 Email）。獲得受保護的 Cookie 登入狀態。
3. 建立一筆 2027年3月測試報名：組別、虛構舞台名稱、YouTube/TikTok測試影片連結，伺服器產生 UUID；從 D1 讀回真正報名 ID。
4. 如已建立 R2，選擇 20MB 以下**自己有授權的測試音檔／影片**上傳；再重新整理，確認 R2 私有下載仍可取回，未經登入的人無法讀取。
5. 點「模擬付款 NPR500」；D1 留下 `SIMULATED_PAYMENT` 事件及 `simulated_paid` 狀態，**沒有真實扣款**。重新整理或登出再用 Email 收碼登入，資料仍存在。
6. 使用另一台手機／瀏覽器同樣 Email OTP 登入，讀回同一筆 D1 測試報名（驗證跨裝置，不是 localStorage）。

**評審端**
7. 另開 `judge-stage.html`，用**不同且列入評審白名單**的測試信箱收碼登入。不能使用參賽者白名單自動取得評審權。
8. 看到模擬付款後的參賽作品，觀看合法外部試聽連結或下載受權限保護的私人 R2 測試影音。
9. 勾選「無利益衝突」，輸入 0–60 技巧分及 0–40 詮釋分、提交；D1 真正 INSERT 每位評審各一筆分數；同一位不能重複打分。此分配**僅測試提案，未經前線核定為正式比賽規則**。
10. 參賽者再次登入，看到自己的狀態變成 `scored`（測試已評分）；此處沒有自動晉級，也不假稱正式決選結果。

**安全及清理**
11. 沒有驗證碼、過期／錯誤碼、非白名單信箱及偽造/跨站表單操作必須被拒。
12. 會員資料 API 只能讀取本人，未邀請者不能登入評審頁、不能評分或下載他人私人作品。
13. 按「刪除測試帳戶」會刪除此會員相關的 D1 測試紀錄及 R2 個人作品；也可由 Cloudflare 管理員依測試後清理計畫備份、刪除 `e2e_` 測試表資料。**不要刪掉仍供其他服務使用的 D1 資料表**。
14. 不寄測試通知到使用者私人 Gmail；改用專用測試郵箱，完成後清理測試信；重要工程紀錄寫回 GitHub / Google Drive。

## 4. 正式上線還欠缺的關鍵門檻
- 正式 Email + 自設密碼／忘記密碼／改密碼、Passkey/MFA 需成熟 IdP 的可測設定；**OTP Staging並不等於這些已完成**。
- 本次測試年齡為「自行確認18歲」，尚無正式年齡證件/學籍審核；正確規則須經前線核定。
- 測試仍未導入前線正式審查角色配置、反抄襲、媒體病毒掃描及所有權確認、評分封存、評審指派、申訴規則。
- NPR 500 真金流的合法商家、銀行、支付商KYC、Sandbox webhook驗證及對帳全未完成；目前只有不扣錢的伺服器端模擬付款事件。
- 必須審核隱私聲明、跨國資料傳輸、上傳授權、資料保留、備份恢復與安全壓力測試。將來正式賽事應建獨立 **PRODUCTION D1/R2/域名/Secrets**，不可直接把 ghv-staging 當正式資料庫。
- 本環境公開 GitHub repo 只能承載程式與抽象架構，不能存 test 身分碼或真人資料。

## 5. 驗收判準
不能只因 GitHub Actions 綠燈便宣稱「真的寄信」或「真的 D1 存檔」。最終須展示：實際 Email 頭部時間、D1 `e2e_accounts` / `e2e_applications` / `e2e_payment_events` / `e2e_judge_scores` row counts（不公開信箱）、R2 private object metadata、登出登入後跨裝置仍存在，以及評審權限拒絕的安全測試。

GitHub Pages 只能看 HTML 靜態預覽。**真正的驗收 URL 是 Cloudflare Worker 同源網站**，因為只有它綁定 D1/Email/R2。
