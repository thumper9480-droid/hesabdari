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
      assets: "معرفی دارایی‌ها",
      operations: "ثبت سند و حواله",
      inventory: "موجودی و گردش کالا",
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
      assets: "معرفی دارایی‌ها",
      assetTypes: "انواع دارایی",
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
      if (text !== undefined && text !== null) e.textContent = text;
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
      if (v === undefined || v === null || v === "") return "—";
      return String(v).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[c]);
    };
    const select = (items, value = "", blank = "انتخاب کنید") => {
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
    const choices = (o) =>
      Object.entries(o).map(([id, name]) => ({ id, name }));
    const input = (value = "", type = "text") => {
      const e = el("input");
      e.type = type;
      e.value = value;
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
        row.cells.forEach((v) => {
          const td = el("td");
          td.append(
            v instanceof Node ? v : document.createTextNode(String(v ?? "—")),
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
      host.append(
        bar(
          el(
            "span",
            "نسخهٔ آزمایشی ۲۰۷ · اطلاعات در همین مرورگر ذخیره می‌شوند",
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
      assets: ["assets", "assetTypes"],
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
      } else if (route === "operations") operations();
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
    function go(next) {
      syncLegacy();
      route = next;
      tab = "";
      filter = {};
      page = 0;
      host.hidden = false;
      document.body.classList.add("next204-active");
      document
        .querySelectorAll("aside button")
        .forEach((b) =>
          b.classList.toggle("active", b.dataset.next204 === next),
        );
      render();
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
      if (kind === "units")
        fields.push(
          text("symbol", "نماد"),
          ref("dimension", "نوع واحد", null, choices(dims)),
          text("factor", "ضریب تبدیل به مرجع (وزن: گرم)"),
          text("reference", "مرجع تبدیل برای واحدهای تعدادی"),
          text("definition", "تعریف دقیق واحد؛ برای مثقال الزامی"),
          text("currencyCode", "کد استاندارد ارز (در صورت وجود)"),
          text("decimals", "تعداد رقم اعشار مجاز", "number", true),
        );
      if (kind === "assets")
        fields.push(
          text("symbol", "کد / نماد"),
          ref(
            "nature",
            "ماهیت دارایی",
            null,
            choices({ currency: "ارزی", commodity: "کالایی" }),
          ),
          ref(
            "unitId",
            "واحد اصلی",
            null,
            active("units").filter(
              (u) => (v.nature === "currency") === (u.dimension === "currency"),
            ),
          ),
          text("decimals", "دقت اعشاری", "number"),
          text("description", "توضیحات"),
        );
      if (kind === "goods") {
        fields.push(ref("groupId", "گروه کالا", "groups"));
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
        if (["weight", "weightCount"].includes(v.catalogMode))
          fields.push(text("catalogPurity", "عیار", "text", true));
        if (v.catalogMode === "weightCount")
          fields.push(
            text("catalogPieceWeight", "وزن هر قطعه به گرم", "text", true),
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
                  v.catalogFeeBasis === "weightPercent" ? "درصد ثابت از وزن فاکتور" : "مبلغ ثابت هر عدد (ریال)",
                  "text",
                  true,
                ),
              );
          }
        }
      }
      if (
        ![
          "funds",
          "expenses",
          "expenseGroups",
          "incomes",
          "incomeSources",
          "goods",
          "tags",
        ].includes(kind)
      ) {
        fields.push({ key: "tags", label: "برچسب‌ها", type: "tags" });
        fields.push(text("active", "فعال", "checkbox"));
      }
      return fields;
    }
    function edit(kind, item) {
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
              catalogHasFee: "no",
              catalogFeeMode: "fixed",
              catalogFeeBasis: "perPiece",
            }
          : {}),
        ...(kind === "tags" ? { color: "#287d66" } : {}),
        ...(["units", "assets"].includes(kind) ? { decimals: "3" } : {}),
        ...(kind === "incomes" ? { catalogNature: "currency" } : {}),
        ...clone(item || {}),
      };
      if (kind === "bankAccounts") {
        values.legacyKind = "banks";
        values.typeId = "currency";
        values.nature = "currency";
        values.bankId = values.bankId || filter.bankId || "";
      }
      if (kind === "people" && filter.groupId) values.groupId = filter.groupId;
      const draw = () => {
        grid.replaceChildren();
        for (const spec of schema(kind, values)) {
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
          if (
            kind === "units" &&
            norm(values.name).includes("مثقال") &&
            !values.definition?.trim()
          )
            throw Error("تعریف و نوع مثقال را مشخص کنید");
          if (kind === "goods" && values.mode === "currency")
            values.feeMode = "none";
          if (kind === "bankAccounts")
            values.name =
              name("bankInstitutions", values.bankId) +
              " / " +
              values.accountNumber +
              " / " +
              name("assets", values.assetId);
          saveCatalog(kind, values);
          d.close();
          render();
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
      if (kind === "goods") {
        const x = clone(values);
        x.name = String(x.name || "").trim();
        if (!norm(x.name)) throw Error("نام کالا الزامی است");
        ledger.find(
          "groups",
          x.groupId,
          !records("goods").some(
            (g) => g.id === x.id && g.groupId === x.groupId,
          ),
        );
        if (!["count", "weight", "weightCount"].includes(x.catalogMode))
          throw Error("نوع کالا را انتخاب کنید");
        if (
          ["weight", "weightCount"].includes(x.catalogMode) &&
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
          x.catalogOnly = !ledger.s.goods.some((g) => g.id === x.id);
          if (old) Object.assign(old, x);
          else ledger.s.catalogGoods.push(x);
          ledger.audit("catalog-save", "goods", x.id, before, x);
        });
        return;
      }
      ledger.put(modelKind(kind), values);
    }
    function catalogGood(x) {
      return {
        ...x,
        catalogMode: x.standardWeight
          ? "weightCount"
          : x.mode === "weight"
            ? "weight"
            : "count",
        catalogPurity: x.purity || "",
        catalogPieceWeight: x.standardWeight
          ? ledger.convert(
              x.standardWeight,
              x.standardWeightUnitId,
              ledger.s.units.find(
                (u) =>
                  u.dimension === "weight" && dec(u.factor || "0") === dec("1"),
              )?.id || x.standardWeightUnitId,
            )
          : "",
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
            ...ledger.s.goods.map(catalogGood),
            ...(ledger.s.catalogGoods || []).filter(
              (g) => !ledger.s.goods.some((old) => old.id === g.id),
            ),
          ]
        : kind === "bankAccounts"
          ? ledger.s.funds.filter((f) => f.legacyKind === "banks")
          : ledger.s[kind];
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
      const result = el("div");
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
                            }[x.catalogMode] || "") +
                            (x.catalogPurity
                              ? " · عیار " + f(x.catalogPurity)
                              : "") +
                            (x.catalogMode === "weightCount"
                              ? " · هر قطعه " + f(x.catalogPieceWeight) + " گرم"
                              : "") +
                            (x.catalogHasFee === "yes"
                              ? x.catalogFeeMode === "fixed"
                                ? " · کارمزد ثابت " + f(x.catalogFeeValue) + (x.catalogFeeBasis === "weightPercent" ? " درصد از وزن فاکتور" : " ریال هر عدد")
                                : " · کارمزد متغیر " + (x.catalogFeeBasis === "weightPercent" ? "درصدی از وزن فاکتور" : "مبلغ هر عدد") + " در سند"
                              : "")
                          : tab === "units"
                            ? dims[x.dimension] +
                              " · ضریب: " +
                              f(x.factor) +
                              " · اعشار: " +
                              f(x.decimals)
                            : tab === "assets"
                              ? (x.nature === "currency" ? "ارزی" : "کالایی") +
                                " · " +
                                name("units", x.unitId)
                              : x.description || "";
        const simpleCatalog = [
          "funds",
          "expenses",
          "expenseGroups",
          "incomes",
          "incomeSources",
          "goods",
          "tags",
        ].includes(tab);
        result.replaceChildren(
          table(
            tab === "tags"
              ? ["نام", "وضعیت"]
              : [
                  "نام",
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
      container.append(
        field("برچسب‌های سند", ts),
        btn("ایجاد برچسب جدید", () => edit("tags")),
      );
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
    function showDocument(id) {
      if (!id) return;
      const d = ledger.find("documents", id),
        dialog = el("dialog");
      dialog.append(
        el("h3", "سند " + f(d.number) + " · " + types[d.type]),
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
      dialog.append(
        table(
          ["دفتر", "حساب", "کالا / دارایی", "مقدار", "واحد", "عیار", "جزء"],
          d.entries.map((e) => ({
            cells: [
              {
                stock: "موجودی",
                person: "حساب شخص",
                expense: "هزینه",
                income: "درآمد",
              }[e.bucket],
              accountName(e),
              d.snapshots[e.good]?.name || name("goods", e.good),
              f(e.quantity),
              d.snapshots[e.good]?.unit?.name ||
                name("units", good(e.good)?.unitId),
              f(e.purity),
              e.component || "—",
            ],
          })),
        ),
      );
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
        if (d.type === "sell")
          dialog.append(
            btn("رزرو موجودی برای این فروش", () => reserveForm(d)),
            btn("آزادسازی رزرو", () => {
              ledger.release(d.id);
              dialog.close();
              render();
            }),
          );
      }
      if (d.type !== "legacy" && !d.reversalOf)
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
      return e.bucket === "stock"
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
      const controls = el("div", null, "n-filters n-bar");
      for (const [key, kind, label] of [
        ["good", "goods", "همهٔ کالاها"],
        ["fund", "funds", "همهٔ صندوق‌ها"],
        ["group", "groups", "همهٔ گروه‌ها"],
        ["location", "locations", "همهٔ محل‌ها"],
        ["fundType", "fundTypes", "همهٔ انواع صندوق"],
      ]) {
        const s = select(fieldOptions(kind, true), filter[key], label);
        s.onchange = () => {
          filter[key] = s.value;
          render();
        };
        controls.append(s);
      }
      const dimension = select(choices(modes), filter.mode, "همهٔ ماهیت‌ها");
      dimension.onchange = () => {
        filter.mode = dimension.value;
        render();
      };
      controls.append(dimension);
      const purityFilter = input(filter.purity || "");
      purityFilter.placeholder = "فیلتر عیار";
      purityFilter.onchange = () => {
        filter.purity = purityFilter.value;
        render();
      };
      controls.append(purityFilter);
      host.append(controls, bar(btn("ثبت نرخ ارزش‌گذاری", valuationForm)));
      const grouped = new Map();
      for (const e of ledger.entries().filter((e) => e.bucket === "stock")) {
        const g = good(e.good),
          fund = ledger.s.funds.find((f) => f.id === e.account);
        if (
          !g ||
          !fund ||
          (filter.good && g.id !== filter.good) ||
          (filter.fund && fund.id !== filter.fund) ||
          (filter.group && g.groupId !== filter.group) ||
          (filter.location && fund.locationId !== filter.location) ||
          (filter.fundType && fund.typeId !== filter.fundType) ||
          (filter.mode && g.mode !== filter.mode) ||
          (filter.purity && e.purity !== filter.purity)
        )
          continue;
        const key = [e.account, e.good, e.purity || "", e.lot || ""].join("|"),
          x = grouped.get(key) || {
            ...e,
            quantity: "0",
            opening: "0",
            inbound: "0",
            outbound: "0",
            pieceCount: "0",
            unknownCount: false,
          };
        if (["opening", "legacy"].includes(e.type))
          x.opening = add(x.opening, e.quantity);
        else if (dec(e.quantity) > 0n) x.inbound = add(x.inbound, e.quantity);
        else x.outbound = add(x.outbound, sub("0", e.quantity));
        if (e.count) x.pieceCount = add(x.pieceCount, e.count);
        else if (g.mode === "weight") x.unknownCount = true;
        x.quantity = add(x.quantity, e.quantity);
        grouped.set(key, x);
      }
      let equivalent = "0",
        actualGold = "0";
      const rows = [...grouped.values()]
        .filter((e) => dec(e.quantity) !== 0n)
        .map((e) => {
          const g = good(e.good),
            u = unit(g.unitId);
          let eq = "—";
          if (
            g.metal === "طلا" &&
            u.dimension === "weight" &&
            u.factor &&
            e.purity
          ) {
            if (!e.legacyNormalized)
              actualGold = add(actualGold, mul(e.quantity, u.factor));
            eq = ledger.equivalent(mul(e.quantity, u.factor), e.purity);
            equivalent = add(equivalent, eq);
          }
          const r = ledger.s.reservations
            .filter((x) => x.fund === e.account && x.good === g.id)
            .reduce((n, x) => n + dec(x.quantity), 0n);
          return {
            item: e,
            cells: [
              g.name,
              name("funds", e.account),
              name("locations", ledger.find("funds", e.account).locationId),
              f(e.quantity),
              f(e.opening),
              f(e.inbound),
              f(e.outbound),
              g.mode === "count"
                ? f(e.quantity)
                : f(e.pieceCount) +
                  (e.unknownCount ? " (ناقص / ثبت نشده)" : ""),
              u.name + (e.legacyNormalized ? " (معادل ۷۵۰، انتقالی)" : ""),
              f(e.purity),
              f(eq),
              e.mark || "—",
              e.assay || "—",
              f(str(r)),
              f(ledger.available(e.account, g.id)),
            ],
          };
        });
      host.append(
        el(
          "p",
          "وزن معادل فقط گزارش مقایسه‌ای است و تعهد واقعی را تغییر نمی‌دهد. رزرو و موجودی قابل استفاده در سطح مجموع «صندوق و کالا» نمایش داده می‌شوند و نباید میان ردیف محموله‌ها دوباره جمع شوند.",
          "n-notice",
        ),
      );
      host.append(
        card(
          el(
            "p",
            "جمع وزن واقعی طلای جدید (به‌جز مانده‌های معادل انتقالی): " +
              f(actualGold) +
              " گرم",
          ),
          el(
            "h3",
            "معادل طلای فیلترشده با عیار " +
              f(ledger.s.basePurity) +
              ": " +
              f(equivalent) +
              " گرم",
          ),
          table(
            [
              "کالا",
              "صندوق",
              "محل",
              "موجودی ثبت‌شده",
              "افتتاحیه",
              "مجموع ورود",
              "مجموع خروج",
              "تعداد قطعات",
              "واحد",
              "عیار",
              "معادل مبنا (گرم)",
              "ری‌گیری",
              "مرکز",
              "رزرو کل صندوق/کالا",
              "قابل استفاده کل صندوق/کالا",
            ],
            rows,
            (e) =>
              bar(
                btn("گردش کالا", () => {
                  go("reports");
                  filter.good = e.good;
                  filter.fund = e.account;
                  filter.bucket = "stock";
                  render();
                }),
                btn("ثبت شمارش واقعی / اصلاح", () => {
                  const actual = prompt(
                    "موجودی واقعی همین محموله / کالا (واحد: " +
                      name("units", good(e.good).unitId) +
                      ")",
                    e.quantity,
                  );
                  if (actual === null) return;
                  const reason = prompt("علت مغایرت:");
                  if (reason) {
                    ledger.reconcile({
                      token: uid(),
                      fund: e.account,
                      good: e.good,
                      lot: e.lot,
                      actual,
                      notes: reason,
                      purity: e.purity,
                    });
                    render();
                  }
                }),
              ),
          ),
        ),
      );
      const valuations = [],
        valueTotals = new Map();
      let missingRates = 0;
      for (const e of [...grouped.values()].filter(
        (e) => dec(e.quantity) !== 0n,
      )) {
        const g = good(e.good),
          u = unit(g.unitId),
          rate = (ledger.s.valuations || [])
            .filter((r) => r.good === g.id)
            .sort((a, b) => a.at.localeCompare(b.at))
            .at(-1);
        if (!rate) {
          missingRates++;
          valuations.push({
            cells: [
              g.name,
              name("funds", e.account),
              "نرخ ثبت نشده",
              "—",
              "—",
              "—",
              "—",
            ],
          });
          continue;
        }
        let quantity = e.quantity;
        if (rate.basis === "basePurity") {
          if (
            g.metal !== "طلا" ||
            g.mode !== "weight" ||
            !e.purity ||
            !u.factor
          ) {
            missingRates++;
            continue;
          }
          quantity = ledger.equivalent(
            mul(e.quantity, u.factor),
            e.purity,
            rate.basePurity,
          );
        }
        const value = mul(quantity, rate.rate),
          key = rate.quoteGood;
        valueTotals.set(key, add(valueTotals.get(key) || "0", value));
        valuations.push({
          cells: [
            g.name,
            name("funds", e.account),
            f(value),
            name("goods", key),
            rate.source,
            rate.at,
            rate.basis === "basePurity"
              ? "گرم طلای عیار " + f(rate.basePurity)
              : "هر " + u.name,
          ],
        });
      }
      host.append(
        card(
          el("h3", "ارزش‌گذاری با نرخ‌های ثبت‌شده"),
          el(
            "p",
            missingRates
              ? "ارزش کل کامل نیست؛ برای " +
                  f(missingRates) +
                  " ردیف نرخ معتبر ثبت نشده است."
              : "ارزش‌ها به تفکیک ارز گزارش محاسبه شده‌اند.",
            "n-muted",
          ),
          table(
            [
              "کالا",
              "صندوق",
              "ارزش",
              "ارز گزارش",
              "منبع نرخ",
              "زمان نرخ",
              "مبنای نرخ",
            ],
            valuations,
          ),
          ...[...valueTotals].map(([id, v]) =>
            el("p", "جمع اقلام دارای نرخ: " + f(v) + " " + name("goods", id)),
          ),
        ),
      );
      const trades = ledger.s.documents.filter(
        (d) =>
          ["buy", "sell"].includes(d.type) &&
          !ledger.s.documents.some((x) => x.reversalOf === d.id) &&
          (!filter.good || d.good === filter.good),
      );
      host.append(
        card(
          el("h3", "تعهدات دریافت و تحویل؛ جدا از موجودی فیزیکی"),
          table(
            ["سند", "شخص", "کالا", "در انتظار دریافت (+) / تحویل (−)", "واحد"],
            trades.map((d) => ({
              item: d,
              cells: [
                f(d.number),
                name("people", d.person),
                name("goods", d.good),
                f(ledger.remaining(d.id)),
                d.snapshots[d.good]?.unit?.name,
              ],
            })),
            (d) => btn("سند", () => showDocument(d.id)),
          ),
        ),
      );
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
    function reports() {
      const controls = el("div", null, "n-filters n-grid");
      const fields = [
        ["person", "people", "شخص"],
        ["good", "goods", "کالا / ارز"],
        ["group", "groups", "گروه کالا"],
        ["fund", "funds", "صندوق / بانک"],
        ["location", "locations", "محل"],
        ["expenseGroup", "expenseGroups", "دستهٔ هزینه"],
        ["expenseHead", "expenseHeads", "سرفصل هزینه"],
        ["incomeSource", "incomeSources", "منبع درآمد"],
        ["incomeType", "incomeTypes", "نوع درآمد"],
      ];
      for (const [key, kind, title] of fields) {
        const s = select(fieldOptions(kind, true), filter[key], "همه");
        s.onchange = () => {
          filter[key] = s.value;
          page = 0;
          render();
        };
        controls.append(field(title, s));
      }
      for (const [key, title, type] of [
        ["from", "از تاریخ", "date"],
        ["to", "تا تاریخ", "date"],
        ["q", "جست‌وجو در شرح", "text"],
        ["number", "شماره سند", "text"],
        ["purity", "عیار", "text"],
        ["min", "حداقل قدر مطلق مقدار", "text"],
        ["max", "حداکثر قدر مطلق مقدار", "text"],
      ]) {
        const c = input(filter[key] || "", type);
        c.onchange = () => {
          filter[key] = c.value;
          page = 0;
          render();
        };
        controls.append(field(title, c));
      }
      const op = select(choices(types), filter.type, "همهٔ عملیات");
      op.onchange = () => {
        filter.type = op.value;
        render();
      };
      controls.append(field("نوع واقعی عملیات", op));
      const bucket = select(
        choices({
          stock: "موجودی فیزیکی",
          person: "حساب اشخاص",
          expense: "هزینه‌ها",
          income: "درآمدها",
        }),
        filter.bucket,
        "همهٔ دفاتر",
      );
      bucket.onchange = () => {
        filter.bucket = bucket.value;
        render();
      };
      controls.append(field("دفتر", bucket));
      const tagMode = select(
        choices({ any: "حداقل یکی از برچسب‌ها", all: "همهٔ برچسب‌ها" }),
        filter.tagMode || "any",
        null,
      );
      tagMode.onchange = () => {
        filter.tagMode = tagMode.value;
        render();
      };
      controls.append(field("منطق برچسب‌ها", tagMode));
      const tbox = el("div", null, "n-chips");
      for (const t of ledger.s.tags) {
        const c = input("", "checkbox");
        c.checked = (filter.tags || []).includes(t.id);
        c.onchange = () => {
          filter.tags = [
            ...(filter.tags || []).filter((x) => x !== t.id),
            ...(c.checked ? [t.id] : []),
          ];
          render();
        };
        const l = field(t.name, c);
        l.className = "n-choice";
        tbox.append(l);
      }
      controls.append(field("برچسب‌ها", tbox));
      const status = select(
        choices({
          open: "تسویه‌نشده",
          partial: "تسویه جزئی",
          closed: "تسویه کامل",
          reversed: "برگشت‌شده",
        }),
        filter.status,
        "همهٔ وضعیت‌ها",
      );
      status.onchange = () => {
        filter.status = status.value;
        render();
      };
      controls.append(field("وضعیت معامله", status));
      host.append(card(controls));
      const reportSource = reportData();
      let entries = reportSource.entries.sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            String(a.at).localeCompare(String(b.at)),
        ),
        running = new Map();
      entries = entries.map((e) => {
        const key = [e.bucket, e.account, e.good, e.purity || ""].join("|"),
          before = running.get(key) || "0",
          after = add(before, e.quantity);
        running.set(key, after);
        return { ...e, before, after };
      });
      const docsById = reportSource.docs;
      function stateOf(d) {
        if (d.archive) return "";
        if (ledger.s.documents.some((x) => x.reversalOf === d.id))
          return "reversed";
        if (!["buy", "sell"].includes(d.type)) return "";
        const comps = ["goods", "money", "fee"],
          open = comps.some((c) => dec(ledger.remaining(d.id, c)) !== 0n),
          changed = ledger.s.documents.some((x) => x.related === d.id);
        return !open ? "closed" : changed ? "partial" : "open";
      }
      let rows = entries.filter((e) => {
        const g = good(e.good),
          d = docsById.get(e.document),
          fund = ledger.s.funds.find((x) => x.id === e.account),
          expense =
            e.bucket === "expense"
              ? e.accountSnapshot ||
                ledger.s.expenses.find((x) => x.id === e.account)
              : null,
          income =
            e.bucket === "income"
              ? e.accountSnapshot ||
                ledger.s.incomes.find((x) => x.id === e.account)
              : null,
          abs = dec(e.quantity) < 0n ? -dec(e.quantity) : dec(e.quantity);
        return (
          (!filter.from || e.date >= filter.from) &&
          (!filter.to || e.date <= filter.to) &&
          (!filter.person ||
            (e.bucket === "person" && e.account === filter.person) ||
            d.person === filter.person ||
            d.entries.some(
              (x) => x.bucket === "person" && x.account === filter.person,
            )) &&
          (!filter.good || e.good === filter.good) &&
          (!filter.group || g?.groupId === filter.group) &&
          (!filter.fund ||
            (e.bucket === "stock" && e.account === filter.fund)) &&
          (!filter.location || fund?.locationId === filter.location) &&
          (!filter.expenseGroup ||
            (e.bucket === "expense" &&
              expense?.groupId === filter.expenseGroup)) &&
          (!filter.expenseHead || expense?.headId === filter.expenseHead) &&
          (!filter.incomeSource ||
            (e.bucket === "income" &&
              income?.sourceId === filter.incomeSource)) &&
          (!filter.incomeType || income?.typeId === filter.incomeType) &&
          (!filter.type || e.type === filter.type) &&
          (!filter.bucket || e.bucket === filter.bucket) &&
          (!filter.number || String(d.number) === String(filter.number)) &&
          (!filter.q || norm(e.notes).includes(norm(filter.q))) &&
          (!filter.purity || e.purity === filter.purity) &&
          (!filter.min || abs >= dec(filter.min)) &&
          (!filter.max || abs <= dec(filter.max)) &&
          (!filter.status || stateOf(d) === filter.status) &&
          (!(filter.tags || []).length ||
            (filter.tagMode === "all"
              ? filter.tags.every((t) => e.tags.includes(t))
              : filter.tags.some((t) => e.tags.includes(t))))
        );
      });
      const sums = new Map();
      for (const e of rows) {
        const key = e.bucket + "|" + e.good + "|" + (e.purity || "");
        sums.set(key, add(sums.get(key) || "0", e.quantity));
      }
      const headers = [
        "تاریخ",
        "سند",
        "نوع",
        "دفتر",
        "حساب",
        "کالا",
        "ورود/بدهکار (+)",
        "خروج/بستانکار (−)",
        "واحد",
        "عیار",
        "معادل مبنا (گرم)",
        "مانده قبل",
        "مانده بعد",
        "شرح",
        "برچسب‌ها",
      ];
      const make = (e) => {
        const d = docsById.get(e.document),
          g = e.snapshot || good(e.good),
          u = g.unit || unit(g.unitId);
        return [
          e.date || e.originalDate || "تاریخ ثبت نشده",
          d.number,
          types[e.type] || e.type,
          {
            stock: "موجودی",
            person: "اشخاص",
            expense: "هزینه",
            income: "درآمد",
          }[e.bucket],
          accountName(e),
          g.name,
          dec(e.quantity) > 0n ? e.quantity : "0",
          dec(e.quantity) < 0n ? sub("0", e.quantity) : "0",
          u?.name || "",
          e.purity || "",
          g.metal === "طلا" && u?.factor && e.purity
            ? ledger.equivalent(mul(e.quantity, u.factor), e.purity)
            : "",
          e.before,
          e.after,
          e.notes,
          (e.tags || []).map((t) => name("tags", t)).join("، "),
        ];
      };
      const numeric = new Set([1, 6, 7, 9, 10, 11, 12]),
        sortCol = Number(filter.sortColumn ?? 0),
        direction = filter.sortDirection === "desc" ? -1 : 1;
      rows.sort((a, b) => {
        const x = make(a)[sortCol],
          y = make(b)[sortCol];
        if (
          numeric.has(sortCol) &&
          String(x ?? "") !== "" &&
          String(y ?? "") !== ""
        ) {
          const one = dec(x),
            two = dec(y);
          return (one < two ? -1 : one > two ? 1 : 0) * direction;
        }
        return String(x ?? "").localeCompare(String(y ?? ""), "fa") * direction;
      });
      const columns = filter.columns || headers.map((_, i) => i),
        shownHeaders = columns.map((i) => headers[i]);
      latestRows = rows.map(make).map((r) => columns.map((i) => r[i]));
      latestHeaders = shownHeaders;
      latestTitle = "گزارش گردش اسناد";
      const sortControl = select(
        headers.map((name, i) => ({ id: String(i), name })),
        String(sortCol),
        null,
      );
      sortControl.onchange = () => {
        filter.sortColumn = Number(sortControl.value);
        render();
      };
      const dirControl = select(
        choices({ asc: "صعودی", desc: "نزولی" }),
        filter.sortDirection || "asc",
        null,
      );
      dirControl.onchange = () => {
        filter.sortDirection = dirControl.value;
        render();
      };
      const choose = el("details"),
        columnSummary = el("summary", "انتخاب ستون‌ها");
      choose.append(columnSummary);
      headers.forEach((h, i) => {
        const c = input("", "checkbox");
        c.checked = columns.includes(i);
        c.onchange = () => {
          filter.columns = headers
            .map((_, j) => j)
            .filter((j) => (j === i ? c.checked : columns.includes(j)));
          if (!filter.columns.length) filter.columns = [0];
          render();
        };
        const label = field(h, c);
        label.className = "n-choice";
        choose.append(label);
      });
      host.append(
        bar(
          field("مرتب‌سازی", sortControl),
          field("ترتیب", dirControl),
          choose,
        ),
      );
      host.append(
        bar(
          btn("خروجی CSV", () => exportReport("csv")),
          btn("خروجی Excel", () => exportReport("xls")),
          btn("چاپ / ذخیره PDF", printReport),
          btn("پاک‌کردن فیلترها", () => {
            filter = {};
            page = 0;
            render();
          }),
        ),
        el(
          "p",
          "تهیه گزارش: " +
            new Date().toLocaleString("fa-IR") +
            " · " +
            f(rows.length) +
            " ردیف · فیلترها: " +
            JSON.stringify(filter),
          "n-muted",
        ),
      );
      const summary = el("div", null, "n-chips");
      for (const [k, sum] of sums) {
        const [b, id, p] = k.split("|");
        summary.append(
          el(
            "span",
            {
              stock: "موجودی",
              person: "اشخاص",
              expense: "هزینه",
              income: "درآمد",
            }[b] +
              " · " +
              name("goods", id) +
              " · " +
              f(sum) +
              " " +
              name("units", good(id)?.unitId) +
              (p ? " · عیار " + f(p) : ""),
            "n-chip",
          ),
        );
      }
      host.append(
        card(
          el("h3", "جمع تغییرات ردیف‌های فیلترشده، به تفکیک دفتر و دارایی"),
          summary,
        ),
      );
      const size = 50,
        max = Math.max(0, Math.ceil(rows.length / size) - 1);
      page = Math.min(page, max);
      host.append(
        table(
          shownHeaders,
          rows.slice(page * size, (page + 1) * size).map((e) => ({
            item: e,
            cells: columns.map((i) =>
              numeric.has(i) ? f(make(e)[i]) : make(e)[i],
            ),
          })),
          (e) =>
            btn("سند اصلی", () => {
              const d = docsById.get(e.document);
              d.archive ? showArchive(d) : showDocument(e.document);
            }),
        ),
        bar(
          btn("صفحه قبل", () => {
            page = Math.max(0, page - 1);
            render();
          }),
          el("span", "صفحه " + f(page + 1) + " از " + f(max + 1)),
          btn("صفحه بعد", () => {
            page = Math.min(max, page + 1);
            render();
          }),
        ),
      );
      installmentReport();
    }
    function printReport() {
      const w = window.open("", "_blank", "width=1200,height=850");
      if (!w)
        throw Error("برای چاپ، بازشدن پنجرهٔ گزارش را در مرورگر مجاز کنید");
      const d = w.document;
      d.documentElement.lang = "fa";
      d.documentElement.dir = "rtl";
      d.title = latestTitle;
      const style = d.createElement("style");
      style.textContent =
        "body{font:12px Tahoma;direction:rtl;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;text-align:right}thead{display:table-header-group}tr{break-inside:avoid}h1{font-size:20px}@page{size:A4 landscape;margin:10mm}";
      d.head.append(style);
      d.body.append(d.createElement("h1"));
      d.body.lastChild.textContent = latestTitle;
      const note = d.createElement("p");
      note.textContent =
        "زمان تهیه: " +
        new Date().toLocaleString("fa-IR") +
        " · " +
        latestRows.length +
        " ردیف · فیلترها: " +
        JSON.stringify(filter);
      d.body.append(note);
      const t = d.createElement("table"),
        thead = d.createElement("thead"),
        tr = d.createElement("tr");
      for (const h of latestHeaders) {
        const th = d.createElement("th");
        th.textContent = h;
        tr.append(th);
      }
      thead.append(tr);
      t.append(thead);
      const body = d.createElement("tbody");
      for (const row of latestRows) {
        const tr = d.createElement("tr");
        for (const v of row) {
          const td = d.createElement("td");
          td.textContent = String(v ?? "");
          tr.append(td);
        }
        body.append(tr);
      }
      t.append(body);
      d.body.append(t);
      w.focus();
      setTimeout(() => w.print(), 250);
    }
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
      const source = bridge.installments?.() || [];
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
      invoice: "operations",
      reconcile: "inventory",
      reports: "reports",
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
          document.body.classList.remove("next204-active");
          host.hidden = true;
        }
      },
      true,
    );
    document.querySelectorAll("aside small").forEach((e) => {
      if (e.textContent.includes("۲۰۳"))
        e.textContent = "نسخهٔ مرورگر · آپدیت ۲۰۷";
    });
    const menu =
      document.getElementById("groupsMenu200") ||
      document.querySelector("aside");
    for (const next of [
      "funds",
      "expense",
      "income",
      "people",
      "goods",
      "tags",
      "banks",
    ]) {
      let b = [...menu.querySelectorAll("button")].find(
        (b) => integrations[b.dataset.page] === next,
      );
      if (!b) {
        b = btn(labels[next], () => go(next));
        menu.append(b);
      }
      b.dataset.next204 = next;
      b.textContent = labels[next];
    }
    for (const r of ["accounts", "settings"]) {
      const b = btn(labels[r], () => go(r));
      b.dataset.next204 = r;
      document.querySelector("aside").append(b);
    }
    for (const [r, title] of [
      ["units", "معرفی واحدها"],
      ["assets", "معرفی دارایی‌ها"],
    ]) {
      let b = document.querySelector('aside button[data-page="' + r + '"]');
      if (b) b.textContent = title;
    }
    document.getElementById("introductionMenu")?.remove();
    // Stop legacy invoice shortcuts from posting hidden forms while a new screen is active.
    window.addEventListener(
      "keydown",
      (e) => {
        if (!document.body.classList.contains("next204-active")) return;
        if (["F1", "F2", "F3", "F4", "F5", "F12"].includes(e.key)) {
          if (e.key !== "F5" && e.key !== "F12") e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    document.title = "حسابداری صدرا | نسخهٔ آزمایشی ۲۰۷";
    window.addEventListener("load", () => {
      document.title = "حسابداری صدرا | نسخهٔ آزمایشی ۲۰۷";
    });
    const api = {
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
          .filter((e) => docsAreNew(e))
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
    go("funds");
    return api;
  },
};
