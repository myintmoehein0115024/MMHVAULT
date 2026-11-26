/* Opt-in read-only first release. Classic Cashflow remains default and unchanged. */
import {mountAppCashflowV2} from './mmhvault-cashflow-v2-app-entry.mjs';
export function installCashflowRelease(doc,win,bindings,mount=mountAppCashflowV2){
 const page=doc.getElementById('cashflow-analyze'),legacy=page?.querySelector(':scope > .cfa-shell');
 if(!page||!legacy||doc.getElementById('mmhCashflowV2Release'))return null;
 const make=(tag,id)=>{const e=doc.createElement(tag);if(id)e.id=id;return e};
 const bar=make('div','mmhCashflowV2Release'),button=make('button'),note=make('p'),root=make('div','mmhCashflowV2ReleaseRoot');
 button.type='button';button.setAttribute('aria-controls',root.id);note.setAttribute('role','status');root.hidden=true;bar.append(button,note);legacy.before(bar,root);
 let active=false,handle=null,failed=false;
 const words=()=>{const l=String(doc.documentElement.lang||'en').toLowerCase();return l.startsWith('zh')?['打开新版 Cashflow','返回旧版 Cashflow','新版首发 · 仅统计及报表；规划和编辑仍使用旧版。','新版暂不可用，旧版仍可使用。']:l.startsWith('my')?['Cashflow အသစ် ဖွင့်ရန်','Cashflow အဟောင်းသို့ ပြန်ရန်','ကနဦးဗားရှင်း · စာရင်းချုပ်နှင့် အစီရင်ခံစာသာ။','ဗားရှင်းအသစ် မရနိုင်ပါ။']:['Open Cashflow V2','Return to classic Cashflow','Initial release · read-only summary and reports; use classic for planning and editing.','V2 unavailable; classic remains available.']};
 const label=()=>{const w=words();button.textContent=w[active?1:0];note.textContent=w[failed?3:2];button.setAttribute('aria-expanded',String(active))};
 function close(){try{handle?.destroy()}catch{}handle=null;active=false;root.replaceChildren();root.hidden=true;legacy.hidden=false;label()}
 function open(){failed=false;try{if(!bindings.owner()||bindings.configOwner()!==bindings.owner())throw Error('Session not ready');handle=mount(root,{...bindings,releaseReadOnly:true});if(!handle||typeof handle.destroy!=='function')throw Error('Mount failed');active=true;root.hidden=false;legacy.hidden=true;label()}catch{failed=true;close()}}
 button.addEventListener('click',()=>active?close():open());
 const reset=()=>{if(active)close()};win.addEventListener('mmhvault:config-owner-changed',reset);win.addEventListener('pagehide',reset);win.addEventListener('mmhvault-language-change',label);
 label();return {open,close,active:()=>active};
}
if(typeof document!=='undefined'&&typeof window!=='undefined')try{installCashflowRelease(document,window,{
 owner:()=>typeof currentSessionUser==='undefined'?'':currentSessionUser?.id||'',
 configOwner:()=>typeof MMHVAULT_CONFIG_OWNER==='undefined'?'':MMHVAULT_CONFIG_OWNER,
 config:()=>typeof MMHVAULT_CONFIG==='undefined'?null:MMHVAULT_CONFIG,
 currencies:()=>typeof MMHVAULT_ACCOUNT_CURRENCY_CODES_V140==='undefined'?[]:MMHVAULT_ACCOUNT_CURRENCY_CODES_V140,
 groupOf:t=>typeof inferTxGroup==='function'?inferTxGroup(t):'',
 isLinkedInvestment:t=>typeof isLinkedInvestmentTx!=='function'||isLinkedInvestmentTx(t)
})}catch{}
