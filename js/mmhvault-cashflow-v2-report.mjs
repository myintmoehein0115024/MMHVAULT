function reportKit(){
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const enc=s=>{const out=[];for(const ch of String(s)){let c=ch.codePointAt(0);if(c>=0xd800&&c<=0xdfff)c=0xfffd;if(c<128)out.push(c);else if(c<2048)out.push(192|c>>6,128|c&63);else if(c<65536)out.push(224|c>>12,128|c>>6&63,128|c&63);else out.push(240|c>>18,128|c>>12&63,128|c>>6&63,128|c&63)}return Uint8Array.from(out)};
 const types=['monthly','annual','incomeExpense','accountBalance','category','custom'];
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 function range(type,selection,scope,today){
  if(!types.includes(type)||!date(today))throw new RangeError('Report type/date');
  if(type==='monthly'){if(!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(selection.month||''))throw new RangeError('Month');const [y,m]=selection.month.split('-').map(Number);return {start:selection.month+'-01',end:new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)}}
  if(type==='annual'){if(!/^(19|20)\d{2}$/.test(selection.year||''))throw new RangeError('Year');return {start:selection.year+'-01-01',end:selection.year+'-12-31'}}
  const r=type==='custom'?selection:scope;if(!date(r.start)||!date(r.end)||r.start>r.end)throw new RangeError('Range');return {start:r.start,end:r.end};
 }
 function report({type,scope,data,analytics,balances,history=[],context=null,movements=null,investment=null,label=k=>k}){
  if(!types.includes(type)||!scope||!data)throw new TypeError('Report data');
  const t=data.totals,sections=[],section=(name,headers,rows)=>sections.push({key:name,keys:headers,name:label(name),headers:headers.map(label),rows});
  const money=(k,v)=>[label(k),finite(v)?v:null,scope.currency];
  section('reportScope',['metric','value','unit'],[['type',label(type),''],['start',scope.start,''],['end',scope.end,''],['currency',scope.currency,''],['account',(scope.accounts||[]).join(', ')||label('all'),''],['category',(scope.categories||[]).join(', ')||label('all'),''],['original',(scope.originalCurrencies||[]).join(', ')||label('all'),'']].map(([k,...v])=>[label(k),...v]));
  section('reportSummary',['metric','value','unit'],[money('income',t.income),money('expense',t.expense),money('net',t.net),[label('savings'),finite(t.savingsRate)?t.savingsRate:null,'ratio']]);
  section('expenseSplit',['metric','value','unit'],[money('individual',t.individual),money('personal',t.personal)]);
  if(['monthly','annual','accountBalance','custom'].includes(type))section('balance',['metric','value','unit'],[money('opening',balances?.opening),money('closing',balances?.closing),money('assetChange',balances?.change),money('nonCashflowChange',balances?.nonCashflowChange)]);
  if(['monthly','annual','incomeExpense','category','custom'].includes(type)){
   section('sources',['category','amount','unit'],(data.incomeSources||[]).map(r=>[r.name,r.amount,scope.currency]));
   section('categories',['category','amount','share','unit'],(analytics?.categories||[]).map(r=>[r.name,r.amount,r.share,scope.currency]));
  }
  if(['monthly','annual','accountBalance','custom'].includes(type)){
   section('accounts',['account','income','expense','net','unit'],(analytics?.accounts||[]).map(r=>[r.name,r.income,r.expense,r.net,scope.currency]));
   section('history',['date','amount','unit'],history.filter(r=>r.date>=scope.start&&r.date<=scope.end).map(r=>[r.date,r.amount,scope.currency]));
  }
  if(['monthly','annual','incomeExpense','custom'].includes(type))section('records',['date','type','category','account','original','originalAmount','amount','unit'],(data.included||[]).map(r=>[r.date,label(r.kind),r.category,r.account,r.currency,r.nativeAmount,r.amount,scope.currency]));
  if(analytics){
   section('spending',['metric','value','unit'],['fixed','variable','unknown'].map(k=>money(k,analytics.fixed?.[k])));
   section('expenseSplit',['type','category','amount','share','unit'],(analytics.expenseGroups||[]).map(r=>[label(r.group==='Expense'?'individual':'personal'),r.name,r.amount,r.share,scope.currency]));
  }
  if(movements&&['monthly','annual','accountBalance','custom'].includes(type))section('movements',['type','records','inflow','outflow','net','unit'],['transfers','loans','adjustments'].map(k=>{const m=movements.groups[k];return [label(k),m.count,m.inflow,m.outflow,m.net,scope.currency]}));
  if(investment&&['monthly','annual','custom','accountBalance'].includes(type)){section('investmentReport',['type','unit','periodRealized','holdingCost','holdingValue','realized','unrealized','lifetimePL','asOf'],investment.rows.map(r=>[label(r.asset==='Gold'?'goldAsset':'cryptoAsset'),r.currency,r.periodRealized,r.cost,r.value,r.realized,r.unreal,r.total,investment.asOf]));section('investmentNote',['metric','value'],[[label('investmentNote'),investment.asOf]])}
  if(context){
   const p=context.prior;section('priorNote',['metric','value','unit'],[[label('start'),context.priorRange.start,''],[label('end'),context.priorRange.end,''],...['income','expense','net','savingsRate'].map(k=>[label(k==='savingsRate'?'savings':k),finite(p?.[k])?p[k]:null,k==='savingsRate'?'ratio':scope.currency])]);
   if(context.global&&['monthly','annual','custom','accountBalance'].includes(type)){
    section('liveContext',['metric','value','unit'],[[label('asOf'),context.asOf,''],money('current',context.liveAssets),money('liquid',context.wealth?.liquid),money('invested',context.wealth?.invested)]);
    section('budget',['period','currency','total','used','remaining','share'],context.budgets===null?[[label('unavailable'),null,null,null,null,null]]:context.budgets.map(b=>[b.key,b.currency,b.total,b.used,b.remaining,b.ratio]));
    section('goalsCurrent',['name','type','unit','target','progress','share'],context.goals===null?[[label('unavailable'),null,null,null,null,null]]:context.goals.map(g=>[g.name,label(g.kind),g.kind==='savingsRate'?'ratio':g.currency,g.target,g.progress,g.ratio]));
    section('recurringCurrent',['name','frequency','amount','unit','due','type'],context.recurring===null?[[label('unavailable'),null,null,null,null,null]]:context.recurring.map(r=>[r.name,label(r.frequency),r.amount,r.currency,r.nextDue,label(r.paused?'paused':'active')]));
   }
  }
  const incomplete=!data.complete,missingBalance=type==='accountBalance'&&(!finite(balances?.opening)||!finite(balances?.closing));
  return {type,scope,sections,exportable:!incomplete&&!missingBalance,warning:incomplete?'missing':missingBalance?'missingBalance':null};
 }
 function csv(model){
  if(!model.exportable)throw new Error('Report incomplete');
  const cell=v=>finite(v)?String(v):'"'+String(v??'').replace(/^[\s=+\-@]/,m=>"'"+m).replace(/"/g,'""')+'"';
  return '\ufeff'+model.sections.flatMap(s=>[[s.name],s.headers,...s.rows,[]]).map(r=>r.map(cell).join(',')).join('\r\n');
 }
 const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const crc32=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
 function join(parts){const n=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(n);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out}
 function zip(entries){
  const chunks=[],central=[];let offset=0;
  for(const [name,value] of entries){const n=enc(name),b=typeof value==='string'?enc(value):value,c=crc32(b),h=new Uint8Array(30),d=new DataView(h.buffer),k=new Uint8Array(46),v=new DataView(k.buffer);
   d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x800,true);d.setUint16(12,33,true);d.setUint32(14,c,true);d.setUint32(18,b.length,true);d.setUint32(22,b.length,true);d.setUint16(26,n.length,true);
   v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,33,true);v.setUint32(16,c,true);v.setUint32(20,b.length,true);v.setUint32(24,b.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);
   chunks.push(h,n,b);central.push(k,n);offset+=h.length+n.length+b.length;
  }
  const cd=join(central),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,cd.length,true);e.setUint32(16,offset,true);return join([...chunks,cd,end]);
 }
 function xlsx(model){
  if(!model.exportable)throw new Error('Report incomplete');
  const rows=model.sections.flatMap(s=>[[s.name],s.headers,...s.rows,[]]);if(rows.length>1048576)throw new RangeError('Excel row limit');
  const cell=(v,c,r)=>{const addr=String.fromCharCode(65+c)+r;return finite(v)?'<c r="'+addr+'"><v>'+v+'</v></c>':'<c r="'+addr+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>'};
  const sheet='<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((r,i)=>'<row r="'+(i+1)+'">'+r.map((v,c)=>cell(v,c,i+1)).join('')+'</row>').join('')+'</sheetData></worksheet>';
  return zip([['[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],['_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cashflow" sheetId="1" r:id="rId1"/></sheets></workbook>'],['xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],['xl/worksheets/sheet1.xml',sheet]]);
 }
 function pdf(pages){
  if(!pages.length||pages.some(p=>!(p.jpeg instanceof Uint8Array)||p.jpeg[0]!==255||p.jpeg[1]!==216||!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<=0||p.height<=0))throw new TypeError('Invalid PDF page');
  const parts=[enc('%PDF-1.4\n')],offsets=[0];let size=parts[0].length;
  const obj=(id,...chunks)=>{offsets[id]=size;const b=join([enc(id+' 0 obj\n'),...chunks,enc('\nendobj\n')]);parts.push(b);size+=b.length};
  const stream=(dict,b)=>[enc('<< '+dict+' /Length '+b.length+' >>\nstream\n'),b,enc('\nendstream')];
  obj(1,enc('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,enc('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
  pages.forEach((p,i)=>{const id=3+i*3,content=enc('q 595 0 0 842 0 0 cm /Im0 Do Q');obj(id,enc('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>'));obj(id+1,...stream('/Type /XObject /Subtype /Image /Width '+p.width+' /Height '+p.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',p.jpeg));obj(id+2,...stream('',content))});
  const xref=size;parts.push(enc('xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n'));return join(parts);
 }
 return {types,range,report,csv,xlsx,pdf,zip,enc};
}
export const {types,range,report,csv,xlsx,pdf,zip,enc}=reportKit();
