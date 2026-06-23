const ownerAccounts=[{id:'owner-casey-royal',username:'Casey.royal',name:'Casey.royal',role:'Owner',phone:'',password:'Temp1234',mustChangePassword:true,protected:true,notes:'Owner account.'},{id:'owner-lucas-harrold',username:'Lucas.harrold',name:'Lucas.harrold',role:'Owner',phone:'',password:'Temp1234',mustChangePassword:true,protected:true,notes:'Owner account.'}];
const defaultSettings={businessName:"Harrold's Tree & Land Management",phone:'',email:'',serviceArea:'',notes:''};

const cloudCfg = window.LAVISHAI_SUPABASE || { enabled:false };
let supabaseClient = null;
const cloudReady = () => cloudCfg.enabled && cloudCfg.url && cloudCfg.anonKey && cloudCfg.url.includes('supabase.co') && window.supabase;
if (cloudReady()) supabaseClient = window.supabase.createClient(cloudCfg.url, cloudCfg.anonKey);
const cloudState = { loaded:false, saving:false };
const TABLES = {
  employees: 'app_users',
  customers: 'customers',
  jobs: 'jobs',
  estimates: 'estimates',
  equipment: 'equipment',
  timeOffRequests: 'time_off_requests'
};
async function cloudLoadTable(table){
  const { data, error } = await supabaseClient.from(table).select('id, record, updated_at').order('updated_at', { ascending:false });
  if(error) throw error;
  return (data||[]).map(r=>({ id:r.id, ...(r.record||{}) }));
}
async function cloudLoad(){
  if(!supabaseClient) return false;
  try{
    for(const [key, table] of Object.entries(TABLES)) store[key] = await cloudLoadTable(table);
    const { data:settingsRows, error:settingsErr } = await supabaseClient.from('business_settings').select('key, value');
    if(settingsErr) throw settingsErr;
    const settings = {...defaultSettings};
    (settingsRows||[]).forEach(r=>{ settings[r.key]=r.value; });
    store.settings = settings;
    cloudState.loaded=true;
    return true;
  }catch(err){ console.warn('Cloud load failed, using local data.', err); }
  return false;
}
async function replaceTable(table, rows){
  await supabaseClient.from(table).delete().neq('id','__never__');
  if(rows.length){
    const payload = rows.map(r=>({ id:r.id, record:r, updated_at:new Date().toISOString() }));
    const { error } = await supabaseClient.from(table).upsert(payload, { onConflict:'id' });
    if(error) throw error;
  }
}
async function cloudSave(){
  if(!supabaseClient || cloudState.saving) return;
  cloudState.saving=true;
  try{
    for(const [key, table] of Object.entries(TABLES)) await replaceTable(table, store[key]||[]);
    const settingsRows = Object.entries(store.settings||{}).map(([key,value])=>({ key, value:String(value||''), updated_at:new Date().toISOString() }));
    if(settingsRows.length){
      const { error } = await supabaseClient.from('business_settings').upsert(settingsRows, { onConflict:'key' });
      if(error) throw error;
    }
  }catch(err){ console.warn('Cloud save failed.', err); }
  cloudState.saving=false;
}
async function logAction(action, details=''){
  if(!supabaseClient || !store.session) return;
  try{
    await supabaseClient.from('activity_log').insert({
      actor_id: store.session.id,
      actor_name: store.session.name,
      action,
      details: String(details||''),
      created_at: new Date().toISOString()
    });
  }catch(err){ console.warn('Activity log failed.', err); }
}
const loadJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const store={employees:loadJSON('employees',ownerAccounts),customers:loadJSON('customers',[]),jobs:loadJSON('jobs',[]),estimates:loadJSON('estimates',[]),equipment:loadJSON('equipment',[]),timeOffRequests:loadJSON('timeOffRequests',[]),settings:loadJSON('settings',defaultSettings),session:JSON.parse(sessionStorage.getItem('session')||'null'),pendingPasswordUserId:null};
const $=s=>document.querySelector(s);const esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
function save(){localStorage.setItem('employees',JSON.stringify(store.employees));localStorage.setItem('customers',JSON.stringify(store.customers));localStorage.setItem('jobs',JSON.stringify(store.jobs));localStorage.setItem('estimates',JSON.stringify(store.estimates));localStorage.setItem('equipment',JSON.stringify(store.equipment));localStorage.setItem('timeOffRequests',JSON.stringify(store.timeOffRequests));localStorage.setItem('settings',JSON.stringify(store.settings)); cloudSave();}
function migrate(){store.employees=store.employees.filter(e=>e.id!=='owner');ownerAccounts.slice().reverse().forEach(o=>{let e=store.employees.find(x=>x.id===o.id||x.username===o.username||x.name===o.username);if(e){e.id=o.id;e.username=o.username;e.name=o.name;e.role='Owner';e.protected=true;if(!e.password&&e.pin)e.password=e.pin;if(!e.password){e.password=o.password;e.mustChangePassword=true}}else store.employees.unshift({...o})});save()}

