const copy={
 zh:{title:'私有資格文件測試',warning:'僅供本機測試。請勿選取或上傳真實證件。',choose:'選擇一張照片或 PDF',formats:'JPG、PNG 或 PDF，最多 5 MiB。僅限合成測試檔。',consent:'我確認所選檔案是合成測試檔。',upload:'上傳測試檔',saved:'測試檔已儲存在私有空間。',download:'下載測試檔',remove:'撤回文件',loading:'正在查詢文件狀態。',sending:'正在上傳測試檔。',off:'目前無法使用私有文件測試。請確認已登入且報名已核准。',failed:'儲存結果未確認。可使用同一個檔案重試。',large:'檔案超過 5 MiB。',format:'請選擇有效的 JPG、PNG 或 PDF。',conflict:'文件狀態已有更新。確認後可再試。',removed:'文件已撤回，無法再下載。',confirm:'要撤回這份測試文件嗎？'},
 en:{title:'Private eligibility document test',warning:'Local test only. Use synthetic files and never choose a real identity or education document.',choose:'Choose one photo or PDF',formats:'JPG, PNG or PDF up to 5 MiB. Synthetic files only.',consent:'I confirm that the selected file is synthetic.',upload:'Upload test file',saved:'The test file is stored privately.',download:'Download test file',remove:'Withdraw file',loading:'Checking document status.',sending:'Uploading the test file.',off:'Private document testing is unavailable. Check your sign-in and application approval.',failed:'The result could not be confirmed. Retry with the same file.',large:'The file exceeds 5 MiB.',format:'Choose a valid JPG, PNG or PDF.',conflict:'The document has changed. Review the updated status and try again.',removed:'The file was withdrawn and can no longer be downloaded.',confirm:'Withdraw this test document?'},
 ne:{title:'निजी योग्यता कागजात परीक्षण',warning:'स्थानीय परीक्षण मात्र। कृत्रिम फाइल प्रयोग गर्नुहोस्। वास्तविक कागजात नछान्नुहोस्।',choose:'एउटा फोटो वा PDF छान्नुहोस्',formats:'JPG, PNG वा PDF, बढीमा ५ MiB। कृत्रिम परीक्षण फाइल मात्र।',consent:'छानिएको फाइल कृत्रिम परीक्षण फाइल हो।',upload:'परीक्षण फाइल अपलोड गर्नुहोस्',saved:'परीक्षण फाइल निजी रूपमा सुरक्षित छ।',download:'परीक्षण फाइल डाउनलोड गर्नुहोस्',remove:'फाइल फिर्ता लिनुहोस्',loading:'कागजातको अवस्था जाँच हुँदैछ।',sending:'परीक्षण फाइल अपलोड हुँदैछ।',off:'निजी कागजात परीक्षण उपलब्ध छैन। लगइन र आवेदन स्वीकृति जाँच्नुहोस्।',failed:'नतिजा पुष्टि भएन। सोही फाइलबाट फेरि प्रयास गर्नुहोस्।',large:'फाइल ५ MiB भन्दा ठूलो छ।',format:'मान्य JPG, PNG वा PDF छान्नुहोस्।',conflict:'कागजातको अवस्था बदलिएको छ। जाँच गरेर फेरि प्रयास गर्नुहोस्।',removed:'फाइल फिर्ता लिइयो। अब डाउनलोड गर्न सकिँदैन।',confirm:'परीक्षण कागजात फिर्ता लिने हो?'}
};
const $=id=>document.getElementById(id);
const id=new URL(location.href).searchParams.get('id')||'';
const route='/api/e2e/eligibility-document';
const url=(path='')=>route+path+'?'+new URLSearchParams({id});
let language='zh',message='',documentState=null,enabled=false,busy=false,attempt=null;
function render(){
 document.documentElement.lang=language==='zh'?'zh-Hant':language;
 for(const element of document.querySelectorAll('[data-copy]'))element.textContent=copy[language][element.dataset.copy];
 for(const button of document.querySelectorAll('[data-lang]'))button.setAttribute('aria-pressed',String(button.dataset.lang===language));
 $('status').textContent=message?copy[language][message]:'';
 $('upload').hidden=!enabled;
 $('saved').hidden=!documentState;
 $('remove').hidden=!enabled;
 for(const control of $('upload').elements)control.disabled=busy;
 $('remove').disabled=busy;
}
async function api(path,options){
 const response=await fetch(url(path),{credentials:'same-origin',cache:'no-store',...options});
 const result=await response.json();
 if(!response.ok)throw new Error(result.error);
 return result;
}
async function refresh(){
 try{
  const result=await api('');
  documentState=result.document;enabled=result.enabled===true;message=enabled||documentState?'':'off';
 }catch{documentState=null;enabled=false;message='off';}
 render();
}
for(const button of document.querySelectorAll('[data-lang]'))button.onclick=()=>{language=button.dataset.lang;render()};
$('download').href=url('/download');
$('file').onchange=()=>{attempt=null;};
$('upload').onsubmit=async event=>{
 event.preventDefault();
 const file=$('file').files[0];
 if(busy||!enabled||!file||!$('consent').checked)return;
 if(file.size>5*1024*1024){message='large';render();return;}
 attempt??={key:crypto.randomUUID(),revision:documentState?.revision||'none'};
 busy=true;message='sending';render();
 try{
  const result=await api('',{method:'PUT',body:file,headers:{'Content-Type':file.type,'Idempotency-Key':attempt.key,
   'If-Match':'"'+attempt.revision+'"','X-Eligibility-Test-Consent':'yes'}});
  documentState=result.document;message='';attempt=null;$('upload').reset();
 }catch(error){
  if(error.message==='document_conflict'){attempt=null;await refresh();message='conflict';}
  else message={file_too_large:'large',unsupported_document_type:'format',invalid_file_signature:'format'}[error.message]||'failed';
 }finally{busy=false;render();}
};
$('remove').onclick=async()=>{
 if(busy||!enabled||!documentState||!confirm(copy[language].confirm))return;
 busy=true;render();
 try{
  const result=await api('',{method:'DELETE',headers:{'If-Match':'"'+documentState.revision+'"'}});
  documentState=result.document;message='removed';attempt=null;
 }catch{await refresh();message='conflict';}
 finally{busy=false;render();}
};
message='loading';render();refresh();
