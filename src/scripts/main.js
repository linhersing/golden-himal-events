// Golden Himal Voice: public, non-collecting interface preview.
// No network writes, persistent storage, identity verification or real votes.
const translations = {
  en: {
    ribbon:"DESIGN PREVIEW · Registration and voting are simulations only. Do not enter real personal information.",
    navEvent:"The Event",navUpdates:"Updates",navRegister:"Registration",navVote:"Audience Choice",navVenue:"Venue",
    heroEyebrow:"CHITWAN, NEPAL · A NEW STAGE IS COMING",
    slogan:"Where love meets, and talent shines.",
    heroDescription:"Singing, shared celebrations and new connections. An upcoming experience from Golden Himal Palace.",
    heroApply:"Explore registration",heroVote:"Explore audience choice",
    heroFoot:"Event dates and regulations will be announced after approval.",
    posterNote:"Concept design · Not a venue photograph",
    step1:"Share your voice",step2:"Cheer for a favorite",step3:"Celebrate on stage",
    introOverline:"THE STORY BEHIND THE STAGE",introTitle:"A stage for more than a song.",
    introBody:"Golden Himal Voice brings people together through music and a shared sense of occasion. We are preparing a welcoming platform for emerging voices in Chitwan.",
    introNote:"Participation details, eligibility and judging will be published when finalized.",
    newsTitle:"Every moment, in one place.",newsLead:"Follow event preparation, future shortlisted performers and official results. Nothing is announced before it is confirmed.",
    filterAll:"All news",filterEvent:"Event news",filterShortlist:"Shortlist",filterAward:"Results",
    newsTag1:"PREPARATION",newsTag2:"TO BE ANNOUNCED",newsTag3:"TO BE ANNOUNCED",
    newsCard1Title:"A new stage is taking shape.",newsCard1Body:"Our event experience is in preparation. Official entry details will follow.",
    newsCard2Title:"The next voices to be heard.",newsCard2Body:"No shortlist has been published. Confirmed performers will be shown here after review.",
    newsCard3Title:"An evening to remember.",newsCard3Body:"Official results and awards will be published only after approval. Audience choice and final awards may differ.",
    registerTitle:"Your stage begins here.",registerLead:"Try the registration journey with sample data. The official form is not accepting applications yet.",
    regStep1:"Enter basic information",regSub1:"Use fictional information in this preview.",
    regStep2:"Add a performance link",regSub2:"A short video demo is planned for screening.",
    regStep3:"Review your submission",regSub3:"Preview only; nothing is saved or sent.",
    demoWarning:"TEST MODE — No registration, emails, or uploads occur on this site.",
    formTitle:"Start your story",formHint:"Please use “Fill sample data”. Do not enter your actual personal details.",
    fieldName:"Display name",fieldCity:"City",fieldEmail:"Email (sample only)",fieldLink:"Performance link (sample only)",
    fieldConsent:"I understand this is an interface preview using fictional details, not a real registration.",
    reviewButton:"Review sample details ↗",fillButton:"Fill sample data",reviewTitle:"One last look.",
    reviewNote:"The next button only simulates completion; no data leaves your browser.",
    submitButton:"Complete preview",editButton:"Edit",successTitle:"Preview complete.",
    successText:"Sample number: DEMO-001. No application was received, stored or emailed.",againButton:"Try again",
    voteTitle:"Give your favorite voice the spotlight.",
    voteLead:"These are placeholder candidates, not real entrants. This demo does not collect votes, identify people, or determine awards.",
    portraitLabel:"PHOTO PLACEHOLDER",candidate1:"Sample performer 01",candidate2:"Sample performer 02",candidate3:"Sample performer 03",
    candidateBody:"Official approved portraits and performances will appear here.",
    sampleVotes:"SAMPLE VOTES",voteButton:"Choose",voteNote:"Try one sample vote. Counts reset when you reload; there is no real anti-fraud system.",
    resetVotes:"Reset sample votes",dialogTitle:"Confirm your demo choice",
    dialogDescription:"This vote only changes numbers in your open browser tab.",
    dialogConfirm:"Confirm sample vote",dialogCancel:"Cancel",
    venueTitle:"More than a performance. A place to gather.",
    venueLead:"Golden Himal Palace · Chitwan, Nepal. Real venue photography will be added once approved.",
    venue1:"Hall photography pending",venue2:"Stage photography pending",venue3:"Event photography pending",
    footerNote:"Design preview · No live registration, voting, or official results.",
    voteChoice:"You selected sample performer ",voted:"Sample vote recorded for performer ",demoOnly:" — only in this browser tab.",
    reviewName:"Name",reviewCity:"City",reviewEmail:"Sample email",reviewLink:"Sample link",newsCount:"Announcements shown: "
  },
  ne: {
    ribbon:"डिजाइन पूर्वावलोकन · दर्ता र मतदान अभ्यास मात्र हुन्। कृपया वास्तविक व्यक्तिगत जानकारी नराख्नुहोस्।",
    navEvent:"कार्यक्रम",navUpdates:"सूचनाहरू",navRegister:"दर्ता",navVote:"दर्शकको रोजाइ",navVenue:"स्थान",
    heroEyebrow:"चितवन, नेपाल · नयाँ मञ्चको तयारी",
    slogan:"जहाँ माया भेटिन्छ र प्रतिभा चम्किन्छ।",
    heroDescription:"गीत, उत्सव र नयाँ सम्बन्ध। गोल्डेन हिमाल प्यालेसको आगामी सांगीतिक अनुभव।",
    heroApply:"दर्ता प्रक्रिया हेर्नुहोस्",heroVote:"दर्शक मतदान हेर्नुहोस्",
    heroFoot:"मिति र नियम स्वीकृत भएपछि सार्वजनिक गरिनेछन्।",
    posterNote:"अवधारणा डिजाइन · वास्तविक स्थानको फोटो होइन",
    step1:"आफ्नो स्वर सुनाउनुहोस्",step2:"मनपर्ने स्वरलाई साथ दिनुहोस्",step3:"मञ्चमा उत्सव मनाउनुहोस्",
    introOverline:"मञ्चपछाडिको कथा",introTitle:"गीतभन्दा ठूलो एउटा मञ्च।",
    introBody:"गोल्डेन हिमाल भ्वाइसले संगीतमार्फत मानिसलाई जोड्छ। चितवनका नयाँ प्रतिभाका लागि स्वागतयोग्य मञ्च तयार हुँदैछ।",
    introNote:"सहभागिता, योग्यता र निर्णायक सम्बन्धी विवरण अन्तिम भएपछि प्रकाशित हुनेछन्।",
    newsTitle:"सबै महत्वपूर्ण पल, एकै ठाउँमा।",newsLead:"कार्यक्रम तयारी, छनोट सूची र आधिकारिक नतिजा यहाँ हेर्नुहोस्। पुष्टि नभएको कुरा सार्वजनिक गरिँदैन।",
    filterAll:"सबै सूचना",filterEvent:"कार्यक्रम सूचना",filterShortlist:"छनोट सूची",filterAward:"नतिजा",
    newsTag1:"तयारीमा",newsTag2:"प्रकाशन बाँकी",newsTag3:"प्रकाशन बाँकी",
    newsCard1Title:"नयाँ मञ्च तयार हुँदैछ।",newsCard1Body:"कार्यक्रमको तयारी भइरहेको छ। आधिकारिक दर्ता विवरण पछि आउनेछ।",
    newsCard2Title:"अब सुनिने नयाँ स्वरहरू।",newsCard2Body:"छनोट सूची प्रकाशित भएको छैन। समीक्षा पछि पुष्टि भएका नाम यहाँ आउनेछन्।",
    newsCard3Title:"सम्झनलायक साँझ।",newsCard3Body:"स्वीकृतिपछि मात्र आधिकारिक नतिजा प्रकाशित हुनेछ। दर्शकको रोजाइ र अन्तिम पुरस्कार फरक हुन सक्छन्।",
    registerTitle:"तपाईंको मञ्च यहींबाट सुरु हुन्छ।",registerLead:"नमुना जानकारी राखेर दर्ता प्रक्रिया हेर्नुहोस्। वास्तविक आवेदन खुला भएको छैन।",
    regStep1:"आधारभूत जानकारी",regSub1:"यस पूर्वावलोकनमा काल्पनिक जानकारी मात्र प्रयोग गर्नुहोस्।",
    regStep2:"प्रस्तुतिको लिंक",regSub2:"प्रारम्भिक छनोटका लागि छोटो भिडियोको योजना छ।",
    regStep3:"जानकारी जाँच",regSub3:"अभ्यास मात्र; केही सुरक्षित वा पठाइँदैन।",
    demoWarning:"परीक्षण मोड — वास्तविक दर्ता, इमेल वा अपलोड हुँदैन।",
    formTitle:"आफ्नो कथा सुरु गर्नुहोस्",formHint:"कृपया नमुना जानकारी भर्नुहोस्; वास्तविक विवरण नराख्नुहोस्।",
    fieldName:"देखिने नाम",fieldCity:"शहर",fieldEmail:"इमेल (नमुना)",fieldLink:"प्रस्तुति लिंक (नमुना)",
    fieldConsent:"यो काल्पनिक जानकारीसहितको अभ्यास हो, वास्तविक आवेदन होइन भन्ने मैले बुझेको छु।",
    reviewButton:"नमुना जाँच गर्नुहोस् ↗",fillButton:"नमुना भर्नुहोस्",reviewTitle:"अन्तिम जाँच",
    reviewNote:"अर्को बटनले पूरा भएको दृश्य मात्र देखाउँछ; जानकारी बाहिर पठाइँदैन।",
    submitButton:"अभ्यास पूरा",editButton:"सच्याउनुहोस्",successTitle:"अभ्यास पूरा भयो।",
    successText:"नमुना नम्बर: DEMO-001। कुनै आवेदन दर्ता, सुरक्षित वा इमेल गरिएको छैन।",againButton:"फेरि प्रयास",
    voteTitle:"मनपर्ने स्वरलाई समर्थन गर्नुहोस्।",
    voteLead:"यी वास्तविक प्रतियोगी होइनन्। यहाँ वास्तविक मत संकलन, पहिचान वा पुरस्कार निर्धारण हुँदैन।",
    portraitLabel:"फोटो राख्ने स्थान",candidate1:"नमुना गायक ०१",candidate2:"नमुना गायक ०२",candidate3:"नमुना गायक ०३",
    candidateBody:"अनुमोदित तस्बिर र प्रस्तुति यहाँ राखिनेछन्।",
    sampleVotes:"नमुना मत",voteButton:"छान्नुहोस्",voteNote:"एक नमुना मत दिनुहोस्। पेज रिफ्रेस गर्दा मत मेटिन्छ; वास्तविक सुरक्षा प्रणाली छैन।",
    resetVotes:"नमुना मत रिसेट",dialogTitle:"नमुना छनोट पुष्टि गर्नुहोस्",
    dialogDescription:"यो मत यस ब्राउजर ट्याबमा मात्र देखिन्छ।",
    dialogConfirm:"नमुना मत पुष्टि",dialogCancel:"रद्द",
    venueTitle:"प्रस्तुति मात्र होइन, भेटघाटको ठाउँ।",
    venueLead:"गोल्डेन हिमाल प्यालेस · चितवन, नेपाल। अनुमोदनपछि वास्तविक तस्बिर राखिनेछन्।",
    venue1:"हलको फोटो आउन बाँकी",venue2:"मञ्चको फोटो आउन बाँकी",venue3:"कार्यक्रमको फोटो आउन बाँकी",
    footerNote:"डिजाइन पूर्वावलोकन · वास्तविक दर्ता, मतदान वा आधिकारिक नतिजा छैन।",
    voteChoice:"तपाईंले नमुना गायक छान्नुभयो: ",voted:"नमुना मत गायकलाई दिइयो: ",demoOnly:" — यो ट्याबमा मात्र।",
    reviewName:"नाम",reviewCity:"शहर",reviewEmail:"नमुना इमेल",reviewLink:"नमुना लिंक",newsCount:"देखिएका सूचना: "
  },
  zh: {
    ribbon:"內部設計預覽 · 報名與投票皆為模擬，請勿填寫真實個人資料。",
    navEvent:"活動介紹",navUpdates:"最新公告",navRegister:"參賽報名",navVote:"人氣投票",navVenue:"認識場地",
    heroEyebrow:"尼泊爾奇旺 · 新舞台即將展開",
    slogan:"讓愛相遇，讓才華發光。",
    heroDescription:"歌聲、相聚與新的連結。Golden Himal Palace 正在籌備一場值得期待的活動。",
    heroApply:"體驗報名流程",heroVote:"探索人氣投票",
    heroFoot:"活動日期與辦法以正式核定公告為準。",
    posterNote:"品牌視覺示意 · 非場地實景照片",
    step1:"分享你的歌聲",step2:"支持喜愛的聲音",step3:"迎接舞台時刻",
    introOverline:"舞台背後的故事",introTitle:"不只歌唱，更是一場相遇。",
    introBody:"Golden Himal Voice 以音樂連結人與人，為奇旺的青年新聲打造溫暖、有質感的舞台。",
    introNote:"參賽條件、評選方式及活動日程將在確認後公告。",
    newsTitle:"每一個重要時刻，都在這裡。",newsLead:"活動準備、入圍名單與正式結果各自呈現。未確認資訊不提前公布。",
    filterAll:"全部公告",filterEvent:"活動消息",filterShortlist:"入圍名單",filterAward:"得獎公告",
    newsTag1:"籌備中",newsTag2:"待公布",newsTag3:"待公布",
    newsCard1Title:"一個新舞台，即將展開。",newsCard1Body:"活動目前正在籌備中，正式報名與參與方式確認後公布。",
    newsCard2Title:"下一個被聽見的聲音。",newsCard2Body:"正式入圍名單尚未公布。審核完成後才會公開資料。",
    newsCard3Title:"把掌聲留給閃耀的你。",newsCard3Body:"正式得獎結果待核定，人氣票數不一定等於最終名次。",
    registerTitle:"你的舞台，從這一步開始。",registerLead:"先用虛構資料體驗報名步驟，正式收件目前尚未開放。",
    regStep1:"填寫基本資料",regSub1:"這是預覽，請只使用虛構資料。",
    regStep2:"提供演唱作品連結",regSub2:"規劃以短影片作為初步審核素材。",
    regStep3:"確認資料與收件畫面",regSub3:"只示範操作，不會傳送或儲存。",
    demoWarning:"測試模式 — 不會正式報名、寄信或上傳檔案。",
    formTitle:"開始你的故事",formHint:"請按「帶入測試資料」，勿輸入真實個資。",
    fieldName:"參賽顯示名稱",fieldCity:"所在城市",fieldEmail:"電子郵件（測試用）",fieldLink:"作品連結（測試用）",
    fieldConsent:"我明白這只是使用虛構資料的介面試作，不是正式報名。",
    reviewButton:"確認測試資料 ↗",fillButton:"帶入測試資料",reviewTitle:"最後再確認一次。",
    reviewNote:"下一步只顯示完成畫面，資料不會離開瀏覽器。",
    submitButton:"完成模擬送出",editButton:"返回修改",successTitle:"測試流程完成。",
    successText:"示範編號：DEMO-001。沒有真正收件、儲存或寄發郵件。",againButton:"重新體驗",
    voteTitle:"為你喜愛的聲音，留下掌聲。",
    voteLead:"以下都是虛構選手。本頁不會收集真實票數、驗證身分或決定獎項。",
    portraitLabel:"選手照片預留區",candidate1:"示範選手 01",candidate2:"示範選手 02",candidate3:"示範選手 03",
    candidateBody:"正式核定的選手照片與演唱影片將在此展示。",
    sampleVotes:"示範票數",voteButton:"選擇",voteNote:"可模擬投一票；重新整理後清除。這不是真正的防刷票系統。",
    resetVotes:"重設示範票數",dialogTitle:"確認你的示範選擇",
    dialogDescription:"這張票只會在目前瀏覽器分頁增加數字。",
    dialogConfirm:"確認示範投票",dialogCancel:"取消",
    venueTitle:"不只有歌聲，還有相聚的溫度。",
    venueLead:"Golden Himal Palace · 尼泊爾奇旺。待核定後再補入場地實景照片。",
    venue1:"宴會廳照片待補",venue2:"表演舞台照片待補",venue3:"活動現場照片待補",
    footerNote:"設計預覽 · 未開放正式報名、投票或得獎公告。",
    voteChoice:"你選擇的是示範選手 ",voted:"已投給示範選手 ",demoOnly:" — 僅本頁有效。",
    reviewName:"顯示名稱",reviewCity:"城市",reviewEmail:"測試信箱",reviewLink:"測試連結",newsCount:"目前顯示公告數："
  }
};

