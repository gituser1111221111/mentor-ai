// Shared calculation helpers, used by tool pages, lesson pages and the homepage widget.
// 2026 U.S. federal figures (estimates, IRS Rev. Proc. 2025-32). See method.html.
window.BIG_CALC = (function () {
  var FED = {
    single: { std: 16100, brackets: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]] },
    married: { std: 32200, brackets: [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]] },
  };
  var SS_WAGE_BASE = 184500;

  function fedTax(taxable, status) {
    var tax = 0, prev = 0, b = FED[status].brackets;
    for (var i = 0; i < b.length; i++) {
      if (taxable <= prev) break;
      tax += (Math.min(taxable, b[i][0]) - prev) * b[i][1];
      prev = b[i][0];
    }
    return tax;
  }

  // opts: { gross, status: 'single'|'married', k401: percent, stateRate: percent }
  function paycheck(opts) {
    var gross = opts.gross, status = opts.status || "single", k = opts.k401 || 0, st = opts.stateRate || 0;
    var pretax = gross * (k / 100);
    var fed = fedTax(Math.max(0, gross - pretax - FED[status].std), status);
    var fica = Math.min(gross, SS_WAGE_BASE) * 0.062 + gross * 0.0145;
    var state = Math.max(0, gross - pretax) * (st / 100);
    var net = gross - pretax - fed - fica - state;
    return { gross: gross, pretax: pretax, fed: fed, fica: fica, state: state, net: net, effective: gross ? (fed + fica + state) / gross : 0 };
  }

  return { paycheck: paycheck, fedTax: fedTax };
})();
