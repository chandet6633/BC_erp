import{u,d as v,s as i,t as p,v as m,f as d}from"./index-BeHq0lp5.js";function y(e){var o,r;e.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">settings</span>
                <h1>ตั้งค่าระบบ</h1>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3>ข้อมูลร้าน</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label required">ชื่อร้าน</label>
                        <input type="text" class="form-control" id="settingShopName" value="MungkhudShop">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ที่อยู่</label>
                        <textarea class="form-control" rows="2" id="settingAddress"></textarea>
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">เบอร์โทรศัพท์</label>
                            <input type="text" class="form-control" id="settingPhone">
                        </div>
                        <div class="form-group">
                            <label class="form-label">อีเมล</label>
                            <input type="email" class="form-control" id="settingEmail">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขประจำตัวผู้เสียภาษี</label>
                        <input type="text" class="form-control" id="settingTaxId">
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>ตั้งค่าเอกสาร</h3></div>
                <div class="card-body">
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">Prefix ใบงาน</label>
                            <input type="text" class="form-control" id="settingPrefixJob" value="JOB">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Prefix ใบเสนอราคา</label>
                            <input type="text" class="form-control" id="settingPrefixQT" value="QT">
                        </div>
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">Prefix ใบแจ้งหนี้</label>
                            <input type="text" class="form-control" id="settingPrefixIV" value="IV">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Prefix ใบเสร็จ</label>
                            <input type="text" class="form-control" id="settingPrefixRC" value="RC">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">อัตราภาษีมูลค่าเพิ่ม (%)</label>
                        <input type="number" class="form-control" id="settingVatRate" value="7" min="0" max="100">
                    </div>
                </div>
            </div>
        </div>

        <!-- VAT & Print Config -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-top:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">receipt</span> ค่าเริ่มต้น VAT</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">เปิดใช้ VAT เป็นค่าเริ่มต้น</label>
                        <select class="form-control" id="settingDefaultVat">
                            <option value="false">ปิด — ไม่คิด VAT (ค่าเริ่มต้น)</option>
                            <option value="true">เปิด — คิด VAT 7%</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">โหมด VAT เริ่มต้น</label>
                        <select class="form-control" id="settingDefaultVatMode">
                            <option value="customer_pays">ลูกค้าจ่าย VAT (ราคา + 7%)</option>
                            <option value="shop_absorbs">ร้านออก VAT ให้ (ราคาเท่าเดิม)</option>
                        </select>
                    </div>
                    <div style="padding:var(--sp-3);background:var(--color-warning-light);border-radius:var(--radius-sm);font-size:0.85rem;">
                        <strong>💡 คำแนะนำ:</strong> ร้านส่วนใหญ่ไม่เปิด VAT เป็นค่าเริ่มต้น เนื่องจากลูกค้าส่วนใหญ่ไม่ต้องการใบกำกับภาษี
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">print</span> จัดการแบบฟอร์มพิมพ์</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">แสดง VAT ในเอกสาร</label>
                        <select class="form-control" id="settingPrintVat">
                            <option value="auto">อัตโนมัติ (ตาม VAT ใบงาน)</option>
                            <option value="always">แสดงเสมอ</option>
                            <option value="never">ไม่แสดง</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">แสดงส่วนลดในเอกสาร</label>
                        <select class="form-control" id="settingPrintDiscount">
                            <option value="true">แสดง</option>
                            <option value="false">ไม่แสดง</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">แสดงข้อมูลธนาคาร</label>
                        <select class="form-control" id="settingPrintBank">
                            <option value="true">แสดง</option>
                            <option value="false">ไม่แสดง</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">แสดงช่องลายเซ็น</label>
                        <select class="form-control" id="settingPrintSignature">
                            <option value="true">แสดง</option>
                            <option value="false">ไม่แสดง</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Telegram Config -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-top:var(--sp-5);">
            <div class="card" style="grid-column:span 2;">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">send</span> Telegram Bot</h3></div>
                <div class="card-body">
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">Bot Token</label>
                            <input type="text" class="form-control" id="settingTgBotToken" placeholder="123456:ABC-DEF...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Chat ID / Group ID</label>
                            <input type="text" class="form-control" id="settingTgChatId" placeholder="-100123456789">
                        </div>
                    </div>
                    <div class="form-row-2" style="margin-top:var(--sp-3);">
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgJobClose"> แจ้งเตือนเมื่อปิดใบงาน
                        </label>
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgLowStock"> แจ้งเตือนสินค้าใกล้หมด
                        </label>
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgDailySummary"> สรุปรายวัน
                        </label>
                    </div>
                    <div style="margin-top:var(--sp-3);display:flex;gap:var(--sp-3);">
                        <button class="btn btn-sm btn-outline" id="btnSaveTelegram"><span class="material-icons-outlined" style="font-size:16px;">save</span> บันทึก Telegram</button>
                        <button class="btn btn-sm btn-outline" id="btnTestTelegram"><span class="material-icons-outlined" style="font-size:16px;">send</span> ส่งข้อความทดสอบ</button>
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-top:var(--sp-5);text-align:right;">
            <button class="btn btn-primary btn-lg" id="btnSaveSettings"><span class="material-icons-outlined">save</span> บันทึกการตั้งค่า</button>
        </div>
    `;let a=null;async function n(){try{const l=await d("settings",{requestKey:null});if(l.length>0){const t=l[0];a=t.id,e.querySelector("#settingShopName").value=t.shop_name||"",e.querySelector("#settingAddress").value=t.address||"",e.querySelector("#settingPhone").value=t.phone||"",e.querySelector("#settingEmail").value=t.email||"",e.querySelector("#settingTaxId").value=t.tax_id||"",e.querySelector("#settingPrefixJob").value=t.prefix_job||"JOB",e.querySelector("#settingPrefixQT").value=t.prefix_qt||"QT",e.querySelector("#settingPrefixIV").value=t.prefix_iv||"IV",e.querySelector("#settingPrefixRC").value=t.prefix_rc||"RC",e.querySelector("#settingVatRate").value=t.vat_rate??7,e.querySelector("#settingDefaultVat").value=t.default_vat_enabled?"true":"false",e.querySelector("#settingDefaultVatMode").value=t.default_vat_mode||"customer_pays",localStorage.setItem("mungkhud_settings",JSON.stringify(t))}}catch(l){console.warn("Settings collection may not exist yet:",l.message)}}e.querySelector("#btnSaveSettings").addEventListener("click",async()=>{const l={shop_name:e.querySelector("#settingShopName").value,address:e.querySelector("#settingAddress").value,phone:e.querySelector("#settingPhone").value,email:e.querySelector("#settingEmail").value,tax_id:e.querySelector("#settingTaxId").value,prefix_job:e.querySelector("#settingPrefixJob").value,prefix_qt:e.querySelector("#settingPrefixQT").value,prefix_iv:e.querySelector("#settingPrefixIV").value,prefix_rc:e.querySelector("#settingPrefixRC").value,vat_rate:parseFloat(e.querySelector("#settingVatRate").value)||7,default_vat_enabled:e.querySelector("#settingDefaultVat").value==="true",default_vat_mode:e.querySelector("#settingDefaultVatMode").value};try{a?await u("settings",a,l):a=(await v("settings",l)).id,i("บันทึกการตั้งค่าเรียบร้อย","success"),localStorage.setItem("mungkhud_settings",JSON.stringify(l))}catch(t){console.error(t),i("เกิดข้อผิดพลาด: "+t.message,"error")}}),(o=e.querySelector("#btnSaveTelegram"))==null||o.addEventListener("click",async()=>{const l={bot_token:e.querySelector("#settingTgBotToken").value.trim(),chat_id:e.querySelector("#settingTgChatId").value.trim(),notify_job_close:e.querySelector("#settingTgJobClose").checked,notify_low_stock:e.querySelector("#settingTgLowStock").checked,notify_daily_summary:e.querySelector("#settingTgDailySummary").checked},t=await p(l);i(t?"บันทึก Telegram config สำเร็จ":"ไม่สามารถบันทึกได้",t?"success":"error")}),(r=e.querySelector("#btnTestTelegram"))==null||r.addEventListener("click",async()=>{const l=await m();i(l?"ส่งข้อความสำเร็จ ✅":"ส่งไม่ได้ — ตรวจสอบ Token / Chat ID",l?"success":"error")});async function c(){try{const l=await d("app_settings",{filter:"key='telegram_config'",requestKey:"tg_load"});if(l.length>0&&l[0].value){const t=JSON.parse(l[0].value),s=g=>e.querySelector(g);s("#settingTgBotToken")&&(s("#settingTgBotToken").value=t.bot_token||""),s("#settingTgChatId")&&(s("#settingTgChatId").value=t.chat_id||""),s("#settingTgJobClose")&&(s("#settingTgJobClose").checked=!!t.notify_job_close),s("#settingTgLowStock")&&(s("#settingTgLowStock").checked=!!t.notify_low_stock),s("#settingTgDailySummary")&&(s("#settingTgDailySummary").checked=!!t.notify_daily_summary)}}catch{}}n(),c()}export{y as initSettingsPage};
