/* V2.0.35 — V2 is the sole visible Cash Flow; preserve hidden classic DOM for existing integrations. */
import {mountAppCashflowV2} from './mmhvault-cashflow-v2-app-entry.mjs?v=2.0.46';
export function installCashflowRelease(doc,win,bindings,mount=mountAppCashflowV2){
 const page=doc.getElementById('cashflow-analyze'),legacy=page?.querySelector(':scope > .cfa-shell');
 if(!page||!legacy)return null;
 let root=doc.getElementById('mmhCashflowV2ReleaseRoot');
 if(root?.dataset.cfv2Installed==='true')return null;
 if(!root){root=doc.createElement('div');root.id='mmhCashflowV2ReleaseRoot';legacy.before(root)}
 root.dataset.cfv2Installed='true';root.hidden=false;legacy.hidden=true;legacy.inert=true;
 let handle=null,mountedOwner='',mountedEpoch=0,phase='',suspended=false;
 const active=()=>!suspended&&page.classList.contains('active');
 const owner=()=>String(bindings.owner()||'');const epoch=()=>Number(win.__mmhSessionEpochV1239)||0;
 const ready=()=>!!owner()&&String(bindings.configOwner()||'')===owner();
 const words=()=>{const l=String(doc.documentElement.lang||'en').toLowerCase();return l.startsWith('zh')?['正在准备 Cash Flow…','Cash Flow 暂不可用，请重试。','重试']:l.startsWith('my')?['Cash Flow ပြင်ဆင်နေသည်…','Cash Flow မရနိုင်သေးပါ။ ထပ်မံကြိုးစားပါ။','ထပ်ကြိုးစားရန်']:['Preparing Cash Flow…','Cash Flow is unavailable. Please retry.','Retry']};
 function status(error=false){phase=error?'error':'waiting';const w=words(),p=doc.createElement('p');p.setAttribute('role','status');p.className='cfv2-muted';p.textContent=w[error?1:0];const panel=doc.createElement('div');panel.className='cfv2 cfv2-card';panel.append(p);if(error){const b=doc.createElement('button');b.type='button';b.textContent=w[2];b.addEventListener('click',sync);panel.append(b)}root.replaceChildren(panel)}
 function dispose(){try{handle?.destroy()}catch{}handle=null;mountedOwner='';phase='';root.replaceChildren()}
 function sync(){if(!active()){if(handle||phase)dispose();return}if(handle&&(!ready()||mountedOwner!==owner()||mountedEpoch!==epoch()))dispose();if(!ready()){if(phase!=='waiting')status();return}if(handle)return;
  let next=null;const uid=owner();try{next=mount(root,{...bindings,releaseReadOnly:true});if(!next||typeof next.destroy!=='function'||!ready()||owner()!==uid||!active())throw Error('Mount unavailable');handle=next;mountedOwner=uid;mountedEpoch=epoch();phase='mounted'}catch{try{next?.destroy?.()}catch{}dispose();if(active())status(true)}
 }
 const reset=()=>{if(handle&&ready()&&mountedOwner===owner()&&mountedEpoch===epoch()){sync();return}dispose();sync()},hide=()=>{suspended=true;dispose()},show=()=>{suspended=false;sync()};
 const language=()=>{if(!handle&&active())status(phase==='error')};
 const events=['mmhvault:page-visible','mmhvault:data-state','mmhvault:data-loaded','mmhvault:data-change','mmhvault:cache-restored','mmhvault:sync-complete'];
 events.forEach(e=>win.addEventListener(e,sync));win.addEventListener('mmhvault:config-owner-changed',reset);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);win.addEventListener('mmhvault-language-change',language);
 const observer=new win.MutationObserver(sync);observer.observe(page,{attributes:true,attributeFilter:['class']});
 sync();return {active:()=>!!handle,destroy(){suspended=true;observer.disconnect();events.forEach(e=>win.removeEventListener(e,sync));win.removeEventListener('mmhvault:config-owner-changed',reset);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);win.removeEventListener('mmhvault-language-change',language);dispose();delete root.dataset.cfv2Installed}}
}
if(typeof document!=='undefined'&&typeof window!=='undefined')try{installCashflowRelease(document,window,{
 owner:()=>typeof currentSessionUser==='undefined'?'':currentSessionUser?.id||'',
 configOwner:()=>typeof MMHVAULT_CONFIG_OWNER==='undefined'?'':MMHVAULT_CONFIG_OWNER,
 config:()=>typeof MMHVAULT_CONFIG==='undefined'?null:MMHVAULT_CONFIG,
 currencies:()=>typeof MMHVAULT_ACCOUNT_CURRENCY_CODES_V140==='undefined'?[]:MMHVAULT_ACCOUNT_CURRENCY_CODES_V140,
 groupOf:t=>typeof inferTxGroup==='function'?inferTxGroup(t):'',
 isLinkedInvestment:t=>typeof isLinkedInvestmentTx!=='function'||isLinkedInvestmentTx(t)
})}catch{}
