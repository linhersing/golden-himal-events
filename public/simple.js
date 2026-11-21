/* Minimal public front + authenticated invited staging screens. No fake payment or session. */
(()=>{'use strict';
const $=id=>document.getElementById(id),page=document.body.dataset.page;
const translations={
en:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'Every voice deserves a stage.',subline:'A place for music, talent and connection. Your journey begins here.',apply:'Join the competition',applySub:'Create your singing entry',login:'Member login',loginSub:'View your entry and performance',news:'Latest news',newsSub:'Updates and official results',preview:'Preview stage · Official paid registration is not open',back:'Staff login',myHome:'My singer home',myHomeSub:'Review my entry and progress',startEntry:'Start my entry',startEntrySub:'Complete the application',memberArea:'My member area',memberAreaSub:'Continue where I left off'},
ne:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'हरेक आवाजको आफ्नै मञ्च हुन्छ।',subline:'संगीत, प्रतिभा र सम्बन्धको लागि नयाँ मञ्च। यहाँबाट सुरु गर्नुहोस्।',apply:'प्रतियोगितामा सहभागी हुनुहोस्',applySub:'आवेदन सुरु गर्नुहोस्',login:'सदस्य लगइन',loginSub:'आफ्नो आवेदन हेर्नुहोस्',news:'नयाँ सूचना',newsSub:'समाचार र नतिजा',preview:'पूर्वावलोकन · वास्तविक शुल्कसहित दर्ता खुलेको छैन',back:'कर्मचारी लगइन',myHome:'मेरो प्रतियोगी पृष्ठ',myHomeSub:'मेरो विवरण र स्थिति हेर्नुहोस्',startEntry:'आवेदन सुरु गर्नुहोस्',startEntrySub:'प्रतियोगी विवरण भर्नुहोस्',memberArea:'मेरो सदस्य पृष्ठ',memberAreaSub:'मेरो आवेदन हेर्नुहोस्'},
zh:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'你的聲音，值得被聽見。',subline:'一個為歌聲而生的舞台。從這裡，開啟你的旅程。',apply:'我要報名',applySub:'開始建立我的參賽資料',login:'會員登入',loginSub:'查看我的報名與作品',news:'最新公告',newsSub:'賽事消息與公布資訊',preview:'網站預覽階段｜正式收費報名尚未開放',back:'工作人員入口',myHome:'我的參賽首頁',myHomeSub:'查看報名資料與進度',startEntry:'開始報名',startEntrySub:'填寫我的參賽資料',memberArea:'我的會員專區',memberAreaSub:'繼續查看自己的資料'}};
Object.assign(translations.en,{organizerLabel:'Organized by',organizerValue:'Golden Himal Palace',partnersLabel:'Co-organizers',partnersValue:'Synergy FM, Kalika FM; other partners to be announced',missionTitle:'Our purpose',missionDescription:'Support music development in Nepal and raise singing standards through musical exchange and performances, promoting health, joy, peace and happiness.',testNotice:'TEST PREVIEW ONLY. Official registration and real payments are not open.'});
Object.assign(translations.ne,{organizerLabel:'आयोजक',organizerValue:'Golden Himal Palace',partnersLabel:'सहआयोजक',partnersValue:'Synergy FM, Kalika FM; अन्य साझेदार पछि घोषणा गरिनेछन्',missionTitle:'उद्देश्य',missionDescription:'संगीत आदानप्रदान र मञ्चीय प्रस्तुतिमार्फत नेपालको संगीत विकास र गायन स्तर उकास्दै स्वास्थ्य, आनन्द, शान्ति र खुशी प्रवर्द्धन गर्नु।',testNotice:'यो परीक्षण वेबसाइट मात्र हो। आधिकारिक दर्ता र वास्तविक भुक्तानी खुला छैन।'});
Object.assign(translations.zh,{organizerLabel:'主辦單位',organizerValue:'Golden Himal Palace',partnersLabel:'協辦單位',partnersValue:'Synergy FM、Kalika FM；其他合作單位陸續公告',missionTitle:'活動宗旨',missionDescription:'帶動尼泊爾音樂發展，提升歌唱水平，透過歌唱交流與舞台演出，促進人民健康、歡樂、平安與幸福。',testNotice:'本網站僅供系統測試，尚未開放正式報名或真實付款。'});

Object.assign(translations.en,{rewardsEyebrow:"2027 · Awards",rewardsTitle:"A stage for every voice.",rewardsTop:"Each category: 1 first prize NPR 45,000; 3 second prizes of NPR 22,000 each; 5 third prizes of NPR 11,000 each.",rewardsStatus:"2027 contest rules preview only. Official registration, payments and voucher redemption are not yet open.",rewardsLink:"Explore awards and judging ↗"});
Object.assign(translations.ne,{rewardsEyebrow:"२०२७ · पुरस्कार",rewardsTitle:"हरेक स्वरलाई आफ्नै मञ्च।",rewardsTop:"प्रत्येक समूहमा पहिलो पुरस्कार १ जनालाई NPR 45,000, दोस्रो ३ जनालाई जनही NPR 22,000 र तेस्रो ५ जनालाई जनही NPR 11,000।",rewardsStatus:"२०२७ को नियमसम्बन्धी प्रारम्भिक जानकारी मात्र। आधिकारिक दर्ता, शुल्क भुक्तानी वा कुपन वितरण खुलेको छैन।",rewardsLink:"पुरस्कार र मूल्याङ्कन नियम हेर्नुहोस् ↗"});
Object.assign(translations.zh,{rewardsEyebrow:"2027 · 比賽獎項",rewardsTitle:"讓努力被看見，讓歌聲有舞台。",rewardsTop:"大學組、社會組各設第一名 1 位 NPR 45,000、第二名 3 位各 NPR 22,000、第三名 5 位各 NPR 11,000。",rewardsStatus:"以上為 2027 年度比賽辦法資訊；正式報名、付款及領券尚未開放。",rewardsLink:"查看獎項與評選規則 ↗"});

/* Public Golden Himal Palace contact translations: approved number only. */
Object.assign(translations.zh,{"contactHeading":"有問題需要聯絡我們？","contactIntro":"歌唱比賽、參賽規則或活動相關問題，可撥打 Golden Himal Palace 官方洽詢電話。","contactCall":"撥打電話","contactNote":"尼泊爾電話；通話費用依電信業者規定。","contactShortcut":"對比賽有疑問？聯絡我們 →"});
Object.assign(translations.en,{"contactHeading":"Questions about the contest?","contactIntro":"For competition, entry or event questions, call the official Golden Himal Palace inquiry number.","contactCall":"Call now","contactNote":"Nepal mobile number; carrier charges may apply.","contactShortcut":"Questions? Contact us →"});
Object.assign(translations.ne,{"contactHeading":"प्रतियोगिताबारे प्रश्न छ?","contactIntro":"प्रतियोगिता, सहभागी हुने नियम वा कार्यक्रमबारे प्रश्न भए Golden Himal Palace को आधिकारिक सम्पर्क नम्बरमा फोन गर्नुहोस्।","contactCall":"फोन गर्नुहोस्","contactNote":"यो नेपालको मोबाइल नम्बर हो; सेवा प्रदायकको शुल्क लाग्न सक्छ।","contactShortcut":"प्रश्न छ? सम्पर्क गर्नुहोस् →"});



/* 2026-11-17 prize labels for four responsive award cards. */
Object.assign(translations.en,{rewardFirst:'First prize · 1 winner',rewardSecond:'Second prize · 3 winners, each',rewardThird:'Third prize · 5 winners, each',rewardFinalist:'Finalists · 10 singers, each'});
Object.assign(translations.ne,{rewardFirst:'प्रथम पुरस्कार · १ जना',rewardSecond:'दोस्रो पुरस्कार · ३ जना, प्रत्येक',rewardThird:'तेस्रो पुरस्कार · ५ जना, प्रत्येक',rewardFinalist:'फाइनलमा छानिएका १० जना, प्रत्येक'});
Object.assign(translations.zh,{rewardFirst:'第一名 · 1位',rewardSecond:'第二名 · 3位，各得',rewardThird:'第三名 · 5位，各得',rewardFinalist:'決賽入圍 · 10位，各得'});

/* Audience copy: separate rules from updates; talent discovery is an aim, not a training/employment guarantee. */
Object.assign(translations.zh,{"headline":"下一位歌唱新星，會是你嗎？","talentLead":"不只是一場比賽，更希望發掘有潛力的歌手與社群創作者，讓好聲音被更多人聽見。","news":"比賽規則","newsSub":"報名前必讀｜資格、影片與獎項","announcementsShortcut":"最新公告・入選與賽事通知 →"});
Object.assign(translations.en,{"headline":"Could you be the next singing star?","talentLead":"More than a contest, Golden Himal Voice aims to discover promising singers and digital creators, giving talented voices a chance to be heard.","news":"Contest rules","newsSub":"Read before entering · Eligibility, video & prizes","announcementsShortcut":"Latest updates · Selections & event notices →"});
Object.assign(translations.ne,{"headline":"अर्को उदीयमान गायक तपाईं नै हो?","talentLead":"यो केवल प्रतियोगिता होइन। नयाँ गायक र डिजिटल सिर्जनशील प्रतिभा पहिचान गरी उनीहरूको आवाज धेरैसम्म पुर्‍याउने हाम्रो उद्देश्य हो।","news":"प्रतियोगिता नियम","newsSub":"भाग लिनुअघि पढ्नुहोस् · योग्यता र पुरस्कार","announcementsShortcut":"नयाँ सूचना · छनोट र कार्यक्रम →"});

/* 2026-11-16 frontline Word rules: latest authoritative contest copy; TEST functions remain gated. */
Object.assign(translations.zh,{"entryFeeLabel":"2027年1月線上海選","entryFeeAmount":"免費","entryFeeNote":"每人最多5支60–90秒Demo；2月12日第一次初選免費，3月5日第二次初選每人 NPR 300，3月12日晉級PK每人 NPR 500。","entryFeeStatus":"目前僅供測試；正式報名、多支影片送出與收款尚未開放。","rewardsTop":"單一組別：第一名1位 NPR 50,000、第二名3位各 NPR 30,000、第三名5位各 NPR 15,000；總決賽10名選手另各得入圍獎金 NPR 20,000。",});
Object.assign(translations.en,{"entryFeeLabel":"January 2027 online audition","entryFeeAmount":"FREE","entryFeeNote":"Up to five 60–90-second Demos per person. First selection on Feb 12 is free; second selection on Mar 5 is NPR 300 per person; Mar 12 PK round is NPR 500 per person.","entryFeeStatus":"TEST preview only. Official registration, multi-video submission and real payments are not open.","rewardsTop":"One division: first prize NPR 50,000 (1 winner); second prize NPR 30,000 each (3); third prize NPR 15,000 each (5). Ten finalists also receive NPR 20,000 each.",});
Object.assign(translations.ne,{"entryFeeLabel":"जनवरी २०२७ अनलाइन प्रारम्भिक छनोट","entryFeeAmount":"निःशुल्क","entryFeeNote":"प्रति व्यक्ति ६०–९० सेकेन्डका बढीमा ५ डेमो। फेब्रुअरी १२ को पहिलो छनोट निःशुल्क; मार्च ५ को दोस्रो छनोट प्रति व्यक्ति NPR 300; मार्च १२ को PK चरण प्रति व्यक्ति NPR 500।","entryFeeStatus":"परीक्षण वेबसाइट मात्र। आधिकारिक दर्ता, धेरै भिडियो पठाउने सुविधा र वास्तविक भुक्तानी खुलेका छैनन्।","rewardsTop":"एउटै समूह: पहिलो पुरस्कार १ जनालाई NPR 50,000; दोस्रो ३ जनालाई जनही NPR 30,000; तेस्रो ५ जनालाई जनही NPR 15,000। १० फाइनलिस्टलाई थप जनही NPR 20,000।",});

/* 2026-11-17 award clarification: top 9 are within the SAME 10 finalists. */
Object.assign(translations.zh,{"rewardsTop":"4月14日總決賽共有10位選手，10位皆獲入圍獎金 NPR 20,000（合計 NPR 200,000）；同一批10人再依成績統一排名，前9名另獲名次獎金：第一名1位 NPR 50,000、第二名3位各 NPR 30,000、第三名5位各 NPR 15,000（合計 NPR 215,000）。全場現金獎金總計 NPR 415,000。","rewardFinalist":"決賽10位選手 · 人人獲入圍獎"});
Object.assign(translations.en,{"rewardsTop":"All 10 contestants in the April 14 final receive a finalist cash award of NPR 20,000 each (NPR 200,000 total). The same 10 finalists are then ranked together: the top 9 also receive ranking prizes—1 first-place award of NPR 50,000, 3 second-place awards of NPR 30,000 each, and 5 third-place awards of NPR 15,000 each (NPR 215,000 total). Total cash awards: NPR 415,000.","rewardFinalist":"All 10 finalists · each receives"});
Object.assign(translations.ne,{"rewardsTop":"अप्रिल १४ को फाइनलमा पुग्ने १० जनाले जनही NPR 20,000 फाइनलिस्ट नगद पुरस्कार पाउँछन् (जम्मा NPR 200,000)। तिनै १० जनालाई फाइनलको नतिजाअनुसार एउटै समूहमा क्रमबद्ध गरिन्छ; शीर्ष ९ जनाले थप स्थान पुरस्कार पाउँछन्: पहिलो स्थान १ जनालाई NPR 50,000, दोस्रो स्थान ३ जनालाई जनही NPR 30,000 र तेस्रो स्थान ५ जनालाई जनही NPR 15,000 (स्थान पुरस्कार जम्मा NPR 215,000)। कुल नगद पुरस्कार NPR 415,000।","rewardFinalist":"फाइनलका सबै १० जना · प्रत्येकलाई"});

