/* APP V11 Manage hierarchy: pure, no network, database or ledger mutations.
 * Stage 1 data contract. Never import from Production until the full guarded
 * config/entry adapter, migration and browser tests are reviewed.
 */
export const TREE_VERSION = 1;
const LEDGER_TYPES = ['Income','Expense','Transfer'];
const KINDS = Object.freeze([
  ['Income|Income','Income','Income','Income'],
  ['Expense|Expense','Expense','Expense','Expense'],
  ['Expense|Personal','Expense','Personal','Personal'],
  ['Income|Loans','Income','Loans','LoanIncome'],
  ['Expense|Loans','Expense','Loans','LoanExpense'],
  ['Transfer|Transfer','Transfer','Transfer','Transfer'],
  ['Income|Data Adjustment','Income','Data Adjustment','Data Adjustment'],
  ['Expense|Data Adjustment','Expense','Data Adjustment','Data Adjustment']
]);
const kindMap=new Map(KINDS.map(([id,type,group,categoryGroup])=>[id,{id,type,group,categoryGroup}]));
const nonempty=s=>typeof s==='string'&&!!s.trim();
const label=s=>{if(!nonempty(s))throw new Error('A name is required');const out=s.trim().replace(/\s+/g,' ');if(out.length>40)throw new Error('Name is too long');return out;};
const validId=s=>nonempty(s)&&s.length<=180;
const find=(graph,collection,id)=>graph[collection].find(x=>x.id===id);
const assertOwner=(graph,ownerId)=>{
  if(!validId(ownerId)||!graph||graph.version!==TREE_VERSION||
    graph.ownerId!==ownerId||!Array.isArray(graph.types)||
    !Array.isArray(graph.transactions)||!Array.isArray(graph.categories))
    throw new Error('Owner-scoped hierarchy is not available');
};
const unique=(rows,parentId,name,exceptId='')=>!rows.some(x=>x.id!==exceptId&&
  (parentId===undefined||x.parentId===parentId)&&x.label.toLocaleLowerCase()===name.toLocaleLowerCase());
