import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='mock';process.env.MARKET_LIVE='0';
const {summarizePortfolioCSV}=await import('../lib/portfolio.js');
const {createServer}=await import('../server.js');

test('broker exports preserve fractional shares and total cost while reconciling imported values',()=>{
 const p=summarizePortfolioCSV('Symbol,Quantity,Price,Average Cost,Sector\naapl,0.125,123.456,100,Technology\nAAPL,1.5,100.01,90,Technology');
 assert.equal(p.marketValue,'165.45');assert.equal(p.securities.length,1);
 assert.deepEqual(p.positions,[{symbol:'AAPL',marketValue:'165.45',quantity:1.625,costBasis:'147.50',sector:'Technology',importPrice:null}]);
 const explicit=summarizePortfolioCSV('Ticker,Market Value,Qty,Cost Basis\nNVDA,100.01,2,80');
 assert.equal(explicit.positions[0].costBasis,'80.00');assert.equal(explicit.marketValue,'100.01');
});

test('unknown quantities, sectors and costs stay unknown and prices are never invented',()=>{
 const p=summarizePortfolioCSV('symbol,value,quantity,cost_basis,sector\nAAPL,100,2,50,Technology\nAAPL,10,,,');
 assert.equal(p.positions[0].quantity,null);assert.equal(p.positions[0].costBasis,null);assert.equal(p.positions[0].sector,null);
 for(const csv of ['symbol,quantity\nAAPL,2','symbol,quantity,price\nAAPL,-2,10','symbol,value,quantity\nAAPL,10,NaN'])assert.throws(()=>summarizePortfolioCSV(csv));
});

test('a new real CSV import replaces the dashboard baseline, checks and snapshot identity',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json','X-Session-Id':'real-import-dashboard-test-01'};
 const req=async(path,body)=>{const r=await fetch(base+path,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);return r.json();};
 try{
  const draft=await req('/api/portfolio/guidelines/draft',{maxPositionPercent:60});
  await req('/api/portfolio/guidelines/save',{draftId:draft.id,userConfirmation:true});
  const first=await req('/api/portfolio/upload',{csv:'symbol,value\nAAPL,90\nMSFT,10'});
  assert.equal((await req('/api/workspace')).review.breaches.length,1);
  const second=await req('/api/portfolio/upload',{csv:'symbol,quantity,price\nAAPL,5,10\nMSFT,5,10'});
  const dashboard=await req('/api/workspace');
  assert.notEqual(first.snapshotId,second.snapshotId);assert.equal(dashboard.review.snapshotId,second.snapshotId);
  assert.equal(dashboard.review.marketValue,'100.00');assert.equal(dashboard.review.breaches.length,0);
  assert.equal(dashboard.profile.portfolio.positions[0].quantity,5);
 }finally{await new Promise(r=>server.close(r));}
});
