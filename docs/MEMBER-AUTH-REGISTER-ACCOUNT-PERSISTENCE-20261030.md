# Golden Himal Voice｜正式會員登入、報名、恢復帳號與 D1 持久化實作契約
**2026年10月30日｜安全基線｜規格＋前端防誤導修正；正式後端尚未上線**

## 0. 現況與證據：不能再把 demo 說成已註冊成功
| 使用介面 | 使用者看到的操作 | 目前實際存放 |
|---|---|---|
| 官網首頁「Registration」 | 試填、Review、Complete preview，示範號 DEMO-001 | 僅於目前畫面顯示，完成後清空；**不會建立帳號、不寫D1** |
| /member-login.html | 虛構會員登入、共用 DEMO 密語 | 本機 localStorage 會員物件＋sessionStorage假登入；**無正式密碼驗證、不同裝置不能找回** |
| /member-portal.html | TEST-001～TEST-020 報名、假Demo、假NPR500付款、審核 | 本機 localStorage；**不寫D1／R2／支付商** |
| /api/staging/* | 固定 TEST-SINGER-API-001 或 TEST-SINGER-001 的測試查詢 | 隔離 ghv-staging D1 的人工／CI虛構測試列；**與上述表單沒有關聯** |
| backend/migrations/0005、0006 | 未來會員、ID與授權資料庫設計 | **只有 GitHub 草案，未套用於任何正式D1** |

Cloudflare Preview 名稱及網址不是正式註冊服務的證據。正式上線前禁止真實姓名、Email、證件、真影片、真付款資料輸入 sandbox。

## 1. 「帳號＝Email」的正式規則
- **Email 是登入識別帳號**：必須先驗證持有權。顯示用 Email 可以更換，但變更前須重新認證並驗證新地址；不能只靠在網頁輸入 Email 就建立已登入 Session。
- **建議註冊流程**：按「參賽報名」→沒有帳號則「建立會員」→輸入 Email → Email 單次限時驗證連結→**參賽者自行設定強密碼或密碼管理器生成密碼** →正式登入→完善出生年/組別/同意條款→進入「我的參賽首頁」→選擇2027年3/6/9月場次、填資料與Demo→確認→系統回傳真D1 application ID。
- **不要將永久性隨機初始密碼寄到普通 Email**。驗證信應只寄短效一次性的連結；使用者於安全網頁自行設定密碼。若使用 IdP 的「寄發設定密碼連結」，信中不能包含明文密碼。
- **已註冊會員**：Email + 密碼→服務端驗證→建立 HttpOnly Secure SameSite Session→個人Dashboard，從 D1 依登入 Member ID 讀回本人資料（跨手機／電腦一致，不使用 localStorage 作權威）。
- **瀏覽者不必註冊**：活動、公告、賽程與公開影片可直接觀看；只有要報名、查自己的資料、補件、退賽、對帳才需會員登入。投票資格驗證規則需獨立設計，不因擁有會員就可以無限制投票。
- 2027 年18歲資格與「同年度大學／社會組鎖定」、晉級不能重報，由伺服器在截止規則下驗證，不能只靠瀏覽器選項。
- 中英尼三語：英文＋尼泊爾文對外，繁體中文供內部管理；登入後沿用原網站語系。

## 2. 正式會員帳號自助服務（所有功能都需要授權 IdP 和 API，**目前未實作**）
| 功能 | 畫面 | 伺服器不可省略的控制 |
|---|---|---|
| 建立帳號 | Email、同意隱私聲明、驗證Email、設定密碼／Passkey | 反機器人、節流、同Email唯一、驗證前不啟用 |
| 登入 | Email、密碼、顯示密碼、登入、忘記密碼 | 密碼雜湊驗證由身份服務提供、節流、通用錯誤、Secure Session |
| 忘記密碼 | 輸入Email、寄送重設連結、設定與確認新密碼 | 不暴露是否存在帳號、限時一次性連結、IP與帳號節流、完成後撤銷舊Session，並**只寄安全通知不寄新密碼** |
| 更改密碼 | 已登入的個人設定→再次確認身分→新密碼與確認 | 避免舊密碼重複、異常登入警示、必要時所有裝置登出 |
| 更換Email | 已登入→重新驗證身分→驗證新Email | 通知舊Email、重複Email阻擋、唯一登入IdP subject不變 |
| 登出 | 目前裝置／所有裝置登出 | 伺服器撤銷 Session，僅刪 localStorage 不算正式登出 |
| 刪除帳號 | 我的帳號→資料匯出／申請刪除 | 二次認證、通知、身份與 R2 刪除或法定保留，正式付款/稽核資料依法留存，不能立即抹掉金融憑證 |

**建議使用成熟的身份服務 (OIDC IdP)** 承擔密碼雜湊、Email驗證與重設、異常登入風控與 MFA；Cloudflare Worker 只驗證 OIDC 身分／簽章與Session並做會員授權，D1只記 D1 Member ID、IdP subject 及比賽資料，不自己保管原始密碼。先比對供應商方案、尼泊爾Email可送達性、合法資料區域及價格；不得未授權就替使用者申請商業服務。

## 3. 從註冊到報名的單一使用者旅程
```text
活動首頁 → 參賽報名
  ├─ 已登入 → 我的會員中心 → 新增/續填報名
  └─ 未登入 → Email 註冊或登入 → 驗證／設定密碼 → 我的會員中心
       → 建立2027 場次報名草稿(D1)
       → 填寫18歲資格、年度組別（須驗證）、Demo網址或未來私有R2文件
       → 確認送件 → 伺服器產生正式報名ID + 送件時間戳
       → 付款訂單 (未付／待核對／已付／失敗／退款；不憑前端按鈕)
       → 資格審核／補件／初篩／入圍／晉級／退件／退賽
       → 登出、再次登入，仍從D1顯示本人真實紀錄
```
**正式會員唯一真實資料源**：權限保護的 D1，Demo影片/證件由獨立私有 R2 儲存，付款以金流商回執 + 服務端核實 + D1 為權威。資料庫的「姓名／出生資料／Email」等敏感欄位須加密或由 IdP 管理，後端不得將他人資料傳給前端。

## 4. 待建置的 Worker API 契約（以下全部未開放）
- `POST /api/member/auth/start`：導向經核定的 IdP Email 註冊／登入，不接收真密碼到測試服務；驗證 state/nonce/PKCE。
- `GET /api/member/auth/callback`：僅驗證 IdP 簽章/issuer/audience/expiry/nonce，再建立 HttpOnly Session，第一次登入需以授權 member_id 建立 D1 member account。
- `GET /api/member/me`：回本人基本資料、已驗證信箱、權限、同意版本。
- `GET /api/member/applications`：依 Session member_id 取**本人**所有場次報名、Demo、狀態、繳款；絕不由客戶端任意傳 member_id 查他人。
- `POST /api/member/applications`：身分、18歲、同年度類別、場次開放期間、同場唯一申請等伺服器驗證；成功回真正 D1 登記 ID。
- `POST /api/member/applications/:id/corrections`：審核標記「待補件」才可補傳，記版本與期限、合法Demo連結檢查；未核定影片平台規則前不自作主張僅限YouTube/TikTok。
- `POST /api/member/applications/:id/withdraw`：需本人身分、確認退賽及退款政策；保留稽核紀錄。
- `GET /api/member/orders`：只查本人訂單；`POST /api/member/orders/:id/checkout` 產生伺服器唯一付款訂單；僅支付商經驗證的callback能改 paid。
- `POST /api/member/account/export`、`POST /api/member/account/delete-request`：需重新認證，依法處理。
- 變更/忘記密碼操作使用 IdP 的專屬安全網頁，**不實作自製明文密碼重設端點**。

部署前須補：真實OAUTH/OIDC管理、verified email provider、Turnstile、節流、外部IdP契約與隱私告知、真正STAGING與PROD隔離、角色權限、D1 schema reconciliation、備份與還原測試、日誌不記敏感token、真實付款商與商家法定收款主體審批；正式後端要在 feature gate 開啟前經獨立安全審查。

## 5. 現有D1與付款現狀的嚴格切分
- `wrangler.jsonc` 現綁 `ghv-staging`，僅 `/api/staging/*` Worker-first。其 Worker 的固定測試行只供 demo 資料庫連通性測試，不能代表一般參賽者資料入庫。
- `STAGING_TEST_WRITE_ENABLED=false`，預設阻擋寫入；不是「會員開放註冊」開關。
- 0003、0004、0005、0006 SQL 當前皆為設計/草案，**不可不經檢查直接部署**；其中 0005+0006 是未來身份資料映射，不是目前D1已存在的會員表。
- 真實收款商、銀行合法收款主體、退款／核對權限仍需王老師、Muse、前線財務確認，不能聲稱已接通 Khalti/eSewa 或等同銀行對帳。
- Alan 2026年10月28日 Draft 1 說 2027 年 3/6/9 月初賽、12月決賽、60–90秒Demo、每次初賽NPR500；它仍是待核定草案，不能將細節當正式報名條款。

## 6. 驗收門檻（**未通過不得宣稱正式上線**）
1. 使用兩個不同瀏覽器和不同手機：同一人的已驗證 Email 正常登入、找回相同 D1 個人資料。
2. 假 Email、未驗證 Email、重複註冊、錯密碼、超量嘗試、過期重設連結、重複用 token、已登出Session全部拒絕。
3. 忘記密碼永遠回相同顯示文案；通知及重設由測試專用信箱承接，不把測試通知寄進工作者私人 Gmail。測試後自動清理測試信。
4. 兩個場次、每場各有唯一付款訂單，從會員首頁「付款」直接開正確未繳場次，不會跳到已繳的上一場。
5. 同會員可以在允許的場次重報，但 17歲阻擋、同年度組別不變、晉級決賽不得重報。
6. 修補後重新登入仍可看到正確報名、付款、補件、退賽與審核；不能透過 URL或更改 member ID 偷看別人。
7. E2E 金流Sandbox：價格/幣別不符、回呼偽造、重送通知、退款/爭議、網路超時均不會錯標 paid。
8. 最終檢查：無明文密碼／假密碼收集於公用預覽、未經批准的人員不見真資料；D1還原測試、R2私有檔權限、法律隱私同意與主管批准。

## 7. 此輪能做、不能做
- **本輪實際改動**：首頁示範送件後增加明確「沒有建立帳號/沒有寫D1」說明與正確測試入口；修正測試會員「多場次未繳付款」錯誤導向；把真實會員登入/資料庫/密碼/收款 API 契約和未部署schema整理可交付版本。
- **未完成**：實際 IdP 供應商帳號開通、收信網域驗證、正式會員資料庫、真正Email/Password登入、真實作品上傳、正式金流和真刪除帳號。需要授權、選型與實際密鑰/資料庫環境才能部署，絕不能聲稱本輪完成。

參照 OWASP：
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html
