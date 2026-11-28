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
const ids=['profile','general','security','icon','data'];
const content={
 profile:'<form id="mmhProfileFormV1" class="mmh-profile-edit-v1"><label class="mmh-profile-name-v1">Display name<input value="Sample user"></label><div class="mmh-profile-photo-v1"><button type="button" class="mmh-photo-trigger-v1">Change photo</button><input type="file" hidden></div><button type="button" id="mmhProfileSaveV1" class="btn primary">Save changes</button></form><div class="panel" id="mmhBirthdaySettingsV34215"><div class="toolbar"><h2>Birthday</h2></div><div class="mmh-birthday-grid-v34216"><input id="mmhBirthDateInputV34215" type="date"><div class="mmh-birthday-preview-v34216"><div><b>—</b></div></div></div></div>',
 general:'<div class="st-group"><div class="st-rows"><label class="st-row"><span class="st-icon">＄</span><span>Display currency / 默认显示货币 / ငွေကြေး</span><select><option>USD</option><option>THB</option></select></label><label class="st-row"><span class="st-icon">Aa</span><span>Font style</span><select><option>System</option></select></label></div></div>',
 security:'<div><div class="panel account-security-v379"><div class="account-security-grid-v379"><div class="account-security-card-v379" id="mmhA783SecurityCenter"><h3>Account settings</h3><div class="mmh-a783-section"><div class="mmh-a783-title">Account</div></div><button class="btn" disabled>Unavailable</button><div hidden>Hidden fixture</div></div><div class="account-security-card-v379"><div class="security-password-form-v379"><label>Password<input type="password"></label></div></div><div class="account-security-card-v379" id="mmhEmailResetCardV952"><div class="mmh-email-reset-destination-v952">Sample email</div></div></div></div></div>',
 icon:'<div><div class="panel"><div class="pwa-row"><div>MMHVAULT</div></div><button class="btn primary">Add to home screen</button></div></div>',
 data:'<div><div class="panel"><div class="data-center-grid-v380"><div class="data-center-stat-v380"><div class="label">Transactions</div><div class="value">0</div></div><div class="data-center-stat-v380"><div class="label">Last backup</div><div class="value">Never</div></div></div><button class="btn">Export</button></div></div>'
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
      const security=p.querySelector(".account-security-grid-v379");
      const main=document.querySelector('main.wrap'),a=p.getBoundingClientRect(),b=h.getBoundingClientRect();
      return {pseudo:getComputedStyle(h,"::before").content,after:getComputedStyle(h,"::after").content,kicker:getComputedStyle(root.querySelector(".mmh-pf-kicker-v510")).display,controls:controls.map(c=>({name:c.id||c.className||c.tagName,bg:getComputedStyle(c).backgroundImage})),securityWidth:security?.getBoundingClientRect().width??0,securityPanelWidth:security?.parentElement.clientWidth??0,width:a.width,headWidth:b.width,headHeight:b.height,headBg:getComputedStyle(h).backgroundImage,panelBg:getComputedStyle(panel).backgroundImage,canvas:getComputedStyle(main).backgroundColor,body:getComputedStyle(document.body).backgroundColor,overflow:p.scrollWidth-p.clientWidth};
     },{id,lang,title:titles[lang][i]});
     const label=[width,light,lang,id].join('/');
     assert.ok(r.width>0&&r.headHeight>=40,label+' visible header');
     assert.ok(Math.abs(r.width-r.headWidth)<3,label+' matching widths');
     assert.equal(r.headBg,'none',label+' no header gradient');
     assert.equal(r.pseudo,'none',label+' no legacy header overlay');
     assert.equal(r.after,'none',label+' no trailing overlay');
     assert.equal(r.kicker,'none',label+' no untranslated legacy kicker');
     for(const control of r.controls)assert.equal(control.bg,'none',label+' flat '+control.name);
     if(id==='security')assert.ok(r.securityWidth>=r.securityPanelWidth-44,label+' security grid fills panel');
     assert.equal(r.panelBg,'none',label+' no legacy gradient');
     assert.equal(r.canvas,r.body,label+' continuous canvas');
     assert.ok(r.overflow<=3,label+' no horizontal overflow');
     cases++;
    }
   }
  }
 }
 console.log('PASS: V2.0.68 Settings full linked CSS details '+cases+' '+engine+' isolated fixture combinations');
}finally{await browser.close()}