function isOwner(){return store.session && String(store.session.role||'').toLowerCase()==='owner'}
const ownerOnlyTabs=['estimates','customers','employees','equipment'];
function canOpenTab(name){return isOwner() || !ownerOnlyTabs.includes(name)}
function setTab(name){
  if(!canOpenTab(name)){alert('Owner access only.');name='dashboard'}
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id===name));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
}
function applyPermissions(){
  const owner=isOwner();
  ownerOnlyTabs.forEach(tab=>{
    const btn=document.querySelector(`.nav-btn[data-tab="${tab}"]`);
    if(btn)btn.classList.toggle('hidden',!owner);
  });
  const businessPanel=document.querySelector('#settings .split > .panel:first-child');
  if(businessPanel)businessPanel.classList.toggle('hidden',!owner);
  const backupBtn=document.querySelector('#exportBtn');
  if(backupBtn)backupBtn.classList.toggle('hidden',!owner);
  const ownerNote=document.querySelector('.settings-note');
  if(ownerNote)ownerNote.classList.toggle('hidden',!owner);
  const jobFormPanel=document.querySelector('#schedule .split > .panel:first-child');
  if(jobFormPanel)jobFormPanel.classList.toggle('hidden',!owner);
  const jobsAddBtn=document.querySelector('#jobs [data-open-tab="schedule"]');
  if(jobsAddBtn)jobsAddBtn.classList.toggle('hidden',!owner);
  const dashScheduleBtn=document.querySelector('#dashboard [data-open-tab="schedule"]');
  if(dashScheduleBtn)dashScheduleBtn.textContent=owner?'Schedule Job':'View Schedule';
  if(!owner && ownerOnlyTabs.some(t=>document.getElementById(t)?.classList.contains('active')))setTab('dashboard');
}

