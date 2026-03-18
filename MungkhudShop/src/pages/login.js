/**
 * MungkhudShop — PIN Login Page
 * Same PIN pad style as Management dashboard for unified experience.
 */
import { loginByPin } from '../services/auth.js'
import { showToast } from '../components/ui.js'

let currentRole = ''
let pinBuffer = ''

// SEC-8: Brute-force protection
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 60_000 // 1 minute lockout
const LOCKOUT_WINDOW = 300_000  // 5 minute window
let failedAttempts = []
let lockedUntil = 0

function isLockedOut() {
    if (Date.now() < lockedUntil) return true
    // Clean old attempts outside the window
    failedAttempts = failedAttempts.filter(t => Date.now() - t < LOCKOUT_WINDOW)
    return false
}

function recordFailedAttempt() {
    failedAttempts.push(Date.now())
    failedAttempts = failedAttempts.filter(t => Date.now() - t < LOCKOUT_WINDOW)
    if (failedAttempts.length >= MAX_ATTEMPTS) {
        lockedUntil = Date.now() + LOCKOUT_DURATION
        failedAttempts = []
        return true // now locked
    }
    return false
}

const ROLE_OPTIONS = [
    {
        id: 'manager',
        label: 'ผู้จัดการ / เจ้าของ',
        icon: 'supervisor_account',
        color: '#2563eb',
        bg: '#eff6ff'
    },
    {
        id: 'employee',
        label: 'พนักงาน',
        icon: 'engineering',
        color: '#16a34a',
        bg: '#f0fdf4'
    },
    {
        id: 'admin',
        label: 'Admin',
        icon: 'admin_panel_settings',
        color: '#d97706',
        bg: '#fffbeb'
    }
]

