-- 0005_rbac_jobs_flashout.sql
-- 1) RBAC: super_admin rolü (ağaç/para onayı yalnız bu role açılır)
-- 2) Asenkron iş kayıtları (job_runs) — bonus toplu çalıştırma ilerlemesi
-- 3) Flashout/cap ihlal logları (flashout_logs)

-- 1) Role kısıtını genişlet: super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'customer', 'super_admin'));

-- Mevcut tek yönetici hesabını süper yöneticiye yükselt (idempotent)
UPDATE users SET role = 'super_admin' WHERE id = 1 AND role = 'admin';

-- 2) Asenkron iş kayıtları
CREATE TABLE IF NOT EXISTS job_runs (
    id BIGSERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    progress INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    error TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON job_runs (status, created_at DESC);

-- 3) Flashout/cap ihlal logları
CREATE TABLE IF NOT EXISTS flashout_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL,
    limit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    earned_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    capped_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flashout_logs_user ON flashout_logs (user_id, created_at DESC);