/* 2026-11-17 public five-stage schedule. Display-only; undecided scoring and billing stay private. */
Object.assign(translations.zh,{"journeyStatus":"目前為網站預覽測試階段，正式報名尚未開放。","journeyEyebrow":"2027 · 5 個賽事階段","journeyHeading":"從報名到決賽，5 步看懂","journeyLead":"1月上傳演唱影片、2月及3月參加分區選拔、4月由10位決賽選手登台。","journeyRegionTitle":"分區說明","journeyRegionA":"A 區｜Lumbini（藍毗尼）","journeyRegionB":"B 區｜Bagmati（巴格馬蒂）","journeyRegionNote":"只有一個競賽組別。A、B 是現場參賽地區，不是兩種選手組別；其他地區符合資格者也可選擇一區。","journeyDate1":"1月1日－31日","journeyChannel1":"線上進行","journeyTitle1":"線上海選","journeyDesc1":"提交演唱影片，每人最多5支，每支60–90秒；由專業評審評選。","journeyDate2":"2月12日","journeyChannel2":"A、B 兩區分別進行","journeyTitle2":"第一次初選","journeyDesc2":"海選入選者回到自己選定的地區，現場個人演唱，由專業評審評選。","journeyDate3":"3月5日","journeyChannel3":"A、B 兩區分別進行","journeyTitle3":"第二次初選","journeyDesc3":"獲選者可個人或組隊現場演唱，由專業評審選出晉級者。","journeyDate4":"3月12日","journeyChannel4":"A、B 兩區分別進行","journeyTitle4":"晉級賽","journeyDesc4":"各區選出5位優勝者，合計10位選手進入總決賽。","journeyDate5":"4月14日","journeyChannel5":"Golden Himal Palace","journeyTitle5":"季度總決賽","journeyDesc5":"兩區10強同台競賽，最終成績由官網有效投票51%與專業評審49%組成；社群按讚不計入正式票數。","journeyTraining":"3月中旬起規劃自願參加的賽前音樂培訓，不是另一場淘汰賽；不參加也保留總決賽資格。","journeyNotice":"以上為2027年預定賽程；確切時間、地點與名額依主辦單位公告。所有日期及時間以尼泊爾當地時間為準。","journeyDetails":"查看詳細參賽規則 →"});
Object.assign(translations.en,{"journeyStatus":"TEST preview only. Official registration is not yet open.","journeyEyebrow":"2027 · 5 competition stages","journeyHeading":"Your journey to the final, in 5 steps","journeyLead":"Submit a video in January, compete in your selected area in February and March, and watch 10 finalists perform in April.","journeyRegionTitle":"Competition areas","journeyRegionA":"Area A · Lumbini","journeyRegionB":"Area B · Bagmati","journeyRegionNote":"There is only one competition division. A and B are in-person competition areas, not separate singer categories. Eligible entrants from other provinces may choose either area.","journeyDate1":"Jan 1–31","journeyChannel1":"Online","journeyTitle1":"Online audition","journeyDesc1":"Submit up to 5 singing videos per person, 60–90 seconds each. Professional judges review them.","journeyDate2":"Feb 12","journeyChannel2":"Held separately in Areas A & B","journeyTitle2":"First selection","journeyDesc2":"Selected singers perform individually in their chosen area before professional judges.","journeyDate3":"Mar 5","journeyChannel3":"Held separately in Areas A & B","journeyTitle3":"Second selection","journeyDesc3":"Qualified singers may perform solo or in a team. Professional judges select those who advance.","journeyDate4":"Mar 12","journeyChannel4":"Held separately in Areas A & B","journeyTitle4":"Advancement round","journeyDesc4":"Five singers advance from each area, making 10 finalists in total.","journeyDate5":"Apr 14","journeyChannel5":"Golden Himal Palace","journeyTitle5":"Quarterly grand final","journeyDesc5":"Ten finalists compete in person. Valid votes on the official website count for 51% and professional judges for 49%; social-media likes are not official votes.","journeyTraining":"Optional music training is planned from mid-March. It is not another elimination round; finalists keep their place even if they do not attend.","journeyNotice":"These are planned 2027 dates. Exact times, venues and quotas will be confirmed by the organizer. All times are in Nepal local time.","journeyDetails":"Read the full competition rules →"});
Object.assign(translations.ne,{"journeyStatus":"यो परीक्षण वेबसाइट हो। आधिकारिक दर्ता अझै खुलेको छैन।","journeyEyebrow":"२०२७ · प्रतियोगिताका ५ चरण","journeyHeading":"दर्तादेखि फाइनलसम्म: ५ सजिला चरण","journeyLead":"जनवरीमा गायन भिडियो पठाउनुहोस्, फेब्रुअरी–मार्चमा क्षेत्रीय छनोट, अप्रिलमा १० जनाको फाइनल।","journeyRegionTitle":"प्रतियोगिता क्षेत्र","journeyRegionA":"क्षेत्र A · लुम्बिनी (Lumbini)","journeyRegionB":"क्षेत्र B · बागमती (Bagmati)","journeyRegionNote":"प्रतियोगिता समूह एउटै हो। A र B फरक गायन समूह होइनन्, प्रत्यक्ष प्रतिस्पर्धा हुने क्षेत्र मात्र हुन्। अन्य प्रदेशका योग्य व्यक्तिले पनि एउटा क्षेत्र रोज्न सक्छन्।","journeyDate1":"जनवरी १–३१","journeyChannel1":"अनलाइन","journeyTitle1":"अनलाइन अडिसन","journeyDesc1":"प्रति व्यक्ति बढीमा ५ गायन भिडियो, प्रत्येक ६०–९० सेकेन्ड। पेशेवर निर्णायकले मूल्याङ्कन गर्छन्।","journeyDate2":"फेब्रुअरी १२","journeyChannel2":"A र B क्षेत्रमा छुट्टाछुट्टै","journeyTitle2":"पहिलो छनोट","journeyDesc2":"छानिएका गायकले आफूले रोजेको क्षेत्रमा एकल प्रस्तुति दिन्छन्। पेशेवर निर्णायकले मूल्याङ्कन गर्छन्।","journeyDate3":"मार्च ५","journeyChannel3":"A र B क्षेत्रमा छुट्टाछुट्टै","journeyTitle3":"दोस्रो छनोट","journeyDesc3":"छानिएका गायकले एकल वा टोलीमा प्रस्तुति दिन सक्छन्। निर्णायकले अर्को चरणका लागि छान्छन्।","journeyDate4":"मार्च १२","journeyChannel4":"A र B क्षेत्रमा छुट्टाछुट्टै","journeyTitle4":"अर्को चरणको छनोट","journeyDesc4":"प्रत्येक क्षेत्रबाट ५ जना छानिन्छन्। कुल १० जना फाइनलमा पुग्छन्।","journeyDate5":"अप्रिल १४","journeyChannel5":"Golden Himal Palace","journeyTitle5":"त्रैमासिक ग्रान्ड फाइनल","journeyDesc5":"१० फाइनलिस्टले प्रत्यक्ष प्रस्तुति दिन्छन्। आधिकारिक वेबसाइटको मान्य मत ५१% र पेशेवर निर्णायकको अंक ४९% हुन्छ। सामाजिक सञ्जालका लाइक आधिकारिक मत होइनन्।","journeyTraining":"मार्चको मध्यदेखि स्वेच्छिक संगीत प्रशिक्षण योजना छ। यो अर्को छनोट होइन; सहभागी नभए पनि फाइनलको योग्यता कायम रहन्छ।","journeyNotice":"यी २०२७ का प्रस्तावित मिति हुन्। अन्तिम समय, स्थान र संख्या आयोजकले घोषणा गर्नेछ। सबै समय नेपालको स्थानीय समयअनुसार हुनेछ।","journeyDetails":"सम्पूर्ण प्रतियोगिता नियम हेर्नुहोस् →"});


/* 2026-11-18 Muse/Alan public policy: no entry-fee or payment copy in UI.
 * Internal stage amounts are retained in backend payment-readiness only.
 */
Object.assign(translations.zh,{
 preview:'網站預覽測試｜正式報名尚未開放',
 testNotice:'本網站僅供系統測試，尚未開放正式報名。',
 rewardsStatus:'以上為2027年預定賽事資訊；正式報名與餐券核發尚未開放。',
 entryFeeLabel:'海選影片與報名',entryFeeAmount:'準備參賽',
 entryFeeNote:'每人最多5支60–90秒的Demo影片，請確認影片及資格要求。',
 entryFeeStatus:'目前為測試階段，正式報名尚未開放。'
});
Object.assign(translations.en,{
 preview:'Website preview · Official registration is not yet open',
 testNotice:'TEST PREVIEW ONLY. Official registration is not yet open.',
 rewardsStatus:'2027 competition information; official entry and voucher issuance are not yet open.',
 entryFeeLabel:'Audition preparation',entryFeeAmount:'Apply online',
 entryFeeNote:'Up to five 60–90 second Demo videos per entrant. Review the video and eligibility requirements.',
 entryFeeStatus:'TEST preview only. Official registration is not open.'
});
Object.assign(translations.ne,{
 preview:'पूर्वावलोकन वेबसाइट · आधिकारिक दर्ता अझै खुलेको छैन',
 testNotice:'यो परीक्षण वेबसाइट मात्र हो। आधिकारिक दर्ता अझै खुलेको छैन।',
 rewardsStatus:'२०२७ को प्रतियोगितासम्बन्धी जानकारी। आधिकारिक दर्ता र कुपन वितरण खुला छैन।',
 entryFeeLabel:'अडिसनका लागि तयारी',entryFeeAmount:'अनलाइन आवेदन',
 entryFeeNote:'प्रति व्यक्ति बढीमा पाँच ६०–९० सेकेन्डका डेमो। भिडियो र योग्यता नियम जाँच्नुहोस्।',
 entryFeeStatus:'परीक्षण वेबसाइट मात्र। आधिकारिक दर्ता खुलेको छैन।'
});
if(page==='home'){
 let lang='zh',homeState='anonymous';
 try{const stored=localStorage.getItem('ghv_ui_language_v1');if(translations[stored])lang=stored}catch{}
 const applyHomeState=()=>{
  const first=document.getElementById('home-apply'),second=document.getElementById('home-login');
  if(!first||!second)return;
  const text=translations[lang],applyText=first.querySelector('strong'),applySub=first.querySelector('small'),
   loginText=second.querySelector('strong'),loginSub=second.querySelector('small');
  if(homeState==='entry'){
   applyText.textContent=text.myHome;applySub.textContent=text.myHomeSub;
   second.hidden=true; // Keep the unchanged login URL in DOM without a redundant second choice.
  }else if(homeState==='member'){
   applyText.textContent=text.startEntry;applySub.textContent=text.startEntrySub;
   loginText.textContent=text.memberArea;loginSub.textContent=text.memberAreaSub;
   second.hidden=false;
  }else second.hidden=false;
 };
 const apply=()=>{
  document.documentElement.lang=lang==='zh'?'zh-Hant':lang;
  document.querySelectorAll('[data-t]').forEach(el=>{const x=translations[lang][el.dataset.t];if(x)el.textContent=x});
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
  applyHomeState();
 };
 document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{
  lang=b.dataset.lang;try{localStorage.setItem('ghv_ui_language_v1',lang)}catch{}apply()
 }));
 apply();
 // Read the HttpOnly server session; never infer a member account from localStorage.
 (async()=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch('/api/e2e/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!response.ok)return;
   const data=await response.json();
   if(data.ok!==true||data.account?.role!=='member')return; // Never switch staff roles here.
   homeState='member';applyHomeState();
   const appsResponse=await fetch('/api/e2e/applications',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!appsResponse.ok)return;
   const apps=await appsResponse.json();
   if(apps.ok===true&&Array.isArray(apps.applications)&&apps.applications.length)homeState='entry';
   applyHomeState();
  }catch{}finally{clearTimeout(timeout)}
 })();
 return;
}
if(page==='news'){setupRuleNavigation();return;}
if(page==='announcements')return;
const node=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined&&txt!==null)x.textContent=String(txt);if(cls)x.className=cls;return x};
const safeLink=(url)=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:null}catch{return null}};
const formValues=form=>Object.fromEntries(new FormData(form));
const mt=k=>window.GHVLocale?.t(k)||k;
const EXTRA_LANGUAGE_OPTIONS=[
 ['Tharu','Tharu'],['Nepal Bhasa','Nepal Bhasa (Newari)'],['Awadhi','Awadhi'],
 ['Gurung','Gurung'],['Magar','Magar'],['Limbu','Limbu'],['Urdu','Urdu'],
 ['Sanskrit','Sanskrit'],['Tibetan','Tibetan']
];
function enhanceLanguageSelect(select){
 if(!select)return;
 if(select._customLanguageInput)return;
 const other=[...select.options].find(o=>o.value==='Other');
 if(!other)return;
 for(const [value,label] of EXTRA_LANGUAGE_OPTIONS){
  if([...select.options].some(o=>o.value===value))continue;
  const option=node('option',label);option.value=value;select.insertBefore(option,other);
 }
 const custom=node('input',undefined,'song-language-other');
 custom.type='text';custom.maxLength=60;custom.minLength=2;custom.autocomplete='off';
 custom.dataset.lPlaceholder='songLangOtherPlaceholder';
 custom.placeholder=mt('songLangOtherPlaceholder');
 custom.setAttribute('aria-label',mt('songLangOtherLabel'));
 custom.hidden=true;custom.disabled=true;
 select.insertAdjacentElement('afterend',custom);select._customLanguageInput=custom;
 const sync=()=>{
  const active=select.value==='Other';
  custom.hidden=!active;custom.disabled=!active;custom.required=active&&!select.disabled;
 };
 select.addEventListener('change',sync);
 select._syncOtherLanguage=sync;
 sync();
}
function prepareLanguageSelects(root){
 root.querySelectorAll('select[name="song_language"],select[name^="demo_"][name$="_language"]').forEach(enhanceLanguageSelect);
}
function selectSongLanguage(select,saved){
 enhanceLanguageSelect(select);
 const name=String(saved||'').trim();
 if(name&&name!=='Other'&&![...select.options].some(x=>x.value===name)){
  select.value='Other';
  if(select._customLanguageInput)select._customLanguageInput.value=name;
 }else{
  select.value=name;
  if(select._customLanguageInput)select._customLanguageInput.value='';
 }
 select._syncOtherLanguage?.();
}
function songLanguageValue(select){
 if(!select)return '';
 return (select.value==='Other'
  ?select._customLanguageInput?.value||''
  :select.value||'').trim();
}

const staff=page==='back',prefix=staff?'back':'member';
let busy=false,challenge=null,role=staff?'organizer':'member',account=null,profileEnabled=false,frontlineFormEnabled=false,museFormEnabled=false,fiveDemoEnabled=false,fiveDemoJanuaryOnly=false,eligibilityUploadEnabled=false;
let staffJudgingPolicy={mode:'final_only'};
const statusBox=$(prefix+'-status');
let staffSessionDeadline=0,staffSessionTimer=null;
function resetStaffSessionTimer(){
 if(staffSessionTimer!==null){clearInterval(staffSessionTimer);staffSessionTimer=null;}
 staffSessionDeadline=0;
 if(staff)$('staff-session-warning').hidden=true;
}
function updateStaffSessionReminder(){
 if(!staff||!account||!staffSessionDeadline)return;
 const seconds=Math.ceil((staffSessionDeadline-Date.now())/1000);
 if(seconds<=0){expireStaffSession();return;}
 const warning=$('staff-session-warning');
 warning.hidden=seconds>600;
 if(!warning.hidden){
  const minutes=Math.max(1,Math.ceil(seconds/60));
  const template='目前登入約剩 {minutes} 分鐘。請先儲存評分或完成操作；逾時後需重新使用 Email 驗證碼登入。';
  $('staff-session-warning-text').textContent=(window.GHVStaffLocale?.(template)||template).replace('{minutes}',String(minutes));
 }
}
function trackStaffSession(session){
 if(!staff)return;
 resetStaffSessionTimer();
 const seconds=Number(session?.session_expires_in_seconds);
 if(!Number.isFinite(seconds)||seconds<=0)return;
 staffSessionDeadline=Date.now()+seconds*1000;
 $('staff-session-expired').hidden=true;
 updateStaffSessionReminder();
 staffSessionTimer=setInterval(updateStaffSessionReminder,30000);
}
function expireStaffSession(){
 if(!staff||!account)return;
 account=null;
 resetStaffSessionTimer();
 authUI(false);
 staffTabs();
 authForms(true);
 const expired=$('staff-session-expired');
 expired.hidden=false;
 statusBox.hidden=true;
 expired.scrollIntoView({block:'start',behavior:'auto'});
 expired.querySelector('#staff-session-relogin')?.focus({preventScroll:true});
}
if(staff){
 $('staff-session-relogin')?.addEventListener('click',()=>location.reload());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateStaffSessionReminder()});
 window.addEventListener('pageshow',updateStaffSessionReminder);
}
function permittedPhoto(url){const href=safeLink(url);if(!href)return null;try{const x=new URL(href);if(x.username||x.password||(x.port&&x.port!=='443')||x.hostname==='localhost'||x.hostname.endsWith('.local')||x.hostname.endsWith('.internal'))return null;return href}catch{return null}}
function profileImage(url,large=false){
 const source=permittedPhoto(url);if(!source)return null;
 const img=node('img');img.className=large?'entrant-gallery-img':'entrant-avatar';
 img.src=source;img.loading='lazy';img.referrerPolicy='no-referrer';img.decoding='async';img.alt='參賽者自行提供的照片';
 img.addEventListener('error',()=>{img.replaceWith(node('span','照片暫時無法顯示','entrant-image-fallback'))});
 return img;
}
function profileGallery(a){
 const urls=[a.photo_url_1,a.photo_url_2,a.photo_url_3].filter(permittedPhoto);
 if(!urls.length)return null;
 const gallery=node('div',undefined,'entrant-gallery');
 for(const url of urls){
  const link=node('a',undefined,'entrant-photo-link');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
  link.append(profileImage(url,true));gallery.append(link);
 }
 return gallery;
}
function enablePhotoPreview(){
 const field=$('entrant-photo-url-1'),box=$('entrant-photo-preview'),img=$('entrant-preview-img');
 if(!field||!box||!img)return;
 const refresh=()=>{
  const url=permittedPhoto(field.value.trim());
  box.hidden=!url;if(!url){img.removeAttribute('src');return}
  img.src=url;img.alt='主照片預覽';
 };
 img.addEventListener('error',()=>{box.hidden=true});
 field.addEventListener('change',refresh);field.addEventListener('input',refresh);
}
function setupProfileFields(ready){
 profileEnabled=Boolean(ready);
 const group=$('entrant-profile-fields');
 if(group)group.hidden=!profileEnabled;
 if(profileEnabled)enablePhotoPreview();
 const consent=$('entrant-profile-consent');
 const fields=group?.querySelectorAll('[name=gender],[name^=photo_url_]');
 const sync=()=>{
  if(!consent)return;
  consent.required=profileEnabled&&Array.from(fields||[]).some(f=>Boolean(f.value.trim()));
 };
 fields?.forEach(el=>el.addEventListener('input',sync));
 sync();
}

