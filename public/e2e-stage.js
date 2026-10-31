import {validPerformanceLink} from './performance-link.js';
// Alan V2 2026-10-29 · real D1 acceptance client, not public registration.
// Only non-sensitive LANGUAGE preference uses localStorage; all accounts and forms use Worker.
const $=id=>document.getElementById(id),role=document.body.dataset.role;
const dict={
en:{
 safety:'STAGING ONLY · Invited TEST email addresses and fictional records. No actual registration, payments, or prizes.',
 memberTitle:'My test participant dashboard',judgeTitle:'Private invited judge dashboard',organizerTitle:'Organizer control · TEST ONLY',
 pageIntro:'Alan V2 · online auditions Jan 1–31 and Apr 1–30, live rounds March and June, final in early September 2027. D1 persistence requires approved Cloudflare setup. No official registration.',
 signinTitle:'Email verification & sign in',signinText:'Use a pre-approved TEST email. A real one-time verification code is sent only after Cloudflare Email Sending is configured.',
 email:'TEST email address',sendCode:'Email me a verification code',code:'Six-digit email code',verify:'Verify & open my personal dashboard',
 logout:'Log out',applyTitle:'Enter a fictional TEST singer',stageName:'TEST performer name',round:'Online audition window',
 janWindow:'January 1–31, 2027',aprWindow:'April 1–30, 2027',category:'Contest category',province:'Eligible province',
 basis:'Residence, study or work location',affiliation:'TEST school or occupation',song:'Song title',artist:'Original singer',
 songLanguage:'Song language',songKey:'Song key',demo:'Demo video URL (optional if uploading a TEST video)',
 demoRule:'V2: 60–90 sec of uninterrupted live singing, face and voice identifiable; no lip-sync, tuning or splicing.',
 adult:'Community category: fictional participant is 18+ at audition close.',
 student:'University category: fictional participant is currently enrolled.',
 contract:'Fictional participant has no exclusive artist contract conflicting with the contest.',
 submit:'Save fictional TEST application in D1',entries:'My persisted test entries',
 deleteTitle:'Erase TEST account',deleteText:'Remove all TEST D1 applications, scores, votes and private files linked to this participant.',
 delete:'Delete this TEST member',reviewTitle:'Stage-by-stage review scores',
 reviewIntro:'Invite-only judges. Demo = technique 60 / expression 40; live qualifier and final = 40 / 30 / 20 / 10. Each stage scores separately.',
 notLive:'This is a closed technical rehearsal. No real payment, eligibility check, official vote or award is performed.',
 signedIn:'Verified test session',saved:'Stored in Cloudflare D1',none:'No test entries yet',reviewNone:'No eligible review submissions.',
 application:'Application ID',phase:'Competition stage',status:'Review status',payment:'Payment',mockPay:'Simulate NPR 500 test payment',
 testPaid:'SIMULATED NPR 500 · no real transfer',

 download:'Download private TEST demo',

 technique:'Technique',interpretation:'Interpretation',stagePresence:'Stage presence',appearance:'Appearance',
 conflict:'I confirm I have no direct conflict of interest.',score:'Submit TEST score',
 alreadyScored:'Score already saved',scoreSaved:'D1 score recorded',
 organizerReviewTitle:'Advance candidates manually (TEST)',organizerReviewIntro:'Invite-only organizers. Promotion requires 3 separate judge scores per stage; max 25 to live qualifiers and 8 to the final per category/window.',
 standingTitle:'Final TEST standings · website votes 51% + judges 49%',promote:'Promote to',pending:'Need 3 judge scores',
 voteStageTitle:'September final · TEST website vote',voteStageNote:'Only finalists may receive test votes. One per verified TEST email is a temporary rehearsal limit, not the published voter policy.',
 voteTest:'Submit one TEST vote',noFinalists:'No test finalists are ready yet.',noOrganizer:'No test applications yet.',
 sendSuccess:'Email requested. Check your TEST inbox.',done:'Verified. Test account data is stored on Cloudflare D1.',
 failed:'Operation failed: ',restart:'Cloudflare setup incomplete: D1 migration, Email binding, allowlist and secrets are required.',
 newEntry:'D1 TEST entry saved.',paymentDone:'NPR 500 mock payment logged in D1; no money charged.',
 deleted:'TEST account erased.',reviewerOnly:'This login is for invited judges only.',memberOnly:'Participant-only page.',organizerOnly:'Organizer invitation required.',
 confirmDelete:'Erase all this test account data? This cannot be undone.',user:'TEST ACCOUNT',contestRules:'V2 rehearsal terms',
 noFunds:'TEST ONLY: never upload real IDs, receipts, or remit any money.'
},
ne:{
 safety:'परीक्षण मात्र · निमन्त्रित परीक्षण इमेल र काल्पनिक डाटा। वास्तविक दर्ता वा भुक्तानी होइन।',
 memberTitle:'मेरो परीक्षण सहभागी पृष्ठ',judgeTitle:'निमन्त्रित निर्णायकको पृष्ठ',organizerTitle:'आयोजक परीक्षण नियन्त्रण',
 pageIntro:'Alan V2 · अनलाइन छनोट जनवरी १–३१ र अप्रिल १–३०; प्रत्यक्ष छनोट मार्च र जुन, सेप्टेम्बरमा फाइनल। Cloudflare जोडिएपछि मात्र D1 मा परीक्षण रेकर्ड राखिन्छ।',
 signinTitle:'इमेल प्रमाणिकरण र लगइन',signinText:'पहिल्यै स्वीकृत परीक्षण इमेल प्रयोग गर्नुहोस्। सेटिङ पूरा भएपछि एक पटक प्रयोग हुने कोड आउँछ।',
 email:'परीक्षण इमेल',sendCode:'प्रमाणीकरण कोड पठाउनुहोस्',code:'इमेलको ६-अङ्क कोड',verify:'प्रमाणित गरी मेरो पृष्ठ खोल्नुहोस्',
 logout:'लगआउट',applyTitle:'काल्पनिक परीक्षण सहभागी भर्नुहोस्',stageName:'परीक्षण गायकको नाम',round:'अनलाइन छनोट समय',
 janWindow:'जनवरी १–३१, २०२७',aprWindow:'अप्रिल १–३०, २०२७',category:'प्रतियोगिता समूह',province:'प्रदेश',
 basis:'बसोबास, अध्ययन वा काम',affiliation:'परीक्षण विद्यालय वा पेशा',song:'गीत',artist:'मूल गायक',
 songLanguage:'गीतको भाषा',songKey:'स्वर',demo:'Demo भिडियो लिंक (निजी परीक्षण भिडियो अपलोड गर्न सकिन्छ)',
 demoRule:'६०–९० सेकेन्डको अविच्छिन्न गीत; अनुहार र स्वर स्पष्ट हुनुपर्छ। सम्पादन निषेध।',
 adult:'सामाजिक समूह: काल्पनिक सहभागी अन्तिम मितिमा १८+ छ।',
 student:'विश्वविद्यालय समूह: काल्पनिक सहभागी हाल अध्ययनरत छ।',
 contract:'काल्पनिक सहभागीको विशेष कलाकार सम्झौता छैन।',
 submit:'D1 मा परीक्षण आवेदन सुरक्षित गर्नुहोस्',entries:'मेरो परीक्षण आवेदन',
 deleteTitle:'परीक्षण खाता हटाउनुहोस्',deleteText:'यस खाताको सबै परीक्षण डाटा र फाइल मेटाइनेछ।',delete:'परीक्षण खाता मेटाउनुहोस्',
 reviewTitle:'प्रत्येक चरणको निर्णायक स्कोर',reviewIntro:'निमन्त्रित निर्णायक मात्र। भिडियो ६०/४०, प्रत्यक्ष छनोट र फाइनल ४०/३०/२०/१०।',
 notLive:'परीक्षण मात्र। आधिकारिक दर्ता, भुक्तानी, मतदान वा पुरस्कार होइन।',
 signedIn:'परीक्षण सत्र प्रमाणित',saved:'Cloudflare D1 मा सुरक्षित',none:'आवेदन छैन',reviewNone:'स्कोरका लागि आवेदन छैन',
 application:'आवेदन',phase:'चरण',status:'स्थिति',payment:'भुक्तानी',mockPay:'NPR 500 नमुना भुक्तानी',
 testPaid:'नमुना NPR 500 · वास्तविक रकम होइन',

 download:'निजी परीक्षण भिडियो लिनुहोस्',

 technique:'गायन प्राविधिक',interpretation:'गीत व्याख्या',stagePresence:'मञ्च प्रस्तुति',appearance:'समग्र प्रस्तुति',
 conflict:'मसँग प्रत्यक्ष हितको द्वन्द्व छैन।',score:'परीक्षण स्कोर पठाउनुहोस्',
 alreadyScored:'स्कोर राखिएको छ',scoreSaved:'D1 मा स्कोर राखियो',
 organizerReviewTitle:'परीक्षण छनोट अगाडि बढाउनुहोस्',organizerReviewIntro:'आयोजक निमन्त्रित मात्र। चरण परिवर्तन गर्न कम्तीमा ३ निर्णायकको स्कोर चाहिन्छ।',
 standingTitle:'फाइनल परीक्षण: वेबसाइट ५१% + निर्णायक ४९%',promote:'अगाडि बढाउनुहोस्',pending:'३ निर्णायक चाहिन्छ',
 voteStageTitle:'सेप्टेम्बर फाइनल · परीक्षण मतदान',voteStageNote:'फाइनलिस्टको परीक्षण मत मात्र; आधिकारिक मतदान नियम होइन।',
 voteTest:'परीक्षण मत दिनुहोस्',noFinalists:'फाइनलिस्ट छैनन्',noOrganizer:'परीक्षण आवेदन छैन',
 sendSuccess:'इमेल कोड मागियो।',done:'प्रमाणित भयो। डाटा D1 मा सुरक्षित रहन्छ।',
 failed:'त्रुटि: ',restart:'Cloudflare D1/Email/गोप्य सेटिङ अझै पूरा भएको छैन।',
 newEntry:'D1 मा आवेदन राखियो।',paymentDone:'NPR 500 नमुना घटना D1 मा राखियो।',
 deleted:'परीक्षण खाता मेटियो।',reviewerOnly:'निमन्त्रित निर्णायक मात्र',memberOnly:'सहभागी मात्र',organizerOnly:'आयोजक निमन्त्रणा आवश्यक',
 confirmDelete:'सबै परीक्षण डाटा हटाउने?',user:'परीक्षण खाता',contestRules:'V2 परीक्षण',noFunds:'वास्तविक कागजात वा पैसा नदिनुहोस्।'
},
zh:{
 safety:'僅供 V2 驗收模擬，不提供正式註冊、實際繳費或正式得獎認定。請只用受邀測試信箱與虛構資料。',
 memberTitle:'我的 Cloudflare D1 參賽測試中心',judgeTitle:'受邀評審專屬評分中心',organizerTitle:'賽事管理員測試控制台',
 pageIntro:'Alan V2：2027年1月與4月線上海選報名；3月與6月實體初賽；9月初年度決賽。Cloudflare 設定完成後才真正保存測試資料，不接受正式收件。',
 signinTitle:'Email 驗證與會員登入',signinText:'請使用列入白名單的測試信箱。完成 Cloudflare 郵件服務設定後，系統才會真正發送一次性驗證碼。',
 email:'測試 Email 帳號',sendCode:'寄出真實驗證碼',code:'Email 收到的六位驗證碼',verify:'驗證並進入我的會員中心',
 logout:'登出',applyTitle:'建立虛構參賽資料',stageName:'測試選手名稱',round:'線上海選報名窗口',
 janWindow:'2027年1月1日至31日',aprWindow:'2027年4月1日至30日',category:'參賽組別',province:'受理省份',
 basis:'符合地區的依據（居住／就學／工作）',affiliation:'虛構學校或職業',song:'歌曲名稱',artist:'原唱者',
 songLanguage:'演唱語言',songKey:'調性',demo:'Demo 影片網址（也可報名後上傳私人測試影片）',
 demoRule:'V2 Demo 限60至90秒，本人連續演唱、清楚可辨識面容與聲音，不得對嘴、修音或拼接。',
 adult:'僅社會組：虛構選手於海選截止時年滿18歲。',
 student:'僅大學組：虛構選手有正式在學身分。',
 contract:'虛構選手沒有衝突的專屬經紀或唱片合約。',
 submit:'建立 D1 測試報名紀錄',entries:'我在 D1 的測試報名紀錄',
 deleteTitle:'刪除測試會員',deleteText:'刪除我所有 D1 測試報名、評分、投票與私人 R2 測試資料；無法復原。',
 delete:'刪除整個測試帳號',reviewTitle:'分階段評審工作區',
 reviewIntro:'評審須獲邀請。海選 Demo 使用技巧60分＋詮釋40分；實體初賽、年度決賽使用技巧40＋詮釋30＋台風20＋儀態10；不同階段成績不累計。',
 notLive:'本頁為封閉功能驗收。資料若成功寫入 D1 仍不是正式報名、資格認定、付款、官網正式投票或獎金。',
 signedIn:'測試信箱已驗證',saved:'已儲存至 Cloudflare D1',none:'尚無測試報名',reviewNone:'目前沒有符合測試審核條件的作品',
 application:'報名編號',phase:'賽事階段',status:'審核狀態',payment:'付款狀態',mockPay:'模擬支付 NPR 500',
 testPaid:'NPR 500 已模擬（沒有銀行交易）',

 download:'下載我的測試演唱影片',

 technique:'歌唱技巧與音準',interpretation:'情感表達與歌曲詮釋',stagePresence:'舞台表現與台風',appearance:'儀態及整體呈現',
 conflict:'我確認與此選手沒有直接利益衝突。',score:'確認儲存測試評分',
 alreadyScored:'此階段已評分',scoreSaved:'測試評分已寫入 D1',
 organizerReviewTitle:'人工晉級與名額管理',organizerReviewIntro:'僅限受邀賽事管理員。每階段至少3位評審完成獨立評分，才能人工晉級；每場每組最多25人進實體初賽、8人進年度決賽。',
 standingTitle:'9月決賽測試總分：官網票數51%＋評審均分49%',promote:'測試人工晉級至',pending:'尚未達3位評審',
 voteStageTitle:'9月決賽官網測試投票',voteStageNote:'只有管理員晉級的決賽者可接受投票；已驗證測試會員一人一票是暫定驗收限制，不是正式票選辦法。',
 voteTest:'投下測試票',noFinalists:'目前沒有測試決賽者，須完成海選及初賽評分後人工晉級。',noOrganizer:'目前沒有D1測試報名',
 sendSuccess:'已要求寄送驗證碼，請檢查測試信箱。',done:'驗證完成，資料由 D1 儲存。',
 failed:'操作失敗：',restart:'Cloudflare 尚未設定完整：需先建立 D1 資料表、Email 寄件、白名單及密鑰。',
 newEntry:'測試報名已寫入 D1。',paymentDone:'NPR 500 模擬付款已寫入 D1，沒有實際扣款。',
 deleted:'測試會員已刪除。',reviewerOnly:'只限受邀評審登入',memberOnly:'此頁只限參賽測試會員',organizerOnly:'需要受邀管理員權限',
 confirmDelete:'確定刪除所有測試會員資料？無法復原。',user:'測試會員',contestRules:'V2 模擬章程',noFunds:'不要在這裡上傳真實證件或匯款。'
}};
// Common, low-cognitive-load, mobile-first onboarding copy in the three locales.
const mobileCopy={
 en:{introEyebrow:'INVITED TEST · NO OFFICIAL ENTRY',stepEmail:'Email',stepVerify:'Verify',stepAccount:'My account',
 emailHint:'Use your invited TEST mailbox. We send one code to confirm you own the email address. No real IDs or payments.',
 codeHint:'Enter the 6-digit code from your TEST inbox. It is valid for 10 minutes.',changeEmail:'Use another email',
 codeSentTo:'Code sent to',stepTitle:'Step 1 of 3: Email verification'},
 ne:{introEyebrow:'निमन्त्रित परीक्षण · आधिकारिक दर्ता होइन',stepEmail:'इमेल',stepVerify:'प्रमाणित',stepAccount:'मेरो खाता',
 emailHint:'आमन्त्रित परीक्षण इमेल मात्र प्रयोग गर्नुहोस्। इमेल तपाईंको हो भन्ने पुष्टि गर्न एक कोड पठाइन्छ। वास्तविक प्रमाणपत्र वा रकम नदिनुहोस्।',
 codeHint:'परीक्षण इमेलमा आएको ६-अङ्क कोड लेख्नुहोस्। कोड १० मिनेट मान्य हुन्छ।',changeEmail:'अर्को इमेल प्रयोग गर्नुहोस्',
 codeSentTo:'कोड पठाइएको',stepTitle:'पहिलो चरण: इमेल प्रमाणिकरण'},
 zh:{introEyebrow:'受邀測試 · 非正式報名',stepEmail:'Email',stepVerify:'驗證',stepAccount:'個人中心',
 emailHint:'僅限受邀測試信箱。一次性驗證碼用來確認這個 Email 確實屬於你；請勿提供真實證件或匯款。',
 codeHint:'輸入測試信箱收到的6位驗證碼，有效期限10分鐘。',changeEmail:'更換 Email 信箱',
 codeSentTo:'驗證碼已寄至',stepTitle:'第一步：確認測試信箱'}
};
for(const l of ['en','ne','zh'])Object.assign(dict[l],mobileCopy[l]);


