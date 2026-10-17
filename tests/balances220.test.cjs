const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Ledger,fresh,uid,clone}=require('../next-core.js');
const {fixture220}=require('./support/fixture220.cjs');
test('500 million receipt credits the person; payment debits them; prior balance stays separate',()=>{
  const f=fixture220(),{l,person,money,cash}=f;
  l.movement({token:uid(),type:'adjustment',notes:'مانده پیشین',good:money.id,quantity:'10000000',toKind:'people',to:person.id});
  const h=f.post(f.invoice(),money,'500000000');
  const effect=l.accountBalances220('people',person.id,l.entries().filter(e=>e.document===h.rows[0].documentId))[0];
  assert.equal(effect.quantity,'-500000000');assert.equal(l.label220(effect.quantity),'طلبکار');assert.equal(l.accountBalances220('people',person.id)[0].quantity,'-490000000');
  f.post(f.invoice(),money,'100000000','pay');assert.equal(l.accountBalances220('people',person.id)[0].quantity,'-390000000');assert.equal(l.balance('stock',cash.id,money.id),'400000000');
});
test('weighted-count half and full coins share a gram balance at the same material and purity',()=>{
  const f=fixture220();f.post(f.invoice(),f.half,'0','receive',{count:'10'});f.post(f.invoice(),f.full,'0','receive',{count:'5'});
  const groups=f.l.accountBalances220('people',f.person.id);assert.equal(groups.length,1);assert.equal(groups[0].quantity,'-80');assert.equal(groups[0].unit.name,'گرم');assert.equal(groups[0].purity,'750');assert.equal(groups[0].name,'طلا — عیار 750');assert.equal(groups[0].details.length,2);assert.equal(groups[0].count,'-15');
});
test('another form of same-purity gold can settle a weight obligation without a debt to a coin name',()=>{
  const f=fixture220();f.l.movement({type:'opening',token:uid(),good:f.full.id,toKind:'funds',to:f.commodity.id,quantity:'40',count:'5'});
  f.post(f.invoice(),f.half,'0','receive',{count:'10'});f.post(f.invoice(),f.full,'0','pay',{count:'5'});
  assert.equal(f.l.accountBalances220('people',f.person.id)[0].quantity,'0');assert.equal(f.l.aggregate220(f.l.entries().filter(e=>e.bucket==='stock'))[0].quantity,'40');
});
test('grams and kilograms combine exactly, while silver and other purities remain separate',()=>{
  const f=fixture220();f.post(f.invoice(),f.half,'0','receive',{count:'2'});f.post(f.invoice(),f.weighted,'0.05');f.post(f.invoice(),f.silver,'8');f.post(f.invoice(),f.gold900,'3');
  const g=f.l.accountBalances220('people',f.person.id);assert.equal(g.length,3);assert.equal(g.find(x=>x.material==='طلا' && x.purity==='750').quantity,'-58');assert.equal(g.find(x=>x.material==='نقره').quantity,'-8');assert.equal(g.find(x=>x.purity==='900').quantity,'-3');
});
test('pure count goods stay count-based; currencies retain separate denominations',()=>{
  const f=fixture220();f.post(f.invoice(),f.counted,'50');f.post(f.invoice(),f.money,'1250000');f.post(f.invoice(),f.dollar,'42.25');
  const groups=f.l.accountBalances220('people',f.person.id);assert.equal(groups.length,3);const count=groups.find(g=>g.kind==='count');assert.equal(count.quantity,'-50');assert.equal(count.unit.name,'عدد');assert.equal(count.good,f.counted.id);assert.equal(groups.find(g=>g.name==='تومان').quantity,'-1250000');assert.equal(groups.find(g=>g.name==='دلار').quantity,'-42.25');
});
test('physical inventory excludes commitments and person obligations, and keeps actual piece details',()=>{
  const f=fixture220();f.post(f.invoice(),f.half,'0','receive',{count:'3'});f.post(f.invoice(),f.full,'0','receive',{count:'2'});
  f.l.append({token:uid(),type:'installmentOpen'},[{bucket:'commitment',account:f.commodity.id,good:f.full.id,quantity:'1000',purity:'750'}]);
  const stock=f.l.aggregate220(f.l.entries().filter(e=>e.bucket==='stock'));assert.equal(stock.length,1);assert.equal(stock[0].quantity,'28');assert.equal(stock[0].count,'5');assert.equal(stock[0].details.find(d=>d.good===f.half.id).count,'3');assert.equal(f.l.label220(stock[0].quantity,'stock'),'موجودی');
});
test('different people and stock/commitment buckets never merge when reporting individual accounts',()=>{
  const f=fixture220();f.movement(f.half,'8','receive',{count:'2'});f.movement(f.half,'4','receive',{from:f.other.id,count:'1'});
  const groups=f.l.aggregate220(f.l.entries(),true).filter(g=>g.bucket==='person');assert.equal(groups.length,2);assert.equal(groups.find(g=>g.account===f.person.id).quantity,'-8');assert.equal(groups.find(g=>g.account===f.other.id).quantity,'-4');
});
test('edits, row deletion and reversals update the shared summary without reposting other rows',()=>{
  const f=fixture220();let h=f.post(f.invoice(),f.half,'0','receive',{count:'3'});h=f.post(h,f.full,'0','receive',{count:'2'});const second=h.rows[1].documentId;
  h=f.post(h,f.half,'0','receive',{...h.rows[0],count:'2'});assert.equal(h.rows[1].documentId,second);assert.equal(f.l.accountBalances220('people',f.person.id)[0].quantity,'-24');
  h=f.l.deleteInvoiceRow218(h.id,h.rows[0].id,true);assert.equal(f.l.accountBalances220('people',f.person.id)[0].quantity,'-16');f.l.deleteInvoice217(h.id);assert.equal(f.l.accountBalances220('people',f.person.id)[0].quantity,'0');
});
test('unknown material is kept separate until explicitly classified, without rewriting quantities',()=>{
  const f=fixture220();const a=f.l.put('goods',{...f.half,metal:'عیاردار'}),b=f.l.put('goods',{...f.full,metal:'عیاردار'});f.movement(a,'4','receive',{count:'1'});f.movement(b,'8','receive',{count:'1'});assert.equal(f.l.accountBalances220('people',f.person.id).length,2);
  const before=clone(f.l.s.documents);f.l.classifyMaterial220([a.id,b.id],'طلا');assert.equal(f.l.accountBalances220('people',f.person.id).length,1);assert.equal(f.l.accountBalances220('people',f.person.id)[0].quantity,'-12');assert.deepEqual(f.l.s.documents,before);
});
test('payment split over multiple gold lots keeps all physical lot counts and exact aggregate',()=>{
  const f=fixture220();f.post(f.invoice(),f.full,'0','receive',{count:'2'});f.post(f.invoice(),f.full,'0','receive',{count:'3'});f.post(f.invoice(),f.full,'0','pay',{count:'4'});
  assert.equal(f.l.accountBalances220('people',f.person.id)[0].quantity,'-8');const stock=f.l.aggregate220(f.l.entries().filter(e=>e.bucket==='stock'))[0];assert.equal(stock.quantity,'8');assert.equal(stock.count,'1');
});
test('a failed outgoing invoice leaves documents and all grouped balances unchanged',()=>{
  const f=fixture220();f.post(f.invoice(),f.half,'0','receive',{count:'1'});const before=JSON.stringify(f.l.s),summary=f.l.accountBalances220('people',f.person.id);
  assert.throws(()=>f.post(f.invoice(),f.full,'0','pay',{count:'10'}),/موجودی/);assert.equal(JSON.stringify(f.l.s),before);assert.deepEqual(f.l.accountBalances220('people',f.person.id),summary);
});
module.exports={fixture220};
test('bank balance and counterparty receipt/payment reports use the same direction and denomination',()=>{
  const f=fixture220(),bank=f.p('bankInstitutions',{name:'بانک آزمایشی'}),account=f.p('funds',{name:'حساب',legacyKind:'banks',bankId:bank.id,accountNumber:'001',assetId:f.money.assetId,typeId:'currency'});
  let h=f.post(f.invoice(),f.money,'500000000','receive',{partyKind:'banks',partyId:account.id,bankId:bank.id});h=f.post(h,f.money,'100000000','pay',{partyKind:'banks',partyId:account.id,bankId:bank.id});
  assert.equal(f.l.accountBalances220('people',f.person.id)[0].quantity,'-400000000');const balance=f.l.accountBalances220('banks',account.id)[0];assert.equal(balance.quantity,'400000000');assert.equal(balance.unit.name,'تومان');assert.equal(f.l.label220(balance.quantity,balance.bucket),'موجودی');
});
test('monetary commission is a currency balance, never gold weight or physical stock',()=>{
  const f=fixture220(),rial=f.p('units',{name:'ریال',dimension:'currency',currencyCode:'IRR',decimals:0});f.p('assets',{name:'ریال',nature:'currency',unitId:rial.id});
  f.l.s.catalogGoods=[{id:f.full.id,name:f.full.name,groupId:f.goodsGroup.id,catalogMode:'weightCount',catalogUnitId:f.gram.id,catalogPieceUnitId:f.gram.id,catalogPieceWeight:'8',catalogPurity:'750',balanceMaterial220:'طلا',catalogHasFee:'yes',catalogFeeMode:'fixed',catalogFeeBasis:'perPiece',catalogFeeValue:'1000',active:true}];
  f.post(f.invoice(),f.full,'0','receive',{count:'4'});const person=f.l.accountBalances220('people',f.person.id);assert.equal(person.find(g=>g.kind==='weight').quantity,'-32');assert.equal(person.find(g=>g.kind==='currency').quantity,'-4000');assert.equal(f.l.aggregate220(f.l.entries().filter(e=>e.bucket==='stock')).length,1);
});
test('count item purity remains in detail without turning count into a weight claim',()=>{
  const f=fixture220(),coin=f.l.put('goods',{...f.counted,metal:'طلا',purity:'750'});f.post(f.invoice(),coin,'2');const balance=f.l.accountBalances220('people',f.person.id)[0];assert.equal(balance.kind,'count');assert.equal(balance.quantity,'-2');assert.equal(balance.purity,'750');assert.equal(balance.unit.name,'عدد');
});