Object.assign(translations.en,{
  navTrust:"Fair Voting",
  dialogStep1:"Verify voter identity",dialogStep1Note:"Official version: one-time code to a verified address.",
  dialogStep2:"Check voting eligibility",dialogStep2Note:"Official version: server blocks duplicate votes in the same round.",
  dialogStep3:"Count only valid votes",dialogStep3Note:"Official version: transactional database and audit logs.",
  sampleEmailLabel:"Example verified email — read-only test data",sampleCodeLabel:"Enter sample verification code: 246810",
  dialogDescription:"No email is sent. This is a mock verification only, and cannot protect real votes.",
  dialogConfirm:"Verify sample code & vote",verifyError:"Incorrect sample code. For this demo, enter 246810.",
  trustOverline:"FAIRNESS · PRIVACY · RESILIENCE",trustTitle:"A fairer stage. Built with care.",
  trustLead:"Security is more than a button: verified voters, protected counting, reviewable records and a recovery plan. These protections are in development—not yet active.",
  trustVerify:"Voter verification",trustVerifyBody:"Planned one-time verification. No automatic votes from anonymous clicks.",
  trustOne:"One eligible vote per round",trustOneBody:"Server checks duplicate submissions before a vote can count.",
  trustBot:"Automated abuse controls",trustBotBody:"Bot verification, rate limits and human review for unusual behavior.",
  trustBackups:"Backups and recovery",trustBackupsBody:"Independent exports, restoration drills and event-day fallback procedures.",
  trustPending:"PLANNED · NOT ACTIVE",trustPromise:"No real voting is open.",
  trustPromiseBody:"A privacy notice and voting rules will be available before registration or audience voting starts. Participation is not consent to marketing."
});
Object.assign(translations.ne,{
  navTrust:"निष्पक्ष मतदान",
  dialogStep1:"मतदाताको पहिचान पुष्टि",dialogStep1Note:"वास्तविक संस्करणमा प्रमाणित इमेलमा एकपटक प्रयोग हुने कोड पठाइनेछ।",
  dialogStep2:"मतदान योग्यता जाँच",dialogStep2Note:"एकै चरणमा दोहोरिएको मत सर्भरले अस्वीकार गर्नेछ।",
  dialogStep3:"मान्य मत मात्र गणना",dialogStep3Note:"लेनदेनमा आधारित डेटाबेस र लेखापरीक्षण रेकर्ड प्रयोग हुनेछ।",
  sampleEmailLabel:"नमुना प्रमाणित इमेल — परिवर्तन गर्न नमिल्ने",sampleCodeLabel:"नमुना पुष्टि कोड लेख्नुहोस्: 246810",
  dialogDescription:"कुनै इमेल पठाइँदैन। यो केवल अभ्यास हो, वास्तविक मतदान सुरक्षित गर्दैन।",
  dialogConfirm:"नमुना कोड जाँच र मत",verifyError:"नमुना कोड मिलेन। 246810 लेख्नुहोस्।",
  trustOverline:"निष्पक्षता · गोपनीयता · विश्वसनीयता",trustTitle:"निष्पक्ष मञ्च, जिम्मेवारीका साथ।",
  trustLead:"वास्तविक सुरक्षाका लागि पहिचान पुष्टि, सुरक्षित मतगणना, समीक्षा गर्न सकिने रेकर्ड र पुनर्स्थापनाको योजना चाहिन्छ। यी सुविधा अझै सक्रिय छैनन्।",
  trustVerify:"मतदाता प्रमाणीकरण",trustVerifyBody:"एकपटक प्रयोग हुने प्रमाणीकरण योजना। केवल क्लिकले मत गणना हुँदैन।",
  trustOne:"प्रति चरण एक योग्य मत",trustOneBody:"सर्भरले दोहोरो मत रोकेपछि मात्र गणना हुन्छ।",
  trustBot:"स्वचालित दुरुपयोग नियन्त्रण",trustBotBody:"बट जाँच, अनुरोध सीमा र असामान्य गतिविधिको मानव समीक्षा।",
  trustBackups:"ब्याकअप र पुनर्स्थापना",trustBackupsBody:"स्वतन्त्र निर्यात, पुनर्स्थापना अभ्यास र कार्यक्रम-दिनको वैकल्पिक प्रक्रिया।",
  trustPending:"योजनामा · सक्रिय छैन",trustPromise:"वास्तविक मतदान खुलेको छैन।",
  trustPromiseBody:"दर्ता वा मतदान सुरु हुनुअघि गोपनीयता नीति र नियम प्रकाशित हुनेछन्। सहभागी हुनु विज्ञापनको सहमति होइन।"
});
Object.assign(translations.zh,{
  navTrust:"公平投票",
  dialogStep1:"驗證投票者身分",dialogStep1Note:"正式版將寄送一次性驗證碼到經確認的信箱。",
  dialogStep2:"確認投票資格",dialogStep2Note:"伺服器拒絕同一輪的重複投票。",
  dialogStep3:"只計入有效票數",dialogStep3Note:"正式版使用交易型資料庫及稽核紀錄。",
  sampleEmailLabel:"已驗證信箱示例（唯讀測試資料）",sampleCodeLabel:"輸入示範驗證碼：246810",
  dialogDescription:"不會寄出 Email；此處只示範驗證流程，不能保護真實票數。",
  dialogConfirm:"驗證示範碼並投票",verifyError:"示範驗證碼錯誤，請輸入 246810。",
  trustOverline:"公平 · 隱私 · 系統可靠性",trustTitle:"讓每一份支持，都有公平的保障。",
  trustLead:"安全不只是按鈕：需要驗證身分、可靠計票、可稽核的紀錄與復原計畫。這些保護措施仍在開發，尚未啟用。",
  trustVerify:"投票資格驗證",trustVerifyBody:"規劃一次性驗證，不接受匿名點擊直接計票。",
  trustOne:"每輪有效投票限制",trustOneBody:"後端檢查重複提交，避免同一資格重複計票。",
  trustBot:"防機器人與異常監控",trustBotBody:"結合機器人驗證、限流及異常行為人工審查。",
  trustBackups:"備份與災難復原",trustBackupsBody:"獨立資料匯出、還原演練與活動當日應變方案。",
  trustPending:"規劃中 · 尚未啟用",trustPromise:"目前沒有開放真實投票。",
  trustPromiseBody:"正式開放前將公布隱私告知與票選規則。參與投票不代表同意接收行銷訊息。"
});

