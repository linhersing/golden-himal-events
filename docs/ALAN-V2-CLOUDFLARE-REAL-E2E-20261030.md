# Golden Himal Voice｜Alan V2 × Cloudflare 真實資料庫驗收計畫
**2026年10月30日／僅供測試，不提供正式報名、真實收款或可兌換優惠券**

## 唯一比賽條款依據
Alan 2026年10月29日 V2 PDF：
https://drive.google.com/file/d/1JihxJMeeJhcWFOetv-LQXQw7PbCeF1sH/view
此文件已由前線提供，開發依據為 V2 內容；對外公布權仍須主辦單位確認。Draft1 為三次實體初賽及12月決賽，已遭新版替換，不得再拿舊版日期測試正式動線。

## V2 測試值（非宣稱正式開放）
- 第一次線上海選：2027年1月1日至31日，報名代碼 2027-01；3月中旬實體初賽。
- 第二次線上海選：2027年4月1日至30日，報名代碼 2027-04；6月實體初賽。
- 決賽：2027年9月初，每組16人，合計32強。
- 受理省份：Bagmati / Gandaki（居住／就學／工作所在地，依前線後續核定的資格審核方式）；大學組在學證明為主，不強制國民身分證；社會組須在該次海選截止時年滿18歲。
- Demo 60–90秒、連續演唱，清楚辨識本人臉部與聲音，不可對嘴、修音或拼接。**V2同時提檔案上傳和Demo網址，未釐清是否並存，測試先支援兩者但不把測試容許當正式規章**。
- 每人每次 NPR500，僅在 TEST 模式記錄 SIMULATED_PAYMENT 及私有測試繳費憑證；沒有銀行帳戶、付款網關或對帳。
- 評審共3–5人、分階段各自等權平均；Demo 60/40、初賽及決賽 40/30/20/10。3人以下測試分數不觸發晉級、由受邀管理員人工選人進下一階段。
- 每場每組海選選25人入實體初賽、備取5人；實體初賽每場每組取8人進決賽、備取2人。D1觸發器限制前述正取名額，但**備取確認、48/24小時通知與決賽前7日封榜尚未完工**，不得宣稱完整賽務模組已正式上線。
- 決賽官網投票51%＋專業評審均分49%，分組最高票標準化100分，最後總分四捨五入兩位。D1測試票僅在已驗證測試帳號中允許一人一票（暫定保守安全模式），**正式投票限額、驗證方式、公開截止、反作弊、申訴與票數封存仍待前線核定與實作**。
- 獎金：兩組總 NPR332000。另有合格且已繳費者每人每年1張面額 NPR10000 餐飲折抵券，**沒有完整核銷細則，本測試不發可兌換餐券**。

