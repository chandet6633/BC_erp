import PocketBase from 'pocketbase';

// Connect to PocketBase
let PB_URL = '/';

if (window.location.protocol === 'file:') {
    PB_URL = 'http://localhost:8092';
} else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // If we're on port 3000 (Vite), we need to point to 8092
    if (window.location.port === '3000') {
        PB_URL = 'http://localhost:8092';
    }
}

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// Global Interceptor for Audit Logging
const originalCollection = pb.collection.bind(pb);
pb.collection = function (collectionNameOrId) {
    const collection = originalCollection(collectionNameOrId);

    // Do not audit the audit_logs themselves to prevent infinite loops
    if (collectionNameOrId === 'audit_logs') {
        return collection;
    }

    const proxyMethod = (originalMethod, actionName) => {
        return async function (...args) {
            const result = await originalMethod.apply(this, args);
            try {
                const details = `Action: ${actionName} on collection: ${collectionNameOrId}. Record ID: ${result?.id || 'unknown'}`;

                // Dynamically load AuditService if it's missing on this page
                if (!window['AuditService']) {
                    try {
                        await import('./auditService.js');
                    } catch (e) {
                        console.error('Failed to dynamically load auditService:', e);
                    }
                }

                if (window['AuditService'] && typeof window['AuditService'].log === 'function') {
                    window['AuditService'].log(`${actionName}_${collectionNameOrId}`, details, collectionNameOrId);
                }
            } catch (err) {
                console.error(`Audit logging failed for ${actionName} on ${collectionNameOrId}:`, err);
            }
            return result;
        };
    };

    return new Proxy(collection, {
        get(target, prop, receiver) {
            const origMethod = target[prop];
            if (typeof origMethod === 'function') {
                if (typeof prop === 'string' && ['create', 'update', 'delete'].includes(prop)) {
                    return proxyMethod(origMethod, prop);
                }
                return origMethod.bind(target); // bind is important for PocketBase internal `this` context
            }
            return Reflect.get(target, prop, receiver);
        }
    });
};

// Export for global access if needed during migration
window.pb = pb;
