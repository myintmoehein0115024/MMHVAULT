/* Browser-only APP V11.7 UI QA: local fixtures, NO real Auth/ledger/cloud. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const base='http://127.0.0.1:8768/tests/app-v11-manage-hierarchy-browser-fixture.html';
const widths=[393,768,1440];
const say=(condition,label)=>{assert.ok(condition,label);console.log('PASS '+label)};
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:800},serviceWorkers:'block'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',err=>errors.push(err.message));
      const resp=await page.goto(base,{waitUntil:'load'});
      say(resp?.status()===200,width+' fixture served');
      await page.waitForSelector('#mmhHierarchyManage .mmh-hier-card');
      const cards=page.locator('.mmh-hier-card');
      say(await cards.count()===3,width+' three Manage cards');
      say((await cards.nth(0).textContent()).includes('No items yet'),width+' new Type empty');
      say((await cards.nth(1).textContent()).includes('No items yet'),width+' new Transaction empty');
      say((await cards.nth(2).textContent()).includes('No items yet'),width+' no ghost default Category');
      say(await page.locator('#txCategory option').count()===0,width+' Add Transaction Category truly empty');
      // Category prerequisites: disable empty-editor Add until a parent exists.
      await cards.nth(2).getByRole('button',{name:'Manage'}).click();
      let dlg=page.locator('.mmh-hier-dialog');
      say(await dlg.getByRole('button',{name:'+ Add Category'}).isDisabled(),width+' Category Add requires Transaction');
      await page.keyboard.press('Escape');
      say(await page.locator('.mmh-hier-overlay').count()===0,width+' Escape dismisses Category glass dialog');
      say(await cards.nth(2).getByRole('button',{name:'Manage'}).evaluate(el=>el===document.activeElement),
        width+' dialog returns keyboard focus');
      // Step 1: Type.
      await cards.nth(0).getByRole('button',{name:'Manage'}).click();
      dlg=page.locator('.mmh-hier-dialog');
      await dlg.getByRole('button',{name:'+ Add Type'}).click();
      await dlg.locator('input[type=text]').fill('Income');
      await dlg.getByRole('button',{name:'Save'}).click();
      say((await cards.nth(0).textContent()).includes('Income'),width+' Type saved');
      await dlg.locator('header button').click();
      // Step 2: Transaction assigned to Income.
      await cards.nth(1).getByRole('button',{name:'Manage'}).click();
      dlg=page.locator('.mmh-hier-dialog');
      await dlg.getByRole('button',{name:'+ Add Transaction'}).click();
      await dlg.locator('input[type=text]').fill('Income2');
      await dlg.getByRole('button',{name:'Save'}).click();
      say((await cards.nth(1).textContent()).includes('Income2'),width+' Transaction saved and linked to Type');
      await dlg.locator('header button').click();
      // Step 3: Category under the exact Transaction.
      await cards.nth(2).getByRole('button',{name:'Manage'}).click();
      dlg=page.locator('.mmh-hier-dialog');
      await dlg.getByRole('button',{name:'+ Add Category'}).click();
      await dlg.locator('input[type=text]').fill('Salary');
      await dlg.getByRole('button',{name:'Save'}).click();
      say((await cards.nth(2).textContent()).includes('Salary'),width+' Category added under Income2');
      await dlg.locator('header button').click();
      const options=await page.evaluate(()=>Object.fromEntries(['txType','txGroup','txCategory']
        .map(id=>[id,[...document.getElementById(id).options].map(x=>x.textContent)])));
      assert.deepEqual(options,{txType:['Income'],txGroup:['Income2'],txCategory:['Salary']});
      say(true,width+' original Add Transaction selectors cascade exactly');
      const save=page.locator('#txForm .actions button');
      say(await save.isEnabled(),width+' fully linked native Save is enabled');
      // Mobile/tablet/desktop dialog must fit without horizontal scrolling.
      await cards.nth(2).getByRole('button',{name:'Manage'}).click();
      const fit=await page.evaluate(()=>{
        const r=document.querySelector('.mmh-hier-dialog').getBoundingClientRect();
        return {width:innerWidth,left:r.left,right:r.right,height:innerHeight,top:r.top,bottom:r.bottom,
          scroll:document.documentElement.scrollWidth};
      });
      say(fit.left>=-2&&fit.right<=width+2&&fit.top>=-2&&fit.bottom<=fit.height+2,
        width+' dialog within safe viewport '+JSON.stringify(fit));
      say(fit.scroll<=width+2,width+' no horizontal overflow');
      // Once a parent is archived, its descendants are hidden in future selects.
      await dlg.getByRole('button',{name:'Archive'}).click();
      say(await page.locator('#txCategory option').count()===0,width+' archived Salary hidden from Add Transaction');
      say((await page.evaluate(()=>window.__syntheticWrites))===4,width+' exactly four synthetic writes, no default auto-migration');
      await page.keyboard.press('Escape');
      // Interface language follows page preference for the cards.
      await page.evaluate(()=>{
        localStorage.setItem('mmhvault_language_v3363','zh');
        window.dispatchEvent(new Event('mmhvault-language-change'));
      });
      await page.waitForFunction(()=>document.querySelector('#mmhHierarchyManage')?.textContent.includes('管理记账字段'));
      say(true,width+' Chinese locale follows app setting');
      await page.evaluate(()=>{
        localStorage.setItem('mmhvault_language_v3363','my');
        window.dispatchEvent(new Event('mmhvault-language-change'));
      });
      await page.waitForFunction(()=>document.querySelector('#mmhHierarchyManage')?.textContent.includes('ငွေစာရင်း'));
      say(true,width+' Burmese locale follows app setting');
      say(errors.length===0,width+' no browser script exception '+errors.join('; '));
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:393,height:800},serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'?legacy=1',{waitUntil:'load'});
    await page.waitForSelector('#mmhHierarchyManage .mmh-hier-card');
    const cards=page.locator('.mmh-hier-card');
    say(await cards.count()===3,'legacy account has same three summary cards');
    say((await cards.nth(2).textContent()).includes('Salary'),'legacy Salary shown without deleting history');
    say(await page.evaluate(()=>window.__syntheticWrites)===0,'legacy view opens with zero config writes');
    await cards.nth(2).getByRole('button',{name:'Manage'}).click();
    say(await page.locator('.mmh-hier-row strong').filter({hasText:'Salary'}).count()>0,
      'legacy Category remains visible within linked glass modal');
    say(errors.length===0,'legacy page has no JavaScript exception');
    await context.close();
    console.log('APP V11.7 synthetic Chrome Manage + responsive smoke PASSED');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
