/* New catalog and accounting screens. No libraries, analytics, or network storage. */
globalThis.SadraNext = {
  mount(bridge) {
    "use strict";
    const C = SadraCore,
      { dec, str, add, sub, mul, div, norm, uid, clone } = C;
    const labels = {
      funds: "صندوق‌ها",
      banks: "بانک‌ها",
      expense: "هزینه‌ها",
      income: "درآمدها",
      people: "افراد",
      goods: "کالاها",
      tags: "برچسب‌ها",
      units: "معرفی واحدها",
      materials: "معرفی جنس دارایی‌ها",
      assets: "معرفی ارزها",
      operations: "ثبت فاکتور",
      installments: "اقساط",
      inventory: "گزارش موجودی",
      accounts: "حساب اشخاص",
      reports: "گزارش‌های جامع",
      settings: "تنظیمات و سوابق",
    };
    const names = {
      bankAccounts: "حساب‌های بانکی",
      bankInstitutions: "بانک‌ها",
      locations: "محل‌های نگهداری",
      fundTypes: "انواع صندوق",
      funds: "صندوق‌ها",
      expenseGroups: "محل‌های هزینه",
      expenseHeads: "سرفصل‌ها و زیرسرفصل‌ها",
      expenses: "حساب‌های هزینه",
      incomeSources: "محل‌های درآمد",
      incomeTypes: "انواع درآمد",
      incomes: "حساب‌های درآمد",
      peopleGroups: "گروه‌های افراد",
      people: "افراد",
      groups: "گروه‌ها و زیرگروه‌های کالا",
      goods: "کالاها",
      tags: "مدیریت برچسب‌ها",
      units: "معرفی واحدها",
      assets: "معرفی ارزها",
      assetTypes: "انواع دارایی",
      materials: "معرفی جنس دارایی‌ها",
    };
    const types = {
      buy: "خرید",
      sell: "فروش",
      delivery: "تحویل واقعی کالا",
      payment: "تسویه مالی / کارمزد",
      receive: "دریافت",
      pay: "پرداخت",
      transfer: "حواله / انتقال",
      opening: "افتتاحیه",
      installmentOpen: "ثبت تعهد اقساط",
      installmentReceive: "دریافت قسط",
      installmentPay: "پرداخت قسط",
      incomeClaim: "ثبت طلب درآمدی",
      incomeReceipt: "دریافت طلب درآمدی",
      adjustment: "اصلاح موجودی",
      expense: "ثبت هزینه",
      income: "ثبت درآمد",
      settlement: "تسویه",
      reversal: "سند برگشت",
      legacy: "مانده انتقالی نسخه ۲۰۳",
      exchange: "تسویهٔ دو دارایی با نرخ مشخص",
    };
    const dims = { weight: "وزنی", count: "تعدادی", currency: "ارزی" },
      modes = { weight: "وزن‌محور", count: "تعدادمحور", currency: "ارزی" },
      fees = {
        none: "بدون کارمزد",
        fixed: "تومانی ثابت هر قطعه",
        variable: "تومانی متغیر هر قطعه",
        gold: "طلایی درصدی از وزن",
      };
    const el = (tag, text, cls) => {
      const e = document.createElement(tag);
      if (text !== undefined && text !== null) e.textContent = String(text).replace(/[0-9]/g,c=>"۰۱۲۳۴۵۶۷۸۹"[c]);
      if (cls) e.className = cls;
      return e;
    };
    const btn = (text, fn, cls) => {
      const e = el("button", text, cls);
      e.type = "button";
      e.onclick = () => run(fn);
      return e;
    };
    const card = (...nodes) => {
        const e = el("div", null, "n-card");
        e.append(...nodes.filter(Boolean));
        return e;
      },
      bar = (...nodes) => {
        const e = el("div", null, "n-bar");
        e.append(...nodes);
        return e;
      };
    const f = (v) => {
      if(v===undefined || v===null || v==="")return "—";
      const text=String(v),raw=norm(text).replace(/[\u2066-\u2069,٬]/g,"").replace(/−/g,"-");
      if(/^[+-]?\d+(?:[.٫]\d+)?$/.test(raw))return C.formatNumber(raw,{group:false,plus:raw.startsWith("+")});
      return text.replace(/\d/g,c=>"۰۱۲۳۴۵۶۷۸۹"[c]);
    };
    function amount219(value,unitId=null,plus=false) {
      const u=typeof unitId==="object"?unitId:ledger?.s.units.find(u=>u.id===unitId) || ledger?.s.units.find(u=>u.id===ledger.s.assets.find(a=>a.id===unitId)?.unitId) || ledger?.s.units.find(u=>norm(u.name)===norm(unitId));
      return C.formatNumber(value,{unit:u || unitId,plus});
    }
    function numericCell219(value,title,unitName) {
      if(value instanceof Node)return value;
      if(/تومانی/.test(title))unitName="تومان";else if(/طلای.*[۷7][۵5][۰0]/.test(title))unitName="گرم";
      if(/شماره|تاریخ|سررسید|عیار|ردیف|^سطر$/.test(title))return value;
      if(!/مقدار|مبلغ|وزن|مانده|تعداد|کارمزد|بدهکار|بستانکار|پرداخت|دریافت|نرخ|قیمت|جمع|موجودی|رزرو|قابل استفاده|ارزش|ورود|خروج|افتتاحیه/.test(title))return value;
      try{return amount219(value,/تعداد|درصد|نرخ|قیمت/.test(title)?null:unitName,String(value).replace(/[\u2066-\u2069]/g,"").startsWith("+"));}catch{return value;}
    }
    const select = (items, value = "", blank = null) => {
      const s = el("select");
      if (blank !== null) {
        const o = el("option", blank);
        o.value = "";
        s.append(o);
      }
      for (const x of items) {
        const o = el("option", x.name ?? x.label ?? x.id);
        o.value = x.id ?? x.value;
        s.append(o);
      }
      s.value = value || "";
      return s;
    };
    function numeric217(control) {
      if(!control?.matches?.("input") || control.readOnly)return false;
      const id=control.id || "",label=control.getAttribute("aria-label") || control.closest("label")?.firstChild?.textContent || "";
      if(/date|year|month|day|number$|docno|account|phone|code|firstDue/i.test(id) || /شماره|تاریخ|سررسید|تلفن|کد|سال|ماه|روز/.test(label))return false;
      return control.dataset.numeric217==="true" || control.type==="number" || ["decimal","numeric"].includes(control.inputMode) || /مبلغ|مقدار|وزن|تعداد|نرخ|درصد|عیار|کارمزد|ضریب|قیمت|مانده|ارزش/.test(label);
    }
    function formatNumber217(c) {
      if(!numeric217(c)){if(c?.matches?.("input") && ["numeric","decimal"].includes(c.inputMode) && c.type!=="number")c.value=c.value.replace(/[0-9]/g,n=>"۰۱۲۳۴۵۶۷۸۹"[n]);return;}
      if(c.type==="number"){c.type="text";c.inputMode="decimal";}
      const before=c.value,position=c.selectionStart ?? before.length,offset=before.slice(0,position).replace(/[,٬]/g,"").length;
      const raw=before.replace(/[,٬\u2066-\u2069]/g,"").replace(/٫/g,".");
      if(!/^-?[0-9۰-۹٠-٩]*(?:[.٫][0-9۰-۹٠-٩]*)?$/.test(raw))return;
      const [whole,fraction]=raw.split(/[.٫]/),separator=raw.includes("٫")?"٫":".";
      const formatted=(whole.replace(/\B(?=([0-9۰-۹٠-٩]{3})+(?![0-9۰-۹٠-٩]))/g,",")+(fraction!==undefined?separator+fraction:"")).replace(/[0-9]/g,c=>"۰۱۲۳۴۵۶۷۸۹"[c]);
      if(formatted===before)return;c.value=formatted;
      let n=0,caret=0;while(caret<formatted.length && n<offset){if(formatted[caret]!==",")n++;caret++;}c.setSelectionRange(caret,caret);
    }
    document.addEventListener("input",e=>{delete e.target.dataset?.exact219;formatNumber217(e.target);},true);
    document.addEventListener("focusin",e=>{const c=e.target;if(c.dataset?.exact219!==undefined){c.value=c.dataset.exact219;delete c.dataset.exact219;formatNumber217(c);}},true);
    document.addEventListener("focusout",e=>{const c=e.target;if(!numeric217(c) || !c.value)return;const unitId=c.dataset.unit219,u=ledger?.s.units.find(u=>u.id===unitId);if(u?.dimension==="weight" && norm(u.name)===norm("گرم")){try{c.dataset.exact219=c.value;c.value=C.formatNumber(c.value,{unit:u,isolate:false});}catch{}}},true);

    const cleanControls217=root=>{
      for(const c of root.querySelectorAll("select")) {
        const empty=c.value==="";for(const o of [...c.options])if(!o.value && /انتخاب کنید/.test(o.textContent))o.remove();if(empty)c.selectedIndex=-1;
      }
      for(const c of root.querySelectorAll("input"))formatNumber217(c);
    };
    function decorateNumbers219(root) {
      for(const table of root.querySelectorAll("table")) {
        const headers=[...table.querySelectorAll("thead th")].map(h=>h.textContent),unitIndex=headers.findIndex(h=>/^واحد(?:\s|$)/.test(h));
        if(!headers.length)continue;
        for(const row of table.querySelectorAll("tbody tr,tfoot tr")) {
          const cells=[...row.cells],unitName=unitIndex>=0?cells[unitIndex]?.textContent:null;
          cells.forEach((cell,i)=>{if(cell.childElementCount)return;const value=numericCell219(cell.textContent,headers[i] || "",unitName);if(typeof value==="string" && value!==cell.textContent)cell.textContent=value;});
        }
      }
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode())) {
        if(node.parentElement?.closest("script,style,input,textarea,option,select,pre,code"))continue;
        const original=node.nodeValue;let value=original;
        value=value.replace(/(?<![\p{L}\p{N}/.\u2066])(?:\u2066)?([+−-]?[0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬]*(?:[.٫][0-9۰-۹٠-٩]+)?)(?:\u2069)?\s+(گرم|تومان|ریال|دلار|درهم|لیر)(?![\p{L}])/gu,(all,number,unit)=>{try{return C.formatNumber(number,{unit:unit==="گرم"?"گرم":null,plus:number[0]==="+"})+" "+unit;}catch{return all;}});
        value=value.replace(/(?<![\p{L}\p{N}/.\u2066])([+−-][0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬]*(?:[.٫][0-9۰-۹٠-٩]+)?)(?![\p{L}\p{N}/.\u2069])/gu,(all,number)=>{try{return C.formatNumber(number,{group:true,plus:number[0]==="+"});}catch{return all;}});
        if(value!==original)node.nodeValue=value;
      }
    }
    let decorating219=false;
    new MutationObserver(()=>{if(decorating219)return;decorating219=true;try{cleanControls217(document);decorateNumbers219(document.body);}finally{decorating219=false;}}).observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener("keydown",e=>{if((e.key!=="-" && e.code!=="NumpadSubtract") || e.ctrlKey || e.metaKey || e.altKey || !numeric217(e.target))return;
      e.preventDefault();e.stopImmediatePropagation();const c=e.target;if(c.type==="number"){c.type="text";c.inputMode="decimal";}const start=c.selectionStart ?? c.value.length,end=c.selectionEnd ?? start;c.value=c.value.slice(0,start)+"000"+c.value.slice(end);c.setSelectionRange(start+3,start+3);c.dispatchEvent(new Event("input",{bubbles:true}));
    },true);
    const choices = (o) =>
      Object.entries(o).map(([id, name]) => ({ id, name }));
    const input = (value = "", type = "text") => {
      const e = el("input");
      e.type = type;
      e.value = value;
      if(type==="number"){e.type="text";e.inputMode="decimal";}
      return e;
    };
    const field = (label, node) => {
      const e = el("label", label);
      if (["INPUT", "SELECT", "TEXTAREA"].includes(node.tagName)) {
        node.setAttribute("aria-label", label);
      }
      e.append(node);
      return e;
    };
    const host = el("section");
    host.id = "next204";
    host.hidden = true;
    document.querySelector("main").append(host);
    let forms214;
    let ledger,
      route = "funds",
      tab = "",
      filter = {},
      page = 0,
      latestRows = [],
      latestHeaders = [],
      latestTitle = "",
      migrationNotice = false;
    const raw = () => bridge.get(),
      name = (kind, id) =>
        ledger.s[kind]?.find((x) => x.id === id)?.name || id || "—",
      active = (kind) =>
        (ledger.s[kind] || []).filter((x) => x.active !== false);
    const displayName = (kind, id) => name(kind, id),
      good = (id) => ledger.s.goods.find((x) => x.id === id),
      unit = (id) => ledger.s.units.find((x) => x.id === id);
    function migrate() {
      const old = raw(),
        db = old.db,
        s = C.fresh(),
        groupId = uid(),
        location = uid();
      s.assetTypes = Object.entries(modes).map(([mode, name]) => ({
        id: "asset-type-" + mode,
        name,
        mode,
        active: true,
      }));
      s.bankInstitutions = (db.bankInstitutions || []).map((b) => ({
        ...clone(b),
        id: b.code,
        active: !b.inactive,
      }));
      s.peopleGroups.push({
        id: groupId,
        name: "افراد نسخه قبلی",
        active: true,
      });
      s.locations.push({
        id: location,
        name: "محل تعیین‌نشده (نسخه قبلی)",
        active: true,
      });
      const addUnit = (id, n, dimension, factor, decimals = 8, extra = {}) => {
        let x = s.units.find((x) => x.name === n && x.dimension === dimension);
        if (!x) {
          x = {
            id,
            name: n,
            dimension,
            factor,
            decimals,
            active: true,
            ...extra,
          };
          s.units.push(x);
        }
        return x;
      };
      for (const u of db.units || []) {
        const known = {
          گرم: "1",
          سوت: "0.001",
          کیلوگرم: "1000",
          میلی‌گرم: "0.001",
        };
        if (u.name === "مثقال") {
          addUnit(u.code, u.name, "weight", null, 8, { needsReview: true });
          continue;
        }
        addUnit(
          u.code,
          u.name,
          known[u.name] ? "weight" : "count",
          known[u.name] || null,
          known[u.name] ? 8 : 0,
        );
      }
      for (const [n, factor] of Object.entries({
        گرم: "1",
        سوت: "0.001",
        کیلوگرم: "1000",
      }))
        addUnit("unit-" + uid(), n, "weight", factor);
      addUnit("unit-" + uid(), "عدد", "count", null, 0);
      for (const a of db.assets || []) {
        const currency = a.category === "currency",
          u = currency
            ? addUnit(
                "money-" + a.code,
                a.name,
                "currency",
                null,
                ["تومان", "ریال"].includes(a.name) ? 0 : 2,
                {
                  currencyCode:
                    {
                      تومان: "IRT",
                      دلار: "USD",
                      یورو: "EUR",
                      درهم: "AED",
                      ریال: "IRR",
                      پوند: "GBP",
                    }[a.name] || "",
                },
              )
            : s.units.find((x) => x.name === "گرم");
        s.assets.push({
          ...clone(a),
          id: a.code,
          name: a.name,
          nature: currency ? "currency" : "commodity",
          unitId: u.id,
          decimals: u.decimals,
          active: !a.inactive,
        });
      }
      for (const p of db.people || [])
        s.people.push({
          ...clone(p),
          id: p.code,
          groupId,
          active: !p.inactive,
        });
      for (const k of ["metal", "currency", "banks"])
        for (const x of db[k] || [])
          s.funds.push({
            ...clone(x),
            id: x.code,
            name: x.name,
            locationId: location,
            typeId: k === "metal" ? "commodity" : "currency",
            nature:
              k === "metal" ||
              (k === "banks" &&
                s.assets.find((a) => a.id === x.assetId)?.nature ===
                  "commodity")
                ? "commodity"
                : "currency",
            assetId: x.assetId || s.assets.find((a) => a.name === x.base)?.id,
            legacyKind: k,
            active: !x.inactive,
          });
      const eg = uid();
      s.expenseGroups.push({
        id: eg,
        name: "هزینه‌های نسخه قبلی",
        active: true,
      });
      for (const h of db.expenseGroups || [])
        s.expenseGroups.push({ id: h.code, name: h.name, active: true });
      for (const x of db.expense || []) {
        const gid = s.expenseGroups.some((g) => g.id === x.groupCode)
            ? x.groupCode
            : eg,
          h = {
            id: "head-" + x.code,
            name: x.name,
            groupId: gid,
            active: true,
          };
        s.expenseHeads.push(h);
        s.expenses.push({
          ...clone(x),
          id: x.code,
          groupId: gid,
          headId: h.id,
          active: !x.inactive,
        });
      }
      const source = uid(),
        type = uid();
      s.incomeSources.push({
        id: source,
        name: "منبع تعیین‌نشده (نسخه قبلی)",
        active: true,
      });
      s.incomeTypes.push({
        id: type,
        name: "نوع تعیین‌نشده (نسخه قبلی)",
        active: true,
      });
      for (const x of db.income || [])
        s.incomes.push({
          ...clone(x),
          id: x.code,
          sourceId: source,
          typeId: type,
          active: !x.inactive,
        });
      for (const k of ["goods", "people"])
        for (const x of db.categoryGroups105?.[k] || []) {
          if (k === "goods")
            s.groups.push({ id: x.id, name: x.name, active: true });
          else s.peopleGroups.push({ id: x.id, name: x.name, active: true });
        }
      for (const p of s.people)
        if (s.peopleGroups.some((x) => x.id === p.category105))
          p.groupId = p.category105;
      for (const g of db.goods || []) {
        const a = s.assets.find((a) => a.id === g.assetId),
          currency = a?.nature === "currency";
        let u = currency
          ? s.units.find((u) => u.id === a.unitId)
          : s.units.find((u) => u.id === g.unitId) ||
            s.units.find((u) => u.name === g.unit);
        if (!u) u = s.units.find((u) => u.name === "عدد");
        const mode = currency
          ? "currency"
          : g.invoiceCalculation === "count_weight"
            ? "weight"
            : u.dimension === "weight"
              ? "weight"
              : "count";
        if (mode === "weight" && u.dimension !== "weight")
          u = s.units.find((u) => u.name === "گرم");
        s.goods.push({
          ...clone(g),
          id: g.code,
          assetId: a?.id,
          unitId: u.id,
          rateUnitId: u.id,
          name: g.name,
          mode,
          assetTypeId: "asset-type-" + mode,
          groupId: s.groups.some((x) => x.id === g.category105)
            ? g.category105
            : "",
          active: !g.inactive,
          canBuy: g.canTrade !== false,
          canSell: g.canTrade !== false,
          feeMode: "none",
          standardWeight: g.fixedWeight ? String(g.fixedWeight) : "",
          standardWeightUnitId: s.units.find((u) => u.name === "گرم").id,
          allowActual: false,
          metal: g.metal || "",
          purity: g.purity ? String(g.purity) : g.metal === "طلا" ? "750" : "",
          legacyImported: true,
        });
      }
      for (const t of db.tags || [])
        s.tags.push({
          ...clone(t),
          id: t.code,
          name: t.name,
          color: /^#[a-f0-9]{6}$/i.test(t.color || "") ? t.color : "#267562",
          active: !t.inactive,
        });
      const entries = [];
      for (const b of bridge.baseline()) {
        if (!b.value || !s.goods.some((g) => g.id === b.good)) continue;
        const g = s.goods.find((g) => g.id === b.good),
          bucket =
            b.kind === "people"
              ? "person"
              : b.kind === "expense"
                ? "expense"
                : b.kind === "income"
                  ? "income"
                  : ["metal", "currency", "banks"].includes(b.kind)
                    ? "stock"
                    : null;
        if (!bucket) continue;
        entries.push({
          bucket,
          account: b.id,
          good: b.good,
          quantity: String(Number(b.value.toFixed(8))),
          purity: g.metal === "طلا" ? "750" : g.purity || "",
          lot:
            bucket === "stock" && g.mode === "weight"
              ? "legacy-" + b.id + "-" + g.id
              : "",
          mark: "مانده انتقالی",
          assay: "",
          legacyNormalized: g.metal === "طلا",
        });
      }
      s.legacyBalances = clone(entries);
      s.legacy = {
        catalogs: Object.fromEntries(
          ["funds", "expenses", "incomes", "people", "goods"].map((k) => [
            k,
            clone(s[k]),
          ]),
        ),
        importedAt: new Date().toISOString(),
        documents: clone(old.docs || []),
        raw: clone(old),
        needsReview: entries.length > 0,
      };
      if (entries.length) {
        const snapshots = {};
        for (const e of entries) {
          const g = s.goods.find((x) => x.id === e.good);
          snapshots[g.id] = {
            ...clone(g),
            unit: clone(s.units.find((x) => x.id === g.unitId)),
            asset: clone(s.assets.find((x) => x.id === g.assetId)),
          };
        }
        s.documents.push({
          id: uid(),
          number: 1,
          type: "legacy",
          token: uid(),
          date: new Date().toISOString().slice(0, 10),
          created: new Date().toISOString(),
          entries,
          snapshots,
          tags: [],
          notes:
            "مانده نسخه ۲۰۳؛ مقادیر طلا بر مبنای عیار ۷۵۰ نسخه قبلی است. پیش از ثبت جدید بررسی کنید.",
        });
      }
      return s;
    }
    function load() {
      ledger = new C.Ledger(raw().db.next204 || migrate(), (state) =>
        bridge.save(state),
      );
      migrationNotice = !!ledger.s.legacy?.needsReview;
      if(!migrationNotice && !ledger.s.version221){const data=localStorage.getItem("kimia-591-reconstructed");if(data && !localStorage.getItem("kimia-before-update221"))localStorage.setItem("kimia-before-update221",data);ledger.setup221();}
    }
    load();
    function run(fn) {
      try {
        fn();
      } catch (e) {
        message(e.message, true);
      }
    }
    function message(text, error = false) {
      const h = host.querySelector("#n-status");
      if (h) {
        h.textContent = text;
        h.className = error ? "n-error" : "n-success";
        h.setAttribute("role", error ? "alert" : "status");
        h.scrollIntoView({ block: "nearest" });
      } else bridge.message(text);
    }
    function chip(id) {
      const t = ledger.s.tags.find((x) => x.id === id);
      if (!t) return el("span", "برچسب قدیمی: " + id);
      const e = el(
          "span",
          t.name + (t.active === false ? " (غیرفعال)" : ""),
          "n-chip",
        ),
        rgb = t.color
          .slice(1)
          .match(/../g)
          ?.map((x) => parseInt(x, 16)) || [0, 0, 0];
      e.style.background = t.color;
      e.style.color =
        (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 150
          ? "#111111"
          : "#ffffff";
      return e;
    }
    function tags(ids = []) {
      const e = el("span", null, "n-chips");
      ids.forEach((id) => e.append(chip(id)));
      return e;
    }
    function table(headers, rows, actions) {
      const wrap = el("div", null, "n-scroll"),
        t = el("table"),
        thead = el("thead"),
        tr = el("tr");
      headers.forEach((h) => tr.append(el("th", h)));
      if (actions) tr.append(el("th", "عملیات"));
      thead.append(tr);
      t.append(thead);
      const body = el("tbody");
      for (const row of rows) {
        const tr = el("tr");
        row.cells.forEach((raw,index) => {
          const unitIndex=headers.findIndex(h=>/^واحد(?:\s|$)/.test(h)),unitName=unitIndex>=0?row.cells[unitIndex]:null,v=numericCell219(raw,headers[index],unitName);
          const td = el("td");
          if(v==="طلبکار")td.className="invoice219-credit";else if(v==="بدهکار")td.className="invoice219-debit";
          td.append(
            v instanceof Node ? v : document.createTextNode(String(v ?? "—").replace(/[0-9]/g,c=>"۰۱۲۳۴۵۶۷۸۹"[c])),
          );
          tr.append(td);
        });
        if (actions) {
          const td = el("td");
          td.append(actions(row.item));
          tr.append(td);
        }
        body.append(tr);
      }
      t.append(body);
      wrap.append(t);
      if (!rows.length)
        wrap.append(
          el(
            "p",
            "هنوز موردی برای نمایش وجود ندارد. از دکمهٔ ایجاد برای شروع استفاده کنید.",
            "n-empty",
          ),
        );
      return wrap;
    }
    function backup() {
      download(
        JSON.stringify(
          {
            format: "kimia-accounting-backup",
            schema: 2,
            programVersion: "5.9.1-browser-update204",
            exportedAt: new Date().toISOString(),
            data: raw(),
          },
          null,
          2,
        ),
        "Sadra-backup-204-" + new Date().toISOString().slice(0, 10) + ".json",
        "application/json",
      );
    }
    function download(body, name, type) {
      const a = el("a");
      a.href = URL.createObjectURL(new Blob([body], { type }));
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    function header() {
      host.replaceChildren();
      host.append(el("h2", labels[route] || names[tab] || "حسابداری صدرا"));
      if (route === "operations") return;
      host.append(
        bar(
          el(
            "span",
            "اطلاعات در همین مرورگر ذخیره می‌شوند",
            "n-muted",
          ),
          btn("دانلود پشتیبان", backup),
        ),
      );
      const status = el("div");
      status.id = "n-status";
      status.setAttribute("aria-live", "polite");
      host.append(status);
      if (migrationNotice) {
        host.append(
          card(
            el("h3", "بررسی مانده‌های نسخهٔ قبل"),
            el(
              "p",
              "سوابق اصلی محفوظ است. مانده‌های قبلی به‌صورت افتتاحیه منتقل شده‌اند. مقدار طلای انتقالی مطابق گزارش قدیمی، بر مبنای عیار ۷۵۰ است؛ این مقدار جایگزین وزن واقعی محموله‌های شما نیست. پیش از ثبت سند جدید، پشتیبان بگیرید و مانده‌ها را با اسناد قبلی تطبیق دهید.",
              "n-notice",
            ),
            btn("مشاهدهٔ مانده‌های انتقالی", () =>
              showDocument(
                ledger.s.documents.find((x) => x.type === "legacy")?.id,
              ),
            ),
            btn(
              "مانده‌ها را بررسی کردم؛ فعال‌سازی ثبت جدید",
              () => {
                if (
                  !confirm(
                    "مانده‌های انتقالی را با اطلاعات خود بررسی کرده‌اید؟ نسخهٔ اصلی محفوظ می‌ماند.",
                  )
                )
                  return;
                ledger.transaction(() => {
                  ledger.s.legacy.needsReview = false;
                  ledger.audit(
                    "migration-reviewed",
                    "migration",
                    "204",
                    null,
                    true,
                  );
                });
                migrationNotice = false;
                render();
              },
              "primary",
            ),
          ),
        );
      }
    }
    const submenus = {
      funds: ["funds"],
      banks: ["bankAccounts", "bankInstitutions"],
      expense: ["expenses", "expenseGroups"],
      income: ["incomes"],
      people: ["people", "peopleGroups"],
      goods: ["goods", "groups"],
      tags: ["tags"],
      units: ["units"],
      assets: ["assets"],
      materials: ["materials"],
    };
    function render() {
      header();
      if (submenus[route]) {
        if (!submenus[route].includes(tab)) tab = submenus[route][0];
        host.append(
          bar(
            ...submenus[route].map((k) =>
              btn(
                names[k],
                () => {
                  tab = k;
                  filter = {};
                  render();
                },
                tab === k ? "primary" : "",
              ),
            ),
          ),
        );
        catalog();
      } else if (route === "operations") forms214.invoice();
      else if (route === "installments") forms214.installments();
      else if (route === "inventory") inventory();
      else if (route === "accounts") accounts();
      else if (route === "reports") reports();
      else if (route === "settings") settings();
    }
    function syncLegacy() {
      const saved = raw().db.next204;
      if (saved) {
        load();
      } else if (ledger.s.revision > 0) {
        load();
      }
      ledger.s.funds = ledger.s.funds.filter(
        (f) =>
          f.legacyKind !== "banks" ||
          (raw().db.banks || []).some((x) => x.code === f.id),
      );
      for (const x of raw().db.banks || []) {
        let f = ledger.s.funds.find((f) => f.id === x.code);
        if (!f) {
          f = {
            id: x.code,
            locationId: ledger.s.locations[0]?.id,
            typeId: "currency",
            nature: "currency",
            legacyKind: "banks",
          };
          ledger.s.funds.push(f);
        }
        f.name = x.name;
        f.assetId =
          x.assetId ||
          f.assetId ||
          ledger.s.assets.find((a) => a.name === x.base)?.id;
        f.bankId = x.bankId || f.bankId;
        f.accountNumber = x.accountNumber ?? f.accountNumber ?? "";
        f.nature =
          ledger.s.assets.find((a) => a.id === x.assetId)?.nature || "currency";
        f.typeId = f.nature === "commodity" ? "commodity" : "currency";
        f.active = !x.inactive;
      }
      ledger.s.legacy.references = clone({
        installmentContracts: raw().db.installmentContracts || [],
        openingBalances: raw().db.openingBalances || [],
        balanceAdjustments: raw().db.balanceAdjustments || [],
        goods: raw().db.goods || [],
      });
      const current = bridge
        .baseline()
        .filter((x) => x.value && good(x.good))
        .map((x) => ({
          bucket:
            x.kind === "people"
              ? "person"
              : x.kind === "expense"
                ? "expense"
                : x.kind === "income"
                  ? "income"
                  : ["metal", "currency", "banks"].includes(x.kind)
                    ? "stock"
                    : "unknown",
          account: x.id,
          good: x.good,
          quantity: String(Number(x.value.toFixed(8))),
          purity:
            good(x.good)?.metal === "طلا" ? "750" : good(x.good)?.purity || "",
          lot:
            ["metal", "currency", "banks"].includes(x.kind) &&
            good(x.good)?.mode === "weight"
              ? "legacy-" + x.id + "-" + x.good
              : "",
        }))
        .filter((x) => x.bucket !== "unknown");
      if(ledger.s.toman221)for(const e of current)if(ledger.s.toman221.rialGoods.includes(e.good)){e.good=ledger.s.toman221.good;e.quantity=div(e.quantity,"10");}
      const key = (x) => [x.bucket, x.account, x.good].join("|"),
        prior = new Map(
          (ledger.s.legacyBalances || []).map((x) => [key(x), x]),
        ),
        now = new Map(current.map((x) => [key(x), x])),
        deltas = [];
      for (const k of new Set([...prior.keys(), ...now.keys()])) {
        const x = now.get(k) || { ...prior.get(k), quantity: "0" },
          q = sub(x.quantity, prior.get(k)?.quantity || "0");
        if (dec(q) !== 0n) deltas.push({ ...x, quantity: q });
      }
      if (deltas.length && !migrationNotice)
        ledger.transaction(() => {
          const snapshots = {};
          for (const e of deltas) {
            const g = good(e.good);
            snapshots[g.id] = {
              ...clone(g),
              unit: clone(unit(g.unitId)),
              asset: clone(ledger.find("assets", g.assetId)),
            };
          }
          ledger.s.documents.push({
            id: uid(),
            number: ledger.s.documents.length + 1,
            type: "legacy",
            legacySync: true,
            token: uid(),
            date: new Date().toISOString().slice(0, 10),
            created: new Date().toISOString(),
            entries: deltas,
            snapshots,
            tags: [],
            notes: "گردش ثبت‌شده در ابزارهای قبلی؛ طلای نسخه قدیم بر مبنای ۷۵۰",
          });
          ledger.s.legacyBalances = clone(current);
          ledger.s.legacy.documents = clone(raw().docs);
          ledger.audit("legacy-sync", "migration", "204", null, deltas);
        });
    }
    const navigation218=[];
    let reportState222=null;
    function rememberReport222(){if(route!=="reports")return;reportState222={filter:clone(filter),page,scroll:window.scrollY,main:document.querySelector("main")?.scrollTop || 0,host:host.scrollTop};}
    function restoreReport222(){if(!reportState222)return;const saved=reportState222;requestAnimationFrame(()=>{if(route!=="reports")return;window.scrollTo(0,saved.scroll);const main=document.querySelector("main");if(main)main.scrollTop=saved.main;host.scrollTop=saved.host;});}

    function go(next,history=true) {
      if(next!==route)rememberReport222();
      if(route==="operations" && next!==route)forms214?.leave219();
      if(history && next!==route)navigation218.push(host.hidden?{legacy:document.querySelector("aside button.active")?.dataset.page || "portfolio"}:route);
      syncLegacy();
      route = next;
      tab = "";
      filter = next==="reports" && reportState222?clone(reportState222.filter):{};
      page = next==="reports" && reportState222?reportState222.page:0;
      host.hidden = false;
      document.body.classList.add("next204-active");
      document
        .querySelectorAll("aside button")
        .forEach((b) =>
          b.classList.toggle("active", b.dataset.next204 === next),
        );
      if (forms214) forms214.enter(next);
      render();
      if(next==="reports")restoreReport222();
    }
    function fieldOptions(kind, all = false) {
      if (kind === "banks")
        return ledger.s.funds
          .filter(
            (x) => x.legacyKind === "banks" && (all || x.active !== false),
          )
          .map((x) => ({ id: x.id, name: x.name }));
      return (all ? ledger.s[kind] : active(kind))
        .filter((x) => kind !== "funds" || x.legacyKind !== "banks")
        .map((x) => ({ id: x.id, name: x.name }));
    }
    function schema(kind, v = {}) {
      const text = (key, label, type = "text", required = false) => ({
          key,
          label,
          type,
          required,
        }),
        ref = (key, label, k, items) => ({
          key,
          label,
          type: "select",
          items: items || fieldOptions(k),
          required: true,
        });
      let fields =
        kind === "bankAccounts"
          ? [
              ref("bankId", "بانک", "bankInstitutions"),
              text("accountNumber", "شماره حساب", "text", true),
              ref(
                "assetId",
                "واحد پول حساب",
                null,
                active("assets").filter((a) => a.nature === "currency"),
              ),
            ]
          : [text("name", "نام", "text", true)];
      if (kind === "assetTypes")
        fields.push(
          ref("mode", "مبنای حسابداری", null, choices(modes)),
          text("description", "توضیحات"),
        );
      if (kind === "fundTypes")
        fields.push(
          ref(
            "nature",
            "ماهیت دارایی",
            null,
            choices({ currency: "ارزی", commodity: "کالایی" }),
          ),
        );
      if (kind === "funds")
        fields.push(
          ref(
            "typeId",
            "نوع صندوق",
            null,
            active("fundTypes").filter((t) =>
              ["currency", "commodity"].includes(t.nature),
            ),
          ),
        );
      if (kind === "people")
        fields.push(
          ref("groupId", "گروه افراد", "peopleGroups"),
          text("phone", "تلفن"),
          text("description", "توضیحات"),
        );
      if (kind === "expenseHeads") {
        fields.push(ref("groupId", "دستهٔ اصلی هزینه", "expenseGroups"));
        fields.push({
          key: "parentId",
          label: "سرفصل والد (برای زیرسرفصل)",
          type: "select",
          items: active("expenseHeads").filter(
            (x) => x.groupId === v.groupId && !x.parentId && x.id !== v.id,
          ),
        });
      }
      if (kind === "expenses") {
        fields[0].label = "این هزینه چیست؟";
        fields.unshift(
          ref("groupId", "این هزینه مربوط به کجاست؟", "expenseGroups"),
        );
      }
      if (kind === "incomes") fields[0].label = "نام درآمد";
      if (kind === "groups")
        fields.push({
          key: "parentId",
          label: "گروه والد (اختیاری)",
          type: "select",
          items: active("groups").filter((x) => !x.parentId && x.id !== v.id),
        });
      if(kind==="units") {
        fields[0].label="نام واحد";
        fields.push(ref("dimension","نوع واحد",null,choices(v.dimension==="currency"?dims:{count:"تعدادی",weight:"وزنی"})));
        if(v.dimension==="weight")fields.push(text("factor","معادل یک واحد به گرم","text",true));
      }
      if (kind === "assets") {
        fields[0].label="نام ارز";
        fields.push(text("symbol","کد / نماد ارز"),text("currencyCode","کد استاندارد ارز (مثلاً USD یا EUR)"),text("decimals","دقت اعشاری","number",true));
      }
      if (kind === "goods") {

        fields.push(
          ref(
            "catalogMode",
            "نوع کالا",
            null,
            choices({
              count: "تعدادی",
              weightCount: "وزنی–تعدادی",
              weight: "وزنی",
            }),
          ),
        );
        const dimension=v.catalogMode==="count"?"count":"weight",compatible=active("units").filter(u=>u.dimension===dimension);
        fields.push(ref("catalogUnitId","واحد پیش‌فرض مقدار",null,compatible));
        fields.push(ref("catalogRateUnitId","واحد مبنای نرخ",null,compatible.filter(u=>dimension==="weight" || !v.catalogUnitId || u.id===v.catalogUnitId)));
        if (v.catalogMode==="weightCount")fields.push(ref("catalogPieceUnitId","واحد وزن هر قطعه",null,active("units").filter(u=>u.dimension==="weight")));
        if(["weight","weightCount"].includes(v.catalogMode))fields.push(ref("materialId","جنس دارایی","materials"));
        if(v.catalogMode==="weight")fields.push(ref("variablePurity221","عیار هنگام دریافت قطعه تعیین شود؟",null,[{id:"no",name:"خیر؛ عیار ثابت"},{id:"yes",name:"بله؛ آب‌شده با عیار متغیر"}]));
        if (["weight", "weightCount","count"].includes(v.catalogMode))
          fields.push(text("catalogPurity", v.catalogMode==="count"?"عیار (در صورت داشتن)":"عیار", "text", v.catalogMode!=="count" && v.variablePurity221!=="yes"));
        if (v.catalogMode === "weightCount")
          fields.push(
            text("catalogPieceWeight", "وزن ثابت هر قطعه", "text", true),
          );
        if (["count", "weightCount", "weight"].includes(v.catalogMode)) {
          fields.push(
            ref(
              "catalogHasFee",
              "آیا کارمزد دارد؟",
              null,
              choices({ no: "خیر", yes: "بله" }),
            ),
          );
          if (v.catalogHasFee === "yes") {
            fields.push(
              ref(
                "catalogFeeMode",
                "نوع کارمزد",
                null,
                choices({
                  fixed: "ثابت؛ تعیین در معرفی کالا",
                  variable: "متغیر؛ ورود در سند",
                }),
              ),
            );
            fields.push(ref("catalogFeeBasis", "مبنای کارمزد", null, choices({weightPercent: "درصدی از وزن کالا در فاکتور", perPiece: "مبلغ به‌ازای هر عدد"})));
            if (v.catalogFeeMode === "fixed")
              fields.push(
                text(
                  "catalogFeeValue",
                  v.catalogFeeBasis === "weightPercent" ? "درصد ثابت از وزن فاکتور" : "مبلغ ثابت هر عدد (تومان)",
                  "text",
                  true,
                ),
              );
          }
        }
      }
      if(kind==="goods")fields.push(ref("groupId", "گروه کالا", "groups"));
      if (
        ![
          "funds",
          "bankAccounts",
          "bankInstitutions",
          "expenses",
          "expenseGroups",
          "incomes",
          "incomeSources",
          "goods",
          "materials",
          "tags",
          "units",
        ].includes(kind)
      ) {
        fields.push({ key: "tags", label: "برچسب‌ها", type: "tags" });
        fields.push(text("active", "فعال", "checkbox"));
      }
      return fields;
    }
    function edit(kind, item, preset = {}, afterSave, options = {}) {
      const d = el("dialog"),
        title = el("h3", (item ? "ویرایش " : "ایجاد ") + names[kind]),
        form = el("form"),
        grid = el("div", null, "n-grid"),
        error = el("div");
      let values = {
        active: true,
        ...(kind === "goods"
          ? {
              catalogMode: "count",
              variablePurity221:"no",
              catalogHasFee: "no",
              catalogFeeMode: "fixed",
              catalogFeeBasis: "perPiece",
            }
          : {}),
        ...(kind === "tags" ? { color: "#287d66" } : {}),
        ...(kind==="units"?{dimension:"count",decimals:0}:{}),
        ...(kind==="assets"?{decimals:"3"}:{}),
        ...(kind === "assets" ? {nature:"currency"} : {}),
        ...(kind === "incomes" ? { catalogNature: "currency" } : {}),
        ...clone(item || preset),
      };
      if(kind==="assets" && values.unitId)values.currencyCode=unit(values.unitId)?.currencyCode || "";
      if(kind==="goods") {
        if(typeof values.variablePurity221==="boolean")values.variablePurity221=values.variablePurity221?"yes":"no";
        if(!values.materialId)values.materialId=ledger.s.materials?.find(m=>norm(m.name)===norm(values.balanceMaterial220 || values.metal))?.id || "";
        if(!values.balanceMaterial220 && values.metal && values.metal!=="عیاردار")values.balanceMaterial220=values.metal;
        const mode=values.catalogMode==="count"?"count":"weight";
        values.catalogUnitId=ledger.catalogUnit219(values)?.id || "";
        values.catalogRateUnitId ||= values.rateUnitId || values.catalogUnitId;
        values.catalogPieceUnitId ||= active("units").find(u=>u.dimension==="weight" && dec(u.factor || "0")===dec("1"))?.id;
      }
      if (kind === "bankAccounts") {
        values.legacyKind = "banks";
        values.typeId = "currency";
        values.nature = "currency";
        values.bankId = values.bankId || filter.bankId || "";
      }
      if (kind === "people" && filter.groupId) values.groupId = filter.groupId;
      const draw = () => {
        grid.replaceChildren();
        for (const spec of schema(kind, values).filter(spec=>!options.nameOnly || spec.key === "name")) {
          let control;
          if (spec.type === "select") {
            const items = [...spec.items];
            const selected = values[spec.key];
            if (
              selected &&
              !items.some((x) => (x.id || x.value) === selected)
            ) {
              const old = Object.values(ledger.s)
                .filter(Array.isArray)
                .flat()
                .find((x) => x?.id === selected);
              if (old)
                items.push({
                  id: old.id,
                  name:
                    old.name +
                    (old.active === false ? " (غیرفعال)" : " (مقدار قبلی)"),
                });
            }
            control = select(items, selected);
          } else if (spec.type === "checkbox") {
            control = input("", "checkbox");
            control.checked = !!values[spec.key];
          } else if (spec.type === "tags") {
            control = el("div", null, "n-chips");
            for (const t of ledger.s.tags.filter(
              (t) => t.active !== false || (values.tags || []).includes(t.id),
            )) {
              const c = input("", "checkbox");
              c.checked = (values.tags || []).includes(t.id);
              c.onchange = () => {
                values.tags = [
                  ...(values.tags || []).filter((id) => id !== t.id),
                  ...(c.checked ? [t.id] : []),
                ];
              };
              const l = field(t.name, c);
              l.className = "n-choice";
              l.append(chip(t.id));
              control.append(l);
            }
          } else {
            control = input(values[spec.key] ?? "", spec.type);
            if (spec.type === "number") {
              control.min = "0";
              control.max = "8";
            }
          }
          control.id = "n-" + spec.key;
          if(["factor","decimals","catalogPurity","catalogPieceWeight","catalogFeeValue"].includes(spec.key))control.dataset.numeric217="true";
          if (spec.required) control.required = true;
          if (!["tags"].includes(spec.type)) {
            control.oninput = () => {
              values[spec.key] =
                spec.type === "checkbox" ? control.checked : control.value;
              if (kind === "tags") preview();
            };
            control.onchange = () => {
              values[spec.key] =
                spec.type === "checkbox" ? control.checked : control.value;
              if (
                [
                  "variablePurity221",
                  "catalogUnitId",
                  "catalogMode",
                  "catalogHasFee",
                  "catalogFeeMode",
                  "catalogFeeBasis",
                  "mode",
                  "nature",
                  "dimension",
                  "groupId",
                  "assetId",
                  "assetTypeId",
                  "unitId",
                  "feeMode",
                  "metal",
                ].includes(spec.key)
              ) {
                if(spec.key==="catalogMode") {
                  const d=values.catalogMode==="count"?"count":"weight";
                  values.catalogUnitId=active("units").find(u=>u.dimension===d && (d==="count"?u.decimals===0:dec(u.factor || "0")===dec("1")))?.id || "";
                  values.catalogRateUnitId=values.catalogUnitId;
                }
                if(spec.key==="catalogUnitId" && values.catalogMode==="count")values.catalogRateUnitId=values.catalogUnitId;
                if (spec.key === "assetTypeId" && values.assetTypeId) {
                  values.mode = ledger.find(
                    "assetTypes",
                    values.assetTypeId,
                  ).mode;
                  values.unitId = "";
                  values.rateUnitId = "";
                  values.feeMode = "none";
                }
                if (spec.key === "groupId") {
                  values.headId = "";
                  values.parentId = "";
                  values.subgroupId = "";
                }
                if (spec.key === "mode") {
                  values.assetTypeId = "";
                  values.unitId = "";
                  values.rateUnitId = "";
                  values.feeMode = "none";
                  if (values.mode === "currency") {
                    values.metal = "";
                    values.purity = "";
                  }
                }
                draw();
              }
            };
          }
          const label = field(spec.label, control);
          grid.append(label);
          if (spec.key === "color") {
            const picker = input(
              /^#[0-9a-f]{6}$/i.test(values.color) ? values.color : "#287d66",
              "color",
            );
            picker.setAttribute("aria-label", "انتخاب رنگ از پالت");
            picker.oninput = () => {
              values.color = picker.value;
              control.value = picker.value;
              preview();
            };
            label.append(picker);
            control.addEventListener("input", preview);
          }
        }
        if (kind === "tags") preview();
      };
      let previewEl = el("span", null, "n-chip");
      function preview() {
        previewEl.textContent = values.name || "پیش‌نمایش برچسب";
        previewEl.style.background = /^#[0-9a-f]{6}$/i.test(values.color)
          ? values.color
          : "#eeeeee";
        previewEl.style.color = "#111";
        const rgb = values.color
          ?.slice(1)
          .match(/../g)
          ?.map((x) => parseInt(x, 16));
        if (rgb?.length === 3)
          previewEl.style.color =
            (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 150
              ? "#111"
              : "#fff";
      }
      draw();
      const save = el("button", "ذخیره", "primary");
      save.type = "submit";
      form.append(
        grid,
        el("span"),
        error,
        bar(
          save,
          btn("انصراف", () => d.close()),
        ),
      );
      form.onsubmit = (e) => {
        e.preventDefault();
        try {
          if (kind === "goods" && values.mode === "currency")
            values.feeMode = "none";
          if (kind === "bankAccounts")
            values.name =
              name("bankInstitutions", values.bankId) +
              " / " +
              values.accountNumber +
              " / " +
              name("assets", values.assetId);
          if (options.nameOnly && kind === "expenses") values.groupId = preset.groupId;
          const saved = saveCatalog(kind, values);
          d.close();
          const focusAfterSave = afterSave ? afterSave(saved) : null;
          render();
          if (typeof focusAfterSave === "string") document.getElementById(focusAfterSave)?.focus();
          message("اطلاعات ذخیره شد");
        } catch (e) {
          error.className = "n-error";
          error.textContent = e.message;
        }
      };
      d.append(title, form);
      host.append(d);
      d.onclose = () => d.remove();
      d.showModal();
    }
    function saveCatalog(kind, values) {
      if(kind==="units") {
        const old=values.id?ledger.find("units",values.id):null,x={...clone(values),decimals:old?.decimals ?? (values.dimension==="count"?0:8)};
        if(!old && x.dimension!=="weight"){x.factor=null;x.reference="";}
        return ledger.put("units",x);
      }
      if (kind === "goods") {
        const x = clone(values);
        x.name = String(x.name || "").trim();
        for(const key of ["catalogPurity","catalogPieceWeight","catalogFeeValue"])if(x[key]!==undefined && x[key]!=="")x[key]=str(dec(x[key]));
        if (!norm(x.name)) throw Error("نام کالا الزامی است");
        ledger.find(
          "groups",
          x.groupId,
          !records("goods").some(
            (g) => g.id === x.id && g.groupId === x.groupId,
          ),
        );
        if(["weight","weightCount"].includes(x.catalogMode)) {
          const previous=ledger.s.goods.find(g=>g.id===x.id),material=previous?.balanceMaterial220 || (previous?.metal!=="عیاردار"?previous?.metal:"");
          x.balanceMaterial220=ledger.find("materials",x.materialId,true).name;
          if(!x.balanceMaterial220)throw Error("جنس دارایی را برای تفکیک طلا، نقره و سایر دارایی‌ها مشخص کنید");
          if(previous && material && ledger.used("goods",x.id) && norm(material)!==norm(x.balanceMaterial220))throw Error("جنس کالای دارای سابقه متفاوت است؛ کالای تازه معرفی کنید");
        }
        if (!["count", "weight", "weightCount"].includes(x.catalogMode))
          throw Error("نوع کالا را انتخاب کنید");
        x.variablePurity221=x.variablePurity221==="yes" || x.variablePurity221===true;
        if (
          !x.variablePurity221 && ["weight", "weightCount"].includes(x.catalogMode) &&
          (dec(x.catalogPurity) <= 0n || dec(x.catalogPurity) > dec("1000"))
        )
          throw Error("عیار باید بیشتر از صفر و حداکثر ۱۰۰۰ باشد");
        if (x.catalogMode === "weightCount" && dec(x.catalogPieceWeight) <= 0n)
          throw Error("وزن هر قطعه باید مثبت باشد");
        if (
          x.catalogHasFee === "yes" &&
          x.catalogFeeMode === "fixed" &&
          dec(x.catalogFeeValue) < 0n
        )
          throw Error("کارمزد نمی‌تواند منفی باشد");
        if (x.catalogHasFee === "yes" && !["perPiece", "weightPercent"].includes(x.catalogFeeBasis)) throw Error("مبنای کارمزد را انتخاب کنید");
        if (x.catalogHasFee === "yes" && x.catalogFeeMode === "fixed" && x.catalogFeeBasis === "weightPercent" && dec(x.catalogFeeValue) > dec("100")) throw Error("درصد کارمزد نباید بیش از ۱۰۰ باشد");
        if (
          records("goods").some(
            (g) =>
              g.id !== x.id &&
              g.groupId === x.groupId &&
              norm(g.name) === norm(x.name),
          )
        )
          throw Error("نام کالا در همین گروه تکراری است");
        ledger.transaction(() => {
          ledger.s.catalogGoods ||= [];
          const old = ledger.s.catalogGoods.find((g) => g.id === x.id);
          const before = clone(old || null);
          x.id ||= uid();
          x.updated = new Date().toISOString();
          x.feeCurrency221="IRT";
          x.catalogOnly = !ledger.s.goods.some((g) => g.id === x.id);
          if (old) Object.assign(old, x);
          else ledger.s.catalogGoods.push(x);
          ledger.catalogGood217(x.id);
          ledger.audit("catalog-save", "goods", x.id, before, x);
        });
        return clone(x);
      }
      if(kind==="assets")return ledger.transaction(()=>{
        const x=clone(values);if(norm(x.name)==="ریال" || String(x.currencyCode || "").toUpperCase()==="IRR")throw Error("ریال از ارزهای عملیاتی حذف شده است؛ از تومان استفاده کنید");x.nature="currency";x.decimals=Number(norm(x.decimals).replace(/[,٬]/g,""));
        if(!x.unitId) {
          const u=ledger.put("units",{name:x.name,dimension:"currency",decimals:x.decimals,currencyCode:String(x.currencyCode || x.symbol || "").toUpperCase(),active:true});x.unitId=u.id;
        }
        if(values.unitId){const u=ledger.find("units",values.unitId);ledger.put("units",{...u,name:x.name,decimals:x.decimals,currencyCode:String(x.currencyCode || u.currencyCode || "").toUpperCase()});}
        return ledger.put("assets",x);
      });
      return ledger.put(modelKind(kind), values);
    }
    function catalogGood(x) {
      return {
        ...x,
        catalogUnitId:x.unitId,catalogRateUnitId:x.rateUnitId || x.unitId,catalogPieceUnitId:x.standardWeightUnitId,
        catalogMode: x.standardWeight
          ? "weightCount"
          : x.mode === "weight"
            ? "weight"
            : "count",
        catalogPurity: x.purity || "",
        catalogPieceWeight: x.standardWeight || "",
        catalogHasFee: ["fixed", "variable", "gold"].includes(x.feeMode) ? "yes" : "no",
        catalogFeeBasis: x.feeMode === "gold" ? "weightPercent" : "perPiece",
        catalogFeeMode: x.feeMode === "variable" ? "variable" : "fixed",
        catalogFeeValue:
          x.feeMode === "gold" ? x.feePercent : x.feeMode === "fixed" ? mul(x.feeValue || "0", "10") : "",
        ...((ledger.s.catalogGoods || []).find((g) => g.id === x.id) || {}),
      };
    }
    const modelKind = (kind) => (kind === "bankAccounts" ? "funds" : kind);
    const records = (kind) =>
      kind === "goods"
        ? [
            ...ledger.s.goods.filter(g=>g.mode!=="currency").map(catalogGood),
            ...(ledger.s.catalogGoods || []).filter(
              (g) => g.mode!=="currency" && !ledger.s.goods.some((old) => old.id === g.id),
            ),
          ]
        : kind === "bankAccounts"
          ? ledger.s.funds.filter((f) => f.legacyKind === "banks")
          : kind === "assets" ? ledger.s.assets.filter(a=>a.nature==="currency" && !ledger.s.toman221?.rialAssets.includes(a.id)) : kind==="units"?ledger.s.units.filter(u=>u.dimension!=="currency"):ledger.s[kind];
    function catalog() {
      const search = input(filter.q || "");
      search.placeholder = "جست‌وجو بر اساس نام یا کد";
      search.setAttribute("aria-label", "جست‌وجو");
      const filters = bar(search);
      let ids = [];
      if (tab === "funds") ids = [["typeId", "fundTypes", "همهٔ انواع"]];
      if (tab === "bankAccounts")
        ids = [
          ["bankId", "bankInstitutions", "همهٔ بانک‌ها"],
          ["assetId", "assets", "همهٔ واحدهای پول"],
        ];
      if (tab === "people")
        ids = [["groupId", "peopleGroups", "انتخاب گروه افراد"]];
      if (["expenses", "expenseHeads"].includes(tab))
        ids = [["groupId", "expenseGroups", "همهٔ دسته‌ها"]];
      if (tab === "goods") ids = [["groupId", "groups", "همهٔ گروه‌ها"]];
      for (const [key, kind, label] of ids) {
        const s = select(fieldOptions(kind, true), filter[key], label);
        s.setAttribute("aria-label", label);
        s.onchange = () => {
          filter[key] = s.value;
          render();
        };
        filters.append(s);
      }
      const state = select(
        choices({ all: "همهٔ وضعیت‌ها", yes: "فعال", no: "غیرفعال" }),
        filter.state || "all",
        null,
      );
      state.setAttribute("aria-label", "فیلتر وضعیت");
      state.onchange = () => {
        filter.state = state.value;
        render();
      };
      filters.append(state);
      host.append(
        card(
          el("h3", names[tab]),
          filters,
          bar(btn("ایجاد مورد جدید", () => edit(tab), "primary")),
        ),
      );
      if (tab === "goods")
        host.append(
          el(
            "p",
            "این مرحله فقط معرفی کالاهاست. مشخصات جدید پس از اتصال بخش‌ها در اسناد و محاسبات استفاده می‌شوند؛ فرمول‌های فعلی تغییر نکرده‌اند.",
            "n-notice",
          ),
        );
      if (tab === "people") {
        host.append(
          bar(
            ...ledger.s.peopleGroups.map((g) =>
              btn(
                g.name +
                  " (" +
                  f(ledger.s.people.filter((p) => p.groupId === g.id).length) +
                  ")",
                () => {
                  filter.groupId = g.id;
                  render();
                },
              ),
            ),
          ),
        );
        if (!filter.groupId) {
          host.append(
            el(
              "p",
              "ابتدا گروه افراد را انتخاب کنید؛ ثبت فرد جدید نیز در همان گروه انجام می‌شود.",
              "n-notice",
            ),
          );
          host.querySelectorAll("button").forEach((b) => {
            if (b.textContent === "ایجاد مورد جدید") b.disabled = true;
          });
          return;
        }
      }
      const result = el("div");if(tab==="goods")result.id="goods223-list";
      host.append(result);
      function rows() {
        let list = records(tab).filter(
          (x) =>
            (tab !== "funds" || x.legacyKind !== "banks") &&
            (!filter.q ||
              norm(
                x.name + " " + (x.code || "") + " " + (x.accountNumber || ""),
              ).includes(norm(filter.q))) &&
            (!filter.color || norm(x.color) === norm(filter.color)) &&
            (filter.state === "yes"
              ? x.active !== false
              : filter.state === "no"
                ? x.active === false
                : true) &&
            ids.every(([key]) => !filter[key] || x[key] === filter[key]),
        );
        const usage = (id) =>
          ledger.s.documents.filter((d) => d.tags?.includes(id)).length +
          Object.entries(ledger.s)
            .filter(
              ([kind, list]) =>
                kind !== "documents" && kind !== "audit" && Array.isArray(list),
            )
            .reduce(
              (n, [, list]) =>
                n + list.filter((x) => x.tags?.includes(id)).length,
              0,
            );
        if (tab === "tags")
          list.sort((a, b) =>
            filter.sort === "used"
              ? usage(b.id) - usage(a.id)
              : String(a[filter.sort || "name"] || "").localeCompare(
                  String(b[filter.sort || "name"] || ""),
                  "fa",
                ),
          );
        const descriptions = (x) =>
          tab === "bankAccounts"
            ? name("bankInstitutions", x.bankId) +
              " · شماره حساب: " +
              (x.accountNumber || "تعیین نشده") +
              " · واحد: " +
              name("assets", x.assetId)
            : tab === "bankInstitutions"
              ? "تعداد حساب‌ها: " +
                f(
                  ledger.s.funds.filter(
                    (a) => a.legacyKind === "banks" && a.bankId === x.id,
                  ).length,
                )
              : tab === "funds"
                ? name("fundTypes", x.typeId)
                : tab === "people"
                  ? name("peopleGroups", x.groupId)
                  : tab === "expenses"
                    ? name("expenseGroups", x.groupId)
                    : tab === "expenseHeads"
                      ? name("expenseGroups", x.groupId) +
                        (x.parentId
                          ? " / " + name("expenseHeads", x.parentId)
                          : "")
                      : tab === "incomes"
                        ? ""
                        : tab === "goods"
                          ? name("groups", x.groupId) +
                            " · " +
                            ({
                              count: "تعدادی",
                              weight: "وزنی",
                              weightCount: "وزنی–تعدادی",
                            }[x.catalogMode] || "") + " · واحد مقدار: " + name("units",x.catalogUnitId) + " · نرخ به‌ازای: " + name("units",x.catalogRateUnitId) +
                            (x.catalogPurity
                              ? " · عیار " + f(x.catalogPurity)
                              : "") +
                            (x.catalogMode === "weightCount"
                              ? " · هر قطعه " + f(x.catalogPieceWeight) + " " + name("units",x.catalogPieceUnitId)
                              : "") +
                            (x.catalogHasFee === "yes"
                              ? x.catalogFeeMode === "fixed"
                                ? " · کارمزد ثابت " + f(x.catalogFeeValue) + (x.catalogFeeBasis === "weightPercent" ? " درصد از وزن فاکتور" : " تومان هر عدد")
                                : " · کارمزد متغیر " + (x.catalogFeeBasis === "weightPercent" ? "درصدی از وزن فاکتور" : "مبلغ هر عدد") + " در سند"
                              : "")
                          : tab === "units"
                            ? dims[x.dimension] + (x.dimension==="weight"?" · هر واحد = "+amount219(x.factor,"گرم")+" گرم":"")
                            : tab === "assets"
                              ? (x.nature === "currency" ? "ارزی" : "کالایی") +
                                " · " +
                                name("units", x.unitId)
                              : x.description || "";
        const simpleCatalog = [
          "funds",
          "bankAccounts",
          "bankInstitutions",
          "expenses",
          "expenseGroups",
          "incomes",
          "incomeSources",
          "goods",
          "materials",
          "tags",
        ].includes(tab);
        result.replaceChildren(
          table(
            tab === "tags"
              ? ["نام", "وضعیت"]
              : [
                  "نام",
                  ...(tab==="goods"?["گروه کالا"]:[]),
                  "مشخصات / دسته‌بندی",
                  "وضعیت",
                  ...(!simpleCatalog ? ["برچسب‌ها"] : []),
                ],
            list.map((x) => ({
              item: x,
              cells:
                tab === "tags"
                  ? [x.name, x.active === false ? "غیرفعال" : "فعال"]
                  : [
                      x.name,
                      ...(tab==="goods"?[name("groups",x.groupId)]:[]),
                      descriptions(x),
                      x.active === false ? "غیرفعال" : "فعال",
                      ...(!simpleCatalog ? [tags(x.tags)] : []),
                    ],
            })),
            (x) =>
              bar(
                btn("ویرایش", () => edit(tab, x)),
                btn(x.active === false ? "فعال‌سازی" : "غیرفعال‌سازی", () => {
                  if (
                    tab === "goods" &&
                    ledger.s.goods.some((g) => g.id === x.id)
                  ) {
                    ledger.put("goods", {
                      ...ledger.find("goods", x.id),
                      active: x.active === false,
                    });
                    const draft = (ledger.s.catalogGoods || []).find(
                      (g) => g.id === x.id,
                    );
                    if (draft)
                      ledger.transaction(() => {
                        draft.active = x.active === false;
                        ledger.audit(
                          "catalog-status",
                          "goods",
                          x.id,
                          x.active,
                          draft.active,
                        );
                      });
                    render();
                    return;
                  }
                  saveCatalog(tab, {
                    ...x,
                    active: x.active === false,
                  });
                  render();
                }),
                (() => {
                  const used = ledger.used(modelKind(tab), x.id),
                    remove = btn(
                      "حذف",
                      () => {
                        if (confirm("«" + x.name + "» حذف شود؟")) {
                          if (
                            tab === "goods" &&
                            (ledger.s.catalogGoods || []).some(
                              (g) => g.id === x.id,
                            )
                          ) {
                            ledger.transaction(() => {
                              if (ledger.used("goods", x.id))
                                throw Error("دارای سند یا ارتباط است");
                              if (ledger.s.goods.some((g) => g.id === x.id))
                                ledger.s.goods = ledger.s.goods.filter(
                                  (g) => g.id !== x.id,
                                );
                              ledger.s.catalogGoods =
                                ledger.s.catalogGoods.filter(
                                  (g) => g.id !== x.id,
                                );
                              ledger.audit("delete", "goods", x.id, x, null);
                            });
                          } else ledger.remove(modelKind(tab), x.id);
                          render();
                        }
                      },
                      "danger",
                    );
                  remove.disabled = used;
                  remove.title = used
                    ? "دارای سند یا ارتباط است؛ فقط ویرایش یا غیرفعال‌سازی مجاز است"
                    : "حذف مورد استفاده‌نشده";
                  return remove;
                })(),
                ...(tab === "bankInstitutions"
                  ? [
                      btn("مشاهده حساب‌ها", () => {
                        tab = "bankAccounts";
                        filter = { bankId: x.id };
                        render();
                      }),
                    ]
                  : []),
                ...(tab === "tags"
                  ? [
                      btn("اسناد مرتبط", () => {
                        go("reports");
                        filter.tags = [x.id];
                        render();
                      }),
                    ]
                  : []),
              ),
          ),
        );
      }
      search.oninput = () => {
        filter.q = search.value;
        rows();
      };
      rows();
    }
    function common(values, container) {
      const date = input(
        values.date || new Date().toISOString().slice(0, 10),
        "date",
      );
      date.required = true;
      date.oninput = () => (values.date = date.value);
      const notes = el("textarea");
      notes.value = values.notes || "";
      notes.oninput = () => (values.notes = notes.value);
      container.append(
        field("تاریخ (نمایش تقویم دستگاه)", date),
        field("توضیحات", notes),
      );
      const ts = el("div", null, "n-chips");
      for (const t of ledger.s.tags.filter(
        (t) => t.active !== false || (values.tags || []).includes(t.id),
      )) {
        const c = input("", "checkbox");
        c.checked = (values.tags || []).includes(t.id);
        c.onchange = () => {
          values.tags = [
            ...(values.tags || []).filter((x) => x !== t.id),
            ...(c.checked ? [t.id] : []),
          ];
        };
        const l = field(t.name, c);
        l.className = "n-choice";
        l.append(chip(t.id));
        ts.append(l);
      }
      container.append(field("برچسب‌های سند", ts));
      const rowTags = el("div", null, "n-chips");
      for (const tag of ledger.s.tags.filter(t => t.active !== false || (values.lineTags || []).includes(t.id))) {
        const check = input("", "checkbox"); check.checked = (values.lineTags || []).includes(tag.id);
        check.onchange = () => { values.lineTags = [...(values.lineTags || []).filter(id => id !== tag.id), ...(check.checked ? [tag.id] : [])]; };
        const label = field(tag.name, check); label.className = "n-choice"; rowTags.append(label);
      }
      container.append(field("برچسب‌های سطر عملیات", rowTags), btn("ایجاد برچسب جدید", () => edit("tags")));
    }
    function incomeDialog(receipt) {
      const d = el("dialog"), form = el("form"), grid = el("div", null, "n-grid"), error = el("div", "", "n-error");
      const v = {token: uid(), date: new Date().toISOString().slice(0,10), tags: []};
      const fieldInput = (key, label, options) => {
        const control = options ? select(options) : input("");
        control.id = "n-income-" + key; control.required = true;
        control.oninput = control.onchange = () => {v[key] = control.value;};
        grid.append(field(label,control)); return control;
      };
      if (!receipt) {
        fieldInput("income", "نام درآمد", fieldOptions("incomes"));
        fieldInput("person", "شخص یا فروشگاه بدهکار", fieldOptions("people"));
        fieldInput("good", "دارایی طلب", fieldOptions("goods"));
        fieldInput("quantity", "مقدار طلب به واحد دارایی انتخاب‌شده");
      } else {
        const claims = ledger.s.documents.filter(x => x.type === "incomeClaim" && !ledger.s.documents.some(r => r.reversalOf === x.id));
        const claimControl = fieldInput("claim", "طلب درآمدی", claims.filter(x=>dec(ledger.incomeRemaining(x.id))>0n).map(x=>({id:x.id,name:name("incomes",x.income)+" · "+name("people",x.person)+" · مانده "+f(ledger.incomeRemaining(x.id))+" "+name("goods",x.good)})));
        const actualGood = fieldInput("good", "دارایی دریافت‌شده", fieldOptions("goods"));
        fieldInput("quantity", "مقدار دریافت‌شده به واحد دارایی انتخاب‌شده");
        fieldInput("fund", "صندوق یا حساب بانکی مقصد", fieldOptions("funds").concat(fieldOptions("banks")));
        const rate = fieldInput("rate", "نرخ توافق: هر واحد دارایی دریافتی معادل چند واحد از دارایی طلب است؟");
        const agreement = fieldInput("agreement", "شرح توافق تبدیل، اگر دارایی متفاوت است");
        rate.required = false; agreement.required = false;
        grid.append(el("p", "برای دریافت همان دارایی نیازی به نرخ نیست. برای دارایی متفاوت، نرخ و توافق تبدیل الزامی است.", "n-muted"));
        claimControl.addEventListener("change",()=>{const claim=claims.find(x=>x.id===claimControl.value);if(claim){actualGood.value=claim.good;v.good=claim.good;}});
      }
      common(v, grid);
      const submit = el("button", "ثبت", "primary"); submit.type="submit"; submit.disabled=migrationNotice;
      form.append(grid,error,bar(submit,btn("انصراف",()=>d.close())));
      form.onsubmit=e=>{e.preventDefault();try{if(migrationNotice)throw Error("ابتدا مانده‌های انتقالی را بررسی کنید");const doc=receipt?ledger.receiveIncome(v):ledger.claimIncome(v);d.close();render();showDocument(doc.id);}catch(e){error.textContent=e.message;}};
      d.append(el("h3",receipt?"دریافت کامل یا بخشی از طلب درآمدی":"ثبت طلب درآمدی بدون افزایش موجودی"),form);host.append(d);d.onclose=()=>d.remove();d.showModal();
    }
    function operations() {
      host.append(bar(btn("ثبت طلب درآمدی", () => incomeDialog(false)), btn("دریافت طلب درآمدی", () => incomeDialog(true))));
      const incomeClaims = ledger.s.documents.filter(d => d.type === "incomeClaim" && !ledger.s.documents.some(r => r.reversalOf === d.id));
      if (incomeClaims.length) host.append(card(el("h3", "طلب‌ها و دریافت‌های درآمدی"), table(["درآمد", "بدهکار", "دارایی", "اصل طلب", "دریافت‌شده", "مانده"], incomeClaims.map(d=>({cells:[name("incomes",d.income),name("people",d.person),name("goods",d.good),f(d.quantity),f(sub(d.quantity,ledger.incomeRemaining(d.id))),f(ledger.incomeRemaining(d.id))]})))));
      const mode = filter.op || "buy",
        type = select(
          choices(types).filter((x) => !["legacy", "reversal", "incomeClaim", "incomeReceipt"].includes(x.id)),
          mode,
          null,
        );
      type.id = "n-operation-type";
      type.onchange = () => {
        filter.op = type.value;
        render();
      };
      host.append(
        card(
          field("نوع عملیات", type),
          el(
            "p",
            "ثبت خرید و فروش فقط تعهد ایجاد می‌کند. ورود یا خروج موجودی با «تحویل واقعی» و دریافت یا پرداخت وجه با «تسویه مالی» ثبت می‌شود. مانده مثبت شخص یعنی طلب ما؛ مانده منفی یعنی بدهی ما.",
            "n-muted",
          ),
        ),
      );
      const form = el("form"),
        grid = el("div", null, "n-grid"),
        v = {
          type: mode,
          token: uid(),
          tags: [],
          date: new Date().toISOString().slice(0, 10),
          ...(mode === "payment" ? { component: "money" } : {}),
        };
      let g;
      function sel(key, label, items, onchange) {
        const s = select(items, v[key]);
        s.id = "n-op-" + key;
        grid.append(field(label, s));
        s.onchange = () => {
          v[key] = s.value;
          if (onchange) onchange(s);
        };
        return s;
      }
      function txt(key, label, type = "text") {
        const n = input(v[key] || "", type);
        n.id = "n-op-" + key;
        grid.append(field(label, n));
        n.oninput = () => {
          v[key] = n.value;
          preview();
        };
        return n;
      }
      const goodsList = active("goods");
      let fundControl, lotControl;
      function fundOptions() {
        return active("funds").filter(
          (x) =>
            g &&
            x.nature === ledger.find("assets", g.assetId).nature &&
            (!x.assetId || x.assetId === g.assetId),
        );
      }
      function refreshLots() {
        if (!lotControl) return;
        lotControl.replaceChildren(
          ...select(
            g && v.fund
              ? ledger.lots(v.fund, g.id).map((x) => ({
                  id: x.id,
                  name:
                    (x.mark || x.id) +
                    " · " +
                    f(x.quantity) +
                    " · عیار " +
                    f(x.purity) +
                    " · " +
                    (x.assay || ""),
                }))
              : [],
          ).children,
        );
        v.lot = "";
      }
      const reversed = (id) =>
        ledger.s.documents.some((x) => x.reversalOf === id);
      if (mode === "exchange") {
        sel("person", "شخص", fieldOptions("people"));
        sel("good", "دارایی اول (ماندهٔ بدهکار یا بستانکار)", goodsList, () => {
          g = good(v.good);
          preview();
        });
        sel("toGood", "دارایی دوم با ماندهٔ مخالف", goodsList);
        txt("quantity", "مقدار تسویه از دارایی اول");
        txt("rate", "تعداد واحد دارایی دوم به‌ازای یک واحد دارایی اول");
        txt("rateSource", "منبع نرخ و توافق");
        txt("rateAt", "زمان نرخ", "datetime-local");
        const obs = ledger.s.documents
          .filter((d) => ["buy", "sell"].includes(d.type) && !reversed(d.id))
          .flatMap((d) =>
            ["goods", "money", "fee"]
              .filter((c) => dec(ledger.remaining(d.id, c)) !== 0n)
              .map((c) => ({
                id: d.id + "|" + c,
                name:
                  "#" +
                  f(d.number) +
                  " · " +
                  name("people", d.person) +
                  " · " +
                  name(
                    "goods",
                    d.entries.find((e) => e.component === c)?.good,
                  ) +
                  " · مانده " +
                  f(ledger.remaining(d.id, c)),
              })),
          );
        sel("fromObligation", "قلم فاکتور دارایی اول (برای طلا الزامی)", obs);
        sel("toObligation", "قلم فاکتور دارایی دوم (برای طلا الزامی)", obs);
      } else if (["delivery", "payment"].includes(mode)) {
        sel(
          "related",
          "معاملهٔ مرتبط",
          ledger.s.documents
            .filter((d) => ["buy", "sell"].includes(d.type) && !reversed(d.id))
            .map((d) => ({
              id: d.id,
              name:
                "#" +
                f(d.number) +
                " " +
                types[d.type] +
                " · " +
                name("people", d.person) +
                " · " +
                name("goods", d.good),
            })),
          () => {
            const d = ledger.find("documents", v.related);
            g = good(
              mode === "delivery"
                ? d.good
                : d.entries.find(
                    (e) => e.component === (v.component || "money"),
                  )?.good,
            );
            if (fundControl) {
              fundControl.replaceChildren(...select(fundOptions()).children);
              v.fund = "";
            }
            refreshLots();
            preview();
          },
        );
        if (mode === "payment")
          sel(
            "component",
            "جزء تسویه",
            choices({ money: "اصل مبلغ مالی", fee: "کارمزد مستقل" }),
            () => {
              if (v.related) {
                const d = ledger.find("documents", v.related);
                g = good(
                  d.entries.find((e) => e.component === v.component)?.good,
                );
                fundControl.replaceChildren(...select(fundOptions()).children);
                v.fund = "";
                preview();
              }
            },
          );
        fundControl = sel("fund", "صندوق / حساب واقعی", [], () => {
          refreshLots();
          preview();
        });
        lotControl = sel(
          "lot",
          "محموله برای تحویل خروجی (در صورت وزنی بودن)",
          [],
        );
        txt("quantity", "مقدار واقعی تحویل / تسویه");
        if (mode === "delivery") {
          txt("count", "تعداد قطعات (اطلاعات تکمیلی)");
          txt("actualWeight", "وزن واقعی (برای کالای مجاز)");
        }
        txt("purity", "عیار واقعی در ورود (مقیاس ۱۰۰۰)");
        txt("mark", "شماره ری‌گیری / انگ");
        txt("assay", "نام مرکز ری‌گیری");
      } else {
        sel("group", "گروه کالا", fieldOptions("groups"), () => {
          const list = goodsList.filter(
            (x) => !v.group || x.groupId === v.group,
          );
          goodSelect.replaceChildren(...select(list).children);
          v.good = "";
          g = null;
          preview();
        });
        const goodSelect = sel(
          "good",
          "کالا / دارایی تعریف‌شده",
          goodsList,
          () => {
            g = good(v.good);
            preview();
          },
        );
        if (["buy", "sell"].includes(mode)) {
          const personSelect = select([]);
          sel("personGroup", "گروه افراد", fieldOptions("peopleGroups"), () => {
            personSelect.replaceChildren(
              ...select(
                active("people").filter((p) => p.groupId === v.personGroup),
              ).children,
            );
            v.person = "";
          });
          personSelect.id = "n-op-person";
          personSelect.onchange = () => (v.person = personSelect.value);
          grid.append(field("شخص طرف معامله", personSelect));
          sel(
            "moneyGood",
            "دارایی پولی فاکتور",
            goodsList.filter((x) => x.mode === "currency"),
          );
          txt("rate", "نرخ هر واحد طبق معرفی کالا");
          txt("feeValue", "کارمزد متغیر هر قطعه (در صورت مجازبودن)");
          txt("feePercent", "درصد کارمزد اختصاصی سند (در صورت مجازبودن)");
        } else {
          const kinds = choices({
            people: "شخص",
            funds: "صندوق",
            banks: "بانک",
            expenses: "هزینه",
            incomes: "درآمد",
          });
          for (const side of ["from", "to"]) {
            if (mode === "opening" && side === "from") continue;
            const accountSelect = select([]);
            sel(
              side + "Kind",
              side === "from" ? "نوع مبدأ" : "نوع مقصد",
              kinds,
              () => {
                accountSelect.replaceChildren(
                  ...select(fieldOptions(v[side + "Kind"])).children,
                );
                v[side] = "";
              },
            );
            accountSelect.id = "n-op-" + side;
            accountSelect.onchange = () => {
              v[side] = accountSelect.value;
              if (side === "from") {
                v.fund = v.from;
                refreshMovementLots();
              }
            };
            grid.append(
              field(side === "from" ? "حساب مبدأ" : "حساب مقصد", accountSelect),
            );
          }
          sel(
            "agreement",
            "نوع توافق حواله",
            choices({
              settle: "تسویهٔ طلب از مبدأ و بدهی به مقصد",
              new: "کاهش طلب از مبدأ و ایجاد طلب از مقصد",
            }),
          );
          const ls = sel("lot", "انتخاب محمولهٔ موجود برای خروج", []);
          function refreshMovementLots() {
            ls.replaceChildren(
              ...select(
                g && v.from
                  ? ledger.lots(v.from, g.id).map((x) => ({
                      id: x.id,
                      name:
                        (x.mark || x.id) +
                        " · " +
                        f(x.quantity) +
                        " · عیار " +
                        f(x.purity),
                    }))
                  : [],
              ).children,
            );
            v.lot = "";
          }
          goodSelect.addEventListener("change", refreshMovementLots);
          txt("mark", "شماره ری‌گیری / انگ در ورود");
          txt("assay", "نام مرکز ری‌گیری در ورود");
        }
        if (["receive", "pay"].includes(mode)) {
          txt("feeValue", "کارمزد متغیر هر قطعه (در صورت مجازبودن)");
          txt("feePercent", "درصد کارمزد اختصاصی سند (در صورت مجازبودن)");
        }
        txt("quantity", "مقدار اصلی (واحد طبق کالا)");
        txt("count", "تعداد قطعات (برای وزن استاندارد یا کارمزد هر قطعه)");
        txt("actualWeight", "وزن واقعی (فقط برای کالای مجاز)");
        txt("purity", "عیار واقعی (در صورت فلزی بودن)");
      }
      const notice = el("p", null, "n-notice");
      function preview() {
        for (const key of [
          "count",
          "actualWeight",
          "purity",
          "mark",
          "assay",
          "feeValue",
          "feePercent",
          "lot",
        ]) {
          const control = grid.querySelector("#n-op-" + key);
          if (!control) continue;
          const show =
            !!g &&
            {
              count: g.mode !== "currency",
              actualWeight: g.mode === "weight" && g.allowActual,
              purity: g.mode === "weight" && !!g.metal,
              mark: g.mode === "weight" && !!g.metal,
              assay: g.mode === "weight" && !!g.metal,
              feeValue: g.feeMode === "variable",
              feePercent: g.feeMode === "gold" && g.allowFeeOverride,
              lot: g.mode === "weight" && !!g.metal,
            }[key];
          control.closest("label").hidden = !show;
        }
        try {
          if (!g) {
            notice.textContent = "کالا یا معامله را انتخاب کنید.";
            return;
          }
          let s =
            g.name +
            " · " +
            modes[g.mode] +
            " · واحد: " +
            name("units", g.unitId) +
            " · واحد نرخ: " +
            name("units", g.rateUnitId || g.unitId) +
            " · کارمزد: " +
            fees[g.feeMode || "none"];
          if (v.quantity || v.count || v.actualWeight) {
            const q = ledger.quantity(g, v);
            s += " | مقدار: " + f(q.quantity);
            if (q.standard) s += " | وزن استاندارد: " + f(q.standard);
            if (["buy", "sell"].includes(mode) && v.rate)
              s +=
                " | مبلغ پایه: " +
                f(
                  v.moneyGood
                    ? ledger.round(
                        mul(
                          ledger.convert(
                            q.quantity,
                            g.unitId,
                            g.rateUnitId || g.unitId,
                          ),
                          v.rate,
                        ),
                        good(v.moneyGood).unitId,
                      )
                    : mul(
                        ledger.convert(
                          q.quantity,
                          g.unitId,
                          g.rateUnitId || g.unitId,
                        ),
                        v.rate,
                      ),
                );
            if (["buy", "sell", "receive", "pay"].includes(mode))
              for (const fee of ledger.fee(g, q, v))
                s +=
                  " | کارمزد: " +
                  f(fee.quantity) +
                  " " +
                  name("units", good(fee.good)?.unitId);
          }
          if (v.related)
            s +=
              " | مانده تعهد: " +
              f(
                ledger.remaining(
                  v.related,
                  mode === "delivery" ? "goods" : v.component || "money",
                ),
              );
          notice.textContent = s;
        } catch (e) {
          notice.textContent = e.message;
        }
      }
      common(v, grid);
      const submit = el("button", "ثبت قطعی سند", "primary");
      submit.type = "submit";
      submit.disabled = migrationNotice;
      form.append(grid, notice, bar(submit));
      form.onsubmit = (e) => {
        e.preventDefault();
        run(() => {
          if (migrationNotice)
            throw Error("ابتدا مانده‌های انتقالی را بررسی کنید");
          let d;
          if (mode === "exchange") d = ledger.exchange(v);
          else if (["buy", "sell"].includes(mode)) d = ledger.trade(v);
          else if (mode === "delivery") d = ledger.delivery(v);
          else if (mode === "payment") d = ledger.payment(v);
          else d = ledger.movement(v);
          render();
          message("سند شماره " + f(d.number) + " ثبت شد");
          showDocument(d.id);
        });
      };
      host.append(card(form));
      preview();
      host.append(
        card(
          el("h3", "اسناد اخیر"),
          table(
            ["شماره", "تاریخ", "عملیات", "شرح"],
            ledger.s.documents
              .slice(-12)
              .reverse()
              .map((d) => ({
                item: d,
                cells: [f(d.number), d.date, types[d.type], d.notes],
              })),
            (d) => btn("مشاهده سند", () => showDocument(d.id)),
          ),
        ),
      );
    }
    function showBalance220(group) {
      const dialog=el("dialog");dialog.className="balance220-dialog";
      dialog.append(el("h3",group.name),el("p",amount219(group.quantity,group.unit,true)+" "+group.unit.name+" — "+ledger.label221(group.quantity,group.bucket)));
      dialog.append(table(["کالا / ارز","بانک / صندوق / طرف حساب","وزن / مقدار","واحد","تعداد","عیار","شناسه محموله","نشان / انگ","جزء"],group.details.map(d=>({cells:[d.name,name(group.bucket==="person"?"people":group.bucket==="expense"?"expenses":group.bucket==="income"?"incomes":"funds",d.account),amount219(d.quantity,d.unit,true),d.unit.name,d.hasCount?amount219(d.count):"—",f(d.purity),d.lot || "—",[d.mark,d.assay].filter(Boolean).join(" / ") || "—",d.component==="fee"?"کارمزد":"اصل دارایی"]}))));
      if(group.unclassified)dialog.append(el("p","برای تجمیع با کالاهای دیگر، جنس این دارایی را در معرفی کالا مشخص کنید.","n-notice"));
      dialog.append(btn("بستن",()=>dialog.close()));host.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
    }
    function balanceSummary220(entries,title,byAccount=false,id="") {
      const groups=ledger.aggregate221(entries,byAccount).filter(g=>dec(g.quantity)!==0n),block=card(el("h3",title));if(id)block.id=id;
      if(!groups.length){block.append(el("p",entries.length?"ماندهٔ این انتخاب تسویه است.":"گردشی برای این انتخاب ثبت نشده است.","n-muted"));return block;}
      if(id==="report220-balances") {
        const accounts=new Map();for(const g of groups){if(!accounts.has(g.account))accounts.set(g.account,[]);accounts.get(g.account).push(g);}
        for(const values of accounts.values()){const first=values[0];if(accounts.size>1)block.append(el("h4",name(first.bucket==="person"?"people":first.bucket==="expense"?"expenses":first.bucket==="income"?"incomes":"funds",first.account)));block.append(table(["مبنای مانده","عیار","مانده","واحد","وضعیت"],values.map(g=>({cells:[g.name,f(g.purity),amount219(g.quantity,g.unit,true),g.unit.name,ledger.label221(g.quantity,g.bucket)]}))));}
      } else block.append(table([...(byAccount?["طرف حساب"]:[]),"مبنای مانده","عیار","مانده","واحد","وضعیت"],groups.map(g=>({item:g,cells:[...(byAccount?[name(g.bucket==="person"?"people":g.bucket==="expense"?"expenses":g.bucket==="income"?"incomes":"funds",g.account)]:[]),g.name,f(g.purity),amount219(g.quantity,g.unit,true),g.unit.name,ledger.label221(g.quantity,g.bucket)]}))));
      if(groups.some(g=>g.unclassified))block.append(el("p","داراییِ بدون جنس مشخص، برای جلوگیری از اختلاط طلا و نقره جدا نمایش داده می‌شود؛ جنس آن را در معرفی کالا تعیین کنید.","n-notice"));
      return block;
    }
    function showDocument(id,options={}) {
      if (!id) return;
      const d = ledger.find("documents", id),
        dialog = el("dialog");
      dialog.append(
        el("h3", "سند " + f(d.invoiceNumber || d.number) + " · " + types[d.type]),
        el("p", d.date + " · " + d.notes),
        tags(d.tags),
      );
      if (d.reversalOf)
        dialog.append(
          el(
            "p",
            "برگشت سند " + f(ledger.find("documents", d.reversalOf).number),
          ),
        );
      const entries=d.entries.map(e=>({...e,document:d.id,snapshot:d.snapshots?.[e.good]}));
      dialog.append(table(["دفتر","حساب","کالا / دارایی","مبنای مانده","مقدار","واحد","تعداد","عیار","وضعیت","جزء"],entries.map(e=>{const normalized=ledger.view221(e);return {cells:[{stock:"موجودی",commitment:"تعهد",person:"حساب شخص",expense:"هزینه",income:"درآمد"}[e.bucket],accountName(e),d.snapshots[e.good]?.name || name("goods",e.good),normalized.name,amount219(normalized.quantity,normalized.unit,true),normalized.unit.name,normalized.count!==null?amount219(normalized.count):"—",f(normalized.purity),ledger.label221(normalized.quantity,e.bucket),e.component==="fee"?"کارمزد":"اصل"]};})));
      dialog.append(balanceSummary220(entries,"اثر این سند بر حساب‌ها",true));
      const affected=new Set(entries.map(e=>e.bucket+"|"+e.account));
      dialog.append(balanceSummary220(ledger.entries().filter(e=>affected.has(e.bucket+"|"+e.account)),"ماندهٔ نهایی حساب‌های این سند",true));
      if (d.unroundedBase && d.unroundedBase !== d.baseAmount)
        dialog.append(
          el(
            "p",
            "مبلغ محاسبه‌شده: " +
              f(d.unroundedBase) +
              "؛ مبلغ قابل ثبت با گردکردن نیم‌به‌بالا طبق دقت واحد پول: " +
              f(d.baseAmount),
            "n-notice",
          ),
        );
      if (d.fees?.length)
        dialog.append(
          el(
            "p",
            "اقلام کارمزد مستقل: " +
              d.fees
                .map((x) => f(x.quantity) + " " + name("goods", x.good))
                .join("، "),
          ),
        );
      if (["buy", "sell"].includes(d.type)) {
        dialog.append(
          el(
            "p",
            "مانده کالایی: " +
              f(ledger.remaining(d.id)) +
              " | مانده مالی: " +
              f(ledger.remaining(d.id, "money")) +
              " | کارمزد: " +
              f(ledger.remaining(d.id, "fee")),
          ),
        );
        if (d.type === "sell" && !options.readOnly)
          dialog.append(
            btn("رزرو موجودی برای این فروش", () => reserveForm(d)),
            btn("آزادسازی رزرو", () => {
              ledger.release(d.id);
              dialog.close();
              render();
            }),
          );
      }
      if (!options.readOnly && d.type !== "legacy" && !d.reversalOf)
        dialog.append(
          btn(
            "برگشت با حفظ تاریخچه",
            () => {
              const reason = prompt("علت برگشت سند:");
              if (reason) {
                ledger.reverse(d.id, reason, uid());
                dialog.close();
                render();
              }
            },
            "danger",
          ),
        );
      dialog.append(btn("بستن", () => dialog.close()));
      host.append(dialog);
      dialog.onclose = () => dialog.remove();
      dialog.showModal();
    }
    function reserveForm(d) {
      const dialog = el("dialog"),
        fund = select(
          active("funds").filter(
            (x) =>
              x.nature === ledger.find("assets", good(d.good).assetId).nature,
          ),
        ),
        q = input(""),
        error = el("div");
      dialog.append(
        el("h3", "رزرو موجودی برای فروش " + f(d.number)),
        field("صندوق", fund),
        field("مقدار رزرو", q),
        error,
        bar(
          btn("ثبت رزرو", () => {
            try {
              ledger.reserve({
                trade: d.id,
                fund: fund.value,
                quantity: q.value,
              });
              dialog.close();
              message("رزرو ثبت شد");
            } catch (e) {
              error.className = "n-error";
              error.textContent = e.message;
            }
          }),
          btn("انصراف", () => dialog.close()),
        ),
      );
      host.append(dialog);
      dialog.onclose = () => dialog.remove();
      dialog.showModal();
    }
    function accountName(e) {
      return ["stock", "commitment"].includes(e.bucket)
        ? name("funds", e.account)
        : e.bucket === "person"
          ? name("people", e.account)
          : e.bucket === "expense"
            ? name("expenses", e.account)
            : name("incomes", e.account);
    }
    function valuationForm() {
      const d = el("dialog"),
        g = select(fieldOptions("goods")),
        quote = select(active("goods").filter((g) => g.mode === "currency")),
        rate = input(""),
        source = input(""),
        at = input(new Date().toISOString().slice(0, 16), "datetime-local"),
        basis = select(
          choices({
            actual: "نرخ هر واحد واقعی کالا",
            basePurity: "نرخ هر گرم طلا با عیار مبنای فعلی",
          }),
          "actual",
          null,
        ),
        error = el("div");
      d.append(
        el("h3", "ثبت نرخ معتبر برای ارزش‌گذاری"),
        field("کالا / دارایی", g),
        field("ارز گزارش", quote),
        field("مبنای نرخ", basis),
        field("نرخ هر واحد در ارز گزارش", rate),
        field("منبع نرخ", source),
        field("زمان نرخ", at),
        error,
        bar(
          btn("ثبت نرخ", () => {
            try {
              ledger.valuation({
                good: g.value,
                quoteGood: quote.value,
                rate: rate.value,
                source: source.value,
                at: at.value,
                basis: basis.value,
              });
              d.close();
              render();
            } catch (e) {
              error.className = "n-error";
              error.textContent = e.message;
            }
          }),
          btn("انصراف", () => d.close()),
        ),
      );
      host.append(d);
      d.onclose = () => d.remove();
      d.showModal();
    }
    function inventory() {
      const control=select(ledger.s.funds.map(f=>({id:f.id,name:f.name})),filter.fund || "","همهٔ بانک‌ها و صندوق‌ها");control.onchange=()=>{filter.fund=control.value;render();};host.append(card(field("بانک / صندوق",control)));
      const entries=ledger.entries().filter(e=>e.bucket==="stock" && (!filter.fund || e.account===filter.fund)),map=new Map();
      for(const e of entries){const v=ledger.view221(e,true),key=[e.account,e.good,e.purity || "",e.lot || ""].join("|");let row=map.get(key);if(!row){row={key,account:e.account,good:e.good,quantity:"0",count:"0",hasCount:false,unit:v.unit,name:v.goodName,purity:v.actualPurity,mark:e.mark || "",assay:e.assay || "",lot:e.lot || ""};map.set(key,row);}row.quantity=add(row.quantity,v.quantity);if(v.count!==null){row.count=add(row.count,v.count);row.hasCount=true;}}
      const rows=[...map.values()].filter(r=>dec(r.quantity)!==0n);const listing=table(["نام کالا / ارز","بانک / صندوق","عیار واقعی","تعداد","وزن / موجودی","واحد","انگ","ری‌گیری"],rows.map(r=>({cells:[r.name,name("funds",r.account),f(r.purity),r.hasCount?amount219(r.count):"—",amount219(r.quantity,r.unit),r.unit.name,r.mark || "بدون انگ",r.assay || "—"]})));listing.id="inventory221-items";
      [...listing.querySelectorAll("tbody tr")].forEach((tr,i)=>{tr.tabIndex=0;tr.onclick=()=>inventoryHistory221(rows[i]);tr.onkeydown=e=>{if(e.key==="Enter")inventoryHistory221(rows[i]);};});host.append(listing,el("p","برای مشاهدهٔ دریافت و پرداخت هر کالا روی ردیف آن کلیک کنید. خرید و فروش به‌تنهایی موجودی را تغییر نمی‌دهد.","n-muted"));
    }
    function inventoryHistory221(row) {
      const dialog=el("dialog"),source=reportData(),entries=ledger.entries().filter(e=>e.bucket==="stock" && e.account===row.account && e.good===row.good && (e.purity || "")===row.purity && (e.lot || "")===row.lot);let balance="0";
      dialog.append(el("h3","گردش "+row.name),table(["تاریخ","فاکتور","عملیات","طرف حساب","دریافت","پرداخت","مانده","واحد","انگ","ری‌گیری"],entries.map(e=>{const v=ledger.view221(e,true);balance=add(balance,v.quantity);return {cells:[date221(e.date),f(ledger.s.documents.find(d=>d.id===e.document)?.invoiceNumber || ledger.s.documents.find(d=>d.id===e.document)?.number),types[e.type] || e.type,route221(e,source).party,dec(v.quantity)>0n?amount219(v.quantity,v.unit):"—",dec(v.quantity)<0n?amount219(sub("0",v.quantity),v.unit):"—",amount219(balance,v.unit),v.unit.name,e.mark || "—",e.assay || "—"]};})),btn("بستن",()=>dialog.close()));host.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
    }
    function accounts() {
      const group = select(
        fieldOptions("peopleGroups", true),
        filter.group,
        "همهٔ گروه‌ها",
      );
      group.onchange = () => {
        filter.group = group.value;
        filter.person = "";
        render();
      };
      const person = select(
        ledger.s.people.filter(
          (p) => !filter.group || p.groupId === filter.group,
        ),
        filter.person,
        "همهٔ اشخاص",
      );
      person.onchange = () => {
        filter.person = person.value;
        render();
      };
      host.append(
        bar(field("گروه افراد", group), field("شخص", person)),
        el(
          "p",
          "ماندهٔ مثبت: طلب ما از شخص؛ ماندهٔ منفی: بدهی ما به شخص. مانده‌های ناهمگون با هم جمع نمی‌شوند.",
          "n-notice",
        ),
      );
      const groups = new Map();
      for (const e of ledger.entries().filter((x) => x.bucket === "person")) {
        const p = ledger.s.people.find((x) => x.id === e.account);
        if (
          (filter.person && e.account !== filter.person) ||
          (filter.group && p?.groupId !== filter.group)
        )
          continue;
        const key = [e.account, e.good, e.purity || ""].join("|"),
          x = groups.get(key) || { ...e, quantity: "0" };
        x.quantity = add(x.quantity, e.quantity);
        groups.set(key, x);
      }
      host.append(
        card(
          table(
            [
              "شخص",
              "کالا / ارز",
              "مانده",
              "واحد",
              "عیار",
              "معادل عیار مبنا (گرم)",
            ],
            [...groups.values()]
              .filter((x) => dec(x.quantity) !== 0n)
              .map((x) => {
                const g = good(x.good),
                  u = unit(g.unitId);
                return {
                  item: x,
                  cells: [
                    name("people", x.account),
                    g.name,
                    f(x.quantity),
                    u.name,
                    f(x.purity),
                    g.metal === "طلا" && u.factor && x.purity
                      ? f(
                          ledger.equivalent(
                            mul(x.quantity, u.factor),
                            x.purity,
                          ),
                        )
                      : "—",
                  ],
                };
              }),
            (x) =>
              btn("ریز حساب و اسناد", () => {
                go("reports");
                filter.person = x.account;
                filter.good = x.good;
                filter.bucket = "person";
                render();
              }),
          ),
        ),
      );
    }
    const dateCache = new Map(),
      persianFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
      });
    function legacyDate(value) {
      const text = String(value || "").replace(/[۰-۹]/g, (c) =>
        "۰۱۲۳۴۵۶۷۸۹".indexOf(c),
      );
      if (dateCache.has(text)) return dateCache.get(text);
      const match = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      if (!match) return "";
      const [y, m, d] = match.slice(1).map(Number);
      let result = "";
      if (y >= 1700) {
        const dt = new Date(Date.UTC(y, m - 1, d, 12));
        if (dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d)
          result = dt.toISOString().slice(0, 10);
      } else {
        let lo = Math.floor(Date.UTC(y + 621, 0, 1) / 86400000),
          hi = Math.floor(Date.UTC(y + 623, 0, 1) / 86400000);
        const target = y * 10000 + m * 100 + d;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2),
            dt = new Date(mid * 86400000 + 43200000),
            parts = persianFormatter.formatToParts(dt),
            n = ["year", "month", "day"].map((k) =>
              Number(parts.find((x) => x.type === k).value),
            ),
            key = n[0] * 10000 + n[1] * 100 + n[2];
          if (key === target) {
            result = dt.toISOString().slice(0, 10);
            break;
          }
          if (key < target) lo = mid + 1;
          else hi = mid - 1;
        }
      }
      dateCache.set(text, result);
      return result;
    }
    function reportData() {
      const docs = new Map(ledger.s.documents.map((d) => [d.id, d])),
        entries = ledger.entries().filter((e) => e.type !== "legacy");
      let index = 0;
      for (const old of bridge.history?.() || []) {
        const g = good(old.good),
          bucket =
            old.kind === "people"
              ? "person"
              : old.kind === "expense"
                ? "expense"
                : old.kind === "income"
                  ? "income"
                  : ["metal", "currency", "banks"].includes(old.kind)
                    ? "stock"
                    : "";
        if (!g || !bucket || !old.value) continue;
        const id = old.sourceDocument
            ? "archive-" + old.sourceDocument.no
            : "archive-entry-" + index++,
          date = legacyDate(old.date),
          d = docs.get(id) || {
            id,
            number: old.no || "افتتاحیه",
            type: old.operation || "legacy",
            date,
            created: date ? date + "T00:00:00Z" : "1970-01-01T00:00:00Z",
            notes: old.notes || "",
            tags: old.tags || [],
            person:
              old.sourceDocument?.head?.kind === "people"
                ? old.sourceDocument.head.id
                : "",
            entries: [],
            archive: true,
            original: old.sourceDocument || null,
          };
        const kind = {
            stock: "funds",
            person: "people",
            expense: "expenses",
            income: "incomes",
          }[bucket],
          accountSnapshot = ledger.s.legacy?.catalogs?.[kind]?.find(
            (x) => x.id === old.id,
          ),
          entry = {
            bucket,
            account: old.id,
            good: old.good,
            quantity: String(Number(old.value.toFixed(8))),
            purity: g.metal === "طلا" ? "750" : g.purity || "",
            legacyNormalized: g.metal === "طلا",
            document: id,
            date,
            type: old.operation || "legacy",
            notes: old.notes || "",
            tags: old.tags || [],
            at: d.created,
            accountSnapshot,
            snapshot: {
              ...clone(g),
              unit: {
                ...clone(unit(g.unitId)),
                name:
                  name("units", g.unitId) +
                  (g.metal === "طلا" ? " (معادل ۷۵۰ نسخه قبلی)" : ""),
              },
            },
            archive: true,
            originalDate: old.date,
          };
        d.entries.push(entry);
        docs.set(id, d);
        entries.push(entry);
      }
      return { docs, entries };
    }
    function showArchive(d) {
      const dialog = el("dialog");
      dialog.append(
        el("h3", "اصل سند نسخهٔ قبلی " + f(d.number)),
        el(
          "p",
          "مقادیر گزارش از دفتر نسخهٔ قبلی خوانده شده‌اند؛ اصل سند بدون تغییر نگهداری می‌شود.",
          "n-notice",
        ),
        el("pre", JSON.stringify(d.original || d.entries, null, 2)),
        btn("بستن", () => dialog.close()),
      );
      host.append(dialog);
      dialog.onclose = () => dialog.remove();
      dialog.showModal();
    }
    function route221(entry,source) {
      const doc=source.docs.get(entry.document),header=ledger.s.invoiceHeaders214?.find(h=>h.id===doc?.invoiceHeader),row=header?.rows?.find(r=>r.id===doc?.invoiceRow);
      if(row && ["buy","sell"].includes(row.operation)){const person=name("people",header.partyId);return row.operation==="buy"?{from:person,to:"ما (تعهد خرید)",party:person}:{from:"ما (تعهد فروش)",to:person,party:person};}
      if(row){const kind=row.partyKind==="banks"?"funds":row.partyKind,party=row.partyKind==="installments"?ledger.s.installmentContracts214?.find(c=>c.id===row.contractId)?.title:name(kind,row.partyId);return {from:row.operation==="receive"?name(header.partyKind==="banks"?"funds":header.partyKind,header.partyId):party,to:row.operation==="receive"?party:name(header.partyKind==="banks"?"funds":header.partyKind,header.partyId),party};}
      const peers=doc?.entries?.filter(e=>e.account!==entry.account) || [];return {from:entry.quantity[0]==="-"?accountName(entry):peers.map(accountName).join("، "),to:entry.quantity[0]==="-"?peers.map(accountName).join("، "):accountName(entry),party:peers.map(accountName).join("، ")};
    }
    function openReport221(e,source) {
      rememberReport222();
      const d=source.docs.get(e.document);if(d?.invoiceHeader){go("operations");forms214.open221(d.invoiceHeader);return;}
      if(d?.archive && d.original){document.body.classList.remove("next204-active");host.hidden=true;bridge.openInvoice?.(d.original.no);return;}
      showDocument(e.document,{readOnly:true});
    }
    function date221(value){if(!value)return "—";const parts=persianFormatter.formatToParts(new Date(value+"T12:00:00Z"));return f(["year","month","day"].map(k=>parts.find(p=>p.type===k).value).join("/"));}
    function reports() {
      const controls=el("div",null,"n-grid");controls.id="report218-controls";
      function dropdown(key,title,items,blank="همه",reset=[]) {
        const c=select(items,filter[key] || "",blank);c.id="report218-"+key;
        c.onchange=()=>{filter[key]=c.value;reset.forEach(k=>delete filter[k]);page=0;render();document.getElementById(c.id)?.focus();};
        c.addEventListener("keydown",e=>{
          if(e.isComposing)return;
          if(["ArrowUp","ArrowDown"].includes(e.key)){e.preventDefault();c.selectedIndex=Math.max(0,Math.min(c.options.length-1,c.selectedIndex+(e.key==="ArrowDown"?1:-1)));c.onchange();}
          if(e.key==="Enter"){e.preventDefault();e.stopPropagation();if(filter[key]!==c.value)c.onchange();const fields=[...document.querySelectorAll("#report218-controls select")],index=fields.findIndex(n=>n.id===c.id);(fields[index+1] || document.querySelector("#report221-rows tbody tr") || document.getElementById("report223-excel"))?.focus();}
        });controls.append(field(title,c));return c;
      }
      const categories={banks:"بانک‌ها",funds:"صندوق‌ها",expenses:"هزینه‌ها",incomes:"درآمدها",installments:"اقساط",people:"افراد"};
      dropdown("reportKind","گروه گزارش",choices(categories),null,["bankId","accountId","groupId","partyId","contractId"]);
      const kind=filter.reportKind;
      const recordsWithStatus=k=>(ledger.s[k] || []).map(x=>({...x,name:x.name+(x.active===false?" (غیرفعال)":"")}));
      if(kind==="banks") {
        dropdown("bankId","بانک",recordsWithStatus("bankInstitutions"),"همهٔ بانک‌ها",["accountId"]);
        dropdown("accountId","شماره حساب",ledger.s.funds.filter(f=>f.legacyKind==="banks" && (!filter.bankId || f.bankId===filter.bankId)).map(f=>({id:f.id,name:name("bankInstitutions",f.bankId)+" — "+(f.accountNumber || f.name)})),"همهٔ شماره‌حساب‌ها");
      }
      if(kind==="funds")dropdown("partyId","صندوق",recordsWithStatus("funds").filter(f=>f.legacyKind!=="banks"),"همهٔ صندوق‌ها");
      if(kind==="expenses") {
        dropdown("groupId","محل هزینه",recordsWithStatus("expenseGroups"),"همهٔ محل‌ها",["partyId"]);
        dropdown("partyId","هزینه",recordsWithStatus("expenses").filter(e=>!filter.groupId || e.groupId===filter.groupId).map(e=>({...e,name:name("expenseGroups",e.groupId)+" — "+e.name})),"همهٔ هزینه‌ها");
      }
      if(kind==="incomes")dropdown("partyId","درآمد",recordsWithStatus("incomes"),"همهٔ درآمدها");
      if(kind==="people") {
        dropdown("groupId","گروه افراد",recordsWithStatus("peopleGroups"),"همهٔ گروه‌ها",["partyId"]);
        dropdown("partyId","فرد",recordsWithStatus("people").filter(p=>!filter.groupId || p.groupId===filter.groupId),"همهٔ افراد");
      }
      if(kind==="installments") {
        const legacy=bridge.installments?.() || [],contracts=[...(ledger.s.installmentContracts214 || []).map(c=>({id:c.id,name:c.title})),...legacy.filter((c,i,arr)=>arr.findIndex(x=>x.contract===c.contract)===i).map(c=>({id:c.contract,name:c.title}))];
        dropdown("contractId","قرارداد اقساط",contracts,"همهٔ قراردادها");
      }
      dropdown("tag","برچسب",recordsWithStatus("tags"),"همهٔ برچسب‌ها");
      host.append(card(controls));
      if(!kind){host.append(el("p","برای مشاهدهٔ گزارش، گروه را انتخاب کنید.","n-notice"));return;}
      latestTitle="گزارش "+categories[kind];
      if(kind==="installments") {
        latestHeaders=["قرارداد","طرف حساب","قسط","سررسید شمسی","کالا / ارز","مقدار تعهد","پرداخت‌شده","مانده","واحد"];
        const rows=[...(ledger.s.installmentContracts214 || []).filter(c=>(!filter.contractId || c.id===filter.contractId) && (!filter.tag || c.tags?.includes(filter.tag))).flatMap(c=>c.dues.map((due,i)=>{const remaining=ledger.installmentRemaining216(c.id,due.id);return [c.title,c.partyName,String(i+1),due.jalali,c.goodName,due.amount,sub(due.amount,remaining),remaining,c.unit.name];})),...(bridge.installments?.() || []).filter(c=>(!filter.contractId || c.contract===filter.contractId) && (!filter.tag || c.tags?.includes(filter.tag))).map(c=>[c.title,c.party,String(c.number || ""),c.date,name("goods",c.good),String(c.total),sub(c.total,c.remaining),String(c.remaining),c.unit])];
        latestRows=rows.map(cells=>cells.map((v,i)=>numericCell219(v,latestHeaders[i],cells[8])));const content=el("section");content.id="report223-content";content.append(el("h3",latestTitle),table(latestHeaders,latestRows.map(cells=>({cells}))));
        const balances=(ledger.s.installmentContracts214 || []).filter(c=>(!filter.contractId || c.id===filter.contractId) && (!filter.tag || c.tags?.includes(filter.tag))).map(c=>({bucket:"commitment",account:c.partyId,good:c.good,purity:good(c.good)?.purity || "",quantity:(c.direction==="payable"?sub("0",c.dues.reduce((q,d)=>add(q,ledger.installmentRemaining216(c.id,d.id)),"0")):c.dues.reduce((q,d)=>add(q,ledger.installmentRemaining216(c.id,d.id)),"0"))}));
        if(balances.length)content.append(reportBalances223(balances,kind));host.append(reportActions223(),content);return;
      }
      const source=reportData(),funds=new Map(ledger.s.funds.map(f=>[f.id,f])),running=new Map();
      const entries=source.entries.filter(e=>{
        if(filter.tag && !e.tags?.includes(filter.tag) && !source.docs.get(e.document)?.tags?.includes(filter.tag))return false;
        if(kind==="banks"){const a=funds.get(e.account);return ["stock","commitment"].includes(e.bucket) && a?.legacyKind==="banks" && (!filter.bankId || a.bankId===filter.bankId) && (!filter.accountId || a.id===filter.accountId);}
        if(kind==="funds")return ["stock","commitment"].includes(e.bucket) && funds.get(e.account)?.legacyKind!=="banks" && funds.has(e.account) && (!filter.partyId || e.account===filter.partyId);
        const bucket={people:"person",expenses:"expense",incomes:"income"}[kind];if(e.bucket!==bucket || (filter.partyId && e.account!==filter.partyId))return false;
        const entity=ledger.s[kind].find(x=>x.id===e.account) || e.accountSnapshot;return !filter.groupId || entity?.groupId===filter.groupId;
      }).sort((a,b)=>(a.date || "").localeCompare(b.date || "") || String(a.at).localeCompare(String(b.at)));
      latestHeaders=["شماره فاکتور","تاریخ","ساعت","عملیات","از کجا","به کجا","کالا / ارز سطر","عیار","ماندهٔ تجمیعی کالا / ارز","طلای ۷۵۰ (گرم)","ماندهٔ تومانی","تعداد","مقدار","واحد","توضیحات"];
      const projections=ledger.reportRows223(entries),rows=projections.map(({entry:e,view:value,balance,toman,gold750,operation})=>{
        const d=source.docs.get(e.document),path=route221(e,source),actual=["person","commitment"].includes(e.bucket)?sub("0",value.actualQuantity):value.actualQuantity;
        const time=!d?.archive && d?.created?new Date(d.created).toLocaleTimeString("fa-IR",{timeZone:"Asia/Tehran",hour:"2-digit",minute:"2-digit",second:"2-digit"}):"—";
        return {item:e,cells:[f(d?.invoiceNumber || d?.number || ""),date221(e.date),time,operation,path.from,path.to,value.goodName,f(value.actualPurity),amount219(balance,value.unit,true)+" "+value.unit.name,amount219(gold750,"گرم",true),amount219(toman,"تومان",true),value.count!==null?amount219(value.count,null,true):"—",amount219(actual,value.unit,true),value.unit.name,e.notes || ""]};
      });
      latestRows=rows.map(r=>r.cells);
      const content=el("section");content.id="report223-content";
      const selectedFilters=[...controls.querySelectorAll("select")].filter(c=>c.value).map(c=>c.closest("label")?.firstChild?.textContent+": "+c.selectedOptions[0]?.textContent).join(" · ");
      content.append(el("h3",latestTitle),el("p",selectedFilters,"n-muted"));
      const listing=table(latestHeaders,rows);listing.id="report221-rows";
      [...listing.querySelectorAll("tbody tr")].forEach((tr,i)=>{tr.tabIndex=0;tr.ondblclick=()=>openReport221(rows[i].item,source);tr.onkeydown=e=>{if(e.key==="Enter")openReport221(rows[i].item,source);};});
      const foot=el("tfoot");for(const g of ledger.aggregate221(entries,true)){const tr=el("tr");for(const [i,title]of latestHeaders.entries()){let text="";if(i===0)text="جمع / ماندهٔ نهایی — "+name(kind==="banks"?"funds":kind,g.account);if(i===6)text=g.name;if(i===7)text=f(g.purity);if(i===8)text=amount219(g.quantity,g.unit,true)+" "+g.unit.name;if(i===11 && g.hasCount)text=amount219(g.count,null,true);if(i===12)text=amount219(g.quantity,g.unit,true);if(i===13)text=g.unit.name;tr.append(el("td",text));}foot.append(tr);}listing.querySelector("table").append(foot);
      content.append(listing,reportBalances223(entries,kind));host.append(reportActions223(),content);
    }
    function reportBalances223(entries,kind){
      const block=card(el("h3","ماندهٔ نهایی گزارش"));block.id="report223-balances";block.classList.add("invoice219-balances");
      const groups=ledger.aggregate221(entries,true).filter(g=>dec(g.quantity)!==0n),accounts=[...new Set(groups.map(g=>g.account))];
      for(const account of accounts){const values=groups.filter(g=>g.account===account),cards=el("div",null,"invoice219-balance-cards");if(accounts.length>1)block.append(el("h4",kind==="installments"?ledger.s.installmentContracts214?.find(c=>c.partyId===account)?.partyName || account:name(kind==="banks"?"funds":kind,account)));
        for(const g of values){const item=el("div",null,"invoice219-balance-card"),quantity=el("div",null,"invoice222-quantity"),number=el("bdi",amount219(g.quantity,g.unit,true),"invoice219-amount "+(dec(g.quantity)<0n?"invoice222-negative":"invoice222-positive"));number.dir="ltr";quantity.append(number,el("span",g.unit.name,"invoice222-unit"));item.append(el("strong",g.name,"invoice222-asset"),quantity,el("span",ledger.label221(g.quantity,g.bucket),dec(g.quantity)<0n?"invoice219-debit":"invoice219-credit"));cards.append(item);}block.append(cards);}
      if(!groups.length)block.append(el("p",entries.length?"تسویه؛ بدون مانده":"گردشی برای این انتخاب ثبت نشده است."));return block;
    }
    function reportActions223(){const x=btn("اکسل",()=>SadraReport223.excel(document.getElementById("report223-content")));x.id="report223-excel";return bar(x,btn("چاپ",()=>printReport()),btn("PDF",()=>printReport(true)));}
    function printReport(pdf=false) {SadraReport223.print(document.getElementById("report223-content"),pdf);}
    function exportReport(format) {
      const safe = (v) => {
          v = String(v ?? "");
          return /^[=+@\-]/.test(v) ? "'" + v : v;
        },
        meta = [
          ["گزارش", latestTitle],
          ["زمان تهیه", new Date().toISOString()],
          ["فیلترها", JSON.stringify(filter)],
        ],
        all = [...meta, latestHeaders, ...latestRows];
      if (format === "csv") {
        download(
          "\ufeff" +
            all
              .map((r) =>
                r.map((v) => '"' + safe(v).replace(/"/g, '""') + '"').join(","),
              )
              .join("\r\n"),
          "Sadra-report.csv",
          "text/csv;charset=utf-8",
        );
      } else {
        const esc = (v) =>
          String(v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        download(
          '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="گزارش"><Table>' +
            all
              .map(
                (r) =>
                  "<Row>" +
                  r
                    .map(
                      (v) =>
                        '<Cell><Data ss:Type="String">' +
                        esc(v ?? "") +
                        "</Data></Cell>",
                    )
                    .join("") +
                  "</Row>",
              )
              .join("") +
            "</Table></Worksheet></Workbook>",
          "Sadra-report.xls",
          "application/vnd.ms-excel",
        );
      }
    }
    function installmentReport() {
      const source = [...(bridge.installments?.() || []), ...(ledger.s.installmentContracts214 || []).flatMap(c=>c.dues.map((item,index)=>({contract:c.id,person:c.partyKind === "people" ? c.partyId : "",party:c.partyName,title:c.title,number:index+1,date:item.jalali,total:item.amount,remaining:ledger.installmentRemaining216(c.id,item.id),unit:c.unit.name,good:c.good})))];
      if (!source.length) return;
      const control = select(
        choices({
          paid: "پرداخت‌شده",
          unpaid: "پرداخت‌نشده",
          due: "سررسیدشده",
          overdue: "معوق",
          partial: "دارای پرداخت جزئی",
        }),
        filter.installmentStatus,
        "همهٔ اقساط",
      );
      control.onchange = () => {
        filter.installmentStatus = control.value;
        render();
      };
      const today = new Intl.DateTimeFormat("en-US-u-ca-persian", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          timeZone: "Asia/Tehran",
        }).formatToParts(new Date()),
        todayKey = ["year", "month", "day"]
          .map((k) => today.find((x) => x.type === k).value)
          .join("");
      const contract = select(
        [
          ...new Map(
            source.map((x) => [x.contract, { id: x.contract, name: x.title }]),
          ).values(),
        ],
        filter.installmentContract,
        "همهٔ قراردادها",
      );
      contract.onchange = () => {
        filter.installmentContract = contract.value;
        render();
      };
      const toPersian = (iso) => {
        if (!iso) return "";
        const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date(iso + "T12:00:00"));
        return ["year", "month", "day"]
          .map((k) => parts.find((x) => x.type === k).value)
          .join("");
      };
      const day = (s) =>
        String(s || "")
          .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
          .replace(/[^0-9]/g, "");
      const selected = source.filter((x) => {
        const paid = x.remaining <= 0,
          late = day(x.date) < todayKey && !paid,
          due = day(x.date) <= todayKey && !paid,
          partial = x.remaining > 0 && x.remaining < x.total;
        return (
          (!filter.installmentContract ||
            filter.installmentContract === x.contract) &&
          (!filter.from || day(x.date) >= toPersian(filter.from)) &&
          (!filter.to || day(x.date) <= toPersian(filter.to)) &&
          (!filter.person || filter.person === x.person) &&
          (!filter.good || filter.good === x.good) &&
          (!filter.installmentStatus ||
            { paid, unpaid: !paid, due, overdue: late, partial }[
              filter.installmentStatus
            ])
        );
      });
      const heads = [
          "قرارداد",
          "شخص",
          "شماره قسط",
          "سررسید",
          "مقدار کل",
          "مانده",
          "واحد",
          "وضعیت",
        ],
        data = selected.map((x) => [
          x.title,
          x.party,
          x.number,
          x.date,
          x.total,
          x.remaining,
          x.unit,
          x.remaining <= 0
            ? "تسویه کامل"
            : x.remaining < x.total
              ? "تسویه جزئی"
              : day(x.date) < todayKey
                ? "معوق"
                : "پرداخت‌نشده",
        ]);
      const output = (format) => {
        const old = [latestTitle, latestHeaders, latestRows];
        latestTitle = "گزارش اقساط";
        latestHeaders = heads;
        latestRows = data;
        try {
          format === "print" ? printReport() : exportReport(format);
        } finally {
          [latestTitle, latestHeaders, latestRows] = old;
        }
      };
      host.append(
        card(
          el("h3", "گزارش اقساط موجود"),
          bar(control, contract),
          bar(
            btn("CSV اقساط", () => output("csv")),
            btn("Excel اقساط", () => output("xls")),
            btn("چاپ / PDF اقساط", () => output("print")),
          ),
          table(
            heads,
            data.map((cells) => ({ cells })),
          ),
        ),
      );
    }

    function settings() {
      host.append(
        card(
          el("h3", "اسناد نسخهٔ قبلی (فقط مشاهده)"),
          table(
            ["شماره", "تاریخ", "طرف حساب", "تعداد اقلام"],
            (ledger.s.legacy?.documents || []).map((d) => ({
              item: d,
              cells: [f(d.no), d.date, d.head?.id, f(d.rows?.length || 0)],
            })),
            (d) =>
              btn("نمایش اصل سند", () => {
                const dialog = el("dialog");
                dialog.append(
                  el("h3", "اصل سند " + f(d.no)),
                  el("pre", JSON.stringify(d, null, 2)),
                  btn("بستن", () => dialog.close()),
                );
                host.append(dialog);
                dialog.onclose = () => dialog.remove();
                dialog.showModal();
              }),
          ),
        ),
      );
      const b = input(ledger.s.basePurity);
      host.append(
        card(
          el("h3", "عیار مبنای گزارش"),
          field("عیار در مقیاس ۱۰۰۰", b),
          btn("ثبت عیار مبنا", () => {
            ledger.setBasePurity(b.value);
            render();
          }),
          el(
            "p",
            "تغییر مبنا فقط گزارش‌های جدید را تغییر می‌دهد؛ مقادیر و تنظیمات ثبت‌شده در اسناد قطعی محفوظ است.",
            "n-muted",
          ),
        ),
      );
      host.append(
        card(
          el("h3", "پشتیبان و تاریخچه"),
          btn("دانلود پشتیبان کامل", backup),
          el(
            "p",
            "نسخهٔ اصلی قبل از تغییر، در کلید kimia-before-update204 مرورگر نگهداری می‌شود. برای بازیابی از منوی پشتیبان‌گیری موجود استفاده کنید. کنترل دسترسی و اعتبارسنجی سمت سرور در این نسخهٔ محلی وجود ندارد.",
            "n-notice",
          ),
          table(
            ["زمان", "عملیات", "بخش", "شناسه"],
            ledger.s.audit
              .slice(-100)
              .reverse()
              .map((x) => ({
                cells: [
                  new Date(x.at).toLocaleString("fa-IR"),
                  x.action,
                  names[x.kind] || x.kind,
                  x.record,
                ],
              })),
          ),
        ),
      );
    }
    const integrations = {
      funds: "funds",
      banks: "banks",
      expense: "expense",
      income: "income",
      directory: "people",
      people: "people",
      goods: "goods",
      tags: "tags",
      units: "units",
      assets: "assets",
      materials: "materials",
      invoice: "operations",
      reconcile: "inventory",
      reports: "reports",
      installments: "installments",
    };
    // Capture only the replaced destinations; unrelated screens retain their existing behavior.
    document.querySelector("aside").addEventListener(
      "click",
      (event) => {
        const b = event.target.closest("button");
        if (!b) return;
        const next = b.dataset.next204 || integrations[b.dataset.page];
        if (next) {
          event.preventDefault();
          event.stopImmediatePropagation();
          go(next);
        } else {
          rememberReport222();
          navigation218.push(host.hidden?{legacy:document.querySelector("aside button.active")?.dataset.page || "portfolio"}:route);
          if(route==="operations")forms214?.leave219();
          document.body.classList.remove("next204-active");
          host.hidden = true;
        }
      },
      true,
    );
    // Change 1 / Update 212: build the confirmed navigation once, preserving destinations.
    const sidebar212 = document.querySelector("aside");
    sidebar212.dataset.sadraNavigation214 = "true";
    const originalButtons212 = [...sidebar212.querySelectorAll("button")];
    const screenButton212 = (route, page, title) => {
      let button = originalButtons212.find(b => b.dataset.next204 === route || b.dataset.page === page);
      if (!button) button = btn(title, () => go(route));
      button.dataset.next204 = route;
      button.dataset.page = page;
      button.textContent = title;
      return button;
    };
    const nativeButton212 = (page, title) => {
      const button = originalButtons212.find(b => b.dataset.page === page);
      if (!button) throw Error("گزینهٔ منو یافت نشد: " + title);
      button.textContent = title;
      return button;
    };
    const group212 = document.createElement("details"); group212.id = "groupsMenu200"; group212.className = "sadra-navigation-section";
    const introductions212 = document.createElement("details"); introductions212.id = "sadraIntroductionsMenu"; introductions212.className = "sadra-navigation-section";
    const information212 = document.createElement("details"); information212.id = "sadraInformationMenu"; information212.className = "sadra-navigation-section";
    const populate212 = (section, title, buttons) => {
      const summary = el("summary", title); summary.setAttribute("aria-label", title);
      section.append(summary, ...buttons);
    };
    populate212(group212, "گروه‌ها", [
      screenButton212("banks", "banks", "بانک‌ها"),
      screenButton212("funds", "funds", "صندوق‌ها"),
      screenButton212("expense", "expense", "هزینه‌ها"),
      screenButton212("income", "income", "درآمد"),
      screenButton212("installments", "installments", "اقساط"),
      screenButton212("people", "directory", "افراد"),
    ]);
    populate212(introductions212, "معرفی‌ها", [
      screenButton212("goods", "goods", "معرفی کالاها"),
      screenButton212("units", "units", "معرفی واحدها"),
      screenButton212("assets", "assets", "معرفی ارزها"),
      screenButton212("materials", "materials", "معرفی جنس دارایی‌ها"),
      screenButton212("tags", "tags", "معرفی برچسب‌ها"),
    ]);
    populate212(information212, "اطلاعات", [
      screenButton212("settings", "settings", "تنظیمات و سوابق"),
      nativeButton212("backup", "پشتیبانی و بازیابی"),
      nativeButton212("update", "آپدیت‌ها"),
    ]);
    const ordered212 = [
      nativeButton212("portfolio", "برنامه"),
      screenButton212("inventory", "reconcile", "موجودی"),
      nativeButton212("opening", "سرمایه اولیه"),
      screenButton212("operations", "invoice", "ثبت فاکتور"),
      screenButton212("reports", "reports", "گزارش‌ها"),
      group212, introductions212, information212,
    ];
    const clock212 = document.getElementById("iranClock100");
    const exit212 = originalButtons212.find(b => b.textContent.includes("خروج"));
    if (exit212) exit212.textContent = "خروج";
    // Remove only obsolete navigation nodes; financial state and handlers remain intact.
    sidebar212.querySelectorAll(":scope > button, :scope > details, :scope > small, :scope > hr, :scope > .sadra-sidebar-version").forEach(e => e.remove());
    sidebar212.append(...ordered212);
    if (clock212) sidebar212.append(clock212);
    if (exit212) sidebar212.append(exit212);
    // Changes 2 and 3: enforce one entry in its submenu even if a legacy menu appends it later.
    const destinations213 = [
      {page: "installments", section: group212, button: group212.querySelector('button[data-page="installments"]'), before: group212.querySelector('button[data-next204="people"]')},
      {page: "backup", section: information212, button: information212.querySelector('button[data-page="backup"]'), before: information212.querySelector('button[data-page="update"]')},
    ];
    function keepSubmenus213() {
      for (const item of destinations213) {
        if (!item.button) continue;
        sidebar212.querySelectorAll('button[data-page="' + item.page + '"]').forEach(button => { if (button !== item.button) button.remove(); });
        if (item.button.parentElement !== item.section) item.section.insertBefore(item.button, item.before?.parentElement === item.section ? item.before : null);
      }
    }
    keepSubmenus213();
    window.addEventListener("load", keepSubmenus213, {once: true});
    new MutationObserver(keepSubmenus213).observe(sidebar212, {childList: true});
    // Stop legacy invoice shortcuts from posting hidden forms while a new screen is active.
    window.addEventListener(
      "keydown",
      (e) => {
        if (!document.body.classList.contains("next204-active")) return;
        if (["F1", "F2", "F3", "F4", "F5", "F12"].includes(e.key)) {
          if(e.key!=="F12")e.preventDefault();
          e.stopImmediatePropagation();
          if(route==="operations" && /^F[1-5]$/.test(e.key) && !document.querySelector("dialog[open]"))forms214.shortcut(e.key);
        }
      },
      true,
    );
    document.title = "حسابداری محمد صدرا | نسخه ۵.۹.۱ | نسخه مرورگر | آپدیت ۲۲۳";
    window.addEventListener("load", () => {
      document.title = "حسابداری محمد صدرا | نسخه ۵.۹.۱ | نسخه مرورگر | آپدیت ۲۲۳";
    });
    document.querySelector("aside").addEventListener("keydown",e=>{
      if(e.isComposing || !["ArrowUp","ArrowDown","Enter"].includes(e.key))return;
      const items=[...document.querySelectorAll("aside summary,aside button")].filter(n=>!n.disabled && n.getClientRects().length),index=items.indexOf(e.target);if(index<0)return;
      e.preventDefault();e.stopPropagation();
      if(e.key==="Enter"){if(e.target.tagName==="SUMMARY")e.target.parentElement.open=!e.target.parentElement.open;else e.target.click();return;}
      items[Math.max(0,Math.min(items.length-1,index+(e.key==="ArrowDown"?1:-1)))]?.focus();
    },true);
    function previous223(){const previous=navigation218.pop();if(!previous)return false;if(typeof previous==="object"){rememberReport222();if(route==="operations")forms214.leave219();document.body.classList.remove("next204-active");host.hidden=true;bridge.navigateLegacy?.(previous.legacy);}else go(previous,false);return true;}
    const api = {
      escape218(){
        const dialog=[...document.querySelectorAll("dialog[open]")].at(-1);if(dialog){dialog.close();return true;}
        const aside=document.activeElement?.closest("aside");if(aside){const section=document.activeElement.closest("details");if(section){section.open=false;section.querySelector("summary")?.focus();return true;}return previous223();}
        if(document.body.classList.contains("next204-active")) {
          if(route==="operations" && forms214.escape218())return true;
          const focused=document.activeElement,controls=[...host.querySelectorAll("input,select,textarea")].filter(c=>!c.disabled && c.getClientRects().length),i=controls.indexOf(focused);
          if(i>0){controls[i-1].focus();return true;}
          if(previous223())return true;
        }
        if(!document.body.classList.contains("next204-active")) {
          const focused=document.activeElement,root=focused?.closest("form,section,main"),controls=root?[...root.querySelectorAll("input,select,textarea,button")].filter(c=>!c.disabled && c.getClientRects().length):[],i=controls.indexOf(focused);
          if(i>0){controls[i-1].focus();return true;}
          if(previous223())return true;
        }
        const section=document.activeElement?.closest("aside details");if(section?.open){section.open=false;section.querySelector("summary")?.focus();return true;}return false;
      },
      invoiceShortcut217(key){if(route==="operations" && !document.querySelector("dialog[open]"))forms214.shortcut(key);},
      go,
      get ledger() {
        return ledger;
      },
      reload() {
        load();
        render();
      },
      legacyEntries() {
        return ledger
          .entries()
          .filter((e) => docsAreNew(e) && e.bucket !== "commitment")
          .map((e) => ({
            kind:
              e.bucket === "person"
                ? "people"
                : e.bucket === "expense"
                  ? "expense"
                  : e.bucket === "income"
                    ? "income"
                    : ledger.s.funds.find((f) => f.id === e.account)
                        ?.legacyKind ||
                      (good(e.good)?.mode === "currency"
                        ? "currency"
                        : "metal"),
            id: e.account,
            good: e.good,
            value: Number(
              e.snapshot?.metal === "طلا" && e.snapshot?.mode === "weight"
                ? ledger.equivalent(
                    mul(e.quantity, e.snapshot.unit?.factor || "1"),
                    e.purity || e.snapshot.purity || "750",
                    "750",
                  )
                : e.quantity,
            ),
            no:
              "204-" +
              ledger.s.documents.find((d) => d.id === e.document)?.number,
            date: e.date.replaceAll("-", "/"),
            notes: e.notes,
          }));
      },
    };
    function docsAreNew(e) {
      return e.type !== "legacy";
    }
    forms214 = SadraForms214.create({
      el,btn,field,select,input,bar,card,table,f,name,host,legacyDate,amount219,
      ledger:()=>ledger,raw,openEditor:edit,rerender:render,message,
      needsReview:()=>migrationNotice,
      showDocument,showBalance220,
      openReview:()=>go("funds"),
      legacyInstallments:()=>bridge.installments?.() || [],
      openLegacyInstallments:()=>bridge.openLegacyInstallments?.(),
    });
    go("funds");
    return api;
  },
};
