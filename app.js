
function generateStudyId(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out='SB-';
  if(window.crypto && crypto.getRandomValues){
    const a=new Uint32Array(6); crypto.getRandomValues(a);
    for(let i=0;i<6;i++) out+=chars[a[i]%chars.length];
  }else{
    for(let i=0;i<6;i++) out+=chars[Math.floor(Math.random()*chars.length)];
  }
  return out;
}
function validStudyId(x){return /^SB-[A-HJ-NP-Z2-9]{6}$/.test(x||'')}
const KEY='studybody_v066';
const REGISTRY_KEY='studybody_v066_registry';
const AUDIT_KEY='studybody_v066_audit';
const ROLE_KEY='studybody_v066_role';
const REGIONS=['Eyes','Temple','Jaw','Neck','Shoulder L','Shoulder R','Upper back','Lower back','Elbow L','Elbow R','Wrist/Hand L','Wrist/Hand R','Hip/Thigh','Knee'];
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{schema_version:'0.6.6',profile:null,baseline:null,sessions:[],exit:null};
let start=null,tick=null,checkoutStart=null,checkoutTick=null,selected=new Set(),baselineSelected=new Set();
const $=id=>document.getElementById(id), save=()=>localStorage.setItem(KEY,JSON.stringify(state));

// v0.6.6: workspace gate is bound immediately and independently.
function enterWorkspace(role){
  try { localStorage.setItem(ROLE_KEY, role); } catch(e) {}
  const gate=document.getElementById('roleGate');
  if(gate) gate.classList.add('hidden');
  document.body.dataset.role=role;
  const badge=document.getElementById('roleBadge');
  if(badge) badge.textContent=role==='researcher'?'Researcher workspace':'Participant workspace';
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  const target=document.getElementById(role==='researcher'?'researcher':'today');
  if(target) target.classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(b=>{
    const p=b.dataset.page;
    b.classList.remove('active','role-hidden');
    if(role==='participant' && ['research','researcher'].includes(p)) b.classList.add('role-hidden');
    if(role==='researcher' && !['research','researcher'].includes(p)) b.classList.add('role-hidden');
    if((role==='participant'&&p==='today')||(role==='researcher'&&p==='researcher')) b.classList.add('active');
  });
  if(role==='researcher'){
    try { renderCohort(); renderRegistry(); renderAudit(); } catch(e) {}
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  const p=document.getElementById('enterParticipant');
  const r=document.getElementById('enterResearcher');
  if(p) p.addEventListener('click',()=>enterWorkspace('participant'));
  if(r) r.addEventListener('click',()=>enterWorkspace('researcher'));
  const sw=document.getElementById('changeRole');
  if(sw) sw.addEventListener('click',()=>{
    try { localStorage.removeItem(ROLE_KEY); } catch(e) {}
    document.getElementById('roleGate')?.classList.remove('hidden');
  });
});

