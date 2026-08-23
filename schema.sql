CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    referral_bonus_rate DECIMAL(5,2) NOT NULL CHECK (referral_bonus_rate BETWEEN 0 AND 1),
    binary_bonus_rate DECIMAL(5,2) NOT NULL CHECK (binary_bonus_rate BETWEEN 0 AND 1),
    matching_bonus_rate DECIMAL(5,2) NOT NULL CHECK (matching_bonus_rate BETWEEN 0 AND 1),
    discount_rate DECIMAL(5,2) DEFAULT 0 CHECK (discount_rate BETWEEN 0 AND 1),
    required_pv BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ranks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    required_left_pv BIGINT NOT NULL,
    required_right_pv BIGINT NOT NULL,
    monthly_binary_limit DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    member_code VARCHAR(10) UNIQUE NOT NULL CHECK (member_code ~ '^TR90[0-9]{6}$'),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user','customer')),
    password_hash TEXT NOT NULL,
    sponsor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    parent_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    position CHAR(1) CHECK (position IN ('L','R')),
    package_id INT REFERENCES packages(id),
    is_active BOOLEAN DEFAULT FALSE,
    is_in_pending_pool BOOLEAN DEFAULT TRUE,
    pending_since TIMESTAMP,
    current_rank_id INT REFERENCES ranks(id),
    total_pv_left BIGINT DEFAULT 0,
    total_pv_right BIGINT DEFAULT 0,
    total_cv_left BIGINT DEFAULT 0,
    total_cv_right BIGINT DEFAULT 0,
    total_pv_accumulated BIGINT NOT NULL DEFAULT 0,
    total_cv_accumulated BIGINT NOT NULL DEFAULT 0,
    current_month_binary_earned DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT users_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE UNIQUE INDEX users_binary_position_idx
ON users (parent_id, position)
WHERE parent_id IS NOT NULL AND position IS NOT NULL;

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    pv BIGINT NOT NULL,
    cv BIGINT NOT NULL,
    stock INT DEFAULT 0,
    description TEXT,
    image_path VARCHAR(255),
    category VARCHAR(50),
    sku VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(15,2) NOT NULL,
    total_pv BIGINT NOT NULL,
    total_cv BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending','paid','shipped','cancelled')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'kredi_karti' CHECK (payment_method IN ('kredi_karti','eft_havale')),
    effects_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    pv BIGINT NOT NULL,
    cv BIGINT NOT NULL
);

CREATE TABLE pending_pool (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sponsor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_placed BOOLEAN DEFAULT FALSE,
    placed_at TIMESTAMP,
    placed_under_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    placed_position CHAR(1) CHECK (placed_position IN ('L','R')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE commissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(20) CHECK (type IN ('referral','binary','matching','retail')),
    amount DECIMAL(15,2) NOT NULL,
    related_cv BIGINT,
    related_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending','paid','cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0,
    total_withdrawn DECIMAL(15,2) DEFAULT 0,
    chip_balance DECIMAL(15,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE withdraw_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 750),
    method VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE TABLE rank_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank_id INT NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE chip_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('credit','debit')),
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO packages (id, name, price, referral_bonus_rate, binary_bonus_rate, matching_bonus_rate, discount_rate, required_pv) VALUES
(1, 'Starter', 250.00,  0.15, 0.04, 0.20, 0.00, 250),
(2, 'Bronze',  500.00,  0.15, 0.07, 0.20, 0.00, 500),
(3, 'Gümüş',   1300.00, 0.20, 0.09, 0.20, 0.00, 1300),
(4, 'Altın',   2500.00, 0.20, 0.11, 0.20, 0.00, 2500),
(5, 'Platin',  5000.00, 0.22, 0.13, 0.20, 0.25, 5000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ranks (id, name, required_left_pv, required_right_pv, monthly_binary_limit) VALUES
(1, 'Jade', 5000, 5000, 6000.00),
(2, 'Pearl', 15000, 15000, 20000.00),
(3, 'Safir', 50000, 50000, 60000.00),
(4, 'Ruby', 100000, 100000, 150000.00),
(5, 'Zümrüt', 250000, 250000, 225000.00),
(6, 'Diamond', 500000, 500000, 350000.00),
(7, 'Blue Diamond', 1000000, 1000000, 500000.00),
(8, 'Green Diamond', 2500000, 2500000, 1000000.00),
(9, 'Red Diamond', 5000000, 5000000, 1250000.00),
(10, 'Black Diamond', 7500000, 7500000, 2000000.00),
(11, 'President', 10000000, 10000000, 2500000.00),
(12, 'Ambassador', 12500000, 12500000, 3500000.00)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE monthly_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    job_month CHAR(7) NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (job_type, job_month)
);

CREATE TABLE bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    iban VARCHAR(34) NOT NULL CHECK (length(iban) BETWEEN 15 AND 34),
    account_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE beneficiaries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE binary_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position CHAR(1) CHECK (position IN ('L','R')),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('add','deduct','reset')),
    pv BIGINT NOT NULL DEFAULT 0,
    cv BIGINT NOT NULL DEFAULT 0,
    description VARCHAR(255),
    related_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    bank_name VARCHAR(100),
    reference_no VARCHAR(100),
    note TEXT,
    file_path VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX payment_notifications_active_order_idx
ON payment_notifications (order_id)
WHERE order_id IS NOT NULL AND status IN ('pending', 'approved');

CREATE TABLE hero_slides (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    subtitle VARCHAR(255),
    image_path VARCHAR(255) NOT NULL,
    link VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE benefits (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    icon VARCHAR(30) NOT NULL DEFAULT 'shipping',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO benefits (title, description, icon, sort_order) VALUES
('Kargo Bedava', '500 TL ve üzeri siparişlerde', 'shipping', 1),
('Güvenli Ödeme', 'Kredi kartı ve EFT/HAVALE', 'payment', 2),
('PV/CV Puan', 'Her ürün seviye atlatır', 'pv', 3),
('7/24 Destek', 'Her zaman yanınızdayız', 'support', 4);

CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
('corporate_title', 'Kurumsal'),
('corporate_description', 'BestWork, Binary MLM komisyon sistemi ile e-ticareti tek çatıda buluşturan modern bir platformdur.'),
('corporate_address', 'İstanbul, Türkiye'),
('corporate_phone', '0850 000 00 00'),
('corporate_email', 'destek@bestwork.com'),
('corporate_hours', 'Pzt - Cmt: 09.00 - 18.00')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    surname VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at TIMESTAMP DEFAULT NOW()
);
