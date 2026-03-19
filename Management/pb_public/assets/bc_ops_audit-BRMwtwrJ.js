import"./app-shell-CYVhfPAb.js";/* empty css                      *//* empty css                 *//* empty css                    *//* empty css              */import"./helpers-DHRWRroM.js";import"./ui-D6UlSK9g.js";import"./entry-CsCD-e0B.js";import"./authService-DYxqLk7o.js";import"./auditService-BS08mIiJ.js";import"./reportService-Bj0662ff.js";import{r as q}from"./branch-switcher-CW4iuO5M.js";import"./database-Ex4bZHqx.js";window.transactions=[];window.serviceItems=[];window.productGroups=[];window.orderDiscrepancies=[];window.expenses=[];window.quickAddJobData=null;window.selectedBatch=new Set;window.dateFilterActive=!1;window.safeSetText=function(n,e){const r=document.getElementById(n);r&&(r.textContent=e)};document.addEventListener("DOMContentLoaded",()=>{if(document.body.addEventListener("click",t=>{t.target&&t.target.id==="btnAddMissingItem"&&(console.log("Delegated Click: Calling startQuickAddProcess"),typeof window.startQuickAddProcess=="function"?window.startQuickAddProcess():(alert("FATAL: window.startQuickAddProcess is NOT a function"),console.error("window.startQuickAddProcess is missing",window))),t.target&&t.target.id==="btnAutoSuggestFix"&&(console.log("Delegated Click: Calling autoSuggestFix"),typeof window.autoSuggestFix=="function"&&window.autoSuggestFix())}),!requireOwner())return;setupTabs(document.querySelectorAll(".tab-btn"),document.querySelectorAll(".tab-content")),document.getElementById("runAuditBtn").addEventListener("click",runFullAudit),document.getElementById("cancelQuickAddBtn").addEventListener("click",()=>{document.getElementById("quickAddModal").classList.remove("show")}),document.getElementById("saveQuickAddBtn").addEventListener("click",saveQuickAdd),document.getElementById("closeDetailBtn").addEventListener("click",()=>{document.getElementById("orderDetailModal").classList.remove("show")}),document.getElementById("applyDateFilter").addEventListener("click",()=>{dateFilterActive=!0,renderOrderAudit()}),document.getElementById("clearDateFilter").addEventListener("click",()=>{document.getElementById("auditDateFrom").value="",document.getElementById("auditDateTo").value="",dateFilterActive=!1,renderOrderAudit()}),document.getElementById("selectAllCheck").addEventListener("change",t=>{const i=t.target.checked;document.querySelectorAll(".batch-check").forEach(d=>{d.checked=i}),selectedBatch.clear(),i&&orderDiscrepancies.forEach(d=>selectedBatch.add(d.job_id)),updateBatchBar()}),document.getElementById("selectAllBtn").addEventListener("click",()=>{document.querySelectorAll(".batch-check").forEach(t=>{t.checked=!0}),orderDiscrepancies.forEach(t=>selectedBatch.add(t.job_id)),updateBatchBar()}),document.getElementById("deselectAllBtn").addEventListener("click",()=>{document.querySelectorAll(".batch-check").forEach(t=>{t.checked=!1}),selectedBatch.clear(),updateBatchBar()}),document.getElementById("exportAuditBtn").addEventListener("click",exportAuditCSV);const n=new Date,e=n.getFullYear(),r=String(n.getMonth()+1).padStart(2,"0");document.getElementById("auditDateFrom").value=`${e}-${r}-01`;const o=new Date(e,n.getMonth()+1,0).getDate();document.getElementById("auditDateTo").value=`${e}-${r}-${String(o).padStart(2,"0")}`,document.getElementById("revAuditDateFrom").value=`${e}-${r}-01`,document.getElementById("revAuditDateTo").value=`${e}-${r}-${String(o).padStart(2,"0")}`,document.getElementById("applyRevAuditFilter").addEventListener("click",()=>runRevenueVerification()),document.getElementById("clearRevAuditFilter").addEventListener("click",()=>{document.getElementById("revAuditDateFrom").value=`${e}-${r}-01`,document.getElementById("revAuditDateTo").value=`${e}-${r}-${String(o).padStart(2,"0")}`,runRevenueVerification()}),runFullAudit()});window.autoSuggestFix=function(){var r;if(!quickAddJobData)return;const n=quickAddJobData.diffRevenue||0,e=quickAddJobData.diffProfit||0;n>0||n===0&&e>0?(window.startQuickAddProcess(),setTimeout(()=>{var o;if(n>0){document.getElementById("qaPrice").value=n;const t=n-e;document.getElementById("qaCost").value=t>0?t:0}else(o=window.showToast)==null||o.call(window,"รายได้ตรงกันแล้ว แต่กำไรไม่ตรง กรุณาใช้ปุ่ม ✏️ เพื่อแก้ไขต้นทุน","warning")},300)):(r=window.showToast)==null||r.call(window,"ยอดรวมใบต่ำกว่ารายการสินค้า ไม่สามารถเพิ่มอัตโนมัติได้ กรุณาตรวจสอบและแก้ไขหรือลบรายการ","warning")};window.toggleInlineEdit=function(n,e){const r=document.getElementById(`detailTx${n}`),o=document.getElementById(`inputTx${n}`);if(!(!r||!o))if(e){r.style.display="none",o.style.display="block",o.focus();const t=quickAddJobData&&n==="Revenue"?quickAddJobData.total_revenue:quickAddJobData&&quickAddJobData.total_profit;o.value=Number(t||0)}else r.style.display="block",o.style.display="none"};window.saveInlineEdit=async function(n){var i,d,u,a;if(!quickAddJobData)return;const e=document.getElementById(`inputTx${n}`);if(!e)return;const r=Number(e.value),o=n==="Revenue"?"total_revenue":"total_profit",t=transactions.find(s=>s.job_id===quickAddJobData.job_id);if(!t){(i=window.showToast)==null||i.call(window,"ไม่พบรายการในระบบ","error"),window.toggleInlineEdit(n,!1);return}try{(d=window.showLoading)==null||d.call(window),await window.pb.collection("transactions").update(t.id,{[o]:r});const s=document.getElementById(`cardDetailTx${n}`);if(s){const f=s.style.background;s.style.background="rgba(34,197,94,0.1)",setTimeout(()=>s.style.background=f,1e3)}window.toggleInlineEdit(n,!1),await runFullAudit();const c=orderDiscrepancies.find(f=>f.job_id===quickAddJobData.job_id);c&&(quickAddJobData=c,safeSetText(`detailTx${n}`,c[o==="total_revenue"?"total_revenue":"total_profit"]),safeSetText("detailTxRevenue",formatCurrency(c.total_revenue)),safeSetText("detailDiffRevenue",formatCurrency(c.diffRevenue)),safeSetText("detailTxProfit",formatCurrency(c.total_profit)),safeSetText("detailDiffProfit",formatCurrency(c.diffProfit)))}catch(s){console.error("Inline save failed",s),(u=window.showToast)==null||u.call(window,s.message||"บันทึกไม่สำเร็จ","error"),window.toggleInlineEdit(n,!1)}finally{(a=window.hideLoading)==null||a.call(window)}};window.startQuickAddProcess=async function(){if(console.log("Debugging: startQuickAddProcess START"),!quickAddJobData){console.error("CRITICAL: quickAddJobData is Missing!"),showToast("Error: No Job Selected. Please close and re-open the order detail.","error");return}console.log("Context OK:",quickAddJobData.job_id),document.getElementById("orderDetailModal").classList.remove("show");try{document.getElementById("qaJobId").textContent=quickAddJobData.job_id,document.getElementById("qaCustomer").textContent=quickAddJobData.customer_name||"-",document.getElementById("qaPlate").textContent=quickAddJobData.car_registration||quickAddJobData.red_plate||"-",document.getElementById("qaItemCode").value="",document.getElementById("qaItemName").value="",document.getElementById("qaQuantity").value="1",document.getElementById("qaCost").value="0",document.getElementById("qaPrice").value="";const n=document.getElementById("qaProductGroup");n.innerHTML='<option value="">Loading...</option>',console.log("Fetching Product Groups...");try{productGroups=await window.TransactionService.getFullProductGroups(),console.log(`Fetched ${productGroups.length} groups from DB`)}catch(t){console.error("DB Fetch Error Details:",t.response||t),showToast("Database Error: "+(t.message||"Cannot fetch product groups"),"error")}n.innerHTML='<option value="">-- ไม่ระบุ (ไม่ปรับยอดกลุ่ม) --</option>';const e=new Map;productGroups.forEach(t=>{t.name&&e.set(t.name,t)});const r=Array.from(e.values()).sort((t,i)=>t.name.localeCompare(i.name));if(console.log(`Unique Groups to render: ${r.length}`),r.length>0)r.forEach(t=>{const i=document.createElement("option");i.value=t.name,i.textContent=`${t.name} (${t.code||"-"})`,n.appendChild(i)});else{const t=document.createElement("option");t.disabled=!0,t.textContent="ไม่พบข้อมูลกลุ่มสินค้า",n.appendChild(t)}const o=quickAddJobData.diffRevenue;o>0&&(document.getElementById("qaPrice").value=o.toFixed(2)),document.getElementById("quickAddModal").classList.add("show")}catch(n){console.error("Fatal Error inside openQuickAddFromDetail:",n),alert("Fatal Error: "+n.message)}};window.saveQuickAdd=async function(){const n=document.getElementById("qaItemName").value.trim();if(!n){window.showToast("กรุณาใส่ชื่อสินค้า","error");return}const e=document.getElementById("qaItemCode").value.trim()||"UNASSIGNED",r=parseFloat(document.getElementById("qaQuantity").value)||1,o=parseFloat(document.getElementById("qaCost").value)||0,t=parseFloat(document.getElementById("qaPrice").value)||0,i=t-o,d=document.getElementById("qaProductGroup").value,u={job_id:quickAddJobData.job_id,open_date:quickAddJobData.open_date,close_date:quickAddJobData.close_date,customer_name:quickAddJobData.customer_name,item_code:e,item_name:n,quantity:r,total_cost:o,total_price:t,total_profit:i,avg_cost:r>0?o/r:0,avg_price:r>0?t/r:0,avg_profit:r>0?i/r:0,car_registration:quickAddJobData.car_registration,red_plate:quickAddJobData.red_plate,product_group:d,branch:getBranch()};showLoading();try{await window.TransactionService.createServiceItem(u)}catch(a){hideLoading(),showToast("บันทึกรายการไม่สำเร็จ: "+a.message,"error");return}if(d){const a=(quickAddJobData.open_date||"").slice(0,7),s=productGroups.find(l=>l.name===d&&l.report_month===a),c=productGroups.find(l=>l.name===d),f=c?c.code:"UNKNOWN";if(s){const l=Number(s.total_sales||0)+t,h=Number(s.total_profit||0)+i,w=Number(s.total_cost||0)+o,y=Number(s.quantity||0)+r;try{await window.TransactionService.updateProductGroup(s.id,{total_sales:l,total_profit:h,total_cost:w,quantity:y})}catch(g){console.error("Update PG Error:",g)}}else{const l={report_month:a,code:f,name:d,quantity:r,total_sales:t,total_cost:o,total_profit:i,margin:t>0?i/t*100:0,branch:getBranch()};try{await window.TransactionService.createProductGroup(l)}catch(h){console.error("Create PG Error:",h)}}}try{const a=getBranch();await window.AuditService.reconcileJob(quickAddJobData.job_id,a),console.log(`Successfully reconciled parent transaction for ${quickAddJobData.job_id}`)}catch(a){console.error("Failed to reconcile parent transaction:",a),showToast("แจ้งเตือน: บันทึกสินค้าสำเร็จ แต่การปรับยอดใบบันทึกหลักขัดข้อง","warning")}hideLoading(),showToast("บันทึกรายการสำเร็จ","success"),document.getElementById("quickAddModal").classList.remove("show"),runFullAudit()};window.toggleBatch=function(n,e){e?selectedBatch.add(n):selectedBatch.delete(n),updateBatchBar()};window.updateBatchBar=function(){const n=document.getElementById("batchBar"),e=window.selectedBatch.size;document.getElementById("batchCount").textContent=e,n.style.display=e>0?"block":"none"};const F={suphanburi:"BC Auto เมืองสุพรรณ",samchuk:"BC AUTO XPERIENCE (สามชุก)","BC Auto Service":"BC Auto Service (วิริยะเซอร์วิส)"};var T;const C=(T=window.AuthService)==null?void 0:T.getBranch(),M=F[C]||C||"BC Auto";document.title=`ตรวจสอบข้อมูล | ${M}`;window.runFullAudit=async function(){window.showLoading();const n=`${window.getBranchFilter()}`,[e,r,o,t]=await Promise.all([window.TransactionService.getFullTransactions({filter:n}),window.TransactionService.getFullServiceItems({filter:n}),window.TransactionService.getFullProductGroups({filter:n}),window.EntryService.getExpenses(1,1e5,{filter:n}).then(i=>i.items)]);transactions=e||[],serviceItems=r||[],productGroups=o||[],expenses=t||[],runOrderAudit(),runGroupAudit(),detectAnomalies(),runCostVerification(),runRevenueVerification(),updateSummary(),hideLoading()};window.runOrderAudit=function(){orderDiscrepancies=window.AuditService.runOrderAudit(transactions,serviceItems),renderOrderAudit()};window.renderOrderAudit=function(){const n=document.querySelector("#orderAuditTable tbody");let e=orderDiscrepancies;if(dateFilterActive){const a=document.getElementById("auditDateFrom").value,s=document.getElementById("auditDateTo").value;a&&(e=e.filter(c=>(c.open_date||"").slice(0,10)>=a)),s&&(e=e.filter(c=>(c.open_date||"").slice(0,10)<=s))}const r=e.length;let o=0,t=0;e.forEach(a=>{o+=a.diffRevenue,t+=a.diffProfit});const i=document.getElementById("triageDiscrepantJobs"),d=document.getElementById("triageDiffRevenue"),u=document.getElementById("triageDiffProfit");if(i&&(i.textContent=r),d&&(d.textContent=formatCurrency(o)),u&&(u.textContent=formatCurrency(t)),e.length===0){n.innerHTML='<tr><td colspan="10" class="text-center text-muted" style="padding:2rem;">✅ ไม่พบความคลาดเคลื่อน — ข้อมูลใบบันทึกบริการตรงกันทั้งหมด</td></tr>';return}n.innerHTML=e.map(a=>{const s=Math.max(Math.abs(a.diffRevenue),Math.abs(a.diffProfit));let c="";return s>1e3?c="background: rgba(239, 68, 68, 0.08);":s>0&&(c="background: rgba(245, 158, 11, 0.08);"),`
        <tr class="discrepancy" style="cursor:pointer; ${c}">
            <td onclick="event.stopPropagation()" data-label="เลือก"><input type="checkbox" class="batch-check" data-job="${a.job_id}" ${selectedBatch.has(a.job_id)?"checked":""} onchange="toggleBatch('${a.job_id}', this.checked)"></td>
            <td onclick="showOrderDetail('${a.job_id}')" data-label="Job ID"><strong>${a.job_id}</strong></td>
            <td onclick="showOrderDetail('${a.job_id}')" data-label="ลูกค้า">${a.customer_name||"-"}</td>
            <td onclick="showOrderDetail('${a.job_id}')" data-label="วันที่">${a.open_date?formatDate(a.open_date):"-"}</td>
            <td class="text-right" data-label="รายได้(ใบ)">${formatCurrency(a.total_revenue)}</td>
            <td class="text-right" data-label="รายได้(สินค้า)">${formatCurrency(a.itemsRevenue)}</td>
            <td class="text-right ${a.diffRevenue!==0?"text-red":""}" data-label="ส่วนต่างรายได้">${formatCurrency(a.diffRevenue)}</td>
            <td class="text-right" data-label="กำไร(ใบ)">${formatCurrency(a.total_profit)}</td>
            <td class="text-right" data-label="กำไร(สินค้า)">${formatCurrency(a.itemsProfit)}</td>
            <td class="text-right ${a.diffProfit!==0?"text-red":""}" data-label="ส่วนต่างกำไร">${formatCurrency(a.diffProfit)}</td>
        </tr>
    `}).join("")};window.showOrderDetail=function(n){const e=orderDiscrepancies.find(a=>a.job_id===n);if(!e)return;safeSetText("detailJobId",e.job_id),safeSetText("detailCustomer",e.customer_name||"-"),document.getElementById("detailPlate").textContent=e.car_registration||e.red_plate||"-",safeSetText("detailDate",e.open_date?formatDate(e.open_date):"-"),safeSetText("detailTxRevenue",formatCurrency(e.total_revenue)),safeSetText("detailSiRevenue",formatCurrency(e.itemsRevenue)),safeSetText("detailDiffRevenue",formatCurrency(e.diffRevenue)),safeSetText("detailTxProfit",formatCurrency(e.total_profit)),safeSetText("detailSiProfit",formatCurrency(e.itemsProfit)),safeSetText("detailDiffProfit",formatCurrency(e.diffProfit));const r=document.getElementById("btnEditTransaction"),o=document.getElementById("cardDetailTxRevenue"),t=document.getElementById("cardDetailTxProfit"),i=transactions.find(a=>a.job_id===e.job_id),d=()=>{i&&window.editRow("transactions",i.id)};if(i){r&&(r.style.display="inline-block",r.onclick=d),o&&(o.onclick=()=>window.toggleInlineEdit("Revenue",!0)),t&&(t.onclick=()=>window.toggleInlineEdit("Profit",!0));const a=document.getElementById("inputTxRevenue"),s=document.getElementById("inputTxProfit");a&&!a.dataset.listenersAdded&&(a.onkeydown=c=>{c.key==="Enter"&&window.saveInlineEdit("Revenue"),c.key==="Escape"&&window.toggleInlineEdit("Revenue",!1)},a.onblur=()=>window.toggleInlineEdit("Revenue",!1),a.dataset.listenersAdded="true"),s&&!s.dataset.listenersAdded&&(s.onkeydown=c=>{c.key==="Enter"&&window.saveInlineEdit("Profit"),c.key==="Escape"&&window.toggleInlineEdit("Profit",!1)},s.onblur=()=>window.toggleInlineEdit("Profit",!1),s.dataset.listenersAdded="true")}else r&&(r.style.display="none"),o&&(o.onclick=null),t&&(t.onclick=null);const u=document.getElementById("detailItemsBody");e.items.length===0?u.innerHTML='<tr><td colspan="7" class="text-center text-muted">ไม่พบรายการสินค้าสำหรับใบบันทึกบริการนี้</td></tr>':u.innerHTML=e.items.map(a=>`
            <tr>
                <td data-label="รหัสสินค้า">${a.item_code||"-"}</td>
                <td data-label="ชื่อสินค้า">${a.item_name||"-"}</td>
                <td class="text-right" data-label="จำนวน">${Number(a.quantity||0)}</td>
                <td class="text-right" data-label="ทุนรวม">${formatCurrency(a.total_cost)}</td>
                <td class="text-right" data-label="ขายรวม">${formatCurrency(a.total_price)}</td>
                <td class="text-right ${Number(a.total_profit||0)>=0?"text-green":"text-red"}" data-label="กำไร">${formatCurrency(a.total_profit)}</td>
                <td class="text-center" data-label="จัดการ">
                    <button class="btn btn-ghost btn-sm" onclick="window.editRow('service_items', '${a.id}')" title="แก้ไขสินค้า">✏️</button>
                </td>
            </tr>
        `).join(""),quickAddJobData=e,document.getElementById("orderDetailModal").classList.add("show")};window.runGroupAudit=function(){const n=[...new Set(window.productGroups.map(o=>o.report_month).filter(Boolean))].sort().reverse(),e=document.getElementById("auditMonthFilter"),r=e.value||n[0]||"";e.innerHTML=n.map(o=>`<option value="${o}" ${o===r?"selected":""}>${o}</option>`).join(""),e.onchange=()=>renderGroupAudit(),renderGroupAudit()};window.renderGroupAudit=function(){const n=document.getElementById("auditMonthFilter").value,{pgForMonth:e,totals:r,matches:o}=window.AuditService.runGroupAudit(productGroups,serviceItems,transactions,n),{pg:t,si:i,tx:d}=r,{pgSiSales:u,pgTxSales:a,siTxSales:s,pgSiProfit:c,pgTxProfit:f,siTxProfit:l}=o,y=!(u&&a)||!(c&&f),g=t.sales-d.sales,v=t.profit-d.profit,x=m=>m?"✅":"❌",E=m=>m?"var(--accent-green)":"var(--accent-red)",b=m=>m?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",_=document.getElementById("groupGrandTotal");_.innerHTML=`
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
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(t.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(t.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">สรุปยอดขายตามกลุ่มสินค้า</td>
                    </tr>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>🔧 Service Items</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(i.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(i.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">รวมรายการสินค้าทุกใบบันทึก</td>
                    </tr>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>💰 Transactions</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(d.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(d.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">ยอดรับจริงจากลูกค้า</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="d-flex gap-2 flex-wrap mb-2" style="font-size:0.85rem;">
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${b(u&&c)};">
                <span style="color:${E(u&&c)};">${x(u&&c)}</span>
                <strong>PG ↔ SI:</strong>
                ขาย ${u?"ตรง":formatCurrency(t.sales-i.sales)}
                | กำไร ${c?"ตรง":formatCurrency(t.profit-i.profit)}
            </div>
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${b(a&&f)};">
                <span style="color:${E(a&&f)};">${x(a&&f)}</span>
                <strong>PG ↔ TX:</strong>
                ขาย ${a?"ตรง":formatCurrency(t.sales-d.sales)}
                | กำไร ${f?"ตรง":formatCurrency(t.profit-d.profit)}
            </div>
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${b(s&&l)};">
                <span style="color:${E(s&&l)};">${x(s&&l)}</span>
                <strong>SI ↔ TX:</strong>
                ขาย ${s?"ตรง":formatCurrency(i.sales-d.sales)}
                | กำไร ${l?"ตรง":formatCurrency(i.profit-d.profit)}
            </div>
        </div>
    `;const I=Math.abs(g),k=Math.abs(v),S=e.map(m=>{const p=Number(m.total_sales||0),D=Number(m.total_profit||0);let $=0;if(y){if(I>.5&&p>0){const B=Math.min(p,I)/Math.max(p,I);B>.8?$+=3:B>.5?$+=2:p>=I*.9&&($+=1)}if(k>.5&&Math.abs(D)>0){const B=Math.min(Math.abs(D),k)/Math.max(Math.abs(D),k);B>.8?$+=3:B>.5&&($+=2)}}return{code:m.code,name:m.name,quantity:Number(m.quantity||0),sales:p,profit:D,suspectScore:$}});S.sort((m,p)=>m.suspectScore!==p.suspectScore?p.suspectScore-m.suspectScore:p.sales-m.sales);const A=document.querySelector("#groupAuditTable tbody");e.length===0?A.innerHTML='<tr><td colspan="5" class="text-center text-muted" style="padding:2rem;">ไม่พบข้อมูลกลุ่มสินค้าสำหรับเดือนนี้</td></tr>':A.innerHTML=S.map(m=>{const p=m.suspectScore>=2;return`
            <tr class="${p?"discrepancy":""}">
                <td data-label="รหัสกลุ่ม"><strong>${m.code}</strong></td>
                <td data-label="ชื่อกลุ่ม">${m.name} ${p?'<span class="badge badge-warning">🔍 ต้องสงสัย</span>':""}</td>
                <td class="text-right" data-label="จำนวน">${m.quantity.toLocaleString()}</td>
                <td class="text-right" data-label="ยอดขาย">${formatCurrency(m.sales)}</td>
                <td class="text-right ${m.profit>=0?"text-green":"text-red"}" data-label="กำไร">${formatCurrency(m.profit)}</td>
            </tr>
            `}).join(""),!y&&e.length>0&&(A.innerHTML='<tr><td colspan="5" class="text-center" style="padding:1rem; color:var(--accent-green);">✅ ยอดรวมตรงกัน — ไม่พบความคลาดเคลื่อน</td></tr>'+A.innerHTML),document.getElementById("totalGroups").textContent=e.length;const P=S.filter(m=>m.suspectScore>=2).length;document.getElementById("groupDiscrepancies").textContent=y?P||"⚠️":"0"};window.updateSummary=function(){window.safeSetText("totalOrders",window.transactions.length),window.safeSetText("orderDiscrepancies",window.orderDiscrepancies.length);const n={};serviceItems.forEach(t=>{n[t.job_id]=!0});const e=transactions.filter(t=>n[t.job_id]).length,r=transactions.length>0?(e/transactions.length*100).toFixed(1):100;safeSetText("completenessScore",`${r}%`);const o=document.getElementById("completenessScore");o&&(r>=95?(o.className="kpi-value positive",safeSetText("completenessLabel",`${e}/${transactions.length} ใบ`)):r>=80?(o.className="kpi-value",o.style.color="#f59e0b",safeSetText("completenessLabel",`${e}/${transactions.length} ใบ`)):(o.className="kpi-value negative",safeSetText("completenessLabel",`${e}/${transactions.length} ใบ`)))};window.exportAuditCSV=function(){if(window.orderDiscrepancies.length===0){window.showToast("ไม่มีข้อมูลให้ส่งออก","error");return}const n=["Job ID","ลูกค้า","วันที่เปิด","รายได้(ใบ)","รายได้(สินค้า)","ส่วนต่างรายได้","กำไร(ใบ)","กำไร(สินค้า)","ส่วนต่างกำไร"],e=orderDiscrepancies.map(d=>[d.job_id,d.customer_name||"",d.open_date||"",d.total_revenue,d.itemsRevenue,d.diffRevenue,d.total_profit,d.itemsProfit,d.diffProfit]);let r="\uFEFF"+n.join(",")+`
`;e.forEach(d=>{r+=d.map(u=>`"${String(u).replace(/"/g,'""')}"`).join(",")+`
`});const o=new Blob([r],{type:"text/csv;charset=utf-8;"}),t=URL.createObjectURL(o),i=document.createElement("a");i.href=t,i.download=`audit_report_${new Date().toISOString().slice(0,10)}.csv`,i.click(),URL.revokeObjectURL(t),showToast("ส่งออก CSV สำเร็จ","success")};window.detectAnomalies=function(){const n=document.getElementById("anomalySection"),e=window.AuditService.detectAnomalies(transactions);if(transactions.length<5){n.innerHTML='<p class="text-muted">ข้อมูลไม่เพียงพอ (ต้องมีอย่างน้อย 5 ใบงาน)</p>';return}if(e.length===0){n.innerHTML='<p style="color:var(--accent-green);">✅ ไม่พบรายการผิดปกติ</p>';return}const{mean:r,stdDev:o}=e[0],t=2;n.innerHTML=`
        <p class="text-muted mb-1" style="font-size:0.8rem;">ค่าเฉลี่ย: ${formatCurrency(r)} | Std Dev: ${formatCurrency(o)} | Threshold: >${formatCurrency(r+t*o)} หรือ <${formatCurrency(Math.max(0,r-t*o))}</p>
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
                    ${e.map(i=>{const d=Number(i.total_revenue||0),u=d>r+t*o;return`
                        <tr>
                            <td data-label="Job ID"><strong>${i.job_id}</strong></td>
                            <td data-label="ลูกค้า">${i.customer_name||"-"}</td>
                            <td data-label="วันที่">${i.open_date?formatDate(i.open_date):"-"}</td>
                            <td class="text-right" data-label="รายได้">${formatCurrency(d)}</td>
                            <td data-label="สถานะ"><span class="badge ${u?"badge-warning":"badge-danger"}">${u?"⬆ สูงผิดปกติ":"⬇ ต่ำผิดปกติ"}</span></td>
                        </tr>`}).join("")}
                </tbody>
            </table>
        </div>
        <p class="text-muted mt-1" style="font-size:0.8rem;">พบ ${e.length} รายการผิดปกติจาก ${transactions.length} รายการทั้งหมด</p>
    `};window.runCostVerification=function(){const n=document.getElementById("costVerifySection"),{totals:e,monthlyData:r,diffSi:o,diffTx:t}=window.AuditService.runCostVerification(window.serviceItems,transactions,expenses),{siCogs:i,txCogs:d,actualPurchase:u}=e,a=expenses.filter(f=>f.excluded),s=a.length>0,c=Object.keys(r).sort().reverse();n.innerHTML=`
        <!-- Summary cards -->
        <div class="d-flex gap-2 flex-wrap mb-3" style="font-size:0.9rem;">
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">ต้นทุนระบบ (SI)</div>
                <div style="font-size:1.2rem; font-weight:700;">${formatCurrency(i)}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">ต้นทุนระบบ (TX)</div>
                <div style="font-size:1.2rem; font-weight:700;">${formatCurrency(d)}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">รายจ่ายสินค้า (จริง)</div>
                <div style="font-size:1.2rem; font-weight:700;">${s?formatCurrency(u):'<span class="text-muted">ยังไม่มีข้อมูล</span>'}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:${s&&Math.abs(o)>.5?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)"};">
                <div class="text-muted" style="font-size:0.8rem;">ส่วนต่าง (SI vs จริง)</div>
                <div style="font-size:1.2rem; font-weight:700; color:${s&&Math.abs(o)>.5?"var(--accent-red)":"var(--accent-green)"};">
                    ${s?formatCurrency(o):"-"}
                </div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:${s&&Math.abs(t)>.5?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)"};">
                <div class="text-muted" style="font-size:0.8rem;">ส่วนต่าง (TX vs จริง)</div>
                <div style="font-size:1.2rem; font-weight:700; color:${s&&Math.abs(t)>.5?"var(--accent-red)":"var(--accent-green)"};">
                    ${s?formatCurrency(t):"-"}
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
                        ${c.map(f=>{const l=r[f],h=l.siCogs-l.purchase,w=Math.abs(h)>.5,g=a.filter(v=>(v.date||"").startsWith(f)&&v.receipt_url).length;return`
                            <tr class="${w?"discrepancy":""}">
                                <td data-label="เดือน"><strong>${f}</strong></td>
                                <td class="text-right" data-label="ต้นทุน SI">${formatCurrency(l.siCogs)}</td>
                                <td class="text-right" data-label="ต้นทุน TX">${formatCurrency(l.txCogs)}</td>
                                <td class="text-right" data-label="รายจ่ายจริง">${formatCurrency(l.purchase)}</td>
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
    `};window.runRevenueVerification=async function(){const n=document.getElementById("revAuditDateFrom").value,e=document.getElementById("revAuditDateTo").value,{allDates:r,revByDate:o,txByDate:t,summary:i}=await window.AuditService.runRevenueVerification(n,e,getBranchFilter()),d=document.querySelector("#revAuditTable tbody");let u=0,a=0;d.innerHTML=r.map(l=>{const h=o[l]?o[l].total:0,w=t[l]||0,y=h-w,g=Math.abs(y)<1,v=o[l]?o[l].notes.join(", "):"";g?u++:a++;const x=!o[l],E=!t[l];let b;return g?b='<span class="badge badge-success">✅ ตรง</span>':x?b='<span class="badge badge-warning">⚠️ ไม่มีบันทึก</span>':E?b='<span class="badge badge-warning">⚠️ ไม่มีใบงาน</span>':b='<span class="badge badge-danger">❌ ไม่ตรง</span>',`
            <tr style="${g?"":"background:rgba(239,68,68,0.05);"}">
                <td data-label="วันที่">${formatDate(l)}</td>
                <td class="text-right" data-label="รวมบันทึก">${x?'<span class="text-muted">-</span>':formatCurrency(h)}</td>
                <td class="text-right" data-label="รวมระบบ">${E?'<span class="text-muted">-</span>':formatCurrency(w)}</td>
                <td class="text-right" style="${g?"":"color:var(--accent-red); font-weight:700;"}" data-label="ส่วนต่าง">${g?"-":formatCurrency(y)}</td>
                <td class="text-center" data-label="สถานะ">${b}</td>
                <td style="font-size:0.8rem; max-width:200px; overflow:hidden; text-overflow:ellipsis;" data-label="หมายเหตุ">${v||"-"}</td>
            </tr>
        `}).join("")||'<tr><td colspan="6" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';const s=document.getElementById("revAuditSummary"),{totalRevEntry:c,totalRevTx:f}=i;s.innerHTML=`
        <div class="d-flex gap-2 flex-wrap">
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:rgba(34,197,94,0.08);">
                <div class="text-muted" style="font-size:0.75rem;">วันที่ตรง</div>
                <div style="font-weight:700; color:var(--accent-green);">${u} วัน</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:rgba(239,68,68,0.08);">
                <div class="text-muted" style="font-size:0.75rem;">วันที่ไม่ตรง</div>
                <div style="font-weight:700; color:var(--accent-red);">${a} วัน</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.75rem;">รวมบันทึก</div>
                <div style="font-weight:700;">${formatCurrency(c)}</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.75rem;">รวมระบบ</div>
                <div style="font-weight:700;">${formatCurrency(f)}</div>
            </div>
        </div>
    `};q("branch-switcher",()=>{typeof window.runFullAudit=="function"&&window.runFullAudit()});document.getElementById("exportPDFBtn").onclick=async()=>{const n=document.querySelector(".container");showToast("กำลังเตรียมไฟล์ PDF...","info"),await window.ReportService.exportToPDF(n,`Audit_Report_${new Date().toISOString().slice(0,10)}.pdf`)?showToast("ส่งออก PDF สำเร็จ","success"):showToast("ส่งออก PDF ไม่สำเร็จ","error")};
