/* MMHVAULT Admin Premium Workspace V1 · registered-users first-page fix
 * Presentation only. No fabricated KPIs, network access, auth changes, or cross-tab DOM moves.
 * Sidebar and header are shared; user statistics and user directory remain in the usage view.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const dash=$('dashboard'),nav=document.querySelector('#dashboard>.admin-tabs');
 const header=document.querySelector('body>header'),toolbar=document.querySelector('#dashboard>.toolbar');
 const usage=$('adminUsageView'),metrics=usage?.querySelector(':scope>.metrics');
 const refresh=$('refresh'),logout=$('logout'),returnApp=header?.querySelector('a[href="app.html"]');
 if(!dash||!nav||!header||!toolbar||!usage||!metrics||!refresh||!logout||!returnApp)return;
 if(document.body.classList.contains('admin-premium-v1'))return;
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
 const label=el('div','adm-header-title');
 label.append(el('strong','', '管理后台'),el('span','', '/ Admin Workspace'));
 const controls=el('div','adm-header-actions');
 controls.append(returnApp,refresh,logout);
 header.append(label,controls);
 const sidebar=el('div','adm-sidebar-brand');
 sidebar.append(el('span','adm-crown','♛'),el('strong','','MMHVAULT'),el('small','','Admin Workspace'));
 nav.prepend(sidebar);
 // All four KPI counters are the original authorized mmh_admin_overview values.
 // Never move them to #dashboard: that displayed the cards on every Admin page.
 const icons=['♟','◉','◈','◷'];
 for(const [index,metric] of [...metrics.children].entries()){
   const icon=el('span','adm-metric-icon',icons[index]||'◈');
   icon.setAttribute('aria-hidden','true');
   metric.prepend(icon);
 }
 const directory=usage.querySelector(':scope>.panel');
 if(directory)directory.classList.add('adm-registered-directory-v1');
 // The previous injected feedback metric and quick-action/intro blocks are deliberately
 // gone: the first page must be the complete searchable, paginated member directory.
 const sync=()=>{
   const authorized=!dash.hidden;
   document.body.dataset.adminUnlocked=String(authorized);
   dash.dataset.adminPage=authorized&&!usage.hidden?'registered-users':'other';
 };
 new MutationObserver(sync).observe(dash,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(sync).observe(usage,{attributes:true,attributeFilter:['hidden']});
 document.body.classList.add('admin-premium-v1');
 sync();
})();
