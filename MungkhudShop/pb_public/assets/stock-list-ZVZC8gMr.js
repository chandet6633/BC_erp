import{f as d,l as v,r as L}from"./index-9Z-6SckO.js";function x(a){a.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">inventory_2</span>
                <h1>รายการสินค้าคงคลัง</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline"><span class="material-icons-outlined">download</span> ส่งออก Excel</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">กลุ่มสินค้า</label>
                        <select class="form-control" id="slGroupFilter">
                            <option value="">ทั้งหมด</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ประเภท</label>
                        <select class="form-control" id="slTypeFilter">
                            <option value="">ทั้งหมด</option>
                            <option value="part">อะไหล่</option>
                            <option value="service">บริการ</option>
                            <option value="fluid">น้ำมัน/สารหล่อลื่น</option>
                            <option value="accessory">อุปกรณ์เสริม</option>
                            <option value="other">อื่นๆ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ค้นหาสินค้า</label>
                        <input type="text" id="slSearchInput" class="form-control" placeholder="รหัส หรือ ชื่อสินค้า...">
                    </div>
                    <div class="form-group" style="justify-content:flex-end;">
                        <button class="btn btn-primary" id="btnSearchStock"><span class="material-icons-outlined">search</span> ค้นหา</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="stats-grid" style="margin-bottom:var(--sp-4);">
            <div class="stat-card">
                <div class="stat-icon blue"><span class="material-icons-outlined">category</span></div>
                <div class="stat-value" id="statItems">0</div>
                <div class="stat-label">รายการสินค้า</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-outlined">attach_money</span></div>
                <div class="stat-value" id="statValue">฿0</div>
                <div class="stat-label">มูลค่าคงคลังรวม</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><span class="material-icons-outlined">trending_down</span></div>
                <div class="stat-value" id="statLow">0</div>
                <div class="stat-label">สินค้าใกล้หมด</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-outlined">block</span></div>
                <div class="stat-value" id="statOut">0</div>
                <div class="stat-label">สินค้าหมด</div>
            </div>
        </div>

        <div id="stockGrid">
            <div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>
        </div>
    `;const q=[{key:"code",label:"รหัสสินค้า"},{key:"name",label:"ชื่อสินค้า"},{key:"type",label:"ประเภท"},{key:"group_name",label:"กลุ่ม"},{key:"unit",label:"หน่วย"},{key:"qty",label:"คงเหลือ"},{key:"cost",label:"ต้นทุนเฉลี่ย",render:e=>v(e.cost)},{key:"total_value",label:"มูลค่ารวม",render:e=>v(e.total_value)},{key:"status",label:"สถานะ",render:e=>{const l=e.min_qty||5;return e.qty<=0?'<span class="badge badge-cancelled">หมด</span>':e.qty<=l?`<span class="badge badge-pending">ใกล้หมด (ต่ำกว่า ${l})</span>`:'<span class="badge badge-closed">พอเพียง</span>'}}];async function _(){try{const e=await d("product_groups",{requestKey:null}),l=a.querySelector("#slGroupFilter");e.filter(o=>o.is_active!==!1).forEach(o=>{const i=document.createElement("option");i.value=o.id,i.textContent=o.name,l.appendChild(i)})}catch(e){console.warn("[StockList] Could not load product_groups:",e.message)}}async function u(){const e=a.querySelector("#stockGrid");e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังคำนวณยอดคงคลัง...</div>';const l=a.querySelector("#slSearchInput").value.toLowerCase().trim(),o=a.querySelector("#slGroupFilter").value,i=a.querySelector("#slTypeFilter").value;try{const p=await d("products",{requestKey:null}),h=await d("stock_ledgers",{requestKey:null}),c={};for(const t of h)c[t.product_id]||(c[t.product_id]={qty:0,total_value:0}),c[t.product_id].qty+=t.qty||0,c[t.product_id].total_value+=t.total_value||0;let y={};try{(await d("product_groups",{requestKey:null})).forEach(s=>{y[s.id]=s.name})}catch{}let r=[],m=0,b=0,g=0;for(const t of p){if(i&&t.type!==i||o&&t.group_id!==o||l&&!(t.code.toLowerCase().includes(l)||t.name.toLowerCase().includes(l)))continue;const s=c[t.id]||{qty:0,total_value:0},f=t.cost||(s.qty>0?s.total_value/s.qty:0),k=s.qty*f,n={...t,qty:s.qty,cost:f,total_value:k,group_name:y[t.group_id]||t.group_id||"-"};r.push(n),m+=n.total_value;const S=t.min_qty||5;n.qty<=0?g++:n.qty<=S&&b++}a.querySelector("#statItems").textContent=r.length,a.querySelector("#statValue").textContent=v(m),a.querySelector("#statLow").textContent=b,a.querySelector("#statOut").textContent=g,r.sort((t,s)=>(t.code||"").localeCompare(s.code||"")),e.innerHTML=L({columns:q,items:r})}catch(p){console.error(p),e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>'}}a.querySelector("#btnSearchStock").addEventListener("click",u),a.querySelector("#slSearchInput").addEventListener("keyup",e=>{e.key==="Enter"&&u()}),_(),u()}export{x as initStockListPage};
