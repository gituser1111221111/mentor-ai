const root = document.querySelector('#learning-modules');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (root) {
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = '/academy/host.css?v=1'; document.head.append(style);
  fetch('/learning-modules.json').then(r => {if (!r.ok) throw Error('Lessons could not load.');return r.json();}).then(data => {
    let completed = [], selected = data.modules[0];
    try { completed = JSON.parse(localStorage.getItem('mentor-learning-completed') || '[]'); if (!Array.isArray(completed)) completed = []; } catch {}
    root.innerHTML = `<div class="learning-toolbar"><label for="learning-select">Choose a learning module<select id="learning-select">${data.modules.map((m,i)=>`<option value="${esc(m.id)}">${String(i+1).padStart(2,'0')} · ${esc(m.title)}</option>`).join('')}</select></label><div class="learning-tools"><button type="button" class="btn primary" id="learning-teacher">Discuss with my teacher</button><label><input type="checkbox" id="learning-complete"> Lesson reviewed</label></div></div><div class="learning-meter"><progress id="learning-meter" max="${data.modules.length}" value="0" aria-label="Lessons reviewed"></progress><span id="learning-progress" role="status"></span></div><iframe class="learning-frame" id="learning-frame" title="${esc(selected.title)} — interactive lesson" src="/academy/lesson.html?topic=${encodeURIComponent(selected.id)}" loading="lazy"></iframe><div class="learning-footer"><div class="learning-nav"><button class="btn" type="button" id="learning-prev">← Previous</button><button class="btn" type="button" id="learning-next">Next →</button></div><a id="learning-original" href="https://www.baroneinvestment.site/lesson.html?topic=${encodeURIComponent(selected.id)}" target="_blank" rel="noopener noreferrer">Original lesson ↗</a></div><p class="learning-source">Barone Investment Group lessons and interactive tools, adapted for Mentor Labs. Educational examples and estimates; progress stays in this browser.</p>`;
    const select = root.querySelector('#learning-select'), frame = root.querySelector('#learning-frame'), check = root.querySelector('#learning-complete');
    const progress = () => {
      const count = completed.filter(id => data.modules.some(m => m.id === id)).length;
      root.querySelector('#learning-progress').textContent = `${count} of ${data.modules.length} lessons reviewed`;
      root.querySelector('#learning-meter').value = count;
      check.checked = completed.includes(selected.id);
      const index = data.modules.indexOf(selected);
      root.querySelector('#learning-prev').disabled = index === 0;
      root.querySelector('#learning-next').disabled = index === data.modules.length - 1;
      root.querySelector('#learning-original').href = `https://www.baroneinvestment.site/lesson.html?topic=${encodeURIComponent(selected.id)}`;
    };
    const show = id => {
      const lesson = data.modules.find(m => m.id === id); if (!lesson) return;
      selected = lesson; select.value = id;
      frame.title = `${lesson.title} — interactive lesson`;
      frame.src = `/academy/lesson.html?topic=${encodeURIComponent(id)}`;
      progress();
    };
    select.addEventListener('change', () => show(select.value));
    root.querySelector('#learning-prev').onclick = () => show(data.modules[data.modules.indexOf(selected)-1]?.id);
    root.querySelector('#learning-next').onclick = () => show(data.modules[data.modules.indexOf(selected)+1]?.id);
    check.addEventListener('change', () => {
      completed = completed.filter(x => x !== selected.id); if (check.checked) completed.push(selected.id);
      try {localStorage.setItem('mentor-learning-completed',JSON.stringify(completed));} catch {}
      progress();
    });
    root.querySelector('#learning-teacher').onclick = () => document.dispatchEvent(new CustomEvent('mentor:learn', {detail:{title:selected.title}}));
    frame.addEventListener('load', () => {
      try {
        const page = new URL(frame.contentWindow.location.href);
        const lesson = page.pathname.endsWith('/lesson.html') && data.modules.find(m => m.id === page.searchParams.get('topic'));
        if (lesson) {selected=lesson;select.value=lesson.id;frame.title=`${lesson.title} — interactive lesson`;progress();}
      } catch {}
    });
    progress();
  }).catch(() => {root.innerHTML = '<p role="status">Lessons could not load. Please refresh to try again.</p>';});
}
