(()=>{"use strict";
const $=id=>document.getElementById(id),DB="runjeet-fresh-v1",GOAL=8000;
let db,state,watch=null,tick=null,lastPeak=0,gravity={x:0,y:0,z:0},lastMotion=0,saveQueue=Promise.resolve(),motionHandler=null,nativeDailySteps=null,nativeStepSource=null,pendingNativeRoutePoints=[];
const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const blank=()=>({version:1,profile:null,stepsByDay:{},nativeStepsByDay:{},sessions:[],active:null});
const steps=()=>nativeDailySteps!==null?nativeDailySteps:(state.nativeStepsByDay?.[day()]?.count??state.stepsByDay[day()]??0);
const toast=m=>{$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)};
const dbOpen=()=>new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("state");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function save(){saveQueue=saveQueue.catch(()=>{}).then(()=>new Promise((ok,no)=>{state.lastUpdated=new Date().toISOString();let t=db.transaction("state","readwrite");t.objectStore("state").put(state,"main");t.oncomplete=()=>{$("saveStatus").textContent="SAVED ON THIS DEVICE";ok()};t.onerror=()=>{$("saveStatus").textContent="SAVE ISSUE";no(t.error)};}));return saveQueue}
function distance(a,b){const r=6371000,x=Math.PI/180,d1=(b.lat-a.lat)*x,d2=(b.lon-a.lon)*x,q=Math.sin(d1/2)**2+Math.cos(a.lat*x)*Math.cos(b.lat*x)*Math.sin(d2/2)**2;return 2*r*Math.asin(Math.sqrt(Math.min(1,q)))}
const dist=s=>(s?.points||[]).reduce((n,p,i,a)=>i?n+distance(a[i-1],p):0,0);
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
function render(){const n=steps(),s=state.active,d=dist(s),sec=elapsed(s);$("stepSource").textContent=nativeDailySteps===null?"MOTION ESTIMATE":(nativeStepSource||"SYSTEM PEDOMETER");if(nativeDailySteps!==null){$("motionStatus").textContent="Using iPhone system step count";$("enableMotion").hidden=true;}$("steps").textContent=n.toLocaleString();$("stepProgress").style.width=Math.min(100,n/GOAL*100)+"%";$("stepMessage").textContent=n>=GOAL?"Daily goal reached":(GOAL-n).toLocaleString()+" steps to your goal";$("distance").innerHTML=(d/1000).toFixed(2)+' <small>km</small>';$("activeTime").textContent=time(sec);$("pace").textContent=d>0?time(sec/(d/1000)):"—";$("gpsStatus").textContent=!s?"NOT TRACKING":s.pausedAt?"PAUSED":"TRACKING";$("gpsHeadline").textContent=!s?"Ready when you are":s.pausedAt?"Activity paused":"Recording your activity";$("gpsDetail").textContent=!s?"Start a session to record your route and distance.":s.points.length+" GPS points recorded";$("startBtn").disabled=!!s;$("pauseBtn").disabled=!s;$("finishBtn").disabled=!s;$("pauseBtn").textContent=s?.pausedAt?"RESUME":"PAUSE";$("appStatus").textContent=s?"ACTIVITY LIVE":"READY";$("sessionCount").textContent=state.sessions.length+" SAVED";drawRoute(s);$("history").innerHTML=state.sessions.length?state.sessions.slice(0,8).map(a=>'<div class="history-item"><div><strong>'+new Date(a.startedAt).toLocaleDateString()+'</strong><small>'+new Date(a.startedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+'</small></div><div class="history-right">'+((a.distanceM||0)/1000).toFixed(2)+' km<small>'+time(a.durationSec)+'</small></div></div>').join(""):'<div class="empty">Your completed activities will appear here.</div>'}
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
function startWatch(){if(window.RunJeetAndroid){window.RunJeetAndroid.requestRoute();window.RunJeetAndroid.startGPS();if(!tick)tick=setInterval(render,1000);$("gpsDetail").textContent="Using native Android GPS. Background recording uses a persistent notification.";return}if(window.webkit?.messageHandlers?.runjeet){window.webkit.messageHandlers.runjeet.postMessage("requestRoute");window.webkit.messageHandlers.runjeet.postMessage("startGPS");if(!tick)tick=setInterval(render,1000);$("gpsDetail").textContent="Using native iPhone GPS. Screen-lock tracking depends on location permission.";return}if(!navigator.geolocation){toast("GPS unavailable in this browser.");return}watch=navigator.geolocation.watchPosition(async p=>{const c=p.coords,s=state.active;if(!s||s.pausedAt||c.accuracy>60)return;const q={lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,ts:p.timestamp||Date.now()},prev=s.points.at(-1);if(!prev||(q.ts-prev.ts>1500&&distance(prev,q)>2)){s.points.push(q);s.gpsAccuracy=Math.round(c.accuracy);try{await save()}catch{toast("GPS point could not be saved")}render()}},e=>{const m=e.code===1?"Location permission denied. Allow it in browser settings.":e.code===2?"GPS signal unavailable. Move to an open area.":"GPS timed out. Keep trying.";$("gpsDetail").textContent=m;toast(m)},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});if(!tick)tick=setInterval(render,1000)}
function stopWatch(){if(window.RunJeetAndroid)window.RunJeetAndroid.stopGPS();if(window.webkit?.messageHandlers?.runjeet)window.webkit.messageHandlers.runjeet.postMessage("stopGPS");if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null}if(tick){clearInterval(tick);tick=null}}
async function start(){if(state.active)return;state.active={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),startedAt:Date.now(),pausedAt:null,pausedMs:0,points:[]};try{await save();render();if(window.RunJeetAndroid)window.RunJeetAndroid.clearRoute();if(window.webkit?.messageHandlers?.runjeet)window.webkit.messageHandlers.runjeet.postMessage("clearRoute");startWatch();toast("GPS activity started")}catch{state.active=null;render();toast("Could not save activity. Check device storage.")}}
async function pause(){const s=state.active;if(!s)return;if(!s.pausedAt){s.pausedAt=Date.now();stopWatch()}else{s.pausedMs+=Date.now()-s.pausedAt;s.pausedAt=null;startWatch()}try{await save()}catch{toast("Could not save activity state")}render()}
async function finish(){const s=state.active;if(!s)return;stopWatch();if(s.pausedAt)s.pausedMs+=Date.now()-s.pausedAt;s.endedAt=Date.now();s.distanceM=dist(s);s.durationSec=elapsed(s);state.sessions.unshift({...s});state.active=null;try{await save();render();toast("Activity saved on this device")}catch{state.active=s;render();toast("Save failed. Activity remains open; try again.")}}
function exportData(){const b=new Blob([JSON.stringify({app:"RunJeet",schema:1,state},null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="runjeet-backup-"+day()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function importData(f){try{const o=JSON.parse(await f.text());if(o.app!=="RunJeet"||o.schema!==1||!o.state?.stepsByDay||!Array.isArray(o.state.sessions))throw Error("schema");for(const [k,v]of Object.entries(o.state.stepsByDay)){if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||!Number.isSafeInteger(v)||v<0)throw Error("steps");state.stepsByDay[k]=Math.max(state.stepsByDay[k]||0,v)}const ids=new Set(state.sessions.map(x=>x.id));for(const x of o.state.sessions){if(!x||typeof x.id!=="string"||!Number.isFinite(x.startedAt)||!Number.isFinite(x.endedAt)||!Array.isArray(x.points))throw Error("session");if(!ids.has(x.id)){state.sessions.push(x);ids.add(x.id)}}state.sessions.sort((a,b)=>(b.endedAt||0)-(a.endedAt||0));await save();render();toast("Backup imported")}catch{toast("Invalid RunJeet backup")} $("importFile").value=""}
async function init(){try{db=await dbOpen();state=await new Promise((ok,no)=>{const r=db.transaction("state").objectStore("state").get("main");r.onsuccess=()=>ok(r.result||blank());r.onerror=()=>no(r.error)});if(!state||state.version!==1||!state.stepsByDay||!Array.isArray(state.sessions))state=blank();if(state.active){state.active.pausedMs=(state.active.pausedMs||0);if(!state.active.pausedAt)state.active.pausedAt=Date.now();$("gpsDetail").textContent="Previous activity recovered in paused state. Resume or finish it."; }await save();if(nativeDailySteps!==null){state.nativeStepsByDay=state.nativeStepsByDay||{};state.nativeStepsByDay[day()]={count:nativeDailySteps,source:nativeStepSource,updatedAt:new Date().toISOString()};await save();}else if(state.nativeStepsByDay?.[day()]){nativeDailySteps=state.nativeStepsByDay[day()].count;nativeStepSource=state.nativeStepsByDay[day()].source||"SAVED SYSTEM PEDOMETER";}render();if(pendingNativeRoutePoints.length&&state.active){const recovered=pendingNativeRoutePoints;pendingNativeRoutePoints=[];await mergeNativeRoute(recovered);}else{pendingNativeRoutePoints=[];}if(state.profile){$("profileName").value=state.profile.name||"";$("profileEmail").value=state.profile.email||"";$("profileStatus").textContent="PROFILE SAVED"}$("profileForm").onsubmit=async e=>{e.preventDefault();const name=$("profileName").value.trim(),email=$("profileEmail").value.trim();if(!name){toast("Please enter your name");return}state.profile={name,email,createdAt:state.profile?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};try{await save();$("profileStatus").textContent="PROFILE SAVED";toast("Test profile saved on this device")}catch{toast("Profile could not be saved")}};$("enableMotion").onclick=enableMotion;$("startBtn").onclick=start;$("pauseBtn").onclick=pause;$("finishBtn").onclick=finish;$("exportBtn").onclick=exportData;$("importFile").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{})}catch{$("appStatus").textContent="STORAGE ERROR";toast("Local storage unavailable in this browser")}}
window.addEventListener("runjeetNativeLocation",async e=>{const q=e.detail,s=state?.active;if(!s||s.pausedAt||!Number.isFinite(q?.lat)||!Number.isFinite(q?.lon))return;const point={lat:q.lat,lon:q.lon,accuracy:q.accuracy,ts:q.ts||Date.now()},prev=s.points.at(-1);if(!prev||(point.ts-prev.ts>1500&&distance(prev,point)>2)){s.points.push(point);try{await save()}catch{toast("GPS point could not be saved")}render()}});
window.addEventListener("runjeetNativeGpsError",e=>{const message=String(e.detail?.message||"GPS could not start");$("gpsDetail").textContent=message;toast(message);});
async function mergeNativeRoute(points){
 const s=state?.active;
 if(!s||!Array.isArray(points)||!points.length)return;
 const known=new Set((s.points||[]).map(p=>p.ts));
 for(const p of points){if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&Number.isFinite(p?.ts)&&!known.has(p.ts)){s.points.push({lat:p.lat,lon:p.lon,accuracy:p.accuracy,ts:p.ts});known.add(p.ts);}}
 s.points.sort((a,b)=>a.ts-b.ts);
 try{await save();render();}catch{toast("Recovered GPS route could not be saved")}
}
window.addEventListener("runjeetNativeRoute",async e=>{
 const points=e.detail?.points;
 if(!Array.isArray(points)||!points.length)return;
 if(!state){pendingNativeRoutePoints.push(...points);return;}
 await mergeNativeRoute(points);
});
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