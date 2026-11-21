# Issue #98｜私有資格文件隔離測試

## 差異分析

- 基準是 PR #173 的 `359c1c0`。既有 `backend/staging-e2e.js` 使用 `STAGING_MEDIA`、`e2e_applications.eligibility_key` 及共用媒體路徑。已具 owner/organizer 存取和基本檔頭檢查，但目前 Wrangler 沒有該 R2 綁定。既有上傳與帳號刪除的補償未留下獨立的可重試物件清除狀態。
- 主站的資格說明和上傳控制由既有旗標控制。這次把試驗入口留在獨立 Worker。正式 Worker、Wrangler 設定、部署遷移清單、會員表單、登錄權限、Demo 連結、付款流程及 #176 的 QR 均未改動。
- PR #86 的聯絡資料與 PR #93 的 48 小時作品補件屬不同用途。取用現行主分支的 session 角色、主辦核准資料、PR #161 的在學／畢業與 A/B 參賽區 schema。11 月 16 日規章採單一競賽組別，A/B 是實體參賽區。真實證明的可接受種類、保存與刪除流程待前線核定與上線驗收。

## 安全邊界

- Worker 入口只接受 loopback 網址、明確 synthetic 模式、專用 D1/R2 以及指定虛構帳號。獨立測試頁只放在 tests/fixtures，主站 build 不會發布。
- 使用既有 E2E 工作階段驗證。主辦只讀，選手只可操作自己的 2027 年 1 月核准報名。評審與匿名受阻。寫入限制同源、同意勾選、5 MiB、JPG／PNG／PDF 檔頭及基本檔案結尾檢查。PDF 常見主動內容標記會拒絕。基本檢查不能排除偽裝、惡意或壓縮式內容，後續真實收件須批准上傳政策與掃描。
- 檔案固定名稱做附件下載，採 `application/octet-stream`、sandbox、no-store；狀態回傳 opaque revision、檔案大小、類別、期限。R2 key、原檔名、文件內容與原始錯誤不進 API 元資料或日誌。
- D1 寫入意圖早於 R2 PUT。每份文件版本對應隨機物件 key，R2 條件寫入及檢查碼約束重試。D1 的唯一現行版本與相符 revision 在同一交易提交。替換、撤回、到期與刪除報名留下可重試清理佇列。第一次上傳排程中如有撤回請求會回傳衝突。上傳與物件儲存等待均有限時。清理失敗會退回佇列，另外分頁檢查時間超過緩衝且已無 D1 紀錄的遲到物件。R2 刪除成功先保留短期待掃標記，再次確認刪除後才捨棄；備份檔案和到期策略須受到相同隱私要求。
- 若收到網路或 D1/R2 暫時性錯誤，以同一測試檔重試，請求鍵維持一致；若另一裝置已更新，先讀回最新狀態。跨裝置重新整理即可讀回已確認的狀態。

## 驗證與回復

本機使用合成帳號和 1×1 PNG。執行 `pnpm test`。安裝專案依賴及 Microsoft Edge 後，使用既有 Wrangler 4.156.0 的 node_modules 路徑執行：

```text
node tests/private-eligibility-isolated.mjs <wrangler-node_modules> [evidence-folder]
```

此測試使用獨立 workerd、D1 與 R2 模擬資源，在停機後複製兩份持久資料至新的本機目錄，再以還原資料讀回。邊界測試、暫時失敗、清除與刪除復原採合成資料。備份驗證沒有連到遠端。Edge 320px、390px、桌機及三語截圖只顯示狀態。

若日後取得遠端隔離測試核准，先確認專用私有 bucket 無 r2.dev、自訂公開網域或公開簽名連結，另存 D1 還原點與配對的 R2 快照，核對 1007、1011，再套用 1019。正式用途須先確認收件流程何時可見、主辦檢視職責、惡意內容掃描、保存期限、撤回、備份期限及清理節奏；嚴禁利用本機入口開放正式收件。

回退時先將受控帳號清單設為空，關閉收件及讀取，保留獨立清理執行環境，等寫入完成，清空新增 TEST 物件並核對 R2 與 D1 的現行指標/退役記錄；保留既有報名及評分。D1 Time Travel 不會回復 R2。還原前後需重播撤回與到期記錄，避免從舊備份復活已刪文件。若無法核對，保持離線，勿回掛或釋出舊物件。現行草稿沒有遠端變更，回退只需保留基準分支並停止本機試驗。

## 53 項母檔對照