function status(text,bad=false){if(!statusBox)return;statusBox.hidden=false;statusBox.className='feedback'+(bad?' error':' success');statusBox.textContent=text;statusBox.scrollIntoView({block:'nearest',behavior:'smooth'})}
function friendlyError(e){
 if(page==='member'){
 const common={"e2e_not_configured":"errNoEmail","test_email_service_unavailable":"errMail","not_on_test_allowlist":"errAllow","expired_or_invalid_code":"errInvalid","login_required":"errLogin","human_check_required":"signupHumanRequired","too_many_code_requests":"signupLimited"};
 if(common[e?.message])return mt(common[e.message]);
 const errors={
 application_submit_timeout:mt('submitUncertain'),
 invalid_demo_count:mt('submitDemoCount'),
 invalid_demo_fields:mt('submitDemoFields'),
 duplicate_demo_url:mt('submitDuplicateVideo'),
 demo_first_mismatch:mt('submitDemoMismatch'),
 missing_song_or_identity_test_fields:mt('submitRequiredFields'),
 invalid_audition_window:mt('submitWindow'),
 frontline_round_unavailable:mt('submitWindow'),
 second_audition_not_open:mt('submitWindow'),
 january_entry_required:mt('submitJanuaryFirst'),
 invalid_competition_region:mt('submitRegion'),
 competition_region_locked:mt('submitRegionLocked'),
 invalid_eligibility_basis:mt('submitEligibility'),
 legacy_eligibility_mismatch:mt('submitEligibility'),
 invalid_province:mt('submitLocation'),
 invalid_location_basis:mt('submitLocation'),
 invalid_category:mt('submitEligibility'),
 video_self_recording_confirmation_required:mt('submitVideoConfirm'),
 song_policy_declaration_required:mt('submitSongConfirm'),
 five_demo_not_enabled:mt('submitStorageUnavailable'),
 five_demo_round_unavailable:mt('submitWindow'),
 frontline_2027_registration_unavailable:mt('submitStorageUnavailable'),
 frontline_transaction_unavailable:mt('submitStorageUnavailable'),
 frontline_database_error:mt('submitStorageFailed'),
 temporary_service_error:mt('submitStorageFailed'),
 already_finalist:mt('submitFinalist'),
 invalid_json:mt('submitInvalidRequest'),
 origin_not_allowed:mt('submitReload'),
 muse_profile_missing:mt('contactRequired'),
 muse_profile_invalid:mt('contactInvalid'),
 muse_phone_invalid:mt('contactPhoneInvalid'),
 muse_email_invalid:mt('contactEmailInvalid'),
 muse_fields_not_enabled:mt('contactUnavailable'),
 member_only:'This account is not a singer account.',
 update_locked:mt('editLockedAfterReview'),
 delete_locked:'This entry cannot be deleted.',
 invalid_demo_url:'Enter a valid public video link.',
 invalid_location_detail:mt('locationDetailHelp'),
 location_storage_unavailable:mt('provincePending'),
 video_supplement_unavailable:mt('supplementUnavailable'),
 annual_category_locked:'Your annual competition category is already selected.',
 community_age_confirmation_required:'Confirm the community eligibility statement.',
 university_student_confirmation_required:'Confirm current university enrollment.',
 contract_declaration_required:'Confirm the exclusive-contract declaration.',
 duplicate_round_or_database_rejected:'This audition window may already have an application.',
 invalid_demo_url_or_fields:'Check song information and public video link.',
 profile_not_enabled:'照片資料目前尚未開通，請勿把照片視為已儲存。',
 profile_storage_unavailable:'照片資料儲存服務尚未就緒。',
 profile_database_error:'照片資料儲存失敗，請稍後再試。',
 profile_consent_required:'請先同意照片用途，才能送出外部照片網址或性別。',
 invalid_public_photo_url:'請輸入公開、安全的 HTTPS 照片網址。',
 invalid_gender:'請選擇有效的性別欄位。',
 main_photo_required:'填寫補充照片前，請先提供主照片網址。',
 invalid_song_language:mt('invalidSongLanguage'),
 readback_mismatch:mt('readbackFail'),
 correction_schema_pending:'更正申請功能尚待TEST資料庫部署，未儲存任何更正。',
 correction_pending_or_database_error:'已有待審申請，或資料庫儲存未成功。',
 correction_invalid_input:'請確認姓名、學校／職業，以及至少8個字的更正原因。',
 correction_use_normal_edit:'這筆報名尚未評分，請使用「修改報名資料」直接儲存。',
 correction_nothing_changed:'姓名與學校／職業都沒有變更。',
 correction_readback_failed:'更正申請的資料庫讀回失敗，請聯絡管理員確認。',
 mock_payment_not_allowed:'This application cannot be checked out.',
 test_payment_result_unverified:'TEST payment could not be verified. No charge was made.'
 };
 return errors[e?.message]||mt('errUnknown');
 }

 const errors={online_judging_frontline_managed:'本關由前線自行評選，不使用線上評分。',frontline_results_required:'本關由前線提供晉級結果，平台不再要求線上評分。',admin_registration_conflict:'這筆報名已有更新，請確認目前資料後再試。',admin_registration_protected:'已有評分或晉級紀錄，這筆報名已鎖定。',admin_registration_readback_unavailable:'無法確認是否已儲存，請先重新查詢。',staff_human_check_unavailable:'工作人員真人驗證暫時無法使用，請稍後重試。',human_check_required:'請重新完成真人驗證，再寄送驗證碼。',staff_reauthentication_required:'請先在工作人員入口重新驗證登入。',self_review_disallowed:'同一信箱不能評自己的參賽作品，請由其他獨立評審評分。',too_many_code_requests:'驗證信已達次數限制，請稍候再試；登入後切換已授權身分不必重新寄信。',e2e_not_configured:'目前尚未開通 Email 驗證服務，無法登入。正式系統需先完成寄信設定。',test_email_service_unavailable:'寄信服務目前不可使用，請稍後或確認平台設定。',not_on_test_allowlist:'此 Email 尚未獲授權，目前只接受受邀帳號。',expired_or_invalid_code:'驗證碼錯誤或已過期，請重新取得。',login_required:'登入已逾時，請重新登入後台。',organizer_only:'這個帳號不是主辦單位，無權查看管理資料。',reviewer_only:'這個帳號不是評審，無權打分。',member_only:'此帳號並非會員。',update_locked:'這筆資料已進入審核或模擬繳費階段，無法直接修改。',delete_locked:'這筆資料已進入評審或後續流程，無法直接刪除。',invalid_demo_url:'請輸入有效的公開作品連結。',annual_category_locked:'年度組別已鎖定。',already_scored_or_unavailable:'你已評過這位選手，不能重複給分。'};return errors[e?.message]||('目前無法完成操作（'+(e?.message||'連線失敗')+'）。')}
async function api(path,body){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);
 try{
  const r=await fetch('/api/e2e/'+path,{
   method:body===undefined?'GET':'POST',
   headers:body===undefined?{}:{'Content-Type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body),
   credentials:'same-origin',cache:'no-store',signal:c.signal
  });
  const data=await r.json();
  if(!r.ok||data.ok!==true){
   if(staff&&account&&(data.error==='login_required'||data.error==='staff_reauthentication_required'||(r.status===401&&!['request-code','verify-code'].includes(path)))){
    expireStaffSession();
   }
   throw new Error(data.error||('HTTP '+r.status));
  }
  return data;
 }catch(error){
  if(error?.name==='AbortError'&&path==='applications'&&body!==undefined)throw new Error('application_submit_timeout');
  throw error;
 }finally{clearTimeout(timer)}
}
async function run(fn){if(busy)return;busy=true;document.body.classList.add('requesting');try{await fn()}catch(e){status(friendlyError(e),true)}finally{busy=false;document.body.classList.remove('requesting')}}
function clearStaffContact(){
 document.querySelectorAll('[data-staff-contact]').forEach(item=>item.remove());
}
function authUI(signedIn){
 if(staff)document.body.classList.toggle('staff-authenticated',signedIn);
 if(staff&&!signedIn){resetStaffSessionTimer();clearStaffContact();clearStaffWorkspace();}
 (staff?$('back-signin'):$('signin-panel')).hidden=signedIn;
 $(prefix+'-dashboard')?.setAttribute('hidden','');
 if(staff){
  $('back-dashboard').hidden=!signedIn;
  if(!signedIn)clearAdminRegistrations();
  if(!signedIn)$('organizer-correction-list').replaceChildren();
 }
 else{
  $('member-panel').hidden=!signedIn;
  if(!signedIn){
   const heading=document.querySelector('.page-heading');
   if(heading){heading.dataset.l='memberTitle';heading.textContent=mt('memberTitle');}
   const intro=document.querySelector('.page-intro'),steps=document.querySelector('.steps');
   if(intro)intro.hidden=false;if(steps)steps.hidden=false;
  }
 }
}
function authForms(email){$(prefix+'-email-form').hidden=!email;$(prefix+'-code-form').hidden=email}
function setupMuseForm(ready){
 museFormEnabled=ready===true;
 const box=$('muse-test-fields'),notice=$('muse-fields-notice');
 if(!box)return;
 // Disabled fieldsets are omitted by FormData until private storage is ready.
 box.disabled=!museFormEnabled;
 const instructions=box.querySelector('[data-l="museInfo"]');
 if(instructions)instructions.hidden=!museFormEnabled;
 box.dataset.mode=museFormEnabled?'storage':'preview';
 for(const input of box.querySelectorAll('input,textarea,select')){
  input.required=museFormEnabled;
  input.autocomplete='off';
 }
 if(notice){
  notice.dataset.l=museFormEnabled?'museEnabled':'musePending';
  notice.textContent=mt(notice.dataset.l);
 }
}
function demoSlots(){return [...document.querySelectorAll('#demo-extra-list [data-demo-slot]')];}
function activeExtraDemoSlots(){return demoSlots().filter(el=>!el.hidden);}
function updateDemoCount(){
 const count=1+activeExtraDemoSlots().length;
 const counter=$('demo-counter'),add=$('demo-add');
 if(counter)counter.textContent=count+' / 5';
 if(add){add.disabled=count>=5;add.setAttribute('aria-disabled',String(count>=5));}
}
function addDemoSlot(){
 const card=demoSlots().find(c=>c.hidden);
 if(!card){status(mt('demoLimit'),true);return;}
 card.hidden=false;card.disabled=false;
 for(const el of card.querySelectorAll('input,select'))el.required=true;
 card.querySelectorAll('select[name$="_language"]').forEach(select=>select._syncOtherLanguage?.());
 updateDemoCount();
 card.querySelector('input')?.focus({preventScroll:true});
}
function removeDemoSlot(card){
 // Maintain contiguous demo positions. Removing Demo 3 also removes any Demo 4–5
 // to avoid silently shifting songs to another number after the singer saved it.
 const start=Number(card?.dataset.demoSlot||6);
 for(const item of demoSlots().filter(c=>Number(c.dataset.demoSlot)>=start)){
  for(const input of item.querySelectorAll('input,select')){
   input.value='';input.required=false;
  }
  item.hidden=true;item.disabled=true;
 }
 updateDemoCount();
}
function setupFiveDemo(enabled){
 fiveDemoEnabled=enabled===true;
 const notice=$('demo-storage-notice');
 if(notice){notice.dataset.l=fiveDemoEnabled?'demoMultiEnabled':'demoMultiPending';notice.textContent=mt(notice.dataset.l);}
 updateDemoCount();
}
function collectDemoEntries(form){
 const main=new FormData(form);
 const entries=[{
  song_title:String(main.get('song_title')||'').trim(),
  original_artist:String(main.get('original_artist')||'').trim(),
  song_language:songLanguageValue(form.querySelector('[name="song_language"]')),
  demo_url:String(main.get('demo_url')||'').trim()
 }];
 for(const card of activeExtraDemoSlots()){
  const i=card.dataset.demoSlot;
  entries.push({
   song_title:String(main.get('demo_'+i+'_title')||'').trim(),
   original_artist:String(main.get('demo_'+i+'_artist')||'').trim(),
   song_language:songLanguageValue(card.querySelector('[name="demo_'+i+'_language"]')),
   demo_url:String(main.get('demo_'+i+'_url')||'').trim()
  });
 }
 return entries;
}
function setupFrontlineForm(enabled){
 if(page!=='member')return;
 const next=$('frontline-test-fields'),legacy=$('legacy-category-field'),form=$('application-form');
 if(!next||!legacy||!form)return;
 frontlineFormEnabled=enabled===true;
 next.hidden=!frontlineFormEnabled;next.disabled=!frontlineFormEnabled;
 legacy.hidden=frontlineFormEnabled;
 const notice=document.querySelector('[data-l="frontlineFormBoundary"]');
 if(notice){notice.dataset.l=frontlineFormEnabled?'frontlineEnabledNotice':'frontlineFormBoundary';notice.textContent=mt(notice.dataset.l);}
 if(frontlineFormEnabled){
  const sync=()=>{
   const basis=next.querySelector('[name=eligibility_basis]').value;
   form.elements.category.value=basis==='enrolled'?'university':'community';
   form.elements.category.dispatchEvent(new Event('change'));
  };
  next.querySelector('[name=eligibility_basis]').onchange=sync;sync();
 }
}
function applyStaffJudgingPolicy(value){
 if(value?.judging_policy)staffJudgingPolicy=value.judging_policy.mode==='all_stages_test'?{mode:'all_stages_test'}:{mode:'final_only'};
 const legacy=staffJudgingPolicy.mode==='all_stages_test',notice=$('staff-judging-notice');
 if(notice){notice.dataset.staffText=legacy?'全關卡評審復原模式，僅供隔離測試。':'海選、初選與晉級賽由前線自行評選，平台不要求線上打分。決賽評分僅供受邀測試，正式使用待確認。';notice.textContent=sw(notice.dataset.staffText)}
 const stat=$('scores-count')?.closest('.dash-stat');if(stat)stat.hidden=!legacy;
 for(const option of $('organizer-status')?.options||[])if(['scored','unscored'].includes(option.value)){option.hidden=!legacy;option.disabled=!legacy;if(!legacy&&option.selected)$('organizer-status').value=''}
 const heading=$('judge-roster-panel')?.querySelector('h2');if(heading){heading.removeAttribute('data-t');heading.dataset.staffText=legacy?'評審名冊':'決賽評審名冊（TEST）';heading.textContent=sw(heading.dataset.staffText)}
}
function staffTabs(){
 const roles=account?.available_roles||[account?.role];
 document.querySelector('.role-tabs')?.toggleAttribute('hidden',!account);
 document.querySelectorAll('[data-role-tab]').forEach(b=>{b.hidden=!roles.includes(b.dataset.roleTab);b.classList.toggle('active',b.dataset.roleTab===role);if(b.dataset.roleTab==='reviewer'){b.removeAttribute('data-t');b.dataset.staffText=staffJudgingPolicy.mode==='all_stages_test'?'評審':'決賽評審（TEST）';b.textContent=sw(b.dataset.staffText)}});
}
async function loadSession(){try{
 let v=await api('me');
 const granted=v.account.available_roles||[v.account.role];
 const target=staff?(granted.includes('organizer')?'organizer':granted.includes('reviewer')?'reviewer':null):'member';
 if(!target||!granted.includes(target)){account=null;authUI(false);staffTabs();return;}
 if((staff&&!['organizer','reviewer'].includes(v.account.role))||(!staff&&v.account.role!=='member')){
  v=await api('switch-role',{role:target});
  v=await api('me');
 }
 account=v.account;role=account.role;if(staff){staffJudgingPolicy={mode:'final_only'};applyStaffJudgingPolicy(v);}authUI(true);
 if(staff){trackStaffSession(v);staffTabs();}else{
  setupProfileFields(v.profile_enabled===true);
  setupFrontlineForm(v.frontline_form_enabled===true);
  setupMuseForm(v.muse_form_enabled===true);
  setupFiveDemo(v.five_demo_enabled===true);
  fiveDemoJanuaryOnly=v.five_demo_january_only===true;
  eligibilityUploadEnabled=v.eligibility_upload_enabled===true;
  const nationwide=v.nepal_locations_enabled===true,location=$('entrant-location-detail'),field=location.querySelector('input');
  location.hidden=!nationwide;field.disabled=!nationwide;field.required=nationwide;
  const note=$('province-note');note.dataset.l=nationwide?'provinceHelp':'provincePending';note.textContent=mt(note.dataset.l);
  for(const option of $('application-form').elements.province.options){
   option.disabled=!nationwide&&!['bagmati','gandaki'].includes(option.value);option.hidden=option.disabled;
  }
 }
 await dashboard();
 // Preserve the public QR URL: after successful OTP, take a first-time singer
 // straight to the visible form. Existing entrants remain on their dashboard.
 if(!staff&&location.hash==='#register'){
  const registration=$('application-details');
  if(registration&&!registration.hidden){
   requestAnimationFrame(()=>{
    registration.scrollIntoView({block:'start',behavior:'auto'});
    registration.querySelector('h2')?.focus({preventScroll:true});
   });
  }
 }
 }catch(e){account=null;authUI(false);if(staff)staffTabs();if(e.message==='e2e_not_configured')status(friendlyError(e),true)}}
