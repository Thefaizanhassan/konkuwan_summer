-- ============================================================================
-- KONKUWAN HERBS – COMPLETE SUPABASE SCHEMA (v2.0)
-- Run this in your Supabase SQL editor
-- ============================================================================

-- Required extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILE TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(120),
  email       VARCHAR(255),
  avatar_url  VARCHAR(500),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  role        VARCHAR(50)  NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('super_admin','product_manager','order_manager','farm_manager','viewer')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  parent_id   INT          REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- PRODUCTS
-- ============================================================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(220) NOT NULL UNIQUE,
  botanical_name  VARCHAR(255),
  description     TEXT,
  forms           VARCHAR(255),
  price_min       DECIMAL(12,2),
  price_max       DECIMAL(12,2),
  unit            VARCHAR(50)  DEFAULT 'kg',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- PRODUCT IMAGES
-- ============================================================================
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(255),
  is_primary  BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- PRODUCT <-> CATEGORY (M:N)
-- ============================================================================
CREATE TABLE product_category (
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id INT  NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- ============================================================================
-- INVENTORY (optional lot‑level tracking)
-- ============================================================================
CREATE TABLE inventory (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_number    VARCHAR(100),
  quantity      DECIMAL(12,3) NOT NULL,
  unit          VARCHAR(50)   NOT NULL DEFAULT 'kg',
  harvest_date  DATE,
  quality_grade VARCHAR(20),
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name    VARCHAR(200) NOT NULL,
  contact_person  VARCHAR(120),
  email           VARCHAR(255),
  phone           VARCHAR(20),
  address         TEXT,
  gstin           VARCHAR(30),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID        NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  status           VARCHAR(30) NOT NULL DEFAULT 'draft',
  total_amount     DECIMAL(14,2),
  final_note       TEXT,
  created_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     DECIMAL(12,3) NOT NULL,
  unit         VARCHAR(50)   NOT NULL DEFAULT 'kg',
  unit_price   DECIMAL(12,2) NOT NULL,
  final_price  DECIMAL(14,2),
  line_total   DECIMAL(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================================
-- PRICING HISTORY
-- ============================================================================
CREATE TABLE pricing_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_min      DECIMAL(12,2),
  price_max      DECIMAL(12,2),
  effective_date DATE         NOT NULL DEFAULT CURRENT_DATE,
  changed_by     UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   VARCHAR(100),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SETTINGS (key‑value)
-- ============================================================================
CREATE TABLE settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- FARM OPERATIONS TABLES
-- ============================================================================

CREATE TABLE crop_setups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id       VARCHAR(50) NOT NULL,
  planting_date DATE,
  pop_json      JSONB,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crop_observations (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id   VARCHAR(50) NOT NULL,
  date      DATE NOT NULL,
  week      INT,
  health    VARCHAR(20),
  pest      VARCHAR(50),
  water     VARCHAR(50),
  growth    VARCHAR(50),
  note      TEXT,
  logged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('expense','revenue')),
  date          DATE NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  category      VARCHAR(50),
  description   TEXT,
  logged_by_name VARCHAR(120),
  logged_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE farmers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  village       VARCHAR(200),
  block         VARCHAR(200),
  crop          VARCHAR(50),
  area_decimal  NUMERIC(7,2),
  seed_date     DATE,
  phone         VARCHAR(20),
  enrolled_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE farmer_visits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id   UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      VARCHAR(50),
  note        TEXT,
  visited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cash_balance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount      DECIMAL(14,2) NOT NULL,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE war_room_briefs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_ref     VARCHAR(50),
  brief_json   JSONB NOT NULL,
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_products_slug         ON products(slug);
CREATE INDEX idx_products_is_active    ON products(is_active);
CREATE INDEX idx_products_created_at   ON products(created_at);
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_orders_customer       ON orders(customer_id);
CREATE INDEX idx_orders_status         ON orders(status);
CREATE INDEX idx_orders_date           ON orders(order_date);
CREATE INDEX idx_order_items_order     ON order_items(order_id);
CREATE INDEX idx_pricing_history_product ON pricing_history(product_id);
CREATE INDEX idx_pricing_history_date    ON pricing_history(effective_date);
CREATE INDEX idx_audit_logs_timestamp    ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity       ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_profiles_email          ON profiles(email);
CREATE INDEX idx_crop_obs_crop_date      ON crop_observations(crop_id, date);
CREATE INDEX idx_expenses_date           ON expenses(date);
CREATE INDEX idx_farmers_crop            ON farmers(crop);
CREATE INDEX idx_farmer_visits_date      ON farmer_visits(date);

-- ============================================================================
-- ROW LEVEL SECURITY (ALL TABLES)
-- ============================================================================

-- Helper: enable RLS on all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Simplest policy: allow all operations for authenticated users
-- (Backend uses service key, but this prevents anonymous access)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    -- Create policy if it doesn't exist
    EXECUTE format('
      CREATE POLICY "Allow all for authenticated" ON %I
        FOR ALL TO authenticated
        USING (true)
        WITH CHECK (true)
    ', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Sample categories (same as original)
INSERT INTO categories (name, slug, description) VALUES
  ('Adaptogens', 'adaptogens', 'Stress-relieving herbs'),
  ('Immunity & Liver', 'immunity-liver', 'Immune boosters and liver support'),
  ('Digestive & Spices', 'spices', 'Culinary and digestive herbs'),
  ('Seeds & Superfoods', 'seeds-superfoods', 'Nutrient-dense seeds and leaves');

-- IMPORTANT: The default super admin profile must be created AFTER the user
-- has been created via Supabase Auth (e.g., admin@konkuwanherbs.com).
-- Run the following AFTER signing up the admin user:

-- INSERT INTO public.profiles (id, name, email, role)
-- SELECT id, 'Super Admin', email, 'super_admin'
-- FROM auth.users WHERE email = 'admin@konkuwanherbs.com';

-- below code is created from clauce
-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('super_admin', 'product_manager', 'order_manager', 'farm_manager', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Service role can read all profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (TRUE);

CREATE POLICY "Super admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ran on 10th june 2026 to create super admin
SELECT
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'thefaizanhassan@gmail.com';

SELECT *
FROM public.profiles
WHERE id = (
    SELECT id
    FROM auth.users
    WHERE email = 'thefaizanhassan@gmail.com'
);

UPDATE public.profiles
SET
    role = 'super_admin',
    is_active = TRUE,
    updated_at = NOW()
WHERE email = 'thefaizanhassan@gmail.com';

-- This script is safe whether the profile already exists or not
INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    is_active
)
SELECT
    id,
    'Faizan Hassan',
    email,
    'super_admin',
    TRUE
FROM auth.users
WHERE email = 'thefaizanhassan@gmail.com'
ON CONFLICT (id)
DO UPDATE SET
    role = 'super_admin',
    email = EXCLUDED.email,
    is_active = TRUE,
    updated_at = NOW();

-- query ran on 12th june to update the cutomer table with fields lead_status and linkdin_url
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS lead_status VARCHAR(30) NOT NULL DEFAULT 'active_customer'
    CHECK (lead_status IN ('active_customer','potential_lead')),
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_customers_lead_status ON customers(lead_status);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500);

INSERT INTO storage.buckets (id, name, public) VALUES ('receipts','receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipts_auth_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');


-- query ran on 13th june
-- 1. profiles table keyed to Supabase auth users
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  role       text not null default 'viewer'
             check (role in ('super_admin','product_manager','order_manager','farm_manager','viewer')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. backfill any existing auth users that have no profile row
insert into public.profiles (id, email, name)
select u.id, u.email, split_part(u.email, '@', 1)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 3. auto-create a profile whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. RLS: a logged-in user can read (and the app reads) their own profile
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- 5. promote YOUR account to super_admin (use your login email)
update public.profiles set role = 'super_admin', is_active = true
where email = 'admin@konkuwanherbs.com';

-- ============================================================================
-- Migration 2026-07-10: contact submissions + settings seed (AI provider, EMI)
-- Run this in your Supabase SQL editor.
-- ============================================================================

-- Contact form submissions (public /contact page → admin Inquiries inbox)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('buyer','investor')),
  name        VARCHAR(120) NOT NULL,
  company     VARCHAR(200),
  product     VARCHAR(255),
  quantity    VARCHAR(100),
  interest    VARCHAR(50),
  message     TEXT,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  status      VARCHAR(20)  NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','read','replied','archived')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status  ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_type    ON contact_submissions(type);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at);

-- Only the backend (service key) touches this table; block anon/authenticated direct access.
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Seed default settings (safe to re-run; existing values are kept)
INSERT INTO settings (key, value) VALUES
  ('ai_provider',        'claude'),
  ('ai_model_claude',    'claude-sonnet-4-20250514'),
  ('ai_model_openai',    'gpt-4o-mini'),
  ('emi_monthly_amount', '646532'),
  ('emi_start_date',     '2026-06-01'),
  ('emi_label',          'HBF EMI'),
  ('company_name',       'Konkuwan Herbs'),
  ('company_email',      'info@konkuwanherbs.com'),
  ('company_phone',      '+91 8809 227099'),
  ('company_address',    'Baseli Sahi, Puri, Odisha 752001'),
  ('invoice_due_days',   '30'),
  ('invoice_tax_percent','0')
ON CONFLICT (key) DO NOTHING;



-- ============================================================================
-- Migration 2026-07-11: product tags + farm coverage targets
-- Run this in your Supabase SQL editor.
-- ============================================================================
 
-- Comma-separated marketing tags shown on the public product page
-- (e.g. "Food processing, Ayurvedic, Export"). The "Available" badge is NOT
-- a tag — it is derived automatically from products.is_active.
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags VARCHAR(500);
 
-- Farmer coverage targets, editable from Farm Ops → Farmers → Edit targets.
-- Stored as JSON: { "<crop-slug>": <target-number>, ... }
INSERT INTO settings (key, value) VALUES ('farm_targets', '{}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Migration 2026-07-11b: product ordering, CropOS fixes, farmer types
-- Run this in your Supabase SQL editor.
-- ============================================================================

-- 1. Product display order (drag-and-drop in admin, reflected on the website)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Give existing products a stable initial order (oldest first)
UPDATE products p
SET sort_order = sub.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM products) sub
WHERE p.id = sub.id;

-- 2. FIX for "Generate POP not working":
--    crop_setups.crop_id had NO unique constraint, so the backend's
--    upsert(..., { onConflict: 'crop_id' }) failed every time — the planting
--    date was never saved, and POP generation then reported
--    "Planting date not set". Dedupe any rows created meanwhile, then add
--    the constraint the upsert needs.
DELETE FROM crop_setups a
USING crop_setups b
WHERE a.crop_id = b.crop_id AND a.ctid < b.ctid;

ALTER TABLE crop_setups DROP CONSTRAINT IF EXISTS crop_setups_crop_id_key;
ALTER TABLE crop_setups ADD CONSTRAINT crop_setups_crop_id_key UNIQUE (crop_id);

-- 3. Dynamic cultivated area per crop (editable in CropOS)
ALTER TABLE crop_setups ADD COLUMN IF NOT EXISTS area_acres NUMERIC(8,2);

-- 4. Farmer types: independent vs connected/contract farmers
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS farmer_type VARCHAR(20) NOT NULL DEFAULT 'connected';


-- ============================================================================
-- Migration 2026-07-12: quotations, invoice numbering, HSN, shipping,
--                        delivery challans, and invoice/bank settings
-- Run this in your Supabase SQL editor.
-- ============================================================================
 
-- 1. Orders: stored quotation & invoice numbers (so they're stable and
--    sequential), quotation/invoice dates, and shipping charges.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quotation_date   DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number   VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_date     DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_charges DECIMAL(12,2) NOT NULL DEFAULT 0;
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_quotation_number ON orders(quotation_number) WHERE quotation_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_invoice_number   ON orders(invoice_number)   WHERE invoice_number IS NOT NULL;
 
-- 2. Products: HSN/SAC code shown on the invoice line items.
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
 
-- 3. Delivery Challan module — purchases from farmers before inventory update.
CREATE TABLE IF NOT EXISTS delivery_challans (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_number       VARCHAR(40) NOT NULL UNIQUE,
  challan_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  farmer_id            UUID        REFERENCES farmers(id) ON DELETE SET NULL,
  farmer_name          VARCHAR(120),                 -- snapshot for history
  challan_charges      DECIMAL(12,2) NOT NULL DEFAULT 0,  -- pickup/transport/loading etc.
  goods_value          DECIMAL(14,2) NOT NULL DEFAULT 0,  -- sum of line totals
  total_value          DECIMAL(14,2) NOT NULL DEFAULT 0,  -- goods + charges
  notes                TEXT,
  created_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
 
CREATE TABLE IF NOT EXISTS challan_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_id     UUID          NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
  product_id     UUID          REFERENCES products(id) ON DELETE SET NULL,
  product_name   VARCHAR(200),                 -- snapshot / free text crop name
  quantity       DECIMAL(12,3) NOT NULL,
  unit           VARCHAR(50)   NOT NULL DEFAULT 'kg',
  purchase_rate  DECIMAL(12,2) NOT NULL,
  line_total     DECIMAL(14,2) GENERATED ALWAYS AS (quantity * purchase_rate) STORED,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
 
CREATE INDEX IF NOT EXISTS idx_challans_date        ON delivery_challans(challan_date);
CREATE INDEX IF NOT EXISTS idx_challans_farmer      ON delivery_challans(farmer_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON challan_items(challan_id);
 
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challan_items    ENABLE ROW LEVEL SECURITY;
 
-- 4. Settings: company PAN, bank details (shown on invoice), and default
--    invoice/quotation terms. Tax % and due days already exist from an
--    earlier migration; seeded here only if missing.
INSERT INTO settings (key, value) VALUES
  ('company_pan',        'AAHCK3264E'),
  ('bank_account_name',  'Konkuwan Herbs'),
  ('bank_account_number','918020104026689'),
  ('bank_ifsc',          'UTIB0000464'),
  ('bank_account_type',  'Current'),
  ('bank_name',          'Axis Bank'),
  ('invoice_terms',      '20% advance payment to be made at the time of booking, rest 80% after LR has been generated.|Transportation and packaging will be extra'),
  ('quotation_terms',    'GST and transportation will be extra|50% advance payment, rest 50% at the time of dispatch. 100% advance payment for seeds/planting materials'),
  ('invoice_tax_percent','18'),
  ('invoice_due_days',   '30')
ON CONFLICT (key) DO NOTHING;



-- ============================================================================
-- Migration 2026-07-13: per-user admin panel language (English / Odia)
-- Run this in your Supabase SQL editor.
-- ============================================================================
 
-- Language preference for the admin panel. 'en' = English, 'or' = Odia (ଓଡ଼ିଆ).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
 
-- Existing users keep English until they change it in Account settings.
UPDATE public.profiles SET language = 'en' WHERE language IS NULL;



-- ============================================================================
-- Migration 2026-08-02
--   1. warehouses               (new entity)
--   2. farmers.address          (auto-filled onto challans)
--   3. delivery_challans        challan_type + warehouse columns + farmer_address
--
-- Run in the Supabase SQL editor. Safe to re-run: every statement guards
-- itself, so re-applying is a no-op.
-- ============================================================================
 
-- ── 1. Warehouses ───────────────────────────────────────────────────────────
-- A managed list, not an inventory engine. Stock balances per warehouse are a
-- later phase; today a warehouse is a place a challan moves goods to or from.
CREATE TABLE IF NOT EXISTS public.warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(20),
  address     TEXT,
  city        VARCHAR(120),
  state       VARCHAR(120),
  pincode     VARCHAR(12),
  contact_person VARCHAR(120),
  phone       VARCHAR(20),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
 
-- Two warehouses may not share a name; case-insensitive so "Main" and "main"
-- cannot both exist and confuse a dropdown.
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_name_unique
  ON public.warehouses (lower(name));
 
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON public.warehouses (is_active);
 
-- ── 2. Farmer address ───────────────────────────────────────────────────────
-- Challans need a postal address. `village` and `block` were never meant to be
-- one, so add a real column and let the API fall back to "village, block" for
-- farmers enrolled before it existed.
ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS address TEXT;
 
-- ── 3. Delivery challans ────────────────────────────────────────────────────
-- Two workflows now share the table:
--   farmer_to_warehouse    procurement — farmer supplies, a warehouse receives
--   warehouse_transfer     stock moved between two warehouses
ALTER TABLE public.delivery_challans
  ADD COLUMN IF NOT EXISTS challan_type VARCHAR(32) NOT NULL DEFAULT 'farmer_to_warehouse',
  ADD COLUMN IF NOT EXISTS farmer_address TEXT,
  ADD COLUMN IF NOT EXISTS source_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS destination_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT;
 
-- Every existing row is a farmer procurement, which the DEFAULT above already
-- applied. Stated explicitly so re-running after a manual edit re-normalises.
UPDATE public.delivery_challans
  SET challan_type = 'farmer_to_warehouse'
  WHERE challan_type IS NULL OR challan_type = '';
 
DO $$
BEGIN
  -- Only the two known types, and each type must carry the fields it needs:
  -- a transfer needs both warehouses and they must differ; a procurement needs
  -- a farmer, either linked or named.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_challans_type_shape'
  ) THEN
    ALTER TABLE public.delivery_challans
      ADD CONSTRAINT delivery_challans_type_shape CHECK (
        (
          challan_type = 'farmer_to_warehouse'
          AND (farmer_id IS NOT NULL OR farmer_name IS NOT NULL)
        )
        OR (
          challan_type = 'warehouse_transfer'
          AND source_warehouse_id IS NOT NULL
          AND destination_warehouse_id IS NOT NULL
          AND source_warehouse_id <> destination_warehouse_id
        )
      );
  END IF;
END $$;
 
CREATE INDEX IF NOT EXISTS idx_challans_type ON public.delivery_challans (challan_type);
CREATE INDEX IF NOT EXISTS idx_challans_dest_wh ON public.delivery_challans (destination_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_challans_src_wh ON public.delivery_challans (source_warehouse_id);
 
-- ── 4. Seed ─────────────────────────────────────────────────────────────────
-- One warehouse so the module is usable immediately. Rename it in
-- Admin → Warehouses; the id stays stable, so challans keep pointing at it.
INSERT INTO public.warehouses (name, city, state, notes)
SELECT 'Main Warehouse', 'Jagdalpur', 'Chhattisgarh',
       'Created by migration 2026-08-02. Rename or deactivate as needed.'
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses);

-- ============================================================================
-- Migration 2026-08-03
--   1. order_items: allow a custom (off-catalogue) product
--   2. profiles: stakeholder dashboard permissions
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================
 
-- ── 1. Custom products on orders ────────────────────────────────────────────
-- A one-off or seasonal crop can be sold without being added to the catalogue.
-- `challan_items` already worked this way; orders now match it.
--
-- product_id becomes nullable and product_name carries the free-text name.
-- Existing rows are untouched: they keep their product_id and get a NULL name,
-- and every reader prefers the joined product when it is present.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(200);
 
ALTER TABLE public.order_items
  ALTER COLUMN product_id DROP NOT NULL;
 
DO $$
BEGIN
  -- A line must identify its product one way or the other, or an invoice would
  -- print a blank row.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_identified'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_identified CHECK (
        product_id IS NOT NULL OR (product_name IS NOT NULL AND btrim(product_name) <> '')
      );
  END IF;
END $$;
 
-- ── 2. Stakeholder dashboard permissions ────────────────────────────────────
-- Which dashboard widgets a stakeholder may see. NULL means "not a stakeholder,
-- no restriction"; an empty array means a stakeholder who has been granted
-- nothing yet, which is deliberately different from NULL.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB;
 
COMMENT ON COLUMN public.profiles.dashboard_widgets IS
  'Widget keys a stakeholder may view. NULL = unrestricted (normal staff roles).';
 
-- Existing roles are unaffected: they keep NULL and remain unrestricted.