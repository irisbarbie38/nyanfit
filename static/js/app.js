const workouts = window.NYANFIT_WORKOUTS || [];
let selectedWorkout = workouts[0] || null;
let activeSessionId = null;
let sessionStartedAt = null;
let sessionClock = null;
let timerInterval = null;
let timerEndsAt = 0;
let chart = null;
let progression = {};

const $ = (id) => document.getElementById(id);

const ptDays = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
function setToday() {
  const now = new Date();
  $('today').textContent = `${ptDays[now.getDay()]}, ${now.getDate()} de ${now.toLocaleDateString('pt-BR',{month:'long'})}`;
}
function workoutForToday() {
  const index = (new Date().getDay() + 6) % 7;
  return workouts[index % workouts.length] || workouts[0];
}
function exerciseIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('hip thrust') || n.includes('pélvica')) return '/static/img/hip-thrust.svg';
  if (n.includes('smith') || n.includes('agachamento')) return '/static/img/smith.svg';
  if (n.includes('abdução')) return '/static/img/abduction.svg';
  return '/static/img/placeholder.svg';
}
function renderToday() {
  selectedWorkout = workoutForToday();
  $('focusName').textContent = selectedWorkout.name;
  $('todayExercises').innerHTML = selectedWorkout.exercises.map((e,i)=>`
    <button class="exercise-card pixel-panel" type="button" onclick="openWorkoutModal(${i})">
      <span class="exercise-art"><img src="${exerciseIcon(e.name)}" alt=""></span>
      <span class="exercise-main"><b>${e.name}</b><small>${e.sets} séries · ${e.min_reps}–${e.max_reps} reps · RIR ${e.rir}</small></span>
      <strong>0/${e.sets}</strong><span class="chevron">›</span>
    </button>`).join('');
}
function renderWorkoutList() {
  $('workoutList').innerHTML = workouts.map(w=>`
    <article class="workout-preview pixel-panel">
      <div class="workout-preview-head"><span class="workout-badge">${w.icon}</span><div><h3>${w.name}</h3><p>${w.exercises.length} exercícios · ${w.exercises.reduce((a,e)=>a+e.sets,0)} séries</p></div></div>
      <div class="preview-exercises">${w.exercises.map(e=>`<span>${e.name} · ${e.min_reps}–${e.max_reps}</span>`).join('')}</div>
      <button class="outline-button" onclick="selectAndStart(${w.day})">ABRIR TREINO</button>
    </article>`).join('');
}
function showView(id) {
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===id));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
function selectAndStart(day) {
  selectedWorkout = workouts.find(w=>w.day===day) || workouts[0];
  startWorkout();
}
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
$('startWorkoutBtn').addEventListener('click',()=>startWorkout());

