/**
 * Dev Tools Management page.
 * Admin only page for clearing data and resetting tables for testing purposes.
 */
import { showToast, showConfirm } from '../components/ui.js'
import { getStoredToken, getCurrentUser } from '../services/auth.js'

export function initDevToolsPage(container) {
    const user = getCurrentUser()
    const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role)

    let html = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined" style="color:var(--bc-danger);">bug_report</span>
                <h1 style="color:var(--bc-danger);">Dev Tools (Temporary)</h1>
            </div>
        </div>
        
        <div class="card" style="margin-bottom:var(--sp-4); border-color:var(--bc-danger);">
            <div class="card-body">
                <div style="font-size:0.9rem;color:var(--bc-danger);margin-bottom:var(--sp-4);">
                    <strong>⚠️ WARNING:</strong> The actions below are highly destructive. They will permanently delete data from the database.
                </div>
                
                <div style="display:flex;flex-direction:column;gap:var(--sp-4);">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:var(--sp-3);border-bottom:1px solid var(--color-border);">
                        <div>
                            <strong style="display:block;">1. Clear Transaction Data</strong>
                            <span class="text-sm text-muted">Deletes all jobs, documents, document_items, payments, and stock_ledgers. Master data remains untouched.</span>
                        </div>
                        <button class="btn btn-danger" id="btnClearTransactions">Clear Transactions</button>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:var(--sp-3);border-bottom:1px solid var(--color-border);">
                        <div>
                            <strong style="display:block;">2. Reset Master Data</strong>
                            <span class="text-sm text-muted">Deletes all non-essential master data (Customers, Vehicles, Products). Settings and Lookup data remain.</span>
                        </div>
                        <button class="btn btn-danger" id="btnResetMaster">Reset Master Data</button>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <strong style="display:block;">3. Reset Roles / Users</strong>
                            <span class="text-sm text-muted">Deletes all users and roles EXCEPT the built-in 'admin' account and 'admin' role.</span>
                        </div>
                        <button class="btn btn-danger" id="btnResetUsers">Reset Users & Roles</button>
                    </div>
                </div>
            </div>
        </div>
    `

    if (isAdminOrOwner) {
        html += `
        <div class="card" style="margin-top:1rem">
          <div class="card-body">
            <h3 style="margin-bottom:1rem">🔍 ตรวจสอบความสมบูรณ์ข้อมูล</h3>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
              <button id="btnCheckStock" class="btn btn-outline">ตรวจสอบสต็อก</button>
              <button id="btnCheckDocs"  class="btn btn-outline">ตรวจสอบเอกสาร</button>
              <button id="btnRecalcCosts" class="btn btn-warning">คำนวณต้นทุนใหม่</button>
            </div>
            <pre id="integrityResults" style="background:#1e1e2e;color:#cdd6f4;padding:1rem;border-radius:.5rem;margin-top:.75rem;font-size:.8rem;white-space:pre-wrap;display:none;"></pre>
          </div>
        </div>`
    }

    container.innerHTML = html

    async function callDevApi(action) {
        try {
            const token = getStoredToken()
            const res = await fetch('/api/dev/clear-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Request failed')
            }

            showToast(data.message || 'Operation successful', 'success')
        } catch (e) {
            console.error(e)
            showToast('Error: ' + e.message, 'error')
        }
    }

    container.querySelector('#btnClearTransactions').addEventListener('click', async () => {
        if (await showConfirm('Are you sure?', 'This will permanently delete all transaction data. Type "YES" to confirm (not really, just click confirm).')) {
            await callDevApi('transactions')
        }
    })

    container.querySelector('#btnResetMaster').addEventListener('click', async () => {
        if (await showConfirm('Are you sure?', 'This will permanently delete customer, vehicle, and product master data.')) {
            await callDevApi('master_data')
        }
    })

    container.querySelector('#btnResetUsers').addEventListener('click', async () => {
        if (await showConfirm('Are you sure?', 'This will delete all users and roles except admin.')) {
            await callDevApi('users_roles')
        }
    })

    if (isAdminOrOwner) {
        const resultsEl = container.querySelector('#integrityResults')
        
        const showResults = (data) => {
            resultsEl.style.display = 'block'
            resultsEl.textContent = JSON.stringify(data, null, 2)
        }

        container.querySelector('#btnCheckStock').addEventListener('click', async () => {
            try {
                const res = await fetch('/api/data/custom/integrity/stock-check', {
                    headers: { 'Authorization': `Bearer ${getStoredToken()}` }
                })
                showResults(await res.json())
            } catch (e) {
                showResults({ error: e.message })
            }
        })

        container.querySelector('#btnCheckDocs').addEventListener('click', async () => {
            try {
                const res = await fetch('/api/data/custom/integrity/document-check', {
                    headers: { 'Authorization': `Bearer ${getStoredToken()}` }
                })
                showResults(await res.json())
            } catch (e) {
                showResults({ error: e.message })
            }
        })

        container.querySelector('#btnRecalcCosts').addEventListener('click', async () => {
            if (!confirm('ต้องการคำนวณราคาต้นทุนเฉลี่ยของสินค้าทั้งหมดใหม่หรือไม่?')) return
            try {
                const res = await fetch('/api/data/custom/admin/recalculate-costs', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getStoredToken()}` }
                })
                showResults(await res.json())
            } catch (e) {
                showResults({ error: e.message })
            }
        })
    }
}
