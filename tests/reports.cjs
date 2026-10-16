const assert = require("node:assert/strict"),
  fs = require("node:fs/promises");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/opt/codex/cua_node/lib/node_modules/playwright",
);
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.APP_URL || "http://127.0.0.1:8001");
    const ids = await p.evaluate(() => {
      const l = Sadra204.ledger,
        s = l.s,
        person = s.people[0].id,
        gold = s.goods.find((g) => g.name === "طلای آب‌شده").id,
        money = s.goods.find((g) => g.name === "تومان").id,
        fund = s.funds.find((f) => f.nature === "commodity").id,
        a = l.put("tags", { name: "برچسب الف", color: "#ff0000" }),
        b = l.put("tags", { name: "برچسب ب", color: "#0000ff" });
      const trades = [];
      for (let i = 0; i < 60; i++)
        trades.push(
          l.trade({
            type: "buy",
            good: gold,
            person,
            moneyGood: money,
            quantity: "1",
            rate: "100",
            date: "2026-10-16",
            tags: i % 2 ? [a.id] : [a.id, b.id],
            notes: "ردیف آزمایشی " + i,
            token: crypto.randomUUID(),
          }),
        );
      l.movement({
        type: "opening",
        good: gold,
        to: fund,
        toKind: "funds",
        quantity: "5",
        purity: "750",
        date: "2026-10-15",
        token: crypto.randomUUID(),
      });
      l.delivery({
        related: trades[0].id,
        fund,
        quantity: "0.4",
        purity: "750",
        mark: "R-REPORT",
        assay: "مرکز آزمایش",
        date: "2026-10-16",
        token: crypto.randomUUID(),
      });
      return { person, gold, money, fund };
    });
    await p.evaluate(() => Sadra204.go("reports"));
    assert.equal(
      await p.locator("#next204 .n-scroll table tbody tr").count(),
      50,
    );
    let waiting = p.waitForEvent("download");
    await p.getByRole("button", { name: "خروجی CSV", exact: true }).click();
    let file = await waiting;
    const csv = await fs.readFile(await file.path(), "utf8");
    assert.ok(csv.split("\r\n").length > 120);
    assert.ok(csv.includes("ردیف آزمایشی 59"));
    waiting = p.waitForEvent("download");
    await p.getByRole("button", { name: "خروجی Excel", exact: true }).click();
    file = await waiting;
    const excel = await fs.readFile(await file.path(), "utf8");
    assert.ok(excel.includes("urn:schemas-microsoft-com:office:spreadsheet"));
    assert.ok(excel.includes("ردیف آزمایشی 59"));
    const popup = p.waitForEvent("popup");
    await p
      .getByRole("button", { name: "چاپ / ذخیره PDF", exact: true })
      .click();
    const print = await popup;
    await print.waitForLoadState();
    assert.equal(await print.locator("tbody tr").count(), 123);
    const pdf = await print.pdf({ format: "A4", landscape: true });
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
    await print.close();
    await p.getByRole("checkbox", { name: "برچسب الف", exact: true }).check();
    await p.getByRole("checkbox", { name: "برچسب ب", exact: true }).check();
    await p
      .locator("#next204")
      .getByLabel("منطق برچسب‌ها", { exact: true })
      .selectOption("all");
    assert.ok((await p.locator("#next204").innerText()).includes("۶۰ ردیف"));
    await p
      .getByRole("button", { name: "پاک‌کردن فیلترها", exact: true })
      .click();
    await p
      .locator("#next204")
      .getByLabel("شخص", { exact: true })
      .selectOption(ids.person);
    await p
      .locator("#next204")
      .getByLabel("صندوق / بانک", { exact: true })
      .selectOption(ids.fund);
    await p
      .getByLabel("نوع واقعی عملیات", { exact: true })
      .selectOption("delivery");
    await p
      .locator("#next204")
      .getByLabel("از تاریخ", { exact: true })
      .fill("2026-10-16");
    await p
      .locator("#next204")
      .getByLabel("از تاریخ", { exact: true })
      .press("Tab");
    assert.equal(
      await p.locator("#next204 .n-scroll table tbody tr").count(),
      1,
    );
    assert.ok(
      (await p.locator("#next204 .n-scroll").innerText()).includes("۰.۴"),
    );
    await p.evaluate(() => Sadra204.go("inventory"));
    await p
      .getByRole("button", { name: "ثبت نرخ ارزش‌گذاری", exact: true })
      .click();
    await p
      .locator("#next204")
      .getByLabel("کالا / دارایی", { exact: true })
      .selectOption(ids.gold);
    await p
      .locator("#next204")
      .getByLabel("ارز گزارش", { exact: true })
      .selectOption(ids.money);
    await p
      .locator("#next204")
      .getByLabel("نرخ هر واحد در ارز گزارش", { exact: true })
      .fill("100");
    await p
      .locator("#next204")
      .getByLabel("منبع نرخ", { exact: true })
      .fill("نرخ دستی آزمون");
    await p.getByRole("button", { name: "ثبت نرخ", exact: true }).click();
    assert.ok((await p.locator("#next204").innerText()).includes("۵۴۰"));
    assert.equal(
      await p.evaluate(
        (id) => Sadra204.ledger.balance("stock", id.fund, id.gold),
        ids,
      ),
      "5.4",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 123 report rows, 50-row pagination, complete CSV/Excel/PDF, AND tags, combined person/fund/date/type filters, valuation with unchanged physical inventory.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
