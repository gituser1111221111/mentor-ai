const root = document.querySelector('#portfolio-guidelines');
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (root) {
  root.innerHTML = `<details><summary>My portfolio guidelines &amp; what-if</summary><p class="fine">Choose a concentration review trigger. Imported values are a snapshot, not live prices. Nothing here changes an account.</p><label class="f">Maximum single-security share (%)<input id="guideline-limit" type="number" min="1" max="100" step="0.01" placeholder="Choose a limit"></label><div class="row"><button type="button" class="btn" id="guideline-draft">Review draft</button><button type="button" class="btn" id="guideline-refresh">Refresh review</button></div><p id="guideline-status" role="status"></p><div id="guideline-drafts"></div><div id="guideline-review"></div><div class="row"><button type="button" class="btn" id="guideline-simulate" disabled>Compare trim-to-cash what-if</button><button type="button" class="btn" id="guideline-revert" hidden>Revert to imported baseline</button></div><div id="guideline-scenario"></div></details>`;
  let review;
  const $ = s => root.querySelector(s);
  async function api(path,method='GET',body) {
    let sid; try {sid=localStorage.getItem('sid');} catch {}
    if(!sid) throw Error('Session storage is unavailable. Portfolio guidelines require the current browser session.');
    const r=await fetch('/api/portfolio/'+path,{method,headers:{'Content-Type':'application/json','X-Session-Id':sid},body:body?JSON.stringify(body):undefined});
    const d=await r.json(); if(!r.ok)throw Error(d.error || 'Unable to update guidelines.');return d;
  }
  async function run(fn) {try {await fn();}catch(e){$('#guideline-status').textContent=e.message;}}
  async function refresh() {
    const [g,r]=await Promise.all([api('guidelines'),api('review')]);review=r;
    $('#guideline-status').textContent=g.effective?`Saved version ${g.effective.version}: ${g.effective.maxPositionPercent}% maximum single-security share.`:'No guideline saved. Choose your own limit and review it before saving.';
    $('#guideline-drafts').innerHTML=g.drafts.map(d=>`<article><p>Draft: ${esc(d.maxPositionPercent)}% limit. ${esc(d.rationale)} ${esc(d.scope)}</p><div class="row"><button type="button" class="btn" data-save="${esc(d.id)}">Approve and save this limit</button><button type="button" class="btn" data-reject="${esc(d.id)}">Reject draft</button></div></article>`).join('');
    $('#guideline-review').innerHTML=`<p class="fine">Values as of: ${esc(r.coverage.priceFreshness)}. ${esc(r.coverage.scope)}</p><ul>${r.checks.map(c=>`<li>${c.status==='unknown'?esc(c.reason):`${esc(c.symbol)}: ${esc(c.percent)}% / ${esc(c.limitPercent)}% limit — ${esc(c.status)}`}</li>`).join('')}</ul>`;
    $('#guideline-simulate').disabled=!g.effective||Boolean(r.unknownChecks.length);
    $('#guideline-scenario').textContent='';$('#guideline-revert').hidden=true;
  }
  root.querySelector('details').addEventListener('toggle',e=>{if(e.target.open)run(refresh);});
  $('#guideline-refresh').onclick=()=>run(refresh);
  $('#guideline-draft').onclick=()=>run(async()=>{await api('guidelines/draft','POST',{maxPositionPercent:Number($('#guideline-limit').value)});await refresh();});
  $('#guideline-drafts').onclick=e=>run(async()=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.save)await api('guidelines/save','POST',{draftId:b.dataset.save,userConfirmation:true});else if(b.dataset.reject)await api('guidelines/draft','DELETE',{draftId:b.dataset.reject});await refresh();});
  $('#guideline-simulate').onclick=()=>run(async()=>{const s=await api('simulate','POST',{snapshotId:review.snapshotId,guidelineVersion:review.guidelineVersion});$('#guideline-scenario').innerHTML=`<h4>What-if comparison</h4><p>${s.before.breaches.length} concentration breaches before → ${s.after.breaches.length} after. Cash added: $${esc(s.cashAdded)}.</p><p>Total before: $${esc(s.reconciliation.before)}. Total after: $${esc(s.reconciliation.after)}.</p><ul>${s.changes.map(c=>`<li>${esc(c.symbol)}: $${esc(c.trimValue)} to simulated cash; $${esc(c.remainingValue)} remains.</li>`).join('')}</ul><p class="fine">${esc(s.note)} Imported baseline unchanged.</p>`;$('#guideline-revert').hidden=false;});
  $('#guideline-revert').onclick=()=>{$('#guideline-scenario').textContent='Showing the unchanged imported baseline.';$('#guideline-revert').hidden=true;};
}
