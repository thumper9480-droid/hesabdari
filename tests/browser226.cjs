const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(process.env.SADRA_BASE_URL || 'http://127.0.0.1:8015/');await page.waitForFunction(()=>window.Sadra204);
 const {state,ids}=require('./support/fixture224.cjs')();await page.evaluate(state=>{state.revision=Sadra204.ledger.s.revision;state.legacy=Sadra204.ledger.s.legacy;state.legacy.needsReview=false;Sadra204.ledger.s=state;Sadra204.ledger.transaction(()=>{});},state);
 await page.reload();await page.waitForFunction(()=>window.Sadra204);await page.evaluate(()=>Sadra204.go('operations'));
 const before=await page.evaluate(()=>({documents:Sadra204.ledger.s.documents.length,headers:Sadra204.ledger.s.invoiceHeaders214.length})),number=await page.locator('#invoice214-number').inputValue();
 await page.locator('#invoice214-number').press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'invoice214-year');
 assert.deepEqual(await page.evaluate(()=>({documents:Sadra204.ledger.s.documents.length,headers:Sadra204.ledger.s.invoiceHeaders214.length})),before);
 await page.locator('#invoice214-year').press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'invoice214-month');await page.locator('#invoice214-month').press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'invoice214-day');await page.locator('#invoice214-day').press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'invoice214-partyKind');
 await page.locator('#invoice214-number').fill('999999');await page.locator('#invoice214-number').press('Enter');assert.ok((await page.locator('.invoice214-form').innerText()).includes('فاکتوری با این شماره ثبت نشده است'));
 await page.locator('#invoice214-number').fill(number);await page.locator('#invoice214-number').press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'invoice214-year');assert.ok(!(await page.locator('.invoice214-form').innerText()).includes('فاکتوری با این شماره ثبت نشده است'));
 await page.locator('#invoice214-partyKind').selectOption('people');await page.locator('#invoice214-groupId').selectOption(ids.peopleGroup);await page.locator('#invoice214-partyId').fill('مرادی');await page.locator('#invoice214-partyId').press('Enter');await page.locator('#row216-operation').selectOption('receive');await page.locator('#row216-receiptKind').selectOption('currency');await page.locator('#row216-assetId').selectOption(ids.moneyAsset);await page.locator('#row216-partyKind').selectOption('funds');await page.locator('#row216-partyId').selectOption(ids.cash);await page.locator('#row216-amount').fill('1234');await page.locator('#row216-notes').press('Enter');assert.ok((await page.locator('#n-status').innerText()).includes('قطعی ثبت شد'));
 assert.equal(await page.evaluate(()=>Sadra204.ledger.s.documents.length),before.documents+1);
 await page.keyboard.press('F1');await page.locator('#invoice214-number').press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'invoice214-year');
 const existing=await page.evaluate(id=>Sadra204.ledger.s.invoiceHeaders214.find(h=>h.id===id).number,ids.invoice);await page.locator('#invoice214-number').fill(String(existing));await page.locator('#invoice214-number').press('Enter');assert.ok(await page.locator('.invoice218-rowlist').count());assert.ok(await page.locator('#invoice214-year').isDisabled());
 assert.deepEqual(errors,[]);console.log('226 NEW NUMBER ENTER → DATE → PARTY → POST; NO EMPTY DOC; UNKNOWN/EXISTING NUMBERS; F1 OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