async function loadDashboard() {
  try {
    const [statsRes, historyRes, sessionsRes, progressionRes] = await Promise.all([
      fetch('/api/stats'), fetch('/api/history'), fetch('/api/sessions'), fetch('/api/progression')
    ]);
    const stats = await statsRes.json();
    const history = await historyRes.json();
    const sessions = await sessionsRes.json();
    progression = await progressionRes.json();
    $('statSets').textContent = Number(stats.sets || 0).toLocaleString('pt-BR');
    $('statVolume').textContent = Math.round(stats.volume || 0).toLocaleString('pt-BR');
    $('statSessions').textContent = Number(stats.sessions || 0).toLocaleString('pt-BR');
    $('statCompletion').textContent = `${Math.round(stats.completion || 0)}%`;
    renderRecentSessions(sessions.slice(0,2));
    renderFullHistory(history);
    renderProgressionSelect();
  } catch (err) { toast('Não foi possível carregar seus dados.'); }
}
function renderRecentSessions(rows) {
  if (!rows.length) {
    $('recentSessions').innerHTML = '<div class="empty">Seu primeiro treino vai aparecer aqui.</div>';
    return;
  }
  $('recentSessions').innerHTML = rows.map((x)=>{
    const d = new Date(x.started_at);
    const day = d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase();
    return `<div class="history-row"><div class="date-badge"><small>${day}</small><b>${d.getDate()}</b></div><div class="history-info"><b>${workouts.find(w=>w.day===x.workout_day)?.name || 'Treino'}</b><span>Volume: ${Math.round(x.volume).toLocaleString('pt-BR')} kg · ${formatDuration(x.duration_seconds||0)}</span></div><strong class="done-badge">CONCLUÍDO</strong><span class="chevron">›</span></div>`;
  }).join('') + `<button class="see-all" onclick="showView('historyView')">Ver todos os treinos <span>›</span></button>`;
}
function renderFullHistory(rows) {
  $('fullHistory').innerHTML = rows.length ? rows.map(x=>`<div class="history-detail-row"><div><b>${x.exercise_name}</b><span>${x.weight} kg × ${x.reps} · RIR ${x.rir ?? '—'}</span></div><small>${new Date(x.created_at).toLocaleDateString('pt-BR')}</small></div>`).join('') : '<div class="empty">Ainda não há séries registradas.</div>';
}
function renderProgressionSelect() {
  const names = Object.keys(progression);
  $('exerciseSelect').innerHTML = names.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  if (names.length) drawChart();
}
function drawChart() {
  const name = $('exerciseSelect').value;
  const points = progression[name] || [];
  if (chart) chart.destroy();
  chart = new Chart($('progressChart'), {type:'line',data:{labels:points.map(x=>x.date),datasets:[{label:'Melhor carga (kg)',data:points.map(x=>x.weight),tension:.25,fill:true}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#a9a3c9'},grid:{color:'#242144'}},y:{ticks:{color:'#a9a3c9'},grid:{color:'#242144'}}}}});
  const last = points.at(-1), prev = points.at(-2);
  let msg = 'Registre seu primeiro treino para criar uma meta.';
  if (last) {
    const ex = workouts.flatMap(w=>w.exercises).find(e=>e.name===name);
    const next = last.reps >= ex.max_reps ? last.weight + (last.weight>=60?2.5:1.25) : last.weight;
    msg = last.reps >= ex.max_reps ? `🚀 Próxima meta: <b>${next} kg</b> · voltar para ${ex.min_reps}–${ex.max_reps} reps.` : `🎯 Próxima meta: repetir <b>${last.weight} kg</b> e tentar chegar a ${ex.max_reps} reps.`;
    if (prev && last.weight > prev.weight) msg += ` <span class="green">↑ ${Math.round(last.weight-prev.weight)} kg desde a sessão anterior.</span>`;
  }
  $('nextGoal').innerHTML = msg;
}
$('exerciseSelect').addEventListener('change',drawChart);

function openWorkoutModal(exerciseIndex=null) {
  if (!selectedWorkout) return;
  $('modalTitle').textContent = selectedWorkout.name;
  $('workoutContent').innerHTML = selectedWorkout.exercises.map((e,i)=>`<article class="workout-exercise ${exerciseIndex===i?'highlight':''}"><div class="exercise-head"><div><b>${e.name}</b><span>${e.min_reps}–${e.max_reps} reps · RIR ${e.rir}</span></div><span class="pill">${e.sets} séries</span></div><div class="sets">${Array.from({length:e.sets},(_,n)=>`<div class="set-row" id="set-${i}-${n}"><span>S${n+1}</span><input type="number" step=".5" min="0" placeholder="kg" id="w-${i}-${n}"><input type="number" min="1" placeholder="reps" id="r-${i}-${n}"><input type="number" min="0" max="5" placeholder="RIR" id="q-${i}-${n}"><button onclick="logSet(${i},${n})">✓</button></div>`).join('')}</div></article>`).join('');
  $('workoutModal').classList.remove('hidden');
}
async function startWorkout() {
  if (!selectedWorkout) return;
  if (!activeSessionId) {
    const res = await fetch('/api/session/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workout_day:selectedWorkout.day})});
    const data = await res.json();
    if (!res.ok) { toast('Não foi possível iniciar o treino.'); return; }
    activeSessionId = data.session_id; sessionStartedAt = data.started_at; startSessionClock(); $('activeSessionBar').classList.remove('hidden');
  }
  openWorkoutModal();
}
async function logSet(i,n) {
  const e = selectedWorkout.exercises[i];
  const weight = $(`w-${i}-${n}`).value;
  const reps = $(`r-${i}-${n}`).value;
  const rir = $(`q-${i}-${n}`).value;
  if (!reps) { toast('Coloque as repetições.'); return; }
  const res = await fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workout_day:selectedWorkout.day,session_id:activeSessionId,exercise_name:e.name,set_number:n+1,weight,reps,rir})});
  if (res.ok) { $(`set-${i}-${n}`).classList.add('done'); startTimer(e.rest); toast('Série salva.'); await loadDashboard(); }
  else toast('Não foi possível salvar a série.');
}
async function finishWorkout() {
  if (!activeSessionId) return;
  const res = await fetch('/api/session/finish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:activeSessionId})});
  const data = await res.json();
  if (!res.ok) { toast('Não foi possível finalizar.'); return; }
  clearInterval(sessionClock); $('activeSessionBar').classList.add('hidden'); closeModal();
  $('summaryWorkout').textContent = selectedWorkout.name;
  $('sumDuration').textContent = formatDuration(data.session.duration_seconds||0);
  $('sumSets').textContent = data.summary.sets;
  $('sumVolume').textContent = `${Math.round(data.summary.volume)} kg`;
  $('summaryMessage').innerHTML = data.summary.sets ? `Você completou <b>${data.summary.exercises}</b> exercícios e <b>${data.summary.sets}</b> séries.` : 'Nenhuma série foi registrada nesta sessão.';
  $('summaryModal').classList.remove('hidden');
  activeSessionId = null; sessionStartedAt = null;
  await loadDashboard();
}
async function restoreSession() {
  const res = await fetch('/api/session/current');
  if (!res.ok) return;
  const data = await res.json();
  if (data.session_id) {
    activeSessionId = data.session_id; sessionStartedAt = data.started_at;
    selectedWorkout = workouts.find(w=>w.day===data.workout_day) || selectedWorkout;
    $('activeSessionBar').classList.remove('hidden'); startSessionClock();
  }
}
function startSessionClock() { clearInterval(sessionClock); sessionClock = setInterval(()=>{ $('sessionElapsed').textContent = formatDuration(Math.max(0,Math.floor((Date.now()-new Date(sessionStartedAt).getTime())/1000))); },1000); }
function formatDuration(sec) { const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60; return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function startTimer(seconds) { timerEndsAt=Date.now()+seconds*1000; $('timer').classList.remove('hidden'); clearInterval(timerInterval); tickTimer(); timerInterval=setInterval(tickTimer,250); }
function tickTimer() { const left=Math.max(0,Math.ceil((timerEndsAt-Date.now())/1000)); $('timerValue').textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`; if(left<=0){clearInterval(timerInterval);if(navigator.vibrate)navigator.vibrate([200,100,200]);toast('Descanso terminado.');} }
function adjustTimer(n){timerEndsAt+=n*1000;tickTimer();}
function skipTimer(){clearInterval(timerInterval);$('timer').classList.add('hidden');}
function closeModal(){$('workoutModal').classList.add('hidden');}
function closeSummary(){$('summaryModal').classList.add('hidden');}
function toast(msg){const t=$('toast');t.innerHTML=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2200);}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

setToday();
renderToday();
renderWorkoutList();
loadDashboard();
restoreSession();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
