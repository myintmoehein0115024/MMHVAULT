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
const actualData=app.slice(dataIndex,dataLimit).replace(dataStart,'<div id="settingsPanelDataV371" role="tabpanel" style="display:block">').replace('id="backupHistoryListV381"></div>','id="backupHistoryListV381"><div class="backup-history-empty-v381">No backups saved on this device yet.</div></div>').replace('class="restore-preview-v383" id="restorePreviewV383"','class="restore-preview-v383 show" id="restorePreviewV383"').replace('id="restoreFileNameV383">Backup preview','id="restoreFileNameV383">MMHVAULT_Synthetic_Backup_Long_File_Name.json');
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
// Use actual profile and birthday markup, moving the existing save/result into the shared card as register() does.
const profileForm=app.match(/<form class="mmh-profile-edit-v1" id="mmhProfileFormV1">[\s\S]*?<\/form>/)?.[0];
const birthStart=app.indexOf('<div class="panel mmh-birthday-settings-v34216" id="mmhBirthdaySettingsV34215">');
const birthEnd=app.indexOf('\n</div>\n</div>\n\n<div class="mmh-manager-overlay-v1"',birthStart);
assert.ok(profileForm&&birthStart>=0&&birthEnd>birthStart,'actual profile and birthday markup');
const birthday=app.slice(birthStart,birthEnd+7);
const save=profileForm.match(/<button[^>]*id="mmhProfileSaveV1"[^>]*>[\s\S]*?<\/button>/)[0];
const result=profileForm.match(/<p id="mmhProfileResultV1"[^>]*>[\s\S]*?<\/p>/)[0];
const actualProfile='<div id="mmhProfileCardV271">'+profileForm.replace(save,'').replace(result,'').replace('</form>',birthday+'</form>').replace('autocomplete="nickname"','autocomplete="nickname" value="Sample user"')+'<div class="st-profile-actions-v269">'+result+'<button type="button" class="btn" id="mmhProfileCancelV271">Cancel</button>'+save.replace('type="submit"','type="submit" form="mmhProfileFormV1"')+'</div></div>';
const content={
 profile:actualProfile,
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
 // Isolated real runtime calendar and local storage (no account APIs or live data).
 await page.evaluate(()=>{document.getElementById('stPage_profile').hidden=false;document.getElementById('stSettingsHomeV3').hidden=true;window.currentSessionUser={id:'synthetic-profile-test'};});
 // Execute the actual translation text/attribute paths on the real profile DOM.
 // Unrelated workspace translators are stubs; no profile upload or save handler is loaded.
 const attrStart=app.indexOf('function translateAttributes(root){'),attrEnd=app.indexOf('function translateDynamicText(base){',attrStart);
 const textStart=app.indexOf('function personalSettingsCopyV268(base,el,locale){'),textEnd=app.indexOf('function syncLanguageChoices(){',textStart);
 assert.ok(attrStart>=0&&attrEnd>attrStart&&textStart>=0&&textEnd>textStart,'actual translator boundaries');
 await page.addScriptTag({content:`(()=>{
  let lang='en';
  const no=()=>false,investCopySurfaceV236=no,txUiSurfaceV2=no,recurringCopySurfaceV264=no,goalCopySurfaceV263=no,myWorkspaceUiV2=no;
  const zh={},zhWorkspaceV2={};
  const fallback=base=>base==='Sample user.png'?'UNEXPECTED FILE TRANSLATION':base;
  const translateDynamicText=fallback,myWorkspaceTextV2=fallback;
  `+app.slice(attrStart,attrEnd)+app.slice(textStart,textEnd)+`
  window.translateProfileFixtureV271=locale=>{lang=locale;document.documentElement.lang=locale==='zh'?'zh-CN':locale;translateRoot(document.getElementById('stPage_profile'));};
 })();`});
 const profileName=page.locator('#mmhProfileNameV1'),profileFile=page.locator('#mmhProfilePhotoV1'),profileHint=page.locator('#mmhProfileFileNameV1'),profileResult=page.locator('#mmhProfileResultV1');
 const setProfileLocale=lang=>page.evaluate(lang=>window.translateProfileFixtureV271(lang),lang);
 const labels=[
  ['zh','昵称','您的昵称','更换头像','保存更改','取消','正在保存个人资料…','JPG、PNG 或 WEBP · 最大 2 MB'],
  ['my','ပြသမည့် အမည်','သင့်ပြသမည့် အမည်','ပရိုဖိုင်ပုံ ပြောင်းရန်','ပြောင်းလဲမှုများ သိမ်းရန်','မလုပ်တော့ပါ','ပရိုဖိုင် သိမ်းဆည်းနေသည်…','JPG၊ PNG သို့မဟုတ် WEBP · 2 MB အထိ'],
  ['en','Display name','Your display name','Change photo','Save changes','Cancel','Saving profile…','JPG, PNG or WEBP · up to 2 MB']
 ];
 await profileName.fill('Sample user');
 await profileFile.setInputFiles({name:'Sample user.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])});
 await profileHint.evaluate(e=>e.textContent='Sample user.png');
 await profileResult.evaluate(e=>e.textContent='Saving profile…');
 for(const [locale,name,placeholder,photo,save,cancel,status] of labels){
  await setProfileLocale(locale);
  assert.equal(await page.locator('.mmh-profile-name-v1>span').textContent(),name);
  assert.equal(await profileName.getAttribute('placeholder'),placeholder);
  assert.equal(await page.locator('#mmhProfilePickV1 span').textContent(),photo);
  assert.equal(await page.locator('#mmhProfileSaveV1').textContent(),save);
  assert.equal(await page.locator('#mmhProfileCancelV271').textContent(),cancel);
  assert.equal(await profileResult.textContent(),status);
  assert.equal(await profileName.inputValue(),'Sample user');
  assert.equal(await profileHint.textContent(),'Sample user.png');
 }
 await profileFile.setInputFiles([]);
 await profileHint.evaluate(e=>e.textContent='JPG, PNG or WEBP · up to 2 MB');
 for(const [locale,,,,,,,hint] of labels){await setProfileLocale(locale);assert.equal(await profileHint.textContent(),hint);}
 await profileResult.evaluate(e=>e.textContent='');
 console.log('PASS: actual profile translation paths EN/ZH/MY roundtrip, nickname and selected filename isolation in '+engine);
 const ageScript=app.match(/<script id="mmhvault-v34216-age-js">([\s\S]*?)<\/script>/)[1];
 await page.addScriptTag({content:ageScript});
 await page.locator('#mmhBirthInfoV271').click();
 assert.equal(await page.locator('#mmhSettingsAgeValueV34215').textContent(),'0');
 await page.locator('#mmhBirthDetailsCloseV271').click();
 await page.locator('#mmhBirthOpenV271').click();
 await page.locator('#mmhBirthYearV271').selectOption('2000');
 await page.locator('#mmhBirthMonthV271').selectOption('1');
 await page.locator('#mmhBirthDaysV271 button').filter({hasText:/^29$/}).click();
 await page.locator('#mmhBirthTimeV271').fill('14:35');
 await page.locator('#mmhBirthConfirmV271').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('mmhvault_birth_date_v34216_synthetic-profile-test')),'2000-02-29T14:35');
 await page.locator('#mmhBirthOpenV271').click();
 await page.locator('#mmhBirthClearTimeV271').click();
 await page.locator('#mmhBirthConfirmV271').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('mmhvault_birth_date_v34216_synthetic-profile-test')),'2000-02-29');
 await page.locator('#mmhBirthOpenV271').click();
 await page.locator('#mmhBirthClearV271').click();
 await page.locator('#mmhBirthCancelV271').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('mmhvault_birth_date_v34216_synthetic-profile-test')),'2000-02-29');
 await page.locator('#mmhBirthOpenV271').click();
 await page.locator('#mmhBirthClearV271').click();
 await page.locator('#mmhBirthConfirmV271').click();
 await page.locator('#mmhBirthInfoV271').click();
 for(const id of ['mmhSettingsAgeValueV34215','mmhSettingsBirthdayValueV34215','mmhSettingsBirthdayCountdownV34215'])assert.equal(await page.locator('#'+id).textContent(),'0');
 await page.locator('#mmhBirthDetailsCloseV271').click();
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
      const controls=[...p.querySelectorAll("input:not([type=file]):not([type=hidden]),select,.mmh-photo-trigger-v1,.st-group,.mmh-email-reset-destination-v952")].filter(c=>c.getBoundingClientRect().width>0);
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
       return {associated:save.form===form,submits,avatarSize:rect(avatar).width,avatarHeight:rect(avatar).height,photoPlaced:rect(photo).bottom<=rect(name).top+1||rect(photo).right<=rect(name).left+1,hiddenDetails:!document.getElementById('mmhBirthDetailsV271').open&&document.querySelector('.mmh-birthday-preview-v34216').getBoundingClientRect().width===0,saveAfter:rect(save).top>=rect(birthday).bottom-1,buttonHeight:rect(save).height,buttonFits:save.scrollWidth-save.clientWidth<=2};
      });
      assert.ok(info.associated&&info.submits===1,label+' external save retains form submit');
      assert.ok(info.avatarSize>=56&&Math.abs(info.avatarSize-info.avatarHeight)<=1,label+' square profile preview');
      assert.ok(info.photoPlaced&&info.hiddenDetails&&info.saveAfter&&info.buttonHeight>=44&&info.buttonFits,label+' photo, name, birthday and action ordering');
     }
     if(id==='security')assert.ok(r.securityWidth>=r.securityPanelWidth-44,label+' security grid fills panel');
     if(id==='data'){
      assert.equal(r.restoreBg,r.restoreStatBg,label+' preview matches V2 surface');
      assert.equal(r.restoreGradient,'none',label+' no restore preview gradient');
      assert.equal(r.importDisabled,true,label+' import remains disabled');
      const visual=await page.evaluate(()=>{
       const f=document.getElementById('restoreFileNameV383'),empty=document.querySelector('.backup-history-empty-v381'),s=document.getElementById('backupStatus'),cs=e=>getComputedStyle(e);
       return {fileBg:cs(f).backgroundImage,fileColor:cs(f).backgroundColor,fileBorder:cs(f).borderTopWidth,fileHeight:f.getBoundingClientRect().height,emptyBg:cs(empty).backgroundImage,emptyColor:cs(empty).backgroundColor,status:cs(s).display};
      });
      assert.equal(visual.fileBg,'none',label+' file name has no legacy gradient');
      assert.equal(visual.fileColor,'rgba(0, 0, 0, 0)',label+' file name is transparent');
      assert.equal(visual.fileBorder,'0px',label+' file name no old box');
      assert.equal(visual.emptyBg,'none',label+' backup history flat surface');
      assert.notEqual(visual.emptyColor,'rgba(0, 0, 0, 0)',label+' backup history V2 surface');
      assert.equal(visual.status,'none',label+' empty status hidden');
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
 const resetStart=app.indexOf('  function ensureResetModal(){'),resetEnd=app.indexOf('  window.resetMyCloudDataV380=async function(){',resetStart);
 assert.ok(resetStart>=0&&resetEnd>resetStart,'actual reset confirmation functions only');
 await page.addScriptTag({content:"(()=>{const rootId='mmhResetConfirmV49',isZh=()=>document.documentElement.lang==='zh';"+app.slice(resetStart,resetEnd)+"window.openResetFixtureV270=openResetConfirm;})();"});
 let resets=0;
 for(const width of [360,760,1100,1500])for(const light of [false,true]){
  await page.setViewportSize({width,height:width===360?480:900});
  await page.evaluate(light=>{document.body.classList.toggle('light',light);window.resetFixtureResultV270=null;window.openResetFixtureV270().then(v=>window.resetFixtureResultV270=v)},light);
  const reset=page.locator('#mmhResetConfirmV49'),ok=page.locator('#mmhResetConfirmBtnV49'),input=page.locator('#mmhResetInputV49');
  assert.equal(await reset.isVisible(),true);assert.equal(await ok.isDisabled(),true);
  assert.ok(await reset.locator('.mmh-reset-card').evaluate(e=>getComputedStyle(e).backgroundImage==='none'&&e.getBoundingClientRect().height<=innerHeight-16&&e.scrollWidth-e.clientWidth<=2));
  await input.fill('incorrect');assert.equal(await ok.isDisabled(),true);
  await input.fill('RESET');assert.equal(await ok.isEnabled(),true);
  await input.fill('');assert.equal(await ok.isDisabled(),true);
  await page.locator('#mmhResetCancelV49').click();await page.waitForFunction(()=>window.resetFixtureResultV270===false);
  resets++;
 }
 console.log('PASS: V2.0.70 Settings full linked CSS details '+cases+' '+engine+' isolated fixture combinations; reset confirmation-only '+resets+' cases, no data handler');
}finally{await browser.close()}
