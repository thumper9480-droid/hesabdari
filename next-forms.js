/* Update 214: step-by-step document headers and installment contracts. */
globalThis.SadraForms214 = {
  create(env) {
    "use strict";
    const {el,btn,field,select,input,bar,card,table,f,name,openEditor,rerender,host,legacyDate} = env;
    const {clone,uid,norm,dec,mul,sub} = SadraCore;
    const ledger = () => env.ledger();
    const active = kind => (ledger().s[kind] || []).filter(x=>x.active!==false);
    let invoice = null, contract = freshContract(), invoiceRow = freshInvoiceRow216(), invoiceFocus = "invoice214-number";
    function freshContract() { return {token:uid(),title:"",affectAccount:"",direction:"",partyKind:"",partyId:"",bankId:"",groupId:"",commitmentKind:"",good:"",goodsGroup:"",amount:"",count:"",firstDue:today(),tag:""}; }
    function today() {
      const parts = new Intl.DateTimeFormat("en-US-u-ca-persian",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
      return ["year","month","day"].map(k=>parts.find(p=>p.type===k).value).join("/");
    }
    function jalali(value) {
      const text = norm(value).replace(/-/g,"/");
      if (!/^1\d{3}\/\d{1,2}\/\d{1,2}$/.test(text) || Number(text.slice(0,4))>=1700 || !legacyDate(text)) throw Error("تاریخ شمسی معتبر وارد کنید");
      const [y,m,d] = text.split("/"); return [y,m.padStart(2,"0"),d.padStart(2,"0")].join("/");
    }
    function dueDates(first,count) {
      const date=jalali(first),[y,m,d]=date.split("/").map(Number), result=[];
      for(let i=0;i<count;i++) {
        const month=(m-1)+i, year=y+Math.floor(month/12), mm=(month%12)+1;
        let dd=d, value="";
        while(dd>0) {value=year+"/"+String(mm).padStart(2,"0")+"/"+String(dd).padStart(2,"0");if(legacyDate(value))break;dd--;}
        if(!dd)throw Error("سررسید معتبر نیست");
        result.push({jalali:value,date:legacyDate(value)});
      }
      return result;
    }
    function showError(box,error) {box.textContent=error.message || String(error);box.className="n-error";}
    function focusNext(root,control) {
      const list=[...root.querySelectorAll("input,select,button,textarea")].filter(n=>!n.disabled && n.getClientRects().length && !n.closest("dialog:not([open])"));
      const next=list[list.indexOf(control)+1];if(next){next.focus();if(next.tagName==="INPUT")next.select();}
    }
    function enterFlow(root,validate) {
      root.addEventListener("keydown",e=>{
        if(e.key!=="Enter" || e.isComposing || e.defaultPrevented || e.target.tagName==="BUTTON" || e.target.tagName==="TEXTAREA")return;
        e.preventDefault();try{if(validate)validate(e.target);focusNext(root,e.target);}catch(err){env.message(err.message,true);}
      });
    }
    function partyFields(root,state,changed,prefix,config={}) {
      root.classList.add("party-fields214");
      const options={banks:"بانک‌ها",funds:"صندوق‌ها",expenses:"هزینه‌ها",incomes:"درآمد",people:"افراد"};
      if(config.allowInstallments)options.installments="اقساط";
      let parentPluses=0;
      root.addEventListener("keydown",e=>{
        if(e.ctrlKey || e.metaKey || e.altKey)return;
        if(e.key!=="+"){parentPluses=0;return;}
        if(e.target.tagName!=="SELECT" || !["expenses","people"].includes(state.partyKind) || !state.groupId)return;
        e.preventDefault();e.stopPropagation();parentPluses++;
        if(parentPluses<2)return;parentPluses=0;
        const kind=state.partyKind;
        openEditor(kind,null,{name:"",groupId:state.groupId},saved=>{state.partyId=saved.id;state.partyText=saved.name;state.groupId=saved.groupId;changed();return prefix+"-partyId";},{nameOnly:kind==="expenses"});
      });
      const add=(key,label,items,onchange)=>{
        const control=select(items,state[key] || "");control.id=prefix+"-"+key;control.required=true;
        root.append(field(label,control));
        const commit=()=>{
          const previous=state[key];state[key]=control.value;
          if(onchange && previous!==control.value){onchange();draw();root.querySelector('#'+prefix+'-'+key)?.focus();}
          changed();
        };
        control.onchange=commit;
        control.addEventListener("keydown",e=>{
          if(e.isComposing)return;
          if(e.key==="ArrowDown" || e.key==="ArrowUp") {
            e.preventDefault();e.stopPropagation();
            const step=e.key==="ArrowDown"?1:-1;
            control.selectedIndex=Math.max(0,Math.min(control.options.length-1,control.selectedIndex+step));
            commit();
          } else if(e.key==="Enter") {
            e.preventDefault();e.stopPropagation();
            if(!control.value){env.message(""+label+" را انتخاب کنید",true);return;}
            if(key==="partyId" && config.onComplete)config.onComplete();else focusNext(root.closest("form") || root,control);
          }
        });
        return control;
      };
      function parentChanged(){state.partyId="";state.partyText="";}
      function draw() {
        root.replaceChildren();
        add("partyKind","گروه طرف حساب",Object.entries(options).map(([id,name])=>({id,name})),()=>{state.partyId="";state.partyText="";state.bankId="";state.groupId="";state.contractId="";state.dueId="";});
        const kind=state.partyKind;if(!kind)return;
        let list=[];
        if(kind==="installments") {
          const candidates=(ledger().s.installmentContracts214 || []).filter(c=>ledger().s.goods.find(g=>g.id===c.good)?.assetId===config.assetId && c.direction===(config.operation==="receive"?"receivable":"payable") && c.dues.some(d=>dec(ledger().installmentRemaining216(c.id,d.id))>0n));
          add("contractId","نام قرارداد",candidates.map(c=>({id:c.id,name:c.title+" — "+c.partyName})),()=>{state.dueId="";state.partyId=state.contractId;});
          if(state.contractId) {
            const c=candidates.find(c=>c.id===state.contractId);
            const dues=c?c.dues.map((d,i)=>({id:d.id,name:"قسط "+f(i+1)+" — "+f(d.jalali)+" — مانده "+f(ledger().installmentRemaining216(c.id,d.id))})).filter(d=>dec(ledger().installmentRemaining216(c.id,d.id))>0n):[];
            add("dueId","قسط قرارداد",dues);state.partyId=state.contractId;
          }
          root.append(el("small","در اقساط، بانک یا صندوق سربرگ محل واقعی دریافت/پرداخت است. قراردادهای قبلی از مسیر تسویهٔ قبلی در دسترس‌اند.","n-muted"));return;
        }
        if(kind==="banks") {
          add("bankId","نام بانک",active("bankInstitutions"),parentChanged);
          if(!state.bankId)return;
          list=active("funds").filter(x=>x.legacyKind==="banks" && x.bankId===state.bankId).map(x=>({...x,name:x.accountNumber || x.name}));
        } else if(kind==="funds") list=active("funds").filter(x=>x.legacyKind!=="banks");
        else if(kind==="expenses" || kind==="people") {
          add("groupId",kind==="expenses"?"محل هزینه":"گروه افراد",active(kind==="expenses"?"expenseGroups":"peopleGroups"),parentChanged);
          if(!state.groupId)return;
          list=active(kind).filter(x=>x.groupId===state.groupId);
        } else list=active("incomes");
        const label={banks:"شماره حساب",funds:"نام صندوق",expenses:"نام هزینه",incomes:"نام درآمد",people:"نام فرد"}[kind];
        if(kind!=="expenses" && kind!=="people") {
          const c=add("partyId",label,list);c.dataset.partyLeaf="true";return;
        }
        const wrap=el("div",null,"party-search214"), control=input(state.partyText || list.find(x=>x.id===state.partyId)?.name || ""), results=el("div",null,"party-suggestions214");
        let query="", activeIndex=-1;
        control.id=prefix+"-partyId";control.dataset.partyLeaf="true";control.required=true;control.autocomplete="off";control.setAttribute("role","combobox");control.setAttribute("aria-autocomplete","list");control.setAttribute("aria-expanded","false");control.setAttribute("aria-controls",prefix+"-results");results.id=prefix+"-results";results.setAttribute("role","listbox");results.hidden=true;
        function hide(){results.hidden=true;control.setAttribute("aria-expanded","false");control.removeAttribute("aria-activedescendant");}
        function choose(item){state.partyId=item.id;state.partyText=item.name;control.value=item.name;query="";hide();changed();}
        function matches(){const q=norm(query);return list.filter(x=>norm(x.name).includes(q));}
        function suggest(){
          results.replaceChildren();const candidates=matches(),start=Math.max(0,activeIndex-9);
          candidates.slice(start,start+20).forEach((item,offset)=>{
            const index=start+offset, option=btn(item.name,()=>{choose(item);control.focus();});
            option.id=prefix+"-option-"+index;option.tabIndex=-1;option.setAttribute("role","option");option.setAttribute("aria-selected",String(index===activeIndex));
            option.addEventListener("mousedown",e=>e.preventDefault());results.append(option);
          });
          results.hidden=!candidates.length;control.setAttribute("aria-expanded",String(!results.hidden));
          const selected=results.querySelector('[aria-selected="true"]');
          if(selected){control.setAttribute("aria-activedescendant",selected.id);selected.scrollIntoView({block:"nearest"});}else control.removeAttribute("aria-activedescendant");
        }
        function create(){
          const proposed=control.value.replace(/\+/g,"").trim();state.partyText=proposed;control.value=proposed;hide();
          openEditor(kind,null,{name:proposed,groupId:state.groupId},saved=>{
            state.partyId=saved.id;state.partyText=saved.name;state.groupId=saved.groupId;changed();
            return prefix+"-partyId";
          },{nameOnly:kind==="expenses"});
        }
        control.onfocus=()=>{query=state.partyId && list.some(x=>x.id===state.partyId && x.name===control.value)?"":control.value;activeIndex=matches().findIndex(x=>x.id===state.partyId);};
        control.oninput=()=>{if(control.value.endsWith("++")){create();return;}query=control.value;activeIndex=-1;state.partyText=control.value;state.partyId=list.find(x=>norm(x.name)===norm(control.value))?.id || "";suggest();changed();};
        control.addEventListener("keydown",e=>{
          if(e.isComposing)return;
          if(e.key==="Escape"){e.preventDefault();e.stopPropagation();hide();return;}
          if(e.key==="ArrowDown" || e.key==="ArrowUp") {
            e.preventDefault();e.stopPropagation();const candidates=matches();
            if(candidates.length){activeIndex=activeIndex<0?(e.key==="ArrowDown"?0:candidates.length-1):Math.max(0,Math.min(candidates.length-1,activeIndex+(e.key==="ArrowDown"?1:-1)));suggest();}
            return;
          }
          if(e.key==="Enter") {
            e.preventDefault();e.stopPropagation();const candidates=matches(),item=candidates[activeIndex] || candidates.find(x=>x.id===state.partyId) || candidates[0];
            if(item){choose(item);if(config.onComplete)config.onComplete();else focusNext(root.closest("form") || root,control);}else env.message("موردی پیدا نشد؛ برای معرفی مورد جدید ++ بزنید",true);
          }
        });
        control.onblur=hide;
        wrap.append(control,results);root.append(field(label,wrap));root.append(el("small","انتخاب با ↑ و ↓ و تأیید با Enter؛ جست‌وجوی نام؛ افزودن مورد جدید با ++.","n-muted"));
      }
      draw();
    }
    function persistInvoice(error) {
      if(!invoice)return;
      try {if(invoice.status==="posted")return true;if(env.needsReview())throw Error("برای ذخیرهٔ پیش‌نویس ابتدا مانده‌های انتقالی را بررسی کنید");ledger().saveInvoiceHeader214(invoice);if(error)error.textContent="";return true;}catch(e){if(error)showError(error,e);else env.message(e.message,true);return false;}
    }
    function reserveInvoice() {
      invoiceRow=freshInvoiceRow216();invoiceFocus="invoice214-number";
      const floor=Math.max(Number(env.raw().counter)||1,...(env.raw().docs || []).map(d=>Number(d.no)+1));
      if(env.needsReview()){invoice={id:null,number:floor,jalali:today(),partyKind:"",partyId:"",bankId:"",groupId:""};return;}
      invoice=ledger().newInvoiceHeader214(floor,today());
    }
    function invoiceScreen() {
      if(!invoice)reserveInvoice();
      const frame=el("section",null,"invoice214-frame"), actions=bar(), form=el("form",null,"invoice214-form"), grid=el("div",null,"invoice214-header"), error=el("div");
      const existing=[...(ledger().s.invoiceHeaders214 || [])].sort((a,b)=>a.number-b.number),position=existing.findIndex(d=>d.id===invoice.id);
      const previous=btn("سند قبلی",()=>{if(!persistInvoice(error))return;if(position>0){invoice=clone(existing[position-1]);invoiceRow=freshInvoiceRow216();rerender();}});
      previous.disabled=position<=0;
      const next=btn("سند بعدی",()=>{if(!persistInvoice(error))return;if(position>=0 && position<existing.length-1){invoice=clone(existing[position+1]);invoiceRow=freshInvoiceRow216();}else reserveInvoice();rerender();});
      actions.append(previous,next);actions.classList.add("invoice214-actions");
      const number=input(invoice.number);number.id="invoice214-number";number.readOnly=true;number.inputMode="numeric";number.setAttribute("aria-label","شماره فاکتور");grid.append(field("شماره فاکتور",number));
      const date=el("div",null,"invoice214-date"),parts=invoice.jalali.split("/"), dateControls=[];
      ["سال","ماه","روز"].forEach((title,i)=>{const c=input(parts[i] || "");c.id="invoice214-"+["year","month","day"][i];c.inputMode="numeric";c.maxLength=i===0?4:2;c.setAttribute("aria-label",title);c.oninput=()=>{invoice.jalali=dateControls.map(n=>n.value).join("/");persistInvoice(error);};dateControls.push(c);date.append(c);});
      grid.append(field("تاریخ شمسی",date));
      let lineSection;
      const parties=el("div");partyFields(parties,invoice,()=>{persistInvoice(error);if(lineSection)lineSection.hidden=!invoice.partyId;},"invoice214",{onComplete:()=>{try{jalali(invoice.jalali);ledger().validateParty214(invoice);if(!persistInvoice(error))return;lineSection.hidden=false;lineSection.querySelector("#row216-operation")?.focus();}catch(e){showError(error,e);}}});grid.append(parties);
      if(invoice.rows?.length || invoice.status==="posted")parties.querySelectorAll("input,select,button").forEach(control=>control.disabled=true);
      if(invoice.status==="posted")dateControls.forEach(control=>control.disabled=true);
      form.append(grid,error);form.onsubmit=e=>e.preventDefault();
      enterFlow(form,control=>{if(dateControls.includes(control)){const index=dateControls.indexOf(control),value=Number(norm(control.value));if(!Number.isInteger(value)||value<1||(index===0&&(value<1000||value>=1700))||(index===1&&value>12)||(index===2&&value>31))throw Error(""+["سال","ماه","روز"][index]+" معتبر وارد کنید");if(index===2){invoice.jalali=jalali(invoice.jalali);persistInvoice(error);}}});
      if(env.needsReview()){error.textContent="برای ذخیرهٔ سربرگ ابتدا مانده‌های قبلی را بررسی کنید.";error.className="n-error";frame.append(btn("بررسی مانده‌های قبلی",()=>env.openReview()));}
      frame.append(actions,form);host.append(frame);
      lineSection=el("section",null,"invoice216-lines");lineSection.hidden=!invoice.partyId;host.append(lineSection);invoiceLines216(lineSection,error);
      document.getElementById(invoiceFocus)?.focus();invoiceFocus="invoice214-number";
    }
    function freshInvoiceRow216() {return {operation:"",receiptKind:"",assetId:"",partyKind:"",partyId:"",bankId:"",groupId:"",contractId:"",dueId:"",amount:"",tag:"",notes:""};}
    function invoiceLines216(section,headerError) {
      const posted=invoice.status==="posted", container=el("div",null,"invoice216-editor");
      if(!posted)section.append(container);
      function refreshInvoice() {invoice=clone(ledger().find("invoiceHeaders214",invoice.id));invoiceFocus="row216-operation";rerender();}
      function drawEditor() {
        container.replaceChildren();const r=invoiceRow,form=el("form"),grid=el("div",null,"n-grid"),error=el("div");
        function dropdown(key,title,items,after,required=true) {
          const c=select(items,r[key] || "");c.id="row216-"+key;c.required=required;grid.append(field(title,c));
          const change=()=>{const previous=r[key];r[key]=c.value;if(after && previous!==c.value){after();drawEditor();document.getElementById(c.id)?.focus();}};
          c.onchange=change;c.addEventListener("keydown",e=>{if(e.isComposing)return;if(e.key==="ArrowDown" || e.key==="ArrowUp"){e.preventDefault();e.stopPropagation();c.selectedIndex=Math.max(0,Math.min(c.options.length-1,c.selectedIndex+(e.key==="ArrowDown"?1:-1)));change();}else if(e.key==="Enter"){e.preventDefault();e.stopPropagation();if(c.required && !c.value){showError(error,new Error(title+" را انتخاب کنید"));return;}focusNext(form,c);}});
          return c;
        }
        dropdown("operation","نوع عملیات",[{id:"receive",name:"دریافت"},{id:"pay",name:"پرداخت"},{id:"buy",name:"خرید"},{id:"sell",name:"فروش"}],()=>{r.receiptKind="";r.assetId="";r.partyKind="";r.partyId="";r.bankId="";r.groupId="";r.contractId="";r.dueId="";});
        if(["receive","pay"].includes(r.operation)) {
          dropdown("receiptKind",r.operation==="receive"?"نوع دریافت":"نوع پرداخت",[{id:"currency",name:"ارزی"},{id:"commodity",name:"کالایی"}],()=>{r.assetId="";r.partyKind="";r.partyId="";});
          if(r.receiptKind==="currency") {
            dropdown("assetId","نوع ارز",active("assets").filter(a=>a.nature==="currency"),()=>{r.partyKind="";r.partyId="";r.bankId="";r.groupId="";r.contractId="";r.dueId="";});
            if(r.assetId) {
              const party=el("div",null,"invoice216-party");partyFields(party,r,()=>{},"row216",{allowInstallments:true,assetId:r.assetId,operation:r.operation});grid.append(party);
              const amount=input(r.amount);amount.id="row216-amount";amount.required=true;amount.inputMode="decimal";amount.oninput=()=>r.amount=amount.value;grid.append(field(r.operation==="receive"?"مقدار ارز دریافتی":"مقدار ارز پرداختی",amount));
              dropdown("tag","برچسب سطر",active("tags"),null,false);
              const notes=el("textarea");notes.id="row216-notes";notes.value=r.notes;notes.oninput=()=>r.notes=notes.value;notes.addEventListener("keydown",e=>{if(e.key==="Enter" && !e.shiftKey && !e.isComposing){e.preventDefault();e.stopPropagation();focusNext(form,notes);}});grid.append(field("توضیحات سطر",notes));
              grid.append(el("p",r.partyKind==="installments"?"در اقساط، مبلغ در بانک/صندوق سربرگ ثبت و از ماندهٔ قسط انتخاب‌شده کم می‌شود.":r.operation==="receive"?"دریافت از طرف حساب سربرگ در طرف انتخاب‌شدهٔ این سطر ثبت می‌شود.":"پرداخت از طرف انتخاب‌شدهٔ این سطر به طرف حساب سربرگ ثبت می‌شود.","n-muted"));
            }
          }
        }
        const supported=["receive","pay"].includes(r.operation) && r.receiptKind==="currency";
        if(r.operation && (!supported && (r.receiptKind || ["buy","sell"].includes(r.operation))))grid.append(el("p","جزئیات این مسیر هنوز ارائه نشده است؛ فعلاً فقط دریافت و پرداخت ارزی قابل ثبت‌اند.","n-notice"));
        const add=el("button",r.id?"ذخیرهٔ سطر":"ثبت سطر","primary");add.type="submit";add.disabled=!supported || !r.assetId || env.needsReview();
        form.append(grid,error,bar(add,btn("سطر تازه",()=>{invoiceRow=freshInvoiceRow216();drawEditor();container.querySelector("#row216-operation")?.focus();})));
        form.onsubmit=e=>{e.preventDefault();try{
          if(!persistInvoice(headerError))return;
          ledger().saveInvoiceLine216(invoice.id,{...r,tags:r.tag?[r.tag]:[]});
          invoiceRow=freshInvoiceRow216();refreshInvoice();
        }catch(e){showError(error,e);}};
        enterFlow(form);container.append(el("h3",r.id?"ویرایش سطر فاکتور":"ثبت سطر فاکتور"),form);
      }
      if(!posted)drawEditor();
      const rows=invoice.rows || [];
      if(rows.length) {
        const partyTitle=row=>{if(row.partyKind!=="installments")return name(row.partyKind==="banks"?"funds":row.partyKind,row.partyId);const c=(ledger().s.installmentContracts214 || []).find(c=>c.id===row.contractId),index=c?.dues.findIndex(d=>d.id===row.dueId) ?? -1;return c?c.title+" — قسط "+f(index+1)+" ("+f(c.dues[index]?.jalali)+")":"اقساط";};
        section.append(card(el("h3","سطرهای فاکتور "+f(invoice.number)),table(["سطر","عملیات","ارز","طرف سطر","مقدار","برچسب","توضیحات"],rows.map((r,i)=>({item:r,cells:[f(i+1),r.operation==="receive"?"دریافت":"پرداخت",r.assetName,partyTitle(r),f(r.amount),(r.tags || []).map(id=>name("tags",id)).join("، "),r.notes]})),r=>posted?bar(btn("نمایش ثبت مالی",()=>env.showDocument(r.documentId))):bar(btn("ویرایش",()=>{invoiceRow={...clone(r),tag:r.tags?.[0] || ""};drawEditor();container.querySelector("#row216-operation")?.focus();}),btn("حذف",()=>{try{ledger().removeInvoiceLine216(invoice.id,r.id);invoiceRow=freshInvoiceRow216();refreshInvoice();}catch(e){env.message(e.message,true);}},"danger")))));
        if(!posted) {
          const error=el("div");section.append(error,btn("ثبت نهایی سند",()=>{try{
            if(!persistInvoice(headerError))return;
            const date=legacyDate(jalali(invoice.jalali));invoice=ledger().postInvoice216(invoice.id,date);invoiceRow=freshInvoiceRow216();rerender();env.message("سند شمارهٔ "+f(invoice.number)+" ثبت شد");
          }catch(e){showError(error,e);}},"primary"));
          section.append(el("p","سطرها تا زدن «ثبت نهایی سند» پیش‌نویس‌اند و اثر مالی ندارند. برای تغییر طرف سربرگ ابتدا سطرهای پیش‌نویس را حذف کنید.","n-muted"));
        } else section.append(el("p","این سند ثبت شده است؛ تغییر مستقیم سطرها مجاز نیست. جزئیات و برگشت مستند از نمایش ثبت مالی در دسترس است.","n-notice"));
      }
    }
    function installmentsScreen() {
      const form=el("form"),grid=el("div",null,"n-grid"),error=el("div"), v=contract;
      function text(key,title,type="text") {const c=input(v[key] || "",type);c.id="inst214-"+key;c.required=true;c.oninput=()=>{v[key]=c.value;};grid.append(field(title,c));return c;}
      function dropdown(key,title,items,change,required=true) {const c=select(items,v[key]||"");c.id="inst214-"+key;c.required=required;c.onchange=()=>{v[key]=c.value;if(change)change();};grid.append(field(title,c));return c;}
      text("title","نام قرارداد");
      dropdown("affectAccount","در ریزحساب طرف حساب محاسبه شود؟",[{id:"yes",name:"محاسبه شود"},{id:"no",name:"محاسبه نشود"}]);
      dropdown("direction","نوع اقساط",[{id:"payable",name:"بدهکار شدم"},{id:"receivable",name:"طلبکار شدم"}]);
      const parties=el("div",null,"inst214-party");partyFields(parties,v,()=>{},"inst214");grid.append(parties);
      dropdown("commitmentKind","نوع تعهد",[{id:"currency",name:"تعهد ارزی"},{id:"commodity",name:"تعهد کالایی"}],()=>{v.good="";v.goodsGroup="";rerender();});
      let goods=[...active("goods"), ...(ledger().s.catalogGoods || []).filter(g=>g.active!==false && !ledger().s.goods.some(old=>old.id===g.id)).map(g=>({...g,mode:g.catalogMode === "count" ? "count" : "weight",unitId:active("units").find(u=>u.dimension===(g.catalogMode === "count" ? "count" : "weight") && (g.catalogMode === "count" ? u.decimals===0 : dec(u.factor || "0")===dec("1")))?.id,standardWeight:g.catalogMode === "weightCount" ? g.catalogPieceWeight : "",standardWeightUnitId:active("units").find(u=>u.dimension==="weight" && dec(u.factor || "0")===dec("1"))?.id}))];
      if(v.commitmentKind==="currency") dropdown("good","نام ارز",goods.filter(g=>g.mode==="currency"),()=>rerender());
      if(v.commitmentKind==="commodity") {
        const groupOptions=[...active("groups")];if(goods.some(g=>g.mode!=="currency" && !g.groupId))groupOptions.push({id:"__ungrouped",name:"کالاهای قبلی بدون گروه"});
        dropdown("goodsGroup","گروه کالاها",groupOptions,()=>{v.good="";rerender();});
        if(v.goodsGroup)dropdown("good","نام کالا",goods.filter(g=>g.mode!=="currency" && (v.goodsGroup==="__ungrouped"?!g.groupId:g.groupId===v.goodsGroup || g.subgroupId===v.goodsGroup)),()=>rerender());
      }
      const chosen=goods.find(g=>g.id===v.good);
      if(chosen) {
        text("amount",(chosen.mode==="currency"?"مقدار ارز هر قسط":chosen.mode==="weight"?"وزن کالا در هر قسط":"تعداد کالا در هر قسط")+" ("+name("units",chosen.unitId)+")");
        if(chosen.mode==="weight" && chosen.standardWeight)grid.append(el("p","مبنای تعهد وزن است؛ وزن هر قطعهٔ معرفی‌شده: "+f(chosen.standardWeight)+" "+name("units",chosen.standardWeightUnitId),"n-muted"));
      }
      const count=text("count","تعداد اقساط");count.inputMode="numeric";
      text("firstDue","اولین سررسید شمسی — سال/ماه/روز");
      dropdown("tag","برچسب",active("tags"),null,false);
      grid.append(el("p","سررسیدهای بعدی ماهانه از اولین سررسید ساخته می‌شوند؛ در ماه کوتاه‌تر، آخرین روز معتبر استفاده می‌شود.","n-muted"));
      const submit=el("button","ثبت قرارداد","primary");submit.type="submit";submit.disabled=env.needsReview();
      form.append(grid,error,bar(submit));
      form.onsubmit=e=>{e.preventDefault();try{
        if(env.needsReview())throw Error("ابتدا مانده‌های انتقالی را بررسی کنید");
        if(!["yes","no"].includes(v.affectAccount))throw Error("اثر در ریزحساب را مشخص کنید");
        const count=Number(norm(v.count));if(!Number.isInteger(count)||count<1||count>600)throw Error("تعداد اقساط بین ۱ تا ۶۰۰ باشد");
        const dues=dueDates(v.firstDue,count),first=jalali(v.firstDue);
        const c=ledger().createInstallments214({...v,affectAccount:v.affectAccount==="yes",dues,date:legacyDate(today()),tags:v.tag?[v.tag]:[]});
        contract=freshContract();rerender();env.message("قرارداد «"+c.title+"» ثبت شد");
      }catch(e){showError(error,e);}};
      enterFlow(form);host.append(card(form));
      const contracts=[...(ledger().s.installmentContracts214 || [])].reverse();
      if(contracts.length)host.append(card(el("h3","قراردادهای ثبت‌شده"),table(["نام قرارداد","نوع اقساط","طرف حساب","هر قسط","تعداد","جمع تعهد","ریزحساب"],contracts.map(c=>({item:c,cells:[c.title,c.direction==="payable"?"بدهکار شدم":"طلبکار شدم",c.partyName,f(c.amount)+" "+c.unit.name,f(c.count),f(c.total)+" "+c.unit.name,c.affectAccount?"محاسبه می‌شود":"محاسبه نمی‌شود"]})),c=>bar(btn("سررسیدها",()=>showSchedule(c))))));
      const old=env.legacyInstallments?.() || [];
      if(old.length)host.append(card(el("h3","سوابق قراردادهای قبلی"),table(["نام قرارداد","طرف حساب","سررسید","مقدار","مانده"],old.map(x=>({cells:[x.title,x.party,x.date,f(x.total)+" "+x.unit,f(x.remaining)+" "+x.unit]}))),btn("مشاهده و تسویهٔ قراردادهای قبلی",()=>env.openLegacyInstallments())));
    }
    function showSchedule(c) {
      const d=el("dialog");d.append(el("h3",c.title),table(["قسط","سررسید شمسی","مقدار","مانده"],c.dues.map((due,i)=>({cells:[f(i+1),f(due.jalali),f(due.amount)+" "+c.unit.name,f(ledger().installmentRemaining216(c.id,due.id))+" "+c.unit.name]}))),btn("بستن",()=>d.close()));host.append(d);d.onclose=()=>d.remove();d.showModal();
    }
    return {invoice:invoiceScreen,installments:installmentsScreen,enter(route){if(route==="operations"){invoice=null;invoiceRow=freshInvoiceRow216();invoiceFocus="invoice214-number";}},today};
  }
};
