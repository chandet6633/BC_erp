import{g as q,f as k,s as _,b as D,q as E,l as S,e as w,p as M,u as K}from"./index-XszaqNmQ.js";import{p as z}from"./inventory-DHMdvGMB.js";const y=[{id:"open",label:"รับงาน",color:"#3b82f6",icon:"inbox"},{id:"in_progress",label:"กำลังทำ",color:"#f59e0b",icon:"build"},{id:"pending_review",label:"รอตรวจ",color:"#8b5cf6",icon:"fact_check"},{id:"closed",label:"เสร็จ",color:"#22c55e",icon:"check_circle"}];let p=null;function R(t){t.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">view_kanban</span>
                <h1>Kanban Board</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-sm btn-outline" id="btnRefreshKanban">
                    <span class="material-icons-outlined" style="font-size:16px;">refresh</span> โหลดใหม่
                </button>
                <a href="#/job" class="btn btn-sm btn-primary">
                    <span class="material-icons-outlined" style="font-size:16px;">add</span> สร้างใบงานใหม่
                </a>
            </div>
        </div>

        <div class="kanban-board" id="kanbanBoard">
            ${y.map(e=>`
                <div class="kanban-column" data-status="${e.id}">
                    <div class="kanban-column-header" style="border-top:3px solid ${e.color};">
                        <span class="material-icons-outlined" style="color:${e.color};font-size:18px;">${e.icon}</span>
                        <span class="kanban-column-title">${e.label}</span>
                        <span class="kanban-column-count" id="count-${e.id}">0</span>
                    </div>
                    <div class="kanban-column-body" id="col-${e.id}" 
                         data-status="${e.id}"></div>
                </div>
            `).join("")}
        </div>
    `,y.forEach(e=>{const n=t.querySelector(`#col-${e.id}`);n.addEventListener("dragover",X),n.addEventListener("dragenter",Y),n.addEventListener("dragleave",j),n.addEventListener("drop",T)}),t.querySelector("#btnRefreshKanban").addEventListener("click",()=>x(t)),x(t)}function B(t){const e=document.createElement("div");e.className="kanban-card",e.draggable=!0,e.dataset.jobId=t.id,e.dataset.status=t.status;const n=new Date(t.start_date||t.updated||Date.now()),c=A(n),s=t.priority||"normal",o={urgent:"#ef4444",high:"#f59e0b",normal:"#3b82f6",low:"#94a3b8"},g={urgent:"ด่วนมาก",high:"ด่วน",normal:"ปกติ",low:"ต่ำ"},f=!D()&&t.branch_id;e.innerHTML=`
        <div class="kanban-card-header">
            <span class="kanban-job-no">${t.job_no||"ไม่มีเลข"}</span>
            <span class="kanban-priority" style="background:${o[s]}15;color:${o[s]};">
                ${g[s]||"ปกติ"}
            </span>
        </div>
        <div class="kanban-card-body">
            <div class="kanban-customer">
                <span class="material-icons-outlined" style="font-size:14px;">person</span>
                ${E(t.customer_name)||"ลูกค้าทั่วไป"}
            </div>
            <div class="kanban-plate">
                <span class="material-icons-outlined" style="font-size:14px;">directions_car</span>
                ${E(t.plate)||"-"}
            </div>
            ${t.grand_total?`<div class="kanban-amount">${S(t.grand_total)}</div>`:""}
        </div>
        ${f?`
        <div class="kanban-branch-badge">
            <span class="material-icons-outlined" style="font-size:12px;">store</span>
            ${t.branch_id}
        </div>`:""}
        <div class="kanban-card-footer">
            <span class="kanban-elapsed">${c}</span>
            <a href="#/job?id=${t.id}" class="kanban-detail-link" title="ดูรายละเอียด">
                <span class="material-icons-outlined" style="font-size:14px;">open_in_new</span>
            </a>
        </div>
    `,e.addEventListener("dragstart",a=>{p=e,e.classList.add("dragging"),a.dataTransfer.effectAllowed="move",a.dataTransfer.setData("text/plain",t.id)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging"),p=null,document.querySelectorAll(".kanban-column-body").forEach(a=>a.classList.remove("drag-over"))});let l=null,h=!1,u=null,m=0,$=0;return e.addEventListener("touchstart",a=>{m=a.touches[0].clientX,$=a.touches[0].clientY,l=setTimeout(()=>{h=!0,p=e,e.classList.add("dragging"),u=e.cloneNode(!0),u.style.cssText=`position:fixed;z-index:999;width:${e.offsetWidth}px;pointer-events:none;opacity:0.85;transform:rotate(2deg);box-shadow:0 8px 24px rgba(0,0,0,0.2);`,document.body.appendChild(u),navigator.vibrate&&navigator.vibrate(30)},300)},{passive:!0}),e.addEventListener("touchmove",a=>{if(!h&&l){const b=Math.abs(a.touches[0].clientX-m),d=Math.abs(a.touches[0].clientY-$);(b>10||d>10)&&(clearTimeout(l),l=null);return}if(!h)return;a.preventDefault();const i=a.touches[0];u&&(u.style.left=i.clientX-60+"px",u.style.top=i.clientY-30+"px"),document.querySelectorAll(".kanban-column-body").forEach(b=>{const d=b.getBoundingClientRect();i.clientX>=d.left&&i.clientX<=d.right&&i.clientY>=d.top&&i.clientY<=d.bottom?b.classList.add("drag-over"):b.classList.remove("drag-over")})},{passive:!1}),e.addEventListener("touchend",a=>{if(clearTimeout(l),l=null,u&&(u.remove(),u=null),!h)return;h=!1,e.classList.remove("dragging");const i=a.changedTouches[0],b=document.querySelectorAll(".kanban-column-body");let d=null;b.forEach(r=>{r.classList.remove("drag-over");const v=r.getBoundingClientRect();i.clientX>=v.left&&i.clientX<=v.right&&i.clientY>=v.top&&i.clientY<=v.bottom&&(d=r)}),d&&p&&T({preventDefault:()=>{},currentTarget:d}),p=null}),e}function X(t){t.preventDefault(),t.dataTransfer.dropEffect="move"}function Y(t){t.preventDefault(),t.currentTarget.classList.add("drag-over")}function j(t){t.currentTarget.classList.remove("drag-over")}async function T(t){var o,g;t.preventDefault();const e=t.currentTarget;if(e.classList.remove("drag-over"),!p)return;const n=p.dataset.jobId,c=e.dataset.status,s=p.dataset.status;if(c!==s){e.appendChild(p),p.dataset.status=c,L();try{const f={status:c};if(c==="closed"){f.end_date=new Date().toISOString();try{const l=await k("job_items",{filter:`job_id='${w(n)}'`}),h=await k("products",{requestKey:null}),u={};h.forEach(r=>{u[r.id]=r});let m=0;const $=[];for(const r of l){const v=u[r.product_id],C=v&&v.cost||0;m+=C*(r.qty||0),r.product_id&&r.qty&&$.push({product_id:r.product_id,qty:r.qty,unit_price:r.unit_price||0})}const a=await k("jobs",{filter:`id='${w(n)}'`,requestKey:null}),i=a.length>0&&a[0].grand_total||0,b=i-m;f.total_cost=Math.round(m*100)/100,f.profit=Math.round(b*100)/100;const d=a.length>0?a[0].job_no:n;await z("JOB",d,$),M({job_no:d,plate:((o=a[0])==null?void 0:o.plate)||"",customer_name:((g=a[0])==null?void 0:g.customer_name)||"",grand_total:i}).catch(()=>{})}catch(l){console.warn("[Kanban] Could not calculate cost/stock:",l.message)}}await K("jobs",n,f),_(`อัพเดทสถานะใบงานเป็น "${F(c)}" สำเร็จ`,"success")}catch(f){console.error("Failed to update job status:",f),_("ไม่สามารถอัพเดทสถานะได้","error");const l=document.querySelector(`#col-${s}`);l&&(l.appendChild(p),p.dataset.status=s,L())}}}function F(t){return{open:"รับงาน",in_progress:"กำลังทำ",pending_review:"รอตรวจ",closed:"เสร็จ"}[t]||t}function A(t){const n=new Date-t,c=Math.floor(n/(1e3*60*60));if(c<1)return"เมื่อสักครู่";if(c<24)return`${c} ชม. ที่แล้ว`;const s=Math.floor(c/24);return s<7?`${s} วันที่แล้ว`:`${Math.floor(s/7)} สัปดาห์`}function L(){y.forEach(t=>{const e=document.querySelector(`#col-${t.id}`),n=document.querySelector(`#count-${t.id}`);e&&n&&(n.textContent=e.querySelectorAll(".kanban-card").length)})}async function x(t){try{const e=q();let n="status!='cancelled'";e&&(n+=` && ${e}`);const c=await k("jobs",{filter:n,sort:"-start_date"});y.forEach(s=>{const o=t.querySelector(`#col-${s.id}`);o&&(o.innerHTML="")}),c.forEach(s=>{let o=s.status||"open";y.find(f=>f.id===o)||(o="open");const g=t.querySelector(`#col-${o}`);g&&g.appendChild(B({...s,status:o}))}),L(),y.forEach(s=>{const o=t.querySelector(`#col-${s.id}`);o&&o.children.length===0&&(o.innerHTML='<div class="kanban-empty">ไม่มีใบงาน</div>')})}catch(e){console.error("Kanban load error:",e),_("ไม่สามารถโหลดข้อมูล Kanban ได้","error")}}export{R as initKanbanPage};