document.addEventListener('click',e=>{const to=e.target.closest('[data-timeoff-action]');if(to){decideTimeOff(to.dataset.timeoffId,to.dataset.timeoffAction==='approve'?'Approved':'Denied');return}const t=e.target.closest('[data-tab],[data-open-tab],[data-del]');if(!t)return;if(t.dataset.tab)setTab(t.dataset.tab);if(t.dataset.openTab)setTab(t.dataset.openTab);if(t.dataset.del)del(t.dataset.type,t.dataset.del)});
function renderLoginUsers(){$('#loginUser').innerHTML=store.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.name)} - ${esc(e.role||'Employee')}</option>`).join('')}
function login(){const user=store.employees.find(e=>e.id===$('#loginUser').value);const pass=user?(user.password||user.pin||''):'';if(!user||String(pass)!==$('#loginPin').value)return alert('Wrong password. Owner temp password is Temp1234 until changed.');if(user.mustChangePassword){store.pendingPasswordUserId=user.id;$('#loginScreen').classList.add('hidden');$('#passwordScreen').classList.remove('hidden');return}setSession(user);showApp()}
function setSession(user){store.session={id:user.id,name:user.name,role:user.role};sessionStorage.setItem('session',JSON.stringify(store.session))}
function saveForcedPassword(){const u=store.employees.find(e=>e.id===store.pendingPasswordUserId),p=$('#newPassword').value.trim(),c=$('#confirmPassword').value.trim();if(!u)return alert('Login expired.');if(p.length<4)return alert('Password must be at least 4 characters.');if(p==='Temp1234')return alert('Choose a private password, not the temp password.');if(p!==c)return alert('Passwords do not match.');u.password=p;u.pin='';u.mustChangePassword=false;save();setSession(u);showApp()}
function showApp(){const ok=!!store.session;$('#loginScreen').classList.toggle('hidden',ok);$('#passwordScreen').classList.add('hidden');$('#appShell').classList.toggle('hidden',!ok);if(ok)$('#signedInText').textContent=`${store.session.name} (${store.session.role})`;applySettings();render();if(ok)applyPermissions()}
function applySettings(){const name=store.settings.businessName||"Harrold's Tree & Land Management"; const side=$('#sideBrandName'); if(side){side.textContent=name; side.title=name;} document.title=name; const apple=document.querySelector('meta[name="apple-mobile-web-app-title"]'); if(apple) apple.setAttribute('content', name.length>24 ? 'Harrolds Tree' : name);}
function fillSelects(){const cust='<option value="">No customer selected</option>'+store.customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');['#jobCustomer','#estimateCustomer'].forEach(s=>$(s).innerHTML=cust);$('#jobEmployee').innerHTML='<option value="">Unassigned</option>'+store.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}
function visibleJobs(){return isOwner()?[...store.jobs]:store.jobs.filter(j=>j.employeeId===store.session?.id)}
function render(){
  renderLoginUsers();fillSelects();
  const jobsForUser=visibleJobs();
  $('#employeeCount').textContent=isOwner()?store.employees.length:'Owner Only';
  $('#customerCount').textContent=isOwner()?store.customers.length:'Owner Only';
  $('#jobCount').textContent=jobsForUser.length;
  $('#estimateCount').textContent=isOwner()?store.estimates.filter(e=>e.status!=='Declined').length:'Owner Only';
  $('#equipmentCount').textContent=isOwner()?store.equipment.length:'Owner Only';
  $('#timeOffCount').textContent=isOwner()?store.timeOffRequests.filter(r=>r.status==='Pending').length:store.timeOffRequests.filter(r=>r.employeeId===store.session?.id).length;
  const sorted=[...jobsForUser].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const next=sorted.find(j=>new Date(j.date+'T'+(j.time||'00:00'))>=new Date());
  $('#nextJob').textContent=next?`${next.date} ${next.time}`:'None';
  renderJobs(sorted);renderCustomers();renderEmployees();renderEstimates();renderEquipment();renderTimeOff();renderCalendar();renderSettings();applyPermissions();
}

function nameOf(arr,id){return (arr.find(x=>x.id===id)||{}).name||'None'}
function renderJobs(sorted=[...store.jobs]){const card=j=>`<div class="card"><h4>${esc(j.title)}</h4><span class="tag">${esc(j.type)}</span><span class="tag">${esc(j.status)}</span><p class="muted">${esc(j.date)} ${esc(j.time)} • ${esc(nameOf(store.customers,j.customerId))} • ${esc(nameOf(store.employees,j.employeeId))}</p><p>${esc(j.address)}</p><p class="muted">${esc(j.notes)}</p>${isOwner()?`<button class="danger" data-type="jobs" data-del="${j.id}">Delete</button>`:''}</div>`;$('#jobList').innerHTML=sorted.map(card).join('')||'<p class="muted">No jobs yet.</p>';$('#upcomingList').innerHTML=sorted.slice(0,6).map(j=>`<div class="list-item"><h4>${esc(j.title)}</h4><p class="muted">${esc(j.date)} ${esc(j.time)} • ${esc(j.type)} • ${esc(j.status)}</p></div>`).join('')||'<p class="muted">No upcoming jobs yet.</p>'}
function renderCustomers(){$('#customerList').innerHTML=store.customers.map(c=>`<div class="card"><h4>${esc(c.name)}</h4><p>${esc(c.phone)} ${esc(c.email)}</p><p class="muted">${esc(c.address)}</p><p class="muted">${esc(c.notes)}</p><button class="danger" data-type="customers" data-del="${c.id}">Delete</button></div>`).join('')||'<p class="muted">No customers yet.</p>'}
function renderEmployees(){$('#employeeList').innerHTML=store.employees.map(e=>`<div class="card"><h4>${esc(e.name)}</h4><span class="tag">${esc(e.role||'Employee')}</span>${e.mustChangePassword?'<span class="tag">Temp Password</span>':''}<p>${esc(e.phone)}</p><p class="muted">${esc(e.notes)}</p>${e.protected?'<p class="muted small">Protected owner account</p>':`<button class="danger" data-type="employees" data-del="${e.id}">Delete</button>`}</div>`).join('')}
function renderEstimates(){$('#estimateList').innerHTML=store.estimates.map(e=>`<div class="card"><h4>${esc(nameOf(store.customers,e.customerId))}</h4><span class="tag">${esc(e.type)}</span><span class="tag">${esc(e.status)}</span><p><b>$${Number(e.price||0).toFixed(2)}</b></p><p class="muted">${esc(e.details)}</p><button class="danger" data-type="estimates" data-del="${e.id}">Delete</button></div>`).join('')||'<p class="muted">No estimates yet.</p>'}
function renderEquipment(){$('#equipmentList').innerHTML=store.equipment.map(e=>`<div class="card"><h4>${esc(e.name)}</h4><span class="tag">${esc(e.type)}</span><span class="tag">${esc(e.status)}</span><p class="muted">${esc(e.notes)}</p><button class="danger" data-type="equipment" data-del="${e.id}">Delete</button></div>`).join('')||'<p class="muted">No equipment yet.</p>'}
function visibleTimeOff(){return isOwner()?[...store.timeOffRequests]:store.timeOffRequests.filter(r=>r.employeeId===store.session?.id)}
function dateInRange(date,start,end){return date>=start&&date<=end}
function renderCalendar(){const now=new Date(),month=$('#calendarFilter').value||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;if(!$('#calendarFilter').value)$('#calendarFilter').value=month;const [y,m]=month.split('-').map(Number),days=new Date(y,m,0).getDate();let html='';for(let d=1;d<=days;d++){const date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const jobs=visibleJobs().filter(j=>j.date===date);const reqs=visibleTimeOff().filter(r=>dateInRange(date,r.start,r.end));html+=`<div class="day"><strong>${d}</strong>${jobs.map(j=>`<span class="job-pill">${esc(j.time)} ${esc(j.title)}</span>`).join('')}${reqs.map(r=>`<span class="job-pill timeoff-pill">${esc(nameOf(store.employees,r.employeeId))}: ${esc(r.status)} off</span>`).join('')}</div>`}$('#calendarGrid').innerHTML=html}
function renderTimeOff(){const rows=visibleTimeOff().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));$('#timeOffRoleTag').textContent=isOwner()?'Owner Approval':'Employee View';$('#timeOffListTitle').textContent=isOwner()?'Review Time Off Requests':'My Time Off Requests';$('#timeOffList').innerHTML=rows.map(r=>`<div class="card"><h4>${esc(nameOf(store.employees,r.employeeId))}</h4><span class="tag">${esc(r.status)}</span><p><b>${esc(r.start)}</b> to <b>${esc(r.end)}</b></p><p class="muted">${esc(r.reason||'No reason entered.')}</p>${r.decidedBy?`<p class="muted small">Decision by ${esc(nameOf(store.employees,r.decidedBy))}${r.decidedAt?' on '+esc(r.decidedAt):''}</p>`:''}${isOwner()&&r.status==='Pending'?`<button class="primary" data-timeoff-action="approve" data-timeoff-id="${esc(r.id)}">Approve</button> <button class="danger" data-timeoff-action="deny" data-timeoff-id="${esc(r.id)}">Deny</button>`:''}</div>`).join('')||'<p class="muted">No time off requests yet.</p>'}
function decideTimeOff(id,status){if(!isOwner())return alert('Owner access only.');const r=store.timeOffRequests.find(x=>x.id===id);if(!r)return;r.status=status;r.decidedBy=store.session.id;r.decidedAt=new Date().toISOString().slice(0,10);save();logAction('time_off_'+status.toLowerCase(), `${nameOf(store.employees,r.employeeId)} ${r.start} to ${r.end}`);render()}
function renderSettings(){const s=store.settings;$('#settingBusinessName').value=s.businessName||'';$('#settingPhone').value=s.phone||'';$('#settingEmail').value=s.email||'';$('#settingServiceArea').value=s.serviceArea||'';$('#settingNotes').value=s.notes||''; const cs=$('#cloudStatus'); if(cs) cs.textContent=supabaseClient?'Connected to Supabase permanent database tables.':'Local mode only. Add Supabase keys in supabase-config.js to sync devices.'}
function del(type,id){if(!isOwner())return alert('Owner access only.');if(!confirm('Delete this item?'))return;store[type]=store[type].filter(x=>x.id!==id);save();logAction('delete_'+type, id);render()}
$('#loginBtn').onclick=login;$('#loginPin').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('#savePasswordBtn').onclick=saveForcedPassword;$('#logoutBtn').onclick=()=>{sessionStorage.removeItem('session');store.session=null;showApp()};$('#calendarFilter').onchange=renderCalendar;
$('#jobForm').onsubmit=e=>{e.preventDefault();if(!isOwner())return alert('Only owners can create or edit jobs.');store.jobs.push({id:uid(),title:$('#jobTitle').value,type:$('#jobType').value,date:$('#jobDate').value,time:$('#jobTime').value,customerId:$('#jobCustomer').value,employeeId:$('#jobEmployee').value,address:$('#jobAddress').value,status:$('#jobStatus').value,notes:$('#jobNotes').value});e.target.reset();save();logAction('job_created', $('#jobTitle').value);render();alert('Job saved.')};
$('#customerForm').onsubmit=e=>{e.preventDefault();if(!isOwner())return alert('Only owners can add customers.');store.customers.push({id:uid(),name:$('#customerName').value,phone:$('#customerPhone').value,email:$('#customerEmail').value,address:$('#customerAddress').value,notes:$('#customerNotes').value});e.target.reset();save();logAction('customer_created', $('#customerName').value);render()};
$('#employeeForm').onsubmit=e=>{e.preventDefault();if(!isOwner())return alert('Only owners can add employee logins.');store.employees.push({id:uid(),username:$('#employeeName').value,name:$('#employeeName').value,role:$('#employeeRole').value||'Employee',phone:$('#employeePhone').value,password:$('#employeePin').value||'Temp1234',mustChangePassword:true,protected:false,notes:$('#employeeNotes').value});e.target.reset();save();logAction('employee_created', $('#employeeName').value);render()};
$('#estimateForm').onsubmit=e=>{e.preventDefault();if(!isOwner())return alert('Only owners can create estimates.');store.estimates.push({id:uid(),customerId:$('#estimateCustomer').value,type:$('#estimateType').value,price:$('#estimatePrice').value,status:$('#estimateStatus').value,details:$('#estimateDetails').value});e.target.reset();save();logAction('estimate_created', $('#estimateType').value);render()};
$('#equipmentForm').onsubmit=e=>{e.preventDefault();if(!isOwner())return alert('Only owners can manage equipment.');store.equipment.push({id:uid(),name:$('#equipmentName').value,type:$('#equipmentType').value,status:$('#equipmentStatus').value,notes:$('#equipmentNotes').value});e.target.reset();save();logAction('equipment_created', $('#equipmentName').value);render()};
$('#timeOffForm').onsubmit=e=>{e.preventDefault();const start=$('#timeOffStart').value,end=$('#timeOffEnd').value;if(!store.session)return alert('Please login first.');if(!start||!end)return alert('Choose the day or date range.');if(end<start)return alert('End date cannot be before start date.');store.timeOffRequests.push({id:uid(),employeeId:store.session.id,start,end,reason:$('#timeOffReason').value,status:'Pending',createdAt:new Date().toISOString(),decidedBy:'',decidedAt:''});e.target.reset();save();logAction('time_off_requested', `${start} to ${end}`);render();alert('Time off request submitted.');};
$('#settingsForm').onsubmit=e=>{e.preventDefault();if(!isOwner())return alert('Only owners can change business settings.');store.settings={businessName:$('#settingBusinessName').value,phone:$('#settingPhone').value,email:$('#settingEmail').value,serviceArea:$('#settingServiceArea').value,notes:$('#settingNotes').value};save();logAction('settings_updated','Business settings updated');applySettings();alert('Settings saved.')};
$('#changePasswordForm').onsubmit=e=>{e.preventDefault();const u=store.employees.find(x=>x.id===store.session.id),cur=$('#currentPassword').value,n=$('#accountNewPassword').value,c=$('#accountConfirmPassword').value;if(!u||u.password!==cur)return alert('Current password is wrong.');if(n.length<4)return alert('New password must be at least 4 characters.');if(n!==c)return alert('Passwords do not match.');u.password=n;u.mustChangePassword=false;save();e.target.reset();alert('Password changed.')};
$('#exportBtn').onclick=()=>{const data=JSON.stringify({employees:store.employees,customers:store.customers,jobs:store.jobs,estimates:store.estimates,equipment:store.equipment,timeOffRequests:store.timeOffRequests,settings:store.settings},null,2);const blob=new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lavishai-tree-manager-backup.json';a.click();URL.revokeObjectURL(a.href)};
(async()=>{ await cloudLoad(); migrate(); showApp(); })();