function setupAuth(){
const mailForm=$(prefix+'-email-form'),codeForm=$(prefix+'-code-form');
let challengeEmail,publicTest=false,staffHuman=false,humanToken,widgetId,widgetTimer,widgetScript;
const humanBox=$('signup-human-status'),retryButton=$('signup-human-retry');
const sendButton=mailForm?.querySelector('button[type="submit"]');
let widgetLoading=false,humanFailure=null;
let otpValidUntil=0,otpReminderTimer=null;
function stopOtpReminder(){
 if(otpReminderTimer!==null){clearInterval(otpReminderTimer);otpReminderTimer=null}
 otpValidUntil=0;
 if(staff)$('staff-otp-expiry').hidden=true;
}
function tickOtpReminder(){
 if(!staff||!otpValidUntil)return;
 const message=$('staff-otp-expiry');
 const submit=codeForm?.querySelector('button[type="submit"]');
 const remaining=Math.ceil((otpValidUntil-Date.now())/1000);
 if(remaining<=0){
  message.textContent=window.GHVStaffLocale?.('驗證碼已過期，請更換 Email 後重新取得。')||'驗證碼已過期，請更換 Email 後重新取得。';
  message.dataset.state='error';message.hidden=false;
  if(submit)submit.disabled=true;
 }else{
  const minutes=Math.max(1,Math.ceil(remaining/60));
  const template='驗證碼約剩 {minutes} 分鐘有效，逾時後請重新取得。';
  message.textContent=(window.GHVStaffLocale?.(template)||template).replace('{minutes}',String(minutes));
  message.dataset.state=remaining<=120?'warning':'info';message.hidden=false;
  if(submit)submit.disabled=false;
 }
}
function startOtpReminder(){
 if(!staff)return;
 stopOtpReminder();
 otpValidUntil=Date.now()+600000;
 tickOtpReminder();
 otpReminderTimer=setInterval(tickOtpReminder,30000);
}
if(staff)document.addEventListener('visibilitychange',()=>{if(!document.hidden)tickOtpReminder()});
const staffHumanCopy={signupHumanLoading:'正在載入真人驗證。',signupHumanPrompt:'請完成真人驗證後再寄送驗證碼。',signupHumanVerified:'真人驗證已完成。',signupHumanExpired:'真人驗證已過期，請重新驗證。',signupHumanBlocked:'真人驗證暫時無法使用，請重新載入。',signupHumanRequired:'請先完成真人驗證。'};
const humanCopy=key=>{const translated=mt(key);return translated!==key?translated:(staffHumanCopy[key]||key)};
function humanState(key,kind='pending'){
 if(!humanBox)return;
 if(kind!=='error')humanFailure=null;
 humanBox.hidden=false;
 humanBox.dataset.l=key;
 humanBox.dataset.state=kind;
 humanBox.textContent=humanCopy(key);
 if(retryButton)retryButton.hidden=kind!=='error';
 if((publicTest||staffHuman)&&sendButton)sendButton.disabled=!humanToken;
}
function clearHumanToken(){humanToken=undefined;if((publicTest||staffHuman)&&sendButton)sendButton.disabled=true}
function humanError(code){
 clearTimeout(widgetTimer);widgetLoading=false;clearHumanToken();
 humanFailure=window.GHVHumanVerification?.humanVerificationError(code)||{key:'signupHumanBlocked',code:'',retryable:true};
 humanState(humanFailure.key,'error');
 // A public Cloudflare error code helps diagnosis; do not log the widget token or keys.
 if(humanFailure.code)humanBox.textContent+=' (CF '+humanFailure.code+')';
 if(retryButton)retryButton.hidden=!humanFailure.retryable;
}
window.addEventListener('ghv:languagechange',()=>{
 if(!humanFailure||!humanBox)return;
 humanBox.textContent=humanCopy(humanFailure.key)+(humanFailure.code?' (CF '+humanFailure.code+')':'');
 if(retryButton)retryButton.hidden=!humanFailure.retryable;
});
function renderHumanWidget(siteKey){
 const widget=$('signup-turnstile');
 try{
  if(!window.turnstile||typeof window.turnstile.render!=='function')throw Error('widget_unavailable');
  // The async script's load event makes render available. Turnstile.ready rejects async scripts.
  widgetId=window.turnstile.render(widget,{
   sitekey:siteKey,size:widget.clientWidth<300?'compact':'normal',appearance:'always',theme:'light',
   action:staff?'ghv_staff_login':'ghv_signup','response-field':false,
   callback:token=>{
    clearTimeout(widgetTimer);widgetLoading=false;
    if(typeof token!=='string'||!token){humanError();return}
    humanToken=token;
    humanState('signupHumanVerified','verified');
   },
   'expired-callback':()=>{clearHumanToken();humanState('signupHumanExpired','pending')},
   'timeout-callback':()=>{clearHumanToken();humanState('signupHumanExpired','pending')},
   'error-callback':code=>humanError(code)
  });
  clearTimeout(widgetTimer);widgetLoading=false;
  if(!humanToken){
   humanState('signupHumanPrompt');
   // Turnstile mounts an iframe in a closed shadow tree. Check its host.
   widgetTimer=setTimeout(()=>{
    if(!humanToken&&!widget.firstElementChild)humanError();
   },10000);
  }
 }catch{humanError()}
}
function beginHumanWidget(siteKey){
 clearTimeout(widgetTimer);widgetLoading=true;
 clearHumanToken();widgetId=undefined;
 const widget=$('signup-turnstile');
 widget.hidden=false;widget.replaceChildren();
 humanState('signupHumanLoading');
 widgetTimer=setTimeout(()=>{if(widgetLoading)humanError()},12000);
 if(window.turnstile?.render){renderHumanWidget(siteKey);return}
 widgetScript?.remove();
 const script=widgetScript=document.createElement('script');
 script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
 script.async=true;
 script.onload=()=>{if(script===widgetScript)renderHumanWidget(siteKey)};
 script.onerror=()=>{if(script===widgetScript)humanError()};
 document.head.append(script);
}
function startHumanVerification(siteKey){
 retryButton?.addEventListener('click',()=>{
  if(widgetId!==undefined&&window.turnstile?.remove){
   try{window.turnstile.remove(widgetId)}catch{}
  }
  beginHumanWidget(siteKey);
 });
 beginHumanWidget(siteKey);
}
async function loadStaffVerification(){
 try{
  const config=await api('staff-login-config');
  if(config.required===false){
   staffHuman=false;
   sendButton.disabled=false;
   return;
  }
  if(config.required===true&&typeof config.siteKey==='string'){
   startHumanVerification(config.siteKey);
   return;
  }
 }catch{}
 humanError();
 if(retryButton)retryButton.onclick=()=>{retryButton.onclick=null;loadStaffVerification()};
}
const signupConfig=staff?(staffHuman=true,sendButton.disabled=true,loadStaffVerification()):api('signup-config').then(config=>{
 if(config.mode!=='public_test'||typeof config.siteKey!=='string')return;
 publicTest=true;
 const notice=$('signup-mode');
 notice.dataset.l='signupPublicTest';
 notice.textContent=mt('signupPublicTest');
 for(const [id,key] of [['member-auth-intro','signupPilotIntro'],['email-legacy-summary','signupPilotEmail']]){
  const copy=$(id);if(copy){copy.dataset.l=key;copy.textContent=mt(key);}
 }
 startHumanVerification(config.siteKey);
}).catch(()=>{});
mailForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 await signupConfig;
 if((publicTest||staffHuman)&&!humanToken){
  status(humanCopy('signupHumanRequired'),true);
  $('signup-turnstile')?.scrollIntoView({block:'center',behavior:'smooth'});
  return;
 }
 const {email}=formValues(mailForm);
 const payload={email,role:staff?'staff':role};
 if(humanToken)payload.turnstile_token=humanToken;
 try{
  const v=await api('request-code',payload);
  challenge=v.challenge_id;
  challengeEmail=publicTest?email:undefined;
 }finally{
  if(payload.turnstile_token){
   clearHumanToken();
   if(widgetId!==undefined&&window.turnstile?.reset){
    try{window.turnstile.reset(widgetId);humanState('signupHumanPrompt')}
    catch{humanError()}
   }else humanError();
  }
 }
 authForms(false);
 if(staff)startOtpReminder();
 status(staff?'驗證信已要求寄送，請查看 Email（僅限受邀測試帳號）。':mt(publicTest?'signupCodeRequested':'otpRequested'));
 codeForm.querySelector('input').focus();
})});
codeForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 if(staff&&otpValidUntil&&Date.now()>=otpValidUntil){tickOtpReminder();return;}
 const code=String(formValues(codeForm).code||'').trim();
 await api('verify-code',{challenge_id:challenge,code,email:challengeEmail});
 challengeEmail=undefined;
 stopOtpReminder();
 codeForm.reset();
 await loadSession();
 if(account)status(staff?'已登入。':mt('signedIn'));
})});
const change=$(staff?'back-change':'change-mail');change?.addEventListener('click',()=>{stopOtpReminder();authForms(true);challenge=null;challengeEmail=undefined;codeForm.reset();statusBox.hidden=true});
$(prefix+'-logout')?.addEventListener('click',()=>run(async()=>{await api('logout',{});account=null;authUI(false);if(staff){staffTabs();$('staff-session-expired').hidden=true;}challenge=null;stopOtpReminder();authForms(true);status(page==='member'?mt('signedOut'):'已登出。')}));
}
async function dashboard(){if(!account)return;if(staff){if(role==='organizer')await renderOrganizer();else{clearAdminRegistrations();await renderJudge()}}else await renderMember()}
function memberCanEdit(a){
 return a.can_edit===true||a.can_edit===1||a.can_edit==='1'||
  (a.can_edit===undefined&&a.payment_status==='unpaid'&&a.status==='submitted');
}
function editLockMessage(a){
 if(a.approval_state==='approved'&&a.phase==='demo'&&['submitted','under_review'].includes(a.status))return mt('editApprovedLock');
 return mt('editLockedAfterReview');
}
function supplementDeadline(a){
 const lang=window.GHVLocale?.lang||'zh';
 const locale=lang==='zh'?'zh-TW':lang==='ne'?'ne-NP':'en-NP';
 return new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kathmandu'})
  .format(new Date(a.video_supplement_deadline*1000))+' · '+(staff?'尼泊爾時間':mt('nepalTime'));
}
function drawMemberSupplement(box,a){
 const state=a.video_supplement_state;
 if(!state)return;
 box.append(node('p',mt({pending:'supplementPending',expired:'supplementExpired',submitted:'supplementSubmitted'}[state]),'helper-banner'));
 if(state!=='pending')return;
 box.append(node('p',supplementDeadline(a),'minor'));
 const form=node('form',undefined,'form-grid');
 for(const [name,key] of [['demo_url','videoUrl'],['stage_name','stageName'],['affiliation','occupation'],['song_title','songTitle'],['original_artist','artist'],['song_key','songKey']]){
  const label=node('label',undefined,'field'),input=node('input');
  if(name==='demo_url')input.type='url';
  input.name=name;input.maxLength=name==='demo_url'?1000:100;
  if(a[name])input.placeholder=a[name];
  label.append(node('span',mt(key)),input);form.append(label);
 }
 const save=node('button',mt('supplementSubmit'),'btn btn-primary');save.type='submit';
 form.append(save);
 form.oninput=()=>{form.dataset.editing='true';};
 form.onsubmit=e=>{e.preventDefault();run(async()=>{
  const changes=Object.fromEntries(Object.entries(formValues(form)).map(([key,value])=>[key,value.trim()]).filter(([,value])=>value));
  if(!Object.keys(changes).length){status(mt('supplementEnterChange'),true);return;}
  const result=await api('submit-video-supplement',{application_id:a.id,...changes});
  if(result.application_id!==a.id||result.testOnly!==true)throw Error('readback_mismatch');
  await renderMember();status(mt('supplementSubmitted'));
 });};
 box.append(form);
}
const entryReviewKey=entry=>entry.approval_state==='approved'?'approvalAccepted':entry.approval_state==='pending'?'approvalPending':'entryReceived';
function drawEntry(a){
 const box=node('article',undefined,'entry member-entry');
 const title=node('div',undefined,'member-entry-main');
 const avatar=profileImage(a.photo_url_1);
 if(avatar)title.append(avatar);
 const copy=node('div',undefined,'member-entry-copy');
 copy.append(node('strong',a.stage_name||mt('unnamedEntry')));
 copy.append(node('small',(a.song_title||'')+' · '+(a.song_language||'')));
 title.append(copy);box.append(title);
 const meta=node('div',undefined,'member-entry-meta');
 for(const item of [
  [mt('entryId'),a.id],
  [mt('categoryLabel'),a.competition_region?mt('frontlineOneGroup')+' · '+a.competition_region:mt(a.category==='university'?'university':'community')],
  [mt('windowLabel'),a.round_code]
 ]){
  const field=node('div',undefined,'member-entry-field');
  field.append(node('span',item[0]),node('strong',item[1]));
  meta.append(field);
 }
 box.append(meta);
 box.append(node('span',mt(entryReviewKey(a)),'pill '+(a.approval_state==='approved'?'pill-pass':'pill-warn')));
 if(a.approval_state)box.append(node('p',mt(a.approval_state==='approved'?'approvalAccepted':'approvalPending'),'minor'));
 drawMemberSupplement(box,a);
 const actions=node('div',undefined,'inline-actions member-entry-buttons');
 if(memberCanEdit(a)){
  const edit=node('button',mt('edit'),'btn btn-primary');edit.type='button';edit.onclick=()=>showEdit(a);actions.append(edit);
 }else{
  const correction=node('button','申請更正基本資料（不影響分數）','btn btn-soft');correction.type='button';
  correction.onclick=()=>showCorrection(a);actions.append(correction);
 }

 const savedVideos=Array.isArray(a.demo_entries)&&a.demo_entries.length?a.demo_entries:[{demo_url:a.demo_url,song_title:a.song_title}];
 for(let i=0;i<savedVideos.length;i++){
  const url=safeLink(savedVideos[i]?.demo_url);
  if(url){
   const link=node('a',savedVideos.length>1?'Demo '+(i+1)+' · '+(savedVideos[i].song_title||''):mt('viewVideo'),'btn btn-soft');
   link.href=url;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
  }
 }
 if(a.payment_status==='unpaid'&&a.status==='submitted'){
  const del=node('button',mt('delete'),'btn btn-soft');del.type='button';
  del.onclick=()=>{
   if(!confirm(mt('delTitle')+'\n\n'+mt('delBody')+' '+a.id))return;
   run(async()=>{await api('delete-application',{application_id:a.id});status(mt('deleted'));await renderMember()});
  };
  // Public checkout is disabled under the 2026-11-18 Muse/Alan policy.
  if(a.round_code==='2027-01')box.append(node('p','2027 January audition TEST · 將依參賽資格審核 · परीक्षण आवेदन','minor'));
  if(a.approval_state!=='approved'&&!a.video_supplement_state)actions.append(del);
 }
 box.append(actions);
 if(!memberCanEdit(a)&&!a.video_supplement_state)box.append(node('p',editLockMessage(a),'minor'));
 return box;
}
async function renderMember(){
 const holder=$('entries'),editSlot=$('member-edit-panel');
 holder.replaceChildren();
 if(editSlot){editSlot.replaceChildren();editSlot.hidden=true;}
 const v=await api('applications'),rows=Array.isArray(v.applications)?v.applications:[];
 const hasEntries=rows.length>0,first=rows[0];
 const proofBox=$('eligibility-private-upload'),proofBtn=$('eligibility-upload-submit');
 if(proofBox){
  const target=rows.find(row=>row.phase==='demo'&&row.status==='submitted'&&row.payment_status==='unpaid'&&!row.has_eligibility_file);
  proofBox.hidden=!eligibilityUploadEnabled||!target;
  if(proofBtn)proofBtn.dataset.applicationId=target?.id||'';
 }

 const manageEdit=$('member-manage-edit'),manageNote=$('member-manage-note');
 const editable=rows.find(memberCanEdit);
 if(manageEdit){
  manageEdit.disabled=!hasEntries;
  manageEdit.textContent=editable?'修改報名資料':'申請更正基本資料（已評分）';
  manageEdit.onclick=editable?()=>showEdit(editable):hasEntries?()=>showCorrection(first):null;
 }
 if(manageNote)manageNote.textContent=editable
  ?'尚未評分的TEST報名可直接修改並經資料庫讀回確認。'
  :hasEntries?'已評分的歌曲、影片及分數不得改寫；可申請更正姓名或學校／職業，由主辦方留下審核紀錄。':'尚未有報名資料，請先建立一筆測試報名。';

 // The API must explicitly open the later TEST round; a January entry alone is not permission.
 const secondAudition=hasEntries&&v.next_audition_round==='2027-04';
 const callout=$('new-application-callout'),form=$('application-details');
 if(callout){
  callout.hidden=hasEntries&&!secondAudition;
  for(const [element,key] of [[$('new-application-title'),secondAudition?'secondAuditionTitle':'ready'],[$('start-application')?.querySelector('[data-l]'),secondAudition?'secondAuditionStart':'goToForm']]){
   if(element){element.dataset.l=key;element.textContent=mt(key);}
  }
  callout.querySelector('[data-l="startHelp"]').hidden=secondAudition;
  $('second-audition-help').hidden=!secondAudition;
 }
 if(form)form.hidden=hasEntries&&!secondAudition;
 const fields=$('application-form')?.elements;
 if(fields){
  for(const option of fields.round_code.options){
   if(option.value==='2027-04'){option.hidden=!secondAudition;option.disabled=!secondAudition;}
   else option.disabled=secondAudition;
  }
  for(const option of fields.category.options)option.disabled=secondAudition&&option.value!==first.category;
  if(secondAudition){
   fields.round_code.value='2027-04';fields.category.value=first.category;
   fields.category.dispatchEvent(new Event('change'));
  }
 }
 $('member-welcome').hidden=!hasEntries;
 $('member-entry-overview').hidden=!hasEntries;
 $('member-state-grid').hidden=!hasEntries;
 $('member-primary-actions').hidden=!hasEntries;
 $('member-official-boundary').hidden=!hasEntries;
 $('member-dashboard-help').hidden=hasEntries;
 const heading=document.querySelector('.page-heading'),intro=document.querySelector('.page-intro'),steps=document.querySelector('.steps');
 if(heading){heading.dataset.l=hasEntries?'dashboard':'memberTitle';heading.textContent=mt(heading.dataset.l);}
 if(intro)intro.hidden=hasEntries;
 if(steps)steps.hidden=hasEntries;
 if(!hasEntries)holder.append(node('p',mt('noEntries'),'minor'));
 if(hasEntries){
  $('member-welcome-name').textContent=first.stage_name||mt('unnamedEntry');
  $('member-welcome-meta').textContent=(first.competition_region?mt('frontlineOneGroup')+' · '+first.competition_region:mt(first.category==='university'?'university':'community'))+' · '+first.round_code;
  const avatar=$('member-hero-avatar');avatar.replaceChildren();
  avatar.append(profileImage(first.photo_url_1)||node('span','✦'));
  $('member-state-data').textContent=mt('dataSaved');
  $('member-state-payment').textContent=mt(entryReviewKey(first));
  $('member-quick-edit').hidden=!memberCanEdit(first);
  $('member-quick-edit').onclick=()=>showEdit(first);
  const editReason=$('member-edit-lock-reason');
  editReason.hidden=memberCanEdit(first);
  editReason.textContent=editReason.hidden?'':editLockMessage(first);
  const video=$('member-view-video'),link=safeLink(first.demo_url);
  video.hidden=!link;if(link)video.href=link;else video.removeAttribute('href');
  $('member-show-details').onclick=()=>document.getElementById('member-entry-overview').scrollIntoView({behavior:'smooth',block:'start'});
  for(const a of rows)holder.append(drawEntry(a));
 }else{
  $('member-hero-avatar').replaceChildren();
  $('member-quick-edit').onclick=null;
  $('member-edit-lock-reason').hidden=true;
 }
 const done=$('test-completion');
 if(done){done.hidden=!first?.approval_state;done.textContent=first?.approval_state?mt(entryReviewKey(first)):'';}
 $('step-login')?.classList.add('active');
 $('step-apply')?.classList.toggle('active',hasEntries);
 $('step-checkout')?.classList.toggle('active',hasEntries);
}
async function showCorrection(a){
 // A graded entry is immutable as to scored song/video. Only display identity
 // and affiliation are eligible for a traceable organizer-reviewed change.
 const holder=$('member-edit-panel');if(!holder)return;
 holder.hidden=false;holder.replaceChildren();
 const box=node('div',undefined,'member-edit-box');box.dataset.editing='true';
 box.append(node('h3','已評分報名｜申請更正基本資料'),
  node('p','正式評分不會被刪除或覆蓋。更正姓名或學校／職業須經主辦審核；歌曲、影片與分數不可透過此表修改。','minor'));
 holder.append(box);holder.scrollIntoView({block:'start',behavior:'smooth'});
 let current;
 try{current=await api('member-corrections')}
 catch(e){status(friendlyError(e),true);return;}
 if(!current.enabled){
  box.append(node('p','更正申請功能尚待TEST資料庫增量遷移驗證；目前無法送出。請勿以此作為已修改成功。','feedback error'));
  return;
 }
 const prior=(current.requests||[]).find(x=>x.application_id===a.id&&x.state==='pending');
 if(prior){
  box.append(node('p','已有待審更正申請：'+prior.id+'。主辦審核前不能重複提交。','notice'));
  return;
 }
 const form=node('form',undefined,'form-grid');
 for(const [name,caption,value,max] of [
  ['stage_name','報名姓名／顯示名稱',a.stage_name,60],
  ['affiliation','學校／職業',a.affiliation,100],
  ['reason','更正原因（至少8字）','',400]
 ]){
  const label=node('label',undefined,'field full'),input=name==='reason'?node('textarea'):node('input');
  input.name=name;input.required=true;input.maxLength=max;
  if(name==='reason')input.minLength=8;else input.value=value||'';
  label.append(node('span',caption),input);form.append(label);
 }
 const buttons=node('div',undefined,'form-actions full');
 const submit=node('button','提交更正申請','btn btn-primary');submit.type='submit';
 const cancel=node('button','取消','btn btn-soft');cancel.type='button';cancel.onclick=()=>{holder.replaceChildren();holder.hidden=true;};
 buttons.append(submit,cancel);form.append(buttons);
 form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
  const v=formValues(form);
  const result=await api('request-member-correction',{application_id:a.id,...v});
  if(!result.request?.id||result.request?.state!=='pending'||result.testOnly!==true)throw Error('readback_mismatch');
  const check=await api('member-corrections');
  if(!(check.requests||[]).some(x=>x.id===result.request.id&&x.state==='pending'))throw Error('readback_mismatch');
  await renderMember();status('已提交更正申請，編號：'+result.request.id+'。原始分數與影片保持不變。');
 });});
 box.append(form);form.querySelector('input')?.focus({preventScroll:true});
}
function showEdit(a){
 if(!memberCanEdit(a)){status(editLockMessage(a),true);return;}
 const holder=$('member-edit-panel');holder.replaceChildren();holder.hidden=false;
 const box=node('div',undefined,'member-edit-box');box.dataset.editing='true';
 const heading=node('h3',mt('editHeader'));heading.dataset.l='editHeader';
 const guidance=node('p',mt('editGuidance'),'minor');guidance.dataset.l='editGuidance';
 box.append(heading,guidance);
 const form=node('form',undefined,'form-grid');
 const locationsEnabled=!$('entrant-location-detail').hidden;
 const fields=[
  ['stage_name','stageName'],['song_title','songTitle'],
  ['original_artist','artist'],['song_language','songLang'],['demo_url','videoUrl'],
  ...(a.affiliation?[['affiliation','occupation']]:[]),...(a.song_key?[['song_key','songKey']]:[]),
  ...(locationsEnabled?[['province','province'],['location_basis','basis'],['location_detail','locationDetail']]:[]),
  ...(museFormEnabled?[['full_name','museFullName'],['contact_phone','musePhone'],['contact_email','museEmail'],['contact_handle','museContact'],['city','museCity'],['street_address','museStreet'],['educational_background','museEducation'],['short_description','museDescription'],['musical_training','museTraining']]:[]),
  ...(profileEnabled?[['gender','profileGender'],['photo_url_1','profileMainPhoto'],['photo_url_2','profilePhoto2'],['photo_url_3','profilePhoto3']]:[])
 ];
 for(const [name,key] of fields){
  const lab=node('label',undefined,'field'),label=node('span',mt(key));label.dataset.l=key;
  let input;
  if(name==='gender'){
   input=node('select');
   const options=[['','profileGenderNone'],['male','profileMale'],['female','profileFemale'],['other','profileOther'],['prefer_not_say','profilePreferNot']];
   for(const [value,textKey] of options){const opt=node('option',mt(textKey));opt.value=value;input.append(opt);}
  }else if(['song_language','province','location_basis'].includes(name)){
   input=$('application-form').elements[name].cloneNode(true);input.removeAttribute('id');
  }else{
   input=['educational_background','short_description','musical_training'].includes(name)?node('textarea'):node('input');
   if(name==='demo_url'||name.startsWith('photo_url_'))input.type='url';
   if(name==='contact_email')input.type='email';
   if(name==='contact_phone')input.type='tel';
   input.maxLength={"full_name":120,"contact_phone":32,"contact_email":180,"contact_handle":160,"city":100,"street_address":160,"educational_background":400,"short_description":500,"musical_training":400}[name]||(name==='demo_url'?1000:name.startsWith('photo_url_')?600:name==='location_detail'?120:100);
  }
  input.name=name;input.value=a[name]||'';
  input.required=!['gender','photo_url_1','photo_url_2','photo_url_3'].includes(name);
  lab.append(label,input);
  if(name==='song_language')selectSongLanguage(input,a[name]);
  if(name==='demo_url')lab.classList.add('full');
  form.append(lab);
 }
 const editDemoCards=[];
 if(fiveDemoEnabled&&(!fiveDemoJanuaryOnly||a.round_code==='2027-01')){
  const series=node('fieldset',undefined,'full demo-edit-series');
  const heading=node('legend',mt('demoMultiTitle'));series.append(heading);
  const note=node('p',mt('demoMultiRules'),'minor');series.append(note);
  const saved=Array.isArray(a.demo_entries)&&a.demo_entries.length?a.demo_entries:[{demo_url:a.demo_url,song_title:a.song_title,original_artist:a.original_artist,song_language:a.song_language}];
  for(let slot=2;slot<=5;slot++){
   const old=saved[slot-1]||{},card=node('section',undefined,'demo-edit-card');
   card.dataset.demoSlot=String(slot);card.hidden=slot>saved.length;
   card.append(node('h4','Demo '+slot));
   const group=node('div',undefined,'demo-extra-grid');
   for(const [name,key,max] of [['song_title','songTitle',100],['original_artist','artist',100],['song_language','songLang',30],['demo_url','videoUrl',1000]]){
    const label=node('label',undefined,'field');label.append(node('span',mt(key)));
    let input;
    if(name==='song_language'){
     input=$('application-form').elements.song_language.cloneNode(true);input.removeAttribute('id');
    }else{
     input=node('input');input.maxLength=max;
     if(name==='demo_url')input.type='url';
    }
    input.name='demo_edit_'+slot+'_'+name;input.value=old[name]||'';
    input.required=!card.hidden;input.disabled=card.hidden;
    label.append(input);
    if(name==='song_language')selectSongLanguage(input,old[name]);
    group.append(label);
   }
   card.append(group);
   const remove=node('button',mt('demoRemove'),'btn btn-soft');remove.type='button';
   remove.onclick=()=>{
    for(const c of editDemoCards.filter(c=>Number(c.dataset.demoSlot)>=slot)){
     c.hidden=true;
     for(const input of c.querySelectorAll('input,select')){input.value='';input.required=false;input.disabled=true;}
    }
    syncEditAdd();
   };
   card.append(remove);series.append(card);editDemoCards.push(card);
  }
  const add=node('button',mt('demoAdd'),'btn btn-soft');add.type='button';
  function syncEditAdd(){add.disabled=editDemoCards.every(c=>!c.hidden)}
  add.onclick=()=>{
   const card=editDemoCards.find(c=>c.hidden);if(!card)return;
   card.hidden=false;for(const input of card.querySelectorAll('input,select')){input.disabled=false;input.required=true;}
   card.querySelectorAll('select[name$="_song_language"]').forEach(select=>select._syncOtherLanguage?.());
   syncEditAdd();card.querySelector('input')?.focus({preventScroll:true});
  };
  syncEditAdd();series.append(add);form.append(series);
 }
 if(profileEnabled){
  const consent=node('label',undefined,'check full'),check=node('input');
  check.type='checkbox';check.name='profile_consent';check.required=true;
  consent.append(check,node('span',mt('profileConsent')));
  form.append(consent);
 }
 const buttons=node('div',undefined,'form-actions full');
 const save=node('button',mt('saveChanges'),'btn btn-primary');save.type='submit';save.dataset.l='saveChanges';
 const cancel=node('button',mt('cancel'),'btn btn-soft');cancel.type='button';cancel.dataset.l='cancel';
 cancel.onclick=()=>{holder.replaceChildren();holder.hidden=true;};
 buttons.append(save,cancel);form.append(buttons);
 form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
  const payload={application_id:a.id,...formValues(form)};
  payload.song_language=songLanguageValue(form.querySelector('[name="song_language"]'));
  let verifiedDemoEntries=null;
  if(fiveDemoEnabled&&(!fiveDemoJanuaryOnly||a.round_code==='2027-01')){
   verifiedDemoEntries=[{
    song_title:String(payload.song_title||'').trim(),
    original_artist:String(payload.original_artist||'').trim(),
    song_language:songLanguageValue(form.querySelector('[name="song_language"]')),
    demo_url:String(payload.demo_url||'').trim()
   }];
   for(const card of editDemoCards.filter(c=>!c.hidden)){
    const slot=card.dataset.demoSlot;
    verifiedDemoEntries.push(Object.fromEntries(['song_title','original_artist','song_language','demo_url']
      .map(k=>[k,k==='song_language' ?songLanguageValue(card.querySelector('[name="demo_edit_'+slot+'_song_language"]')):String(payload['demo_edit_'+slot+'_'+k]||'').trim()])));
   }
   for(const key of Object.keys(payload))if(key.startsWith('demo_edit_'))delete payload[key];
   payload.demo_entries=verifiedDemoEntries;
  }
  if(profileEnabled)payload.profile_consent=form.querySelector('[name=profile_consent]')?.checked===true;
  await api('update-application',payload);
  const check=await api('applications');
  const saved=(check.applications||[]).find(row=>row.id===a.id);
  const names=fields.map(([name])=>name);
  if(!saved||names.some(key=>{
   const entered=String(payload[key]??'').trim();
   // The server trims text and stores accepted photo URLs in their canonical form.
   const expected=entered&&key.startsWith('photo_url_')?new URL(entered).href:entered;
   return String(saved[key]??'')!==expected;
  }))throw Error('readback_mismatch');
  if(verifiedDemoEntries){
   if(!Array.isArray(saved.demo_entries)||saved.demo_entries.length!==verifiedDemoEntries.length)throw Error('readback_mismatch');
   for(let i=0;i<verifiedDemoEntries.length;i++)
    for(const k of ['song_title','original_artist','song_language','demo_url'])
     if(saved.demo_entries[i][k]!==verifiedDemoEntries[i][k])throw Error('readback_mismatch');
  }
  await renderMember();status(mt('savedChanges'));
 })});
 box.append(form);holder.append(box);
 holder.scrollIntoView({block:'start',behavior:'smooth'});
 form.querySelector('input')?.focus({preventScroll:true});
}
function makeRosterPager(target,page,totalPages,onPage){
 target.replaceChildren();
 if(totalPages<=1)return;
 const previous=node('button',sw('上一頁'),'btn btn-soft');previous.type='button';previous.disabled=page<=1;
 previous.onclick=()=>onPage(page-1);
 const next=node('button',sw('下一頁'),'btn btn-soft');next.type='button';next.disabled=page>=totalPages;
 next.onclick=()=>onPage(page+1);
 const label=node('span',page+' / '+totalPages,'minor');
 target.append(previous,label,next);
}
function scoredByJudge(a){
 if(a.per_video_scoring&&Array.isArray(a.demo_entries)&&a.demo_entries.length){
  return a.demo_entries.every(work=>Boolean(work.my_score));
 }
 const phase=a.phase||'demo';
 const first=phase==='demo'?a.demo_technique:a.live_technique;
 return first!==null&&first!==undefined;
}
const sw=key=>window.GHVStaffLocale?.(key)||key;
function staffWorks(entry){
 if(Array.isArray(entry.demo_entries)&&entry.demo_entries.length)return entry.demo_entries;
 return entry.song_title||entry.demo_url?[{position:1,song_title:entry.song_title,original_artist:entry.original_artist,song_language:entry.song_language,demo_url:entry.demo_url}]:[];
}
function staffGroup(entry){
 const group=sw(entry.frontline_2027||['2027-01','2027-04'].includes(entry.round_code)?'單一組別':entry.category==='university'?'大學組':entry.category==='community'?'舊制社會組':entry.category||'尚未提供');
 return group+(['A','B'].includes(entry.competition_region)?' · '+entry.competition_region+' '+(entry.competition_region==='A'?'Lumbini':'Bagmati'):'');
}
function staffShortId(entry){
 const id=String(entry.id||'');
 return id.length>16?id.slice(0,5)+'…'+id.slice(-6):id;
}
function staffButton(label,className,action){
 const button=node('button',label,className);
 button.type='button';button.onclick=action;
 return button;
}
function staffStep(label,subtitle,action){
 const button=staffButton(undefined,'organizer-step-button',action);
 button.append(node('strong',label));
 if(subtitle)button.append(node('span',subtitle,'minor'));
 const arrow=node('span','›','organizer-step-arrow');
 arrow.setAttribute('aria-hidden','true');button.append(arrow);
 return button;
}
function staffField(label,value){
 const row=node('div',undefined,'organizer-record-field');
 row.append(node('dt',sw(label)),node('dd',value===null||value===undefined||value===''?sw('尚未提供'):String(value)));
 return row;
}
function staffSong(container,work,index,length){
 const fields=node('dl',undefined,'organizer-record-fields');
 fields.append(staffField('歌曲',work.song_title),staffField('原唱',work.original_artist),staffField('歌曲語言',work.song_language));
 container.append(node('p',index+' / '+length,'minor'),fields);
 const url=safeLink(work.demo_url);
 if(url){
  const link=node('a',sw('觀看影片 ↗'),'btn btn-soft organizer-record-watch');
  link.href=url;link.target='_blank';link.rel='noopener noreferrer';container.append(link);
 }
}
let staffScope=0,staffRoute=null;
const staffListPages={organizer:1,reviewer:1};
function clearStaffWorkspace(){
 staffRoute?.dispose();staffRoute=null;
}
function createStaffWorkspace(staffRole,list,workspace,content,render){
 clearStaffWorkspace();
 const scope=++staffScope;
 let scroll=0,trigger=null;
 function state(){
  const route=history.state?.ghvStaff;
  return route?.scope===scope?route:null;
 }
 function save(route,method){
  history[method]({...history.state,ghvStaff:route},'');
 }
 function display({focus=true}={}){
  if(!account||role!==staffRole)return;
  render.cleanup?.();
  const route=state(),visible=Boolean(route?.id);
  workspace.hidden=!visible;list.hidden=visible;content.replaceChildren();
  document.body.classList.toggle('staff-record-open',visible);
  if(visible){
   render(route);
   if(focus){content.focus({preventScroll:true});workspace.scrollIntoView({block:'start'});}
  }else if(focus){
   const button=trigger?.isConnected?trigger:Array.from(list.querySelectorAll('[data-application-id]')).find(item=>item.dataset.applicationId===trigger?.dataset.applicationId);
   window.scrollTo(0,scroll);button?.focus({preventScroll:true});
  }
 }
 function open(entry,button){
  scroll=window.scrollY;trigger=button;
  save({scope,id:entry.id,view:'overview',depth:1},'pushState');
  display();
 }
 function go(view,detail){
  const previous=state();
  if(!previous?.id)return;
  save({scope,id:previous.id,view,detail,depth:previous.depth+1},'pushState');
  display();
 }
 const back=()=>{if(state()?.id)history.back()};
 const close=()=>{if(state()?.depth)history.go(-state().depth)};
 const restore=()=>display();
 window.addEventListener('popstate',restore);
 save({scope,depth:0},'replaceState');
 workspace.hidden=true;list.hidden=false;
 staffRoute={
  state,open,go,back,close,display,
  replace(view,detail){const route=state();if(route?.id){save({...route,view,detail},'replaceState');display()}},
  dispose(){
   window.removeEventListener('popstate',restore);
   render.cleanup?.();content.replaceChildren();workspace.hidden=true;list.hidden=false;
   document.body.classList.remove('staff-record-open');
   if(state())save(null,'replaceState');
  }
 };
 return staffRoute;
}


