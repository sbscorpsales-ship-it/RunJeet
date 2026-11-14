/* GATIVX shared cloud identity and sync layer.
   Uses the same hosted web bundle in Safari, iOS WKWebView and Android WebView.
   No service-role key is present in this client. */
(() => {
  "use strict";
  const URL = "https://crarbbsvcczwmtvxyrxo.supabase.co";
  const KEY = "sb_publishable_XAGRFtrWrFqJ-SfXh2WbRQ_jCcPnr-6";
  const QUEUE_KEY = "gativx-sync-outbox-v1";
  let client = null, user = null, busy = false, realtime = null, latestStepEvent = null, activeUserId = null, activationPromise = null;
  const $ = id => document.getElementById(id);
  const day = d => {
    const x = d ? new Date(d) : new Date();
    return [x.getFullYear(), String(x.getMonth()+1).padStart(2,"0"), String(x.getDate()).padStart(2,"0")].join("-");
  };
  const queueRead = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]"); } catch { return []; } };
  const queueWrite = q => localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-500)));
  const status = (message, error=false) => {
    const node=$("gativxCloudStatus");
    if(node){node.textContent=message;node.dataset.error=error?"true":"false";}
    const save=$("saveStatus");
    if(save) save.textContent=user ? (error?"CLOUD SYNC ISSUE":"CLOUD ACCOUNT CONNECTED") : "SAVED ON THIS DEVICE";
  };
  function mount() {
    if($("gativxCloudCard")) return;
    const card=document.createElement("section");
    card.id="gativxCloudCard"; card.className="sync-card";
    card.innerHTML='<div class="card-top"><span>GATIVX CLOUD ACCOUNT</span><span class="saved-state" id="gativxCloudStatus">NOT CONNECTED</span></div>'+
      '<p id="gativxCloudHint">Sign in with the same account on your iPhone, Android and Safari to share your fitness history.</p>'+
      '<form id="gativxCloudForm" style="display:grid;gap:10px">'+
      '<label style="display:grid;gap:5px">EMAIL<input id="gativxCloudEmail" type="email" autocomplete="email" required placeholder="you@example.com"></label>'+
      '<label style="display:grid;gap:5px">PASSWORD<input id="gativxCloudPassword" type="password" autocomplete="current-password" minlength="8" required placeholder="At least 8 characters"></label>'+
      '<div class="sync-actions"><button class="primary-button" id="gativxCloudSignIn" type="submit">SIGN IN</button><button class="secondary-button" id="gativxCloudSignUp" type="button">CREATE ACCOUNT</button><button class="secondary-button" id="gativxCloudSignOut" type="button" hidden>SIGN OUT</button></div></form>';
    const target=document.querySelector(".sync-card");
    if(target?.parentNode) target.parentNode.insertBefore(card,target); else document.querySelector("main")?.appendChild(card);
    $("gativxCloudForm").addEventListener("submit",async e=>{
      e.preventDefault(); const email=$("gativxCloudEmail").value.trim(), password=$("gativxCloudPassword").value;
      const b=$("gativxCloudSignIn"); b.disabled=true;
      try { const {data,error}=await client.auth.signInWithPassword({email,password}); if(error) throw error; await activate(data.user); }
      catch(err){status(err.message||"Sign-in failed",true);}
      finally{b.disabled=false;}
    });
    $("gativxCloudSignUp").addEventListener("click",async()=>{
      const email=$("gativxCloudEmail").value.trim(),password=$("gativxCloudPassword").value;
      if(!email||password.length<8){status("Enter an email and a password of at least 8 characters.",true);return;}
      try{const {data,error}=await client.auth.signUp({email,password});if(error)throw error;
        if(data.session) await activate(data.user); else status("Account created. Check your email to confirm, then sign in.");}
      catch(err){status(err.message||"Account creation failed",true);}
    });
    $("gativxCloudSignOut").addEventListener("click",async()=>{const {error}=await client.auth.signOut();if(error)status(error.message,true);else{user=null;status("Signed out. Local device records are retained.");$("gativxCloudSignOut").hidden=true;$("gativxCloudHint").textContent="Sign in with the same account on your iPhone, Android and Safari to share your fitness history.";}});
  }
  async function activate(authUser) {
    if(activeUserId===authUser.id && realtime) return;
    if(activeUserId===authUser.id && activationPromise) return activationPromise;
    activeUserId=authUser.id;
    activationPromise=(async()=>{
    user=authUser; $("gativxCloudSignOut").hidden=false;
    $("gativxCloudHint").textContent="Signed in as "+authUser.email+". Syncing this device with your shared GATIVX account…";
    status("CONNECTED — SYNCING");
    await ensureProfile();
    const localSteps=window.__GATIVX_LOCAL_STEPS__||{};
    for(const [date,record] of Object.entries(localSteps)) {
      const count=Number(record?.count);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isSafeInteger(count)||count<0) continue;
      const source=String(record.source||"").toLowerCase();
      const isHealth=source.includes("healthkit")||source.includes("apple health");
      const isAndroid=source.includes("android")||source.includes("health connect");
      const rpc=isHealth?"sync_healthkit_daily_steps":(isAndroid?"sync_device_daily_steps":"sync_motion_daily_steps");
      const args=isHealth?{p_log_date:date,p_steps:count,p_updated_at:record.updatedAt||new Date().toISOString()}:(isAndroid?{p_log_date:date,p_steps:count,p_source:source.includes("health connect")?"health_connect":"android_hardware_pedometer",p_updated_at:record.updatedAt||new Date().toISOString()}:{p_log_date:date,p_steps:count,p_updated_at:record.updatedAt||new Date().toISOString(),p_distance_m:null});
      enqueue({id:"steps:"+date+":"+source,type:"steps",rpc,args});
    }
    const localSessions=window.__GATIVX_LOCAL_SESSIONS__||[];
    for(const activity of localSessions) {
      if(activity?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activity.id) && Number.isFinite(activity.startedAt) && Number.isFinite(activity.endedAt)) {
        enqueue({id:"workout:"+activity.id,type:"workout",activity});
      }
    }
    await flushQueue();
    if(latestStepEvent) onSteps(latestStepEvent);
    await pullCloud();
    subscribe();
    status("CONNECTED — LAST SYNC "+new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));
    })();
    try { await activationPromise; }
    finally { activationPromise=null; }
  }
  async function ensureProfile() {
    const {data:existing,error:readError}=await client.from("profiles").select("id,display_name,goal_type,goal_text,goal_duration,goal_purpose,goal_feeling,target_weight_kg,starting_weight_kg").eq("id",user.id).maybeSingle();
    if(readError) throw readError;
    const local=window.__GATIVX_LOCAL_PROFILE__||{};
    const patch={id:user.id,display_name:existing?.display_name||local.name||user.email?.split("@")[0]||"GATIVX Member",
      goal_purpose:existing?.goal_purpose||local.purpose||null,goal_text:existing?.goal_text||local.goal||null,
      goal_type:existing?.goal_type||local.goalCategory||"fitness",goal_duration:existing?.goal_duration||local.goalDuration||null,goal_feeling:existing?.goal_feeling||local.goalFeeling||null,target_weight_kg:existing?.target_weight_kg||75};
    const {error}=await client.from("profiles").upsert(patch,{onConflict:"id"});
    if(error) throw error;
  }
  function enqueue(item) {
    const q=queueRead();
    const existing=q.findIndex(x=>x.id===item.id); if(existing>=0) q[existing]=item; else q.push(item);
    queueWrite(q);
    if(user) flushQueue().catch(e=>status("Sync queued: "+(e.message||"network unavailable"),true));
  }
  async function upload(item) {
    if(item.type==="steps") {
      const {error}=await client.rpc(item.rpc,item.args); if(error) throw error; return;
    }
    if(item.type==="daily_actions") {
      const {error}=await client.from("daily_action_progress").upsert({user_id:user.id,action_date:item.date,completed:item.completed,updated_at:item.updatedAt||new Date().toISOString()},{onConflict:"user_id,action_date"}); if(error) throw error; return;
    }
    if(item.type==="workout") {
      const a=item.activity;
      const {error}=await client.rpc("sync_walk_session_route",{p_session_id:a.id,p_started_at:new Date(a.startedAt).toISOString(),p_finished_at:new Date(a.endedAt).toISOString(),p_duration_seconds:Math.max(0,Math.round(a.durationSec||((a.endedAt-a.startedAt)/1000))),p_distance_m:Math.max(0,Number(a.distanceM)||0),p_steps:null,p_route_points:Array.isArray(a.points)?a.points.map(p=>({lat:p.lat,lon:p.lon,accuracy:p.accuracy,ts:p.ts})):[]});
      if(error) throw error;
    }
  }
  async function flushQueue() {
    if(!user||busy||!navigator.onLine)return;
    busy=true;
    const batch=queueRead();
    const originalById=new Map(batch.map(item=>[item.id,JSON.stringify(item)]));
    const failed=new Set();
    try {
      for(const item of batch) {
        try {
          await upload(item);
        } catch(e) {
          failed.add(item.id);
          status("Some records are queued: "+(e.message||"retry pending"),true);
        }
      }
      // Re-read after network requests: never overwrite records enqueued while an upload was in flight.
      const current=queueRead();
      const next=current.filter(item=>{
        const original=originalById.get(item.id);
        if(original===undefined)return true;
        if(JSON.stringify(item)!==original)return true;
        return failed.has(item.id);
      });
      queueWrite(next);
      if(!next.length) status("CONNECTED — ALL RECORDS SYNCED");
      // Drain only genuinely new/updated records. Failed originals wait for the next
      // online/foreground retry instead of creating a tight retry loop.
      const changedDuringFlush=next.some(item=>!originalById.has(item.id)||JSON.stringify(item)!==originalById.get(item.id));
      if(changedDuringFlush) queueMicrotask(()=>flushQueue().catch(e=>status("Sync queued: "+(e.message||"retry pending"),true)));
    } finally {
      busy=false;
    }
  }
  async function pullCloud() {
    if(!user)return;
    const [profile,steps,motion,activities,walks,dailyActions]=await Promise.all([
      client.from("profiles").select("*").eq("id",user.id).maybeSingle(),
      client.from("daily_logs").select("log_date,steps,steps_source,active_energy_kcal").eq("user_id",user.id).order("log_date",{ascending:false}).limit(90),
      client.from("motion_daily_steps").select("log_date,steps,source,measured_at").eq("user_id",user.id).order("log_date",{ascending:false}).limit(90),
      client.from("activity_sessions").select("session_id,activity,started_at,finished_at,steps,source,route_points").eq("user_id",user.id).order("started_at",{ascending:false}).limit(100),
      client.from("walk_sessions").select("id,started_at,finished_at,duration_seconds,distance_m,steps,route_points").eq("user_id",user.id).order("started_at",{ascending:false}).limit(100),
      client.from("daily_action_progress").select("action_date,completed,updated_at").eq("user_id",user.id).order("action_date",{ascending:false}).limit(90)
    ]);
    for(const r of [profile,steps,motion,activities,walks,dailyActions]) if(r.error) throw r.error;
    const p=profile.data;
    if(p) {
      const local=window.__GATIVX_LOCAL_PROFILE__||{};
      const merged={...local,name:p.display_name||local.name,purpose:p.goal_purpose||local.purpose,goalCategory:p.goal_type||local.goalCategory,goal:p.goal_text||local.goal,goalDuration:p.goal_duration||local.goalDuration,goalFeeling:p.goal_feeling||local.goalFeeling,cloudUserId:user.id,signedIn:true};
      window.__GATIVX_CLOUD_PROFILE__=merged;
      window.dispatchEvent(new CustomEvent("gativxCloudProfile",{detail:merged}));
    }
    const today=day();
    const daySteps=[...(steps.data||[]).map(x=>({date:x.log_date,steps:x.steps,source:x.steps_source||"daily_logs"})),...(motion.data||[]).map(x=>({date:x.log_date,steps:x.steps,source:x.source||"core_motion"}))].filter(x=>x.date===today).sort((a,b)=>((b.source||"").includes("apple")?1:0)-((a.source||"").includes("apple")?1:0));
    if(daySteps.length) window.dispatchEvent(new CustomEvent("runjeetCloudSteps",{detail:daySteps[0]}));
    const records=new Map();
    for(const a of activities.data||[]) records.set(a.session_id,{id:a.session_id,activityType:a.activity,startedAt:Date.parse(a.started_at),endedAt:Date.parse(a.finished_at),durationSec:Math.max(0,(Date.parse(a.finished_at)-Date.parse(a.started_at))/1000),points:Array.isArray(a.route_points)?a.route_points:[],recordSource:"CLOUD"});
    for(const a of walks.data||[]) records.set(a.id,{id:a.id,activityType:"Walk",startedAt:Date.parse(a.started_at),endedAt:Date.parse(a.finished_at),durationSec:a.duration_seconds,distanceM:Number(a.distance_m)||0,points:Array.isArray(a.route_points)?a.route_points:[],recordSource:"CLOUD"});
    window.dispatchEvent(new CustomEvent("gativxCloudHistory",{detail:[...records.values()].filter(x=>Number.isFinite(x.startedAt)).sort((a,b)=>b.startedAt-a.startedAt)}));
    const remoteActionDates=new Set();
    for(const row of dailyActions.data||[]) {
      remoteActionDates.add(row.action_date);
      const local=window.__GATIVX_LOCAL_DAILY_ACTIONS__?.[row.action_date];
      const localUpdated=Date.parse(window.__GATIVX_LOCAL_DAILY_ACTIONS_UPDATED_AT__?.[row.action_date]||"");
      const remoteUpdated=Date.parse(row.updated_at||"");
      if(local&&Number.isFinite(localUpdated)&&(!Number.isFinite(remoteUpdated)||localUpdated>remoteUpdated)) enqueue({id:"actions:"+row.action_date,type:"daily_actions",date:row.action_date,completed:local,updatedAt:new Date(localUpdated).toISOString()});
      else window.dispatchEvent(new CustomEvent("gativxDailyActionsCloud",{detail:{date:row.action_date,completed:row.completed,updatedAt:row.updated_at}}));
    }
    for(const [date,completed] of Object.entries(window.__GATIVX_LOCAL_DAILY_ACTIONS__||{})) if(!remoteActionDates.has(date)) enqueue({id:"actions:"+date,type:"daily_actions",date,completed,updatedAt:window.__GATIVX_LOCAL_DAILY_ACTIONS_UPDATED_AT__?.[date]||new Date().toISOString()});
  }
  function subscribe() {
    if(realtime) client.removeChannel(realtime);
    realtime=client.channel("gativx-user-"+user.id)
      .on("postgres_changes",{event:"*",schema:"public",table:"daily_logs",filter:"user_id=eq."+user.id},()=>pullCloud().catch(e=>status(e.message,true)))
      .on("postgres_changes",{event:"*",schema:"public",table:"motion_daily_steps",filter:"user_id=eq."+user.id},()=>pullCloud().catch(e=>status(e.message,true)))
      .on("postgres_changes",{event:"*",schema:"public",table:"activity_sessions",filter:"user_id=eq."+user.id},()=>pullCloud().catch(e=>status(e.message,true)))
      .on("postgres_changes",{event:"*",schema:"public",table:"walk_sessions",filter:"user_id=eq."+user.id},()=>pullCloud().catch(e=>status(e.message,true)))
      .on("postgres_changes",{event:"*",schema:"public",table:"daily_action_progress",filter:"user_id=eq."+user.id},()=>pullCloud().catch(e=>status(e.message,true)))
      .subscribe();
  }
  function onSteps(e) {
    latestStepEvent=e;
    const n=Number(e.detail?.steps), source=String(e.detail?.source||"").toLowerCase();
    if(!Number.isSafeInteger(n)||n<0)return;
    const date=e.detail?.date||day(), updatedAt=e.detail?.updatedAt||new Date().toISOString();
    const isHealth=source.includes("healthkit")||source.includes("apple health");
    const isAndroid=source.includes("android")||source.includes("health connect");
    const rpc=isHealth?"sync_healthkit_daily_steps":(isAndroid?"sync_device_daily_steps":"sync_motion_daily_steps");
    const args=isHealth?{p_log_date:date,p_steps:n,p_updated_at:updatedAt}:(isAndroid?{p_log_date:date,p_steps:n,p_source:source.includes("health connect")?"health_connect":"android_hardware_pedometer",p_updated_at:updatedAt}:{p_log_date:date,p_steps:n,p_updated_at:updatedAt,p_distance_m:null});
    enqueue({id:"steps:"+date+":"+source,type:"steps",rpc,args});
  }
  window.addEventListener("runjeetNativeSteps",onSteps);
  window.addEventListener("runjeetActivitySaved",e=>{const a=e.detail;if(!a||!a.id)return;enqueue({id:"workout:"+a.id,type:"workout",activity:a});});
  window.addEventListener("online",()=>flushQueue().catch(()=>{}));
  window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&user){flushQueue().then(pullCloud).catch(e=>status(e.message,true));}});
  window.addEventListener("pageshow",()=>{if(user){flushQueue().then(pullCloud).catch(e=>status(e.message,true));}});
  window.addEventListener("gativxDailyActionsChanged",e=>{if(!user)return;const d=e.detail||{};if(d.source==="cloud"||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!d.completed||typeof d.completed!=="object")return;enqueue({id:"actions:"+d.date,type:"daily_actions",date:d.date,completed:d.completed,updatedAt:d.updatedAt||new Date().toISOString()});});
  window.addEventListener("gativxProfileSaved",e=>{if(!user)return;const p=e.detail||{};client.from("profiles").upsert({id:user.id,display_name:p.name||null,goal_text:p.goal||null,goal_purpose:p.purpose||null,goal_duration:p.goalDuration||null,goal_feeling:p.goalFeeling||null},{onConflict:"id"}).then(({error})=>{if(error)status(error.message,true);});});
  async function boot() {
    mount();
    if(!window.supabase?.createClient){status("Cloud library did not load. Refresh while connected.",true);return;}
    client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"){
        user=null; activeUserId=null;
        if(realtime){client.removeChannel(realtime);realtime=null;}
        status("Signed out. Local records remain on this device.");
      } else if(session?.user){
        user=session.user;
        setTimeout(()=>activate(session.user).catch(e=>status(e.message||"Cloud sync failed",true)),0);
      }
    });
    const {data,error}=await client.auth.getSession();
    if(error) throw error;
    if(data.session?.user) await activate(data.session.user);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>boot().catch(e=>status(e.message||"Cloud initialization failed",true)));
  else boot().catch(e=>status(e.message||"Cloud initialization failed",true));
})();
