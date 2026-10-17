/* Sadra accounting: exact decimal amounts and an append-only local event ledger. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object") module.exports = api;
  else root.SadraCore = api;
})(globalThis, () => {
  "use strict";
  const SCALE = 100000000n,
    clone = (x) => structuredClone(x),
    norm = (s) =>
      String(s ?? "")
        .normalize("NFKC")
        .replace(/[\u2066-\u2069]/g, "")
        .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
        .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/[\s\u200c]+/g, " ")
        .trim()
        .toLocaleLowerCase("fa");
  function dec(v) {
    let s = String(v ?? "0")
      .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
      .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
      .replace(/[٬,\s\u2066-\u2069]/g, "")
      .replace(/٫/g, ".");
    if (!/^-?\d+(\.\d{1,8})?$/.test(s))
      throw Error("عدد معتبر با حداکثر ۸ رقم اعشار وارد کنید");
    let neg = s[0] === "-";
    if (neg) s = s.slice(1);
    const [a, b = ""] = s.split(".");
    return (BigInt(a) * SCALE + BigInt(b.padEnd(8, "0"))) * (neg ? -1n : 1n);
  }
  function str(n) {
    const sign = n < 0n ? "-" : "";
    if (n < 0n) n = -n;
    const f = String(n % SCALE)
      .padStart(8, "0")
      .replace(/0+$/, "");
    return sign + String(n / SCALE) + (f ? "." + f : "");
  }
  const add = (a, b) => str(dec(a) + dec(b)),
    sub = (a, b) => str(dec(a) - dec(b));
  function divRound(a, b) {
    if (!b) throw Error("تقسیم بر صفر مجاز نیست");
    let neg = a < 0n !== b < 0n;
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    return (a / b + ((a % b) * 2n >= b ? 1n : 0n)) * (neg ? -1n : 1n);
  }
  const mul = (a, b) => str(divRound(dec(a) * dec(b), SCALE)),
    div = (a, b) => str(divRound(dec(a) * SCALE, dec(b))),
    pos = (v) => {
      if (dec(v) <= 0n) throw Error("مقدار باید مثبت باشد");
      return str(dec(v));
    };
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  function fresh() {
    return {
      schema: 1,
      revision: 0,
      basePurity: "750",
      units: [],
      assets: [],
      assetTypes: [],
      materials: [],
      groups: [],
      fundTypes: [
        { id: "currency", name: "ارزی", nature: "currency", active: true },
        { id: "commodity", name: "کالایی", nature: "commodity", active: true },
      ],
      locations: [],
      funds: [],
      bankInstitutions: [],
      expenseGroups: [],
      expenseHeads: [],
      expenses: [],
      incomeSources: [],
      incomeTypes: [],
      incomes: [],
      peopleGroups: [],
      people: [],
      goods: [],
      tags: [],
      documents: [],
      reservations: [],
      audit: [],
      legacy: null,
    };
  }
  function formatNumber(value,{unit=null,plus=false,group=true,decimals=null,minDecimals=0,isolate=true}={}) {
    if(value===undefined || value===null || value==="")return "—";
    const raw=String(value).replace(/[\u2066-\u2069]/g,"").replace(/−/g,"-").replace(/^\+/,"");
    let number=dec(raw);
    const gram=unit && (typeof unit==="string"?norm(unit)===norm("گرم"):unit.dimension==="weight" && norm(unit.name)===norm("گرم"));
    if(gram){decimals=3;minDecimals=3;group=false;}else if(unit?.dimension==="weight")group=false;
    if(decimals!==null){const step=10n**BigInt(8-decimals);number=divRound(number,step)*step;}
    const sign=number<0n?"-":plus && number>0n?"+":"";
    let [whole,fraction=""]=str(number<0n?-number:number).split(".");
    fraction=fraction.padEnd(minDecimals,"0");if(group)whole=whole.replace(/\B(?=(\d{3})+(?!\d))/g,",");
    const text=(sign+whole+(fraction?"."+fraction:"")).replace(/\d/g,c=>"۰۱۲۳۴۵۶۷۸۹"[c]);
    return isolate?"\u2066"+text+"\u2069":text;
  }
  class Ledger {
    constructor(state = fresh(), save = () => {}) {
      if (state.schema !== 1) throw Error("نسخه داده پشتیبانی نمی‌شود");
      this.s = clone(state);
      this.s.bankInstitutions ||= [];
      this.save = save;
    }
    transaction(fn) {
      const before = clone(this.s), nested = (this.transactionDepth || 0) > 0;
      this.transactionDepth = (this.transactionDepth || 0) + 1;
      try {
        const result = fn();
        if (!nested) { this.s.revision++; this.save(clone(this.s)); }
        return result;
      } catch (e) {
        this.s = before;
        throw e;
      } finally { this.transactionDepth--; }
    }
    find(kind, id, active = false) {
      const x = this.s[kind]?.find((x) => x.id === id);
      if (!x || (active && x.active === false))
        throw Error("مورد معتبر و فعال در " + kind + " انتخاب کنید");
      if (active && kind === "goods") {
        this.find("units", x.unitId, true);
        this.find("assets", x.assetId, true);
      }
      return x;
    }
    audit(action, kind, id, before, after) {
      this.s.audit.push({
        id: uid(),
        at: new Date().toISOString(),
        action,
        kind,
        record: id,
        before: clone(before ?? null),
        after: clone(after ?? null),
      });
    }
    used(kind, id) {
      if ((this.s.installmentContracts214 || []).some(c => c.partyId === id || c.bankId === id || c.groupId === id || c.goodsGroup === id || c.good === id || c.tags?.includes(id)) ||
          (this.s.invoiceHeaders214 || []).some(d => d.partyId === id || d.bankId === id || d.groupId === id || d.rows?.some(r=>r.good===id || r.goodsGroup===id || r.assetId===id || r.partyId===id || r.bankId===id || r.groupId===id || r.contractId===id || r.tags?.includes(id)))) return true;
      const legacy = this.s.legacy?.references || this.s.legacy?.raw?.db || {};
      if (
        (legacy.installmentContracts || []).some(
          (c) => c.partyId === id || c.bankAccountId === id || c.good === id,
        ) ||
        (legacy.openingBalances || []).some(
          (x) => x.id === id || x.good === id,
        ) ||
        (legacy.balanceAdjustments || []).some(
          (x) => x.id === id || x.good === id,
        )
      )
        return true;
      if (kind === "units" && (legacy.goods || []).some((g) => g.unitId === id))
        return true;
      if (
        kind === "assets" &&
        (legacy.goods || []).some((g) => g.assetId === id)
      )
        return true;
      if (
        kind === "goods" &&
        (legacy.goods || []).some((g) => g.settlementGood === id)
      )
        return true;
      if (
        (this.s.legacy?.documents || []).some(
          (d) =>
            d.head?.id === id ||
            (d.rows || []).some(
              (r) => r.good === id || r.target === id || r.tag === id,
            ),
        )
      )
        return true;
      if (
        this.s.documents.some(
          (d) =>
            d.entries.some(
              (e) => e.good === id || e.account === id || e.lot === id || e.lineTags?.includes(id),
            ) ||
            d.tags?.includes(id) ||
            d.good === id ||
            d.person === id ||
            d.tags?.includes(id),
        )
      )
        return true;
      const refs = {
        materials: ["materialId"],
        units: ["unitId", "rateUnitId", "standardWeightUnitId", "catalogUnitId", "catalogRateUnitId", "catalogPieceUnitId"],
        assets: ["assetId"],
        assetTypes: ["assetTypeId"],
        goods: ["good", "feeGoodId", "moneyGood", "quoteGood", "toGood"],
        funds: ["fund"],
        bankInstitutions: ["bankId"],
        groups: ["groupId", "parentId"],
        locations: ["locationId"],
        fundTypes: ["typeId"],
        expenseGroups: ["groupId"],
        expenseHeads: ["headId", "parentId"],
        incomeSources: ["sourceId"],
        incomeTypes: ["typeId"],
        peopleGroups: ["groupId"],
      };
      return Object.values(this.s)
        .filter(Array.isArray)
        .some((a) =>
          a.some(
            (x) =>
              x.tags?.includes(id) ||
              (refs[kind] || []).some((k) => x[k] === id),
          ),
        );
    }
    put(kind, data) {
      return this.transaction(() => {
        if (
          !Array.isArray(this.s[kind]) ||
          ["documents", "audit", "reservations"].includes(kind)
        )
          throw Error("فهرست نامعتبر");
        const old = data.id ? this.s[kind].find((x) => x.id === data.id) : null;
        const catalogId=kind==="goods" && !old && (this.s.catalogGoods || []).some(g=>g.id===data.id);
        if (data.id && !old && !catalogId) throw Error("رکورد یافت نشد");
        const before = clone(old || null),
          x = {
            ...old,
            ...clone(data),
            id: old?.id || (catalogId?data.id:uid()),
            active: data.active ?? old?.active ?? true,
            created: old?.created || new Date().toISOString(),
            updated: new Date().toISOString(),
          };
        if (
          kind === "funds" &&
          x.legacyKind === "banks" &&
          x.bankId &&
          x.assetId
        )
          x.name =
            this.find("bankInstitutions", x.bankId).name +
            " / " +
            String(x.accountNumber || "شماره تعیین نشده") +
            " / " +
            this.find("assets", x.assetId).name;
        x.name = String(x.name ?? "").trim();
        if (!norm(x.name)) throw Error("نام الزامی است");
        const scope = (v) =>
          kind === "expenseHeads"
            ? v.groupId + "|" + (v.parentId || "")
            : kind === "expenses"
              ? v.groupId + "|" + v.headId
              : kind === "groups"
                ? v.parentId || ""
                : kind === "people"
                  ? v.groupId
                  : kind === "incomes"
                    ? v.sourceId + "|" + v.typeId
                    : "";
        if (
          this.s[kind].some(
            (a) =>
              a.id !== x.id &&
              norm(a.name) === norm(x.name) &&
              scope(a) === scope(x),
          )
        )
          throw Error("این نام در همین محدوده قبلاً ثبت شده است");
        if (x.tags) {
          if (!Array.isArray(x.tags)) throw Error("فهرست برچسب‌ها نامعتبر است");
          x.tags = [...new Set(x.tags)];
          for (const id of x.tags) {
            const t = this.find("tags", id);
            if (t.active === false && !old?.tags?.includes(id))
              throw Error("برچسب غیرفعال برای اتصال جدید مجاز نیست");
          }
        }
        if (kind === "tags") {
          if (!/^#[\da-f]{6}$/i.test(x.color || ""))
            throw Error("کد رنگ باید HEX شش‌رقمی معتبر باشد");
        }
        const metadata = new Set([
          "id",
          "name",
          "active",
          "description",
          "shortName",
          "phone",
          "tags",
          "color",
          "created",
          "updated",
        ]);
        if (
          old &&
          Object.keys(x).every(
            (k) =>
              metadata.has(k) ||
              JSON.stringify(x[k]) === JSON.stringify(old[k]),
          )
        ) {
          Object.assign(old, x);
          if (kind === "bankInstitutions")
            for (const fund of this.s.funds.filter((f) => f.bankId === x.id))
              fund.name =
                x.name +
                " / " +
                (fund.accountNumber || "شماره تعیین نشده") +
                " / " +
                this.find("assets", fund.assetId).name;
          this.audit("save", kind, x.id, before, x);
          return clone(x);
        }
        if (kind === "units") {
          if (!["weight", "count", "currency"].includes(x.dimension))
            throw Error("نوع واحد نامعتبر");
          x.decimals = Number(norm(x.decimals).replace(/[,٬]/g,""));
          if (!Number.isInteger(x.decimals) || x.decimals < 0 || x.decimals > 8)
            throw Error("دقت واحد باید از صفر تا ۸ باشد");
          x.factor = x.factor ? pos(x.factor) : null;
          if (x.dimension === "weight" && !x.factor)
            throw Error("ضریب معتبر نسبت به گرم لازم است");
          if (x.dimension !== "weight" && x.factor && !x.reference)
            throw Error("مرجع تبدیل را مشخص کنید");
          if (
            old &&
            this.used(kind, x.id) &&
            [
              "dimension",
              "factor",
              "reference",
              "decimals",
              "currencyCode",
            ].some((k) => x[k] !== old[k])
          )
            throw Error(
              "واحد استفاده‌شده فقط قابل تغییر نام یا غیرفعال‌سازی است",
            );
        }
        if (kind === "assets") {
          const u = this.find("units", x.unitId, true);
          if (!["currency", "commodity"].includes(x.nature))
            throw Error("ماهیت دارایی نامعتبر");
          if ((x.nature === "currency") !== (u.dimension === "currency"))
            throw Error("واحد با ماهیت دارایی سازگار نیست");
          x.decimals = Number(norm(x.decimals ?? u.decimals).replace(/[,٬]/g,""));
          if (
            !Number.isInteger(x.decimals) ||
            x.decimals < 0 ||
            x.decimals > u.decimals
          )
            throw Error("دقت دارایی نامعتبر");
          if (
            old &&
            this.used(kind, x.id) &&
            ["nature", "unitId"].some((k) => old[k] !== x[k])
          )
            throw Error("ماهیت و واحد دارایی استفاده‌شده قابل تغییر نیست");
        }
        if (kind === "assetTypes") {
          if (!["weight", "count", "currency"].includes(x.mode))
            throw Error("مبنای حسابداری نوع دارایی را انتخاب کنید");
          if (old && this.used(kind, x.id) && old.mode !== x.mode)
            throw Error("مبنای نوع دارایی استفاده‌شده قابل تغییر نیست");
        }
        if (kind === "fundTypes") {
          if (!["commodity", "currency"].includes(x.nature))
            throw Error("ماهیت نوع صندوق را مشخص کنید");
          if (old && this.used(kind, x.id) && old.nature !== x.nature)
            throw Error("ماهیت نوع صندوق استفاده‌شده قابل تغییر نیست");
        }
        if (kind === "funds") {
          if (x.legacyKind === "banks") {
            const bank = this.find(
                "bankInstitutions",
                x.bankId,
                !old || old.bankId !== x.bankId,
              ),
              asset = this.find(
                "assets",
                x.assetId,
                !old || old.assetId !== x.assetId,
              );
            if (asset.nature !== "currency")
              throw Error("برای حساب بانکی، دارایی پولی انتخاب کنید");
            x.accountNumber = String(x.accountNumber || "").trim();
            if (!x.accountNumber) throw Error("شماره حساب الزامی است");
            const number = (s) =>
              norm(s)
                .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
                .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
                .replace(/[\s-]/g, "");
            if (
              this.s.funds.some(
                (f) =>
                  f.id !== x.id &&
                  f.legacyKind === "banks" &&
                  f.bankId === x.bankId &&
                  number(f.accountNumber) === number(x.accountNumber),
              )
            )
              throw Error("این شماره حساب در همین بانک قبلاً ثبت شده است");
            x.nature = "currency";
            x.typeId = "currency";
            x.name = bank.name + " / " + x.accountNumber + " / " + asset.name;
            if (old && this.used(kind, x.id) && old.assetId !== x.assetId)
              throw Error(
                "واحد پول حساب دارای سند قابل تغییر نیست؛ حساب جدید تعریف کنید",
              );
          } else {
            if (x.locationId && (!old || x.locationId !== old.locationId))
              this.find("locations", x.locationId, true);
            const t = this.find("fundTypes", x.typeId, true);
            x.nature = t.nature;
          }
          if (old && this.used(kind, x.id) && x.nature !== old.nature)
            throw Error("ماهیت صندوق دارای سابقه قابل تغییر نیست");
        }
        if (kind === "people") this.find("peopleGroups", x.groupId, true);
        if (kind === "groups" && x.parentId) {
          let p = this.find("groups", x.parentId, true),
            seen = new Set([x.id]);
          while (p) {
            if (seen.has(p.id)) throw Error("گروه‌بندی حلقوی مجاز نیست");
            seen.add(p.id);
            p = p.parentId ? this.find("groups", p.parentId) : null;
          }
        }
        if (kind === "expenseHeads") {
          this.find("expenseGroups", x.groupId, true);
          if (x.parentId) {
            const p = this.find("expenseHeads", x.parentId, true);
            if (p.groupId !== x.groupId || p.id === x.id || p.parentId)
              throw Error("زیرسرفصل باید به سرفصل اصلی همان دسته متصل باشد");
          }
          if (
            old &&
            this.used(kind, x.id) &&
            (old.groupId !== x.groupId || old.parentId !== x.parentId)
          )
            throw Error("ساختار سرفصل استفاده‌شده قابل تغییر نیست");
        }
        if (kind === "expenses") {
          this.find("expenseGroups", x.groupId, true);
          const h = x.headId ? this.find("expenseHeads", x.headId, true) : null;
          if (h && h.groupId !== x.groupId)
            throw Error("سرفصل متعلق به دسته انتخاب‌شده نیست");
        }
        if (kind === "incomes") {
          if (x.sourceId) this.find("incomeSources", x.sourceId, !old || old.sourceId !== x.sourceId);
          if (x.typeId) this.find("incomeTypes", x.typeId, !old || old.typeId !== x.typeId);
        }
        if (kind === "goods") {
          const a = this.find("assets", x.assetId, true),
            u = this.find("units", x.unitId, true);
          if (!["currency", "count", "weight"].includes(x.mode))
            throw Error("روش موجودی نامعتبر");
          if (
            (x.mode === "currency") !== (a.nature === "currency") ||
            u.dimension !== x.mode
          )
            throw Error("واحد و ماهیت دارایی با روش موجودی سازگار نیست");
          if (
            x.assetTypeId &&
            this.find("assetTypes", x.assetTypeId, true).mode !== x.mode
          )
            throw Error("نوع دارایی با مبنای محاسبه کالا سازگار نیست");
          if (x.groupId) this.find("groups", x.groupId, true);
          if (x.subgroupId) {
            const g = this.find("groups", x.subgroupId, true);
            if (g.parentId !== x.groupId)
              throw Error("زیرگروه متعلق به گروه انتخاب‌شده نیست");
          }
          if (x.mode === "currency" && x.unitId !== a.unitId)
            throw Error("واحد ارز باید همان واحد دارایی باشد");
          if (x.standardWeight) {
            x.standardWeight = pos(x.standardWeight);
            const w = this.find("units", x.standardWeightUnitId, true);
            if (w.dimension !== "weight")
              throw Error("واحد وزن استاندارد معتبر نیست");
          }
          if (x.purity) {
            x.purity = pos(x.purity);
            if (dec(x.purity) > dec("1000") || !x.metal)
              throw Error("فلز و عیار بین صفر و ۱۰۰۰ لازم است");
          }
          const allowed =
            x.mode === "currency"
              ? ["none"]
              : x.mode === "count"
                ? ["none", "fixed", "variable"]
                : ["none", "fixed", "variable", "gold"];
          if (!allowed.includes(x.feeMode || "none"))
            throw Error("روش کارمزد برای این کالا مجاز نیست");
          if (x.feeMode === "fixed") x.feeValue = pos(x.feeValue);
          if (x.feeMode === "gold") {
            if (x.metal !== "طلا")
              throw Error("کارمزد طلایی فقط برای کالای طلا مجاز است");
            x.feePercent = pos(x.feePercent);
            if (dec(x.feePercent) > dec("100"))
              throw Error("درصد بیش از ۱۰۰ مجاز نیست");
          }
          const rate = this.find("units", x.rateUnitId || x.unitId, true);
          if (
            rate.dimension !== u.dimension ||
            (u.dimension !== "weight" && rate.id !== u.id)
          )
            throw Error("واحد نرخ با واحد موجودی سازگار نیست");
          x.rateUnitId = rate.id;
          if (
            old &&
            this.used(kind, x.id) &&
            ["mode", "unitId", "assetId", "metal"].some((k) => old[k] !== x[k])
          )
            throw Error(
              "ماهیت و واحد کالای دارای سابقه قابل تغییر نیست؛ کالای جدید تعریف کنید",
            );
        }
        if (old) Object.assign(old, x);
        else this.s[kind].push(x);
        this.audit("save", kind, x.id, before, x);
        return clone(x);
      });
    }
    remove(kind, id) {
      return this.transaction(() => {
        this.find(kind, id);
        if (this.used(kind, id))
          throw Error(
            "این مورد دارای ارتباط است؛ به‌جای حذف آن را غیرفعال کنید",
          );
        const old = this.find(kind, id);
        this.s[kind] = this.s[kind].filter((x) => x.id !== id);
        this.audit("delete", kind, id, old, null);
      });
    }
    convert(value, from, to) {
      const a = this.find("units", from),
        b = this.find("units", to);
      if (a.id === b.id) return str(dec(value));
      if (
        a.dimension !== b.dimension ||
        a.dimension === "currency" ||
        !a.factor ||
        !b.factor ||
        (a.dimension !== "weight" &&
          (!a.reference || a.reference !== b.reference))
      )
        throw Error("تبدیل معتبر بین این واحدها تعریف نشده است");
      return div(mul(value, a.factor), b.factor);
    }
    precision(v, unit) {
      const n = dec(v),
        d = this.find("units", unit).decimals;
      if (n % 10n ** BigInt(8 - d) !== 0n)
        throw Error("مقدار بیش از دقت مجاز واحد اعشار دارد");
      return str(n);
    }
    quantity(g, input) {
      let q = input.quantity,
        count = input.count ? pos(input.count) : null,
        standard = null;
      if (count && dec(count) % SCALE !== 0n)
        throw Error("تعداد قطعات باید صحیح باشد");
      if (count && g.standardWeight)
        standard = this.convert(
          mul(count, g.standardWeight),
          g.standardWeightUnitId,
          g.unitId,
        );
      if (g.mode === "weight") {
        if (input.actualWeight) {
          if (!g.allowActual)
            throw Error("ثبت وزن واقعی برای این کالا مجاز نیست");
          q = input.actualWeight;
        } else if (standard) {
          if (q && dec(q) !== dec(standard))
            throw Error(
              "وزن با تعداد و وزن استاندارد سازگار نیست؛ وزن واقعی را در فیلد مجاز ثبت کنید",
            );
          q = standard;
        }
      }
      if (g.mode === "count") {
        q = q || count;
        count = q;
      }
      q = this.precision(pos(q), g.unitId);
      return {
        quantity: q,
        count,
        standard,
        actualWeight: g.mode === "weight" ? q : null,
      };
    }
    round(value, unit) {
      const d = this.find("units", unit).decimals,
        step = 10n ** BigInt(8 - d);
      return str(divRound(dec(value), step) * step);
    }
    fee(g, q, input) {
      const mode = g.feeMode || "none";
      if (mode === "none") return [];
      if (mode === "gold") {
        const percent =
          input.feePercent && g.allowFeeOverride
            ? pos(input.feePercent)
            : g.feePercent;
        if (dec(percent) > dec("100")) throw Error("درصد نامعتبر");
        return [
          {
            kind: "gold",
            quantity: div(mul(q.quantity, percent), "100"),
            good: g.id,
            percent,
          },
        ];
      }
      if (!q.count) throw Error("برای کارمزد هر قطعه، تعداد را وارد کنید");
      const per = mode === "fixed" ? g.feeValue : pos(input.feeValue);
      const money = this.find("goods", g.feeGoodId, true),
        asset = this.find("assets", money.assetId);
      if (
        money.mode !== "currency" ||
        this.find("units", asset.unitId).currencyCode !== "IRT"
      )
        throw Error("دارایی کارمزد تومانی را انتخاب کنید");
      return [
        {
          kind: "money",
          quantity: this.precision(mul(q.count, per), money.unitId),
          good: money.id,
          perUnit: per,
        },
      ];
    }
    entries() {
      return this.s.documents.flatMap((d) =>
        d.entries.map((e) => ({
          ...e,
          document: d.id,
          date: d.date,
          type: d.type,
          notes: d.notes,
          tags: [...new Set([...(d.tags || []), ...(e.lineTags || [])])],
          snapshot: d.snapshots?.[e.good],
          reversalOf: d.reversalOf,
          at: d.created,
        })),
      );
    }
    setup221() {
      if(this.s.version221)return;
      return this.transaction(()=>{
        this.s.materials ||= [];
        for(const name of ["طلا","نقره","تیتانیوم","رودیوم",...this.s.goods.map(g=>g.balanceMaterial220 || g.metal).filter(n=>n && n!=="عیاردار")])if(!this.s.materials.some(m=>norm(m.name)===norm(name)))this.s.materials.push({id:uid(),name,active:true});
        for(const g of this.s.goods){if(g.mode!=="weight")continue;let name=g.balanceMaterial220 || (g.metal!=="عیاردار"?g.metal:"");if(!name && /(?:نیم|تمام).*غیر/.test(norm(g.name)))name="طلا";const material=this.s.materials.find(m=>norm(m.name)===norm(name));if(material){g.materialId=material.id;g.balanceMaterial220=material.name;const draft=this.s.catalogGoods?.find(d=>d.id===g.id);if(draft){draft.materialId=material.id;draft.balanceMaterial220=material.name;}}}
        for(const d of this.s.catalogGoods || []){if(d.catalogFeeBasis==="perPiece" && d.catalogHasFee==="yes" && !d.feeCurrency221){if(d.catalogFeeValue)d.catalogFeeValue=div(d.catalogFeeValue,"10");d.feeCurrency221="IRT";}}
        let unit=this.s.units.find(u=>u.dimension==="currency" && (u.currencyCode==="IRT" || norm(u.name)===norm("تومان")));
        if(!unit){unit={id:uid(),name:"تومان",dimension:"currency",currencyCode:"IRT",decimals:8,active:true};this.s.units.push(unit);}unit.active=true;unit.currencyCode="IRT";
        let asset=this.s.assets.find(a=>a.nature==="currency" && a.unitId===unit.id);if(!asset){asset={id:uid(),name:"تومان",nature:"currency",unitId:unit.id,decimals:unit.decimals,active:true};this.s.assets.push(asset);}asset.active=true;
        let money=this.s.goods.find(g=>g.mode==="currency" && g.assetId===asset.id);if(!money){money={id:uid(),name:"تومان",mode:"currency",assetId:asset.id,unitId:unit.id,rateUnitId:unit.id,feeMode:"none",active:true};this.s.goods.push(money);}money.active=true;
        const rialUnits=new Set(this.s.units.filter(u=>u.currencyCode==="IRR" || norm(u.name)===norm("ریال")).map(u=>u.id)),rialAssets=new Set(this.s.assets.filter(a=>rialUnits.has(a.unitId)).map(a=>a.id)),rialGoods=new Set(this.s.goods.filter(g=>g.mode==="currency" && rialAssets.has(g.assetId)).map(g=>g.id));
        const cv=v=>v===undefined || v===null || v===""?v:div(v,"10"),snap={...clone(money),unit:clone(unit),asset:clone(asset)};
        const fee=f=>{if(rialGoods.has(f.good)){f.good=money.id;for(const k of ["quantity","signedQuantity","value","perUnit"])if(f[k]!==undefined)f[k]=cv(f[k]);f.unitId=unit.id;f.unitName="تومان";}};
        for(const d of this.s.documents){if(d.entries.some(e=>rialGoods.has(e.good))){d.beforeToman221={entries:clone(d.entries),snapshots:clone(d.snapshots),good:d.good,quantity:d.quantity,baseAmount:d.baseAmount};for(const e of d.entries)if(rialGoods.has(e.good)){e.good=money.id;e.quantity=cv(e.quantity);if(e.accountSnapshot?.assetId && rialAssets.has(e.accountSnapshot.assetId))e.accountSnapshot.assetId=asset.id;}d.snapshots ||= {};d.snapshots[money.id]=clone(snap);}
          if(rialGoods.has(d.good)){d.good=money.id;d.quantity=cv(d.quantity);}
          if(rialGoods.has(d.moneyGood)){d.moneyGood=money.id;for(const k of ["baseAmount","unroundedBase","rate"])if(d[k]!==undefined)d[k]=cv(d[k]);}
          for(const f of d.fees || [])fee(f);
        }
        for(const h of this.s.invoiceHeaders214 || [])for(const r of h.rows || []){if(rialAssets.has(r.assetId) && r.receiptKind==="currency"){r.assetId=asset.id;r.assetName="تومان";r.unitId=unit.id;for(const k of ["amount","displayAmount","signedAmount"])if(r[k]!==undefined)r[k]=cv(r[k]);}if(r.feeValue && !r.feeDetails?.some(f=>f.basis==="weightPercent") && !this.s.goods.some(g=>g.id===r.good && g.feeMode==="gold") && !(this.s.catalogGoods || []).find(g=>g.id===r.good && g.catalogFeeBasis==="weightPercent"))r.feeValue=cv(r.feeValue);for(const f of r.feeDetails || [])fee(f);}
        const contracts=new Set();for(const c of this.s.installmentContracts214 || [])if(rialGoods.has(c.good)){contracts.add(c.id);c.good=money.id;c.goodName="تومان";c.unit=clone(unit);c.amount=cv(c.amount);c.total=cv(c.total);for(const d of c.dues)d.amount=cv(d.amount);}
        for(const p of this.s.installmentSettlements216 || [])if(contracts.has(p.contractId))p.amount=cv(p.amount);
        for(const f of this.s.funds)if(rialAssets.has(f.assetId)){f.beforeToman221=clone(f);f.assetId=asset.id;}
        for(const g of this.s.goods)if(rialGoods.has(g.id))g.active=false;
        for(const a of this.s.assets)if(rialAssets.has(a.id))a.active=false;
        for(const u of this.s.units)if(rialUnits.has(u.id))u.active=false;
        for(const e of this.s.legacyBalances || [])if(rialGoods.has(e.good)){e.good=money.id;e.quantity=cv(e.quantity);}
        this.s.toman221={good:money.id,asset:asset.id,unit:unit.id,rialGoods:[...rialGoods],rialAssets:[...rialAssets],rialUnits:[...rialUnits]};
        // Decimal precision may need one extra digit when converting an old rial fraction.
        const required=Math.max(8,unit.decimals,...this.s.documents.flatMap(d=>d.entries.filter(e=>e.good===money.id).map(e=>(String(e.quantity).split(".")[1] || "").length)));
        unit.decimals=Math.min(8,required);asset.decimals=unit.decimals;for(const d of this.s.documents)if(d.snapshots?.[money.id])d.snapshots[money.id].unit.decimals=unit.decimals;
        this.s.version221=true;this.audit("upgrade221","settings","221",null,{toman:asset.id,materials:this.s.materials.length});
      });
    }
    view221(entry,inventory=false) {
      const v=this.describeEntry220(entry);
      if(v.kind==="currency" && (v.unit.currencyCode==="IRR" || norm(v.unit.name)===norm("ریال"))){const target=this.s.toman221;if(target){v.quantity=div(v.quantity,"10");v.name="تومان";v.unit=clone(this.find("units",target.unit));v.key=["currency",target.asset,target.unit].join("|");}}
      v.actualQuantity=v.quantity;v.actualPurity=v.purity;
      if(!inventory && v.kind==="weight" && norm(v.material)===norm("طلا") && v.purity){v.quantity=this.equivalent(v.quantity,v.purity,"750");v.purity="750";v.name="طلا — معادل عیار ۷۵۰";v.key="weight|طلا|750";}
      if(!inventory && ["person","commitment"].includes(entry.bucket)){v.quantity=sub("0",v.quantity);if(v.count!==null)v.count=sub("0",v.count);}
      return v;
    }
    aggregate221(entries,byAccount=false,inventory=false) {
      const groups=new Map();
      for(const e of entries){const v=this.view221(e,inventory),key=[e.bucket,...(byAccount?[e.account]:[]),v.key].join("|");let g=groups.get(key);if(!g){g={...clone(v),key,bucket:e.bucket,account:byAccount?e.account:null,quantity:"0",count:"0",hasCount:false,details:[]};groups.set(key,g);}g.quantity=add(g.quantity,v.quantity);if(v.count!==null){g.count=add(g.count,v.count);g.hasCount=true;}const k=[e.account,e.good,e.purity || "",e.lot || "",e.component || ""].join("|");let d=g.details.find(d=>d.key===k);if(!d){d={key:k,account:e.account,good:e.good,name:v.goodName,quantity:"0",actualQuantity:"0",count:"0",hasCount:false,purity:v.actualPurity,unit:clone(v.unit),kind:v.kind,countedWeight:v.countedWeight,lot:e.lot || "",component:e.component || "",mark:e.mark || "",assay:e.assay || "",documents:[]};g.details.push(d);}d.quantity=add(d.quantity,v.quantity);d.actualQuantity=add(d.actualQuantity,v.actualQuantity);if(v.count!==null){d.count=add(d.count,v.count);d.hasCount=true;}if(e.document && !d.documents.includes(e.document))d.documents.push(e.document);}
      return [...groups.values()];
    }
    reportRows223(entries) {
      const running=new Map(),money=new Map(),gold=new Map();
      return [...entries].sort((a,b)=>(a.date || "").localeCompare(b.date || "") || String(a.at || "").localeCompare(String(b.at || ""))).map(entry=>{
        const view=this.view221(entry),account=[entry.bucket,entry.account].join("|"),key=account+"|"+view.key;
        const balance=add(running.get(key) || "0",view.quantity);running.set(key,balance);
        if(view.kind==="currency" && (view.unit.currencyCode==="IRT" || norm(view.unit.name)==="تومان"))money.set(account,add(money.get(account) || "0",view.quantity));
        if(view.kind==="weight" && norm(view.material)==="طلا" && view.purity==="750")gold.set(account,add(gold.get(account) || "0",view.quantity));
        return {entry,view,balance,toman:money.get(account) || "0",gold750:gold.get(account) || "0",operation:["buy","sell"].includes(entry.type)?({buy:"خرید",sell:"فروش"}[entry.type]):dec(view.quantity)>0n?"+":dec(view.quantity)<0n?"−":"۰"};
      });
    }
    accountBalances221(kind,id,entries=this.entries()) {const buckets={people:["person"],expenses:["expense"],incomes:["income"],banks:["stock","commitment"],funds:["stock","commitment"]}[kind] || [];return this.aggregate221(entries.filter(e=>e.account===id && buckets.includes(e.bucket)),true);}
    label221(q,bucket="person") {if(bucket==="expense")return "هزینهٔ ثبت‌شده";if(bucket==="income")return "درآمد ثبت‌شده";if(dec(q)===0n)return "تسویه";if(bucket==="stock")return dec(q)>0n?"موجودی":"کسری موجودی";return dec(q)>0n?"طلبکار":"بدهکار";}
    describeEntry220(entry) {
      const doc=this.s.documents.find(d=>d.id===entry.document),current=this.s.goods.find(g=>g.id===entry.good);
      const good=entry.snapshot || doc?.snapshots?.[entry.good] || current;
      if(!good)throw Error("کالای سطر گزارش یافت نشد");
      const unit=good.unit || this.find("units",good.unitId),asset=good.asset || this.s.assets.find(a=>a.id===good.assetId);
      const mode=good.mode,purity=entry.purity || good.purity || "";
      let quantity=str(dec(entry.quantity)),count=null,material="",key,name=good.name,displayUnit=clone(unit);
      if(mode==="weight") {
        if(!unit.factor)throw Error("ضریب واحد وزن برای گزارش مشخص نیست");
        quantity=mul(quantity,unit.factor);
        const known=v=>v && !["عیاردار","کالایی","نامشخص"].includes(norm(v))?String(v).trim():"";
        material=known(this.s.materials?.find(m=>m.id===current?.materialId)?.name) || known(current?.balanceMaterial220) || known(good.balanceMaterial220) || known(good.metal) || known(asset?.metal) || (["طلا","نقره","پلاتین","پالادیوم"].includes(norm(asset?.name))?asset.name:"");
        const family=material?norm(material):"unknown:"+good.id;
        key=["weight",family,purity || "unknown:"+good.id].join("|");
        name=(material || "جنس تعیین‌نشده — "+good.name)+(purity?" — عیار "+purity:"");
        displayUnit=clone(this.s.units.find(u=>u.dimension==="weight" && norm(u.name)===norm("گرم")) || {id:"gram220",name:"گرم",dimension:"weight",factor:"1",decimals:8});
        if(entry.component!=="fee" && good.standardWeight) {
          if(entry.count!==undefined && entry.count!==null && entry.count!=="")count=str(dec(entry.count));
          else {
            const source=doc?.reversalOf?this.s.documents.find(d=>d.id===doc.reversalOf):doc;
            if(source?.count && source.quantity)count=mul(div(entry.quantity,source.quantity),source.count);
            else {const w=this.find("units",good.standardWeightUnitId);count=div(quantity,mul(good.standardWeight,w.factor));}
          }
        }
      } else if(mode==="count") {key=["count",good.id,unit.id].join("|");count=quantity;}
      else if(mode==="currency") {key=["currency",good.assetId,unit.id].join("|");name=asset?.name || good.name;}
      else throw Error("نوع کالای گزارش نامعتبر است");
      return {key,kind:mode,name,unit:displayUnit,purity:mode==="currency"?"":purity,material,quantity,count,good:good.id,goodName:good.name,countedWeight:mode==="weight" && !!good.standardWeight,unclassified:mode==="weight" && !material};
    }
    aggregate220(entries,byAccount=false) {
      const groups=new Map();
      for(const entry of entries) {
        const value=this.describeEntry220(entry),key=[entry.bucket,...(byAccount?[entry.account]:[]),value.key].join("|");
        let group=groups.get(key);
        if(!group){group={...clone(value),key,bucket:entry.bucket,account:byAccount?entry.account:null,quantity:"0",count:"0",hasCount:false,details:[]};groups.set(key,group);}
        group.quantity=add(group.quantity,value.quantity);
        if(value.count!==null){group.count=add(group.count,value.count);group.hasCount=true;}
        const detailKey=[entry.account,entry.good,entry.purity || "",entry.lot || "",entry.component || "",entry.snapshot?.legacyNormalized?"legacy":""].join("|");
        let detail=group.details.find(d=>d.key===detailKey);
        if(!detail){detail={key:detailKey,account:entry.account,good:entry.good,name:value.goodName,quantity:"0",count:"0",hasCount:false,purity:value.purity,unit:clone(value.unit),kind:value.kind,countedWeight:value.countedWeight,lot:entry.lot || "",component:entry.component || "",mark:entry.mark || "",assay:entry.assay || "",documents:[]};group.details.push(detail);}
        detail.quantity=add(detail.quantity,value.quantity);
        if(value.count!==null){detail.count=add(detail.count,value.count);detail.hasCount=true;}
        if(entry.document && !detail.documents.includes(entry.document))detail.documents.push(entry.document);
      }
      return [...groups.values()];
    }
    accountBalances220(kind,id,entries=this.entries()) {
      const buckets={people:["person"],expenses:["expense"],incomes:["income"],banks:["stock","commitment"],funds:["stock","commitment"]}[kind] || [];
      return this.aggregate220(entries.filter(e=>e.account===id && buckets.includes(e.bucket)),true);
    }
    label220(quantity,bucket="person") {
      if(dec(quantity)===0n)return "تسویه";
      if(bucket==="stock")return dec(quantity)>0n?"موجودی":"کسری موجودی";
      return dec(quantity)>0n?"بدهکار":"طلبکار";
    }
    balance(bucket, account, good, lot) {
      return str(
        this.entries()
          .filter(
            (e) =>
              e.bucket === bucket &&
              (!account || e.account === account) &&
              (!good || e.good === good) &&
              (!lot || e.lot === lot),
          )
          .reduce((a, e) => a + dec(e.quantity), 0n),
      );
    }
    available(fund, good, exceptTrade) {
      const physical = this.balance("stock", fund, good),
        reserved = this.s.reservations
          .filter(
            (x) =>
              x.fund === fund && x.good === good && x.trade !== exceptTrade,
          )
          .reduce((n, x) => n + dec(x.quantity), 0n);
      return str(dec(physical) - reserved);
    }
    lots(fund, good) {
      const map = new Map();
      for (const e of this.entries().filter(
        (x) => x.bucket === "stock" && x.account === fund && x.good === good,
      )) {
        const key = e.lot || "";
        const r = map.get(key) || {
          id: key,
          quantity: "0",
          purity: e.purity,
          mark: e.mark,
          assay: e.assay,
        };
        r.quantity = add(r.quantity, e.quantity);
        map.set(key, r);
      }
      return [...map.values()].filter((x) => dec(x.quantity) > 0n);
    }
    assertFund(id, g) {
      const f = this.find("funds", id, true),
        a = this.find("assets", g.assetId);
      if(f.legacyKind==="banks" && a.nature!=="currency")throw Error("بانک فقط برای ارز است؛ دریافت، پرداخت، خرید و فروش کالا در بانک مجاز نیست");
      if(f.nature==="currency" && a.nature!=="currency")throw Error("صندوق ارزی نمی‌تواند کالا دریافت یا پرداخت کند");
      if(f.nature==="commodity" && a.nature!=="commodity")throw Error("صندوق کالایی نمی‌تواند ارز دریافت یا پرداخت کند");
      if (f.nature !== a.nature || (f.assetId && f.assetId !== a.id))
        throw Error("دارایی با صندوق یا حساب انتخاب‌شده سازگار نیست");
      return f;
    }
    metadata(input) {
      if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date))
        throw Error("تاریخ معتبر میلادی انتخاب کنید");
      const date = input.date || new Date().toISOString().slice(0, 10);
      if (new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date)
        throw Error("تاریخ نامعتبر");
      const tags = [...new Set(input.tags || [])];
      tags.forEach((id) => this.find("tags", id, true));
      return { date, tags, notes: String(input.notes || "") };
    }
    append(input, entries, extra = {}) {
      if (!input.token) throw Error("شناسه جلوگیری از ثبت تکراری لازم است");
      if (this.s.documents.some((d) => d.token === input.token))
        throw Error("این درخواست قبلاً ثبت شده است");
      const meta = this.metadata(input),
        snapshots = {};
      const requestedLineTags = input.lineTags || [];
      if (!Array.isArray(requestedLineTags)) throw Error("برچسب سطر نامعتبر است");
      for (const tagId of requestedLineTags) this.find("tags", tagId, true);
      for (const e of entries) {
        if (e.lineTags && !Array.isArray(e.lineTags)) throw Error("برچسب سطر نامعتبر است");
        e.lineTags = [...new Set([...(e.lineTags || []), ...requestedLineTags])];
        for (const tagId of e.lineTags) this.find("tags", tagId);
        const g = this.find("goods", e.good);
        e.quantity = this.precision(e.quantity, g.unitId);
        snapshots[g.id] = {
          ...clone(g),
          unit: clone(this.find("units", g.unitId)),
          asset: clone(this.find("assets", g.assetId)),
        };
        const kind = {
          person: "people",
          stock: "funds",
          expense: "expenses",
          income: "incomes",
          commitment: "funds",
        }[e.bucket];
        if (!e.accountSnapshot && kind)
          e.accountSnapshot = clone(this.find(kind, e.account));
        if (e.purity) {
          pos(e.purity);
          if (dec(e.purity) > dec("1000")) throw Error("عیار نامعتبر");
        }
      }
      const d = {
        ...extra,
        ...meta,
        id: uid(),
        number: this.s.documents.length + 1,
        token: input.token,
        created: new Date().toISOString(),
        type: input.type,
        entries: clone(entries),
        snapshots,
        basePurity: this.s.basePurity,
      };
      this.s.documents.push(d);
      if (entries.some((e) => e.bucket === "stock" && dec(e.quantity) < 0n)) {
        const totals = new Map();
        for (const doc of [...this.s.documents].sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.created.localeCompare(b.created),
        )) {
          const deltas = new Map();
          for (const e of doc.entries.filter((e) => e.bucket === "stock")) {
            const key = e.account + "|" + e.good;
            deltas.set(key, (deltas.get(key) || 0n) + dec(e.quantity));
          }
          for (const [key, delta] of deltas) {
            const n = (totals.get(key) || 0n) + delta;
            totals.set(key, n);
            if (n < 0n && doc.type !== "legacy")
              throw Error(
                "این تاریخ سند باعث موجودی منفی در گردش زمانی می‌شود؛ تاریخ تحویل واقعی را بررسی کنید",
              );
          }
        }
      }
      this.audit("post", "documents", d.id, null, d);
      return clone(d);
    }
    trade(input) {
      return this.transaction(() => {
        const g = this.find("goods", input.good, true),
          p = this.find("people", input.person, true);
        if (
          !["buy", "sell"].includes(input.type) ||
          g[input.type === "buy" ? "canBuy" : "canSell"] === false
        )
          throw Error("عملیات خرید یا فروش مجاز نیست");
        const q = this.quantity(g, input),
          m = this.find("goods", input.moneyGood, true);
        if (m.mode !== "currency")
          throw Error("واحد مالی فاکتور باید پولی باشد");
        const rawBase = mul(
            this.convert(q.quantity, g.unitId, g.rateUnitId || g.unitId),
            pos(input.rate),
          ),
          base = this.round(rawBase, m.unitId),
          fees = this.fee(g, q, input),
          sign = input.type === "buy" ? 1n : -1n;
        const entries = [
          {
            bucket: "person",
            account: p.id,
            good: g.id,
            quantity: str(dec(q.quantity) * sign),
            purity: input.purity || g.purity || "",
            component: "goods",
          },
          {
            bucket: "person",
            account: p.id,
            good: m.id,
            quantity: str(-dec(base) * sign),
            component: "money",
          },
        ];
        for (const fee of fees)
          entries.push({
            bucket: "person",
            account: p.id,
            good: fee.good,
            quantity: str(-dec(fee.quantity) * sign),
            component: "fee",
          });
        return this.append(input, entries, {
          good: g.id,
          person: p.id,
          moneyGood: m.id,
          quantity: q.quantity,
          count: q.count,
          standard: q.standard,
          actualWeight: q.actualWeight,
          rate: pos(input.rate),
          baseAmount: base,
          unroundedBase: rawBase,
          rounding: "half-up-to-payment-unit",
          fees,
          purity: input.purity || g.purity || "",
          agreement: input.agreement || "",
        });
      });
    }
    remaining(tradeId, component = "goods") {
      const d = this.find("documents", tradeId);
      if (this.s.documents.some((x) => x.reversalOf === tradeId)) return "0";
      const original = d.entries
        .filter((e) => e.component === component)
        .reduce((n, e) => n + dec(e.quantity), 0n);
      const changed = this.s.documents
        .filter((x) => x.related === tradeId && x.component === component)
        .flatMap((x) => x.entries)
        .filter((e) => e.bucket === "person" && e.account === d.person)
        .reduce((n, e) => n + dec(e.quantity), 0n);
      const allocated = this.s.documents
        .flatMap((x) => x.allocations || [])
        .filter((x) => x.trade === tradeId && x.component === component)
        .reduce((n, x) => n + dec(x.quantity), 0n);
      return str(original + changed + allocated);
    }
    delivery(input) {
      return this.transaction(() => {
        const d = this.find("documents", input.related);
        if (
          !["buy", "sell"].includes(d.type) ||
          this.s.documents.some((x) => x.reversalOf === d.id)
        )
          throw Error("معامله فعال انتخاب کنید");
        const g = d.snapshots[d.good],
          q = this.quantity(g, input);
        if (
          dec(q.quantity) >
          (dec(this.remaining(d.id)) < 0n
            ? -dec(this.remaining(d.id))
            : dec(this.remaining(d.id)))
        )
          throw Error("تحویل بیش از مانده تعهد است");
        this.assertFund(input.fund, g);
        const inbound = d.type === "buy",
          sign = inbound ? 1n : -1n;
        const pending = this.s.reservations.find(
          (x) => x.trade === d.id && x.fund === input.fund,
        );
        if (pending)
          pending.quantity = str(
            dec(pending.quantity) > dec(q.quantity)
              ? dec(pending.quantity) - dec(q.quantity)
              : 0n,
          );
        this.s.reservations = this.s.reservations.filter(
          (x) => dec(x.quantity) > 0n,
        );
        const lot = this.resolveLot(input, g, !inbound),
          info = {
            lot: lot.id,
            purity: lot.purity || d.purity,
            mark: lot.mark,
            assay: lot.assay,
          };
        if (
          g.mode === "weight" &&
          g.metal &&
          d.purity &&
          dec(info.purity) !== dec(d.purity)
        )
          throw Error(
            "عیار محموله با تعهد متفاوت است؛ تسویه جایگزین باید جداگانه توافق و ثبت شود",
          );
        if (!inbound) this.checkStock(input.fund, g, q.quantity, info.lot);
        return this.append(
          { ...input, type: "delivery" },
          [
            {
              bucket: "stock",
              account: input.fund,
              good: g.id,
              quantity: str(dec(q.quantity) * sign),
              count: q.count ? str(dec(q.count) * sign) : null,
              ...info,
            },
            {
              bucket: "person",
              account: d.person,
              good: g.id,
              quantity: str(-dec(q.quantity) * sign),
              purity: d.purity,
            },
          ],
          {
            related: d.id,
            component: "goods",
            good: g.id,
            person: d.person,
            quantity: q.quantity,
            count: q.count,
            standard: q.standard,
            actualWeight: q.actualWeight,
            ...info,
          },
        );
      });
    }
    resolveLot(input, g, outgoing) {
      if (g.mode !== "weight" || (!g.metal && !g.variablePurity221))
        return {
          id: input.lot || "",
          purity: input.purity || g.purity || "",
          mark: input.mark || "",
          assay: input.assay || "",
        };
      if (outgoing) {
        const l = this.lots(input.fund || input.from, g.id).find(
          (x) => x.id === input.lot,
        );
        if (!l) throw Error("محموله موجود را انتخاب کنید");
        if (input.purity && dec(input.purity) !== dec(l.purity))
          throw Error("عیار انتخاب‌شده با محموله متفاوت است");
        return l;
      }
      return {
        id: input.lot || uid(),
        purity: pos(input.purity || g.purity),
        mark: String(input.mark || ""),
        assay: String(input.assay || ""),
      };
    }
    checkStock(fund, g, q, lot) {
      this.assertFund(fund, g);
      if (dec(this.available(fund, g.id)) < dec(q))
        throw Error("موجودی قابل استفاده کافی نیست");
      if (lot && dec(this.balance("stock", fund, g.id, lot)) < dec(q))
        throw Error("موجودی محموله کافی نیست");
    }
    movement(input) {
      return this.transaction(() => {
        const originalGood = this.find("goods", input.good, true),g=input.catalogInvoice217?{...originalGood,feeMode:"none"}:originalGood,
          q = this.quantity(g, input);
        const allowed = [
          "transfer",
          "receive",
          "pay",
          "opening",
          "adjustment",
          "expense",
          "income",
          "settlement",
        ];
        if (!allowed.includes(input.type)) throw Error("نوع عملیات نامعتبر");
        const physical = ["funds", "banks"];
        if (input.from === input.to && input.fromKind === input.toKind)
          throw Error("مبدأ و مقصد باید متفاوت باشند");
        if (!input.from && !input.to) throw Error("مبدأ یا مقصد لازم است");
        if (input.type === "opening" && input.from)
          throw Error("افتتاحیه فقط ورود است");
        if (input.type === "adjustment" && !String(input.notes || "").trim())
          throw Error("علت اصلاح الزامی است");
        const entries = [],
          inStock = physical.includes(input.toKind),
          outStock = physical.includes(input.fromKind),
          lot = input.catalogInvoice217 && outStock && !input.lot ? {id:"",purity:g.purity || "",mark:"",assay:""} : this.resolveLot({ ...input, fund: input.from }, g, outStock),
          info = {
            lot: lot.id,
            purity: lot.purity,
            mark: lot.mark,
            assay: lot.assay,
          };
        for (const [id, kind, sign] of [
          [input.from, input.fromKind, -1n],
          [input.to, input.toKind, 1n],
        ]) {
          if (!id) continue;
          if (physical.includes(kind)) {
            this.assertFund(id, g);
            if (sign < 0n) this.checkStock(id, g, q.quantity, lot.id);
            if(input.catalogInvoice217 && sign<0n && g.mode==="weight") {
              let left=dec(q.quantity);
              for(const lot of this.lots(id,g.id)) {
                if(left<=0n)break;
                if(input.lot && lot.id!==input.lot)continue;
                if(!g.variablePurity221 && g.purity && lot.purity && dec(g.purity)!==dec(lot.purity))continue;
                const take=dec(lot.quantity)<left?dec(lot.quantity):left;left-=take;
                entries.push({bucket:"stock",account:id,good:g.id,quantity:str(-take),count:q.count?sub("0",div(mul(str(take),q.count),q.quantity)):null,lot:lot.id,purity:lot.purity || g.purity || "",mark:lot.mark || "",assay:lot.assay || ""});
              }
              if(left>0n)throw Error("موجودی کالا با عیار انتخاب‌شده کافی نیست");
            } else entries.push({
              bucket: "stock", account: id, good: g.id,
              quantity: str(dec(q.quantity) * sign),count: q.count ? str(dec(q.count) * sign) : null,...info,
            });
          } else {
            if (!["people", "expenses", "incomes"].includes(kind))
              throw Error("طرف عملیات نامعتبر");
            this.find(kind, id, true);
            entries.push({
              bucket:
                kind === "people"
                  ? "person"
                  : kind === "expenses"
                    ? "expense"
                    : "income",
              account: id,
              good: g.id,
              quantity: str(
                dec(q.quantity) * (kind === "incomes" ? -sign : sign),
              ),
              purity: info.purity,
            });
          }
        }
        if (
          !["opening", "adjustment"].includes(input.type) &&
          (!input.from || !input.to || entries.length < 2)
        )
          throw Error("مبدأ و مقصد کامل لازم است");
        if (
          input.type === "transfer" &&
          input.fromKind === "people" &&
          input.toKind === "people"
        ) {
          if (!["settle", "new"].includes(input.agreement))
            throw Error("نوع توافق حواله را صریح انتخاب کنید");
          if (dec(this.balance("person", input.from, g.id)) < dec(q.quantity))
            throw Error("طلب قابل حواله از شخص مبدأ کافی نیست");
          if (
            input.agreement === "settle" &&
            dec(this.balance("person", input.to, g.id)) > -dec(q.quantity)
          )
            throw Error("بدهی موجود به مقصد برای این تسویه کافی نیست");
        }
        let fees = [];
        if (
          ["receive", "pay"].includes(input.type) &&
          (g.feeMode || "none") !== "none"
        ) {
          const parties = entries.filter((e) => e.bucket === "person");
          if (parties.length !== 1)
            throw Error(
              "برای کارمزد دریافت یا پرداخت، یک شخص طرف عملیات لازم است",
            );
          fees = this.fee(g, q, input);
          const main = parties[0],
            sign = dec(main.quantity) > 0n ? 1n : -1n;
          for (const fee of fees)
            entries.push({
              bucket: "person",
              account: main.account,
              good: fee.good,
              quantity: str(dec(fee.quantity) * sign),
              purity: fee.kind === "gold" ? main.purity : "",
              component: "fee",
            });
        }
        return this.append(input, entries, {
          good: g.id,
          quantity: q.quantity,
          count: q.count,
          standard: q.standard,
          actualWeight: q.actualWeight,
          agreement: input.agreement || "",
          fees,
          ...info,
          physical: inStock || outStock,
        });
      });
    }
    validateParty214(input) {
      const kind = input.partyKind;
      if (!["banks", "funds", "expenses", "incomes", "people"].includes(kind)) throw Error("نوع طرف حساب را انتخاب کنید");
      const record = this.find(kind === "banks" ? "funds" : kind, input.partyId, true);
      if (kind === "banks") {
        this.find("bankInstitutions", input.bankId, true);
        if (record.legacyKind !== "banks" || record.bankId !== input.bankId) throw Error("شماره حساب متعلق به بانک انتخاب‌شده نیست");
      }
      if (kind === "funds" && record.legacyKind === "banks") throw Error("صندوق معتبر انتخاب کنید");
      if (kind === "expenses" || kind === "people") {
        this.find(kind === "expenses" ? "expenseGroups" : "peopleGroups", input.groupId, true);
        if (record.groupId !== input.groupId) throw Error("طرف حساب متعلق به گروه یا محل انتخاب‌شده نیست");
      }
      return record;
    }
    classifyMaterial220(ids,material) {
      if(!String(material || "").trim())throw Error("جنس دارایی را مشخص کنید");
      return this.transaction(()=>{
        for(const id of ids) {
          const g=this.find("goods",id),old=g.balanceMaterial220 || g.metal || "";
          if(g.mode!=="weight")continue;
          if(old && !["عیاردار","نامشخص"].includes(norm(old)) && norm(old)!==norm(material))throw Error("جنس مشخص‌شدهٔ قبلی متفاوت است");
          g.balanceMaterial220=String(material).trim();
          const draft=(this.s.catalogGoods || []).find(d=>d.id===id);if(draft)draft.balanceMaterial220=g.balanceMaterial220;
          this.audit("classify-material","goods",id,old,g.balanceMaterial220);
        }
      });
    }
    peekInvoiceNumber219(numberFloor=1) {
      return Math.max(Number(numberFloor) || 1,Number(this.s.nextInvoiceNumber214) || 1,...(this.s.invoiceHeaders214 || []).map(h=>Number(h.number)+1),...this.s.documents.map(d=>Number(d.number)+1));
    }
    discardEmptyInvoice219(id) {
      if(!id)return false;
      const h=(this.s.invoiceHeaders214 || []).find(h=>h.id===id);
      if(!h || h.rows?.length || h.documentIds?.length || this.s.documents.some(d=>d.invoiceHeader===id))return false;
      return this.transaction(()=>{this.s.invoiceHeaders214=this.s.invoiceHeaders214.filter(h=>h.id!==id);this.audit("invoice-empty-discard","invoiceHeaders214",id,h,null);return true;});
    }
    postInvoiceRow219(header,input,date,unlocked=false) {
      return this.transaction(()=>{
        let h=header;
        if(!h.id){const created=this.newInvoiceHeader214(h.number,h.jalali);h=this.saveInvoiceHeader214({...h,id:created.id});}
        return this.postInvoiceRow218(h.id,input,date,unlocked);
      });
    }
    catalogUnit219(record) {
      const dimension=(record.catalogMode || record.mode)==="count"?"count":"weight";
      const compatible=this.s.units.filter(u=>u.active!==false && u.dimension===dimension);
      const chosen=[record.catalogUnitId,record.unitId].map(id=>compatible.find(u=>String(u.id)===String(id))).find(Boolean);
      return chosen || compatible.find(u=>dimension==="count"?norm(u.name)===norm("عدد"):dec(u.factor || "0")===SCALE) || compatible[0];
    }
    newInvoiceHeader214(numberFloor, jalali) {
      return this.transaction(() => {
        this.s.invoiceHeaders214 ||= [];
        const number = Math.max(Number(numberFloor) || 1, Number(this.s.nextInvoiceNumber214) || 1,
          ...this.s.invoiceHeaders214.map(d => Number(d.number) + 1), ...this.s.documents.map(d => Number(d.number) + 1));
        const header = {id:uid(),number,jalali,partyKind:"",partyId:"",bankId:"",groupId:"",status:"draft",created:new Date().toISOString()};
        this.s.nextInvoiceNumber214 = number + 1;
        this.s.invoiceHeaders214.push(header);
        this.audit("invoice-header-create", "invoiceHeaders214", header.id, null, header);
        return clone(header);
      });
    }
    saveInvoiceHeader214(input) {
      return this.transaction(() => {
        const current = this.find("invoiceHeaders214", input.id);
        if (!["draft","editing"].includes(current.status)) throw Error("این سربرگ قابل ویرایش نیست");
        if(current.status!=="editing" && current.rows?.length && ["partyKind","partyId","bankId","groupId"].some(key=>(input[key] || "")!==(current[key] || "")))throw Error("برای تغییر طرف حساب، ابتدا سطرهای پیش‌نویس را حذف کنید");
        if (input.partyId) this.validateParty214(input);
        const before = clone(current);
        Object.assign(current, {jalali:String(input.jalali || ""),partyKind:input.partyKind || "",partyId:input.partyId || "",bankId:input.bankId || "",groupId:input.groupId || "",updated:new Date().toISOString()});
        this.audit("invoice-header-edit", "invoiceHeaders214", current.id, before, current);
        return clone(current);
      });
    }
    catalogGood217(id) {
      const draft=(this.s.catalogGoods || []).find(g=>g.id===id),old=this.s.goods.find(g=>g.id===id);
      if(!draft)return this.find("goods",id,true);
      if(draft.active===false)throw Error("کالا غیرفعال است");
      const mode=draft.catalogMode==="count"?"count":"weight";
      const u=this.find("units",this.catalogUnit219({...old,...draft})?.id,true);
      const rateId=[draft.catalogRateUnitId,old?.rateUnitId].find(id=>this.s.units.some(rate=>rate.id===id && rate.active!==false && rate.dimension===mode && (mode==="weight" || rate.id===u.id)));
      const rate=this.find("units",rateId || u.id,true);
      if(u.dimension!==mode || rate.dimension!==mode || (mode!=="weight" && u.id!==rate.id))throw Error("واحد مقدار و نرخ با نوع کالا سازگار نیست");
      let asset=old?this.find("assets",old.assetId):this.s.assets.find(a=>a.nature==="commodity" && a.unitId===u.id && norm(a.name)===norm(draft.name));
      if(!asset)asset=this.put("assets",{name:draft.name,nature:"commodity",unitId:u.id,decimals:u.decimals,active:true});
      const pieceUnit=draft.catalogPieceUnitId || old?.standardWeightUnitId || this.s.units.find(u=>u.dimension==="weight" && dec(u.factor || "0")===SCALE)?.id;
      const g={...old,id:draft.id,name:draft.name,active:true,mode,assetId:asset.id,unitId:u.id,rateUnitId:rate.id,groupId:draft.groupId,feeMode:"none",balanceMaterial220:this.s.materials?.find(m=>m.id===draft.materialId)?.name || draft.balanceMaterial220 || old?.balanceMaterial220 || "",materialId:draft.materialId || old?.materialId || "",variablePurity221:!!draft.variablePurity221,
        purity:draft.catalogPurity || old?.purity || "",metal:(draft.catalogPurity || old?.purity)?(old?.metal || "عیاردار"):"",
        standardWeight:draft.catalogMode==="weightCount"?pos(draft.catalogPieceWeight):"",standardWeightUnitId:pieceUnit,allowActual:false};
      if(old && this.used("goods",id) && ["mode","unitId","purity","standardWeight","standardWeightUnitId"].some(k=>(g[k] || "")!==(old[k] || "")))throw Error("واحد، عیار و وزن ثابت کالای دارای سابقه قابل تغییر نیست؛ کالای تازه معرفی کنید");
      return this.put("goods",g);
    }
    commodityValues217(line) {
      const g=this.catalogGood217(line.good),draft=(this.s.catalogGoods || []).find(x=>x.id===g.id) || {catalogMode:g.standardWeight?"weightCount":g.mode,catalogHasFee:g.feeMode && g.feeMode!=="none"?"yes":"no",catalogFeeMode:g.feeMode==="variable"?"variable":"fixed",catalogFeeBasis:g.feeMode==="gold"?"weightPercent":"perPiece",catalogFeeValue:g.feeMode==="gold"?g.feePercent:(this.s.version221?g.feeValue || "0":mul(g.feeValue || "0","10"))};
      if(g.mode==="currency")throw Error("کالای غیرارزی انتخاب کنید");
      if(line.goodsGroup==="__ungrouped"?!!g.groupId:(!line.goodsGroup || ![g.groupId,g.subgroupId].includes(line.goodsGroup)))throw Error("کالا متعلق به گروه انتخابی نیست");
      const mode=draft?.catalogMode || (g.standardWeight?"weightCount":g.mode);
      const unitId=line.unitId || g.unitId,u=this.find("units",unitId,true);
      if(u.dimension!==g.mode || (g.mode!=="weight" && unitId!==g.unitId))throw Error("واحد مقدار با کالا سازگار نیست");
      const count=mode==="count"?pos(line.amount):line.count?pos(line.count):null;
      if(count && dec(count)%SCALE!==0n)throw Error("تعداد باید صحیح باشد");
      let quantity=mode==="weightCount"?this.convert(mul(pos(count),g.standardWeight),g.standardWeightUnitId,g.unitId):this.convert(pos(line.amount),unitId,g.unitId);
      quantity=this.precision(quantity,g.unitId);
      let fee=null;
      if(draft?.catalogHasFee==="yes") {
        const value=draft.catalogFeeMode==="fixed"?draft.catalogFeeValue:line.feeValue;
        if(value===undefined || value==="" || dec(value)<0n)throw Error("کارمزد معتبر وارد کنید");
        if(draft.catalogFeeBasis==="weightPercent") {
          if(g.mode!=="weight" || dec(value)>dec("100"))throw Error("کارمزد درصدی از وزن فقط برای کالای وزنی و حداکثر ۱۰۰ درصد است");
          fee={basis:"weightPercent",value:str(dec(value)),quantity:this.round(div(mul(quantity,value),"100"),g.unitId),good:g.id};
        } else {
          if(!count)throw Error("برای کارمزد هر عدد، تعداد قطعات را مشخص کنید");
          const asset=this.s.assets.find(a=>a.active!==false && a.nature==="currency" && this.find("units",a.unitId).currencyCode===(this.s.version221?"IRT":"IRR"));
          if(!asset)throw Error("ابتدا ارز تومان را معرفی کنید");
          const money=this.currencyGood216(asset.id);
          fee={basis:"perPiece",value:str(dec(value)),quantity:this.precision(mul(count,value),money.unitId),good:money.id};
        }
      }
      let purity=g.purity || "";
      if(g.variablePurity221){purity=pos(line.purity);if(dec(purity)>dec("1000"))throw Error("عیار حداکثر ۱۰۰۰ است");if(line.operation==="pay"){const lot=this.lots(line.partyId,g.id).find(l=>l.id===line.lot);if(!lot)throw Error("قطعهٔ موجود را انتخاب کنید");if(dec(lot.purity)!==dec(purity))throw Error("عیار با قطعهٔ انتخابی متفاوت است");if(dec(quantity)>dec(lot.quantity))throw Error("وزن پرداخت از موجودی همان قطعه بیشتر است");}}
      return {good:g,quantity,count,unitId,displayAmount:this.convert(quantity,g.unitId,unitId),fee,purity};
    }
    beginInvoiceEdit217(headerId) {
      return this.transaction(()=>{
        const h=this.find("invoiceHeaders214",headerId);
        if(h.status!=="posted")return clone(h);
        if(h.documentIds.some(id=>this.s.documents.some(d=>d.reversalOf===id)))throw Error("بخشی از این فاکتور قبلاً برگشت داده شده است");
        h.originalDocumentIds=clone(h.documentIds);h.status="editing";
        this.audit("invoice-edit-start","invoiceHeaders214",h.id,null,{number:h.number});return clone(h);
      });
    }
    reverseInvoiceDocuments217(h,reason) {
      for(const id of [...(h.originalDocumentIds || h.documentIds || [])].reverse()) {
        if(!this.s.documents.some(d=>d.reversalOf===id))this.reverse(id,reason,uid(),this.find("documents",id).date);
      }
    }
    deleteInvoice217(headerId) {
      return this.transaction(()=>{
        const h=this.find("invoiceHeaders214",headerId);if(h.status==="deleted")throw Error("فاکتور قبلاً حذف شده است");
        this.reverseInvoiceDocuments217(h,"حذف فاکتور "+h.number);
        h.status="deleted";h.deletedAt=new Date().toISOString();delete h.originalDocumentIds;
        this.audit("invoice-delete","invoiceHeaders214",h.id,null,{number:h.number});return clone(h);
      });
    }
    currencyGood216(assetId) {
      const asset=this.find("assets",assetId,true),unit=this.find("units",asset.unitId,true);
      if(asset.nature!=="currency" || unit.dimension!=="currency")throw Error("ارز معتبر از معرفی ارزها انتخاب کنید");
      let good=this.s.goods.find(g=>g.active!==false && g.mode==="currency" && g.assetId===assetId && g.unitId===asset.unitId);
      if(!good)good=this.put("goods",{name:asset.name,assetId:asset.id,unitId:unit.id,rateUnitId:unit.id,mode:"currency",feeMode:"none",active:true});
      return good;
    }
    installmentRemaining216(contractId,dueId) {
      const c=this.find("installmentContracts214",contractId),due=c.dues.find(d=>d.id===dueId);
      if(!due)throw Error("قسط مربوط به قرارداد نیست");
      if(c.accountDocumentId && this.s.documents.some(d=>d.reversalOf===c.accountDocumentId))return "0";
      const paid=(this.s.installmentSettlements216 || []).filter(p=>p.contractId===contractId && p.dueId===dueId && !this.s.documents.some(d=>d.reversalOf===p.documentId)).reduce((sum,p)=>sum+dec(p.amount),0n);
      return str(dec(due.amount)-paid);
    }
    validateInstallmentLine216(header,row,assetId,amount) {
      if(!["banks","funds"].includes(header.partyKind))throw Error("برای تسویهٔ قسط، بانک یا صندوق واقعی را در سربرگ انتخاب کنید");
      const c=this.find("installmentContracts214",row.contractId),g=this.find("goods",c.good,true);
      if(g.assetId!==assetId || (row.receiptKind==="commodity" && row.good!==g.id))throw Error("دارایی سطر باید همان دارایی قرارداد باشد");
      if(c.direction!==(row.operation==="receive"?"receivable":"payable"))throw Error("دریافت فقط برای اقساط طلبکار شدم و پرداخت فقط برای اقساط بدهکار شدم است");
      let remaining=this.installmentRemaining216(c.id,row.dueId);
      if(header.status==="editing")for(const payment of this.s.installmentSettlements216 || [])if(payment.contractId===c.id && payment.dueId===row.dueId && header.originalDocumentIds?.includes(payment.documentId) && !this.s.documents.some(d=>d.reversalOf===payment.documentId))remaining=add(remaining,payment.amount);
      if(dec(amount)>dec(remaining))throw Error("مبلغ از ماندهٔ این قسط بیشتر است");
      this.assertFund(header.partyId,g);
      return c;
    }
    postInstallmentLine216(header,row,good,date) {
      const c=this.validateInstallmentLine216(header,row,row.assetId,row.amount),receiving=row.operation==="receive";
      if(date<c.created.slice(0,10))throw Error("تاریخ تسویه نمی‌تواند پیش از ایجاد قرارداد باشد");
      if(!receiving)this.checkStock(header.partyId,good,row.amount);
      const entries=[{bucket:"stock",account:header.partyId,good:good.id,quantity:receiving?row.amount:sub("0",row.amount),count:row.count?(receiving?row.count:sub("0",row.count)):null,purity:good.purity || "",lot:good.mode==="weight"?uid():""}];
      if(!receiving && good.mode==="weight") {
        entries.length=0;let left=dec(row.amount);
        for(const lot of this.lots(header.partyId,good.id)) {
          if(left<=0n)break;const take=dec(lot.quantity)<left?dec(lot.quantity):left;left-=take;
          entries.push({bucket:"stock",account:header.partyId,good:good.id,quantity:str(-take),count:row.count?sub("0",div(mul(str(take),row.count),row.amount)):null,lot:lot.id,purity:lot.purity || good.purity || ""});
        }
        if(left>0n)throw Error("موجودی کافی نیست");
      }
      if(c.affectAccount) {
        const original=this.find("documents",c.accountDocumentId).entries[0];
        entries.push({bucket:original.bucket,account:original.account,good:good.id,quantity:receiving?sub("0",row.amount):row.amount,purity:good.purity || "",accountSnapshot:clone(original.accountSnapshot)});
      }
      const doc=this.append({token:header.id+":"+(header.postingToken || "")+":"+row.id,type:receiving?"installmentReceive":"installmentPay",date,tags:[],lineTags:row.tags,notes:row.notes},entries,
        {related:c.accountDocumentId || undefined,contract:c.id,due:row.dueId,person:c.partyKind==="people"?c.partyId:"",good:good.id,quantity:row.amount,physical:true});
      this.s.installmentSettlements216 ||= [];
      const settlement={id:uid(),contractId:c.id,dueId:row.dueId,amount:row.amount,documentId:doc.id,date};
      this.s.installmentSettlements216.push(settlement);this.audit("installment-settle","installmentContracts214",c.id,null,settlement);
      return doc;
    }
    validateInvoiceLine216(header,line) {
      if(["buy","sell"].includes(line.operation)) {
        if(header.partyKind!=="people")throw Error("طرف خرید و فروش باید فرد باشد");
        const commodity=this.commodityValues217(line),asset=this.find("assets",commodity.good.assetId,true),money=this.find("assets",line.moneyAssetId,true);
        if(money.nature!=="currency" || this.find("units",money.unitId).currencyCode==="IRR")throw Error("ارز مبلغ معامله معتبر نیست");pos(line.rate);
        const tags=[...new Set(line.tags || [])];tags.forEach(id=>this.find("tags",id,true));return {asset,amount:commodity.quantity,tags,commodity,trade:true};
      }
      if(!["receive","pay"].includes(line.operation) || !["currency","commodity"].includes(line.receiptKind))throw Error("نوع دریافت یا پرداخت را مشخص کنید");
      const commodity=line.receiptKind==="commodity"?this.commodityValues217(line):null;
      const asset=this.find("assets",commodity?commodity.good.assetId:line.assetId,true),unit=this.find("units",asset.unitId,true);
      if(!commodity && (asset.nature!=="currency" || unit.dimension!=="currency"))throw Error("نوع ارز را انتخاب کنید");
      const amount=commodity?commodity.quantity:this.precision(pos(line.amount),asset.unitId);
      if(line.partyKind==="installments") {
        this.validateInstallmentLine216(header,line,asset.id,amount);
      } else {
        this.validateParty214(line);
        if(header.partyKind===line.partyKind && header.partyId===line.partyId)throw Error("طرف سربرگ و طرف سطر باید متفاوت باشند");
        for(const party of [header,line])if(["banks","funds"].includes(party.partyKind))this.assertFund(party.partyId,{assetId:asset.id});
      }
      const tags=[...new Set(line.tags || [])];tags.forEach(id=>this.find("tags",id,true));
      return {asset,amount,tags,commodity};
    }
    saveInvoiceLine216(headerId,input) {
      return this.transaction(()=>{
        const header=this.find("invoiceHeaders214",headerId);
        if(!["draft","editing"].includes(header.status))throw Error("سند ثبت‌شده قابل تغییر مستقیم نیست");
        this.validateParty214(header);
        const values=this.validateInvoiceLine216(header,input);
        header.rows ||= [];
        const old=input.id?header.rows.find(r=>r.id===input.id):null;
        if(input.id && !old)throw Error("سطر موردنظر یافت نشد");
        const row={id:old?.id || uid(),operation:input.operation,receiptKind:input.receiptKind,assetId:values.asset.id,assetName:values.commodity?.good.name || values.asset.name,
          purity:values.commodity?.purity || "",lot:input.lot || "",mark:input.mark || "",assay:input.assay || "",rate:input.rate || "",moneyAssetId:input.moneyAssetId || "",
          good:values.commodity?.good.id || "",goodsGroup:input.goodsGroup || "",unitId:values.commodity?.unitId || values.asset.unitId,
          count:values.commodity?.count || "",feeValue:input.feeValue || "",displayAmount:values.commodity?.displayAmount || values.amount,
          partyKind:input.partyKind,partyId:input.partyId,bankId:input.bankId || "",groupId:input.groupId || "",contractId:input.contractId || "",dueId:input.dueId || "",
          amount:values.commodity?.displayAmount || values.amount,tags:values.tags,notes:String(input.notes || ""),updated:new Date().toISOString()};
        const before=clone(old || null);if(old)Object.assign(old,row);else header.rows.push(row);
        this.audit("invoice-row-save","invoiceHeaders214",header.id,before,row);
        return clone(header);
      });
    }
    removeInvoiceLine216(headerId,rowId) {
      return this.transaction(()=>{
        const header=this.find("invoiceHeaders214",headerId);
        if(!["draft","editing"].includes(header.status))throw Error("سند ثبت‌شده قابل تغییر مستقیم نیست");
        const row=header.rows?.find(r=>r.id===rowId);if(!row)throw Error("سطر یافت نشد");
        header.rows=header.rows.filter(r=>r.id!==rowId);this.audit("invoice-row-remove","invoiceHeaders214",header.id,row,null);
        return clone(header);
      });
    }
    postInvoice216(headerId,date) {
      return this.transaction(()=>{
        const header=this.find("invoiceHeaders214",headerId);
        if(!["draft","editing"].includes(header.status))throw Error("این سند قبلاً ثبت شده است");
        if(!header.rows?.length)throw Error("ابتدا حداقل یک سطر ثبت کنید");
        this.validateParty214(header);this.metadata({date});
        const parts=new Intl.DateTimeFormat("en-US-u-ca-persian",{timeZone:"UTC",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(date+"T12:00:00Z"));
        const jalali=["year","month","day"].map(k=>parts.find(p=>p.type===k).value).join("/");
        const entered=norm(header.jalali).split(/[/-]/).map((v,i)=>i?String(Number(v)).padStart(2,"0"):String(Number(v))).join("/");
        if(jalali!==entered)throw Error("تاریخ شمسی سربرگ معتبر نیست");
        if(header.status==="editing")this.reverseInvoiceDocuments217(header,"اصلاح فاکتور "+header.number);
        header.postingToken=uid();
        const ids=[];
        for(const row of header.rows) {
          const values=this.validateInvoiceLine216(header,row),c=values.commodity;
          const good=row.partyKind==="installments"?this.find("goods",this.find("installmentContracts214",row.contractId).good,true):c?c.good:this.currencyGood216(row.assetId);
          let doc;
          if(values.trade) {
            const money=this.currencyGood216(row.moneyAssetId),base=this.round(mul(this.convert(values.amount,good.unitId,good.rateUnitId || good.unitId),pos(row.rate)),money.unitId),sign=row.operation==="buy"?1n:-1n;
            doc=this.append({type:row.operation,token:header.id+":"+header.postingToken+":"+row.id,date,lineTags:row.tags,notes:row.notes},[{bucket:"person",account:header.partyId,good:good.id,quantity:str(dec(values.amount)*sign),purity:c.purity || good.purity || "",component:"goods"},{bucket:"person",account:header.partyId,good:money.id,quantity:str(-dec(base)*sign),component:"money"}],{good:good.id,person:header.partyId,moneyGood:money.id,quantity:values.amount,count:c.count,rate:pos(row.rate),baseAmount:base,physical:false});
          }
          else if(row.partyKind==="installments") doc=this.postInstallmentLine216(header,{...row,amount:values.amount},good,date);
          else {
            const source=row.operation==="receive"?header:row,target=row.operation==="receive"?row:header;
            doc=this.movement({type:row.operation,token:header.id+":"+(header.postingToken || "")+":"+row.id,date,good:good.id,quantity:values.amount,count:c?.count || undefined,purity:c?.purity || undefined,lot:row.lot || undefined,mark:row.mark || "",assay:row.assay || "",
              fromKind:source.partyKind,from:source.partyId,toKind:target.partyKind,to:target.partyId,lineTags:row.tags,tags:[],notes:row.notes,catalogInvoice217:!!c});
          }
          const saved=this.find("documents",doc.id);saved.invoiceHeader=header.id;saved.invoiceNumber=header.number;saved.invoiceRow=row.id;
          if(c?.fee && dec(c.fee.quantity)>0n) {
            const party=row.partyKind==="installments"?this.find("installmentContracts214",row.contractId):["banks","funds"].includes(header.partyKind) && !["banks","funds"].includes(row.partyKind)?row:header;
            const kind=party.partyKind,bucket={people:"person",expenses:"expense",incomes:"income",banks:"commitment",funds:"commitment"}[kind];
            const baseEntry=saved.entries.find(e=>e.account===party.partyId && e.component!=="fee"),sign=values.trade?(row.operation==="buy"?-1n:1n):baseEntry?(dec(baseEntry.quantity)<0n?-1n:1n):(row.operation==="receive"?-1n:1n);
            const entry={bucket,account:party.partyId,good:c.fee.good,quantity:str(dec(c.fee.quantity)*sign),component:"fee",purity:c.fee.basis==="weightPercent"?c.purity || good.purity || "":"",lineTags:clone(row.tags),accountSnapshot:clone(this.find(["banks","funds"].includes(kind)?"funds":kind,party.partyId))};
            saved.entries.push(entry);const fg=this.find("goods",c.fee.good);saved.snapshots[fg.id]={...clone(fg),unit:clone(this.find("units",fg.unitId)),asset:clone(this.find("assets",fg.assetId))};
            saved.fees=[clone(c.fee)];
          }
          if(c){saved.quantity=values.amount;saved.count=c.count;saved.displayUnitId=c.unitId;saved.displayAmount=c.displayAmount;}
          row.documentId=doc.id;
          row.purity=c?c.purity || good.purity || "":"";
          const principal=saved.entries.find(e=>e.account===header.partyId && e.component!=="fee"),direction=principal?(dec(principal.quantity)<0n?-1n:1n):(row.operation==="receive"?-1n:1n);
          row.signedAmount=str(dec(row.amount)*direction);row.signedCount=row.count?str(dec(row.count)*direction):"";
          row.feeDetails=(saved.fees || []).map(fee=>{
            const definition=(this.s.catalogGoods || []).find(g=>g.id===good.id),entry=saved.entries.find(e=>e.component==="fee" && e.good===fee.good);
            return {...clone(fee),mode:definition?.catalogFeeMode || (good.feeMode==="variable"?"variable":"fixed"),basis:fee.basis || (fee.kind==="gold"?"weightPercent":"perPiece"),value:fee.value || fee.percent || fee.perUnit || "0",unitId:this.find("goods",fee.good).unitId,unitName:this.find("units",this.find("goods",fee.good).unitId).name,signedQuantity:entry?.quantity || fee.quantity};
          });
          ids.push(doc.id);
        }
        header.status="posted";delete header.originalDocumentIds;header.documentIds=ids;header.postedAt=new Date().toISOString();
        this.audit("invoice-post","invoiceHeaders214",header.id,null,{number:header.number,documents:ids});
        return clone(header);
      });
    }
    postInvoiceRow218(headerId,input,date,unlocked=false) {
      return this.transaction(()=>{
        const h=this.find("invoiceHeaders214",headerId);
        if(h.status==="deleted")throw Error("فاکتور حذف شده است");
        if(h.status!=="draft" && !unlocked)throw Error("ابتدا F3 را برای اصلاح فاکتور بزنید");
        const previousRows=clone(h.rows || []),old=input.id?previousRows.find(r=>r.id===input.id):null;
        if(input.id && !old)throw Error("سطر یافت نشد");
        // Reverse only the edited row, so unrelated rows never get posted twice.
        if(old?.documentId && !this.s.documents.some(d=>d.reversalOf===old.documentId))this.reverse(old.documentId,"اصلاح سطر فاکتور "+h.number,uid(),this.find("documents",old.documentId).date);
        h.status="draft";delete h.originalDocumentIds;h.rows=old?[old]:[];
        this.saveInvoiceLine216(h.id,input);this.postInvoice216(h.id,date);
        const saved=clone(h.rows[0]);h.rows=old?previousRows.map(r=>r.id===old.id?saved:r):[...previousRows,saved];
        h.documentIds=h.rows.map(r=>r.documentId).filter(Boolean);h.status="posted";
        this.audit("invoice-row-post","invoiceHeaders214",h.id,old,saved);return clone(h);
      });
    }
    deleteInvoiceRow218(headerId,rowId,unlocked=false) {
      return this.transaction(()=>{
        if(!unlocked)throw Error("ابتدا F3 را برای اصلاح فاکتور بزنید");
        const h=this.find("invoiceHeaders214",headerId),row=h.rows?.find(r=>r.id===rowId);
        if(!row || h.status==="deleted")throw Error("سطر یافت نشد");
        if(row.documentId && !this.s.documents.some(d=>d.reversalOf===row.documentId))this.reverse(row.documentId,"حذف سطر فاکتور "+h.number,uid(),this.find("documents",row.documentId).date);
        h.rows=h.rows.filter(r=>r.id!==rowId);h.documentIds=h.rows.map(r=>r.documentId).filter(Boolean);
        h.status=h.rows.some(r=>r.documentId)?"posted":"draft";delete h.originalDocumentIds;
        this.audit("invoice-row-delete","invoiceHeaders214",h.id,row,null);return clone(h);
      });
    }
    updateInvoiceHeader218(input,date,unlocked=false) {
      return this.transaction(()=>{
        const h=this.find("invoiceHeaders214",input.id);
        const changed=["jalali","partyKind","partyId","bankId","groupId"].some(k=>(h[k] || "")!==(input[k] || ""));
        if(!changed)return clone(h);
        if(h.rows?.some(r=>r.documentId)) {
          if(!unlocked)throw Error("ابتدا F3 را بزنید");
          this.beginInvoiceEdit217(h.id);this.saveInvoiceHeader214(input);return this.postInvoice216(h.id,date);
        }
        return this.saveInvoiceHeader214(input);
      });
    }
    createInstallments214(input) {
      return this.transaction(() => {
        if (!String(input.title || "").trim()) throw Error("نام قرارداد الزامی است");
        const party = this.validateParty214(input);
        if (!["payable", "receivable"].includes(input.direction)) throw Error("نوع اقساط را انتخاب کنید");
        if (typeof input.affectAccount !== "boolean") throw Error("اثر قرارداد در ریزحساب را مشخص کنید");
        if((this.s.catalogGoods || []).some(g=>g.id===input.good))this.catalogGood217(input.good);
        const g = this.find("goods", input.good, true);
        if (!["currency", "commodity"].includes(input.commitmentKind) || (g.mode === "currency") !== (input.commitmentKind === "currency")) throw Error("دارایی تعهد با نوع تعهد سازگار نیست");
        if (input.commitmentKind === "commodity") {
          if (input.goodsGroup !== "__ungrouped") this.find("groups", input.goodsGroup, true);
          if (input.goodsGroup === "__ungrouped" ? !!g.groupId : (g.groupId !== input.goodsGroup && g.subgroupId !== input.goodsGroup)) throw Error("کالا متعلق به گروه انتخاب‌شده نیست");
        }
        const amount = this.precision(pos(input.amount), g.unitId);
        if (g.mode === "count" && dec(amount) % SCALE !== 0n) throw Error("تعداد هر قسط باید صحیح باشد");
        const count = Number(norm(input.count).replace(/[,٬]/g,""));
        if (!Number.isInteger(count) || count < 1 || count > 600) throw Error("تعداد اقساط باید بین ۱ تا ۶۰۰ باشد");
        if (!Array.isArray(input.dues) || input.dues.length !== count) throw Error("برنامهٔ سررسید کامل نیست");
        for (let i=0;i<count;i++) {
          if(!input.dues[i].date || !input.dues[i].jalali)throw Error("سررسید معتبر وارد کنید");
          this.metadata({date:input.dues[i].date});
          if (i && input.dues[i].date <= input.dues[i-1].date) throw Error("ترتیب سررسیدها معتبر نیست");
        }
        const tags = [...new Set(input.tags || [])]; tags.forEach(id=>this.find("tags",id,true));
        if ((this.s.installmentContracts214 || []).some(c=>c.token===input.token)) throw Error("این قرارداد قبلاً ثبت شده است");
        const total = this.precision(mul(amount, String(count)),g.unitId);
        const c = {id:uid(),token:input.token,title:String(input.title).trim(),direction:input.direction,affectAccount:input.affectAccount,
          partyKind:input.partyKind,partyId:input.partyId,partyName:party.name,bankId:input.bankId || "",groupId:input.groupId || "",
          commitmentKind:input.commitmentKind,goodsGroup:input.goodsGroup || "",good:g.id,goodName:g.name,unit:clone(this.find("units",g.unitId)),
          amount,count,total,tags,dues:input.dues.map(d=>({...clone(d),id:uid(),amount})),created:new Date().toISOString(),accountDocumentId:null};
        if (input.affectAccount) {
          const bucket = {people:"person",expenses:"expense",incomes:"income",banks:"commitment",funds:"commitment"}[input.partyKind];
          const quantity = input.direction === "payable" ? sub("0",total) : total;
          c.accountDocumentId = this.append({token:input.token,type:"installmentOpen",date:input.date,tags,notes:"قرارداد اقساط: " + c.title},
            [{bucket,account:input.partyId,good:g.id,quantity,purity:g.purity || ""}],
            {contract:c.id,partyKind:input.partyKind,partyId:input.partyId,person:input.partyKind === "people" ? input.partyId : "",good:g.id,physical:false}).id;
        }
        this.s.installmentContracts214 ||= []; this.s.installmentContracts214.push(c);
        this.audit("installment-create", "installmentContracts214", c.id, null, c);
        return clone(c);
      });
    }
    incomeRemaining(id) {
      const claim = this.find("documents", id);
      if (claim.type !== "incomeClaim") throw Error("طلب درآمدی معتبر انتخاب کنید");
      const active = d => !this.s.documents.some(r => r.reversalOf === d.id);
      if (!active(claim)) return "0";
      return str(dec(claim.quantity) - this.s.documents.filter(d => d.type === "incomeReceipt" && d.incomeClaim === id && active(d)).reduce((n,d)=>n+dec(d.settledQuantity),0n));
    }
    claimIncome(input) {
      return this.transaction(() => {
        this.find("incomes", input.income, true); this.find("people", input.person, true);
        const g=this.find("goods", input.good, true), quantity=this.precision(pos(input.quantity),g.unitId);
        if(g.mode==="count" && dec(quantity)%SCALE!==0n)throw Error("تعداد باید عدد صحیح باشد");
        const purity=g.purity || "";
        return this.append({...input,type:"incomeClaim"},[
          {bucket:"person",account:input.person,good:g.id,quantity,purity},
          {bucket:"income",account:input.income,good:g.id,quantity,purity}
        ],{income:input.income,person:input.person,good:g.id,quantity,purity,physical:false});
      });
    }
    receiveIncome(input) {
      return this.transaction(() => {
        const c=this.find("documents",input.claim), remaining=this.incomeRemaining(c.id);
        if(dec(remaining)<=0n)throw Error("این طلب ماندهٔ قابل دریافت ندارد");
        if(input.date && input.date<c.date)throw Error("تاریخ دریافت نمی‌تواند پیش از ثبت طلب باشد");
        const g=this.find("goods",input.good,true), original=this.find("goods",c.good), quantity=this.precision(pos(input.quantity),g.unitId);
        this.assertFund(input.fund,g);
        if(g.mode==="count" && dec(quantity)%SCALE!==0n)throw Error("تعداد باید عدد صحیح باشد");
        const converted=g.id!==c.good;
        if(converted && (!String(input.agreement||"").trim() || !input.rate)) throw Error("نرخ و شرح توافق تبدیل الزامی است");
        const rate=converted?pos(input.rate):"1", settledQuantity=this.precision(mul(quantity,rate),original.unitId);
        if(dec(settledQuantity)<=0n || dec(settledQuantity)>dec(remaining))throw Error("مقدار تسویه باید مثبت و حداکثر برابر ماندهٔ طلب باشد");
        const purity=g.purity||"", lot=g.mode==="weight"?uid():"";
        return this.append({...input,type:"incomeReceipt"},[
          {bucket:"person",account:c.person,good:c.good,quantity:str(-dec(settledQuantity)),purity:c.purity||""},
          {bucket:"stock",account:input.fund,good:g.id,quantity,purity,lot}
        ],{incomeClaim:c.id,related:c.id,income:c.income,person:c.person,good:g.id,quantity,settledQuantity,conversionRate:rate,conversionAgreement:converted?String(input.agreement):"",conversionAt:new Date().toISOString(),physical:true});
      });
    }
    payment(input) {
      return this.transaction(() => {
        const d = this.find("documents", input.related);
        if (
          !["buy", "sell"].includes(d.type) ||
          this.s.documents.some((x) => x.reversalOf === d.id)
        )
          throw Error("معامله فعال انتخاب کنید");
        const component = input.component || "money",
          r = this.remaining(d.id, component),
          q = pos(input.quantity);
        if (dec(q) > (dec(r) < 0n ? -dec(r) : dec(r)))
          throw Error("مقدار بیش از مانده تسویه است");
        const e = d.entries.find((x) => x.component === component);
        if (!e) throw Error("قلم تسویه یافت نشد");
        const g = this.find("goods", e.good),
          incoming = dec(r) > 0n;
        this.assertFund(input.fund, g);
        const lot = this.resolveLot(input, g, !incoming),
          info = {
            lot: lot.id,
            purity: lot.purity,
            mark: lot.mark,
            assay: lot.assay,
          };
        if (!incoming) this.checkStock(input.fund, g, q, info.lot);
        return this.append(
          { ...input, type: "payment" },
          [
            {
              bucket: "stock",
              account: input.fund,
              good: g.id,
              quantity: incoming ? q : sub("0", q),
              ...info,
            },
            {
              bucket: "person",
              account: d.person,
              good: g.id,
              quantity: incoming ? sub("0", q) : q,
              purity: info.purity,
            },
          ],
          {
            related: d.id,
            component,
            good: g.id,
            person: d.person,
            quantity: q,
          },
        );
      });
    }
    exchange(input) {
      return this.transaction(() => {
        this.find("people", input.person, true);
        const a = this.find("goods", input.good, true),
          b = this.find("goods", input.toGood, true);
        if (a.id === b.id) throw Error("دو دارایی متفاوت انتخاب کنید");
        const q = this.precision(pos(input.quantity), a.unitId),
          rate = pos(input.rate),
          converted = this.precision(mul(q, rate), b.unitId);
        if (!input.rateSource?.trim() || !input.rateAt || !input.notes?.trim())
          throw Error("منبع، زمان نرخ و شرح توافق تسویه الزامی است");
        if (Number.isNaN(new Date(input.rateAt).getTime()))
          throw Error("زمان نرخ معتبر نیست");
        const allocations = [];
        const obligation = (key, g, amount) => {
          if (key) {
            const [id, component] = key.split("|"),
              d = this.find("documents", id),
              entry = d.entries.find(
                (e) => e.component === component && e.good === g.id,
              );
            if (
              d.person !== input.person ||
              !entry ||
              this.s.documents.some((x) => x.reversalOf === id)
            )
              throw Error("قلم فاکتور با شخص و دارایی انتخاب‌شده سازگار نیست");
            const r = dec(this.remaining(id, component));
            if ((r < 0n ? -r : r) < dec(amount))
              throw Error("تسویه بیش از مانده فاکتور است");
            const quantity = str((r > 0n ? -1n : 1n) * dec(amount));
            allocations.push({ trade: id, component, quantity });
            return { balance: r, purity: entry.purity || "", quantity };
          }
          if (g.mode === "weight" && g.metal)
            throw Error(
              "برای تسویه فلز وزنی، قلم فاکتور و عیار تعهد را انتخاب کنید",
            );
          const balance = dec(this.balance("person", input.person, g.id));
          return {
            balance,
            purity: "",
            quantity: str((balance > 0n ? -1n : 1n) * dec(amount)),
          };
        };
        const one = obligation(input.fromObligation, a, q),
          two = obligation(input.toObligation, b, converted);
        if (
          !one.balance ||
          !two.balance ||
          one.balance > 0n === two.balance > 0n ||
          (one.balance < 0n ? -one.balance : one.balance) < dec(q) ||
          (two.balance < 0n ? -two.balance : two.balance) < dec(converted)
        )
          throw Error("مانده‌های دو دارایی باید مخالف و برای تسویه کافی باشند");
        return this.append(
          { ...input, type: "exchange" },
          [
            {
              bucket: "person",
              account: input.person,
              good: a.id,
              quantity: one.quantity,
              purity: one.purity,
            },
            {
              bucket: "person",
              account: input.person,
              good: b.id,
              quantity: two.quantity,
              purity: two.purity,
            },
          ],
          {
            person: input.person,
            good: a.id,
            toGood: b.id,
            quantity: q,
            converted,
            rate,
            rateSource: input.rateSource,
            rateAt: new Date(input.rateAt).toISOString(),
            allocations,
          },
        );
      });
    }

    valuation(input) {
      return this.transaction(() => {
        const g = this.find("goods", input.good, true),
          quote = this.find("goods", input.quoteGood, true);
        if (quote.mode !== "currency" || !input.source?.trim() || !input.at)
          throw Error("ارز گزارش، منبع و زمان نرخ را مشخص کنید");
        const rate = pos(input.rate);
        this.s.valuations = this.s.valuations || [];
        const x = {
          id: uid(),
          good: g.id,
          quoteGood: quote.id,
          rate,
          source: input.source,
          at: input.at,
          method: input.method || "market",
          basis: input.basis || "actual",
          basePurity: this.s.basePurity,
        };
        this.s.valuations.push(x);
        this.audit("valuation", "goods", g.id, null, x);
        return clone(x);
      });
    }
    reserve(input) {
      return this.transaction(() => {
        const d = this.find("documents", input.trade),
          g = this.find("goods", d.good);
        if (
          d.type !== "sell" ||
          this.s.documents.some((x) => x.reversalOf === d.id)
        )
          throw Error("فروش فعال انتخاب کنید");
        const q = pos(input.quantity);
        this.assertFund(input.fund, g);
        const other = this.s.reservations
          .filter((x) => x.trade === d.id && x.fund !== input.fund)
          .reduce((n, x) => n + dec(x.quantity), 0n);
        if (
          dec(q) + other > -dec(this.remaining(d.id)) ||
          dec(q) > dec(this.available(input.fund, g.id, d.id))
        )
          throw Error("مقدار رزرو بیش از موجودی یا تعهد است");
        this.s.reservations = this.s.reservations.filter(
          (x) => !(x.trade === d.id && x.fund === input.fund),
        );
        this.s.reservations.push({
          id: uid(),
          trade: d.id,
          fund: input.fund,
          good: g.id,
          quantity: q,
        });
        this.audit("reserve", "documents", d.id, null, input);
      });
    }
    release(trade) {
      return this.transaction(() => {
        this.s.reservations = this.s.reservations.filter(
          (x) => x.trade !== trade,
        );
        this.audit("release", "documents", trade, null, null);
      });
    }
    reconcile(input) {
      const g = this.find("goods", input.good, true),
        before = this.balance("stock", input.fund, g.id, input.lot),
        actual = this.precision(input.actual, g.unitId);
      if (dec(actual) < 0n) throw Error("موجودی واقعی منفی مجاز نیست");
      const delta = sub(actual, before);
      if (!dec(delta)) throw Error("مغایرتی وجود ندارد");
      if (!input.notes?.trim()) throw Error("علت اصلاح الزامی است");
      const d = this.movement({
        ...input,
        type: "adjustment",
        quantity: dec(delta) < 0n ? sub("0", delta) : delta,
        ...(dec(delta) < 0n
          ? { from: input.fund, fromKind: "funds", to: "", toKind: "" }
          : { to: input.fund, toKind: "funds", from: "", fromKind: "" }),
      });
      return d;
    }
    reverse(id, reason, token, date) {
      return this.transaction(() => {
        const d = this.find("documents", id);
        if (!reason.trim()) throw Error("علت برگشت الزامی است");
        if (
          d.reversalOf ||
          d.type === "legacy" ||
          this.s.documents.some((x) => x.reversalOf === id) ||
          this.s.documents.some(
            (x) =>
              !x.reversalOf &&
              (x.related === id ||
                x.allocations?.some((a) => a.trade === id) || x.incomeClaim === id) &&
              !this.s.documents.some((y) => y.reversalOf === x.id),
          )
        )
          throw Error("ابتدا اسناد مرتبط فعال را برگشت دهید");
        const es = d.entries.map((e) => ({
          ...e,
          quantity: sub("0", e.quantity),
          count: e.count ? sub("0", e.count) : null,
        }));
        for (const e of es)
          if (
            e.bucket === "stock" &&
            dec(e.quantity) < 0n &&
            dec(this.available(e.account, e.good)) < -dec(e.quantity)
          )
            throw Error("برگشت باعث موجودی منفی می‌شود");
        this.s.reservations = this.s.reservations.filter((x) => x.trade !== id);
        return this.append({ token, type: "reversal", notes: reason, date }, es, {
          reversalOf: id,
          related: d.related,
          component: d.component,
          allocations: (d.allocations || []).map((a) => ({
            ...a,
            quantity: sub("0", a.quantity),
          })),
        });
      });
    }
    equivalent(weight, purity, base = this.s.basePurity) {
      if (dec(purity) > dec("1000") || dec(base) > dec("1000"))
        throw Error("عیار نامعتبر");
      return div(mul(weight, pos(purity)), pos(base));
    }
    setBasePurity(value) {
      return this.transaction(() => {
        if (dec(value) > dec("1000")) throw Error("عیار مبنا حداکثر ۱۰۰۰ است");
        const old = this.s.basePurity;
        this.s.basePurity = pos(value);
        this.audit("base-purity", "settings", "basePurity", old, value);
      });
    }
  }
  return { Ledger, fresh, dec, str, add, sub, mul, div, pos, norm, uid, clone, formatNumber };
});
