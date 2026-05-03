import{p as c,C as d,T as m}from"./app-shell-DruINWZs.js";/* empty css                      *//* empty css                    *//* empty css              */import{A as p}from"./authService-B7yCEaIZ.js";import{A as u}from"./auditService-OL5IOGvx.js";import"./helpers-DHRWRroM.js";let a=[],r={};async function y(){if(p.requireRole(["admin","owner"]))try{const s=await c.collection("users").getFullList({fields:"role"}),e=new Set(s.map(i=>i.role).filter(i=>i&&typeof i=="string"));e.add("admin"),a=Array.from(e).sort(),await d.init(),a.forEach(i=>{const t=d.rolePermissions[i]||[],o=t.some(n=>m.some(l=>l.id===n));r[i]=o?t:m.filter(n=>n.roles.includes(i)).map(n=>n.id)}),g(),document.getElementById("loading").style.display="none",document.getElementById("manager-content").style.display="block"}catch(s){console.error("Initialization error:",s),document.getElementById("loading").innerHTML=`<div style="color:var(--danger)">เกิดข้อผิดพลาด: ${s.message}</div>`}}function g(){const s=document.getElementById("role-cards");s.innerHTML=a.map(e=>`
                <div class="role-card">
                    <h3><span class="material-icons-outlined" style="color:var(--primary-600);font-size:1.3rem">badge</span> ${e==="sa"?"Service Advisor":e}</h3>
                    <p class="subtitle">สิทธิ์สำหรับกลุ่มผู้ใช้: ${e}</p>
                    
                    <div class="tool-list">
                        ${m.map(i=>`
                            <label class="tool-item">
                                <div class="checkbox-wrapper">
                                    <input type="checkbox" 
                                           ${r[e].includes(i.id)?"checked":""} 
                                           onchange="togglePermission('${e}', '${i.id}', this.checked)">
                                </div>
                                <div class="tool-info">
                                    <div class="tool-title">${i.title}</div>
                                    <div class="tool-desc">${i.description||i.group||"Utility Tool"}</div>
                                </div>
                            </label>
                        `).join("")}
                    </div>
                </div>
            `).join("")}window.togglePermission=(s,e,i)=>{r[s]||(r[s]=[]),i?r[s].includes(e)||r[s].push(e):r[s]=r[s].filter(t=>t!==e)};window.saveAllPermissions=async s=>{const e=s?s.currentTarget:document.querySelector("button.btn-primary"),i=e.innerHTML;e.disabled=!0,e.innerHTML='<span class="material-icons-outlined" style="font-size:1.2rem;animation:spin 1s linear infinite;vertical-align:text-bottom">refresh</span> กำลังบันทึก...';try{const t=a.map(async o=>{let n;try{n=await c.collection("system_roles").getFirstListItem(`role_name='${o}'`)}catch{}const l={role_name:o,name:o,allowed_tools:JSON.stringify(r[o])};return n?c.collection("system_roles").update(n.id,l):c.collection("system_roles").create(l)});await Promise.all(t);try{u.log("permissions_update",`Updated role permissions for: ${a.join(", ")}`,"admin")}catch{}await d.init(),e.style.background="var(--success-600)",e.innerHTML='<span class="material-icons-outlined" style="font-size:1.2rem;vertical-align:text-bottom">check</span> บันทึกเรียบร้อย',setTimeout(()=>{e.style.background="",e.innerHTML=i,e.disabled=!1},2e3)}catch(t){console.error(t),alert("Error saving permissions: "+t.message),e.innerHTML=i,e.disabled=!1}};y();
