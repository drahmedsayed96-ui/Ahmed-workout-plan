/* Personalized training + food-planning wizard, v6.
   Stored locally on device. Adult educational estimates, not clinical advice.
   Existing workout, nutrition, weight, and AI coach logs are retained. */
(function() {
  'use strict';
  const seedPlan = PLAN.map(s => ({...s,exercises:s.exercises.map(e=>({...e}))}));
  const GOALS = [
    ['lose','🔥','خسارة الدهون','تقليل دهون الجسم مع الحفاظ على العضلات'],
    ['recomp','⚖️','شد الجسم / إعادة التكوين','بناء العضلات وتقليل الدهون تدريجياً'],
    ['gain','💪','زيادة الكتلة العضلية','زيادة عضلية تدريجية'],
    ['maintain','🌱','المحافظة على الوزن','قوة وصحة ولياقة'],
    ['strength','🏋️','زيادة القوة','تركيز أكبر على الأداء']
  ];
  const DAYS = [['Sun','الأحد'],['Mon','الاثنين'],['Tue','الثلاثاء'],['Wed','الأربعاء'],['Thu','الخميس'],['Fri','الجمعة'],['Sat','السبت']];
  const FOODS = {
    protein:['فراخ','لحمة قليلة الدهن','تونة','سمك','بيض','زبادي يوناني','عدس','فول','جبنة قريش','توفو'],
    fats:['زيت زيتون','مكسرات','أفوكادو','طحينة','زبدة فول سوداني','بذور'],
    carbs:['أرز','شوفان','بطاطس','بطاطا','عيش بلدي','مكرونة','برغل','كينوا'],
    vegetables:['خيار','طماطم','جزر','بروكلي','سبانخ','فلفل','كوسة','خس'],
    fruits:['موز','تفاح','برتقال','فراولة','مانجو','تمر','كيوي','عنب']
  };
  const FOOD_LABELS = {protein:'مصادر البروتين',fats:'الدهون المفضلة',carbs:'الكربوهيدرات',vegetables:'الخضار',fruits:'الفاكهة'};
  const SPLITS = [
    ['auto','✨ اختيار مناسب','حسب عدد الأيام ومستواك'],
    ['regular','🔄 Regular / Full Body','تمرين شامل للجسم'],
    ['upperlower','↕️ Upper / Lower','يوم علوي ويوم سفلي'],
    ['pushpull','⇄ Push / Pull / Legs','دفع وسحب وأرجل'],
    ['arnold','🏆 Arnold Split','صدر/ظهر، كتف/ذراع، أرجل']
  ];
  const key = 'fit-onboarding-v6';
  let draft = null;
  let wizardStep = 0;
  let voiceEnabled = true;
  const root = document.getElementById('personalizeOverlay');
  const inner = document.getElementById('personalizeContent');
  const editButton = document.getElementById('editProfileBtn');
  const profileBadge = document.getElementById('profileBadge');
  const splitLabel = {regular:'Regular / Full Body',upperlower:'Upper / Lower',pushpull:'Push / Pull / Legs',arnold:'Arnold Split'};
  function h(s) {return String(s ?? '').replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
  function n(v,fallback,min,max) { const x=Number(v); return Number.isFinite(x)&&x>=min&&x<=max?x:fallback; }
  function today(){return new Date().toLocaleDateString('en-CA');}
  function speak(msg) {
    if(!voiceEnabled)return;
    try{if(window.CoachBridge&&window.CoachBridge.speakArabic){window.CoachBridge.speakArabic(String(msg));return;}}
    catch(_){}
    try{if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang='ar-EG';u.rate=.95;speechSynthesis.speak(u);}}
    catch(_){}
  }
  window.arabicCoachSpeak=speak;
  function baseProfile() {
    return {goal:'recomp',age:'',sex:'',height:'',weight:'',fat:'',muscle:'',bmr:'',scanDate:today(),
      activity:'light',experience:'beginner',days:['Sat','Mon','Wed'],split:'auto',foods:{
        protein:['فراخ','بيض','زبادي يوناني'],fats:['زيت زيتون','مكسرات'],
        carbs:['أرز','شوفان'],vegetables:['خيار','طماطم'],fruits:['موز','تفاح']
      },inbodyHistory:[]};
  }
  function selected(key,value){return draft[key]===value?'selected':'';}
  function checked(key,value){return (draft[key]||[]).includes(value)?'checked':'';}
  function field(id,label,value,type='number',placeholder='',required=false,extras='') {
    return `<label class="wizard-field"><span>${label}</span><input id="${id}" type="${type}" value="${h(value)}" placeholder="${h(placeholder)}" ${required?'required':''} ${extras}></label>`;
  }
  function card(id,icon,title,description,group='goal'){
    return `<button class="choice-card ${selected(group,id)}" type="button" data-select="${group}:${id}"><b>${icon} ${title}</b><small>${description}</small></button>`;
  }
  function error(msg){const el=document.getElementById('wizardError');el.textContent=msg;el.hidden=false;}
  function renderWizard() {
    const titles=['هدف جسمك','قياساتك و InBody','الأكل اللي بتحبه','أيام التمرين ونظامك','مراجعة خطتك'];
    let body='';
    if(wizardStep===0){
      body=`<p>إيه شكل الجسم أو الهدف اللي حابب توصله؟ اختار هدف واحد، وتقدر تغيره في أي وقت.</p><div class="choice-grid">${GOALS.map(g=>card(...g)).join('')}</div>`;
    } else if(wizardStep===1) {
      body=`<p>اكتب قياساتك. لو معاك InBody سجل الأرقام اللي عليه؛ مش لازم ترفع صورة. بيانات InBody اختيارية، والخطة تقديرية.</p>
      <div class="wizard-fields">
        ${field('pAge','السن (18 سنة أو أكتر)',draft.age,'number','مثال 27',true,'min="18" max="85"')}
        <label class="wizard-field"><span>النوع المستخدم في معادلة الطاقة</span><select id="pSex"><option value="">اختار</option><option value="male" ${draft.sex==='male'?'selected':''}>ذكر</option><option value="female" ${draft.sex==='female'?'selected':''}>أنثى</option><option value="other" ${draft.sex==='other'?'selected':''}>أفضل عدم التحديد (تقدير تقريبي)</option></select></label>
        ${field('pHeight','الطول (سم)',draft.height,'number','مثال 175',true,'min="130" max="220"')}
        ${field('pWeight','الوزن الحالي (كجم)',draft.weight,'number','مثال 78',true,'step="0.1" min="35" max="250"')}
        ${field('pFat','نسبة الدهون % (اختياري)',draft.fat,'number','من تقرير InBody','', 'step="0.1" min="3" max="65"')}
        ${field('pMuscle','كتلة العضلات الهيكلية كجم (اختياري)',draft.muscle,'number','Skeletal Muscle Mass',false,'step="0.1" min="0" max="100"')}
        ${field('pBmr','معدل الأيض الأساسي من InBody (سعر/يوم، اختياري)',draft.bmr,'number','BMR',false,'min="900" max="4000"')}
        ${field('pScan','تاريخ القياس',draft.scanDate,'date')}
        <label class="wizard-field"><span>نشاطك في باقي اليوم</span><select id="pActivity"><option value="low" ${draft.activity==='low'?'selected':''}>قليل / مكتب</option><option value="light" ${draft.activity==='light'?'selected':''}>حركة خفيفة</option><option value="moderate" ${draft.activity==='moderate'?'selected':''}>متوسط</option><option value="high" ${draft.activity==='high'?'selected':''}>عالي</option></select></label>
      </div><p class="wizard-note">هذه النسخة للبالغين فقط. في الحمل أو الرضاعة أو وجود حالة صحية مؤثرة على التغذية، استشر مختص قبل تطبيق التقديرات.</p>`;
    } else if(wizardStep===2){
      body=`<p>حدد أكلك المفضل في كل مجموعة. النظام هيستخدم اختياراتك في اقتراحات الوجبات، وتقدر تغيرها.</p>
        ${Object.entries(FOODS).map(([group,options])=>`<fieldset class="food-group"><legend>${FOOD_LABELS[group]}</legend><div class="food-grid">${options.map(v=>`<label class="food-chip"><input type="checkbox" data-food="${group}" value="${v}" ${(draft.foods[group]||[]).includes(v)?'checked':''}><span>${v}</span></label>`).join('')}</div></fieldset>`).join('')}
        <p class="wizard-note">اختار نوع واحد على الأقل من كل مجموعة. لو عندك حساسية، استبعد المكون تماماً.</p>`;
    } else if(wizardStep===3){
      body=`<p>اختار الأيام اللي تقدر تتمرن فيها أسبوعياً (من 2 إلى 6 أيام)، ومستواك ونظام التمرين المفضل.</p><fieldset class="food-group"><legend>أيام التمرين</legend><div class="days-grid">${DAYS.map(([id,label])=>`<label class="food-chip"><input type="checkbox" data-day value="${id}" ${checked('days',id)}><span>${label}</span></label>`).join('')}</div></fieldset>
      <label class="wizard-field"><span>مستوى الخبرة</span><select id="pExperience"><option value="beginner" ${draft.experience==='beginner'?'selected':''}>مبتدئ</option><option value="intermediate" ${draft.experience==='intermediate'?'selected':''}>متوسط</option><option value="advanced" ${draft.experience==='advanced'?'selected':''}>متقدم</option></select></label>
      <div class="choice-grid">${SPLITS.map(s=>card(s[0],s[1],s[2],'split')).join('')}</div><p class="wizard-note">Arnold مناسب مبدئياً لـ 6 أيام وللمتقدمين. الأنظمة الأخرى بتتظبط حسب أيامك، ومفيش Split واحد أفضل لكل الناس.</p>`;
    } else {
      const split=effectiveSplit(draft);
      const energy=targets(draft);
      body=`<div class="wizard-summary"><h3>خطة مبدئية تناسب هدفك وجدولك</h3>
        <p><b>الهدف:</b> ${GOALS.find(g=>g[0]===draft.goal)?.[2]||'إعادة التكوين'}</p>
        <p><b>التمرين:</b> ${splitLabel[split]} · ${draft.days.length} يوم أسبوعياً</p>
        <p><b>الأيام:</b> ${DAYS.filter(d=>draft.days.includes(d[0])).map(d=>d[1]).join('، ')}</p>
        <p><b>الأكل يوم التمرين:</b> حوالي ${energy.training.kcal} سعرة · ${energy.training.protein} جم بروتين</p>
        <p><b>الأكل يوم الراحة:</b> حوالي ${energy.rest.kcal} سعرة · ${energy.rest.protein} جم بروتين</p>
        <p><b>المصدر:</b> ${draft.bmr?'BMR مدخل من InBody':'معادلة Mifflin-St Jeor التقديرية'}</p>
      </div><p class="wizard-note">الأرقام تقديرية وليست وصفة طبية أو ضماناً لنتيجة. يفضل مراجعة مدرب/أخصائي تغذية خاصة مع الحالات الصحية. المواعيد والأكل قابلين للتعديل.</p>`;
    }
    root.classList.add('show');
    root.setAttribute('aria-hidden','false');
    inner.innerHTML=`<div class="wizard-header"><span class="wizard-overline">المدرب الشخصي بالعربي · خطوة ${wizardStep+1} من 5</span><h2>${titles[wizardStep]}</h2><div class="wizard-progress"><span style="width:${(wizardStep+1)*20}%"></span></div></div>
      <div class="wizard-main">${body}</div><div class="wizard-error" id="wizardError" hidden></div>
      <div class="wizard-buttons"><button id="wizardVoice" type="button" class="secondary" aria-label="تشغيل أو كتم صوت المدرب">${voiceEnabled?'🔊':'🔇'}</button>${wizardStep>0?'<button id="wizardBack" type="button" class="secondary">السابق</button>':''}
      <button id="wizardNext" type="button" class="primary">${wizardStep===4?'إنشاء خطتي ✓':'التالي ←'}</button></div>`;
    inner.querySelectorAll('[data-select]').forEach(el=>el.addEventListener('click',()=>{
      const [field,value]=el.dataset.select.split(':'); draft[field]=value;
      inner.querySelectorAll('[data-select]').forEach(other=>{if(other.dataset.select.startsWith(field+':'))other.classList.toggle('selected',other===el);});
    }));
    document.getElementById('wizardVoice').onclick=()=>{
      voiceEnabled=!voiceEnabled;document.getElementById('wizardVoice').textContent=voiceEnabled?'🔊':'🔇';
      if(voiceEnabled)speak('أنا معاك. كمّل بياناتك علشان نجهز خطتك.');
    };
    const back=document.getElementById('wizardBack');
    if(back)back.onclick=()=>{capture();wizardStep--;renderWizard();};
    document.getElementById('wizardNext').onclick=next;
    const speech=['أهلاً! اختار شكل الجسم أو الهدف اللي عايز توصله.',
      'اكتب وزنك وطولك وسنك. ولو عندك إن بودي، حدّث قياسات الدهون والعضلات.',
      'اختار مصادر البروتين والدهون والكارب والخضار والفاكهة اللي بتحبها.',
      'حدد أيام تدريبك والنظام المفضل. هظبط الخطة حسب الأيام المتاحة.',
      'دي خطتك المبدئية. اضغط إنشاء خطتي وابدأ.'];
    speak(speech[wizardStep]);
  }
  function capture(){
    if(wizardStep===1) {
      [['age','pAge'],['sex','pSex'],['height','pHeight'],['weight','pWeight'],['fat','pFat'],['muscle','pMuscle'],['bmr','pBmr'],['scanDate','pScan'],['activity','pActivity']].forEach(([k,id])=>{
        const el=document.getElementById(id);if(el)draft[k]=el.value.trim();
      });
    } else if (wizardStep===2){
      Object.keys(FOODS).forEach(k=>{draft.foods[k]=Array.from(inner.querySelectorAll('input[data-food="'+k+'"]:checked')).map(e=>e.value);});
    } else if(wizardStep===3){
      draft.days=Array.from(inner.querySelectorAll('input[data-day]:checked')).map(e=>e.value);
      draft.experience=document.getElementById('pExperience').value;
    }
  }
  function validate(){
    if(wizardStep===1){
      if(!Number.isInteger(Number(draft.age))||Number(draft.age)<18||Number(draft.age)>85) return 'ادخل سن صحيح من 18 إلى 85 سنة.';
      if(!draft.sex)return 'اختار النوع المناسب للمعادلة أو أفضل عدم التحديد.';
      if(n(draft.height,0,130,220)===0)return 'ادخل طول من 130 إلى 220 سم.';
      if(n(draft.weight,0,35,250)===0)return 'ادخل وزن من 35 إلى 250 كجم.';
      if(draft.fat!==''&&n(draft.fat,-1,3,65)<0)return 'نسبة الدهون لازم تكون من 3 إلى 65%.';
      if(draft.muscle!==''&&n(draft.muscle,-1,.1,100)<0)return 'راجع رقم كتلة العضلات.';
      if(draft.bmr!==''&&n(draft.bmr,-1,900,4000)<0)return 'راجع معدل الأيض الأساسي من التقرير.';
    }
    if(wizardStep===2&&Object.keys(FOODS).some(k=>!draft.foods[k].length))return 'اختار على الأقل مكون واحد من كل مجموعة غذائية.';
    if(wizardStep===3){
      if(draft.days.length<2||draft.days.length>6)return 'اختار من يومين إلى ست أيام في الأسبوع.';
      if(draft.split==='arnold'&&(draft.days.length<6||draft.experience!=='advanced'))return 'نظام Arnold هنا يحتاج 6 أيام ومستوى متقدم. اختار نظام ثاني أو عدّل بياناتك.';
      if(draft.split==='pushpull'&&draft.days.length<3)return 'نظام Push/Pull/Legs يحتاج على الأقل 3 أيام. اختار Regular لو يومين.';
    }
    return '';
  }
  function next(){
    capture();
    const bad=validate(); if(bad){error(bad);speak(bad);return;}
    if(wizardStep<4){wizardStep++;renderWizard();return;}
    const old=state.profile;
    const history=Array.isArray(old?.inbodyHistory)?old.inbodyHistory.slice():[];
    const item={date:draft.scanDate||today(),weight:Number(draft.weight),
      fat:draft.fat!==''?Number(draft.fat):null,
      muscle:draft.muscle!==''?Number(draft.muscle):null,
      bmr:draft.bmr!==''?Number(draft.bmr):null};
    if(!history.length||JSON.stringify(history[history.length-1])!==JSON.stringify(item))history.push(item);
    draft.inbodyHistory=history.slice(-36);
    state.profile=JSON.parse(JSON.stringify(draft));
    applyProfile();
    save();
    root.classList.remove('show');root.setAttribute('aria-hidden','true');
    localStorage.setItem(key,'yes');
    updateBadge();
    showView('homeView');
    speak('تمام! جهزت برنامجك الأسبوعي، والأكل المفضل حسب بياناتك. ابدأ من جدول التمرين.');
  }
  function effectiveSplit(p){
    const d=p.days.length;
    if(p.split==='arnold'&&d===6&&p.experience==='advanced')return 'arnold';
    if(p.split==='pushpull'&&d>=3)return 'pushpull';
    if(p.split==='upperlower'&&d>=3)return 'upperlower';
    if(p.split==='regular')return 'regular';
    if(d<=2)return 'regular';
    if(d===3)return 'upperlower';
    if(d===4)return 'upperlower';
    if(d>=6&&p.experience==='advanced')return 'arnold';
    return 'pushpull';
  }
  function sessionExercises(w,style,cycle){
    const base=seedPlan.slice(w*4,w*4+4);
    const a=base[0].exercises,b=base[1].exercises,c=base[2].exercises,d=base[3].exercises;
    const from=(list)=>list.filter(Boolean).map(x=>({...x}));
    const menus={
      upperA:()=>from(a),lowerA:()=>from(b),upperB:()=>from(c),lowerB:()=>from(d),
      fullA:()=>from([b[0],a[0],a[1],a[2],b[4],b[5]]),
      fullB:()=>from([d[0],c[0],c[1],c[2],d[4],d[5]]),
      push:()=>from([a[0],a[2],a[4],a[5],c[0],c[3]]),
      pull:()=>from([a[1],a[3],c[1],c[2],c[4],c[5]]),
      legs:()=>from(b),
      chestBack:()=>from([a[0],a[1],c[0],c[1],c[2],c[3]]),
      shouldersArms:()=>from([a[2],a[4],a[5],c[4],c[5],a[3]])
    };
    return menus[style]?menus[style]():menus.fullA();
  }
  function makeTraining(p){
    const split=effectiveSplit(p);
    let days=DAYS.map(x=>x[0]).filter(d=>p.days.includes(d)); if(!days.length)days=['Mon','Wed','Sat'];
    const schemes={
      regular:['fullA','fullB','fullA','fullB','fullA','fullB'],
      upperlower:['upperA','lowerA','upperB','lowerB','upperA','lowerA'],
      pushpull:['push','pull','legs','push','pull','legs'],
      arnold:['chestBack','shouldersArms','legs','chestBack','shouldersArms','legs']
    };
    const names={fullA:'Full Body A',fullB:'Full Body B',upperA:'Upper A',upperB:'Upper B',
      lowerA:'Lower A',lowerB:'Lower B',push:'Push',pull:'Pull',legs:'Legs',
      chestBack:'Chest & Back',shouldersArms:'Shoulders & Arms'};
    const out=[];
    for(let w=0;w<4;w++){
      days.forEach((day,i)=>{
        const style=schemes[split][(w*days.length+i)%schemes[split].length];
        const exercises=sessionExercises(w,style,i);
        out.push({id:`personal_${split}_${w+1}_${day}_${i}`,week:`Week ${w+1}`,
          weekNum:w+1,day,title:names[style],focus:splitLabel[split]+' · '+GOALS.find(g=>g[0]===p.goal)[2],
          exercises:exercises.map(e=>({...e, sets:p.experience==='beginner'?Math.min(e.sets,3):e.sets}))});
      });
    }
    return out;
  }
  function targets(p){
    const w=n(p.weight,75,35,250), ht=n(p.height,175,130,220),age=n(p.age,30,18,85);
    const coefficient=p.sex==='male'?5:p.sex==='female'?-161:-78;
    const measuredBmr=n(p.bmr,0,900,4000);
    const estimate=measuredBmr||(10*w+6.25*ht-5*age+coefficient);
    const activity={low:1.2,light:1.35,moderate:1.5,high:1.65}[p.activity]||1.35;
    const base=estimate*activity;
    const delta={lose:-300,recomp:-120,gain:200,maintain:0,strength:80}[p.goal]||0;
    const floor=p.sex==='female'?1200:1500;
    const average=Math.max(floor,Math.min(4800,Math.round((base+delta)/25)*25));
    const days=p.days.length||3;
    const restKcal=Math.max(floor,Math.round((average-100*days/7)/25)*25);
    const trainingKcal=restKcal+100;
    const protein=Math.round(w*(p.goal==='gain'||p.goal==='recomp'?1.8:1.6));
    const macros=(kcal)=>{
      // Reference amounts are planning estimates, not measured nutrient totals.
      const fat=Math.round(kcal*.27/9), carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
      return {kcal,protein,fat,carbs,water:Math.max(1.5,Math.min(3.5,+(w*.03).toFixed(1)))};
    };
    return {training:macros(trainingKcal),rest:macros(restKcal),bmr:Math.round(estimate),activity};
  }
  function pick(p,k,index){const arr=(p.foods[k]&&p.foods[k].length?p.foods[k]:FOODS[k]);return arr[index%arr.length];}
  function mealsForDay(p,day,goal) {
    const t=day.target;
    const protein=pick(p,'protein',goal),fat=pick(p,'fats',goal),carb=pick(p,'carbs',goal),
      veg=pick(p,'vegetables',goal),fruit=pick(p,'fruits',goal);
    const p2=pick(p,'protein',goal+1),c2=pick(p,'carbs',goal+1),v2=pick(p,'vegetables',goal+1);
    const plan=[
      ['فطار',`${protein} + ${carb} + ${fruit}`,.25],
      ['غدا',`${p2} + ${c2} + ${veg} + ${fat}`,.36],
      ['سناك',`${fruit} + ${p2} (لو ينفع كوجبة خفيفة)`,.14],
      ['عشا',`${protein} + ${carb} + ${v2} + ${fat}`,.25]
    ];
    return plan.map(([name,text,fraction])=>({name,text,kcal:Math.round(t.kcal*fraction),
      protein:Math.round(t.protein*fraction)}));
  }
  function makeNutrition(p){
    const t=targets(p);
    return [1,2,3,4].map(w=>({week:w,days:DAYS.map(([day,dayName],di)=>{
      const training=p.days.includes(day);
      const target=training?t.training:t.rest;
      const result={id:`personal_food_${w}_${day}`,day,dayName,
        type:training?'يوم تمرين':'يوم راحة',target};
      result.meals=mealsForDay(p,result,(w-1)*7+di);
      return result;
    })}));
  }
  function applyProfile(){
    if(!state.profile)return;
    const p=state.profile;
    const sessions=makeTraining(p);
    PLAN.splice(0,PLAN.length,...sessions);
    const target=targets(p);
    NUTRITION.weeks=makeNutrition(p);
    NUTRITION.targets.training=target.training;
    NUTRITION.targets.rest=target.rest;
    NUTRITION.profile.adjustment='السعرات والماكروز تقديرات أولية للبالغين وليست علاجاً. الوجبات أمثلة حسب تفضيلاتك، والكميات لازم تتظبط حسب احتياجاتك. حدث InBody كل 4–8 أسابيع وعدّل الخطة حسب تطورك.';
    NUTRITION.tips=[
      'حاول توزع البروتين على وجبات اليوم.',
      'يوم التمرين فيه طاقة وكربوهيدرات أكثر قليلاً من يوم الراحة.',
      'اشرب ماء بانتظام وأدخل خضار وفاكهة متنوعة.',
      'ابدأ بأوزان تناسب مستواك، واتعلم الحركات مع مدرب عند اللزوم.',
      'ملخص الطاقة تقريبي. استشر أخصائي تغذية لو عندك حالة صحية أو احتياج خاص.'
    ];
    window.PERSONAL_PLAN={split:effectiveSplit(p),target};
    updateBadge();
  }
  function updateBadge(){
    if(!state.profile){profileBadge.textContent='جهّز خطتك';return;}
    const p=state.profile,split=effectiveSplit(p);
    profileBadge.textContent=GOALS.find(g=>g[0]===p.goal)[2]+' · '+splitLabel[split]+' · '+p.days.length+' أيام';
    document.getElementById('heroWeight').textContent=h(p.weight)+' kg';
    document.getElementById('heroBodyFat').textContent=p.fat!==''?h(p.fat)+'% body fat':'InBody optional';
    document.getElementById('heroGoal').textContent=GOALS.find(g=>g[0]===p.goal)[2];
  }
  function openWizard(){
    draft=JSON.parse(JSON.stringify(state.profile||baseProfile()));
    if(!draft.foods)draft.foods=baseProfile().foods;
    wizardStep=0;
    renderWizard();
  }
  window.openPersonalizedSetup=openWizard;
  editButton.addEventListener('click',openWizard);
  document.getElementById('editInbodyBtn').addEventListener('click',()=>{
    openWizard();wizardStep=1;renderWizard();
  });
  if(state.profile&&n(state.profile.weight,0,35,250)>0){
    applyProfile();renderHome();renderProgress();renderNutrition();
  } else {
    // First launch requires adult data before personalized nutritional estimates.
    openWizard();
  }
  // Keep history accessible without transmitting personal body composition data.
  const originalRenderProgress=renderProgress;
  renderProgress=function(){
    originalRenderProgress();
    const el=document.getElementById('inbodyHistory');
    const rows=(state.profile?.inbodyHistory||[]).slice(-8).reverse();
    el.innerHTML=rows.length?rows.map(r=>`<div class="weightitem"><span>${h(r.date)} — ${h(r.weight)} kg</span><b>${r.fat==null?'':h(r.fat)+'% دهون · '}${r.muscle==null?'':h(r.muscle)+' kg عضلات'}</b></div>`).join(''):'<p class="muted">لم يتم إدخال بيانات InBody بعد.</p>';
  };
  renderProgress();
})();
