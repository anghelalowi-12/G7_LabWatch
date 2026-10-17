(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const api = window.LabWatchAPI;
  const config = window.LABWATCH_CONFIG;

  let currentUser = null;
  const accountKey = "labwatch_accounts_v1";
  const dataKey = "labwatch_demo_data_v1";
  const readStore = (key, fallback) => { try { const value=localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
  const saveStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  let accounts = readStore(accountKey, []);
  function persistDemoData(){ if(config.USE_DEMO_DATA) saveStore(dataKey,{incidents,inventory,maintenance}); }
  const savedData = readStore(dataKey, null);
  if(savedData){ incidents=savedData.incidents||incidents; inventory=savedData.inventory||inventory; maintenance=savedData.maintenance||maintenance; }
  const isTechnician = () => currentUser?.role === "Technician";
  function applyRolePermissions(){
    const tech=isTechnician();
    ["inventory","maintenance"].forEach(page=>{const nav=document.querySelector(`[data-page="${page}"]`);if(nav)nav.classList.toggle("hidden",!tech);});
    const reportNav=document.querySelector('[data-page="report"]'); if(reportNav)reportNav.classList.toggle("hidden",false);
    ["addEquipmentBtn","scheduleBtn"].forEach(id=>{const el=$("#"+id);if(el)el.classList.toggle("hidden",!tech);});
    const reportButton=document.querySelector('[data-go="report"]'); if(reportButton)reportButton.classList.toggle("hidden",false);
    const invPage=$("#page-inventory"), maintPage=$("#page-maintenance");
    if(invPage) invPage.classList.toggle("hidden",!tech); if(maintPage) maintPage.classList.toggle("hidden",!tech);
    if(!tech){
      if($("#page-inventory").classList.contains("active")||$("#page-maintenance").classList.contains("active")) navigate("dashboard");
    }
  }
  function switchAuth(mode){
    $("#loginForm").classList.toggle("hidden",mode!=="login");
    $("#signupForm").classList.toggle("hidden",mode!=="signup");
  }
  let incidents = [
    { id:"INC-1005", assetId:"PC-12", description:"PC won't turn on", priority:"High", status:"Pending", assignedTo:"Unassigned", date:"2026-04-26", category:"Won't Turn On" },
    { id:"INC-1004", assetId:"PC-08", description:"Mouse not working", priority:"Medium", status:"In Progress", assignedTo:"John Rivera", date:"2026-04-26", category:"Keyboard or Mouse" },
    { id:"INC-1003", assetId:"PC-15", description:"Internet connection issue", priority:"Medium", status:"In Progress", assignedTo:"Maria Santos", date:"2026-04-25", category:"Internet Connection" },
    { id:"INC-1002", assetId:"PC-03", description:"Keyboard not detected", priority:"Low", status:"Resolved", assignedTo:"Alex Johnson", date:"2026-04-24", category:"Keyboard or Mouse" },
    { id:"INC-1001", assetId:"PC-20", description:"Monitor flickering", priority:"Medium", status:"Closed", assignedTo:"John Rivera", date:"2026-04-23", category:"Hardware Damage" }
  ];
  let inventory = [
    {id:"PC-001",type:"Computer",name:"Dell OptiPlex 7010",location:"Lab 1",status:"Available",condition:"Good"},
    {id:"PC-002",type:"Computer",name:"Dell OptiPlex 7010",location:"Lab 1",status:"In Use",condition:"Good"},
    {id:"PC-003",type:"Computer",name:"HP ProDesk 600 G4",location:"Lab 1",status:"Under Repair",condition:"Fair"},
    {id:"KB-001",type:"Keyboard",name:"Logitech K120",location:"Lab 1",status:"Available",condition:"Good"},
    {id:"KB-002",type:"Keyboard",name:"Logitech K120",location:"Lab 1",status:"In Use",condition:"Good"},
    {id:"MS-001",type:"Mouse",name:"Logitech M100",location:"Lab 1",status:"Available",condition:"Good"},
    {id:"MS-002",type:"Mouse",name:"Logitech M100",location:"Lab 1",status:"In Use",condition:"Good"},
    {id:"MON-001",type:"Monitor",name:'AOC 22"',location:"Lab 1",status:"Available",condition:"Good"}
  ];
  let maintenance = [
    {date:"2026-04-25",assetId:"PC-003",type:"Hardware",description:"Replaced RAM",technician:"John Rivera",status:"Completed"},
    {date:"2026-04-23",assetId:"PC-015",type:"Software",description:"Reinstalled operating system",technician:"Maria Santos",status:"Completed"},
    {date:"2026-04-20",assetId:"PC-020",type:"Hardware",description:"Cleaned dust filters",technician:"Alex Johnson",status:"Completed"},
    {date:"2026-04-18",assetId:"MON-001",type:"Hardware",description:"Display inspection",technician:"John Rivera",status:"In Progress"},
    {date:"2026-04-15",assetId:"KB-002",type:"Hardware",description:"Keyboard replacement",technician:"Maria Santos",status:"Completed"}
  ];

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const slug = value => String(value || "").toLowerCase().replaceAll(" ","-");
  const prettyDate = value => value ? new Date(value + "T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
  const normalizeList = value => Array.isArray(value) ? value : (value?.data || value?.items || value?.incidents || value?.inventory || value?.maintenance || []);
  function showNotice(message, error=false) { const node=$("#notice"); node.textContent=message; node.classList.toggle("error",error); node.classList.remove("hidden"); window.setTimeout(()=>node.classList.add("hidden"),4500); }
  function showApp() { $("#loginView").classList.add("hidden"); $("#appView").classList.remove("hidden"); }
  function showLogin() { $("#appView").classList.add("hidden"); $("#loginView").classList.remove("hidden"); }
  function setConnection(isDemo) { $("#connectionText").textContent=isDemo?"Demo data":"API connected"; $(".dot").classList.toggle("online",!isDemo); }
  function navigate(page) {
    $$(".page").forEach(el=>el.classList.toggle("active",el.id===`page-${page}`));
    $$(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
    const titles={dashboard:"Dashboard",incidents:"Incident Management",inventory:"Equipment Inventory",report:"Report an Issue",maintenance:"Maintenance Records"};
    $("#pageTitle").textContent=titles[page]||"Dashboard";
    if(page==="report") populateAssetOptions();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function badge(value) { return `<span class="tag ${slug(value)}">${escapeHtml(value)}</span>`; }
  function renderDashboard() {
    const totalComputers=inventory.filter(x=>x.type==="Computer").length || 30;
    const open=incidents.filter(x=>!["Resolved","Closed"].includes(x.status)).length;
    const repairing=incidents.filter(x=>x.status==="In Progress").length;
    const available=inventory.filter(x=>x.type==="Computer"&&x.status==="Available").length;
    $("#statComputers").textContent=config.USE_DEMO_DATA?30:totalComputers;
    $("#statIncidents").textContent=open;
    $("#statRepairs").textContent=repairing;
    $("#statAvailable").textContent=config.USE_DEMO_DATA?22:available;
    $("#donutTotal").textContent=config.USE_DEMO_DATA?30:totalComputers;
    $("#legendAvailable").textContent=config.USE_DEMO_DATA?22:available;
    $("#legendInUse").textContent=config.USE_DEMO_DATA?6:inventory.filter(x=>x.type==="Computer"&&x.status==="In Use").length;
    $("#legendRepair").textContent=config.USE_DEMO_DATA?2:inventory.filter(x=>x.type==="Computer"&&x.status==="Under Repair").length;
    $("#legendOut").textContent=inventory.filter(x=>x.type==="Computer"&&x.status==="Out of Service").length;
    $("#recentIncidents").innerHTML=incidents.slice(0,5).map(x=>`<div class="recent-item"><div><div class="recent-title">${escapeHtml(x.id)} · ${escapeHtml(x.description)}</div><div class="recent-sub">${escapeHtml(x.assetId)} · ${prettyDate(x.date)}</div></div>${badge(x.status)}</div>`).join("") || '<div class="empty">No incidents yet.</div>';
  }
  function renderIncidents() {
    const q=$("#incidentSearch").value.toLowerCase(), status=$("#incidentStatusFilter").value, priority=$("#incidentPriorityFilter").value;
    const rows=incidents.filter(x=>(`${x.id} ${x.assetId} ${x.description} ${x.assignedTo}`.toLowerCase().includes(q))&&(!status||x.status===status)&&(!priority||x.priority===priority));
    $("#incidentsTable").innerHTML=rows.map(x=>`<tr><td class="ticket">${escapeHtml(x.id)}</td><td>${escapeHtml(x.assetId)}</td><td>${escapeHtml(x.description)}</td><td>${badge(x.priority)}</td><td>${isTechnician()?`<select class="action-select status-update" data-id="${escapeHtml(x.id)}" aria-label="Update status for ${escapeHtml(x.id)}">${["Pending","In Progress","Waiting for Parts","Resolved","Closed"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select>`:badge(x.status)}</td><td>${escapeHtml(x.assignedTo||"Unassigned")}</td><td>${prettyDate(x.date)}</td><td><button class="link-button detail-btn" data-id="${escapeHtml(x.id)}">View details</button> ${isTechnician()?`<button class="link-button delete-incident" data-id="${escapeHtml(x.id)}">Delete</button>`:""}</td></tr>`).join("");
    $("#incidentsEmpty").classList.toggle("hidden",rows.length>0);
  }
  function renderInventory() {
    const q=$("#inventorySearch").value.toLowerCase(), type=$("#inventoryTypeFilter").value, status=$("#inventoryStatusFilter").value;
    const rows=inventory.filter(x=>(`${x.id} ${x.type} ${x.name} ${x.location}`.toLowerCase().includes(q))&&(!type||x.type===type)&&(!status||x.status===status));
    $("#inventoryTable").innerHTML=rows.map(x=>`<tr><td class="ticket">${escapeHtml(x.id)}</td><td>${escapeHtml(x.type)}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.location)}</td><td>${badge(x.status)}</td><td>${badge(x.condition)}</td><td><button class="link-button asset-detail" data-id="${escapeHtml(x.id)}">View details</button></td></tr>`).join("");
    $("#inventoryEmpty").classList.toggle("hidden",rows.length>0);
    populateAssetOptions();
  }
  function renderMaintenance() {
    const q=$("#maintenanceSearch").value.toLowerCase();
    const rows=maintenance.filter(x=>`${x.assetId} ${x.type} ${x.description} ${x.technician}`.toLowerCase().includes(q));
    $("#maintenanceTable").innerHTML=rows.map(x=>`<tr><td>${prettyDate(x.date)}</td><td class="ticket">${escapeHtml(x.assetId)}</td><td>${escapeHtml(x.type)}</td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.technician)}</td><td>${badge(x.status)}</td></tr>`).join("");
    $("#maintenanceEmpty").classList.toggle("hidden",rows.length>0);
  }
  function populateAssetOptions() {
    const select=$("#reportAsset"), old=select.value;
    select.innerHTML='<option value="">Select a computer or asset</option>'+inventory.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.id)} — ${escapeHtml(x.type)} (${escapeHtml(x.location)})</option>`).join("");
    if(old) select.value=old;
  }
  function renderAll(){renderDashboard();renderIncidents();renderInventory();renderMaintenance();setConnection(config.USE_DEMO_DATA);}
  async function loadFromAPI() {
    if(config.USE_DEMO_DATA){renderAll();return;}
    try {
      const results=await Promise.allSettled([api.getIncidents(),api.getInventory(),api.getMaintenance()]);
      if(results[0].status==="fulfilled") incidents=normalizeList(results[0].value).map(x=>({id:x.id||x.ticketId||x.ticket_id,assetId:x.assetId||x.asset_id||x.computerNumber||"—",description:x.description||x.issueDescription||x.issue_description||"—",priority:x.priority||"Medium",status:x.status||"Pending",assignedTo:x.assignedTo||x.assigned_to||"Unassigned",date:(x.dateReported||x.date_reported||x.createdAt||x.created_at||"").slice(0,10),category:x.category||"Other"}));
      if(results[1].status==="fulfilled") inventory=normalizeList(results[1].value).map(x=>({id:x.id||x.assetId||x.asset_id,type:x.type||x.category||"Other",name:x.name||x.model||"Unnamed equipment",location:x.location||"—",status:x.status||"Available",condition:x.condition||"Good"}));
      if(results[2].status==="fulfilled") maintenance=normalizeList(results[2].value).map(x=>({date:(x.date||x.scheduledDate||x.scheduled_date||"").slice(0,10),assetId:x.assetId||x.asset_id||"—",type:x.type||"General",description:x.description||x.workPerformed||x.work_performed||"—",technician:x.technician||x.assignedTo||x.assigned_to||"Unassigned",status:x.status||"Scheduled"}));
      renderAll();setConnection(false);
      const failed=results.some(x=>x.status==="rejected");
      if(failed) showNotice("Some API endpoints could not be loaded. Check config.js and your backend routes.",true);
    } catch(err){showNotice(`Could not connect to the API: ${err.message}`,true);setConnection(false);}
  }
  function openDialog(title, body) {
    $("#dialogContent").innerHTML=`<h2>${escapeHtml(title)}</h2>${body}`;
    const dialog=$("#detailDialog");
    if(typeof dialog.showModal==="function") dialog.showModal(); else alert(`${title}\n\n${body.replace(/<[^>]*>/g," ")}`);
  }
  function incidentDetails(id) {
    const x=incidents.find(i=>i.id===id); if(!x)return;
    openDialog("Incident Details",`<p><strong>Ticket ID:</strong> ${escapeHtml(x.id)}</p><p><strong>Asset:</strong> ${escapeHtml(x.assetId)}</p><p><strong>Description:</strong> ${escapeHtml(x.description)}</p><p><strong>Category:</strong> ${escapeHtml(x.category)}</p><p><strong>Priority:</strong> ${escapeHtml(x.priority)}</p><p><strong>Status:</strong> ${escapeHtml(x.status)}</p><p><strong>Assigned To:</strong> ${escapeHtml(x.assignedTo||"Unassigned")}</p><p><strong>Date Reported:</strong> ${prettyDate(x.date)}</p>`);
  }
  function assetDetails(id) {
    const x=inventory.find(i=>i.id===id); if(!x)return;
    openDialog("Equipment Details",`<p><strong>Asset ID:</strong> ${escapeHtml(x.id)}</p><p><strong>Type:</strong> ${escapeHtml(x.type)}</p><p><strong>Name / Model:</strong> ${escapeHtml(x.name)}</p><p><strong>Location:</strong> ${escapeHtml(x.location)}</p><p><strong>Status:</strong> ${escapeHtml(x.status)}</p><p><strong>Condition:</strong> ${escapeHtml(x.condition)}</p>`);
  }

  $("#mainNav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)navigate(b.dataset.page);});
  $$("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
  $("#incidentSearch").addEventListener("input",renderIncidents);
  $("#incidentStatusFilter").addEventListener("change",renderIncidents);
  $("#incidentPriorityFilter").addEventListener("change",renderIncidents);
  $("#inventorySearch").addEventListener("input",renderInventory);
  $("#inventoryTypeFilter").addEventListener("change",renderInventory);
  $("#inventoryStatusFilter").addEventListener("change",renderInventory);
  $("#maintenanceSearch").addEventListener("input",renderMaintenance);
  $("#refreshBtn").addEventListener("click",loadFromAPI);
  $("#incidentsTable").addEventListener("change",async e=>{
    if(!e.target.matches(".status-update"))return;
    if(!isTechnician()){renderIncidents();showNotice("Only technicians can update report status.",true);return;}
    const item=incidents.find(x=>x.id===e.target.dataset.id);if(!item)return;
    const previous=item.status;item.status=e.target.value;
    if(!config.USE_DEMO_DATA){try{await api.updateIncident(item.id,{status:item.status});showNotice("Incident status updated.");}catch(err){item.status=previous;showNotice(`Could not update status: ${err.message}`,true);}}
    persistDemoData();renderAll();
  });
  $("#incidentsTable").addEventListener("click",e=>{
    const del=e.target.closest(".delete-incident");
    if(del){if(!isTechnician()){showNotice("Only technicians can delete reports.",true);return;}if(confirm(`Delete report ${del.dataset.id}?`)){incidents=incidents.filter(x=>x.id!==del.dataset.id);persistDemoData();renderAll();showNotice("Report deleted.");}return;}
    const b=e.target.closest(".detail-btn");if(b)incidentDetails(b.dataset.id);
  });
  $("#inventoryTable").addEventListener("click",e=>{const b=e.target.closest(".asset-detail");if(b)assetDetails(b.dataset.id);});
  $("#reportForm").addEventListener("submit",async e=>{
    e.preventDefault();const form=new FormData(e.target);
    const payload={type:form.get("type"),assetId:form.get("assetId"),category:form.get("category"),priority:form.get("priority"),description:form.get("description").trim()};
    if(config.USE_DEMO_DATA){
      incidents.unshift({id:`INC-${1006+incidents.length}`,assetId:payload.assetId,description:payload.description,priority:payload.priority,status:"Pending",assignedTo:"Unassigned",date:new Date().toISOString().slice(0,10),category:payload.category,reportedBy:currentUser?.name||"Student"});
      persistDemoData();showNotice("Issue report submitted and saved in this browser.");e.target.reset();renderAll();navigate("incidents");return;
    }
    try {await api.createIncident(payload);showNotice("Issue report submitted successfully.");e.target.reset();await loadFromAPI();navigate("incidents");}
    catch(err){showNotice(`Report could not be submitted: ${err.message}`,true);}
  });
  $("#showSignup").addEventListener("click",()=>switchAuth("signup"));
  $("#showLogin").addEventListener("click",()=>switchAuth("login"));
  $("#signupForm").addEventListener("submit",e=>{
    e.preventDefault();$("#signupError").textContent="";const d=new FormData(e.target);
    const username=String(d.get("username")).trim().toLowerCase();
    if(accounts.some(a=>a.username===username)){$("#signupError").textContent="That username/email already has an account. Please sign in.";return;}
    const account={name:String(d.get("name")).trim(),username,password:String(d.get("password")),role:d.get("role")};
    accounts.push(account);saveStore(accountKey,accounts);currentUser={name:account.name,role:account.role,username:account.username};
    e.target.reset();startApp();showNotice("Account created. Your account is saved in this browser.");
  });
  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();$("#loginError").textContent="";const data=new FormData(e.target);
    const username=String(data.get("username")).trim().toLowerCase(), password=String(data.get("password"));
    if(config.USE_DEMO_DATA){const account=accounts.find(a=>a.username===username&&a.password===password&&a.role===data.get("role"));
      if(!account){$("#loginError").textContent="Account not found or password/role is incorrect. Create an account first.";return;}
      currentUser={name:account.name,role:account.role,username:account.username};startApp();return;
    }
    try{const result=await api.login(username,password);currentUser=result.user||result.profile||{name:username,role:data.get("role")};startApp();}
    catch(err){$("#loginError").textContent=`Sign in failed: ${err.message}`;}
  });
  $("#logoutBtn").addEventListener("click",()=>{api.setToken(null);currentUser=null;showLogin();switchAuth("login");});
  $("#addEquipmentBtn").addEventListener("click",()=>openDialog("Add Equipment",`<form id="equipmentForm"><label>Asset ID<input name="id" required placeholder="PC-031"></label><label>Equipment Type<select name="type"><option>Computer</option><option>Keyboard</option><option>Mouse</option><option>Monitor</option><option>Other</option></select></label><label>Name / Model<input name="name" required placeholder="Equipment model"></label><label>Location<input name="location" required value="Lab 1"></label><label>Condition<select name="condition"><option>Good</option><option>Fair</option><option>Poor</option></select></label><div class="modal-actions"><button class="btn" type="button" id="cancelEquipment">Cancel</button><button class="btn primary" type="submit">Save Equipment</button></div></form>`));
  $("#detailDialog").addEventListener("click",e=>{
    if(e.target.id==="cancelEquipment"){$("#detailDialog").close();return;}
    if(e.target.id==="equipmentForm"||e.target.closest("#equipmentForm")) {
      const form=$("#equipmentForm");if(!form||e.target.type!=="submit")return;
      e.preventDefault();
    }
  });
  $("#detailDialog").addEventListener("submit",async e=>{
    if(e.target.id!=="equipmentForm")return;e.preventDefault();
    const data=new FormData(e.target);const item={id:data.get("id").trim(),type:data.get("type"),name:data.get("name").trim(),location:data.get("location").trim(),condition:data.get("condition"),status:"Available"};
    if(inventory.some(x=>x.id===item.id)){showNotice("An asset with that ID already exists.",true);return;}
    if(!config.USE_DEMO_DATA){try{await api.createInventoryItem(item);}catch(err){showNotice(`Could not save equipment: ${err.message}`,true);return;}}
    if(!isTechnician()){showNotice("Only technicians can manage inventory.",true);return;}
    inventory.push(item);persistDemoData();$("#detailDialog").close();renderAll();showNotice(config.USE_DEMO_DATA?"Equipment added to demo data.":"Equipment added successfully.");
  });
  $("#scheduleBtn").addEventListener("click",()=>{if(!isTechnician())return;openDialog("Schedule Maintenance",`<p class="muted">Maintenance scheduling is a frontend placeholder. Connect this form to your backend maintenance endpoint.</p><form id="scheduleForm"><label>Asset ID<input name="assetId" required placeholder="PC-001"></label><label>Maintenance Type<select name="type"><option>Preventive</option><option>Hardware</option><option>Software</option><option>Inspection</option></select></label><label>Scheduled Date<input name="date" type="date" required></label><label>Notes<input name="description" required placeholder="Describe planned work"></label><div class="modal-actions"><button class="btn" type="button" id="cancelSchedule">Cancel</button><button class="btn primary" type="submit">Add to Demo Records</button></div></form>`);});
  $("#detailDialog").addEventListener("click",e=>{if(e.target.id==="cancelSchedule")$("#detailDialog").close();});
  $("#detailDialog").addEventListener("submit",e=>{
    if(e.target.id!=="scheduleForm")return;e.preventDefault();
    const d=new FormData(e.target);maintenance.unshift({date:d.get("date"),assetId:d.get("assetId"),type:d.get("type"),description:d.get("description"),technician:currentUser.name,status:"Scheduled"});
    if(!isTechnician())return;$("#detailDialog").close();persistDemoData();renderMaintenance();showNotice("Maintenance added and saved in this browser.");
  });

  function startApp(){
    showApp();applyRolePermissions();$("#userName").textContent=currentUser.name||"LabWatch User";$("#userRole").textContent=currentUser.role||"User";
    $("#welcomeName").textContent=(currentUser.name||"there").split(" ")[0];
    $("#userAvatar").textContent=(currentUser.name||"LW").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
    navigate("dashboard");applyRolePermissions();loadFromAPI();
  }
  // Sign-in is required in both demo and API modes.
  showLogin();switchAuth("login");
})();
