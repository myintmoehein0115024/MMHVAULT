/* All exports are local. Never request libraries or transmit report data. */
import {csv,xlsx,pdf,zip} from './mmhvault-cashflow-v2-report.mjs?v=2.0.42';
import {reportLogo,reportCell,reportTone} from './mmhvault-cashflow-v2-report-format.mjs?v=2.0.44';
function download(win,bytes,mime,filename){const url=win.URL.createObjectURL(new win.Blob([bytes],{type:mime}));const a=win.document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';win.document.body.append(a);a.click();a.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000)}
function renderPages(doc,model,logo){
 const pages=[];let canvas,ctx,y;const left=54,width=1082,bottom=1615;
 const tones={income:'#087659',expense:'#b23950',net:'#345caa',savings:'#087659'};
 const next=()=>{if(pages.length>=100)throw new RangeError('Report exceeds 100 pages; shorten the range');canvas=doc.createElement('canvas');canvas.width=1190;canvas.height=1684;ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');ctx.fillStyle='#fff';ctx.fillRect(0,0,1190,1684);ctx.fillStyle='#1c2531';ctx.fillRect(0,0,1190,114);ctx.drawImage(logo,54,24,64,64);ctx.fillStyle='#edf0f6';ctx.font='bold 30px sans-serif';ctx.fillText('MMHVAULT · Cash Flow',136,52);ctx.font='20px sans-serif';ctx.fillText(model.scope.start+' – '+model.scope.end+' · '+model.scope.currency,136,83);ctx.fillText(String(pages.length+1),1080,55);y=140;pages.push(canvas)};
 next();
 const wrap=(value,w)=>{const lines=[];let line='';for(const ch of String(value??'—')){if(line&&ctx.measureText(line+ch).width>w){lines.push(line);line=ch}else line+=ch}if(line||!lines.length)lines.push(line);return lines};
 const font=(bold=false)=>{ctx.font=(bold?'bold ':'')+'20px sans-serif'};
 const heading=(name)=>{ctx.font='bold 23px sans-serif';const lines=wrap(name,width);if(y+lines.length*29+62>bottom)next();ctx.font='bold 23px sans-serif';ctx.fillStyle='#365fae';for(const line of lines){ctx.fillText(line,left,y+23);y+=29}y+=5};
 const draw=(text,x,baseline,color)=>{ctx.fillStyle=color;ctx.fillText(text,x,baseline)};
 for(const section of model.sections){
  if(section.key==='reportScope'){
   font();const labels=section.rows.filter((r,i)=>i===0||i>=4).map(r=>r[0]+': '+r[1]).join('  ·  '),lines=wrap(labels,width-24);
   if(y+lines.length*25+20>bottom)next();ctx.fillStyle='#eef2f7';ctx.fillRect(left,y,width,lines.length*25+16);font();lines.forEach((line,i)=>draw(line,left+12,y+24+i*25,'#49576b'));y+=lines.length*25+28;continue;
  }
  if(section.key==='reportSummary'&&section.rows.length<=4){
   const w=(width-12*3)/4;font(true);const cards=section.rows.map((row)=>({row,labels:wrap(row[0],w-20),values:wrap(reportCell(section,row,1,model.locale),w-20)}));const h=Math.max(...cards.map(c=>c.labels.length*25+c.values.length*27+32));if(y+h+40>bottom)next();heading(section.name);
   cards.forEach(({row,labels,values},i)=>{const x=left+i*(w+12);ctx.fillStyle='#eef2f7';ctx.fillRect(x,y,w,h);font();labels.forEach((line,k)=>draw(line,x+10,y+25+k*25,'#49576b'));font(true);const tone=reportTone(section,row,1);values.forEach((line,k)=>draw(line,x+10,y+labels.length*25+30+k*27,row[1]<0?'#b23950':tones[tone]||'#202a3a'))});y+=h+14;continue;
  }
  const unit=section.keys.indexOf('unit'),indices=section.keys.map((_,i)=>i).filter(i=>i!==unit||!section.rows.every(row=>row[unit]===model.scope.currency));
  const weights=indices.map(i=>['category','account','name','metric','type'].includes(section.keys[i])?1.4:1),sum=weights.reduce((a,b)=>a+b,0),widths=weights.map(w=>w/sum*width);
  const prepare=(row,header)=>{font(header);const cells=indices.map((j,i)=>wrap(header?row[j]:reportCell(section,row,j,model.locale),widths[i]-14));return {row,cells,h:Math.max(...cells.map(a=>a.length))*24+10,header}};
  const header=prepare(section.headers,true);const rows=section.rows.map(row=>prepare(row,false));
  const paintRow=(item,index)=>{font(item.header);ctx.fillStyle=item.header?'#e8edf5':index%2===0?'#f5f7fa':'#fff';ctx.fillRect(left,y,width,item.h);let x=left;item.cells.forEach((lines,i)=>{const j=indices[i],numeric=!item.header&&typeof item.row[j]==='number',tone=item.header?'':reportTone(section,item.row,j);for(let k=0;k<lines.length;k++){const line=lines[k];draw(line,numeric?x+widths[i]-7-ctx.measureText(line).width:x+7,y+23+k*24,tones[tone]||'#202a3a')}x+=widths[i]});y+=item.h};
  if(y+40+header.h+(rows[0]?.h||0)>bottom)next();heading(section.name);paintRow(header,0);
  rows.forEach((row,i)=>{if(row.h+header.h+85>bottom-140)throw new RangeError('Report row too long');if(y+row.h>bottom){next();heading(section.name);paintRow(header,0)}paintRow(row,i)});y+=15;
 }
 return pages;
}
const bytes=(win,c,type)=>{const s=c.toDataURL(type,.93).split(',')[1];if(!s)throw Error('Canvas export unavailable');return Uint8Array.from(win.atob(s),c=>c.charCodeAt(0))};
export async function exportLocal(win,model,format,stillCurrent){
 if(!model?.exportable||!stillCurrent())throw Error('Report unavailable');
 const name='MMHVAULT-Cashflow-'+model.type+'-'+model.scope.start+'-'+model.scope.end+'-'+model.scope.currency;
 if(format==='csv'){download(win,csv(model),'text/csv;charset=utf-8',name+'.csv');return}
 if(format==='xlsx'){download(win,xlsx(model),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name+'.xlsx');return}
 if(!['pdf','image','print'].includes(format))throw Error('Unknown export');
 const logo=new win.Image();logo.src=reportLogo;await logo.decode();if(!stillCurrent())throw Error('Session changed');const pages=renderPages(win.document,model,logo);
 if(!stillCurrent())throw Error('Session changed');
 if(format==='pdf'){download(win,pdf(pages.map(c=>({jpeg:bytes(win,c,'image/jpeg'),width:c.width,height:c.height}))),'application/pdf',name+'.pdf');return}
 if(format==='image'){if(pages.length===1){download(win,bytes(win,pages[0],'image/png'),'image/png',name+'.png');return}download(win,zip(pages.map((c,i)=>['page-'+(i+1)+'.png',bytes(win,c,'image/png')])),'application/zip',name+'-images.zip');return}
 const frame=win.document.createElement('iframe');frame.setAttribute('title','MMHVAULT print preview');frame.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0;pointer-events:none';win.document.body.append(frame);
 try{const d=frame.contentDocument;if(!d)throw Error('Print frame unavailable');const style=d.createElement('style');style.textContent='@page{size:A4;margin:0}body{margin:0}canvas{display:block;width:210mm;height:297mm;break-after:page}canvas:last-child{break-after:auto}';d.head.append(style);for(const p of pages){const c=d.createElement('canvas');c.width=p.width;c.height=p.height;c.getContext('2d').drawImage(p,0,0);d.body.append(c)}if(!stillCurrent())throw Error('Session changed');frame.contentWindow.focus();frame.contentWindow.print()}finally{frame.remove()}
}