async function renderJanuaryRoster(){
 if(staffJudgingPolicy.mode!=='all_stages_test')return;
 const panel=$('january-test-roster');
 const data=await api('january-test-roster');
 panel.replaceChildren(node('h2','1 月海選晉級名冊（TEST）'));
 const blockers={seat_limit_pending:'名額待核定',scores_incomplete:'仍有作品的評分未收齊',cutoff_tie_pending:'名額邊界同分，待核定',no_candidates:'目前沒有符合條件的作品'};
 for(const region of data.regions){
  const section=node('section');
  section.append(node('h3',region.region+' 區 · '+(region.published_at?'已確認 TEST 名冊':blockers[region.blocker]||'可確認 TEST 名冊')));
  const rows=region.selected||region.ranked||[];
  const list=node('ol');
  for(const row of rows)list.append(node('li',row.stage_name+' · Demo '+row.position+' · '+row.average+' 分'));
  section.append(list);
  if(region.incomplete?.length)section.append(node('p','待評分完成：'+region.incomplete.length+' 位','minor'));
  if(!region.published_at&&!region.blocker){
   const submit=node('button','確認 '+region.region+' 區 TEST 名冊','btn btn-soft');submit.type='button';
   submit.onclick=()=>{if(confirm('確認 TEST 名冊？確認後該區逐支評分停止。'))run(async()=>{
    await api('january-test-roster',{region:region.region});await renderJanuaryRoster();
   });};
   section.append(submit);
  }
  panel.append(section);
 }
}
const registrationStates={active:'有效',disabled:'已停用',deleted:'已刪除，可復原'};
const registrationActions={search:'查詢',audit_read:'查看操作紀錄',edit:'修改報名資料',disable:'停用報名',delete:'移至回收區',restore:'復原報名'};
const auditResults={success:'成功',conflict:'資料已更新或狀態不符',protected:'評分或晉級保護',missing:'找不到資料',invalid:'資料格式錯誤',failed:'暫時無法處理',denied:'權限拒絕'};
function clearAdminRegistrations(){
 staffBulk?.clear();
 const panel=$('organizer-admin-registrations');
 if(!panel)return;
 panel.hidden=true;panel.open=false;panel.ontoggle=null;
 $('admin-registration-search').reset();
 for(const id of ['admin-registration-results','admin-registration-list','admin-registration-pager'])$(id).replaceChildren();
}
let staffManageNavigate=null,staffManageCard=null,staffManageChanged=null,staffBulk=null;
function showAdminRegistrations(enabled){
 const panel=$('organizer-admin-registrations');
 if(!panel||!enabled){clearAdminRegistrations();return;}
 panel.hidden=false;
 const form=$('admin-registration-search'),list=$('admin-registration-list'),pager=$('admin-registration-pager');
 let offset=0;
 async function search(){
  const query=new URLSearchParams({...formValues(form),offset:String(offset)});
  const data=await api('organizer-registrations?'+query);
  if(!account||role!=='organizer'||panel.hidden)return;
  list.replaceChildren();pager.replaceChildren();
  $('admin-registration-results').textContent=data.registrations.length?'本頁 '+data.registrations.length+' 筆':'沒有符合條件的資料。';
  for(const registration of data.registrations)list.append(card(registration));
  for(const [to,label] of [[offset>0?offset-25:null,'上一頁'],[data.next_offset,'下一頁']]){
   if(to===null)continue;
   const button=node('button',label,'btn btn-soft');button.type='button';
   button.onclick=()=>run(async()=>{offset=to;await search()});pager.append(button);
  }
 }
 async function mutate(row,action,fields={}){
  try{
   const result=await api('organizer-registration-action',{id:row.id,action,version:row.version,updated_at:row.updated_at,...fields});
   if(!result.audit_id||result.registration?.id!==row.id)throw Error('admin_registration_readback_unavailable');
   await staffManageChanged?.();
   await search();
   staffManageNavigate?.({...row,...result.registration},true);
   status(sw('已儲存')+' '+sw(registrationActions[action]));
  }catch(error){
   if(error.message==='admin_registration_conflict'||error.message==='admin_registration_protected')await search();
   throw error;
  }
 }
 function card(row,expanded=false){
  if(!expanded){
   const button=staffButton(undefined,'roster-entry roster-action',()=>staffManageNavigate?.(row));
   const text=node('span',undefined,'roster-entry-text');
   text.append(node('strong',row.stage_name),node('span',row.id+' · '+sw(registrationStates[row.state]),'minor'));
   button.append(text,node('span',sw('查看選手')+' ›'));
   return button;
  }
  const item=node('article',undefined,'roster-entry');
  const info=node('div',undefined,'roster-entry-text');
  info.append(node('strong',row.stage_name),node('p',row.id+' · '+sw(registrationStates[row.state]),'minor'));
  if(row.protected)info.append(node('p',sw('已有評分或晉級。這筆資料已鎖定。'),'minor'));
  if(!row.protected&&row.state==='active'){
   const edit=node('details');edit.append(node('summary',sw(registrationActions.edit)));
   const fields=node('form');
   for(const [name,label] of [['stage_name','演出名稱／藝名'],['affiliation','學校／職業']]){
    const wrapper=node('label',sw(label),'field'),input=node('input');
    input.name=name;input.required=true;input.maxLength=120;input.value=row[name];
    wrapper.append(input);fields.append(wrapper);
   }
   const save=node('button',sw('儲存修改'),'btn btn-primary');save.type='submit';fields.append(save);
   fields.onsubmit=event=>{event.preventDefault();run(()=>mutate(row,'edit',formValues(fields)))};
   edit.append(fields);info.append(edit);
  }
  const side=node('div',undefined,'roster-entry-side');
  if(!row.protected){
   const actions=row.state==='active'?['disable','delete']:row.state==='disabled'?['delete','restore']:['restore'];
   for(const action of actions){
    const button=node('button',sw(registrationActions[action]),'btn btn-soft');button.type='button';
    button.onclick=()=>{
     if(confirm(sw('確認這項操作？')+' '+sw(registrationActions[action])))run(()=>mutate(row,action));
    };
    side.append(button);
   }
  }
  const history=node('details'),events=node('ol');
  history.append(node('summary',sw('操作紀錄')),events);
  history.ontoggle=()=>{
   if(!history.open)return;
   run(async()=>{
    const result=await api('organizer-registration-audit?id='+encodeURIComponent(row.id));
    events.replaceChildren();
    for(const event of result.events){
     const date=new Intl.DateTimeFormat('zh-TW',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Kathmandu'}).format(new Date(event.occurred_at*1000));
     const change=Object.keys(event.diff||{}).map(key=>({stage_name:'選手姓名',affiliation:'學校／職業',state:'報名狀態',status:'流程狀態'})[key]).filter(Boolean);
     events.append(node('li',[date,sw(registrationActions[event.action]),sw(auditResults[event.result]),event.actor_id,change.join('、')].filter(Boolean).join(' · ')));
    }
    if(!result.events.length)events.append(node('li',sw('目前沒有操作紀錄。')));
   });
  };
  info.append(history);item.append(info,side);return item;
 }
 staffManageCard=row=>card(row,true);
 panel.ontoggle=()=>{if(panel.open&&!list.childElementCount)run(search)};
 form.onsubmit=event=>{event.preventDefault();offset=0;run(search)};
}

function organizerState(entry){
 if(entry.video_supplement_state==='pending')return '待補件';
 return entry.approval_state==='approved'?'已核准':entry.approval_state==='pending'?'待審核':'待核對';
}
const contactViews={
 identity:['真實姓名',{full_name:'真實姓名'}],
 contact:['聯絡方式',{contact_phone:'電話',contact_email:'電子郵件',contact_handle:'常用聯絡帳號'}],
 address:['地址',{city:'城市',street_address:'街道／Tol 地址'}],
 background:['學歷與背景',{educational_background:'教育背景',short_description:'簡介',musical_training:'音樂訓練'}]
};
async function renderOrganizer(){
 clearStaffWorkspace();
 const dashboard=$('organizer-dashboard');
 dashboard.hidden=false;$('judge-dashboard').hidden=true;
 const v=await api('organizer-queue?view=workbench'),apps=v.applications||[];
 if(!account||role!=='organizer')return;
 applyStaffJudgingPolicy(v);staffTabs();
 showAdminRegistrations(v.registration_management_enabled===true);
 const january=$('january-roster-tools');
 january.hidden=staffJudgingPolicy.mode!=='all_stages_test'||!v.january_roster_enabled;
 if(!january.hidden){
  january.ontoggle=()=>{if(january.open)run(renderJanuaryRoster)};
 }
 $('pending-count').textContent=String(apps.length);
 $('scores-count').textContent=String(apps.reduce((n,a)=>n+Number(a.demo_judges||0)+Number(a.live_judges||0),0));
 $('paid-count').textContent='0';
 let toolArea=dashboard.querySelector('.staff-tools');
 if(!toolArea){
  toolArea=node('div',undefined,'staff-tools');
  dashboard.append(toolArea);
  for(const element of [$('staff-management-open'),$('organizer-corrections'),$('january-roster-tools'),dashboard.querySelector('.staff-system-note')]){
   if(element)toolArea.append(element);
  }
 }
 const holder=$('admin-apps'),pager=$('organizer-pagination'),summary=$('organizer-count');
 const search=$('organizer-search'),language=$('organizer-language'),category=$('organizer-category'),statusFilter=$('organizer-status');
 const workspace=$('organizer-entry-dialog'),panel=$('organizer-entry-content');
 const back=$('organizer-entry-back'),close=$('organizer-entry-close');
 let pageNo=staffListPages.organizer;const perPage=12;
 const viewLabels={overview:'選手總覽',songs:'歌曲與影片',song:'歌曲詳情',profile:'基本資料與照片',contact:'受控報名聯絡資料',review:'報名審核與補件'};
 const management=$('organizer-admin-registrations'),managementAnchor=node('span');
 management.before(managementAnchor);
 const managementRows=new Map();
 const nav=createStaffWorkspace('organizer',dashboard,workspace,panel,showRecord);
 staffBulk?.clear();
 staffBulk=window.GHVRegistrationBulk.create({api,t:sw,isAllowed:()=>Boolean(account&&role==='organizer'&&staffRoute===nav),onChanged:()=>staffManageChanged?.()});
 showRecord.cleanup=()=>{
  managementAnchor.after(management);management.hidden=true;
 };
 const oldDispose=nav.dispose;
 nav.dispose=()=>{oldDispose();managementAnchor.remove();staffBulk?.clear();staffManageNavigate=null;staffManageChanged=null;};
 staffManageNavigate=(row,replace=false)=>{
  managementRows.set(row.id,row);
  if(replace)nav.replace('management-entry',row.id);else nav.go('management-entry',row.id);
 };
 staffManageChanged=async()=>{
  const fresh=await api('organizer-queue?view=workbench');
  if(!account||role!=='organizer'||staffRoute!==nav)return;
  $('admin-registration-list').replaceChildren();$('admin-registration-pager').replaceChildren();
  apps.splice(0,apps.length,...fresh.applications||[]);paint();
 };
 const tools=$('staff-management-open');
 tools.hidden=!v.registration_management_enabled;
 tools.onclick=()=>nav.open({id:'_management'},tools);
 $('admin-registration-bulk-open').onclick=()=>nav.go('management-bulk');
 management.hidden=true;
 back.onclick=nav.back;close.onclick=nav.close;
 function fields(container,rows){
  const list=node('dl',undefined,'organizer-record-fields');
  list.append(...rows.map(([key,value])=>staffField(key,value)));container.append(list);
 }
 function loadSection(container,path,onData){
  const feedback=node('p',sw('正在讀取…'),'minor');feedback.setAttribute('role','status');container.append(feedback);
  api(path).then(data=>{
   if(!container.isConnected||!account||role!=='organizer')return;
   feedback.remove();onData(data);
  }).catch(error=>{
   if(!container.isConnected)return;
   const contact=path.startsWith('organizer-contact');
   feedback.textContent=sw(contact&&error.message==='contact_not_found'?'尚無這類聯絡資料。':contact?'目前無法取得授權或稽核確認。':'無法讀取資料，請稍後重試。');
   if(error.message!=='contact_not_found')container.append(staffButton(sw('重新讀取'),'btn btn-soft',()=>{container.replaceChildren();loadSection(container,path,onData)}));
  });
 }
 function showRecord(route){
  if(route.id==='_management'){
   $('organizer-entry-title').textContent=sw('報名管理與稽核');
   $('organizer-entry-step').textContent=sw('測試資料');
   back.hidden=false;
   if(route.view==='management-entry'){
    const record=node('div');panel.append(record);
    loadSection(record,'organizer-registrations?'+new URLSearchParams({q:route.detail,state:'all'}),data=>{
     const row=data.registrations?.find(row=>row.id===route.detail);
     if(row&&staffManageCard)record.append(staffManageCard(row));
     else record.append(node('p',sw('沒有符合條件的資料。')));
    });
   }else if(route.view==='management-bulk'){
    panel.append(staffBulk.render());
   }else{
    panel.append(management);management.hidden=false;
    management.open=true;management.ontoggle?.();
   }
   return;
  }
  const entry=apps.find(item=>item.id===route.id);
  if(!entry){panel.append(node('p',sw('沒有符合條件的資料。')));return;}
  const works=staffWorks(entry),step=route.view;
  const title=step==='contact-group'?contactViews[route.detail]?.[0]:viewLabels[step];
  $('organizer-entry-title').textContent=(entry.stage_name||sw('選手'))+' · '+sw(title||'選手總覽');
  const breadcrumb=$('organizer-entry-step');
  breadcrumb.textContent=sw('報名編號')+' '+staffShortId(entry);breadcrumb.title=entry.id;
  back.hidden=false;
  if(step==='overview'){
   const menu=node('nav',undefined,'organizer-record-menu');menu.setAttribute('aria-label',sw('選手總覽'));
   menu.append(
    staffStep(sw('歌曲與影片'),works.length+' '+sw('首作品'),()=>nav.go('songs')),
    staffStep(sw('基本資料與照片'),null,()=>nav.go('profile')),
    staffStep(sw('受控報名聯絡資料'),null,()=>nav.go('contact')),
    staffStep(sw('報名審核與補件'),sw(organizerState(entry)),()=>nav.go('review'))
   );
   panel.append(menu);return;
  }
  if(step==='songs'){
   const menu=node('div',undefined,'organizer-record-menu');
   works.forEach((work,index)=>{
    const button=staffStep((index+1)+' / '+works.length+' · '+work.song_title,null,()=>nav.go('song',index));
    button.dataset.songPosition=String(work.position||index+1);menu.append(button);
   });
   panel.append(menu);return;
  }
  if(step==='song'){
   const work=works[route.detail];
   if(work)staffSong(panel,work,route.detail+1,works.length);
   return;
  }
  if(step==='profile'){
   fields(panel,[['演出名稱',entry.stage_name],['報名編號',entry.id],['比賽梯次',entry.round_code],['比賽組別',staffGroup(entry)],['地區',entry.province]]);
   const photos=node('div');panel.append(photos);
   loadSection(photos,'organizer-queue?'+new URLSearchParams({view:'profile',id:entry.id}),data=>{
    if(data.profile?.id!==entry.id)return;
    const gallery=profileGallery(data.profile);
    if(gallery)photos.append(gallery);
   });
   return;
  }
  if(step==='contact'){
   const menu=node('div',undefined,'organizer-record-menu');
   for(const [key,[label]] of Object.entries(contactViews))menu.append(staffStep(sw(label),null,()=>nav.go('contact-group',key)));
   panel.append(menu);return;
  }
  if(step==='contact-group'){
   const group=contactViews[route.detail];
   if(!group)return;
   const privatePanel=node('div');privatePanel.dataset.staffContact='';panel.append(privatePanel);
   loadSection(privatePanel,'organizer-contact?'+new URLSearchParams({id:entry.id,section:route.detail}),data=>{
    if(data.section!==route.detail||!data.contact)return;
    const values=Object.entries(group[1]).map(([key,label])=>[label,data.contact[key]]);
    fields(privatePanel,values);
   });
   return;
  }
  if(step==='review'){
   fields(panel,[['報名狀態',sw(organizerState(entry))]]);
   if(entry.video_supplement_state==='pending')panel.append(node('p',supplementDeadline(entry),'minor'));
   const actions=node('div',undefined,'organizer-roster-actions');
   async function refresh(message){
    const current=(await api('organizer-queue?view=workbench')).applications?.find(item=>item.id===entry.id);
    if(!account||role!=='organizer'||staffRoute!==nav)return;
    if(current)Object.assign(entry,current);
    paint();
    if(nav.state()?.id===entry.id)nav.display({focus:false});
    status(sw(message));
   }
   if(entry.approval_state==='pending'&&entry.video_supplement_available){
    actions.append(staffButton(sw('開放 48 小時補件'),'btn btn-soft',()=>{
     if(!confirm(sw('確認通知選手後開始計算 48 小時？')))return;
     run(async()=>{await api('request-video-supplement',{application_id:entry.id});await refresh('已開放補正。')});
    }));
   }
   if(entry.approval_state==='pending'&&!['pending','expired'].includes(entry.video_supplement_state)){
    actions.append(staffButton(sw('核准測試報名'),'btn btn-primary',()=>{
     if(!confirm(sw('核准這筆測試報名？')))return;
     run(async()=>{
      const result=await api('approve-test-application',{application_id:entry.id});
      if(result.approval_state!=='approved'||result.testOnly!==true)throw Error('approval_readback_failed');
      await refresh('已核准測試報名。');
     });
    }));
   }
   panel.append(actions);
  }
 }
 function paint(){
  const q=search.value.trim().toLowerCase(),lang=language.value,cat=category.value,st=statusFilter.value;
  const found=apps.filter(entry=>{
   const works=staffWorks(entry);
   if(q&&![entry.stage_name,entry.id,staffShortId(entry),entry.round_code,...works.flatMap(work=>[work.song_title,work.original_artist])].some(value=>String(value||'').toLowerCase().includes(q)))return false;
   if(lang&&!works.some(work=>work.song_language===lang))return false;
   if(cat&&(cat==='single'?!staffGroup(entry).startsWith(sw('單一組別')):entry.category!==cat||staffGroup(entry).startsWith(sw('單一組別'))))return false;
   const judged=Number(entry.demo_judges||0)+Number(entry.live_judges||0)>0;
   return st==='scored'?judged:st==='unscored'?!judged:st==='pending'?organizerState(entry)==='待審核':st==='approved'?organizerState(entry)==='已核准':st==='supplement'?organizerState(entry)==='待補件':true;
  });
  const pages=Math.max(1,Math.ceil(found.length/perPage));
  pageNo=staffListPages.organizer=Math.min(pageNo,pages);holder.replaceChildren();
  summary.textContent=sw('符合資料')+' '+found.length+' / '+apps.length;
  if(!found.length)holder.append(node('p',sw('沒有符合條件的資料。')));
  for(const entry of found.slice((pageNo-1)*perPage,pageNo*perPage)){
   const card=node('article',undefined,'roster-entry organizer-roster-entry organizer-record-row');
   const open=staffButton(undefined,'organizer-record-open',()=>nav.open(entry,open));open.dataset.applicationId=entry.id;
   open.setAttribute('aria-label',sw('查看選手')+' '+(entry.stage_name||sw('選手'))+' '+staffShortId(entry));
   const info=node('span',undefined,'roster-entry-text');
   const shownId=found.some(other=>other.id!==entry.id&&staffShortId(other)===staffShortId(entry))?entry.id:staffShortId(entry);
   const id=node('span',shownId,'roster-mini staff-entry-id');id.title=entry.id;
   info.append(node('strong',entry.stage_name||sw('選手')),id,node('span',[entry.round_code,staffGroup(entry),staffWorks(entry).length+' '+sw('首作品')].filter(Boolean).join(' · '),'roster-mini'));
   open.append(info,node('span',sw('查看選手')+' ›','organizer-record-arrow'));
   const state=organizerState(entry),badge=node('span',sw(state),'pill '+(state==='已核准'?'pill-pass':'pill-warn'));
   const side=node('div',undefined,'organizer-record-status');side.append(badge);
   card.append(open,side);holder.append(card);
  }
  makeRosterPager(pager,pageNo,pages,p=>{pageNo=p;paint()});
 }
 search.oninput=()=>{pageNo=1;paint()};
 for(const control of [language,category,statusFilter])control.onchange=search.oninput;
 paint();
 window.staffRelocalize=()=>{paint();nav.display({focus:false})};

 const correctionPanel=$('organizer-corrections'),correctionList=$('organizer-correction-list');
 if(correctionPanel&&correctionList){
  correctionList.replaceChildren();
  try{
   const reqs=await api('organizer-corrections');
   correctionPanel.hidden=!reqs.enabled;
   if(reqs.enabled){
    const pending=(reqs.requests||[]).filter(x=>x.state==='pending');
    correctionPanel.querySelector('[data-correction-count]').textContent='待審 '+pending.length+' 筆';
    if(!pending.length)correctionList.append(node('p','目前沒有待審更正申請。','minor'));
    for(const c of pending){
     const card=node('article',undefined,'roster-entry');
     card.append(node('strong','報名編號：'+c.application_id));
     card.append(node('p','姓名：'+c.previous_stage_name+' → '+c.proposed_stage_name,'minor'));
     card.append(node('p','學校／職業：'+c.previous_affiliation+' → '+c.proposed_affiliation,'minor'));
     card.append(node('p','更正原因：'+c.reason,'minor'));
     card.append(node('p','已評分作品、影片與分數不受此更正影響。','minor'));
     for(const [decision,label] of [['accepted','同意更正基本資料'],['declined','不接受更正']]){
      const btn=node('button',label,'btn btn-soft');btn.type='button';
      btn.onclick=()=>{if(!confirm('確認'+label+'？本次操作會保留稽核紀錄。'))return;
       run(async()=>{
        const result=await api('decide-member-correction',{request_id:c.id,decision});
        if(result.decision!==decision)throw Error('readback_mismatch');
        await renderOrganizer();status('更正申請已處理：'+label);
       });
      };
      card.append(btn);
     }
     correctionList.append(card);
    }
   }
  }catch{correctionPanel.hidden=true;}
 }
}

async function renderJudge(){
 clearStaffWorkspace();clearStaffContact();clearAdminRegistrations();
 $('organizer-correction-list').replaceChildren();
 $('organizer-dashboard').hidden=true;$('judge-dashboard').hidden=false;
 const v=await api('reviewer-queue?view=workbench');
 applyStaffJudgingPolicy(v);staffTabs();
 const queue=(v.queue||[]).filter(entry=>staffJudgingPolicy.mode==='all_stages_test'||entry.phase==='final');
 if(!account||role!=='reviewer')return;
 const list=$('judge-list'),pager=$('judge-pagination'),summary=$('judge-count');
 const search=$('judge-search'),filter=$('judge-status');
 const roster=$('judge-roster-panel'),workspace=$('judge-detail'),content=$('judge-queue');
 const back=$('judge-back-step'),close=$('judge-back-list');
 const drafts=new Map(),requests=new Set();
 const keyOf=(entry,position)=>entry.id+'|'+(entry.phase||'demo')+'|'+position;
 const navigation=createStaffWorkspace('reviewer',roster,workspace,content,showWork);
 const leaving=event=>{if(drafts.size||requests.size){event.preventDefault();event.returnValue=''}};
 window.addEventListener('beforeunload',leaving);
 const dispose=navigation.dispose;
 navigation.dispose=()=>{
  dispose();drafts.clear();requests.clear();window.removeEventListener('beforeunload',leaving);
 };
 back.onclick=navigation.back;close.onclick=navigation.close;
 let pageNo=staffListPages.reviewer;const perPage=10;
 function songs(entry){
  const works=staffWorks(entry);
  if((entry.phase||'demo')==='demo')return works;
  return [{position:1,song_title:entry.song_title,original_artist:entry.original_artist,song_language:entry.song_language}];
 }
 function progress(entry){
  const items=songs(entry);
  if(!entry.per_video_scoring)return sw(scoredByJudge(entry)?'已評分':'待評分');
  return items.filter(work=>work.my_score).length+' / '+items.length+' · '+sw('已評分');
 }
 function paint(){
  const q=search.value.trim().toLowerCase(),st=filter.value;
  const found=queue.filter(entry=>{
   if(st==='scored'&&!scoredByJudge(entry)||st==='unscored'&&scoredByJudge(entry))return false;
   return !q||[entry.stage_name,entry.id,staffShortId(entry),entry.round_code,...songs(entry).flatMap(work=>[work.song_title,work.original_artist])].some(x=>String(x||'').toLowerCase().includes(q));
  });
  const pages=Math.max(1,Math.ceil(found.length/perPage));
  pageNo=staffListPages.reviewer=Math.min(pageNo,pages);list.replaceChildren();
  summary.textContent=sw('符合資料')+' '+found.length+' / '+queue.length;
  if(!found.length)list.append(node('p',sw('沒有符合條件的資料。')));
  for(const entry of found.slice((pageNo-1)*perPage,pageNo*perPage)){
   const row=staffButton(undefined,'roster-entry roster-action',()=>navigation.open(entry,row));
   row.dataset.applicationId=entry.id;
   const body=node('span',undefined,'roster-entry-text');
   body.append(node('strong',entry.stage_name||sw('選手')));
   const shownId=found.some(other=>other.id!==entry.id&&staffShortId(other)===staffShortId(entry))?entry.id:staffShortId(entry);
   const id=node('span',shownId,'roster-mini staff-entry-id');id.title=entry.id;
   body.append(id,node('span',[entry.round_code,staffGroup(entry)].filter(Boolean).join(' · '),'roster-mini'));
   if(songs(entry).some(work=>drafts.has(keyOf(entry,work.position))))body.append(node('span',sw('有尚未儲存的分數'),'minor'));
   row.append(body,node('span',progress(entry),'pill'));list.append(row);
  }
  makeRosterPager(pager,pageNo,pages,p=>{pageNo=p;paint()});
 }
 function showWork(route){
  const entry=queue.find(item=>item.id===route.id);
  if(!entry){content.append(node('p',sw('沒有符合條件的資料。')));return}
  const phase=entry.phase||'demo',works=songs(entry),demo=phase==='demo';
  const heading=node('h2',entry.stage_name||sw('選手'));
  content.append(heading,node('p',[staffShortId(entry),entry.round_code,staffGroup(entry),sw(demo?'線上海選':phase==='qualifier'?'現場初賽':'決賽'),progress(entry)].join(' · '),'minor judge-demo-progress'));
  if(route.view==='overview'){
   const menu=node('div',undefined,'organizer-record-menu');
   works.forEach((work,index)=>{
    const position=work.position||index+1;
    const stored=entry.per_video_scoring?work.my_score:scoredByJudge(entry);
    const label=(index+1)+' / '+works.length+' · '+(work.song_title||sw('現場評分'));
    const state=sw(stored?'已評分':drafts.has(keyOf(entry,position))?'有尚未儲存的分數':'待評分');
    const button=staffStep(label,state,()=>navigation.go('song',position));
    button.dataset.songPosition=String(position);menu.append(button);
   });
   content.append(menu);return;
  }
  const position=route.detail,index=works.findIndex((work,i)=>(work.position||i+1)===position);
  if(index<0)return;
  const work=works[index];
  staffSong(content,work,index+1,works.length);
  if(demo&&works.length>1&&!entry.per_video_scoring){
   content.append(node('p',sw('目前僅能觀看作品。'),'notice'));return;
  }
  const single=entry.per_video_scoring&&demo;
  const criteria=demo?[['technique','技巧',60],['interpretation','表現',40]]:
   [['technique','技巧',40],['interpretation','表現',30],['stage_presence','台風',20],['appearance','儀容',10]];
  const key=keyOf(entry,position);
  function readStored(record){
   if(single)return record.demo_entries?.find((item,index)=>(item.position||index+1)===position)?.my_score||null;
   const prefix=demo?'demo_':'live_';
   if(record[prefix+'technique']==null)return null;
   return {technique:record[prefix+'technique'],interpretation:record[prefix+'interpretation'],stage_presence:record.stage_presence,appearance:record.appearance};
  }
  const prior=readStored(entry);
  if(prior){
   const sum=criteria.reduce((total,[name])=>total+Number(prior[name]||0),0);
   const saved=node('p',sw('已儲存')+' · '+sum+' '+sw('分'),'judge-saved-confirmation');
   saved.setAttribute('role','status');content.append(saved);return;
  }
  const draft=drafts.get(key);
  const form=node('form',undefined,'form-grid judge-score-form');
  if(single)form.dataset.demoPosition=String(position);
  form.setAttribute('aria-label',sw('評分')+' '+position);
  for(const [name,label,max] of criteria){
   const field=node('label',undefined,'field'),input=node('input');
   input.name=name;input.type='number';input.inputMode='numeric';input.min='0';input.max=String(max);input.step='1';input.required=true;
   input.value=draft?.values[name]??'';
   field.append(node('span',sw(label)+'（0–'+max+'）'),input);form.append(field);
  }
  const declaration=node('label',undefined,'check'),check=node('input');
  check.type='checkbox';check.name='conflict';check.required=true;check.checked=draft?.checked===true;
  declaration.append(check,node('span',sw('我確認此次評分沒有利益衝突。')));form.append(declaration);
  const feedback=node('p',undefined,'judge-save-feedback');feedback.setAttribute('role','status');
  const save=node('button',sw('儲存評分'),'btn btn-primary judge-score-submit');save.type='submit';
  const lookup=staffButton(sw('查詢是否已儲存'),'btn btn-soft judge-score-check',checkServer);lookup.id='judge-save-check';
  const actions=node('div',undefined,'staff-score-actions');
  actions.append(save,lookup);form.append(feedback,actions);content.append(form);
  function capture(){
   const current={values:formValues(form),checked:check.checked,uncertain:drafts.get(key)?.uncertain===true};
   drafts.set(key,current);return current;
  }
  function indicator(message,state){
   feedback.textContent=message?sw(message):'';feedback.dataset.state=state||'';
   const running=requests.has(key),uncertain=Boolean(drafts.get(key)?.uncertain);
   form.querySelectorAll('input').forEach(input=>{input.disabled=running});
   save.disabled=running||uncertain;save.textContent=sw(running?'正在儲存…':'儲存評分');
   lookup.hidden=!uncertain;lookup.disabled=running;
  }
  if(requests.has(key))indicator('正在儲存…','pending');
  else if(draft?.uncertain)indicator('伺服器未確認分數。輸入內容已保留，請先查詢再重試。','error');
  else indicator();
  form.oninput=capture;
  function scoresEqual(score,values){
   return criteria.every(([name])=>score?.[name]!=null&&Number(score[name])===Number(values[name]));
  }
  async function readback(){
   const response=await api('reviewer-queue?'+new URLSearchParams({view:'workbench',id:entry.id}));
   const row=response.queue?.find(item=>item.id===entry.id&&(item.phase||'demo')===phase);
   if(!row||(single&&!row.demo_entries?.some((item,index)=>(item.position||index+1)===position)))throw Error('score_readback_unavailable');
   return row;
  }
  function confirmed(row,message){
   if(staffRoute!==navigation||!account||role!=='reviewer')return;
   if(single)work.my_score=readStored(row);
   else Object.assign(entry,row);
   drafts.delete(key);requests.delete(key);paint();
   const current=navigation.state();
   if(current?.id===entry.id&&current.detail===position){
    navigation.display({focus:false});
    const receipt=content.querySelector('.judge-saved-confirmation');
    if(receipt&&message)receipt.textContent=sw(message)+' · '+receipt.textContent;
   }
  }
  function notify(message){
   if(form.isConnected)indicator(message,'error');
   else if(staffRoute===navigation&&navigation.state()?.id===entry.id&&navigation.state()?.detail===position){
    navigation.display({focus:false});
    const current=content.querySelector('.judge-save-feedback');
    if(current)current.textContent=sw(message);
   }
  }
  async function checkServer(){
   if(requests.has(key))return;
   requests.add(key);indicator('正在讀取…','pending');
   try{
    const row=await readback();
    if(readStored(row)){
     const exact=scoresEqual(readStored(row),drafts.get(key)?.values||{});
     confirmed(row,exact?'':'原有分數與本次輸入不同，本次分數未覆寫。');return;
    }
    const pending=drafts.get(key);if(pending)pending.uncertain=false;
    requests.delete(key);
    notify('未查到已儲存的分數，可以重新送出。');
   }catch{
    requests.delete(key);notify('伺服器未確認分數。輸入內容已保留，請先查詢再重試。');
   }
  }
  form.onsubmit=async event=>{
   event.preventDefault();
   if(requests.has(key)||drafts.get(key)?.uncertain)return;
   if(navigator.onLine===false){indicator('目前離線，分數尚未送出。','error');return}
   const pending=capture(),payload={application_id:entry.id,no_conflict:pending.checked,...(single?{position}:{phase})};
   for(const [name] of criteria)payload[name]=Number(pending.values[name]);
   requests.add(key);indicator('正在儲存…','pending');
   try {
    const saved=await api(single?'january-video-score':'score',payload);
    const sum=criteria.reduce((total,[name])=>total+payload[name],0);
    if(saved.score!==sum||(single?saved.position!==position:saved.phase!==phase))throw Error('score_readback_unavailable');
    const row=await readback();
    if(!scoresEqual(readStored(row),payload))throw Error('score_readback_unavailable');
    confirmed(row);return;
   }catch{
    if(staffRoute===navigation){
     pending.uncertain=true;drafts.set(key,pending);
    }
   }finally{
    requests.delete(key);
    if(drafts.get(key)?.uncertain)notify('伺服器未確認分數。輸入內容已保留，請先查詢再重試。');
   }
  };
 }
 search.oninput=()=>{pageNo=1;paint()};filter.onchange=search.oninput;
 paint();window.staffRelocalize=()=>{paint();navigation.display({focus:false})};
}


if(page==='member'){
 role='member';setupAuth();
 $('member-manage-delete')?.addEventListener('click',()=>{
  if(!account||account.role!=='member'){status('請先登入本人會員帳號。',true);return;}
  if(!confirm('刪除測試會員將永久清除你的測試帳號、報名與相關資料；這項操作無法復原。確定繼續？'))return;
  const phrase=prompt('最後確認：請輸入 DELETE，才會刪除你的測試帳號。');
  if(phrase!=='DELETE'){status('已取消刪除。未修改任何資料。');return;}
  run(async()=>{
   const result=await api('delete-my-data',{});
   if(result.deletedTestData!==true)throw Error('readback_mismatch');
   account=null;challenge=null;authUI(false);authForms(true);
   status('已刪除你的測試會員與相關測試報名資料。');
  });
 });
 window.addEventListener('ghv:languagechange',()=>{
  document.querySelectorAll('.song-language-other').forEach(input=>{
   input.setAttribute('aria-label',mt('songLangOtherLabel'));
  });
  if(account&&account.role==='member'){if(document.querySelector('[data-editing]'))return;renderMember().catch(e=>status(friendlyError(e),true))}
 });
 $('eligibility-upload-submit')?.addEventListener('click',()=>{
  const file=$('eligibility-upload-file')?.files?.[0];
  const button=$('eligibility-upload-submit');
  if(!eligibilityUploadEnabled||!button?.dataset.applicationId){
   status(mt('proofUploadNotReady'),true);return;
  }
  if(!file||!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size<100||file.size>5*1024*1024){
   status(mt('proofUploadInvalid'),true);return;
  }
  if(!confirm(mt('proofUploadConfirm')))return;
  run(async()=>{
   const url='/api/e2e/demo-upload?kind=eligibility&application='+encodeURIComponent(button.dataset.applicationId);
   const response=await fetch(url,{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':file.type},body:file,cache:'no-store'});
   let result;
   try{result=await response.json()}catch{throw new Error('proof_upload_failed')}
   if(!response.ok||result.ok!==true||result.kind!=='eligibility'||result.private!==true||result.stored!==true)
    throw new Error(result.error||'proof_upload_failed');
   const check=await api('applications');
   const own=(check.applications||[]).find(a=>a.id===button.dataset.applicationId);
   if(!own?.has_eligibility_file)throw new Error('readback_mismatch');
   $('eligibility-upload-file').value='';
   await renderMember();
   status(mt('proofUploadDone'));
  });
 });
const application=$('application-form'),details=$('application-details'),start=$('start-application');
 prepareLanguageSelects(application);
 $('demo-add')?.addEventListener('click',addDemoSlot);
 document.querySelectorAll('[data-demo-remove]').forEach(button=>{
  button.addEventListener('click',()=>removeDemoSlot(button.closest('[data-demo-slot]')));
 });
 updateDemoCount();
 // No second click: for a member without an entry, the form is already visible.
 // This optional CTA is now only a shortcut to the expanded registration form.
 start?.addEventListener('click',()=>{
  if(details.hidden)return;
  details.scrollIntoView({block:'start',behavior:'smooth'});
  setTimeout(()=>application.querySelector('[name=stage_name]')?.focus({preventScroll:true}),180);
 });
 application.addEventListener('submit',e=>{e.preventDefault();
 const selectedDemos=collectDemoEntries(application);
 const multiAllowed=fiveDemoEnabled&&(!fiveDemoJanuaryOnly||application.elements.namedItem('round_code')?.value==='2027-01');
 if(selectedDemos.length>1&&!multiAllowed){
  status(mt('demoMultiCannotSave'),true);
  $('demo-storage-notice')?.scrollIntoView({block:'center',behavior:'smooth'});
  return;
 }
 run(async()=>{
 const v=formValues(application);v.song_language=songLanguageValue(application.querySelector('[name="song_language"]'));
 const data={...v,frontline_2027:frontlineFormEnabled,video_confirmed:application.querySelector('[name=video_confirmed]')?.checked===true,profile_consent:application.querySelector('[name=profile_consent]')?.checked===true,adult_confirmed:application.querySelector('[name=adult_confirmed]').checked,student_confirmed:application.querySelector('[name=student_confirmed]').checked,nonreligious_song_ack:application.querySelector('[name=nonreligious_song_ack]')?.checked===true,no_exclusive_contract:application.querySelector('[name=no_exclusive_contract]').checked};
 for(const key of Object.keys(data))if(/^demo_[2-5]_(title|artist|language|url)$/.test(key))delete data[key];
 if(multiAllowed)data.demo_entries=selectedDemos;
 const saved=await api('applications',data);application.reset();demoSlots().forEach(card=>removeDemoSlot(card));
 application.querySelectorAll('select[name$="_language"],select[name="song_language"]').forEach(select=>select._syncOtherLanguage?.());toggle();
 status('✓ '+mt('saved')+' '+mt('entryId')+': '+saved.application_id);await renderMember()})});
 const toggle=()=>{const community=$('category').value==='community',modern=frontlineFormEnabled;const adult=application.querySelector('[name=adult_confirmed]'),student=application.querySelector('[name=student_confirmed]');$('community-statement').hidden=modern||!community;$('university-statement').hidden=modern||community;adult.required=!modern&&community;student.required=!modern&&!community;if(modern){adult.checked=false;student.checked=false;}else if(community)student.checked=false;else adult.checked=false;};
 $('category').addEventListener('change',toggle);toggle();
 // The #register deep link is handled by the same always-visible registration section.
 loadSession();
}else if(page==='back'){
 window.addEventListener('ghv:languagechange',()=>{applyStaffJudgingPolicy();staffTabs();if(account)window.staffRelocalize?.()});
 setupAuth();staffTabs();document.querySelectorAll('[data-role-tab]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.roleTab;if(next===role||!account)return;run(async()=>{const v=await api('switch-role',{role:next});const updated=await api('me');account=updated.account||v.account;role=account.role;trackStaffSession(updated);staffTabs();await dashboard();status('已切換為'+(role==='organizer'?'主辦方':'評審')+'。')})}));loadSession();
}
// Deep links to a rules topic should open it, rather than show a closed summary.
function setupRuleNavigation(){
 const openRuleFromHash=(fromClick=false)=>{
  let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return;}
  const row=id?document.getElementById(id):null;
  if(!row||!row.matches('details.news-row'))return;
  row.open=true;
  requestAnimationFrame(()=>{
   row.scrollIntoView({block:'start',behavior:'auto'});
   if(fromClick)row.querySelector('summary')?.focus({preventScroll:true});
  });
 };
 window.addEventListener('hashchange',()=>openRuleFromHash(true));
 // A second tap on the same hash must still reopen its disclosure.
 document.querySelectorAll('.news-quick-grid>a, .award-followups a').forEach(link=>{
  link.addEventListener('click',()=>{
   const hash=link.getAttribute('href')||'';
   const row=hash.startsWith('#')?document.getElementById(decodeURIComponent(hash.slice(1))):null;
   if(!row||!row.matches('details.news-row'))return;
   row.open=true;
   requestAnimationFrame(()=>{
    row.scrollIntoView({block:'start',behavior:'auto'});
    row.querySelector('summary')?.focus({preventScroll:true});
   });
  });
 });
 openRuleFromHash(false);
}
})();
