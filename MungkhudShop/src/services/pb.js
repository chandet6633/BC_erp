/**
 * MungkhudShop — Data Service (Express API Backend)
 * ═══════════════════════════════════════════════════
 * Drop-in replacement for the original PocketBase-based pb.js.
 * All function signatures are identical — page files need zero changes.
 *
 * Architecture: Browser → Nginx → Express API → NocoDB
 */
import {
    initAdapter,
    fetchList,
    fetchFullList,
    fetchOne,
    createRecord,
    updateRecord,
    deleteRecord,
    fetchFirstListItem,
    getManagementUrl
} from '@shared/nocodb-adapter.js'

/* ── Initialize adapter on module load (restores saved JWT) ── */
initAdapter()

/* ── Re-export CRUD functions (identical signatures) ── */

export {
    fetchList,
    fetchFullList,
    fetchOne,
    createRecord,
    updateRecord,
    deleteRecord,
    fetchFirstListItem,
    getManagementUrl
}

/**
 * managementPB is no longer needed — both apps share one NocoDB database.
 * Kept as a stub for any remaining references during migration cleanup.
 * @deprecated Use the shared CRUD functions directly.
 */
export const managementPB = {
    collection(name) {
        return {
            async getFullList(opts = {}) {
                return fetchFullList(name, opts)
            },
            async getFirstListItem(filter) {
                return fetchFirstListItem(name, filter)
            },
            async getList(page, perPage, opts = {}) {
                return fetchList(name, page, perPage, opts)
            },
            async getOne(id, opts = {}) {
                return fetchOne(name, id, opts)
            }
        }
    }
}

/* ── Default export (for direct pb usage if any) ── */
export default {
    collection(name) {
        return managementPB.collection(name)
    }
}
