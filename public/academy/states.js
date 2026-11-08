// Approximate typical state income-tax rate (%) for a mid-income single earner, rounded to the nearest 0.25.
// Flat-tax states use the flat rate; progressive states use an approximate effective rate near $65k.
// Some states changed rates for 2026 and local taxes vary, so these are estimates. Last reviewed Nov 2026.
window.STATE_TAX = {
  AL: ["Alabama", 4.0], AK: ["Alaska", 0], AZ: ["Arizona", 2.5], AR: ["Arkansas", 3.75], CA: ["California", 4.5],
  CO: ["Colorado", 4.25], CT: ["Connecticut", 4.0], DE: ["Delaware", 5.0], DC: ["District of Columbia", 6.0], FL: ["Florida", 0],
  GA: ["Georgia", 5.0], HI: ["Hawaii", 6.0], ID: ["Idaho", 5.25], IL: ["Illinois", 5.0], IN: ["Indiana", 3.0],
  IA: ["Iowa", 3.75], KS: ["Kansas", 4.5], KY: ["Kentucky", 4.0], LA: ["Louisiana", 3.0], ME: ["Maine", 5.5],
  MD: ["Maryland", 5.5], MA: ["Massachusetts", 5.0], MI: ["Michigan", 4.25], MN: ["Minnesota", 5.5], MS: ["Mississippi", 4.0],
  MO: ["Missouri", 4.25], MT: ["Montana", 4.75], NE: ["Nebraska", 4.25], NV: ["Nevada", 0], NH: ["New Hampshire", 0],
  NJ: ["New Jersey", 3.5], NM: ["New Mexico", 3.5], NY: ["New York", 5.0], NC: ["North Carolina", 4.0], ND: ["North Dakota", 1.5],
  OH: ["Ohio", 3.0], OK: ["Oklahoma", 4.0], OR: ["Oregon", 7.5], PA: ["Pennsylvania", 3.0], RI: ["Rhode Island", 4.0],
  SC: ["South Carolina", 5.0], SD: ["South Dakota", 0], TN: ["Tennessee", 0], TX: ["Texas", 0], UT: ["Utah", 4.5],
  VT: ["Vermont", 5.5], VA: ["Virginia", 5.0], WA: ["Washington", 0], WV: ["West Virginia", 4.0], WI: ["Wisconsin", 5.0], WY: ["Wyoming", 0],
};