/* 2027 planning: localized, clearly labelled Draft 1; never infer public approval. */
Object.assign(translations.en,{
  seasonOverline:"2027 · PROPOSED SEASON / DRAFT 1",seasonTitle:"One season. Many voices.",
  seasonIntro:"A working proposal for three qualifying events and a year-end celebration. Dates, formats and rules are not official until approved.",
  seasonMarch:"March 2027",seasonJune:"June 2027",seasonSept:"September 2027",seasonDec:"December 2027",
  seasonQualify:"Proposed qualifier",seasonFinal:"Proposed annual finale",
  seasonDisclaimer:"WORKING DRAFT · This is not an invitation to apply or pay. Official terms and registration dates are pending organizer approval.",
  fieldCategory:"Category (sample)",chooseCategory:"Choose a category",universityCategory:"University students",communityCategory:"Open / community",
  fieldRound:"Qualifying round (sample)",chooseRound:"Choose a proposed round",
  paymentTitle:"Payment verification — planned",paymentBody:"The final application will include fee-payment verification. No payment or receipt upload is accepted in this design preview.",
  paymentWarning:"Do not send money or upload identity/payment documents using this preview.",
  reviewCategory:"Category",reviewRound:"Round"
});
Object.assign(translations.ne,{
  seasonOverline:"२०२७ · प्रस्तावित योजना / मस्यौदा १",seasonTitle:"एक वर्ष, धेरै स्वरहरू।",
  seasonIntro:"तीनवटा प्रारम्भिक चरण र वर्षको अन्त्यमा फाइनलको प्रस्ताव। आयोजकले स्वीकृत नगरेसम्म मिति वा नियम आधिकारिक होइनन्।",
  seasonMarch:"मार्च २०२७",seasonJune:"जुन २०२७",seasonSept:"सेप्टेम्बर २०२७",seasonDec:"डिसेम्बर २०२७",
  seasonQualify:"प्रस्तावित प्रारम्भिक चरण",seasonFinal:"प्रस्तावित वार्षिक फाइनल",
  seasonDisclaimer:"मस्यौदा मात्र · अहिले दर्ता वा भुक्तानी खुला छैन। आयोजकको स्वीकृतिपछि मात्र आधिकारिक सूचना जारी हुनेछ।",
  fieldCategory:"समूह (नमुना)",chooseCategory:"समूह छान्नुहोस्",universityCategory:"विश्वविद्यालय विद्यार्थी",communityCategory:"सामान्य / समुदाय",
  fieldRound:"प्रारम्भिक चरण (नमुना)",chooseRound:"प्रस्तावित चरण छान्नुहोस्",
  paymentTitle:"भुक्तानी प्रमाण जाँच — योजना मात्र",paymentBody:"औपचारिक दर्तामा शुल्क पुष्टि गर्ने प्रक्रिया हुनेछ। यस नमुना वेबसाइटले पैसा वा रसिद लिँदैन।",
  paymentWarning:"यस नमुना साइटमा पैसा नपठाउनुहोस् वा व्यक्तिगत/भुक्तानी कागजात अपलोड नगर्नुहोस्।",
  reviewCategory:"समूह",reviewRound:"चरण"
});
Object.assign(translations.zh,{
  seasonOverline:"2027年 · 賽季規劃草案 Draft 1",seasonTitle:"一整年的舞台，讓歌聲相遇。",
  seasonIntro:"規劃三場初賽與年底決賽。月份、辦法與參與資格仍待主辦單位確認，尚非正式公告。",
  seasonMarch:"2027年3月",seasonJune:"2027年6月",seasonSept:"2027年9月",seasonDec:"2027年12月",
  seasonQualify:"規劃中的初賽",seasonFinal:"規劃中的年度決賽",
  seasonDisclaimer:"討論草案 · 目前尚未開放報名或繳費。正式賽程及辦法須待主辦單位核定。",
  fieldCategory:"參賽組別（示範）",chooseCategory:"選擇組別",universityCategory:"大學組",communityCategory:"社會組",
  fieldRound:"初賽場次（示範）",chooseRound:"選擇規劃場次",
  paymentTitle:"報名費與繳費證明查核 — 規劃中",paymentBody:"正式流程將有繳費證明與人工核對，本頁不收款、不提供正式繳費證明上傳。",
  paymentWarning:"請勿透過此測試頁面匯款或上傳身分、繳費文件。",
  reviewCategory:"組別",reviewRound:"場次"
});

