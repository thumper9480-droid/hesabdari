/* Run: node tests/browser.cjs. Uses Chromium and Playwright supplied by the environment. */
const assert = require("node:assert/strict");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/opt/codex/cua_node/lib/node_modules/playwright",
);
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.APP_URL || "http://127.0.0.1:8001");
    await page.waitForFunction(() => !!window.Sadra204);
    assert.match(await page.title(), /۲۰۴/);
    await page
      .getByRole("button", { name: "محل‌های نگهداری", exact: true })
      .click();
    await page
      .getByRole("button", { name: "ایجاد مورد جدید", exact: true })
      .click();
    await page.locator("#n-name").fill("فروشگاه آزمون");
    await page.getByRole("button", { name: "ذخیره", exact: true }).click();
    assert.equal(await page.locator("dialog").count(), 0);
    assert.ok(await page.getByText("فروشگاه آزمون", { exact: true }).count());
    await page.evaluate(() => Sadra204.go("tags"));
    await page
      .getByRole("button", { name: "ایجاد مورد جدید", exact: true })
      .click();
    await page.locator("#n-name").fill("<img src=x onerror=alert(1)> مهم");
    await page.locator("#n-color").fill("#0000ff");
    await page.getByRole("button", { name: "ذخیره", exact: true }).click();
    assert.ok(
      await page
        .getByText("<img src=x onerror=alert(1)> مهم", { exact: true })
        .count(),
    );
    assert.equal(await page.locator("#next204 img").count(), 0);
    const ids = await page.evaluate(() => {
      const s = Sadra204.ledger.s;
      return {
        person: s.people[0].id,
        group: s.people[0].groupId,
        gold: s.goods.find((g) => g.name === "طلای آب‌شده").id,
        money: s.goods.find((g) => g.name === "تومان").id,
        fund: s.funds.find((f) => f.nature === "commodity").id,
        tag: s.tags.at(-1).id,
      };
    });
    await page.evaluate(() => Sadra204.go("operations"));
    await page.locator("#n-op-personGroup").selectOption(ids.group);
    await page.locator("#n-op-person").selectOption(ids.person);
    await page.locator("#n-op-good").selectOption(ids.gold);
    await page.locator("#n-op-moneyGood").selectOption(ids.money);
    await page.locator("#n-op-rate").fill("100");
    await page.locator("#n-op-quantity").fill("100");
    await page
      .getByRole("button", { name: "ثبت قطعی سند", exact: true })
      .click();
    assert.ok(await page.locator("dialog").count());
    await page.getByRole("button", { name: "بستن", exact: true }).click();
    const trade = await page.evaluate(() => {
      const l = Sadra204.ledger,
        d = l.s.documents.find((d) => d.type === "buy");
      return {
        id: d.id,
        physical: l.balance("stock", null, d.good),
        remaining: l.remaining(d.id),
      };
    });
    assert.equal(trade.physical, "0");
    assert.equal(trade.remaining, "100");
    await page.locator("#n-operation-type").selectOption("delivery");
    await page.locator("#n-op-related").selectOption(trade.id);
    await page.locator("#n-op-fund").selectOption(ids.fund);
    await page.locator("#n-op-quantity").fill("60");
    await page.locator("#n-op-purity").fill("750");
    await page.locator("#n-op-mark").fill("TEST-740");
    await page.locator("#n-op-assay").fill("مرکز آزمون");
    await page
      .getByRole("button", { name: "ثبت قطعی سند", exact: true })
      .click();
    assert.ok(await page.locator("dialog").count());
    await page.getByRole("button", { name: "بستن", exact: true }).click();
    assert.deepEqual(
      await page.evaluate((id) => {
        const l = Sadra204.ledger;
        return {
          physical: l.balance("stock", null, l.find("documents", id).good),
          remaining: l.remaining(id),
        };
      }, trade.id),
      { physical: "60", remaining: "40" },
    );
    await page.reload();
    await page.waitForFunction(() => !!window.Sadra204);
    assert.equal(
      await page.evaluate((id) => Sadra204.ledger.remaining(id), trade.id),
      "40",
    );
    assert.equal(
      await page.evaluate(
        () => !!localStorage.getItem("kimia-before-update204"),
      ),
      true,
    );
    for (const route of [
      "funds",
      "expense",
      "income",
      "people",
      "goods",
      "tags",
      "units",
      "assets",
      "inventory",
      "accounts",
      "reports",
      "settings",
    ]) {
      await page.evaluate((r) => Sadra204.go(r), route);
      assert.ok(await page.locator("#next204").isVisible());
    }
    await page.evaluate(() => Sadra204.go("reports"));
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "خروجی CSV", exact: true }).click();
    assert.match((await download).suggestedFilename(), /\.csv$/);
    await page
      .getByRole("button", { name: "خروجی Excel", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => Sadra204.go("goods"));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page
      .getByRole("button", { name: "ایجاد مورد جدید", exact: true })
      .click();
    assert.ok(await page.locator("dialog").isVisible());
    assert.ok(
      await page
        .locator("dialog")
        .evaluate((e) => e.getBoundingClientRect().width <= window.innerWidth),
    );
    await page.getByRole("button", { name: "انصراف", exact: true }).click();
    await page.screenshot({ path: "/tmp/sadra204-mobile.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: browser CRUD, XSS escaping, trade, partial delivery, persistent reload, backup snapshot, 12 routes, downloads, mobile dialog, no page errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
