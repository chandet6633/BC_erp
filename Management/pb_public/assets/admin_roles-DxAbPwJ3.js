import{p as c,C as l,T as d}from"./app-shell-CYVhfPAb.js";/* empty css                      */import{A as u}from"./authService-DYxqLk7o.js";import{AuditService as p}from"./auditService-BS08mIiJ.js";import"./entry-CsCD-e0B.js";import"./helpers-DHRWRroM.js";const o=["admin","manager","owner","sa","mechanic","sa_main","sa_suphanburi"];let n={};async function f(){u.requireRole(["admin"])&&(await l.init(),o.forEach(s=>{const e=l.rolePermissions[s]||[],t=e.some(i=>d.some(a=>a.id===i));n[s]=t?e:d.filter(i=>i.roles.includes(s)).map(i=>i.id)}),g(),document.getElementById("loading").classList.add("hidden"),document.getElementById("manager-content").classList.remove("hidden"))}function g(){const s=document.getElementById("role-cards");s.innerHTML=o.map(e=>`
                <div class="card p-6">
                    <h3 class="text-xl font-bold mb-2 capitalize">${e}</h3>
                    <p class="text-xs text-sub mb-4">Select accessible tools for this role</p>
                    
                    <div class="tool-check-list">
                        ${d.map(t=>`
                            <label class="tool-item">
                                <input type="checkbox" 
                                       ${n[e].includes(t.id)?"checked":""} 
                                       onchange="togglePermission('${e}', '${t.id}', this.checked)">
                                <div>
                                    <div class="font-medium text-sm">${t.title}</div>
                                    <div class="text-xs text-sub">${t.description||t.group||"Utility"}</div>
                                </div>
                            </label>
                        `).join("")}
                    </div>
                </div>
            `).join("")}window.togglePermission=(s,e,t)=>{n[s]||(n[s]=[]),t?n[s].includes(e)||n[s].push(e):n[s]=n[s].filter(i=>i!==e)};window.saveAllPermissions=async s=>{const e=s?s.currentTarget:document.querySelector("button.btn-primary"),t=e.textContent;e.disabled=!0,e.textContent="Saving...";try{const i=o.map(async a=>{let r;try{r=await c.collection("system_roles").getFirstListItem(`role_name='${a}'`)}catch{}const m={role_name:a,allowed_tools:n[a]};return r?c.collection("system_roles").update(r.id,m):c.collection("system_roles").create(m)});await Promise.all(i),p.log("permissions_update",`Updated role permissions for: ${o.join(", ")}`,"admin"),await l.init(),alert("Permissions saved successfully!")}catch(i){console.error(i),alert("Error saving permissions: "+i.message)}finally{e.disabled=!1,e.textContent=t}};f();
