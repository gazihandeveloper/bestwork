-- 0004_admin_audit.sql
-- Yönetim paneli genişletmesi:
--  1) Silinemez admin denetim logları (audit_logs)
--  2) Cüzdan hareket defteri (wallet_transactions) + bloke bakiyesi
--  3) Sipariş lojistik alanları (order_type, tracking_code, admin_note)
--  4) KYC belge kuyruğu (kyc_documents)

-- 1) Denetim (audit) logları
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    admin_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL DEFAULT '',
    target_id BIGINT,
    reason TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id);

-- 2) Cüzdan hareket defteri (ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(30) NOT NULL,
    reason TEXT,
    admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions (wallet_id, created_at DESC);

-- 3) Cüzdan bloke bakiyesi
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blocked_balance DECIMAL(15,2) NOT NULL DEFAULT 0;

-- 4) Sipariş lojistik alanları (başlangıç paketi vs perakende ayrımı dahil)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'retail';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 5) KYC belge kuyruğu
CREATE TABLE IF NOT EXISTS kyc_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL,
    file_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_documents (status, submitted_at);
