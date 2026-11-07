import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePortfolio} from '../lib/market/sentinel.js';
import {draftGuideline,simulatePortfolio} from '../lib/guidelines.js';
import {summarizePortfolioCSV} from '../lib/portfolio.js';
const settings={maxPositionPercent:60,maxSectorPercent:80,maxTop5Percent:90,maxCryptoPercent:0,maxBeta:1.15,maxVolatilityPercent:22,maxDrawdownPercent:20,maxPE:35,minHoldings:3,earningsWindowDays:14,maxLossFromCostPercent:20,maxFromHighPercent:30,maxCorrelation:.8};
test('all13 settings, exceptions, exclusions and custom rules evaluate imported holdings',()=>{
 const p=summarizePortfolioCSV('symbol,value,cost_basis\nAAPL,200,250\nMSFT,200,180');
 const g=draftGuideline({...settings,tickerLimits:{AAPL:40},excludedSectors:['Information Technology'],customRules:[{scope:'portfolio',metric:'effN',op:'>=',value:4,severity:'high'}]});
 const a=analyzePortfolio(p,g,undefined,'2026-11-07');
 for(const id of ['position:AAPL','sector:Information Technology','top-five','crypto','beta','volatility','drawdown','holding-count','pe:AAPL','loss:AAPL','high:AAPL','correlation','earnings:AAPL'])assert.ok(a.checks.some(c=>c.id===id),id);
 assert.equal(a.checks.find(c=>c.id==='position:AAPL').status,'breach');assert.equal(a.checks.find(c=>c.id.startsWith('excluded:')).status,'breach');assert.ok(a.checks.some(c=>c.id.startsWith('custom:')&&c.status==='breach'));
 assert.equal(a.history.complete,true);assert.equal(a.history.dates.length,53);assert.equal(a.metrics.effN,2);assert.equal(a.metrics.hhi,.5);assert.ok(Number.isFinite(a.metrics.beta));assert.match(a.history.note,/Not your account returns/);
});
test('uncovered holdings keep history, crypto and pair checks unknown instead of passing',()=>{
 const p=summarizePortfolioCSV('symbol,value\nAAPL,100\nUNKNOWN_SYMBOL,100');const a=analyzePortfolio(p,settings,undefined,'2099-01-01');
 assert.equal(a.history.complete,false);assert.equal(a.metrics.beta,null);assert.equal(a.metrics.crypto,null);assert.equal(a.checks.find(c=>c.id==='correlation').status,'unknown');assert.equal(a.checks.find(c=>c.id==='earnings:AAPL').status,'unknown');assert.deepEqual(a.history.portfolio,[]);
 const zero=summarizePortfolioCSV('symbol,value\nAAPL,100\nUNKNOWN_SYMBOL,0');assert.equal(analyzePortfolio(zero,settings).history.complete,true);
});
test('what-if checks all rules while leaving imported values and cost data unchanged',()=>{
 const p={...summarizePortfolioCSV('symbol,value,cost_basis,sector\nAAPL,900,800,Information Technology\nMSFT,100,80,Information Technology'),snapshotId:'baseline'};const before=JSON.stringify(p);
 const result=simulatePortfolio(p,{...settings,version:1});assert.equal(JSON.stringify(p),before);assert.equal(result.reconciliation.difference,'0.00');assert.ok(result.advancedAfter.checks.some(c=>c.id==='volatility'));assert.ok(result.advancedAfter.checks.some(c=>c.id==='loss:AAPL'&&c.status==='unknown'));assert.ok(result.advancedAfter.breaches.some(c=>c.id==='holding-count'));
});
