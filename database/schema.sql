-- ============================================================================
-- Konkuwan Herbs Database Schema
-- Version: 1.0
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- NO NEED TO CREATE THIS AS SUPABASE HANDLES USERS
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS TABLE (admin users)
-- ─────────────────────────────────────────────────────────────────────────────
-- NO NEED TO CREATE THIS AS SUPABASE HANDLES USERS
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url    VARCHAR(500),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER_ROLES (many-to-many)
-- ─────────────────────────────────────────────────────────────────────────────
-- NO NEED TO CREATE THIS AS SUPABASE HANDLES USERS
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT  NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    parent_id   INT          REFERENCES categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(220) NOT NULL UNIQUE,
    botanical_name  VARCHAR(255),
    description     TEXT,
    forms           VARCHAR(255),           -- e.g. "Sliced dried · Whole dried"
    price_min       DECIMAL(12,2),          -- minimum price range (INR)
    price_max       DECIMAL(12,2),          -- maximum price range (INR)
    unit            VARCHAR(50)  DEFAULT 'kg', -- e.g. kg, MT, ton
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT_IMAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_images (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url         VARCHAR(500) NOT NULL,
    alt_text    VARCHAR(255),
    is_primary  BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT_CATEGORY (M:N)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_category (
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id INT  NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INVENTORY (optional: lot-level tracking)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE inventory (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id    UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    lot_number    VARCHAR(100),
    quantity      DECIMAL(12,3) NOT NULL,
    unit          VARCHAR(50)   NOT NULL DEFAULT 'kg',
    harvest_date  DATE,
    quality_grade VARCHAR(20),  -- e.g. A, B, Premium
    notes         TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name    VARCHAR(200) NOT NULL,
    contact_person  VARCHAR(120),
    email           VARCHAR(255),
    phone           VARCHAR(20),
    address         TEXT,
    gstin           VARCHAR(30),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id      UUID        NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
    status           VARCHAR(30) NOT NULL DEFAULT 'draft',  -- draft, confirmed, dispatched, delivered, cancelled
    total_amount     DECIMAL(14,2),
    final_note       TEXT,       -- admin notes on final negotiation
    created_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    updated_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER_ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_items (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id     UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity     DECIMAL(12,3) NOT NULL,
    unit         VARCHAR(50)   NOT NULL DEFAULT 'kg',
    unit_price   DECIMAL(12,2) NOT NULL,   -- price at time of order (could be within range)
    final_price  DECIMAL(14,2),           -- final negotiated line total (quantity * final_unit_price)
    line_total   DECIMAL(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PRICING_HISTORY (for dynamic pricing analytics)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE pricing_history (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id     UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_min      DECIMAL(12,2),
    price_max      DECIMAL(12,2),
    effective_date DATE         NOT NULL DEFAULT CURRENT_DATE,
    changed_by     UUID         REFERENCES users(id) ON DELETE SET NULL,
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT_LOGS (for admin activity tracking)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(50) NOT NULL,   -- CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type VARCHAR(50) NOT NULL,   -- product, order, user, etc.
    entity_id   VARCHAR(100),
    old_values  JSONB,
    new_values  JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SETTINGS (key-value store for system configuration)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Product images
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- Orders
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);

-- Order items
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Pricing history
CREATE INDEX idx_pricing_history_product ON pricing_history(product_id);
CREATE INDEX idx_pricing_history_date ON pricing_history(effective_date);

-- Audit logs
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Users
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- SEED DATA (initial roles, default super admin password: Admin@123)
-- ============================================================================
INSERT INTO roles (name, description) VALUES
    ('super_admin', 'Full system access'),
    ('product_manager', 'Manage products, categories, inventory'),
    ('order_manager', 'Manage orders, customers'),
    ('viewer', 'Read-only access to admin panel');

-- Password hash for 'Admin@123' (bcrypt, cost 10)
-- You can generate this with a script; placeholder:
INSERT INTO users (name, email, password_hash, is_active) VALUES
    ('Super Admin', 'admin@konkuwanherbs.com', '$2b$10$...' , TRUE);
-- assign role
INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id FROM users u, roles r
    WHERE u.email = 'admin@konkuwanherbs.com' AND r.name = 'super_admin';

-- Example category
INSERT INTO categories (name, slug, description) VALUES
    ('Adaptogens', 'adaptogens', 'Stress-relieving herbs'),
    ('Immunity & Liver', 'immunity-liver', 'Immune boosters and liver support'),
    ('Digestive & Spices', 'spices', 'Culinary and digestive herbs'),
    ('Seeds & Superfoods', 'seeds-superfoods', 'Nutrient-dense seeds and leaves');

-- ============================================================================
-- Konkuwan Herbs Database Schema
-- Version: 2.0
-- ============================================================================

-- New Tables for Farm Operations

-- Enable UUID generation if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crop Setups (one per crop, per farm project)
CREATE TABLE crop_setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id VARCHAR(50) NOT NULL,          -- 'musli', 'ginger', 'moringa', 'shatavari'
  planting_date DATE,
  pop_json JSONB,                        -- stores latest POP { week, text, date }
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crop Observations
CREATE TABLE crop_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  week INT,
  health VARCHAR(20),                    -- Excellent, Good, Fair, Poor
  pest VARCHAR(50),                      -- No, Yes-minor, Yes-serious
  water VARCHAR(50),                     -- Good, Too dry, Waterlogged
  growth VARCHAR(50),                    -- On track, Faster, Slower, No growth
  note TEXT,
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses (both expenses and revenues)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense','revenue')),
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(50),                  -- labour, procurement, etc. (revenue if type='revenue')
  description TEXT,
  logged_by_name VARCHAR(120),           -- free text to capture team member name
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Farmers enrolled
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  village VARCHAR(200),
  block VARCHAR(200),
  crop VARCHAR(50),                      -- 'moringa', 'mucuna', 'ginger', 'musli'
  area_decimal NUMERIC(7,2),             -- area in decimal
  seed_date DATE,
  phone VARCHAR(20),
  enrolled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Farmer Visits
CREATE TABLE farmer_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50),                    -- Excellent, Good, Fair, Poor-needs help, Not planted
  note TEXT,
  visited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cash Balance (single row to track total cash across accounts)
CREATE TABLE cash_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(14,2) NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- War Room Briefs (store generated briefs)
CREATE TABLE war_room_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_ref VARCHAR(50),
  brief_json JSONB NOT NULL,
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_crop_obs_crop_date ON crop_observations(crop_id, date);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_farmers_crop ON farmers(crop);
CREATE INDEX idx_farmer_visits_date ON farmer_visits(date);

-- RLS Policies (for direct client‑side queries optional, but we keep API‑centric)
-- Enable RLS on all new tables
ALTER TABLE crop_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_room_briefs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select/insert/update/delete (simplified)
CREATE POLICY "Allow all for authenticated users" ON crop_setups FOR ALL TO authenticated USING (true);
-- Repeat for other tables...