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

Object.assign(translations.en,{rewardsEyebrow:"2027 · Awards",rewardsTitle:"A stage for every voice.",rewardsTop:"Each category: 1 first prize NPR 45,000; 3 second prizes of NPR 22,000 each; 5 third prizes of NPR 11,000 each.",rewardsVoucher:"Dining voucher for every officially paid, eligibility-approved entrant; one per person per year, non-cash, subject to voucher terms.",rewardsStatus:"2027 contest rules preview only. Official registration, payments and voucher redemption are not yet open.",rewardsLink:"Explore awards and judging ↗"});
Object.assign(translations.ne,{rewardsEyebrow:"२०२७ · पुरस्कार",rewardsTitle:"हरेक स्वरलाई आफ्नै मञ्च।",rewardsTop:"प्रत्येक समूहमा पहिलो पुरस्कार १ जनालाई NPR 45,000, दोस्रो ३ जनालाई जनही NPR 22,000 र तेस्रो ५ जनालाई जनही NPR 11,000।",rewardsVoucher:"आधिकारिक रूपमा शुल्क तिरेर योग्य ठहरिएका प्रत्येक सहभागीलाई वार्षिक एक भोजन छुट कुपन। नगदमा बदल्न मिल्दैन; कुपनका सर्त लागू हुन्छन्।",rewardsStatus:"२०२७ को नियमसम्बन्धी प्रारम्भिक जानकारी मात्र। आधिकारिक दर्ता, शुल्क भुक्तानी वा कुपन वितरण खुलेको छैन।",rewardsLink:"पुरस्कार र मूल्याङ्कन नियम हेर्नुहोस् ↗"});
Object.assign(translations.zh,{rewardsEyebrow:"2027 · 比賽獎項",rewardsTitle:"讓努力被看見，讓歌聲有舞台。",rewardsTop:"大學組、社會組各設第一名 1 位 NPR 45,000、第二名 3 位各 NPR 22,000、第三名 5 位各 NPR 11,000。",rewardsVoucher:"餐飲折抵券：正式完成繳費並通過資格審核者，每人每年度限領 1 張；不折現，依券面條款使用。",rewardsStatus:"以上為 2027 年度比賽辦法資訊；正式報名、付款及領券尚未開放。",rewardsLink:"查看獎項與評選規則 ↗"});

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
Object.assign(translations.zh,{"entryFeeLabel":"2027年1月線上海選","entryFeeAmount":"免費","entryFeeNote":"每人最多5支60–90秒Demo；2月12日第一次初選免費，3月5日第二次初選每人 NPR 300，3月12日晉級PK每人 NPR 500。","entryFeeStatus":"目前僅供測試；正式報名、多支影片送出與收款尚未開放。","rewardsTop":"單一組別：第一名1位 NPR 50,000、第二名3位各 NPR 30,000、第三名5位各 NPR 15,000；總決賽10名選手另各得入圍獎金 NPR 20,000。","rewardsVoucher":"餐飲折抵券：完成第二次初選繳費並通過資格審核者，每人每季度限領1張；不折現，使用條件及期限另行公告。"});
Object.assign(translations.en,{"entryFeeLabel":"January 2027 online audition","entryFeeAmount":"FREE","entryFeeNote":"Up to five 60–90-second Demos per person. First selection on Feb 12 is free; second selection on Mar 5 is NPR 300 per person; Mar 12 PK round is NPR 500 per person.","entryFeeStatus":"TEST preview only. Official registration, multi-video submission and real payments are not open.","rewardsTop":"One division: first prize NPR 50,000 (1 winner); second prize NPR 30,000 each (3); third prize NPR 15,000 each (5). Ten finalists also receive NPR 20,000 each.","rewardsVoucher":"NPR 10,000 dining voucher: one per eligible person per quarter after paying for the second selection round. Not redeemable for cash; terms and dates to be announced."});
Object.assign(translations.ne,{"entryFeeLabel":"जनवरी २०२७ अनलाइन प्रारम्भिक छनोट","entryFeeAmount":"निःशुल्क","entryFeeNote":"प्रति व्यक्ति ६०–९० सेकेन्डका बढीमा ५ डेमो। फेब्रुअरी १२ को पहिलो छनोट निःशुल्क; मार्च ५ को दोस्रो छनोट प्रति व्यक्ति NPR 300; मार्च १२ को PK चरण प्रति व्यक्ति NPR 500।","entryFeeStatus":"परीक्षण वेबसाइट मात्र। आधिकारिक दर्ता, धेरै भिडियो पठाउने सुविधा र वास्तविक भुक्तानी खुलेका छैनन्।","rewardsTop":"एउटै समूह: पहिलो पुरस्कार १ जनालाई NPR 50,000; दोस्रो ३ जनालाई जनही NPR 30,000; तेस्रो ५ जनालाई जनही NPR 15,000। १० फाइनलिस्टलाई थप जनही NPR 20,000।","rewardsVoucher":"दोस्रो छनोट चरणको शुल्क बुझाई योग्यता स्वीकृत भएकालाई प्रति व्यक्ति प्रति त्रैमासिक एक NPR 10,000 भोजन छुट कुपन। नगदमा साट्न मिल्दैन; सर्तहरू पछि घोषणा गरिनेछन्।"});

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
if(page==='news'||page==='announcements')return;
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
const statusBox=$(prefix+'-status');
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

 const errors={self_review_disallowed:'同一信箱不能評自己的參賽作品，請由其他獨立評審評分。',too_many_code_requests:'驗證信已達次數限制，請稍候再試；登入後切換已授權身分不必重新寄信。',e2e_not_configured:'目前尚未開通 Email 驗證服務，無法登入。正式系統需先完成寄信設定。',test_email_service_unavailable:'寄信服務目前不可使用，請稍後或確認平台設定。',not_on_test_allowlist:'此 Email 尚未獲授權，目前只接受受邀帳號。',expired_or_invalid_code:'驗證碼錯誤或已過期，請重新取得。',login_required:'請先登入。',organizer_only:'這個帳號不是主辦單位，無權查看管理資料。',reviewer_only:'這個帳號不是評審，無權打分。',member_only:'此帳號並非會員。',update_locked:'這筆資料已進入審核或模擬繳費階段，無法直接修改。',delete_locked:'這筆資料已進入評審或後續流程，無法直接刪除。',invalid_demo_url:'請輸入有效的公開作品連結。',annual_category_locked:'年度組別已鎖定。',already_scored_or_unavailable:'你已評過這位選手，不能重複給分。'};return errors[e?.message]||('目前無法完成操作（'+(e?.message||'連線失敗')+'）。')}
