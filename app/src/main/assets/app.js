
const PLAN=window.WORKOUT_PLAN;
const NUTRITION=window.NUTRITION_PLAN;
const KEY='workoutTrackerV1';
let state=load(); let currentSession=null; let selectedWeek=state.selectedWeek||1; let nutritionWeek=state.nutritionWeek||1;
function blankState(){return {selectedWeek:1,nutritionWeek:1,sessions:{},weights:[],nutrition:{},theme:'light'}}
function load(){try{return {...blankState(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){return blankState()}}
function save(){state.selectedWeek=selectedWeek;state.nutritionWeek=nutritionWeek;localStorage.setItem(KEY,JSON.stringify(state));renderHome();renderProgress();renderNutrition()}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.bottomnav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));if(id==='nutritionView')renderNutrition();window.scrollTo(0,0)}
function sessState(id){if(!state.sessions[id])state.sessions[id]={completed:false,exercises:{}};return state.sessions[id]}
function exState(sid,eid,sets){const s=sessState(sid);if(!s.exercises[eid])s.exercises[eid]={done:false,rir:'',notes:'',sets:Array.from({length:sets},()=>({kg:'',reps:'',done:false}))};while(s.exercises[eid].sets.length<sets)s.exercises[eid].sets.push({kg:'',reps:'',done:false});return s.exercises[eid]}
function sessionPct(sess){const s=sessState(sess.id);let done=0,total=0;sess.exercises.forEach(e=>{const es=exState(sess.id,e.id,e.sets);es.sets.forEach(st=>{total++;if(st.done)done++})});return total?Math.round(done/total*100):0}
function planStats(){let sessionsDone=0,exDone=0,setsDone=0,setsTotal=0,volume=0;PLAN.forEach(sess=>{const s=sessState(sess.id);if(s.completed)sessionsDone++;sess.exercises.forEach(e=>{const es=exState(sess.id,e.id,e.sets);if(es.done)exDone++;es.sets.forEach(st=>{setsTotal++;if(st.done)setsDone++;const kg=parseFloat(st.kg),reps=parseFloat(st.reps);if(isFinite(kg)&&isFinite(reps))volume+=kg*reps})})});return{sessionsDone,exDone,setsDone,setsTotal,volume}}
function renderHome(){const select=document.getElementById('weekSelect');select.innerHTML=[1,2,3,4].map(w=>`<option value="${w}" ${w===selectedWeek?'selected':''}>Week ${w}</option>`).join('');const weekSessions=PLAN.filter(s=>s.weekNum===selectedWeek);const completed=weekSessions.filter(s=>sessState(s.id).completed).length;const setPcts=weekSessions.map(sessionPct);const avg=Math.round(setPcts.reduce((a,b)=>a+b,0)/(setPcts.length||1));document.getElementById('weekSummary').innerHTML=`<div class="summary"><b> ${completed}/${weekSessions.length}</b><span>workouts complete</span></div><div class="summary"><b>${avg}%</b><span>sets logged</span></div><div class="summary"><b>${weekSessions.reduce((sum,s)=>sum+s.exercises.length,0)}</b><span>exercises</span></div>`;const st=planStats();const overall=Math.round(st.setsDone/st.setsTotal*100);document.getElementById('ring').style.setProperty('--pct',overall+'%');document.getElementById('ringText').textContent=overall+'%';document.getElementById('sessionList').innerHTML=weekSessions.map(s=>{const ss=sessState(s.id),p=sessionPct(s);return `<div class="session ${ss.completed?'done':''}" data-sid="${s.id}"><div class="daybox">${s.day}</div><div><h4>${s.title}</h4><p>${s.focus} · ${p}% sets</p></div><div class="statusdot">${ss.completed?'✓':'›'}</div></div>`}).join('');document.querySelectorAll('.session').forEach(el=>el.onclick=()=>openWorkout(el.dataset.sid))}
function openWorkout(sid){currentSession=PLAN.find(s=>s.id===sid);const s=currentSession;document.getElementById('workoutHeader').innerHTML=`<div class="workout-title"><div class="eyebrow">${s.week.toUpperCase()} · ${s.day.toUpperCase()}</div><h2>${s.title}</h2><div class="muted">${s.focus}</div></div>`;document.getElementById('exerciseList').innerHTML=s.exercises.map((e,i)=>exerciseHTML(s,e,i)).join('');bindWorkoutInputs();const ss=sessState(s.id);const btn=document.getElementById('completeWorkout');btn.textContent=ss.completed?'✓ Workout completed':'Mark workout complete';btn.classList.toggle('secondary',ss.completed);showView('workoutView');if(window.arabicCoachSpeak){window.arabicCoachSpeak('تمرين النهارده '+s.title+'. خلي الحركة متحكم فيها، وتقدر تستخدم المدرب الذكي بالعربي لكل تمرين.')}}
function showTechnique(eid,name){openExerciseVideo(eid,name)}
function closeTechnique(){}
function openExerciseVideo(eid,name){
  const e=currentSession&&currentSession.exercises.find(x=>x.id===eid);
  const title=name||e?.name||'Exercise';
  if(window.CoachBridge&&window.CoachBridge.openExerciseVideo){
    window.CoachBridge.openExerciseVideo(title);
  }else{
    window.open('https://www.youtube.com/results?search_query='+encodeURIComponent(title+' exercise technique Muscle and Strength'),'_blank');
  }
}
function supportsArabicCoach(name) {
  const n=name.toLowerCase();
  if(/split squat|lunge|step-up/.test(n)) return false;
  return /squat|deadlift|good morning|pull-through|shoulder press|arnold press|landmine press|lateral raise|curl|push-up/.test(n) && !/leg curl|hamstring curl/.test(n);
}
function startArabicCoach(eid,name) {
  if(!window.CoachBridge || typeof window.CoachBridge.startArabicCoach!=='function') {
    toast('المدرب الذكي متاح في تطبيق أندرويد بعد التحديث.');
    return;
  }
  const actualName=name||((currentSession&&currentSession.exercises.find(e=>e.id===eid))||{}).name||'';
  window.CoachBridge.startArabicCoach(eid,actualName);
}
window.onArabicCoachResult=function(info) {
  if(!currentSession || !info || !currentSession.exercises.some(e=>e.id===info.exerciseId)) return;
  if(!state.coaching) state.coaching={};
  state.coaching[currentSession.id+'_'+info.exerciseId]={
    reps:Math.max(0,Math.min(10000,Number(info.reps)||0)),
    mode:info.mode||'PREVIEW_ONLY',
    date:new Date().toISOString()
  };
  save();
  openWorkout(currentSession.id);
  toast('تم حفظ جلسة المدرب الذكي');
};
function exerciseHTML(s,e,i){const es=exState(s.id,e.id,e.sets);return `<article class="exercise-card" data-eid="${e.id}"><div class="exercise-top"><button class="exercise-animation" type="button" onclick="showTechnique('${e.id}', '')"><span class="exercise-realvideo" aria-label="شاهد فيديو واقعي لهذا التمرين">▶</span></button><div><h3>${i+1}. ${e.name}</h3><div class="technique-label">🎬 شاهد فيديو حقيقي للتمرين (يتطلب إنترنت)</div><div class="meta"><span class="tag">${e.target}</span><span class="tag">Rest ${e.rest}</span></div></div></div><div class="coach-launch-row"><button type="button" class="coach-launch" onclick="startArabicCoach('${e.id}')">🎥 ${supportsArabicCoach(e.name)?'المدرب الذكي بالعربي • تحليل الحركة':'المدرب الذكي بالعربي • عرض الكاميرا فقط'}</button><small>التوجيه الصوتي والنصي بالعربي. ${supportsArabicCoach(e.name)?'العدّ وتقييم زاوية الحركة تجريبي.':'تصحيح التقنية والعدّ غير متاحين للتمرين ده حالياً.'}</small>${state.coaching&&state.coaching[s.id+'_'+e.id]?'<div class="coach-last">آخر جلسة: '+state.coaching[s.id+'_'+e.id].reps+' عدة مسجلة</div>':''}</div><div class="sets">${es.sets.map((st,j)=>`<div class="setrow"><span class="setnum">S${j+1}</span><input inputmode="decimal" type="number" step="0.5" data-field="kg" data-set="${j}" value="${st.kg}" placeholder="kg"><input inputmode="numeric" type="number" data-field="reps" data-set="${j}" value="${st.reps}" placeholder="reps"><input class="setcheck" type="checkbox" data-field="setdone" data-set="${j}" ${st.done?'checked':''}></div>`).join('')}</div><div class="extras"><input data-field="rir" value="${es.rir||''}" placeholder="RIR"><textarea data-field="notes" placeholder="Notes">${es.notes||''}</textarea></div><label class="exercise-done">Exercise complete <input type="checkbox" data-field="exdone" ${es.done?'checked':''}></label></article>`}
function bindWorkoutInputs(){document.querySelectorAll('.exercise-card').forEach(card=>{const eid=card.dataset.eid;const ex=currentSession.exercises.find(x=>x.id===eid);const es=exState(currentSession.id,eid,ex.sets);card.querySelectorAll('input,textarea').forEach(inp=>{inp.addEventListener('input',()=>{const f=inp.dataset.field;if(f==='kg'||f==='reps'){es.sets[+inp.dataset.set][f]=inp.value}else if(f==='setdone'){es.sets[+inp.dataset.set].done=inp.checked}else if(f==='exdone')es.done=inp.checked;else if(f)es[f]=inp.value;localStorage.setItem(KEY,JSON.stringify(state))});inp.addEventListener('change',()=>{if(inp.dataset.field==='setdone')es.sets[+inp.dataset.set].done=inp.checked;if(inp.dataset.field==='exdone')es.done=inp.checked;save()})})})}
function renderProgress(){const st=planStats();document.getElementById('progressCards').innerHTML=`<div class="summary"><b>${st.sessionsDone}/${PLAN.length}</b><span>workouts</span></div><div class="summary"><b>${st.setsDone}</b><span>sets complete</span></div><div class="summary"><b>${Math.round(st.volume).toLocaleString()}</b><span>kg reps volume</span></div>`;document.getElementById('weightList').innerHTML=(state.weights||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(w=>`<div class="weightitem"><span>${w.date}</span><b>${w.kg} kg</b></div>`).join('')||'<p class="muted">No body-weight entries yet.</p>'}

function nutritionDayState(id){if(!state.nutrition)state.nutrition={};if(!state.nutrition[id])state.nutrition[id]={meals:{},water:0};return state.nutrition[id]}
function nutritionDayProgress(day){const ns=nutritionDayState(day.id);const done=day.meals.filter((m,i)=>ns.meals[i]).length;return Math.round(done/day.meals.length*100)}
function nutritionStatsForWeek(w){const week=NUTRITION.weeks.find(x=>x.week===w);let done=0,total=0,waterDays=0;week.days.forEach(day=>{const ns=nutritionDayState(day.id);day.meals.forEach((m,i)=>{total++;if(ns.meals[i])done++});if(ns.water>=day.target.water)waterDays++});return{done,total,waterDays}}
function renderNutrition(){
  if(!NUTRITION)return;
  const t=NUTRITION.targets.training,r=NUTRITION.targets.rest;
  document.getElementById('nutritionTargets').innerHTML=`<div class="macro"><b>${t.kcal}</b><span>training kcal</span></div><div class="macro"><b>${r.kcal}</b><span>rest kcal</span></div><div class="macro"><b>${t.protein} g</b><span>protein / day</span></div><div class="macro"><b>${t.water.toFixed(1)} L</b><span>training water</span></div>`;
  const sel=document.getElementById('nutritionWeekSelect');
  sel.innerHTML=[1,2,3,4].map(w=>`<option value="${w}" ${w===nutritionWeek?'selected':''}>Week ${w}</option>`).join('');
  const week=NUTRITION.weeks.find(x=>x.week===nutritionWeek);const st=nutritionStatsForWeek(nutritionWeek);const pct=Math.round(st.done/st.total*100);
  document.getElementById('nutritionSummary').innerHTML=`<div class="summary"><b>${pct}%</b><span>meals completed</span></div><div class="summary"><b>${st.done}/${st.total}</b><span>meals checked</span></div><div class="summary"><b>${st.waterDays}/7</b><span>water goal days</span></div>`;
  document.getElementById('nutritionDays').innerHTML=week.days.map((day,idx)=>nutritionDayHTML(day,idx)).join('');
  document.getElementById('nutritionAdjustment').textContent=NUTRITION.profile.adjustment;
  document.getElementById('nutritionTips').innerHTML=NUTRITION.tips.map((x,i)=>`<div class="tipitem"><b>${i+1}</b><span>${x}</span></div>`).join('');
  bindNutritionInputs();
}
function nutritionDayHTML(day,idx){const ns=nutritionDayState(day.id);const p=nutritionDayProgress(day);const open=idx===0?'open':'';return `<article class="nutrition-day ${open}" data-nid="${day.id}"><div class="nutrition-day-head"><div class="nut-daybox">${day.day}</div><div><h4>${day.dayName} · ${day.type}</h4><p>${day.target.kcal} kcal · P ${day.target.protein} g · C ${day.target.carbs} g · F ${day.target.fat} g</p></div><div class="day-progress">${p}%</div></div><div class="nutrition-day-body"><div class="daily-macros"><span class="tag">Protein ${day.target.protein} g</span><span class="tag">Carbs ${day.target.carbs} g</span><span class="tag">Fat ${day.target.fat} g</span><span class="tag">Water ${day.target.water.toFixed(1)} L</span></div>${day.meals.map((m,i)=>`<div class="meal"><input type="checkbox" data-meal="${i}" ${ns.meals[i]?'checked':''}><div><h5>${m.name}</h5><p>${m.text}</p></div><div class="meal-macros">${state.profile?'الميزانية المستهدفة ≈':'~'}${m.kcal} kcal<br>${state.profile?'هدف بروتين ≈':''}${m.protein} g P</div></div>`).join('')}<div class="waterbox"><div><b>Water tracker</b><div class="muted">Goal ${day.target.water.toFixed(1)} L</div></div><div class="waterctrl"><button data-water="minus">−</button><b>${(ns.water||0).toFixed(1)} L</b><button data-water="plus">+</button></div></div></div></article>`}
function bindNutritionInputs(){document.querySelectorAll('.nutrition-day').forEach(card=>{const day=NUTRITION.weeks.flatMap(w=>w.days).find(d=>d.id===card.dataset.nid);const ns=nutritionDayState(day.id);card.querySelector('.nutrition-day-head').onclick=()=>card.classList.toggle('open');card.querySelectorAll('[data-meal]').forEach(cb=>cb.onchange=()=>{ns.meals[+cb.dataset.meal]=cb.checked;save()});card.querySelectorAll('[data-water]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const delta=btn.dataset.water==='plus'?0.25:-0.25;ns.water=Math.max(0,Math.round(((ns.water||0)+delta)*100)/100);save()})})}

function applyTheme(){document.body.classList.toggle('dark',state.theme==='dark')}
document.getElementById('weekSelect').addEventListener('change',e=>{selectedWeek=+e.target.value;save()});
document.getElementById('nutritionWeekSelect').addEventListener('change',e=>{nutritionWeek=+e.target.value;save()});
document.getElementById('backBtn').onclick=()=>showView('homeView');
document.getElementById('completeWorkout').onclick=()=>{if(!currentSession)return;const s=sessState(currentSession.id);s.completed=!s.completed;s.completedAt=s.completed?new Date().toISOString():null;save();toast(s.completed?'Workout completed ✓':'Workout reopened');openWorkout(currentSession.id)};
document.querySelectorAll('.bottomnav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));
document.getElementById('addWeight').onclick=()=>{const date=document.getElementById('weightDate').value,kg=parseFloat(document.getElementById('weightValue').value);if(!date||!isFinite(kg))return toast('Enter date and weight');state.weights=state.weights||[];state.weights=state.weights.filter(x=>x.date!==date);state.weights.push({date,kg});save();document.getElementById('weightValue').value='';toast('Weight saved')};
document.getElementById('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='workout-tracker-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
document.getElementById('importFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state={...blankState(),...JSON.parse(r.result)};selectedWeek=state.selectedWeek||1;save();applyTheme();toast('Backup imported')}catch(err){toast('Invalid backup file')}};r.readAsText(f)};
document.getElementById('resetBtn').onclick=()=>{if(confirm('Reset all workout and weight data?')){state=blankState();selectedWeek=1;save();toast('Data reset')}};
document.getElementById('themeBtn').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';applyTheme();save()};
const today=new Date().toISOString().slice(0,10);document.getElementById('weightDate').value=today;applyTheme();renderHome();renderProgress();renderNutrition();
