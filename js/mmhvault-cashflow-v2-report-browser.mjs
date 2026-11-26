/* All exports are local. Never request libraries or transmit report data. */
import {csv,xlsx,pdf,zip} from './mmhvault-cashflow-v2-report.mjs';
function download(win,bytes,mime,filename){const url=win.URL.createObjectURL(new win.Blob([bytes],{type:mime}));const a=win.document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';win.document.body.append(a);a.click();a.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000)}
function renderPages(doc,model){
 const pages=[];let canvas,ctx,y;
 const next=()=>{if(pages.length>=100)throw new RangeError('Report exceeds 100 pages; shorten the range');canvas=doc.createElement('canvas');canvas.width=1190;canvas.height=1684;ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');ctx.fillStyle='#fff';ctx.fillRect(0,0,1190,1684);ctx.fillStyle='#242522';ctx.font='bold 32px sans-serif';ctx.fillText('MMHVAULT · Cashflow',54,65);ctx.font='20px sans-serif';ctx.fillText(model.scope.start+' – '+model.scope.end+' · '+model.scope.currency,54,100);ctx.fillText(String(pages.length+1),1080,65);y=145;pages.push(canvas)};
 next();
 const wrap=(v,w)=>{const lines=[];let line='';const str=String(v??'—');for(const ch of str){if(line&&ctx.measureText(line+ch).width>w){lines.push(line);line=ch}else line+=ch}if(line||!lines.length)lines.push(line);return lines};
 for(const section of model.sections){
  if(y>1500)next();ctx.fillStyle='#242522';ctx.font='bold 25px sans-serif';for(const line of wrap(section.name,1080)){if(y>1600)next();ctx.fillText(line,54,y);y+=32}
  for(const [i,row] of [section.headers,...section.rows].entries()){
   ctx.font=i===0?'bold 20px sans-serif':'20px sans-serif';const w=1080/Math.max(1,row.length),cells=row.map(v=>wrap(v,w-16)),height=Math.max(...cells.map(a=>a.length))*27+18;
   if(height>1440)throw new RangeError('Report row too long');
   if(y+height>1610)next();ctx.font=i===0?'bold 20px sans-serif':'20px sans-serif';ctx.fillStyle='#242522';
   cells.forEach((lines,j)=>lines.forEach((line,k)=>ctx.fillText(line,54+w*j,y+22+k*27)));
   ctx.strokeStyle='#deded8';ctx.beginPath();ctx.moveTo(54,y+height);ctx.lineTo(1134,y+height);ctx.stroke();y+=height;
  }y+=30;
 }return pages;
}
const bytes=(win,c,type)=>{const s=c.toDataURL(type,.93).split(',')[1];if(!s)throw Error('Canvas export unavailable');return Uint8Array.from(win.atob(s),c=>c.charCodeAt(0))};
export function exportLocal(win,model,format,stillCurrent){
 if(!model?.exportable||!stillCurrent())throw Error('Report unavailable');
 const name='MMHVAULT-Cashflow-'+model.type+'-'+model.scope.start+'-'+model.scope.end+'-'+model.scope.currency;
 if(format==='csv'){download(win,csv(model),'text/csv;charset=utf-8',name+'.csv');return}
 if(format==='xlsx'){download(win,xlsx(model),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name+'.xlsx');return}
 if(!['pdf','image','print'].includes(format))throw Error('Unknown export');
 const pages=renderPages(win.document,model);
 if(!stillCurrent())throw Error('Session changed');
 if(format==='pdf'){download(win,pdf(pages.map(c=>({jpeg:bytes(win,c,'image/jpeg'),width:c.width,height:c.height}))),'application/pdf',name+'.pdf');return}
 if(format==='image'){if(pages.length===1){download(win,bytes(win,pages[0],'image/png'),'image/png',name+'.png');return}download(win,zip(pages.map((c,i)=>['page-'+(i+1)+'.png',bytes(win,c,'image/png')])),'application/zip',name+'-images.zip');return}
 const frame=win.document.createElement('iframe');frame.setAttribute('title','MMHVAULT print preview');frame.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0;pointer-events:none';win.document.body.append(frame);
 try{const d=frame.contentDocument;if(!d)throw Error('Print frame unavailable');const style=d.createElement('style');style.textContent='@page{size:A4;margin:0}body{margin:0}canvas{display:block;width:210mm;height:297mm;break-after:page}canvas:last-child{break-after:auto}';d.head.append(style);for(const p of pages){const c=d.createElement('canvas');c.width=p.width;c.height=p.height;c.getContext('2d').drawImage(p,0,0);d.body.append(c)}if(!stillCurrent())throw Error('Session changed');frame.contentWindow.focus();frame.contentWindow.print()}finally{frame.remove()}
}
