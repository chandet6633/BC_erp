import{g as D,f as b,s as v,b as C,q as k,l as T,e as L,p as x,u as M}from"./index-BeHq0lp5.js";import{p as K}from"./inventory-Cf0eCzb2.js";const p=[{id:"open",label:"รับงาน",color:"#3b82f6",icon:"inbox"},{id:"in_progress",label:"กำลังทำ",color:"#f59e0b",icon:"build"},{id:"pending_review",label:"รอตรวจ",color:"#8b5cf6",icon:"fact_check"},{id:"closed",label:"เสร็จ",color:"#22c55e",icon:"check_circle"}];let i=null;function N(a){a.innerHTML=`
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
            ${p.map(e=>`
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
    `,p.forEach(e=>{const t=a.querySelector(`#col-${e.id}`);t.addEventListener("dragover",j),t.addEventListener("dragenter",B),t.addEventListener("dragleave",F),t.addEventListener("drop",H)}),a.querySelector("#btnRefreshKanban").addEventListener("click",()=>w(a)),w(a)}function z(a){const e=document.createElement("div");e.className="kanban-card",e.draggable=!0,e.dataset.jobId=a.id,e.dataset.status=a.status;const t=new Date(a.start_date||a.updated||Date.now()),o=O(t),n=a.priority||"normal",s={urgent:"#ef4444",high:"#f59e0b",normal:"#3b82f6",low:"#94a3b8"},l={urgent:"ด่วนมาก",high:"ด่วน",normal:"ปกติ",low:"ต่ำ"},d=!C()&&a.branch_id;return e.innerHTML=`
        <div class="kanban-card-header">
            <span class="kanban-job-no">${a.job_no||"ไม่มีเลข"}</span>
            <span class="kanban-priority" style="background:${s[n]}15;color:${s[n]};">
                ${l[n]||"ปกติ"}
            </span>
        </div>
        <div class="kanban-card-body">
            <div class="kanban-customer">
                <span class="material-icons-outlined" style="font-size:14px;">person</span>
                ${k(a.customer_name)||"ลูกค้าทั่วไป"}
            </div>
            <div class="kanban-plate">
                <span class="material-icons-outlined" style="font-size:14px;">directions_car</span>
                ${k(a.plate)||"-"}
            </div>
            ${a.grand_total?`<div class="kanban-amount">${T(a.grand_total)}</div>`:""}
        </div>
        ${d?`
        <div class="kanban-branch-badge">
            <span class="material-icons-outlined" style="font-size:12px;">store</span>
            ${a.branch_id}
        </div>`:""}
        <div class="kanban-card-footer">
            <span class="kanban-elapsed">${o}</span>
            <a href="#/job?id=${a.id}" class="kanban-detail-link" title="ดูรายละเอียด">
                <span class="material-icons-outlined" style="font-size:14px;">open_in_new</span>
            </a>
        </div>
    `,e.addEventListener("dragstart",r=>{i=e,e.classList.add("dragging"),r.dataTransfer.effectAllowed="move",r.dataTransfer.setData("text/plain",a.id)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging"),i=null,document.querySelectorAll(".kanban-column-body").forEach(r=>r.classList.remove("drag-over"))}),e}function j(a){a.preventDefault(),a.dataTransfer.dropEffect="move"}function B(a){a.preventDefault(),a.currentTarget.classList.add("drag-over")}function F(a){a.currentTarget.classList.remove("drag-over")}async function H(a){var s,l;a.preventDefault();const e=a.currentTarget;if(e.classList.remove("drag-over"),!i)return;const t=i.dataset.jobId,o=e.dataset.status,n=i.dataset.status;if(o!==n){e.appendChild(i),i.dataset.status=o,g();try{const d={status:o};if(o==="closed"){d.end_date=new Date().toISOString();try{const r=await b("job_items",{filter:`job_id='${L(t)}'`}),E=await b("products",{requestKey:null}),h={};E.forEach(c=>{h[c.id]=c});let f=0;const m=[];for(const c of r){const _=h[c.product_id],S=_&&_.cost||0;f+=S*(c.qty||0),c.product_id&&c.qty&&m.push({product_id:c.product_id,qty:c.qty,unit_price:c.unit_price||0})}const u=await b("jobs",{filter:`id='${L(t)}'`,requestKey:null}),y=u.length>0&&u[0].grand_total||0,q=y-f;d.total_cost=Math.round(f*100)/100,d.profit=Math.round(q*100)/100;const $=u.length>0?u[0].job_no:t;await K("JOB",$,m),x({job_no:$,plate:((s=u[0])==null?void 0:s.plate)||"",customer_name:((l=u[0])==null?void 0:l.customer_name)||"",grand_total:y}).catch(()=>{})}catch(r){console.warn("[Kanban] Could not calculate cost/stock:",r.message)}}await M("jobs",t,d),v(`อัพเดทสถานะใบงานเป็น "${I(o)}" สำเร็จ`,"success")}catch(d){console.error("Failed to update job status:",d),v("ไม่สามารถอัพเดทสถานะได้","error");const r=document.querySelector(`#col-${n}`);r&&(r.appendChild(i),i.dataset.status=n,g())}}}function I(a){return{open:"รับงาน",in_progress:"กำลังทำ",pending_review:"รอตรวจ",closed:"เสร็จ"}[a]||a}function O(a){const t=new Date-a,o=Math.floor(t/(1e3*60*60));if(o<1)return"เมื่อสักครู่";if(o<24)return`${o} ชม. ที่แล้ว`;const n=Math.floor(o/24);return n<7?`${n} วันที่แล้ว`:`${Math.floor(n/7)} สัปดาห์`}function g(){p.forEach(a=>{const e=document.querySelector(`#col-${a.id}`),t=document.querySelector(`#count-${a.id}`);e&&t&&(t.textContent=e.querySelectorAll(".kanban-card").length)})}async function w(a){try{const e=D();let t="status!='cancelled'";e&&(t+=` && ${e}`);const o=await b("jobs",{filter:t,sort:"-start_date"});p.forEach(n=>{const s=a.querySelector(`#col-${n.id}`);s&&(s.innerHTML="")}),o.forEach(n=>{let s=n.status||"open";p.find(d=>d.id===s)||(s="open");const l=a.querySelector(`#col-${s}`);l&&l.appendChild(z({...n,status:s}))}),g(),p.forEach(n=>{const s=a.querySelector(`#col-${n.id}`);s&&s.children.length===0&&(s.innerHTML='<div class="kanban-empty">ไม่มีใบงาน</div>')})}catch(e){console.error("Kanban load error:",e),v("ไม่สามารถโหลดข้อมูล Kanban ได้","error")}}export{N as initKanbanPage};