| 項目 | 本次證據與待驗 |
|---|---|
| B04 | 在學／畢業資料可作受控入口條件；證明是否符合賽事資格及人工驗證仍待核定。 |
| B05、C03 | 沿用 A/B 參賽區欄位，不新增或改寫居住資料及跨階段鎖定。 |
| B06、C04、C05、C06 | 不變更 Demo 五支、評分、免費海選、資格審核和既有讀回流程；全套回歸另見 CI。 |
| C02 | 沿用單一競賽組別的資格欄位。正式報名流程另待驗。 |
| C08 | 只處理資格文件 TEST，正式證明種類、公開欄位和收件次序待核定。 |
| C09 | 私有綁定、授權、格式上限、撤回和清除已有本機證據；遠端資源、掃描與真機待驗。 |
| D02、F07 | 1019 增量、雙儲存備份讀回、補償清除與回退程序已有本機證據。遠端演練待驗。 |
| F01 | workerd/D1/R2 是本機證據。正式 Cloudflare、Edge 真機及真人收件未驗。 |

正式母檔的勾選和狀態維持原值。

## 2026-11-21｜OTP 登入後的私有文件演練（新草稿，未部署）

新分支以 PR178 的 `4fb23d0` 為基礎，合入當時主線 `dbdd5ee`，保留主線決賽 TEST／前線自行評選政策。原 PR178 分支不改寫。

獨立 Worker 僅新增 `signup-config`、`staff-login-config`、`request-code`、`verify-code`、`me`、`logout` 的精確方法／路徑。其他 E2E 路由仍404，方法錯誤405。登入要求既有 synthetic／loopback／專用 D1/R2 條件，另要求明確關閉 public signup 並開啟既有 staff CAPTCHA 保護。只接受明確的 member／organizer；reviewer 與 switch-role 不經此橋接開放。JSON 在解析前以2600 bytes串流限制，拒絕跨來源及非JSON請求。

邀請會員在既有 handleE2E 中原本不會執行 CAPTCHA，因此這個隔離橋接先核對會員邀請與設定，再以伺服器 Siteverify 驗證 `ghv_signup` 的成功、action、hostname；主辦方沿用原有 `ghv_staff_login`。錯誤／缺少 token、CF來源、action、hostname、不在邀請名單或不支援角色，不能建立會員 OTP／session 或寄信。驗證碼仍由原 handleE2E 做單次使用、期限、邀請與角色核對；驗證前另拒絕 reviewer challenge。沒有測試用登入捷徑、session header 或瀏覽器注入 cookie。

執行方式（既有 Wrangler4.156.0 工具的 node_modules）：

```text
node --test tests/private-eligibility-login.test.mjs tests/private-eligibility-documents.test.mjs
node tests/private-eligibility-login-isolated.mjs <wrangler-node_modules> <evidence-folder>
node tests/private-eligibility-isolated.mjs <wrangler-node_modules> <lifecycle-evidence-folder>
```

新 Edge/workerd 測試從零 session 開始，mock伺服器Siteverify和Resend，從捕捉的虛構郵件取出OTP，再由真實verify-code回應的HttpOnly/Secure cookie登入。沒有真實外寄或真實文件。核對本人上傳／讀回／第二次登入讀回、主辦唯讀、其他會員404、評審登入403、匿名401、錯誤CAPTCHA／OTP／重放拒絕、回應遺失後同鍵重試、撤回清除、登出及過期401。320／390／1280px三語狀態畫面沒有顯示文件內容或OTP。原文件角色回歸仍驗證受邀reviewer不能讀取文件；原備份還原演練保留。

檔案上限由實際UI拒絕大於5MiB的合成檔，確認沒有PUT；伺服器413由既有Node測試驗證。曾嘗試以Edge直接繞過UI傳送5MiB+1bytes，local workerd傳輸回報fetch失敗，沒有取得可斷言的413；不把這次實驗寫成瀏覽器伺服器413驗收。真實UI的超限阻擋與伺服器Node上限回歸均通過，遠端傳輸仍待驗。

既有 `scripts/staff-workspace-edge-test.mjs` 最後依序呼叫上述兩個隔離文件測試，證據放在既有 evidence 目錄內的 `private-document-login/otp` 與 `private-document-login/lifecycle`，由原 sandbox workflow 上傳合成截圖與JSON；未新增workflow或部署腳本。本機證據：`ghv-evidence/private-document-login-20261121`，含兩輪RED、focused綠燈、完整Node結果、OTP協定JSON和Edge截圖。

本機驗證：focused Node11/11PASS；完整Node287項、286PASS、0FAIL、1項既有Windows略過（POSIX npx fixture，Linux CI執行）；build成功，既有Vite公開資源警語保留，部署provisioning未執行。完整staff Edge入口（主辦／評審／回收／決賽政策／公開會員聯絡資料／新增OTP文件／原R2生命週期與備份還原）exit0。所有workerd使用隨機port，未占用4173。

尚未完成：遠端私有bucket／D1／實體裝置與真人OTP驗收、掃描／收件與保存政策。沒有遠端遷移、全域旗標變更、主線合併或正式發布。雲端總紀錄由本次主協作者補登與回讀後才可標示整批完成。
