/* Public-page navigation labels only. Preserve all existing language handlers and URLs. */
(()=>{
 'use strict';
 const nav=document.querySelector('.ghp-shared-nav');
 if(!nav)return;
 const labels={
  en:{home:'Home',about:'About',voice:'Singing Contest',rules:'Contest Rules'},
  ne:{home:'गृह',about:'परिचय',voice:'गायन प्रतियोगिता',rules:'प्रतियोगिता नियम'},
  zh:{home:'首頁',about:'認識品牌',voice:'歌唱比賽',rules:'比賽規則'}
 };
 const apply=lang=>{
  const chosen=labels[lang]||labels.en;
  nav.querySelectorAll('[data-ghp-nav]').forEach(el=>{
   const value=chosen[el.dataset.ghpNav];
   if(value)el.textContent=value;
  });
 };
 let initial='en';
 try{const saved=localStorage.getItem('ghv_ui_language_v1');if(labels[saved])initial=saved}catch{}
 apply(initial);
 document.querySelectorAll('.ghp-shared-locale [data-lang]').forEach(button=>{
  button.addEventListener('click',()=>apply(button.dataset.lang));
 });
 window.addEventListener('ghv:languagechange',event=>apply(event.detail?.lang));
})();
