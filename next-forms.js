/* Update 214: step-by-step document headers and installment contracts. */
globalThis.SadraForms214 = {
  create(env) {
    "use strict";
    const {el,btn,field,select,input,bar,card,table,f,name,openEditor,rerender,host,legacyDate,amount219} = env;
    const {clone,uid,norm,dec,mul,sub,add,str,div} = SadraCore;
    const ledger = () => env.ledger();
    const active = kind => (ledger().s[kind] || []).filter(x=>x.active!==false);
    let invoice = null, contract = freshContract(), invoiceRow = freshInvoiceRow216(), invoiceFocus = "invoice214-number", unlocked218=false,rowOpen218=true,selected218=0;
    function freshContract() { return {token:uid(),title:"",affectAccount:"",direction:"",partyKind:"",partyId:"",bankId:"",groupId:"",commitmentKind:"",good:"",goodsGroup:"",amount:"",count:"",firstDue:today(),tag:""}; }
    function integer217(value){return Number(norm(value).replace(/[,٬]/g,""));}
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
      const assetNature=config.goodId?"commodity":config.assetId?ledger().s.assets.find(a=>a.id===config.assetId)?.nature:null;
      if(assetNature==="commodity")delete options.banks;
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
      const excluded=(kind,id)=>config.exclude && id===config.exclude.partyId && (kind===config.exclude.partyKind || [kind,config.exclude.partyKind].every(k=>["banks","funds"].includes(k)));
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
        add("partyKind","گروه طرف حساب",Object.entries(options).map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name,"fa")),()=>{state.partyId="";state.partyText="";state.bankId="";state.groupId="";state.contractId="";state.dueId="";});
        const kind=state.partyKind;if(!kind)return;
        let list=[];
        if(kind==="installments") {
          const candidates=(ledger().s.installmentContracts214 || []).filter(c=>(config.goodId?c.good===config.goodId:ledger().s.goods.find(g=>g.id===c.good)?.assetId===config.assetId) && c.direction===(config.operation==="receive"?"receivable":"payable") && c.dues.some(d=>dec(ledger().installmentRemaining216(c.id,d.id))>0n));
          add("contractId","نام قرارداد",candidates.map(c=>({id:c.id,name:c.title+" — "+c.partyName})),()=>{state.dueId="";state.partyId=state.contractId;});
          if(state.contractId) {
            const c=candidates.find(c=>c.id===state.contractId);
            const dues=c?c.dues.map((d,i)=>({id:d.id,name:"قسط "+f(i+1)+" — "+f(d.jalali)+" — مانده "+f(ledger().installmentRemaining216(c.id,d.id))})).filter(d=>dec(ledger().installmentRemaining216(c.id,d.id))>0n):[];
            add("dueId","قسط قرارداد",dues);state.partyId=state.contractId;
          }
          root.append(el("small","در اقساط، بانک یا صندوق سربرگ محل واقعی دریافت/پرداخت دارایی است. قراردادهای قبلی از مسیر تسویهٔ قبلی در دسترس‌اند.","n-muted"));return;
        }
        if(kind==="banks") {
          const eligible=active("funds").filter(x=>x.legacyKind==="banks" && (!config.assetId || x.assetId===config.assetId));
          add("bankId","نام بانک",active("bankInstitutions").filter(b=>!config.assetId || eligible.some(x=>x.bankId===b.id)),parentChanged);
          if(!state.bankId)return;
          list=active("funds").filter(x=>x.legacyKind==="banks" && x.bankId===state.bankId && (!config.assetId || x.assetId===config.assetId)).map(x=>({...x,name:x.accountNumber || x.name}));
        } else if(kind==="funds") list=active("funds").filter(x=>x.legacyKind!=="banks" && (!assetNature || x.nature===assetNature) && (!config.assetId || !x.assetId || x.assetId===config.assetId));
        else if(kind==="expenses" || kind==="people") {
          add("groupId",kind==="expenses"?"محل هزینه":"گروه افراد",active(kind==="expenses"?"expenseGroups":"peopleGroups"),parentChanged);
          if(!state.groupId)return;
          list=active(kind).filter(x=>x.groupId===state.groupId);
        } else list=active("incomes");
        list=list.filter(x=>!excluded(kind,x.id));
        if(state.partyId && excluded(kind,state.partyId)){state.partyId="";state.partyText="";}
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
    function persistInvoice(error,commit=false) {
      if(!invoice)return false;
      if(invoice.archive225 || invoice.status==="deleted")return true;
      try {
        if(env.needsReview())throw Error("ابتدا مانده‌های انتقالی را بررسی کنید");
        if(!invoice.id){if(error)error.textContent="";return true;}
        if(invoice.rows?.some(r=>r.documentId)) {
          if(commit)invoice=ledger().updateInvoiceHeader218(invoice,legacyDate(jalali(invoice.jalali)),unlocked218);
        } else ledger().saveInvoiceHeader214(invoice);
        if(error)error.textContent="";return true;
      }catch(e){if(error)showError(error,e);else env.message(e.message,true);return false;}
    }
    function reserveInvoice() {
      if(invoice?.id)ledger().discardEmptyInvoice219(invoice.id);
      invoiceRow=freshInvoiceRow216();invoiceFocus="invoice214-number";unlocked218=true;rowOpen218=true;selected218=0;
      const floor=Math.max(Number(env.raw().counter)||1,...(env.raw().docs || []).map(d=>Number(d.no)+1));
      if(env.needsReview()){invoice={id:null,number:floor,jalali:today(),partyKind:"",partyId:"",bankId:"",groupId:""};return;}
      invoice={id:null,number:ledger().peekInvoiceNumber219(floor),jalali:today(),partyKind:"",partyId:"",bankId:"",groupId:"",status:"draft",created:new Date().toISOString()};
    }
    function invoiceScreen() {
      if(!invoice)reserveInvoice();
      const frame=el("section",null,"invoice214-frame"), actions=bar(), form=el("form",null,"invoice214-form"), grid=el("div",null,"invoice214-header"), error=el("div");
      const existing=[...(ledger().s.invoiceHeaders214 || []).filter(h=>h.status!=="deleted" && (h.rows?.length || h.id===invoice.id)),...(env.legacyInvoices225?.() || []).filter(d=>!(ledger().s.invoiceHeaders214 || []).some(h=>h.number===Number(d.no))).map(d=>({id:"archive-"+d.no,number:Number(d.no),jalali:d.date || "",archive225:true,status:"posted"})),...(!invoice.id?[invoice]:[])].sort((a,b)=>a.number-b.number),position=existing.findIndex(d=>d.id===invoice.id);
      const previous=btn("فاکتور قبلی",()=>{if(!persistInvoice(error,true))return;if(position>0){ledger().discardEmptyInvoice219(invoice.id);invoice=clone(existing[position-1]);invoiceRow=freshInvoiceRow216();unlocked218=false;rowOpen218=false;selected218=0;rerender();}});
      previous.disabled=position<=0;
      const next=btn("فاکتور بعدی",()=>{if(!persistInvoice(error,true))return;if(position>=0 && position<existing.length-1){ledger().discardEmptyInvoice219(invoice.id);invoice=clone(existing[position+1]);invoiceRow=freshInvoiceRow216();unlocked218=false;rowOpen218=false;selected218=0;}else reserveInvoice();rerender();});
      actions.append(previous,next,btn("فاکتور جدید",()=>shortcut("F1")),btn("F2 سطر جدید",()=>shortcut("F2")),btn("F3 اصلاح فاکتور",()=>shortcut("F3")),btn("F4 حذف فاکتور",()=>shortcut("F4"),"danger"),btn("F5 چاپ فاکتور",()=>shortcut("F5")));actions.classList.add("invoice214-actions");
      const number=input(invoice.number);number.id="invoice214-number";number.readOnly=false;number.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.stopImmediatePropagation();try{const requested=integer217(number.value);if(requested===invoice.number && unlocked218 && !invoice.archive225 && invoice.status!=="deleted"){error.textContent="";error.className="";document.getElementById("invoice214-year")?.focus();return;}if(invoice.id && unlocked218 && !persistInvoice(error,true))return;openNumber225(requested);}catch(err){showError(error,err);}}});number.inputMode="numeric";number.setAttribute("aria-label","شماره فاکتور");grid.append(field("شماره فاکتور",number));
      if(invoice.archive225){frame.append(actions,grid,error);host.append(frame,card(el("h3","فاکتور آرشیوی "+f(invoice.number)),table(["طرف حساب","کالا / ارز","مقدار","واحد","توضیحات"],(env.legacyRows225?.(invoice.number) || []).map(cells=>({cells}))),btn("باز کردن اصل فاکتور آرشیوی",()=>env.openLegacyInvoice225(invoice.number))));number.focus();return;}
      const date=el("div",null,"invoice214-date"),parts=invoice.jalali.split("/"), dateControls=[];
      ["سال","ماه","روز"].forEach((title,i)=>{const c=input(parts[i] || "");c.id="invoice214-"+["year","month","day"][i];c.inputMode="numeric";c.maxLength=i===0?4:2;c.setAttribute("aria-label",title);c.oninput=()=>{invoice.jalali=dateControls.map(n=>n.value).join("/");persistInvoice(error);};dateControls.push(c);date.append(c);});
      grid.append(field("تاریخ شمسی",date));
      let lineSection;
      const parties=el("div");partyFields(parties,invoice,()=>{persistInvoice(error);if(lineSection){lineSection.hidden=!invoice.partyId;lineSection.replaceChildren();invoiceLines216(lineSection,error);}document.getElementById("invoice218-balances")?.remove();if(invoice.partyId)invoiceBalances218();},"invoice214",{onComplete:()=>{try{jalali(invoice.jalali);ledger().validateParty214(invoice);if(!persistInvoice(error,true))return;lineSection.hidden=false;(lineSection.querySelector("#row216-operation") || document.getElementById("invoice218-row-"+selected218))?.focus();}catch(e){showError(error,e);}}});grid.append(parties);
      if(!unlocked218)parties.querySelectorAll("input,select,button").forEach(control=>control.disabled=true);
      if(!unlocked218)dateControls.forEach(control=>control.disabled=true);
      form.append(grid,error);form.onsubmit=e=>e.preventDefault();
      enterFlow(form,control=>{if(dateControls.includes(control)){const index=dateControls.indexOf(control),value=Number(norm(control.value));if(!Number.isInteger(value)||value<1||(index===0&&(value<1000||value>=1700))||(index===1&&value>12)||(index===2&&value>31))throw Error(""+["سال","ماه","روز"][index]+" معتبر وارد کنید");if(index===2){invoice.jalali=jalali(invoice.jalali);persistInvoice(error,true);}}});
      if(env.needsReview()){error.textContent="برای ذخیرهٔ سربرگ ابتدا مانده‌های قبلی را بررسی کنید.";error.className="n-error";frame.append(btn("بررسی مانده‌های قبلی",()=>env.openReview()));}
      frame.append(actions,form);host.append(frame);
      lineSection=el("section",null,"invoice216-lines");lineSection.id="invoice217-lines";lineSection.hidden=!invoice.partyId;host.append(lineSection);invoiceLines216(lineSection,error);if(invoice.partyId)invoiceBalances218();
      document.getElementById(invoiceFocus)?.focus();invoiceFocus="invoice214-number";
    }
    function freshInvoiceRow216() {return {good:"",goodsGroup:"",unitId:"",purity:"",mark:"",assay:"",lot:"",rate:"",moneyAssetId:"",count:"",feeValue:"",operation:"",receiptKind:"",assetId:"",partyKind:"",partyId:"",bankId:"",groupId:"",contractId:"",dueId:"",amount:"",tag:"",notes:""};}
    function invoiceLines216(section,headerError) {
      const posted=invoice.status==="posted", container=el("div",null,"invoice216-editor");
      if(unlocked218 && rowOpen218)section.append(container);
      function refreshInvoice() {invoice=clone(ledger().find("invoiceHeaders214",invoice.id));invoiceFocus="row216-operation";rerender();}
      function drawEditor() {
        container.replaceChildren();const r=invoiceRow,form=el("form"),grid=el("div",null,"n-grid"),error=el("div");
        function dropdown(key,title,items,after,required=true) {
          const c=select(items,r[key] || "",required?null:"بدون برچسب");c.id="row216-"+key;c.required=required;grid.append(field(title,c));
          const change=()=>{const previous=r[key];r[key]=c.value;if(after && previous!==c.value){after();drawEditor();document.getElementById(c.id)?.focus();}};
          c.onchange=change;c.addEventListener("keydown",e=>{if(e.isComposing)return;if(e.key==="ArrowDown" || e.key==="ArrowUp"){e.preventDefault();e.stopPropagation();c.selectedIndex=Math.max(0,Math.min(c.options.length-1,c.selectedIndex+(e.key==="ArrowDown"?1:-1)));change();}else if(e.key==="Enter"){e.preventDefault();e.stopPropagation();if(c.required && !c.value){showError(error,new Error(title+" را انتخاب کنید"));return;}focusNext(form,c);}});
          return c;
        }
        const headerPhysical=["banks","funds"].includes(invoice.partyKind),headerFund=headerPhysical?ledger().s.funds.find(f=>f.id===invoice.partyId):null;
        const allowedOperations=[{id:"receive",name:"دریافت"},{id:"pay",name:"پرداخت"},...(invoice.partyKind==="people"?[{id:"buy",name:"خرید"},{id:"sell",name:"فروش"}]:[])];
        const allowedKinds=headerPhysical?(headerFund?.nature==="commodity"?[{id:"commodity",name:"کالایی"}]:[{id:"currency",name:"ارزی"}]):[{id:"currency",name:"ارزی"},{id:"commodity",name:"کالایی"}];
        if(r.operation && !allowedOperations.some(x=>x.id===r.operation))r.operation="";
        if(r.receiptKind && !allowedKinds.some(x=>x.id===r.receiptKind)){r.receiptKind="";r.good="";r.assetId="";r.partyKind="";r.partyId="";}
        if(headerPhysical && headerFund?.nature!=="commodity" && ["receive","pay"].includes(r.operation)){
          r.receiptKind="currency";
          if(headerFund?.assetId)r.assetId=headerFund.assetId;
        }
        dropdown("operation","نوع عملیات",allowedOperations,()=>{r.receiptKind="";r.assetId="";r.partyKind="";r.partyId="";r.bankId="";r.groupId="";r.contractId="";r.dueId="";});
        if(["receive","pay","buy","sell"].includes(r.operation)) {
          dropdown("receiptKind",["buy","sell"].includes(r.operation)?"نوع معامله":r.operation==="receive"?"نوع دریافت":"نوع پرداخت",allowedKinds,()=>{r.assetId="";r.partyKind="";r.partyId="";});
          if(r.receiptKind==="currency")dropdown("assetId","نوع ارز",active("assets").filter(a=>a.nature==="currency" && (!headerPhysical || !headerFund?.assetId || a.id===headerFund.assetId)),()=>{r.partyKind="";r.partyId="";r.bankId="";r.groupId="";r.contractId="";r.dueId="";});
          let chosen=null;
          function numberField(key,title,readOnly=false) {
            const c=input(r[key] || "");c.id="row216-"+key;c.required=!readOnly;c.readOnly=readOnly;c.inputMode="decimal";c.dataset.numeric217="true";if(key==="amount")c.dataset.unit219=r.unitId || r.assetId;else if(key==="count")c.dataset.quantityKind219="count";c.oninput=()=>{r[key]=c.value;if(key==="count")updateWeight();};
            if(key==="amount")c.addEventListener("keydown",e=>{if(!["ArrowUp","ArrowDown"].includes(e.key) || r.operation!=="pay" || !chosen?.variablePurity221)return;e.preventDefault();e.stopPropagation();chooseLot221(chosen);});
            grid.append(field(title,c));return c;
          }
          let weightControl;
          function updateWeight() {
            if(!weightControl || !chosen)return;
            try{r.amount=ledger().convert(mul(r.count || "0",chosen.catalogPieceWeight || chosen.standardWeight),chosen.catalogPieceUnitId || chosen.standardWeightUnitId,r.unitId || chosen.catalogUnitId || chosen.unitId);weightControl.value=amount219(r.amount,r.unitId);}catch(e){r.amount="";weightControl.value="";}
          }
          if(r.receiptKind==="commodity") {
            const goods=commodityCatalog217(),groups=[...active("groups")];if(goods.some(g=>!g.groupId))groups.push({id:"__ungrouped",name:"کالاهای قبلی بدون گروه"});
            dropdown("goodsGroup","گروه کالا",groups,()=>{r.good="";r.unitId="";r.amount="";r.count="";r.partyKind="";r.partyId="";});
            if(r.goodsGroup)dropdown("good","نام کالا",goods.filter(g=>r.goodsGroup==="__ungrouped"?!g.groupId:[g.groupId,g.subgroupId].includes(r.goodsGroup)),()=>{
              r.pricing225=null;const g=goods.find(g=>g.id===r.good);r.unitId=g?.catalogUnitId || g?.unitId || "";r.amount="";r.count="";r.feeValue="";r.partyKind="";r.partyId="";r.contractId="";r.dueId="";
            });
            chosen=goods.find(g=>g.id===r.good);
            if(chosen)chosen={...chosen,...(ledger().feePolicy227(r) || {})};
            if(chosen) {
              const mode=chosen.catalogMode || (chosen.standardWeight?"weightCount":chosen.mode),dimension=mode==="count"?"count":"weight";
              r.unitId ||= chosen.catalogUnitId || chosen.unitId || active("units").find(u=>u.dimension===dimension)?.id || "";
              const fixedId=chosen.catalogUnitId || chosen.unitId;
              if(r.unitId && r.unitId!==fixedId && r.amount)r.amount=ledger().convert(r.amount,r.unitId,fixedId);
              r.unitId=fixedId;
              const fixedUnit=input(name("units",r.unitId));fixedUnit.id="row216-unitId";fixedUnit.readOnly=true;fixedUnit.tabIndex=-1;fixedUnit.setAttribute("aria-readonly","true");grid.append(field("واحد مقدار",fixedUnit));
              grid.append(el("p","مبنای نرخ: هر "+name("units",chosen.catalogRateUnitId || chosen.rateUnitId || r.unitId)+(chosen.catalogPurity || chosen.purity?" — عیار "+f(chosen.catalogPurity || chosen.purity):""),"n-muted"));
              if(mode==="weightCount") {
                grid.append(el("p","وزن ثابت هر قطعه: "+f(chosen.catalogPieceWeight || chosen.standardWeight)+" "+name("units",chosen.catalogPieceUnitId || chosen.standardWeightUnitId),"n-muted"));
                numberField("count","تعداد قطعات");weightControl=numberField("amount","وزن محاسبه‌شده",true);updateWeight();
              } else numberField("amount",mode==="count"?"تعداد کالا":["buy","sell"].includes(r.operation)?"وزن معامله":r.operation==="receive"?"وزن دریافتی":"وزن پرداختی");
              if(chosen.variablePurity221) {
                const purity=numberField("purity","عیار واقعی قطعه (مثلاً ۷۴۰)");purity.readOnly=r.operation==="pay";

                for(const [key,title] of [["mark","انگ قطعه (برای بدون انگ خالی بگذارید)"],["assay","نام مرکز ری‌گیری"]]){const c=input(r[key] || "");c.id="row221-"+key;c.readOnly=r.operation==="pay";c.oninput=()=>r[key]=c.value;grid.append(field(title,c));}
              }
              if(chosen.catalogHasFee==="yes") {
                const percent=chosen.catalogFeeBasis==="weightPercent";
                if(mode==="weight" && !percent)numberField("count","تعداد برای محاسبهٔ کارمزد");
                if(chosen.catalogFeeMode==="variable")numberField("feeValue",percent?"کارمزد متغیر — درصد از وزن":"کارمزد متغیر — تومان به‌ازای هر عدد");
                else grid.append(el("p","کارمزد ثابت: "+f(chosen.catalogFeeValue)+(percent?" درصد از وزن":" تومان به‌ازای هر عدد"),"n-muted"));
              }
            }
          }
          if((r.receiptKind==="currency" && r.assetId) || (r.receiptKind==="commodity" && chosen)) {
            if(["buy","sell"].includes(r.operation)) {
              const toman=active("assets").find(a=>a.nature==="currency" && ledger().s.units.find(u=>u.id===a.unitId)?.currencyCode==="IRT");r.moneyAssetId ||= toman?.id || "";
              const money=input(name("assets",r.moneyAssetId));money.id="row216-moneyAssetId";money.readOnly=true;money.tabIndex=-1;grid.append(field("واحد مبلغ معامله",money));numberField("rate","نرخ تومانی هر "+(r.pricing225?(r.pricing225.basis==="gold750"?"مثقال طلای معادل ۷۵۰":r.pricing225.basis==="silver"?"مثقال نقره":r.pricing225.unit.name):chosen?.catalogPricingBasis225==="gold750"?"مثقال طلای معادل ۷۵۰":chosen?.catalogPricingBasis225==="silver"?"مثقال نقره":name("units",chosen?.catalogRateUnitId || chosen?.rateUnitId || ledger().s.assets.find(a=>a.id===r.assetId)?.unitId || r.unitId)));
            } else {
            const party=el("div",null,"invoice216-party");partyFields(party,r,()=>{},"row216",{allowInstallments:true,assetId:r.assetId,goodId:chosen?.id,operation:r.operation,exclude:invoice});grid.append(party);
            }
            if(r.receiptKind==="currency")numberField("amount",["buy","sell"].includes(r.operation)?"مقدار ارز معامله":r.operation==="receive"?"مقدار ارز دریافتی":"مقدار ارز پرداختی");
            dropdown("tag","برچسب سطر",active("tags"),null,false);
            const notes=el("textarea");notes.id="row216-notes";notes.value=r.notes;notes.oninput=()=>r.notes=notes.value;notes.addEventListener("keydown",e=>{if(e.key==="Enter" && !e.shiftKey && !e.isComposing){e.preventDefault();e.stopPropagation();commitRow();}});grid.append(field("توضیحات سطر",notes));
            grid.append(el("p",["buy","sell"].includes(r.operation)?"خرید و فروش فقط تعهد کالا و مبلغ ایجاد می‌کند؛ موجودی با دریافت و پرداخت واقعی تغییر می‌کند.":r.partyKind==="installments"?"مقدار در بانک/صندوق واقعی سربرگ ثبت و از ماندهٔ قسط کم می‌شود.":r.operation==="receive"?"دریافت از طرف حساب سربرگ، در طرف انتخاب‌شدهٔ سطر ثبت می‌شود.":"پرداخت از طرف انتخاب‌شدهٔ سطر، به طرف حساب سربرگ ثبت می‌شود.","n-muted"));
          }
        }
        const supported=["receive","pay","buy","sell"].includes(r.operation) && ["currency","commodity"].includes(r.receiptKind);
        if(r.operation && (!supported && (r.receiptKind || ["buy","sell"].includes(r.operation))))grid.append(el("p","جزئیات خرید و فروش هنوز ارائه نشده است؛ دریافت و پرداخت ارزی و کالایی قابل ثبت‌اند.","n-notice"));
        let submitting=false;
        function commitRow() {
          if(submitting)return;
          try {
            if(!unlocked218)throw Error("ابتدا F3 را بزنید");
            if(!supported)throw Error("نوع دریافت یا پرداخت را مشخص کنید");
            if(!form.reportValidity())return;
            if(!persistInvoice(headerError,true))return;
            submitting=true;
            const wasEdit=!!r.id;
            invoice=ledger().postInvoiceRow219(invoice,{...r,tags:r.tag?[r.tag]:[]},legacyDate(jalali(invoice.jalali)),true);
            selected218=Math.max(0,invoice.rows.findIndex(row=>row.id===(r.id || invoice.rows.at(-1).id)));
            invoiceRow=freshInvoiceRow216();rowOpen218=!wasEdit;invoiceFocus=wasEdit?"invoice218-row-"+selected218:"row216-operation";rerender();
            env.message("سطر فاکتور قطعی ثبت شد");
          }catch(e){showError(error,e);}finally{submitting=false;}
        }
        form.append(grid,error,el("p","Enter در توضیحات، سطر را قطعی ثبت می‌کند؛ Shift+Enter برای خط جدید و ESC برای منوی اصلی؛ F1 فاکتور جدید؛ F12 ریزگزارش طرف حساب.","n-muted"));
        form.onsubmit=e=>{e.preventDefault();};
        enterFlow(form);container.append(el("h3",r.id?"ویرایش سطر فاکتور":"سطر فاکتور"),form);
      }
      if(unlocked218 && rowOpen218)drawEditor();
      const rows=invoice.rows || [];
      if(rows.length) {
        const wrap=card(el("h3","سطرهای فاکتور "+f(invoice.number))),listing=table(["سطر","عملیات","ارز / کالا","عیار واقعی","انگ","ری‌گیری","معادل ۷۵۰ (گرم)","از کجا","به کجا","مقدار","واحد","تعداد","نرخ واحد","کارمزد","برچسب","توضیحات"],rows.map((r,i)=>({item:r,cells:rowCells218(r,i)})),r=>{
          const edit=btn("ویرایش",()=>editRow218(r)),remove=btn("حذف",()=>{
            try{if(!unlocked218)throw Error("ابتدا F3 را بزنید");if(!confirm("این سطر و اثر مالی آن حذف شود؟"))return;
              invoice=ledger().deleteInvoiceRow218(invoice.id,r.id,true);selected218=Math.max(0,Math.min(selected218,invoice.rows.length-1));invoiceRow=freshInvoiceRow216();rowOpen218=false;invoiceFocus="invoice218-row-"+selected218;rerender();
            }catch(e){env.message(e.message,true);}
          },"danger");edit.disabled=remove.disabled=!unlocked218;
          return bar(edit,remove);
        });
        listing.classList.add("invoice218-rowlist");
        const rowNodes=[...listing.querySelectorAll("tbody tr")];
        rowNodes.forEach((node,i)=>{node.id="invoice218-row-"+i;node.tabIndex=0;node.setAttribute("aria-selected",String(i===selected218));node.onclick=()=>{selected218=i;rowNodes.forEach((n,j)=>n.setAttribute("aria-selected",String(i===j)));};});
        listing.addEventListener("keydown",e=>{if(!unlocked218 || !["ArrowDown","ArrowUp"].includes(e.key))return;e.preventDefault();e.stopPropagation();selected218=Math.max(0,Math.min(rows.length-1,selected218+(e.key==="ArrowDown"?1:-1)));rowNodes.forEach((n,j)=>n.setAttribute("aria-selected",String(j===selected218)));rowNodes[selected218]?.focus();});
        wrap.append(listing);section.append(wrap);
      }
      section.append(el("p",unlocked218?"هر سطر با Enter در آخرین فیلد فوراً قطعی ثبت می‌شود. F2 سطر تازه؛ F3 روی سطر انتخاب‌شده برای ویرایش.":"فاکتور قفل است. برای فعال‌کردن اصلاح و انتخاب سطرها F3 را بزنید.","n-notice"));
    }
    function editRow218(row) {
      if(!unlocked218){env.message("ابتدا F3 را برای اصلاح فاکتور بزنید",true);return;}
      selected218=invoice.rows.findIndex(r=>r.id===row.id);invoiceRow={...clone(row),tag:row.tags?.[0] || ""};
      if(row.operation==="receive" && !invoiceRow.lot){const entry=ledger().s.documents.find(d=>d.id===row.documentId)?.entries.find(e=>e.bucket==="stock" && e.lot && dec(e.quantity)>0n);if(entry)invoiceRow.lot=entry.lot;}
      rowOpen218=true;invoiceFocus="row216-operation";rerender();
    }
    function rowMetadata218(r) {
      const d=ledger().s.documents.find(d=>d.id===r.documentId),principal=d?.entries.find(e=>e.account===invoice.partyId && e.component!=="fee"),direction=principal?(dec(principal.quantity)<0n?1n:-1n):(r.operation==="receive"?1n:-1n);
      const snapshot=d?.snapshots?.[r.good || d.good];
      const fees=r.feeDetails || (d?.fees || []).map(fee=>({...fee,mode:"",basis:fee.basis || (fee.kind==="gold"?"weightPercent":"perPiece"),value:fee.value || fee.percent || fee.perUnit,unitName:d.snapshots?.[fee.good]?.unit?.name || "",signedQuantity:d.entries.find(e=>e.component==="fee" && e.good===fee.good)?.quantity || fee.quantity}));
      return {amount:principal?str(dec(r.amount)*direction):r.signedAmount ?? str(dec(r.amount)*direction),count:r.count?str(dec(r.count)*direction):"",purity:r.purity ?? snapshot?.purity ?? "",unit:r.unitId?name("units",r.unitId):snapshot?.unit?.name || name("assets",r.assetId),fees};
    }
    function signed218(value,unit=null) {return amount219(value,unit,true);}
    function feeText218(fees) {return fees.map(fee=>{
      const detail=el("div",null,"invoice222-fee");
      detail.append(el("span",fee.basis==="weightPercent"?"کارمزد: "+f(fee.value)+"٪ از وزن":"هر عدد: "+amount219(fee.value,"تومان")+" تومان"));
      const effect=el("bdi",signed218(fee.signedQuantity?str(-dec(fee.signedQuantity)):fee.quantity,fee.unitId || fee.unitName));effect.dir="ltr";effect.className=dec(fee.signedQuantity?str(-dec(fee.signedQuantity)):fee.quantity)<0n?"invoice222-negative":"invoice222-positive";
      const total=el("strong",null,"invoice222-fee-total");total.append(effect,el("span",fee.unitName));detail.append(total);return detail;
    }).reduce((box,item)=>{box.append(item);return box;},el("div"));}
    function partyTitle218(row) {if(row.partyKind!=="installments")return name(["banks","funds"].includes(row.partyKind)?"funds":row.partyKind,row.partyId);const c=ledger().s.installmentContracts214?.find(c=>c.id===row.contractId),i=c?.dues.findIndex(d=>d.id===row.dueId);return c?c.title+" — قسط "+f(i+1):"اقساط";}
    function rateText225(r) {const d=ledger().s.documents.find(d=>d.id===r.documentId),p=d?.pricing225 || r.pricing225;if(!d?.rate && !r.rate)return "—";const u=p?.unit || ledger().s.units.find(u=>u.id===d?.snapshots?.[d.good]?.rateUnitId);return amount219(d?.rate || r.rate,"تومان")+" تومان / "+(p?.basis==="gold750"?"مثقال طلا (معادل ۷۵۰)":p?.basis==="silver"?"مثقال نقره":u?.name || "واحد ثبت‌شده")+(d?.baseAmount?"\nمبلغ پایه: "+amount219(d.baseAmount,"تومان")+" تومان":"");}
    function rowCells218(r,i) {const meta=rowMetadata218(r);return [f(i+1),({receive:"دریافت",pay:"پرداخت",buy:"خرید",sell:"فروش"}[r.operation] || r.operation),r.assetName,f(meta.purity),r.mark || "—",r.assay || "—",r.receiptKind==="commodity" && ledger().s.goods.find(g=>g.id===r.good)?.mode==="weight" && meta.purity && norm(ledger().s.goods.find(g=>g.id===r.good)?.balanceMaterial220 || ledger().s.goods.find(g=>g.id===r.good)?.metal)==="طلا"?amount219(ledger().equivalent(ledger().convert(r.amount,r.unitId,ledger().s.units.find(u=>norm(u.name)==="گرم").id),meta.purity,"750"),"گرم"):"—",invoiceRoute222(r).from,invoiceRoute222(r).to,signed218(meta.amount,r.unitId || meta.unit),meta.unit,signed218(meta.count),rateText225(r),feeText218(meta.fees),(r.tags || []).map(id=>name("tags",id)).join("، "),r.notes];}
    function invoiceAccount219() {
      const current=new Map(),effect=new Map(),meta=new Map(),all=ledger().entries();
      const ids=new Set((invoice.rows || []).map(r=>r.documentId).filter(id=>id && !ledger().s.documents.some(d=>d.reversalOf===id)));
      const groups=ledger().accountBalances221(invoice.partyKind,invoice.partyId,all),changes=ledger().accountBalances221(invoice.partyKind,invoice.partyId,all.filter(e=>ids.has(e.document)));
      for(const g of groups){current.set(g.key,g.quantity);meta.set(g.key,g);}
      for(const g of changes){effect.set(g.key,g.quantity);meta.set(g.key,{...(meta.get(g.key) || g)});}
      const before=ledger().accountBalances221(invoice.partyKind,invoice.partyId,all.filter(e=>!ids.has(e.document)));
      return {current,effect,meta,groups,changes,before,keys:[...new Set([...current.keys(),...effect.keys()])]};
    }
    function invoiceRoute222(row) {
      const header=name(["banks","funds"].includes(invoice.partyKind)?"funds":invoice.partyKind,invoice.partyId),party=partyTitle218(row);
      if(row.operation==="buy")return {from:header,to:"ما (تعهد خرید)"};
      if(row.operation==="sell")return {from:"ما (تعهد فروش)",to:header};
      return row.operation==="receive"?{from:header,to:party}:{from:party,to:header};
    }
    function renderRoute222() {
      document.getElementById("invoice222-routes")?.remove();
      const routes=[...new Map((invoice.rows || []).map(row=>{const r=invoiceRoute222(row);return [r.from+"|"+r.to,r];})).values()];
      const box=el("div",null,"invoice222-routes");box.id="invoice222-routes";
      routes.forEach(r=>{const line=el("div");line.append(el("span","از کجا: "),el("strong",r.from),el("span"," ← "),el("span","به کجا: "),el("strong",r.to));box.append(line);});
      if(routes.length)document.querySelector(".invoice214-frame")?.append(box);
    }
    function invoiceBalances218() {
      const panel=el("section",null,"invoice219-balances");panel.id="invoice218-balances";
      document.getElementById("invoice222-routes")?.remove();
      const data=invoiceAccount219(),party=name(["banks","funds"].includes(invoice.partyKind)?"funds":invoice.partyKind,invoice.partyId);
      for(const [id,title,values]of [
        ["invoice218-before","ماندهٔ قبل از فاکتور",new Map(data.keys.map(k=>[k,sub(data.current.get(k) || "0",data.effect.get(k) || "0")]))],
        ["invoice219-effect","اثر این فاکتور",data.effect],
        ["invoice218-after","ماندهٔ بعد از فاکتور",data.current]]) {
        const block=card(el("h3",title)),cards=el("div",null,"invoice219-balance-cards");block.id=id;
        for(const key of data.keys) {
          const value=values.get(key) || "0";if(dec(value)===0n)continue;
          const meta=data.meta.get(key),item=el("div",null,"invoice219-balance-card"),number=el("bdi",signed218(value,meta.unit));number.dir="ltr";number.className="invoice219-amount";
          number.classList.add(dec(value)<0n?"invoice222-negative":"invoice222-positive");
          const quantity=el("div",null,"invoice222-quantity");quantity.append(number,el("span",meta.unit?.name || "","invoice222-unit"));
          item.append(el("strong",meta.name,"invoice222-asset"),quantity);
          if(meta.purity)item.append(el("small","عیار "+f(meta.purity)));
          if(meta.bucket==="commitment")item.append(el("small","تعهد؛ جدا از موجودی"));
          item.append(el("span",ledger().label221(value,meta.bucket),["expense","income"].includes(meta.bucket)?"invoice221-category":meta.bucket!=="stock" && dec(value)<0n?"invoice219-debit":"invoice219-credit"));
cards.append(item);
        }
        if(!cards.children.length)cards.append(el("p","بدون مانده"));block.append(cards);panel.append(block);
      }
      panel.append(el("small",["expenses","incomes"].includes(invoice.partyKind)?"جمع گردش هزینه و درآمد؛ خارج از مطالبات و بدهی‌ها.":"مثبت: طلبکار؛ منفی: بدهکار. ماندهٔ قبل، ماندهٔ حساب بدون اثر این فاکتور است.","n-muted"));host.append(panel);
    }
    function invoiceTotals219(listing,rows) {
      const ids=new Set(rows.map(r=>r.documentId).filter(id=>id && !ledger().s.documents.some(d=>d.reversalOf===id))),all=ledger().entries();
      const changes=ledger().accountBalances221(invoice.partyKind,invoice.partyId,all.filter(e=>ids.has(e.document))),current=ledger().accountBalances221(invoice.partyKind,invoice.partyId,all);
      const foot=el("tfoot");foot.id="invoice219-totals";
      function append(label,g,quantity,count,fee="") {
        const tr=el("tr");tr.className="invoice219-total";
        for(const value of [label,"",g.name || "",f(g.purity),"",quantity,g.unit?.name || "",count,fee,"",""])tr.append(el("td",value));foot.append(tr);
      }
      for(const group of changes) {
        append("اثر فاکتور",group,signed218(group.quantity,group.unit),group.kind==="count"?signed218(group.count):"—");
        const balance=current.find(g=>g.key===group.key);
        if(balance)append("ماندهٔ نهایی — "+ledger().label220(balance.quantity,balance.bucket),balance,signed218(balance.quantity,balance.unit),balance.kind==="count"?signed218(balance.count):"—");
      }
      const fees=new Map();
      for(const r of rows)for(const fee of rowMetadata218(r).fees){const key=[fee.good,fee.unitId || fee.unitName,fee.basis].join("|"),value=fees.get(key) || {...fee,total:"0"};value.total=add(value.total,fee.signedQuantity || fee.quantity);fees.set(key,value);}
      for(const fee of fees.values())append("جمع کارمزد",{name:name("goods",fee.good),unit:ledger().s.units.find(u=>u.id===fee.unitId) || {name:fee.unitName}},"","",signed218(fee.total,fee.unitId || fee.unitName)+" "+fee.unitName);
      listing.querySelector("table")?.append(foot);
    }
    function chooseLot221(g) {
      const choices=ledger().s.funds.filter(f=>f.active!==false && f.nature==="commodity").flatMap(f=>ledger().lots(f.id,g.id).map(l=>({...l,fund:f.id,fundName:f.name}))),d=el("dialog");
      d.append(el("h3","انتخاب قطعهٔ موجود"));const picker=select(choices.map((l,i)=>({id:String(i),name:l.fundName+" — انگ "+(l.mark || "بدون انگ")+" — ری‌گیری "+(l.assay || "ثبت نشده")+" — عیار "+f(l.purity)+" — مانده "+amount219(l.quantity,g.unitId || g.catalogUnitId)})),choices.length?"0":"",null);d.append(picker);
      const choose=()=>{const lot=choices[Number(picker.value)];if(!lot)return;invoiceRow.lot=lot.id;invoiceRow.purity=lot.purity;invoiceRow.mark=lot.mark || "";invoiceRow.assay=lot.assay || "";invoiceRow.partyKind="funds";invoiceRow.partyId=lot.fund;invoiceRow.amount="";d.close();invoiceFocus="row216-amount";rerender();};
      d.append(btn("انتخاب قطعه",choose),btn("انصراف",()=>d.close()));picker.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();choose();}};host.append(d);d.onclose=()=>d.remove();d.showModal();picker.focus();
    }
    function commodityCatalog217() {
      const drafts=ledger().s.catalogGoods || [];
      return [...active("goods").filter(g=>g.mode!=="currency").map(g=>({...g,catalogHasFee:g.feeMode && g.feeMode!=="none"?"yes":"no",catalogFeeMode:g.feeMode==="variable"?"variable":"fixed",catalogFeeBasis:g.feeMode==="gold"?"weightPercent":"perPiece",catalogFeeValue:g.feeMode==="gold"?g.feePercent:(ledger().s.version221?g.feeValue || "0":mul(g.feeValue || "0","10")),...(drafts.find(d=>d.id===g.id) || {})})),...drafts.filter(d=>d.active!==false && !ledger().s.goods.some(g=>g.id===d.id))].filter(g=>g.active!==false).map(g=>({...g,catalogUnitId:ledger().catalogUnit219(g)?.id || ""}));
    }
    function shortcut(key) {
      try {
        if(!invoice)return;
        if(key==="F1"){if(!persistInvoice(null,true))return;reserveInvoice();rerender();}
        if(["F2","F3","F4"].includes(key) && (invoice.status==="deleted" || invoice.archive225))throw Error("این فاکتور فقط قابل مشاهده است");
        if(key==="F2"){if(!unlocked218)throw Error("ابتدا F3 را بزنید");invoiceRow=freshInvoiceRow216();rowOpen218=true;invoiceFocus="row216-operation";rerender();}
        if(key==="F3") {
          if(!unlocked218){unlocked218=true;rowOpen218=false;invoiceFocus="invoice214-year";rerender();env.message("اصلاح سربرگ فعال شد؛ پس از تأیید، سطر را انتخاب و F3 بزنید");}
          else if(invoice.rows?.[selected218])editRow218(invoice.rows[selected218]);
        }
        if(key==="F4"){if(!unlocked218)throw Error("ابتدا F3 را بزنید");if(!confirm("فاکتور شمارهٔ "+f(invoice.number)+" و تمام اثر مالی آن حذف شود؟"))return;if(invoice.id)ledger().deleteInvoice217(invoice.id);reserveInvoice();rerender();}
        if(key==="F5"){if(invoice.archive225)env.openLegacyInvoice225(invoice.number);else printInvoice217();}
      }catch(e){env.message(e.message,true);}
    }
    function escape218() {
      const focused=document.activeElement,form=focused?.closest("form");
      if(form && host.contains(form)) {
        const controls=[...form.querySelectorAll("input,select,textarea")].filter(c=>!c.disabled && !c.readOnly && c.getClientRects().length),i=controls.indexOf(focused);
        if(i>0){controls[i-1].focus();return true;}
      }
      if(rowOpen218){rowOpen218=false;invoiceFocus=invoice.rows?.length?"invoice218-row-"+selected218:"invoice214-partyKind";rerender();return true;}
      if(unlocked218){unlocked218=false;invoiceFocus="invoice214-number";rerender();return true;}
      return false;
    }
    function printInvoice217() {
      document.getElementById("invoice217-print")?.remove();
      const sheet=el("section");sheet.id="invoice217-print";
      sheet.append(el("h2","حسابداری محمد صدرا — فاکتور "+f(invoice.number)),el("p","تاریخ: "+f(invoice.jalali)),el("p","طرف حساب: "+name(["banks","funds"].includes(invoice.partyKind)?"funds":invoice.partyKind,invoice.partyId)),el("p",invoice.status==="posted"?"ثبت‌شده":"پیش‌نویس"));
      sheet.append(table(["ردیف","عملیات","کالا / ارز","عیار واقعی","انگ","ری‌گیری","معادل ۷۵۰ (گرم)","از کجا","به کجا","مقدار","واحد","تعداد","نرخ واحد","کارمزد","برچسب","توضیحات"],(invoice.rows || []).map((r,i)=>({cells:rowCells218(r,i)}))));
      const balances=document.getElementById("invoice218-balances");if(balances){const copy=balances.cloneNode(true);copy.removeAttribute("id");sheet.append(copy);}
      const frame=document.createElement("iframe");frame.id="invoice221-printframe";frame.style.cssText="position:fixed;bottom:0;left:0;width:1px;height:1px;border:0";document.body.append(frame);
      const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>چاپ فاکتور</title></head><body></body></html>');doc.close();
      const style=doc.createElement("style");style.textContent="body{font:10px Tahoma;direction:rtl;margin:0;color:#000;background:white}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #555;padding:3px;text-align:right;overflow-wrap:normal}th{font-size:9px;white-space:nowrap}p{margin:4px 0}thead{display:table-header-group}tr{break-inside:avoid}h2{font-size:16px;margin:0 0 6px}.n-scroll{overflow:visible}@page{size:A4 landscape;margin:10mm}";style.textContent+=".invoice219-balances{font-size:10px}.invoice219-balances>.n-card{padding:6px;margin:5px 0;border:1px solid #198c3f;border-radius:5px;break-inside:avoid}.invoice219-balances>.n-card:first-child{border-color:#c62828;background:#fff7f7}.invoice219-balances>.n-card:nth-child(2){border-color:#111;background:#f6f6f6}.invoice219-balances>.n-card:nth-child(3){background:#f1faf4}.invoice219-balance-cards{display:flex;flex-wrap:wrap;gap:5px}.invoice219-balance-card{border:1px solid #bedccc;border-radius:5px;padding:6px;min-width:130px;flex:1;background:white}.invoice222-asset{display:block;font-size:12px}.invoice222-quantity{display:flex;gap:8px;align-items:baseline}.invoice219-amount{font-size:15px;font-weight:bold}.invoice222-positive,.invoice219-credit{color:#15803d}.invoice222-negative,.invoice219-debit{color:#c62828}.invoice219-balances h3{margin:2px 0 5px}.invoice219-balances small{display:block;font-size:8px}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}";doc.head.append(style);const copy=doc.importNode(sheet,true);copy.removeAttribute("id");doc.body.append(copy);
      window.SadraPrint221={number:invoice.number,html:doc.documentElement.outerHTML};
      const cleanup=()=>frame.remove();frame.contentWindow.addEventListener("afterprint",cleanup,{once:true});
      doc.fonts.ready.then(()=>requestAnimationFrame(()=>{if(frame.isConnected){frame.contentWindow.focus();frame.contentWindow.print();}}));
    }
    function installmentsScreen() {
      const form=el("form"),grid=el("div",null,"n-grid installment225-grid"),error=el("div"), v=contract;
      function text(key,title,type="text") {const c=input(key==="firstDue"?f(v[key]):v[key] || "",type);c.id="inst214-"+key;c.required=true;c.oninput=()=>{v[key]=c.value;};grid.append(field(title,c));return c;}
      function dropdown(key,title,items,change,required=true) {const c=select(items,v[key]||"",required?null:"بدون برچسب");c.id="inst214-"+key;c.required=required;c.onchange=()=>{v[key]=c.value;if(change)change();};grid.append(field(title,c));return c;}
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

      const submit=el("button","ثبت قرارداد","primary");submit.type="submit";submit.disabled=env.needsReview();
      form.append(grid,error,bar(submit));
      form.onsubmit=e=>{e.preventDefault();try{
        if(env.needsReview())throw Error("ابتدا مانده‌های انتقالی را بررسی کنید");
        if(!["yes","no"].includes(v.affectAccount))throw Error("اثر در ریزحساب را مشخص کنید");
        const count=integer217(v.count);if(!Number.isInteger(count)||count<1||count>600)throw Error("تعداد اقساط بین ۱ تا ۶۰۰ باشد");
        const dues=dueDates(v.firstDue,count),first=jalali(v.firstDue);
        const c=ledger().createInstallments214({...v,affectAccount:v.affectAccount==="yes",dues,date:legacyDate(today()),tags:v.tag?[v.tag]:[]});
        contract=freshContract();rerender();env.message("قرارداد «"+c.title+"» ثبت شد");
      }catch(e){showError(error,e);}};
      enterFlow(form);host.append(card(form));
      const contracts=[...(ledger().s.installmentContracts214 || [])].reverse();
      if(contracts.length)host.append(card(el("h3","قراردادهای ثبت‌شده"),table(["نام قرارداد","نوع اقساط","طرف حساب","هر قسط","تعداد","جمع تعهد","ریزحساب"],contracts.map(c=>({item:c,cells:[c.title,c.direction==="payable"?"بدهکار شدم":"طلبکار شدم",c.partyName,(c.amount?f(c.amount)+" "+c.unit.name:"مطابق سررسیدها"),f(c.count),f(c.total)+" "+c.unit.name,c.affectAccount?"محاسبه می‌شود":"محاسبه نمی‌شود"]})),c=>bar(btn("ویرایش قرارداد / اقساط",()=>editContract225(c)),btn("سررسیدها",()=>showSchedule(c))))));
      monthlyInstallments225();
      const old=env.legacyInstallments?.() || [];
      if(old.length)host.append(card(el("h3","سوابق قراردادهای قبلی"),table(["نام قرارداد","طرف حساب","سررسید","مقدار","مانده"],old.map(x=>({cells:[x.title,x.party,x.date,f(x.total)+" "+x.unit,f(x.remaining)+" "+x.unit]}))),btn("مشاهده و تسویهٔ قراردادهای قبلی",()=>env.openLegacyInstallments())));
    }
    function monthlyInstallments225(){
      const months=["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
      for(const g of ledger().installmentMonths225()){
        const totals=g.contracts.map(c=>g.months.reduce((q,m)=>add(q,m.values[c.id] || "0"),"0"));
        const rows=[{cells:["جمع کل","",amount219(totals.reduce((q,n)=>add(q,n),"0"),g.unit),...totals.map(q=>amount219(q,g.unit))]},...g.months.map(m=>({cells:[f(m.month.slice(0,4)),months[Number(m.month.slice(5))-1],amount219(m.total,g.unit),...g.contracts.map(c=>amount219(m.values[c.id] || "0",g.unit))]}))];
        const block=card(el("h3","گزارش ماهانهٔ ماندهٔ اقساط — "+name("goods",g.good)+" ("+g.unit.name+")"),table(["سال","ماه","جمع ماه",...g.contracts.map(c=>c.title)],rows));block.classList.add("installment225-months");host.append(block);
      }
    }
    function editContract225(original){
      const c=clone(original),d=el("dialog"),form=el("form"),error=el("div"),title=input(c.title),list=el("div");
      d.className="installment225-editor";const top=el("div",null,"n-grid"),parties=el("div");partyFields(parties,c,()=>{},"editinst225");top.append(field("نام قرارداد",title),parties);
      function choice(key,label,items,change){const control=select(items,String(c[key]),null);control.id="editinst225-"+key;control.onchange=()=>{c[key]=key==="affectAccount"?control.value==="true":control.value;change?.();};top.append(field(label,control));return control;}
      choice("direction","نوع اقساط",[{id:"payable",name:"بدهکار شدم"},{id:"receivable",name:"طلبکار شدم"}]);choice("affectAccount","اثر در ریزحساب",[{id:"true",name:"محاسبه شود"},{id:"false",name:"محاسبه نشود"}]);
      const assets=[...active("goods"),...(ledger().s.catalogGoods || []).filter(g=>!ledger().s.goods.some(x=>x.id===g.id))];choice("good","کالا / ارز قرارداد",assets,()=>{const g=assets.find(g=>g.id===c.good);c.commitmentKind=g.mode==="currency"?"currency":"commodity";c.goodsGroup=g.groupId || "__ungrouped";});
      const tags=select(active("tags"),c.tags?.[0] || "","بدون برچسب");tags.onchange=()=>c.tags=tags.value?[tags.value]:[];top.append(field("برچسب",tags));
      form.append(el("h3","ویرایش قرارداد و اقساط"),top,list,error);
      function draw(){list.replaceChildren();for(const [i,due]of c.dues.entries()){
        const amount=input(due.amount),date=input(due.jalali);amount.oninput=()=>due.amount=amount.value;date.oninput=()=>due.jalali=date.value;
        list.append(bar(el("b","قسط "+f(i+1)),field("مقدار",amount),field("سررسید شمسی",date),el("span","مانده: "+f(due.id?ledger().installmentRemaining216(c.id,due.id):due.amount)+" "+c.unit.name),btn("حذف قسط",()=>{c.dues.splice(i,1);draw();},"danger")));
      }}draw();
      form.append(btn("افزودن قسط",()=>{const previous=c.dues.at(-1),next=dueDates(previous?.jalali || today(),2)[1];c.dues.push({...next,id:null,amount:previous?.amount || original.amount || "1"});draw();}));
      const save=btn("ثبت اصلاحات",()=>{try{const dues=c.dues.map(d=>({...d,jalali:jalali(d.jalali),date:legacyDate(jalali(d.jalali))}));ledger().updateInstallments225(c.id,{...c,title:title.value,dues},legacyDate(today()));d.close();rerender();env.message("قرارداد اصلاح شد");}catch(e){showError(error,e);}});
      form.onsubmit=e=>e.preventDefault();form.append(bar(save,btn("انصراف",()=>d.close())));d.append(form);host.append(d);d.onclose=()=>d.remove();d.showModal();title.focus();
    }
    function openNumber225(number){
      const h=(ledger().s.invoiceHeaders214 || []).find(h=>h.number===Number(number));if(h){open221(h.id);return;}
      const old=(env.legacyInvoices225?.() || []).find(d=>Number(d.no)===Number(number));if(!old)throw Error("فاکتوری با این شماره ثبت نشده است");
      invoice={id:"archive-"+old.no,number:Number(old.no),jalali:old.date || "",archive225:true,status:"posted"};unlocked218=false;rowOpen218=false;rerender();
    }
    function showSchedule(c) {
      const d=el("dialog");d.append(el("h3",c.title),table(["قسط","سررسید شمسی","مقدار","مانده"],c.dues.map((due,i)=>({cells:[f(i+1),f(due.jalali),f(due.amount)+" "+c.unit.name,f(ledger().installmentRemaining216(c.id,due.id))+" "+c.unit.name]}))),btn("بستن",()=>d.close()));host.append(d);d.onclose=()=>d.remove();d.showModal();
    }
    function leave219(){if(invoice?.id)ledger().discardEmptyInvoice219(invoice.id);invoice=null;}
    function open221(id){const h=ledger().s.invoiceHeaders214?.find(h=>h.id===id);if(!h)throw Error("فاکتور یافت نشد");invoice=clone(h);unlocked218=false;rowOpen218=false;selected218=0;invoiceRow=freshInvoiceRow216();invoiceFocus="invoice214-number";rerender();}
    function snapshot224(){return invoice?{invoice:clone(invoice),row:clone(invoiceRow),unlocked:unlocked218,rowOpen:rowOpen218,selected:selected218}:null;}
    function restore224(saved){invoice=clone(saved.invoice);if(invoice.id){const current=ledger().s.invoiceHeaders214.find(h=>h.id===invoice.id);if(current && current.status!=="deleted")invoice=clone(current);}invoiceRow=clone(saved.row);unlocked218=saved.unlocked;rowOpen218=saved.rowOpen;selected218=saved.selected;rerender();}
    return {openNumber225,snapshot224,restore224,open221,leave219,escape218,shortcut,invoice:invoiceScreen,installments:installmentsScreen,enter(route){if(route==="operations"){unlocked218=false;rowOpen218=true;selected218=0;invoice=null;invoiceRow=freshInvoiceRow216();invoiceFocus="invoice214-number";}},today};
  }
};
