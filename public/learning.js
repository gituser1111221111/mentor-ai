const root = document.querySelector('#learning-modules');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (root) {
  fetch('/learning-modules.json').then(r => {if (!r.ok) throw Error('Lessons could not load.');return r.json();}).then(data => {
    let completed = [];
    try { completed = JSON.parse(localStorage.getItem('mentor-learning-completed') || '[]'); if (!Array.isArray(completed)) completed = []; } catch {}
    root.innerHTML = '<p class="fine">Lessons from Barone Investment Group. Original educational material; examples, rates and tax rules may need updating. Progress stays in this browser.</p><p id="learning-progress" role="status"></p>' + data.modules.map(m => `<details class="specialist-group" id="lesson-${esc(m.id)}"><summary>${esc(m.title)}</summary><p>${esc(m.summary)}</p><ul>${(m.outcomes || []).map(o => `<li>${esc(o)}</li>`).join('')}</ul>${(m.sections || []).map(s => `<details><summary>${esc(s.title)}</summary><p>${esc(s.body)}</p></details>`).join('')}<details><summary>Practice checklist</summary><ul>${(m.checklist || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul></details><div class="row"><button type="button" class="btn" data-teach="${esc(m.id)}">Discuss with my teacher</button><a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Original lesson &amp; tools ↗</a></div><label><input type="checkbox" data-complete="${esc(m.id)}" ${completed.includes(m.id) ? 'checked' : ''}> I have reviewed this lesson</label></details>`).join('');
    const progress = () => { document.querySelector('#learning-progress').textContent = `${completed.filter(id => data.modules.some(m => m.id === id)).length} of ${data.modules.length} lessons reviewed`; };
    progress();
    root.addEventListener('change', e => {
      const id = e.target.dataset.complete; if (!id) return;
      completed = completed.filter(x => x !== id); if (e.target.checked) completed.push(id);
      try {localStorage.setItem('mentor-learning-completed',JSON.stringify(completed));} catch {}
      progress();
    });
    root.addEventListener('click', e => {
      const id = e.target.closest('[data-teach]')?.dataset.teach;
      const lesson = data.modules.find(m => m.id === id); if (!lesson) return;
      document.dispatchEvent(new CustomEvent('mentor:learn', {detail:{title:lesson.title}}));
    });
  }).catch(() => {root.textContent = 'Lessons could not load. Please refresh to try again.';});
}
