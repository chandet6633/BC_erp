import{f as j,e as x,l as c,r as D}from"./index-9Z-6SckO.js";import{e as M,C as k,B as T,a as R,b as F,L as $,p as A,c as P}from"./chart-bvgMksnO.js";k.register(T,R,F,$,A,P);function O(t){var f,S;const p=new Date().toISOString().slice(0,10),E=new Date(Date.now()-30*864e5).toISOString().slice(0,10);t.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">bar_chart</span>
                <h1>รายงานบริการ / ขาย</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportSalesCSV"><span class="material-icons-outlined">download</span> CSV</button>
                <button class="btn btn-outline" id="btnExportSalesXLSX" style="color:#217346;border-color:#217346;"><span class="material-icons-outlined">table_chart</span> Excel</button>
                <button class="btn btn-outline" id="btnPrintSales"><span class="material-icons-outlined">print</span> พิมพ์</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">วันที่เริ่ม</label>
                        <input type="date" id="repStartDate" class="form-control" value="${E}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">วันที่สิ้นสุด</label>
                        <input type="date" id="repEndDate" class="form-control" value="${p}">
                    </div>
                    <div class="form-group" style="justify-content:flex-end;gap:var(--sp-2);flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btnLoadReport"><span class="material-icons-outlined">search</span> ดูรายงาน</button>
                        <button class="btn btn-outline btn-sm" id="btnToday">วันนี้</button>
                        <button class="btn btn-outline btn-sm" id="btnThisMonth">เดือนนี้</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><span class="material-icons-outlined">receipt</span></div>
                <div class="stat-value" id="statJobCount">0</div>
                <div class="stat-label">จำนวนใบงานที่ปิดแล้ว</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-outlined">paid</span></div>
                <div class="stat-value" id="statTotalRev">฿0</div>
                <div class="stat-label">รายได้รวม</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><span class="material-icons-outlined">trending_up</span></div>
                <div class="stat-value" id="statAvg">฿0</div>
                <div class="stat-label">เฉลี่ยต่อใบ</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-outlined">person</span></div>
                <div class="stat-value" id="statCustomers">0</div>
                <div class="stat-label">ลูกค้าที่ใช้บริการ</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;"><span class="material-icons-outlined">savings</span></div>
                <div class="stat-value" id="statProfit">฿0</div>
                <div class="stat-label">กำไรรวม</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(168,85,247,0.15);color:#a855f7;"><span class="material-icons-outlined">percent</span></div>
                <div class="stat-value" id="statMargin">0%</div>
                <div class="stat-label">อัตรากำไร</div>
            </div>
        </div>
        <div class="card" style="margin-top:var(--sp-4);margin-bottom:var(--sp-4);">
            <div class="card-header"><h3>กราฟรายได้รายวัน</h3></div>
            <div class="card-body" style="height:280px;position:relative;">
                <canvas id="salesChart"></canvas>
            </div>
        </div>
        <div class="card" style="margin-top:var(--sp-4);">
            <div class="card-header"><h3>รายละเอียดรายงาน</h3></div>
            <div class="card-body" id="reportGrid">
                <div class="empty-state" style="padding:var(--sp-8);">
                    <span class="material-icons-outlined" style="font-size:48px;">assessment</span>
                    <h3>กรุณาเลือกช่วงวันที่แล้วกด "ดูรายงาน"</h3>
                </div>
            </div>
        </div>
    `;const v=[{key:"job_no",label:"เลขใบงาน"},{key:"date",label:"วันที่เสร็จ"},{key:"customer",label:"ลูกค้า"},{key:"plate",label:"ทะเบียนรถ"},{key:"subtotal",label:"มูลค่า (ก่อน VAT)",render:e=>c(e.subtotal)},{key:"discount",label:"ส่วนลด",render:e=>c(e.discount)},{key:"total",label:"รวมทั้งสิ้น",render:e=>c(e.total)},{key:"profit",label:"กำไร",render:e=>{const l=e.profit||0;return`<span style="color:${l>=0?"#22c55e":"#ef4444"};font-weight:600;">${c(l)}</span>`}}];let i=[];async function u(){const e=t.querySelector("#reportGrid");e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังคำนวณรายงาน...</div>';const l=t.querySelector("#repStartDate").value,r=t.querySelector("#repEndDate").value;try{const o=await j("jobs",{filter:`status='closed' && end_date >= '${x(l)}' && end_date <= '${x(r)} 23:59:59'`});let s=0,n=0,d=0;const b=new Set;i=[];for(const a of o){const g=typeof a.subtotal=="number"?a.subtotal:0,q=typeof a.discount_amount=="number"?a.discount_amount:0,C=typeof a.grand_total=="number"?a.grand_total:0,_=typeof a.profit=="number"?a.profit:0,w=typeof a.total_cost=="number"?a.total_cost:0;s+=C,n+=_,d+=w,a.customer_name&&b.add(a.customer_name),i.push({job_no:a.job_no,date:a.end_date?a.end_date.split(" ")[0]:"",customer:a.customer_name||"-",plate:a.plate||"-",subtotal:g,discount:q,total:C,profit:_})}t.querySelector("#statJobCount").textContent=o.length,t.querySelector("#statTotalRev").textContent=c(s),t.querySelector("#statAvg").textContent=o.length>0?c(s/o.length):"฿0",t.querySelector("#statCustomers").textContent=b.size;const y=t.querySelector("#statProfit");y&&(y.textContent=c(n),y.style.color=n>=0?"#22c55e":"#ef4444");const h=t.querySelector("#statMargin");h&&(h.textContent=s>0?(n/s*100).toFixed(1)+"%":"0%"),i.sort((a,g)=>g.job_no.localeCompare(a.job_no)),L(i),i.length>0?e.innerHTML=D({columns:v,items:i}):e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ไม่พบข้อมูลในช่วงวันที่เลือก</div>'}catch(o){console.error(o),e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>'}}let m=null;function L(e){const l=t.querySelector("#salesChart");if(!l)return;m&&m.destroy();const r={};for(const s of e){const n=s.date||"N/A";r[n]=(r[n]||0)+s.total}const o=Object.entries(r).sort((s,n)=>s[0].localeCompare(n[0]));m=new k(l,{type:"bar",data:{labels:o.map(([s])=>s),datasets:[{label:"รายได้ (฿)",data:o.map(([,s])=>s),backgroundColor:"rgba(37, 99, 235, 0.7)",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,ticks:{callback:s=>"฿"+s.toLocaleString()}}}}})}t.querySelector("#btnLoadReport").addEventListener("click",u),t.querySelector("#btnPrintSales").addEventListener("click",()=>window.print()),t.querySelector("#btnExportSalesCSV").addEventListener("click",()=>{if(i.length===0)return;const e=v.map(d=>d.label),l=v.map(d=>d.key),r=i.map(d=>l.map(b=>`"${String(d[b]??"").replace(/"/g,'""')}"`).join(",")),o="\uFEFF"+[e.join(","),...r].join(`
`),s=new Blob([o],{type:"text/csv;charset=utf-8;"}),n=document.createElement("a");n.href=URL.createObjectURL(s),n.download="sales_report.csv",n.click()}),t.querySelector("#btnExportSalesXLSX").addEventListener("click",async()=>{if(i.length===0)return;const e=v.map(r=>r.label),l=i.map(r=>v.map(o=>r[o.key]??""));await M(e,l,"sales_report","รายงานขาย")}),(f=t.querySelector("#btnToday"))==null||f.addEventListener("click",()=>{t.querySelector("#repStartDate").value=p,t.querySelector("#repEndDate").value=p,u()}),(S=t.querySelector("#btnThisMonth"))==null||S.addEventListener("click",()=>{const e=new Date,l=new Date(e.getFullYear(),e.getMonth(),1).toISOString().slice(0,10);t.querySelector("#repStartDate").value=l,t.querySelector("#repEndDate").value=p,u()}),u()}export{O as initReportSalesPage};
