/* Browser-only report exports: one DOM snapshot feeds print/PDF and styled XLSX. */
globalThis.SadraReport223=(()=>{
  "use strict";
  const xml=v=>String(v ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function color(value,fallback="FFFFFF"){const m=value?.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);return m?m.slice(1,4).map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase():fallback;}
  function background(node){for(let n=node;n;n=n.parentElement){const c=getComputedStyle(n).backgroundColor;if(c!=="transparent" && c!=="rgba(0, 0, 0, 0)")return color(c);}return "FFFFFF";}
  function appearance(node){const s=getComputedStyle(node);return {color:color(s.color,"173F37"),fill:background(node),size:Math.round(parseFloat(s.fontSize)*.75),bold:Number(s.fontWeight)>=600 || s.fontWeight==="bold",border:color(s.borderColor,"D5E2DB"),align:s.textAlign==="center"?"center":"right"};}
  function snapshot(root){
    if(!root)throw Error("ابتدا گزارش را نمایش دهید");
    const copy=root.cloneNode(true),originals=[root,...root.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')];
    const props=['color','background-color','font-size','font-family','font-weight','line-height','text-align','direction','unicode-bidi','padding','border-top','border-right','border-bottom','border-left','border-radius','border-collapse','display','flex-direction','flex-wrap','gap','align-items','justify-content'];
    originals.forEach((node,i)=>{const s=getComputedStyle(node);props.forEach(k=>copies[i].style.setProperty(k,s.getPropertyValue(k)));});
    copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    const columns=Math.max(1,...[...root.querySelectorAll('table tr')].map(r=>[...r.cells].reduce((n,c)=>n+c.colSpan,0))),rows=[];
    const add=(text,node,span=columns)=>rows.push([{text,span,style:appearance(node)}]);
    function visit(node){
      if(node.matches('table')){for(const r of node.rows)rows.push([...r.cells].map(c=>({text:c.textContent,span:c.colSpan,style:appearance(c)})));return;}
      if(node.matches('.invoice219-balance-cards')){
        const cards=[...node.children];for(let start=0;start<cards.length;start+=3){const chunk=cards.slice(start,start+3),span=Math.max(1,Math.floor(columns/chunk.length));
          for(const selector of ['.invoice222-asset','.invoice222-quantity','.invoice219-credit,.invoice219-debit'])rows.push(chunk.map((c,i)=>{const item=c.querySelector(selector) || c;return {text:item.innerText,span:i===chunk.length-1?columns-span*i:span,style:appearance(item.querySelector(".invoice219-amount") || item)};}));
        }return;
      }
      if(node.matches('h2,h3,h4,p')){add(node.textContent,node);return;}
      for(const c of node.children)visit(c);
    }
    visit(root);return {html:copy.outerHTML,rows,columns,title:root.querySelector('h3')?.textContent || 'گزارش'};
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function print(root,pdf=false){
    const report=snapshot(root),frame=document.createElement('iframe');frame.style.cssText='position:fixed;left:0;bottom:0;width:1px;height:1px;border:0';document.body.append(frame);
    const font=new URL('fonts/Vazirmatn-RD-Regular.ttf',location.href).href,bold=new URL('fonts/Vazirmatn-RD-Bold.ttf',location.href).href;
    const html='<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>'+xml(report.title)+(pdf?' — PDF':'')+'</title><style>@font-face{font-family:Vazirmatn;src:url("'+font+'")}@font-face{font-family:Vazirmatn;font-weight:700;src:url("'+bold+'")}body{margin:0;font-family:Vazirmatn,Tahoma;direction:rtl}*{box-sizing:border-box;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tfoot{display:table-row-group!important}tr,.invoice219-balance-card{break-inside:avoid}.n-scroll{overflow:visible!important}bdi{direction:ltr;unicode-bidi:isolate}@page{size:A3 landscape;margin:10mm}</style></head><body>'+report.html+'</body></html>';
    const d=frame.contentDocument;d.open();d.write(html);d.close();window.SadraReportSnapshot223={html,rows:report.rows,pdf};
    frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});
    d.fonts.ready.then(()=>requestAnimationFrame(()=>{if(frame.isConnected){frame.contentWindow.focus();frame.contentWindow.print();}}));
  }
  // Minimal standard OOXML ZIP (stored entries), no external library or formulas.
  function zip(files){
    const enc=new TextEncoder(),parts=[],central=[];let offset=0;
    const crc=bytes=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;};
    for(const [path,body]of Object.entries(files)){const name=enc.encode(path),bytes=enc.encode(body),sum=crc(bytes),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,sum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);local.set(name,30);parts.push(local,bytes);const h=new Uint8Array(46+name.length),c=new DataView(h.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,sum,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);h.set(name,46);central.push(h);offset+=local.length+bytes.length;}
    const size=central.reduce((n,x)=>n+x.length,0),tail=new Uint8Array(22),v=new DataView(tail.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,tail],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function excel(root){
    const r=snapshot(root),styles=[],fonts=[],fills=['none','gray125'],borders=[];
    const index=(list,item)=>{const key=JSON.stringify(item),i=list.findIndex(x=>JSON.stringify(x)===key);if(i>=0)return i;list.push(item);return list.length-1;};
    const letter=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;},merges=[],widths=Array(r.columns).fill(12);
    const body=r.rows.map((cells,row)=>{let col=0;const value=cells.map(cell=>{const st=cell.style,font=index(fonts,{color:st.color,size:st.size,bold:st.bold}),fill=index(fills,st.fill),border=index(borders,st.border),style=index(styles,{font,fill,border,align:st.align}),ref=letter(col)+(row+1),span=cell.span || 1;if(span>1)merges.push(ref+':'+letter(col+span-1)+(row+1));else widths[col]=Math.min(34,Math.max(widths[col],String(cell.text).length+2));col+=span;return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+xml(cell.text)+'</t></is></c>';}).join('');return '<row r="'+(row+1)+'" ht="'+(cells.some(c=>c.span>1)?30:44)+'" customHeight="1">'+value+'</row>';}).join('');
    const sheet='<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>'+body+'</sheetData>'+(merges.length?'<mergeCells count="'+merges.length+'">'+merges.map(m=>'<mergeCell ref="'+m+'"/>').join('')+'</mergeCells>':'')+'<pageSetup orientation="landscape" paperSize="8"/></worksheet>';
    const style='<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="'+fonts.length+'">'+fonts.map(f=>'<font><name val="Tahoma"/><sz val="'+f.size+'"/>'+(f.bold?'<b/>':'')+'<color rgb="FF'+f.color+'"/></font>').join('')+'</fonts><fills count="'+fills.length+'">'+fills.map(f=>f==='none'||f==='gray125'?'<fill><patternFill patternType="'+f+'"/></fill>':'<fill><patternFill patternType="solid"><fgColor rgb="FF'+f+'"/><bgColor indexed="64"/></patternFill></fill>').join('')+'</fills><borders count="'+borders.length+'">'+borders.map(b=>'<border>'+['left','right','top','bottom'].map(side=>'<'+side+' style="thin"><color rgb="FF'+b+'"/></'+side+'>').join('')+'</border>').join('')+'</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="'+styles.length+'">'+styles.map(s=>'<xf numFmtId="0" fontId="'+s.font+'" fillId="'+s.fill+'" borderId="'+s.border+'" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="'+s.align+'" vertical="center" wrapText="1" readingOrder="2"/></xf>').join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const blob=zip({'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>','_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="گزارش" sheetId="1" r:id="rId1"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>','xl/worksheets/sheet1.xml':sheet,'xl/styles.xml':style});download(blob,'Sadra-report.xlsx');return r;
  }
  return {snapshot,print,excel};
})();
