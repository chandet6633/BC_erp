import"./app-shell-DruINWZs.js";/* empty css                      *//* empty css                 *//* empty css                    *//* empty css              */import"./helpers-DHRWRroM.js";import"./ui-D6UlSK9g.js";import"./auditService-OL5IOGvx.js";import"./authService-B7yCEaIZ.js";import{r as q}from"./branch-switcher-kq8tRr9A.js";const F={async exportToPDF(a,t="report.pdf"){const o={margin:10,filename:t,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,letterRendering:!0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}};try{return await html2pdf().set(o).from(a).save(),!0}catch(n){return console.error("PDF Export failed:",n),!1}}};window.ReportService=F;window.transactions=[];window.serviceItems=[];window.productGroups=[];window.orderDiscrepancies=[];window.expenses=[];window.quickAddJobData=null;window.selectedBatch=new Set;window.dateFilterActive=!1;window.safeSetText=function(a,t){const o=document.getElementById(a);o&&(o.textContent=t)};document.addEventListener("DOMContentLoaded",()=>{if(document.body.addEventListener("click",e=>{e.target&&e.target.id==="btnAddMissingItem"&&(console.log("Delegated Click: Calling startQuickAddProcess"),typeof window.startQuickAddProcess=="function"?window.startQuickAddProcess():(alert("FATAL: window.startQuickAddProcess is NOT a function"),console.error("window.startQuickAddProcess is missing",window))),e.target&&e.target.id==="btnAutoSuggestFix"&&(console.log("Delegated Click: Calling autoSuggestFix"),typeof window.autoSuggestFix=="function"&&window.autoSuggestFix())}),!requireOwner())return;setupTabs(document.querySelectorAll(".tab-btn"),document.querySelectorAll(".tab-content")),document.getElementById("runAuditBtn").addEventListener("click",runFullAudit),document.getElementById("cancelQuickAddBtn").addEventListener("click",()=>{document.getElementById("quickAddModal").classList.remove("show")}),document.getElementById("saveQuickAddBtn").addEventListener("click",saveQuickAdd),document.getElementById("closeDetailBtn").addEventListener("click",()=>{document.getElementById("orderDetailModal").classList.remove("show")}),document.getElementById("applyDateFilter").addEventListener("click",()=>{dateFilterActive=!0,renderOrderAudit()}),document.getElementById("clearDateFilter").addEventListener("click",()=>{document.getElementById("auditDateFrom").value="",document.getElementById("auditDateTo").value="",dateFilterActive=!1,renderOrderAudit()}),document.getElementById("selectAllCheck").addEventListener("change",e=>{const d=e.target.checked;document.querySelectorAll(".batch-check").forEach(i=>{i.checked=d}),selectedBatch.clear(),d&&orderDiscrepancies.forEach(i=>selectedBatch.add(i.job_id)),updateBatchBar()}),document.getElementById("selectAllBtn").addEventListener("click",()=>{document.querySelectorAll(".batch-check").forEach(e=>{e.checked=!0}),orderDiscrepancies.forEach(e=>selectedBatch.add(e.job_id)),updateBatchBar()}),document.getElementById("deselectAllBtn").addEventListener("click",()=>{document.querySelectorAll(".batch-check").forEach(e=>{e.checked=!1}),selectedBatch.clear(),updateBatchBar()}),document.getElementById("exportAuditBtn").addEventListener("click",exportAuditCSV);const a=new Date,t=a.getFullYear(),o=String(a.getMonth()+1).padStart(2,"0");document.getElementById("auditDateFrom").value=`${t}-${o}-01`;const n=new Date(t,a.getMonth()+1,0).getDate();document.getElementById("auditDateTo").value=`${t}-${o}-${String(n).padStart(2,"0")}`,document.getElementById("revAuditDateFrom").value=`${t}-${o}-01`,document.getElementById("revAuditDateTo").value=`${t}-${o}-${String(n).padStart(2,"0")}`,document.getElementById("applyRevAuditFilter").addEventListener("click",()=>runRevenueVerification()),document.getElementById("clearRevAuditFilter").addEventListener("click",()=>{document.getElementById("revAuditDateFrom").value=`${t}-${o}-01`,document.getElementById("revAuditDateTo").value=`${t}-${o}-${String(n).padStart(2,"0")}`,runRevenueVerification()}),runFullAudit()});window.autoSuggestFix=function(){var o;if(!quickAddJobData)return;const a=quickAddJobData.diffRevenue||0,t=quickAddJobData.diffProfit||0;a>0||a===0&&t>0?(window.startQuickAddProcess(),setTimeout(()=>{var n;if(a>0){document.getElementById("qaPrice").value=a;const e=a-t;document.getElementById("qaCost").value=e>0?e:0}else(n=window.showToast)==null||n.call(window,"รายได้ตรงกันแล้ว แต่กำไรไม่ตรง กรุณาใช้ปุ่ม ✏️ เพื่อแก้ไขต้นทุน","warning")},300)):(o=window.showToast)==null||o.call(window,"ยอดรวมใบต่ำกว่ารายการสินค้า ไม่สามารถเพิ่มอัตโนมัติได้ กรุณาตรวจสอบและแก้ไขหรือลบรายการ","warning")};window.toggleInlineEdit=function(a,t){const o=document.getElementById(`detailTx${a}`),n=document.getElementById(`inputTx${a}`);if(!(!o||!n))if(t){o.style.display="none",n.style.display="block",n.focus();const e=quickAddJobData&&a==="Revenue"?quickAddJobData.total_revenue:quickAddJobData&&quickAddJobData.total_profit;n.value=Number(e||0)}else o.style.display="block",n.style.display="none"};window.saveInlineEdit=async function(a){var d,i,c,r;if(!quickAddJobData)return;const t=document.getElementById(`inputTx${a}`);if(!t)return;const o=Number(t.value),n=a==="Revenue"?"total_revenue":"total_profit",e=transactions.find(s=>s.job_id===quickAddJobData.job_id);if(!e){(d=window.showToast)==null||d.call(window,"ไม่พบรายการในระบบ","error"),window.toggleInlineEdit(a,!1);return}try{(i=window.showLoading)==null||i.call(window),await window.pb.collection("transactions").update(e.id,{[n]:o});const s=document.getElementById(`cardDetailTx${a}`);if(s){const f=s.style.background;s.style.background="rgba(34,197,94,0.1)",setTimeout(()=>s.style.background=f,1e3)}window.toggleInlineEdit(a,!1),await runFullAudit();const l=orderDiscrepancies.find(f=>f.job_id===quickAddJobData.job_id);l&&(quickAddJobData=l,safeSetText(`detailTx${a}`,l[n==="total_revenue"?"total_revenue":"total_profit"]),safeSetText("detailTxRevenue",formatCurrency(l.total_revenue)),safeSetText("detailDiffRevenue",formatCurrency(l.diffRevenue)),safeSetText("detailTxProfit",formatCurrency(l.total_profit)),safeSetText("detailDiffProfit",formatCurrency(l.diffProfit)))}catch(s){console.error("Inline save failed",s),(c=window.showToast)==null||c.call(window,s.message||"บันทึกไม่สำเร็จ","error"),window.toggleInlineEdit(a,!1)}finally{(r=window.hideLoading)==null||r.call(window)}};window.startQuickAddProcess=async function(){if(console.log("Debugging: startQuickAddProcess START"),!quickAddJobData){console.error("CRITICAL: quickAddJobData is Missing!"),showToast("Error: No Job Selected. Please close and re-open the order detail.","error");return}console.log("Context OK:",quickAddJobData.job_id),document.getElementById("orderDetailModal").classList.remove("show");try{document.getElementById("qaJobId").textContent=quickAddJobData.job_id,document.getElementById("qaCustomer").textContent=quickAddJobData.customer_name||"-",document.getElementById("qaPlate").textContent=quickAddJobData.car_registration||quickAddJobData.red_plate||"-",document.getElementById("qaItemCode").value="",document.getElementById("qaItemName").value="",document.getElementById("qaQuantity").value="1",document.getElementById("qaCost").value="0",document.getElementById("qaPrice").value="";const a=document.getElementById("qaProductGroup");a.innerHTML='<option value="">Loading...</option>',console.log("Fetching Product Groups...");try{productGroups=await window.TransactionService.getFullProductGroups(),console.log(`Fetched ${productGroups.length} groups from DB`)}catch(e){console.error("DB Fetch Error Details:",e.response||e),showToast("Database Error: "+(e.message||"Cannot fetch product groups"),"error")}a.innerHTML='<option value="">-- ไม่ระบุ (ไม่ปรับยอดกลุ่ม) --</option>';const t=new Map;productGroups.forEach(e=>{e.name&&t.set(e.name,e)});const o=Array.from(t.values()).sort((e,d)=>e.name.localeCompare(d.name));if(console.log(`Unique Groups to render: ${o.length}`),o.length>0)o.forEach(e=>{const d=document.createElement("option");d.value=e.name,d.textContent=`${e.name} (${e.code||"-"})`,a.appendChild(d)});else{const e=document.createElement("option");e.disabled=!0,e.textContent="ไม่พบข้อมูลกลุ่มสินค้า",a.appendChild(e)}const n=quickAddJobData.diffRevenue;n>0&&(document.getElementById("qaPrice").value=n.toFixed(2)),document.getElementById("quickAddModal").classList.add("show")}catch(a){console.error("Fatal Error inside openQuickAddFromDetail:",a),alert("Fatal Error: "+a.message)}};window.saveQuickAdd=async function(){const a=document.getElementById("qaItemName").value.trim();if(!a){window.showToast("กรุณาใส่ชื่อสินค้า","error");return}const t=document.getElementById("qaItemCode").value.trim()||"UNASSIGNED",o=parseFloat(document.getElementById("qaQuantity").value)||1,n=parseFloat(document.getElementById("qaCost").value)||0,e=parseFloat(document.getElementById("qaPrice").value)||0,d=e-n,i=document.getElementById("qaProductGroup").value,c={job_id:quickAddJobData.job_id,open_date:quickAddJobData.open_date,close_date:quickAddJobData.close_date,customer_name:quickAddJobData.customer_name,item_code:t,item_name:a,quantity:o,total_cost:n,total_price:e,total_profit:d,avg_cost:o>0?n/o:0,avg_price:o>0?e/o:0,avg_profit:o>0?d/o:0,car_registration:quickAddJobData.car_registration,red_plate:quickAddJobData.red_plate,product_group:i,branch:getBranch()};showLoading();try{await window.TransactionService.createServiceItem(c)}catch(r){hideLoading(),showToast("บันทึกรายการไม่สำเร็จ: "+r.message,"error");return}if(i){const r=(quickAddJobData.open_date||"").slice(0,7),s=productGroups.find(u=>u.name===i&&u.report_month===r),l=productGroups.find(u=>u.name===i),f=l?l.code:"UNKNOWN";if(s){const u=Number(s.total_sales||0)+e,h=Number(s.total_profit||0)+d,w=Number(s.total_cost||0)+n,y=Number(s.quantity||0)+o;try{await window.TransactionService.updateProductGroup(s.id,{total_sales:u,total_profit:h,total_cost:w,quantity:y})}catch(g){console.error("Update PG Error:",g)}}else{const u={report_month:r,code:f,name:i,quantity:o,total_sales:e,total_cost:n,total_profit:d,margin:e>0?d/e*100:0,branch:getBranch()};try{await window.TransactionService.createProductGroup(u)}catch(h){console.error("Create PG Error:",h)}}}try{const r=getBranch();await window.AuditService.reconcileJob(quickAddJobData.job_id,r),console.log(`Successfully reconciled parent transaction for ${quickAddJobData.job_id}`)}catch(r){console.error("Failed to reconcile parent transaction:",r),showToast("แจ้งเตือน: บันทึกสินค้าสำเร็จ แต่การปรับยอดใบบันทึกหลักขัดข้อง","warning")}hideLoading(),showToast("บันทึกรายการสำเร็จ","success"),document.getElementById("quickAddModal").classList.remove("show"),runFullAudit()};window.toggleBatch=function(a,t){t?selectedBatch.add(a):selectedBatch.delete(a),updateBatchBar()};window.updateBatchBar=function(){const a=document.getElementById("batchBar"),t=window.selectedBatch.size;document.getElementById("batchCount").textContent=t,a.style.display=t>0?"block":"none"};const M={suphanburi:"BC Auto เมืองสุพรรณ",samchuk:"BC AUTO XPERIENCE (สามชุก)","BC Auto Service":"BC Auto Service (วิริยะเซอร์วิส)"};var T;const C=(T=window.AuthService)==null?void 0:T.getBranch(),R=M[C]||C||"BC Auto";document.title=`ตรวจสอบข้อมูล | ${R}`;window.runFullAudit=async function(){window.showLoading();const a=`${window.getBranchFilter()}`,[t,o,n,e]=await Promise.all([window.TransactionService.getFullTransactions({filter:a}),window.TransactionService.getFullServiceItems({filter:a}),window.TransactionService.getFullProductGroups({filter:a}),window.EntryService.getExpenses(1,1e5,{filter:a}).then(d=>d.items)]);transactions=t||[],serviceItems=o||[],productGroups=n||[],expenses=e||[],runOrderAudit(),runGroupAudit(),detectAnomalies(),runCostVerification(),runRevenueVerification(),updateSummary(),hideLoading()};window.runOrderAudit=function(){orderDiscrepancies=window.AuditService.runOrderAudit(transactions,serviceItems),renderOrderAudit()};window.renderOrderAudit=function(){const a=document.querySelector("#orderAuditTable tbody");let t=orderDiscrepancies;if(dateFilterActive){const r=document.getElementById("auditDateFrom").value,s=document.getElementById("auditDateTo").value;r&&(t=t.filter(l=>(l.open_date||"").slice(0,10)>=r)),s&&(t=t.filter(l=>(l.open_date||"").slice(0,10)<=s))}const o=t.length;let n=0,e=0;t.forEach(r=>{n+=r.diffRevenue,e+=r.diffProfit});const d=document.getElementById("triageDiscrepantJobs"),i=document.getElementById("triageDiffRevenue"),c=document.getElementById("triageDiffProfit");if(d&&(d.textContent=o),i&&(i.textContent=formatCurrency(n)),c&&(c.textContent=formatCurrency(e)),t.length===0){a.innerHTML='<tr><td colspan="10" class="text-center text-muted" style="padding:2rem;">✅ ไม่พบความคลาดเคลื่อน — ข้อมูลใบบันทึกบริการตรงกันทั้งหมด</td></tr>';return}a.innerHTML=t.map(r=>{const s=Math.max(Math.abs(r.diffRevenue),Math.abs(r.diffProfit));let l="";return s>1e3?l="background: rgba(239, 68, 68, 0.08);":s>0&&(l="background: rgba(245, 158, 11, 0.08);"),`
        <tr class="discrepancy" style="cursor:pointer; ${l}">
            <td onclick="event.stopPropagation()" data-label="เลือก"><input type="checkbox" class="batch-check" data-job="${r.job_id}" ${selectedBatch.has(r.job_id)?"checked":""} onchange="toggleBatch('${r.job_id}', this.checked)"></td>
            <td onclick="showOrderDetail('${r.job_id}')" data-label="Job ID"><strong>${r.job_id}</strong></td>
            <td onclick="showOrderDetail('${r.job_id}')" data-label="ลูกค้า">${r.customer_name||"-"}</td>
            <td onclick="showOrderDetail('${r.job_id}')" data-label="วันที่">${r.open_date?formatDate(r.open_date):"-"}</td>
            <td class="text-right" data-label="รายได้(ใบ)">${formatCurrency(r.total_revenue)}</td>
            <td class="text-right" data-label="รายได้(สินค้า)">${formatCurrency(r.itemsRevenue)}</td>
            <td class="text-right ${r.diffRevenue!==0?"text-red":""}" data-label="ส่วนต่างรายได้">${formatCurrency(r.diffRevenue)}</td>
            <td class="text-right" data-label="กำไร(ใบ)">${formatCurrency(r.total_profit)}</td>
            <td class="text-right" data-label="กำไร(สินค้า)">${formatCurrency(r.itemsProfit)}</td>
            <td class="text-right ${r.diffProfit!==0?"text-red":""}" data-label="ส่วนต่างกำไร">${formatCurrency(r.diffProfit)}</td>
        </tr>
    `}).join("")};window.showOrderDetail=function(a){const t=orderDiscrepancies.find(c=>c.job_id===a);if(!t)return;safeSetText("detailJobId",t.job_id),safeSetText("detailCustomer",t.customer_name||"-"),document.getElementById("detailPlate").textContent=t.car_registration||t.red_plate||"-",safeSetText("detailDate",t.open_date?formatDate(t.open_date):"-"),safeSetText("detailTxRevenue",formatCurrency(t.total_revenue)),safeSetText("detailSiRevenue",formatCurrency(t.itemsRevenue)),safeSetText("detailDiffRevenue",formatCurrency(t.diffRevenue)),safeSetText("detailTxProfit",formatCurrency(t.total_profit)),safeSetText("detailSiProfit",formatCurrency(t.itemsProfit)),safeSetText("detailDiffProfit",formatCurrency(t.diffProfit));const o=document.getElementById("btnEditTransaction"),n=document.getElementById("cardDetailTxRevenue"),e=document.getElementById("cardDetailTxProfit");if(transactions.find(c=>c.job_id===t.job_id)){o&&(o.style.display="none"),n&&(n.onclick=()=>window.toggleInlineEdit("Revenue",!0)),e&&(e.onclick=()=>window.toggleInlineEdit("Profit",!0));const c=document.getElementById("inputTxRevenue"),r=document.getElementById("inputTxProfit");c&&!c.dataset.listenersAdded&&(c.onkeydown=s=>{s.key==="Enter"&&window.saveInlineEdit("Revenue"),s.key==="Escape"&&window.toggleInlineEdit("Revenue",!1)},c.onblur=()=>window.toggleInlineEdit("Revenue",!1),c.dataset.listenersAdded="true"),r&&!r.dataset.listenersAdded&&(r.onkeydown=s=>{s.key==="Enter"&&window.saveInlineEdit("Profit"),s.key==="Escape"&&window.toggleInlineEdit("Profit",!1)},r.onblur=()=>window.toggleInlineEdit("Profit",!1),r.dataset.listenersAdded="true")}else o&&(o.style.display="none"),n&&(n.onclick=null),e&&(e.onclick=null);const i=document.getElementById("detailItemsBody");t.items.length===0?i.innerHTML='<tr><td colspan="7" class="text-center text-muted">ไม่พบรายการสินค้าสำหรับใบบันทึกบริการนี้</td></tr>':i.innerHTML=t.items.map(c=>`
            <tr>
                <td data-label="รหัสสินค้า">${c.item_code||"-"}</td>
                <td data-label="ชื่อสินค้า">${c.item_name||"-"}</td>
                <td class="text-right" data-label="จำนวน">${Number(c.quantity||0)}</td>
                <td class="text-right" data-label="ทุนรวม">${formatCurrency(c.total_cost)}</td>
                <td class="text-right" data-label="ขายรวม">${formatCurrency(c.total_price)}</td>
                <td class="text-right ${Number(c.total_profit||0)>=0?"text-green":"text-red"}" data-label="กำไร">${formatCurrency(c.total_profit)}</td>
                <td class="text-center" data-label="จัดการ">-</td>
            </tr>
        `).join(""),quickAddJobData=t,document.getElementById("orderDetailModal").classList.add("show")};window.runGroupAudit=function(){const a=[...new Set(window.productGroups.map(n=>n.report_month).filter(Boolean))].sort().reverse(),t=document.getElementById("auditMonthFilter"),o=t.value||a[0]||"";t.innerHTML=a.map(n=>`<option value="${n}" ${n===o?"selected":""}>${n}</option>`).join(""),t.onchange=()=>renderGroupAudit(),renderGroupAudit()};window.renderGroupAudit=function(){const a=document.getElementById("auditMonthFilter").value,{pgForMonth:t,totals:o,matches:n}=window.AuditService.runGroupAudit(productGroups,serviceItems,transactions,a),{pg:e,si:d,tx:i}=o,{pgSiSales:c,pgTxSales:r,siTxSales:s,pgSiProfit:l,pgTxProfit:f,siTxProfit:u}=n,y=!(c&&r)||!(l&&f),g=e.sales-i.sales,v=e.profit-i.profit,x=m=>m?"✅":"❌",E=m=>m?"var(--accent-green)":"var(--accent-red)",b=m=>m?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",_=document.getElementById("groupGrandTotal");_.innerHTML=`
        <div class="table-container mb-2">
            <table style="font-size:0.9rem;">
                <thead>
                    <tr>
                        <th>แหล่งข้อมูล</th>
                        <th class="text-right">ยอดขาย/รายได้</th>
                        <th class="text-right">กำไร</th>
                        <th>คำอธิบาย</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>📦 Product Groups</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(e.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(e.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">สรุปยอดขายตามกลุ่มสินค้า</td>
                    </tr>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>🔧 Service Items</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(d.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(d.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">รวมรายการสินค้าทุกใบบันทึก</td>
                    </tr>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>💰 Transactions</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(i.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(i.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">ยอดรับจริงจากลูกค้า</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="d-flex gap-2 flex-wrap mb-2" style="font-size:0.85rem;">
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${b(c&&l)};">
                <span style="color:${E(c&&l)};">${x(c&&l)}</span>
                <strong>PG ↔ SI:</strong>
                ขาย ${c?"ตรง":formatCurrency(e.sales-d.sales)}
                | กำไร ${l?"ตรง":formatCurrency(e.profit-d.profit)}
            </div>
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${b(r&&f)};">
                <span style="color:${E(r&&f)};">${x(r&&f)}</span>
                <strong>PG ↔ TX:</strong>
                ขาย ${r?"ตรง":formatCurrency(e.sales-i.sales)}
                | กำไร ${f?"ตรง":formatCurrency(e.profit-i.profit)}
            </div>
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${b(s&&u)};">
                <span style="color:${E(s&&u)};">${x(s&&u)}</span>
                <strong>SI ↔ TX:</strong>
                ขาย ${s?"ตรง":formatCurrency(d.sales-i.sales)}
                | กำไร ${u?"ตรง":formatCurrency(d.profit-i.profit)}
            </div>
        </div>
    `;const D=Math.abs(g),S=Math.abs(v),k=t.map(m=>{const p=Number(m.total_sales||0),A=Number(m.total_profit||0);let $=0;if(y){if(D>.5&&p>0){const B=Math.min(p,D)/Math.max(p,D);B>.8?$+=3:B>.5?$+=2:p>=D*.9&&($+=1)}if(S>.5&&Math.abs(A)>0){const B=Math.min(Math.abs(A),S)/Math.max(Math.abs(A),S);B>.8?$+=3:B>.5&&($+=2)}}return{code:m.code,name:m.name,quantity:Number(m.quantity||0),sales:p,profit:A,suspectScore:$}});k.sort((m,p)=>m.suspectScore!==p.suspectScore?p.suspectScore-m.suspectScore:p.sales-m.sales);const I=document.querySelector("#groupAuditTable tbody");t.length===0?I.innerHTML='<tr><td colspan="5" class="text-center text-muted" style="padding:2rem;">ไม่พบข้อมูลกลุ่มสินค้าสำหรับเดือนนี้</td></tr>':I.innerHTML=k.map(m=>{const p=m.suspectScore>=2;return`
            <tr class="${p?"discrepancy":""}">
                <td data-label="รหัสกลุ่ม"><strong>${m.code}</strong></td>
                <td data-label="ชื่อกลุ่ม">${m.name} ${p?'<span class="badge badge-warning">🔍 ต้องสงสัย</span>':""}</td>
                <td class="text-right" data-label="จำนวน">${m.quantity.toLocaleString()}</td>
                <td class="text-right" data-label="ยอดขาย">${formatCurrency(m.sales)}</td>
                <td class="text-right ${m.profit>=0?"text-green":"text-red"}" data-label="กำไร">${formatCurrency(m.profit)}</td>
            </tr>
            `}).join(""),!y&&t.length>0&&(I.innerHTML='<tr><td colspan="5" class="text-center" style="padding:1rem; color:var(--accent-green);">✅ ยอดรวมตรงกัน — ไม่พบความคลาดเคลื่อน</td></tr>'+I.innerHTML),document.getElementById("totalGroups").textContent=t.length;const P=k.filter(m=>m.suspectScore>=2).length;document.getElementById("groupDiscrepancies").textContent=y?P||"⚠️":"0"};window.updateSummary=function(){window.safeSetText("totalOrders",window.transactions.length),window.safeSetText("orderDiscrepancies",window.orderDiscrepancies.length);const a={};serviceItems.forEach(e=>{a[e.job_id]=!0});const t=transactions.filter(e=>a[e.job_id]).length,o=transactions.length>0?(t/transactions.length*100).toFixed(1):100;safeSetText("completenessScore",`${o}%`);const n=document.getElementById("completenessScore");n&&(o>=95?(n.className="kpi-value positive",safeSetText("completenessLabel",`${t}/${transactions.length} ใบ`)):o>=80?(n.className="kpi-value",n.style.color="#f59e0b",safeSetText("completenessLabel",`${t}/${transactions.length} ใบ`)):(n.className="kpi-value negative",safeSetText("completenessLabel",`${t}/${transactions.length} ใบ`)))};window.exportAuditCSV=function(){if(window.orderDiscrepancies.length===0){window.showToast("ไม่มีข้อมูลให้ส่งออก","error");return}const a=["Job ID","ลูกค้า","วันที่เปิด","รายได้(ใบ)","รายได้(สินค้า)","ส่วนต่างรายได้","กำไร(ใบ)","กำไร(สินค้า)","ส่วนต่างกำไร"],t=orderDiscrepancies.map(i=>[i.job_id,i.customer_name||"",i.open_date||"",i.total_revenue,i.itemsRevenue,i.diffRevenue,i.total_profit,i.itemsProfit,i.diffProfit]);let o="\uFEFF"+a.join(",")+`
`;t.forEach(i=>{o+=i.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")+`
`});const n=new Blob([o],{type:"text/csv;charset=utf-8;"}),e=URL.createObjectURL(n),d=document.createElement("a");d.href=e,d.download=`audit_report_${new Date().toISOString().slice(0,10)}.csv`,d.click(),URL.revokeObjectURL(e),showToast("ส่งออก CSV สำเร็จ","success")};window.detectAnomalies=function(){const a=document.getElementById("anomalySection"),t=window.AuditService.detectAnomalies(transactions);if(transactions.length<5){a.innerHTML='<p class="text-muted">ข้อมูลไม่เพียงพอ (ต้องมีอย่างน้อย 5 ใบงาน)</p>';return}if(t.length===0){a.innerHTML='<p style="color:var(--accent-green);">✅ ไม่พบรายการผิดปกติ</p>';return}const{mean:o,stdDev:n}=t[0],e=2;a.innerHTML=`
        <p class="text-muted mb-1" style="font-size:0.8rem;">ค่าเฉลี่ย: ${formatCurrency(o)} | Std Dev: ${formatCurrency(n)} | Threshold: >${formatCurrency(o+e*n)} หรือ <${formatCurrency(Math.max(0,o-e*n))}</p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Job ID</th>
                        <th>ลูกค้า</th>
                        <th>วันที่</th>
                        <th>รายได้</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${t.map(d=>{const i=Number(d.total_revenue||0),c=i>o+e*n;return`
                        <tr>
                            <td data-label="Job ID"><strong>${d.job_id}</strong></td>
                            <td data-label="ลูกค้า">${d.customer_name||"-"}</td>
                            <td data-label="วันที่">${d.open_date?formatDate(d.open_date):"-"}</td>
                            <td class="text-right" data-label="รายได้">${formatCurrency(i)}</td>
                            <td data-label="สถานะ"><span class="badge ${c?"badge-warning":"badge-danger"}">${c?"⬆ สูงผิดปกติ":"⬇ ต่ำผิดปกติ"}</span></td>
                        </tr>`}).join("")}
                </tbody>
            </table>
        </div>
        <p class="text-muted mt-1" style="font-size:0.8rem;">พบ ${t.length} รายการผิดปกติจาก ${transactions.length} รายการทั้งหมด</p>
    `};window.runCostVerification=function(){const a=document.getElementById("costVerifySection"),{totals:t,monthlyData:o,diffSi:n,diffTx:e}=window.AuditService.runCostVerification(window.serviceItems,transactions,expenses),{siCogs:d,txCogs:i,actualPurchase:c}=t,r=expenses.filter(f=>f.excluded),s=r.length>0,l=Object.keys(o).sort().reverse();a.innerHTML=`
        <!-- Summary cards -->
        <div class="d-flex gap-2 flex-wrap mb-3" style="font-size:0.9rem;">
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">ต้นทุนระบบ (SI)</div>
                <div style="font-size:1.2rem; font-weight:700;">${formatCurrency(d)}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">ต้นทุนระบบ (TX)</div>
                <div style="font-size:1.2rem; font-weight:700;">${formatCurrency(i)}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">รายจ่ายสินค้า (จริง)</div>
                <div style="font-size:1.2rem; font-weight:700;">${s?formatCurrency(c):'<span class="text-muted">ยังไม่มีข้อมูล</span>'}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:${s&&Math.abs(n)>.5?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)"};">
                <div class="text-muted" style="font-size:0.8rem;">ส่วนต่าง (SI vs จริง)</div>
                <div style="font-size:1.2rem; font-weight:700; color:${s&&Math.abs(n)>.5?"var(--accent-red)":"var(--accent-green)"};">
                    ${s?formatCurrency(n):"-"}
                </div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:${s&&Math.abs(e)>.5?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)"};">
                <div class="text-muted" style="font-size:0.8rem;">ส่วนต่าง (TX vs จริง)</div>
                <div style="font-size:1.2rem; font-weight:700; color:${s&&Math.abs(e)>.5?"var(--accent-red)":"var(--accent-green)"};">
                    ${s?formatCurrency(e):"-"}
                </div>
            </div>
        </div>

        ${s?`
            <h4 class="mb-2">📅 รายเดือน</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>เดือน</th>
                            <th>ต้นทุน SI</th>
                            <th>ต้นทุน TX</th>
                            <th>รายจ่ายสินค้าจริง</th>
                            <th>หลักฐาน</th>
                            <th>ส่วนต่าง</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${l.map(f=>{const u=o[f],h=u.siCogs-u.purchase,w=Math.abs(h)>.5,g=r.filter(v=>(v.date||"").startsWith(f)&&v.receipt_url).length;return`
                            <tr class="${w?"discrepancy":""}">
                                <td data-label="เดือน"><strong>${f}</strong></td>
                                <td class="text-right" data-label="ต้นทุน SI">${formatCurrency(u.siCogs)}</td>
                                <td class="text-right" data-label="ต้นทุน TX">${formatCurrency(u.txCogs)}</td>
                                <td class="text-right" data-label="รายจ่ายจริง">${formatCurrency(u.purchase)}</td>
                                <td class="text-center" data-label="หลักฐาน">
                                    ${g>0?`<span class="badge badge-info" title="มี ${g} หลักฐาน">${g} 📄</span>`:"-"}
                                </td>
                                <td class="text-right ${w?"text-red":"text-green"}" data-label="ส่วนต่าง">${formatCurrency(h)}</td>
                            </tr>`}).join("")}
                    </tbody>
                </table>
            </div>
        `:`
            <div style="padding:1.5rem; text-align:center; background:rgba(245,158,11,0.1); border-radius:8px;">
                <p style="font-size:0.95rem; margin-bottom:0.5rem;">⚠️ ยังไม่พบข้อมูลรายจ่ายสินค้า (ค่าสินค้า)</p>
                <p class="text-muted" style="font-size:0.85rem;">เพิ่มรายจ่ายหมวด "ค่าสินค้า" ในหน้าบันทึกข้อมูล เพื่อเปรียบเทียบต้นทุนจริงกับระบบ</p>
            </div>
        `}
    `};window.runRevenueVerification=async function(){const a=document.getElementById("revAuditDateFrom").value,t=document.getElementById("revAuditDateTo").value,{allDates:o,revByDate:n,txByDate:e,summary:d}=await window.AuditService.runRevenueVerification(a,t,getBranchFilter()),i=document.querySelector("#revAuditTable tbody");let c=0,r=0;i.innerHTML=o.map(u=>{const h=n[u]?n[u].total:0,w=e[u]||0,y=h-w,g=Math.abs(y)<1,v=n[u]?n[u].notes.join(", "):"";g?c++:r++;const x=!n[u],E=!e[u];let b;return g?b='<span class="badge badge-success">✅ ตรง</span>':x?b='<span class="badge badge-warning">⚠️ ไม่มีบันทึก</span>':E?b='<span class="badge badge-warning">⚠️ ไม่มีใบงาน</span>':b='<span class="badge badge-danger">❌ ไม่ตรง</span>',`
            <tr style="${g?"":"background:rgba(239,68,68,0.05);"}">
                <td data-label="วันที่">${formatDate(u)}</td>
                <td class="text-right" data-label="รวมบันทึก">${x?'<span class="text-muted">-</span>':formatCurrency(h)}</td>
                <td class="text-right" data-label="รวมระบบ">${E?'<span class="text-muted">-</span>':formatCurrency(w)}</td>
                <td class="text-right" style="${g?"":"color:var(--accent-red); font-weight:700;"}" data-label="ส่วนต่าง">${g?"-":formatCurrency(y)}</td>
                <td class="text-center" data-label="สถานะ">${b}</td>
                <td style="font-size:0.8rem; max-width:200px; overflow:hidden; text-overflow:ellipsis;" data-label="หมายเหตุ">${v||"-"}</td>
            </tr>
        `}).join("")||'<tr><td colspan="6" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';const s=document.getElementById("revAuditSummary"),{totalRevEntry:l,totalRevTx:f}=d;s.innerHTML=`
        <div class="d-flex gap-2 flex-wrap">
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:rgba(34,197,94,0.08);">
                <div class="text-muted" style="font-size:0.75rem;">วันที่ตรง</div>
                <div style="font-weight:700; color:var(--accent-green);">${c} วัน</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:rgba(239,68,68,0.08);">
                <div class="text-muted" style="font-size:0.75rem;">วันที่ไม่ตรง</div>
                <div style="font-weight:700; color:var(--accent-red);">${r} วัน</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.75rem;">รวมบันทึก</div>
                <div style="font-weight:700;">${formatCurrency(l)}</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.75rem;">รวมระบบ</div>
                <div style="font-weight:700;">${formatCurrency(f)}</div>
            </div>
        </div>
    `};q("branch-switcher",()=>{typeof window.runFullAudit=="function"&&window.runFullAudit()});document.getElementById("exportPDFBtn").onclick=async()=>{const a=document.querySelector(".container");showToast("กำลังเตรียมไฟล์ PDF...","info"),await window.ReportService.exportToPDF(a,`Audit_Report_${new Date().toISOString().slice(0,10)}.pdf`)?showToast("ส่งออก PDF สำเร็จ","success"):showToast("ส่งออก PDF ไม่สำเร็จ","error")};
