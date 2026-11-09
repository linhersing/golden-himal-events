/* Progressive no-email member login. Fail closed until the Worker explicitly enables it.
 * Never store passwords or recovery codes in localStorage / logs.
 */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
const portal=byId('password-portal'),email=byId('email-signin-wrap'),fallback=byId('password-not-ready');
if(!portal||!email)return;
const dict={
 zh:{title:'使用帳號與密碼',intro:'不需要 Email。請使用自己設定的帳號和密碼進行測試報名。',login:'登入',create:'建立測試帳號',recover:'忘記密碼？使用救援碼',username:'帳號（英文字母開頭，4–32 碼）','password':'密碼（至少15個字元）',passwordAgain:'再次輸入密碼',doLogin:'登入我的帳號',doCreate:'建立測試帳號',doRecover:'重設密碼',recoverCode:'註冊時保存的救援碼','newPassword':'新密碼（至少15個字元）',ready:'此網站只開放測試報名，不是真正的比賽登記。',notReady:'帳號密碼報名功能正在準備中，現在仍只接受受邀帳號測試。',rescueTitle:'請先保存這組一次性救援碼',rescueHint:'這組碼只顯示這一次。請安全保存，忘記密碼時會用到；不要傳給客服或其他人。',continue:'我已保存，進入會員中心',copied:'已複製。請存到安全位置。',mismatch:'兩次密碼不一致。',unknown:'目前無法完成操作，請再試一次。',errors:{invalid_username:'帳號必須以英文字母開頭，使用4–32個小寫英文字母、數字或 . _ - 。','invalid_password':'請設定至少15個字元的密碼。',invalid_credentials:'帳號或密碼不正確。',invalid_recovery:'帳號或救援碼不正確。',username_taken:'這個帳號已被使用，請換一個。',username_taken_or_storage_error:'帳號建立失敗或已有使用者，請換一個再試。',too_many_password_attempts:'操作太頻繁，請稍後再試。',account_temporarily_locked:'為保護帳號，暫時禁止登入，請15分鐘後再試。',human_check_required:'請完成真人驗證再試。',password_test_not_ready:'帳號密碼測試服務尚未開通。'}},
 en:{title:'Username & password',intro:'No Email required. Choose your own username and password to rehearse registration.',login:'Log in',create:'Create TEST account',recover:'Forgot password? Use recovery code',username:'Username (4–32 characters)','password':'Password (15+ characters)',passwordAgain:'Confirm password',doLogin:'Log in',doCreate:'Create TEST account',doRecover:'Reset password',recoverCode:'Your saved recovery code','newPassword':'New password (15+ characters)',ready:'TEST applications only. This is not official registration.',notReady:'Username signup is being prepared. Invited Email accounts can still test.',rescueTitle:'Save your one-time recovery code now',rescueHint:'This code appears only once. Keep it secure. Never share it with anyone, including staff.',continue:'I saved it — open my account',copied:'Copied. Save it somewhere secure.',mismatch:'Passwords do not match.',unknown:'Could not finish. Please try again.',errors:{invalid_username:'Use 4–32 lowercase letters, digits, dots, underscores or hyphens, starting with a letter.','invalid_password':'Use a password with at least 15 characters.',invalid_credentials:'Incorrect username or password.',invalid_recovery:'Incorrect username or recovery code.',username_taken:'This username is already taken.',username_taken_or_storage_error:'Could not create account. Please try another username.',too_many_password_attempts:'Too many attempts. Try later.',account_temporarily_locked:'Account temporarily locked. Try in 15 minutes.',human_check_required:'Please complete human verification.',password_test_not_ready:'Username TEST login is not available yet.'}},
 ne:{title:'प्रयोगकर्ता नाम र पासवर्ड',intro:'इमेल आवश्यक छैन। परीक्षणका लागि आफ्नो प्रयोगकर्ता नाम र पासवर्ड प्रयोग गर्नुहोस्।',login:'लगइन',create:'परीक्षण खाता बनाउनुहोस्',recover:'पासवर्ड बिर्सनुभयो? रिकभरी कोड',username:'प्रयोगकर्ता नाम (४–३२ अक्षर)','password':'पासवर्ड (कम्तीमा १५ अक्षर)',passwordAgain:'फेरि पासवर्ड',doLogin:'लगइन गर्नुहोस्',doCreate:'परीक्षण खाता बनाउनुहोस्',doRecover:'पासवर्ड परिवर्तन गर्नुहोस्',recoverCode:'तपाईंको रिकभरी कोड','newPassword':'नयाँ पासवर्ड (१५+ अक्षर)',ready:'परीक्षण मात्र; आधिकारिक दर्ता होइन।',notReady:'यो सुविधा तयार हुँदैछ। निमन्त्रित इमेल खाताबाट परीक्षण गर्न सकिन्छ।',rescueTitle:'अहिले रिकभरी कोड सुरक्षित राख्नुहोस्',rescueHint:'यो कोड एक पटक मात्र देखाइन्छ। कर्मचारीसँग समेत नबाँड्नुहोस्।',continue:'कोड सुरक्षित भयो — मेरो खाता',copied:'प्रतिलिपि भयो। सुरक्षित राख्नुहोस्।',mismatch:'दुई पासवर्ड मिलेनन्।',unknown:'काम पूरा भएन, फेरि प्रयास गर्नुहोस्।',errors:{invalid_username:'प्रयोगकर्ता नाम ४–३२ अक्षरको हुनुपर्छ।','invalid_password':'कम्तीमा १५ अक्षरको पासवर्ड चाहिन्छ।',invalid_credentials:'गलत प्रयोगकर्ता नाम वा पासवर्ड।',invalid_recovery:'गलत प्रयोगकर्ता नाम वा रिकभरी कोड।',username_taken:'यो प्रयोगकर्ता नाम प्रयोग भइसकेको छ।',username_taken_or_storage_error:'खाता बनाउन सकिएन।',too_many_password_attempts:'धेरै प्रयास भयो, पछि प्रयास गर्नुहोस्।',account_temporarily_locked:'खाता अस्थायी रूपमा बन्द गरिएको छ।',human_check_required:'मानव प्रमाणीकरण पूरा गर्नुहोस्।',password_test_not_ready:'यो सुविधा अझै खुला छैन।'}}};
