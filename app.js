(()=>{"use strict";
const $=id=>document.getElementById(id),DB="runjeet-fresh-v1",GOAL=8000;
let db,state,watch=null,tick=null,lastPeak=0,gravity={x:0,y:0,z:0},lastMotion=0,saveQueue=Promise.resolve(),motionHandler=null,nativeDailySteps=null,nativeStepSource=null,nativeHealthTotals=null,pendingNativeRoutePoints=[],pendingNativeHealthWorkouts=null;
const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const blank=()=>({version:1,profile:null,stepsByDay:{},nativeStepsByDay:{},sessions:[],appleHealthWorkouts:[],active:null});
const steps=()=>nativeDailySteps!==null?nativeDailySteps:(state.nativeStepsByDay?.[day()]?.count??state.stepsByDay[day()]??0);
const toast=m=>{$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)};
const dbOpen=()=>new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("state");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function save(){saveQueue=saveQueue.catch(()=>{}).then(()=>new Promise((ok,no)=>{state.lastUpdated=new Date().toISOString();let t=db.transaction("state","readwrite");t.objectStore("state").put(state,"main");t.oncomplete=()=>{$("saveStatus").textContent="SAVED ON THIS DEVICE";ok()};t.onerror=()=>{$("saveStatus").textContent="SAVE ISSUE";no(t.error)};}));return saveQueue}
function distance(a,b){const r=6371000,x=Math.PI/180,d1=(b.lat-a.lat)*x,d2=(b.lon-a.lon)*x,q=Math.sin(d1/2)**2+Math.cos(a.lat*x)*Math.cos(b.lat*x)*Math.sin(d2/2)**2;return 2*r*Math.asin(Math.sqrt(Math.min(1,q)))}
function usableRoutePoint(p,previous){
 if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||!Number.isFinite(p.ts))return false;
 if(Math.abs(p.lat)>90||Math.abs(p.lon)>180||(Number.isFinite(p.accuracy)&&p.accuracy>60))return false;
 if(!previous)return true;
 const seconds=(p.ts-previous.ts)/1000;
 if(seconds<=0)return false;
 if(seconds<1.5&&distance(previous,p)<=2)return false;
 if(seconds>=1&&distance(previous,p)/seconds>12)return false;
 return true;
}
function appendRoutePoint(points,p){
 const previous=points.at(-1);
 if(!usableRoutePoint(p,previous))return false;
 points.push({lat:p.lat,lon:p.lon,accuracy:p.accuracy,ts:p.ts});
 return true;
}
const cleanRoutePoints=points=>(points||[]).reduce((out,p)=>{appendRoutePoint(out,p);return out},[]);
const dist=s=>cleanRoutePoints(s?.points).reduce((n,p,i,a)=>i?n+distance(a[i-1],p):0,0);
const elapsed=s=>s?Math.max(0,Math.floor(((s.pausedAt||s.endedAt||Date.now())-s.startedAt-s.pausedMs)/1000)):0;
const time=n=>{n=Math.max(0,Math.floor(n||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
let routeMap=null,routeLine=null,routeMarkers=null;
function drawRoute(s){
 const points=s?.points||[],host=$("routeCanvas"),count=$("routePointCount");
 count.textContent=points.length+" GPS POINTS";
 if(!points.length){if(routeMap){routeMap.remove();routeMap=null;routeLine=null;routeMarkers=null;}host.innerHTML='<div class="route-empty">Your recorded route will appear here.</div>';return;}
 const valid=points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
 if(!valid.length)return;
 if(!window.L){drawRouteFallback(valid,host);return;}
 if(!routeMap){
  host.innerHTML="";
  routeMap=L.map(host,{zoomControl:true,scrollWheelZoom:false}).setView([valid[0].lat,valid[0].lon],16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(routeMap);
  routeLine=L.polyline([],{color:"#d9ff43",weight:5,opacity:.95,lineCap:"round",lineJoin:"round"}).addTo(routeMap);
  routeMarkers=L.layerGroup().addTo(routeMap);
 }
 const latlngs=valid.map(p=>[p.lat,p.lon]);
 routeLine.setLatLngs(latlngs);routeMarkers.clearLayers();
 L.circleMarker(latlngs[0],{radius:6,color:"#11130d",weight:2,fillColor:"#f4f5ed",fillOpacity:1}).addTo(routeMarkers).bindTooltip("START");
 L.circleMarker(latlngs[latlngs.length-1],{radius:7,color:"#11130d",weight:2,fillColor:"#d9ff43",fillOpacity:1}).addTo(routeMarkers).bindTooltip("LATEST");
 if(latlngs.length>1)routeMap.fitBounds(routeLine.getBounds().pad(.15),{animate:false});else routeMap.setView(latlngs[0],17);
 setTimeout(()=>routeMap.invalidateSize(),50);
}
function drawRouteFallback(points,host){
 const lats=points.map(p=>p.lat),lons=points.map(p=>p.lon),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons),midLat=(minLat+maxLat)/2,cos=Math.max(.01,Math.cos(midLat*Math.PI/180)),dx=Math.max((maxLon-minLon)*cos,.00001),dy=Math.max(maxLat-minLat,.00001),scale=Math.min(270/dx,170/dy),ox=(320-dx*scale)/2,oy=(220-dy*scale)/2,coords=points.map(p=>({x:25+ox+(p.lon-minLon)*cos*scale,y:25+oy+(maxLat-p.lat)*scale})),path=coords.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" "),a=coords[0],b=coords[coords.length-1];
 host.innerHTML='<svg viewBox="0 0 320 220" role="img" aria-label="Recorded GPS route"><path d="'+path+'" fill="none" stroke="#d9ff43" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+a.x+'" cy="'+a.y+'" r="6" fill="#f4f5ed" stroke="#11130d" stroke-width="2"/><circle cx="'+b.x+'" cy="'+b.y+'" r="7" fill="#d9ff43" stroke="#11130d" stroke-width="2"/></svg>';
}
let selectedActivity="Outdoor Walk";
function setTab(name){document.querySelectorAll(".app-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));$("summaryScreen").hidden=name!=="summary";$("workoutScreen").hidden=name!=="workout";}
function refreshProfileUI(){const p=state.profile,signed=!!p?.signedIn;$("profileStatus").textContent=signed?"SIGNED IN ON THIS DEVICE":p?"SIGNED OUT":"SIGN IN REQUIRED";$("welcomeName").textContent=signed?"Welcome back, "+p.name:"Welcome to RunJeet";$("profileSummary").textContent=signed?[(p.age?p.age+" yrs":null),(p.heightCm?p.heightCm+" cm":null),(p.weightKg?p.weightKg+" kg":null)].filter(Boolean).join(" • ")||"Your personal fitness journey": "Set up your personal fitness profile";$("profileAvatar").src=p?.photo||"icon.svg";$("dashboardAvatar").src=p?.photo||"icon.svg";$("dashboardGreeting").textContent=signed?"Hello, "+p.name:"Welcome to RunJeet";$("dashboardGoal").textContent=signed?(p.goal||p.purpose||"Every step moves you forward."):"Every step moves you forward."; $("profileDetails").open=!signed;$("profileSave").textContent=signed?"UPDATE MY PROFILE":"SAVE PROFILE & SIGN IN";$("signOutBtn").hidden=!signed;$("profileGoal").setAttribute("title",p?.goal||"");}
function estimateCalories(distanceM){const weight=Number(state.profile?.weightKg);return Number.isFinite(weight)&&weight>=30&&weight<=250?Math.round(weight*(Math.max(0,distanceM)/1000)*0.5):null;}
function dayOf(timestamp){const d=new Date(timestamp);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function todayTotals(){const today=day(),done=state.sessions.filter(a=>dayOf(a.startedAt)===today),active=state.active&&dayOf(state.active.startedAt)===today?state.active:null;const distanceM=done.reduce((v,a)=>v+(a.distanceM||0),0)+(active?dist(active):0);const calories=done.reduce((v,a)=>v+(Number.isFinite(a.activeCalories)?a.activeCalories:0),0)+(active?(estimateCalories(dist(active))||0):0);return nativeHealthTotals?{distanceM:nativeHealthTotals.distanceMeters,calories:nativeHealthTotals.activeCalories}:{distanceM,calories};}
function render(){const n=steps(),s=state.active,d=dist(s),sec=elapsed(s),weight=Number(state.profile?.weightKg),kcal=estimateCalories(d),totals=todayTotals();const stepPct=Math.min(100,n/GOAL*100),distancePct=Math.min(100,totals.distanceM/5000*100),caloriePct=Math.min(100,totals.calories/300*100);$("stepsRing").style.setProperty("--progress",stepPct*3.6+"deg");$("distanceRing").style.setProperty("--progress",distancePct*3.6+"deg");$("calorieRing").style.setProperty("--progress",caloriePct*3.6+"deg");$("ringSteps").textContent=Math.round(stepPct)+"%";$("ringDistance").textContent=Math.round(distancePct)+"%";$("ringCalories").textContent=nativeHealthTotals||Number.isFinite(weight)&&weight>=30&&weight<=250?Math.round(caloriePct)+"%":"—";$("ringStepValue").textContent=n.toLocaleString()+" / 8,000";$("ringDistanceValue").textContent=(totals.distanceM/1000).toFixed(2)+" / 5 km";$("ringCalorieValue").textContent=weight<30||weight>250?"Set weight":totals.calories+" / 300 kcal";$("calories").textContent=nativeHealthTotals?Math.round(nativeHealthTotals.activeCalories).toLocaleString():(kcal===null?"—":kcal.toLocaleString());$("calorieNote").textContent=nativeHealthTotals?"Apple Health daily active energy":(kcal===null?"Enter weight for an estimate":"Current activity estimate");$("stepSource").textContent=nativeDailySteps===null?"DEVICE SYNC NEEDED":(nativeStepSource||"SYSTEM PEDOMETER");if(nativeDailySteps!==null){$("motionStatus").textContent="Using iPhone system step count";$("enableMotion").hidden=true;}$("steps").textContent=n.toLocaleString();$("stepProgress").style.width=Math.min(100,n/GOAL*100)+"%";$("stepMessage").textContent=n>=GOAL?"Daily goal reached":(GOAL-n).toLocaleString()+" steps to your goal";$("distance").innerHTML=(totals.distanceM/1000).toFixed(2)+' <small>km</small>';$("activeTime").textContent=time(sec);$("pace").textContent=d>0?time(sec/(d/1000)):"—";$("gpsStatus").textContent=!s?"NOT TRACKING":s.pausedAt?"PAUSED":"TRACKING";$("gpsHeadline").textContent=!s?"Ready when you are":s.pausedAt?((s.activityType||"Activity")+" paused"):((s.activityType||"Activity")+" in progress");$("gpsDetail").textContent=!s?"Start a session to record your route and distance.":s.points.length+" GPS points recorded • "+(d/1000).toFixed(2)+" km so far";$("liveWorkoutType").textContent=s?(s.activityType||"Activity"):"No activity started";$("liveWorkoutStatus").textContent=!s?"READY":s.pausedAt?"PAUSED":"RECORDING";$("liveWorkoutDuration").textContent=time(sec);$("liveWorkoutDistance").textContent=(d/1000).toFixed(2)+" km";$("liveWorkoutCalories").textContent=kcal===null?"—":kcal+" kcal";$("liveWorkoutSteps").textContent=n.toLocaleString();$("liveWorkoutHint").textContent=!s?"Choose an activity above and tap Start to begin recording.":s.pausedAt?"Activity paused. Resume when you are ready.":"GPS route is recording. Keep location permission enabled.";document.querySelectorAll(".workout-start").forEach(b=>{b.disabled=!!s;b.textContent=s?(b.dataset.activity===s.activityType?"IN PROGRESS":"ACTIVE SESSION"):"START ▶"});$("startBtn").disabled=!!s;$("pauseBtn").disabled=!s;$("finishBtn").disabled=!s;$("pauseBtn").textContent=s?.pausedAt?"RESUME":"PAUSE";$("appStatus").textContent=s?"ACTIVITY LIVE":"READY";$("sessionCount").textContent=state.sessions.length+" SAVED";drawRoute(s);const recent=[...state.sessions.map(a=>({...a,recordSource:"RUNJEET"})),...(state.appleHealthWorkouts||[]).map(a=>({...a,recordSource:"APPLE HEALTH"}))].sort((a,b)=>(b.startedAt||0)-(a.startedAt||0)).slice(0,12);$("sessionCount").textContent=recent.length+" RECORDS";$("history").innerHTML=recent.length?recent.map(a=>{const distanceLabel=Number.isFinite(a.distanceM)&&a.distanceM>0?(a.distanceM/1000).toFixed(2)+" km":"Distance —";const dateLabel=new Date(a.startedAt).toLocaleDateString([],{day:"numeric",month:"short"})+" • "+new Date(a.startedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return '<div class="history-item"><div><strong>'+(a.activityType||"Activity")+'</strong><small>'+dateLabel+'</small><small class="record-source">'+a.recordSource+'</small></div><div class="history-right">'+distanceLabel+'<small>'+time(a.durationSec||0)+'</small>'+(Number.isFinite(a.activeCalories)&&a.activeCalories>0?'<small>'+Math.round(a.activeCalories)+' kcal</small>':'')+'</div></div>'}).join(""):'<div class="empty">Your completed activities will appear here.</div>'}
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
function startWatch(){if(window.RunJeetAndroid){window.RunJeetAndroid.requestRoute();window.RunJeetAndroid.startGPS();if(!tick)tick=setInterval(render,1000);$("gpsDetail").textContent="Using native Android GPS. Background recording uses a persistent notification.";return}if(window.webkit?.messageHandlers?.runjeet){window.webkit.messageHandlers.runjeet.postMessage("requestRoute");window.webkit.messageHandlers.runjeet.postMessage("startGPS");if(!tick)tick=setInterval(render,1000);$("gpsDetail").textContent="Using native iPhone GPS. Screen-lock tracking depends on location permission.";return}if(!navigator.geolocation){toast("GPS unavailable in this browser.");return}watch=navigator.geolocation.watchPosition(async p=>{const c=p.coords,s=state.active;if(!s||s.pausedAt||c.accuracy>60)return;const q={lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,ts:p.timestamp||Date.now()};if(appendRoutePoint(s.points,q)){s.gpsAccuracy=Math.round(c.accuracy);try{await save()}catch{toast("GPS point could not be saved")}render()}},e=>{const m=e.code===1?"Location permission denied. Allow it in browser settings.":e.code===2?"GPS signal unavailable. Move to an open area.":"GPS timed out. Keep trying.";$("gpsDetail").textContent=m;toast(m)},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});if(!tick)tick=setInterval(render,1000)}
function stopWatch(){if(window.RunJeetAndroid)window.RunJeetAndroid.stopGPS();if(window.webkit?.messageHandlers?.runjeet)window.webkit.messageHandlers.runjeet.postMessage("stopGPS");if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null}if(tick){clearInterval(tick);tick=null}}
async function start(activityType=selectedActivity){if(!state.profile?.signedIn){toast("Save your profile and sign in before starting");$("profileName").focus();return}if(state.active)return;selectedActivity=activityType;state.active={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),activityType,startedAt:Date.now(),pausedAt:null,pausedMs:0,points:[]};try{await save();render();if(window.RunJeetAndroid)window.RunJeetAndroid.clearRoute();if(window.webkit?.messageHandlers?.runjeet)window.webkit.messageHandlers.runjeet.postMessage("clearRoute");startWatch();toast("GPS activity started")}catch{state.active=null;render();toast("Could not save activity. Check device storage.")}}
async function pause(){const s=state.active;if(!s)return;if(!s.pausedAt){s.pausedAt=Date.now();stopWatch()}else{s.pausedMs+=Date.now()-s.pausedAt;s.pausedAt=null;startWatch()}try{await save()}catch{toast("Could not save activity state")}render()}
async function finish(){const s=state.active;if(!s)return;stopWatch();if(s.pausedAt)s.pausedMs+=Date.now()-s.pausedAt;s.endedAt=Date.now();s.distanceM=dist(s);s.durationSec=elapsed(s);const weight=Number(state.profile?.weightKg);s.activeCalories=Number.isFinite(weight)&&weight>=30&&weight<=250?Math.round(weight*(s.distanceM/1000)*0.5):null;const completed={...s,points:[...(s.points||[])]};state.sessions.unshift(completed);state.active=null;try{await save();render();toast("Activity saved on this device");const payload={id:completed.id,activityType:completed.activityType,startTime:completed.startedAt,endTime:completed.endedAt,distanceM:completed.distanceM,durationSec:completed.durationSec,activeCalories:completed.activeCalories};if(window.RunJeetAndroid?.saveWorkout)window.RunJeetAndroid.saveWorkout(JSON.stringify(payload));else if(window.webkit?.messageHandlers?.runjeet)window.webkit.messageHandlers.runjeet.postMessage("saveWorkout:"+JSON.stringify(payload));}catch{state.sessions=state.sessions.filter(x=>x.id!==completed.id);state.active=s;render();toast("Save failed. Activity remains open; try again.")}}
function exportData(){const b=new Blob([JSON.stringify({app:"RunJeet",schema:1,state},null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="runjeet-backup-"+day()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function importData(f){try{const o=JSON.parse(await f.text());if(o.app!=="RunJeet"||o.schema!==1||!o.state?.stepsByDay||!Array.isArray(o.state.sessions))throw Error("schema");for(const [k,v]of Object.entries(o.state.stepsByDay)){if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||!Number.isSafeInteger(v)||v<0)throw Error("steps");state.stepsByDay[k]=Math.max(state.stepsByDay[k]||0,v)}const ids=new Set(state.sessions.map(x=>x.id));for(const x of o.state.sessions){if(!x||typeof x.id!=="string"||!Number.isFinite(x.startedAt)||!Number.isFinite(x.endedAt)||!Array.isArray(x.points))throw Error("session");if(!ids.has(x.id)){state.sessions.push(x);ids.add(x.id)}}state.sessions.sort((a,b)=>(b.endedAt||0)-(a.endedAt||0));await save();render();toast("Backup imported")}catch{toast("Invalid RunJeet backup")} $("importFile").value=""}
async function init(){try{db=await dbOpen();state=await new Promise((ok,no)=>{const r=db.transaction("state").objectStore("state").get("main");r.onsuccess=()=>ok(r.result||blank());r.onerror=()=>no(r.error)});if(!state||state.version!==1||!state.stepsByDay||!Array.isArray(state.sessions))state=blank();if(!Array.isArray(state.appleHealthWorkouts))state.appleHealthWorkouts=[];if(state.active){state.active.pausedMs=(state.active.pausedMs||0);if(!state.active.pausedAt)state.active.pausedAt=Date.now();$("gpsDetail").textContent="Previous "+(state.active.activityType||"activity")+" recovered in paused state. Resume or finish it."; }await save();if(nativeDailySteps!==null){state.nativeStepsByDay=state.nativeStepsByDay||{};state.nativeStepsByDay[day()]={count:nativeDailySteps,source:nativeStepSource,updatedAt:new Date().toISOString()};await save();}else if(state.nativeStepsByDay?.[day()]){nativeDailySteps=state.nativeStepsByDay[day()].count;nativeStepSource=state.nativeStepsByDay[day()].source||"SAVED SYSTEM PEDOMETER";}render();if(pendingNativeHealthWorkouts!==null){const recoveredHealthWorkouts=pendingNativeHealthWorkouts;pendingNativeHealthWorkouts=null;acceptAppleHealthWorkouts(recoveredHealthWorkouts);}if(pendingNativeRoutePoints.length&&state.active){const recovered=pendingNativeRoutePoints;pendingNativeRoutePoints=[];await mergeNativeRoute(recovered);}else{pendingNativeRoutePoints=[];}if(state.profile){$("profileName").value=state.profile.name||"";$("profileAge").value=state.profile.age||"";$("profileHeight").value=state.profile.heightCm||"";$("profileWeight").value=state.profile.weightKg||"";$("profileGoal").value=state.profile.goal||"";$("profilePurpose").value=state.profile.purpose||"";if(state.profile.photo){$("profileAvatar").src=state.profile.photo}}refreshProfileUI();$("profileForm").onsubmit=async e=>{e.preventDefault();const name=$("profileName").value.trim(),ageRaw=$("profileAge").value.trim(),heightRaw=$("profileHeight").value.trim(),weightRaw=$("profileWeight").value.trim(),age=ageRaw?Number(ageRaw):null,heightCm=heightRaw?Number(heightRaw):null,weightKg=weightRaw?Number(weightRaw):null;if(!name){toast("Please enter your name");return}if(ageRaw&&(!Number.isInteger(age)||age<13||age>110)){toast("Enter a valid age");return}if(heightRaw&&(!Number.isFinite(heightCm)||heightCm<100||heightCm>250)){toast("Enter a valid height in cm");return}if(weightRaw&&(!Number.isFinite(weightKg)||weightKg<30||weightKg>250)){toast("Enter a valid weight between 30 and 250 kg");return}const photoFile=$("profilePhoto").files[0];let photo=state.profile?.photo||null;if(photoFile){if(photoFile.size>3*1024*1024){toast("Choose a photo smaller than 3 MB");return}photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(photoFile)})}state.profile={...state.profile,name,age,heightCm,weightKg,goal:$("profileGoal").value.trim(),purpose:$("profilePurpose").value.trim(),photo,signedIn:true,createdAt:state.profile?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};try{await save();refreshProfileUI();render();toast("Profile saved. You are signed in on this device.")}catch{toast("Profile could not be saved")}};$("signOutBtn").onclick=async()=>{if(!state.profile)return;state.profile.signedIn=false;try{await save();refreshProfileUI();toast("Signed out on this device. Your saved activity remains here.")}catch{toast("Could not sign out")}};$("enableMotion").onclick=enableMotion;$("startBtn").onclick=()=>start(selectedActivity);document.querySelectorAll(".workout-start").forEach(b=>b.addEventListener("click",()=>{selectedActivity=b.dataset.activity;start(selectedActivity)}));document.querySelectorAll(".app-tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));$("pauseBtn").onclick=pause;$("finishBtn").onclick=finish;$("exportBtn").onclick=exportData;$("importFile").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{})}catch{$("appStatus").textContent="STORAGE ERROR";toast("Local storage unavailable in this browser")}}
window.addEventListener("runjeetNativeLocation",async e=>{const q=e.detail,s=state?.active;if(!s||s.pausedAt||!Number.isFinite(q?.lat)||!Number.isFinite(q?.lon))return;const point={lat:q.lat,lon:q.lon,accuracy:q.accuracy,ts:q.ts||Date.now()};if(appendRoutePoint(s.points,point)){try{await save()}catch{toast("GPS point could not be saved")}render()}});
window.addEventListener("runjeetNativeGpsError",e=>{const message=String(e.detail?.message||"GPS could not start");$("gpsDetail").textContent=message;toast(message);});
async function mergeNativeRoute(points){
 const s=state?.active;
 if(!s||!Array.isArray(points)||!points.length)return;
 const known=new Set((s.points||[]).map(p=>p.ts));
 const combined=[...(s.points||[])];
 for(const p of points){if(Number.isFinite(p?.ts)&&!known.has(p.ts)){combined.push(p);known.add(p.ts);}}
 s.points=cleanRoutePoints(combined.sort((a,b)=>a.ts-b.ts));
 try{await save();render();}catch{toast("Recovered GPS route could not be saved")}
}
window.addEventListener("runjeetNativeRoute",async e=>{
 const points=e.detail?.points;
 if(!Array.isArray(points)||!points.length)return;
 if(!state){pendingNativeRoutePoints.push(...points);return;}
 await mergeNativeRoute(points);
});
function acceptAppleHealthWorkouts(incoming){const valid=(Array.isArray(incoming)?incoming:[]).filter(a=>a&&typeof a.id==="string"&&Number.isFinite(a.startedAt)&&Number.isFinite(a.durationSec)&&a.durationSec>=0).slice(0,30);if(!state||!db){pendingNativeHealthWorkouts=valid;return;}state.appleHealthWorkouts=valid;save().then(render).catch(()=>toast("Apple Health records could not be saved"));}
window.addEventListener("runjeetNativeHealthWorkouts",e=>acceptAppleHealthWorkouts(e.detail?.records));
window.addEventListener("runjeetNativeHealth",e=>{const d=e.detail||{};const distanceMeters=Number(d.distanceMeters),activeCalories=Number(d.activeCalories);if(!Number.isFinite(distanceMeters)||!Number.isFinite(activeCalories)||distanceMeters<0||activeCalories<0)return;nativeHealthTotals={distanceMeters,activeCalories,source:String(d.source||"APPLE HEALTH"),updatedAt:Date.now()};render();$("calorieNote").textContent="Apple Health daily active energy";$("stepMessage").textContent="Device health data synchronized";});
window.addEventListener("runjeetNativeSteps",e=>{
 const n=Number(e.detail?.steps),source=String(e.detail?.source||"IPHONE PEDOMETER").toUpperCase();
 if(!Number.isSafeInteger(n)||n<0)return;
 const priority=s=>s.includes("HEALTH")?2:1;
 if(nativeDailySteps!==null&&priority(source)<priority(nativeStepSource||""))return;
 nativeDailySteps=n;nativeStepSource=source;if(motionHandler){window.removeEventListener("devicemotion",motionHandler);motionHandler=null;}if(state&&db){state.nativeStepsByDay=state.nativeStepsByDay||{};state.nativeStepsByDay[day()]={count:n,source,updatedAt:new Date().toISOString()};save().catch(()=>toast("Step total could not be saved"));render();}
 $("stepMessage").textContent="Daily steps from "+source.toLowerCase();
});
window.addEventListener("pagehide",()=>{if(window.RunJeetAndroid||window.webkit?.messageHandlers?.runjeet){if(tick){clearInterval(tick);tick=null;}save().catch(()=>{});return;}stopWatch();if(state?.active&&!state.active.pausedAt){state.active.pausedAt=Date.now();save().catch(()=>{})}});
window.addEventListener("pageshow",()=>{if(state?.active&&!state.active.pausedAt){if(window.RunJeetAndroid)window.RunJeetAndroid.requestRoute();if(window.webkit?.messageHandlers?.runjeet)window.webkit.messageHandlers.runjeet.postMessage("requestRoute");if(window.RunJeetAndroid||window.webkit?.messageHandlers?.runjeet)startWatch();}});
init();
})();