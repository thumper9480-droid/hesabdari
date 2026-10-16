const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Ledger, fresh, uid, mul, add, div, clone } = require("../next-core.js");
function fixture() {
  const l = new Ledger(fresh()),
    p = (k, v) => l.put(k, v);
  const gram = p("units", {
      name: "گرم",
      dimension: "weight",
      factor: "1",
      decimals: 8,
    }),
    sut = p("units", {
      name: "سوت",
      dimension: "weight",
      factor: "0.001",
      decimals: 8,
    }),
    count = p("units", { name: "عدد", dimension: "count", decimals: 0 }),
    toman = p("units", {
      name: "تومان",
      dimension: "currency",
      currencyCode: "IRT",
      decimals: 0,
    }),
    usd = p("units", { name: "دلار", dimension: "currency", decimals: 2 });
  const goldAsset = p("assets", {
      name: "طلا",
      nature: "commodity",
      unitId: gram.id,
    }),
    moneyAsset = p("assets", {
      name: "تومان",
      nature: "currency",
      unitId: toman.id,
    }),
    usdAsset = p("assets", {
      name: "دلار",
      nature: "currency",
      unitId: usd.id,
    });
  const gold = p("goods", {
      name: "طلای آب‌شده",
      mode: "weight",
      assetId: goldAsset.id,
      unitId: gram.id,
      rateUnitId: gram.id,
      metal: "طلا",
      purity: "750",
      feeMode: "none",
    }),
    coin = p("goods", {
      name: "سکه بانکی",
      mode: "count",
      assetId: goldAsset.id,
      unitId: count.id,
      rateUnitId: count.id,
      feeMode: "none",
    }),
    cash = p("goods", {
      name: "تومان",
      mode: "currency",
      assetId: moneyAsset.id,
      unitId: toman.id,
      rateUnitId: toman.id,
      feeMode: "none",
    }),
    dollar = p("goods", {
      name: "دلار",
      mode: "currency",
      assetId: usdAsset.id,
      unitId: usd.id,
      rateUnitId: usd.id,
      feeMode: "none",
    });
  const location = p("locations", { name: "خانه" }),
    loc2 = p("locations", { name: "فروشگاه" }),
    fund = p("funds", {
      name: "صندوق کالا",
      locationId: location.id,
      typeId: "commodity",
    }),
    fund2 = p("funds", {
      name: "صندوق کالا ۲",
      locationId: loc2.id,
      typeId: "commodity",
    }),
    bank = p("funds", {
      name: "بانک تومانی",
      locationId: location.id,
      typeId: "currency",
      assetId: moneyAsset.id,
    }),
    fx = p("funds", {
      name: "صندوق دلار",
      locationId: location.id,
      typeId: "currency",
      assetId: usdAsset.id,
    });
  const group = p("peopleGroups", { name: "فروشندگان" }),
    a = p("people", { name: "الف", groupId: group.id }),
    b = p("people", { name: "ب", groupId: group.id });
  const opening = (good, fund, quantity, extra = {}) =>
    l.movement({
      type: "opening",
      token: uid(),
      good: good.id,
      to: fund.id,
      toKind: "funds",
      quantity,
      ...extra,
    });
  const trade = (type, good, quantity, extra = {}) =>
    l.trade({
      type,
      person: a.id,
      good: good.id,
      quantity,
      moneyGood: cash.id,
      rate: "100",
      token: uid(),
      ...extra,
    });
  return {
    l,
    p,
    gram,
    sut,
    count,
    toman,
    usd,
    gold,
    coin,
    cash,
    dollar,
    fund,
    fund2,
    bank,
    fx,
    group,
    a,
    b,
    opening,
    trade,
  };
}
test("exact decimal arithmetic and gold conversion", () => {
  assert.equal(add("0.1", "0.2"), "0.3");
  assert.equal(mul("100000000000000000", "0.03"), "3000000000000000");
  assert.equal(div("74000", "750"), "98.66666667");
});
test("purchase creates receivable, payable, and no physical inventory", () => {
  const { l, trade, gold, a, fund, cash } = fixture();
  const d = trade("buy", gold, "100");
  assert.equal(l.balance("person", a.id, gold.id), "100");
  assert.equal(l.balance("person", a.id, cash.id), "-10000");
  assert.equal(l.balance("stock", fund.id, gold.id), "0");
  assert.equal(l.remaining(d.id), "100");
});
test("partial gold receipts update only actual delivery and remaining obligation", () => {
  const { l, trade, gold, fund } = fixture();
  const d = trade("buy", gold, "100");
  l.delivery({
    related: d.id,
    fund: fund.id,
    quantity: "60",
    purity: "750",
    mark: "R123",
    assay: "مرکز",
    token: uid(),
  });
  assert.equal(l.balance("stock", fund.id, gold.id), "60");
  assert.equal(l.remaining(d.id), "40");
  l.delivery({
    related: d.id,
    fund: fund.id,
    quantity: "40",
    purity: "750",
    token: uid(),
  });
  assert.equal(l.remaining(d.id), "0");
  assert.equal(l.balance("stock", fund.id, gold.id), "100");
  assert.throws(
    () =>
      l.delivery({ related: d.id, fund: fund.id, quantity: "1", token: uid() }),
    /مانده/,
  );
});
test("sale does not reduce physical inventory until delivery", () => {
  const { l, opening, trade, coin, fund } = fixture();
  opening(coin, fund, "10");
  const d = trade("sell", coin, "6");
  assert.equal(l.balance("stock", fund.id, coin.id), "10");
  assert.equal(l.remaining(d.id), "-6");
  l.delivery({ related: d.id, fund: fund.id, quantity: "4", token: uid() });
  assert.equal(l.balance("stock", fund.id, coin.id), "6");
  assert.equal(l.remaining(d.id), "-2");
});
test("payment and commodity delivery remain independent", () => {
  const { l, opening, trade, gold, cash, fund, bank, a } = fixture();
  opening(cash, bank, "10000");
  const d = trade("buy", gold, "100");
  l.payment({ related: d.id, fund: bank.id, quantity: "7000", token: uid() });
  assert.equal(l.remaining(d.id, "money"), "-3000");
  assert.equal(l.remaining(d.id), "100");
  assert.equal(l.balance("stock", fund.id, gold.id), "0");
  assert.equal(l.balance("person", a.id, cash.id), "-3000");
});
test("count purchase partial receipt keeps count, never inferred gold weight", () => {
  const { l, trade, coin, fund } = fixture();
  const d = trade("buy", coin, "10");
  l.delivery({ related: d.id, fund: fund.id, quantity: "4", token: uid() });
  assert.equal(l.remaining(d.id), "6");
  assert.equal(l.balance("stock", fund.id, coin.id), "4");
});
test("currency quantities are independent and wrong fund is rejected", () => {
  const { l, opening, dollar, fx, bank, cash } = fixture();
  opening(dollar, fx, "10000");
  assert.equal(l.balance("stock", fx.id, dollar.id), "10000");
  assert.equal(l.balance("stock", fx.id, cash.id), "0");
  assert.throws(() => opening(dollar, bank, "1"), /سازگار/);
});
test("physical transfer preserves total and lot identity", () => {
  const { l, opening, gold, fund, fund2 } = fixture();
  const d = opening(gold, fund, "100", {
    purity: "740",
    mark: "R1",
    assay: "مرکز الف",
  });
  const lot = d.entries[0].lot;
  l.movement({
    type: "transfer",
    from: fund.id,
    fromKind: "funds",
    to: fund2.id,
    toKind: "funds",
    good: gold.id,
    quantity: "40",
    lot,
    token: uid(),
  });
  assert.equal(l.balance("stock", null, gold.id), "100");
  assert.equal(l.balance("stock", fund.id, gold.id), "60");
  assert.equal(l.lots(fund2.id, gold.id)[0].purity, "740");
});
test("direct person remittance reduces source receivable and creates destination receivable without stock", () => {
  const { l, trade, gold, a, b, fund } = fixture();
  trade("buy", gold, "100");
  l.movement({
    type: "transfer",
    from: a.id,
    fromKind: "people",
    to: b.id,
    toKind: "people",
    good: gold.id,
    quantity: "100",
    agreement: "new",
    token: uid(),
  });
  assert.equal(l.balance("person", a.id, gold.id), "0");
  assert.equal(l.balance("person", b.id, gold.id), "100");
  assert.equal(l.balance("stock", fund.id, gold.id), "0");
});
test("person remittance can settle source receivable and destination payable", () => {
  const { l, trade, gold, a, b } = fixture();
  trade("buy", gold, "100");
  trade("sell", gold, "100", { person: b.id });
  l.movement({
    type: "transfer",
    from: a.id,
    fromKind: "people",
    to: b.id,
    toKind: "people",
    good: gold.id,
    quantity: "100",
    agreement: "settle",
    token: uid(),
  });
  assert.equal(l.balance("person", a.id, gold.id), "0");
  assert.equal(l.balance("person", b.id, gold.id), "0");
});
test("six 30-sut pieces yield 180 sut and separate 60000 toman commission", () => {
  const { l, p, gold, sut, trade, cash, a } = fixture();
  const g = p("goods", {
    ...gold,
    name: "پارسیان",
    standardWeight: "30",
    standardWeightUnitId: sut.id,
    feeMode: "fixed",
    feeValue: "10000",
    feeGoodId: cash.id,
  });
  const d = trade("sell", g, null, { count: "6" });
  assert.equal(d.quantity, "0.18");
  assert.equal(d.fees[0].quantity, "60000");
  assert.equal(d.entries.filter((x) => x.good === g.id)[0].quantity, "-0.18");
  assert.equal(l.remaining(d.id, "fee"), "60000");
  assert.equal(d.baseAmount, "18");
});
test("gold fee calculated once and kept separate from commodity obligation", () => {
  const { l, p, gold, trade } = fixture();
  const g = p("goods", { ...gold, feeMode: "gold", feePercent: "2" });
  const d = trade("sell", g, "100");
  assert.equal(d.fees[0].quantity, "2");
  assert.equal(l.remaining(d.id), "-100");
  assert.equal(l.remaining(d.id, "fee"), "2");
  assert.equal(d.entries.filter((x) => x.component === "fee").length, 1);
});
test("percentage fees forbidden for count goods and currency", () => {
  const { p, coin, dollar } = fixture();
  assert.throws(
    () => p("goods", { ...coin, feeMode: "gold", feePercent: "1" }),
    /مجاز/,
  );
  assert.throws(
    () => p("goods", { ...dollar, feeMode: "fixed", feeValue: "10" }),
    /مجاز/,
  );
});
test("historical snapshots survive changed fee, purity, and standard weight", () => {
  const { l, p, gold, trade } = fixture();
  const d = trade("buy", gold, "100");
  p("goods", {
    ...gold,
    purity: "900",
    standardWeight: "2",
    standardWeightUnitId: gold.unitId,
    feeMode: "gold",
    feePercent: "3",
  });
  const after = l.find("documents", d.id);
  assert.equal(after.snapshots[gold.id].purity, "750");
  assert.equal(after.quantity, "100");
  assert.equal(l.remaining(d.id), "100");
  assert.equal(after.fees.length, 0);
});
test("assay mismatch cannot silently settle the original gold obligation", () => {
  const { l, trade, gold, fund } = fixture();
  const d = trade("buy", gold, "100");
  assert.throws(
    () =>
      l.delivery({
        related: d.id,
        fund: fund.id,
        quantity: "10",
        purity: "740",
        token: uid(),
      }),
    /عیار/,
  );
  assert.equal(l.balance("stock", fund.id, gold.id), "0");
});
test("duplicate delivery token and excessive physical payment are rejected atomically", () => {
  const { l, trade, gold, fund } = fixture();
  const d = trade("buy", gold, "100"),
    token = uid();
  l.delivery({
    related: d.id,
    fund: fund.id,
    quantity: "20",
    purity: "750",
    token,
  });
  const before = clone(l.s);
  assert.throws(
    () =>
      l.delivery({
        related: d.id,
        fund: fund.id,
        quantity: "20",
        purity: "750",
        token,
      }),
    /قبلاً/,
  );
  assert.deepEqual(l.s, before);
  const lot = l.lots(fund.id, gold.id)[0];
  assert.throws(
    () =>
      l.movement({
        type: "pay",
        from: fund.id,
        fromKind: "funds",
        to: d.person,
        toKind: "people",
        good: gold.id,
        quantity: "21",
        lot: lot.id,
        token: uid(),
      }),
    /موجودی/,
  );
});
test("reservations reduce available quantity and release on actual delivery", () => {
  const { l, opening, trade, coin, fund } = fixture();
  opening(coin, fund, "10");
  const d = trade("sell", coin, "8");
  l.reserve({ trade: d.id, fund: fund.id, quantity: "8" });
  assert.equal(l.available(fund.id, coin.id), "2");
  l.delivery({ related: d.id, fund: fund.id, quantity: "3", token: uid() });
  assert.equal(l.available(fund.id, coin.id), "2");
  assert.equal(l.balance("stock", fund.id, coin.id), "7");
  assert.equal(l.s.reservations[0].quantity, "5");
});
test("reversals preserve original document and restore physical balance", () => {
  const { l, opening, coin, fund } = fixture();
  const d = opening(coin, fund, "10");
  const r = l.reverse(d.id, "اشتباه افتتاحیه", uid());
  assert.equal(l.balance("stock", fund.id, coin.id), "0");
  assert.equal(l.find("documents", d.id).entries[0].quantity, "10");
  assert.equal(r.reversalOf, d.id);
  assert.throws(() => l.reverse(d.id, "دوباره", uid()), /مرتبط/);
});
test("separate expense hierarchies reject cross-category selection", () => {
  const { p } = fixture();
  const home = p("expenseGroups", { name: "خانه" }),
    shop = p("expenseGroups", { name: "فروشگاه" }),
    rent = p("expenseHeads", { name: "اجاره", groupId: home.id });
  assert.throws(
    () =>
      p("expenses", {
        name: "اجاره فروشگاه",
        groupId: shop.id,
        headId: rent.id,
      }),
    /متعلق/,
  );
  const r2 = p("expenseHeads", { name: "اجاره", groupId: shop.id });
  assert.notEqual(rent.id, r2.id);
});
test("person group moves retain stable identity and transaction references", () => {
  const { l, p, trade, coin, a } = fixture();
  const d = trade("buy", coin, "10"),
    g = p("peopleGroups", { name: "مشتریان" });
  p("people", { ...a, groupId: g.id });
  assert.equal(l.find("documents", d.id).person, a.id);
  assert.equal(l.balance("person", a.id, coin.id), "10");
});
test("tag normalization, color independence, deactivation and referential deletion safety", () => {
  const { l, p, trade, coin } = fixture();
  const tag = p("tags", { name: "مهم ي", color: "#0000ff" });
  assert.throws(() => p("tags", { name: "مهم ی", color: "#ff0000" }), /قبلاً/);
  trade("buy", coin, "1", { tags: [tag.id] });
  p("tags", { ...tag, name: "فوری", color: "#ff0000", active: false });
  assert.throws(() => l.remove("tags", tag.id), /ارتباط/);
  assert.equal(l.s.documents[0].tags[0], tag.id);
  assert.throws(() => trade("buy", coin, "1", { tags: [tag.id] }), /فعال/);
});
test("incompatible units, invalid purity and invalid decimals are rejected", () => {
  const { l, p, gram, count, gold } = fixture();
  assert.throws(() => l.convert("1", gram.id, count.id), /تبدیل/);
  assert.throws(() => p("goods", { ...gold, purity: "1001" }), /عیار/);
  assert.throws(() => l.precision("0.5", count.id), /دقت/);
});
test("persistence failure rolls back the entire multi-entry operation", () => {
  const { l, trade, coin } = fixture();
  const before = clone(l.s);
  l.save = () => {
    throw Error("quota");
  };
  assert.throws(() => trade("buy", coin, "10"), /quota/);
  assert.deepEqual(l.s, before);
});
test("changing report purity does not rewrite posted documents", () => {
  const { l, trade, gold } = fixture();
  const d = trade("buy", gold, "100", { purity: "740" });
  assert.equal(l.equivalent("100", "740"), "98.66666667");
  l.setBasePurity("900");
  assert.deepEqual(l.find("documents", d.id), d);
  assert.equal(l.equivalent("100", "740"), "82.22222222");
});
test("cross-asset settlement records rate and updates the selected invoice components", () => {
  const { l, trade, gold, cash, a } = fixture();
  const d = trade("buy", gold, "100");
  const e = l.exchange({
    type: "exchange",
    person: a.id,
    good: gold.id,
    toGood: cash.id,
    quantity: "20",
    rate: "100",
    rateSource: "توافق طرفین",
    rateAt: "2026-10-16T10:00:00Z",
    notes: "تسویه توافقی",
    fromObligation: d.id + "|goods",
    toObligation: d.id + "|money",
    token: uid(),
  });
  assert.equal(l.remaining(d.id), "80");
  assert.equal(l.remaining(d.id, "money"), "-8000");
  assert.equal(l.balance("stock", null, gold.id), "0");
  l.reverse(e.id, "برگشت توافق", uid());
  assert.equal(l.remaining(d.id), "100");
  assert.equal(l.remaining(d.id, "money"), "-10000");
});
test("exchange without source, timestamp, or agreed rate is rejected", () => {
  const { l, trade, gold, cash, a } = fixture();
  trade("buy", gold, "100");
  assert.throws(
    () =>
      l.exchange({
        person: a.id,
        good: gold.id,
        toGood: cash.id,
        quantity: "20",
        rate: "100",
        token: uid(),
      }),
    /منبع/,
  );
});
test("valuation records its source, timestamp, currency, and report basis without changing quantity", () => {
  const { l, opening, gold, cash, fund } = fixture();
  opening(gold, fund, "100", { purity: "740" });
  const before = l.balance("stock", fund.id, gold.id);
  const v = l.valuation({
    good: gold.id,
    quoteGood: cash.id,
    rate: "100",
    source: "نرخ دستی کاربر",
    at: "2026-10-16T10:00:00Z",
    basis: "basePurity",
  });
  l.setBasePurity("900");
  assert.equal(v.basePurity, "750");
  assert.equal(l.balance("stock", fund.id, gold.id), before);
});
test("inventory reconciliation appends a reasoned adjustment and preserves original lot", () => {
  const { l, opening, gold, fund } = fixture();
  const d = opening(gold, fund, "100", { purity: "740", mark: "R1" }),
    lot = d.entries[0].lot;
  l.reconcile({
    fund: fund.id,
    good: gold.id,
    lot,
    actual: "98",
    notes: "شمارش واقعی",
    token: uid(),
  });
  assert.equal(l.balance("stock", fund.id, gold.id, lot), "98");
  assert.equal(l.s.documents.length, 2);
  assert.equal(l.find("documents", d.id).entries[0].quantity, "100");
  assert.throws(
    () =>
      l.reconcile({
        fund: fund.id,
        good: gold.id,
        lot,
        actual: "90",
        notes: "",
        token: uid(),
      }),
    /علت/,
  );
});
test("standard weight cannot be overwritten through the total quantity field", () => {
  const { l, p, gold, sut } = fixture();
  const g = p("goods", {
    ...gold,
    standardWeight: "30",
    standardWeightUnitId: sut.id,
  });
  assert.throws(
    () => l.quantity(g, { count: "6", quantity: "1" }),
    /استاندارد/,
  );
  assert.throws(
    () => l.quantity(g, { count: "6", actualWeight: "0.179" }),
    /مجاز/,
  );
  const allowed = p("goods", { ...g, allowActual: true });
  assert.equal(
    l.quantity(allowed, { count: "6", actualWeight: "0.179" }).quantity,
    "0.179",
  );
  assert.equal(
    l.quantity(allowed, { count: "6", actualWeight: "0.179" }).standard,
    "0.18",
  );
});
test("historical expense classifications are retained after a catalog reorganization", () => {
  const { l, p, cash, bank, opening } = fixture();
  const home = p("expenseGroups", { name: "خانه" }),
    shop = p("expenseGroups", { name: "فروشگاه" }),
    head = p("expenseHeads", { name: "اجاره", groupId: home.id }),
    head2 = p("expenseHeads", { name: "اجاره", groupId: shop.id }),
    account = p("expenses", {
      name: "اجاره",
      groupId: home.id,
      headId: head.id,
    });
  opening(cash, bank, "1000");
  const doc = l.movement({
    type: "expense",
    fromKind: "funds",
    from: bank.id,
    toKind: "expenses",
    to: account.id,
    good: cash.id,
    quantity: "100",
    token: uid(),
  });
  p("expenses", { ...account, groupId: shop.id, headId: head2.id });
  assert.equal(
    l.find("documents", doc.id).entries.find((x) => x.bucket === "expense")
      .accountSnapshot.groupId,
    home.id,
  );
  assert.equal(l.balance("expense", account.id, cash.id), "100");
});
test("direct commodity payment charges one independent per-piece fee", () => {
  const { l, p, gold, sut, cash, a, fund, opening } = fixture();
  const g = p("goods", {
    ...gold,
    name: "پارسیان کارمزدی",
    standardWeight: "30",
    standardWeightUnitId: sut.id,
    feeMode: "fixed",
    feeValue: "10000",
    feeGoodId: cash.id,
  });
  const d = opening(g, fund, "0.18", { purity: "750" });
  l.movement({
    type: "pay",
    from: fund.id,
    fromKind: "funds",
    to: a.id,
    toKind: "people",
    good: g.id,
    count: "6",
    lot: d.entries[0].lot,
    token: uid(),
  });
  assert.equal(l.balance("stock", fund.id, g.id), "0");
  assert.equal(l.balance("person", a.id, g.id), "0.18");
  assert.equal(l.balance("person", a.id, cash.id), "60000");
  assert.equal(l.s.documents.at(-1).fees.length, 1);
});
test("invoice amount has an explicit reproducible monetary rounding rule", () => {
  const { l, trade, gold } = fixture();
  const d = trade("buy", gold, "0.18", { rate: "333" });
  assert.equal(d.unroundedBase, "59.94");
  assert.equal(d.baseAmount, "60");
  assert.equal(d.rounding, "half-up-to-payment-unit");
});
test("allocated settlement blocks cancellation of its parent until it is reversed", () => {
  const { l, trade, gold, cash, a } = fixture();
  const d = trade("buy", gold, "100");
  const e = l.exchange({
    person: a.id,
    good: gold.id,
    toGood: cash.id,
    quantity: "20",
    rate: "100",
    rateSource: "توافق",
    rateAt: "2026-10-16",
    notes: "تسویه",
    fromObligation: d.id + "|goods",
    toObligation: d.id + "|money",
    token: uid(),
  });
  assert.throws(() => l.reverse(d.id, "ابطال خرید", uid()), /مرتبط/);
  l.reverse(e.id, "برگشت تسویه", uid());
  l.reverse(d.id, "ابطال خرید", uid());
  assert.equal(l.remaining(d.id), "0");
});