/* Isolated staging bridge: not a real registration form or vote API. */
Object.assign(translations.en,{
 dbTestBadge:"D1 STAGING CONNECTION · TEST ONLY",
 dbTestIntro:"Separately test D1 using one fixed fictional record. Your form fields, email and performance link are never transmitted.",
 dbTestHealth:"Check D1 connection",dbTestWrite:"Send fixed fictional record",
 dbTestInactive:"Demo is not connected yet. Check Cloudflare staging status first.",
 dbTestConnected:"D1 table connected. Synthetic writes remain disabled.",
 dbTestReady:"D1 table connected. You may send ONE fixed fictional record.",
 dbTestMissing:"D1 not connected or the test table is missing.",
 dbTestFailed:"Staging connection unavailable. No real data was sent.",
 dbTestSaved:"D1 confirmed test record: ",
 dbTestSaveFailed:"No test record was saved. See Cloudflare staging configuration."
});
Object.assign(translations.ne,{
 dbTestBadge:"D1 परीक्षण जडान · नमुना मात्र",
 dbTestIntro:"एक काल्पनिक रेकर्ड मात्र जाँचिन्छ। तपाईंको फारम, इमेल वा भिडियो लिंक पठाइँदैन।",
 dbTestHealth:"D1 जडान जाँच",dbTestWrite:"काल्पनिक रेकर्ड पठाउनुहोस्",
 dbTestInactive:"D1 जडान जाँच गर्न बाँकी छ।",dbTestConnected:"D1 जडान छ। नमुना लेख्ने सुविधा बन्द छ।",
 dbTestReady:"D1 तयार छ। एउटा काल्पनिक रेकर्ड पठाउन सकिन्छ।",
 dbTestMissing:"D1 जडान वा परीक्षण तालिका भेटिएन।",
 dbTestFailed:"परीक्षण जडान उपलब्ध छैन। वास्तविक डाटा पठाइएन।",
 dbTestSaved:"D1 ले नमुना रेकर्ड पुष्टि गर्‍यो: ",
 dbTestSaveFailed:"नमुना रेकर्ड सुरक्षित भएन। Cloudflare सेटिङ जाँच गर्नुहोस्।"
});
Object.assign(translations.zh,{
 dbTestBadge:"D1 測試資料庫連線 · 非正式報名",
 dbTestIntro:"獨立檢查 D1，只傳送一筆固定虛構資料。剛才表單內的姓名、Email 和影片連結都不會傳送。",
 dbTestHealth:"檢查 D1 連線",dbTestWrite:"寫入固定虛構測試資料",
 dbTestInactive:"尚未確認 D1 連線。請先檢查 Cloudflare 測試環境。",
 dbTestConnected:"D1 測試表已連線，但寫入功能仍關閉。",
 dbTestReady:"D1 測試表已連線，可寫入一筆固定虛構資料。",
 dbTestMissing:"D1 未連接，或測試資料表尚不存在。",
 dbTestFailed:"測試連線暫時不可用，沒有傳送真實資料。",
 dbTestSaved:"D1 已確認測試記錄：",
 dbTestSaveFailed:"沒有成功寫入測試資料，請查看 Cloudflare 測試設定。"
});
let language='en',currentFilter='all',voted=false,selected=null,dialogOpener=null;
const root=document.documentElement;
const qs=(s)=>document.querySelector(s);
const qsa=(s)=>Array.from(document.querySelectorAll(s));
const tr=(key)=>translations[language][key]||translations.en[key]||key;
function translate(){
  root.lang=language==='zh'?'zh-Hant':language;
  qsa('[data-i18n]').forEach(el=>{el.textContent=tr(el.dataset.i18n)});
  qsa('[data-lang]').forEach(button=>{const active=button.dataset.lang===language;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
  qs('#news-status').textContent=tr('newsCount')+qsa('.news-card:not([hidden])').length;
  if(!voted) qs('#vote-status').textContent=tr('voteNote');
}
qsa('[data-lang]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.lang;translate()}));
function filterNews(category){
  currentFilter=category;
  qsa('.news-card').forEach(card=>{card.hidden=category!=='all'&&card.dataset.category!==category});
  qsa('[data-filter]').forEach(button=>{const active=button.dataset.filter===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
  qs('#news-status').textContent=tr('newsCount')+qsa('.news-card:not([hidden])').length;
}
qsa('[data-filter]').forEach(button=>button.addEventListener('click',()=>filterNews(button.dataset.filter)));
const form=qs('#registration-form'),review=qs('#review-panel'),success=qs('#success-panel');
const fields=()=>Object.fromEntries(new FormData(form).entries());
qs('#sample-fill').addEventListener('click',()=>{
  form.elements.stageName.value='Demo Singer';
  form.elements.city.value='Chitwan';
  form.elements.category.value='university';
  form.elements.round.value='mar2027';
  form.elements.email.value='demo@example.com';
  form.elements.performance.value='https://example.com/demo';
  form.elements.consent.checked=true;
  form.querySelector('button[type=submit]').focus();
});
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const data=fields();
  if(!data.stageName.trim()||!data.city.trim())return;
  const summaries=[['reviewName',data.stageName],['reviewCity',data.city],['reviewCategory',data.category],['reviewRound',data.round],['reviewEmail',data.email],['reviewLink',data.performance]];
  qs('#review-copy').textContent=summaries.map(([label,value])=>tr(label)+': '+value).join('  |  ');
  form.hidden=true;success.hidden=true;review.hidden=false;review.focus();
});
qs('#sample-edit').addEventListener('click',()=>{review.hidden=true;form.hidden=false;form.elements.stageName.focus()});
qs('#sample-submit').addEventListener('click',()=>{
  review.hidden=true;success.hidden=false;form.reset();qs('#review-copy').textContent='';success.focus();
});
qs('#sample-again').addEventListener('click',()=>{success.hidden=true;form.hidden=false;qs('#sample-fill').focus()});

const d1Health=qs('#d1-health-check'), d1Send=qs('#d1-send-test'),d1Status=qs('#d1-staging-status');
d1Health.addEventListener('click',async()=>{
  d1Health.disabled=true;
  d1Send.disabled=true;
  d1Status.textContent=tr('dbTestInactive');
  try{
    const response=await fetch('/api/staging/health',{method:'GET',cache:'no-store'});
    if(!response.ok)throw new Error('health_unavailable');
    const data=await response.json();
    if(!data.ok||!data.testOnly||!data.tableReady){
      d1Status.textContent=tr('dbTestMissing');
      return;
    }
    d1Send.disabled=data.canWrite!==true;
    d1Status.textContent=tr(data.canWrite===true?'dbTestReady':'dbTestConnected');
  }catch{
    d1Status.textContent=tr('dbTestFailed');
  }finally{d1Health.disabled=false}
});
d1Send.addEventListener('click',async()=>{
  if(d1Send.disabled)return;
  d1Send.disabled=true;
  try{
    // Deliberately NEVER include form values: no participant PII leaves this preview.
    const response=await fetch('/api/staging/registration-test',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sample:'TEST-SINGER-API-001'})
    });
    if(!response.ok)throw new Error('write_failed');
    const data=await response.json();
    if(!data.ok||!data.testOnly||data.stored?.display_name!=='TEST-SINGER-API-001')
      throw new Error('bad_response');
    d1Status.textContent=tr('dbTestSaved')+data.stored.display_name+
      ' · #'+data.stored.id+' · '+data.stored.status;
  }catch{
    d1Status.textContent=tr('dbTestSaveFailed');
  }
});