const linkCopy={
 en:{demo:'Performance link (required)',linkMode:'LINK SUBMISSIONS · No file uploads. Eligibility documents and payment receipts are not collected or verified in this test.',
 demoHelp:'Paste a YouTube, Google Drive, TikTok, Douyin or other external HTTPS performance link. Allow judges to view it without requesting access; check it in a signed-out browser. Do not share IDs or payment documents here.',
 openWork:'Open performance',invalidWorkLink:'Enter a valid external HTTPS performance link (up to 2,048 characters).',
 documentsPending:'TEST ONLY: eligibility documents and payment receipts are not collected or verified. Scoring tests performance workflow only.',
 checking:'Checking your test session…',safetyTitle:'INVITED TEST · NOT OFFICIAL REGISTRATION',
 step01:'STEP 01 · EMAIL VERIFICATION',step02:'STEP 02 · PERFORMANCE LINK',step03:'STEP 03 · SIMULATED PAYMENT',stepFinal:'FINAL · TEST VOTING',
 reviewerOnlyLabel:'INVITED JUDGES',organizerOnlyLabel:'INVITED ORGANIZERS',footerLabel:'RESTRICTED TEST · NO OFFICIAL ENTRY',
 university:'University',community:'Community',bagmati:'Bagmati Province',gandaki:'Gandaki Province',residence:'Residence',study:'Study',work:'Work',
 signinText:'Use your invited TEST email. A real one-time code can be sent once the email service is configured.',
 deleteText:'Erase this test account and its D1 applications, scores and votes. Externally hosted videos are not deleted.'},
 ne:{demo:'प्रस्तुतिको लिंक (अनिवार्य)',linkMode:'लिंकबाट आवेदन · फाइल अपलोड हुँदैन। यो परीक्षणमा योग्यता कागजात वा भुक्तानी रसिद लिइँदैन वा प्रमाणित गरिँदैन।',
 demoHelp:'YouTube, Google Drive, TikTok, Douyin वा अन्य HTTPS प्रस्तुति लिंक राख्नुहोस्। निर्णायकले अनुमति नमागी हेर्न सक्नुपर्छ; लगआउट गरेर जाँच्नुहोस्। परिचयपत्र वा भुक्तानी कागजात नराख्नुहोस्।',
 openWork:'प्रस्तुति खोल्नुहोस्',invalidWorkLink:'सही बाह्य HTTPS प्रस्तुति लिंक राख्नुहोस् (२,०४८ अक्षरसम्म)।',
 documentsPending:'परीक्षण मात्र: योग्यता कागजात र भुक्तानी रसिद लिइएको वा प्रमाणित गरिएको छैन। यो प्रस्तुति मूल्याङ्कन प्रक्रियाको परीक्षण हो।',
 checking:'परीक्षण सत्र जाँच्दै…',safetyTitle:'निमन्त्रित परीक्षण · आधिकारिक दर्ता होइन',
 step01:'चरण १ · इमेल प्रमाणिकरण',step02:'चरण २ · प्रस्तुतिको लिंक',step03:'चरण ३ · नमुना भुक्तानी',stepFinal:'फाइनल · परीक्षण मतदान',
 reviewerOnlyLabel:'निमन्त्रित निर्णायक',organizerOnlyLabel:'निमन्त्रित आयोजक',footerLabel:'सीमित परीक्षण · आधिकारिक दर्ता होइन',
 university:'विश्वविद्यालय',community:'सामाजिक',bagmati:'बागमती प्रदेश',gandaki:'गण्डकी प्रदेश',residence:'बसोबास',study:'अध्ययन',work:'काम',
 deleteText:'यस परीक्षण खाताको D1 आवेदन, स्कोर र मत मेटाइन्छ। अन्य वेबसाइटका भिडियो मेटिँदैनन्।'},
 zh:{demo:'作品連結（必填）',linkMode:'連結報名測試 · 不上傳原始檔；本階段不收集或驗證資格文件與繳費證明。',
 demoHelp:'貼上 YouTube、Google Drive、TikTok／抖音或其他 HTTPS 作品連結。請允許評審直接觀看、不必申請權限，並先用登出狀態確認能開啟。不要填寫身分證件或付款文件的連結。',
 openWork:'開啟作品',invalidWorkLink:'請填寫有效的外部 HTTPS 作品連結，長度不超過2,048字元。',
 documentsPending:'僅供測試：尚未收集或驗證資格文件與繳費證明；評分只驗收作品評審流程。',
 checking:'正在檢查測試登入狀態…',safetyTitle:'受邀測試 · 非正式報名',
 step01:'第一步 · Email 驗證',step02:'第二步 · 提交作品連結',step03:'第三步 · 模擬付款',stepFinal:'決賽 · 測試投票',
 reviewerOnlyLabel:'受邀評審專用',organizerOnlyLabel:'受邀管理員專用',footerLabel:'封閉測試 · 非正式報名',
 university:'大學組',community:'社會組',bagmati:'巴格馬蒂省',gandaki:'甘達基省',residence:'居住',study:'就學',work:'工作',
 signinText:'請使用受邀測試信箱。寄信服務完成設定後，系統才會真正寄出一次性驗證碼。',
 deleteText:'刪除這個測試帳號及其 D1 報名、評分與投票資料；不會刪除其他平台上的影片。'}
};
for(const l of ['en','ne','zh'])Object.assign(dict[l],linkCopy[l]);

