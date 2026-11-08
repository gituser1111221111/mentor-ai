const root = document.querySelector('#learning-modules');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (root) {
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = '/academy/host.css?v=4'; document.head.append(style);
  fetch('/learning-modules.json').then(r => {if (!r.ok) throw Error('Lessons could not load.');return r.json();}).then(data => {
    const order = ['reset','budgeting','credit','debt_payoff','taxes_paychecks','insurance_risk','investing','stocks','etfs','diversification','careers','entrepreneurship','ai'];
    const modules = order.map(id => data.modules.find(m => m.id === id)).filter(Boolean);
    let completed = [], selected = modules[0], mode = 'guide';
    try {completed = JSON.parse(localStorage.getItem('mentor-learning-completed') || '[]');if (!Array.isArray(completed)) completed=[];} catch {}
    root.innerHTML = `<div class="learning-shell"><aside class="learning-rail" aria-label="Financial literacy guide"><p class="learning-eyebrow">Your learning path</p><h3>13 steps. Your pace.</h3><div class="learning-meter"><progress id="learning-meter" max="${modules.length}" value="0" aria-label="Lessons reviewed"></progress><span id="learning-progress" role="status"></span></div><nav class="learning-steps" aria-label="Learning steps">${modules.map((m,i)=>`<button type="button" data-learning-step="${esc(m.id)}" aria-current="${i===0?'step':'false'}"><span class="learning-step-number">${String(i+1).padStart(2,'0')}</span><span>${esc(m.title)}</span><span class="learning-step-done" aria-label="Reviewed" hidden>✓</span></button>`).join('')}</nav></aside><div class="learning-content"><div class="learning-mode" role="group" aria-label="Learning area"><button type="button" data-learning-mode="guide" aria-pressed="true">13-step guide</button><button type="button" data-learning-mode="tools" aria-pressed="false">Practice tools</button></div><div class="learning-toolbar"><label for="learning-select" id="learning-select-label">Choose a step<select id="learning-select">${modules.map((m,i)=>`<option value="${esc(m.id)}">${String(i+1).padStart(2,'0')} · ${esc(m.title)}</option>`).join('')}</select></label><label for="learning-tool-select" id="learning-tool-label" hidden>Choose a practice tool<select id="learning-tool-select"><option value="">Loading tools…</option></select></label><div class="learning-tools"><button type="button" class="btn" id="learning-teacher">Discuss with my teacher</button><label id="learning-complete-label"><input type="checkbox" id="learning-complete"> Step reviewed</label></div></div><iframe class="learning-frame" id="learning-frame" title="${esc(selected.title)} — interactive lesson" src="/academy/lesson.html?topic=${encodeURIComponent(selected.id)}" loading="lazy"></iframe><div class="learning-footer"><div class="learning-nav"><button class="btn" type="button" id="learning-prev">← Previous step</button><button class="btn primary" type="button" id="learning-next">Next step →</button></div><a id="learning-original" href="https://www.baroneinvestment.site/lesson.html?topic=${encodeURIComponent(selected.id)}" target="_blank" rel="noopener noreferrer">Original lesson ↗</a></div></div></div><p class="learning-source">Lessons and calculators from Barone Investment Group. Educational estimates; your progress stays in this browser.</p>`;
    const select=root.querySelector('#learning-select'),frame=root.querySelector('#learning-frame'),check=root.querySelector('#learning-complete'),toolSelect=root.querySelector('#learning-tool-select');
    const progress=()=>{
      const count=completed.filter(id=>modules.some(m=>m.id===id)).length;
      root.querySelector('#learning-progress').textContent=`${count} of ${modules.length} steps reviewed`;
      root.querySelector('#learning-meter').value=count;check.checked=completed.includes(selected.id);
      const index=modules.indexOf(selected);
      root.querySelector('#learning-prev').disabled=index===0;root.querySelector('#learning-next').disabled=index===modules.length-1;
      root.querySelector('#learning-original').href=`https://www.baroneinvestment.site/lesson.html?topic=${encodeURIComponent(selected.id)}`;
      for(const b of root.querySelectorAll('[data-learning-step]')){b.setAttribute('aria-current',b.dataset.learningStep===selected.id?'step':'false');b.querySelector('.learning-step-done').hidden=!completed.includes(b.dataset.learningStep);}
    };
    const changeMode=next=>{
      mode=next;for(const b of root.querySelectorAll('[data-learning-mode]'))b.setAttribute('aria-pressed',String(b.dataset.learningMode===mode));
      root.querySelector('#learning-select-label').hidden=mode!=='guide';root.querySelector('#learning-tool-label').hidden=mode!=='tools';root.querySelector('#learning-complete-label').hidden=mode!=='guide';root.querySelector('.learning-footer').hidden=mode!=='guide';
    };
    const show=id=>{const lesson=modules.find(m=>m.id===id);if(!lesson)return;selected=lesson;select.value=id;changeMode('guide');frame.title=`${lesson.title} — interactive lesson`;frame.src=`/academy/lesson.html?topic=${encodeURIComponent(id)}`;progress();};
    const showTool=id=>{if(!id)return;changeMode('tools');toolSelect.value=id;frame.title=`${toolSelect.selectedOptions[0]?.textContent||'Practice tool'} — interactive tool`;frame.src=`/academy/tool.html?tool=${encodeURIComponent(id)}`;};
    select.addEventListener('change',()=>show(select.value));toolSelect.addEventListener('change',()=>showTool(toolSelect.value));
    root.querySelector('#learning-prev').onclick=()=>show(modules[modules.indexOf(selected)-1]?.id);
    root.querySelector('#learning-next').onclick=()=>show(modules[modules.indexOf(selected)+1]?.id);
    root.addEventListener('click',e=>{const step=e.target.closest('[data-learning-step]');if(step)show(step.dataset.learningStep);const tab=e.target.closest('[data-learning-mode]');if(tab){if(tab.dataset.learningMode==='guide')show(selected.id);else showTool(toolSelect.value||'compound');}});
    check.addEventListener('change',()=>{completed=completed.filter(x=>x!==selected.id);if(check.checked)completed.push(selected.id);try{localStorage.setItem('mentor-learning-completed',JSON.stringify(completed));}catch{}progress();});
    root.querySelector('#learning-teacher').textContent='Ask your teacher';root.querySelector('#learning-teacher').onclick=()=>document.querySelector('#teacher-launcher')?.click();
    frame.addEventListener('load',()=>{
      document.dispatchEvent(new CustomEvent('mentor:learning-page'));
      try{
        const w=frame.contentWindow,d=frame.contentDocument,page=new URL(w.location.href),lesson=page.pathname.endsWith('/lesson.html')&&modules.find(m=>m.id===page.searchParams.get('topic'));
        if(lesson){selected=lesson;select.value=lesson.id;changeMode('guide');frame.title=`${lesson.title} — interactive lesson`;progress();}
        d.body.classList.add('mentor-embedded');
        frame.scrolling='no';
        const fit=()=>{const h=Math.ceil(d.body.scrollHeight)+20;if(Math.abs(frame.clientHeight-h)>4)frame.style.height=h+'px';};
        if(frame._lessonObserver)frame._lessonObserver.disconnect();
        frame._lessonObserver=new ResizeObserver(fit);frame._lessonObserver.observe(d.body);d.fonts.ready.then(fit);fit();
        const tools=w.BIG_CONTENT?.tools;
        if(tools&&toolSelect.options.length<2)toolSelect.innerHTML=Object.entries(tools).map(([id,t])=>`<option value="${esc(id)}">${esc(t.title)}</option>`).join('');
        if(page.pathname.endsWith('/tool.html')){changeMode('tools');toolSelect.value=page.searchParams.get('tool');frame.title=`${toolSelect.selectedOptions[0]?.textContent||'Practice tool'} — interactive tool`;}
        d.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const u=new URL(a.href,page);if(u.origin===location.origin&&(u.pathname.endsWith('/academy/index.html')||(u.pathname==='/'&&u.hash==='#top'))){e.preventDefault();if(u.hash==='#tools')showTool(toolSelect.value||toolSelect.options[0]?.value);else{show(selected.id);root.querySelector('[data-learning-step="'+selected.id+'"]').focus();}}});
      }catch{}
    });progress();
  }).catch(()=>{root.innerHTML='<p role="status">Lessons could not load. Please refresh to try again.</p>';});
}
