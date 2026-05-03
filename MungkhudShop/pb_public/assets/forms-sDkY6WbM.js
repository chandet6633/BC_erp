import{s as b,f as g,e as v,q as G}from"./index-XszaqNmQ.js";let A=null;async function Q(){if(A)return A;const l=document.createElement("script");l.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",await new Promise((a,s)=>{l.onload=a,l.onerror=s,document.head.appendChild(l)});const o=document.createElement("script");return o.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js",await new Promise((a,s)=>{o.onload=a,o.onerror=s,document.head.appendChild(o)}),A=window.jspdf,A}function T(l){return(l||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}async function Z(l,o,a,s){const{jsPDF:m}=await Q(),t=new m({orientation:"portrait",unit:"mm",format:"a4"}),n=t.internal.pageSize.getWidth(),i=15,p=n-i*2;let e=i;const d=[30,42,79],S=[200,160,72],h=[120,120,120],f=[51,51,51],x=l.id==="job",P=x?o.job_no:o.doc_no,C=x?o.start_date||"":o.issue_date||"",q=C?C.split(" ")[0]:"-",N=x?o.customer_name||"-":o.entity_id||"-";t.setFontSize(18),t.setTextColor(...d),t.setFont("helvetica","bold"),t.text(s.shopName||"MungkhudShop",i,e+6),t.setFontSize(9),t.setTextColor(...h),t.setFont("helvetica","normal"),s.shopAddress&&(e+=10,t.text(s.shopAddress,i,e+2)),s.shopPhone&&(e+=4,t.text("Tel: "+s.shopPhone,i,e+2));const j=n-i;let w=i+2;s.shopTaxId&&(t.setFontSize(9),t.setTextColor(...h),t.text("Tax ID: "+s.shopTaxId,j,w,{align:"right"}),w+=4),t.text("Print: "+new Date().toLocaleDateString("th-TH"),j,w,{align:"right"}),e+=8,t.setDrawColor(...d),t.setLineWidth(.5),t.line(i,e,n-i,e),e+=10,t.setFontSize(16),t.setTextColor(...S),t.setFont("helvetica","bold"),t.text(l.label,n/2,e,{align:"center"}),e+=10,t.setFontSize(10),t.setFont("helvetica","bold"),t.setTextColor(...d);const c=[["Doc No:",P],[x?"Customer:":"Entity:",N]],y=[["Date:",q]];x?(c.push(["Plate:",o.plate||"-"]),y.push(["Model:",o.model||"-"]),o.mileage&&y.push(["Mileage:",o.mileage]),o.technician&&c.push(["Tech:",o.technician])):o.ref_no&&y.push(["Ref:",o.ref_no]);const z=n/2;let u=e;c.forEach(([r,D])=>{t.setFont("helvetica","bold"),t.setTextColor(...d),t.text(r,i,u),t.setFont("helvetica","normal"),t.setTextColor(...f),t.text(String(D),i+28,u),u+=5}),u=e,y.forEach(([r,D])=>{t.setFont("helvetica","bold"),t.setTextColor(...d),t.text(r,z+5,u),t.setFont("helvetica","normal"),t.setTextColor(...f),t.text(String(D),z+28,u),u+=5}),e=Math.max(e+c.length*5,e+y.length*5)+5;const _=a.some(r=>(r.discount||0)>0)||(o.discount_amount||0)>0,k=[["#","Item","Qty","Unit Price"]];_&&k[0].push("Discount"),k[0].push("Total");const W=a.map((r,D)=>{const J=r.product_name||r.product_id||"-",I=r.discount||0,B=r.total||(r.qty||0)*(r.unit_price||0)-I,H=[String(D+1),J,String(r.qty||0),T(r.unit_price)];return _&&H.push(I>0?T(I):"-"),H.push(T(B)),H}),L={0:{cellWidth:10,halign:"center"},1:{cellWidth:"auto"},2:{cellWidth:18,halign:"center"},3:{cellWidth:28,halign:"right"}};_?(L[4]={cellWidth:25,halign:"right"},L[5]={cellWidth:28,halign:"right"}):L[4]={cellWidth:28,halign:"right"},t.autoTable({startY:e,head:k,body:W.length>0?W:[_?["","No items","","","",""]:["","No items","","",""]],margin:{left:i,right:i},headStyles:{fillColor:d,textColor:[255,255,255],fontSize:9,fontStyle:"bold"},bodyStyles:{fontSize:9,textColor:f},alternateRowStyles:{fillColor:[249,249,249]},columnStyles:L,theme:"grid"}),e=t.lastAutoTable.finalY+8;const K=o.subtotal||0,E=o.discount_amount||0,R=o.vat_enabled,M=o.vat_amount||0,Y=o.grand_total||0,F=n-i-55,$=n-i;if(t.setFontSize(10),t.setFont("helvetica","normal"),t.setTextColor(...h),t.text("Subtotal:",F,e,{align:"right"}),t.setTextColor(...f),t.text(T(K),$,e,{align:"right"}),e+=5,_&&E>0&&(t.setTextColor(...h),t.text("Discount:",F,e,{align:"right"}),t.setTextColor(239,68,68),t.text("-"+T(E),$,e,{align:"right"}),e+=5),R){const r=o.vat_mode==="shop_absorbs"?"VAT 7% (absorbed):":"VAT 7%:";t.setTextColor(...h),t.text(r,F,e,{align:"right"}),t.setTextColor(...f),t.text(T(M),$,e,{align:"right"}),e+=5}if(e+=2,t.setDrawColor(...S),t.setLineWidth(.5),t.line(F-25,e-2,$,e-2),t.setFontSize(14),t.setFont("helvetica","bold"),t.setTextColor(...S),t.text("Grand Total:",F,e+4,{align:"right"}),t.text(T(Y),$,e+4,{align:"right"}),e+=12,R&&o.vat_mode==="shop_absorbs"&&(t.setFontSize(8),t.setFont("helvetica","italic"),t.setTextColor(...h),t.text("* Shop absorbs VAT — prices shown include VAT",$,e,{align:"right"}),e+=6),o.notes){e+=5,t.setFontSize(9),t.setFont("helvetica","bold"),t.setTextColor(...d),t.text("Notes:",i,e),t.setFont("helvetica","normal"),t.setTextColor(...f),e+=5;const r=t.splitTextToSize(o.notes,p);t.text(r,i,e),e+=r.length*4}if(x&&o.repair_details){e+=3,t.setFont("helvetica","bold"),t.setTextColor(...d),t.text("Repair Details:",i,e),t.setFont("helvetica","normal"),t.setTextColor(...f),e+=5;const r=t.splitTextToSize(o.repair_details,p);t.text(r,i,e),e+=r.length*4}e=Math.max(e+20,t.internal.pageSize.getHeight()-40),t.setDrawColor(...h),t.setLineWidth(.3);const U=i+30,X=n-i-30;t.line(i,e,U+30,e),t.setFontSize(9),t.setTextColor(...h),t.text("Customer / Receiver",i+15,e+5,{align:"center"}),t.line(X-30,e,n-i,e),t.text("Authorized Signature",n-i-15,e+5,{align:"center"});const O=t.output("blob"),V=URL.createObjectURL(O);window.open(V,"_blank"),setTimeout(()=>URL.revokeObjectURL(V),6e4)}function ot(l){const o=[{id:"job",label:"ใบรับรถ / ใบงาน",icon:"build",desc:"พิมพ์ใบรับรถและรายละเอียดงาน",collection:"jobs",keyField:"job_no"},{id:"QT",label:"ใบเสนอราคา",icon:"request_quote",desc:"เอกสารเสนอราคาสำหรับลูกค้า",collection:"documents",keyField:"doc_no"},{id:"IV",label:"ใบแจ้งหนี้ / ใบกำกับภาษี",icon:"receipt_long",desc:"เอกสารเรียกเก็บเงินและภาษี",collection:"documents",keyField:"doc_no"},{id:"RC",label:"ใบเสร็จรับเงิน",icon:"paid",desc:"เอกสารยืนยันการรับชำระเงิน",collection:"documents",keyField:"doc_no"},{id:"RR",label:"ใบรับสินค้า",icon:"inventory",desc:"เอกสารบันทึกการรับสินค้าเข้าคลัง",collection:"documents",keyField:"doc_no"},{id:"PI",label:"ใบสั่งซื้อ / ใบแจ้งหนี้ซื้อ",icon:"shopping_cart",desc:"เอกสารการสั่งซื้อจากผู้จำหน่าย",collection:"documents",keyField:"doc_no"},{id:"CN",label:"ใบลดหนี้",icon:"remove_circle_outline",desc:"เอกสารลดยอดหนี้",collection:"documents",keyField:"doc_no"},{id:"WT",label:"หนังสือรับรองหัก ณ ที่จ่าย",icon:"percent",desc:"เอกสารภาษีหัก ณ ที่จ่าย",collection:"documents",keyField:"doc_no"}];l.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">print</span>
                <h1>แบบฟอร์ม / พิมพ์เอกสาร</h1>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">เลือกประเภทเอกสาร</label>
                        <select class="form-control" id="formDocType">
                            ${o.map(a=>`<option value="${a.id}">${a.label}</option>`).join("")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขเอกสาร</label>
                        <input type="text" class="form-control" id="formDocNo" placeholder="เช่น JOB2603-0001 หรือ IV2603-0001">
                    </div>
                </div>
                <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);">
                    <button class="btn btn-primary" id="btnPrintDoc"><span class="material-icons-outlined">print</span> พิมพ์เอกสาร</button>
                    <button class="btn btn-outline" id="btnPdfDoc" style="color:#C8A048;border-color:#C8A048;"><span class="material-icons-outlined">picture_as_pdf</span> PDF</button>
                </div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--sp-4);">
            ${o.map(a=>`
                <div class="card form-template-card" data-id="${a.id}" style="cursor:pointer;transition:all var(--transition-fast);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='';this.style.boxShadow='';">
                    <div class="card-body" style="display:flex;gap:var(--sp-4);align-items:center;">
                        <div style="width:48px;height:48px;border-radius:var(--radius-md);background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;color:var(--color-primary);flex-shrink:0;">
                            <span class="material-icons-outlined">${a.icon}</span>
                        </div>
                        <div>
                            <div style="font-weight:600;margin-bottom:2px;">${a.label}</div>
                            <div class="text-sm text-muted">${a.desc}</div>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>
    `,l.querySelectorAll(".form-template-card").forEach(a=>{a.addEventListener("click",()=>{l.querySelector("#formDocType").value=a.dataset.id,l.querySelector("#formDocNo").focus()})}),l.querySelector("#btnPrintDoc").addEventListener("click",async()=>{const a=l.querySelector("#formDocType").value,s=l.querySelector("#formDocNo").value.trim();if(!s)return b("กรุณาระบุเลขเอกสาร","error");const m=o.find(t=>t.id===a);if(m)try{let t=null,n=[];if(m.collection==="jobs"){const e=await g("jobs",{filter:`job_no='${v(s)}'`,requestKey:null});if(e.length===0)return b("ไม่พบเอกสาร: "+s,"error");t=e[0],n=await g("job_items",{filter:`job_id='${v(t.id)}'`,requestKey:null})}else{const e=await g("documents",{filter:`doc_no='${v(s)}'`,requestKey:null});if(e.length===0)return b("ไม่พบเอกสาร: "+s,"error");t=e[0],n=await g("document_items",{filter:`document_id='${v(t.id)}'`,requestKey:null})}let i={shopName:"MungkhudShop",shopAddress:"",shopPhone:"",shopTaxId:""},p={showVat:"auto",showDiscount:!0,showBank:!0,showSignature:!0};try{const e=await g("settings",{requestKey:null});if(e.length>0){const d=e[0];i.shopName=d.shop_name||i.shopName,i.shopAddress=d.address||"",i.shopPhone=d.phone||"",i.shopTaxId=d.tax_id||""}}catch{}tt(m,t,n,i,p)}catch(t){console.error(t),b("เกิดข้อผิดพลาด: "+t.message,"error")}}),l.querySelector("#btnPdfDoc").addEventListener("click",async()=>{const a=l.querySelector("#formDocType").value,s=l.querySelector("#formDocNo").value.trim();if(!s)return b("กรุณาระบุเลขเอกสาร","error");const m=o.find(n=>n.id===a);if(!m)return;const t=l.querySelector("#btnPdfDoc");t.disabled=!0,t.innerHTML='<span class="material-icons-outlined spin">hourglass_empty</span> กำลังสร้าง PDF...';try{let n=null,i=[];if(m.collection==="jobs"){const e=await g("jobs",{filter:`job_no='${v(s)}'`,requestKey:null});if(e.length===0)return b("ไม่พบเอกสาร: "+s,"error");n=e[0],i=await g("job_items",{filter:`job_id='${v(n.id)}'`,requestKey:null})}else{const e=await g("documents",{filter:`doc_no='${v(s)}'`,requestKey:null});if(e.length===0)return b("ไม่พบเอกสาร: "+s,"error");n=e[0],i=await g("document_items",{filter:`document_id='${v(n.id)}'`,requestKey:null})}let p={shopName:"MungkhudShop",shopAddress:"",shopPhone:"",shopTaxId:""};try{const e=await g("settings",{requestKey:null});if(e.length>0){const d=e[0];p.shopName=d.shop_name||p.shopName,p.shopAddress=d.address||"",p.shopPhone=d.phone||"",p.shopTaxId=d.tax_id||""}}catch{}await Z(m,n,i,p),b("PDF สร้างเรียบร้อย","success")}catch(n){console.error(n),b("เกิดข้อผิดพลาด: "+n.message,"error")}finally{t.disabled=!1,t.innerHTML='<span class="material-icons-outlined">picture_as_pdf</span> PDF'}})}function tt(l,o,a,s,m){const t=l.collection==="jobs",n=t?o.job_no:o.doc_no,i=t?o.start_date||"":o.issue_date||"",p=i?i.split(" ")[0]:"-",e=t?o.customer_name||"-":o.entity_id||"-",d=a.some(c=>(c.discount||0)>0)||(o.discount_amount||0)>0,S=d?6:5,h=o.vat_enabled,f=o.vat_mode==="shop_absorbs"?" (ร้านออกให้)":"",x=a.map((c,y)=>{const z=G(c.product_name||c.product_id||"-"),u=c.discount||0,_=c.total||(c.qty||0)*(c.unit_price||0)-u;return`
        <tr>
            <td style="text-align:center;">${y+1}</td>
            <td>${z}</td>
            <td style="text-align:center;">${c.qty||0}</td>
            <td style="text-align:right;">${(c.unit_price||0).toLocaleString("th-TH",{minimumFractionDigits:2})}</td>
            ${d?`<td style="text-align:right;">${u>0?u.toLocaleString("th-TH",{minimumFractionDigits:2}):"-"}</td>`:""}
            <td style="text-align:right;">${_.toLocaleString("th-TH",{minimumFractionDigits:2})}</td>
        </tr>`}).join(""),P=o.subtotal||0,C=o.discount_amount||0,q=o.vat_amount||0,N=o.grand_total||0,j=`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>${l.label} - ${n}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 14px; padding: 20mm; color: #333; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1E2A4F; padding-bottom: 10px; margin-bottom: 15px; }
        .shop-name { font-size: 20px; font-weight: bold; color: #1E2A4F; }
        .doc-title { font-size: 18px; font-weight: bold; text-align: center; color: #C8A048; margin: 10px 0; text-transform: uppercase; letter-spacing: 1px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 15px; font-size: 13px; }
        .info-grid div { padding: 2px 0; }
        .info-label { font-weight: 600; color: #1E2A4F; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #1E2A4F; color: #fff; padding: 8px; text-align: left; font-size: 13px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .totals { text-align: right; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px; }
        .totals .row { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 3px; }
        .totals .label { color: #666; min-width: 120px; text-align: right; }
        .totals .value { min-width: 100px; text-align: right; font-weight: 600; }
        .grand-total { font-size: 18px; font-weight: bold; color: #C8A048; border-top: 2px solid #C8A048; padding-top: 8px; margin-top: 5px; }
        .vat-note { font-size: 11px; color: #999; font-style: italic; margin-top: 3px; }
        .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 12px; }
        .sig-line { border-top: 1px solid #999; margin-top: 50px; padding-top: 5px; text-align: center; }
        .notes-box { margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 6px; border-left: 3px solid #C8A048; font-size: 12px; }
        @media print { body { padding: 10mm; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="shop-name">${s.shopName}</div>
            <div style="font-size:12px;color:#666;">${s.shopAddress}</div>
            <div style="font-size:12px;color:#666;">โทร: ${s.shopPhone}</div>
        </div>
        <div style="text-align:right;">
            ${s.shopTaxId?`<div style="font-size:12px;">เลขประจำตัวผู้เสียภาษี: ${s.shopTaxId}</div>`:""}
            <div style="font-size:12px;">วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}</div>
        </div>
    </div>

    <div class="doc-title">${l.label}</div>

    <div class="info-grid">
        <div><span class="info-label">เลขเอกสาร:</span> ${n}</div>
        <div><span class="info-label">วันที่:</span> ${p}</div>
        <div><span class="info-label">${t?"ลูกค้า":"คู่ค้า"}:</span> ${e}</div>
        ${t?`<div><span class="info-label">ทะเบียนรถ:</span> ${o.plate||"-"}</div>`:`<div><span class="info-label">อ้างอิง:</span> ${o.ref_no||"-"}</div>`}
        ${t?`<div><span class="info-label">รุ่น:</span> ${o.model||"-"}</div>`:""}
        ${t?`<div><span class="info-label">เลขไมล์:</span> ${o.mileage||"-"}</div>`:""}
        ${t&&o.technician?`<div><span class="info-label">ช่าง:</span> ${o.technician}</div>`:""}
        ${t?`<div><span class="info-label">สถานะ:</span> ${o.status==="closed"?"ปิดงาน":o.status==="cancelled"?"ยกเลิก":"เปิด"}</div>`:""}
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:40px;text-align:center;">#</th>
                <th>รายการ</th>
                <th style="width:60px;text-align:center;">จำนวน</th>
                <th style="width:90px;text-align:right;">ราคา/หน่วย</th>
                ${d?'<th style="width:80px;text-align:right;">ส่วนลด</th>':""}
                <th style="width:90px;text-align:right;">รวม</th>
            </tr>
        </thead>
        <tbody>
            ${x||`<tr><td colspan="${S}" style="text-align:center;color:#999;">ไม่มีรายการ</td></tr>`}
        </tbody>
    </table>

    <div class="totals">
        <div class="row"><span class="label">รวม:</span><span class="value">฿${P.toLocaleString("th-TH",{minimumFractionDigits:2})}</span></div>
        ${d?`<div class="row"><span class="label">ส่วนลด:</span><span class="value" style="color:#ef4444;">-฿${C.toLocaleString("th-TH",{minimumFractionDigits:2})}</span></div>`:""}
        ${h?`<div class="row"><span class="label">ภาษีมูลค่าเพิ่ม 7%${f}:</span><span class="value">฿${q.toLocaleString("th-TH",{minimumFractionDigits:2})}</span></div>`:""}
        <div class="row grand-total"><span class="label">ยอดรวมสุทธิ:</span><span class="value">฿${N.toLocaleString("th-TH",{minimumFractionDigits:2})}</span></div>
        ${h&&o.vat_mode==="shop_absorbs"?'<div class="vat-note">* ร้านรับภาระ VAT — ราคาที่แสดงเป็นราคารวม VAT แล้ว</div>':""}
    </div>

    ${o.notes?`<div class="notes-box"><strong>หมายเหตุ:</strong> ${o.notes}</div>`:""}
    ${t&&o.repair_details?`<div class="notes-box" style="margin-top:8px;"><strong>รายละเอียดซ่อม:</strong> ${o.repair_details}</div>`:""}

    
    <div class="footer">
        <div><div class="sig-line">ผู้รับสินค้า / ลูกค้า</div></div>
        <div><div class="sig-line">ผู้ออกเอกสาร</div></div>
    </div>

    <script>window.onload = () => window.print();<\/script>
</body>
</html>`,w=window.open("","_blank");w.document.write(j),w.document.close()}export{ot as initFormsPage};