export function initLoginPage(container) {
    container.innerHTML = `
        <div class="login-overlay">
            <div class="login-card" style="max-width:400px;">
                <div class="login-logo">
                    <img src="/assets/mungkhud_logo.png" alt="MungkhudShop" 
                         style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:var(--sp-3);"
                         onerror="this.style.display='none'">
                    <h1 style="color:var(--color-primary);font-family:var(--font-heading);font-size:1.6rem;margin:0;">MungkhudShop</h1>
                    <p style="color:var(--color-text-muted);font-size:0.85rem;margin-top:var(--sp-1);">เลือกประเภทผู้ใช้เพื่อเข้าสู่ระบบ</p>
                </div>

                <!-- Role Selection -->
                <div id="roleSelection" style="width:100%;display:flex;flex-direction:column;gap:var(--sp-3);">
                    ${ROLE_OPTIONS.map(r => `
                        <button class="btn btn-outline role-select-btn" 
                                data-role="${r.id}"
                                style="width:100%;padding:var(--sp-4);justify-content:flex-start;gap:var(--sp-3);font-size:1rem;min-height:56px;">
                            <span class="material-icons-outlined" style="color:${r.color};font-size:28px;">${r.icon}</span>
                            <span>${r.label}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- PIN Entry (hidden initially) -->
                <div id="pinEntry" style="display:none;width:100%;text-align:center;">
                    <div id="pinRoleIcon" style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--sp-3);">
                        <span class="material-icons-outlined" style="font-size:28px;" id="pinRoleIconInner"></span>
                    </div>
                    <p id="pinInstruction" style="color:var(--color-text-secondary);font-size:0.9rem;margin-bottom:var(--sp-4);"></p>
                    
                    <!-- PIN Dots -->
                    <div style="display:flex;justify-content:center;gap:12px;margin-bottom:var(--sp-5);">
                        ${[0,1,2,3,4,5].map(i => `
                            <div class="pin-dot" data-index="${i}" 
                                 style="width:16px;height:16px;border-radius:50%;border:2px solid var(--color-border);transition:all 0.15s;"></div>
                        `).join('')}
                    </div>

                    <!-- Number Pad -->
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-2);max-width:280px;margin:0 auto;">
                        ${[1,2,3,4,5,6,7,8,9].map(n => `
                            <button class="btn btn-outline pin-key" data-key="${n}" 
                                    style="font-size:1.4rem;padding:var(--sp-3);min-height:56px;justify-content:center;font-weight:600;">
                                ${n}
                            </button>
                        `).join('')}
                        <button class="btn btn-outline pin-key" id="pinBackBtn"
                                style="font-size:1rem;padding:var(--sp-3);min-height:56px;justify-content:center;">
                            <span class="material-icons-outlined">backspace</span>
                        </button>
                        <button class="btn btn-outline pin-key" data-key="0" 
                                style="font-size:1.4rem;padding:var(--sp-3);min-height:56px;justify-content:center;font-weight:600;">
                            0
                        </button>
                        <button class="btn btn-primary pin-key" id="pinOkBtn"
                                style="font-size:1rem;padding:var(--sp-3);min-height:56px;justify-content:center;">
                            OK
                        </button>
                    </div>

                    <!-- Error message -->
                    <div id="pinError" style="color:#ef4444;text-align:center;margin-top:var(--sp-3);display:none;font-size:0.9rem;"></div>

                    <!-- Back to role selection -->
                    <button id="pinBackToRoles" class="btn btn-outline" 
                            style="margin-top:var(--sp-4);width:100%;justify-content:center;">
                        <span class="material-icons-outlined">arrow_back</span> เลือกประเภทอื่น
                    </button>
                </div>
            </div>
        </div>
    `

    // ── Event Handlers ──

    // Role selection
    container.querySelectorAll('.role-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role
            selectRole(container, role)
        })
    })

    // Number keys
    container.querySelectorAll('.pin-key[data-key]').forEach(btn => {
        btn.addEventListener('click', () => {
            pressKey(container, btn.dataset.key)
        })
    })

    // Backspace
    container.querySelector('#pinBackBtn')?.addEventListener('click', () => {
        clearPin(container)
    })

    // OK
    container.querySelector('#pinOkBtn')?.addEventListener('click', () => {
        submitPin(container)
    })

    // Back to role selection
    container.querySelector('#pinBackToRoles')?.addEventListener('click', () => {
        container.querySelector('#roleSelection').style.display = ''
        container.querySelector('#pinEntry').style.display = 'none'
        pinBuffer = ''
    })

    // Keyboard support
    // U3: Use AbortController so handler is automatically removed when navigating away
    const abortController = new AbortController()
    document.addEventListener('keydown', (e) => {
        const pinEntry = container.querySelector('#pinEntry')
        if (!pinEntry || pinEntry.style.display === 'none') return

        if (e.key >= '0' && e.key <= '9') {
            pressKey(container, e.key)
        } else if (e.key === 'Backspace') {
            clearPin(container)
        } else if (e.key === 'Enter') {
            submitPin(container)
        } else if (e.key === 'Escape') {
            container.querySelector('#pinBackToRoles')?.click()
        }
    }, { signal: abortController.signal })

    // U3: Clean up when container is removed from DOM (route change)
    const cleanup = new MutationObserver(() => {
        if (!document.body.contains(container)) {
            abortController.abort()
            cleanup.disconnect()
        }
    })
    cleanup.observe(document.body, { childList: true, subtree: true })
}

function selectRole(container, role) {
    currentRole = role
    pinBuffer = ''

    const config = ROLE_OPTIONS.find(r => r.id === role)
    const iconEl = container.querySelector('#pinRoleIcon')
    const iconInner = container.querySelector('#pinRoleIconInner')

    iconEl.style.background = config.bg
    iconEl.style.color = config.color
    iconInner.textContent = config.icon
    container.querySelector('#pinInstruction').textContent = `ใส่ PIN ${config.label}`

    updateDots(container)
    container.querySelector('#pinError').style.display = 'none'
    container.querySelector('#roleSelection').style.display = 'none'
    container.querySelector('#pinEntry').style.display = ''
}

function pressKey(container, key) {
    if (pinBuffer.length < 6) {
        pinBuffer += key
        updateDots(container)
        container.querySelector('#pinError').style.display = 'none'

        // Auto-submit on 6 digits
        if (pinBuffer.length === 6) {
            submitPin(container)
        }
    }
}

function clearPin(container) {
    pinBuffer = pinBuffer.slice(0, -1) // Remove last digit (backspace behavior)
    if (pinBuffer.length === 0) pinBuffer = '' // Full clear if empty
    updateDots(container)
    container.querySelector('#pinError').style.display = 'none'
}

function updateDots(container) {
    container.querySelectorAll('.pin-dot').forEach((dot, i) => {
        if (i < pinBuffer.length) {
            dot.style.background = 'var(--color-primary)'
            dot.style.borderColor = 'var(--color-primary)'
            dot.style.transform = 'scale(1.2)'
        } else {
            dot.style.background = 'transparent'
            dot.style.borderColor = 'var(--color-border)'
            dot.style.transform = 'scale(1)'
        }
    })
}

async function submitPin(container) {
    if (pinBuffer.length < 4) return

    const errorEl = container.querySelector('#pinError')
    const okBtn = container.querySelector('#pinOkBtn')

    // SEC-8: Check lockout
    if (isLockedOut()) {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
        errorEl.textContent = `ลองผิดพลาดมากเกินไป กรุณารอ ${remaining} วินาที`
        errorEl.style.display = 'block'
        pinBuffer = ''
        updateDots(container)
        return
    }

    okBtn.disabled = true
    okBtn.textContent = '...'

    const user = await loginByPin(pinBuffer, currentRole)

    if (user) {
        showToast(`ยินดีต้อนรับ ${user.display_name}`, 'success')
        window.location.hash = '#/dashboard'
        window.location.reload()
    } else {
        // SEC-8: Record failed attempt and check if now locked
        const nowLocked = recordFailedAttempt()
        if (nowLocked) {
            errorEl.textContent = `ลองผิดพลาดมากเกินไป — ระบบถูกล็อค 1 นาที`
        } else {
            const remaining = MAX_ATTEMPTS - failedAttempts.length
            errorEl.textContent = `รหัส PIN ไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`
        }
        errorEl.style.display = 'block'
        pinBuffer = ''
        updateDots(container)
        okBtn.disabled = false
        okBtn.textContent = 'OK'
    }
}
