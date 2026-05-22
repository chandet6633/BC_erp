-- ═══════════════════════════════════════════════════════════════
--  BC AUTO XPERIENCE — PostgreSQL Schema
-- ═══════════════════════════════════════════════════════════════
--  Migrated from PocketBase (SQLite) collections.
--  All tables use UUID primary keys to match PocketBase's ID format.
--  Auto-managed created/updated timestamps.
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════
-- SHARED TABLES (used by both apps)
-- ═══════════════════════════════════════════

-- Unified identity for Management auth (PIN login, RBAC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT,
    email TEXT,
    pin TEXT,
    role TEXT,
    branch TEXT,
    active BOOLEAN DEFAULT true,
    display_name TEXT,
    last_force_logout TIMESTAMPTZ,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- System-wide settings (key-value)
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT NOT NULL UNIQUE,
    value JSONB,
    description TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Role → tool/menu permission mappings
CREATE TABLE IF NOT EXISTS system_roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role_name TEXT,
    name TEXT,
    allowed_tools JSONB DEFAULT '[]'::jsonb,
    allowed_menus TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Global audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    collection_name TEXT,
    details TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- MANAGEMENT TABLES
-- ═══════════════════════════════════════════

-- Core job-level transaction summaries (imported data)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT,
    open_date TIMESTAMPTZ,
    close_date TIMESTAMPTZ,
    customer_name TEXT,
    car_registration TEXT,
    total_revenue NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    branch TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Service/part line items per transaction
CREATE TABLE IF NOT EXISTS service_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT,
    item_name TEXT,
    quantity NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    branch TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Monthly aggregated category analysis
CREATE TABLE IF NOT EXISTS mgmt_product_groups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT,
    code TEXT,
    total_sales NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    report_month TEXT,
    branch TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Financial ledger (manual revenue/expense entries)
CREATE TABLE IF NOT EXISTS financial_ledger (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date TIMESTAMPTZ,
    amount NUMERIC DEFAULT 0,
    category TEXT,
    entry_type TEXT,
    verified BOOLEAN DEFAULT false,
    is_confidential BOOLEAN DEFAULT false,
    excluded BOOLEAN DEFAULT false,
    receipt_url TEXT,
    branch TEXT,
    description TEXT,
    notes TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Receipt/image storage
CREATE TABLE IF NOT EXISTS image_storage (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    file TEXT,
    tool_reference TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- HR employee profiles
CREATE TABLE IF NOT EXISTS hr_employees (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    emp_id TEXT UNIQUE,
    name TEXT NOT NULL,
    department TEXT,
    sex TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Daily attendance logs
CREATE TABLE IF NOT EXISTS hr_attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT,
    date TIMESTAMPTZ,
    status TEXT,
    store TEXT,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Leave management
CREATE TABLE IF NOT EXISTS hr_leaves (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    type TEXT,
    reason TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- MUNGKHUDSHOP TABLES
-- ═══════════════════════════════════════════

-- Custom auth users (MungkhudShop login)
CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    branch_id TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Lookup values (province, bank, prefix, etc.)
CREATE TABLE IF NOT EXISTS lookups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT,
    is_active BOOLEAN DEFAULT true,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Branch locations
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    tax_id TEXT,
    branch TEXT,
    address TEXT,
    phone TEXT,
    status TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    credit_limit NUMERIC DEFAULT 0,
    points NUMERIC DEFAULT 0,
    address TEXT,
    tax_id TEXT,
    credit_days NUMERIC DEFAULT 0,
    "group" TEXT,
    branch_id TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    plate_number TEXT NOT NULL,
    province TEXT,
    brand TEXT,
    model TEXT,
    year NUMERIC,
    color TEXT,
    mileage NUMERIC,
    customer_id TEXT,
    chassis_number TEXT,
    engine_type TEXT,
    size TEXT,
    branch_id TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Product brands
CREATE TABLE IF NOT EXISTS product_brands (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Product groups (shop-side)
CREATE TABLE IF NOT EXISTS product_groups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    price NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    barcode TEXT,
    unit TEXT,
    vendor_id TEXT,
    factory_code TEXT,
    brand_id TEXT,
    group_id TEXT,
    min_stock NUMERIC DEFAULT 0,
    min_qty NUMERIC DEFAULT 0,
    max_qty NUMERIC,
    location TEXT,
    is_track_stock BOOLEAN DEFAULT true,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Vendors / Suppliers
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    address TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Jobs (vehicle service orders)
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_no TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    plate TEXT NOT NULL,
    is_red_plate BOOLEAN DEFAULT false,
    model TEXT,
    mileage NUMERIC,
    chassis TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    subtotal NUMERIC DEFAULT 0,
    discount_pct NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    payment_type TEXT,
    notes TEXT,
    branch_id TEXT,
    technician TEXT,
    repair_details TEXT,
    vat_enabled BOOLEAN DEFAULT false,
    vat_mode TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Job line items
CREATE TABLE IF NOT EXISTS job_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    qty NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    product_name TEXT,
    unit TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Documents (invoices, quotations, receipts, etc.)
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    doc_no TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    ref_no TEXT,
    entity_id TEXT,
    status TEXT DEFAULT 'pending',
    issue_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    subtotal NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    notes TEXT,
    branch_id TEXT,
    discount_amount NUMERIC DEFAULT 0,
    payment_type TEXT,
    vat_enabled BOOLEAN DEFAULT false,
    vat_mode TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Document line items
CREATE TABLE IF NOT EXISTS document_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    qty NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    product_name TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Stock ledger (journal-based inventory)
CREATE TABLE IF NOT EXISTS stock_ledgers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transaction_no TEXT,
    transaction_type TEXT,
    product_id TEXT NOT NULL,
    warehouse_location TEXT DEFAULT 'Main',
    qty NUMERIC DEFAULT 0,
    unit_cost NUMERIC DEFAULT 0,
    total_value NUMERIC DEFAULT 0,
    reference_doc TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Shop settings
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    prefix_job TEXT,
    prefix_qt TEXT,
    prefix_iv TEXT,
    prefix_rc TEXT,
    vat_rate NUMERIC DEFAULT 7,
    default_vat_enabled BOOLEAN DEFAULT false,
    default_vat_mode TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- App-level key-value settings
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Favorite products (quick-add panel)
CREATE TABLE IF NOT EXISTS favorite_products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id TEXT,
    group_name TEXT NOT NULL,
    product_id TEXT NOT NULL,
    sort_order NUMERIC DEFAULT 0,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Job evaluations (repair quality)
CREATE TABLE IF NOT EXISTS job_evaluations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT NOT NULL,
    rating NUMERIC,
    comment TEXT,
    evaluated_by TEXT,
    evaluated_at TIMESTAMPTZ,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- Job payments (multi-payment support)
CREATE TABLE IF NOT EXISTS job_payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    ref_no TEXT,
    bank_name TEXT,
    created TIMESTAMPTZ DEFAULT now(),
    updated TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- AUTO-UPDATE TRIGGER for 'updated' column
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER update_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_column()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- ═══════════════════════════════════════════
-- INDEXES for common query patterns
-- ═══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_transactions_job_id ON transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch ON transactions(branch);
CREATE INDEX IF NOT EXISTS idx_service_items_job_id ON service_items(job_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_branch ON financial_ledger(branch);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_entry_type ON financial_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_branch_id ON jobs(branch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_job_no ON jobs(job_no);
CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_branch_id ON documents(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledgers_product_id ON stock_ledgers(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledgers_reference_doc ON stock_ledgers(reference_doc);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