async function api(path,body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{const r=await fetch('/api/e2e/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:c.signal});const data=await r.json();if(!r.ok||data.ok!==true)throw new Error(data.error||('HTTP '+r.status));return data}finally{clearTimeout(timer)}}
async function run(fn){if(busy)return;busy=true;document.body.classList.add('requesting');try{await fn()}catch(e){status(friendlyError(e),true)}finally{busy=false;document.body.classList.remove('requesting')}}
function authUI(signedIn){
 (staff?$('back-signin'):$('signin-panel')).hidden=signedIn;
 $(prefix+'-dashboard')?.setAttribute('hidden','');
 if(staff)$('back-dashboard').hidden=!signedIn;
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
 // Members can practice typing with synthetic fields. This is NOT D1 storage.
 // The backend and form submit both fail closed until a reviewed D1 migration.
 box.disabled=false;
 box.dataset.mode=museFormEnabled?'storage':'preview';
 for(const input of box.querySelectorAll('input,textarea,select')){
  input.required=museFormEnabled;
  input.autocomplete='off';
 }
 if(notice){
  notice.dataset.l=museFormEnabled?'museEnabled':'musePreview';
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
function staffTabs(){
 const roles=account?.available_roles||[account?.role];
 document.querySelector('.role-tabs')?.toggleAttribute('hidden',!account);
 document.querySelectorAll('[data-role-tab]').forEach(b=>{b.hidden=!roles.includes(b.dataset.roleTab);b.classList.toggle('active',b.dataset.roleTab===role)});
}
async function loadSession(){try{
 let v=await api('me');
 const granted=v.account.available_roles||[v.account.role];
 const target=staff?(granted.includes('organizer')?'organizer':granted.includes('reviewer')?'reviewer':null):'member';
 if(!target||!granted.includes(target)){account=null;authUI(false);staffTabs();return;}
 if((staff&&!['organizer','reviewer'].includes(v.account.role))||(!staff&&v.account.role!=='member')){
  v=await api('switch-role',{role:target});
  if(!staff)v=await api('me');
 }
 account=v.account;role=account.role;authUI(true);
 if(staff)staffTabs();else{
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
   requestAnimationFrame(()=>registration.scrollIntoView({block:'start',behavior:'auto'}));
  }
 }
 }catch(e){account=null;authUI(false);if(staff)staffTabs();if(e.message==='e2e_not_configured')status(friendlyError(e),true)}}
function setupAuth(){
const mailForm=$(prefix+'-email-form'),codeForm=$(prefix+'-code-form');
let challengeEmail,publicTest=false,humanToken,widgetId,widgetTimer,widgetScript;
const humanBox=$('signup-human-status'),retryButton=$('signup-human-retry');
const sendButton=mailForm?.querySelector('button[type="submit"]');
let widgetLoading=false;
function humanState(key,kind='pending'){
 if(!humanBox)return;
 humanBox.hidden=false;
 humanBox.dataset.l=key;
 humanBox.dataset.state=kind;
 humanBox.textContent=mt(key);
 if(retryButton)retryButton.hidden=kind!=='error';
 if(publicTest&&sendButton)sendButton.disabled=!humanToken;
}
function clearHumanToken(){humanToken=undefined;if(publicTest&&sendButton)sendButton.disabled=true}
function humanError(code){
 clearTimeout(widgetTimer);widgetLoading=false;clearHumanToken();
 humanState('signupHumanBlocked','error');
 // A public Cloudflare error code helps diagnosis; do not log the widget token or keys.
 if(code&&/^\d{4,7}$/.test(String(code)))humanBox.textContent+=' (CF '+code+')';
}
function renderHumanWidget(siteKey){
 const widget=$('signup-turnstile');
 try{
  if(!window.turnstile||typeof window.turnstile.render!=='function')throw Error('widget_unavailable');
  // The async script's load event makes render available. Turnstile.ready rejects async scripts.
  widgetId=window.turnstile.render(widget,{
   sitekey:siteKey,size:widget.clientWidth<300?'compact':'normal',appearance:'always',theme:'light',
   action:'ghv_signup','response-field':false,
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
const signupConfig=staff?Promise.resolve():api('signup-config').then(config=>{
 if(config.mode!=='public_test'||typeof config.siteKey!=='string')return;
 publicTest=true;
 const notice=$('signup-mode');
 notice.dataset.l='signupPublicTest';
 notice.textContent=mt('signupPublicTest');
 for(const [id,key] of [['member-auth-intro','signupPilotIntro'],['email-legacy-summary','signupPilotEmail']]){
  const copy=$(id);if(copy){copy.dataset.l=key;copy.textContent=mt(key);}
 }
 retryButton?.addEventListener('click',()=>{
  if(widgetId!==undefined&&window.turnstile?.remove){
   try{window.turnstile.remove(widgetId)}catch{}
  }
  beginHumanWidget(config.siteKey);
 });
 beginHumanWidget(config.siteKey);
}).catch(()=>{});
mailForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 await signupConfig;
 if(publicTest&&!humanToken){
  status(mt('signupHumanRequired'),true);
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
 status(staff?'驗證信已要求寄送，請查看 Email（僅限受邀測試帳號）。':mt(publicTest?'signupCodeRequested':'otpRequested'));
 codeForm.querySelector('input').focus();
})});
codeForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 const code=String(formValues(codeForm).code||'').trim();
 await api('verify-code',{challenge_id:challenge,code,email:challengeEmail});
 challengeEmail=undefined;
 codeForm.reset();
 await loadSession();
 if(account)status(staff?'已登入。':mt('signedIn'));
})});
const change=$(staff?'back-change':'change-mail');change?.addEventListener('click',()=>{authForms(true);challenge=null;challengeEmail=undefined;codeForm.reset();statusBox.hidden=true});
$(prefix+'-logout')?.addEventListener('click',()=>run(async()=>{await api('logout',{});account=null;authUI(false);if(staff)staffTabs();challenge=null;authForms(true);status(page==='member'?mt('signedOut'):'已登出。')}));
}
async function dashboard(){if(!account)return;if(staff){if(role==='organizer')await renderOrganizer();else await renderJudge()}else await renderMember()}
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
 box.append(node('span',a.round_code==='2027-01'&&a.payment_status!=='simulated_paid'?'FREE · NPR 0 · 海選免費':mt(a.payment_status==='simulated_paid'?'testPaid':'testPending'),'pill '+(a.round_code==='2027-01'||a.payment_status==='simulated_paid'?'pill-pass':'pill-warn')));
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
  const paid=first.payment_status==='simulated_paid';
  $('member-state-payment').textContent=first.round_code==='2027-01'&&!paid?'FREE · NPR 0 · 海選免費':mt(paid?'statusSimulatedPaid':'testPending');
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
 const paidEntry=rows.find(a=>a.payment_status==='simulated_paid');
 const done=$('test-completion');
 if(done){
  done.hidden=!paidEntry;
  const completion=paidEntry?.approval_state==='pending'?mt('paymentAwaitingApproval'):paidEntry?.approval_state==='approved'?mt('approvalAccepted'):mt('testComplete');
  done.textContent=paidEntry?'✓ '+completion+' · '+mt('noCharge'):'';
 }
 $('step-login')?.classList.add('active');
 $('step-apply')?.classList.toggle('active',hasEntries);
 $('step-checkout')?.classList.toggle('active',Boolean(paidEntry));
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
 const previous=node('button','上一頁','btn btn-soft');previous.type='button';previous.disabled=page<=1;
 previous.onclick=()=>onPage(page-1);
 const next=node('button','下一頁','btn btn-soft');next.type='button';next.disabled=page>=totalPages;
 next.onclick=()=>onPage(page+1);
 const label=node('span','第 '+page+' / '+totalPages+' 頁','minor');
 target.append(previous,label,next);
}
function scoredByJudge(a){
 const phase=a.phase||'demo';
 const first=phase==='demo'?a.demo_technique:a.live_technique;
 return first!==null&&first!==undefined;
}
function staffDemoList(application,scoreForm){
 const demos=application.demo_entries;
 if(!Array.isArray(demos)||!demos.length)return null;
 const list=node('ol',undefined,'staff-demo-list');
 list.setAttribute('aria-label','參賽 Demo');
 for(const [index,demo] of demos.entries()){
  const item=node('li');
  item.append(node('strong',(index+1)+'／'+demos.length+' · '+demo.song_title));
  item.append(node('p','原唱 '+demo.original_artist+' · '+demo.song_language,'minor'));
  if(application.approval_state)item.append(node('p',application.approval_state==='approved'?'主辦已核准報名':'待主辦核准報名','minor'));
  const url=safeLink(demo.demo_url);
  if(url){
   const link=node('a','觀看影片 ↗','small-link');link.href=url;link.target='_blank';link.rel='noopener noreferrer';
   link.setAttribute('aria-label','觀看第 '+(index+1)+' 支影片：'+demo.song_title);
   item.append(link);
  }
  if(scoreForm)item.append(scoreForm(demo,index+1));
  list.append(item);
 }
 return list;
}
async function renderJanuaryRoster(){
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
function januaryScoreForm(application,demo,position,onSaved){
 if(demo.my_score)return node('p','已儲存：'+(demo.my_score.technique+demo.my_score.interpretation)+' 分','minor');
 const form=node('form',undefined,'form-grid');
 form.setAttribute('aria-label','評分第 '+position+' 支 Demo');
 for(const [name,title,max] of [['technique','技巧',60],['interpretation','情感',40]]){
  const label=node('label',undefined,'field'),input=node('input');input.type='number';input.name=name;input.required=true;input.min='0';input.max=String(max);input.step='1';
  label.append(node('span',title+'（0–'+max+'）'),input);form.append(label);
 }
 const declaration=node('label',undefined,'check'),check=node('input');check.type='checkbox';check.required=true;
 declaration.append(check,node('span','我確認沒有利益衝突。'));
 const button=node('button','儲存第 '+position+' 支評分','btn btn-primary');button.type='submit';
 form.append(declaration,button);
 form.onsubmit=event=>{
  event.preventDefault();run(async()=>{
   const values=formValues(form);
   const saved=await api('january-video-score',{application_id:application.id,position,no_conflict:check.checked,technique:Number(values.technique),interpretation:Number(values.interpretation)});
   form.replaceWith(node('p','已儲存：'+saved.score+' 分','minor'));onSaved();
  });
 };
 return form;
}
async function renderOrganizer(){
 $('organizer-dashboard').hidden=false;$('judge-dashboard').hidden=true;
 const v=await api('organizer-queue'),apps=v.applications||[];
 const january=$('january-test-roster');january.hidden=!v.january_roster_enabled;
 if(!january.hidden)await renderJanuaryRoster();
 $('pending-count').textContent=String(apps.length);
 $('scores-count').textContent=String(apps.reduce((n,a)=>n+Number(a.demo_judges||0)+Number(a.live_judges||0),0));
 $('paid-count').textContent='0';
 const holder=$('admin-apps'),pager=$('organizer-pagination'),summary=$('organizer-count');
 const search=$('organizer-search'),language=$('organizer-language'),category=$('organizer-category'),statusFilter=$('organizer-status');
 let pageNo=1;const perPage=12;
 function paint(){
  const q=search.value.trim().toLowerCase(),lang=language.value,cat=category.value,st=statusFilter.value;
  const found=apps.filter(a=>{
   if(q&&![a.stage_name,a.song_title,a.id,a.round_code].some(x=>String(x||'').toLowerCase().includes(q)))return false;
   if(lang&&a.song_language!==lang)return false;
   if(cat&&a.category!==cat)return false;
   if(st==='scored'&&!(Number(a.demo_judges||0)+Number(a.live_judges||0)))return false;
   if(st==='unscored'&&(Number(a.demo_judges||0)+Number(a.live_judges||0)))return false;
   if(['unpaid','simulated_paid'].includes(st)&&a.payment_status!==st)return false;
   return true;
  });
  const pages=Math.max(1,Math.ceil(found.length/perPage));
  pageNo=Math.min(pageNo,pages);holder.replaceChildren();
  summary.textContent='符合 '+found.length+' 筆報名資料（目前全部為測試資料；正式付款 0 筆）';
  if(!found.length)holder.append(node('p','沒有符合條件的資料。'));
  for(const a of found.slice((pageNo-1)*perPage,pageNo*perPage)){
   const card=node('article',undefined,'roster-entry');
   const info=node('div',undefined,'roster-entry-text');
   info.append(node('strong',(a.stage_name||'選手')+' · '+(a.song_title||'未命名曲目')));
   info.append(node('p',a.round_code+' · '+(a.category==='university'?'大學組':'社會組')+' · '+(a.song_language||'語言未填'),'minor'));
   info.append(node('p','編號：'+a.id,'minor'));
   if(a.province)info.append(node('p',[a.province,a.location_detail].filter(Boolean).join(' · '),'minor'));
   const demos=staffDemoList(a);if(demos)info.append(demos);
   const video=safeLink(a.demo_url);
   if(!demos&&video){
    const link=node('a','開啟參賽影片','btn btn-soft');
    link.href=video;link.target='_blank';link.rel='noopener noreferrer';info.append(link);
   }
   const img=profileImage(a.photo_url_1);
   if(img)info.prepend(img);
   const stats=node('div',undefined,'roster-entry-side');
   stats.append(node('span',a.round_code==='2027-01'&&a.demo_entries?.length?'1 月免費海選':a.payment_status==='simulated_paid'?'模擬付款':'未付款','pill'));
   if(a.approval_state==='approved')stats.append(node('span','主辦已核准','pill pill-pass'));
   if(a.video_supplement_state){
    const stateText={pending:'等待選手補正資料',expired:'補正期限已過',submitted:'已收到補正資料，請重新檢查'};
    stats.append(node('p',stateText[a.video_supplement_state],'minor'));
    if(a.video_supplement_state==='pending')stats.append(node('small',supplementDeadline(a)));
   }
   if(a.approval_state==='pending'&&a.video_supplement_available){
    const request=node('button','開放 48 小時補件','btn btn-soft');request.type='button';
    request.onclick=()=>{
     if(!confirm('請先聯絡選手。確認後開始計算 48 小時。網站不會代為發送通知。'))return;
     run(async()=>{await api('request-video-supplement',{application_id:a.id});await renderOrganizer();status('已開放補正。');});
    };
    stats.append(request);
   }
   if(a.approval_state==='pending'&&!['pending','expired'].includes(a.video_supplement_state)){
    stats.append(node('span','待主辦核准','pill pill-warn'));
    const approve=node('button','核准測試報名','btn btn-soft');approve.type='button';
    approve.onclick=()=>{
     if(!confirm('核准「'+(a.stage_name||'選手')+'」的測試報名？核准後會鎖定報名資料。'))return;
     run(async()=>{
      const result=await api('approve-test-application',{application_id:a.id});
      if(result.approval_state!=='approved'||result.testOnly!==true)throw Error('approval_readback_failed');
      await renderOrganizer();status('已核准測試報名。');
     });
    };
    stats.append(approve);
   }
   stats.append(node('small','評審回覆 '+String(Number(a.demo_judges||0)+Number(a.live_judges||0))+' 筆'));
   card.append(info,stats);holder.append(card);
  }
  makeRosterPager(pager,pageNo,pages,p=>{pageNo=p;paint()});
 }
 for(const control of [search,language,category,statusFilter]){
  control.oninput=()=>{pageNo=1;paint()};
  control.onchange=()=>{pageNo=1;paint()};
 }
 paint();
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
 $('organizer-dashboard').hidden=true;$('judge-dashboard').hidden=false;
 const v=await api('reviewer-queue'),queue=v.queue||[];
 const list=$('judge-list'),pager=$('judge-pagination'),summary=$('judge-count');
 const search=$('judge-search'),statusFilter=$('judge-status');
 const rosterPanel=$('judge-roster-panel'),detail=$('judge-detail'),holder=$('judge-queue'),back=$('judge-back-list');
 let pageNo=1;const perPage=10;
 detail.hidden=true;rosterPanel.hidden=false;holder.replaceChildren();
 function paint(){
  const q=search.value.trim().toLowerCase(),st=statusFilter.value;
  const found=queue.filter(a=>{
   if(st==='scored'&&!scoredByJudge(a))return false;
   if(st==='unscored'&&scoredByJudge(a))return false;
   return !q||[a.stage_name,a.id,a.song_title,a.round_code].some(x=>String(x||'').toLowerCase().includes(q));
  });
  const pages=Math.max(1,Math.ceil(found.length/perPage));
  pageNo=Math.min(pageNo,pages);list.replaceChildren();
  summary.textContent='符合 '+found.length+' 位參賽者 · 待評 '+found.filter(a=>!scoredByJudge(a)).length+' 位';
  if(!found.length)list.append(node('p','目前沒有符合條件的參賽者。'));
  for(const a of found.slice((pageNo-1)*perPage,pageNo*perPage)){
   const row=node('button',undefined,'roster-entry roster-action');row.type='button';
   const body=node('span',undefined,'roster-entry-text');
   const img=profileImage(a.photo_url_1);
   if(img)body.append(img);
   body.append(node('strong',a.stage_name||'選手'));
   body.append(node('span',String(a.song_title||'作品')+' · '+a.round_code+' · '+(a.category==='university'?'大學組':'社會組'),'roster-mini'));
   const flag=node('span',scoredByJudge(a)?'已評分':'開始評分','pill');
   row.append(body,flag);row.onclick=()=>openDetail(a);list.append(row);
  }
  makeRosterPager(pager,pageNo,pages,p=>{pageNo=p;paint()});
 }
 function openDetail(a){
  rosterPanel.hidden=true;detail.hidden=false;holder.replaceChildren();
  let modified=false;
  back.onclick=()=>{if(modified&&!confirm('返回名單將放棄未儲存的分數，確定返回嗎？'))return;
   holder.replaceChildren();detail.hidden=true;rosterPanel.hidden=false;back.focus();paint();
  };
  const box=node('article',undefined,'entry');
  const phase=a.phase||'demo',demo=phase==='demo';
  box.append(node('h3',(a.stage_name||'選手')+' · '+a.round_code));
  box.append(node('p',(a.song_title||'作品')+' · '+(a.song_language||'')+' · '+(demo?'線上海選':phase==='qualifier'?'現場初賽':'決賽'),'minor'));
  const pictures=profileGallery(a);if(pictures)box.append(pictures);
  if(a.gender)box.append(node('p','參賽者填寫的性別：'+({male:'男',female:'女',other:'其他',prefer_not_say:'不願透露'}[a.gender]||'未提供'),'minor'));
  const demos=staffDemoList(a,a.per_video_scoring?(work,position)=>januaryScoreForm(a,work,position,()=>status('已儲存本支 Demo 評分。')):null);if(demos)box.append(demos);
  const link=safeLink(a.demo_url);
  if(!demos&&link){const l=node('a','觀看作品 ↗','small-link');l.href=link;l.target='_blank';l.rel='noopener noreferrer';box.append(l);}
  if(a.per_video_scoring){holder.append(box);back.focus();return;}
  if(demo&&a.demo_entries?.length>1){
   box.append(node('p','可逐支觀看。逐支評分功能尚未開放。','notice'));
   holder.append(box);back.focus();return;
  }
  if(scoredByJudge(a)){
   const xs=demo?[a.demo_technique,a.demo_interpretation]:[a.live_technique,a.live_interpretation,a.stage_presence,a.appearance];
   box.append(node('p','此階段已評分：'+xs.reduce((n,x)=>n+Number(x||0),0)+' 分（不能覆蓋）'));
   holder.append(box);back.focus();return;
  }
  const form=node('form',undefined,'form-grid');
  form.addEventListener('input',()=>{modified=true});
  const criteria=demo?[['technique','技巧（0–60）',60],['interpretation','表現（0–40）',40]]:
   [['technique','技巧（0–40）',40],['interpretation','表現（0–30）',30],['stage_presence','台風（0–20）',20],['appearance','儀容（0–10）',10]];
  for(const [name,labelText,max] of criteria){
   const lab=node('label',undefined,'field'),input=node('input');
   input.name=name;input.type='number';input.min='0';input.max=String(max);input.step='1';input.required=true;
   lab.append(node('span',labelText),input);form.append(lab);
  }
  const agree=node('label',undefined,'check'),checkbox=node('input');checkbox.type='checkbox';checkbox.name='conflict';checkbox.required=true;
  agree.append(checkbox,node('span','我確認此次評分沒有利益衝突。'));form.append(agree);
  const save=node('button','儲存我的評分','btn btn-primary');save.type='submit';form.append(save);
  form.onsubmit=e=>{e.preventDefault();run(async()=>{
   const inputs=formValues(form),payload={application_id:a.id,phase,no_conflict:checkbox.checked};
   for(const [name] of criteria)payload[name]=Number(inputs[name]);
   await api('score',payload);status('評分已儲存。');await renderJudge();
  })};
  box.append(form);holder.append(box);back.focus();
 }
 search.oninput=()=>{pageNo=1;paint()};statusFilter.onchange=()=>{pageNo=1;paint()};
 paint();
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
 // Never silently omit private contact fields or imply that they were saved.
 // In preview mode the member may type fictional values, but must clear them
 // before submitting the separate legacy TEST entry (until D1 is approved).
 if(!museFormEnabled&&[...$('muse-test-fields').querySelectorAll('input,textarea')].some(el=>el.value.trim())){
  status(mt('musePreviewCannotSave'),true);
  $('muse-fields-notice')?.scrollIntoView({block:'center',behavior:'smooth'});
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
 setupAuth();staffTabs();document.querySelectorAll('[data-role-tab]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.roleTab;if(next===role||!account)return;run(async()=>{const v=await api('switch-role',{role:next});account=v.account;role=account.role;staffTabs();await dashboard();status('已切換為'+(role==='organizer'?'主辦方':'評審')+'。')})}));loadSession();
}
// Deep links to a rules topic should open it, rather than show a closed summary.
if(page==='news'){
 const openRuleFromHash=(fromClick=false)=>{
  const id=decodeURIComponent(location.hash.slice(1));
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
