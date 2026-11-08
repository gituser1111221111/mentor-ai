// User-approved concentration guidelines. Imported values are not live prices.
import {randomUUID} from 'node:crypto';
import {minor,amount} from './finance.js';
import {analyzePortfolio} from './market/sentinel.js';

export function draftGuideline(input={}) {
  const {maxPositionPercent}=input;
  if(typeof maxPositionPercent !== 'number' || !Number.isFinite(maxPositionPercent) || maxPositionPercent < 1 || maxPositionPercent > 100 || !/^\d+(\.\d{1,2})?$/.test(String(maxPositionPercent))) throw Error('Position limit must be a number from 1 to 100 with at most two decimal places.');
  const optional={};
  for(const [key,min,max,integer] of [['maxSectorPercent',1,100,false],['maxTop5Percent',1,100,false],['minHoldings',1,2000,true],['earningsWindowDays',1,365,true],['maxCryptoPercent',0,100,false],['maxBeta',0,10,false],['maxVolatilityPercent',0,1000,false],['maxDrawdownPercent',0,100,false],['maxPE',0,10000,false],['maxLossFromCostPercent',0,100,false],['maxFromHighPercent',0,100,false],['maxCorrelation',0,1,false]]) {
    const value=input[key];if(value===undefined||value===null)continue;
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer?!Number.isInteger(value):!/^\d+(\.\d{1,2})?$/.test(String(value))))throw Error('Invalid '+key+'.');
    optional[key]=value;
  }
  for(const [key,ticker]of [['tickerLimits',true],['sectorLimits',false]])if(input[key]!=null){
    const object=input[key];if(typeof object!=='object'||Array.isArray(object)||Object.keys(object).length>100)throw Error('Invalid '+key+'.');
    optional[key]=Object.fromEntries(Object.entries(object).map(([name,value])=>{const label=name.trim();if(!label||label.length>60||['__proto__','constructor','prototype'].includes(label)||ticker&&!/^[A-Za-z0-9.^_-]{1,20}$/.test(label)||typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)throw Error('Invalid '+key+' override.');return [ticker?label.toUpperCase():label,value];}));
  }
  if(input.excludedSectors!=null){if(!Array.isArray(input.excludedSectors)||input.excludedSectors.length>40||input.excludedSectors.some(s=>typeof s!=='string'||!s.trim()||s.length>60))throw Error('Invalid excluded sectors.');optional.excludedSectors=[...new Set(input.excludedSectors.map(s=>s.trim()))];}
  if(input.customRules!=null){
    const portfolio=['beta','vol','maxDD','ret1y','excess','sharpe','wPE','divYield','top5','effN','sectorsCount','cash'];const holding=['weight','pe','ret1y','vol','beta','plPct','fromHigh','upside','buyPct','divYield'];
    if(!Array.isArray(input.customRules)||input.customRules.length>30)throw Error('Use at most 30 custom rules.');
    optional.customRules=input.customRules.map(r=>{if(!r||!['portfolio','holding'].includes(r.scope)||!(r.scope==='portfolio'?portfolio:holding).includes(r.metric)||!['<=','>='].includes(r.op)||typeof r.value!=='number'||!Number.isFinite(r.value)||Math.abs(r.value)>1000000||!['high','med','info'].includes(r.severity||r.sev||'info'))throw Error('Invalid custom rule.');return {id:randomUUID(),scope:r.scope,metric:r.metric,op:r.op,value:r.value,severity:r.severity||r.sev||'info'};});
  }
  return {id:randomUUID(),maxPositionPercent,...optional,createdAt:new Date().toISOString(),rationale:'Your chosen review parameters; blank metrics remain unevaluated.',scope:'Only values you review and approve become guidelines. Review triggers do not place trades or cap losses.'};
}
export function saveGuideline(state,{draftId,userConfirmation}={}) {
  if(userConfirmation !== true) throw Error('Explicit approval is required to save a guideline.');
  const draft=state?.drafts?.find(d=>d.id===draftId);
  if(!draft) throw Error('Draft not found in this session.');
  return {...draft,version:(state.effective?.version||0)+1,approvedAt:new Date().toISOString(),userApproved:true};
}
const cash = name => /^(CASH|USD|US DOLLAR)$/i.test(name);
function positions(portfolio) {
  if(!portfolio?.securities?.length) return null;
  try {
    const grouped=new Map();
    for(const r of portfolio.securities) {
      const name=String(r.name || '').trim().toUpperCase();
      if(!name) return null;
      grouped.set(name,(grouped.get(name)||0n)+minor(r.value));
    }
    const rows=[...grouped].map(([name,value])=>({name,value}));
    const total=rows.reduce((n,r)=>n+r.value,0n);
    if(total !== minor(portfolio.marketValue) || total <= 0n) return null;
    return {rows,total};
  } catch {return null;}
}
export function reviewPortfolio(portfolio,guideline) {
  const parsed=positions(portfolio);
  const coverage={valuation:parsed?'Imported market values':'Unknown',priceFreshness:portfolio?.asOf || 'Unknown; upload time is not a price timestamp',importedAt:portfolio?.importedAt || null,scope:'Based on imported values; no fund look-through, tax lots, forecasts or historical-risk analysis. Unknown sector coverage stays unknown.'};
  const base={snapshotId:portfolio?.snapshotId || null,guidelineVersion:guideline?.version || null,asOf:portfolio?.asOf || null,coverage,marketValue:parsed?amount(parsed.total):null,source:portfolio?.source || null};
  if(!parsed || !guideline) return {...base,checks:[{id:'position-concentration',status:'unknown',reason:!parsed?'Import holdings with positive, reconciled market values.':'Save a guideline before evaluating concentration.'}],breaches:[],unknownChecks:['position-concentration']};
  const positionLimit=name=>guideline.tickerLimits?.[name]??guideline.maxPositionPercent;
  const checks=parsed.rows.filter(r=>!cash(r.name)).map(r=>({id:'position:'+r.name,symbol:r.name,value:amount(r.value),percent:Number(r.value*10000n/parsed.total)/100,limitPercent:positionLimit(r.name),status:r.value*10000n > parsed.total*BigInt(Math.round(positionLimit(r.name)*100))?'breach':'pass',calculation:'Imported security value / total imported market value; exact cents used for threshold comparison.'}));
  const active=parsed.rows.filter(r=>!cash(r.name)&&r.value>0n);
  if(guideline.maxTop5Percent!=null){const top=active.slice().sort((a,b)=>a.value>b.value?-1:1).slice(0,5).reduce((sum,r)=>sum+r.value,0n);checks.push({id:'top-five',symbol:'Top five holdings',percent:Number(top*10000n/parsed.total)/100,limitPercent:guideline.maxTop5Percent,status:top*10000n>parsed.total*BigInt(Math.round(guideline.maxTop5Percent*100))?'breach':'pass'});}
  if(guideline.minHoldings!=null)checks.push({id:'holding-count',symbol:'Distinct non-cash holdings',observed:active.length,minimum:guideline.minHoldings,status:active.length<guideline.minHoldings?'breach':'pass'});
  if(guideline.maxSectorPercent!=null){
    const sectors=portfolio?.sectors||[];let valid=false;
    try{valid=sectors.length>0&&!sectors.some(r=>!r.name||/^unknown$/i.test(r.name))&&sectors.reduce((sum,r)=>sum+minor(r.value),0n)===parsed.total;}catch{}
    if(!valid)checks.push({id:'sector-coverage',status:'unknown',reason:'Sector mapping is missing or incomplete; sector limits cannot be verified.'});
    else for(const r of sectors.filter(r=>!cash(r.name))){const value=minor(r.value);checks.push({id:'sector:'+r.name,symbol:r.name+' sector',percent:Number(value*10000n/parsed.total)/100,limitPercent:guideline.sectorLimits?.[r.name]??guideline.maxSectorPercent,status:value*10000n>parsed.total*BigInt(Math.round((guideline.sectorLimits?.[r.name]??guideline.maxSectorPercent)*100))?'breach':'pass'});}
  }
  return {...base,checks,breaches:checks.filter(c=>c.status==='breach'),unknownChecks:checks.filter(c=>c.status==='unknown').map(c=>c.id),note:'Checks describe the imported values, not current market exposure. Unknown price freshness remains visible.'};
}
export function simulatePortfolio(portfolio,guideline) {
  const parsed=positions(portfolio);
  if(!parsed || !guideline) throw Error('Import valued holdings and save a guideline before simulating.');
  const cap=parsed.total*BigInt(Math.round(guideline.maxPositionPercent*100))/10000n;
  let addedCash=0n;const changes=[];
  const securities=parsed.rows.map(r=>{
    const positionCap=parsed.total*BigInt(Math.round((guideline.tickerLimits?.[r.name]??guideline.maxPositionPercent)*100))/10000n;
    const trim=!cash(r.name)&&r.value>positionCap?r.value-positionCap:0n;addedCash+=trim;
    if(trim)changes.push({symbol:r.name,trimValue:amount(trim),remainingValue:amount(r.value-trim)});
    return {name:r.name,value:amount(r.value-trim)};
  });
  const existingCash=securities.find(r=>cash(r.name));
  if(existingCash)existingCash.value=amount(minor(existingCash.value)+addedCash);else securities.push({name:'CASH',value:amount(addedCash)});
  const scenarioPositions=securities.map(r=>{const prior=(portfolio.positions||[]).find(p=>p.symbol===r.name);return {symbol:r.name,marketValue:r.value,sector:prior?.sector??null,quantity:null,costBasis:changes.some(c=>c.symbol===r.name)?null:prior?.costBasis??null};});
  const scenario={...portfolio,securities,sectors:[],positions:scenarioPositions};
  const afterTotal=securities.reduce((n,r)=>n+minor(r.value),0n);
  if(afterTotal!==parsed.total)throw Error('Scenario cash reconciliation failed.');
  return {advancedBefore:analyzePortfolio(portfolio,guideline),advancedAfter:analyzePortfolio(scenario,guideline),scenarioId:randomUUID(),snapshotId:portfolio.snapshotId,guidelineVersion:guideline.version,simulation:true,baselineUnchanged:true,before:reviewPortfolio(portfolio,guideline),after:reviewPortfolio(scenario,guideline),changes,cashAdded:amount(addedCash),reconciliation:{before:amount(parsed.total),after:amount(afterTotal),difference:'0.00'},note:'Mechanical value-only trim-to-cash illustration. No trades, quantities, taxes or transaction costs are modeled. Top-five and holding-count rules are rechecked if saved. Imported-value sector checks require reconciled sector totals; the separate full review uses preserved import classifications or dated market mappings. Cost-based checks for trimmed positions remain unknown because tax lots are not modeled. Remaining breaches and unknowns must be reviewed.'};
}
