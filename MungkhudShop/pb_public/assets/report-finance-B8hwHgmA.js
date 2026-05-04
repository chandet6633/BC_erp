import{f as w,e as C,l as i,r as D}from"./index-9Z-6SckO.js";import{e as H,C as E,B as I,a as O,b as P,L as V,p as A,c as B}from"./chart-bvgMksnO.js";E.register(I,O,P,V,A,B);function z(s){var h,f;const g=new Date().toISOString().slice(0,10),q=new Date(Date.now()-30*864e5).toISOString().slice(0,10);s.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">account_balance</span>
                <h1>รายงานการเงิน</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportFinCSV"><span class="material-icons-outlined">download</span> CSV</button>
                <button class="btn btn-outline" id="btnExportFinXLSX" style="color:#217346;border-color:#217346;"><span class="material-icons-outlined">table_chart</span> Excel</button>
                <button class="btn btn-outline" id="btnPrintFin"><span class="material-icons-outlined">print</span> พิมพ์</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">วันที่เริ่ม</label>
                        <input type="date" class="form-control" id="finStart" value="${q}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">วันที่สิ้นสุด</label>
                        <input type="date" class="form-control" id="finEnd" value="${g}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ประเภทรายงาน</label>
                        <select class="form-control" id="finReportType">
                            <option value="income_expense">สรุปรายรับ-รายจ่าย</option>
                            <option value="sales_by_customer">ยอดขายตามลูกค้า</option>
                            <option value="sales_by_vehicle">ยอดขายตามรถ</option>
                            <option value="daily_summary">สรุปยอดขายรายวัน</option>
                            <option value="below_cost">รายการขายต่ำกว่าทุน</option>
                        </select>
                    </div>
                    <div class="form-group" style="justify-content:flex-end;gap:var(--sp-2);flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btnRunFinReport"><span class="material-icons-outlined">search</span> ดูรายงาน</button>
                        <button class="btn btn-outline btn-sm" id="btnFinToday">วันนี้</button>
                        <button class="btn btn-outline btn-sm" id="btnFinThisMonth">เดือนนี้</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card" id="finChartCard" style="margin-bottom:var(--sp-4);display:none;">
            <div class="card-header"><h3>กราฟรายรับ-รายจ่าย</h3></div>
            <div class="card-body" style="height:280px;position:relative;">
                <canvas id="finChart"></canvas>
            </div>
        </div>
        <div class="stats-grid" id="finStats" style="margin-bottom:var(--sp-4);"></div>
        <div class="card">
            <div class="card-header"><h3 id="finReportTitle">รายละเอียดการเงิน</h3></div>
            <div class="card-body" id="finReportGrid">
                <div class="empty-state" style="padding:var(--sp-8);">
                    <span class="material-icons-outlined" style="font-size:48px;">account_balance</span>
                    <h3>กรุณาเลือกช่วงวันที่แล้วกด "ดูรายงาน"</h3>
                </div>
            </div>
        </div>
    `;let n=[],p=[];async function S(){const b=s.querySelector("#finStart").value,_=s.querySelector("#finEnd").value,v=s.querySelector("#finReportType").value,m=s.querySelector("#finReportGrid"),r=s.querySelector("#finStats");m.innerHTML='<div style="padding:var(--sp-6);text-align:center;color:var(--color-text-muted);">กำลังคำนวณ...</div>';try{const d=await w("jobs",{filter:`status='closed' && end_date >= '${C(b)}' && end_date <= '${C(_)} 23:59:59'`}),l=await w("documents",{filter:`(doc_type='RR' || doc_type='PI' || doc_type='PCN') && issue_date >= '${C(b)}' && issue_date <= '${C(_)} 23:59:59'`}),c=d.reduce((a,e)=>a+(e.grand_total||0),0),$=l.reduce((a,e)=>a+(e.grand_total||0),0),T=c-$,j=d.reduce((a,e)=>a+(e.vat_amount||0),0);if(v==="income_expense"){s.querySelector("#finReportTitle").textContent="สรุปรายรับ-รายจ่าย",r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">trending_up</span></div><div class="stat-value">${i(c)}</div><div class="stat-label">รายรับรวม</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">trending_down</span></div><div class="stat-value">${i($)}</div><div class="stat-label">รายจ่ายรวม</div></div>
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">account_balance</span></div><div class="stat-value" style="color:${T>=0?"var(--color-success)":"#ef4444"}">${i(T)}</div><div class="stat-label">กำไร/ขาดทุน</div></div>
                    <div class="stat-card"><div class="stat-icon orange"><span class="material-icons-outlined">receipt</span></div><div class="stat-value">${i(j)}</div><div class="stat-label">ภาษีขาย (VAT)</div></div>
                `,p=[{key:"type",label:"ประเภท"},{key:"doc_no",label:"เลขเอกสาร"},{key:"date",label:"วันที่"},{key:"entity",label:"ลูกค้า/ผู้จำหน่าย"},{key:"amount",label:"จำนวนเงิน",render:t=>`<span style="color:${t.direction==="in"?"var(--color-success)":"#ef4444"}">${i(t.amount)}</span>`}];const a=d.map(t=>({type:"รายรับ (งานบริการ)",doc_no:t.job_no,date:t.end_date?t.end_date.split(" ")[0]:"",entity:t.customer_name||"-",amount:t.grand_total||0,direction:"in"})),e=l.map(t=>({type:"รายจ่าย (สั่งซื้อ)",doc_no:t.doc_no,date:t.issue_date?t.issue_date.split(" ")[0]:"",entity:t.entity_id||"-",amount:t.grand_total||0,direction:"out"}));n=[...a,...e].sort((t,u)=>(u.date||"").localeCompare(t.date||"")),L(d,l)}else if(v==="sales_by_customer"){s.querySelector("#finReportTitle").textContent="ยอดขายตามลูกค้า";const a={};for(const e of d){const t=e.customer_name||"ไม่ระบุ";a[t]||(a[t]={customer:t,count:0,total:0}),a[t].count++,a[t].total+=e.grand_total||0}p=[{key:"customer",label:"ชื่อลูกค้า"},{key:"count",label:"จำนวนใบงาน"},{key:"total",label:"ยอดรวม",render:e=>i(e.total)},{key:"avg",label:"เฉลี่ยต่อใบ",render:e=>i(e.count>0?e.total/e.count:0)}],n=Object.values(a).sort((e,t)=>t.total-e.total),r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">people</span></div><div class="stat-value">${n.length}</div><div class="stat-label">ลูกค้าที่ใช้บริการ</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">paid</span></div><div class="stat-value">${i(c)}</div><div class="stat-label">ยอดขายรวม</div></div>
                `}else if(v==="sales_by_vehicle"){s.querySelector("#finReportTitle").textContent="ยอดขายตามรถ";const a={};for(const e of d){const t=e.plate||"ไม่ระบุ";a[t]||(a[t]={plate:t,customer:e.customer_name||"-",count:0,total:0}),a[t].count++,a[t].total+=e.grand_total||0}p=[{key:"plate",label:"ทะเบียนรถ"},{key:"customer",label:"ลูกค้า"},{key:"count",label:"จำนวนครั้ง"},{key:"total",label:"ยอดรวม",render:e=>i(e.total)}],n=Object.values(a).sort((e,t)=>t.total-e.total),r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">directions_car</span></div><div class="stat-value">${n.length}</div><div class="stat-label">รถที่เข้าใช้บริการ</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">paid</span></div><div class="stat-value">${i(c)}</div><div class="stat-label">ยอดขายรวม</div></div>
                `}else if(v==="daily_summary"){s.querySelector("#finReportTitle").textContent="สรุปยอดขายรายวัน";const a={};for(const t of d){const u=t.end_date?t.end_date.split(" ")[0]:"ไม่ระบุ";a[u]||(a[u]={date:u,count:0,total:0}),a[u].count++,a[u].total+=t.grand_total||0}p=[{key:"date",label:"วันที่"},{key:"count",label:"จำนวนใบงาน"},{key:"total",label:"ยอดขาย",render:t=>i(t.total)},{key:"avg",label:"เฉลี่ยต่อใบ",render:t=>i(t.count>0?t.total/t.count:0)}],n=Object.values(a).sort((t,u)=>u.date.localeCompare(t.date));const e=n.length>0?c/n.length:0;r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">calendar_today</span></div><div class="stat-value">${n.length}</div><div class="stat-label">จำนวนวันทำงาน</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">paid</span></div><div class="stat-value">${i(c)}</div><div class="stat-label">ยอดขายรวม</div></div>
                    <div class="stat-card"><div class="stat-icon orange"><span class="material-icons-outlined">trending_up</span></div><div class="stat-value">${i(e)}</div><div class="stat-label">เฉลี่ยต่อวัน</div></div>
                `}else if(v==="below_cost"){s.querySelector("#finReportTitle").textContent="รายการขายต่ำกว่าทุน";const a=await w("products",{requestKey:null}),e={};a.forEach(o=>{e[o.id]=o});const t=await w("job_items",{requestKey:null}),u=[];for(const o of t){const y=e[o.product_id];if(!y||!y.cost||y.cost<=0)continue;const R=o.unit_price||0;if(R<y.cost){const x=d.find(M=>M.id===o.job_id);u.push({job_no:x?x.job_no:o.job_id,date:x?(x.end_date||x.created||"").split(" ")[0]:"-",product:y.name,cost:y.cost,sold_at:R,loss:(y.cost-R)*(o.qty||1),qty:o.qty||1})}}p=[{key:"job_no",label:"ใบงาน"},{key:"date",label:"วันที่"},{key:"product",label:"สินค้า"},{key:"qty",label:"จำนวน"},{key:"cost",label:"ต้นทุน",render:o=>i(o.cost)},{key:"sold_at",label:"ขายที่",render:o=>`<span style="color:#ef4444;">${i(o.sold_at)}</span>`},{key:"loss",label:"ขาดทุน",render:o=>`<span style="color:#ef4444;font-weight:600;">-${i(o.loss)}</span>`}],n=u.sort((o,y)=>y.loss-o.loss);const F=n.reduce((o,y)=>o+y.loss,0);r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">warning</span></div><div class="stat-value">${n.length}</div><div class="stat-label">รายการที่ขายต่ำกว่าทุน</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">trending_down</span></div><div class="stat-value" style="color:#ef4444;">${i(F)}</div><div class="stat-label">ขาดทุนรวม</div></div>
                `}n.length>0?m.innerHTML=D({columns:p,items:n}):m.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>'}catch(d){console.error(d),m.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาด</div>'}}let k=null;function L(b,_){const v=s.querySelector("#finChartCard"),m=s.querySelector("#finChart");if(!v||!m)return;v.style.display="",k&&k.destroy();const r={};for(const l of b){const c=l.end_date?l.end_date.split(" ")[0]:"N/A";r[c]||(r[c]={income:0,expense:0}),r[c].income+=l.grand_total||0}for(const l of _){const c=l.issue_date?l.issue_date.split(" ")[0]:"N/A";r[c]||(r[c]={income:0,expense:0}),r[c].expense+=l.grand_total||0}const d=Object.entries(r).sort((l,c)=>l[0].localeCompare(c[0]));k=new E(m,{type:"bar",data:{labels:d.map(([l])=>l),datasets:[{label:"รายรับ",data:d.map(([,l])=>l.income),backgroundColor:"rgba(34,197,94,0.7)",borderRadius:4},{label:"รายจ่าย",data:d.map(([,l])=>l.expense),backgroundColor:"rgba(239,68,68,0.7)",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{beginAtZero:!0,ticks:{callback:l=>"฿"+l.toLocaleString()}}}}})}s.querySelector("#btnRunFinReport").addEventListener("click",S),s.querySelector("#btnPrintFin").addEventListener("click",()=>window.print()),s.querySelector("#btnExportFinCSV").addEventListener("click",()=>{n.length!==0&&X("finance_report.csv",p,n)}),s.querySelector("#btnExportFinXLSX").addEventListener("click",async()=>{if(n.length===0)return;const b=p.map(v=>v.label),_=n.map(v=>p.map(m=>v[m.key]??""));await H(b,_,"finance_report","การเงิน")}),(h=s.querySelector("#btnFinToday"))==null||h.addEventListener("click",()=>{s.querySelector("#finStartDate").value=g,s.querySelector("#finEndDate").value=g,S()}),(f=s.querySelector("#btnFinThisMonth"))==null||f.addEventListener("click",()=>{const b=new Date,_=new Date(b.getFullYear(),b.getMonth(),1).toISOString().slice(0,10);s.querySelector("#finStartDate").value=_,s.querySelector("#finEndDate").value=g,S()})}function X(s,g,q){const n=g.map(f=>f.label),p=g.map(f=>f.key),S=q.map(f=>p.map(b=>`"${String(f[b]??"").replace(/"/g,'""')}"`).join(",")),k="\uFEFF"+[n.join(","),...S].join(`
`),L=new Blob([k],{type:"text/csv;charset=utf-8;"}),h=document.createElement("a");h.href=URL.createObjectURL(L),h.download=s,h.click()}export{z as initReportFinancePage};