const recoveryCopy={
 en:{resendCode:'Resend verification email',resendWait:'Resend in {seconds}s',requestRef:'Request reference',
 deliveryHelp:'No email? Check Spam and the address you entered. Match the request reference shown here to the email. A code expires after 10 minutes and works only once. Wait for the resend button before trying again.',
 mailUnavailable:'The email service could not send a verification email. No sign-in was completed. Try later or contact the organizer.',
 tooManyCodes:'Too many code requests. Wait 10 minutes before requesting another email.',
 codeInvalid:'This code is expired, used, incorrect or no longer usable. Check the email request reference or request another code.',
 notInvited:'This email is not invited for this role. Use the assigned participant, judge or organizer address.',
 restart:'Test sign-in is not enabled yet. The organizer must finish email, invitation and security settings.',
 sendSuccess:'Verification email requested. Check your inbox and Spam, and match the request reference.'},
 ne:{resendCode:'प्रमाणीकरण इमेल फेरि पठाउनुहोस्',resendWait:'{seconds} सेकेन्डपछि फेरि पठाउन सकिन्छ',requestRef:'अनुरोध सङ्केत',
 deliveryHelp:'इमेल आएन? Spam र लेखेको इमेल ठेगाना जाँच्नुहोस्। यहाँको अनुरोध सङ्केत इमेलसँग मिलाउनुहोस्। कोड १० मिनेट मान्य हुन्छ र एक पटक मात्र चल्छ। फेरि पठाउने बटन खुलुन्जेल पर्खनुहोस्।',
 mailUnavailable:'इमेल सेवाले कोड पठाउन सकेन। लगइन भएको छैन। पछि प्रयास गर्नुहोस् वा आयोजकलाई सम्पर्क गर्नुहोस्।',
 tooManyCodes:'धेरै कोड मागिएको छ। अर्को इमेल माग्नुअघि १० मिनेट पर्खनुहोस्।',
 codeInvalid:'यो कोड म्याद सकिएको, प्रयोग भइसकेको वा गलत छ। अनुरोध सङ्केत जाँच्नुहोस् वा अर्को कोड माग्नुहोस्।',
 notInvited:'यो भूमिकाका लागि इमेल आमन्त्रित छैन। तोकिएको सहभागी, निर्णायक वा आयोजक इमेल प्रयोग गर्नुहोस्।',
 restart:'परीक्षण लगइन अझै खुला छैन। आयोजकले इमेल, निमन्त्रणा र सुरक्षा सेटिङ पूरा गर्नुपर्छ।',
 sendSuccess:'प्रमाणीकरण इमेल मागियो। Inbox र Spam जाँचेर अनुरोध सङ्केत मिलाउनुहोस्।'},
 zh:{resendCode:'重新寄送驗證信',resendWait:'{seconds}秒後可重新寄信',requestRef:'請求編號',
 deliveryHelp:'收不到信？請檢查垃圾郵件及輸入的信箱，並核對這裡與信件的請求編號。驗證碼10分鐘內有效、每組僅能使用一次；重新寄信按鈕開放後再試。',
 mailUnavailable:'寄信服務目前無法寄出驗證信，尚未完成登入。請稍後再試或聯絡活動方。',
 tooManyCodes:'要求驗證碼過於頻繁，請等待10分鐘後再重新寄信。',
 codeInvalid:'驗證碼已過期、已使用、輸入有誤或已失效。請核對信件請求編號，或重新要求驗證碼。',
 notInvited:'這個信箱未獲邀使用此角色，請使用分配給參賽者、評審或管理員的信箱。',
 restart:'測試登入尚未開放。活動方需先完成寄信、受邀名單與安全設定。',
 sendSuccess:'已要求寄送驗證信，請檢查收件匣與垃圾郵件，並核對請求編號。'}
};
for(const l of ['en','ne','zh'])Object.assign(dict[l],recoveryCopy[l]);

