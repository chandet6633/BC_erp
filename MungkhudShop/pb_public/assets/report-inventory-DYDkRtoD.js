import{f as q,l as y,r as E}from"./index-9Z-6SckO.js";import{e as I,C as w,D as T,A as L,p as R,c as M}from"./chart-bvgMksnO.js";w.register(T,L,R,M);function O(l){var _,f;l.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">analytics</span>
                <h1>รายงานคลังสินค้า</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportInvCSV"><span class="material-icons-outlined">download</span> CSV</button>
                <button class="btn btn-outline" id="btnExportInvXLSX" style="color:#217346;border-color:#217346;"><span class="material-icons-outlined">table_chart</span> Excel</button>
                <button class="btn btn-outline" id="btnPrintInv"><span class="material-icons-outlined">print</span> พิมพ์</button>
            </div>
        </div>
        <div class="card" id="invChartCard" style="margin-bottom:var(--sp-4);display:none;">
            <div class="card-header"><h3>สถานะสต็อก</h3></div>
            <div class="card-body" style="height:260px;position:relative;display:flex;justify-content:center;">
                <canvas id="invChart" style="max-width:350px;"></canvas>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">ประเภทรายงาน</label>
                        <select class="form-control" id="invReportType">
                            <option value="stock_valuation">สินค้าคงคลัง (มีต้นทุน)</option>
                            <option value="stock_card">สต็อกการ์ด (ประวัติเคลื่อนไหว)</option>
                            <option value="requisition_summary">สรุปยอดเบิกสินค้า</option>
                            <option value="low_stock">สินค้าใกล้หมด / หมดสต็อก</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">กลุ่มสินค้า</label>
                        <select class="form-control" id="invGroupFilter">
                            <option value="">ทั้งหมด</option>
                        </select>
                    </div>
                    <div class="form-group" style="justify-content:flex-end;gap:var(--sp-2);flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btnRunInvReport"><span class="material-icons-outlined">search</span> ดูรายงาน</button>
                        <button class="btn btn-outline btn-sm" id="btnInvToday">วันนี้</button>
                        <button class="btn btn-outline btn-sm" id="btnInvThisMonth">เดือนนี้</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="stats-grid" id="invStats" style="margin-bottom:var(--sp-4);"></div>
        <div class="card">
            <div class="card-header"><h3 id="invReportTitle">ผลรายงาน</h3></div>
            <div class="card-body" id="invReportGrid">
                <div class="empty-state" style="padding:var(--sp-8);">
                    <span class="material-icons-outlined" style="font-size:48px;">inventory</span>
                    <h3>กรุณาเลือกประเภทรายงานแล้วกด "ดูรายงาน"</h3>
                </div>
            </div>
        </div>
    `;let i=[],v=[];async function b(){const s=l.querySelector("#invReportType").value,a=l.querySelector("#invGroupFilter").value,n=l.querySelector("#invReportGrid"),r=l.querySelector("#invStats");n.innerHTML='<div style="padding:var(--sp-6);text-align:center;color:var(--color-text-muted);">กำลังคำนวณ...</div>';try{const u=await q("products",{requestKey:null}),p=await q("stock_ledgers",{requestKey:null}),c={},S={};for(const t of p)c[t.product_id]||(c[t.product_id]=0,S[t.product_id]=0),c[t.product_id]+=t.qty||0,S[t.product_id]+=t.total_value||0;let x={};try{(await q("product_groups",{requestKey:null})).forEach(d=>{x[d.id]=d.name})}catch{}let h=u;if(a&&(h=h.filter(t=>t.group_id===a)),s==="stock_valuation"){l.querySelector("#invReportTitle").textContent="สินค้าคงคลัง (มีต้นทุน)",v=[{key:"code",label:"รหัส"},{key:"name",label:"ชื่อสินค้า"},{key:"unit",label:"หน่วย"},{key:"qty",label:"คงเหลือ"},{key:"avg_cost",label:"ต้นทุนเฉลี่ย",render:e=>y(e.avg_cost)},{key:"total_value",label:"มูลค่ารวม",render:e=>y(e.total_value)},{key:"status",label:"สถานะ",render:e=>{const o=e.min_qty||5;return e.qty<=0?'<span class="badge badge-cancelled">หมด</span>':e.qty<=o?'<span class="badge badge-pending">ใกล้หมด</span>':'<span class="badge badge-closed">ปกติ</span>'}}],i=h.map(e=>{const o=c[e.id]||0,m=e.cost||(o>0?(S[e.id]||0)/o:0);return{...e,qty:o,avg_cost:m,total_value:o*m}}).sort((e,o)=>(e.code||"").localeCompare(o.code||""));const t=i.reduce((e,o)=>e+o.total_value,0),d=i.length,C=i.filter(e=>e.qty<=0).length;r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">category</span></div><div class="stat-value">${d}</div><div class="stat-label">รายการ</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">attach_money</span></div><div class="stat-value">${y(t)}</div><div class="stat-label">มูลค่ารวม</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">block</span></div><div class="stat-value">${C}</div><div class="stat-label">หมดสต็อก</div></div>
                `,k(i)}else if(s==="stock_card")l.querySelector("#invReportTitle").textContent="สต็อกการ์ด (ประวัติเคลื่อนไหว)",v=[{key:"created",label:"วันที่",render:t=>t.created?t.created.split(" ")[0]:"-"},{key:"product_id",label:"รหัสสินค้า"},{key:"transaction_type",label:"ประเภท",render:t=>t.transaction_type==="IN"?'<span class="badge badge-closed">เข้า</span>':t.transaction_type==="OUT"?'<span class="badge badge-cancelled">ออก</span>':'<span class="badge badge-pending">ปรับ</span>'},{key:"reference_doc",label:"เอกสารอ้างอิง"},{key:"qty",label:"จำนวน"},{key:"unit_cost",label:"ราคา/หน่วย",render:t=>y(t.unit_cost)},{key:"total_value",label:"มูลค่า",render:t=>y(t.total_value)}],i=[...p].sort((t,d)=>(d.created||"").localeCompare(t.created||"")),r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">swap_vert</span></div><div class="stat-value">${p.length}</div><div class="stat-label">รายการเคลื่อนไหว</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">add_circle</span></div><div class="stat-value">${p.filter(t=>t.transaction_type==="IN").length}</div><div class="stat-label">รับเข้า</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">remove_circle</span></div><div class="stat-value">${p.filter(t=>t.transaction_type==="OUT").length}</div><div class="stat-label">เบิกออก</div></div>
                `;else if(s==="requisition_summary"){l.querySelector("#invReportTitle").textContent="สรุปยอดเบิกสินค้า";const t=p.filter(e=>e.transaction_type==="OUT"),d={};for(const e of t)d[e.product_id]||(d[e.product_id]={product_id:e.product_id,total_qty:0,total_value:0,count:0}),d[e.product_id].total_qty+=Math.abs(e.qty||0),d[e.product_id].total_value+=Math.abs(e.total_value||0),d[e.product_id].count++;v=[{key:"product_id",label:"รหัสสินค้า"},{key:"name",label:"ชื่อสินค้า"},{key:"count",label:"จำนวนครั้ง"},{key:"total_qty",label:"จำนวนเบิกรวม"},{key:"total_value",label:"มูลค่ารวม",render:e=>y(e.total_value)}],i=Object.values(d).map(e=>{const o=u.find(m=>m.id===e.product_id||m.code===e.product_id);return{...e,name:o?o.name:e.product_id}}).sort((e,o)=>o.total_qty-e.total_qty);const C=i.reduce((e,o)=>e+o.total_value,0);r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon orange"><span class="material-icons-outlined">output</span></div><div class="stat-value">${i.length}</div><div class="stat-label">สินค้าที่ถูกเบิก</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">attach_money</span></div><div class="stat-value">${y(C)}</div><div class="stat-label">มูลค่าเบิกรวม</div></div>
                `}else s==="low_stock"&&(l.querySelector("#invReportTitle").textContent="สินค้าใกล้หมด / หมดสต็อก",v=[{key:"code",label:"รหัส"},{key:"name",label:"ชื่อสินค้า"},{key:"qty",label:"คงเหลือ"},{key:"status",label:"สถานะ",render:t=>t.qty<=0?'<span class="badge badge-cancelled">หมด</span>':'<span class="badge badge-pending">ใกล้หมด</span>'}],i=h.map(t=>({...t,qty:c[t.id]||0})).filter(t=>t.qty<=(t.min_qty||5)).sort((t,d)=>t.qty-d.qty),r.innerHTML=`
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">warning</span></div><div class="stat-value">${i.length}</div><div class="stat-label">สินค้าที่ต้องสั่งเพิ่ม</div></div>
                `);i.length>0?n.innerHTML=E({columns:v,items:i}):n.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>'}catch(u){console.error(u),n.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาด</div>'}}let g=null;function k(s){const a=l.querySelector("#invChartCard"),n=l.querySelector("#invChart");if(!a||!n)return;a.style.display="",g&&g.destroy();const r=s.filter(c=>c.qty>5).length,u=s.filter(c=>c.qty>0&&c.qty<=5).length,p=s.filter(c=>c.qty<=0).length;g=new w(n,{type:"doughnut",data:{labels:["ปกติ","ใกล้หมด","หมดสต็อก"],datasets:[{data:[r,u,p],backgroundColor:["#22c55e","#f59e0b","#ef4444"]}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}}}})}l.querySelector("#btnRunInvReport").addEventListener("click",b),l.querySelector("#btnPrintInv").addEventListener("click",()=>window.print()),(async()=>{try{const s=await q("product_groups",{requestKey:null}),a=l.querySelector("#invGroupFilter");s.filter(n=>n.is_active!==!1).forEach(n=>{const r=document.createElement("option");r.value=n.id,r.textContent=n.name,a.appendChild(r)})}catch(s){console.warn("[InvReport] Could not load groups:",s.message)}})(),l.querySelector("#btnExportInvCSV").addEventListener("click",()=>{i.length!==0&&D("inventory_report.csv",v,i)}),l.querySelector("#btnExportInvXLSX").addEventListener("click",async()=>{if(i.length===0)return;const s=v.map(n=>n.label),a=i.map(n=>v.map(r=>n[r.key]??""));await I(s,a,"inventory_report","คลังสินค้า")}),(_=l.querySelector("#btnInvToday"))==null||_.addEventListener("click",()=>{const s=new Date().toISOString().slice(0,10),a=l.querySelector("#invStartDate"),n=l.querySelector("#invEndDate");a&&(a.value=s),n&&(n.value=s),b()}),(f=l.querySelector("#btnInvThisMonth"))==null||f.addEventListener("click",()=>{const s=new Date,a=new Date(s.getFullYear(),s.getMonth(),1).toISOString().slice(0,10),n=s.toISOString().slice(0,10),r=l.querySelector("#invStartDate"),u=l.querySelector("#invEndDate");r&&(r.value=a),u&&(u.value=n),b()})}function D(l,i,v){const b=i.filter(a=>a.key!=="status"||!a.render).map(a=>a.label),g=i.filter(a=>a.key!=="status"||!a.render).map(a=>a.key),k=v.map(a=>g.map(n=>`"${String(a[n]??"").replace(/"/g,'""')}"`).join(",")),_="\uFEFF"+[b.join(","),...k].join(`
`),f=new Blob([_],{type:"text/csv;charset=utf-8;"}),s=document.createElement("a");s.href=URL.createObjectURL(f),s.download=l,s.click()}export{O as initReportInventoryPage};
