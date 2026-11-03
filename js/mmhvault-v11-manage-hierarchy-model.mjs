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
  return {version:TREE_VERSION,ownerId,types:[],transactions:[],categories:[]};
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
  if(!Array.isArray(history))return 'unknown'; // never allow destructive edits during cloud load
  for(const row of history){
    if(!row||typeof row!=='object')continue;
    const tagged=row.choiceIds||row.manageChoiceIds||row.txManageIds;
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
    if(!kind||row.group!==kind.group)continue;
    if(field==='transaction')return 'used';
    if(row.category===node.label)return 'used';
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
// Derived view for older owners: no config/ledger writes on open. Actual
// migration must be transactionally persisted by the owner-scoped adapter.
export function legacyHierarchy(ownerId,config){
  const graph=emptyHierarchy(ownerId);
  const groups=config?.categories||{};
  for(const name of LEDGER_TYPES)graph.types.push({
    id:'legacy:type:'+name,label:name,ledgerType:name,archived:false,legacy:true
  });
  for(const [kindId,ledgerType,,group] of KINDS){
    const labelText=kindId.split('|')[1];
    const id='legacy:transaction:'+encodeURIComponent(kindId);
    graph.transactions.push({id,label:labelText,parentId:'legacy:type:'+ledgerType,
      kindId,archived:false,legacy:true});
    if(!Array.isArray(groups[group]))continue;
    for(const categoryName of groups[group]){
      if(!nonempty(categoryName))continue;
      const raw=categoryName.trim();
      const categoryId='legacy:category:'+encodeURIComponent(kindId+'|'+raw);
      graph.categories.push({id:categoryId,label:raw,parentId:id,
        ledgerGroup:group,archived:false,legacy:true});
    }
  }
  return graph;
}
