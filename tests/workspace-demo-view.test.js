import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace} from '../lib/workspace-demo.js';
import {workspaceOverview} from '../lib/workspace.js';

test('display-only examples populate both dashboards with labeled, dated data',()=>{
 const d=demoWorkspace();
 assert.equal(d.demo,true);assert.equal(d.budget.ready,true);assert.equal(d.budget.monthlyBalance,'1150.00');
 assert.equal(d.review.marketValue,'119686.70');assert.equal(d.profile.portfolio.securities.length,13);
 assert.equal(d.advancedRisk.history.complete,true);assert.equal(d.advancedRisk.history.dates.length,53);
 assert.equal(d.marketContext.demo,true);assert.match(d.marketContext.note,/not your holdings/);
 assert.match(d.note,/Never saved/);assert.ok(d.marketContext.holdings.every(h=>h.priceSource==='dated sample snapshot'));
});

test('preview generation cannot populate or alter a real user workspace',()=>{
 const session={profile:{savings:'45.00',documents:[{name:'personal.txt',text:'User context'}]}};
 const before=JSON.stringify(session),first=demoWorkspace();first.profile.savings='999999.00';first.profile.portfolio.securities.length=0;
 const second=demoWorkspace(),real=workspaceOverview(session);
 assert.equal(JSON.stringify(session),before);assert.equal(real.profile.savings,'45.00');assert.equal(real.profile.portfolio,undefined);assert.equal(real.budget.ready,false);
 assert.equal(second.profile.savings,'10600.00');assert.equal(second.profile.portfolio.securities.length,13);
});