let lang='en';try{const p=localStorage.getItem('ghv_ui_language_v1');if(dict[p])lang=p}catch{}
let challenge='',challengeRef='',deliveryEmail='',requestVersion=0,requestPending=false,resendUntil=0,resendTimer=null,account=null,statusMessage={key:'checking',bad:false,detail:''};
const t=k=>dict[lang][k]||dict.en[k]||k;
const node=(tag,value,cls)=>{const a=document.createElement(tag);if(value!==undefined)a.textContent=String(value);if(cls)a.className=cls;return a};
const renderMessage=()=>{$('status').textContent=t(statusMessage.key)+statusMessage.detail;$('status').className='status '+(statusMessage.bad?'error':'good')};
const message=(key,bad=false,detail='')=>{statusMessage={key,bad,detail};renderMessage()};
function workLink(url){
 if(!validPerformanceLink(url))return node('p',t('invalidWorkLink'),'micro');
 const link=node('a',t('openWork')+' · '+new URL(url).hostname);link.href=url;link.target='_blank';link.rel='noopener noreferrer';return link;
}
function locale(l){
 lang=dict[l]?l:'en';document.documentElement.lang=lang==='zh'?'zh-Hant':lang;
 try{localStorage.setItem('ghv_ui_language_v1',lang)}catch{}
 for(const el of document.querySelectorAll('[data-lang]'))el.setAttribute('aria-pressed',String(el.dataset.lang===lang));
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
 renderMessage();progress();
 updateMailbox();updateResend();
 if(account){$('welcome').textContent=t('signedIn')+' · '+account.id.slice(0,8);workspace();}
}
async function api(path,options={}){
 const response=await fetch('/api/e2e/'+path,{credentials:'same-origin',cache:'no-store',...options});
 let data;try{data=await response.json()}catch{throw Error('invalid_response')}
 if(!response.ok||!data.ok)throw Error(data.error||String(response.status));
 return data;
}
const post=(path,obj)=>api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});
function progress(){
 const phase=account?'account':$('verify-form').hidden?'email':'verify';
 for(const el of document.querySelectorAll('.access-step')){
  const match=el.dataset.step===phase;
  if(match)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
  el.classList.toggle('current',match);
 }
}
// Clear previously rendered sensitive test details on logout or expired sessions.
// CSS hidden state is also respected under print media.
const visible=x=>{
 $('signin').hidden=x;$('workspace').hidden=!x;
 if(!x){
  for(const id of ['welcome','applications','finalists','queue','admin-apps','standings']){
   const target=$(id);if(target)target.replaceChildren();
  }
 }
};
async function session(){
 try{
  const data=await api('me');account=data.account;
  if(account.role!==role){account=null;visible(false);message(role==='reviewer'?'reviewerOnly':role==='organizer'?'organizerOnly':'memberOnly',true);return}
  visible(true);progress();$('welcome').textContent=t('signedIn')+' · '+account.id.slice(0,8);
  message('saved');await workspace();
 }catch(error){account=null;visible(false);progress();message(['e2e_not_configured','e2e_database_not_bound'].includes(error.message)?'restart':'signinText',['e2e_not_configured','e2e_database_not_bound'].includes(error.message))}
}
async function workspace(){
 if(role==='reviewer')await judging();
 else if(role==='organizer')await organizer();
 else{await applications();await finalists()}
}
async function applications(){
 const view=$('applications');view.replaceChildren();
 try{
  const data=await api('applications');
  if(!data.applications.length){view.append(node('p',t('none')));return}
  for(const a of data.applications){
   const item=node('article',undefined,'entry');item.append(node('h3',a.stage_name+' · '+a.round_code));
   const meta=node('div',undefined,'meta');
   for(const [key,value] of [[t('application'),a.id],[t('phase'),a.phase],[t('category'),a.category],[t('status'),a.status],[t('payment'),a.payment_status]]){
    const c=node('div');c.append(node('small',key),node('strong',value));meta.append(c)}
   item.append(meta,node('p',a.song_title+' / '+a.original_artist));
   if(a.demo_url)item.append(workLink(a.demo_url));
   if(a.has_uploaded_file){const l=node('a',t('download'));l.href='/api/e2e/demo-download?application='+encodeURIComponent(a.id);l.style.display='block';item.append(l)}
   const actions=node('div',undefined,'actions');
   if(a.payment_status==='unpaid'){
    const pay=node('button',t('mockPay'),'secondary');pay.type='button';
    pay.onclick=async()=>{pay.disabled=true;try{await post('mock-payment',{application_id:a.id});message('paymentDone');await applications()}
    catch(err){message('failed',true,err.message)}finally{pay.disabled=false}};
    actions.append(pay);
   }else actions.append(node('strong',t('testPaid')));
   actions.append(node('p',t('documentsPending'),'micro'));
   item.append(actions);view.append(item);
  }
 }catch(err){message('failed',true,err.message)}
}
async function judging(){
 const view=$('queue');view.replaceChildren();
 try{
  const {queue}=await api('reviewer-queue');
  if(!queue.length){view.append(node('p',t('reviewNone')));return}
  for(const a of queue){
   const card=node('article',undefined,'entry');
   card.append(node('h3',a.stage_name+' · '+a.round_code+' · '+a.phase),
    node('p',a.song_title+' · '+a.original_artist),node('p',t('documentsPending'),'micro'));
   if(a.demo_url)card.append(workLink(a.demo_url));
   if(a.has_uploaded_file){const l=node('a',t('download'));l.href='/api/e2e/demo-download?application='+encodeURIComponent(a.id);card.append(l)}
   const demo=a.phase==='demo',scored=demo?a.demo_technique:a.live_technique;
   if(scored!==null&&scored!==undefined){
    const sum=demo?a.demo_technique+a.demo_interpretation:a.live_technique+a.live_interpretation+a.stage_presence+a.appearance;
    card.append(node('p',t('alreadyScored')+' · '+sum+'/100'));view.append(card);continue
   }
   const form=node('form'),group=node('div',undefined,'score-fields'),inputs={};
   for(const [field,limit] of (demo?[['technique',60],['interpretation',40]]:[['technique',40],['interpretation',30],['stagePresence',20],['appearance',10]])){
    const lab=node('label',t(field)+' · 0–'+limit),inp=document.createElement('input');
    inp.type='number';inp.min='0';inp.max=String(limit);inp.step='1';inp.required=true;lab.append(inp);group.append(lab);inputs[field]=inp}
   form.append(group);
   const checkLabel=node('label',undefined,'check'),check=document.createElement('input');
   check.type='checkbox';check.required=true;checkLabel.append(check,node('span',t('conflict')));form.append(checkLabel);
   const submit=node('button',t('score'),'primary');submit.type='submit';form.append(submit);
   form.onsubmit=async ev=>{
    ev.preventDefault();submit.disabled=true;
    const body={application_id:a.id,phase:a.phase,technique:Number(inputs.technique.value),interpretation:Number(inputs.interpretation.value),no_conflict:check.checked};
    if(!demo){body.stage_presence=Number(inputs.stagePresence.value);body.appearance=Number(inputs.appearance.value)}
    try{await post('score',body);message('scoreSaved');await judging()}
    catch(err){message('failed',true,err.message)}finally{submit.disabled=false}
   };
   card.append(form);view.append(card);
  }
 }catch(err){message('failed',true,err.message)}
}
async function finalists(){
 const view=$('finalists');if(!view)return;view.replaceChildren();
 try{
  const {finalists}=await api('finalists');
  if(!finalists.length){view.append(node('p',t('noFinalists')));return}
  for(const a of finalists){
   const card=node('article',undefined,'entry');card.append(node('h3',a.stage_name+' · '+a.category),node('p',a.song_title));
   const btn=node('button',t('voteTest'),'secondary');btn.type='button';
   btn.onclick=async()=>{btn.disabled=true;try{await post('test-vote',{application_id:a.id});message('saved')}
     catch(err){message('failed',true,err.message)}finally{btn.disabled=false}};
   card.append(btn);view.append(card);
  }
 }catch(err){message('failed',true,err.message)}
}
async function organizer(){
 const apps=$('admin-apps'),board=$('standings');if(!apps||!board)return;
 apps.replaceChildren();board.replaceChildren();
 try{
  const {applications:items}=await api('organizer-queue');
  if(!items.length)apps.append(node('p',t('noOrganizer')));
  for(const a of items){
   const box=node('article',undefined,'entry');box.append(node('h3',a.stage_name+' · '+a.round_code+' · '+a.category));
   box.append(node('p',a.phase+' · '+a.status+' · '+a.payment_status));
   if(a.demo_url)box.append(workLink(a.demo_url));
   box.append(node('p',t('documentsPending'),'micro'));
   box.append(node('p','Demo '+a.demo_judges+'/3 (avg '+(a.demo_mean??'—')+') · Live '+a.live_judges+'/3 (avg '+(a.live_mean??'—')+')'));
   if(a.phase!=='final'&&a.payment_status==='simulated_paid'){
    const next=a.phase==='demo'?'qualifier':'final',b=node('button',t('promote')+' '+next,'secondary');b.type='button';
    b.disabled=(a.phase==='demo'?a.demo_judges:a.live_judges)<3;
    b.onclick=async()=>{b.disabled=true;try{await post('organizer-promote',{application_id:a.id,to_phase:next});message('saved');await organizer()}
     catch(err){message('failed',true,err.message)}finally{b.disabled=false}};
    box.append(b);
   }apps.append(box);
  }
  const {standings}=await api('standings');
  for(const x of standings){
   const box=node('article',undefined,'entry');
   box.append(node('h3',x.stage_name+' · '+x.category));
   box.append(node('p','TEST votes '+x.votes+' · normalized '+x.vote_score+' · jury '+(x.judges_mean??'—')+' · total '+(x.total_score??'awaiting 3 judge scores')));
   board.append(box);
  }
 }catch(err){message('failed',true,err.message)}
}
function updateMailbox(){
 if(challenge)$('verify-mailbox').textContent=t('codeSentTo')+' '+deliveryEmail+' · '+t('requestRef')+' '+challengeRef;
}
function updateResend(){
 const seconds=Math.max(0,Math.ceil((resendUntil-Date.now())/1000)),button=$('resend-code');
 button.disabled=requestPending||!challenge||seconds>0;
 button.textContent=seconds>0?t('resendWait').replace('{seconds}',String(seconds)):t('resendCode');
 if(!seconds&&resendTimer){clearInterval(resendTimer);resendTimer=null}
}
function authFailure(error){
 const key={test_email_service_unavailable:'mailUnavailable',too_many_code_requests:'tooManyCodes',
 expired_or_invalid_code:'codeInvalid',not_on_test_allowlist:'notInvited',e2e_not_configured:'restart',e2e_database_not_bound:'restart'}[error.message];
 if(key)message(key,true);else message('failed',true,error.message);
}
async function requestVerification(button){
 if(requestPending)return;
 const version=++requestVersion,email=$('email').value.trim();requestPending=true;
 button.disabled=true;updateResend();
 try{
  const result=await post('request-code',{email,role});
  if(version!==requestVersion)return;
  challenge=result.challenge_id;deliveryEmail=email;
  challengeRef=result.request_ref||challenge.slice(0,8);resendUntil=Date.now()+60000;
  if(resendTimer)clearInterval(resendTimer);resendTimer=setInterval(updateResend,1000);
  $('send-form').hidden=true;$('verify-form').hidden=false;$('code').value='';
  updateMailbox();updateResend();progress();$('code').focus();message('sendSuccess');
 }catch(err){if(version===requestVersion)authFailure(err)}finally{if(version===requestVersion){requestPending=false;updateResend();if(button.id!=='resend-code')button.disabled=false}}
}
$('send-form').onsubmit=ev=>{ev.preventDefault();requestVerification($('send-form').querySelector('button'))};
$('resend-code').onclick=()=>requestVerification($('resend-code'));
$('verify-form').onsubmit=async ev=>{
 ev.preventDefault();const btn=$('verify-form').querySelector('button');btn.disabled=true;
 try{await post('verify-code',{challenge_id:challenge,code:$('code').value});$('code').value='';await session();message('done')}
 catch(err){authFailure(err)}finally{btn.disabled=false}
};
$('logout').onclick=async()=>{
 try{await post('logout',{});requestVersion++;requestPending=false;account=null;visible(false);$('verify-form').hidden=true;$('send-form').hidden=false;progress();message('signinText')}
 catch(err){message('failed',true,err.message)}
};
if($('application-form'))$('application-form').onsubmit=async ev=>{
 ev.preventDefault();const btn=$('application-form').querySelector('button');btn.disabled=true;
 const data={
 round_code:$('round').value,category:$('category').value,province:$('province').value,
 location_basis:$('basis').value,affiliation:$('affiliation').value,stage_name:$('stage').value,
 song_title:$('song').value,original_artist:$('artist').value,song_language:$('song-language').value,
 song_key:$('song-key').value,demo_url:$('demo').value,adult_confirmed:$('adult').checked,
 student_confirmed:$('student').checked,no_exclusive_contract:$('contract').checked
 };
 if(!validPerformanceLink(data.demo_url.trim())){message('invalidWorkLink',true);btn.disabled=false;return}
 try{await post('applications',data);message('newEntry');await applications()}
 catch(err){message('failed',true,err.message)}finally{btn.disabled=false}
};
if($('delete-account'))$('delete-account').onclick=async()=>{
 if(!confirm(t('confirmDelete')))return;
 try{await post('delete-my-data',{});account=null;visible(false);message('deleted')}
 catch(err){message('failed',true,err.message)}
};
$('change-email').onclick=()=>{
 $('verify-form').hidden=true;$('send-form').hidden=false;requestVersion++;requestPending=false;challenge='';challengeRef='';deliveryEmail='';resendUntil=0;updateResend();$('send-form').querySelector('button').disabled=false;$('code').value='';progress();$('email').focus();
};
for(const b of document.querySelectorAll('[data-lang]'))b.onclick=()=>locale(b.dataset.lang);
locale(lang);session();
