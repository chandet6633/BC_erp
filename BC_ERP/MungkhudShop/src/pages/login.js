/**
 * MungkhudShop — Unified Login Page
 * ═════════════════════════════════════
 * Primary: Username + Password form (mobile-first)
 * Secondary: PIN pad (for shared shop-floor tablets)
 * Force change password screen when must_change_password = true
 */
import { loginByUsername, loginByPin } from '../services/auth.js'
import { changePassword } from '@shared/nocodb-adapter.js'
import { showToast } from '../components/ui.js'

// BUG 34 FIX: Brute-force protection persisted in sessionStorage (survives page refresh)
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 60_000
const LOCKOUT_WINDOW = 300_000
const LOCKOUT_KEY = 'mungkhud_lockout'
const ATTEMPTS_KEY = 'mungkhud_attempts'

function isLockedOut() {
    const lockUntil = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || '0', 10)
    if (Date.now() < lockUntil) return true
    // Prune old attempts outside window
    const attempts = getAttempts().filter(t => Date.now() - t < LOCKOUT_WINDOW)
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
    return false
}

function getAttempts() {
    try { return JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) || '[]') } catch { return [] }
}

function recordFailedAttempt() {
    let attempts = getAttempts().filter(t => Date.now() - t < LOCKOUT_WINDOW)
    attempts.push(Date.now())
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
    if (attempts.length >= MAX_ATTEMPTS) {
        sessionStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_DURATION))
        sessionStorage.setItem(ATTEMPTS_KEY, '[]')
        return true
    }
    return false
}

// PIN state
let currentRole = ''
let pinBuffer = ''

