window.showToast=function(e,o="info"){let t=document.querySelector(".toast-container");t||(t=document.createElement("div"),t.className="toast-container",document.body.appendChild(t));const a=document.createElement("div");a.className=`toast toast-${o}`,a.textContent=e,t.appendChild(a),setTimeout(()=>a.remove(),3e3)};window.showLoading=function(){let e=document.querySelector(".loading-overlay");e||(e=document.createElement("div"),e.className="loading-overlay",e.innerHTML='<div class="spinner"></div>',document.body.appendChild(e)),e.classList.add("show")};window.hideLoading=function(){const e=document.querySelector(".loading-overlay");e&&e.classList.remove("show")};window.closeImageModal=function(){const e=document.getElementById("globalImageModal");if(e){e.classList.remove("show");const o=document.getElementById("globalModalImage");o&&(o.src="")}};window.showImage=function(e){if(!e)return;let o=document.getElementById("globalImageModal");o||(o=document.createElement("div"),o.id="globalImageModal",o.className="modal-overlay",o.onclick=window.closeImageModal,o.innerHTML=`
            <div style="position: relative; max-width: 90vw; max-height: 90vh;" onclick="event.stopPropagation()">
                <button onclick="window.closeImageModal()" class="btn" style="
                    position: absolute; 
                    top: -15px; 
                    right: -15px; 
                    background: var(--danger); 
                    color: white; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    width: 30px; 
                    height: 30px; 
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                ">✕</button>
                <img id="globalModalImage" src="" style="
                    max-width: 100%; 
                    max-height: 85vh; 
                    border-radius: var(--radius-lg); 
                    display: block; 
                    box-shadow: var(--shadow-lg); 
                    background: white;
                ">
            </div>
        `,document.body.appendChild(o),document.addEventListener("keydown",a=>{a.key==="Escape"&&window.closeImageModal()}));const t=document.getElementById("globalModalImage");t.src=e,o.classList.add("show")};