const requireNode=(graph,collection,id)=>{
  const node=find(graph,collection,id);
  if(!node)throw new Error('Related Manage item not found');
  return node;
};
const idOnce=(graph,idFactory)=>{
  if(typeof idFactory!=='function')throw new Error('Stable ID factory is required');
  const id=String(idFactory());
  if(!validId(id)||['types','transactions','categories'].some(c=>find(graph,c,id)))
    throw new Error('Invalid or duplicate ID');
  return id;
};
export function emptyHierarchy(ownerId){
  if(!validId(ownerId))throw new Error('Signed-in account required');
  return {version:TREE_VERSION,ownerId,types:[],transactions:[],categories:[],links:{}};
}
export function ledgerKind(id){return kindMap.get(id)||null;}
export function addType(graph,ownerId,name,ledgerType,idFactory){
  assertOwner(graph,ownerId);
  const text=label(name);
  if(!LEDGER_TYPES.includes(ledgerType))throw new Error('Unsupported ledger Type');
  if(!unique(graph.types,undefined,text))throw new Error('Type already exists');
  const node={id:idOnce(graph,idFactory),label:text,ledgerType,archived:false};
  graph.types.push(node);return node;
}
export function addTransaction(graph,ownerId,name,parentTypeId,kindId,idFactory){
  assertOwner(graph,ownerId);
  const text=label(name),parent=requireNode(graph,'types',parentTypeId);
  const kind=ledgerKind(kindId);
  if(parent.archived)throw new Error('Restore the Type before adding a Transaction');
  if(!kind||kind.type!==parent.ledgerType)throw new Error('Transaction financial meaning does not match Type');
  if(!unique(graph.transactions,parentTypeId,text))throw new Error('Transaction already exists under this Type');
  const node={id:idOnce(graph,idFactory),label:text,parentId:parentTypeId,kindId,archived:false};
  graph.transactions.push(node);return node;
}
export function addCategory(graph,ownerId,name,parentTransactionId,idFactory){
  assertOwner(graph,ownerId);
  const text=label(name),parent=requireNode(graph,'transactions',parentTransactionId);
  const grandparent=requireNode(graph,'types',parent.parentId),kind=ledgerKind(parent.kindId);
  if(parent.archived||grandparent.archived)throw new Error('Restore the parent before adding a Category');
  if(!kind)throw new Error('Transaction ledger mapping unavailable');
  if(!unique(graph.categories,parentTransactionId,text))throw new Error('Category already exists under this Transaction');
  // Production ledger stores a Category *name*, not the Manage path.
  // Duplicate labels inside the same canonical group would make older
  // transaction history ambiguous (including after an account switch).
  if(graph.categories.some(x=>x.ledgerGroup===kind.categoryGroup&&
    x.label.toLocaleLowerCase()===text.toLocaleLowerCase()))
    throw new Error('Category label already exists in this ledger group');
  const node={id:idOnce(graph,idFactory),label:text,parentId:parentTransactionId,
    ledgerGroup:kind.categoryGroup,archived:false};
  graph.categories.push(node);return node;
}
// Display choices are path-scoped; archiving a parent hides every descendant
// without deleting, rewriting, or reparenting anything.
export function choices(graph,ownerId,field,parentId){
  assertOwner(graph,ownerId);
  if(field==='type')return graph.types.filter(x=>!x.archived).map(x=>({...x}));
  if(field==='transaction'){
    const type=requireNode(graph,'types',parentId);
    if(type.archived)return [];
    return graph.transactions.filter(x=>x.parentId===parentId&&!x.archived).map(x=>({...x}));
  }
  if(field==='category'){
    const transaction=requireNode(graph,'transactions',parentId);
    const type=requireNode(graph,'types',transaction.parentId);
    if(transaction.archived||type.archived)return [];
    return graph.categories.filter(x=>x.parentId===parentId&&!x.archived).map(x=>({...x}));
  }
  throw new Error('Unknown Manage field');
}
export function canAddItem(graph,ownerId,field){
  assertOwner(graph,ownerId);
  if(field==='type')return true;
  const activeTypes=new Set(graph.types.filter(x=>!x.archived).map(x=>x.id));
  if(field==='transaction')return activeTypes.size>0;
  if(field==='category')return graph.transactions.some(x=>!x.archived&&activeTypes.has(x.parentId));
  throw new Error('Unknown Manage field');
}
export function pathFor(graph,ownerId,typeId,transactionId,categoryId){
  assertOwner(graph,ownerId);
  const type=requireNode(graph,'types',typeId);
  const transaction=requireNode(graph,'transactions',transactionId);
  const category=requireNode(graph,'categories',categoryId);
  if(type.archived||transaction.archived||category.archived||
    transaction.parentId!==type.id||category.parentId!==transaction.id)
    throw new Error('Select a valid Type → Transaction → Category path');
  const kind=ledgerKind(transaction.kindId);
  if(!kind||kind.type!==type.ledgerType||kind.categoryGroup!==category.ledgerGroup)
    throw new Error('Ledger and Manage links do not match');
  return {type:type.ledgerType,group:kind.group,category:category.label,
    choiceIds:{type:type.id,transaction:transaction.id,category:category.id}};
}
export function entryUsage(graph,ownerId,field,id,history){
  assertOwner(graph,ownerId);
  const coll={type:'types',transaction:'transactions',category:'categories'}[field];
  if(!coll)throw new Error('Invalid Manage field');
  const node=requireNode(graph,coll,id);
  // A confirmed ledger insert can precede the next history refresh. Its
  // owner-scoped, saved record-ID sidecar is already evidence of usage.
  // Without this guard a newly used item could be renamed/deleted until
  // the history query finished, breaking the immutable-Manage contract.
  if(Object.values(graph.links||{}).some(link=>link?.choiceIds?.[field]===id))
    return 'used';
  if(!Array.isArray(history))return 'unknown'; // never allow destructive edits during cloud load
  for(const row of history){
    if(!row||typeof row!=='object')continue;
    const tagged=row.choiceIds||row.manageChoiceIds||row.txManageIds||
      (row.id!=null&&graph.links?.[String(row.id)]?.choiceIds);
    if(tagged&&tagged[field]){if(tagged[field]===id)return 'used';continue;}
    // Old entries do not have stable Manage IDs: match canonical ledger
    // meaning conservatively instead of pretending that aliases are distinct.
    const type=field==='type'?node:
      field==='transaction'?requireNode(graph,'types',node.parentId):
        requireNode(graph,'types',requireNode(graph,'transactions',node.parentId).parentId);
    if(row.type!==type.ledgerType)continue;
    if(field==='type')return 'used';
    const transaction=field==='transaction'?node:requireNode(graph,'transactions',node.parentId);
    const kind=ledgerKind(transaction.kindId);
    if(!kind)continue;
    // Live transaction rows have no transaction_group column. Without an
    // explicit choice ID, a matching ledger Type but missing group cannot
    // safely prove which sibling Transaction was used. Fail closed.
    const historicGroup=row.transaction_group||row.group;
    if(field==='transaction'){
      if(!historicGroup||historicGroup===kind.group)return 'used';
      continue;
    }
    if(row.category===node.label&&(!historicGroup||historicGroup===kind.group))
      return 'used';
  }
  return 'unused';
}
export function renameItem(graph,ownerId,field,id,newName,history){
  assertOwner(graph,ownerId);
  const coll={type:'types',transaction:'transactions',category:'categories'}[field];
  if(!coll)throw new Error('Invalid Manage field');
  const node=requireNode(graph,coll,id),value=label(newName);
  if(entryUsage(graph,ownerId,field,id,history)!=='unused')
    throw new Error('Already used or history not loaded: Archive instead');
  if(!unique(graph[coll],node.parentId,value,id))throw new Error('Name already exists');
  if(field==='category'&&graph.categories.some(x=>x.id!==id&&x.ledgerGroup===node.ledgerGroup&&
    x.label.toLocaleLowerCase()===value.toLocaleLowerCase()))
    throw new Error('Category label already exists in this ledger group');
  node.label=value;return node;
}
export function deleteItem(graph,ownerId,field,id,history){
  assertOwner(graph,ownerId);
  const coll={type:'types',transaction:'transactions',category:'categories'}[field];
  if(!coll)throw new Error('Invalid Manage field');
  if(entryUsage(graph,ownerId,field,id,history)!=='unused')
    throw new Error('Already used or history not loaded: Archive instead');
  if(field==='type'&&graph.transactions.some(x=>x.parentId===id)||
    field==='transaction'&&graph.categories.some(x=>x.parentId===id))
    throw new Error('Remove child items first, or Archive the parent');
  graph[coll].splice(graph[coll].findIndex(x=>x.id===id),1);
  return true;
}
export function archiveItem(graph,ownerId,field,id,archived=true){
  assertOwner(graph,ownerId);
  const coll={type:'types',transaction:'transactions',category:'categories'}[field];
  if(!coll)throw new Error('Invalid Manage field');
  const node=requireNode(graph,coll,id);
  node.archived=!!archived;return node;
}
export function recordLink(graph,ownerId,recordId,typeId,transactionId,categoryId){
  assertOwner(graph,ownerId);
  if(!validId(String(recordId||'')))throw new Error('Saved transaction ID required');
  // The transaction MUST have been committed by the ledger first; do not
  // call this from the form before confirmed DB insertion.
  const path=pathFor(graph,ownerId,typeId,transactionId,categoryId);
  const key=String(recordId);
  if(!graph.links||typeof graph.links!=='object')graph.links={};
  const next={choiceIds:path.choiceIds,canonical:{
    type:path.type,group:path.group,category:path.category}};
  if(Object.hasOwn(graph.links,key)){
    // An identical post-insert callback is a harmless retry, but an existing
    // record ID must NEVER be rebound to another Manage path.
    if(!storedLinkMatches(graph,ownerId,key,next.choiceIds,next.canonical))
      throw new Error('Transaction ID belongs to another Manage path');
    return graph.links[key];
  }
  graph.links[key]=next;
  return graph.links[key];
}
// Read-only confirmation helper for cloud readback; never infer verification
// from the local queue or from a successful ledger insert alone.
export function storedLinkMatches(raw,ownerId,recordId,choiceIds,canonical){
  if(!validId(ownerId)||!raw||raw.version!==TREE_VERSION||raw.ownerId!==ownerId||
    !validId(String(recordId||'')))return false;
  const link=raw.links?.[String(recordId)],ids=link?.choiceIds,fields=link?.canonical;
  return !!ids&&!!fields&&ids.type===choiceIds?.type&&
    ids.transaction===choiceIds?.transaction&&ids.category===choiceIds?.category&&
    fields.type===canonical?.type&&fields.group===canonical?.group&&
    fields.category===canonical?.category;
}
export function normalizePersistedHierarchy(raw,ownerId){
  if(raw==null)return null;
  const bad=()=>{throw new Error('Unsafe or invalid hierarchy configuration');};
  if(!validId(ownerId)||!raw||raw.version!==TREE_VERSION||
     raw.ownerId!==ownerId||typeof raw!=='object')bad();
  const g=emptyHierarchy(ownerId),ids=new Set();
  const parse=(field,max)=>{
    const arr=raw[field];
    if(!Array.isArray(arr)||arr.length>max)bad();
    return arr.map(node=>{
      if(!node||!validId(node.id)||ids.has(node.id)||
        !nonempty(node.label)||node.label.length>40)bad();
      ids.add(node.id);
      return {...node,archived:node.archived===true};
    });
  };
  g.types=parse('types',128);
  if(g.types.some(x=>!LEDGER_TYPES.includes(x.ledgerType)))bad();
  g.transactions=parse('transactions',512);
  if(g.transactions.some(x=>!find(g,'types',x.parentId)||
    !kindMap.has(x.kindId)||kindMap.get(x.kindId).type!==find(g,'types',x.parentId).ledgerType))bad();
  g.categories=parse('categories',1024);
  if(g.categories.some(x=>{
    const parent=find(g,'transactions',x.parentId);
    return !parent||kindMap.get(parent.kindId)?.categoryGroup!==x.ledgerGroup;
  }))bad();
  const folded=(field,scope)=>{const seen=new Map();for(const x of g[field]){
    const key=scope(x)+'|'+x.label.toLocaleLowerCase(),prev=seen.get(key);
    // Existing legacy aliases may share one canonical ledger category. Their
    // duplicates are protected by conservative history locks, not deleted.
    if(prev&&!(field==='categories'&&prev.legacy===true&&x.legacy===true))bad();
    seen.set(key,x);
  }};
  folded('types',()=> 'type');
  folded('transactions',x=>x.parentId);
  folded('categories',x=>x.ledgerGroup);
  const links=raw.links==null?{}:raw.links;
  if(!links||typeof links!=='object'||Array.isArray(links)||
    Object.keys(links).length>10000)bad();
  for(const [key,item] of Object.entries(links)){
    if(!validId(key)||!item||typeof item!=='object')bad();
    const ids=item.choiceIds;
    if(!ids||!find(g,'types',ids.type)||
      !find(g,'transactions',ids.transaction)||
      !find(g,'categories',ids.category))bad();
    const t=find(g,'transactions',ids.transaction),c=find(g,'categories',ids.category);
    if(t.parentId!==ids.type||c.parentId!==t.id)bad();
    const k=kindMap.get(t.kindId);
    if(!k||item.canonical?.type!==k.type||item.canonical?.group!==k.group||
      !nonempty(item.canonical?.category))bad();
    // Preserve the name at original entry time; do not rewrite history.
    g.links[key]={choiceIds:{type:ids.type,transaction:ids.transaction,category:ids.category},
      canonical:{type:k.type,group:k.group,category:String(item.canonical.category)}};
  }
  return g;
}
// Derived view for older owners: no config/ledger writes on open. This
// preserves active/archived categories and existing Type/Transaction aliases.
function legacyKey(input){
  // Two independent stable 32-bit fingerprints yield a compact reproducible
  // key; no raw nested ID or category names are exposed in synthetic IDs.
  const hash=seed=>{
    let h=seed>>>0;
    for(const c of String(input)){h^=c.codePointAt(0);h=Math.imul(h,16777619);}
    return (h>>>0).toString(36);
  };
  return hash(2166136261)+'_'+hash(2654435761);
}
export function legacyHierarchy(ownerId,config){
  const graph=emptyHierarchy(ownerId);
  const groups=config?.categories||{},archived=config?.archivedCategories||{};
  const settings=config?.txFieldsV12?.version===1?config.txFieldsV12:null;
  const display=settings?.displayV13||{};
  const enabledTypes=settings?settings.type||[]:LEDGER_TYPES;
  const enabledKinds=settings?settings.transaction||[]:KINDS.map(x=>x[0]);
  const activeCategories=settings?new Set(settings.category||[]):null;
  for(const name of LEDGER_TYPES){
    if(!enabledTypes.includes(name))continue;
    const id='legacy:type:'+name;
    graph.types.push({id,label:String(display.typeLabels?.[name]||name),
      ledgerType:name,archived:false,legacy:true});
    for(const alias of display.extraTypes||[]){
      if(alias.canonical!==name||!validId(alias.id)||!nonempty(alias.label))continue;
      graph.types.push({id:'legacy:type:alias:'+alias.id,label:alias.label,
        ledgerType:name,archived:false,legacy:true});
    }
  }
  for(const [kindId,ledgerType,,group] of KINDS){
    if(!enabledKinds.includes(kindId)||!enabledTypes.includes(ledgerType))continue;
    const originalTypeId='legacy:type:'+ledgerType;
    const originalTxnId='legacy:transaction:'+encodeURIComponent(kindId);
    const baseLabel=kindId.split('|')[1];
    // Legacy display aliases all represented the same canonical accounting
    // code. In the new hierarchy they must remain selectable as complete
    // linked paths, not become orphaned Type/Transaction leaf nodes.
    const typeParents=graph.types.filter(x=>x.ledgerType===ledgerType);
    for(const typeParent of typeParents){
      const variants=[
        {name:String(display.transactionLabels?.[kindId]||baseLabel),aliasId:null},
        ...(display.extraTransactions||[]).filter(alias=>
          alias.canonical===kindId&&validId(alias.id)&&nonempty(alias.label))
          .map(alias=>({name:alias.label,aliasId:alias.id}))
      ];
      for(const variant of variants){
        const base=typeParent.id===originalTypeId&&variant.aliasId==null;
        const id=base?originalTxnId:
          'legacy:transaction:link:'+legacyKey(typeParent.id+'|'+kindId+'|'+(variant.aliasId||'base'));
        graph.transactions.push({id,label:variant.name,
          parentId:typeParent.id,kindId,archived:false,legacy:true});
        // Archived entries may have been moved out of config.categories;
        // preserve their names and historical ledger mapping.
        const system=group==='Data Adjustment'?'Data Adjustment':group==='Transfer'?'Transfer':null;
        const existing=Array.isArray(groups[group])?groups[group]:system?[system]:[];
        const inactive=Array.isArray(archived[group])?archived[group]:[];
        for(const raw of new Set([...existing,...inactive])){
          if(!nonempty(raw))continue;
          const name=raw.trim();
          const hidden=inactive.includes(raw)||!!activeCategories&&!activeCategories.has(group+'|'+raw);
          const originalCategoryId='legacy:category:'+encodeURIComponent(kindId+'|'+name);
          const categoryId=base&&validId(originalCategoryId)?originalCategoryId:
            'legacy:category:link:'+legacyKey(id+'|'+name);
          graph.categories.push({id:categoryId,label:name,
            parentId:id,ledgerGroup:group,archived:hidden,legacy:true});
        }
      }
    }
  }
  return graph;
}
