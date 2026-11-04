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
      // Native V321 and account-balance guards must not be defeated by a
      // subsequent Manage selector refresh. A second submit while busy
      // cannot overwrite the first ledger insert's pending sidecar path.
      await page.evaluate(()=>{
        const f=document.getElementById('txForm'),btn=f.querySelector('.actions button');
        window.__nativeSubmits=0;
        f.addEventListener('submit',()=>window.__nativeSubmits++);
        btn.classList.add('v321-submit-busy');btn.disabled=true;
        window.MMHV11HierarchyLive.refresh();
      });
      await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
      say(await save.isDisabled(),width+' Manage cannot unlock native saving-in-progress button');
      const busyDuplicate=await page.evaluate(()=>{
        const ev=new Event('submit',{bubbles:true,cancelable:true});
        document.getElementById('txForm').dispatchEvent(ev);
        return {blocked:ev.defaultPrevented,count:window.__nativeSubmits};
      });
      say(busyDuplicate.blocked&&busyDuplicate.count===0,
        width+' busy duplicate submit is stopped before native transaction handler');
      await page.evaluate(()=>{
        const btn=document.querySelector('#txForm .actions button');
        btn.classList.remove('v321-submit-busy');btn.classList.add('balance-blocked');
        window.MMHV11HierarchyLive.refresh();
      });
      await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
      say(await save.isDisabled(),width+' Manage cannot unlock insufficient-balance protection');
      const insufficient=await page.evaluate(()=>{
        const ev=new Event('submit',{bubbles:true,cancelable:true});
        document.getElementById('txForm').dispatchEvent(ev);
        return {blocked:ev.defaultPrevented,count:window.__nativeSubmits};
      });
      say(insufficient.blocked&&insufficient.count===0,
        width+' insufficient-balance submit is blocked before native ledger write');
      await page.evaluate(()=>{
        document.querySelector('#txForm .actions button').classList.remove('balance-blocked');
        window.MMHV11HierarchyLive.refresh();
      });
      await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
      say(await save.isEnabled(),width+' native Save re-enables after external financial locks clear');
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
      // The Manage sidecar confirmation is intentionally stalled. Two rapid
      // native confirmed INSERT callbacks must still refresh in sequence,
      // without waiting for sidecar verification or replaying either INSERT.
      await page.evaluate(()=>{
        window.__syntheticSavedIds.push('fixture-saved-ledger-43','fixture-saved-ledger-44');
        window.MMHConfigCloudSyncV122.syncNow=()=>new Promise(()=>{});
        window.__holdRefresh=true;
        const originalLoad=window.loadAll;
        window.loadAll=async options=>{
          if(window.__holdRefresh){
            window.__holdRefresh=false;
            await new Promise(resolve=>{window.__releaseHeldRefresh=resolve;});
          }
          return originalLoad(options);
        };
        const f=document.getElementById('txForm');
        for(const id of ['fixture-saved-ledger-43','fixture-saved-ledger-44']){
          f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
          window.MMHV11HierarchyLive.onLedgerInserted('fixture-A',id,
            {type:'Income',group:'Income',category:'Salary'});
        }
      });
      await page.waitForFunction(()=>typeof window.__releaseHeldRefresh==='function');
      say(await page.evaluate(()=>window.__syntheticLedgerRefreshes===3),
        width+' only one queued cloud read starts while previous is held');
      await page.evaluate(()=>window.__releaseHeldRefresh());
      await page.waitForFunction(()=>window.__syntheticLedgerRefreshes===5);
      say(await page.evaluate(()=>
        window.transactions.length===3&&
        window.__syntheticSavedIds.every(id=>window.transactions.some(x=>x.id===id))&&
        window.__syntheticWrites===6),
        width+' two rapid confirmed inserts refresh Accounts source despite stalled Manage cloud sync');
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
      say((await page.evaluate(()=>window.__syntheticWrites))===9,width+' nine synthetic config writes including two extra ledger links and two Archives');
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
    // Account B's data refresh must not wait behind account A's hung
    // in-flight refresh. No real Auth/DB requests: all calls are mocked.
    {
      const switched=await browser.newContext({viewport:{width:393,height:800},serviceWorkers:'block'});
      const ownerPage=await switched.newPage();
      const errors=[];
      ownerPage.on('pageerror',e=>errors.push(e.message));
      await ownerPage.goto(base,{waitUntil:'load'});
      await ownerPage.waitForSelector('#mmhHierarchyManage .mmh-hier-card');
      await ownerPage.evaluate(()=>{
        window.__ownerReadCalls=[];
        window.loadAll=async ({force}={})=>{
          if(force!==true)throw Error('Expected secure forced owner refresh');
          const active=window.currentSessionUser?.id;
          window.__ownerReadCalls.push(active);
          if(active==='fixture-A')return new Promise(resolve=>{
            window.__releaseOldOwnerRefresh=()=>resolve({ok:false});
          });
          if(active==='fixture-B'){
            window.transactions=[{id:'B-saved-ledger',user_id:'fixture-B',
              type:'Income',category:'Salary',tx_date:'2026-11-04',
              to_account:'B Cash',to_amount:15}];
            window.dispatchEvent(new CustomEvent('mmhvault:data-loaded',
              {detail:{ok:true}}));
            return {ok:true};
          }
          return {ok:false};
        };
        window.MMHV11HierarchyLive.onLedgerInserted('fixture-A','A-saved-ledger',
          {type:'Income',group:'Income',category:'Salary'});
      });
      await ownerPage.waitForFunction(()=>typeof window.__releaseOldOwnerRefresh==='function');
      await ownerPage.evaluate(()=>{
        window.currentSessionUser={id:'fixture-B'};
        window.MMHVAULT_CONFIG_OWNER='fixture-B';
        window.MMHVAULT_CONFIG={txFieldsV12:{version:1,type:[],transaction:[],category:[]},
          categories:{Income:[]},archivedCategories:{},txHierarchyV11:null};
        window.mmhWalletDataOwnerV191='fixture-B';
        window.transactions=[];
        window.dispatchEvent(new Event('mmhvault:config-owner-changed'));
        window.MMHV11HierarchyLive.onLedgerInserted('fixture-B','B-saved-ledger',
          {type:'Income',group:'Income',category:'Salary'});
      });
      await ownerPage.waitForFunction(()=>
        window.__ownerReadCalls.includes('fixture-B')&&
        window.transactions.some(x=>x.id==='B-saved-ledger'));
      say(await ownerPage.evaluate(()=>
        window.__ownerReadCalls.join(',')==='fixture-A,fixture-B'&&
        window.transactions.length===1&&
        window.transactions[0].user_id==='fixture-B'),
        'owner switch skips hung A refresh and only shows B ledger');
      await ownerPage.evaluate(()=>window.__releaseOldOwnerRefresh());
      say(errors.length===0,'owner-switch refresh has no browser exceptions');
      await switched.close();
    }
    // The previous owner A has a hung Manage-cloud check. B must start a
    // separate verification, and A's late completion must not clear B's
    // "verifying" state or overwrite B's exact saved Category link.
    {
      const checkContext=await browser.newContext({
        viewport:{width:393,height:800},serviceWorkers:'block'
      });
      const checkPage=await checkContext.newPage(),pageErrors=[];
      checkPage.on('pageerror',e=>pageErrors.push(e.message));
      await checkPage.goto(base,{waitUntil:'load'});
      await checkPage.waitForSelector('#mmhHierarchyManage .mmh-hier-card');
      await checkPage.evaluate(async()=>{
        const model=await import('/js/mmhvault-v11-manage-hierarchy-model.mjs');
        function graphFor(who){
          const graph=model.emptyHierarchy(who);
          let serial=0;
          const uid=()=>who+'-choice-'+ ++serial;
          const t=model.addType(graph,who,'Income','Income',uid);
          const x=model.addTransaction(graph,who,'Income2',t.id,'Income|Income',uid);
          model.addCategory(graph,who,'Salary',x.id,uid);
          return graph;
        }
        window.__makeTestGraph=graphFor;
        window.MMHVAULT_CONFIG.txHierarchyV11=graphFor('fixture-A');
        window.__aCloudSyncCalls=0;
        window.MMHConfigCloudSyncV122.syncNow=()=>{
          window.__aCloudSyncCalls++;
          return new Promise(resolve=>{window.__releaseOldCloudCheck=resolve;});
        };
        window.MMHV11HierarchyLive.refresh();
      });
      await checkPage.waitForSelector('#txType option[data-mmh-choice-id]');
      await checkPage.locator('#txType').selectOption({label:'Income'});
      await checkPage.locator('#txGroup').selectOption({label:'Income2'});
      await checkPage.locator('#txCategory').selectOption({label:'Salary'});
      await checkPage.evaluate(()=>{
        const form=document.getElementById('txForm');
        form.addEventListener('submit',event=>event.preventDefault(),{once:true});
        form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        window.MMHV11HierarchyLive.onLedgerInserted('fixture-A','A-cloud-ledger',
          {type:'Income',group:'Income',category:'Salary'});
      });
      await checkPage.waitForFunction(()=>
        typeof window.__releaseOldCloudCheck==='function');
      say(await checkPage.evaluate(()=>window.__aCloudSyncCalls===1),
        'A-sidecar cloud check starts once before account switch');

      await checkPage.evaluate(()=>{
        window.currentSessionUser={id:'fixture-B'};
        window.MMHVAULT_CONFIG_OWNER='fixture-B';
        window.MMHVAULT_CONFIG={
          txFieldsV12:{version:1,type:[],transaction:[],category:[]},
          txHierarchyV11:window.__makeTestGraph('fixture-B'),
          categories:{Income:['Salary'],Expense:[],Personal:[],LoanIncome:[],
            LoanExpense:[],Transfer:['Transfer']},archivedCategories:{}
        };
        window.mmhWalletDataOwnerV191='fixture-B';
        window.transactions=[];
        window.loadAll=async ()=>{
          window.transactions=[{id:'B-cloud-ledger',user_id:'fixture-B',
            type:'Income',category:'Salary',tx_date:'2026-11-04'}];
          window.dispatchEvent(new CustomEvent('mmhvault:data-loaded',
            {detail:{ok:true}}));
          return {ok:true};
        };
        window.__bCloudReads=0;
        window.db={from:table=>{
          if(table!=='personal_configuration')throw Error('Unexpected table');
          return {select:()=>({eq:(_field,user)=>({
            maybeSingle:async()=>{
              if(user!=='fixture-B')throw Error('Cross-owner cloud read');
              window.__bCloudReads++;
              return {data:{config:window.MMHVAULT_CONFIG},error:null};
            }
          })})};
        }};
        window.MMHConfigCloudSyncV122.syncNow=()=>new Promise(resolve=>{
          window.__releaseNewCloudCheck=resolve;
        });
        window.dispatchEvent(new Event('mmhvault:config-owner-changed'));
        window.dispatchEvent(new CustomEvent('mmhvault:data-loaded',
          {detail:{ok:true}}));
        window.MMHV11HierarchyLive.refresh();
      });
      await checkPage.waitForSelector('#txType option[data-mmh-choice-id]');
      await checkPage.locator('#txType').selectOption({label:'Income'});
      await checkPage.locator('#txGroup').selectOption({label:'Income2'});
      await checkPage.locator('#txCategory').selectOption({label:'Salary'});
      await checkPage.evaluate(()=>{
        const form=document.getElementById('txForm');
        form.addEventListener('submit',event=>event.preventDefault(),{once:true});
        form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        window.MMHV11HierarchyLive.onLedgerInserted('fixture-B','B-cloud-ledger',
          {type:'Income',group:'Income',category:'Salary'});
      });
      await checkPage.waitForFunction(()=>
        typeof window.__releaseNewCloudCheck==='function');
      say(await checkPage.locator('#mmhHierarchyManage [role=status]')
        .getByRole('button',{name:'Recheck sync'}).isDisabled(),
        'B cloud verification starts even while A cloud request is stuck');
      await checkPage.evaluate(()=>window.__releaseOldCloudCheck(true));
      await checkPage.waitForTimeout(60);
      say(await checkPage.locator('#mmhHierarchyManage [role=status]')
        .getByRole('button',{name:'Recheck sync'}).isDisabled(),
        'late A cloud result cannot unlock or cancel B pending verification');
      await checkPage.evaluate(()=>window.__releaseNewCloudCheck(true));
      await checkPage.waitForFunction(()=>
        document.querySelector('#mmhHierarchyManage [role=status]')?.textContent
          .includes('cloud verified'));
      say(await checkPage.evaluate(()=>window.__bCloudReads===1&&
        window.transactions.length===1&&window.transactions[0].user_id==='fixture-B'),
        'B verification reads only B config and ledger after stale A completes');
      say(pageErrors.length===0,
        'owner-scoped cloud verification has no browser exceptions');
      await checkContext.close();
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
