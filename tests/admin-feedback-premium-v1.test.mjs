import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const admin=read('admin.html');
const premium=read('js/mmhvault-admin-feedback-premium-v1.js');
const css=read('css/mmhvault-admin-feedback-premium-v1.css');
const shared=read('js/mmhvault-admin-premium-workspace-v1.js');

const readFunction=(start,next)=>{
 const a=admin.indexOf(start),b=admin.indexOf(next,a+start.length);
 assert.ok(a>=0&&b>a,'Expected original feedback function was not found');
 return admin.slice(a,b);
};
test('feedback workspace is a single isolated page with the approved high-fidelity composition',()=>{
 assert.match(admin,/<section id="adminFeedbackView" class="af-premium-feedback-v1" hidden/);
 for(const id of ['afPremiumTitleV1','afPremiumAverageV1','afPremiumAverageNoteV1',
  'afFilter','afPremiumRatingV1','afPremiumSearchV1','afPremiumSortV1','afRefresh',
  'afNew','afWorking','afResolved','afMessage','afMemberCountV1520',
  'afMemberListV1520','afEmptyV1520','afDetailV1520','afPersonEmailV1520',
  'afPersonMetaV1520','afList','afPremiumDockV1','afPremiumEditorHostV1']){
  assert.equal((admin.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'ID must exist exactly once: '+id);
 }
 assert.match(admin,/css\/mmhvault-admin-feedback-premium-v1\.css\?v=1\.1\.0/);
 assert.match(admin,/js\/mmhvault-admin-feedback-premium-v1\.js\?v=1\.1\.0/);
 assert.match(css,/#adminFeedbackView\.af-premium-feedback-v1/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 // Avoid global resets that leak into Analytics, users, chats, and announcements.
 for(const line of css.split('\n').filter(s=>s.trim().startsWith('body.'))){
  assert.match(line,/#adminFeedbackView|^body\.admin-premium-v1 #dashboard:not\(\[hidden\]\)>#adminFeedbackView/);
 }
});

test('average rating comes from the authorized loaded feedback rows only',()=>{
 const code=readFunction('function feedbackCounts(rows){','function feedbackGroups(){');
 const ids=Object.fromEntries(['afNew','afWorking','afResolved','afPremiumAverageV1','afPremiumAverageNoteV1'].map(id=>[id,{textContent:'—'}]));
 vm.runInNewContext(code+';feedbackCounts(rows)',{
  $:id=>ids[id],
  rows:[
   {status:'new',rating:5},{status:'resolved',rating:3},{status:'working',rating:null},
   {status:'resolved',rating:8}
  ],Number,Map
 });
 assert.equal(ids.afNew.textContent,'1');
 assert.equal(ids.afWorking.textContent,'1');
 assert.equal(ids.afResolved.textContent,'2');
 assert.equal(ids.afPremiumAverageV1.textContent,'4.0');
 assert.match(ids.afPremiumAverageNoteV1.textContent,/已载入 2 条评分/);
 vm.runInNewContext(code+';feedbackCounts(rows)',{$:id=>ids[id],rows:[{status:'new',rating:0}],Number});
 assert.equal(ids.afPremiumAverageV1.textContent,'—');
 assert.equal(ids.afPremiumAverageNoteV1.textContent,'暂无有效评分');
});

test('member ID / email / text / rating / state filters and real chronological sorting work on loaded rows',()=>{
 const code=readFunction('function feedbackGroups(){','function feedbackMemberButton(');
 const fields={afFilter:'',afPremiumSearchV1:'',afPremiumRatingV1:'',afPremiumSortV1:'newest'};
 const elements=Object.fromEntries(Object.keys(fields).map(id=>[id,{value:''}]));
 const rows=[
  {id:'a',customer_no:1,email:'first@example.com',status:'resolved',rating:5,title:'123',body:'346',created_at:'2026-11-01T10:00:00Z'},
  {id:'b',customer_no:2,email:'second@example.com',status:'new',rating:4,title:'Login',body:'Bug',created_at:'2026-11-02T10:00:00Z'},
  {id:'c',customer_no:1,email:'first@example.com',status:'working',rating:3,title:'Hello',body:'Advice',created_at:'2026-11-03T10:00:00Z'},
 ];
 const ctx={feedbackRows:rows,$:id=>elements[id],userKey:row=>String(row.customer_no),
  memberId:n=>String(n).padStart(4,'0'),Date,Number,String,Map};
 const run=()=>vm.runInNewContext(code+';feedbackGroups()',ctx);
 assert.deepEqual(Array.from(run(),g=>g.key),['1','2']);
 elements.afPremiumSearchV1.value='0001';
 assert.deepEqual(Array.from(run(),g=>g.key),['1']);
 elements.afPremiumSearchV1.value='Login';
 assert.deepEqual(Array.from(run(),g=>g.key),['2']);
 elements.afPremiumSearchV1.value='';
 elements.afPremiumRatingV1.value='5';
 assert.deepEqual(Array.from(run(),g=>g.key),['1']);
 assert.equal(run()[0].rows[0].id,'a');
 elements.afPremiumRatingV1.value='';
 elements.afFilter.value='new';
 assert.deepEqual(Array.from(run(),g=>g.key),['2']);
 elements.afFilter.value='';
 elements.afPremiumSortV1.value='oldest';
 assert.deepEqual(Array.from(run(),g=>g.key),['1','2']);
 assert.equal(run()[0].rows[0].id,'a');
 elements.afPremiumSortV1.value='rating';
 assert.equal(run()[0].rows[0].id,'a');
});

test('revision-safe existing feedback RPC and upload paths remain unchanged',()=>{
 assert.match(admin,/client\.rpc\('mmh_list_feedback',\{p_admin:true,p_status:'',p_offset:offset\}\)/);
 assert.match(admin,/client\.rpc\('mmh_update_feedback',\{p_id:row\.id,p_status:select\.value,p_reply:text\.value\.trim\(\),p_revision:row\.revision\}\)/);
 assert.match(admin,/row\.revision=Number\(row\.revision\|\|0\)\+1/);
 assert.match(admin,/await addPhotos\(row,d,token,'fb-admin-photos-v15'\)/);
 assert.match(admin,/d\.dataset\.feedbackId=String\(row\.id\)/);
 assert.match(admin,/window\.mmhFeedbackPremiumRerenderV1=/);
 assert.match(admin,/client\.rpc\('mmh_is_admin'\)/);
 assert.match(admin,/id="adminUsageTab" aria-pressed="true">注册用户/);
 assert.match(admin,/if\(which==='analytics'\)\{window\.mmhAdminAnalytics\?\.activate\(\)\}/);
 assert.match(shared,/dash\.dataset\.adminPage=authorized&&!usage\.hidden\?'registered-users':'other'/);
 assert.doesNotMatch(premium,/\.rpc\(|fetch\(|XMLHttpRequest|signOut\(|innerHTML\s*=/);
 assert.doesNotMatch(premium,/\b(?:eval|Function)\(/);
 assert.doesNotMatch(premium,/124,680|286,410|62,893|MMH888/);
 assert.doesNotThrow(()=>new vm.Script(premium));
});

test('single replies dock selects exactly one original form rather than duplicating form submission',()=>{
 assert.match(premium,/host\.replaceChildren\(form\)/);
 assert.match(premium,/activeCard\.append\(activeForm\)/);
 assert.match(premium,/form\.dataset\.premiumBound==='1'/);
 assert.match(premium,/new MutationObserver\(mutations=>/);
 assert.match(premium,/if\(dashboard\.hidden\)\{clearTimeout\(debounce\);drafts\.clear\(\)/);
 assert.match(css,/#adminFeedbackView\.af-premium-enhanced-v1 #afList \.af-editor-inline-v1520/);
 assert.match(css,/#adminFeedbackView \.af-premium-dock-v1 \.af-editor-inline-v1520/);
});


test('V1.1 filter toolbar aligns four visible labels and responsive columns',()=>{
 assert.match(admin,/<span class="af-premium-filter-label-v11">搜索反馈<\/span>/);
 const css11=css.split('/* Admin Feedback Premium V1.1 — viewport-bounded')[1];
 assert.ok(css11,'Scoped V1.1 layout styles exist');
 assert.match(css11,/grid-template-columns:minmax\(125px,\.9fr\) minmax\(125px,\.9fr\) minmax\(220px,2fr\) minmax\(130px,\.9fr\)!important/);
 assert.match(css11,/grid-column:auto!important;grid-row:auto!important/);
 assert.match(css11,/height:42px!important;min-height:42px!important/);
 assert.match(css11,/@media\(max-width:1050px\)/);
 assert.match(css11,/@media\(max-width:480px\)/);
 assert.match(css11,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});

test('V1.1 long feedback uses independent list and timeline scrollports, persistent dock',()=>{
 const css11=css.split('/* Admin Feedback Premium V1.1 — viewport-bounded')[1];
 assert.match(css11,/grid-template-rows:auto auto auto auto minmax\(0,1fr\)!important/);
 assert.match(css11,/100dvh - 138px/);
 assert.match(css11,/#adminFeedbackView \.af-premium-workspace-v1\{[^}]*min-height:0!important;max-height:100%!important;overflow:hidden!important/s);
 assert.match(css11,/\.admin-feedback-shell-v1520\{\s*display:grid!important;[^}]*height:100%!important;min-height:0!important;max-height:100%!important/s);
 assert.match(css11,/\.admin-feedback-members-v1520\{\s*display:grid!important;grid-template-rows:auto minmax\(0,1fr\)!important;/s);
 assert.match(css11,/\.admin-feedback-member-list-v1520\{[^}]*overflow-y:auto!important/s);
 assert.match(css11,/#afDetailV1520:not\(\[hidden\]\)\{\s*display:grid!important;grid-template-rows:auto minmax\(0,1fr\) auto!important/s);
 assert.match(css11,/#afList\.admin-feedback-thread-v1520\{[^}]*max-height:none!important;[^}]*overflow-y:auto!important/s);
 assert.match(css11,/\.af-premium-dock-v1:not\(\[hidden\]\)\{\s*position:relative!important;z-index:2/s);
 assert.match(css11,/overscroll-behavior:contain/);
 assert.match(css11,/@media\(max-width:720px\)/);
 assert.match(css11,/grid-template-rows:133px minmax\(0,1fr\)!important/);
 assert.match(css11,/@media\(max-height:790px\) and \(min-width:721px\)/);
 for(const line of css11.split('\n').filter(x=>x.trim().startsWith('body.'))){
  assert.match(line,/#adminFeedbackView/);
 }
 for(const unsafe of ['#adminChatView','#adminUsageView','#adminAnalyticsView']){
  assert.ok(!css11.includes(unsafe),'No cross-page selector: '+unsafe);
 }
});

test('V1.1 retains the single revision-safe update and verified attachments',()=>{
 assert.match(admin,/client\.rpc\('mmh_is_admin'\)/);
 assert.match(admin,/client\.rpc\('mmh_list_feedback',\{p_admin:true,p_status:'',p_offset:offset\}\)/);
 assert.equal((admin.match(/client\.rpc\('mmh_update_feedback'/g)||[]).length,2,'Both pre-existing Feedback and member-chat revision-safe handlers must remain');
 assert.match(admin,/p_revision:row\.revision/);
 assert.match(admin,/error\.code==='40001'/);
 assert.match(admin,/await addPhotos\(row,d,token,'fb-admin-photos-v15'\)/);
 assert.match(premium,/host\.replaceChildren\(form\)/);
 assert.doesNotMatch(premium,/\.rpc\(|fetch\(|XMLHttpRequest/);
});
