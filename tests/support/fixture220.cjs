const {Ledger,fresh,uid}=require('../../next-core.js');
function fixture220(){
  const l=new Ledger(fresh()),p=(kind,x)=>l.put(kind,{active:true,...x});
  const gram=p('units',{name:'گرم',dimension:'weight',factor:'1',decimals:8}),kg=p('units',{name:'کیلوگرم',dimension:'weight',factor:'1000',decimals:8}),number=p('units',{name:'عدد',dimension:'count',decimals:0}),toman=p('units',{name:'تومان',dimension:'currency',currencyCode:'IRT',decimals:0}),usd=p('units',{name:'دلار',dimension:'currency',currencyCode:'USD',decimals:2});
  const group=p('peopleGroups',{name:'بازار'}),person=p('people',{name:'مرادی',groupId:group.id}),other=p('people',{name:'شخص دیگر',groupId:group.id}),goodsGroup=p('groups',{name:'سکه‌ها'});
  const commodity=p('funds',{name:'صندوق کالا',typeId:'commodity'}),cash=p('funds',{name:'صندوق ارز',typeId:'currency'});
  function good(name,mode,unit,extra={}){const asset=p('assets',{name,nature:mode==='currency'?'currency':'commodity',unitId:unit.id});return p('goods',{name,assetId:asset.id,mode,unitId:unit.id,rateUnitId:unit.id,groupId:goodsGroup.id,feeMode:'none',...extra});}
  const half=good('نیم غیره','weight',gram,{metal:'طلا',purity:'750',standardWeight:'4',standardWeightUnitId:gram.id}),full=good('تمام غیره','weight',gram,{metal:'طلا',purity:'750',standardWeight:'8',standardWeightUnitId:gram.id}),weighted=good('طلای وزنی','weight',kg,{metal:'طلا',purity:'750'}),silver=good('نقره','weight',gram,{metal:'نقره',purity:'750'}),gold900=good('طلای 900','weight',gram,{metal:'طلا',purity:'900'}),counted=good('سکه بانکی','count',number),money=good('تومان','currency',toman),dollar=good('دلار','currency',usd);
  const date=new Date().toISOString().slice(0,10),parts=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}).formatToParts(new Date(date+'T12:00:00Z')),jalali=['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('/');
  function invoice(){return {id:null,number:l.peekInvoiceNumber219(),jalali,partyKind:'people',partyId:person.id,groupId:group.id};}
  function post(header,g,quantity,operation='receive',extra={}){return l.postInvoiceRow219(header,{operation,receiptKind:g.mode==='currency'?'currency':'commodity',assetId:g.assetId,good:g.id,goodsGroup:goodsGroup.id,unitId:g.unitId,amount:quantity,partyKind:'funds',partyId:g.mode==='currency'?cash.id:commodity.id,...extra},date,true);}
  function movement(g,q,type='receive',extra={}){return l.movement({token:uid(),type,good:g.id,quantity:q,from:person.id,fromKind:'people',to:commodity.id,toKind:'funds',catalogInvoice217:true,...extra});}
  return {l,p,gram,kg,number,group,person,other,goodsGroup,commodity,cash,half,full,weighted,silver,gold900,counted,money,dollar,date,jalali,invoice,post,movement};
}
module.exports={fixture220};
