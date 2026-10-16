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
    const context = await b.newContext(),
      p = await context.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    await p.goto("http://127.0.0.1:8001");
    const original = await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("kimia-591-reconstructed"));
      delete s.db.next204;
      s.docs = [
        {
          no: 7,
          date: "1405/07/24",
          head: { kind: "people", id: "1001" },
          rows: [
            {
              op: "buy",
              good: "7001",
              qty: 100,
              purity: 740,
              rate: 100,
              amount: 10000,
              notes: "اصل سند آزمون",
              target: "",
              tag: "",
            },
          ],
          void: false,
        },
      ];
      s.counter = 8;
      const original = JSON.stringify(s);
      localStorage.setItem("kimia-591-reconstructed", original);
      localStorage.removeItem("kimia-before-update204");
      return original;
    });
    await p.addInitScript((original) => {
      localStorage.setItem("kimia-591-reconstructed", original);
      localStorage.removeItem("kimia-before-update204");
    }, original);
    await p.reload();
    await p.waitForFunction(() => !!window.Sadra204);
    assert.equal(
      await p.evaluate(() => localStorage.getItem("kimia-before-update204")),
      original,
    );
    assert.equal(
      await p.evaluate(() => Sadra204.ledger.s.legacy.documents[0].rows[0].qty),
      100,
    );
    await p.evaluate(() => Sadra204.go("operations"));
    assert.ok(
      await p
        .getByRole("button", { name: "ثبت قطعی سند", exact: true })
        .isDisabled(),
    );
    await p
      .getByRole("button", {
        name: "مانده‌ها را بررسی کردم؛ فعال‌سازی ثبت جدید",
        exact: true,
      })
      .click();
    assert.equal(
      await p
        .getByRole("button", { name: "ثبت قطعی سند", exact: true })
        .isDisabled(),
      false,
    );
    const before = await p.evaluate(() => ({
      q: Sadra204.ledger.s.legacy.documents[0].rows[0].qty,
      balance: Sadra204.ledger.balance("person", "1001", "7001"),
    }));
    assert.ok(Number(before.balance) > 98 && Number(before.balance) < 100);
    assert.equal(before.q, 100);
    // The new bank screen preserves institution and account identities from the old version.
    await p.locator("#groupsMenu200 > summary").click();
    await p.locator('#groupsMenu200 button[data-page="banks"]').click();
    assert.equal(
      await p.evaluate(() =>
        document.body.classList.contains("next204-active"),
      ),
      true,
    );
    assert.ok(
      (await p.locator("#next204").innerText()).includes("حساب‌های بانکی"),
    );
    await p.evaluate(() => Sadra204.go("reports"));
    assert.ok(
      (await p.locator("#next204").innerText()).includes("مانده انتقالی"),
    );
    // Preserve state in a complete browser backup and verify a round trip through the actual restore UI.
    const data = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("kimia-591-reconstructed")),
      ),
      count = data.db.next204.documents.length;
    await p.locator('aside button[data-page="backup"]').click();
    const file = p
      .locator('input[type="file"][accept=".json,application/json"]')
      .first();
    await file.setInputFiles({
      name: "roundtrip.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ format: "kimia-accounting-backup", schema: 2, data }),
      ),
    });
    await p.waitForTimeout(150);
    await p.evaluate(() => Sadra204.go("settings"));
    assert.equal(
      await p.evaluate(() => Sadra204.ledger.s.documents.length),
      count,
    );
    assert.equal(
      await p.evaluate(() => Sadra204.ledger.s.legacy.documents[0].rows[0].qty),
      100,
    );
    // Detect stale writes from another tab instead of silently overwriting its changes.
    const other = await context.newPage();
    await other.goto("http://127.0.0.1:8001");
    await p.evaluate(() =>
      Sadra204.ledger.put("locations", { name: "پنجره اول" }),
    );
    const rejected = await other.evaluate(() => {
      try {
        Sadra204.ledger.put("locations", { name: "پنجره دوم با داده قدیمی" });
        return false;
      } catch (e) {
        return e.message.includes("پنجرهٔ دیگری");
      }
    });
    assert.equal(rejected, true);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: exact original snapshot, review gate, historical quantity, new bank UI, backup restore, cross-tab stale-write protection.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