const formValue=(form,name)=>String(new FormData(form).get(name)||'');
let lang='zh',widgetId,challengeToken,ready=false;
function translation(){lang=window.GHVLocale?.lang||'zh';if(!dict[lang])lang='en';return dict[lang]}
function apply(){const t=translation();portal.querySelectorAll('[data-pw]').forEach(el=>{el.textContent=t[el.dataset.pw]||el.dataset.pw});portal.querySelectorAll('[data-pw-ph]').forEach(el=>el.placeholder=t[el.dataset.pwPh]||'');if(!ready)fallback.textContent=t.notReady;else{const intro=document.querySelector('#main > .page-intro');if(intro)intro.textContent=t.intro;const step=byId('step-login');if(step)step.textContent='1 · '+t.login;}}
function message(s,bad=false){const box=byId('password-feedback');box.hidden=false;box.textContent=s;box.className='feedback'+(bad?' error':' success');}
function panel(name){for(const id of ['password-login-form','password-register-form','password-recover-form'])byId(id).hidden=(id!=='password-'+name+'-form');portal.querySelectorAll('[data-pw-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pwTab===name)));messageBoxHide();}
function messageBoxHide(){byId('password-feedback').hidden=true;}
async function call(path,payload){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);try{const r=await fetch('/api/e2e/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',cache:'no-store',signal:ctl.signal});const data=await r.json();if(!r.ok||data.ok!==true)throw Error(data.error||'unknown');return data}finally{clearTimeout(timer)}}
let busy=false;
async function submit(path,form){if(busy)return;const t=translation(),button=form.querySelector('[type=submit]');busy=true;button.disabled=true;try{
 const payload={username:formValue(form,'username'),'password':formValue(form,'password')};
 if(path==='password-register'){
  if(payload.password!==formValue(form,'confirm'))throw Error('mismatch');
  payload.turnstile_token=challengeToken;
 }else if(path==='password-recover')payload.recovery_code=formValue(form,'recovery_code');
 const result=await call(path,payload);
 if(result.recovery_code){
  byId('password-recovery-output').textContent=result.recovery_code;
  byId('password-rescue-screen').hidden=false;
  byId('password-auth-screen').hidden=true;
  byId('password-auth-disclaimer').hidden=true;
 }else location.reload();
}catch(e){
 const key=e?.message||'unknown';message(key==='mismatch'?t.mismatch:t.errors[key]||t.unknown,true);
}finally{busy=false;button.disabled=false;if(path==='password-register'&&widgetId!==undefined){challengeToken=undefined;try{window.turnstile.reset(widgetId)}catch{}}}}
async function init(){
 apply();
 let conf;try{const r=await fetch('/api/e2e/password-config',{credentials:'same-origin',cache:'no-store'});conf=await r.json()}catch{}
 if(conf?.enabled!==true||typeof conf.siteKey!=='string'){portal.hidden=false;fallback.hidden=false;byId('password-auth-screen').hidden=true;return}
 ready=true;apply();portal.hidden=false;fallback.hidden=true;byId('password-auth-screen').hidden=false;email.open=false;
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
 script.onload=()=>{try{window.turnstile.ready(()=>{widgetId=window.turnstile.render(byId('password-turnstile'),{sitekey:conf.siteKey,size:'compact',action:'ghv_signup','response-field':false,callback:token=>{challengeToken=token},'expired-callback':()=>{challengeToken=undefined},'error-callback':()=>{challengeToken=undefined}})})}catch{message(translation().errors.human_check_required,true)}};
 script.onerror=()=>message(translation().errors.human_check_required,true);
 document.head.append(script);
 panel('login');
}
portal.querySelectorAll('[data-pw-tab]').forEach(button=>button.addEventListener('click',()=>panel(button.dataset.pwTab)));
for(const mode of ['login','register','recover']){const form=byId('password-'+mode+'-form');form.addEventListener('submit',e=>{e.preventDefault();submit('password-'+mode,form)})}
byId('password-rescue-continue').addEventListener('click',()=>location.reload());
byId('password-copy-code').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(byId('password-recovery-output').textContent);message(translation().copied)}catch{}});
window.addEventListener('ghv:languagechange',apply);
init();
})();
