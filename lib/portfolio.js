// Brokerage CSV export -> portfolioSummary() rows. No brokerage login, no credentials.
import {parseCSV} from './csv.js';
import {portfolioSummary} from './finance.js';

const pick = (row, names) => { for (const n of names) if (row[n] !== undefined && row[n] !== '') return row[n]; return undefined; };

// Accepts either the starter-kit holdings format or a simple export:
// symbol|security|security_id, sector?, market_value_usd|market_value|value, annual_fee_bps?
export function summarizePortfolioCSV(csv, {accountId} = {}) {
  if (typeof csv !== 'string' || csv.length > 500_000) throw Error('Upload a CSV under 500 KB');
  let rows = parseCSV(csv, {maxRows: 2000});
  if (accountId) rows = rows.filter(r => r.account_id === accountId);
  if (!rows.length) throw Error('No holdings found in the CSV');
  const holdings = rows.map((r, i) => {
    const value = String(pick(r, ['market_value_usd', 'market_value', 'value', 'Market Value']) ?? '').replace(/[$,\s]/g, '');
    const security = pick(r, ['security_id', 'symbol', 'Symbol', 'security', 'ticker']);
    if (!security || !value) throw Error(`Row ${i + 2}: need a symbol and a market value`);
    return {
      security_id: String(security).slice(0, 20), sector: String(pick(r, ['sector', 'Sector']) ?? 'Unknown').slice(0, 40),
      currency: String(pick(r, ['currency']) ?? 'USD').toUpperCase(),
      market_value_usd: value, annual_fee_bps: String(pick(r, ['annual_fee_bps', 'fee_bps']) ?? '0'),
    };
  });
  return {...portfolioSummary(holdings), holdings: holdings.length, source: 'csv_upload'};
}