const ROLE_OPTIONS = [
    { id: 'manager', label: 'ผู้จัดการ / เจ้าของ', icon: 'supervisor_account', color: '#C8A048' },
    { id: 'sa',      label: 'SA (ผู้ดูแลสต็อก)',    icon: 'inventory_2',        color: '#2563eb' }
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
                        ${ROLE_OPTIONS.map(r => `
                            <button class="btn btn-outline role-select-btn" data-role="${r.id}"
                                    style="width:100%;padding:var(--sp-4);justify-content:flex-start;gap:var(--sp-3);font-size:1rem;min-height:56px;">
                                <span class="material-icons-outlined" style="color:${r.color};font-size:28px;">${r.icon}</span>
                                <span>${r.label}</span>
                            </button>
                        `).join('')}
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
                            ${[0,1,2,3,4,5].map(i => `
                                <div class="pin-dot" data-index="${i}" 
                                     style="width:16px;height:16px;border-radius:50%;border:2px solid var(--color-border);transition:all 0.15s;"></div>
                            `).join('')}
                        </div>

                        <!-- Number Pad -->
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-2);max-width:280px;margin:0 auto;">
                            ${[1,2,3,4,5,6,7,8,9].map(n => `
                                <button class="btn btn-outline pin-key" data-key="${n}" 
                                        style="font-size:1.4rem;padding:var(--sp-3);min-height:56px;justify-content:center;font-weight:600;touch-action:manipulation;">
                                    ${n}
                                </button>
                            `).join('')}
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
    `

    // ═══ EVENT HANDLERS ═══

    // Focus username on load
    setTimeout(() => container.querySelector('#loginUsername')?.focus(), 100)

    // Password visibility toggle
    const toggleBtn = container.querySelector('#togglePassword')
    const pwdInput = container.querySelector('#loginPassword')
    toggleBtn?.addEventListener('click', () => {
        const isPassword = pwdInput.type === 'password'
        pwdInput.type = isPassword ? 'text' : 'password'
        toggleBtn.querySelector('.material-icons-outlined').textContent = isPassword ? 'visibility' : 'visibility_off'
    })

    // Login form submit
    container.querySelector('#loginBtn')?.addEventListener('click', () => submitLogin(container))
    
    // Enter key on inputs
    container.querySelector('#loginUsername')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') container.querySelector('#loginPassword')?.focus()
    })
    container.querySelector('#loginPassword')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitLogin(container)
    })

    // Input focus styling
    container.querySelectorAll('#loginForm input[type="text"], #loginForm input[type="password"]').forEach(input => {
        input.addEventListener('focus', () => { input.style.borderColor = 'var(--color-primary)' })
        input.addEventListener('blur', () => { input.style.borderColor = 'var(--color-border)' })
    })

    // Switch to PIN
    container.querySelector('#switchToPin')?.addEventListener('click', () => {
        container.querySelector('#loginForm').style.display = 'none'
        container.querySelector('#pinSection').style.display = ''
    })

    // Switch back to username
    container.querySelector('#switchToUsername')?.addEventListener('click', () => {
        container.querySelector('#loginForm').style.display = ''
        container.querySelector('#pinSection').style.display = 'none'
    })

    // Forgot password hint
    container.querySelector('#forgotHint')?.addEventListener('click', () => {
        container.querySelector('#forgotHint').innerHTML = 
            '<span style="color:var(--color-primary);">📞 ติดต่อผู้จัดการเพื่อรีเซ็ตรหัสผ่าน</span>'
    })

    // ── PIN section events ──
    container.querySelectorAll('.role-select-btn').forEach(btn => {
        btn.addEventListener('click', () => selectRole(container, btn.dataset.role))
    })
    container.querySelectorAll('.pin-key[data-key]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(40)
            pressKey(container, btn.dataset.key)
        })
    })
    container.querySelector('#pinBackBtn')?.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(40)
        clearPin(container)
    })
    container.querySelector('#pinOkBtn')?.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(40)
        submitPinLogin(container)
    })
    container.querySelector('#pinBackToRoles')?.addEventListener('click', () => {
        container.querySelector('#roleSelection').style.display = ''
        container.querySelector('#pinEntry').style.display = 'none'
        pinBuffer = ''
    })

    // ── Force change password events ──
    container.querySelector('#changePasswordBtn')?.addEventListener('click', () => submitPasswordChange(container))
    container.querySelector('#confirmPassword')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitPasswordChange(container)
    })

    // ── Keyboard support for PIN ──
    const abortController = new AbortController()
    document.addEventListener('keydown', (e) => {
        const pinEntry = container.querySelector('#pinEntry')
        if (!pinEntry || pinEntry.style.display === 'none') return
        if (e.key >= '0' && e.key <= '9') pressKey(container, e.key)
        else if (e.key === 'Backspace') clearPin(container)
        else if (e.key === 'Enter') submitPinLogin(container)
        else if (e.key === 'Escape') container.querySelector('#pinBackToRoles')?.click()
    }, { signal: abortController.signal })

    const cleanup = new MutationObserver(() => {
        if (!document.body.contains(container)) {
            abortController.abort()
            cleanup.disconnect()
        }
    })
    cleanup.observe(document.body, { childList: true, subtree: true })
}

/* ═══════════════════════════════════════════════════
   USERNAME/PASSWORD LOGIN
   ═══════════════════════════════════════════════════ */

async function submitLogin(container) {
    const username = container.querySelector('#loginUsername')?.value?.trim()?.toLowerCase()
    const password = container.querySelector('#loginPassword')?.value
    const remember = container.querySelector('#rememberMe')?.checked
    const errorEl = container.querySelector('#loginError')
    const btn = container.querySelector('#loginBtn')

    if (!username || !password) {
        errorEl.textContent = 'กรุณากรอก username และรหัสผ่าน'
        errorEl.style.display = 'block'
        return
    }

    if (isLockedOut()) {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
        errorEl.textContent = `ลองผิดพลาดมากเกินไป กรุณารอ ${remaining} วินาที`
        errorEl.style.display = 'block'
        return
    }

    btn.disabled = true
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:20px;animation:spin 1s linear infinite;">sync</span> กำลังเข้าสู่ระบบ...'
    errorEl.style.display = 'none'

    try {
        const session = await loginByUsername(username, password, remember)

        if (session.must_change_password) {
            // Show force change password screen
            container.querySelector('#loginForm').style.display = 'none'
            container.querySelector('#changePasswordSection').style.display = ''
            container.querySelector('#newPassword')?.focus()
            btn.disabled = false
            btn.innerHTML = '<span class="material-icons-outlined" style="font-size:20px;">login</span> เข้าสู่ระบบ'
            return
        }

        showToast(`ยินดีต้อนรับ ${session.display_name}`, 'success')
        window.location.hash = '#/dashboard'
        window.location.reload()
    } catch (e) {
        const nowLocked = recordFailedAttempt()
        if (nowLocked) {
            errorEl.textContent = 'ลองผิดพลาดมากเกินไป — ระบบถูกล็อค 1 นาที'
        } else {
            const remaining = MAX_ATTEMPTS - getAttempts().length
            errorEl.textContent = `${e.message} (เหลืออีก ${remaining} ครั้ง)`
        }
        errorEl.style.display = 'block'
        btn.disabled = false
        btn.innerHTML = '<span class="material-icons-outlined" style="font-size:20px;">login</span> เข้าสู่ระบบ'
    }
}

/* ═══════════════════════════════════════════════════
   FORCE CHANGE PASSWORD
   ═══════════════════════════════════════════════════ */

async function submitPasswordChange(container) {
    const newPwd = container.querySelector('#newPassword')?.value
    const confirmPwd = container.querySelector('#confirmPassword')?.value
    const errorEl = container.querySelector('#changePasswordError')
    const btn = container.querySelector('#changePasswordBtn')

    if (!newPwd || newPwd.length < 4) {
        errorEl.textContent = 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
        errorEl.style.display = 'block'
        return
    }
    if (newPwd !== confirmPwd) {
        errorEl.textContent = 'รหัสผ่านไม่ตรงกัน'
        errorEl.style.display = 'block'
        return
    }

    btn.disabled = true
    btn.textContent = 'กำลังบันทึก...'
    errorEl.style.display = 'none'

    try {
        await changePassword('', newPwd)
        showToast('ตั้งรหัสผ่านใหม่สำเร็จ!', 'success')
        window.location.hash = '#/dashboard'
        window.location.reload()
    } catch (e) {
        errorEl.textContent = e.message || 'เกิดข้อผิดพลาด'
        errorEl.style.display = 'block'
        btn.disabled = false
        btn.textContent = 'ตั้งรหัสผ่าน'
    }
}

/* ═══════════════════════════════════════════════════
   PIN LOGIN (same as before)
   ═══════════════════════════════════════════════════ */

function selectRole(container, role) {
    currentRole = role
    pinBuffer = ''
    const config = ROLE_OPTIONS.find(r => r.id === role)
    const iconEl = container.querySelector('#pinRoleIcon')
    const iconInner = container.querySelector('#pinRoleIconInner')
    iconEl.style.color = config.color
    iconInner.textContent = config.icon
    container.querySelector('#pinInstruction').textContent = `ใส่ PIN ${config.label}`
    updateDots(container)
    container.querySelector('#pinError').style.display = 'none'
    container.querySelector('#roleSelection').style.display = 'none'
    container.querySelector('#pinEntry').style.display = ''
}

function pressKey(container, key) {
    if (isLockedOut()) return
    if (pinBuffer.length < 6) {
        pinBuffer += key
        updateDots(container)
        container.querySelector('#pinError').style.display = 'none'
        if (pinBuffer.length === 6) submitPinLogin(container)
    }
}

function clearPin(container) {
    pinBuffer = pinBuffer.slice(0, -1)
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

async function submitPinLogin(container) {
    if (pinBuffer.length < 4) return
    const errorEl = container.querySelector('#pinError')
    const okBtn = container.querySelector('#pinOkBtn')

    if (isLockedOut()) {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
        errorEl.textContent = `กรุณารอ ${remaining} วินาที`
        errorEl.style.display = 'block'
        pinBuffer = ''
        updateDots(container)
        return
    }

    okBtn.disabled = true
    okBtn.textContent = '...'

    const session = await loginByPin(pinBuffer, currentRole)

    if (session) {
        if (session.must_change_password) {
            container.querySelector('#pinSection').style.display = 'none'
            container.querySelector('#changePasswordSection').style.display = ''
            container.querySelector('#newPassword')?.focus()
            okBtn.disabled = false
            okBtn.textContent = 'OK'
            return
        }
        showToast(`ยินดีต้อนรับ ${session.display_name}`, 'success')
        window.location.hash = '#/dashboard'
        window.location.reload()
    } else {
        const nowLocked = recordFailedAttempt()
        if (nowLocked) {
            errorEl.textContent = 'ระบบถูกล็อค 1 นาที'
        } else {
            const remaining = MAX_ATTEMPTS - getAttempts().length
            errorEl.textContent = `PIN ไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`
        }
        errorEl.style.display = 'block'
        pinBuffer = ''
        updateDots(container)
        okBtn.disabled = false
        okBtn.textContent = 'OK'
    }
}