## GitHub/Cloudflare 職責與上線界線
GitHub code branch merged? This document is a live code-delivery record; merge status verified separately.
Cloudflare Worker = /api/e2e/*；D1 = ghv-staging 的 e2e_* 測試表；R2 = 私有 STAGING_MEDIA；Email = EMAIL 受管寄送；測試登入以真 Email 六碼OTP與HttpOnly安全Session。
**不是正式密碼註冊。** 使用者要求的忘記密碼、改密碼、自設密碼須選定受管身分服務後再接；不能讓 Gemini 驗收 OTP 就誤稱「帳密全部完成」。

### 必須先由具有 Cloudflare 資源管理權限者完成
1. 備份 ghv-staging，確認尚不存在 e2e_* 表；將此repo的 **backend/migrations/1000_e2e_staging_acceptance_ONLY.sql（Alan V2版）**套用至隔離測試D1。若已套過Draft1版，**不可重新套用**；必須使用遷移差異方案而非覆蓋或清空有資料的表。
2. 啟用已驗證寄件網域的 Cloudflare Email Sending；Worker EMAIL 綁定。未驗證網域或失敗不會寄出測試驗證碼。
3. 建立獨立、沒有公開URL的R2 bucket，綁 STAGING_MEDIA；僅限本人與管理員取得私人資格和繳費證明，評審只能存取Demo影音。
4. Worker Secrets 建 STAGING_IDENTITY_SECRET（至少32字符真隨機）、STAGING_ALLOWED_EMAILS（受邀參賽者測試信箱）、STAGING_REVIEWER_EMAILS（**至少3個不同的評審測試信箱**）、STAGING_ORGANIZER_EMAILS（獨立主辦管理員測試信箱）、STAGING_FROM_EMAIL（已驗證寄件地址）。不得上傳私密值到 GitHub、文件或聊天。
5. 已獲授權後，才設 Cloudflare Secret STAGING_E2E_ENABLED=true 並重新驗收。**GitHub 已合併和 Cloudflare 頁面資產可開啟 ≠ 新D1表已建／真的寄信／真R2上傳**。

### 三個驗收 URL
- 參賽者（Email收信→D1報名→影片與測試文件→模擬付款→測試票）：https://golden-himal-voice-preview.linhersing.workers.dev/e2e-stage.html
- 受邀評審（依階段的2或4個計分欄位）：https://golden-himal-voice-preview.linhersing.workers.dev/judge-stage.html
- 受邀管理員（查看分數，完成Demo→實體初賽→決賽人工晉級、名額限制，查看51/49測試排名）：https://golden-himal-voice-preview.linhersing.workers.dev/organizer-stage.html

## Gemini 真正端到端驗收指令（僅在Cloudflare後端開通後執行）
**參賽者**
1. 用主辦核准的受邀測試 Email 請求驗證碼，真的收 Email → 貼上六碼 →登入。
2. 建虛構測試報名：Jan 2027 online window、Gandaki或Bagmati、University或Community、所在地依據、虛構身分/學校、曲目原唱語言調性、Demo連結（可空，後續上傳私有TEST影片）。**不要使用真證件或真表單。**
3. D1產生固定持久application UUID；登入前後跨手機/電腦相同。以 R2 分別上傳 TEST video/mp4或video/webm 20MB內、虛構資格PDF/圖片5MB內、虛構繳費證明PDF/圖片5MB內。後兩者不提供評審讀取。
4. 點「NPR500模擬付款」→D1 payment_events有資料、payment_status=simulated_paid但realCharge=false；沒有任何真金融交易。
5. 重新整理/登出，重新收Email六碼並登入，讀回完全相同application、影片及付款狀態。與同一裝置 localStorage 不同。

**評審／管理員**
6. 至少3個獨立受邀評審Email各自驗證登入，看到已模擬付款+Demo+測試資格+繳費證明的選手。提交海選Demo技巧60、詮釋40，每人每階段一次、利益衝突聲明必勾。
7. 第3位評完後，受邀管理員使用不同 Email 進入 organizer-stage.html，人工晉級至 qualifier（單組每場最多25）；必須拒絕未評滿3人的提前操作。
8. 同三位評審在 qualifier 以技巧40、詮釋30、台風20、儀態10重新獨立打分；管理員再人工晉級 final（每組每場最多8）。
9. 另一個已驗證測試會員登入參賽者頁，對 final candidate 投測試票；同會員再投應被D1拒絕、本人不得投自己。
10. 同三位評審完成 final 階段的四項獨立評分；管理員查看官網投票正規化100分×51%＋專業評審平均分×49%的兩位小數測試結果。
11. 會員刪除測試帳號後，D1相關application/支付/分數/測試票須刪除，R2私人測試檔須刪除，不可遺留真個資。
12. 未受邀Email、假身分role=reviewer/organizer、無Session查看文件/評分、不同人的文件下載、過期/重放驗證碼都必須被拒絕。測試信只寄專用信箱並隨測試完畢清理；不得占用使用者私人 Gmail。

## 當前未包含的正式賽務功能
- 社會組真正年齡驗證、學生證真實核對、付款帳戶和財務對帳、補件48小時限一次、備取順序與24/48小時確認、決賽封榜、申訴48小時。
- 正式安全網路投票的完整限額公告、異常票稽核、斷線恢復、決賽時點鎖定與公正第三方驗證。
- 可正式兌換的NPR10000餐券、獎金支付/稅務、30日優先洽約、官方協辦logo與對外宣傳同意。
- 正式Email+password/forgot/change-password。OTP只能驗收Email持有權與D1身份連動。

本文件與源規章都應保存在 Golden Himal Voice 的 SSOT Google Drive 主檔，不應讓新文檔覆蓋原V2 PDF。
