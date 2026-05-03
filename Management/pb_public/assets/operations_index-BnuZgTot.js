import{C as r,T as c}from"./app-shell-DruINWZs.js";/* empty css                      */import{A as o}from"./authService-B7yCEaIZ.js";const l=["audit","entry","verification"];async function s(){await r.init(),d()}window.handleToolClick=e=>{e.branch&&localStorage.setItem("bcauto_branch",e.branch),window.location.href=e.path||e.url};function d(){const e=o.getUser(),t=document.getElementById("tool-grid");if(!e){window.location.href="/pages/main/index.html";return}const a=c.filter(i=>{if(!l.includes(i.id))return!1;const n=localStorage.getItem("bcauto_branch")||"BC Auto Service";return r.hasAccess(e.role,i.id,n)});t.innerHTML=a.map((i,n)=>`
                <a href="javascript:void(0)"
                   onclick="window.handleToolClick(${JSON.stringify(i).replace(/"/g,"&quot;")})"
                   class="menu-card animate-slide-up"
                   style="animation-delay: ${.08*(n+1)}s"
                   role="button" tabindex="0"
                   aria-label="${i.title}">
                    <div class="icon">${i.icon}</div>
                    <div class="title">${i.title}</div>
                    <div class="desc">${i.description||i.group||"Utility"}</div>
                </a>
            `).join(""),a.length===0&&(t.innerHTML='<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">คุณไม่มีสิทธิ์เข้าถึงเมนูในหมวดหมู่นี้</div>')}s();
