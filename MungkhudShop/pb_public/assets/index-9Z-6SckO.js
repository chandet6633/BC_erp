const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./job-BAQPdb7v.js","./inventory-BROWFZn2.js","./quotation-32l1rX0y.js","./document-factory-B51oxqq2.js","./invoice-CtNcYpiq.js","./receipt-bqBxWlDa.js","./credit-note-CZRls2rU.js","./requisition-BOksLb2t.js","./stock-return-DHeN5Bny.js","./stock-transfer-BIc-NQoR.js","./stock-adjust-CMEFR0bC.js","./goods-receipt-8cHmy-5l.js","./purchase-invoice-BsVcPFXQ.js","./purchase-cn-D1nUAZkJ.js","./payment-B21xqqRw.js","./withholding-tax-DPn3eIw_.js","./master-company-C2c0-aAW.js","./master-factory-DthDJCqX.js","./master-customer-B5lbJ3Fn.js","./master-vehicle-C_1A4RS-.js","./master-product-DkNKUOae.js","./master-brand-CTioWF-r.js","./master-group-myO0_FVx.js","./master-vendor-BdRDI_yq.js","./report-sales-bDgHX6SZ.js","./chart-bvgMksnO.js","./report-inventory-DYDkRtoD.js","./report-finance-B8hwHgmA.js","./kanban-BNFGSdCo.js","./kanban-DwCSKmbi.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();const Re="modulepreload",Oe=function(e,t){return new URL(e,t).href},pe={},m=function(t,n,s){let o=Promise.resolve();if(n&&n.length>0){let a=function(u){return Promise.all(u.map(v=>Promise.resolve(v).then(c=>({status:"fulfilled",value:c}),c=>({status:"rejected",reason:c}))))};const i=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),f=(l==null?void 0:l.nonce)||(l==null?void 0:l.getAttribute("nonce"));o=a(n.map(u=>{if(u=Oe(u,s),u in pe)return;pe[u]=!0;const v=u.endsWith(".css"),c=v?'[rel="stylesheet"]':"";if(!!s)for(let b=i.length-1;b>=0;b--){const d=i[b];if(d.href===u&&(!v||d.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${c}`))return;const p=document.createElement("link");if(p.rel=v?"stylesheet":Re,v||(p.as="script"),p.crossOrigin="",p.href=u,f&&p.setAttribute("nonce",f),document.head.appendChild(p),v)return new Promise((b,d)=>{p.addEventListener("load",b),p.addEventListener("error",()=>d(new Error(`Unable to preload CSS for ${u}`)))})}))}function r(a){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=a,window.dispatchEvent(i),!i.defaultPrevented)throw a}return o.then(a=>{for(const i of a||[])i.status==="rejected"&&r(i.reason);return t().catch(r)})};function It(e,t,n){const s=document.createElement("div");s.className="tabs",t.forEach((o,r)=>{const a=document.createElement("button");a.className=`tab-btn${r===0?" active":""}`,a.dataset.tab=o.id,a.innerHTML=`${o.icon?`<span class="material-icons-outlined">${o.icon}</span>`:""}${o.label}`,a.addEventListener("click",()=>{s.querySelectorAll(".tab-btn").forEach(l=>l.classList.remove("active")),a.classList.add("active"),e.querySelectorAll(".tab-panel").forEach(l=>l.classList.remove("active"));const i=e.querySelector(`#panel-${o.id}`);i&&i.classList.add("active")}),s.appendChild(a)}),e.appendChild(s)}function me({columns:e,items:t,onRowClick:n}){if(!t||t.length===0)return`
            <div class="data-grid">
                <table><thead><tr>${e.map(o=>`<th>${o.label}</th>`).join("")}</tr></thead></table>
                <div class="grid-empty">
                    <span class="material-icons-outlined">inbox</span>
                    <p>ไม่มีข้อมูล</p>
                </div>
            </div>`;const s=t.map((o,r)=>{const a=e.map(i=>`<td>${i.render?i.render(o,r):o[i.key]??""}</td>`).join("");return`<tr data-id="${o.id||r}" style="cursor:pointer">${a}</tr>`}).join("");return`
        <div class="data-grid">
            <table>
                <thead><tr>${e.map(o=>`<th>${o.label}</th>`).join("")}</tr></thead>
                <tbody>${s}</tbody>
            </table>
        </div>`}function X(e,t="info"){let n=document.querySelector(".toast-container");n||(n=document.createElement("div"),n.className="toast-container",document.body.appendChild(n));const s=5;for(;n.children.length>=s;)n.firstChild.remove();const o={success:"check_circle",error:"error",warning:"warning",info:"info"},r=document.createElement("div");r.className=`toast ${t}`,r.innerHTML=`<span class="material-icons-outlined">${o[t]||"info"}</span>${e}`,n.appendChild(r),setTimeout(()=>{r.style.opacity="0",r.style.transform="translateX(100%)",setTimeout(()=>r.remove(),300)},4e3)}function At(e,t){return new Promise(n=>{const s=document.createElement("div");s.className="modal-overlay show",s.innerHTML=`
            <div class="modal" style="max-width:420px;">
                <div class="modal-header"><h3>${e}</h3></div>
                <div class="modal-body"><p>${t}</p></div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="confirmCancel">ยกเลิก</button>
                    <button class="btn btn-danger" id="confirmOk">ตกลง</button>
                </div>
            </div>`,document.body.appendChild(s),s.querySelector("#confirmCancel").onclick=()=>{s.remove(),n(!1)},s.querySelector("#confirmOk").onclick=()=>{s.remove(),n(!0)}})}function Rt(e){return e?new Date(e).toLocaleDateString("th-TH",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"}function U(e){return e==null||isNaN(e)?"฿0.00":"฿"+Number(e).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}function Ot(e,t=1){const n=new Date,s=String(n.getFullYear()).slice(-2),o=String(n.getMonth()+1).padStart(2,"0");return`${e}${s}${o}-${String(t).padStart(4,"0")}`}let fe=!1;function Me(){if(fe)return;fe=!0;const e=document.createElement("style");e.textContent=`
        .ac-wrapper { position: relative; width: 100%; }
        .ac-wrapper input { width: 100%; }
        .ac-list {
            position: absolute; top: 100%; left: 0; right: 0;
            max-height: 240px; overflow-y: auto;
            background: var(--color-surface-alt, #fff);
            border: 1px solid var(--color-border, #e2e8f0);
            border-radius: var(--radius-sm, 6px);
            box-shadow: var(--shadow-md);
            z-index: 150;
            display: none;
        }
        .ac-list.open { display: block; }
        .ac-item {
            padding: 8px 12px; cursor: pointer;
            display: flex; align-items: center; gap: 8px;
            font-size: 0.9rem; transition: background 120ms;
        }
        .ac-item:hover, .ac-item.highlighted {
            background: var(--color-primary-light, #2A3B6E);
            color: var(--color-text-inverse, #fff);
        }
        .ac-item .ac-code {
            font-family: var(--font-mono, monospace);
            font-size: 0.8rem; opacity: 0.7;
            min-width: 60px;
        }
        .ac-item .ac-secondary {
            margin-left: auto; font-size: 0.78rem; opacity: 0.6;
        }
        .ac-empty {
            padding: 10px 12px; text-align: center;
            color: var(--color-text-muted, #94A3B8); font-size: 0.85rem;
        }
    `,document.head.appendChild(e)}function Mt(e){Me();const t=document.createElement("div");t.className="ac-wrapper";const n=document.createElement("input");n.type="text",n.className=e.inputClass||"form-control",n.placeholder=e.placeholder||"พิมพ์เพื่อค้นหา...",e.value&&(n.value=e.value),e.id&&(n.id=e.id);const s=document.createElement("div");s.className="ac-list",t.appendChild(n),t.appendChild(s),e.container.appendChild(t);let o=[],r=-1,a=null;async function i(){e.fetchItems&&(o=await e.fetchItems())}function l(c){const y=c.toLowerCase().trim();return!y&&e.minChars>0?o.slice(0,50):o.filter(p=>`${p.code||""} ${p.label} ${p.secondary||""}`.toLowerCase().includes(y)).slice(0,50)}function f(c){r=-1,c.length===0?s.innerHTML='<div class="ac-empty">ไม่พบข้อมูล</div>':s.innerHTML=c.map((y,p)=>`
                <div class="ac-item" data-idx="${p}">
                    ${y.code?`<span class="ac-code">${y.code}</span>`:""}
                    <span>${y.label}</span>
                    ${y.secondary?`<span class="ac-secondary">${y.secondary}</span>`:""}
                </div>
            `).join(""),s.classList.add("open"),s.querySelectorAll(".ac-item").forEach(y=>{y.addEventListener("mousedown",p=>{p.preventDefault();const b=parseInt(y.dataset.idx);u(c[b])})})}function u(c){c&&(n.value=c.label,n.dataset.selectedId=c.id||"",n.dataset.selectedCode=c.code||"",s.classList.remove("open"),e.onSelect&&e.onSelect(c))}function v(c,y){const p=s.querySelectorAll(".ac-item");p.length!==0&&(p.forEach(b=>b.classList.remove("highlighted")),r+=c,r<0&&(r=p.length-1),r>=p.length&&(r=0),p[r].classList.add("highlighted"),p[r].scrollIntoView({block:"nearest"}))}return n.addEventListener("focus",async()=>{o.length===0&&await i();const c=l(n.value);f(c)}),n.addEventListener("input",()=>{clearTimeout(a),a=setTimeout(async()=>{o.length===0&&await i();const c=l(n.value);f(c),e.onChange&&e.onChange(n.value)},150)}),n.addEventListener("keydown",c=>{if(l(n.value),c.key==="ArrowDown")c.preventDefault(),v(1);else if(c.key==="ArrowUp")c.preventDefault(),v(-1);else if(c.key==="Enter"){if(c.preventDefault(),r>=0){const y=l(n.value);u(y[r])}}else c.key==="Escape"&&s.classList.remove("open")}),n.addEventListener("blur",()=>{setTimeout(()=>s.classList.remove("open"),200)}),{input:n,setValue(c){n.value=c},setSelectedId(c){n.dataset.selectedId=c},async refresh(){o=[],await i()},getSelectedId(){return n.dataset.selectedId||""}}}function Dt(e){const t="vat_"+Math.random().toString(36).slice(2,8),n=document.createElement("div");n.className="vat-toggle-panel",n.innerHTML=`
        <div class="flex items-center gap-3" style="flex-wrap:wrap;">
            <label class="vat-toggle-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
                <input type="checkbox" id="${t}_chk" ${e.vatEnabled?"checked":""} style="width:18px;height:18px;accent-color:var(--color-accent);">
                ภาษีมูลค่าเพิ่ม 7%
            </label>
            <div class="vat-mode-group" id="${t}_modes" style="display:${e.vatEnabled?"flex":"none"};gap:var(--sp-3);align-items:center;margin-left:var(--sp-4);">
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;">
                    <input type="radio" name="${t}_mode" value="customer_pays" ${!e.vatMode||e.vatMode==="customer_pays"?"checked":""}>
                    ลูกค้าจ่าย VAT
                </label>
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;">
                    <input type="radio" name="${t}_mode" value="shop_absorbs" ${e.vatMode==="shop_absorbs"?"checked":""}>
                    ร้านออก VAT ให้
                </label>
            </div>
        </div>
    `,e.container.appendChild(n);const s=n.querySelector(`#${t}_chk`),o=n.querySelector(`#${t}_modes`),r=n.querySelectorAll(`input[name="${t}_mode"]`);function a(){var l;return{vatEnabled:s.checked,vatMode:s.checked&&((l=n.querySelector(`input[name="${t}_mode"]:checked`))==null?void 0:l.value)||"customer_pays"}}function i(){e.onUpdate&&e.onUpdate(a())}return s.addEventListener("change",()=>{o.style.display=s.checked?"flex":"none",i()}),r.forEach(l=>l.addEventListener("change",i)),{getState:a,setState({vatEnabled:l,vatMode:f}){if(s.checked=!!l,o.style.display=l?"flex":"none",f){const u=n.querySelector(`input[name="${t}_mode"][value="${f}"]`);u&&(u.checked=!0)}}}}function Bt(e,t,n,s){const o=e-(t||0);if(!n)return{vat_amount:0,grand_total:o};let r=7;try{const i=localStorage.getItem("mungkhud_settings");if(i){const l=JSON.parse(i);r=parseFloat(l.vat_rate)||7}}catch{}if(s==="shop_absorbs")return{vat_amount:Math.round(o*r/(100+r)*100)/100,grand_total:o};const a=Math.round(o*(r/100)*100)/100;return{vat_amount:a,grand_total:o+a}}function Z(e){if(!e||typeof e!="string")return"";const t=e.trim();return!t||t==='id!=""'||t==="id!=''"?"":De(t).map(o=>o.type==="and"?"~and":o.type==="or"?"~or":Be(o.expr)).join("")}function De(e){const t=[];let n="",s=0,o=0;for(;o<e.length;){const r=e[o];if(r==="("){s++,n+=r,o++;continue}if(r===")"){s--,n+=r,o++;continue}if(s===0){if(e[o]==="&"&&e[o+1]==="&"){n.trim()&&t.push({type:"expr",expr:n.trim()}),t.push({type:"and"}),n="",o+=2;continue}if(e[o]==="|"&&e[o+1]==="|"){n.trim()&&t.push({type:"expr",expr:n.trim()}),t.push({type:"or"}),n="",o+=2;continue}}n+=r,o++}return n.trim()&&t.push({type:"expr",expr:n.trim()}),t}function Be(e){if(!e)return"";const t=e.trim();if(t.startsWith("(")&&t.endsWith(")")){const s=t.slice(1,-1).trim();if(s.includes("||")||s.includes("&&"))return Z(s)}const n=[{pb:"!=",noco:"neq"},{pb:">=",noco:"gte"},{pb:"<=",noco:"lte"},{pb:">",noco:"gt"},{pb:"<",noco:"lt"},{pb:"~",noco:"like"},{pb:"=",noco:"eq"}];for(const s of n){const o=je(e,s.pb);if(o!==-1){const r=e.substring(0,o).trim();let a=e.substring(o+s.pb.length).trim();return a=ze(a),s.noco==="neq"&&a===""&&r==="id"?"":`(${r},${s.noco},${a})`}}return console.warn("[FilterTranslator] Could not parse:",e),""}function je(e,t){let n=!1,s="";for(let o=0;o<e.length-t.length+1;o++){const r=e[o];if(!n&&(r==="'"||r==='"')){n=!0,s=r;continue}if(n&&r===s){n=!1;continue}if(!n&&e.substring(o,o+t.length)===t){if(t==="="&&o>0&&(e[o-1]==="!"||e[o-1]===">"||e[o-1]==="<")||t===">"&&e[o+1]==="="||t==="<"&&e[o+1]==="=")continue;return o}}return-1}function ze(e){return e&&(e.startsWith("'")&&e.endsWith("'")||e.startsWith('"')&&e.endsWith('"')?e.slice(1,-1):e)}const D="/api/data",z="/api/auth";let P="";async function Ne(e={}){if(e.token&&(P=e.token),!P)try{const t=localStorage.getItem("bcauto_jwt");t&&(P=t)}catch{}}function N(e){P=e;try{localStorage.setItem("bcauto_jwt",e)}catch{}}function W(){P="";try{localStorage.removeItem("bcauto_jwt")}catch{}}function C(e,t={}){const n={"Content-Type":"application/json",...P?{Authorization:`Bearer ${P}`}:{},...t.headers||{}};return fetch(e,{...t,headers:n})}async function jt(e,t=1,n=50,s={}){const o=new URLSearchParams;if(o.set("limit",String(n)),o.set("offset",String((t-1)*n)),s.filter){const i=Z(s.filter);i&&o.set("where",i)}s.sort&&o.set("sort",s.sort),s.fields&&o.set("fields",s.fields);const r=await C(`${D}/${e}?${o}`);if(!r.ok){const i=await r.text();throw new Error(`List failed on ${e}: ${i}`)}const a=await r.json();return{items:a.items||[],totalItems:a.totalItems||0,totalPages:a.totalPages||1,page:a.page||t,perPage:a.perPage||n}}async function w(e,t={}){const n=new URLSearchParams;if(t.filter){const o=Z(t.filter);o&&n.set("where",o)}t.sort&&n.set("sort",t.sort),t.fields&&n.set("fields",t.fields);const s=await C(`${D}/${e}/all?${n}`);if(!s.ok){const o=await s.text();throw new Error(`FullList failed on ${e}: ${o}`)}return s.json()}async function He(e,t){const n=await C(`${D}/${e}`,{method:"POST",body:JSON.stringify(t)});if(!n.ok){const s=await n.text();throw new Error(`Create failed on ${e}: ${s}`)}return n.json()}async function Ue(e,t,n){const s=await C(`${D}/${e}/${t}`,{method:"PATCH",body:JSON.stringify(n)});if(!s.ok){const o=await s.text();throw new Error(`Update failed on ${e}/${t}: ${o}`)}return s.json()}async function zt(e,t){const n=await C(`${D}/${e}/${t}`,{method:"DELETE"});if(!n.ok){const s=await n.text();throw new Error(`Delete failed on ${e}/${t}: ${s}`)}return{success:!0}}async function Ve(e,t){const n=await fetch(`${z}/pin-login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:e,roleGroup:t})});if(!n.ok){const o=await n.json().catch(()=>({error:"Login failed"}));throw new Error(o.error||"Login failed")}const s=await n.json();return N(s.token),s}async function Fe(e,t){const n=await fetch(`${z}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:e,password:t})});if(!n.ok){const o=await n.json().catch(()=>({error:"Login failed"}));throw new Error(o.error||"Login failed")}const s=await n.json();return N(s.token),s}async function Je(e,t){const n=await C(`${z}/change-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({current_password:e,new_password:t})});if(!n.ok){const s=await n.json().catch(()=>({error:"Failed"}));throw new Error(s.error||"Password change failed")}return n.json()}async function Ke(e){if(!e)return null;try{N(e);const t=await C(`${z}/me`);return t.ok?(await t.json()).user:(W(),null)}catch{return W(),null}}function We(){try{return`${window.location.protocol}//${window.location.hostname}:9092`}catch{return"http://localhost:9092"}}Ne();function ee(e){return e==null?"":String(e).replace(/'/g,"\\'")}function Nt(e){if(e==null)return"";const t=document.createElement("div");return t.textContent=String(e),t.innerHTML}const I="mungkhud_auth",A="mungkhud_jwt",Ee="mungkhud_branch";function L(){try{const e=localStorage.getItem(I);return e?JSON.parse(e):null}catch{return null}}function R(e,t){localStorage.setItem(I,JSON.stringify(e)),t&&localStorage.setItem(A,t)}function Ge(){return localStorage.getItem(A)||""}function Le(){localStorage.removeItem(I),localStorage.removeItem(A),W(),window.location.hash="#/login",window.location.reload()}async function Ye(){const e=Ge();if(!e)return null;try{const t=await Ke(e);if(!t)return localStorage.removeItem(A),localStorage.removeItem(I),null;const n=await te(t);return R(n,e),n}catch{return localStorage.removeItem(A),localStorage.removeItem(I),null}}async function Qe(e,t,n=!0){try{const{user:s,token:o}=await Fe(e,t);if(!s)return null;const r=await te(s);return r.must_change_password=s.must_change_password||!1,R(r,o),s.branch&&!["admin","owner"].includes(s.role)&&O(s.branch),r}catch(s){throw console.warn("[Auth] Username login failed:",s.message),s}}async function Xe(e,t){try{const{user:n,token:s}=await Ve(e,t);if(!n)return null;const o=await te(n);return o.must_change_password=n.must_change_password||!1,R(o,s),n.branch&&!["admin","owner"].includes(n.role)&&O(n.branch),o}catch(n){return console.warn("[Auth] PIN login failed:",n.message),null}}async function te(e){let t="*";try{const n=await w("system_roles",{filter:`name='${ee(e.role)}'`,requestKey:null});n.length>0&&(t=n[0].allowed_menus)}catch{["mechanic","sa"].includes(e.role)&&(t="#/dashboard,#/kanban,#/job")}return{id:e.id,username:e.username||e.name,display_name:e.name||e.display_name,role:e.role,allowed_menus:t,branch_id:e.branch||"",permissions:"{}",sso_source:"api_jwt"}}function Te(e){const t=L();return t?t.allowed_menus==="*"?!0:(t.allowed_menus||"").split(",").map(s=>s.trim()).includes(e):!1}function G(e){return{admin:"ผู้ดูแลระบบ",owner:"เจ้าของ",manager:"ผู้จัดการ",mechanic:"ช่าง",sa:"SA"}[e]||e}function ne(){return localStorage.getItem(Ee)||""}function O(e){localStorage.setItem(Ee,e||"")}function Ze(e="branch_id"){const t=ne();return t?`${e}='${ee(t)}'`:""}const et="https://api.telegram.org/bot",B="MungkhudShop2026";function tt(e){return btoa(e.split("").map((t,n)=>String.fromCharCode(t.charCodeAt(0)^B.charCodeAt(n%B.length))).join(""))}function nt(e){try{return atob(e).split("").map((n,s)=>String.fromCharCode(n.charCodeAt(0)^B.charCodeAt(s%B.length))).join("")}catch{return e}}async function oe(){try{const e=await w("app_settings",{filter:"key='telegram_config'",requestKey:"tg_config"});if(e.length>0&&e[0].value){const t=JSON.parse(e[0].value);return t.bot_token&&(t.bot_token=nt(t.bot_token)),t}}catch(e){console.warn("Telegram config not found:",e.message)}return null}async function Ht(e){try{const t=await w("app_settings",{filter:"key='telegram_config'",requestKey:"tg_save"}),n={...e};n.bot_token&&(n.bot_token=tt(n.bot_token));const s=JSON.stringify(n);return t.length>0?await Ue("app_settings",t[0].id,{value:s}):await He("app_settings",{key:"telegram_config",value:s}),!0}catch(t){return console.error("Failed to save Telegram config:",t),!1}}async function se(e){const t=await oe();if(!t||!t.bot_token||!t.chat_id)return console.warn("Telegram not configured"),!1;try{const n=`${et}${t.bot_token}/sendMessage`;return(await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:t.chat_id,text:e,parse_mode:"HTML"})})).ok}catch(n){return console.error("Telegram send failed:",n),!1}}async function Ut(){const e=new Date().toLocaleString("th-TH");return se(`🔔 <b>ทดสอบการแจ้งเตือน</b>

✅ ระบบ MungkhudShop เชื่อมต่อ Telegram สำเร็จ
🕐 เวลา: ${e}`)}async function Vt(e){const t=await oe();if(!(t!=null&&t.notify_job_close))return;const n=["✅ <b>ปิดใบงานเรียบร้อย</b>","",`📋 เลขใบงาน: ${e.job_no||"-"}`,`🚗 ทะเบียน: ${e.plate||"-"}`,`👤 ลูกค้า: ${e.customer_name||"-"}`,`💰 ยอดรวม: ฿${(e.grand_total||0).toLocaleString()}`,"",`🕐 ${new Date().toLocaleString("th-TH")}`].join(`
`);return se(n)}async function ot(e){const t=await oe();if(!(t!=null&&t.notify_low_stock)||e.length===0)return;const n=e.slice(0,10).map(o=>`  • ${o.name} (คงเหลือ: ${o.qty})`).join(`
`),s=["🚨 <b>แจ้งเตือนสินค้าใกล้หมด</b>","",`พบ ${e.length} รายการที่ต่ำกว่าขั้นต่ำ:`,n,e.length>10?`  ...และอีก ${e.length-10} รายการ`:"","",`🕐 ${new Date().toLocaleString("th-TH")}`].join(`
`);return se(s)}function V(e,t=80,n=24){if(!e||e.length<2)return"";const s=Math.max(...e,1),o=Math.min(...e,0),r=s-o||1,a=t/(e.length-1),i=e.map((v,c)=>{const y=c*a,p=n-(v-o)/r*(n-4)-2;return`${y.toFixed(1)},${p.toFixed(1)}`}).join(" "),l=e[0],f=e[e.length-1],u=f>l?"#22c55e":f<l?"#ef4444":"#94a3b8";return`<svg width="${t}" height="${n}" viewBox="0 0 ${t} ${n}" 
        style="display:block;margin-top:4px;opacity:0.8;">
        <polyline points="${i}" fill="none" stroke="${u}" stroke-width="2" 
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`}function F(e){if(!e||e.length<2)return"";const t=e[0],n=e[e.length-1];if(t===0&&n===0)return'<span class="trend-flat">● —</span>';const s=t===0?100:(n-t)/t*100;return s>0?`<span class="trend-up">▲ ${Math.round(s)}%</span>`:s<0?`<span class="trend-down">▼ ${Math.abs(Math.round(s))}%</span>`:'<span class="trend-flat">● —</span>'}function $e(e){const t=L(),n=ne()?"":" (ทุกสาขา)";e.innerHTML=`
        <style>
            .trend-up { color: #22c55e; font-size: 0.7rem; font-weight: 600; }
            .trend-down { color: #ef4444; font-size: 0.7rem; font-weight: 600; }
            .trend-flat { color: #94a3b8; font-size: 0.7rem; }
            .stat-sparkline { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
        </style>
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">dashboard</span>
                <h1>แดชบอร์ด</h1>
            </div>
            <div class="toolbar-actions" style="gap:var(--sp-3);">
                <span class="text-sm text-muted">${t?`สวัสดี, ${t.display_name||t.username}`:""}</span>
                <span class="text-sm text-muted">อัพเดท: ${new Date().toLocaleString("th-TH")}${n}</span>
                <button class="btn btn-sm btn-outline" id="btnRefreshDash"><span class="material-icons-outlined" style="font-size:16px;">refresh</span></button>
            </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);">
            <div class="stat-card">
                <div class="stat-icon blue"><span class="material-icons-outlined">build</span></div>
                <div class="stat-value" id="statJobs">-</div>
                <div class="stat-label">ใบงานที่เปิดอยู่</div>
                <div class="stat-sparkline" id="sparkJobs"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-outlined">today</span></div>
                <div class="stat-value" id="statTodayRev">-</div>
                <div class="stat-label">รายได้วันนี้</div>
                <div class="stat-sparkline" id="sparkTodayRev"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(168,85,247,0.15);color:#a855f7;"><span class="material-icons-outlined">paid</span></div>
                <div class="stat-value" id="statRevenue">-</div>
                <div class="stat-label">รายได้เดือนนี้</div>
                <div class="stat-sparkline" id="sparkRevenue"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><span class="material-icons-outlined">people</span></div>
                <div class="stat-value" id="statCustomers">-</div>
                <div class="stat-label">ลูกค้าทั้งหมด</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-outlined">inventory_2</span></div>
                <div class="stat-value" id="statLowStock">-</div>
                <div class="stat-label">สินค้าใกล้หมด</div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div id="reorderAlert" style="display:none;margin-top:var(--sp-4);padding:var(--sp-4);background:linear-gradient(135deg,#fef2f2,#fff7ed);border-left:4px solid #ef4444;border-radius:8px;">
            <div style="display:flex;align-items:center;gap:var(--sp-3);">
                <span class="material-icons-outlined" style="color:#ef4444;font-size:28px;">warning_amber</span>
                <div>
                    <div style="font-weight:600;color:#ef4444;">สินค้าต่ำกว่าจุดสั่งซื้อ</div>
                    <div class="text-sm text-muted" id="reorderMessage">กำลังตรวจสอบ...</div>
                </div>
                <a href="#/stock-list" class="btn btn-sm btn-outline" style="margin-left:auto;color:#ef4444;border-color:#ef4444;">ดูรายละเอียด</a>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="card" style="margin-top:var(--sp-4);">
            <div class="card-body" style="display:flex;gap:var(--sp-3);flex-wrap:wrap;">
                <a href="#/job" class="btn btn-primary"><span class="material-icons-outlined">add</span> สร้างใบงานใหม่</a>
                <a href="#/quotation" class="btn btn-outline"><span class="material-icons-outlined">request_quote</span> ใบเสนอราคา</a>
                <a href="#/report-sales" class="btn btn-outline"><span class="material-icons-outlined">assessment</span> รายงานยอดขาย</a>
                <a href="#/forms" class="btn btn-outline"><span class="material-icons-outlined">print</span> พิมพ์เอกสาร</a>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-5); margin-top:var(--sp-4);">
            <div class="card">
                <div class="card-header"><h3>ใบงานล่าสุด</h3></div>
                <div class="card-body" id="recentJobs">
                    <div style="padding:var(--sp-4);text-align:center;color:var(--color-text-muted);">กำลังโหลด...</div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>สินค้าที่ต้องสั่งเพิ่ม</h3></div>
                <div class="card-body" id="lowStockList">
                    <div style="padding:var(--sp-4);text-align:center;color:var(--color-text-muted);">กำลังโหลด...</div>
                </div>
            </div>
        </div>
    `,e.querySelector("#btnRefreshDash").addEventListener("click",()=>ye(e,!0)),ye(e)}function st(e){const t=[];for(let n=e-1;n>=0;n--){const s=new Date;s.setDate(s.getDate()-n),t.push(s.toISOString().slice(0,10))}return t}async function ye(e,t=!1){const n="mungkhud_dash_cache";if(!t)try{const o=JSON.parse(sessionStorage.getItem(n));if(o&&Date.now()-o.ts<3e5){ge(e,o.data);return}}catch{}try{const o=Ze(),r=new Date().toISOString().slice(0,10),a=new Date,i=`${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,"0")}-01`,l=new Date(Date.now()-7*864e5).toISOString().slice(0,10),f=o?` && ${o}`:"",u=await w("jobs",{filter:`status='open'${f}`}),v=await w("jobs",{filter:`status='closed' && end_date >= '${r}'${f}`}),c=await w("jobs",{filter:`status='closed' && end_date >= '${i}'${f}`}),y=await w("jobs",{filter:`start_date >= '${l}'${f}`}),p=await w("customers"),b=await w("products"),d=await w("stock_ledgers"),_={};for(const x of d)_[x.product_id]=(_[x.product_id]||0)+(x.qty||0);const T={openCount:u.length,todayRev:v.reduce((x,q)=>x+(q.grand_total||0),0),monthRev:c.reduce((x,q)=>x+(q.grand_total||0),0),customerCount:p.length,stockMap:_,products:b,recentJobs:y,todayJobs:v,monthJobs:c,last7Start:l};try{sessionStorage.setItem(n,JSON.stringify({ts:Date.now(),data:T}))}catch{}ge(e,T)}catch(o){console.error("Dashboard load error:",o),e.querySelector("#statJobs").textContent="!"}}function ge(e,t){const{openCount:n,todayRev:s,monthRev:o,customerCount:r,stockMap:a,products:i,recentJobs:l,todayJobs:f,monthJobs:u,last7Start:v}=t;e.querySelector("#statJobs").textContent=n,e.querySelector("#statTodayRev").textContent=U(s),e.querySelector("#statRevenue").textContent=U(o),e.querySelector("#statCustomers").textContent=r;const c=i.filter(g=>{const h=a[g.id]||0,S=g.min_qty||5;return h<=S});e.querySelector("#statLowStock").textContent=c.length;const y=e.querySelector("#reorderAlert");if(y)if(c.length>0){y.style.display="block";const g=c.filter(S=>(a[S.id]||0)<=0).length,h=e.querySelector("#reorderMessage");h&&(h.textContent=`พบ ${c.length} รายการ (หมดสต็อก ${g} รายการ) — ควรสั่งซื้อเพิ่ม`),window.__lowStockNotified||(window.__lowStockNotified=!0,ot(c.map(S=>({name:S.name,qty:a[S.id]||0}))).catch(()=>{}))}else y.style.display="none";const p=st(7),b=p.map(g=>l.filter(h=>h.created&&h.created.split(" ")[0]===g).length),d=e.querySelector("#sparkJobs");d&&(d.innerHTML=V(b)+F(b));const _=[...f,...u.filter(g=>!f.find(h=>h.id===g.id))],T=p.map(g=>_.filter(h=>h.end_date&&h.end_date.split(" ")[0]===g).reduce((h,S)=>h+(S.grand_total||0),0)),x=e.querySelector("#sparkTodayRev");x&&(x.innerHTML=V(T)+F(T));let q=0;const ie=p.map(g=>(q+=_.filter(h=>h.end_date&&h.end_date.split(" ")[0]===g).reduce((h,S)=>h+(S.grand_total||0),0),q)),le=e.querySelector("#sparkRevenue");le&&(le.innerHTML=V(ie)+F(ie));const ce=[...l].sort((g,h)=>(h.start_date||"").localeCompare(g.start_date||"")).slice(0,8),de=e.querySelector("#recentJobs");ce.length===0?de.innerHTML='<div class="empty-state" style="padding:var(--sp-6);"><span class="material-icons-outlined" style="font-size:40px;">inbox</span><p class="text-sm">ยังไม่มีใบงาน</p></div>':de.innerHTML=me({columns:[{key:"job_no",label:"เลขใบงาน"},{key:"plate",label:"ทะเบียน"},{key:"customer_name",label:"ลูกค้า"},{key:"status",label:"สถานะ",render:g=>`<span class="badge badge-${g.status==="closed"?"closed":g.status==="cancelled"?"cancelled":"open"}">${g.status==="closed"?"ปิดงาน":g.status==="cancelled"?"ยกเลิก":"เปิด"}</span>`},{key:"grand_total",label:"ยอดรวม",render:g=>U(g.grand_total||0)}],items:ce});const ue=e.querySelector("#lowStockList");c.length===0?ue.innerHTML='<div class="empty-state" style="padding:var(--sp-6);"><span class="material-icons-outlined" style="font-size:40px;">check_circle</span><p class="text-sm">ไม่มีสินค้าใกล้หมด</p></div>':ue.innerHTML=me({columns:[{key:"code",label:"รหัส"},{key:"name",label:"ชื่อสินค้า"},{key:"qty",label:"คงเหลือ",render:g=>{const h=a[g.id]||0;return`<span style="color:${h<=0?"#ef4444":"#f59e0b"};font-weight:600;">${h}</span>`}},{key:"min_qty",label:"ขั้นต่ำ",render:g=>g.min_qty||5}],items:c.slice(0,10)})}const re=5,rt=6e4,Pe=3e5;let E=[],H=0;function ae(){return Date.now()<H?!0:(E=E.filter(e=>Date.now()-e<Pe),!1)}function Ce(){return E.push(Date.now()),E=E.filter(e=>Date.now()-e<Pe),E.length>=re?(H=Date.now()+rt,E=[],!0):!1}let qe="",k="";const Ie=[{id:"manager",label:"ผู้จัดการ / เจ้าของ",icon:"supervisor_account",color:"#C8A048"},{id:"mechanic",label:"ช่าง",icon:"engineering",color:"#16a34a"},{id:"admin",label:"Admin",icon:"admin_panel_settings",color:"#64748b"}];function at(e){var r,a,i,l,f,u,v,c,y,p,b;e.innerHTML=`
        <div class="login-overlay">
            <div class="login-card" style="max-width:400px;">
                <div class="login-logo">
                    <img src="/assets/mungkhud_logo.png" alt="MungkhudShop"
                         style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:var(--sp-3);"
                         onerror="this.style.display='none'">
                    <h1 style="color:var(--color-primary);font-family:var(--font-heading);font-size:1.6rem;margin:0;">MungkhudShop</h1>
                    <p style="color:var(--color-text-muted);font-size:0.85rem;margin-top:var(--sp-1);">เข้าสู่ระบบ</p>
                </div>

                <!-- ═══ USERNAME/PASSWORD FORM (Primary) ═══ -->
                <div id="loginForm" style="width:100%;">
                    <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-3);">
                        <div class="form-group">
                            <label for="loginUsername" style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:var(--sp-1);display:block;">
                                ชื่อผู้ใช้
                            </label>
                            <input type="text" id="loginUsername" placeholder="เช่น bank, chai, noi"
                                   autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false"
                                   style="width:100%;padding:14px 16px;font-size:16px;border:2px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);outline:none;transition:border-color 0.2s;box-sizing:border-box;">
                        </div>
                        <div class="form-group" style="position:relative;">
                            <label for="loginPassword" style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:var(--sp-1);display:block;">
                                รหัสผ่าน
                            </label>
                            <input type="password" id="loginPassword" placeholder="รหัสผ่าน"
                                   autocomplete="current-password"
                                   style="width:100%;padding:14px 48px 14px 16px;font-size:16px;border:2px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);outline:none;transition:border-color 0.2s;box-sizing:border-box;">
                            <button type="button" id="togglePassword" 
                                    style="position:absolute;right:12px;bottom:10px;background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:4px;">
                                <span class="material-icons-outlined" style="font-size:22px;">visibility_off</span>
                            </button>
                        </div>
                    </div>

                    <!-- Remember me -->
                    <label style="display:flex;align-items:center;gap:var(--sp-2);font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:var(--sp-4);cursor:pointer;">
                        <input type="checkbox" id="rememberMe" checked style="width:18px;height:18px;accent-color:var(--color-primary);">
                        จดจำฉัน
                    </label>

                    <!-- Login button -->
                    <button id="loginBtn" class="btn btn-primary"
                            style="width:100%;padding:16px;font-size:1rem;font-weight:600;min-height:56px;justify-content:center;border-radius:var(--radius-md);">
                        <span class="material-icons-outlined" style="font-size:20px;">login</span>
                        เข้าสู่ระบบ
                    </button>

                    <!-- Error -->
                    <div id="loginError" style="color:#ef4444;text-align:center;margin-top:var(--sp-3);display:none;font-size:0.9rem;"></div>

                    <!-- Divider -->
                    <div style="display:flex;align-items:center;gap:var(--sp-3);margin:var(--sp-5) 0;">
                        <hr style="flex:1;border:none;border-top:1px solid var(--color-border);">
                        <span style="font-size:0.8rem;color:var(--color-text-muted);">หรือ</span>
                        <hr style="flex:1;border:none;border-top:1px solid var(--color-border);">
                    </div>

                    <!-- PIN login link -->
                    <button id="switchToPin" class="btn btn-outline"
                            style="width:100%;justify-content:center;padding:12px;font-size:0.9rem;">
                        <span class="material-icons-outlined" style="font-size:18px;">pin</span>
                        เข้าด้วย PIN (สำหรับเครื่องกลาง)
                    </button>

                    <!-- Forgot password -->
                    <p id="forgotHint" style="text-align:center;margin-top:var(--sp-3);font-size:0.8rem;color:var(--color-text-muted);cursor:pointer;">
                        ลืมรหัสผ่าน?
                    </p>
                </div>

                <!-- ═══ PIN ENTRY (Secondary — hidden initially) ═══ -->
                <div id="pinSection" style="display:none;width:100%;">
                    <!-- Role selection -->
                    <div id="roleSelection" style="display:flex;flex-direction:column;gap:var(--sp-3);">
                        <p style="text-align:center;font-size:0.9rem;color:var(--color-text-secondary);margin-bottom:var(--sp-2);">เลือกประเภทผู้ใช้</p>
                        ${Ie.map(d=>`
                            <button class="btn btn-outline role-select-btn" data-role="${d.id}"
                                    style="width:100%;padding:var(--sp-4);justify-content:flex-start;gap:var(--sp-3);font-size:1rem;min-height:56px;">
                                <span class="material-icons-outlined" style="color:${d.color};font-size:28px;">${d.icon}</span>
                                <span>${d.label}</span>
                            </button>
                        `).join("")}
                        <button id="switchToUsername" class="btn btn-outline" 
                                style="width:100%;justify-content:center;margin-top:var(--sp-2);padding:12px;font-size:0.9rem;">
                            <span class="material-icons-outlined" style="font-size:18px;">arrow_back</span>
                            กลับไปล็อกอินด้วยรหัสผ่าน
                        </button>
                    </div>

                    <!-- PIN pad -->
                    <div id="pinEntry" style="display:none;width:100%;text-align:center;">
                        <div id="pinRoleIcon" style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--sp-3);background:var(--color-surface-alt);">
                            <span class="material-icons-outlined" style="font-size:28px;" id="pinRoleIconInner"></span>
                        </div>
                        <p id="pinInstruction" style="color:var(--color-text-secondary);font-size:0.9rem;margin-bottom:var(--sp-4);"></p>
                        
                        <!-- PIN Dots -->
                        <div style="display:flex;justify-content:center;gap:12px;margin-bottom:var(--sp-5);">
                            ${[0,1,2,3,4,5].map(d=>`
                                <div class="pin-dot" data-index="${d}" 
                                     style="width:16px;height:16px;border-radius:50%;border:2px solid var(--color-border);transition:all 0.15s;"></div>
                            `).join("")}
                        </div>

                        <!-- Number Pad -->
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-2);max-width:280px;margin:0 auto;">
                            ${[1,2,3,4,5,6,7,8,9].map(d=>`
                                <button class="btn btn-outline pin-key" data-key="${d}" 
                                        style="font-size:1.4rem;padding:var(--sp-3);min-height:56px;justify-content:center;font-weight:600;touch-action:manipulation;">
                                    ${d}
                                </button>
                            `).join("")}
                            <button class="btn btn-outline pin-key" id="pinBackBtn"
                                    style="font-size:1rem;padding:var(--sp-3);min-height:56px;justify-content:center;touch-action:manipulation;">
                                <span class="material-icons-outlined">backspace</span>
                            </button>
                            <button class="btn btn-outline pin-key" data-key="0" 
                                    style="font-size:1.4rem;padding:var(--sp-3);min-height:56px;justify-content:center;font-weight:600;touch-action:manipulation;">
                                0
                            </button>
                            <button class="btn btn-primary pin-key" id="pinOkBtn"
                                    style="font-size:1rem;padding:var(--sp-3);min-height:56px;justify-content:center;touch-action:manipulation;">
                                OK
                            </button>
                        </div>

                        <div id="pinError" style="color:#ef4444;text-align:center;margin-top:var(--sp-3);display:none;font-size:0.9rem;"></div>

                        <button id="pinBackToRoles" class="btn btn-outline" 
                                style="margin-top:var(--sp-4);width:100%;justify-content:center;">
                            <span class="material-icons-outlined">arrow_back</span> เลือกประเภทอื่น
                        </button>
                    </div>
                </div>

                <!-- ═══ FORCE CHANGE PASSWORD (Task 1.10) ═══ -->
                <div id="changePasswordSection" style="display:none;width:100%;">
                    <div style="text-align:center;margin-bottom:var(--sp-4);">
                        <span class="material-icons-outlined" style="font-size:48px;color:var(--color-primary);">lock_reset</span>
                        <h2 style="font-size:1.2rem;color:var(--color-text);margin:var(--sp-2) 0;">กรุณาตั้งรหัสผ่านใหม่</h2>
                        <p style="font-size:0.85rem;color:var(--color-text-muted);">รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร</p>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
                        <div class="form-group" style="position:relative;">
                            <label style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:var(--sp-1);display:block;">รหัสผ่านใหม่</label>
                            <input type="password" id="newPassword" placeholder="อย่างน้อย 4 ตัวอักษร"
                                   style="width:100%;padding:14px 16px;font-size:16px;border:2px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);outline:none;box-sizing:border-box;">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:var(--sp-1);display:block;">ยืนยันรหัสผ่าน</label>
                            <input type="password" id="confirmPassword" placeholder="กรอกรหัสผ่านอีกครั้ง"
                                   style="width:100%;padding:14px 16px;font-size:16px;border:2px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);outline:none;box-sizing:border-box;">
                        </div>
                        <button id="changePasswordBtn" class="btn btn-primary"
                                style="width:100%;padding:16px;font-size:1rem;font-weight:600;min-height:56px;justify-content:center;border-radius:var(--radius-md);">
                            ตั้งรหัสผ่าน
                        </button>
                        <div id="changePasswordError" style="color:#ef4444;text-align:center;display:none;font-size:0.9rem;"></div>
                    </div>
                </div>
            </div>
        </div>
    `,setTimeout(()=>{var d;return(d=e.querySelector("#loginUsername"))==null?void 0:d.focus()},100);const t=e.querySelector("#togglePassword"),n=e.querySelector("#loginPassword");t==null||t.addEventListener("click",()=>{const d=n.type==="password";n.type=d?"text":"password",t.querySelector(".material-icons-outlined").textContent=d?"visibility":"visibility_off"}),(r=e.querySelector("#loginBtn"))==null||r.addEventListener("click",()=>he(e)),(a=e.querySelector("#loginUsername"))==null||a.addEventListener("keydown",d=>{var _;d.key==="Enter"&&((_=e.querySelector("#loginPassword"))==null||_.focus())}),(i=e.querySelector("#loginPassword"))==null||i.addEventListener("keydown",d=>{d.key==="Enter"&&he(e)}),e.querySelectorAll('#loginForm input[type="text"], #loginForm input[type="password"]').forEach(d=>{d.addEventListener("focus",()=>{d.style.borderColor="var(--color-primary)"}),d.addEventListener("blur",()=>{d.style.borderColor="var(--color-border)"})}),(l=e.querySelector("#switchToPin"))==null||l.addEventListener("click",()=>{e.querySelector("#loginForm").style.display="none",e.querySelector("#pinSection").style.display=""}),(f=e.querySelector("#switchToUsername"))==null||f.addEventListener("click",()=>{e.querySelector("#loginForm").style.display="",e.querySelector("#pinSection").style.display="none"}),(u=e.querySelector("#forgotHint"))==null||u.addEventListener("click",()=>{e.querySelector("#forgotHint").innerHTML='<span style="color:var(--color-primary);">📞 ติดต่อผู้จัดการเพื่อรีเซ็ตรหัสผ่าน</span>'}),e.querySelectorAll(".role-select-btn").forEach(d=>{d.addEventListener("click",()=>it(e,d.dataset.role))}),e.querySelectorAll(".pin-key[data-key]").forEach(d=>{d.addEventListener("click",()=>be(e,d.dataset.key))}),(v=e.querySelector("#pinBackBtn"))==null||v.addEventListener("click",()=>we(e)),(c=e.querySelector("#pinOkBtn"))==null||c.addEventListener("click",()=>Y(e)),(y=e.querySelector("#pinBackToRoles"))==null||y.addEventListener("click",()=>{e.querySelector("#roleSelection").style.display="",e.querySelector("#pinEntry").style.display="none",k=""}),(p=e.querySelector("#changePasswordBtn"))==null||p.addEventListener("click",()=>ve(e)),(b=e.querySelector("#confirmPassword"))==null||b.addEventListener("keydown",d=>{d.key==="Enter"&&ve(e)});const s=new AbortController;document.addEventListener("keydown",d=>{var T;const _=e.querySelector("#pinEntry");!_||_.style.display==="none"||(d.key>="0"&&d.key<="9"?be(e,d.key):d.key==="Backspace"?we(e):d.key==="Enter"?Y(e):d.key==="Escape"&&((T=e.querySelector("#pinBackToRoles"))==null||T.click()))},{signal:s.signal});const o=new MutationObserver(()=>{document.body.contains(e)||(s.abort(),o.disconnect())});o.observe(document.body,{childList:!0,subtree:!0})}async function he(e){var a,i,l,f,u,v;const t=(l=(i=(a=e.querySelector("#loginUsername"))==null?void 0:a.value)==null?void 0:i.trim())==null?void 0:l.toLowerCase(),n=(f=e.querySelector("#loginPassword"))==null?void 0:f.value,s=(u=e.querySelector("#rememberMe"))==null?void 0:u.checked,o=e.querySelector("#loginError"),r=e.querySelector("#loginBtn");if(!t||!n){o.textContent="กรุณากรอก username และรหัสผ่าน",o.style.display="block";return}if(ae()){const c=Math.ceil((H-Date.now())/1e3);o.textContent=`ลองผิดพลาดมากเกินไป กรุณารอ ${c} วินาที`,o.style.display="block";return}r.disabled=!0,r.innerHTML='<span class="material-icons-outlined" style="font-size:20px;animation:spin 1s linear infinite;">sync</span> กำลังเข้าสู่ระบบ...',o.style.display="none";try{const c=await Qe(t,n,s);if(c.must_change_password){e.querySelector("#loginForm").style.display="none",e.querySelector("#changePasswordSection").style.display="",(v=e.querySelector("#newPassword"))==null||v.focus(),r.disabled=!1,r.innerHTML='<span class="material-icons-outlined" style="font-size:20px;">login</span> เข้าสู่ระบบ';return}X(`ยินดีต้อนรับ ${c.display_name}`,"success"),window.location.hash="#/dashboard",window.location.reload()}catch(c){if(Ce())o.textContent="ลองผิดพลาดมากเกินไป — ระบบถูกล็อค 1 นาที";else{const p=re-E.length;o.textContent=`${c.message} (เหลืออีก ${p} ครั้ง)`}o.style.display="block",r.disabled=!1,r.innerHTML='<span class="material-icons-outlined" style="font-size:20px;">login</span> เข้าสู่ระบบ'}}async function ve(e){var r,a;const t=(r=e.querySelector("#newPassword"))==null?void 0:r.value,n=(a=e.querySelector("#confirmPassword"))==null?void 0:a.value,s=e.querySelector("#changePasswordError"),o=e.querySelector("#changePasswordBtn");if(!t||t.length<4){s.textContent="รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร",s.style.display="block";return}if(t!==n){s.textContent="รหัสผ่านไม่ตรงกัน",s.style.display="block";return}o.disabled=!0,o.textContent="กำลังบันทึก...",s.style.display="none";try{await Je("",t),X("ตั้งรหัสผ่านใหม่สำเร็จ!","success"),window.location.hash="#/dashboard",window.location.reload()}catch(i){s.textContent=i.message||"เกิดข้อผิดพลาด",s.style.display="block",o.disabled=!1,o.textContent="ตั้งรหัสผ่าน"}}function it(e,t){qe=t,k="";const n=Ie.find(r=>r.id===t),s=e.querySelector("#pinRoleIcon"),o=e.querySelector("#pinRoleIconInner");s.style.color=n.color,o.textContent=n.icon,e.querySelector("#pinInstruction").textContent=`ใส่ PIN ${n.label}`,M(e),e.querySelector("#pinError").style.display="none",e.querySelector("#roleSelection").style.display="none",e.querySelector("#pinEntry").style.display=""}function be(e,t){ae()||k.length<6&&(k+=t,M(e),e.querySelector("#pinError").style.display="none",k.length===6&&Y(e))}function we(e){k=k.slice(0,-1),M(e),e.querySelector("#pinError").style.display="none"}function M(e){e.querySelectorAll(".pin-dot").forEach((t,n)=>{n<k.length?(t.style.background="var(--color-primary)",t.style.borderColor="var(--color-primary)",t.style.transform="scale(1.2)"):(t.style.background="transparent",t.style.borderColor="var(--color-border)",t.style.transform="scale(1)")})}async function Y(e){var o;if(k.length<4)return;const t=e.querySelector("#pinError"),n=e.querySelector("#pinOkBtn");if(ae()){const r=Math.ceil((H-Date.now())/1e3);t.textContent=`กรุณารอ ${r} วินาที`,t.style.display="block",k="",M(e);return}n.disabled=!0,n.textContent="...";const s=await Xe(k,qe);if(s){if(s.must_change_password){e.querySelector("#pinSection").style.display="none",e.querySelector("#changePasswordSection").style.display="",(o=e.querySelector("#newPassword"))==null||o.focus(),n.disabled=!1,n.textContent="OK";return}X(`ยินดีต้อนรับ ${s.display_name}`,"success"),window.location.hash="#/dashboard",window.location.reload()}else{if(Ce())t.textContent="ระบบถูกล็อค 1 นาที";else{const a=re-E.length;t.textContent=`PIN ไม่ถูกต้อง (เหลืออีก ${a} ครั้ง)`}t.style.display="block",k="",M(e),n.disabled=!1,n.textContent="OK"}}const lt={"#/dashboard":{title:"แดชบอร์ด",steps:["แดชบอร์ดแสดงภาพรวมการทำงานของร้าน","ดูยอดขายทั้งหมด จำนวนใบงาน และสถานะต่างๆ","ข้อมูลจะอัปเดตอัตโนมัติเมื่อมีการบันทึกข้อมูลใหม่"]},"#/job":{title:"ใบงาน (Job Order)",steps:['คลิก "ค้นหา" เพื่อดูรายการใบงานทั้งหมด','คลิก "เพิ่ม/แก้ไข" เพื่อสร้างใบงานใหม่',"กรอกข้อมูลรถ: ทะเบียนรถ, รุ่น, เลขไมล์","กรอกข้อมูลลูกค้า: ชื่อ, เบอร์โทร",'เพิ่มรายการบริการ/สินค้า โดยกดปุ่ม "เพิ่มรายการ"',"ระบบจะคำนวณยอดรวม VAT 7% ให้อัตโนมัติ","กดบันทึกเพื่อบันทึกใบงาน","กดปิดงานเมื่องานเสร็จ หรือยกเลิกได้ถ้าต้องการ"]},"#/quotation":{title:"ใบเสนอราคา (Quotation)",steps:['ค้นหาใบเสนอราคาที่มีอยู่ในแท็บ "ค้นหา"','สร้างใบเสนอราคาใหม่ในแท็บ "เพิ่ม/แก้ไข"',"กรอกเลขเอกสาร วันที่ อ้างอิง","เพิ่มรายการสินค้า/บริการ","กดบันทึกเมื่อเสร็จ"]},"#/invoice":{title:"ใบแจ้งหนี้ (Invoice)",steps:["ใช้สำหรับออกใบแจ้งหนี้/ใบกำกับภาษี",'สร้างเอกสารใหม่ในแท็บ "เพิ่ม/แก้ไข"',"กรอกข้อมูลเอกสาร: เลขเอกสาร วันที่ อ้างอิง","เพิ่มรายการสินค้า แล้วกดบันทึก"]},"#/receipt":{title:"ใบเสร็จรับเงิน (Receipt)",steps:["ใช้สำหรับออกใบเสร็จรับเงิน",'สร้างเอกสารใหม่ในแท็บ "เพิ่ม/แก้ไข"',"กรอกข้อมูลเช่นเดียวกับใบแจ้งหนี้","ระบบจะคำนวณ VAT อัตโนมัติ"]},"#/credit-note":{title:"ใบลดหนี้ (Credit Note)",steps:["ใช้เมื่อต้องการลดหนี้หรือคืนเงินลูกค้า",'อ้างอิงเลขใบแจ้งหนี้เดิมในช่อง "อ้างอิงเอกสาร"',"ระบุจำนวนเงินที่ต้องการลดหนี้"]},"#/stock-list":{title:"รายการสินค้าคงคลัง",steps:["ดูรายการสินค้าและจำนวนคงเหลือทั้งหมด","ค้นหาสินค้าจากชื่อ รหัส หรือหมวดหมู่","จำนวนจะปรับอัตโนมัติเมื่อมีการเบิก/รับ/โอนย้าย"]},"#/requisition":{title:"ใบเบิกสินค้า (Requisition)",steps:["ใช้สำหรับเบิกสินค้าออกจากคลัง",'สร้างใบเบิกใหม่ในแท็บ "เพิ่ม/แก้ไข"',"ระบุสินค้า จำนวน และเหตุผลการเบิก","สินค้าจะถูกหักออกจากคลังอัตโนมัติ"]},"#/stock-return":{title:"ใบคืนสินค้า (Return)",steps:["ใช้สำหรับคืนสินค้ากลับเข้าคลัง","ระบุสินค้า จำนวนที่คืน","สินค้าจะถูกเพิ่มเข้าคลังอัตโนมัติ"]},"#/stock-transfer":{title:"ใบโอนย้ายสินค้า (Transfer)",steps:["ใช้สำหรับโอนย้ายสินค้าระหว่างคลัง","ระบุคลังต้นทาง คลังปลายทาง","ระบุสินค้าและจำนวนที่ต้องการโอนย้าย"]},"#/stock-adjust":{title:"ปรับปรุงสินค้า (Adjustment)",steps:["ใช้สำหรับปรับปรุงจำนวนสินค้าในคลัง","ระบุเหตุผลการปรับปรุง เช่น สินค้าเสื่อม, ตรวจนับ","สามารถปรับเพิ่มหรือลดได้"]},"#/goods-receipt":{title:"ใบรับสินค้า (Goods Receipt)",steps:["ใช้สำหรับบันทึกการรับสินค้าจากผู้ขาย","อ้างอิงใบสั่งซื้อ (PO) ถ้ามี","ตรวจสอบจำนวนและคุณภาพก่อนรับเข้าคลัง"]},"#/purchase-invoice":{title:"ใบแจ้งหนี้ซื้อ (Purchase Invoice)",steps:["ใช้สำหรับบันทึกใบแจ้งหนี้จากผู้ขาย",'ดูรายการทั้งหมดในแท็บ "ค้นหา"','สร้างรายการใหม่ในแท็บ "เพิ่ม/แก้ไข"']},"#/purchase-cn":{title:"ใบลดหนี้ซื้อ (Purchase CN)",steps:["ใช้เมื่อได้รับส่วนลดหรือคืนสินค้าให้ผู้ขาย","อ้างอิงใบแจ้งหนี้ซื้อเดิม"]},"#/payment":{title:"การชำระเงิน (Payment)",steps:["บันทึกการชำระเงินให้ผู้ขาย","ระบุจำนวน วิธีชำระเงิน และอ้างอิงเอกสาร"]},"#/withholding-tax":{title:"ภาษีหัก ณ ที่จ่าย (Withholding Tax)",steps:["บันทึกข้อมูลภาษีหัก ณ ที่จ่าย","ระบุผู้ขาย ยอดเงิน อัตราภาษี","ใช้สำหรับการยื่นแบบภาษี"]},"#/master-company":{title:"ข้อมูลบริษัท",steps:["จัดการข้อมูลบริษัท/สาขาในระบบ","กรอก รหัส ชื่อ เลขประจำตัวผู้เสียภาษี ที่อยู่","กดบันทึกเพื่อเพิ่มหรืออัปเดต"]},"#/master-customer":{title:"ข้อมูลลูกค้า",steps:["จัดการข้อมูลลูกค้าในระบบ","เพิ่มลูกค้าใหม่ หรือแก้ไข/ลบลูกค้าเดิม","สามารถค้นหาด้วยชื่อ รหัส หรือเบอร์โทร"]},"#/master-vehicle":{title:"ข้อมูลรถ",steps:["จัดการข้อมูลรถในระบบ","กรอก ทะเบียน ยี่ห้อ รุ่น ปี สี เลขไมล์","เชื่อมโยงกับลูกค้าเจ้าของรถ"]},"#/master-product":{title:"ข้อมูลสินค้า/บริการ",steps:["จัดการรายการสินค้าและบริการ","กรอก รหัส ชื่อ ประเภท ราคาขาย ต้นทุน","ระบุหน่วยนับและบาร์โค้ด (ถ้ามี)"]},"#/master-vendor":{title:"ข้อมูลผู้จำหน่าย",steps:["จัดการข้อมูลผู้จำหน่าย/ซัพพลายเออร์","กรอก รหัส ชื่อ ผู้ติดต่อ เบอร์โทร อีเมล"]},"#/master-lookup":{title:"ข้อมูลอ้างอิง (Lookup)",steps:["จัดการข้อมูลอ้างอิงระบบ เช่น จังหวัด ธนาคาร","เพิ่ม แก้ไข หรือปิดการใช้งานข้อมูลอ้างอิง"]},"#/report-sales":{title:"รายงานการขาย",steps:["ดูรายงานยอดขายตามช่วงเวลา","วิเคราะห์ผลการดำเนินงานร้าน","ข้อมูลจะดึงจากใบงานที่ปิดแล้วโดยอัตโนมัติ"]},"#/report-inventory":{title:"รายงานคลังสินค้า",steps:["ดูมูลค่าสินค้าคงเหลือ","ตรวจสอบสินค้าที่เคลื่อนไหวช้า","วิเคราะห์ต้นทุนคงคลัง"]},"#/report-finance":{title:"รายงานการเงิน",steps:["สรุปรายรับ-รายจ่ายตามช่วงเวลา","ดูกำไรขาดทุน","วิเคราะห์สถานการณ์ทางการเงินของร้าน"]},"#/forms":{title:"แบบฟอร์ม",steps:["เลือกแบบฟอร์มที่ต้องการพิมพ์","กรอกข้อมูลหรือเลือกเอกสารที่ต้องการ","กดพิมพ์เพื่อสร้างเอกสาร PDF"]},"#/settings":{title:"ตั้งค่าระบบ",steps:["ตั้งค่าข้อมูลร้าน: ชื่อ ที่อยู่ เบอร์โทร","ตั้งค่ารูปแบบเลขเอกสาร","เชื่อมต่อ PocketBase","จัดการข้อมูลสาขา"]}};function ct(e){const t=lt[e];if(!t)return;const n=document.querySelector(".help-modal-overlay");n&&n.remove();const s=document.createElement("div");s.className="help-modal-overlay",s.innerHTML=`
        <div class="help-modal">
            <div class="help-modal-header">
                <span class="material-icons-outlined" style="color:var(--color-gold);margin-right:var(--sp-2);">help_outline</span>
                <h3>วิธีใช้: ${t.title}</h3>
                <button class="help-modal-close" aria-label="ปิด">
                    <span class="material-icons-outlined">close</span>
                </button>
            </div>
            <div class="help-modal-body">
                <ol class="help-steps">
                    ${t.steps.map(o=>`<li>${o}</li>`).join("")}
                </ol>
            </div>
            <div class="help-modal-footer">
                <button class="btn btn-primary help-modal-ok">เข้าใจแล้ว</button>
            </div>
        </div>
    `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("visible")),s.querySelector(".help-modal-close").addEventListener("click",()=>J(s)),s.querySelector(".help-modal-ok").addEventListener("click",()=>J(s)),s.addEventListener("click",o=>{o.target===s&&J(s)})}function J(e){e.classList.remove("visible"),setTimeout(()=>e.remove(),300)}const Ae="2.3.0",dt=[{version:"2.3.0",date:"2026-03-13",title:"Sprint 3 — Kanban, Telegram, Analytics",items:["📋 Kanban Board — ลาก-วางเปลี่ยนสถานะใบงาน","💬 Telegram Bot — แจ้งเตือนสรุปรายวัน ปิดงาน สินค้าใกล้หมด","📊 Dashboard Sparklines — กราฟแนวโน้ม 7 วันย้อนหลัง","🧾 PDF Invoice — ออกใบกำกับภาษีภาษาไทย","📤 Excel Export — ส่งออกรายงาน .xlsx","👷 Employee Check-in — ลงเวลาเข้า-ออก","📈 Branch Comparison — เปรียบเทียบยอดรายสาขา"]},{version:"2.2.0",date:"2026-03-12",title:"Sprint 2 — Security & UX",items:["🔐 PIN Login รวมฐานข้อมูลเดียวกัน","🏠 ปุ่มกลับหน้าหลัก Management","🌙 Dark Mode — สลับธีมมืด/สว่าง","👷 สิทธิ์พนักงาน — ซ่อนเมนูรายงานและตั้งค่า","🔒 Branch Lock — พนักงานเห็นเฉพาะสาขาตัวเอง","⏱ Session Timeout — ออกจากระบบอัตโนมัติ 30 นาที","🚨 Low-Stock Alert — แจ้งเตือนเมื่อสินค้าใกล้หมด"]},{version:"2.1.0",date:"2026-03-11",title:"Sprint 1 — Foundation",items:["📱 Mobile Responsive — ใช้งานบนมือถือได้","🦴 Skeleton Loading — แสดงตัวแทนขณะโหลด","⚠️ Error Boundary — หน้าผิดพลาดภาษาไทย","🧪 Playwright Tests — ทดสอบอัตโนมัติ 10 รายการ"]}];function ut(){localStorage.getItem("mungkhud_changelog_version")!==Ae&&pt()}function pt(){var s;(s=document.getElementById("changelogModal"))==null||s.remove();const e=dt.map(o=>`
        <div style="margin-bottom:var(--sp-4);">
            <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
                <span style="background:var(--color-primary);color:white;padding:2px 8px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:600;">v${o.version}</span>
                <span style="color:var(--color-text-muted);font-size:0.8rem;">${o.date}</span>
            </div>
            <h4 style="margin:0 0 var(--sp-2) 0;font-size:0.95rem;">${o.title}</h4>
            <ul style="margin:0;padding-left:var(--sp-4);line-height:1.8;">
                ${o.items.map(r=>`<li style="font-size:0.85rem;">${r}</li>`).join("")}
            </ul>
        </div>
    `).join('<hr style="border:none;border-top:1px solid var(--color-border);margin:var(--sp-3) 0;">'),t=document.createElement("div");t.id="changelogModal",t.innerHTML=`
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:var(--sp-4);">
            <div style="background:var(--color-surface);border-radius:var(--radius-lg);max-width:520px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);">
                <div style="padding:var(--sp-4) var(--sp-5);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;">
                    <h2 style="margin:0;font-size:1.1rem;">🆕 มีอะไรใหม่</h2>
                    <button id="changelogClose" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--color-text-muted);">✕</button>
                </div>
                <div style="padding:var(--sp-4) var(--sp-5);overflow-y:auto;flex:1;">
                    ${e}
                </div>
                <div style="padding:var(--sp-3) var(--sp-5);border-top:1px solid var(--color-border);text-align:right;">
                    <button id="changelogDismiss" class="btn btn-primary btn-sm">เข้าใจแล้ว</button>
                </div>
            </div>
        </div>
    `,document.body.appendChild(t);const n=()=>{localStorage.setItem("mungkhud_changelog_version",Ae),t.remove()};t.querySelector("#changelogClose").addEventListener("click",n),t.querySelector("#changelogDismiss").addEventListener("click",n),t.querySelector("div").addEventListener("click",o=>{o.target===t.querySelector("div")&&n()})}const mt={dashboard:$e,job:()=>m(()=>import("./job-BAQPdb7v.js"),__vite__mapDeps([0,1]),import.meta.url).then(e=>e.initJobPage),quotation:()=>m(()=>import("./quotation-32l1rX0y.js"),__vite__mapDeps([2,3,1]),import.meta.url).then(e=>e.initQuotationPage),invoice:()=>m(()=>import("./invoice-CtNcYpiq.js"),__vite__mapDeps([4,3,1]),import.meta.url).then(e=>e.initInvoicePage),receipt:()=>m(()=>import("./receipt-bqBxWlDa.js"),__vite__mapDeps([5,3,1]),import.meta.url).then(e=>e.initReceiptPage),"credit-note":()=>m(()=>import("./credit-note-CZRls2rU.js"),__vite__mapDeps([6,3,1]),import.meta.url).then(e=>e.initCreditNotePage),"stock-list":()=>m(()=>import("./stock-list-ZVZC8gMr.js"),[],import.meta.url).then(e=>e.initStockListPage),requisition:()=>m(()=>import("./requisition-BOksLb2t.js"),__vite__mapDeps([7,3,1]),import.meta.url).then(e=>e.initRequisitionPage),"stock-return":()=>m(()=>import("./stock-return-DHeN5Bny.js"),__vite__mapDeps([8,3,1]),import.meta.url).then(e=>e.initStockReturnPage),"stock-transfer":()=>m(()=>import("./stock-transfer-BIc-NQoR.js"),__vite__mapDeps([9,3,1]),import.meta.url).then(e=>e.initStockTransferPage),"stock-adjust":()=>m(()=>import("./stock-adjust-CMEFR0bC.js"),__vite__mapDeps([10,3,1]),import.meta.url).then(e=>e.initStockAdjustPage),"goods-receipt":()=>m(()=>import("./goods-receipt-8cHmy-5l.js"),__vite__mapDeps([11,3,1]),import.meta.url).then(e=>e.initGoodsReceiptPage),"purchase-invoice":()=>m(()=>import("./purchase-invoice-BsVcPFXQ.js"),__vite__mapDeps([12,3,1]),import.meta.url).then(e=>e.initPurchaseInvoicePage),"purchase-cn":()=>m(()=>import("./purchase-cn-D1nUAZkJ.js"),__vite__mapDeps([13,3,1]),import.meta.url).then(e=>e.initPurchaseCNPage),payment:()=>m(()=>import("./payment-B21xqqRw.js"),__vite__mapDeps([14,3,1]),import.meta.url).then(e=>e.initPaymentPage),"withholding-tax":()=>m(()=>import("./withholding-tax-DPn3eIw_.js"),__vite__mapDeps([15,3,1]),import.meta.url).then(e=>e.initWithholdingTaxPage),"master-company":()=>m(()=>import("./master-company-C2c0-aAW.js"),__vite__mapDeps([16,17]),import.meta.url).then(e=>e.initMasterCompanyPage),"master-customer":()=>m(()=>import("./master-customer-B5lbJ3Fn.js"),__vite__mapDeps([18,17]),import.meta.url).then(e=>e.initMasterCustomerPage),"master-vehicle":()=>m(()=>import("./master-vehicle-C_1A4RS-.js"),__vite__mapDeps([19,17]),import.meta.url).then(e=>e.initMasterVehiclePage),"master-product":()=>m(()=>import("./master-product-DkNKUOae.js"),__vite__mapDeps([20,17]),import.meta.url).then(e=>e.initMasterProductPage),"master-brand":()=>m(()=>import("./master-brand-CTioWF-r.js"),__vite__mapDeps([21,17]),import.meta.url).then(e=>e.initMasterBrandPage),"master-group":()=>m(()=>import("./master-group-myO0_FVx.js"),__vite__mapDeps([22,17]),import.meta.url).then(e=>e.initMasterGroupPage),"master-vendor":()=>m(()=>import("./master-vendor-BdRDI_yq.js"),__vite__mapDeps([23,17]),import.meta.url).then(e=>e.initMasterVendorPage),"master-lookup":()=>m(()=>import("./master-lookup-CUYMflXt.js"),[],import.meta.url).then(e=>e.initMasterLookupPage),"report-sales":()=>m(()=>import("./report-sales-bDgHX6SZ.js"),__vite__mapDeps([24,25]),import.meta.url).then(e=>e.initReportSalesPage),"report-inventory":()=>m(()=>import("./report-inventory-DYDkRtoD.js"),__vite__mapDeps([26,25]),import.meta.url).then(e=>e.initReportInventoryPage),"report-finance":()=>m(()=>import("./report-finance-B8hwHgmA.js"),__vite__mapDeps([27,25]),import.meta.url).then(e=>e.initReportFinancePage),forms:()=>m(()=>import("./forms-Buy_ViU_.js"),[],import.meta.url).then(e=>e.initFormsPage),settings:()=>m(()=>import("./settings-BY4yRFpo.js"),[],import.meta.url).then(e=>e.initSettingsPage),"user-permissions":()=>m(()=>import("./user-permissions-Dq1OAzUl.js"),[],import.meta.url).then(e=>e.initUserPermissionsPage),"master-branch":()=>m(()=>import("./master-branch-CAW_nRoc.js"),[],import.meta.url).then(e=>e.initBranchPage),kanban:()=>m(()=>import("./kanban-BNFGSdCo.js"),__vite__mapDeps([28,1,29]),import.meta.url).then(e=>e.initKanbanPage)},ft="dashboard";function j(){return window.location.hash.replace("#/","").split("?")[0]||ft}async function Q(e){const t=L();if(e==="login"){yt();const l=document.getElementById("pageContent");l.innerHTML="",at(l);return}if(!t){window.location.hash="#/login";return}if(t.role&&["employee","employee_main","employee_sup","sa"].includes(t.role)&&isEmployeeRestricted(e)){K();const l=document.getElementById("pageContent");l.innerHTML=`
            <div class="empty-state">
                <span class="material-icons-outlined" style="font-size:48px;color:#ef4444;">lock</span>
                <h2>ไม่มีสิทธิ์เข้าถึง</h2>
                <p>บัญชีของคุณ (${G(t.role)}) ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                <a href="#/dashboard" class="btn btn-primary" style="margin-top:var(--sp-4);">กลับหน้าหลัก</a>
            </div>`;return}const s=`#/${e}`;if(!Te(s)){K();const l=document.getElementById("pageContent");l.innerHTML=`
            <div class="empty-state">
                <span class="material-icons-outlined" style="font-size:48px;color:#ef4444;">lock</span>
                <h2>ไม่มีสิทธิ์เข้าถึง</h2>
                <p>บัญชีของคุณ (${G(t.role)}) ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                <a href="#/dashboard" class="btn btn-primary" style="margin-top:var(--sp-4);">กลับหน้าหลัก</a>
            </div>`;return}K(),gt(t);const o=document.getElementById("pageContent");document.querySelectorAll(".nav-item").forEach(l=>{l.classList.toggle("active",l.dataset.route===e)}),o.classList.remove("page-enter"),o.innerHTML="",o.offsetWidth,o.classList.add("page-enter");const a=mt[e];if(a)try{let l=a;typeof a=="function"&&a.length===0&&a!==$e&&(o.innerHTML=`
                    <div style="padding:var(--sp-6);">
                        <div class="skeleton skeleton-text" style="width:40%;height:24px;margin-bottom:16px;"></div>
                        <div class="skeleton skeleton-text" style="width:100%;height:16px;margin-bottom:8px;"></div>
                        <div class="skeleton skeleton-text" style="width:80%;height:16px;margin-bottom:8px;"></div>
                        <div class="skeleton skeleton-card" style="margin-top:16px;"></div>
                    </div>`,l=await a()),o.innerHTML="",l(o)}catch(l){console.error(`[ErrorBoundary] Page "${e}" crashed:`,l),o.innerHTML=`
                <div class="error-boundary">
                    <span class="material-icons-outlined error-icon">error_outline</span>
                    <h2>เกิดข้อผิดพลาด</h2>
                    <p>ไม่สามารถโหลดหน้านี้ได้ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลระบบ</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        <span class="material-icons-outlined">refresh</span> ลองอีกครั้ง
                    </button>
                </div>`}else o.innerHTML=`
            <div class="empty-state">
                <span class="material-icons-outlined">construction</span>
                <h2>หน้านี้กำลังพัฒนา</h2>
                <p>กรุณากลับมาใหม่ภายหลัง</p>
            </div>`;const i=document.getElementById("helpBtn");i&&(i.dataset.route=s)}function yt(){var n;const e=document.getElementById("sidebar"),t=document.querySelector(".topnav");e&&(e.style.display="none"),t&&(t.style.display="none"),(n=document.querySelector(".main-content"))==null||n.classList.add("login-mode")}function K(){var n;const e=document.getElementById("sidebar"),t=document.querySelector(".topnav");e&&(e.style.display=""),t&&(t.style.display=""),(n=document.querySelector(".main-content"))==null||n.classList.remove("login-mode")}function gt(e){const t=document.querySelector(".user-name"),n=document.querySelector(".user-role");t&&(t.textContent=e.display_name),n&&(n.textContent=G(e.role))}function ht(){const e=L();if(!e)return;const t=e.role||"";document.querySelectorAll(".nav-group[data-access]").forEach(s=>{const r=(s.dataset.access||"").split(",").map(a=>a.trim()).some(a=>a==="admin"?t==="admin":a==="owner"?t==="owner":a==="manager"?t==="manager"||t==="owner":t===a);s.style.display=r?"":"none"}),e.allowed_menus!=="*"&&document.querySelectorAll(".nav-item[data-route]").forEach(o=>{const r=`#/${o.dataset.route}`;Te(r)?o.style.display="":o.style.display="none"})}function vt(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebarToggle");localStorage.getItem("gs_sidebar")==="collapsed"&&e.classList.add("collapsed"),t==null||t.addEventListener("click",()=>{e.classList.toggle("collapsed"),localStorage.setItem("gs_sidebar",e.classList.contains("collapsed")?"collapsed":"expanded")})}function bt(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebarOverlay"),n=document.getElementById("hamburgerBtn");if(!e||!n)return;function s(){e.classList.add("mobile-open"),t==null||t.classList.add("active"),document.body.style.overflow="hidden"}function o(){e.classList.remove("mobile-open"),t==null||t.classList.remove("active"),document.body.style.overflow=""}n.addEventListener("click",()=>{e.classList.contains("mobile-open")?o():s()}),t==null||t.addEventListener("click",o),e.querySelectorAll(".nav-item").forEach(r=>{r.addEventListener("click",()=>{window.innerWidth<=768&&o()})}),document.addEventListener("keydown",r=>{r.key==="Escape"&&e.classList.contains("mobile-open")&&o()})}const wt=1800*1e3,_t=1500*1e3;let _e=null,ke=null;function xe(){clearTimeout(_e),clearTimeout(ke),L()&&(ke=setTimeout(()=>{typeof window.showToast=="function"&&window.showToast("เซสชันจะหมดอายุใน 5 นาที","warning")},_t),_e=setTimeout(()=>{Le(),window.location.hash="#/login"},wt))}function kt(){["mousedown","keydown","scroll","touchstart"].forEach(t=>document.addEventListener(t,xe,{passive:!0})),xe()}window.debounce=function(e,t=300){let n;return(...s)=>{clearTimeout(n),n=setTimeout(()=>e(...s),t)}};function xt(){let e=document.getElementById("helpBtn");e||(e=document.createElement("button"),e.id="helpBtn",e.className="floating-help-btn",e.innerHTML='<span class="material-icons-outlined">help_outline</span>',e.title="วิธีใช้งาน",document.body.appendChild(e)),e.addEventListener("click",()=>{const t=e.dataset.route||`#/${j()}`;ct(t)})}function St(){const e=document.getElementById("logoutBtn");e&&e.addEventListener("click",t=>{t.preventDefault(),Le()})}async function Et(){const e=new URLSearchParams(window.location.search),t=e.get("sso_token");if(t)try{const n=t.replace(/ /g,"+"),s=decodeURIComponent(escape(atob(n))),o=JSON.parse(s);if(Date.now()-o.issued_at>300*1e3){console.warn("SSO token expired");return}if(o.jwt)try{N(o.jwt)}catch(u){console.warn("SSO: Failed to set adapter token",u)}let r="";try{const u=await w("system_roles",{filter:`name='${ee(o.role)}'`,requestKey:null});u.length>0&&(r=u[0].allowed_menus||"")}catch(u){console.warn("SSO: Could not fetch system_roles, using fallback:",u.message)}!r&&["admin","owner","manager","sa"].includes(o.role)&&(r="*");const i={id:o.id,username:o.username,display_name:o.display_name,role:o.role,allowed_menus:r,branch_id:o.branch_id||"",permissions:"{}"};R(i,o.jwt),o.branch_id&&O(o.branch_id),console.log("✅ SSO Login successful:",i.display_name),e.delete("sso_token");const l=e.toString(),f=window.location.pathname+(l?"?"+l:"")+window.location.hash;window.history.replaceState({},"",f)}catch(n){console.error("❌ SSO parsing failed:",n)}}function Lt(){document.documentElement.classList.add("embedded-mode");const e=document.getElementById("sidebar"),t=document.querySelector(".topnav"),n=document.getElementById("logoutBtn");e&&(e.style.display="none"),t&&(t.style.display="none"),n&&(n.style.display="none");const s=document.querySelector(".main-wrapper");s&&(s.style.width="100%");const o=document.querySelector(".main-content");o&&o.classList.add("login-mode")}function Tt(){const e=document.getElementById("backToMgmtBtn");if(!e)return;const t=L();t&&(t.sso_source==="management"||t.sso_source==="pin_shared")&&(e.style.display="flex",e.addEventListener("click",()=>{window.location.href=We()}))}function $t(){const e=document.getElementById("darkModeBtn"),t=document.getElementById("darkModeIcon");if(!e||!t)return;const n=localStorage.getItem("mungkhud_theme");n==="dark"?(document.documentElement.setAttribute("data-theme","dark"),t.textContent="light_mode"):n==="light"&&(document.documentElement.setAttribute("data-theme","light"),t.textContent="dark_mode"),e.addEventListener("click",()=>{document.documentElement.getAttribute("data-theme")==="dark"?(document.documentElement.setAttribute("data-theme","light"),localStorage.setItem("mungkhud_theme","light"),t.textContent="dark_mode"):(document.documentElement.setAttribute("data-theme","dark"),localStorage.setItem("mungkhud_theme","dark"),t.textContent="light_mode")})}async function Pt(){const e=window.self!==window.top;if(await Et(),vt(),bt(),xt(),St(),Tt(),$t(),kt(),ht(),await qt(),e&&Lt(),!L()){const t=await Ye();t&&console.log("[Auth] Auto-login successful:",t.display_name)}Q(j()),window.addEventListener("hashchange",()=>Q(j())),L()&&(ut(),Ct(),Se(),setInterval(Se,300*1e3))}let $=[];async function Se(){try{const e=await w("products",{requestKey:"lowstock_check"}),t=await w("stock_ledgers",{requestKey:"lowstock_ledgers"}),n={};for(const o of t)n[o.product_id]=(n[o.product_id]||0)+(o.qty||0);$=e.filter(o=>(n[o.code]||n[o.id]||0)<=(o.min_stock||5)).map(o=>({name:o.name,code:o.code,qty:n[o.code]||n[o.id]||0}));const s=document.getElementById("notifBadge");if(s)if($.length>0){if(s.textContent=$.length,s.style.display="",!window._lowStockAlerted){window._lowStockAlerted=!0;try{const o=new AudioContext,r=o.createOscillator(),a=o.createGain();r.connect(a),a.connect(o.destination),r.frequency.value=880,a.gain.value=.1,r.start(),r.stop(o.currentTime+.15)}catch{}}}else s.style.display="none",window._lowStockAlerted=!1}catch(e){console.warn("Low-stock check failed:",e)}}function Ct(){const e=document.getElementById("notifBtn");if(!e)return;const t=document.createElement("div");t.id="notifPanel",t.className="notif-panel",t.style.cssText=`
        display:none; position:absolute; top:100%; right:0; width:320px;
        background:var(--color-surface,#fff); border-radius:12px;
        box-shadow:0 8px 32px rgba(0,0,0,0.15); z-index:9999;
        border:1px solid var(--color-border,#e2e8f0); overflow:hidden;
    `,e.style.position="relative",e.appendChild(t),e.addEventListener("click",n=>{if(n.stopPropagation(),t.style.display!=="none"){t.style.display="none";return}if($.length===0)t.innerHTML=`
                <div style="padding:20px;text-align:center;">
                    <span class="material-icons-outlined" style="font-size:36px;color:#22c55e;">check_circle</span>
                    <p style="margin:8px 0 0;color:var(--color-text-muted);">ไม่มีการแจ้งเตือน</p>
                </div>`;else{const o=$.slice(0,8).map(r=>`
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--color-border,#f1f5f9);">
                    <div>
                        <div style="font-weight:500;font-size:0.85rem;">${r.name}</div>
                        <div style="font-size:0.75rem;color:var(--color-text-muted);">${r.code}</div>
                    </div>
                    <span style="color:${r.qty<=0?"#ef4444":"#f59e0b"};font-weight:700;font-size:0.85rem;">
                        ${r.qty<=0?"หมด":`เหลือ ${r.qty}`}
                    </span>
                </div>
            `).join("");t.innerHTML=`
                <div style="padding:12px 16px;font-weight:600;border-bottom:1px solid var(--color-border,#e2e8f0);display:flex;align-items:center;gap:8px;">
                    <span class="material-icons-outlined" style="color:#ef4444;font-size:18px;">warning</span>
                    สินค้าใกล้หมด (${$.length})
                </div>
                ${o}
                ${$.length>8?`<div style="padding:8px 16px;font-size:0.75rem;color:var(--color-text-muted);">+${$.length-8} รายการ</div>`:""}
                <a href="#/stock-list" style="display:block;padding:10px 16px;text-align:center;font-size:0.85rem;color:var(--color-primary,#2563eb);font-weight:500;border-top:1px solid var(--color-border,#e2e8f0);text-decoration:none;">
                    ดูทั้งหมด →
                </a>
            `}t.style.display="block"}),document.addEventListener("click",()=>{t.style.display="none"})}async function qt(){const e=document.getElementById("branchSelect");if(!e)return;const t=L(),n=t&&["employee","employee_main","employee_sup","sa"].includes(t.role);try{const s=await w("users",{fields:"branch",requestKey:"branch_list"}),o=["all","main",""],r=new Map;if(s.forEach(i=>{const l=(i.branch||"").trim();l&&!o.includes(l.toLowerCase())&&r.set(l,l)}),e.innerHTML="",!n){const i=document.createElement("option");i.value="",i.textContent="ทุกสาขา",e.appendChild(i)}if([...r.values()].sort().forEach(i=>{if(n&&t.branch_id&&i!==t.branch_id)return;const l=document.createElement("option");l.value=i,l.textContent=i,e.appendChild(l)}),n&&t.branch_id)e.value=t.branch_id,e.disabled=!0,O(t.branch_id);else{const i=ne();i&&(e.value=i)}if(e.options.length===0){const i=document.createElement("option");i.value="",i.textContent="สาขาหลัก",e.appendChild(i)}e.addEventListener("change",()=>{O(e.value),Q(j())})}catch(s){console.warn("Could not load branches:",s),e.innerHTML='<option value="">สาขาหลัก</option>'}}document.addEventListener("DOMContentLoaded",Pt);export{Mt as a,ne as b,Bt as c,He as d,ee as e,w as f,Ze as g,zt as h,jt as i,Ot as j,Rt as k,U as l,At as m,It as n,Dt as o,Vt as p,Nt as q,me as r,X as s,Ht as t,Ue as u,Ut as v};
