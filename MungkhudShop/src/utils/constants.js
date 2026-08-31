/**
 * MungkhudShop — Constants
 * Central location for magic numbers and configuration values.
 */

/** Number of records to process in parallel during batch operations */
export const BATCH_SIZE = 50

/** Session timeout in minutes before auto-logout */
export const SESSION_TIMEOUT_MIN = 30

/** Default VAT rate (%) */
export const VAT_RATE = 7

/** Minimum cost difference threshold for weighted average recalculation */
export const COST_DIFF_THRESHOLD = 0.01

/** PocketBase URLs */
export const PB_URL = 'http://127.0.0.1:8091'
export const MANAGEMENT_PB_URL = 'http://127.0.0.1:8092'

/** Default branch scope; concrete branch labels come from branch metadata. */
export const DEFAULT_BRANCH = ''

/** ID generation prefix format: PREFIX-YYMM-NNNN */
export const ID_PAD_LENGTH = 4
