(() => {
"use strict";
const KEY={plan:"fb_plan_v1",recent:"fb_recent_v1",progress:"fb_progress_v1"};
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(_){return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let recipes=[],timer=0,tick=null,running=false,handRecipe=null,step=0;
function init(data){
 recipes=(Array.isArray(data)?data:[]).filter(r=>r&&r.name&&Array.isArray(r.ingredients)&&Array.isArray(r.steps)).map(r=>({...r,minutes:Number(r.minutes)||0,servings:Math.max(1,Number(r.servings)||2)}));
 if(document.body.dataset.page!=="tools"||!recipes.length||document.getElementById("fbKitchenTools"))return;
 const css=document.createElement("style");css.textContent=[
 "#fbKitchenTools{padding:28px 5%;max-width:1240px;margin:auto;color:var(--text,#222)}",
 "#fbKitchenTools .fbgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}",
 "#fbKitchenTools .fbcard{padding:18px;border:1px solid #e9c9b3;border-radius:18px;background:var(--card-bg,#fff);min-width:0}",
 "#fbKitchenTools h2{font-size:clamp(24px,4vw,34px);margin:0 0 8px}#fbKitchenTools h3{margin:0 0 8px;font-size:18px}",
 "#fbKitchenTools p{font-size:13px;line-height:1.55;color:var(--muted,#666);margin:0 0 12px}",
 "#fbKitchenTools label{display:block;font-weight:700;font-size:13px;margin:9px 0 5px}",
 "#fbKitchenTools input,#fbKitchenTools select{box-sizing:border-box;width:100%;padding:10px;border:1px solid #bbb;border-radius:9px;background:var(--input-bg,#fff);color:var(--text,#222);font:inherit;font-size:14px}",
 "#fbKitchenTools button{padding:10px 12px;border:0;border-radius:9px;background:#e85d04;color:white;font-weight:800;cursor:pointer;font:inherit;font-size:13px}",
 "#fbKitchenTools button.secondary{background:var(--soft-bg,#f3f3f3);color:var(--text,#222);border:1px solid #ccc}",
 "#fbKitchenTools button:focus-visible,#fbKitchenTools input:focus-visible,#fbKitchenTools select:focus-visible{outline:3px solid #f6a35c;outline-offset:2px}",
 "#fbKitchenTools .fbrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}",
 "#fbKitchenTools .fbresults{display:grid;gap:8px;margin-top:12px}",
 "#fbKitchenTools .fbresult{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #ddd;border-radius:10px;padding:10px}",
 "#fbKitchenTools .fbresult strong,#fbKitchenTools .fbresult small{display:block}#fbKitchenTools .fbresult small{font-size:11px;color:var(--muted,#666);margin-top:3px}",
 "#fbKitchenTools .fbtime{font-size:36px;font-weight:900;font-variant-numeric:tabular-nums;margin:12px 0}",
 "#fbKitchenTools .fbstep{font-size:19px;line-height:1.65;padding:16px;border-radius:12px;background:var(--soft-bg,#f4f4f4);min-height:80px}",
 "#fbKitchenTools .fbbar{height:7px;background:#ddd;border-radius:9px;margin:10px 0;overflow:hidden}#fbKitchenTools .fbbar span{display:block;height:100%;background:#e85d04;width:0}",
 "#fbKitchenTools .fbday{border:1px solid #ddd;border-radius:10px;padding:10px;min-width:0}",
 "#fbKitchenTools .fbplan{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
 "#fbKitchenTools .fbcheck{display:flex;gap:8px;align-items:flex-start;font-weight:400;margin:8px 0}#fbKitchenTools .fbcheck input{width:auto;margin-top:3px}",
 "#fbKitchenTools .fbnote{padding:10px;border-radius:10px;background:var(--soft-bg,#f4f4f4);font-size:13px;line-height:1.55;margin:8px 0}",
 "html[data-theme=dark] #fbKitchenTools .fbcard{background:#211d19;border-color:#59402f}html[data-theme=dark] #fbKitchenTools input,html[data-theme=dark] #fbKitchenTools select{background:#171310;color:#fff5ed;border-color:#655448}html[data-theme=dark] #fbKitchenTools .fbstep,html[data-theme=dark] #fbKitchenTools .fbnote{background:#302820}",
 "@media(max-width:720px){#fbKitchenTools .fbgrid,#fbKitchenTools .fbplan{grid-template-columns:1fr}#fbKitchenTools .fbcard{padding:14px}}"
 ].join("");document.head.appendChild(css);
 const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
 let html='<section id="fbKitchenTools"><header style="margin-bottom:18px"><h2>👩‍🍳 Your Kitchen Toolkit</h2><p>Practical cooking helpers. Plans and progress are stored only in this browser; no account or database is needed.</p></header><div class="fbgrid">';
 html+='<article class="fbcard"><h3>⏱️ Cooking Timer</h3><p>Set a countdown for any cooking step.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label for="fbMin">Minutes</label><input id="fbMin" type="number" min="0" max="999" value="5"></div><div><label for="fbSec">Seconds</label><input id="fbSec" type="number" min="0" max="59" value="0"></div></div><div class="fbtime" id="fbTime" role="timer">05:00</div><div class="fbrow"><button id="fbStart">Start timer</button><button id="fbReset" class="secondary">Reset</button></div><p id="fbTimerStatus" aria-live="polite">Timer ready.</p></article>';
 html+='<article class="fbcard"><h3>📅 Weekly Meal Planner</h3><p>Pick meals for the week and save your plan on this device.</p><div class="fbplan">'+days.map((d,i)=>'<div class="fbday"><strong>'+d+'</strong>'+["Breakfast","Lunch","Dinner"].map(m=>'<label for="fbp'+i+m+'">'+m+'</label><select id="fbp'+i+m+'" data-day="'+i+'" data-meal="'+m+'"><option value="">Choose recipe</option></select>').join("")+'</div>').join("")+'</div><div class="fbrow"><button id="fbSavePlan">Save plan</button><button id="fbClearPlan" class="secondary">Clear plan</button></div><p id="fbPlanStatus" aria-live="polite">Changes save when you tap Save.</p></article>';
 html+='<article class="fbcard"><h3>🧑‍🍳 Hands-Free Cooking Mode</h3><p>Read one large step at a time, with optional read-aloud.</p><label for="fbHandsRecipe">Recipe</label><select id="fbHandsRecipe"></select><div class="fbbar"><span id="fbHandsBar"></span></div><p id="fbHandsCount">Choose a recipe.</p><div class="fbstep" id="fbHandsStep">Your step will appear here.</div><div class="fbrow"><button id="fbPrev" class="secondary">Previous</button><button id="fbNext">Next step</button><button id="fbSpeak" class="secondary">🔊 Read step</button><button id="fbStopSpeak" class="secondary">■ Stop reading</button><button id="fbDone" class="secondary">Mark step done</button></div><p id="fbHandsStatus" aria-live="polite"></p></article>';
 html+='<article class="fbcard"><h3>🔎 Cuisine & Cooking-Time Filters</h3><p>Filter existing recipes by category and maximum cooking time.</p><label for="fbCuisine">Cuisine / category</label><select id="fbCuisine"><option value="">All categories</option></select><label for="fbMax">Maximum time</label><select id="fbMax"><option value="0">Any time</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select><div class="fbrow"><button id="fbFilter">Find recipes</button></div><div id="fbFilterResults" class="fbresults"></div></article>';
 html+='<article class="fbcard"><h3>🕘 Recently Viewed</h3><p>Reopen recipes you viewed on this device.</p><div id="fbRecent" class="fbresults"></div><div class="fbrow"><button id="fbClearRecent" class="secondary">Clear history</button></div></article>';
 html+='<article class="fbcard"><h3>✅ Cooking Progress Tracker</h3><p>Tick off steps and resume later. Progress is saved per recipe on this device.</p><label for="fbProgressRecipe">Recipe</label><select id="fbProgressRecipe"></select><div id="fbProgressSteps"></div><div class="fbrow"><button id="fbResetProgress" class="secondary">Reset progress</button></div><p id="fbProgressStatus" aria-live="polite"></p></article>';
 const wrap=document.createElement("div");wrap.innerHTML=html;const target=document.getElementById("fbToolsMount");if(!target)return;target.appendChild(wrap.firstElementChild);
 const recipeByName=name=>recipes.find(r=>r.name===name);
 const populate=el=>{el.innerHTML='<option value="">Choose a recipe</option>'+recipes.map(r=>'<option value="'+esc(r.name)+'">'+esc(r.name)+'</option>').join("")};
 [...new Set(recipes.map(r=>r.category).filter(Boolean))].sort().forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;document.getElementById("fbCuisine").appendChild(o)});
 document.querySelectorAll("#fbKitchenTools [data-day]").forEach(s=>recipes.forEach(r=>{const o=document.createElement("option");o.value=r.name;o.textContent=r.name;s.appendChild(o)}));
 const progress=()=>{const p=read(KEY.progress,{});return p&&typeof p==="object"?p:{}};
 const setDone=(name,i,val)=>{const p=progress();if(!Array.isArray(p[name]))p[name]=[];p[name][i]=val;write(KEY.progress,p);renderProgress();renderHands()};
 const recent=()=>Array.isArray(read(KEY.recent,[]))?read(KEY.recent,[]):[];
 const remember=name=>{if(!name)return;write(KEY.recent,[name,...recent().filter(n=>n!==name)].slice(0,8));renderRecent()};
 const openMain=r=>{if(!r)return;remember(r.name);window.location.href="./index.html?recipe="+encodeURIComponent(r.name)};
 function renderRecent(){const host=document.getElementById("fbRecent");const valid=recent().filter(n=>recipeByName(n));host.innerHTML=valid.length?valid.map(n=>{const r=recipeByName(n);return '<div class="fbresult"><div><strong>'+esc(r.name)+'</strong><small>'+esc(r.category||"Recipe")+' · '+(r.minutes||"Time varies")+' min</small></div><button data-open="'+esc(r.name)+'">Open</button></div>'}).join(""):'<p>No recently viewed recipes yet.</p>'}
 document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#grid .view");if(b){const t=b.closest(".card")?.querySelector("h3");if(t)remember(t.textContent.trim())}},true);
 document.getElementById("fbKitchenTools").addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("button[data-open]");if(b)openMain(recipeByName(b.dataset.open))});
 function renderFilter(){const c=document.getElementById("fbCuisine").value,m=Number(document.getElementById("fbMax").value);const list=recipes.filter(r=>(!c||r.category===c)&&(!m||(r.minutes>0&&r.minutes<=m))).slice(0,8);document.getElementById("fbFilterResults").innerHTML=list.length?list.map(r=>'<div class="fbresult"><div><strong>'+esc(r.name)+'</strong><small>'+esc(r.category||"Recipe")+' · '+(r.minutes?r.minutes+" min":"Time not listed")+'</small></div><button data-open="'+esc(r.name)+'">View</button></div>').join(""):"<p>No matches. Try a longer time or another category.</p>"}
 const pricey=["prawn","shrimp","crab","lobster","salmon","steak","beef","mutton","lamb","pistachio","saffron","cashew","almond","walnut"];
 const textOf=r=>[r.name,r.description,...(r.ingredients||[])].join(" ").toLowerCase();
 const score=r=>pantry.filter(w=>textOf(r).includes(w)).length*2-pricey.filter(w=>textOf(r).includes(w)).length*4-Math.max(0,(r.ingredients||[]).length-10)*.25;
 function renderHands(){const r=handRecipe,steps=r&&Array.isArray(r.steps)?r.steps:[];document.getElementById("fbHandsStep").textContent=steps.length?steps[step]:"Choose a recipe to begin.";document.getElementById("fbPrev").disabled=!steps.length||step===0;document.getElementById("fbNext").disabled=!steps.length;document.getElementById("fbNext").textContent=steps.length&&step===steps.length-1?"Finish recipe":"Next step";const done=r?(progress()[r.name]||[]).filter(Boolean).length:0;document.getElementById("fbHandsBar").style.width=(steps.length?Math.round(done/steps.length*100):0)+"%";document.getElementById("fbHandsCount").textContent=r?"Step "+(step+1)+" of "+steps.length+" · "+done+" completed":"Choose a recipe.";document.getElementById("fbHandsStatus").textContent=r&&((progress()[r.name]||[])[step])?"This step is marked complete.":""}
 document.getElementById("fbHandsRecipe").addEventListener("change",e=>{handRecipe=recipeByName(e.target.value);step=0;renderHands()});
 document.getElementById("fbPrev").addEventListener("click",()=>{step=Math.max(0,step-1);renderHands()});
 document.getElementById("fbNext").addEventListener("click",()=>{if(!handRecipe)return;setDone(handRecipe.name,step,true);if(step<handRecipe.steps.length-1)step++;renderHands()});
 document.getElementById("fbDone").addEventListener("click",()=>{if(handRecipe)setDone(handRecipe.name,step,!((progress()[handRecipe.name]||[])[step]))});
 const speakStatus=document.getElementById("fbHandsStatus");
 const stopSpeech=()=>{try{if("speechSynthesis" in window)window.speechSynthesis.cancel()}catch(_){}};
 document.getElementById("fbSpeak").addEventListener("click",()=>{
   if(!handRecipe||!Array.isArray(handRecipe.steps)||!handRecipe.steps[step]){
     speakStatus.textContent="Choose a recipe first, then select a step to read aloud.";
     return;
   }
   if(!("speechSynthesis" in window)||typeof window.SpeechSynthesisUtterance==="undefined"){
     speakStatus.textContent="Read-aloud is not available in this browser. You can still read the large step shown above.";
     return;
   }
   try{
     const synth=window.speechSynthesis;
     synth.cancel();
     const utterance=new SpeechSynthesisUtterance("Step "+(step+1)+". "+handRecipe.steps[step]);
     utterance.lang=(navigator.language||"en-IN");
     utterance.rate=0.92;
     utterance.onstart=()=>{speakStatus.textContent="Reading this step aloud…";};
     utterance.onend=()=>{speakStatus.textContent="Finished reading this step.";};
     utterance.onerror=(event)=>{
       speakStatus.textContent=event&&event.error==="not-allowed"
         ?"Your browser blocked speech. Tap Read step again and check your device's text-to-speech settings."
         :"No speech audio was produced. Check media volume and your device's text-to-speech engine, then try again.";
     };
     synth.resume();
     synth.speak(utterance);
     speakStatus.textContent="Preparing audio… If you hear nothing, check media volume and text-to-speech settings.";
   }catch(error){
     speakStatus.textContent="Could not start read-aloud. Check browser support and your device's text-to-speech settings.";
   }
 });
 document.getElementById("fbStopSpeak").addEventListener("click",()=>{stopSpeech();speakStatus.textContent="Read-aloud stopped.";});
 function renderProgress(){const name=document.getElementById("fbProgressRecipe").value,r=recipeByName(name),host=document.getElementById("fbProgressSteps");if(!r){host.innerHTML="";return}const done=progress()[name]||[];host.innerHTML=(r.steps||[]).map((s,i)=>'<label class="fbcheck"><input type="checkbox" data-step="'+i+'" '+(done[i]?"checked":"")+'><span>'+esc(s)+'</span></label>').join("");document.getElementById("fbProgressStatus").textContent=done.filter(Boolean).length+" of "+r.steps.length+" steps completed."}
 document.getElementById("fbProgressRecipe").addEventListener("change",renderProgress);
 document.getElementById("fbProgressSteps").addEventListener("change",e=>{const b=e.target.closest("input[data-step]"),name=document.getElementById("fbProgressRecipe").value;if(b&&name)setDone(name,Number(b.dataset.step),b.checked)});
 document.getElementById("fbResetProgress").addEventListener("click",()=>{const name=document.getElementById("fbProgressRecipe").value;if(name){const p=progress();delete p[name];write(KEY.progress,p);renderProgress();renderHands()}});
 document.getElementById("fbClearRecent").addEventListener("click",()=>{try{localStorage.removeItem(KEY.recent)}catch(_){}renderRecent()});
 document.getElementById("fbSavePlan").addEventListener("click",()=>{const p={};document.querySelectorAll("#fbKitchenTools [data-day]").forEach(s=>p[s.dataset.day+"-"+s.dataset.meal]=s.value);document.getElementById("fbPlanStatus").textContent=write(KEY.plan,p)?"Weekly plan saved on this device.":"Could not save; browser storage may be disabled or full."});
 document.getElementById("fbClearPlan").addEventListener("click",()=>{document.querySelectorAll("#fbKitchenTools [data-day]").forEach(s=>s.value="");try{localStorage.removeItem(KEY.plan)}catch(_){}document.getElementById("fbPlanStatus").textContent="Weekly plan cleared."});
 const saved=read(KEY.plan,{});document.querySelectorAll("#fbKitchenTools [data-day]").forEach(s=>{const v=saved[s.dataset.day+"-"+s.dataset.meal];if(v&&[...s.options].some(o=>o.value===v))s.value=v});
 function showTimer(){document.getElementById("fbTime").textContent=String(Math.floor(timer/60)).padStart(2,"0")+":"+String(timer%60).padStart(2,"0")}
 function stopTimer(){if(tick!==null)clearInterval(tick);tick=null;running=false;document.getElementById("fbStart").textContent="Start timer"}
 document.getElementById("fbStart").addEventListener("click",()=>{if(running){stopTimer();document.getElementById("fbTimerStatus").textContent="Timer paused.";return}if(timer<=0){const m=Number(document.getElementById("fbMin").value),s=Number(document.getElementById("fbSec").value);if(!Number.isFinite(m)||!Number.isFinite(s)||m<0||m>999||s<0||s>59||Math.floor(m)*60+Math.floor(s)<=0){document.getElementById("fbTimerStatus").textContent="Enter a time greater than zero; seconds must be 0–59.";return}timer=Math.floor(m)*60+Math.floor(s)}running=true;document.getElementById("fbStart").textContent="Pause timer";document.getElementById("fbTimerStatus").textContent="Timer running.";showTimer();tick=setInterval(()=>{timer=Math.max(0,timer-1);showTimer();if(!timer){stopTimer();document.getElementById("fbTimerStatus").textContent="⏰ Time is up! Check your food safely.";try{const C=window.AudioContext||window.webkitAudioContext;if(C){const c=new C(),o=c.createOscillator();o.connect(c.destination);o.frequency.value=880;o.start();o.stop(c.currentTime+.3);o.onended=()=>c.close()}}catch(_){}}},1000)});
 document.getElementById("fbReset").addEventListener("click",()=>{stopTimer();timer=0;document.getElementById("fbMin").value="5";document.getElementById("fbSec").value="0";showTimer();document.getElementById("fbTimerStatus").textContent="Timer reset."});
 document.querySelectorAll("#fbKitchenTools [data-day]").forEach(s=>s.addEventListener("change",()=>document.getElementById("fbPlanStatus").textContent="Unsaved changes. Tap Save plan."));
}
fetch("./recipes.json").then(r=>{if(!r.ok)throw Error("recipes unavailable");return r.json()}).then(init).catch(e=>console.warn("FestiBites toolkit not loaded; existing recipe page remains available.",e));
})();