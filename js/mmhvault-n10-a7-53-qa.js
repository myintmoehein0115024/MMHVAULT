/* MMHVAULT N10-A7.53 — production same-origin QA SHELL ONLY.
 * SECURITY CONTRACT: no imports, no network, no credentials, no login/bind APIs.
 * A new, separately approved release is mandatory before any real A/B testing.
 */
(()=>{
  'use strict';
  const QA_CLOSED = true; // DO NOT CHANGE without separate explicit live-test authorization
  const BACKEND_REQUESTS_ALLOWED = false; // DO NOT CHANGE in N10-A7.53
  const ALLOWED_HOST = 'mmhvault.com';
  const doc=document;
  const id=name=>doc.getElementById(name);
  let lang='zh';
  const allowedHost=location.protocol==='https:'&&location.hostname===ALLOWED_HOST;
  function setLanguage(next){
    lang=next==='en'?'en':'zh';
    doc.documentElement.lang=lang==='en'?'en':'zh-CN';
    for(const el of doc.querySelectorAll('[data-zh][data-en]'))el.textContent=el.getAttribute('data-'+lang)||'';
    for(const sel of doc.querySelectorAll('#checklist select')){
      const labels=lang==='en'?['Not checked','Confirmed','Blocked']:['未检查','已确认','未通过'];
      Array.from(sel.options).forEach((option,i)=>{option.textContent=labels[i]});
    }
    updateProgress();
  }
  function updateProgress(){
    const entries=Array.from(doc.querySelectorAll('#checklist select'));
    const checked=entries.filter(el=>el.value!=='pending').length;
    const failed=entries.some(el=>el.value==='no');
    id('progressText').textContent=lang==='en'?`${checked} / ${entries.length} marked`:`${checked} / ${entries.length} 项已标记`;
    id('progressNote').textContent=failed?(lang==='en'?'Blocked':'存在未通过项'):(lang==='en'?'Record only':'仅供记录');
    id('progressFill').style.width=entries.length?(checked/entries.length*100)+'%':'0%';
  }
  function init(){
    id('badge').textContent='N10-A7.53 · LOCKED';
    id('hostReadout').textContent=allowedHost?'Host: mmhvault.com · origin verified':'Host: not on mmhvault.com · preview only';
    id('portalMode').textContent=allowedHost?'硬关闭 / NO NETWORK':'站点外预览 / CLOSED';
    id('langToggle').addEventListener('click',()=>{
      setLanguage(lang==='zh'?'en':'zh');
      id('portalMode').textContent=allowedHost?(lang==='en'?'LOCKED / NO NETWORK':'硬关闭 / NO NETWORK'):(lang==='en'?'Outside official site / CLOSED':'站点外预览 / CLOSED');
    });
    for(const sel of doc.querySelectorAll('#checklist select'))sel.addEventListener('change',updateProgress);
    // These gates are constants, not controlled by localStorage, URL, cookies,
    // button clicks, checklist completion or browser user data.
    if(!QA_CLOSED || BACKEND_REQUESTS_ALLOWED)throw new Error('N10-A7.53 invalid hard-lock configuration');
    setLanguage('zh');
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
