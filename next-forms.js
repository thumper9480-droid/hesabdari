/* Update 214: step-by-step document headers and installment contracts. */
globalThis.SadraForms214 = {
  create(env) {
    "use strict";
    const {el,btn,field,select,input,bar,card,table,f,name,openEditor,rerender,host,legacyDate} = env;
    const {clone,uid,norm,dec,mul,sub} = SadraCore;
    const ledger = () => env.ledger();
    const active = kind => (ledger().s[kind] || []).filter(x=>x.active!==false);
    let invoice = null, contract = freshContract();
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
    function partyFields(root,state,changed,prefix) {
      root.classList.add("party-fields214");
      const options={banks:"بانک‌ها",funds:"صندوق‌ها",expenses:"هزینه‌ها",incomes:"درآمد",people:"افراد"};
      const add=(key,label,items,onchange)=>{
        const control=select(items,state[key] || "");control.id=prefix+"-"+key;control.required=true;
        root.append(field(label,control));
        control.onchange=()=>{state[key]=control.value;if(onchange)onchange();changed();};
        return control;
      };
      const redraw=(focus)=>{draw();if(focus)requestAnimationFrame(()=>root.querySelectorAll("select,input")[1]?.focus());};
      function parentChanged(){state.partyId="";state.partyText="";draw();requestAnimationFrame(()=>root.querySelector("[data-party-leaf]")?.focus());}
      function draw() {
        root.replaceChildren();
        add("partyKind","گروه طرف حساب",Object.entries(options).map(([id,name])=>({id,name})),()=>{state.partyId="";state.partyText="";state.bankId="";state.groupId="";redraw(true);});
        const kind=state.partyKind;if(!kind)return;
        let list=[];
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
        control.id=prefix+"-partyId";control.dataset.partyLeaf="true";control.required=true;control.autocomplete="off";control.setAttribute("role","combobox");control.setAttribute("aria-autocomplete","list");control.setAttribute("aria-controls",prefix+"-results");results.id=prefix+"-results";results.setAttribute("role","listbox");results.hidden=true;
        function choose(item){state.partyId=item.id;state.partyText=item.name;control.value=item.name;results.hidden=true;control.setAttribute("aria-expanded","false");changed();}
        function matches(){const q=norm(control.value);return list.filter(x=>norm(x.name).includes(q));}
        function suggest(){results.replaceChildren();const options=matches();for(const item of options.slice(0,20)){const option=btn(item.name,()=>{choose(item);control.focus();});option.tabIndex=-1;option.setAttribute("role","option");results.append(option);}results.hidden=!options.length || !control.value;control.setAttribute("aria-expanded",String(!results.hidden));}
        function create(){const proposed=control.value.replace(/\+/g,"").trim();state.partyText=proposed;control.value=proposed;results.hidden=true;openEditor(kind,null,{name:proposed,groupId:state.groupId},saved=>{state.partyId=saved.id;state.partyText=saved.name;state.groupId=saved.groupId;changed();requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById(prefix+"-partyId")?.focus()));});}
        control.oninput=()=>{if(control.value.endsWith("++")){create();return;}state.partyText=control.value;state.partyId=list.find(x=>norm(x.name)===norm(control.value))?.id || "";suggest();changed();};
        control.addEventListener("keydown",e=>{
          if(e.key==="Escape"){results.hidden=true;return;}
          if(e.key==="Enter") {e.preventDefault();e.stopPropagation();const item=list.find(x=>x.id===state.partyId)||matches()[0];if(item){choose(item);focusNext(root.closest("form") || root,control);}else env.message("موردی پیدا نشد؛ برای معرفی مورد جدید ++ بزنید",true);}
          if(e.key==="ArrowDown"){e.preventDefault();const match=matches()[0];if(match)choose(match);}
        });
        control.onblur=()=>setTimeout(()=>{results.hidden=true;},180);
        wrap.append(control,results);root.append(field(label,wrap));root.append(el("small","جست‌وجوی نام؛ برای افزودن مورد جدید دو بار کلید + را بزنید.","n-muted"));
      }
      draw();
    }
    function persistInvoice(error) {
      if(!invoice)return;
      try {if(env.needsReview())throw Error("برای ذخیرهٔ پیش‌نویس ابتدا مانده‌های انتقالی را بررسی کنید");ledger().saveInvoiceHeader214(invoice);if(error)error.textContent="";return true;}catch(e){if(error)showError(error,e);else env.message(e.message,true);return false;}
    }
    function reserveInvoice() {
      const floor=Math.max(Number(env.raw().counter)||1,...(env.raw().docs || []).map(d=>Number(d.no)+1));
      if(env.needsReview()){invoice={id:null,number:floor,jalali:today(),partyKind:"",partyId:"",bankId:"",groupId:""};return;}
      invoice=ledger().newInvoiceHeader214(floor,today());
    }
    function invoiceScreen() {
      if(!invoice)reserveInvoice();
      const frame=el("section",null,"invoice214-frame"), actions=bar(), form=el("form",null,"invoice214-form"), grid=el("div",null,"invoice214-header"), error=el("div");
      const existing=[...(ledger().s.invoiceHeaders214 || [])].sort((a,b)=>a.number-b.number),position=existing.findIndex(d=>d.id===invoice.id);
      const previous=btn("سند قبلی",()=>{if(!persistInvoice(error))return;if(position>0){invoice=clone(existing[position-1]);rerender();}});
      previous.disabled=position<=0;
      const next=btn("سند بعدی",()=>{if(!persistInvoice(error))return;if(position>=0 && position<existing.length-1)invoice=clone(existing[position+1]);else reserveInvoice();rerender();});
      actions.append(previous,next);actions.classList.add("invoice214-actions");
      const number=input(invoice.number);number.id="invoice214-number";number.readOnly=true;number.inputMode="numeric";number.setAttribute("aria-label","شماره فاکتور");grid.append(field("شماره فاکتور",number));
      const date=el("div",null,"invoice214-date"),parts=invoice.jalali.split("/"), dateControls=[];
      ["سال","ماه","روز"].forEach((title,i)=>{const c=input(parts[i] || "");c.id="invoice214-"+["year","month","day"][i];c.inputMode="numeric";c.maxLength=i===0?4:2;c.setAttribute("aria-label",title);c.oninput=()=>{invoice.jalali=dateControls.map(n=>n.value).join("/");persistInvoice(error);};dateControls.push(c);date.append(c);});
      grid.append(field("تاریخ شمسی",date));
      const parties=el("div");partyFields(parties,invoice,()=>persistInvoice(error),"invoice214");grid.append(parties);
      form.append(grid,error);form.onsubmit=e=>e.preventDefault();
      enterFlow(form,control=>{if(dateControls.includes(control)){const index=dateControls.indexOf(control),value=Number(norm(control.value));if(!Number.isInteger(value)||value<1||(index===0&&(value<1000||value>=1700))||(index===1&&value>12)||(index===2&&value>31))throw Error(""+["سال","ماه","روز"][index]+" معتبر وارد کنید");if(index===2){invoice.jalali=jalali(invoice.jalali);persistInvoice(error);}}});
      if(env.needsReview()){error.textContent="برای ذخیرهٔ سربرگ ابتدا مانده‌های قبلی را بررسی کنید.";error.className="n-error";frame.append(btn("بررسی مانده‌های قبلی",()=>env.openReview()));}
      frame.append(actions,form,el("p","سربرگ به‌صورت پیش‌نویس ذخیره می‌شود. ردیف‌های سند در مرحلهٔ بعد تعریف می‌شوند؛ این سربرگ اثر مالی ندارد.","n-muted invoice214-draft-note"));host.append(frame);
      requestAnimationFrame(()=>number.focus());
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
      const d=el("dialog");d.append(el("h3",c.title),table(["قسط","سررسید شمسی","مقدار"],c.dues.map((due,i)=>({cells:[f(i+1),f(due.jalali),f(due.amount)+" "+c.unit.name]}))),btn("بستن",()=>d.close()));host.append(d);d.onclose=()=>d.remove();d.showModal();
    }
    return {invoice:invoiceScreen,installments:installmentsScreen,enter(route){if(route==="operations")invoice=null;},today};
  }
};
