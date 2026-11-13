(()=>{"use strict";
const $=id=>document.getElementById(id),KEY="gativx-guru-v1";
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}};
const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};
const profilePurpose=()=>{const field=$("profilePurpose");return (field?.value||"").trim()||"your reason for becoming stronger, healthier and more confident"};
const goal=()=>{const field=$("profileGoal");return (field?.value||"").trim()||"your personal goal"};
const prompts={
 energised:["Protect your momentum.","Use your energy with intention. Complete one planned workout, then give yourself time to recover."],
 steady:["Small steps count.","Keep it simple: take a comfortable 10-minute walk or complete one manageable part of your plan."],
 low:["You do not need to feel motivated to begin.","Reconnect with "+goal()+". Start with just five minutes of gentle movement. You can stop after five minutes if you need to."],
 stressed:["Pause. Breathe. Return to one thing.","Take five slow breaths, drink some water, then choose one small action. Progress does not need to be perfect."],
 rest:["Recovery is part of your Gati.","Choose gentle mobility, an easy walk if it feels comfortable, or proper rest. Listening to your body is progress."]
};
function render(){const s=read(),p=profilePurpose();$("guruPurposeText").textContent=p==="your reason for becoming stronger, healthier and more confident"?"Add your goal and purpose in My Profile. Guru will use your own words to guide you.":p;$("guruStreak").textContent=s.lastDone===today()?"TODAY'S ACTION COMPLETED ✓":s.lastDone?"YOUR JOURNEY, ONE DAY AT A TIME":"CONSISTENCY OVER PERFECTION";if(s.lastDone===today())$("guruDoneBtn").textContent="DONE FOR TODAY ✓";}
function guide(){const mood=$("guruMood").value,[heading,body]=prompts[mood];const note=$("guruNote").value.trim();$("guruResponse").querySelector("strong").textContent=heading;$("guruAction").textContent=body+(note?" I hear that you're dealing with: "+note+". Choose the gentlest useful next step.":"");const s=read();s.lastCheckin=today();s.mood=mood;s.note=note;write(s);}
$("guruGuideBtn")?.addEventListener("click",guide);
$("guruDoneBtn")?.addEventListener("click",()=>{const s=read();s.lastDone=today();write(s);render();$("guruResponse").querySelector("strong").textContent="Well done. You kept your promise to yourself.";$("guruAction").textContent="Notice how that felt. Tomorrow, return to your purpose and choose the next small step."});
$("profileForm")?.addEventListener("submit",()=>setTimeout(render,0));
render();
})();