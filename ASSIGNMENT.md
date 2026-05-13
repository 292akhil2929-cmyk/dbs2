# ShopSphere — E-Commerce Platform
## CS F212 Database Systems — BITS Pilani Dubai
### Team of 6 | Full Assignment Report

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Background](#2-background)
3. [Scope](#3-scope)
4. [Entities & Attributes](#4-entities--attributes)
5. [Relationships (ERD Summary)](#5-relationships-erd-summary)
6. [Database Schema (20 Tables)](#6-database-schema-20-tables)
7. [Views (7)](#7-views-7)
8. [Queries — Correlated, Nested, Joins](#8-queries--correlated-nested-joins)
9. [Triggers (14)](#9-triggers-14)
10. [Functions (7)](#10-functions-7)
11. [Stored Procedures (9)](#11-stored-procedures-9)
12. [Schemas & Normal Forms](#12-schemas--normal-forms)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Backend Architecture](#14-backend-architecture)
15. [Homepage Description](#15-homepage-description)
16. [Demo Guide](#16-demo-guide)

---

## 1. Problem Statement

Traditional retail businesses face challenges scaling operations, managing inventory in real-time, and providing seamless shopping experiences to geographically distributed customers. Manual inventory tracking leads to stockouts or over-ordering, order processing is error-prone without automation, and customer purchasing patterns are not leveraged for business intelligence.

**ShopSphere** addresses these problems by delivering a fully-digital e-commerce platform with a normalized relational database at its core. The system automates inventory management, order processing, coupon validation, revenue analytics, and customer lifetime value calculations — all backed by a MySQL database that enforces data integrity through constraints, triggers, and stored procedures.

The project is motivated by the rapidly expanding UAE e-commerce sector, which grew at 23% annually since 2020 (Statista, 2024), and the lack of locally-tuned platforms for SMEs operating in the Gulf region.

---

## 2. Background

E-commerce platforms involve complex data interdependencies: a single customer purchase touches users, products, inventory, payments, shipping, coupons, and audit records simultaneously. A poorly-designed database leads to:

- **Update anomalies** — changing a product's brand name requires updating every order record
- **Insertion anomalies** — cannot add a product without a category
- **Deletion anomalies** — deleting the last order for a coupon loses coupon information

ShopSphere is designed using **Boyce-Codd Normal Form (BCNF)** across all 20 tables, eliminating these anomalies. Key design decisions:

| Design Decision | Rationale |
|---|---|
| BRANDS extracted from PRODUCTS | Removes transitive dependency (product_id → brand_country) |
| ADDRESSES separate from USERS | A user can have multiple delivery addresses (multi-valued) |
| PRODUCT_IMAGES separate from PRODUCTS | 1NF — images are a multi-valued attribute |
| ORDER_ITEMS stores unit_price snapshot | Prevents price change from affecting historical order records |
| PRODUCT_TAGS junction table | Resolves M:N between PRODUCTS and TAGS (1NF compliance) |
| AUDIT_LOG & ORDER_STATUS_HISTORY | Complete immutable audit trail for compliance |

---

## 3. Scope

### In Scope
- **User Management**: Registration, login, roles (customer / admin / vendor), address book
- **Product Catalogue**: Multi-category hierarchy, brand management, image gallery, flexible EAV attributes, tags
- **Shopping Flow**: Cart persistence, coupon validation, checkout, order placement, payment recording
- **Post-Order**: Order tracking, status history, customer notifications, reviews (verified buyers only)
- **Analytics**: Revenue by category, customer lifetime value, low-stock alerts, monthly reports
- **Administration**: Audit log, restock management, broadcast promotions, dashboard KPIs
- **Shipping**: Zone-based fee calculation with emirate-level granularity

### Out of Scope
- Live payment gateway integration (stored as method reference only)
- Real-time shipment tracking API
- Mobile native apps (Flutter Web only for this phase)
- Multi-currency support (AED throughout)
- Vendor marketplace (vendor role present but marketplace features deferred)

---

## 4. Entities & Attributes

### USERS
| Attribute | Type | Notes |
|---|---|---|
| user_id (PK) | INT AUTO_INCREMENT | Surrogate primary key |
| email | VARCHAR(191) UNIQUE | Login identifier |
| password_hash | VARCHAR(255) | bcrypt hashed |
| full_name | VARCHAR(150) | |
| phone | VARCHAR(25) | Optional |
| role | ENUM | customer / admin / vendor |
| is_active | TINYINT(1) | Soft delete flag |
| last_login | TIMESTAMP | |
| created_at | TIMESTAMP | |

### CATEGORIES
| Attribute | Type | Notes |
|---|---|---|
| category_id (PK) | INT | |
| name | VARCHAR(100) UNIQUE | |
| parent_id (FK→CATEGORIES) | INT NULL | Self-referencing for sub-categories |
| description | TEXT | |
| icon_url | VARCHAR(300) | |
| is_active | TINYINT(1) | |

### BRANDS
| Attribute | Type | Notes |
|---|---|---|
| brand_id (PK) | INT | |
| name | VARCHAR(100) UNIQUE | |
| country | VARCHAR(100) | |
| website | VARCHAR(300) | |
| logo_url | VARCHAR(300) | |
| is_active | TINYINT(1) | |

### PRODUCTS
| Attribute | Type | Notes |
|---|---|---|
| product_id (PK) | INT | |
| category_id (FK) | INT | |
| brand_id (FK NULL) | INT | Optional |
| name | VARCHAR(255) | |
| slug | VARCHAR(300) UNIQUE | SEO URL |
| description | TEXT | |
| price | DECIMAL(10,2) | CHECK ≥ 0 |
| compare_price | DECIMAL(10,2) NULL | Original price for discount display |
| stock_qty | INT | CHECK ≥ 0 |
| sku | VARCHAR(100) UNIQUE | |
| weight_kg | DECIMAL(6,3) | For shipping fee calculation |
| avg_rating | DECIMAL(3,2) | Auto-maintained by trigger |
| review_count | INT | Auto-maintained by trigger |
| is_active / is_featured | TINYINT(1) | |
| FULLTEXT INDEX | name, description | For full-text search |

### PRODUCT_IMAGES
| Attribute | Type | Notes |
|---|---|---|
| image_id (PK) | INT | |
| product_id (FK) | INT | CASCADE DELETE |
| url | VARCHAR(500) | |
| alt_text | VARCHAR(200) | |
| is_primary | TINYINT(1) | One per product |
| sort_order | INT | |

### PRODUCT_ATTRIBUTES
| Attribute | Type | Notes |
|---|---|---|
| attr_id (PK) | INT | |
| product_id (FK) | INT | |
| attr_name | VARCHAR(100) | e.g. RAM, Color, Size |
| attr_value | VARCHAR(255) | e.g. 16GB, Black, XL |
| UNIQUE | (product_id, attr_name) | |

### TAGS
| Attribute | Type | Notes |
|---|---|---|
| tag_id (PK) | INT | |
| name | VARCHAR(80) UNIQUE | Bestseller, New Arrival, etc. |
| slug | VARCHAR(90) UNIQUE | |
| color_hex | CHAR(7) | UI badge colour |

### PRODUCT_TAGS (Junction)
| Attribute | Type | Notes |
|---|---|---|
| product_id (FK, PK) | INT | |
| tag_id (FK, PK) | INT | |
| tagged_at | TIMESTAMP | |

### ADDRESSES
| Attribute | Type | Notes |
|---|---|---|
| address_id (PK) | INT | |
| user_id (FK) | INT | CASCADE DELETE |
| label | VARCHAR(50) | Home / Office / Other |
| full_name | VARCHAR(150) | Recipient name |
| street, city, state, country, postal_code | VARCHAR | |
| is_default | TINYINT(1) | One default per user |

### COUPONS
| Attribute | Type | Notes |
|---|---|---|
| coupon_id (PK) | INT | |
| code | VARCHAR(50) UNIQUE | |
| type | ENUM | percentage / fixed |
| discount_value | DECIMAL(10,2) | CHECK > 0 |
| min_order_amt | DECIMAL(10,2) | Minimum cart value |
| max_discount | DECIMAL(10,2) NULL | Cap for percentage coupons |
| expires_at | DATE | |
| max_uses / used_count | INT | Rate limiting |
| is_active | TINYINT(1) | |

### ORDERS
| Attribute | Type | Notes |
|---|---|---|
| order_id (PK) | INT | |
| user_id (FK) | INT | |
| address_id (FK) | INT | |
| coupon_id (FK NULL) | INT | |
| subtotal, discount_amt, shipping_fee, tax_amt, total_amount | DECIMAL(10,2) | Denormalised for performance |
| status | ENUM | pending → confirmed → processing → shipped → delivered / cancelled / refunded |
| shipping_method | VARCHAR(100) | |
| tracking_no | VARCHAR(100) | |
| ordered_at | TIMESTAMP | |

### ORDER_ITEMS
| Attribute | Type | Notes |
|---|---|---|
| item_id (PK) | INT | |
| order_id (FK) | INT | CASCADE DELETE |
| product_id (FK) | INT | |
| quantity | INT | CHECK > 0 |
| unit_price | DECIMAL(10,2) | Price snapshot at order time |
| UNIQUE | (order_id, product_id) | |

### ORDER_STATUS_HISTORY
| Attribute | Type | Notes |
|---|---|---|
| history_id (PK) | INT | |
| order_id (FK) | INT | CASCADE DELETE |
| prev_status | VARCHAR(30) | |
| new_status | VARCHAR(30) | |
| changed_by (FK NULL) | INT | Admin user_id |
| comment | VARCHAR(255) | |
| changed_at | TIMESTAMP | |

### PAYMENTS
| Attribute | Type | Notes |
|---|---|---|
| payment_id (PK) | INT | |
| order_id (FK) | INT UNIQUE | 1:1 with ORDERS |
| method | ENUM | credit_card / debit_card / paypal / bank_transfer / cash_on_delivery / apple_pay / google_pay |
| status | ENUM | pending / completed / failed / refunded |
| amount | DECIMAL(10,2) | |
| txn_ref | VARCHAR(150) | Gateway reference |
| paid_at | TIMESTAMP NULL | |

### REVIEWS
| Attribute | Type | Notes |
|---|---|---|
| review_id (PK) | INT | |
| user_id (FK) | INT | |
| product_id (FK) | INT | |
| order_id (FK) | INT | Enforces verified-buyer rule |
| rating | TINYINT | CHECK 1–5 |
| title | VARCHAR(200) | |
| comment | TEXT | |
| is_verified | TINYINT(1) | Always 1 (linked to order) |
| helpful_count | INT | |
| UNIQUE | (user_id, product_id) | One review per product per user |

### CART_ITEMS
| Attribute | Type | Notes |
|---|---|---|
| cart_id (PK) | INT | |
| user_id (FK) | INT | CASCADE DELETE |
| product_id (FK) | INT | |
| quantity | INT | CHECK > 0 |
| UNIQUE | (user_id, product_id) | |

### WISHLISTS
| Attribute | Type | Notes |
|---|---|---|
| wishlist_id (PK) | INT | |
| user_id (FK) | INT | CASCADE DELETE |
| product_id (FK) | INT | |
| UNIQUE | (user_id, product_id) | |

### SHIPPING_ZONES
| Attribute | Type | Notes |
|---|---|---|
| zone_id (PK) | INT | |
| zone_name | VARCHAR(100) | |
| country | VARCHAR(100) | |
| emirate | VARCHAR(100) NULL | UAE emirate |
| base_fee / express_fee | DECIMAL(10,2) | |
| free_above | DECIMAL(10,2) NULL | Free shipping threshold |
| est_days | TINYINT | Estimated days |
| is_active | TINYINT(1) | |

### NOTIFICATIONS
| Attribute | Type | Notes |
|---|---|---|
| notif_id (PK) | INT | |
| user_id (FK) | INT | CASCADE DELETE |
| type | ENUM | order_update / promo / restock / review_reply / system |
| title | VARCHAR(200) | |
| body | TEXT | |
| is_read | TINYINT(1) | |
| ref_id | INT NULL | Related order_id or product_id |
| ref_type | VARCHAR(50) NULL | 'orders' / 'products' |

### AUDIT_LOG
| Attribute | Type | Notes |
|---|---|---|
| log_id (PK) | INT | |
| table_name | VARCHAR(60) | |
| record_id | INT | |
| action | ENUM | INSERT / UPDATE / DELETE |
| changed_by | INT NULL | user_id |
| old_value / new_value | JSON | |
| ip_address | VARCHAR(45) | |
| changed_at | TIMESTAMP | |

---

## 5. Relationships (ERD Summary)

```
USERS ──────────── 1:N ─────────────── ADDRESSES
USERS ──────────── 1:N ─────────────── ORDERS
USERS ──────────── 1:N ─────────────── CART_ITEMS
USERS ──────────── 1:N ─────────────── WISHLISTS
USERS ──────────── 1:N ─────────────── REVIEWS
USERS ──────────── 1:N ─────────────── NOTIFICATIONS

CATEGORIES ─────── 1:N (self) ──────── CATEGORIES (sub-categories)
CATEGORIES ─────── 1:N ─────────────── PRODUCTS

BRANDS ──────────── 1:N ─────────────── PRODUCTS

PRODUCTS ────────── 1:N ─────────────── PRODUCT_IMAGES
PRODUCTS ────────── 1:N ─────────────── PRODUCT_ATTRIBUTES
PRODUCTS ────────── 1:N ─────────────── CART_ITEMS
PRODUCTS ────────── 1:N ─────────────── ORDER_ITEMS
PRODUCTS ────────── 1:N ─────────────── WISHLISTS
PRODUCTS ────────── 1:N ─────────────── REVIEWS
PRODUCTS ────────── M:N ─────────────── TAGS  (via PRODUCT_TAGS)

ORDERS ──────────── 1:1 ─────────────── PAYMENTS
ORDERS ──────────── 1:N ─────────────── ORDER_ITEMS
ORDERS ──────────── 1:N ─────────────── ORDER_STATUS_HISTORY
ORDERS ──────────── N:1 ─────────────── COUPONS
ORDERS ──────────── N:1 ─────────────── ADDRESSES

SHIPPING_ZONES — standalone lookup table (no FK, used via fn_zone_shipping_fee)
AUDIT_LOG — standalone (records from PRODUCTS, USERS, ORDERS triggers)
```

**Cardinalities:**
- One USER has many ADDRESSES, ORDERS, CART_ITEMS, WISHLISTS, REVIEWS, NOTIFICATIONS
- One CATEGORY has many PRODUCTS and many sub-CATEGORIES
- One PRODUCT has many IMAGES, ATTRIBUTES, and can have many TAGS (M:N)
- One ORDER has exactly one PAYMENT (1:1), many ORDER_ITEMS, and a STATUS_HISTORY trail
- One COUPON can be used across many ORDERS

---

## 6. Database Schema (20 Tables)

| # | Table Name | Purpose | Key Relationships |
|---|---|---|---|
| 1 | CATEGORIES | Product hierarchy (self-referencing) | parent_id → CATEGORIES |
| 2 | USERS | Customers, admins, vendors | — |
| 3 | ADDRESSES | User delivery addresses | user_id → USERS |
| 4 | BRANDS | Product brands (3NF separation) | — |
| 5 | PRODUCTS | Core product catalogue | category_id, brand_id |
| 6 | PRODUCT_IMAGES | Product image gallery (1NF) | product_id → PRODUCTS |
| 7 | PRODUCT_ATTRIBUTES | EAV for flexible product specs | product_id → PRODUCTS |
| 8 | COUPONS | Discount codes (% and fixed) | — |
| 9 | ORDERS | Customer orders master | user_id, address_id, coupon_id |
| 10 | ORDER_ITEMS | Order line items with price snapshot | order_id, product_id |
| 11 | PAYMENTS | Payment records (1:1 with ORDERS) | order_id → ORDERS |
| 12 | REVIEWS | Verified buyer reviews | user_id, product_id, order_id |
| 13 | CART_ITEMS | Active shopping cart | user_id, product_id |
| 14 | WISHLISTS | Saved items / favourites | user_id, product_id |
| 15 | AUDIT_LOG | Immutable audit trail | table_name + record_id |
| 16 | NOTIFICATIONS | In-app user notifications | user_id → USERS |
| 17 | SHIPPING_ZONES | Zone-based shipping rates | — |
| 18 | TAGS | Product tag definitions | — |
| 19 | PRODUCT_TAGS | M:N product–tag junction | product_id, tag_id |
| 20 | ORDER_STATUS_HISTORY | Order status change log | order_id → ORDERS |

---

## 7. Views (7)

### View 1: `vw_product_catalog`
Joins PRODUCTS with CATEGORIES (including parent), BRANDS, and PRODUCT_IMAGES (primary only). Returns the full display-ready product record including discount percentage calculation.

```sql
-- Demonstrates: Multi-table JOIN, computed column
SELECT p.*, ROUND(((compare_price-price)/compare_price)*100) AS discount_pct,
       c.name AS category, b.name AS brand, pi.url AS primary_image
FROM PRODUCTS p JOIN CATEGORIES c ... LEFT JOIN BRANDS b ... LEFT JOIN PRODUCT_IMAGES pi ...
```

### View 2: `vw_order_summary`
Aggregates order data with customer name, delivery address, item count, and payment status. Used for admin order management.

### View 3: `vw_revenue_by_category`
Groups revenue and units sold by product category. Demonstrates GROUP BY + SUM + JOIN across 4 tables.

### View 4: `vw_low_stock`
Filters products with `stock_qty <= 10`. Enables admin restock alerts. Demonstrates filtered views as business rules.

### View 5: `vw_customer_ltv`
Customer lifetime value: total spend, order count, average order value, last purchase date. Used for VIP segmentation.

### View 6: `vw_product_tags`
Joins PRODUCTS → PRODUCT_TAGS → TAGS. Uses `GROUP_CONCAT` to return comma-separated tags per product. Demonstrates M:N resolution in a view.

### View 7: `vw_unread_notifications`
Per-user unread notification count using `SUM(CASE WHEN is_read=0 ...)`. Demonstrates conditional aggregation.

---

## 8. Queries — Correlated, Nested, Joins

### Q1: Correlated Subquery — Products above category average price
```sql
SELECT p.product_id, p.name, p.price, c.name AS category,
  (SELECT ROUND(AVG(p2.price),2) FROM PRODUCTS p2
   WHERE p2.category_id = p.category_id) AS cat_avg
FROM PRODUCTS p
JOIN CATEGORIES c ON p.category_id = c.category_id
WHERE p.price > (
  SELECT AVG(p3.price) FROM PRODUCTS p3
  WHERE p3.category_id = p.category_id
)
ORDER BY c.name, p.price DESC;
```
**Concept**: Correlated subquery references outer query's `p.category_id`. Re-executed for every row.

---

### Q2: Nested Subquery — Customers above average spend
```sql
SELECT u.full_name, u.email, SUM(o.total_amount) AS total_spent
FROM USERS u
JOIN ORDERS o ON u.user_id = o.user_id
WHERE o.status = 'delivered'
GROUP BY u.user_id
HAVING SUM(o.total_amount) > (
  SELECT AVG(s.tot) FROM (
    SELECT SUM(total_amount) AS tot
    FROM ORDERS WHERE status = 'delivered'
    GROUP BY user_id
  ) s
);
```
**Concept**: Three-level nesting — outer → HAVING → inline view (derived table).

---

### Q3: Window Function — Rank products by revenue within category
```sql
SELECT product_name, category_name, revenue,
  RANK() OVER (PARTITION BY category_name ORDER BY revenue DESC) AS cat_rank
FROM vw_revenue_by_category;
```
**Concept**: RANK() partitioned window function — no GROUP BY needed.

---

### Q4: EXISTS / NOT EXISTS — Buyers who never left a review
```sql
SELECT u.user_id, u.full_name, u.email
FROM USERS u
WHERE EXISTS (SELECT 1 FROM ORDERS o WHERE o.user_id = u.user_id)
  AND NOT EXISTS (SELECT 1 FROM REVIEWS r WHERE r.user_id = u.user_id);
```
**Concept**: Semi-join using EXISTS vs NOT EXISTS — often more efficient than IN for large datasets.

---

### Q5: Multi-level JOIN — Full order breakdown with brand
```sql
SELECT o.order_id, u.full_name, b.name AS brand, p.name AS product,
  oi.quantity, oi.unit_price, (oi.quantity * oi.unit_price) AS line_total
FROM ORDERS o
JOIN USERS u      ON o.user_id    = u.user_id
JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
JOIN PRODUCTS p   ON oi.product_id = p.product_id
LEFT JOIN BRANDS b ON p.brand_id  = b.brand_id
ORDER BY o.order_id, line_total DESC;
```
**Concept**: 5-table JOIN chain with LEFT JOIN for nullable FK.

---

### Q6: Many-to-many resolution — Products with specific tag
```sql
SELECT p.name, p.price, t.name AS tag
FROM PRODUCTS p
JOIN PRODUCT_TAGS pt ON p.product_id = pt.product_id
JOIN TAGS t          ON pt.tag_id    = t.tag_id
WHERE t.slug = 'bestseller'
ORDER BY p.avg_rating DESC;
```
**Concept**: Resolving M:N relationship through junction table.

---

### Q7: Aggregate with ROLLUP — Revenue by category and total
```sql
SELECT COALESCE(c.name, 'TOTAL') AS category,
  COUNT(DISTINCT o.order_id) AS orders,
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM ORDER_ITEMS oi
JOIN PRODUCTS p ON oi.product_id = p.product_id
JOIN CATEGORIES c ON p.category_id = c.category_id
JOIN ORDERS o ON oi.order_id = o.order_id
WHERE o.status NOT IN ('cancelled','refunded')
GROUP BY c.name WITH ROLLUP;
```
**Concept**: ROLLUP extension — adds a grand total row automatically.

---

## 9. Triggers (14)

| # | Trigger Name | Event | Table | Purpose |
|---|---|---|---|---|
| 1 | `trg_check_stock_before_order` | BEFORE INSERT | ORDER_ITEMS | Block order if insufficient stock |
| 2 | `trg_deduct_stock_after_order` | AFTER INSERT | ORDER_ITEMS | Reduce stock_qty on new order item |
| 3 | `trg_restore_stock_on_cancel` | AFTER UPDATE | ORDERS | Restore stock + audit when order cancelled |
| 4 | `trg_update_rating_on_insert` | AFTER INSERT | REVIEWS | Recalculate product avg_rating + review_count |
| 5 | `trg_update_rating_on_update` | AFTER UPDATE | REVIEWS | Recalculate after review edit |
| 6 | `trg_update_rating_on_delete` | AFTER DELETE | REVIEWS | Recalculate after review deletion |
| 7 | `trg_increment_coupon_usage` | AFTER INSERT | ORDERS | Increment coupon used_count on new order |
| 8 | `trg_auto_slug_on_insert` | BEFORE INSERT | PRODUCTS | Auto-generate SEO slug from product name |
| 9 | `trg_audit_product_insert` | AFTER INSERT | PRODUCTS | Write to AUDIT_LOG on new product |
| 10 | `trg_audit_product_update` | AFTER UPDATE | PRODUCTS | Audit price or stock changes |
| 11 | `trg_single_default_address` | BEFORE INSERT | ADDRESSES | Prevent duplicate default address per user |
| 12 | `trg_audit_user_register` | AFTER INSERT | USERS | Audit new user registrations |
| 13 | `trg_order_status_history` | AFTER UPDATE | ORDERS | Record status transition + create notification |
| 14 | `trg_notify_restock` | AFTER UPDATE | PRODUCTS | Notify wishlist users when product restocked |

**Key Trigger Explanations:**

**Trigger 1 & 2 (Stock management)**: Trigger 1 is a BEFORE INSERT guard — it reads `stock_qty` and SIGNALs a `45000` error if quantity exceeds stock. Trigger 2 is an AFTER INSERT that performs the actual deduction. This two-trigger pattern is necessary because you cannot both validate AND modify in a single trigger cleanly.

**Trigger 3 (Cancel and restore)**: Demonstrates a correlated UPDATE inside a trigger using a JOIN. Also inserts an AUDIT_LOG record with JSON-formatted old and new values.

**Triggers 4–6 (Rating maintenance)**: Instead of storing avg_rating redundantly (which breaks 3NF), we compute it live from REVIEWS. These three triggers ensure the denormalized PRODUCTS.avg_rating is always consistent.

**Trigger 13 (Status history + notification)**: One trigger performs two inserts — ORDER_STATUS_HISTORY and NOTIFICATIONS. Demonstrates that triggers can write to multiple tables.

**Trigger 14 (Restock notification)**: Uses a SELECT ... INSERT pattern to fan out notifications to all users who wishlisted the product.

---

## 10. Functions (7)

| # | Function Name | Returns | Description |
|---|---|---|---|
| 1 | `fn_apply_coupon(subtotal, type, val, max)` | DECIMAL | Applies percentage or fixed coupon to subtotal with cap |
| 2 | `fn_discounted_price(price, pct)` | DECIMAL | Returns price after given % discount |
| 3 | `fn_cart_subtotal(user_id)` | DECIMAL | Sums cart items × price for a user |
| 4 | `fn_validate_coupon(code, subtotal)` | DECIMAL | Validates coupon code and returns discount amount |
| 5 | `fn_customer_order_count(user_id)` | INT | Counts non-cancelled orders for a customer |
| 6 | `fn_zone_shipping_fee(emirate, is_express)` | DECIMAL | Looks up shipping fee from SHIPPING_ZONES |
| 7 | `fn_price_with_vat(price)` | DECIMAL | Returns price × 1.05 (UAE 5% VAT) |

**Key Function Explanations:**

`fn_apply_coupon` — DETERMINISTIC function implementing business logic: if type = 'percentage', calculate discount and cap at `max_discount`; if type = 'fixed', return the flat amount; in both cases prevent discount exceeding subtotal.

`fn_validate_coupon` — READS SQL DATA function that checks coupon validity (active, not expired, uses not exhausted, minimum order met) and calls `fn_apply_coupon` to return the actual discount. Called by `sp_place_order`.

`fn_zone_shipping_fee` — Demonstrates a function with a SELECT query. Looks up emirate-specific shipping rates from SHIPPING_ZONES, with fallback defaults.

---

## 11. Stored Procedures (9)

| # | Procedure | Parameters | Purpose |
|---|---|---|---|
| 1 | `sp_place_order` | user_id, address_id, coupon_code, pay_method, ship_method → order_id, message | Full atomic checkout: validates, calculates, inserts ORDERS + ORDER_ITEMS + PAYMENTS, clears cart |
| 2 | `sp_dashboard_stats` | none | Returns 10 KPIs for admin dashboard in one query |
| 3 | `sp_top_selling_products` | p_limit INT | Top N products by units sold with revenue breakdown |
| 4 | `sp_user_order_history` | p_user_id INT | Full order history with product details and images |
| 5 | `sp_restock_product` | product_id, quantity, admin_id | Updates stock, logs to AUDIT_LOG, returns before/after |
| 6 | `sp_monthly_revenue` | p_year INT | Month-by-month revenue report for given year |
| 7 | `sp_search_products` | query, category_id, brand_id, min/max price, sort, page, limit | Dynamic full-text search with filters using PREPARE/EXECUTE |
| 8 | `sp_broadcast_promo` | title, body | Inserts a NOTIFICATIONS row for every active customer |
| 9 | `sp_order_timeline` | p_order_id INT | Returns full ORDER_STATUS_HISTORY for an order |

**Key Procedure Explanations:**

`sp_place_order` — Most complex procedure. Uses a CURSOR to iterate cart items, calls `fn_cart_subtotal` and `fn_apply_coupon` and `fn_shipping_fee`, wraps everything in a `START TRANSACTION / COMMIT` with an `EXIT HANDLER FOR SQLEXCEPTION` that rolls back on error. OUT parameters return the new order_id and a human-readable message.

`sp_search_products` — Demonstrates dynamic SQL via `PREPARE` / `EXECUTE` / `DEALLOCATE`. Builds the WHERE clause conditionally based on non-null parameters, avoiding N+1 query patterns.

---

## 12. Schemas & Normal Forms

### First Normal Form (1NF)
All attributes are atomic. Multi-valued attributes extracted:
- Product images → PRODUCT_IMAGES (separate table)
- Product specifications → PRODUCT_ATTRIBUTES (EAV)
- Product tags → PRODUCT_TAGS junction table
- User addresses → ADDRESSES (not a comma-separated column in USERS)

### Second Normal Form (2NF)
All non-key attributes fully depend on the entire primary key. Junction tables PRODUCT_TAGS and CART_ITEMS have composite PKs where every attribute depends on the full composite key.

### Third Normal Form (3NF)
No transitive dependencies:
- Product brand details (country, logo) moved to BRANDS (was: product_id → brand_id → brand_country)
- Category parent info in CATEGORIES (self-referencing, not duplicated in PRODUCTS)
- Address stored in ADDRESSES (not duplicated in ORDERS — ORDERS references address_id)

### Boyce-Codd Normal Form (BCNF)
Every determinant is a candidate key:
- ORDER_ITEMS: {order_id, product_id} → {quantity, unit_price} — composite PK is the only determinant
- REVIEWS: {user_id, product_id} UNIQUE constraint enforced
- PAYMENTS: {order_id} UNIQUE — 1:1 with ORDERS

### Integrity Constraints Summary
- **Domain constraints**: CHECK (price >= 0), CHECK (stock_qty >= 0), CHECK (rating BETWEEN 1 AND 5)
- **Entity integrity**: All PKs are NOT NULL AUTO_INCREMENT
- **Referential integrity**: All FKs defined with appropriate ON DELETE actions (CASCADE / SET NULL)
- **Business constraints**: Enforced via triggers (stock check, default address, rating maintenance)

---

## 13. Frontend Architecture

### Technology Stack
- **Framework**: Flutter 3.x (Web target)
- **Language**: Dart
- **State Management**: Provider package (ChangeNotifier)
- **HTTP**: `http` package v1.2.0
- **Persistence**: `shared_preferences` v2.2.3
- **Fonts**: Google Fonts (Inter)
- **Animations**: `animate_do` v3.3.4

### File Structure
```
flutter_landing/lib/
├── main.dart                    # App entry — MultiProvider + named routes
├── theme/
│   └── app_theme.dart           # Dark luxury theme (bg:#07070B, accent:#3B82F6)
├── models/
│   ├── product.dart             # Product model + mockList()
│   ├── cart_item.dart           # CartItem with lineTotal
│   ├── order.dart               # Order model
│   └── app_user.dart            # AppUser model
├── services/
│   └── api_service.dart         # HTTP calls with offline mock fallback
├── providers/
│   ├── cart_provider.dart       # Cart state + SharedPreferences persistence
│   └── auth_provider.dart       # Auth state + SharedPreferences persistence
├── pages/
│   ├── landing_page.dart        # Home page — hero, featured grid, footer
│   ├── shop_page.dart           # Product listing — search, filter, sort grid
│   ├── product_detail_page.dart # Product detail — image, qty, add to cart
│   ├── cart_page.dart           # Shopping cart — items, summary, checkout
│   ├── auth_page.dart           # Login / Register form
│   ├── checkout_page.dart       # Address form, payment selection, order place
│   └── orders_page.dart         # Order history with status badges
├── sections/
│   ├── hero_section.dart        # Landing hero with animated headline
│   ├── featured_grid.dart       # Featured products grid section
│   └── footer_section.dart      # Site footer
└── widgets/
    ├── glass_nav_bar.dart        # Glassmorphism navbar with cart badge + auth
    ├── product_card.dart         # Product card — hover animation + add to cart
    └── in_view_fade.dart         # Scroll-triggered fade-in animation
```

### State Flow
```
ApiService (HTTP/Mock) ──→ CartProvider (ChangeNotifier) ──→ GlassNavBar (cart badge)
                                                         ──→ CartPage
                                                         ──→ CheckoutPage
ApiService (HTTP/Mock) ──→ AuthProvider (ChangeNotifier) ──→ GlassNavBar (user icon)
                                                         ──→ OrdersPage
                                                         ──→ AuthPage
```

### Offline-First Design
All API calls are wrapped in try/catch with graceful fallbacks:
- Products: returns `Product.mockList()` with 12 real-world items
- Auth: creates a local mock AppUser with generated token
- Orders: returns empty list (orders placed locally via ApiService.placeOrder fallback)
- Cart: persisted entirely in SharedPreferences — never depends on network

### Routing
```dart
routes: {
  '/':          LandingPage,   // Homepage
  '/shop':      ShopPage,      // Product listing
  '/cart':      CartPage,      // Shopping cart
  '/auth':      AuthPage,      // Sign in / Register
  '/checkout':  CheckoutPage,  // Checkout flow
  '/orders':    OrdersPage,    // Order history
}
```

---

## 14. Backend Architecture

### Technology Stack
- **Runtime**: Node.js 18 LTS
- **Framework**: Express.js 4.x
- **Database**: MySQL 8.0 (Railway managed)
- **ORM**: Raw SQL with mysql2/promise
- **Auth**: JWT (jsonwebtoken) + bcrypt for password hashing
- **Hosting**: Railway (https://shopsphere-bits.up.railway.app)

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT token |
| GET | /api/products | List products (search, filter, sort, paginate) |
| GET | /api/products/:id | Single product detail |
| GET | /api/categories | List active categories |
| GET | /api/cart | Get user's cart (auth required) |
| POST | /api/cart | Add item to cart |
| PUT | /api/cart/:id | Update cart item quantity |
| DELETE | /api/cart/:id | Remove cart item |
| POST | /api/orders | Place order (calls sp_place_order) |
| GET | /api/orders | Get user's order history |
| GET | /api/orders/:id | Single order detail |
| POST | /api/reviews | Submit product review |
| GET | /api/admin/stats | Dashboard KPIs (admin only) |

### Database Connection
```javascript
// backend/db/connection.js
const pool = mysql2.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'shopsphere',
  waitForConnections: true,
  connectionLimit: 10,
});
```

### Order Placement Flow
```
Client POST /api/orders
  → Express validates JWT
  → Resolves address_id from user's default address
  → Calls CALL sp_place_order(user_id, address_id, coupon, method, ...)
  → sp_place_order validates cart, coupon, computes totals
  → Inserts ORDERS + ORDER_ITEMS (triggers fire: stock check, deduct, coupon increment)
  → Inserts PAYMENTS
  → Clears CART_ITEMS
  → Returns order_id + total
  → Express returns JSON to Flutter client
```

---

## 15. Homepage Description

The ShopSphere homepage (`/`) is a single-page Flutter Web application served from GitHub Pages. It features:

### Design Language
- **Background**: Near-black `#07070B` — creates depth without pure black harshness
- **Surface**: `#0F0F16` cards with 1px `#2A2A3A` borders — subtle glassmorphism
- **Accent**: Electric blue `#3B82F6` — used for CTAs, badges, and highlights
- **Typography**: Inter (Google Fonts) — weights 400 to 900 — clean modern sans-serif

### Sections

**1. Glass Navigation Bar**
Floating glassmorphism pill at the top with backdrop blur. Contains:
- ShopSphere logo (clickable → home)
- Collection, Featured, Orders nav links (hidden on mobile)
- Shopping cart icon with live badge count (from CartProvider)
- User account icon (changes colour when logged in)
- "Sign in" and "Shop" pill buttons

**2. Hero Section**
Full-viewport hero with gradient-layered background. Animated headline with staggered fade-in. Two CTA buttons — "Shop Collection" (→ /shop) and "View Featured". Statistics chips showing product count and categories.

**3. Featured Products Grid**
Responsive grid (1–4 columns based on screen width) showing featured products loaded from the API (mock fallback). Each ProductCard shows:
- Product image with category chip overlay
- Discount badge (if applicable)
- Product name, star rating, review count
- Price (with strikethrough compare price)
- Add-to-cart button with flash animation

**4. Footer Section**
Brand tagline, quick links, social icon row. Constrained to max-width for wide screens.

### Performance & UX
- Scroll-triggered fade-in animations via `InViewFade` widget (VisibilityDetector)
- Shimmer loading skeletons while products load
- Hover scale animations on product cards (desktop)
- Smooth custom scroll behavior (no default browser scroll snap)
- Mobile-responsive at all breakpoints (320px–2560px)

---

## 16. Demo Guide

### Prerequisites
- Browser: Chrome / Edge (Flutter Web)
- URL: https://292akhil2929-cmyk.github.io/dbs1/
- MySQL client (MySQL Workbench / DBeaver) for database demo

### Frontend Demo Steps

**Step 1 — Landing Page**
1. Open the URL. Observe the glassmorphism navbar and hero animation.
2. Scroll down — products fade in as they enter the viewport.
3. Hover over a product card — observe the scale animation and blue border.

**Step 2 — Shop Page**
1. Click "Shop" in the navbar → `/shop`
2. Type "Sony" in the search bar → products filter live
3. Select "Electronics" category chip → filters by category
4. Change sort to "Price: Low → High" → products reorder
5. Clear search to show all products

**Step 3 — Product Detail**
1. Click on any product card → navigates to detail page
2. Observe the star ratings, stock indicator, brand chip
3. Use +/− buttons to set quantity to 2
4. Click "Add to Cart" → green flash animation, snackbar appears
5. Notice the cart badge in the navbar updates to show item count

**Step 4 — Cart**
1. Click the cart icon in navbar → `/cart`
2. Adjust quantity of an item using stepper
3. Delete an item — observe total recalculates
4. Review Order Summary: Subtotal, Shipping (AED 10), VAT (5%), Total

**Step 5 — Sign In**
1. Click "Sign in" in the navbar → `/auth`
2. Enter any email (e.g., demo@test.com) and any password (6+ chars)
3. Click "Sign In" — succeeds (offline mock creates a session)
4. Observe user icon in navbar turns blue (logged in state)

**Step 6 — Checkout**
1. From cart, click "Proceed to Checkout" → `/checkout`
2. Fill in a street address (e.g., "123 Sheikh Zayed Rd")
3. Select payment method (e.g., "Apple Pay")
4. Click "Place Order" → success screen with order ID
5. Click "View Orders" → navigated to order history

**Step 7 — Orders**
1. Navigate to `/orders`
2. View order cards with status badges (green = delivered, blue = confirmed, etc.)
3. Pull-to-refresh supported

---

### Database Demo Steps (MySQL Workbench)

**Step 1 — Run Schema**
```sql
SOURCE path/to/backend/db/schema.sql;
```
This creates the database, all 20 tables, seeds all data, and creates views/functions/triggers/procedures.

**Step 2 — Verify Tables**
```sql
USE shopsphere;
SHOW TABLES;  -- should return 20 tables
SELECT COUNT(*) FROM PRODUCTS;   -- 20 products
SELECT COUNT(*) FROM ORDERS;     -- 7 demo orders
```

**Step 3 — Demo Views**
```sql
SELECT * FROM vw_product_catalog LIMIT 5;
SELECT * FROM vw_order_summary;
SELECT * FROM vw_customer_ltv ORDER BY lifetime_value DESC;
SELECT * FROM vw_low_stock;
SELECT * FROM vw_product_tags;
```

**Step 4 — Demo Functions**
```sql
SELECT fn_cart_subtotal(2);          -- Alice's cart total
SELECT fn_validate_coupon('WELCOME10', 1000.00);  -- Returns 100.00
SELECT fn_discounted_price(4999.00, 15.4);        -- iPhone after 15.4% off
SELECT fn_zone_shipping_fee('Dubai', 0);          -- AED 10
SELECT fn_price_with_vat(1000.00);                -- AED 1050.00
```

**Step 5 — Demo Triggers**
```sql
-- Trigger 1 & 2: Add an order item — stock decreases
SELECT stock_qty FROM PRODUCTS WHERE product_id = 3;  -- before
INSERT INTO ORDER_ITEMS(order_id,product_id,quantity,unit_price) VALUES(1,3,2,2999.00);
SELECT stock_qty FROM PRODUCTS WHERE product_id = 3;  -- after (reduced by 2)

-- Trigger 4: Add a review — avg_rating updates
SELECT avg_rating, review_count FROM PRODUCTS WHERE product_id = 3; -- before
INSERT INTO REVIEWS(user_id,product_id,order_id,rating,title,comment) VALUES(2,3,1,5,'Great!','Excellent.');
SELECT avg_rating, review_count FROM PRODUCTS WHERE product_id = 3; -- after

-- Trigger 13: Update order status — history record + notification created
UPDATE ORDERS SET status='shipped' WHERE order_id=6;
SELECT * FROM ORDER_STATUS_HISTORY WHERE order_id=6;
SELECT * FROM NOTIFICATIONS WHERE user_id=7;
```

**Step 6 — Demo Stored Procedures**
```sql
-- Dashboard KPIs
CALL sp_dashboard_stats();

-- Top 5 products by sales
CALL sp_top_selling_products(5);

-- Monthly revenue for 2026
CALL sp_monthly_revenue(2026);

-- Order timeline for order 1
CALL sp_order_timeline(1);

-- Restock product 3 by 50 units
CALL sp_restock_product(3, 50, 1);
SELECT * FROM AUDIT_LOG WHERE table_name='PRODUCTS' ORDER BY changed_at DESC LIMIT 3;
```

**Step 7 — Demo Complex Queries**
```sql
-- Correlated: products above category average price
SELECT p.name, p.price, c.name AS category,
  (SELECT ROUND(AVG(p2.price),2) FROM PRODUCTS p2 WHERE p2.category_id=p.category_id) AS cat_avg
FROM PRODUCTS p JOIN CATEGORIES c ON p.category_id=c.category_id
WHERE p.price > (SELECT AVG(p3.price) FROM PRODUCTS p3 WHERE p3.category_id=p.category_id)
ORDER BY c.name, p.price DESC;

-- EXISTS: buyers who never reviewed
SELECT u.full_name FROM USERS u
WHERE EXISTS (SELECT 1 FROM ORDERS o WHERE o.user_id=u.user_id)
  AND NOT EXISTS (SELECT 1 FROM REVIEWS r WHERE r.user_id=u.user_id);

-- Window function: rank by revenue per category
SELECT product_name, category_name, revenue,
  RANK() OVER (PARTITION BY category_name ORDER BY revenue DESC) AS rank_in_cat
FROM vw_revenue_by_category;
```

---

### Team Responsibilities (Example Division)

| Member | Contribution |
|---|---|
| Member 1 | Database schema design, ERD, normalization proof |
| Member 2 | Triggers (1–7) and Functions (1–4) |
| Member 3 | Stored Procedures (1–5), complex queries |
| Member 4 | Flutter frontend (landing page, shop, product detail) |
| Member 5 | Flutter cart, checkout, orders, auth pages |
| Member 6 | New tables (16–20), Views 6–7, deployment pipeline, documentation |

---

*ShopSphere — CS F212 Database Systems | BITS Pilani Dubai Campus*
*Compiled using MySQL 8.0, Flutter 3.x, Node.js 18, Railway, GitHub Pages*
