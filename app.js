(()=>{"use strict";
const $=id=>document.getElementById(id),DB="runjeet-fresh-v1",GOAL=8000;
let db,state,watch=null,tick=null,lastPeak=0,gravity={x:0,y:0,z:0},lastMotion=0,saveQueue=Promise.resolve(),motionHandler=null,nativeDailySteps=null;
const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const blank=()=>({version:1,profile:null,stepsByDay:{},sessions:[],active:null});
const steps=()=>nativeDailySteps===null?(state.stepsByDay[day()]||0):nativeDailySteps;
const toast=m=>{$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)};
const dbOpen=()=>new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("state");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function save(){saveQueue=saveQueue.catch(()=>{}).then(()=>new Promise((ok,no)=>{state.lastUpdated=new Date().toISOString();let t=db.transaction("state","readwrite");t.objectStore("state").put(state,"main");t.oncomplete=()=>{$("saveStatus").textContent="SAVED ON THIS DEVICE";ok()};t.onerror=()=>{$("saveStatus").textContent="SAVE ISSUE";no(t.error)};}));return saveQueue}
function distance(a,b){const r=6371000,x=Math.PI/180,d1=(b.lat-a.lat)*x,d2=(b.lon-a.lon)*x,q=Math.sin(d1/2)**2+Math.cos(a.lat*x)*Math.cos(b.lat*x)*Math.sin(d2/2)**2;return 2*r*Math.asin(Math.sqrt(Math.min(1,q)))}
const dist=s=>(s?.points||[]).reduce((n,p,i,a)=>i?n+distance(a[i-1],p):0,0);
const elapsed=s=>s?Math.max(0,Math.floor(((s.pausedAt||s.endedAt||Date.now())-s.startedAt-s.pausedMs)/1000)):0;
const time=n=>{n=Math.max(0,Math.floor(n||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
function render(){const n=steps(),s=state.active,d=dist(s),sec=elapsed(s);$("stepSource").textContent=nativeDailySteps===null?"MOTION ESTIMATE":"APPLE PEDOMETER";if(nativeDailySteps!==null){$("motionStatus").textContent="Using iPhone system step count";$("enableMotion").hidden=true;}$("steps").textContent=n.toLocaleString();$("stepProgress").style.width=Math.min(100,n/GOAL*100)+"%";$("stepMessage").textContent=n>=GOAL?"Daily goal reached":(GOAL-n).toLocaleString()+" steps to your goal";$("distance").innerHTML=(d/1000).toFixed(2)+' <small>km</small>';$("activeTime").textContent=time(sec);$("pace").textContent=d>0?time(sec/(d/1000)):"—";$("gpsStatus").textContent=!s?"NOT TRACKING":s.pausedAt?"PAUSED":"TRACKING";$("gpsHeadline").textContent=!s?"Ready when you are":s.pausedAt?"Activity paused":"Recording your activity";$("gpsDetail").textContent=!s?"Start a session to record your route and distance.":s.points.length+" GPS points recorded";$("startBtn").disabled=!!s;$("pauseBtn").disabled=!s;$("finishBtn").disabled=!s;$("pauseBtn").textContent=s?.pausedAt?"RESUME":"PAUSE";$("appStatus").textContent=s?"ACTIVITY LIVE":"READY";$("sessionCount").textContent=state.sessions.length+" SAVED";$("history").innerHTML=state.sessions.length?state.sessions.slice(0,8).map(a=>'<div class="history-item"><div><strong>'+new Date(a.startedAt).toLocaleDateString()+'</strong><small>'+new Date(a.startedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+'</small></div><div class="history-right">'+((a.distanceM||0)/1000).toFixed(2)+' km<small>'+time(a.durationSec)+'</small></div></div>').join(""):'<div class="empty">Your completed activities will appear here.</div>'}
async function addStep(){const k=day();state.stepsByDay[k]=(state.stepsByDay[k]||0)+1;render();try{await save()}catch{toast("Could not save step data")}}
function detectStep(e){
 const now=Date.now();
 if(now-lastMotion<35)return;
 lastMotion=now;
 let a=e.acceleration;
 if(!a||a.x==null){
  const g=e.accelerationIncludingGravity;
  if(!g||g.x==null)return;
  const dt=gravity.last?Math.max(.01,Math.min(.2,(now-gravity.last)/1000)):.02;
  const alpha=Math.exp(-dt/.45);
  gravity.x=alpha*gravity.x+(1-alpha)*g.x;
  gravity.y=alpha*gravity.y+(1-alpha)*g.y;
  gravity.z=alpha*gravity.z+(1-alpha)*g.z;
  gravity.last=now;
  a={x:g.x-gravity.x,y:g.y-gravity.y,z:g.z-gravity.z};
 }
 const mag=Math.hypot(a.x||0,a.y||0,a.z||0);
 detectStep.prev=detectStep.prev||0;
 detectStep.peak=detectStep.peak||0;
 if(mag>detectStep.peak)detectStep.peak=mag;
 const falling=mag<detectStep.prev;
 const peak=detectStep.peak;
 if(falling&&peak>=2.0&&now-(detectStep.lastCandidate||0)>=300){
  detectStep.lastCandidate=now;
  detectStep.candidates=detectStep.candidates||[];
  detectStep.candidates.push(now);
  if(detectStep.candidates.length>8)detectStep.candidates.shift();
  const c=detectStep.candidates,n=c.length;
  if(n>=3){
   const intervals=[c[n-1]-c[n-2],c[n-2]-c[n-3]];
   const avg=(intervals[0]+intervals[1])/2;
   const rhythmic=intervals.every(v=>v>=300&&v<=1200)&&Math.abs(intervals[0]-intervals[1])<=Math.max(180,avg*.30);
   if(rhythmic){
    const confirmed=c[n-1];
    if(detectStep.lastCounted!==confirmed){
     detectStep.lastCounted=confirmed;
     addStep();
    }
   }
  }
  detectStep.peak=0;
 }
 detectStep.prev=mag;
}
async function enableMotion(){try{if(!("DeviceMotionEvent"in window)){toast("Motion sensor unavailable in this browser.");return}if(typeof DeviceMotionEvent.requestPermission==="function"&&await DeviceMotionEvent.requestPermission()!=="granted"){toast("Motion permission not granted.");return}if(motionHandler)window.removeEventListener("devicemotion",motionHandler);motionHandler=detectStep;window.addEventListener("devicemotion",motionHandler,{passive:true});$("motionStatus").textContent="Motion sensor active while app is open";$("stepSource").textContent="DEVICE MOTION";$("enableMotion").textContent="SENSOR ON";$("enableMotion").disabled=true;toast("Step detection enabled. Keep app open while walking.")}catch{toast("Could not enable motion sensor. Check browser permissions.")}}
function startWatch(){if(!navigator.geolocation){toast("GPS unavailable in this browser.");return}watch=navigator.geolocation.watchPosition(async p=>{const c=p.coords,s=state.active;if(!s||s.pausedAt||c.accuracy>60)return;const q={lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,ts:p.timestamp||Date.now()},prev=s.points.at(-1);if(!prev||(q.ts-prev.ts>1500&&distance(prev,q)>2)){s.points.push(q);s.gpsAccuracy=Math.round(c.accuracy);try{await save()}catch{toast("GPS point could not be saved")}render()}},e=>{const m=e.code===1?"Location permission denied. Allow it in browser settings.":e.code===2?"GPS signal unavailable. Move to an open area.":"GPS timed out. Keep trying.";$("gpsDetail").textContent=m;toast(m)},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});if(!tick)tick=setInterval(render,1000)}
function stopWatch(){if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null}if(tick){clearInterval(tick);tick=null}}
async function start(){if(state.active)return;state.active={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),startedAt:Date.now(),pausedAt:null,pausedMs:0,points:[]};try{await save();render();startWatch();toast("GPS activity started")}catch{state.active=null;render();toast("Could not save activity. Check device storage.")}}
async function pause(){const s=state.active;if(!s)return;if(!s.pausedAt){s.pausedAt=Date.now();stopWatch()}else{s.pausedMs+=Date.now()-s.pausedAt;s.pausedAt=null;startWatch()}try{await save()}catch{toast("Could not save activity state")}render()}
async function finish(){const s=state.active;if(!s)return;stopWatch();if(s.pausedAt)s.pausedMs+=Date.now()-s.pausedAt;s.endedAt=Date.now();s.distanceM=dist(s);s.durationSec=elapsed(s);state.sessions.unshift({...s});state.active=null;try{await save();render();toast("Activity saved on this device")}catch{state.active=s;render();toast("Save failed. Activity remains open; try again.")}}
function exportData(){const b=new Blob([JSON.stringify({app:"RunJeet",schema:1,state},null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="runjeet-backup-"+day()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function importData(f){try{const o=JSON.parse(await f.text());if(o.app!=="RunJeet"||o.schema!==1||!o.state?.stepsByDay||!Array.isArray(o.state.sessions))throw Error("schema");for(const [k,v]of Object.entries(o.state.stepsByDay)){if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||!Number.isSafeInteger(v)||v<0)throw Error("steps");state.stepsByDay[k]=Math.max(state.stepsByDay[k]||0,v)}const ids=new Set(state.sessions.map(x=>x.id));for(const x of o.state.sessions){if(!x||typeof x.id!=="string"||!Number.isFinite(x.startedAt)||!Number.isFinite(x.endedAt)||!Array.isArray(x.points))throw Error("session");if(!ids.has(x.id)){state.sessions.push(x);ids.add(x.id)}}state.sessions.sort((a,b)=>(b.endedAt||0)-(a.endedAt||0));await save();render();toast("Backup imported")}catch{toast("Invalid RunJeet backup")} $("importFile").value=""}
async function init(){try{db=await dbOpen();state=await new Promise((ok,no)=>{const r=db.transaction("state").objectStore("state").get("main");r.onsuccess=()=>ok(r.result||blank());r.onerror=()=>no(r.error)});if(!state||state.version!==1||!state.stepsByDay||!Array.isArray(state.sessions))state=blank();if(state.active){state.active.pausedMs=(state.active.pausedMs||0);if(!state.active.pausedAt)state.active.pausedAt=Date.now();$("gpsDetail").textContent="Previous activity recovered in paused state. Resume or finish it."; }await save();render();if(state.profile){$("profileName").value=state.profile.name||"";$("profileEmail").value=state.profile.email||"";$("profileStatus").textContent="PROFILE SAVED"}$("profileForm").onsubmit=async e=>{e.preventDefault();const name=$("profileName").value.trim(),email=$("profileEmail").value.trim();if(!name){toast("Please enter your name");return}state.profile={name,email,createdAt:state.profile?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};try{await save();$("profileStatus").textContent="PROFILE SAVED";toast("Test profile saved on this device")}catch{toast("Profile could not be saved")}};$("enableMotion").onclick=enableMotion;$("startBtn").onclick=start;$("pauseBtn").onclick=pause;$("finishBtn").onclick=finish;$("exportBtn").onclick=exportData;$("importFile").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{})}catch{$("appStatus").textContent="STORAGE ERROR";toast("Local storage unavailable in this browser")}}
window.addEventListener("runjeetNativeSteps",e=>{const n=Number(e.detail?.steps);if(Number.isSafeInteger(n)&&n>=0){nativeDailySteps=n;render();$("stepMessage").textContent="Daily steps from iPhone pedometer";}});
window.addEventListener("pagehide",()=>{stopWatch();if(state?.active&&!state.active.pausedAt){state.active.pausedAt=Date.now();save().catch(()=>{})}});
init();
})();