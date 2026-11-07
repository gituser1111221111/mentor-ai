// User-approved concentration guidelines. Imported values are not live prices.
import {randomUUID} from 'node:crypto';
import {minor,amount} from './finance.js';

export function draftGuideline({maxPositionPercent}={}) {
  if(typeof maxPositionPercent !== 'number' || !Number.isFinite(maxPositionPercent) || maxPositionPercent < 1 || maxPositionPercent > 100 || !/^\d+(\.\d{1,2})?$/.test(String(maxPositionPercent))) throw Error('Position limit must be a number from 1 to 100 with at most two decimal places.');
  return {id:randomUUID(),maxPositionPercent,createdAt:new Date().toISOString(),rationale:'Your chosen maximum share of imported portfolio value in any single security, excluding cash.',scope:'Single-security concentration only. This is a review trigger, not a trading instruction or loss limit.'};
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
  const coverage={valuation:parsed?'Imported market values':'Unknown',priceFreshness:portfolio?.asOf || 'Unknown; upload time is not a price timestamp',importedAt:portfolio?.importedAt || null,scope:'Single-security concentration of imported holdings only; fund look-through, fees, tax lots, sectors and historical risk are not evaluated.'};
  const base={snapshotId:portfolio?.snapshotId || null,guidelineVersion:guideline?.version || null,asOf:portfolio?.asOf || null,coverage,marketValue:parsed?amount(parsed.total):null,source:portfolio?.source || null};
  if(!parsed || !guideline) return {...base,checks:[{id:'position-concentration',status:'unknown',reason:!parsed?'Import holdings with positive, reconciled market values.':'Save a guideline before evaluating concentration.'}],breaches:[],unknownChecks:['position-concentration']};
  const bps=BigInt(Math.round(guideline.maxPositionPercent*100));
  const checks=parsed.rows.filter(r=>!cash(r.name)).map(r=>({id:'position:'+r.name,symbol:r.name,value:amount(r.value),percent:Number(r.value*10000n/parsed.total)/100,limitPercent:guideline.maxPositionPercent,status:r.value*10000n > parsed.total*bps?'breach':'pass',calculation:'Imported security value / total imported market value; exact cents used for threshold comparison.'}));
  return {...base,checks,breaches:checks.filter(c=>c.status==='breach'),unknownChecks:[],note:'Checks describe the imported values, not current market exposure. Unknown price freshness remains visible.'};
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
  const scenario={...portfolio,securities};
  const afterTotal=securities.reduce((n,r)=>n+minor(r.value),0n);
  if(afterTotal!==parsed.total)throw Error('Scenario cash reconciliation failed.');
  return {scenarioId:randomUUID(),snapshotId:portfolio.snapshotId,guidelineVersion:guideline.version,simulation:true,baselineUnchanged:true,before:reviewPortfolio(portfolio,guideline),after:reviewPortfolio(scenario,guideline),changes,cashAdded:amount(addedCash),reconciliation:{before:amount(parsed.total),after:amount(afterTotal),difference:'0.00'},note:'Mechanical value-only trim-to-cash illustration. No trades, quantities, taxes or transaction costs are modeled. Other constraints are not evaluated.'};
}
