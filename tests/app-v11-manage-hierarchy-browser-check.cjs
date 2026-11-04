/* Browser-only APP V11.7 UI QA: local fixtures, NO real Auth/ledger/cloud. */
'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright-core');
const engine=process.env.MMH_BROWSER_ENGINE==='webkit'?'webkit':'chrome';
const base='http://127.0.0.1:8768/tests/app-v11-manage-hierarchy-browser-fixture.html';
const widths=[393,768,1440];
const say=(condition,label)=>{assert.ok(condition,label);console.log('PASS '+label)};
(async()=>{
  const browser=engine==='webkit'
    ?await webkit.launch({headless:true})
    :await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:800},serviceWorkers:'block',
        ...(engine==='webkit'&&width<=768?{isMobile:true,hasTouch:true,deviceScaleFactor:2}:{})});
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
        .map(id=>[id,[...document.getElementById(id).options]
          .filter(x=>x.dataset.mmhChoiceId).map(x=>x.textContent)])));
      assert.deepEqual(options,{txType:['Income'],txGroup:[],txCategory:[]});
      say(true,width+' Add Transaction has exact linked Type, no ghost defaults');
      const save=page.locator('#txForm .actions button');
      say(await save.isDisabled(),width+' new transaction cannot save before explicit choices');
      await page.locator('#txType').selectOption({label:'Income'});
      await page.locator('#txGroup').selectOption({label:'Income2'});
      await page.locator('#txCategory').selectOption({label:'Salary'});
      say(await save.isEnabled(),width+' explicit Type→Transaction→Category enables native Save');
      // The full APP's legacy syncTransactionGroup()/updateCategories()
      // still rebuild these native selects after a successful ledger write.
      // V11.7 must restore exact choice IDs and reject ghost legacy options.
      await page.evaluate(()=>{
        document.getElementById('txType').innerHTML='<option value="Expense">Expense</option>';
        document.getElementById('txGroup').innerHTML='<option value="Expense">Expense</option>';
        document.getElementById('txCategory').innerHTML='<option value="Ghost">Ghost</option>';
      });
      await page.waitForFunction(()=>['txType','txGroup','txCategory'].every(id=>
        [...document.getElementById(id).options].some(o=>!!o.dataset.mmhChoiceId)));
      const reset=await page.evaluate(()=>Object.fromEntries(
        ['txType','txGroup','txCategory'].map(id=>{
          const el=document.getElementById(id);
          return [id,{value:el.value,selectedId:el.selectedOptions[0]?.dataset.mmhChoiceId||'',
            ghost:[...el.options].some(x=>x.textContent==='Ghost')}];
        })));
      say(reset.txType.value==='Income'&&reset.txGroup.value==='Income'&&
        reset.txCategory.value==='Salary'&&
        reset.txType.selectedId&&reset.txGroup.selectedId&&reset.txCategory.selectedId&&
        !reset.txCategory.ghost,
        width+' legacy selector rebuild cannot overwrite linked canonical Add choice');
      say(await save.isEnabled(),width+' native Save remains correctly linked after legacy rebuild');
      // Simulate a confirmed ledger insert followed by a failed config write.
      // This must expose a retry that stores ONLY the missing Manage link.
      await page.evaluate(()=>{
        window.__failNextPersist=true;
        const f=document.getElementById('txForm');
        f.addEventListener('submit',e=>e.preventDefault(),{once:true});
        f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        window.MMHV11HierarchyLive.onLedgerInserted('fixture-A','fixture-saved-ledger-42',
          {type:'Income',group:'Income',category:'Salary'});
      });
      await page.waitForFunction(()=>document.querySelector('#mmhHierarchyManage [role=status]')?.textContent
        .includes('link was not stored'));
      say(await page.evaluate(()=>window.__syntheticWrites)===3,
        width+' failed post-insert config write did not silently persist');
      await page.waitForFunction(()=>window.__syntheticLedgerRefreshes===2);
      const reloaded=await page.evaluate(()=>({
        count:window.transactions.length,row:window.transactions[0],
        refreshes:window.__syntheticLedgerRefreshes
      }));
      say(reloaded.count===1&&reloaded.row.user_id==='fixture-A'&&
        reloaded.row.id==='fixture-saved-ledger-42',
        width+' confirmed insert is loaded for signed owner, including one stale-read retry');
      say(reloaded.refreshes===2,
        width+' post-insert refresh performs reads only and never replays INSERT');
      await page.locator('#mmhHierarchyManage [role=status]').getByRole('button',{name:'Retry link'}).click();
      await page.waitForFunction(()=>document.querySelector('#mmhHierarchyManage [role=status]')?.textContent
        .includes('awaiting cloud verification'));
      say(await page.evaluate(()=>window.__syntheticWrites)===4,
        width+' retry wrote sidecar only, never resubmitted native form');
      // A confirmed ledger row with a missing/stale UI capture still must
      // refresh Accounts/Analyze. Never claim an invented Manage link.
      await page.evaluate(()=>window.MMHV11HierarchyLive.onLedgerInserted('fixture-A',
        'fixture-saved-ledger-42',{type:'Income',group:'Income',category:'Salary'}));
      await page.waitForFunction(()=>window.__syntheticLedgerRefreshes===3);
      say(await page.evaluate(()=>window.transactions.length===1&&
        window.__syntheticWrites===4&&window.__messages.some(m=>
          m.text.includes('Manage choices could not be verified'))),
        width+' unmatched sidecar callback refreshes saved ledger without duplicate config or transaction');
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
      // A second available Category must NOT silently replace the original
      // selected Salary after Archive, even if it is the only remaining option.
      await dlg.getByRole('button',{name:'+ Add Category'}).click();
      await dlg.locator('input[type=text]').fill('Bonus');
      await dlg.getByRole('button',{name:'Save'}).click();
      say(await save.isEnabled(),width+' adding another Category preserves explicit Salary choice');
      await dlg.getByRole('button',{name:'Archive'}).first().click();
      say(await page.locator('#txCategory').inputValue()==='',width+' archived selected Salary clears native Category');
      say(await save.isDisabled(),width+' Archive cannot silently recategorize next ledger insert to Bonus');
      const remaining=await page.locator('#txCategory option').allTextContents();
      say(remaining.includes('Bonus')&&!remaining.includes('Salary'),
        width+' archived Salary hidden while Bonus is available');
      await page.locator('#txCategory').selectOption({label:'Bonus'});
      say(await save.isEnabled(),width+' explicitly selecting Bonus re-enables Save');
      await dlg.getByRole('button',{name:'Archive'}).last().click();
      say(await page.locator('#txCategory option').count()===0,width+' all archived Categories hidden from Add Transaction');
      say((await page.evaluate(()=>window.__syntheticWrites))===7,width+' seven synthetic config writes including safe retry and two Archives');
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
      // Keyboard focus must stay inside a populated modal, including reverse Tab.
      await cards.nth(2).getByRole('button',{name:'စီမံရန်'}).click();
      const tabDialog=page.locator('.mmh-hier-dialog');
      const tabbables=tabDialog.locator('button:not([disabled])');
      await tabbables.first().focus();
      await page.keyboard.press('Shift+Tab');
      say(await tabbables.last().evaluate(el=>el===document.activeElement),
        width+' Shift+Tab wraps to last modal control');
      await page.keyboard.press('Tab');
      say(await tabbables.first().evaluate(el=>el===document.activeElement),
        width+' Tab wraps to first modal control');
      // The live cloud sync gate has detected a divergent device. It must
      // close the editor, preserve existing choices, and pause new writes.
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mmhvault:config-link-sync-blocked',
        {detail:{userId:'fixture-A'}})));
      await page.waitForFunction(()=>!!document.getElementById('mmhHierarchyCloudConflict'));
      say(await page.locator('#mmhHierarchyCloudConflict').getAttribute('role')==='alert',
        width+' conflicting device raises accessible warning');
      say(await cards.nth(0).getByRole('button').isDisabled(),
        width+' conflicting sidecars pause Manage mutations');
      say(await save.isDisabled(),width+' conflicting sidecars block unsafe new entries');
      say(await page.locator('#txCategory option').count()===0,
        width+' archived Category remains archived after conflict');
      // Switch account after the conflict. No prior owner's data may leak.
      // A late unrelated-owner event must not clear or expose A's settings.
      await page.evaluate(()=>{
        window.currentSessionUser={id:'fixture-B'};
        window.MMHVAULT_CONFIG_OWNER='fixture-B';
        window.dispatchEvent(new Event('mmhvault:config-owner-changed'));
      });
      await page.waitForFunction(()=>!document.querySelector('.mmh-hier-overlay'));
      say((await page.locator('#mmhHierarchyManage').textContent()).includes('မရှိသေးပါ'),
        width+' account switch clears old-owner Manage choices');
      say(await cards.nth(0).getByRole('button').isDisabled(),width+' switched owner stays locked until data loads');
      say(errors.length===0,width+' no browser script exception '+errors.join('; '));
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:393,height:800},serviceWorkers:'block',
      ...(engine==='webkit'?{isMobile:true,hasTouch:true,deviceScaleFactor:2}:{})});
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
    console.log('APP V11.7 synthetic '+engine+' Manage + responsive smoke PASSED');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
