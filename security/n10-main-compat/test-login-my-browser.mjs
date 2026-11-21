// Pure browser-only N10 language smoke: no Supabase, login requests or Recovery Key values.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {chromium,webkit} from 'playwright';

const source=readFileSync(resolve('login.html'),'utf8');
const locale=readFileSync(resolve('js/mmhvault-n10-auth-my.js'),'utf8');
const re=/<script>\s*(\/\* N10-A7\.55[^]*?)<\/script>/;
const m=re.exec(source);
assert.ok(m, 'N10 login translator inline script should be present');
const translator=m[1];
const fixture=`<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>
<header><div class="mmh-lang-switcher">
<button data-lang="en" aria-pressed="true">EN</button>
<button data-lang="zh" aria-pressed="false">中文</button>
<button data-lang="my" aria-pressed="false">MY</button></div></header>
<h1 id="title">Welcome Back</h1><p id="subtitle">Access your private MMHVAULT workspace</p>
<form id="signin" class="form active"><div><label>Password</label>
<input type="password" placeholder="Email or Username"><button class="eye" type="button">Show</button></div>
<button type="button" class="primary">Sign In</button></form>
<form id="signup" class="form"><button type="button" class="primary">Create Account</button></form>
<form id="usernameSignUp" class="form"><button type="button" class="primary">Generate recovery key</button></form>
<form id="recovery" class="form"><button id="recoverySave" type="button">Update Password</button></form>
</body></html>`;
const server=createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fixture);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
try{
 for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',err=>errors.push(String(err.message)));
    await page.goto(origin);
    await page.evaluate(()=>{
      localStorage.setItem('mmhvault.landing.language','my');
      localStorage.setItem('mmhvault-language','en'); // Landing's current selection wins.
    });
    await page.addScriptTag({content:locale});
    await page.addScriptTag({content:translator});
    const initial=await page.evaluate(()=>({
      lang:document.documentElement.lang,
      code:window.getMMHVAULTLanguage(),
      heading:document.getElementById('title').textContent,
      password:document.querySelector('#signin label').textContent,
      placeholder:document.querySelector('#signin input').placeholder,
      aria:document.querySelector('[data-lang=my]').getAttribute('aria-pressed')
    }));
    assert.equal(initial.lang,'my');
    assert.equal(initial.code,'my');
    assert.equal(initial.aria,'true');
    assert.notEqual(initial.heading,'Welcome Back');
    assert.notEqual(initial.password,'Password');
    assert.notEqual(initial.placeholder,'Email or Username');
    await page.locator('[data-lang=zh]').click();
    const zh=await page.evaluate(()=>({
      lang:document.documentElement.lang,
      heading:document.getElementById('title').textContent,
      pref:localStorage.getItem('mmhvault.landing.language')
    }));
    assert.deepEqual(zh,{lang:'zh-CN',heading:'欢迎回来',pref:'zh'});
    await page.locator('[data-lang=en]').click();
    const en=await page.evaluate(()=>({
      lang:document.documentElement.lang,
      heading:document.getElementById('title').textContent,
      pref:localStorage.getItem('mmhvault-language'),
      appPref:localStorage.getItem('mmhvault_language_v3363')
    }));
    assert.deepEqual(en,{lang:'en',heading:'Welcome Back',pref:'en',appPref:'en'});
    assert.deepEqual(errors,[]);
    await page.close();
    console.log('PASS '+name+' trilingual auth labels, Landing preference, no JS errors');
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
