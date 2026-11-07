// User-approved concentration guidelines. Imported values are not live prices.
import {randomUUID} from 'node:crypto';
import {minor,amount} from './finance.js';

export function draftGuideline({maxPositionPercent,maxSectorPercent,maxTop5Percent,minHoldings,earningsWindowDays}={}) {
  if(typeof maxPositionPercent !== 'number' || !Number.isFinite(maxPositionPercent) || maxPositionPercent < 1 || maxPositionPercent > 100 || !/^\d+(\.\d{1,2})?$/.test(String(maxPositionPercent))) throw Error('Position limit must be a number from 1 to 100 with at most two decimal places.');
  const optional={};
  for(const [key,value,max,integer] of [['maxSectorPercent',maxSectorPercent,100,false],['maxTop5Percent',maxTop5Percent,100,false],['minHoldings',minHoldings,2000,true],['earningsWindowDays',earningsWindowDays,365,true]]) {
    if(value===undefined||value===null)continue;
    if(typeof value!=='number'||!Number.isFinite(value)||value<1||value>max||(integer?!Number.isInteger(value):!/^\d+(\.\d{1,2})?$/.test(String(value))))throw Error('Invalid '+key+'.');
    optional[key]=value;
  }
  return {id:randomUUID(),maxPositionPercent,...optional,createdAt:new Date().toISOString(),rationale:'Your chosen maximum share of imported portfolio value in any single security, excluding cash.',scope:'Only the values you review and approve become guidelines. Review triggers do not place trades or cap losses.'};
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
  const bps=BigInt(Math.round(guideline.maxPositionPercent*100));
  const checks=parsed.rows.filter(r=>!cash(r.name)).map(r=>({id:'position:'+r.name,symbol:r.name,value:amount(r.value),percent:Number(r.value*10000n/parsed.total)/100,limitPercent:guideline.maxPositionPercent,status:r.value*10000n > parsed.total*bps?'breach':'pass',calculation:'Imported security value / total imported market value; exact cents used for threshold comparison.'}));
  const active=parsed.rows.filter(r=>!cash(r.name)&&r.value>0n);
  if(guideline.maxTop5Percent!=null){const top=active.slice().sort((a,b)=>a.value>b.value?-1:1).slice(0,5).reduce((sum,r)=>sum+r.value,0n);checks.push({id:'top-five',symbol:'Top five holdings',percent:Number(top*10000n/parsed.total)/100,limitPercent:guideline.maxTop5Percent,status:top*10000n>parsed.total*BigInt(Math.round(guideline.maxTop5Percent*100))?'breach':'pass'});}
  if(guideline.minHoldings!=null)checks.push({id:'holding-count',symbol:'Distinct non-cash holdings',observed:active.length,minimum:guideline.minHoldings,status:active.length<guideline.minHoldings?'breach':'pass'});
  if(guideline.maxSectorPercent!=null){
    const sectors=portfolio?.sectors||[];let valid=false;
    try{valid=sectors.length>0&&!sectors.some(r=>!r.name||/^unknown$/i.test(r.name))&&sectors.reduce((sum,r)=>sum+minor(r.value),0n)===parsed.total;}catch{}
    if(!valid)checks.push({id:'sector-coverage',status:'unknown',reason:'Sector mapping is missing or incomplete; sector limits cannot be verified.'});
    else for(const r of sectors.filter(r=>!cash(r.name))){const value=minor(r.value);checks.push({id:'sector:'+r.name,symbol:r.name+' sector',percent:Number(value*10000n/parsed.total)/100,limitPercent:guideline.maxSectorPercent,status:value*10000n>parsed.total*BigInt(Math.round(guideline.maxSectorPercent*100))?'breach':'pass'});}
  }
  return {...base,checks,breaches:checks.filter(c=>c.status==='breach'),unknownChecks:checks.filter(c=>c.status==='unknown').map(c=>c.id),note:'Checks describe the imported values, not current market exposure. Unknown price freshness remains visible.'};
}
export function simulatePortfolio(portfolio,guideline) {
  const parsed=positions(portfolio);
  if(!parsed || !guideline) throw Error('Import valued holdings and save a guideline before simulating.');
  const cap=parsed.total*BigInt(Math.round(guideline.maxPositionPercent*100))/10000n;
  let addedCash=0n;const changes=[];
  const securities=parsed.rows.map(r=>{
    const trim=!cash(r.name)&&r.value>cap?r.value-cap:0n;addedCash+=trim;
    if(trim)changes.push({symbol:r.name,trimValue:amount(trim),remainingValue:amount(r.value-trim)});
    return {name:r.name,value:amount(r.value-trim)};
  });
  const existingCash=securities.find(r=>cash(r.name));
  if(existingCash)existingCash.value=amount(minor(existingCash.value)+addedCash);else securities.push({name:'CASH',value:amount(addedCash)});
  const scenario={...portfolio,securities,sectors:[]};
  const afterTotal=securities.reduce((n,r)=>n+minor(r.value),0n);
  if(afterTotal!==parsed.total)throw Error('Scenario cash reconciliation failed.');
  return {scenarioId:randomUUID(),snapshotId:portfolio.snapshotId,guidelineVersion:guideline.version,simulation:true,baselineUnchanged:true,before:reviewPortfolio(portfolio,guideline),after:reviewPortfolio(scenario,guideline),changes,cashAdded:amount(addedCash),reconciliation:{before:amount(parsed.total),after:amount(afterTotal),difference:'0.00'},note:'Mechanical value-only trim-to-cash illustration. No trades, quantities, taxes or transaction costs are modeled. Top-five and holding-count rules are rechecked if saved. Sector results are unknown because the import does not map each security to a sector after the scenario. Remaining breaches and unknowns must be reviewed.'};
}
