import test from 'node:test';
import assert from 'node:assert/strict';
import {unverifiedNumbers,validateCandidates} from '../lib/mentor/validate.js';
import {speakableText} from '../lib/speech-numbers.js';
import {calcLibrary,normMoney} from '../lib/mentor/tools.js';
import {normalizeProfile} from '../lib/profile.js';
const calcs=[{name:'debt_snowball',inputs:{extraMonthly:'420.00'},result:{months:12,totalInterest:'45.00'}}];
for(const text of ['$420k','$420 million','-$420.00','$.45','$4,20','Pay $420 per week','Pay in 12 years','Pay nine thousand dollars','Pay $420e3','Pay 420k','Pay $420 weekly']) test(`reject unsupported financial meaning: ${text}`,()=>{
 assert.ok(unverifiedNumbers(text,calcs).length,text);
});
test('typed values retain signed cents and separate money, rates and periods',()=>{
 assert.equal(normMoney('-0.50'),'-0.50');
 assert.deepEqual(unverifiedNumbers('$420.00 per month for 12 months',calcs),[]);
 assert.ok(unverifiedNumbers('$45.00%',calcs).length);
 assert.ok(unverifiedNumbers('420 months',calcs).length);
 const negative=[{inputs:{balance:'-0.50'},result:{}}];
 assert.deepEqual(unverifiedNumbers('-$0.50',negative),[]);
 assert.ok(unverifiedNumbers('$0.50',negative).length);
});
test('currency is converted before named accounts, preserving numeric values and scale',()=>{
 assert.equal(speakableText('$401k'),'four hundred one thousand dollars');
 assert.equal(speakableText('$1099'),'one thousand ninety-nine dollars');
 assert.equal(speakableText('$529 savings'),'five hundred twenty-nine dollars savings');
 assert.equal(speakableText('your 401(k) and 529 plan'),'your four oh one k and five twenty-nine plan');
});
test('user prose and numeric labels cannot become calculation authority',()=>{
 const {profile}=normalizeProfile({incomeHistory:[{month:'2026-10',amount:'3000'}],savings:'420'});
 const l=calcLibrary(profile,'I won $9999');
 assert.ok(unverifiedNumbers('Save $9999',l.calcs).length);
 assert.ok(unverifiedNumbers('Save 9999',[{inputs:{name:'9999'},result:{}}]).length);
});
test('a percentage or arbitrary count cannot authorize a payoff month field',()=>{
 const library={calcs:[{id:'snapshot',inputs:{cutPct:20},result:{}}]};
 const r=validateCandidates([{title:'A plan',summary:'Consider saving.',calcIds:[],timeToGoalMonths:20}],library);
 assert.equal(r.candidates[0].timeToGoal,null);
});

test('input formatting rejects ambiguous commas and over-precise APR instead of silently changing them',()=>{
 for(const savings of ['1,00','$4,20','1 000','1e3']) assert.ok(normalizeProfile({savings}).errors.length,savings);
 assert.equal(normalizeProfile({savings:'$1,000.50'}).profile.savings,'1000.50');
 assert.ok(normalizeProfile({debts:[{name:'Card',balance:'100',minPayment:'10',aprPercent:'7.999'}]}).errors.length);
});

test('display formatting cannot relabel a validated duration as currency',async()=>{
 const {dollars}=await import('../lib/mentor/chat.mock.js');
 const c=[{inputs:{extraMonthly:'12.00'},result:{months:12}}];
 assert.deepEqual(unverifiedNumbers('12.00 months',c),[]);
 assert.equal(dollars('In 12.00 months'),'In 12.00 months');
 assert.ok(unverifiedNumbers('$12.00 months',c).length);
});

test('a value from a different field does not validate an explicit savings claim',()=>{
 const c=[{name:'variable_income_snapshot',inputs:{},result:{savings:'420.00',lowestMonth:'1780.00'}}];
 assert.ok(unverifiedNumbers('Your savings are $1780.',c).length);
 assert.deepEqual(unverifiedNumbers('Your savings are $420.',c),[]);
});

test('a verified annual APR cannot be relabeled as a weekly or monthly rate',()=>{
 const c=[{inputs:{},result:{debts:[{aprPercent:'24.90'}]}}];
 assert.ok(unverifiedNumbers('24.90% per month',c).length);
 assert.ok(unverifiedNumbers('24.90% weekly',c).length);
 assert.deepEqual(unverifiedNumbers('24.90% per year',c),[]);
});

test('written-out amounts and fractional quantities cannot skip validation',()=>{
 for(const text of ['Save seventeen dollars','Earn ninety-nine percent','Pay half a dollar','Save one crore dollars']) assert.ok(unverifiedNumbers(text,[]).length,text);
});
