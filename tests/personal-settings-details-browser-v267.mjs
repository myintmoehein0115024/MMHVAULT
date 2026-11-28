// Isolated Personal Settings details layout regression; no live data or network.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
// Include every linked local stylesheet in document order, not just P9.28.
const css=[...app.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*href=["'](css\/[^"'?]+\.css)(?:\?[^"']*)?["'][^>]*>/gi)].map(m=>'<style>'+(m[1]??readFileSync(new URL('../'+m[2],import.meta.url),'utf8'))+'</style>').join('');
assert.ok(css.includes('V2.0.68 — actual legacy cascade cleanup'));
assert.ok(css.includes('--st61-card'),'legacy P6.2 styles included');

assert.ok(css.includes('V2.0.67 — Personal Settings canvas'));
const detailCss=app.match(/<style id="mmhvault-personal-settings-details-v267">([\s\S]*?)<\/style>/)?.[1];
assert.ok(detailCss?.includes('>.st-page:not([hidden]) :is(.mmh-profile-photo-v1,.mmh-profile-name-v1){min-width:0!important}'),'profile name and photo stay inside active Settings scope');
assert.ok(!detailCss.includes('.mmh-profile-photo-v1,.mmh-profile-name-v1{'),'no unscoped profile name selector');
// Execute the exact Settings-only copy helper from app.html, including safe fallbacks.
const copySource=app.match(/function personalSettingsCopyV268\(base,el,locale\)\{[\s\S]*?\n\}(?=\nconst mmhI18nTextStateV135)/)?.[0];
assert.ok(copySource,'actual fixed copy helper is present');
const copy=new Function(copySource+';return personalSettingsCopyV268;')();
const label={matches:s=>s==='#settings .st-row > span:nth-child(2)'};
const button={matches:s=>s==='#settings .mmh-session-actions-v1 button'};
const note={matches:s=>s==='#settings .mmh-session-actions-v1 .security-password-note-v379'};
const unrelated={matches:()=>false};
assert.equal(copy('Default display currency',label,'zh'),'默认显示货币');
assert.match(copy('Default display currency',label,'my'),/[\u1000-\u109f]/);
for(const key of ['Sign out other devices','Sign out all devices']){
 assert.match(copy(key,button,'my'),/[\u1000-\u109f]/);
 assert.match(copy(key,button,'zh'),/[\u4e00-\u9fff]/);
 assert.equal(copy(key,button,'en'),null);
 assert.equal(copy(key,unrelated,'my'),null);
}
assert.match(copy('Signing out other devices keeps this device signed in. “Sign out all devices” also signs out this device.',note,'my'),/[\u1000-\u109f]/);
assert.equal(copy('Sample user',label,'my'),null);
assert.equal(copy('USD',label,'zh'),null);
assert.ok(app.includes('const desired=personalSettingsCopyV268(rec.base,parent,lang)??('),'helper is wired into existing language-switch state');
const ids=['profile','general','security','icon','data'];
// Mirror the actual Settings register() movement of the Data & backup panel.
// Original data handlers are never invoked; fixture blocks network.
const dataStart="<div class=\"settings-panel-v371\" id=\"settingsPanelDataV371\" role=\"tabpanel\" style=\"display:none\">";
const dataEnd="</section>\n<section class=\"page\" id=\"cashflow-analyze\"";
const dataIndex=app.indexOf(dataStart),dataLimit=app.indexOf(dataEnd,dataIndex);
assert.ok(dataIndex>=0&&dataLimit>dataIndex&&app.split(dataStart).length===2,'unique actual data panel');
const actualData=app.slice(dataIndex,dataLimit).replace(dataStart,'<div id="settingsPanelDataV371" role="tabpanel" style="display:block">');
for(const id of ['restoreConfirmV383','excelImportBtn','backupFile','mmhDataHealthV191'])assert.ok(actualData.includes(id),'actual data control '+id);
// App icon uses the real first appearance panel; install interaction is tested separately.
const iconStart="<div class=\"settings-panel-v371\" id=\"settingsPanelAppearanceV371\" role=\"tabpanel\" style=\"display:none\">\n",iconEnd="\n<div class=\"panel\"><h2 class=\"mmh-hint-anchor-v195 mmh-context-title-v199\" data-mmh-hint-source=\"next\" tabindex=\"0\">Language</h2>";
const iconIndex=app.indexOf(iconStart),iconLimit=app.indexOf(iconEnd,iconIndex);
assert.ok(iconIndex>=0&&iconLimit>iconIndex,'actual icon panel');
const actualIcon=app.slice(iconIndex+iconStart.length,iconLimit);
assert.ok(actualIcon.includes('app-icon-preview'),'actual app icon image');
for(const [selector,key,english] of [
 ['#settings #mmhDataHealthV191 h2','Data Health / 数据健康检查','Data Health'],
 ['#settings #mmhDataHealthV191 .small','Read only · 仅检查，不自动修改数据','Read only · No automatic data changes'],
 ['#settings #mmhDataHealthRunV191','Check / 检查','Check'],
 ['#settings #mmhDataHealthStatusV191','Not checked / 尚未检查','Not checked'],
 ['#settings #selectBackupBtnV433','📥 Select Backup / Import JSON','📥 Select Backup / Import JSON'],
 ['#settings #stPage_icon .pwa-row .small','PWA icon · 192×192 / 512×512','PWA icon · 192×192 / 512×512'],
 ['#settings #stPage_icon .mmh-context-desc-v199','Used when you add MMHVAULT to your phone home screen.','Used when you add MMHVAULT to your phone home screen.']
]){
 const el={matches:s=>s===selector};
 assert.equal(copy(key,el,'en'),english);
 assert.match(copy(key,el,'zh'),/[\u4e00-\u9fff]/);
 assert.match(copy(key,el,'my'),/[\u1000-\u109f]/);
 assert.equal(copy(key,unrelated,'en'),null);
}
assert.ok(app.includes("if(lang==='en'&&personalSettingsCopyV268(current,parent,lang)==null)return;"),'initial English fixed copy');
const content={
 profile:'<form id="mmhProfileFormV1" class="mmh-profile-edit-v1"><label class="mmh-profile-name-v1"><span>Display name</span><input id="mmhProfileNameV1" value="Sample user" required></label><div class="mmh-profile-photo-v1"><div class="st-profile-avatar-v269" id="mmhProfileAvatarV269" aria-hidden="true">MF</div><span>Profile photo</span><button id="mmhProfilePickV1" type="button" class="mmh-photo-trigger-v1"><span aria-hidden="true">＋</span> Change photo</button><input type="file" hidden><small id="mmhProfileFileNameV1">JPG, PNG or WEBP · up to 2 MB</small></div></form><div class="panel" id="mmhBirthdaySettingsV34215"><div class="toolbar"><h2>Birthday</h2></div><div class="mmh-birthday-grid-v34216"><input id="mmhBirthDateInputV34215" type="date"><div class="mmh-birthday-preview-v34216"><div><b>—</b></div></div></div></div><div class="st-profile-actions-v269"><p id="mmhProfileResultV1" role="status" aria-live="polite"></p><button type="submit" form="mmhProfileFormV1" id="mmhProfileSaveV1" class="btn primary">Save changes</button></div>',
 general:'<div class="st-group"><div class="st-rows"><label class="st-row"><span class="st-icon">＄</span><span>Display currency / 默认显示货币 / ငွေကြေး</span><select><option>USD</option><option>THB</option></select></label><label class="st-row"><span class="st-icon">Aa</span><span>Font style</span><select><option>System</option></select></label></div></div>',
 security:'<div><div class="panel account-security-v379"><div class="account-security-grid-v379"><div class="account-security-card-v379" id="mmhA783SecurityCenter"><h3>Account settings</h3><div class="mmh-a783-section"><div class="mmh-a783-title">Account</div></div><button class="btn" disabled>Unavailable</button><div hidden>Hidden fixture</div></div><div class="account-security-card-v379"><div class="security-password-form-v379"><label>Password<input type="password"></label></div></div><div class="account-security-card-v379" id="mmhEmailResetCardV952"><div class="mmh-email-reset-destination-v952">Sample email</div></div></div></div></div>',
 icon:'<div>'+actualIcon+'</div><button type="button" id="stInstallAppV4" class="btn primary">Add to home screen</button>',
 data:'<div>'+actualData+'</div>'
};
const pages=ids.map(id=>'<section class="st-page" id="stPage_'+id+'" hidden><div class="st-page-head"><button class="st-back">Back</button><h2>Settings</h2></div>'+content[id]+'</section>').join('');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+css+'</head><body class="mmh-workspace-active"><main class="wrap"><section id="settings" class="page active"><div class="mmh-pf-kicker-v510">PRIVATE FINANCE CONTROL</div><div id="stSettingsHomeV3" class="st-home">Settings home</div>'+pages+'</section></main></body></html>';
const engine=process.env.MMH_SETTINGS_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 const context=await browser.newContext();
 await context.route('**/*',route=>route.request().url()==='https://mmh-settings-details.invalid/'?route.fulfill({status:200,contentType:'text/html',body:html}):route.abort());
 const page=await context.newPage();await page.goto('https://mmh-settings-details.invalid/');
 const titles={en:['Edit profile','General','Password & devices','App icon','Data & backup'],zh:['编辑资料','通用设置','密码与设备','应用图标','数据与备份'],my:['ကိုယ်ရေးအချက်အလက် ပြင်ဆင်ရန်','အထွေထွေ','စကားဝှက်နှင့် စက်များ','အက်ပ်အိုင်ကွန်','ဒေတာနှင့် အရန်သိမ်းဆည်းမှု']};
 let cases=0;
 for(const width of [360,760,1100,1500]){
  await page.setViewportSize({width,height:900});
  for(const light of [false,true]){
   await page.evaluate(light=>document.body.classList.toggle('light',light),light);
   for(const lang of ['en','zh','my']){
    for(const [i,id] of ids.entries()){
     const r=await page.evaluate(({id,lang,title})=>{
      document.documentElement.lang=lang;
      const root=document.querySelector('#settings');root.classList.add('st-in-subpage');
      document.querySelector('#stSettingsHomeV3').hidden=true;
      for(const p of root.querySelectorAll('.st-page'))p.hidden=p.id!=='stPage_'+id;
      const p=document.getElementById('stPage_'+id),h=p.querySelector('.st-page-head');h.querySelector('h2').textContent=title;
      const panel=p.querySelector('.panel,.st-rows,.mmh-profile-edit-v1');
      const controls=[...p.querySelectorAll("input:not([type=file]):not([type=hidden]),select,.mmh-photo-trigger-v1,.st-group,.mmh-email-reset-destination-v952")];
      const restore=p.querySelector('#restorePreviewV383'),restoreStat=p.querySelector('.restore-stat-v383');
      const restoreBg=restore?getComputedStyle(restore).backgroundColor:null;
      const restoreStatBg=restoreStat?getComputedStyle(restoreStat).backgroundColor:null;
      const restoreGradient=restore?getComputedStyle(restore).backgroundImage:null;
      const importDisabled=p.querySelector('#excelImportBtn')?.disabled??null;
      const iconImg=p.querySelector('.app-icon-preview');
      const security=p.querySelector(".account-security-grid-v379");
      const main=document.querySelector('main.wrap'),a=p.getBoundingClientRect(),b=h.getBoundingClientRect();
      return {restoreBg,restoreStatBg,restoreGradient,importDisabled,iconPresent:!!iconImg,pseudo:getComputedStyle(h,"::before").content,after:getComputedStyle(h,"::after").content,kicker:getComputedStyle(root.querySelector(".mmh-pf-kicker-v510")).display,controls:controls.map(c=>({name:c.id||c.className||c.tagName,bg:getComputedStyle(c).backgroundImage})),securityWidth:security?.getBoundingClientRect().width??0,securityPanelWidth:security?.parentElement.clientWidth??0,width:a.width,headWidth:b.width,headHeight:b.height,headBg:getComputedStyle(h).backgroundImage,panelBg:getComputedStyle(panel).backgroundImage,canvas:getComputedStyle(main).backgroundColor,body:getComputedStyle(document.body).backgroundColor,overflow:p.scrollWidth-p.clientWidth};
     },{id,lang,title:titles[lang][i]});
     const label=[width,light,lang,id].join('/');
     assert.ok(r.width>0&&r.headHeight>=40,label+' visible header');
     assert.ok(Math.abs(r.width-r.headWidth)<3,label+' matching widths');
     assert.equal(r.headBg,'none',label+' no header gradient');
     assert.equal(r.pseudo,'none',label+' no legacy header overlay');
     assert.equal(r.after,'none',label+' no trailing overlay');
     assert.equal(r.kicker,'none',label+' no untranslated legacy kicker');
     for(const control of r.controls)assert.equal(control.bg,'none',label+' flat '+control.name);
     if(id==='profile'){
      const info=await page.evaluate(()=>{
       const form=document.getElementById('mmhProfileFormV1'),save=document.getElementById('mmhProfileSaveV1'),avatar=document.getElementById('mmhProfileAvatarV269'),photo=document.querySelector('.mmh-profile-photo-v1'),name=document.querySelector('.mmh-profile-name-v1'),birthday=document.getElementById('mmhBirthdaySettingsV34215');
       const rect=e=>e.getBoundingClientRect();
       let submits=0;const onSubmit=e=>{e.preventDefault();submits++};form.addEventListener('submit',onSubmit);save.click();form.removeEventListener('submit',onSubmit);
       return {associated:save.form===form,submits,avatarSize:rect(avatar).width,avatarHeight:rect(avatar).height,photoAbove:rect(photo).bottom<=rect(name).top+1,saveAfter:rect(save).top>=rect(birthday).bottom-1,buttonHeight:rect(save).height,buttonFits:save.scrollWidth-save.clientWidth<=2};
      });
      assert.ok(info.associated&&info.submits===1,label+' external save retains form submit');
      assert.ok(info.avatarSize>=56&&Math.abs(info.avatarSize-info.avatarHeight)<=1,label+' square profile preview');
      assert.ok(info.photoAbove&&info.saveAfter&&info.buttonHeight>=44&&info.buttonFits,label+' photo, name, birthday and action ordering');
     }
     if(id==='security')assert.ok(r.securityWidth>=r.securityPanelWidth-44,label+' security grid fills panel');
     if(id==='data'){
      assert.equal(r.restoreBg,r.restoreStatBg,label+' preview matches V2 surface');
      assert.equal(r.restoreGradient,'none',label+' no restore preview gradient');
      assert.equal(r.importDisabled,true,label+' import remains disabled');
     }
     if(id==='icon')assert.equal(r.iconPresent,true,label+' real icon panel');
     assert.equal(r.panelBg,'none',label+' no legacy gradient');
     assert.equal(r.canvas,r.body,label+' continuous canvas');
     assert.ok(r.overflow<=3,label+' no horizontal overflow');
     cases++;
    }
   }
  }
 }
 console.log('PASS: V2.0.69 Settings full linked CSS details '+cases+' '+engine+' isolated fixture combinations');
}finally{await browser.close()}
