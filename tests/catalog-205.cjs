const assert = require("node:assert/strict");
const { chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const p = await browser.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.APP_URL || "http://127.0.0.1:8002");
    await p.waitForFunction(() => !!window.Sadra204);
    const root = p.locator("#next204");
    const go = (route) => p.evaluate((route) => Sadra204.go(route), route);
    const create = () =>
      root
        .getByRole("button", { name: "ایجاد مورد جدید", exact: true })
        .click();
    const save = async () => {
      await p.getByRole("button", { name: "ذخیره", exact: true }).click();
      if (await p.locator("dialog").count())
        throw Error(await p.locator("dialog").textContent());
    };
    const snapshot = await p.evaluate(() =>
      JSON.stringify({
        goods: Sadra204.ledger.s.goods,
        documents: Sadra204.ledger.s.documents,
      }),
    );
    await go("funds");
    assert.equal(
      await root
        .getByRole("button", { name: "محل‌های نگهداری", exact: true })
        .count(),
      0,
    );
    await create();
    assert.equal(await p.locator("#n-locationId").count(), 0);
    assert.deepEqual(
      await p
        .locator("dialog input, dialog select")
        .evaluateAll((ns) => ns.map((n) => n.id)),
      ["n-name", "n-typeId"],
    );
    await p.locator("#n-name").fill("صندوق جدید بدون محل");
    await p.locator("#n-typeId").selectOption("commodity");
    await save();
    await go("expense");
    await root
      .getByRole("button", { name: "محل‌های هزینه", exact: true })
      .click();
    await create();
    await p.locator("#n-name").fill("خانه جدید");
    await save();
    const group = await p.evaluate(
      () =>
        Sadra204.ledger.s.expenseGroups.find((x) => x.name === "خانه جدید").id,
    );
    await root
      .getByRole("button", { name: "حساب‌های هزینه", exact: true })
      .click();
    await create();
    assert.deepEqual(
      await p
        .locator("dialog input, dialog select")
        .evaluateAll((ns) => ns.map((n) => n.id)),
      ["n-groupId", "n-name"],
    );
    await p.locator("#n-groupId").selectOption(group);
    await p.locator("#n-name").fill("تاکسی");
    await save();
    assert.equal(
      await root
        .getByRole("button", { name: "سرفصل‌ها و زیرسرفصل‌ها", exact: true })
        .count(),
      0,
    );
    await go("income");
    await create();
    assert.deepEqual(
      await p
        .locator("dialog input, dialog select")
        .evaluateAll((ns) => ns.map((n) => n.id)),
      ["n-catalogNature", "n-name", "n-sourceId"],
    );
    const source = await p
      .locator("#n-sourceId option")
      .evaluateAll((ns) => ns.find((n) => n.value)?.value);
    await p.locator("#n-catalogNature").selectOption("commodity");
    await p.locator("#n-name").fill("درآمد تولید");
    await p.locator("#n-sourceId").selectOption(source);
    await save();
    await go("tags");
    await create();
    assert.deepEqual(
      await p
        .locator("dialog input, dialog select")
        .evaluateAll((ns) => ns.map((n) => n.id)),
      ["n-name"],
    );
    await p.locator("#n-name").fill("برچسب ساده");
    await save();
    await go("goods");
    await root
      .getByRole("button", { name: "گروه‌ها و زیرگروه‌های کالا", exact: true })
      .click();
    await create();
    await p.locator("#n-name").fill("گروه جدید");
    await save();
    const goodsGroup = await p.evaluate(
      () => Sadra204.ledger.s.groups.find((x) => x.name === "گروه جدید").id,
    );
    await root.getByRole("button", { name: "کالاها", exact: true }).click();
    await create();
    await p.locator("#n-name").fill("قطعه ۳۰ سوت");
    await p.locator("#n-groupId").selectOption(goodsGroup);
    await p.locator("#n-catalogMode").selectOption("weightCount");
    await p.locator("#n-catalogPurity").fill("740");
    await p.locator("#n-catalogPieceWeight").fill("0.03");
    await p.locator("#n-catalogHasFee").selectOption("yes");
    await p.locator("#n-catalogFeeMode").selectOption("fixed");
    await p.locator("#n-catalogFeeValue").fill("5000");
    await save();
    assert.equal(
      await p.evaluate(() =>
        JSON.stringify({
          goods: Sadra204.ledger.s.goods,
          documents: Sadra204.ledger.s.documents,
        }),
      ),
      snapshot,
      "catalog edits must not change financial goods/documents",
    );
    const existing = await p.evaluate(() =>
      Sadra204.ledger.s.goods.find((g) => g.mode === "weight"),
    );
    await root
      .locator("tr")
      .filter({ hasText: existing.name })
      .first()
      .getByRole("button", { name: "ویرایش", exact: true })
      .click();
    await p.locator("#n-name").fill("نام جدید معرفی کالای قبلی");
    await p.locator("#n-groupId").selectOption(goodsGroup);
    await p.locator("#n-catalogMode").selectOption("weight");
    await p.locator("#n-catalogPurity").fill("900");
    await save();
    assert.equal(
      await p.evaluate(() =>
        JSON.stringify({
          goods: Sadra204.ledger.s.goods,
          documents: Sadra204.ledger.s.documents,
        }),
      ),
      snapshot,
      "editing an existing catalog must not rewrite financial definitions",
    );
    await p.reload();
    await go("goods");
    assert.ok(await root.getByText("قطعه ۳۰ سوت", { exact: true }).count());
    const draft = await p.evaluate(() =>
      Sadra204.ledger.s.catalogGoods.find((x) => x.name === "قطعه ۳۰ سوت"),
    );
    assert.equal(draft.catalogPieceWeight, "0.03");
    assert.equal(draft.catalogPurity, "740");
    assert.equal(draft.catalogOnly, true);
    await root
      .locator("tr")
      .filter({ hasText: "قطعه ۳۰ سوت" })
      .getByRole("button", { name: "ویرایش", exact: true })
      .click();
    await p.locator("#n-catalogFeeMode").selectOption("variable");
    assert.equal(await p.locator("#n-catalogFeeValue").count(), 0);
    await save();
    assert.deepEqual(errors, []);
    console.log(
      "PASS catalog 205: simplified forms, create/reload, fixed/variable goods metadata, financial definitions/documents unchanged.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
