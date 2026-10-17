const {fixture220}=require('./fixture220.cjs');
module.exports=()=>{
 const f=fixture220();f.l.setup221();
 const tag=f.p('tags',{name:'تجارت',color:'#337755'}),bank=f.p('bankInstitutions',{name:'بانک آزمایشی'}),a=f.p('funds',{name:'حساب اول',typeId:'currency',legacyKind:'banks',bankId:bank.id,accountNumber:'111',assetId:f.money.assetId}),b=f.p('funds',{name:'حساب دوم',typeId:'currency',legacyKind:'banks',bankId:bank.id,accountNumber:'222',assetId:f.money.assetId});
 const expenseGroup=f.p('expenseGroups',{name:'خانه'}),expense=f.p('expenses',{name:'تاکسی',groupId:expenseGroup.id}),income=f.p('incomes',{name:'برنامه نویسی'});
 f.l.s.catalogGoods=[{id:f.full.id,name:f.full.name,groupId:f.goodsGroup.id,catalogMode:'weightCount',catalogUnitId:f.gram.id,catalogRateUnitId:f.gram.id,catalogPieceUnitId:f.gram.id,catalogPieceWeight:'8',catalogPurity:'750',balanceMaterial220:'طلا',materialId:f.l.s.goods.find(g=>g.id===f.full.id).materialId,catalogHasFee:'yes',catalogFeeMode:'variable',catalogFeeBasis:'perPiece',feeCurrency221:'IRT',active:true}];
 let h=f.post(f.invoice(),f.money,'1000','receive',{tags:[tag.id]});h=f.post(h,f.full,'0','receive',{count:'2',feeValue:'100',tags:[tag.id]});h=f.post(h,f.counted,'3');h=f.post(h,f.gold900,'0.01','receive',{unitId:f.kg.id});
 h=f.post(h,f.money,'2000','receive',{...h.rows[0],amount:'2000'});h=f.l.deleteInvoiceRow218(h.id,h.rows[2].id,true);
 const melted=f.l.put('goods',{...f.gold900,id:undefined,name:'آبشدهٔ انگ‌دار',purity:'',standardWeight:'',variablePurity221:true});f.post(f.invoice(),melted,'30','receive',{purity:'740',mark:'A123',assay:'ری‌گیری الف'});
 f.post(f.invoice(),f.silver,'5');f.post(f.invoice(),f.dollar,'20');f.post(f.invoice(),f.counted,'4');
 const removed=f.post({...f.invoice(),partyId:f.other.id},f.counted,'2');f.l.deleteInvoice217(removed.id);
 return {state:f.l.s,ids:{person:f.person.id,other:f.other.id,peopleGroup:f.group.id,goodsGroup:f.goodsGroup.id,half:f.half.id,full:f.full.id,gold900:f.gold900.id,melted:melted.id,moneyAsset:f.money.assetId,dollarAsset:f.dollar.assetId,commodity:f.commodity.id,cash:f.cash.id,bank:bank.id,a:a.id,b:b.id,invoice:h.id,tag:tag.id,expense:expense.id,expenseGroup:expenseGroup.id,income:income.id}};
};
