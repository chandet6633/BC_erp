window.UIService={generateTableSkeleton(e,a=4){let t="";for(let n=0;n<a;n++){t+=`<tr style="animation-delay: ${n*.1}s">`;for(let r=0;r<e;r++)t+='<td><div class="skeleton-box skeleton-text"></div></td>';t+="</tr>"}return t},generateEmptyStateRow(e,a="ไม่พบข้อมูล",t="ยังไม่มีข้อมูลในระบบ ณ ขณะนี้",n=""){return n||(n='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="animate-fade-in"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>'),`
            <tr>
                <td colspan="${e}" style="padding: 0; background: transparent !important; border-bottom: none;">
                    <div class="empty-state animate-fade-in">
                        <div class="empty-state-icon" style="opacity: 0.8;">${n}</div>
                        <div class="empty-state-title">${a}</div>
                        <div class="empty-state-desc">${t}</div>
                    </div>
                </td>
            </tr>
        `},generateEmptyStateBlock(e="ไม่พบข้อมูล",a="ยังไม่มีข้อมูลในระบบ ณ ขณะนี้",t=""){return t||(t='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>'),`
            <div class="empty-state animate-fade-in">
                <div class="empty-state-icon">${t}</div>
                <div class="empty-state-title">${e}</div>
                <div class="empty-state-desc">${a}</div>
            </div>
        `},_acStyleInjected:!1,injectAutocompleteStyles(){if(this._acStyleInjected)return;this._acStyleInjected=!0;const e=document.createElement("style");e.textContent=`
            .ac-wrapper { position: relative; width: 100%; }
            .ac-wrapper input { width: 100%; }
            .ac-list {
                position: absolute; top: calc(100% + 4px); left: 0; right: 0;
                max-height: 240px; overflow-y: auto;
                background: var(--surface-0, #fff);
                border: 1px solid var(--surface-200, #e2e8f0);
                border-radius: var(--radius-md, 12px);
                box-shadow: var(--shadow-xl);
                z-index: 1000;
                display: none;
                animation: modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .ac-list.open { display: block; }
            .ac-item {
                padding: 10px 14px; cursor: pointer;
                display: flex; align-items: center; gap: 8px;
                font-size: 0.9rem; transition: all 150ms;
                border-bottom: 1px solid var(--surface-50);
            }
            .ac-item:last-child { border-bottom: none; }
            .ac-item:hover, .ac-item.highlighted {
                background: var(--primary-50);
                color: var(--primary-700);
            }
            .ac-item .ac-code {
                font-family: inherit;
                font-size: 0.8rem; opacity: 0.7;
                background: var(--surface-100);
                padding: 2px 6px;
                border-radius: 4px;
                min-width: 40px;
                text-align: center;
            }
            .ac-item .ac-secondary {
                margin-left: auto; font-size: 0.78rem; opacity: 0.6;
            }
            .ac-empty {
                padding: 16px; text-align: center;
                color: var(--surface-400, #94A3B8); font-size: 0.85rem;
            }
        `,document.head.appendChild(e)},createAutocomplete(e){this.injectAutocompleteStyles();const a=document.createElement("div");a.className="ac-wrapper";const t=document.createElement("input");t.type="text",t.className=e.inputClass||"input",t.placeholder=e.placeholder||"พิมพ์เพื่อค้นหา...",e.value&&(t.value=e.value),e.id&&(t.id=e.id),e.required&&(t.required=!0);const n=document.createElement("div");n.className="ac-list",a.appendChild(t),a.appendChild(n),e.container.appendChild(a);let r=[],s=-1,c=null;const u=async()=>{e.fetchItems&&(r=await e.fetchItems())},l=o=>{const i=o.toLowerCase().trim();return!i&&(e.minChars||0)>0?[]:i?r.filter(d=>`${d.code||""} ${d.label} ${d.secondary||""}`.toLowerCase().includes(i)).slice(0,50):r.slice(0,50)},m=o=>{s=-1,o.length===0?n.innerHTML='<div class="ac-empty">ไม่พบข้อมูล</div>':n.innerHTML=o.map((i,d)=>`
                    <div class="ac-item" data-idx="${d}">
                        ${i.code?`<span class="ac-code">${i.code}</span>`:""}
                        <span>${i.label}</span>
                        ${i.secondary?`<span class="ac-secondary">${i.secondary}</span>`:""}
                    </div>
                `).join(""),n.classList.add("open"),n.querySelectorAll(".ac-item").forEach(i=>{i.addEventListener("mousedown",d=>{d.preventDefault();const f=parseInt(i.dataset.idx);p(o[f])})})},p=o=>{o&&(t.value=o.label,t.dataset.selectedId=o.id||"",t.dataset.selectedCode=o.code||"",n.classList.remove("open"),e.onSelect&&e.onSelect(o))},v=o=>{const i=n.querySelectorAll(".ac-item");i.length!==0&&(i.forEach(d=>d.classList.remove("highlighted")),s+=o,s<0&&(s=i.length-1),s>=i.length&&(s=0),i[s].classList.add("highlighted"),i[s].scrollIntoView({block:"nearest"}))};return t.addEventListener("focus",async()=>{r.length===0&&await u(),m(l(t.value))}),t.addEventListener("input",()=>{clearTimeout(c),c=setTimeout(async()=>{r.length===0&&await u(),m(l(t.value)),e.onChange&&e.onChange(t.value)},150)}),t.addEventListener("keydown",o=>{const i=l(t.value);o.key==="ArrowDown"?(o.preventDefault(),v(1)):o.key==="ArrowUp"?(o.preventDefault(),v(-1)):o.key==="Enter"?(o.preventDefault(),s>=0?p(i[s]):i.length>0&&p(i[0])):o.key==="Escape"&&n.classList.remove("open")}),t.addEventListener("blur",()=>{setTimeout(()=>n.classList.remove("open"),200)}),{input:t,setValue(o){t.value=o},setSelectedId(o){t.dataset.selectedId=o},async refresh(){r=[],await u()},getSelectedId(){return t.dataset.selectedId||""}}},createDropdown(e){const a=document.createElement("select");a.className=e.selectClass||"input",e.id&&(a.id=e.id);const t=async()=>{const n=e.fetchItems?await e.fetchItems():[];if(a.innerHTML="",e.allLabel){const r=document.createElement("option");r.value="",r.textContent=e.allLabel,a.appendChild(r)}n.forEach(r=>{const s=document.createElement("option");s.value=r.value,s.textContent=r.label,a.appendChild(s)}),e.value&&(a.value=e.value)};return a.addEventListener("change",()=>{e.onChange&&e.onChange(a.value)}),e.container.appendChild(a),t(),{select:a,async refresh(){await t()},getValue(){return a.value},setValue(n){a.value=n}}},createVatToggle(e){const a=document.createElement("div");a.className="vat-toggle-panel",a.style.cssText="padding: 12px; border: 1px solid var(--surface-200); border-radius: var(--radius-md); background: var(--surface-50); margin-bottom: 16px;";const t="vat_"+Math.random().toString(36).slice(2,8);a.innerHTML=`
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600;">
                    <input type="checkbox" id="${t}_chk" ${e.vatEnabled?"checked":""} style="width: 18px; height: 18px; accent-color: var(--primary-600);">
                    ภาษีมูลค่าเพิ่ม (VAT 7%)
                </label>
                <div id="${t}_modes" style="display: ${e.vatEnabled?"flex":"none"}; gap: 16px; align-items: center; margin-left: 16px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                        <input type="radio" name="${t}_mode" value="customer_pays" ${!e.vatMode||e.vatMode==="customer_pays"?"checked":""}>
                        ลูกค้าจ่าย
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                        <input type="radio" name="${t}_mode" value="shop_absorbs" ${e.vatMode==="shop_absorbs"?"checked":""}>
                        ร้านออกให้
                    </label>
                </div>
            </div>
        `,e.container.appendChild(a);const n=a.querySelector(`#${t}_chk`),r=a.querySelector(`#${t}_modes`),s=a.querySelectorAll(`input[name="${t}_mode"]`),c=()=>{var l;return{vatEnabled:n.checked,vatMode:n.checked&&((l=a.querySelector(`input[name="${t}_mode"]:checked`))==null?void 0:l.value)||"customer_pays"}},u=()=>{e.onUpdate&&e.onUpdate(c())};return n.addEventListener("change",()=>{r.style.display=n.checked?"flex":"none",u()}),s.forEach(l=>l.addEventListener("change",u)),{getState:c,setState({vatEnabled:l,vatMode:m}){if(n.checked=!!l,r.style.display=l?"flex":"none",m){const p=a.querySelector(`input[name="${t}_mode"][value="${m}"]`);p&&(p.checked=!0)}}}},calcVat(e,a,t,n){const r=e-(a||0);if(!t)return{vat_amount:0,grand_total:r};if(n==="shop_absorbs")return{vat_amount:Math.round(r*7/107*100)/100,grand_total:r};const s=Math.round(r*.07*100)/100;return{vat_amount:s,grand_total:r+s}},generateActionMenu(e,a,t="editRow",n="deleteRow"){const r=`menu_${e}_${a}`;return`
            <div class="dropdown" id="${r}" style="position:relative;display:inline-block;">
                <button class="btn-icon" onclick="event.stopPropagation(); document.querySelectorAll('.dropdown.active').forEach(d => { if(d.id!=='${r}') d.classList.remove('active'); }); document.getElementById('${r}').classList.toggle('active');" 
                    style="background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:var(--radius-md,8px);font-size:1.2rem;color:var(--text-secondary,#64748b);transition:all 150ms;"
                    onmouseover="this.style.background='var(--surface-100,#f1f5f9)'"
                    onmouseout="this.style.background='none'">
                    ⋮
                </button>
                <div class="dropdown-menu" style="display:none;position:absolute;right:0;top:100%;min-width:140px;background:var(--surface-0,#fff);border:1px solid var(--surface-200,#e2e8f0);border-radius:var(--radius-md,12px);box-shadow:var(--shadow-xl,0 4px 24px rgba(0,0,0,.12));z-index:100;overflow:hidden;">
                    <button onclick="event.stopPropagation(); ${t}('${e}','${a}'); document.getElementById('${r}').classList.remove('active');"
                        style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;border:none;background:none;cursor:pointer;font-size:0.9rem;color:var(--text-primary,#1e293b);transition:background 150ms;"
                        onmouseover="this.style.background='var(--surface-50,#f8fafc)'"
                        onmouseout="this.style.background='none'">
                        ✏️ แก้ไข
                    </button>
                    <button onclick="event.stopPropagation(); if(confirm('ยืนยันการลบ?')) ${n}('${e}','${a}'); document.getElementById('${r}').classList.remove('active');"
                        style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;border:none;background:none;cursor:pointer;font-size:0.9rem;color:var(--danger,#ef4444);transition:background 150ms;"
                        onmouseover="this.style.background='var(--danger-50,#fef2f2)'"
                        onmouseout="this.style.background='none'">
                        🗑️ ลบ
                    </button>
                </div>
            </div>
        `},openTimeline(e){alert(`ประวัติรถ: ${e}

(ฟีเจอร์นี้กำลังพัฒนา)`)}};document.addEventListener("click",()=>{document.querySelectorAll(".dropdown.active").forEach(e=>{e.classList.remove("active");const a=e.querySelector(".dropdown-menu");a&&(a.style.display="none")})});const h=new MutationObserver(e=>{e.forEach(a=>{if(a.type==="attributes"&&a.attributeName==="class"){const t=a.target;if(t.classList.contains("dropdown")){const n=t.querySelector(".dropdown-menu");n&&(n.style.display=t.classList.contains("active")?"block":"none")}}})});h.observe(document.body,{attributes:!0,subtree:!0,attributeFilter:["class"]});