const slug=r=>r.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function makeBodySVG(interactive=true,heat={}){const part=(r,x,y,w,h,rx=10)=>`<rect class="body-hit ${interactive&&selected.has(r)?'selected':''} ${!interactive?heatClass(heat[r]||0):''}" data-region="${r}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
const view=(back=false)=>`<div class="body-panel"><div class="body-label">${back?'BACK':'FRONT'}</div><svg viewBox="0 0 220 390" aria-label="${back?'Back':'Front'} body map"><circle class="body-base" cx="110" cy="38" r="28"/><rect class="body-base" x="75" y="72" width="70" height="128" rx="28"/><rect class="body-base" x="43" y="82" width="28" height="135" rx="14"/><rect class="body-base" x="149" y="82" width="28" height="135" rx="14"/><rect class="body-base" x="80" y="190" width="27" height="170" rx="14"/><rect class="body-base" x="113" y="190" width="27" height="170" rx="14"/>
${!back?`${part('Eyes',91,25,38,11,5)}${part('Temple',77,32,66,13,6)}${part('Jaw',88,50,44,17,7)}${part('Neck',94,69,32,24,8)}${part('Shoulder L',58,84,42,30,12)}${part('Shoulder R',120,84,42,30,12)}${part('Elbow L',44,143,28,34,10)}${part('Elbow R',148,143,28,34,10)}${part('Wrist/Hand L',42,184,31,35,10)}${part('Wrist/Hand R',147,184,31,35,10)}${part('Hip/Thigh',78,194,64,86,18)}${part('Knee',80,278,60,34,12)}`:`${part('Neck',94,68,32,25,8)}${part('Shoulder L',58,84,42,30,12)}${part('Shoulder R',120,84,42,30,12)}${part('Upper back',79,100,62,52,15)}${part('Lower back',79,150,62,48,15)}${part('Elbow L',44,143,28,34,10)}${part('Elbow R',148,143,28,34,10)}${part('Wrist/Hand L',42,184,31,35,10)}${part('Wrist/Hand R',147,184,31,35,10)}${part('Hip/Thigh',78,194,64,86,18)}${part('Knee',80,278,60,34,12)}`}</svg></div>`;return view(false)+view(true)}
function heatClass(p){if(!p)return'';return'heat'+Math.min(7,Math.max(1,Math.ceil(p/15)))}
function bindBodyMap(){document.querySelectorAll('#bodyMap .body-hit').forEach(el=>el.onclick=()=>{let r=el.dataset.region;toggleRegion(r);});}
function renderBodyMap(){if(!$('bodyMap'))return;$('bodyMap').innerHTML=makeBodySVG(true);bindBodyMap()}
function init(){REGIONS.forEach(r=>{let b=document.createElement('button');b.className='chip';b.dataset.region=r;b.textContent=r;b.onclick=()=>toggleRegion(r);$('regions').appendChild(b);let bb=document.createElement('button');bb.className='chip';bb.textContent=r;bb.onclick=()=>{baselineSelected.has(r)?baselineSelected.delete(r):baselineSelected.add(r);bb.classList.toggle('selected')};$('baselineRegions').appendChild(bb)});['stress','focus','exit_ease','exit_useful','exit_burden','exit_again'].forEach(x=>$(x).oninput=()=>$(x+'V').textContent=$(x).value);document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page,b));renderBodyMap();if(state.profile){$('onboarding').classList.add('hidden');$('app').classList.remove('hidden');renderAll();if(state.exit)loadExit()}}
$('saveProfile').onclick=()=>{if(!$('consent').checked)return alert('กรุณายืนยันข้อมูลก่อนดำเนินการต่อ');const nickname=($('participant_name')?.value||'').trim(),studentId=($('student_id')?.value||'').trim(),age=+$('age').value,university=$('university')?.value||'',faculty=$('faculty')?.value||'';if(!nickname)return alert('กรุณากรอกชื่อเล่น');if(!studentId)return alert('กรุณากรอกรหัสนักศึกษา');if(!age)return alert('กรุณากรอกอายุ');if(age<18)return alert('การศึกษานี้รับผู้เข้าร่วมอายุ 18 ปีขึ้นไป');if(!university)return alert('กรุณาเลือกมหาวิทยาลัย');if(university==='Abroad'&&(!$('country').value.trim()||!$('university_abroad').value.trim()))return alert('กรุณาระบุประเทศและชื่อมหาวิทยาลัย');if(university==='Other Thailand'&&!$('university_other').value.trim())return alert('กรุณาระบุชื่อมหาวิทยาลัย');if(!faculty)return alert('กรุณาเลือกคณะ');if(faculty==='Other'&&!$('faculty_other').value.trim())return alert('กรุณาระบุคณะ/สาขา');let pid=$('participant_id').value||generateStudyId();$('participant_id').value=pid;if($('generatedIdPreview'))$('generatedIdPreview').textContent=pid;let now=new Date().toISOString();state.profile={participant_id:pid,nickname,student_id:studentId,age,university_category:university==='Abroad'?'abroad':'thailand',university:university==='Abroad'?$('university_abroad').value.trim():(university==='Other Thailand'?$('university_other').value.trim():university),country:university==='Abroad'?$('country').value.trim():'Thailand',faculty:faculty==='Other'?$('faculty_other').value.trim():faculty,year_of_study:$('year').value,dominant_hand:$('dominant_hand').value,approx_daily_screen_study_hours:$('screen_hours').value===''?null:+$('screen_hours').value,created_at:now};state.baseline={participant_id:pid,baseline_date:now,baseline_regions:[...baselineSelected],baseline_region_count:baselineSelected.size,baseline_notes:$('baseline').value.trim()};save();location.reload()};
$('timerBtn').onclick=()=>{if(!start){start=Date.now();$('timerBtn').textContent='End Session';$('timerStatus').textContent='Session in progress…';tick=setInterval(updateTimer,1000)}else{clearInterval(tick);checkoutStart=Date.now();checkoutTick=setInterval(updateCheckoutClock,1000);updateCheckoutClock();$('checkout').classList.remove('hidden');$('timerBtn').disabled=true;$('timerStatus').textContent='Complete the post-session check-in.'}};
function updateTimer(){let s=Math.floor((Date.now()-start)/1000);$('timer').textContent=[Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(v=>String(v).padStart(2,'0')).join(':')}
function toggleRegion(r){$('noDiscomfort').classList.remove('selected');selected.has(r)?selected.delete(r):selected.add(r);document.querySelectorAll(`#regions .chip`).forEach(x=>x.classList.toggle('selected',selected.has(x.dataset.region)));renderRegionForms();renderBodyMap()}
$('noDiscomfort').onclick=()=>{selected.clear();document.querySelectorAll('#regions .chip').forEach(x=>x.classList.remove('selected'));$('noDiscomfort').classList.add('selected');renderRegionForms();renderBodyMap()};
function renderRegionForms(){let box=$('regionForms'),old={};box.querySelectorAll('.region-form').forEach(d=>old[d.dataset.region]={intensity:d.querySelector('.intensity').value,sensation:d.querySelector('.sensation').value,onset:d.querySelector('.onset').value,pre:d.querySelector('.pre').value,tooth:d.querySelector('.tooth')?.value,clench:d.querySelector('.clench')?.value});box.innerHTML='';selected.forEach(r=>{let v=old[r]||{};let d=document.createElement('div');d.className='region-form';d.dataset.region=r;d.innerHTML=`<b>${r}</b><div class="grid3"><label>Intensity 0–10<input class="intensity" type="number" min="0" max="10" value="${v.intensity||1}"></label><label>Sensation<select class="sensation">${['Tightness','Aching','Stiffness','Burning','Tingling/Numbness','Other'].map(x=>`<option ${v.sensation===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Onset<select class="onset">${['Beginning','Middle','End','After session','Not sure'].map(x=>`<option ${v.onset===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label>Present before this session?<select class="pre">${['No','Yes','Not sure'].map(x=>`<option ${v.pre===x?'selected':''}>${x}</option>`).join('')}</select></label>${['Jaw','Temple'].includes(r)?`<div class="grid2"><label>Teeth touching while not eating?<select class="tooth">${['Never','Sometimes','Often','Not sure'].map(x=>`<option ${v.tooth===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Jaw tightening/clenching?<select class="clench">${['Never','Sometimes','Often','Not sure'].map(x=>`<option ${v.clench===x?'selected':''}>${x}</option>`).join('')}</select></label></div>`:''}`;box.appendChild(d)})}
$('saveSession').onclick=()=>{if(!start)return;let ended=new Date(),duration=Math.max(1,Math.round((ended.getTime()-start)/60000));let regions=[...document.querySelectorAll('.region-form')].map(d=>({region:d.dataset.region,intensity:+d.querySelector('.intensity').value,sensation:d.querySelector('.sensation').value,onset:d.querySelector('.onset').value,pre_existing:d.querySelector('.pre').value,tooth_contact:d.querySelector('.tooth')?.value||'',jaw_tightening_clenching:d.querySelector('.clench')?.value||''}));let MDC=regions.filter(x=>x.intensity>0).length,SDB=regions.reduce((a,x)=>a+x.intensity,0),checkin_sec=checkoutStart?Math.max(0,Math.round((Date.now()-checkoutStart)/1000)):null;clearInterval(checkoutTick);state.sessions.push({schema_version:'0.6.6',participant_id:state.profile.participant_id,session_id:`${state.profile.participant_id}-${String(state.sessions.length+1).padStart(4,'0')}`,session_start:new Date(start).toISOString(),session_end:ended.toISOString(),date:ended.toISOString(),post_session_checkin_seconds:checkin_sec,record_complete:true,study_activity:$('study_activity').value,device:$('device').value,setting:$('setting').value,duration_min:duration,break_count:+$('breaks').value,stress_1_5:+$('stress').value,focus_1_5:+$('focus').value,no_discomfort:regions.length===0,regions,MDC,SDB});save();start=null;selected.clear();alert('Session saved.');location.reload()};
function showPage(id,b){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));$(id).classList.remove('hidden');document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderAll()}
function renderAll(){renderHistory();renderMetrics();renderHeat();renderPatterns();renderDictionary();renderPersonalBody();renderProgress();renderCalendar();renderResearchCharts();renderQualityFlags();renderResearcherMode()}
function renderHistory(){$('historyList').innerHTML=state.sessions.length?state.sessions.slice().reverse().map(s=>`<div class="history-row"><b>${s.study_activity}</b> · ${s.duration_min} min · ${s.device}<br><span class="muted">${new Date(s.date).toLocaleString()} · MDC ${s.MDC} · SDB ${s.SDB} · stress ${s.stress_1_5}/5</span></div>`).join(''):'<p class="muted">No sessions yet.</p>'}
function renderMetrics(){let n=state.sessions.length,mins=state.sessions.reduce((a,s)=>a+s.duration_min,0),days=new Set(state.sessions.map(s=>s.date.slice(0,10))).size,avg=n?(state.sessions.reduce((a,s)=>a+s.SDB,0)/n).toFixed(1):'0';$('metrics').innerHTML=`<div class="metric"><b>${n}</b>sessions</div><div class="metric"><b>${days}</b>logged days</div><div class="metric"><b>${mins}</b>study min</div><div class="metric"><b>${avg}</b>mean SDB</div>`}
function recent(){let cutoff=Date.now()-7*864e5;return state.sessions.filter(s=>new Date(s.date).getTime()>=cutoff)}
function regionStats(ss){let counts={};REGIONS.forEach(r=>counts[r]=0);ss.forEach(s=>s.regions.forEach(x=>{if(x.intensity>0)counts[x.region]++}));return counts}
let selectedBodyRegions=new Set();
function bodyRegionSummary(region){
 let rs=recent(),counts=regionStats(rs),c=counts[region]||0,pct=rs.length?Math.round(c/rs.length*100):0,reports=[];
 rs.forEach(s=>{let x=(s.regions||[]).find(v=>v.region===region&&v.intensity>0);if(x)reports.push(+x.intensity)});
 return {n:rs.length,c,pct,avg:reports.length?(reports.reduce((a,b)=>a+b,0)/reports.length).toFixed(1):'—'};
}
function refreshBodySelectionUI(){
 document.querySelectorAll('#personalBodyMap .body-hit').forEach(el=>el.classList.toggle('selected',selectedBodyRegions.has(el.dataset.region)));
 document.querySelectorAll('#heatmap .heat').forEach(el=>el.classList.toggle('selected',selectedBodyRegions.has(el.dataset.region)));
 let d=$('bodyRegionDetail'),a=[...selectedBodyRegions];
 if(d)d.innerHTML=!a.length?'<b>เลือกได้หลายบริเวณ</b><span>แตะ Body Map หรือกล่องด้านล่างเพื่อเลือก เช่น Neck + Shoulder R + Wrist/Hand R</span>':
 `<b>เลือก ${a.length} บริเวณ</b><span>${a.map(r=>{let s=bodyRegionSummary(r);return `${r}: ${s.c}/${s.n} sessions · ${s.pct}%`}).join(' • ')}</span>`;
}
function togglePersonalRegion(region){selectedBodyRegions.has(region)?selectedBodyRegions.delete(region):selectedBodyRegions.add(region);refreshBodySelectionUI()}
function renderHeat(){
 let rs=recent(),counts=regionStats(rs);
 $('heatmap').innerHTML=REGIONS.map(r=>{let c=counts[r]||0,pct=rs.length?Math.round(c/rs.length*100):0;return `<button type="button" class="heat" data-region="${r}"><strong>${r}</strong><span>${c}/${rs.length} sessions · ${pct}%</span></button>`}).join('');
 document.querySelectorAll('#heatmap .heat').forEach(el=>el.onclick=()=>togglePersonalRegion(el.dataset.region));refreshBodySelectionUI()
}
function renderPersonalBody(){
 if(!$('personalBodyMap'))return;let rs=recent(),counts=regionStats(rs),heat={};REGIONS.forEach(r=>heat[r]=rs.length?Math.round((counts[r]||0)/rs.length*100):0);
 $('personalBodyMap').innerHTML=makeBodySVG(false,heat);
 document.querySelectorAll('#personalBodyMap .body-hit').forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.onclick=()=>togglePersonalRegion(el.dataset.region);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();togglePersonalRegion(el.dataset.region)}}});refreshBodySelectionUI()
}
function renderPatterns(){let ss=state.sessions;if(ss.length<3){$('patterns').innerHTML='<p class="muted">Log at least 3 sessions to begin descriptive pattern discovery.</p>';return}let long=ss.filter(s=>s.duration_min>=90),short=ss.filter(s=>s.duration_min<90);let neck=a=>a.filter(s=>s.regions.some(r=>r.region==='Neck'&&r.intensity>0)).length;$('patterns').innerHTML=`<p><b>Observed in your data</b></p><p>Neck discomfort was reported in ${neck(long)} of ${long.length} sessions lasting ≥90 minutes and ${neck(short)} of ${short.length} shorter sessions.</p><p class="muted">This descriptive association does not establish causality. The 90-minute split is a prototype analysis threshold, not a medical safety threshold.</p>`}
function flatten(s){let o={schema_version:s.schema_version||'0.1',participant_id:s.participant_id,session_id:s.session_id,session_start:s.session_start||'',session_end:s.session_end||s.date,date:s.date,study_activity:s.study_activity,device:s.device,setting:s.setting,duration_min:s.duration_min,break_count:s.break_count,stress_1_5:s.stress_1_5,focus_1_5:s.focus_1_5,no_discomfort:s.no_discomfort??(s.regions.length===0),MDC:s.MDC,SDB:s.SDB};REGIONS.forEach(r=>{let x=s.regions.find(z=>z.region===r),k=slug(r);o[k+'_intensity']=x?.intensity??0;o[k+'_sensation']=x?.sensation??'';o[k+'_onset']=x?.onset??'';o[k+'_pre_existing']=x?.pre_existing??'';if(['Jaw','Temple'].includes(r)){o[k+'_tooth_contact']=x?.tooth_contact??'';o[k+'_jaw_tightening_clenching']=x?.jaw_tightening_clenching??''}});return o}
function csvDownload(name,rows){if(!rows.length)return alert('No data to export.');let heads=Object.keys(rows[0]),esc=v=>'"'+String(Array.isArray(v)?v.join('|'):(v??'')).replaceAll('"','""')+'"',csv=[heads.join(','),...rows.map(r=>heads.map(h=>esc(r[h])).join(','))].join('\n');download(name,csv,'text/csv')}
$('exportCSV').onclick=()=>csvDownload('STUDYBODY_v0.6.6_sessions.csv',state.sessions.map(flatten));$('exportBaseline').onclick=()=>csvDownload('STUDYBODY_v0.6.6_baseline.csv',state.baseline?[{...state.profile,...state.baseline}]:[]);$('exportExit').onclick=()=>csvDownload('STUDYBODY_v0.6.6_exit.csv',state.exit?[state.exit]:[]);$('exportJSON').onclick=()=>download('STUDYBODY_v0.6.6_complete.json',JSON.stringify(state,null,2),'application/json');function download(name,text,type){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function renderDictionary(){let f=['profile: participant_id, age, faculty, year_of_study, dominant_hand, screen-study hours','baseline: date, baseline_regions, region_count, notes','session_id + session_start + session_end','study_activity, device, setting, duration_min','break_count, stress_1_5, focus_1_5, no_discomfort','region-level intensity, sensation, onset, pre_existing','MDC, SDB','Jaw/Temple tooth_contact + jaw_tightening_clenching','Day 28: ease, usefulness, burden, use-again, comments'];$('dictionary').innerHTML=f.map(x=>`<div class="dict">✓ ${x}</div>`).join('')}
function loadExit(){['ease','useful','burden','again'].forEach(k=>{$('exit_'+k).value=state.exit[k+'_1_5'];$('exit_'+k+'V').textContent=state.exit[k+'_1_5']});$('exit_worked').value=state.exit.worked_well||'';$('exit_improve').value=state.exit.improve||'';$('exitStatus').textContent='Saved: '+new Date(state.exit.exit_date).toLocaleString()}
$('saveExit').onclick=()=>{state.exit={participant_id:state.profile.participant_id,exit_date:new Date().toISOString(),ease_1_5:+$('exit_ease').value,useful_1_5:+$('exit_useful').value,burden_1_5:+$('exit_burden').value,again_1_5:+$('exit_again').value,worked_well:$('exit_worked').value.trim(),improve:$('exit_improve').value.trim()};save();loadExit();alert('Day 28 exit saved.')};
$('reset').onclick=()=>{if(confirm('Delete all local STUDYBODY prototype data?')){localStorage.removeItem(KEY);location.reload()}};init();

function studyStartDate(){return state.profile?.created_at?new Date(state.profile.created_at):new Date()}
function studyDayNumber(){let d=Math.floor((Date.now()-studyStartDate().getTime())/864e5)+1;return Math.max(1,Math.min(28,d))}
function renderProgress(){if(!$('studyDay'))return;let day=studyDayNumber(),days=new Set(state.sessions.map(s=>s.date.slice(0,10))).size,pct=Math.min(100,Math.round(day/28*100));$('studyDay').textContent=`Day ${day} of 28`;$('progressText').textContent=`${days} logged days · ${state.sessions.length} sessions`;$('progressPct').textContent=`${pct}%`;document.querySelector('.progress-ring')?.style.setProperty('--p',pct)}
function renderCalendar(){if(!$('adherenceCalendar'))return;let start=studyStartDate(),logged=new Set(state.sessions.map(s=>s.date.slice(0,10))),today=new Date();let cells=[];for(let i=0;i<28;i++){let d=new Date(start);d.setDate(start.getDate()+i);let key=d.toISOString().slice(0,10),future=d>today;cells.push(`<div class="daycell ${logged.has(key)?'logged':''} ${future?'future':''}"><b>${i+1}</b><span>${logged.has(key)?'✓':future?'·':'—'}</span></div>`)}$('adherenceCalendar').innerHTML=cells.join('')}
function renderQualityFlags(){if(!$('qualityFlags'))return;let flags=[],ss=state.sessions;if(!state.baseline)flags.push('Baseline record missing');if(ss.some(s=>!s.session_start||!s.session_end))flags.push('Session timestamps missing');if(ss.some(s=>s.no_discomfort&&s.regions.length))flags.push('Conflict: no_discomfort with region records');if(ss.some(s=>s.MDC!==s.regions.filter(r=>r.intensity>0).length))flags.push('MDC mismatch detected');if(ss.some(s=>s.SDB!==s.regions.reduce((a,r)=>a+(+r.intensity||0),0)))flags.push('SDB mismatch detected');if(ss.some(s=>s.duration_min<=0||s.duration_min>720))flags.push('Review unusual session duration');$('qualityFlags').innerHTML=flags.length?`<div class="flag warn"><b>Data-quality review</b><br>${flags.join('<br>')}</div>`:`<div class="flag ok"><b>Data-quality checks:</b> no structural conflicts detected in local records.</div>`}
function deviceRegion(){let devices=[...new Set(state.sessions.map(s=>s.device))],top=['Neck','Shoulder L','Shoulder R','Upper back','Lower back','Wrist/Hand L','Wrist/Hand R','Jaw','Temple'];if(!state.sessions.length)return'<p class="muted">No data yet.</p>';let head=`<tr><th>Device</th>${top.map(r=>`<th>${r}</th>`).join('')}</tr>`;let rows=devices.map(d=>{let ss=state.sessions.filter(s=>s.device===d);return `<tr><td>${d}<small>n=${ss.length}</small></td>${top.map(r=>{let n=ss.filter(s=>s.regions.some(x=>x.region===r&&x.intensity>0)).length,p=ss.length?Math.round(n/ss.length*100):0;return `<td><span class="matrix-cell" style="--a:${p/100}">${p}%</span></td>`}).join('')}</tr>`}).join('');return `<div class="table-scroll"><table class="matrix">${head}${rows}</table></div>`}
function renderResearchCharts(){if(!$('deviceRegionMatrix'))return;$('deviceRegionMatrix').innerHTML=deviceRegion();let ss=state.sessions;if(!ss.length){$('durationSDB').innerHTML=$('stressJaw').innerHTML='<p class="muted">No data yet.</p>';return}let maxD=Math.max(...ss.map(s=>s.duration_min),1),maxS=Math.max(...ss.map(s=>s.SDB),1);$('durationSDB').innerHTML=`<div class="scatter">${ss.map(s=>`<i title="${s.duration_min} min · SDB ${s.SDB}" style="left:${Math.min(96,s.duration_min/maxD*94)}%;bottom:${Math.min(92,s.SDB/maxS*88)}%"></i>`).join('')}<span class="xlab">Duration →</span><span class="ylab">SDB ↑</span></div>`;let buckets=[1,2,3,4,5].map(k=>{let a=ss.filter(s=>s.stress_1_5===k),n=a.filter(s=>s.regions.some(r=>['Jaw','Temple'].includes(r.region)&&r.intensity>0)).length,p=a.length?Math.round(n/a.length*100):0;return {k,n:a.length,p}});$('stressJaw').innerHTML=`<div class="bars">${buckets.map(b=>`<div><span style="height:${b.p}%"></span><b>${b.p}%</b><small>Stress ${b.k}<br>n=${b.n}</small></div>`).join('')}</div>`}

function updateCheckoutClock(){if(!$('checkoutClock')||!checkoutStart)return;let s=Math.max(0,Math.floor((Date.now()-checkoutStart)/1000));$('checkoutClock').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function qualityRows(){return state.sessions.map(s=>{let issues=[];if(!s.session_start||!s.session_end)issues.push('missing_timestamp');if(s.no_discomfort&&s.regions.length)issues.push('no_discomfort_conflict');if(s.MDC!==s.regions.filter(r=>r.intensity>0).length)issues.push('mdc_mismatch');if(s.SDB!==s.regions.reduce((a,r)=>a+(+r.intensity||0),0))issues.push('sdb_mismatch');if(s.duration_min<=0||s.duration_min>720)issues.push('duration_review');if(s.post_session_checkin_seconds==null)issues.push('missing_checkin_time');return {participant_id:s.participant_id,session_id:s.session_id,schema_version:s.schema_version||'',quality_status:issues.length?'REVIEW':'PASS',quality_issue_count:issues.length,quality_issues:issues.join('|')}})}
function analysisRow(s){let o={schema_version:s.schema_version||'',participant_id:s.participant_id,session_id:s.session_id,session_start:s.session_start,session_end:s.session_end,date:s.date,study_activity:s.study_activity,device:s.device,setting:s.setting,duration_min:s.duration_min,break_count:s.break_count,stress_1_5:s.stress_1_5,focus_1_5:s.focus_1_5,post_session_checkin_seconds:s.post_session_checkin_seconds??'',no_discomfort:s.no_discomfort?1:0,MDC:s.MDC,SDB:s.SDB,record_complete:s.record_complete===false?0:1};REGIONS.forEach(r=>{let x=s.regions.find(v=>v.region===r),k=slug(r);o[k+'_reported']=x?1:0;o[k+'_intensity']=x?.intensity??'';o[k+'_sensation']=x?.sensation??'';o[k+'_onset']=x?.onset??'';o[k+'_pre_existing']=x?.pre_existing??'';if(['Jaw','Temple'].includes(r)){o[k+'_tooth_contact']=x?.tooth_contact??'';o[k+'_jaw_tightening_clenching']=x?.jaw_tightening_clenching??''}});return o}
const CODEBOOK=[
['schema_version','string','Dataset schema version','0.6.6','locked'],
['participant_id','string','Pseudonymous participant ID','automatically generated Study ID','locked'],
['session_id','string','Unique Study Session ID','participant_id-sequence','locked'],
['session_start','datetime ISO8601','Study Session start timestamp','','locked'],
['session_end','datetime ISO8601','Study Session end timestamp','','locked'],
['date','datetime ISO8601','Record timestamp used by prototype','','locked'],
['study_activity','categorical','Primary study activity','Reading|Writing|Typing|Watching lecture|Problem solving|Laboratory-related study|Mixed|Other','locked'],
['device','categorical','Primary device/material','Laptop|Desktop|Tablet|Smartphone|Paper|Mixed','locked'],
['setting','categorical','Study setting','Desk|Library|Classroom|Sofa|Bed|Other','locked'],
['duration_min','integer','Study Session duration in minutes','>=1','locked'],
['break_count','ordinal','Self-reported breaks','0|1|2|3 (3=3+)','locked'],
['stress_1_5','integer','Momentary perceived stress','1–5; study-specific monitoring item','locked'],
['focus_1_5','integer','Momentary perceived focus','1–5; study-specific monitoring item','locked'],
['post_session_checkin_seconds','integer','Time to complete post-session check-in','seconds','locked'],
['no_discomfort','binary','No discomfort reported','0/1','locked'],
['MDC','integer','Multi-Site Discomfort Count','derived; not clinical','locked'],
['SDB','integer','Session Discomfort Burden','derived sum; not clinical','locked'],
['region_reported','binary','Region selected in session','0/1 per fixed region','locked'],
['region_intensity','integer','Self-reported regional discomfort intensity','0–10','locked'],
['region_sensation','categorical','Reported sensation','Tightness|Aching|Stiffness|Burning|Tingling/Numbness|Other','locked'],
['region_onset','categorical','Reported onset within session','Beginning|Middle|End|After session|Not sure','locked'],
['region_pre_existing','categorical','Discomfort present before session','No|Yes|Not sure','locked'],
['jaw_temple_oral_behavior','categorical','Exploratory self-reported oral behavior','Never|Sometimes|Often|Not sure','locked']
];
function renderResearcherMode(){if(!$('researcherSummary'))return;let q=qualityRows(),pass=q.filter(x=>x.quality_status==='PASS').length,n=state.sessions.length,check=state.sessions.map(s=>s.post_session_checkin_seconds).filter(x=>Number.isFinite(x)),med=check.length?[...check].sort((a,b)=>a-b)[Math.floor(check.length/2)]:null;$('researcherSummary').innerHTML=`<div class="metric"><b>${n}</b>records</div><div class="metric"><b>${n?Math.round(pass/n*100):0}%</b>structural pass</div><div class="metric"><b>${med??'—'}</b>median check-in sec</div><div class="metric"><b>${state.schema_version}</b>state schema</div>`;let pid=state.profile?.participant_id||'';$('idStatus').className='flag '+(/^SB-[A-HJ-NP-Z2-9]{6}$/.test(pid)?'ok':'warn');$('idStatus').innerHTML=/^SB-[A-HJ-NP-Z2-9]{6}$/.test(pid)?`<b>PASS:</b> ${pid} matches the v0.4 participant-ID rule.`:`<b>REVIEW:</b> Current ID “${pid||'missing'}” does not match automatically generated Study ID.`;$('researcherFlags').innerHTML=q.some(x=>x.quality_status==='REVIEW')?`<div class="flag warn"><b>${q.filter(x=>x.quality_status==='REVIEW').length} session(s) require data-quality review.</b></div>`:`<div class="flag ok"><b>All current session records pass structural checks.</b></div>`;$('lockedSchema').innerHTML=CODEBOOK.map(x=>`<div class="dict"><b>${x[0]}</b> · ${x[1]}<br><span class="muted">${x[2]}${x[3]?' · '+x[3]:''}</span></div>`).join('')}
if($('exportAnalysis'))$('exportAnalysis').onclick=()=>csvDownload('STUDYBODY_v0.6.6_analysis_ready.csv',state.sessions.map(analysisRow));
if($('exportQuality'))$('exportQuality').onclick=()=>csvDownload('STUDYBODY_v0.6.6_data_quality.csv',qualityRows());
if($('exportCodebook'))$('exportCodebook').onclick=()=>csvDownload('STUDYBODY_v0.6.6_codebook.csv',CODEBOOK.map(x=>({field:x[0],type:x[1],definition:x[2],coding:x[3],status:x[4]})));

function registryLoad(){try{return JSON.parse(localStorage.getItem(REGISTRY_KEY)||'[]')}catch(e){return []}}
function registrySave(x){localStorage.setItem(REGISTRY_KEY,JSON.stringify(x))}
function participantKey(pid){return `studybody_v066_participant_${pid}`}
function snapshotCurrent(){if(state.profile?.participant_id)localStorage.setItem(participantKey(state.profile.participant_id),JSON.stringify(state))}
function loadParticipant(pid){snapshotCurrent();let raw=localStorage.getItem(participantKey(pid));if(!raw)return false;state=JSON.parse(raw);localStorage.setItem(KEY,JSON.stringify(state));location.reload();return true}
function ensureRegistry(){let r=registryLoad(),pid=state.profile?.participant_id;if(pid&&!r.includes(pid)){r.push(pid);registrySave(r)}}
function consentRecord(){return state.consent_record||null}
function renderConsent(){if(!$('consentStatus'))return;let c=consentRecord();$('consentStatus').innerHTML=c?`<div class="flag ok"><b>Prototype consent recorded</b><br>${c.consented_at}<br>Consent version ${c.consent_version}</div>`:'No prototype consent record yet.'}
if($('recordConsent'))$('recordConsent').onclick=()=>{if(!$('consent_read').checked||!$('consent_voluntary').checked||!$('consent_research').checked)return alert('Please confirm all consent statements.');state.consent_record={consent_version:'0.6.6-draft',consented_at:new Date().toISOString(),information_read:true,voluntary_confirmed:true,research_data_agreed:true};save();snapshotCurrent();renderConsent();alert('Prototype consent record saved locally.')};
function renderRegistry(){if(!$('participantRegistry'))return;ensureRegistry();let r=registryLoad(),current=state.profile?.participant_id;$('participantRegistry').innerHTML=r.length?r.map(pid=>`<div class="registry-row"><div><b>${(()=>{try{return JSON.parse(localStorage.getItem(participantKey(pid)))?.profile?.nickname||'Participant'}catch(e){return 'Participant'}})()}</b><small>${pid} · ${pid===current?'Current participant':'Local test record'}</small></div><button class="secondary switchPid" data-pid="${pid}" ${pid===current?'disabled':''}>Open</button></div>`).join(''):'<p class="muted">No registered local participants.</p>';document.querySelectorAll('.switchPid').forEach(b=>b.onclick=()=>loadParticipant(b.dataset.pid))}
if($('addParticipant'))$('addParticipant').onclick=()=>{let pid=$('newParticipantId').value.trim().toUpperCase();if(!/^SB-[A-HJ-NP-Z2-9]{6}$/.test(pid))return alert('Use automatically generated Study ID.');let r=registryLoad();if(r.includes(pid))return alert('Participant ID already exists locally.');snapshotCurrent();let blank={schema_version:'0.6.6',profile:{participant_id:pid,age:null,faculty:'',year_of_study:'',dominant_hand:'',approx_daily_screen_study_hours:null,created_at:new Date().toISOString()},baseline:null,sessions:[],exit:null,consent_record:null};localStorage.setItem(participantKey(pid),JSON.stringify(blank));r.push(pid);registrySave(r);loadParticipant(pid)}
function allParticipantStates(){snapshotCurrent();return registryLoad().map(pid=>{try{return JSON.parse(localStorage.getItem(participantKey(pid)))}catch(e){return null}}).filter(Boolean)}
if($('exportAllAnalysis'))$('exportAllAnalysis').onclick=()=>{let rows=allParticipantStates().flatMap(st=>st.sessions.map(analysisRow));csvDownload('STUDYBODY_v0.6.6_ALL_analysis_ready.csv',rows)}
if($('exportParticipantBundle'))$('exportParticipantBundle').onclick=()=>{snapshotCurrent();download(`STUDYBODY_v0.6.6_${state.profile?.participant_id||'participant'}_bundle.json`,JSON.stringify(state,null,2),'application/json')}
function validateBundle(x){let errs=[];if(!x||typeof x!=='object')errs.push('invalid_object');if(!/^SB-[A-HJ-NP-Z2-9]{6}$/.test(x?.profile?.participant_id||''))errs.push('invalid_participant_id');if(!String(x?.schema_version||'').startsWith('0.6'))errs.push('schema_not_v06');if(!Array.isArray(x?.sessions))errs.push('sessions_not_array');return errs}
if($('importBtn'))$('importBtn').onclick=()=>{let f=$('importBundle').files?.[0];if(!f)return alert('Choose a JSON bundle first.');let rd=new FileReader();rd.onload=()=>{try{let x=JSON.parse(rd.result),errs=validateBundle(x);if(errs.length){$('importStatus').textContent='Import rejected: '+errs.join(', ');return}let pid=x.profile.participant_id,r=registryLoad();localStorage.setItem(participantKey(pid),JSON.stringify(x));if(!r.includes(pid)){r.push(pid);registrySave(r)}$('importStatus').textContent=`Imported ${pid}: ${x.sessions.length} session(s).`;renderRegistry()}catch(e){$('importStatus').textContent='Import rejected: invalid JSON.'}};rd.readAsText(f)}
const oldRenderAll=renderAll;renderAll=function(){oldRenderAll();renderConsent();renderRegistry();snapshotCurrent()}
ensureRegistry();

function audit(action,subject='',detail=''){let a=[];try{a=JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]')}catch(e){};a.push({event_id:'AE'+String(a.length+1).padStart(5,'0'),timestamp:new Date().toISOString(),role:localStorage.getItem(ROLE_KEY)||'unknown',action,subject,detail});localStorage.setItem(AUDIT_KEY,JSON.stringify(a));renderAudit()}
function getAudit(){try{return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]')}catch(e){return []}}
function renderAudit(){if(!$('auditLog'))return;let a=getAudit().slice(-12).reverse();$('auditLog').innerHTML=a.length?a.map(x=>`<div class="audit-row"><b>${x.action}</b><span>${x.subject||'—'}</span><small>${x.timestamp}</small></div>`).join(''):'<p class="muted">No audit events yet.</p>'}
function setRole(role){localStorage.setItem(ROLE_KEY,role);$('roleGate').classList.add('hidden');$('roleBadge').textContent=role==='researcher'?'Researcher workspace':'Participant workspace';document.body.dataset.role=role;applyRole()}
function applyRole(){let role=localStorage.getItem(ROLE_KEY);if(!role){$('roleGate').classList.remove('hidden');return}document.body.dataset.role=role;$('roleBadge').textContent=role==='researcher'?'Researcher workspace':'Participant workspace';document.querySelectorAll('nav button').forEach(b=>{let p=b.dataset.page;if(role==='participant'&&['research','researcher'].includes(p))b.classList.add('role-hidden');else if(role==='researcher'&&!['research','researcher'].includes(p))b.classList.add('role-hidden');else b.classList.remove('role-hidden')});if(role==='researcher'){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));$('researcher')?.classList.remove('hidden');document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));document.querySelector('nav button[data-page="researcher"]')?.classList.add('active');renderCohort();renderRegistry();renderAudit()}else{document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));$('today')?.classList.remove('hidden');document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));document.querySelector('nav button[data-page="today"]')?.classList.add('active')}}
function cohortSummary(){let sts=allParticipantStates(),sessions=sts.reduce((n,x)=>n+x.sessions.length,0),consented=sts.filter(x=>x.consent_record).length,baseline=sts.filter(x=>x.baseline).length,exit=sts.filter(x=>x.exit).length;return {participants:sts.length,sessions,consented,baseline,exit}}
function renderCohort(){if(!$('cohortMetrics'))return;let c=cohortSummary();$('cohortMetrics').innerHTML=`<div class="metric"><b>${c.participants}</b>participants</div><div class="metric"><b>${c.consented}</b>consent records</div><div class="metric"><b>${c.baseline}</b>baseline complete</div><div class="metric"><b>${c.sessions}</b>sessions</div><div class="metric"><b>${c.exit}</b>exit complete</div>`}
if($('enrollParticipant'))$('enrollParticipant').onclick=()=>{let label=($('enrollName')?.value||'').trim();if(!label)return $('enrollStatus').textContent='กรอกชื่อเล่น/label ก่อน';let pid=generateStudyId(),r=registryLoad();while(r.includes(pid))pid=generateStudyId();let blank={schema_version:'0.6.6',profile:{participant_id:pid,nickname:label,age:null,faculty:'',year_of_study:'',dominant_hand:'',approx_daily_screen_study_hours:null,created_at:new Date().toISOString()},consent_record:null,baseline:null,sessions:[],exit:null};localStorage.setItem(participantKey(pid),JSON.stringify(blank));r.push(pid);registrySave(r);audit('participant_enrolled',pid,'auto-generated Study ID');$('enrollStatus').textContent=`สร้าง ${pid} สำหรับ ${label} แล้ว`;renderRegistry();renderCohort()}
if($('exportAudit'))$('exportAudit').onclick=()=>csvDownload('STUDYBODY_v0.6.6_audit_events.csv',getAudit())
const priorRenderAllV06=renderAll;renderAll=function(){priorRenderAllV06();renderCohort();renderAudit();applyRole()}
setTimeout(applyRole,0);

document.addEventListener('click',e=>{if(e.target?.id==='recordConsent')setTimeout(()=>audit('consent_recorded',state.profile?.participant_id||'','consent_version 0.6-draft'),50);if(e.target?.id==='exportAllAnalysis')audit('cohort_export','','analysis-ready CSV');if(e.target?.id==='exportParticipantBundle')audit('participant_export',state.profile?.participant_id||'','JSON bundle')});

function syncFriendlyProfile(){
  if($('participant_name') && state.profile?.nickname) $('participant_name').value=state.profile.nickname;
  if($('participant_id')) $('participant_id').value=state.profile?.participant_id||'';
  if($('generatedIdPreview') && state.profile?.participant_id) $('generatedIdPreview').textContent=state.profile.participant_id;
}
setTimeout(syncFriendlyProfile,0);

if($('university')) $('university').onchange=()=>{
  $('abroadFields')?.classList.toggle('hidden',$('university').value!=='Abroad');
  $('university_other')?.classList.toggle('hidden',$('university').value!=='Other Thailand');
};
if($('faculty')) $('faculty').onchange=()=> $('faculty_other')?.classList.toggle('hidden',$('faculty').value!=='Other');
function syncStudentProfile(){
 const p=state.profile||{};
 if($('student_id')) $('student_id').value=p.student_id||'';
 if($('university') && p.university){
   const opts=[...$('university').options].map(o=>o.value);
   if(p.university_category==='abroad'){ $('university').value='Abroad'; $('country').value=p.country||''; $('university_abroad').value=p.university||''; $('abroadFields').classList.remove('hidden'); }
   else if(opts.includes(p.university)) $('university').value=p.university;
   else { $('university').value='Other Thailand'; $('university_other').value=p.university||''; $('university_other').classList.remove('hidden'); }
 }
 if($('faculty') && p.faculty){
   const opts=[...$('faculty').options].map(o=>o.value);
   if(opts.includes(p.faculty)) $('faculty').value=p.faculty;
   else {$('faculty').value='Other';$('faculty_other').value=p.faculty;$('faculty_other').classList.remove('hidden')}
 }
}
setTimeout(syncStudentProfile,0);

function updateStudentConditionalFields(){
 const u=$('university')?.value||'';
 $('abroadFields')?.classList.toggle('hidden',u!=='Abroad');
 $('universityOtherWrap')?.classList.toggle('hidden',u!=='Other Thailand');
 const f=$('faculty')?.value||'';
 $('facultyOtherWrap')?.classList.toggle('hidden',f!=='Other');
}
if($('university')) $('university').addEventListener('change',updateStudentConditionalFields);
if($('faculty')) $('faculty').addEventListener('change',updateStudentConditionalFields);
setTimeout(updateStudentConditionalFields,0);
