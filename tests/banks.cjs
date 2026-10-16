const assert = require("node:assert/strict");
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
    const p = await b.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:8001");
    await p.evaluate(() => Sadra204.go("banks"));
    const root = p.locator("#next204");
    await root.getByRole("button", { name: "بانک‌ها", exact: true }).click();
    await root
      .getByRole("button", { name: "ایجاد مورد جدید", exact: true })
      .click();
    await p.locator("#n-name").fill("بانک آزمون");
    await p.getByRole("button", { name: "ذخیره", exact: true }).click();
    await root
      .locator("tr")
      .filter({ hasText: "بانک آزمون" })
      .getByRole("button", { name: "مشاهده حساب‌ها", exact: true })
      .click();
    await root
      .getByRole("button", { name: "ایجاد مورد جدید", exact: true })
      .click();
    await p.locator("#n-accountNumber").fill("۰۰۱۲۳۴۵۶۷۸۹");
    const ids = await p.evaluate(() => ({
      asset: Sadra204.ledger.s.assets.find((a) => a.name === "تومان").id,
      money: Sadra204.ledger.s.goods.find((g) => g.name === "تومان").id,
    }));
    await p.locator("#n-assetId").selectOption(ids.asset);
    await p.getByRole("button", { name: "ذخیره", exact: true }).click();
    assert.equal(await p.locator("dialog").count(), 0);
    const id = await p.evaluate(
      () =>
        Sadra204.ledger.s.funds.find((f) => f.accountNumber === "۰۰۱۲۳۴۵۶۷۸۹")
          .id,
    );
    await p.evaluate(
      ({ id, money }) =>
        Sadra204.ledger.movement({
          type: "opening",
          good: money,
          to: id,
          toKind: "banks",
          quantity: "1000",
          token: crypto.randomUUID(),
        }),
      { id, money: ids.money },
    );
    await p.evaluate(() => Sadra204.go("banks"));
    let row = root.locator("tr").filter({ hasText: "۰۰۱۲۳۴۵۶۷۸۹" });
    assert.equal(
      await row.getByRole("button", { name: "حذف", exact: true }).isDisabled(),
      true,
    );
    await row.getByRole("button", { name: "ویرایش", exact: true }).click();
    await p.locator("#n-accountNumber").fill("00123456788");
    await p.getByRole("button", { name: "ذخیره", exact: true }).click();
    assert.equal(
      await p.evaluate(
        ({ id, money }) => Sadra204.ledger.balance("stock", id, money),
        { id, money: ids.money },
      ),
      "1000",
    );
    row = root.locator("tr").filter({ hasText: "00123456788" });
    await row
      .getByRole("button", { name: "غیرفعال‌سازی", exact: true })
      .click();
    assert.equal(
      await row.getByRole("button", { name: "حذف", exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await p.evaluate((id) => Sadra204.ledger.find("funds", id).active, id),
      false,
    );
    await p.reload();
    await p.waitForFunction(() => !!window.Sadra204);
    assert.equal(
      await p.evaluate(
        ({ id, money }) => Sadra204.ledger.balance("stock", id, money),
        { id, money: ids.money },
      ),
      "1000",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: bank creation, currency account, account number editing, deposit preservation, deletion disabled after posting, deactivation, reload.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
