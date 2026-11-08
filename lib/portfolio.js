// Brokerage CSV export -> portfolioSummary() rows. No brokerage login, no credentials.
import {parseCSV} from './csv.js';
import {portfolioSummary,minor,amount,divideRound} from './finance.js';

const pick = (row, names) => { const entries=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.trim().toLowerCase().replace(/[ _-]+/g,''),v]));for(const n of names){const v=entries[n.toLowerCase().replace(/[ _-]+/g,'')];if(v!==undefined&&String(v).trim()!=='')return v;} };
const numeric = value => String(value??'').replace(/[$,\s]/g,'');
function decimal(value,label){const text=numeric(value);if(!/^\d+(\.\d{1,8})?$/.test(text)||text.length>24)throw Error(`Invalid ${label}; use a non-negative decimal with up to eight decimal places.`);const [whole,fraction='']=text.split('.');return {text,units:BigInt(whole+fraction),scale:10n**BigInt(fraction.length)};}
function product(a,b){return amount(divideRound(a.units*b.units*100n,a.scale*b.scale));}

// Accepts either the starter-kit holdings format or a simple export:
// symbol|security|security_id, sector?, market_value_usd|market_value|value, annual_fee_bps?
export function summarizePortfolioCSV(csv, {accountId} = {}) {
  if (typeof csv !== 'string' || csv.length > 500_000) throw Error('Upload a CSV under 500 KB');
  let rows = parseCSV(csv, {maxRows: 2000});
  if (accountId) rows = rows.filter(r => r.account_id === accountId);
  if (!rows.length) throw Error('No holdings found in the CSV');
  const positionRows=[];
  const holdings = rows.map((r, i) => {
    let value = numeric(pick(r, ['market_value_usd', 'market_value', 'value', 'current_value']));
    const security = pick(r, ['security_id', 'symbol', 'Symbol', 'security', 'ticker']);
    const quantityRaw=pick(r,['quantity','qty','shares']),priceRaw=pick(r,['price','current_price','last_price','unit_price']);
    const quantity=quantityRaw==null?null:decimal(quantityRaw,'quantity');
    const price=priceRaw==null?null:decimal(priceRaw,'price');
    if(!value&&quantity&&price)value=product(quantity,price);
    if (!security || !value) throw Error(`Row ${i + 2}: need a symbol and a market value, or quantity plus price. Prices are not guessed.`);
    const symbol=String(security).trim().toUpperCase().replace(/-USD$/,'');
    if(!symbol||symbol.length>20)throw Error(`Row ${i+2}: use a symbol of 1 to 20 characters.`);
    const sector=String(pick(r,['sector'])??'Unknown').trim().slice(0,40)||'Unknown';
    const costRaw=pick(r,['cost_basis','total_cost','total_cost_basis','cost_basis_total']);
    const unitCostRaw=pick(r,['average_cost','avg_cost','average_price','cost_per_share','unit_cost','purchase_price','cost']);
    let costBasis=costRaw==null?null:amount(minor(numeric(costRaw)));
    if(costBasis===null&&unitCostRaw!=null&&quantity)costBasis=product(quantity,decimal(unitCostRaw,'cost per share'));
    positionRows.push({symbol,marketValue:amount(minor(value)),quantity:quantity?Number(quantity.text):null,costBasis,sector:sector==='Unknown'?null:sector,importPrice:price?Number(price.text):null});
    return {
      security_id: symbol, sector,
      currency: String(pick(r, ['currency']) ?? 'USD').toUpperCase(),
      market_value_usd: value, annual_fee_bps: String(pick(r, ['annual_fee_bps', 'fee_bps']) ?? '0'),
    };
  });
  const grouped=new Map();for(const row of positionRows){const prev=grouped.get(row.symbol);if(!prev){grouped.set(row.symbol,{...row});continue;}prev.marketValue=amount(minor(prev.marketValue)+minor(row.marketValue));prev.quantity=prev.quantity===null||row.quantity===null?null:prev.quantity+row.quantity;prev.costBasis=prev.costBasis===null||row.costBasis===null?null:amount(minor(prev.costBasis)+minor(row.costBasis));if(prev.sector!==row.sector)prev.sector=null;prev.importPrice=prev.importPrice===row.importPrice?prev.importPrice:null;}
  return {...portfolioSummary(holdings), positions:[...grouped.values()], holdings: holdings.length, source: 'csv_upload', importNote:'Values come from the uploaded market value or quantity multiplied by the uploaded price. Optional cost basis is retained; missing prices and costs remain unknown.'};
}
