-- ================================================================
-- ShopSphere — E-Commerce Database (Supabase / PostgreSQL)
-- CS F212 Database Systems | BITS Pilani Dubai
-- Group of 6 → 20 Tables | 7 Views | 7 Functions
--              14 Triggers | 9 Stored Procedures
-- Converted from MySQL 8 → PostgreSQL 15 (Supabase)
-- ================================================================

-- Defer FK checks during setup
SET session_replication_role = 'replica';

-- ================================================================
-- ENUM TYPES
-- ================================================================
DO $$ BEGIN
  CREATE TYPE user_role        AS ENUM ('customer','admin','vendor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_type_enum AS ENUM ('percentage','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status     AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method   AS ENUM ('credit_card','debit_card','paypal','bank_transfer','cash_on_delivery','apple_pay','google_pay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status   AS ENUM ('pending','completed','failed','refunded','partially_refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_type       AS ENUM ('order_update','promo','restock','review_reply','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action     AS ENUM ('INSERT','UPDATE','DELETE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- HELPER: auto-update updated_at column
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ================================================================
-- TABLE 1: CATEGORIES  (self-referencing for sub-categories)
-- ================================================================
CREATE TABLE IF NOT EXISTS CATEGORIES (
  category_id  SERIAL        PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL UNIQUE,
  parent_id    INT           DEFAULT NULL,
  description  TEXT,
  icon_url     VARCHAR(300),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id)
    REFERENCES CATEGORIES(category_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_cat_parent ON CATEGORIES(parent_id);
CREATE INDEX IF NOT EXISTS idx_cat_active ON CATEGORIES(is_active);

-- ================================================================
-- TABLE 2: USERS
-- ================================================================
CREATE TABLE IF NOT EXISTS USERS (
  user_id       SERIAL        PRIMARY KEY,
  email         VARCHAR(191)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(150)  NOT NULL,
  phone         VARCHAR(25),
  role          user_role     NOT NULL DEFAULT 'customer',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ   DEFAULT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_role   ON USERS(role);
CREATE INDEX IF NOT EXISTS idx_user_active ON USERS(is_active);

-- ================================================================
-- TABLE 3: ADDRESSES
-- ================================================================
CREATE TABLE IF NOT EXISTS ADDRESSES (
  address_id   SERIAL        PRIMARY KEY,
  user_id      INT           NOT NULL,
  label        VARCHAR(50)   DEFAULT 'Home',
  full_name    VARCHAR(150)  NOT NULL,
  street       VARCHAR(255)  NOT NULL,
  city         VARCHAR(100)  NOT NULL,
  state        VARCHAR(100),
  country      VARCHAR(100)  NOT NULL DEFAULT 'UAE',
  postal_code  VARCHAR(20),
  is_default   BOOLEAN       NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id)
    REFERENCES USERS(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_addr_user ON ADDRESSES(user_id);

-- ================================================================
-- TABLE 4: BRANDS
-- ================================================================
CREATE TABLE IF NOT EXISTS BRANDS (
  brand_id     SERIAL        PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL UNIQUE,
  country      VARCHAR(100),
  website      VARCHAR(300),
  logo_url     VARCHAR(300),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ================================================================
-- TABLE 5: PRODUCTS
-- ================================================================
CREATE TABLE IF NOT EXISTS PRODUCTS (
  product_id    SERIAL          PRIMARY KEY,
  category_id   INT             NOT NULL,
  brand_id      INT             DEFAULT NULL,
  name          VARCHAR(255)    NOT NULL,
  slug          VARCHAR(300)    NOT NULL UNIQUE,
  description   TEXT,
  price         DECIMAL(10,2)   NOT NULL,
  compare_price DECIMAL(10,2)   DEFAULT NULL,
  stock_qty     INT             NOT NULL DEFAULT 0,
  sku           VARCHAR(100)    UNIQUE,
  weight_kg     DECIMAL(6,3)    DEFAULT NULL,
  avg_rating    DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  review_count  INT             NOT NULL DEFAULT 0,
  is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
  is_featured   BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_prod_cat   FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id),
  CONSTRAINT fk_prod_brand FOREIGN KEY (brand_id)    REFERENCES BRANDS(brand_id) ON DELETE SET NULL,
  CONSTRAINT chk_price     CHECK (price >= 0),
  CONSTRAINT chk_stock     CHECK (stock_qty >= 0),
  CONSTRAINT chk_rating    CHECK (avg_rating BETWEEN 0 AND 5)
);
CREATE INDEX IF NOT EXISTS idx_prod_cat      ON PRODUCTS(category_id);
CREATE INDEX IF NOT EXISTS idx_prod_brand    ON PRODUCTS(brand_id);
CREATE INDEX IF NOT EXISTS idx_prod_price    ON PRODUCTS(price);
CREATE INDEX IF NOT EXISTS idx_prod_rating   ON PRODUCTS(avg_rating);
CREATE INDEX IF NOT EXISTS idx_prod_active   ON PRODUCTS(is_active);
CREATE INDEX IF NOT EXISTS idx_prod_featured ON PRODUCTS(is_featured);
-- Full-text search (replaces MySQL FULLTEXT INDEX)
CREATE INDEX IF NOT EXISTS idx_prod_fts ON PRODUCTS
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON PRODUCTS
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- TABLE 6: PRODUCT_IMAGES
-- ================================================================
CREATE TABLE IF NOT EXISTS PRODUCT_IMAGES (
  image_id     SERIAL        PRIMARY KEY,
  product_id   INT           NOT NULL,
  url          VARCHAR(500)  NOT NULL,
  alt_text     VARCHAR(200),
  is_primary   BOOLEAN       NOT NULL DEFAULT FALSE,
  sort_order   INT           NOT NULL DEFAULT 0,
  CONSTRAINT fk_img_prod FOREIGN KEY (product_id)
    REFERENCES PRODUCTS(product_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_img_prod ON PRODUCT_IMAGES(product_id);

-- ================================================================
-- TABLE 7: PRODUCT_ATTRIBUTES  (EAV)
-- ================================================================
CREATE TABLE IF NOT EXISTS PRODUCT_ATTRIBUTES (
  attr_id      SERIAL        PRIMARY KEY,
  product_id   INT           NOT NULL,
  attr_name    VARCHAR(100)  NOT NULL,
  attr_value   VARCHAR(255)  NOT NULL,
  CONSTRAINT fk_attr_prod FOREIGN KEY (product_id)
    REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
  UNIQUE (product_id, attr_name)
);
CREATE INDEX IF NOT EXISTS idx_attr_prod ON PRODUCT_ATTRIBUTES(product_id);

-- ================================================================
-- TABLE 8: COUPONS
-- ================================================================
CREATE TABLE IF NOT EXISTS COUPONS (
  coupon_id      SERIAL          PRIMARY KEY,
  code           VARCHAR(50)     NOT NULL UNIQUE,
  description    VARCHAR(255),
  type           coupon_type_enum NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2)   NOT NULL,
  min_order_amt  DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  max_discount   DECIMAL(10,2)   DEFAULT NULL,
  expires_at     DATE            NOT NULL,
  max_uses       INT             NOT NULL DEFAULT 100,
  used_count     INT             NOT NULL DEFAULT 0,
  is_active      BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_discount_val CHECK (discount_value > 0)
);
CREATE INDEX IF NOT EXISTS idx_coupon_active  ON COUPONS(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_expires ON COUPONS(expires_at);

-- ================================================================
-- TABLE 9: ORDERS
-- ================================================================
CREATE TABLE IF NOT EXISTS ORDERS (
  order_id        SERIAL          PRIMARY KEY,
  user_id         INT             NOT NULL,
  address_id      INT             NOT NULL,
  coupon_id       INT             DEFAULT NULL,
  subtotal        DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  discount_amt    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  shipping_fee    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  tax_amt         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  status          order_status    NOT NULL DEFAULT 'pending',
  shipping_method VARCHAR(100)    DEFAULT 'Standard',
  tracking_no     VARCHAR(100)    DEFAULT NULL,
  notes           TEXT,
  ordered_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ord_user   FOREIGN KEY (user_id)    REFERENCES USERS(user_id),
  CONSTRAINT fk_ord_addr   FOREIGN KEY (address_id) REFERENCES ADDRESSES(address_id),
  CONSTRAINT fk_ord_coupon FOREIGN KEY (coupon_id)  REFERENCES COUPONS(coupon_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ord_user   ON ORDERS(user_id);
CREATE INDEX IF NOT EXISTS idx_ord_status ON ORDERS(status);
CREATE INDEX IF NOT EXISTS idx_ord_date   ON ORDERS(ordered_at);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON ORDERS
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- TABLE 10: ORDER_ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
  item_id      SERIAL          PRIMARY KEY,
  order_id     INT             NOT NULL,
  product_id   INT             NOT NULL,
  quantity     INT             NOT NULL,
  unit_price   DECIMAL(10,2)   NOT NULL,
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES ORDERS(order_id)   ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id),
  CONSTRAINT chk_oi_qty    CHECK (quantity > 0),
  UNIQUE (order_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_oi_product ON ORDER_ITEMS(product_id);

-- ================================================================
-- TABLE 11: PAYMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS PAYMENTS (
  payment_id   SERIAL           PRIMARY KEY,
  order_id     INT              NOT NULL UNIQUE,
  method       payment_method   NOT NULL,
  status       payment_status   NOT NULL DEFAULT 'pending',
  amount       DECIMAL(10,2)    NOT NULL,
  txn_ref      VARCHAR(150)     DEFAULT NULL,
  gateway_resp TEXT             DEFAULT NULL,
  paid_at      TIMESTAMPTZ      DEFAULT NULL,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id)
    REFERENCES ORDERS(order_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pay_status ON PAYMENTS(status);
CREATE INDEX IF NOT EXISTS idx_pay_method ON PAYMENTS(method);

-- ================================================================
-- TABLE 12: REVIEWS
-- ================================================================
CREATE TABLE IF NOT EXISTS REVIEWS (
  review_id     SERIAL        PRIMARY KEY,
  user_id       INT           NOT NULL,
  product_id    INT           NOT NULL,
  order_id      INT           NOT NULL,
  rating        SMALLINT      NOT NULL,
  title         VARCHAR(200),
  comment       TEXT,
  is_verified   BOOLEAN       NOT NULL DEFAULT TRUE,
  helpful_count INT           NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_rev_user    FOREIGN KEY (user_id)    REFERENCES USERS(user_id)    ON DELETE CASCADE,
  CONSTRAINT fk_rev_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_order   FOREIGN KEY (order_id)   REFERENCES ORDERS(order_id),
  CONSTRAINT chk_rev_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_rev_product ON REVIEWS(product_id);
CREATE INDEX IF NOT EXISTS idx_rev_rating  ON REVIEWS(rating);

-- ================================================================
-- TABLE 13: CART_ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS CART_ITEMS (
  cart_id      SERIAL        PRIMARY KEY,
  user_id      INT           NOT NULL,
  product_id   INT           NOT NULL,
  quantity     INT           NOT NULL DEFAULT 1,
  added_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_cart_user    FOREIGN KEY (user_id)    REFERENCES USERS(user_id)    ON DELETE CASCADE,
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_qty    CHECK (quantity > 0),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_user ON CART_ITEMS(user_id);

-- ================================================================
-- TABLE 14: WISHLISTS
-- ================================================================
CREATE TABLE IF NOT EXISTS WISHLISTS (
  wishlist_id  SERIAL        PRIMARY KEY,
  user_id      INT           NOT NULL,
  product_id   INT           NOT NULL,
  added_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_wish_user    FOREIGN KEY (user_id)    REFERENCES USERS(user_id)    ON DELETE CASCADE,
  CONSTRAINT fk_wish_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_user ON WISHLISTS(user_id);

-- ================================================================
-- TABLE 15: AUDIT_LOG
-- ================================================================
CREATE TABLE IF NOT EXISTS AUDIT_LOG (
  log_id       SERIAL        PRIMARY KEY,
  table_name   VARCHAR(60)   NOT NULL,
  record_id    INT           NOT NULL,
  action       audit_action  NOT NULL,
  changed_by   INT           DEFAULT NULL,
  old_value    JSONB         DEFAULT NULL,
  new_value    JSONB         DEFAULT NULL,
  ip_address   VARCHAR(45)   DEFAULT NULL,
  changed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_table  ON AUDIT_LOG(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON AUDIT_LOG(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_date   ON AUDIT_LOG(changed_at);

-- ================================================================
-- TABLE 16: NOTIFICATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS NOTIFICATIONS (
  notif_id     SERIAL        PRIMARY KEY,
  user_id      INT           NOT NULL,
  type         notif_type    NOT NULL DEFAULT 'system',
  title        VARCHAR(200)  NOT NULL,
  body         TEXT,
  is_read      BOOLEAN       NOT NULL DEFAULT FALSE,
  ref_id       INT           DEFAULT NULL,
  ref_type     VARCHAR(50)   DEFAULT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
    REFERENCES USERS(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notif_user   ON NOTIFICATIONS(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON NOTIFICATIONS(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_date   ON NOTIFICATIONS(created_at);

-- ================================================================
-- TABLE 17: SHIPPING_ZONES
-- ================================================================
CREATE TABLE IF NOT EXISTS SHIPPING_ZONES (
  zone_id      SERIAL          PRIMARY KEY,
  zone_name    VARCHAR(100)    NOT NULL,
  country      VARCHAR(100)    NOT NULL DEFAULT 'UAE',
  emirate      VARCHAR(100)    DEFAULT NULL,
  base_fee     DECIMAL(10,2)   NOT NULL DEFAULT 10.00,
  express_fee  DECIMAL(10,2)   NOT NULL DEFAULT 25.00,
  free_above   DECIMAL(10,2)   DEFAULT NULL,
  est_days     SMALLINT        NOT NULL DEFAULT 3,
  is_active    BOOLEAN         NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_sz_country ON SHIPPING_ZONES(country);
CREATE INDEX IF NOT EXISTS idx_sz_active  ON SHIPPING_ZONES(is_active);

-- ================================================================
-- TABLE 18: TAGS
-- ================================================================
CREATE TABLE IF NOT EXISTS TAGS (
  tag_id       SERIAL       PRIMARY KEY,
  name         VARCHAR(80)  NOT NULL UNIQUE,
  slug         VARCHAR(90)  NOT NULL UNIQUE,
  color_hex    CHAR(7)      DEFAULT '#3B82F6'
);

-- ================================================================
-- TABLE 19: PRODUCT_TAGS  (M:N junction)
-- ================================================================
CREATE TABLE IF NOT EXISTS PRODUCT_TAGS (
  product_id   INT           NOT NULL,
  tag_id       INT           NOT NULL,
  tagged_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY  (product_id, tag_id),
  CONSTRAINT fk_pt_product FOREIGN KEY (product_id)
    REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_tag FOREIGN KEY (tag_id)
    REFERENCES TAGS(tag_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pt_tag ON PRODUCT_TAGS(tag_id);

-- ================================================================
-- TABLE 20: ORDER_STATUS_HISTORY
-- ================================================================
CREATE TABLE IF NOT EXISTS ORDER_STATUS_HISTORY (
  history_id   SERIAL        PRIMARY KEY,
  order_id     INT           NOT NULL,
  prev_status  VARCHAR(30)   NOT NULL,
  new_status   VARCHAR(30)   NOT NULL,
  changed_by   INT           DEFAULT NULL,
  comment      VARCHAR(255)  DEFAULT NULL,
  changed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id)
    REFERENCES ORDERS(order_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_osh_order ON ORDER_STATUS_HISTORY(order_id);
CREATE INDEX IF NOT EXISTS idx_osh_date  ON ORDER_STATUS_HISTORY(changed_at);

-- Re-enable FK checks
SET session_replication_role = 'origin';

-- ================================================================
-- VIEWS
-- ================================================================

-- View 1: Complete product catalog
CREATE OR REPLACE VIEW vw_product_catalog AS
SELECT
  p.product_id,
  p.name           AS product_name,
  p.slug,
  p.description,
  p.price,
  p.compare_price,
  ROUND(((p.compare_price - p.price) / p.compare_price) * 100) AS discount_pct,
  p.stock_qty,
  p.avg_rating,
  p.review_count,
  p.is_featured,
  p.is_active,
  c.category_id,
  c.name           AS category_name,
  pc.name          AS parent_category,
  b.name           AS brand_name,
  b.country        AS brand_country,
  pi.url           AS primary_image,
  p.created_at
FROM PRODUCTS p
JOIN  CATEGORIES c   ON p.category_id  = c.category_id
LEFT JOIN CATEGORIES pc ON c.parent_id = pc.category_id
LEFT JOIN BRANDS b   ON p.brand_id     = b.brand_id
LEFT JOIN PRODUCT_IMAGES pi
  ON pi.product_id = p.product_id AND pi.is_primary = TRUE;

-- View 2: Order summary with customer, address, payment
CREATE OR REPLACE VIEW vw_order_summary AS
SELECT
  o.order_id,
  o.status,
  o.subtotal,
  o.discount_amt,
  o.shipping_fee,
  o.tax_amt,
  o.total_amount,
  o.ordered_at,
  o.tracking_no,
  u.user_id,
  u.full_name      AS customer_name,
  u.email,
  u.phone,
  (a.street || ', ' || a.city || ', ' || a.country) AS delivery_address,
  COUNT(oi.item_id) AS item_count,
  py.method        AS payment_method,
  py.status        AS payment_status
FROM ORDERS o
JOIN USERS       u  ON o.user_id    = u.user_id
JOIN ADDRESSES   a  ON o.address_id = a.address_id
JOIN ORDER_ITEMS oi ON o.order_id   = oi.order_id
LEFT JOIN PAYMENTS py ON o.order_id = py.order_id
GROUP BY o.order_id, o.status, o.subtotal, o.discount_amt,
         o.shipping_fee, o.tax_amt, o.total_amount, o.ordered_at,
         o.tracking_no, u.user_id, u.full_name, u.email, u.phone,
         a.street, a.city, a.country, py.method, py.status;

-- View 3: Revenue breakdown by category
CREATE OR REPLACE VIEW vw_revenue_by_category AS
SELECT
  c.category_id,
  c.name                                     AS category_name,
  pc.name                                    AS parent_category,
  COUNT(DISTINCT o.order_id)                 AS total_orders,
  SUM(oi.quantity)                           AS units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM ORDER_ITEMS oi
JOIN PRODUCTS   p  ON oi.product_id = p.product_id
JOIN CATEGORIES c  ON p.category_id = c.category_id
LEFT JOIN CATEGORIES pc ON c.parent_id = pc.category_id
JOIN ORDERS     o  ON oi.order_id   = o.order_id
WHERE o.status NOT IN ('cancelled','refunded')
GROUP BY c.category_id, c.name, pc.name;

-- View 4: Low-stock alert (<= 10 units)
CREATE OR REPLACE VIEW vw_low_stock AS
SELECT
  p.product_id,
  p.name,
  p.sku,
  c.name   AS category_name,
  b.name   AS brand_name,
  p.stock_qty,
  p.price
FROM PRODUCTS p
JOIN CATEGORIES c ON p.category_id = c.category_id
LEFT JOIN BRANDS b ON p.brand_id    = b.brand_id
WHERE p.stock_qty <= 10 AND p.is_active = TRUE
ORDER BY p.stock_qty ASC;

-- View 5: Customer lifetime value (CLV)
CREATE OR REPLACE VIEW vw_customer_ltv AS
SELECT
  u.user_id,
  u.full_name,
  u.email,
  u.phone,
  u.created_at                                 AS member_since,
  COUNT(DISTINCT o.order_id)                   AS total_orders,
  COALESCE(SUM(o.total_amount), 0)             AS lifetime_value,
  COALESCE(AVG(o.total_amount), 0)             AS avg_order_value,
  MAX(o.ordered_at)                            AS last_order_date,
  COALESCE(COUNT(DISTINCT r.review_id), 0)     AS reviews_written
FROM USERS u
LEFT JOIN ORDERS  o ON u.user_id = o.user_id  AND o.status NOT IN ('cancelled','refunded')
LEFT JOIN REVIEWS r ON u.user_id = r.user_id
WHERE u.role = 'customer'
GROUP BY u.user_id, u.full_name, u.email, u.phone, u.created_at;

-- View 6: Products with their tags
CREATE OR REPLACE VIEW vw_product_tags AS
SELECT
  p.product_id,
  p.name          AS product_name,
  p.price,
  p.avg_rating,
  STRING_AGG(t.name, ', ' ORDER BY t.name) AS tags
FROM PRODUCTS p
JOIN PRODUCT_TAGS pt ON p.product_id = pt.product_id
JOIN TAGS        t   ON pt.tag_id    = t.tag_id
WHERE p.is_active = TRUE
GROUP BY p.product_id, p.name, p.price, p.avg_rating;

-- View 7: Unread notification counts per user
CREATE OR REPLACE VIEW vw_unread_notifications AS
SELECT
  u.user_id,
  u.full_name,
  u.email,
  COUNT(n.notif_id)                                        AS total_notifications,
  SUM(CASE WHEN n.is_read = FALSE THEN 1 ELSE 0 END)      AS unread_count,
  MAX(n.created_at)                                        AS latest_notif_at
FROM USERS u
LEFT JOIN NOTIFICATIONS n ON u.user_id = n.user_id
WHERE u.is_active = TRUE
GROUP BY u.user_id, u.full_name, u.email;

-- ================================================================
-- STORED FUNCTIONS  (PL/pgSQL)
-- ================================================================

-- Function 1: Calculate discounted price given % or fixed coupon
CREATE OR REPLACE FUNCTION fn_apply_coupon(
  p_subtotal     DECIMAL(10,2),
  p_type         TEXT,
  p_discount_val DECIMAL(10,2),
  p_max_discount DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_disc DECIMAL(10,2);
BEGIN
  IF p_type = 'percentage' THEN
    v_disc := ROUND(p_subtotal * p_discount_val / 100, 2);
    IF p_max_discount IS NOT NULL AND v_disc > p_max_discount THEN
      v_disc := p_max_discount;
    END IF;
  ELSE
    v_disc := p_discount_val;
  END IF;
  IF v_disc > p_subtotal THEN v_disc := p_subtotal; END IF;
  RETURN v_disc;
END;
$$;

-- Function 1b: Generic % discount helper
CREATE OR REPLACE FUNCTION fn_discounted_price(
  p_price DECIMAL(10,2),
  p_pct   DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_price IS NULL THEN RETURN NULL; END IF;
  IF p_pct IS NULL OR p_pct <= 0 THEN RETURN p_price; END IF;
  IF p_pct >= 100 THEN RETURN 0.00; END IF;
  RETURN ROUND(p_price * (1 - (p_pct / 100)), 2);
END;
$$;

-- Function 2: Get cart subtotal for a user
CREATE OR REPLACE FUNCTION fn_cart_subtotal(p_user_id INT)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(ci.quantity * p.price), 0)
  INTO   v_total
  FROM   CART_ITEMS ci
  JOIN   PRODUCTS   p ON ci.product_id = p.product_id
  WHERE  ci.user_id = p_user_id;
  RETURN v_total;
END;
$$;

-- Function 3: Validate coupon — returns discount amount or 0
CREATE OR REPLACE FUNCTION fn_validate_coupon(p_code VARCHAR(50), p_subtotal DECIMAL(10,2))
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_type   TEXT;
  v_val    DECIMAL(10,2);
  v_max    DECIMAL(10,2);
  v_minord DECIMAL(10,2);
  v_found  INT := 0;
BEGIN
  SELECT 1, type::TEXT, discount_value, max_discount, min_order_amt
  INTO   v_found, v_type, v_val, v_max, v_minord
  FROM   COUPONS
  WHERE  code = p_code AND is_active = TRUE
    AND  expires_at >= CURRENT_DATE AND used_count < max_uses
  LIMIT  1;

  IF v_found = 0 OR p_subtotal < COALESCE(v_minord, 0) THEN RETURN 0; END IF;
  RETURN fn_apply_coupon(p_subtotal, v_type, v_val, v_max);
END;
$$;

-- Function 4: Get total orders count for a customer
CREATE OR REPLACE FUNCTION fn_customer_order_count(p_user_id INT)
RETURNS INT
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_cnt INT;
BEGIN
  SELECT COUNT(*) INTO v_cnt FROM ORDERS
  WHERE user_id = p_user_id AND status NOT IN ('cancelled','refunded');
  RETURN v_cnt;
END;
$$;

-- Function 5: Calculate shipping fee based on order weight
CREATE OR REPLACE FUNCTION fn_shipping_fee(p_total_weight DECIMAL(8,3))
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF    p_total_weight <= 0     THEN RETURN 0.00;
  ELSIF p_total_weight <= 1.0   THEN RETURN 10.00;
  ELSIF p_total_weight <= 5.0   THEN RETURN 20.00;
  ELSIF p_total_weight <= 10.0  THEN RETURN 35.00;
  ELSE                               RETURN 50.00;
  END IF;
END;
$$;

-- Function 6: Lookup shipping zone fee by emirate
CREATE OR REPLACE FUNCTION fn_zone_shipping_fee(
  p_emirate    VARCHAR(100),
  p_is_express BOOLEAN
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_fee DECIMAL(10,2) := 10.00;
BEGIN
  SELECT CASE WHEN p_is_express THEN express_fee ELSE base_fee END
  INTO   v_fee
  FROM   SHIPPING_ZONES
  WHERE  emirate = p_emirate AND is_active = TRUE
  LIMIT  1;
  RETURN COALESCE(v_fee, CASE WHEN p_is_express THEN 25.00 ELSE 10.00 END);
END;
$$;

-- Function 7: Calculate VAT-inclusive price (UAE 5%)
CREATE OR REPLACE FUNCTION fn_price_with_vat(p_price DECIMAL(10,2))
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN ROUND(p_price * 1.05, 2);
END;
$$;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Trigger 1 & 2: BEFORE INSERT ORDER_ITEMS — check stock, AFTER — deduct
CREATE OR REPLACE FUNCTION trg_fn_check_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_stock INT;
BEGIN
  SELECT stock_qty INTO v_stock FROM PRODUCTS WHERE product_id = NEW.product_id;
  IF v_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for this product';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_check_stock_before_order
  BEFORE INSERT ON ORDER_ITEMS
  FOR EACH ROW EXECUTE FUNCTION trg_fn_check_stock();

CREATE OR REPLACE FUNCTION trg_fn_deduct_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE PRODUCTS SET stock_qty = stock_qty - NEW.quantity
  WHERE product_id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_deduct_stock_after_order
  AFTER INSERT ON ORDER_ITEMS
  FOR EACH ROW EXECUTE FUNCTION trg_fn_deduct_stock();

-- Trigger 3: AFTER UPDATE ORDERS (status → cancelled) — restore stock
CREATE OR REPLACE FUNCTION trg_fn_restore_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status NOT IN ('cancelled','refunded') THEN
    UPDATE PRODUCTS p
    SET    stock_qty = p.stock_qty + oi.quantity
    FROM   ORDER_ITEMS oi
    WHERE  p.product_id = oi.product_id AND oi.order_id = NEW.order_id;

    INSERT INTO AUDIT_LOG (table_name, record_id, action, old_value, new_value)
    VALUES ('ORDERS', NEW.order_id, 'UPDATE',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'note', 'stock restored'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE ON ORDERS
  FOR EACH ROW EXECUTE FUNCTION trg_fn_restore_stock_on_cancel();

-- Triggers 4, 5, 6: REVIEWS — update avg_rating + review_count
CREATE OR REPLACE FUNCTION trg_fn_update_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_pid INT;
BEGIN
  v_pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE PRODUCTS
  SET avg_rating   = COALESCE((SELECT AVG(rating) FROM REVIEWS WHERE product_id = v_pid), 0),
      review_count = (SELECT COUNT(*) FROM REVIEWS WHERE product_id = v_pid)
  WHERE product_id = v_pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trg_update_rating_on_insert
  AFTER INSERT ON REVIEWS FOR EACH ROW EXECUTE FUNCTION trg_fn_update_rating();

CREATE OR REPLACE TRIGGER trg_update_rating_on_update
  AFTER UPDATE ON REVIEWS FOR EACH ROW EXECUTE FUNCTION trg_fn_update_rating();

CREATE OR REPLACE TRIGGER trg_update_rating_on_delete
  AFTER DELETE ON REVIEWS FOR EACH ROW EXECUTE FUNCTION trg_fn_update_rating();

-- Trigger 7: AFTER INSERT ORDERS — increment coupon used_count
CREATE OR REPLACE FUNCTION trg_fn_increment_coupon_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.coupon_id IS NOT NULL THEN
    UPDATE COUPONS SET used_count = used_count + 1 WHERE coupon_id = NEW.coupon_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_increment_coupon_usage
  AFTER INSERT ON ORDERS FOR EACH ROW EXECUTE FUNCTION trg_fn_increment_coupon_usage();

-- Trigger 8: BEFORE INSERT PRODUCTS — auto-generate slug from name
CREATE OR REPLACE FUNCTION trg_fn_auto_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REPLACE(REPLACE(REPLACE(NEW.name, ' ', '-'), '/', '-'), '"', ''));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auto_slug_on_insert
  BEFORE INSERT ON PRODUCTS FOR EACH ROW EXECUTE FUNCTION trg_fn_auto_slug();

-- Trigger 9: AFTER INSERT PRODUCTS — audit
CREATE OR REPLACE FUNCTION trg_fn_audit_product_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO AUDIT_LOG (table_name, record_id, action, new_value)
  VALUES ('PRODUCTS', NEW.product_id, 'INSERT',
    jsonb_build_object('name', NEW.name, 'price', NEW.price, 'stock', NEW.stock_qty));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_audit_product_insert
  AFTER INSERT ON PRODUCTS FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_product_insert();

-- Trigger 10: AFTER UPDATE PRODUCTS — audit price/stock changes
CREATE OR REPLACE FUNCTION trg_fn_audit_product_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.price != NEW.price OR OLD.stock_qty != NEW.stock_qty THEN
    INSERT INTO AUDIT_LOG (table_name, record_id, action, old_value, new_value)
    VALUES ('PRODUCTS', NEW.product_id, 'UPDATE',
      jsonb_build_object('price', OLD.price, 'stock', OLD.stock_qty),
      jsonb_build_object('price', NEW.price, 'stock', NEW.stock_qty));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_audit_product_update
  AFTER UPDATE ON PRODUCTS FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_product_update();

-- Trigger 11: BEFORE INSERT ADDRESSES — ensure only one default per user
CREATE OR REPLACE FUNCTION trg_fn_single_default_address()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    IF EXISTS (SELECT 1 FROM ADDRESSES WHERE user_id = NEW.user_id AND is_default = TRUE) THEN
      NEW.is_default := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_single_default_address
  BEFORE INSERT ON ADDRESSES FOR EACH ROW EXECUTE FUNCTION trg_fn_single_default_address();

-- Trigger 12: AFTER INSERT USERS — audit new registrations
CREATE OR REPLACE FUNCTION trg_fn_audit_user_register()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO AUDIT_LOG (table_name, record_id, action, new_value)
  VALUES ('USERS', NEW.user_id, 'INSERT',
    jsonb_build_object('email', NEW.email, 'role', NEW.role));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_audit_user_register
  AFTER INSERT ON USERS FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_user_register();

-- Trigger 13: AFTER UPDATE ORDERS — record status history + notify
CREATE OR REPLACE FUNCTION trg_fn_order_status_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO ORDER_STATUS_HISTORY (order_id, prev_status, new_status)
    VALUES (NEW.order_id, OLD.status::TEXT, NEW.status::TEXT);

    INSERT INTO NOTIFICATIONS (user_id, type, title, body, ref_id, ref_type)
    VALUES (NEW.user_id, 'order_update',
      'Order #' || NEW.order_id || ' — ' || NEW.status,
      'Your order status changed from ' || OLD.status || ' to ' || NEW.status || '.',
      NEW.order_id, 'orders');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_order_status_history
  AFTER UPDATE ON ORDERS FOR EACH ROW EXECUTE FUNCTION trg_fn_order_status_history();

-- Trigger 14: AFTER UPDATE PRODUCTS — notify wishlist users when restocked
CREATE OR REPLACE FUNCTION trg_fn_notify_restock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.stock_qty = 0 AND NEW.stock_qty > 0 THEN
    INSERT INTO NOTIFICATIONS (user_id, type, title, body, ref_id, ref_type)
    SELECT w.user_id, 'restock',
      NEW.name || ' is back in stock!',
      'Grab it before it sells out — only ' || NEW.stock_qty || ' left.',
      NEW.product_id, 'products'
    FROM WISHLISTS w
    WHERE w.product_id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_notify_restock
  AFTER UPDATE ON PRODUCTS FOR EACH ROW EXECUTE FUNCTION trg_fn_notify_restock();

-- ================================================================
-- STORED PROCEDURES  (PostgreSQL functions)
-- ================================================================

-- Procedure 1: Full checkout
CREATE OR REPLACE FUNCTION sp_place_order(
  p_user_id      INT,
  p_address_id   INT,
  p_coupon_code  VARCHAR(50),
  p_pay_method   payment_method,
  p_ship_method  VARCHAR(100),
  OUT p_order_id INT,
  OUT p_message  VARCHAR(255)
)
LANGUAGE plpgsql AS $$
DECLARE
  v_coupon_id    INT          := NULL;
  v_coupon_type  TEXT         := 'percentage';
  v_coupon_val   DECIMAL(10,2) := 0;
  v_coupon_max   DECIMAL(10,2) := NULL;
  v_coupon_min   DECIMAL(10,2) := 0;
  v_subtotal     DECIMAL(10,2);
  v_discount     DECIMAL(10,2) := 0;
  v_weight       DECIMAL(8,3)  := 0;
  v_shipping     DECIMAL(10,2) := 0;
  v_tax          DECIMAL(10,2);
  v_total        DECIMAL(10,2);
  v_cart_count   INT;
  rec            RECORD;
BEGIN
  -- 1. Validate cart not empty
  SELECT COUNT(*) INTO v_cart_count FROM CART_ITEMS WHERE user_id = p_user_id;
  IF v_cart_count = 0 THEN
    p_order_id := -1; p_message := 'Cart is empty'; RETURN;
  END IF;

  -- 2. Validate address belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM ADDRESSES WHERE address_id = p_address_id AND user_id = p_user_id
  ) THEN
    p_order_id := -1; p_message := 'Invalid delivery address'; RETURN;
  END IF;

  -- 3. Resolve coupon
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) != '' THEN
    SELECT coupon_id, type::TEXT, discount_value, max_discount, min_order_amt
    INTO   v_coupon_id, v_coupon_type, v_coupon_val, v_coupon_max, v_coupon_min
    FROM   COUPONS
    WHERE  code = p_coupon_code AND is_active = TRUE
      AND  expires_at >= CURRENT_DATE AND used_count < max_uses
    LIMIT  1;
    IF v_coupon_id IS NULL THEN
      p_order_id := -1; p_message := 'Invalid or expired coupon'; RETURN;
    END IF;
  END IF;

  -- 4. Calculate subtotal
  v_subtotal := fn_cart_subtotal(p_user_id);

  -- 5. Validate min order for coupon
  IF v_coupon_id IS NOT NULL AND v_subtotal < v_coupon_min THEN
    p_order_id := -1;
    p_message  := 'Minimum order of AED ' || v_coupon_min || ' required for this coupon';
    RETURN;
  END IF;

  -- 6. Calculate discount
  IF v_coupon_id IS NOT NULL THEN
    v_discount := fn_apply_coupon(v_subtotal, v_coupon_type, v_coupon_val, v_coupon_max);
  END IF;

  -- 7. Weight-based shipping
  SELECT COALESCE(SUM(ci.quantity * COALESCE(p.weight_kg, 0.5)), 0)
  INTO   v_weight
  FROM   CART_ITEMS ci JOIN PRODUCTS p ON ci.product_id = p.product_id
  WHERE  ci.user_id = p_user_id;
  v_shipping := fn_shipping_fee(v_weight);
  IF p_ship_method = 'Express' THEN v_shipping := v_shipping * 2; END IF;

  -- 8. VAT 5%
  v_tax   := ROUND((v_subtotal - v_discount) * 0.05, 2);
  v_total := v_subtotal - v_discount + v_shipping + v_tax;

  -- 9. Insert order
  INSERT INTO ORDERS
    (user_id, address_id, coupon_id, subtotal, discount_amt, shipping_fee, tax_amt, total_amount, status, shipping_method)
  VALUES
    (p_user_id, p_address_id, v_coupon_id, v_subtotal, v_discount, v_shipping, v_tax, v_total, 'confirmed', p_ship_method)
  RETURNING order_id INTO p_order_id;

  -- 10. Copy cart to order items (trg_check_stock_before_order fires here)
  FOR rec IN
    SELECT ci.product_id, ci.quantity, p.price
    FROM CART_ITEMS ci
    JOIN PRODUCTS p ON ci.product_id = p.product_id
    WHERE ci.user_id = p_user_id
  LOOP
    INSERT INTO ORDER_ITEMS (order_id, product_id, quantity, unit_price)
    VALUES (p_order_id, rec.product_id, rec.quantity, rec.price);
  END LOOP;

  -- 11. Create payment record
  INSERT INTO PAYMENTS (order_id, method, status, amount)
  VALUES (p_order_id, p_pay_method, 'pending', v_total);

  -- 12. Clear cart
  DELETE FROM CART_ITEMS WHERE user_id = p_user_id;

  p_message := 'Order #' || p_order_id || ' placed successfully. Total: AED ' || v_total;

EXCEPTION WHEN OTHERS THEN
  p_order_id := -1;
  p_message  := SQLERRM;
  RAISE;
END;
$$;

-- Procedure 2: Admin dashboard KPIs
CREATE OR REPLACE FUNCTION sp_dashboard_stats()
RETURNS TABLE (
  total_customers   BIGINT,
  total_orders      BIGINT,
  total_revenue     DECIMAL,
  active_products   BIGINT,
  pending_orders    BIGINT,
  low_stock_count   BIGINT,
  total_reviews     BIGINT,
  avg_order_value   DECIMAL,
  items_in_carts    BIGINT,
  revenue_last_30d  DECIMAL
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*)  FROM USERS    WHERE role='customer' AND is_active=TRUE),
    (SELECT COUNT(*)  FROM ORDERS   WHERE status NOT IN ('cancelled','refunded')),
    (SELECT COALESCE(SUM(total_amount),0) FROM ORDERS WHERE status='delivered'),
    (SELECT COUNT(*)  FROM PRODUCTS WHERE is_active=TRUE),
    (SELECT COUNT(*)  FROM ORDERS   WHERE status='pending'),
    (SELECT COUNT(*)  FROM PRODUCTS WHERE stock_qty<=10 AND is_active=TRUE),
    (SELECT COUNT(*)  FROM REVIEWS),
    (SELECT COALESCE(AVG(total_amount),0) FROM ORDERS WHERE status NOT IN ('cancelled','refunded')),
    (SELECT COUNT(*)  FROM CART_ITEMS),
    (SELECT COALESCE(SUM(total_amount),0) FROM ORDERS WHERE status='delivered'
     AND ordered_at >= NOW() - INTERVAL '30 days');
END;
$$;

-- Procedure 3: Top N selling products
CREATE OR REPLACE FUNCTION sp_top_selling_products(p_limit INT)
RETURNS TABLE (
  product_id   INT,
  name         VARCHAR,
  brand        VARCHAR,
  category     VARCHAR,
  units_sold   BIGINT,
  revenue      DECIMAL,
  avg_rating   DECIMAL,
  review_count INT,
  stock_qty    INT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.product_id,
    p.name,
    b.name,
    c.name,
    SUM(oi.quantity),
    ROUND(SUM(oi.quantity * oi.unit_price), 2),
    p.avg_rating,
    p.review_count,
    p.stock_qty
  FROM ORDER_ITEMS oi
  JOIN PRODUCTS   p ON oi.product_id = p.product_id
  JOIN CATEGORIES c ON p.category_id = c.category_id
  LEFT JOIN BRANDS b ON p.brand_id   = b.brand_id
  JOIN ORDERS     o ON oi.order_id   = o.order_id
  WHERE o.status NOT IN ('cancelled','refunded')
  GROUP BY p.product_id, p.name, b.name, c.name, p.avg_rating, p.review_count, p.stock_qty
  ORDER BY SUM(oi.quantity) DESC
  LIMIT p_limit;
END;
$$;

-- Procedure 4: Full user order history
CREATE OR REPLACE FUNCTION sp_user_order_history(p_user_id INT)
RETURNS TABLE (
  order_id       INT,
  status         order_status,
  subtotal       DECIMAL,
  discount_amt   DECIMAL,
  shipping_fee   DECIMAL,
  tax_amt        DECIMAL,
  total_amount   DECIMAL,
  ordered_at     TIMESTAMPTZ,
  tracking_no    VARCHAR,
  shipping_method VARCHAR,
  product_id     INT,
  product_name   VARCHAR,
  brand_name     VARCHAR,
  quantity       INT,
  unit_price     DECIMAL,
  line_total     DECIMAL,
  payment_method payment_method,
  payment_status payment_status,
  product_image  VARCHAR
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.order_id, o.status, o.subtotal, o.discount_amt, o.shipping_fee,
    o.tax_amt, o.total_amount, o.ordered_at, o.tracking_no, o.shipping_method,
    p.product_id, p.name, b.name,
    oi.quantity, oi.unit_price, (oi.quantity * oi.unit_price),
    py.method, py.status, pi.url
  FROM ORDERS      o
  JOIN ORDER_ITEMS oi ON o.order_id    = oi.order_id
  JOIN PRODUCTS    p  ON oi.product_id = p.product_id
  LEFT JOIN BRANDS b  ON p.brand_id    = b.brand_id
  LEFT JOIN PAYMENTS py ON o.order_id  = py.order_id
  LEFT JOIN PRODUCT_IMAGES pi ON pi.product_id = p.product_id AND pi.is_primary = TRUE
  WHERE o.user_id = p_user_id
  ORDER BY o.ordered_at DESC;
END;
$$;

-- Procedure 5: Restock product (admin)
CREATE OR REPLACE FUNCTION sp_restock_product(
  p_product_id INT,
  p_quantity   INT,
  p_admin_id   INT
)
RETURNS TABLE (product_id INT, old_stock INT, new_stock INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_old INT;
BEGIN
  SELECT stock_qty INTO v_old FROM PRODUCTS WHERE PRODUCTS.product_id = p_product_id;

  UPDATE PRODUCTS SET stock_qty = stock_qty + p_quantity WHERE PRODUCTS.product_id = p_product_id;

  INSERT INTO AUDIT_LOG (table_name, record_id, action, changed_by, old_value, new_value)
  VALUES ('PRODUCTS', p_product_id, 'UPDATE', p_admin_id,
    jsonb_build_object('stock', v_old),
    jsonb_build_object('stock', v_old + p_quantity, 'restocked_by', p_admin_id));

  RETURN QUERY SELECT p_product_id, v_old, v_old + p_quantity;
END;
$$;

-- Procedure 6: Monthly revenue report
CREATE OR REPLACE FUNCTION sp_monthly_revenue(p_year INT)
RETURNS TABLE (
  month_num       INT,
  month_name      TEXT,
  order_count     BIGINT,
  revenue         DECIMAL,
  avg_order_value DECIMAL
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM ordered_at)::INT,
    TO_CHAR(ordered_at, 'Month'),
    COUNT(*),
    ROUND(SUM(total_amount), 2),
    ROUND(AVG(total_amount), 2)
  FROM ORDERS
  WHERE EXTRACT(YEAR FROM ordered_at) = p_year
    AND status NOT IN ('cancelled','refunded')
  GROUP BY EXTRACT(MONTH FROM ordered_at), TO_CHAR(ordered_at, 'Month')
  ORDER BY EXTRACT(MONTH FROM ordered_at);
END;
$$;

-- Procedure 7: Product search with full-text + filters
CREATE OR REPLACE FUNCTION sp_search_products(
  p_query       VARCHAR(255),
  p_category_id INT,
  p_brand_id    INT,
  p_min_price   DECIMAL(10,2),
  p_max_price   DECIMAL(10,2),
  p_sort        VARCHAR(30),
  p_page        INT,
  p_limit       INT
)
RETURNS TABLE (
  product_id    INT,
  name          VARCHAR,
  price         DECIMAL,
  avg_rating    DECIMAL,
  stock_qty     INT,
  category_name VARCHAR,
  brand_name    VARCHAR,
  primary_image VARCHAR
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_limit;
  v_order  TEXT;
BEGIN
  v_order := CASE p_sort
    WHEN 'price_asc'  THEN 'p.price ASC'
    WHEN 'price_desc' THEN 'p.price DESC'
    WHEN 'rating'     THEN 'p.avg_rating DESC'
    WHEN 'newest'     THEN 'p.created_at DESC'
    WHEN 'featured'   THEN 'p.is_featured DESC, p.avg_rating DESC'
    ELSE 'p.is_featured DESC, p.created_at DESC'
  END;

  RETURN QUERY EXECUTE
    'SELECT p.product_id, p.name, p.price, p.avg_rating, p.stock_qty,
            c.name, b.name, pi.url
     FROM PRODUCTS p
     JOIN CATEGORIES c ON p.category_id = c.category_id
     LEFT JOIN BRANDS b ON p.brand_id = b.brand_id
     LEFT JOIN PRODUCT_IMAGES pi ON pi.product_id = p.product_id AND pi.is_primary = TRUE
     WHERE p.is_active = TRUE'
    || CASE WHEN p_query IS NOT NULL AND p_query != ''
       THEN ' AND to_tsvector(''english'', p.name || '' '' || COALESCE(p.description,''''))
                  @@ plainto_tsquery(''english'', ' || quote_literal(p_query) || ')'
       ELSE '' END
    || CASE WHEN p_category_id IS NOT NULL AND p_category_id > 0
       THEN ' AND p.category_id = ' || p_category_id ELSE '' END
    || CASE WHEN p_brand_id IS NOT NULL AND p_brand_id > 0
       THEN ' AND p.brand_id = ' || p_brand_id ELSE '' END
    || CASE WHEN p_min_price IS NOT NULL
       THEN ' AND p.price >= ' || p_min_price ELSE '' END
    || CASE WHEN p_max_price IS NOT NULL
       THEN ' AND p.price <= ' || p_max_price ELSE '' END
    || ' ORDER BY ' || v_order
    || ' LIMIT ' || p_limit || ' OFFSET ' || v_offset;
END;
$$;

-- Procedure 8: Broadcast promo to all customers
CREATE OR REPLACE FUNCTION sp_broadcast_promo(p_title VARCHAR(200), p_body TEXT)
RETURNS TABLE (notifications_sent BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  v_cnt BIGINT;
BEGIN
  INSERT INTO NOTIFICATIONS (user_id, type, title, body, ref_type)
  SELECT user_id, 'promo', p_title, p_body, 'system'
  FROM   USERS WHERE is_active = TRUE AND role = 'customer';

  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RETURN QUERY SELECT v_cnt;
END;
$$;

-- Procedure 9: Order status timeline
CREATE OR REPLACE FUNCTION sp_order_timeline(p_order_id INT)
RETURNS TABLE (
  history_id      INT,
  prev_status     VARCHAR,
  new_status      VARCHAR,
  comment         VARCHAR,
  changed_at      TIMESTAMPTZ,
  changed_by_name TEXT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.history_id,
    h.prev_status,
    h.new_status,
    h.comment,
    h.changed_at,
    COALESCE(u.full_name, 'System')
  FROM   ORDER_STATUS_HISTORY h
  LEFT JOIN USERS u ON h.changed_by = u.user_id
  WHERE  h.order_id = p_order_id
  ORDER BY h.changed_at ASC;
END;
$$;

-- ================================================================
-- SEED DATA
-- ================================================================

INSERT INTO BRANDS (name, country, website) VALUES
  ('Apple',       'USA',          'https://apple.com'),
  ('Samsung',     'South Korea',  'https://samsung.com'),
  ('Sony',        'Japan',        'https://sony.com'),
  ('Nike',        'USA',          'https://nike.com'),
  ('Levi''s',     'USA',          'https://levi.com'),
  ('IKEA',        'Sweden',       'https://ikea.com'),
  ('Dell',        'USA',          'https://dell.com'),
  ('JBL',         'USA',          'https://jbl.com'),
  ('Lenovo',      'China',        'https://lenovo.com'),
  ('DJI',         'China',        'https://dji.com'),
  ('Instant Pot', 'Canada',       'https://instantpot.com'),
  ('Ninja',       'USA',          'https://ninjakitchen.com'),
  ('Zara',        'Spain',        'https://zara.com'),
  ('Yonex',       'Japan',        'https://yonex.com'),
  ('OnePlus',     'China',        'https://oneplus.com')
ON CONFLICT (name) DO NOTHING;

INSERT INTO CATEGORIES (name, parent_id, description) VALUES
  ('Electronics',        NULL, 'All electronic devices and gadgets'),
  ('Fashion',            NULL, 'Clothing, footwear and accessories'),
  ('Home & Kitchen',     NULL, 'Furniture, appliances and home essentials'),
  ('Books',              NULL, 'Physical and digital books'),
  ('Sports & Outdoors',  NULL, 'Sports equipment and activewear'),
  ('Smartphones',        1,    'Latest smartphones and mobile devices'),
  ('Laptops & PCs',      1,    'Laptops, desktops and accessories'),
  ('Audio',              1,    'Headphones, speakers and earbuds'),
  ('Cameras & Drones',   1,    'Cameras, drones and stabilisers'),
  ('Mens Fashion',       2,    'Mens clothing and footwear'),
  ('Womens Fashion',     2,    'Womens clothing and footwear'),
  ('Kitchen Appliances', 3,    'Cooking and kitchen devices'),
  ('Furniture',          3,    'Sofas, tables, chairs and shelves'),
  ('Racket Sports',      5,    'Badminton, tennis, squash gear'),
  ('Running',            5,    'Running shoes and apparel')
ON CONFLICT (name) DO NOTHING;

-- Users (password123 → bcrypt hash)
INSERT INTO USERS (email, password_hash, full_name, phone, role) VALUES
  ('admin@shopsphere.com', '$2b$10$oVjkq0.57F7O3p6aBVcwBejopajEyxEMfF.6hfFsca.wj2oovNL4a', 'Admin User',   '+971501000000', 'admin'),
  ('alice@example.com',    '$2b$10$3.mfbKi6C2V6k/GjEdgL5uiqISPGe7VOguadz9fpll5XzFEX1znpi', 'Alice Johnson', '+971502111111', 'customer'),
  ('bob@example.com',      '$2b$10$3.mfbKi6C2V6k/GjEdgL5uiqISPGe7VOguadz9fpll5XzFEX1znpi', 'Bob Smith',     '+971503222222', 'customer'),
  ('carol@example.com',    '$2b$10$3.mfbKi6C2V6k/GjEdgL5uiqISPGe7VOguadz9fpll5XzFEX1znpi', 'Carol Davis',   '+971504333333', 'customer'),
  ('dave@example.com',     '$2b$10$3.mfbKi6C2V6k/GjEdgL5uiqISPGe7VOguadz9fpll5XzFEX1znpi', 'Dave Wilson',   '+971505444444', 'customer'),
  ('eve@example.com',      '$2b$10$3.mfbKi6C2V6k/GjEdgL5uiqISPGe7VOguadz9fpll5XzFEX1znpi', 'Eve Martinez',  '+971506555555', 'customer'),
  ('frank@example.com',    '$2b$10$3.mfbKi6C2V6k/GjEdgL5uiqISPGe7VOguadz9fpll5XzFEX1znpi', 'Frank Chen',    '+971507666666', 'customer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO ADDRESSES (user_id, label, full_name, street, city, country, postal_code, is_default) VALUES
  (2, 'Home',   'Alice Johnson', '123 Sheikh Zayed Rd', 'Dubai',     'UAE', '00000', TRUE),
  (3, 'Home',   'Bob Smith',     '45 Corniche Rd',       'Abu Dhabi', 'UAE', '00000', TRUE),
  (4, 'Home',   'Carol Davis',   '78 Al Wahda St',       'Sharjah',   'UAE', '00000', TRUE),
  (5, 'Home',   'Dave Wilson',   '12 Clock Tower Sq',    'Al Ain',    'UAE', '00000', TRUE),
  (6, 'Home',   'Eve Martinez',  '99 Marina Walk',       'Dubai',     'UAE', '00000', TRUE),
  (7, 'Office', 'Frank Chen',    '5 Al Reem Island',     'Abu Dhabi', 'UAE', '00000', TRUE);

INSERT INTO PRODUCTS (category_id, brand_id, name, slug, description, price, compare_price, stock_qty, sku, weight_kg, is_featured) VALUES
  (6,  1,  'iPhone 15 Pro',             'iphone-15-pro',           'Titanium body A17 Pro chip 48MP ProCamera system ProMotion display',                        4999.00,  5499.00, 48, 'APL-IP15P-BLK',  0.187, TRUE),
  (6,  2,  'Samsung Galaxy S24 Ultra',  'samsung-galaxy-s24-ultra','Snapdragon 8 Gen 3 200MP camera integrated S-Pen titanium frame',                           4499.00,  4999.00, 38, 'SAM-S24U-BLK',   0.232, TRUE),
  (6,  15, 'OnePlus 12',                'oneplus-12',              'Snapdragon 8 Gen 3 Hasselblad cameras 100W SUPERVOOC charging',                              2999.00,  3299.00, 58, 'OP-12-GRN',      0.220, FALSE),
  (7,  1,  'MacBook Pro 14 M3 Pro',     'macbook-pro-14-m3-pro',   'Apple M3 Pro chip 18GB unified memory Liquid Retina XDR display',                           9999.00, 11499.00, 23, 'APL-MBP14-M3P',  1.550, TRUE),
  (7,  7,  'Dell XPS 15',               'dell-xps-15',             'Intel Core i9-13900H 4K OLED display 32GB RAM 1TB SSD',                                     7999.00,  8999.00, 18, 'DEL-XPS15-OLED', 1.860, FALSE),
  (7,  9,  'Lenovo ThinkPad X1 Carbon', 'lenovo-thinkpad-x1',      'Ultra-light 1.12kg business laptop 14 IPS display vPro security',                           6499.00,  7299.00, 33, 'LEN-X1C-GEN11',  1.120, FALSE),
  (8,  3,  'Sony WH-1000XM5',           'sony-wh-1000xm5',         'Industry-leading noise cancellation 30hr battery Multipoint connection',                     999.00,  1299.00, 88, 'SNY-WH1000XM5',  0.250, TRUE),
  (8,  1,  'Apple AirPods Pro 2',       'apple-airpods-pro-2',     'Adaptive Transparency H2 chip Personalised Spatial Audio USB-C',                             999.00,  1199.00, 76, 'APL-APP2-WHT',   0.061, FALSE),
  (8,  8,  'JBL Flip 6',                'jbl-flip-6',              'Portable Bluetooth speaker IP67 waterproof 12hr battery JBL Pro Sound',                     299.00,   349.00,148, 'JBL-FLIP6-BLU',  0.550, FALSE),
  (9,  10, 'DJI Osmo Mobile 6',         'dji-osmo-mobile-6',       '3-axis smartphone gimbal ActiveTrack 6.0 DJI Mimo app ShotGuides',                          599.00,   699.00, 43, 'DJI-OM6-GRY',    0.390, FALSE),
  (10, 5,  'Levis 511 Slim Jeans',      'levis-511-slim-jeans',    'Classic slim fit dark indigo wash stretch comfort denim 5-pocket style',                    199.00,   249.00,195, 'LVI-511-32x32',  0.650, FALSE),
  (10, 4,  'Nike Air Force 1 Low',      'nike-air-force-1-low',    'Classic court style premium leather upper perforated toe box iconic look',                  399.00,   449.00,118, 'NIK-AF1-WHT-10', 0.900, TRUE),
  (11, 13, 'Zara Floral Midi Dress',    'zara-floral-midi-dress',  'Elegant floral print flowing silhouette V-neckline flutter sleeves',                        249.00,   299.00, 96, 'ZRA-FMD-BLU-M',  0.400, FALSE),
  (12, 11, 'Instant Pot Duo 7-in-1',   'instant-pot-duo-7in1',    'Pressure cooker slow cooker rice cooker steamer saute yogurt maker',                        349.00,   399.00, 68, 'INP-DUO7-6QT',   5.200, TRUE),
  (12, 12, 'Ninja Air Fryer XL',        'ninja-air-fryer-xl',      '5.5L 4-in-1 digital display wide temperature range non-stick basket',                      249.00,   299.00, 82, 'NJA-AF-XL-BLK',  4.100, FALSE),
  (13, 6,  'IKEA BILLY Bookcase',       'ikea-billy-bookcase',     'Classic adjustable shelves white finish 80x28x202cm flat-pack',                             299.00,   349.00, 57, 'IKE-BIL-WHT',   25.000, FALSE),
  (4,  NULL,'Clean Code',               'clean-code-book',         'Robert C. Martin A Handbook of Agile Software Craftsmanship',                                 89.00,    99.00,495, 'BK-CLEANCODE',   0.500, FALSE),
  (4,  NULL,'System Design Interview',  'system-design-interview', 'Alex Xu Vol 1 and 2 bundle the most read system design prep guide',                          99.00,   120.00,395, 'BK-SYSDESIGN',   0.900, FALSE),
  (14, 14, 'Yonex Nanoflare 700',       'yonex-nanoflare-700',     'Aggressive attacking frame isometric head shape 4U-G5 extra slim shaft',                   450.00,   499.00, 53, 'YNX-NF700-4UG5', 0.083, FALSE),
  (15, 4,  'Nike React Infinity Run',   'nike-react-infinity-run', 'Maximum cushioning Flyknit upper React foam midsole rocker geometry',                       499.00,   549.00,108, 'NIK-RIR-WHT-10', 0.310, FALSE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO PRODUCT_IMAGES (product_id, url, alt_text, is_primary) VALUES
  (1,  'https://picsum.photos/seed/ip15pro/400/400',    'iPhone 15 Pro',           TRUE),
  (2,  'https://picsum.photos/seed/s24ultra/400/400',   'Samsung S24 Ultra',       TRUE),
  (3,  'https://picsum.photos/seed/op12/400/400',       'OnePlus 12',              TRUE),
  (4,  'https://picsum.photos/seed/mbpm3pro/400/400',   'MacBook Pro M3 Pro',      TRUE),
  (5,  'https://picsum.photos/seed/dellxps15/400/400',  'Dell XPS 15',             TRUE),
  (6,  'https://picsum.photos/seed/tpx1c/400/400',      'ThinkPad X1 Carbon',      TRUE),
  (7,  'https://picsum.photos/seed/wh1000xm5/400/400',  'Sony WH-1000XM5',         TRUE),
  (8,  'https://picsum.photos/seed/app2/400/400',       'AirPods Pro 2',           TRUE),
  (9,  'https://picsum.photos/seed/jblflip6/400/400',   'JBL Flip 6',              TRUE),
  (10, 'https://picsum.photos/seed/djiosmo6/400/400',   'DJI Osmo Mobile 6',       TRUE),
  (11, 'https://picsum.photos/seed/levis511/400/400',   'Levis 511 Slim Jeans',    TRUE),
  (12, 'https://picsum.photos/seed/nikeaf1low/400/400', 'Nike Air Force 1',        TRUE),
  (13, 'https://picsum.photos/seed/zarafloral/400/400', 'Zara Floral Midi Dress',  TRUE),
  (14, 'https://picsum.photos/seed/instapot7/400/400',  'Instant Pot Duo',         TRUE),
  (15, 'https://picsum.photos/seed/ninjaxl/400/400',    'Ninja Air Fryer XL',      TRUE),
  (16, 'https://picsum.photos/seed/ikeabilly/400/400',  'IKEA BILLY Bookcase',     TRUE),
  (17, 'https://picsum.photos/seed/cleancode/400/400',  'Clean Code Book',         TRUE),
  (18, 'https://picsum.photos/seed/sysdesign2/400/400', 'System Design Interview', TRUE),
  (19, 'https://picsum.photos/seed/yonexnf7/400/400',   'Yonex Nanoflare 700',    TRUE),
  (20, 'https://picsum.photos/seed/nikereact/400/400',  'Nike React Infinity Run', TRUE);

INSERT INTO PRODUCT_ATTRIBUTES (product_id, attr_name, attr_value) VALUES
  (1,'Storage','256GB'),(1,'RAM','8GB'),(1,'Display','6.1 inch Super Retina XDR'),(1,'OS','iOS 17'),
  (2,'Storage','512GB'),(2,'RAM','12GB'),(2,'Display','6.8 inch Dynamic AMOLED'),(2,'Battery','5000mAh'),
  (4,'CPU','Apple M3 Pro'),(4,'RAM','18GB Unified'),(4,'Storage','512GB SSD'),(4,'Display','14.2 inch XDR'),
  (7,'Driver','40mm'),(7,'Frequency','4Hz-40000Hz'),(7,'Battery','30 hours'),(7,'Connectivity','Bluetooth 5.2'),
  (14,'Capacity','6 Quart'),(14,'Programs','7-in-1'),(14,'Power','1000W'),(14,'Material','Stainless Steel')
ON CONFLICT (product_id, attr_name) DO NOTHING;

INSERT INTO COUPONS (code, description, type, discount_value, min_order_amt, max_discount, expires_at, max_uses) VALUES
  ('WELCOME10', '10% off your first order',          'percentage', 10.00,    0.00,  500.00, '2027-12-31', 1000),
  ('SUMMER20',  '20% off summer sale',               'percentage', 20.00,  200.00,  800.00, '2027-08-31',  500),
  ('FLASH50',   '50% flash sale limited time',       'percentage', 50.00, 1000.00, 2000.00, '2027-12-31',   50),
  ('VIP30',     'VIP member 30% discount',           'percentage', 30.00,  500.00, 1500.00, '2027-12-31',  200),
  ('STUDENT15', 'Student discount 15% off',          'percentage', 15.00,  100.00,  300.00, '2027-12-31',  300),
  ('FLAT100',   'AED 100 off on orders above 500',   'fixed',     100.00,  500.00,    NULL, '2027-12-31',  400),
  ('TECH500',   'AED 500 off on electronics > 5000', 'fixed',     500.00, 5000.00,    NULL, '2027-12-31',  100)
ON CONFLICT (code) DO NOTHING;

-- Demo Orders
INSERT INTO ORDERS (user_id,address_id,subtotal,discount_amt,shipping_fee,tax_amt,total_amount,status,shipping_method)
VALUES (2,1,14998.00,0,0,749.90,15747.90,'delivered','Express');
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price)
VALUES (currval('orders_order_id_seq'),1,1,4999.00),(currval('orders_order_id_seq'),4,1,9999.00);
INSERT INTO PAYMENTS(order_id,method,status,amount,paid_at)
VALUES (currval('orders_order_id_seq'),'credit_card','completed',15747.90,NOW());

INSERT INTO ORDERS (user_id,address_id,subtotal,discount_amt,shipping_fee,tax_amt,total_amount,status,shipping_method)
VALUES (3,2,1298.00,0,20,65.90,1383.90,'delivered','Standard');
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price)
VALUES (currval('orders_order_id_seq'),7,1,999.00),(currval('orders_order_id_seq'),9,1,299.00);
INSERT INTO PAYMENTS(order_id,method,status,amount,paid_at)
VALUES (currval('orders_order_id_seq'),'paypal','completed',1383.90,NOW());

INSERT INTO ORDERS (user_id,address_id,subtotal,discount_amt,shipping_fee,tax_amt,total_amount,status,shipping_method)
VALUES (4,3,338.00,33.80,10,15.21,329.41,'delivered','Standard');
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price)
VALUES (currval('orders_order_id_seq'),13,1,249.00),(currval('orders_order_id_seq'),17,1,89.00);
INSERT INTO PAYMENTS(order_id,method,status,amount,paid_at)
VALUES (currval('orders_order_id_seq'),'cash_on_delivery','completed',329.41,NOW());

INSERT INTO ORDERS (user_id,address_id,subtotal,discount_amt,shipping_fee,tax_amt,total_amount,status,shipping_method,tracking_no)
VALUES (5,4,949.00,0,20,48.45,1017.45,'shipped','Standard','TRK-2026-004422');
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price)
VALUES (currval('orders_order_id_seq'),19,1,450.00),(currval('orders_order_id_seq'),20,1,499.00);
INSERT INTO PAYMENTS(order_id,method,status,amount,paid_at)
VALUES (currval('orders_order_id_seq'),'credit_card','completed',1017.45,NOW());

INSERT INTO ORDERS (user_id,address_id,subtotal,discount_amt,shipping_fee,tax_amt,total_amount,status,shipping_method)
VALUES (6,5,10098.00,0,0,504.90,10602.90,'delivered','Express');
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price)
VALUES (currval('orders_order_id_seq'),4,1,9999.00),(currval('orders_order_id_seq'),18,1,99.00);
INSERT INTO PAYMENTS(order_id,method,status,amount,paid_at)
VALUES (currval('orders_order_id_seq'),'bank_transfer','completed',10602.90,NOW());

INSERT INTO ORDERS (user_id,address_id,subtotal,discount_amt,shipping_fee,tax_amt,total_amount,status,shipping_method)
VALUES (7,6,598.00,59.80,20,27.91,586.11,'confirmed','Standard');
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price)
VALUES (currval('orders_order_id_seq'),14,1,349.00),(currval('orders_order_id_seq'),15,1,249.00);
INSERT INTO PAYMENTS(order_id,method,status,amount,paid_at)
VALUES (currval('orders_order_id_seq'),'debit_card','completed',586.11,NOW());

INSERT INTO ORDERS (user_id,address_id,subtotal,discount_amt,shipping_fee,tax_amt,total_amount,status,shipping_method)
VALUES (2,1,598.00,0,10,30.40,638.40,'delivered','Standard');
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price)
VALUES (currval('orders_order_id_seq'),12,1,399.00),(currval('orders_order_id_seq'),11,1,199.00);
INSERT INTO PAYMENTS(order_id,method,status,amount,paid_at)
VALUES (currval('orders_order_id_seq'),'apple_pay','completed',638.40,NOW());

INSERT INTO REVIEWS (user_id,product_id,order_id,rating,title,comment) VALUES
  (2,1,1,5,'Absolutely stunning phone','The titanium body feels incredible. Camera quality blows everything else away.'),
  (2,4,1,5,'Best laptop ever made','M3 Pro handles everything instantly. Battery lasts all day. Display is breathtaking.'),
  (3,7,2,5,'Worth every single dirham','Industry-leading for a reason. Silence on the metro is priceless. 30hrs battery is accurate.'),
  (3,9,2,4,'Punchy bass great speaker','Surprisingly loud for its size. IP67 means pool parties are fine. Bass could be deeper.'),
  (4,13,3,4,'Beautiful dress true to size','Quality fabric, excellent stitching. Runs slightly large so size down.'),
  (4,17,3,5,'Changed how I write code','Every CS student and developer must read this. Dense but worth every page.'),
  (6,4,5,5,'Eve loves this MacBook','Second MacBook in our household. Speed difference from Intel is unreal.'),
  (6,18,5,5,'Best system design prep','Used this for Google interviews. Got the offer. 5 stars.'),
  (2,12,7,5,'Classic sneaker perfection','Timeless design. Premium leather. Goes with everything. True to size.'),
  (2,11,7,4,'Solid daily jeans','Great fit and stretch. Colour holds after many washes. Good value.')
ON CONFLICT (user_id, product_id) DO NOTHING;

INSERT INTO WISHLISTS (user_id, product_id) VALUES
  (2,2),(2,7),(3,1),(3,4),(4,8),(5,1),(5,10),(6,14),(7,4),(7,7)
ON CONFLICT (user_id, product_id) DO NOTHING;

INSERT INTO SHIPPING_ZONES (zone_name, country, emirate, base_fee, express_fee, free_above, est_days) VALUES
  ('Dubai Standard',     'UAE', 'Dubai',          10.00, 25.00,  500.00, 2),
  ('Abu Dhabi Standard', 'UAE', 'Abu Dhabi',      15.00, 30.00,  500.00, 3),
  ('Sharjah Standard',   'UAE', 'Sharjah',        15.00, 30.00,  500.00, 3),
  ('Ajman Standard',     'UAE', 'Ajman',          20.00, 35.00,  700.00, 4),
  ('Ras Al Khaimah',     'UAE', 'Ras Al Khaimah', 20.00, 40.00,  700.00, 4),
  ('Fujairah Remote',    'UAE', 'Fujairah',       25.00, 45.00, 1000.00, 5),
  ('Umm Al Quwain',      'UAE', 'Umm Al Quwain',  20.00, 40.00,  700.00, 4);

INSERT INTO TAGS (name, slug, color_hex) VALUES
  ('Bestseller',   'bestseller',   '#F59E0B'),
  ('New Arrival',  'new-arrival',  '#10B981'),
  ('Limited',      'limited',      '#EF4444'),
  ('Eco Friendly', 'eco-friendly', '#22C55E'),
  ('Staff Pick',   'staff-pick',   '#3B82F6'),
  ('Clearance',    'clearance',    '#6B7280'),
  ('Bundle Deal',  'bundle-deal',  '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

INSERT INTO PRODUCT_TAGS (product_id, tag_id) VALUES
  (1,1),(1,5),(2,1),(4,1),(4,5),(7,1),(7,5),(12,1),
  (3,2),(8,2),(14,1),(14,7),(17,6),(5,3),(10,4)
ON CONFLICT (product_id, tag_id) DO NOTHING;

INSERT INTO NOTIFICATIONS (user_id, type, title, body, ref_id, ref_type) VALUES
  (2, 'order_update', 'Order Delivered!',            'Your order has been delivered. Enjoy your purchase!',          1, 'orders'),
  (3, 'order_update', 'Order Delivered!',            'Your Sony WH-1000XM5 order has been delivered.',               2, 'orders'),
  (5, 'promo',        'Flash Sale — Up to 50% Off',  'Use code FLASH50 today only on orders above AED 1000.',     NULL, 'system'),
  (6, 'order_update', 'Order Delivered!',            'Your MacBook Pro order has been delivered.',                    5, 'orders'),
  (7, 'order_update', 'Order Confirmed!',            'Your kitchen appliance order #6 is confirmed and processing.',  6, 'orders');

INSERT INTO ORDER_STATUS_HISTORY (order_id, prev_status, new_status, comment) VALUES
  (1, 'pending',    'confirmed',   'Payment verified'),
  (1, 'confirmed',  'processing',  'Warehouse preparing order'),
  (1, 'processing', 'shipped',     'Dispatched via Emirates Post'),
  (1, 'shipped',    'delivered',   'Delivered to customer'),
  (2, 'pending',    'confirmed',   'Payment verified'),
  (2, 'confirmed',  'shipped',     'Express dispatch'),
  (2, 'shipped',    'delivered',   'Delivered to customer'),
  (4, 'pending',    'confirmed',   'Payment verified'),
  (4, 'confirmed',  'processing',  'Preparing shipment'),
  (4, 'processing', 'shipped',     'In transit — TRK-2026-004422'),
  (6, 'pending',    'confirmed',   'Debit card payment cleared');

-- ================================================================
-- COMPLEX QUERIES (reference)
-- ================================================================

-- Q1: Products priced above their category average
-- SELECT p.product_id, p.name, p.price, c.name AS category,
--   (SELECT ROUND(AVG(p2.price),2) FROM PRODUCTS p2 WHERE p2.category_id=p.category_id) AS cat_avg
-- FROM PRODUCTS p JOIN CATEGORIES c ON p.category_id=c.category_id
-- WHERE p.price > (SELECT AVG(p3.price) FROM PRODUCTS p3 WHERE p3.category_id=p.category_id)
-- ORDER BY c.name, p.price DESC;

-- Q2: Customers who spent above avg user spend
-- SELECT u.full_name, u.email, SUM(o.total_amount) AS total_spent
-- FROM USERS u JOIN ORDERS o ON u.user_id=o.user_id WHERE o.status='delivered'
-- GROUP BY u.user_id, u.full_name, u.email
-- HAVING SUM(o.total_amount) > (
--   SELECT AVG(s.tot) FROM (SELECT SUM(total_amount) AS tot FROM ORDERS
--   WHERE status='delivered' GROUP BY user_id) s
-- );

-- Q3: Window function — rank products by revenue within category
-- SELECT product_name, category_name, revenue,
--   RANK() OVER (PARTITION BY category_name ORDER BY revenue DESC) AS cat_rank
-- FROM vw_revenue_by_category;

-- Q4: EXISTS — users who ordered but never reviewed
-- SELECT u.user_id, u.full_name FROM USERS u
-- WHERE EXISTS (SELECT 1 FROM ORDERS o WHERE o.user_id=u.user_id)
--   AND NOT EXISTS (SELECT 1 FROM REVIEWS r WHERE r.user_id=u.user_id);

-- Q5: Multi-level join — full order breakdown
-- SELECT o.order_id, u.full_name, b.name AS brand, p.name AS product,
--   oi.quantity, oi.unit_price, (oi.quantity*oi.unit_price) AS line_total
-- FROM ORDERS o JOIN USERS u ON o.user_id=u.user_id
-- JOIN ORDER_ITEMS oi ON o.order_id=oi.order_id
-- JOIN PRODUCTS p ON oi.product_id=p.product_id
-- LEFT JOIN BRANDS b ON p.brand_id=b.brand_id ORDER BY o.order_id;

-- Q6: Notification engagement
-- SELECT user_id, full_name, unread_count FROM vw_unread_notifications
-- WHERE unread_count > 0 ORDER BY unread_count DESC;

-- Q7: Products with all tags
-- SELECT product_name, price, avg_rating, tags FROM vw_product_tags ORDER BY avg_rating DESC LIMIT 10;

-- Q8: Shipping zone fee lookup
-- SELECT zone_name, emirate, fn_zone_shipping_fee(emirate, FALSE) AS std_fee,
--   fn_zone_shipping_fee(emirate, TRUE) AS express_fee, free_above
-- FROM SHIPPING_ZONES WHERE is_active=TRUE ORDER BY base_fee;

-- Q9: Full order timeline
-- SELECT * FROM sp_order_timeline(1);
