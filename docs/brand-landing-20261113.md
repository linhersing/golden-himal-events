# Golden Himal Palace｜11月13日雙層首頁與品牌頁改版歷史

## 2026年11月13日 使用者決策
對外入口首頁由單一「歌唱比賽報名首頁」改為 Golden Himal 品牌導覽，桌機／手機三個等級一致的主入口：
1. **認識 Golden Himal** → `/golden-himal.html`
2. **Golden Himal Voice** → `/voice.html`
3. **最新公告** → `/news.html`

Location 放在頁尾，不能搶占前三個入口。原本 `/index.html` 的完整報名／登入／公告三按鈕畫面，原封保留為 `/voice.html`（唯一變更為 SEO description），並且維持 `/member.html#register`、`/member.html#login`、`/news.html`、工作人員入口等既有連結。

## 設計與內容
- 品牌視覺以象牙白、暖金、深咖啡和留白為主，手機320／375／390優先。首頁不把工程資料、賽制、所有照片全堆成長頁。
- 品牌形象頁強調「日照金山」與 Himal 連結喜馬拉雅；`Palace` 正式取代過往 `Plaza` 是品牌設計紀錄所載，並非憑空編造的名稱起源。
- Golden Himal Palace 在尼泊爾奇旺，是大餐廳、婚宴與接待場域的對外品牌。第一期婚紗旅館、空中花園與第二期大餐廳實景分別展示；第二期3D模擬展板必須明確標示「設計構想，非已完工現場」。
- 第三期大旅館、神學院與宿舍屬尚未建的規劃，不在第一版品牌形象頁稱已落成。
- 底部 Location：尼泊爾奇旺，座標 27.666389,84.228333（來自2026年9月30日原始基地定位母檔），使用 Google Maps 搜尋座標。不是可驗證的郵寄街道門牌，正式營運前須前線核對客戶入口及可導航道路。
- 版面三語 EN／नेपाली／繁中，沿用既有語言設定 `ghv_ui_language_v1`。
- 測試階段提示在頁尾；不開放正式付款、正式報名，不修改 D1、API、Cloudflare secrets 或第二輪海選開關。

## 真實圖片來源與公開方式
- `public/images/golden-himal-phase1-exterior.png`：第一期旅館完工外觀實景三視角整理圖。
- `public/images/golden-himal-rooftop.png`：第一期空中花園現地屋頂拱架。
- `public/images/golden-himal-phase2-construction.png`：第二期宴會廳施工現地三視角。
- `public/images/golden-himal-phase2-visualization.png`：第二期婚宴大餐廳外觀與動線模擬展示板，前台標示設計構想。

來源均取自所有者的 Google Drive 原始工程／前線展示資料庫，由使用者指示製作網站；沒有把11月7日帶有來賓肖像的「內部未調色」照片自動公開。來源檔案／版權／照片核對仍以 Drive「11月13日形象介紹頁歷史文獻與現場影像盤點暨會議紀錄」為內部SSOT。

## 修改範圍
- `index.html` 改為全新三主入口
- `public/voice.html` 完整保留先前的報名功能首頁
- `public/golden-himal.html` 新增品牌故事頁
- `public/brand-portal.css` ／ `public/brand-portal.js` 全新品牌版型和三語
- `public/images/golden-himal-*.png` 精選圖
- 測試及 GitHub Actions 驗收腳本依新路由更新，登入與API程式不變

## 待核准／後續
1. 最新場地現況與更美的單張實照由王老師前線補件後替換；清晰區分實景和渲染。
2. 地圖座標已依工程母檔標記；客戶入口、正式地址及導航路況須現場人員再次核對。
3. 與電台交流照片和「協辦」關係，不能以會面冒充已簽約；需正式確認合作角色。
4. 新頁面仍為預覽網站，正式開站與收款分開審批。

本文件是技術變更歷史的一部分，不替代 Drive 的完整會議紀錄。
