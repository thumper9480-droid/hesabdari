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
      .replace(/[٬,\s]/g, "")
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
  class Ledger {
    constructor(state = fresh(), save = () => {}) {
      if (state.schema !== 1) throw Error("نسخه داده پشتیبانی نمی‌شود");
      this.s = clone(state);
      this.s.bankInstitutions ||= [];
      this.save = save;
    }
    transaction(fn) {
      const before = clone(this.s);
      try {
        const result = fn();
        this.s.revision++;
        this.save(clone(this.s));
        return result;
      } catch (e) {
        this.s = before;
        throw e;
      }
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
              (e) => e.good === id || e.account === id || e.lot === id,
            ) ||
            d.tags?.includes(id) ||
            d.good === id ||
            d.person === id ||
            d.tags?.includes(id),
        )
      )
        return true;
      const refs = {
        units: ["unitId", "rateUnitId", "standardWeightUnitId"],
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
        if (data.id && !old) throw Error("رکورد یافت نشد");
        const before = clone(old || null),
          x = {
            ...old,
            ...clone(data),
            id: old?.id || uid(),
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
          x.decimals = Number(x.decimals);
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
          x.decimals = Number(x.decimals ?? u.decimals);
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
          const h = this.find("expenseHeads", x.headId, true);
          if (h.groupId !== x.groupId)
            throw Error("سرفصل متعلق به دسته انتخاب‌شده نیست");
        }
        if (kind === "incomes") {
          this.find("incomeSources", x.sourceId, true);
          this.find("incomeTypes", x.typeId, true);
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
          tags: d.tags,
          snapshot: d.snapshots?.[e.good],
          reversalOf: d.reversalOf,
          at: d.created,
        })),
      );
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
      for (const e of entries) {
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
      if (g.mode !== "weight" || !g.metal)
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
        const g = this.find("goods", input.good, true),
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
          lot = this.resolveLot({ ...input, fund: input.from }, g, outStock),
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
            entries.push({
              bucket: "stock",
              account: id,
              good: g.id,
              quantity: str(dec(q.quantity) * sign),
              count: q.count ? str(dec(q.count) * sign) : null,
              ...info,
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
          entries.length !== 2
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
    reverse(id, reason, token) {
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
                x.allocations?.some((a) => a.trade === id)) &&
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
        return this.append({ token, type: "reversal", notes: reason }, es, {
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
  return { Ledger, fresh, dec, str, add, sub, mul, div, pos, norm, uid, clone };
});
