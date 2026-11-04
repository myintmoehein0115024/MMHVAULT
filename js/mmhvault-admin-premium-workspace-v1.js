/* MMHVAULT Admin Premium Workspace V1
 * DOM-only presentation enhancement. Reuses existing verified controls and RPC-driven values.
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
 // Keep the original four verified RPC counters and place them above every Admin view.
 dash.insertBefore(metrics,nav);
 // The fifth card is an exact reflection of the existing feedback count.
 // It must stay an em dash until the authorized inbox actually loads.
 const feedbackMetric=el('div','metric adm-feedback-metric');
 const feedbackLabel=el('small','','待处理反馈');
 const feedbackValue=el('strong','', '—');feedbackValue.id='admPendingFeedbackV1';
 feedbackMetric.append(feedbackLabel,feedbackValue,el('span','adm-metric-note','进入反馈页载入数据'));
 metrics.append(feedbackMetric);
 const metricIcons=['♟','◉','◈','◷','▣'];
 for(const [index,metric] of [...metrics.children].entries()){
   const icon=el('span','adm-metric-icon',metricIcons[index]||'◈');
   icon.setAttribute('aria-hidden','true');metric.prepend(icon);
 }
 const counter=$('afNew');
 if(counter){
   const reflect=()=>{
     const value=counter.textContent?.trim()||'—';
     feedbackValue.textContent=!dash.hidden&&/^(?:\d{1,3}(?:,\d{3})*|\d+)$/.test(value)?value:'—';
   };
   new MutationObserver(reflect).observe(counter,{childList:true,characterData:true,subtree:true});
   reflect();
 }
 const intro=el('section','adm-overview-band');
 const introText=el('div');
 introText.append(el('span','adm-eyebrow','MMHVAULT · ADMIN CONTROL CENTER'),
   el('h2','','管理员工作台 · 使用概览'),
   el('p','','查看经过服务器授权的会员使用指标。网站访问趋势、访客来源及时间范围请通过左侧「网站统计」进入；所有数值均来自实际服务，不使用示意数据。'));
 const introLinks=el('div','adm-overview-links');
 const goAnalytics=el('button','', '查看网站统计');goAnalytics.type='button';goAnalytics.dataset.adminView='adminAnalyticsTab';
 const goFeedback=el('button','', '处理用户反馈');goFeedback.type='button';goFeedback.dataset.adminView='adminFeedbackTab';
 introLinks.append(goAnalytics,goFeedback);intro.append(introText,introLinks);
 usage.prepend(intro);
 const tiles=el('div','adm-overview-tiles');
 for(const item of [
   ['用户反馈','查看待处理事项和会员回复','adminFeedbackTab','进入反馈'],
   ['会员聊天','打开现有人工客服与消息工作区','adminChatTab','进入聊天'],
   ['通知与公告','管理公告及向会员发送通知','adminNoticeTab','管理公告']
 ]){
   const tile=el('section','adm-overview-tile');
   const copy=el('div');copy.append(el('strong','',item[0]),el('p','',item[1]));
   const button=el('button','',item[3]);button.type='button';button.dataset.adminView=item[2];
   tile.append(copy,button);tiles.append(tile);
 }
 const usageDirectory=usage.querySelector(':scope>.panel');if(usageDirectory)usage.insertBefore(tiles,usageDirectory);else usage.append(tiles);
 document.addEventListener('click',event=>{
   const button=event.target?.closest?.('[data-admin-view]');if(!button||!usage.contains(button))return;
   if(dash.hidden)return;
   const target=$(button.dataset.adminView);
   if(target&&!target.disabled)target.click();
 });
 // Authorization remains owned exclusively by the original Admin boot/logout handlers.
 const sync=()=>{
   const authorized=!dash.hidden;
   document.body.dataset.adminUnlocked=String(authorized);
   if(!authorized)feedbackValue.textContent='—';
 };
 new MutationObserver(sync).observe(dash,{attributes:true,attributeFilter:['hidden']});
 document.body.classList.add('admin-premium-v1');
 sync();
})();
