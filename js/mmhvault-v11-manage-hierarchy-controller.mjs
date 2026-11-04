/* MMHVAULT APP V11.7 — owner-scoped Manage persistence adapter.
 * No direct Supabase writes, no account/transaction/ledger mutations.
 * A host must supply verified cloud-loaded history, current owner and a
 * guarded configuration persistence callback. This module is not live-wired.
 */
import {
  emptyHierarchy,legacyHierarchy,normalizePersistedHierarchy,
  addType,addTransaction,addCategory,renameItem,deleteItem,archiveItem,
  recordLink,choices,entryUsage,pathFor
} from './mmhvault-v11-manage-hierarchy-model.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=reason=>{throw new Error(reason);};
export function createHierarchyController(host){
  if(!host||typeof host.currentOwner!=='function'||
    typeof host.currentConfig!=='function'||
    typeof host.configOwner!=='function'||
    typeof host.history!=='function'||
    typeof host.persist!=='function'||
    typeof host.newId!=='function')
    fail('Owner-guarded hierarchy host is required');
  const identity=()=>{
    const owner=String(host.currentOwner()||'');
    const config=host.currentConfig();
    if(!owner||!config||String(host.configOwner()||'')!==owner)
      fail('Account configuration is not owned by this session');
    return {owner,config};
  };
  const verifiedHistory=owner=>{
    const result=host.history();
    if(!result||result.ownerId!==owner||result.loaded!==true||
      !Array.isArray(result.rows))fail('Transaction history has not loaded securely');
    // Every history row must carry the signed-in owner. A missing owner
    // cannot prove the row belongs to this account, or that an option is unused.
    if(result.rows.some(x=>!x||x.user_id!==owner))
      fail('Cross-owner or incomplete transaction history rejected');
    return result.rows;
  };
  const hasLegacySetup=c=>{
    const f=c.txFieldsV12;
    return !f||f.version!==1||['type','transaction','category']
      .some(k=>Array.isArray(f[k])&&f[k].length>0);
  };
  const derive=(owner,c,rows)=>{
    if(c.txHierarchyV11!=null)return normalizePersistedHierarchy(c.txHierarchyV11,owner);
    if(!hasLegacySetup(c)&&rows.length===0)return emptyHierarchy(owner);
    // A legacy user can have saved transactions despite a blank V12 marker
    // created by an earlier rollout. Never reinterpret that as a new account.
    const legacy=hasLegacySetup(c)?c:{...c,txFieldsV12:null};
    // Older owners retain original labels, categories and aliases; this
    // creates an in-memory view only, never writes records on open.
    return legacyHierarchy(owner,legacy);
  };
  const snapshot=()=>{
    const {owner,config}=identity(),rows=verifiedHistory(owner);
    return {owner,config,rows,graph:derive(owner,config,rows)};
  };
  const read=()=>clone(snapshot().graph);
  const list=(field,parentId)=>{
    const {owner,graph}=snapshot();return choices(graph,owner,field,parentId);
  };
  const status=(field,id)=>{
    const {owner,graph,rows}=snapshot();
    return entryUsage(graph,owner,field,id,rows);
  };
  const transact=(operation)=>{
    const {owner,config,rows,graph}=snapshot();
    const candidate=clone(graph);
    const categoriesBefore=clone(config.categories||{});
    const modifiedCategories=clone(categoriesBefore);
    // The graph and canonical category registry are committed TOGETHER.
    const out=operation({graph:candidate,owner,rows,categories:modifiedCategories});
    const verified=normalizePersistedHierarchy(candidate,owner);
    const latest=identity();
    if(latest.owner!==owner||latest.config!==config)
      fail('Account switched before saving. No changes applied');
    const originalGraph=config.txHierarchyV11;
    try{
      config.txHierarchyV11=verified;
      config.categories=modifiedCategories;
      host.persist(owner,config);
    }catch(error){
      if(originalGraph===undefined)delete config.txHierarchyV11;
      else config.txHierarchyV11=originalGraph;
      config.categories=categoriesBefore;
      throw error;
    }
    // Owner may have switched during an external sync callback. The host
    // must be synchronous and must not start an unrelated async write.
    if(host.currentOwner()!==owner)
      fail('Account changed while saving; refresh before continuing');
    host.changed?.();
    return out;
  };
  const canonicalCategory=(ctx,node)=>{
    const group=node.ledgerGroup,name=node.label;
    if(!['Income','Expense','Personal','LoanIncome','LoanExpense','Transfer','Data Adjustment'].includes(group))
      fail('Ledger category group is invalid');
    // Native ledger owns Transfer / Data Adjustment category codes. Never
    // let a custom display label imply that these financial rows save a
    // different category than the server actually stores.
    if(group==='Transfer'||group==='Data Adjustment'){
      if(name!==(group==='Transfer'?'Transfer':'Data Adjustment'))
        fail('Use the fixed system Category for this financial purpose');
      return;
    }
    // Preserve older categories. New custom Category must be stored in the
    // canonical list so financial reports continue to understand the value.
    const present=ctx.categories[group]||[];
    if(present.some(v=>v.toLowerCase()===name.toLowerCase()))return;
    for(const [other,names] of Object.entries(ctx.categories)){
      if(other!==group&&Array.isArray(names)&&names.some(v=>
        v.toLowerCase()===name.toLowerCase())&&
        ((['Income','LoanIncome'].includes(group)&&['Income','LoanIncome'].includes(other))||
          (['Expense','Personal','LoanExpense'].includes(group)&&
           ['Expense','Personal','LoanExpense'].includes(other))))
        fail('Category name conflicts with an existing ledger category');
    }
    ctx.categories[group]=[...present,name];
  };
  return Object.freeze({
    read,list,status,
    addType:(name,ledgerType)=>transact(ctx=>
      addType(ctx.graph,ctx.owner,name,ledgerType,host.newId)),
    addTransaction:(name,parentId,kindId)=>transact(ctx=>
      addTransaction(ctx.graph,ctx.owner,name,parentId,kindId,host.newId)),
    addCategory:(name,parentId)=>transact(ctx=>{
      const node=addCategory(ctx.graph,ctx.owner,name,parentId,host.newId);
      canonicalCategory(ctx,node);return node;
    }),
    rename:(field,id,name)=>transact(ctx=>{
      const node=renameItem(ctx.graph,ctx.owner,field,id,name,ctx.rows);
      if(field==='category')canonicalCategory(ctx,node);
      return node;
    }),
    delete:(field,id)=>transact(ctx=>deleteItem(ctx.graph,ctx.owner,field,id,ctx.rows)),
    archive:(field,id,archived=true)=>transact(ctx=>
      archiveItem(ctx.graph,ctx.owner,field,id,archived)),
    path:(typeId,transactionId,categoryId)=>{
      const {owner,graph}=snapshot();
      const path=pathFor(graph,owner,typeId,transactionId,categoryId);
      const kind=graph.categories.find(x=>x.id===categoryId);
      const {config}=identity();
      const builtin=(kind.ledgerGroup==='Data Adjustment'&&path.category==='Data Adjustment')||
        (kind.ledgerGroup==='Transfer'&&path.category==='Transfer');
      if(!builtin&&(!Array.isArray(config.categories?.[kind.ledgerGroup])||
        !config.categories[kind.ledgerGroup].includes(path.category)))
        fail('Canonical ledger category is unavailable; reopen Manage');
      return path;
    },
    // Only call AFTER the server reports a confirmed transaction id.
    recorded:(recordId,typeId,transactionId,categoryId,ledgerFields)=>{
      return transact(ctx=>{
        const path=pathFor(ctx.graph,ctx.owner,typeId,transactionId,categoryId);
        if(!ledgerFields||path.type!==ledgerFields.type||
          path.group!==ledgerFields.group||
          path.category!==ledgerFields.category)
          fail('Saved ledger values do not match the selected Manage path');
        return recordLink(ctx.graph,ctx.owner,recordId,typeId,transactionId,categoryId);
      });
    }
  });
}