const dialog=qs('#vote-dialog');
qsa('[data-vote]').forEach(button=>button.addEventListener('click',()=>{
  if(voted)return;
  selected=button.dataset.vote;dialogOpener=button;
  qs('#vote-dialog-choice').textContent=tr('voteChoice')+selected+'.';
  qs('#voter-demo-code').value='';
  qs('#voter-demo-error').hidden=true;
  if(typeof dialog.showModal==='function')dialog.showModal();
  qs('#voter-demo-code').focus();
}));
qs('#cancel-vote').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{selected=null;if(dialogOpener)dialogOpener.focus()});
qs('#confirm-vote').addEventListener('click',()=>{
  if(voted||!selected)return;
  // UI-only exercise. The real system MUST verify a server-issued code.
  const entered=qs('#voter-demo-code').value.trim();
  if(entered!=='246810'){
    const error=qs('#voter-demo-error');
    error.textContent=tr('verifyError');
    error.hidden=false;
    qs('#voter-demo-code').focus();
    return;
  }
  qs('#voter-demo-error').hidden=true;
  const chosen=selected;
  voted=true;qs('#vote-count-'+chosen).textContent='1';
  qs('#vote-status').textContent=tr('voted')+chosen+tr('demoOnly');
  qsa('[data-vote]').forEach(button=>{button.disabled=true});
  dialog.close();
});
qs('#reset-votes').addEventListener('click',()=>{
  voted=false;selected=null;
  qsa('[data-vote]').forEach(button=>{button.disabled=false;qs('#vote-count-'+button.dataset.vote).textContent='0'});
  qs('#vote-status').textContent=tr('voteNote');
});
translate();
