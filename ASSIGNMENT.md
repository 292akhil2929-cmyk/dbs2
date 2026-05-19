# ShopSphere — CS F212 Database Systems Assignment
## BITS Pilani Dubai | Group Report

**Team:** Rehan · Mani · Raghav (Backend) · Akhil (Frontend) · Zayed (Report)  
**Live Site:** https://292akhil2929-cmyk.github.io/dbs2/shop  
**Backend API:** https://shopsphere-production-4454.up.railway.app  
**GitHub:** https://github.com/292akhil2929-cmyk/dbs2

> **Evaluation Day Note:** The backend runs on Railway's free tier. If the site shows "Offline · Mock data" during evaluation, go to https://railway.app, open the ShopSphere project, and click **Redeploy** or wake the service. It sleeps after ~15 minutes of inactivity. The frontend always works — it falls back to mock data automatically.

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [System Architecture](#2-system-architecture)
3. [Entity-Relationship Diagram](#3-entity-relationship-diagram)
4. [Relational Schema — All 20 Tables](#4-relational-schema--all-20-tables)
5. [Normalization Analysis](#5-normalization-analysis)
6. [Views (7)](#6-views)
7. [Stored Functions (7)](#7-stored-functions)
8. [Triggers (14)](#8-triggers)
9. [Stored Procedures (9)](#9-stored-procedures)
10. [Complex Queries](#10-complex-queries)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Deployment](#12-deployment)
13. [Quick-Reference Cheat Sheet](#13-quick-reference-cheat-sheet)

---

## 1. Problem Statement

### What we built
ShopSphere is a full-stack e-commerce platform for tech and lifestyle products, targeted at UAE consumers. Customers browse products, add them to a cart, apply discount coupons, and place orders. Admins manage inventory, view analytics, and run promotions. The project demonstrates a production-grade relational database design alongside a modern React frontend.

### Why this problem
E-commerce is the canonical domain for relational databases because it naturally exercises every concept covered in CS F212:
- **Entity modelling** — products, users, orders are distinct real-world entities
- **Relationships** — orders contain many items, users have many addresses, products belong to categories that can have sub-categories (self-referencing FK)
- **Normalization** — a naive single-table design violates 1NF (multiple images per product), 2NF (address depends on user not order), and BCNF (brand info creates a transitive dependency through product)
- **Transactions** — placing an order must atomically deduct stock, record items, create a payment record, and clear the cart; partial failure must rollback everything
- **Triggers** — stock must be deducted automatically when an order item is inserted, and restored automatically when an order is cancelled
- **Analytics** — views and stored procedures provide revenue reports, customer lifetime value, and low-stock alerts without repeated complex joins in application code

### Scope
- 20 relational tables, 7 views, 7 functions, 14 triggers, 9 stored procedures
- MySQL 8 on Railway PostgreSQL-compatible backend (Node.js REST API)
- Next.js 14 frontend deployed on GitHub Pages
- Full seed data: 15 brands, 15 categories, 7 users, 20 products, 7 coupons, demo orders + reviews

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT BROWSER                      │
│                                                           │
│  Next.js 14 (Static Export — GitHub Pages)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Navbar   │ │HeroSection│ │ProductGrid│ │ Cart Drawer│  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│                      │ fetch /api/products                │
│                      │ POST  /api/orders                  │
└──────────────────────┼──────────────────────────────────┘
                        │  HTTPS
┌──────────────────────▼──────────────────────────────────┐
│         Railway (Node.js Express REST API)                │
│                                                           │
│  GET  /api/products  → SELECT from PRODUCTS + BRANDS     │
│  POST /api/orders    → INSERT into ORDERS + ORDER_ITEMS  │
└──────────────────────┬──────────────────────────────────┘
                        │  MySQL driver
┌──────────────────────▼──────────────────────────────────┐
│         Railway PostgreSQL / MySQL 8 Database             │
│                                                           │
│  20 tables  7 views  7 functions  14 triggers  9 procs   │
└─────────────────────────────────────────────────────────┘
```

**Data flow for "Add to Cart → Place Order":**
1. User clicks "Add to Cart" → frontend state update (React `useState`)
2. User opens cart, clicks "Place Order"
3. Frontend POSTs `{ items: [...], total }` to `/api/orders` on Railway
4. Railway API calls `sp_place_order` stored procedure (or direct INSERT)
5. `trg_check_stock_before_order` fires — validates stock before each item insert
6. `trg_deduct_stock_after_order` fires — deducts stock automatically
7. `trg_increment_coupon_usage` fires — increments coupon used_count
8. `trg_audit_product_update` fires — logs price/stock change to AUDIT_LOG
9. Response returns order_id; frontend shows "Order Placed!" confirmation

---

## 3. Entity-Relationship Diagram

### Entities and Cardinalities

```
CATEGORIES ──┐ (self-ref: parent_id → category_id)
             │
             │ 1:N
PRODUCTS ────┤──── PRODUCT_IMAGES     (1 product → many images)
             │──── PRODUCT_ATTRIBUTES (1 product → many EAV specs)
             │──── PRODUCT_TAGS       (M:N via junction table)
             │
BRANDS ──────┘ (brand_id FK in PRODUCTS)

TAGS ────────── PRODUCT_TAGS ── PRODUCTS   (M:N resolved)

USERS ──────┬── ADDRESSES       (1 user → many addresses)
            ├── ORDERS           (1 user → many orders)
            ├── CART_ITEMS       (1 user → many cart items)
            ├── WISHLISTS        (1 user → many wishlist items)
            ├── REVIEWS          (1 user → many reviews)
            └── NOTIFICATIONS    (1 user → many notifications)

ORDERS ─────┬── ORDER_ITEMS      (1 order → many line items)
            ├── PAYMENTS         (1 order → 1 payment, 1:1)
            └── ORDER_STATUS_HISTORY  (1 order → many status changes)

COUPONS ─────── ORDERS           (1 coupon → many orders, nullable)

PRODUCTS ───── ORDER_ITEMS       (1 product → many order lines)
PRODUCTS ───── CART_ITEMS        (1 product → many cart lines)
PRODUCTS ───── WISHLISTS         (1 product → many wishlist entries)
PRODUCTS ───── REVIEWS           (1 product → many reviews)

SHIPPING_ZONES  (standalone — looked up by emirate via fn_zone_shipping_fee)
AUDIT_LOG       (standalone — written by triggers, no FK to keep it immutable)
```

### Key Relationship Notes
| Relationship | Type | How implemented |
|---|---|---|
| Category → sub-categories | Self-referencing 1:N | `parent_id FK → category_id` in same table |
| Product → multiple images | 1:N | PRODUCT_IMAGES with `is_primary` flag |
| Product → flexible specs | 1:N EAV | PRODUCT_ATTRIBUTES (attr_name, attr_value) |
| Product ↔ Tags | M:N | PRODUCT_TAGS junction table (composite PK) |
| Order → Payment | 1:1 | UNIQUE KEY on `order_id` in PAYMENTS |
| Review → must be buyer | Verified FK | REVIEWS has `order_id FK` — only people with a real order can review |

---

## 4. Relational Schema — All 20 Tables

### Table 1: CATEGORIES
**Purpose:** Stores product categories. Supports unlimited nesting (Electronics → Smartphones) through a self-referencing foreign key.

| Column | Type | Constraint | Explanation |
|---|---|---|---|
| category_id | INT | PK, AUTO_INCREMENT | Unique identifier, MySQL auto-generates |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Category name — unique enforced by `uq_cat_name` index |
| parent_id | INT | FK → CATEGORIES(category_id), NULL OK | NULL means top-level. Points to own table for hierarchy |
| description | TEXT | optional | Human-readable description |
| icon_url | VARCHAR(300) | optional | URL to category icon for UI |
| is_active | TINYINT(1) | DEFAULT 1 | Soft-delete flag — 0 hides category without deleting |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Auto-set on INSERT |

**Indexes:** `idx_cat_parent` (for JOIN on parent_id), `idx_cat_active` (for WHERE is_active=1 filters)  
**Self-referencing FK:** `ON DELETE SET NULL` — if a parent category is deleted, children become top-level (parent_id → NULL), not orphaned.

**Example data:**
- Electronics (id=1, parent=NULL) — top level
- Smartphones (id=6, parent=1) — child of Electronics
- Laptops & PCs (id=7, parent=1) — child of Electronics

---

### Table 2: USERS
**Purpose:** All registered users. Role field supports multi-tenant access (customer/admin/vendor).

| Column | Type | Constraint | Explanation |
|---|---|---|---|
| user_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| email | VARCHAR(191) | NOT NULL, UNIQUE | 191 chars because utf8mb4 + InnoDB index limit (767 bytes / 4 bytes per char) |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash — never store plaintext passwords |
| full_name | VARCHAR(150) | NOT NULL | Display name |
| phone | VARCHAR(25) | optional | International format (+971...) |
| role | ENUM | NOT NULL, DEFAULT 'customer' | Restricts to: customer, admin, vendor — ENUM enforced at DB level |
| is_active | TINYINT(1) | DEFAULT 1 | Soft-delete — deactivate without losing history |
| last_login | TIMESTAMP | NULL | Updated on authentication |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |

**Why email is 191 not 255:** MySQL's InnoDB with utf8mb4 has a 767-byte index limit. 191 × 4 bytes = 764 bytes, just under the limit.

---

### Table 3: ADDRESSES
**Purpose:** Delivery addresses separated from USERS. One user can have many addresses (home, office, etc.).

**Why this is its own table (2NF/BCNF):** In a naive design, you might put `street`, `city`, `country` directly in ORDERS. But address details depend on the user, not the order — this is a partial dependency. Separating into ADDRESSES satisfies 2NF and allows users to reuse addresses across multiple orders.

| Column | Type | Constraint | Explanation |
|---|---|---|---|
| address_id | INT | PK | Surrogate key |
| user_id | INT | FK → USERS, CASCADE DELETE | Address belongs to a user; deleted if user deleted |
| label | VARCHAR(50) | DEFAULT 'Home' | UI label: Home / Office / Other |
| full_name | VARCHAR(150) | NOT NULL | Recipient name (can differ from account owner) |
| street | VARCHAR(255) | NOT NULL | Street address |
| city | VARCHAR(100) | NOT NULL | City |
| state | VARCHAR(100) | optional | State/emirate |
| country | VARCHAR(100) | DEFAULT 'UAE' | Country |
| postal_code | VARCHAR(20) | optional | Some UAE areas have no postal code |
| is_default | TINYINT(1) | DEFAULT 0 | Only one default per user — enforced by Trigger 11 |

---

### Table 4: BRANDS
**Purpose:** Normalised brand entity — extracted from PRODUCTS to eliminate transitive dependency.

**Why separate (BCNF):** If brand details (country, website) were stored in PRODUCTS, we'd have `product_id → brand_name → {country, website}` — a transitive dependency that violates BCNF. By extracting BRANDS, we have `brand_id → {name, country, website}` and `product_id → brand_id` only.

| Column | Type | Constraint | Explanation |
|---|---|---|---|
| brand_id | INT | PK | Surrogate key |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Brand name, unique enforced |
| country | VARCHAR(100) | optional | Country of origin |
| website | VARCHAR(300) | optional | Brand's official URL |
| logo_url | VARCHAR(300) | optional | Brand logo for UI |
| is_active | TINYINT(1) | DEFAULT 1 | Soft-delete |

**Seed data (15 brands):** Apple, Samsung, Sony, Nike, Levi's, IKEA, Dell, JBL, Lenovo, DJI, Instant Pot, Ninja, Zara, Yonex, OnePlus

---

### Table 5: PRODUCTS
**Purpose:** Core product catalogue. Central table with the most foreign keys and indexes.

| Column | Type | Constraint | Explanation |
|---|---|---|---|
| product_id | INT | PK | Surrogate key |
| category_id | INT | FK → CATEGORIES, NOT NULL | Every product must belong to a category |
| brand_id | INT | FK → BRANDS, NULL OK | Some products (books) have no brand — `ON DELETE SET NULL` |
| name | VARCHAR(255) | NOT NULL | Product display name |
| slug | VARCHAR(300) | UNIQUE | URL-safe version: "iphone-15-pro". Auto-generated by Trigger 8 if not provided |
| description | TEXT | optional | Long marketing description |
| price | DECIMAL(10,2) | NOT NULL, CHECK ≥ 0 | Current selling price. DECIMAL not FLOAT to avoid floating-point rounding errors |
| compare_price | DECIMAL(10,2) | optional | Original/RRP price — shown as strikethrough in UI |
| stock_qty | INT | NOT NULL, CHECK ≥ 0, DEFAULT 0 | Current inventory. Decremented by trigger on order |
| sku | VARCHAR(100) | UNIQUE | Stock Keeping Unit — warehouse reference |
| weight_kg | DECIMAL(6,3) | optional | Used by `fn_shipping_fee` for weight-based shipping |
| avg_rating | DECIMAL(3,2) | DEFAULT 0.00, CHECK 0-5 | Auto-maintained by Triggers 4/5/6 when reviews are inserted/updated/deleted |
| review_count | INT | DEFAULT 0 | Denormalised count — auto-maintained by same triggers. Avoids COUNT(*) on REVIEWS for every page load |
| is_active | TINYINT(1) | DEFAULT 1 | Soft-delete |
| is_featured | TINYINT(1) | DEFAULT 0 | Featured products shown first in UI |
| created_at / updated_at | TIMESTAMP | Auto-managed | `updated_at` uses `ON UPDATE CURRENT_TIMESTAMP` |

**Indexes:**
- `idx_prod_cat`, `idx_prod_brand` — JOIN performance
- `idx_prod_price`, `idx_prod_rating` — ORDER BY / filter performance
- `idx_prod_active`, `idx_prod_featured` — WHERE clause filters
- `FULLTEXT ft_prod_search (name, description)` — enables `MATCH() AGAINST()` full-text search in `sp_search_products`

**CHECK constraints:** MySQL 8 enforces `price >= 0`, `stock_qty >= 0`, `avg_rating BETWEEN 0 AND 5` at the database level — not just in application code.

---

### Table 6: PRODUCT_IMAGES
**Purpose:** Stores multiple images per product. Extracted to satisfy 1NF.

**Why separate (1NF):** A product has multiple images. If we stored them as `image1_url, image2_url, image3_url` columns in PRODUCTS, we'd violate 1NF (repeating groups). The correct design is a separate table with one row per image.

| Column | Type | Explanation |
|---|---|---|
| image_id | INT PK | Surrogate key |
| product_id | INT FK CASCADE | Cascade delete — images deleted with product |
| url | VARCHAR(500) | Full image URL (Unsplash, Picsum, or CDN) |
| alt_text | VARCHAR(200) | Accessibility text for screen readers |
| is_primary | TINYINT(1) | 1 = main display image (used in JOINs with `pi.is_primary=1`) |
| sort_order | INT | Controls image gallery order in UI |

---

### Table 7: PRODUCT_ATTRIBUTES
**Purpose:** Entity-Attribute-Value (EAV) table for flexible product specifications.

**Why EAV:** Different product categories have completely different specs. A smartphone has RAM, Storage, OS. A tennis racket has weight, string tension, grip size. Rather than adding 50+ nullable columns to PRODUCTS, we use EAV: one row per attribute per product.

| Column | Type | Explanation |
|---|---|---|
| attr_id | INT PK | Surrogate key |
| product_id | INT FK CASCADE | Cascade delete |
| attr_name | VARCHAR(100) | e.g. "RAM", "Storage", "Color", "Size" |
| attr_value | VARCHAR(255) | e.g. "8GB", "256GB", "Midnight Black", "XL" |

**UNIQUE KEY `uq_prod_attr(product_id, attr_name)`:** A product cannot have two values for the same attribute name.

**Example:** iPhone 15 Pro → (Storage: 256GB), (RAM: 8GB), (Display: 6.1 inch Super Retina XDR), (OS: iOS 17)

---

### Table 8: COUPONS
**Purpose:** Discount coupons — supports both percentage and fixed-amount discounts with caps, expiry, and usage limits.

| Column | Type | Explanation |
|---|---|---|
| coupon_id | INT PK | Surrogate key |
| code | VARCHAR(50) UNIQUE | The code users enter: WELCOME10, FLASH50 |
| type | ENUM('percentage','fixed') | Controls how discount is calculated |
| discount_value | DECIMAL(10,2) | 10.00 for 10%, or 100.00 for AED 100 off |
| min_order_amt | DECIMAL(10,2) | Minimum cart value to use this coupon |
| max_discount | DECIMAL(10,2) nullable | Cap for percentage coupons (e.g. max AED 500 off even if 50%) |
| expires_at | DATE | Coupon is invalid after this date |
| max_uses | INT | Hard limit on total redemptions |
| used_count | INT DEFAULT 0 | Auto-incremented by `trg_increment_coupon_usage` |
| is_active | TINYINT(1) | Manual disable without deletion |

**Seed coupons:**
| Code | Type | Value | Min Order | Max Discount |
|---|---|---|---|---|
| WELCOME10 | % | 10% | AED 0 | AED 500 |
| SUMMER20 | % | 20% | AED 200 | AED 800 |
| FLASH50 | % | 50% | AED 1000 | AED 2000 |
| VIP30 | % | 30% | AED 500 | AED 1500 |
| STUDENT15 | % | 15% | AED 100 | AED 300 |
| FLAT100 | fixed | AED 100 | AED 500 | — |
| TECH500 | fixed | AED 500 | AED 5000 | — |

---

### Table 9: ORDERS
**Purpose:** Master order record. One row per customer order.

| Column | Type | Explanation |
|---|---|---|
| order_id | INT PK | Surrogate key |
| user_id | INT FK → USERS | Order owner — NOT NULL, orders tied to accounts |
| address_id | INT FK → ADDRESSES | Delivery address snapshot reference |
| coupon_id | INT FK → COUPONS nullable | NULL if no coupon applied. `ON DELETE SET NULL` preserves order history if coupon deleted |
| subtotal | DECIMAL(10,2) | Sum of all line items before discount |
| discount_amt | DECIMAL(10,2) | Coupon discount applied |
| shipping_fee | DECIMAL(10,2) | Calculated by `fn_shipping_fee` or `fn_zone_shipping_fee` |
| tax_amt | DECIMAL(10,2) | UAE VAT 5% on (subtotal - discount) |
| total_amount | DECIMAL(10,2) | Final amount = subtotal - discount + shipping + tax |
| status | ENUM | pending → confirmed → processing → shipped → delivered / cancelled / refunded |
| tracking_no | VARCHAR(100) nullable | Set when order is shipped |
| notes | TEXT | Special delivery instructions |
| ordered_at | TIMESTAMP | When order was placed |
| updated_at | TIMESTAMP ON UPDATE | Auto-updates on any status change |

**Indexes:** `idx_ord_user` (customer order history queries), `idx_ord_status` (admin filtering by status), `idx_ord_date` (monthly revenue reports)

---

### Table 10: ORDER_ITEMS
**Purpose:** Line items within an order — one row per product per order.

| Column | Type | Explanation |
|---|---|---|
| item_id | INT PK | Surrogate key |
| order_id | INT FK CASCADE | Parent order — CASCADE DELETE removes items if order deleted |
| product_id | INT FK | Reference to product. NOT CASCADE — product record must remain for history |
| quantity | INT NOT NULL CHECK > 0 | Units ordered |
| unit_price | DECIMAL(10,2) NOT NULL | **Price at time of order (price snapshot)** |

**Why `unit_price` is not a derived value (3NF reasoning):** If we omitted `unit_price` and computed it as `quantity × PRODUCTS.price`, the price displayed in order history would change if a product's price is later updated. By storing the price at order time, we preserve the exact amount charged. This is intentional denormalisation — a price snapshot prevents the transitive dependency `item_id → product_id → price`.

**UNIQUE KEY `uq_order_product(order_id, product_id)`:** Prevents the same product appearing twice in one order. If quantity changes, update the existing row.

---

### Table 11: PAYMENTS
**Purpose:** Payment record for each order. One-to-one with ORDERS.

| Column | Type | Explanation |
|---|---|---|
| payment_id | INT PK | Surrogate key |
| order_id | INT FK CASCADE, UNIQUE | UNIQUE enforces 1:1 with ORDERS |
| method | ENUM | credit_card, debit_card, paypal, bank_transfer, cash_on_delivery, apple_pay, google_pay |
| status | ENUM | pending, completed, failed, refunded, partially_refunded |
| amount | DECIMAL(10,2) | Amount charged (matches order total_amount) |
| txn_ref | VARCHAR(150) | Payment gateway transaction reference |
| gateway_resp | TEXT | Raw JSON response from payment gateway (stored for dispute resolution) |
| paid_at | TIMESTAMP nullable | Null until payment completes |

---

### Table 12: REVIEWS
**Purpose:** Verified product reviews — linked to orders to ensure only actual buyers can review.

| Column | Type | Explanation |
|---|---|---|
| review_id | INT PK | Surrogate key |
| user_id | INT FK CASCADE | Reviewer |
| product_id | INT FK CASCADE | Reviewed product |
| order_id | INT FK | **The order that included this product** — enforces verified purchase |
| rating | TINYINT CHECK 1-5 | Star rating 1–5 |
| title | VARCHAR(200) | Review headline |
| comment | TEXT | Full review body |
| is_verified | TINYINT(1) DEFAULT 1 | Always true since order_id is required |
| helpful_count | INT DEFAULT 0 | "Was this helpful?" vote count |
| created_at | TIMESTAMP | When review was written |

**UNIQUE KEY `uq_user_product_review(user_id, product_id)`:** One review per user per product maximum.

**Business rule enforced by schema:** `order_id FK` ensures you cannot insert a review unless that order actually exists. Application logic additionally checks that the order belongs to the reviewing user and contains the product.

---

### Table 13: CART_ITEMS
**Purpose:** Persistent shopping cart — survives browser sessions because it's stored in the DB, not just localStorage.

| Column | Type | Explanation |
|---|---|---|
| cart_id | INT PK | Surrogate key |
| user_id | INT FK CASCADE | Cart owner — deleted with user |
| product_id | INT FK CASCADE | Cart item — deleted if product deleted |
| quantity | INT CHECK > 0 | Units in cart |
| added_at | TIMESTAMP | When item was added |

**UNIQUE KEY `uq_cart_user_product(user_id, product_id)`:** Prevents duplicates. If user adds same product twice, application updates quantity instead of inserting a new row.

---

### Table 14: WISHLISTS
**Purpose:** Saved/bookmarked items for later. Same structure as CART_ITEMS but semantically different.

| Column | Explanation |
|---|---|
| wishlist_id | Surrogate key |
| user_id FK CASCADE | Owner |
| product_id FK CASCADE | Saved product |
| added_at | When saved |

**UNIQUE KEY `uq_wish_user_product(user_id, product_id)`:** One wishlist entry per product per user.

**Trigger 14 (`trg_notify_restock`) uses this table:** When a wishlist product goes from stock 0 to > 0, notifications are sent to all users who wishlisted it.

---

### Table 15: AUDIT_LOG
**Purpose:** Immutable audit trail. Written by triggers — never directly by application code.

| Column | Type | Explanation |
|---|---|---|
| log_id | INT PK AUTO_INCREMENT | Append-only identifier |
| table_name | VARCHAR(60) | Which table was changed: 'PRODUCTS', 'USERS', 'ORDERS' |
| record_id | INT | Primary key of the changed record |
| action | ENUM('INSERT','UPDATE','DELETE') | What happened |
| changed_by | INT nullable | user_id of admin who made the change (NULL if system/trigger) |
| old_value | JSON | Previous state (NULL for INSERT) |
| new_value | JSON | New state (NULL for DELETE) |
| ip_address | VARCHAR(45) | Caller IP — supports IPv6 |
| changed_at | TIMESTAMP | When the change happened |

**No FK on `changed_by`:** Intentional — if a user is deleted, we must not lose the audit record. The log is immutable.

**No FK on `table_name / record_id`:** Intentional — if a product is deleted, the audit record of its creation/changes must persist.

---

### Table 16: NOTIFICATIONS
**Purpose:** In-app notification feed. Written by triggers (order updates, restock alerts) and procedures (broadcast promos).

| Column | Explanation |
|---|---|
| notif_id | PK |
| user_id FK CASCADE | Recipient |
| type ENUM | order_update, promo, restock, review_reply, system |
| title | Short notification headline |
| body | Full notification text |
| is_read | 0 = unread. Used by `vw_unread_notifications` |
| ref_id | Related record ID (order_id or product_id) |
| ref_type | 'orders' or 'products' or 'reviews' — context for navigation |
| created_at | When notification was created |

**Composite index `idx_notif_unread(user_id, is_read)`:** Optimises the very common query "get unread notifications for this user."

---

### Table 17: SHIPPING_ZONES
**Purpose:** Per-emirate shipping rate configuration used by `fn_zone_shipping_fee`.

| Column | Explanation |
|---|---|
| zone_id | PK |
| zone_name | Display name: "Dubai Standard" |
| country / emirate | Geographic scope |
| base_fee | Standard shipping cost for this zone |
| express_fee | Express shipping cost |
| free_above | Order value above which shipping is free (NULL = no free tier) |
| est_days | Estimated delivery days |
| is_active | Zone can be disabled without deletion |

**Seed data (7 zones):** Dubai (AED 10 standard, AED 25 express, free above AED 500), Abu Dhabi (AED 15/30, free >500), Sharjah, Ajman, RAK, Fujairah, UAQ.

---

### Table 18: TAGS
**Purpose:** Flexible product labels: Bestseller, New Arrival, Limited, Eco Friendly, Staff Pick, Clearance, Bundle Deal.

| Column | Explanation |
|---|---|
| tag_id | PK |
| name | UNIQUE — tag label |
| slug | UNIQUE — URL-safe version |
| color_hex | CHAR(7) — hex colour for UI badge (#F59E0B = amber for Bestseller) |

---

### Table 19: PRODUCT_TAGS
**Purpose:** Junction table resolving M:N relationship between PRODUCTS and TAGS.

**Why this satisfies 1NF:** Without this table, you'd need a multi-valued column `tags` in PRODUCTS (e.g. "Bestseller, Staff Pick") which violates 1NF. The junction table gives each tag assignment its own row.

| Column | Explanation |
|---|---|
| product_id | FK → PRODUCTS CASCADE |
| tag_id | FK → TAGS CASCADE |
| tagged_at | When this tag was applied |

**Composite PK `(product_id, tag_id)`:** Prevents the same tag being applied to the same product twice.

---

### Table 20: ORDER_STATUS_HISTORY
**Purpose:** Full audit trail of every status change an order goes through — required for SLA tracking and dispute resolution.

| Column | Explanation |
|---|---|
| history_id | PK |
| order_id FK CASCADE | Parent order |
| prev_status | Status before the change |
| new_status | Status after the change |
| changed_by | user_id of admin/system who made the change |
| comment | Optional note (e.g. "Dispatched via Emirates Post") |
| changed_at | When the transition happened |

**Written by Trigger 13 (`trg_order_status_history`):** Any UPDATE to ORDERS that changes the status column automatically inserts a row here.

**Seed history for Order #1:** pending → confirmed → processing → shipped → delivered (with comments at each step)

---

## 5. Normalization Analysis

### What we are normalizing and why

The naive approach to an e-commerce database is to put everything in one big table like:
```
OrderLine(order_id, user_name, user_email, user_phone, street, city, country,
          product_name, brand_name, brand_country, category_name,
          quantity, price, tag1, tag2, tag3)
```

This has massive redundancy. The same user_email appears in every row for that user. The same brand_country appears in every product row for that brand. Tags repeat in a way that makes querying impossible.

We apply normalization step by step:

---

### Functional Dependencies (FDs) — Explicit Notation

**USERS table:**
```
user_id → {email, password_hash, full_name, phone, role, is_active, last_login, created_at}
email → {user_id}   (email is a candidate key — UNIQUE constraint)
```

**CATEGORIES table:**
```
category_id → {name, parent_id, description, icon_url, is_active, created_at}
name → {category_id}   (name is a candidate key — UNIQUE constraint)
```

**BRANDS table:**
```
brand_id → {name, country, website, logo_url, is_active}
name → {brand_id}   (name is a candidate key — UNIQUE constraint)
```

**PRODUCTS table:**
```
product_id → {category_id, brand_id, name, slug, description, price, compare_price,
              stock_qty, sku, weight_kg, avg_rating, review_count, is_active,
              is_featured, created_at, updated_at}
slug → {product_id}   (slug is a candidate key — UNIQUE constraint)
sku  → {product_id}   (sku is a candidate key — UNIQUE constraint)
```

**ADDRESSES table:**
```
address_id → {user_id, label, full_name, street, city, state, country, postal_code, is_default}
user_id is NOT a determinant here because one user has MANY addresses — 
  this is why address was separated from USERS.
```

**ORDERS table:**
```
order_id → {user_id, address_id, coupon_id, subtotal, discount_amt, shipping_fee,
            tax_amt, total_amount, status, shipping_method, tracking_no, ordered_at}
```

**ORDER_ITEMS table:**
```
(order_id, product_id) → {quantity, unit_price}
item_id → {order_id, product_id, quantity, unit_price}
```
Note: `unit_price` is NOT functionally dependent on `product_id` alone — it is the **price at order time** (price snapshot). `product_id → price` would only hold for CURRENT price, not historical. Storing `unit_price` here is intentional.

**COUPONS table:**
```
coupon_id → {code, type, discount_value, min_order_amt, max_discount, expires_at, max_uses, used_count}
code → {coupon_id}   (code is a candidate key — UNIQUE constraint)
```

**PRODUCT_ATTRIBUTES table:**
```
(product_id, attr_name) → {attr_value}
attr_id → {product_id, attr_name, attr_value}
```

**TAGS table:**
```
tag_id → {name, slug, color_hex}
name → {tag_id}   (UNIQUE)
slug → {tag_id}   (UNIQUE)
```

**PRODUCT_TAGS table:**
```
(product_id, tag_id) → {tagged_at}
```
This table has no non-key attributes other than `tagged_at`. It is automatically in BCNF.

---

### First Normal Form (1NF)

**Requirement:** Every attribute must be atomic — no repeating groups, no multi-valued attributes.

**Violation 1 — Product images:** A product has multiple images. Storing `img1, img2, img3` as separate columns in PRODUCTS violates 1NF.  
**Fix:** PRODUCT_IMAGES table — each image is its own row.

**Violation 2 — Product tags:** A product can have multiple tags ("Bestseller", "Staff Pick").  
**Fix:** PRODUCT_TAGS junction table.

**Violation 3 — Product specifications:** A smartphone has RAM, Storage, Color, etc. A racket has weight, shaft flex, grip size. These can't be fixed columns.  
**Fix:** PRODUCT_ATTRIBUTES EAV table.

**Violation 4 — Multiple addresses:** A user has home address, office address, etc.  
**Fix:** ADDRESSES table — each address is its own row.

**Our schema is in 1NF** because:
- Every column holds a single atomic value
- There are no repeating column groups
- All multi-valued attributes have their own tables

---

### Second Normal Form (2NF)

**Requirement:** Must be in 1NF + every non-key attribute must be fully functionally dependent on the ENTIRE primary key (relevant only for composite keys).

**Violation analysis — hypothetical ORDER_ITEMS with user address:**

If ORDER_ITEMS had `(order_id, product_id, quantity, unit_price, user_street, user_city)`:
- `user_street` and `user_city` depend on the ORDER, not on `product_id` specifically
- This is a partial dependency — `order_id → user_street` but `product_id` has nothing to do with user_street

**Our fix:** Address details are in ORDERS (via `address_id FK`), not in ORDER_ITEMS.

**Another example — if ADDRESSES were in ORDERS:**

```
order_id → {user_id, street, city, country}
```
`street, city, country` depend on the user, not the specific order. This is a partial dependency.  
**Fix:** ADDRESSES table with `user_id FK`.

**Our schema is in 2NF** because:
- All tables with composite PKs (ORDER_ITEMS, PRODUCT_TAGS, PRODUCT_ATTRIBUTES) have non-key attributes that depend on the full composite key
- `(order_id, product_id) → quantity` — quantity depends on both (which product in which order)
- `(order_id, product_id) → unit_price` — price snapshot depends on both
- `(product_id, attr_name) → attr_value` — value depends on which attribute of which product

---

### Third Normal Form (3NF)

**Requirement:** Must be in 2NF + no transitive dependencies (non-key attribute must not depend on another non-key attribute).

**Violation — brand info in PRODUCTS:**

```
product_id → brand_name → {brand_country, brand_website}
```

If PRODUCTS stored `brand_name, brand_country, brand_website`:
- `product_id → brand_name` (direct)
- `brand_name → brand_country` (transitive!)
- `product_id → brand_country` only transitively through brand_name

This means every product by Apple would repeat "Apple, USA, https://apple.com".  
**Fix:** BRANDS table extracted. Now `product_id → brand_id` and `brand_id → {name, country, website}`. No transitivity.

**Violation — category info in PRODUCTS:**

Similarly, `product_id → category_name → description` would be transitive.  
**Fix:** CATEGORIES table.

**Violation — price in ORDER_ITEMS:**

`item_id → product_id → current_price` would be transitive AND wrong (price changes over time).  
**Fix:** `unit_price` stored directly in ORDER_ITEMS as a price snapshot. This is intentional and correct.

**Our schema is in 3NF** because:
- No non-key attribute transitively depends on the primary key
- Brand info only in BRANDS, category info only in CATEGORIES

---

### Boyce-Codd Normal Form (BCNF)

**Requirement:** For every non-trivial FD X → Y, X must be a superkey.

**Violation — PRODUCTS if brand_name were stored directly:**

```
brand_name → country   (brand_name is NOT a superkey of PRODUCTS)
```

This violates BCNF.  
**Fix:** Extract BRANDS table. Now in PRODUCTS, all determinants (`product_id`, `slug`, `sku`) are superkeys.

**Our schema achieves BCNF** for all major tables:
- In PRODUCTS: determinants are `product_id`, `slug`, `sku` — all superkeys ✓
- In USERS: determinants are `user_id`, `email` — both superkeys ✓
- In ORDERS: determinant is `order_id` — superkey ✓
- In BRANDS: determinants are `brand_id`, `name` — both superkeys ✓
- In CATEGORIES: determinants are `category_id`, `name` — both superkeys ✓

---

### Summary of Normalization Decisions

| Design Choice | Normal Form Satisfied | Explanation |
|---|---|---|
| PRODUCT_IMAGES separate table | 1NF | Multi-valued attribute (multiple images) |
| PRODUCT_TAGS junction table | 1NF | Multi-valued M:N relationship |
| PRODUCT_ATTRIBUTES EAV | 1NF | Variable attributes — different per category |
| ADDRESSES separate from USERS | 2NF | Address depends on user, not order |
| BRANDS extracted from PRODUCTS | 3NF / BCNF | brand_country transitively depended on brand_name |
| CATEGORIES extracted | 3NF / BCNF | category_description transitively depended on category_name |
| unit_price stored in ORDER_ITEMS | Intentional denorm | Price snapshot — historically correct |
| avg_rating stored in PRODUCTS | Intentional denorm | Derived from REVIEWS but cached for performance |

---

## 6. Views

Views are saved SELECT statements stored in the database. They simplify complex queries, control what data is exposed, and are treated like virtual tables.

---

### View 1: `vw_product_catalog`

**Purpose:** Complete product listing with brand, parent category, and primary image — all in one query. The frontend product grid uses this view rather than writing a 4-table JOIN every time.

```sql
SELECT p.product_id, p.name AS product_name, p.slug, p.description,
  p.price, p.compare_price,
  ROUND(((p.compare_price - p.price) / p.compare_price) * 100) AS discount_pct,
  p.stock_qty, p.avg_rating, p.review_count, p.is_featured,
  c.name AS category_name, pc.name AS parent_category,
  b.name AS brand_name, b.country AS brand_country,
  pi.url AS primary_image
FROM PRODUCTS p
JOIN  CATEGORIES c   ON p.category_id  = c.category_id
LEFT JOIN CATEGORIES pc ON c.parent_id = pc.category_id   -- self-join for parent
LEFT JOIN BRANDS b   ON p.brand_id = b.brand_id            -- LEFT: books have no brand
LEFT JOIN PRODUCT_IMAGES pi ON pi.product_id = p.product_id AND pi.is_primary = 1;
```

**Key points:**
- Double JOIN on CATEGORIES: `c` is the direct category, `pc` is the parent (e.g. Electronics → Smartphones: pc=Electronics, c=Smartphones)
- `LEFT JOIN BRANDS` — books have `brand_id = NULL`, left join keeps them in results
- `LEFT JOIN PRODUCT_IMAGES` with `is_primary = 1` — gets exactly one image per product
- `discount_pct` computed on the fly: `((compare_price - price) / compare_price) * 100`

---

### View 2: `vw_order_summary`

**Purpose:** Admin order dashboard — one row per order with customer name, delivery address, item count, and payment status.

**Key points:**
- `CONCAT(a.street, ', ', a.city, ', ', a.country)` builds a readable address string
- `COUNT(oi.item_id) AS item_count` counts how many product lines are in the order
- `GROUP BY o.order_id` — necessary because of the COUNT aggregate
- JOIN chain: ORDERS → USERS → ADDRESSES → ORDER_ITEMS → PAYMENTS (LEFT join: payment may not exist yet)

---

### View 3: `vw_revenue_by_category`

**Purpose:** Revenue breakdown per category for analytics dashboard. Supports business questions like "which category made the most money this month?"

**Key points:**
- Excludes `status IN ('cancelled', 'refunded')` orders from revenue
- `SUM(oi.quantity * oi.unit_price)` uses stored `unit_price` (price snapshot) — historically accurate
- Double JOIN on CATEGORIES for parent/child hierarchy (same as vw_product_catalog)

---

### View 4: `vw_low_stock`

**Purpose:** Inventory alert — products with 10 or fewer units remaining. Used by admin dashboard.

```sql
WHERE p.stock_qty <= 10 AND p.is_active = 1
ORDER BY p.stock_qty ASC
```

**Why a view not a query:** The threshold (10 units) might need tuning but is used in multiple places. A view centralises this logic. Also used by `sp_dashboard_stats` via subquery.

---

### View 5: `vw_customer_ltv`

**Purpose:** Customer Lifetime Value — total revenue per customer with order count, average order value, and review activity.

**Key points:**
- `LEFT JOIN ORDERS` — includes customers who never ordered (LTV = 0)
- `COALESCE(SUM(o.total_amount), 0)` — handles NULL from LEFT JOIN (customers with no orders)
- Only counts `status NOT IN ('cancelled', 'refunded')` — excludes reversed transactions
- `WHERE u.role = 'customer'` — excludes admin/vendor users from analytics
- Useful for identifying high-value customers for VIP coupons

---

### View 6: `vw_product_tags`

**Purpose:** Products with their associated tags concatenated as a string — useful for search/filter UI.

```sql
GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') AS tags
```

**`GROUP_CONCAT`:** MySQL function that aggregates multiple rows into a comma-separated string. Result for iPhone: "Bestseller, Staff Pick". This is presentational — the actual M:N data is still normalised in PRODUCT_TAGS.

---

### View 7: `vw_unread_notifications`

**Purpose:** Notification badge count — how many unread notifications each user has.

```sql
SUM(CASE WHEN n.is_read = 0 THEN 1 ELSE 0 END) AS unread_count
```

**`CASE WHEN` inside SUM:** Counts only rows where `is_read = 0`. This is more efficient than two separate subqueries.

**`LEFT JOIN NOTIFICATIONS`:** Users with zero notifications still appear (COUNT = 0, unread = 0).

---

## 7. Stored Functions

Functions return a single value, are deterministic or read SQL data, and can be called inside SELECT/WHERE clauses.

---

### Function 1: `fn_apply_coupon`

**Signature:** `fn_apply_coupon(subtotal, type, discount_val, max_discount) → DECIMAL(10,2)`  
**Purpose:** Calculate the discount amount given a coupon.

```sql
IF p_type = 'percentage' THEN
  v_disc = ROUND(subtotal * discount_val / 100, 2)
  IF max_discount IS NOT NULL AND v_disc > max_discount THEN
    v_disc = max_discount   -- cap the discount
  END IF
ELSE
  v_disc = discount_val     -- fixed amount
END IF
IF v_disc > subtotal THEN v_disc = subtotal  -- can't discount more than cart value
RETURN v_disc
```

**Example:** `fn_apply_coupon(2000, 'percentage', 50, 800)` → 50% of 2000 = 1000, but capped at 800 → returns 800.

---

### Function 2: `fn_discounted_price`

**Signature:** `fn_discounted_price(price, pct) → DECIMAL(10,2)`  
**Purpose:** Generic helper for applying a percentage discount to a price.

**Edge cases handled:**
- NULL price → return NULL
- NULL or ≤ 0 pct → return original price
- pct ≥ 100 → return 0.00 (fully discounted)
- Normal case: `ROUND(price * (1 - pct/100), 2)`

**Usage example:** `fn_discounted_price(999.00, 20)` → AED 799.20

---

### Function 3: `fn_cart_subtotal`

**Signature:** `fn_cart_subtotal(user_id) → DECIMAL(10,2)`  
**Purpose:** Calculate total cart value for a user by joining CART_ITEMS with current PRODUCTS prices.

```sql
SELECT COALESCE(SUM(ci.quantity * p.price), 0)
FROM CART_ITEMS ci JOIN PRODUCTS p ON ci.product_id = p.product_id
WHERE ci.user_id = p_user_id
```

**Called by:** `sp_place_order` to calculate subtotal before applying coupon.

**`COALESCE(..., 0)`:** Returns 0 if cart is empty (SUM of empty set = NULL without COALESCE).

---

### Function 4: `fn_validate_coupon`

**Signature:** `fn_validate_coupon(code, subtotal) → DECIMAL(10,2)`  
**Purpose:** All-in-one coupon validation — checks existence, active status, expiry, usage limit, and minimum order, then returns the discount amount (or 0 if invalid).

**Logic:**
1. SELECT coupon where `code = p_code AND is_active = 1 AND expires_at >= CURDATE() AND used_count < max_uses`
2. If not found OR subtotal < min_order_amt → return 0
3. Else call `fn_apply_coupon` and return discount

**Why this is a function not a procedure:** It returns a single value (the discount amount) and can be used directly in SELECT. A procedure would need OUT parameters.

---

### Function 5: `fn_customer_order_count`

**Signature:** `fn_customer_order_count(user_id) → INT`  
**Purpose:** Count completed (non-cancelled/refunded) orders for a customer.

**Usage:** Can be used in loyalty tier logic — `IF fn_customer_order_count(user_id) > 10 THEN apply VIP discount`.

---

### Function 6: `fn_shipping_fee`

**Signature:** `fn_shipping_fee(total_weight_kg) → DECIMAL(10,2)`  
**Purpose:** Calculate weight-based shipping fee.

| Weight | Fee |
|---|---|
| 0 kg | AED 0 |
| ≤ 1 kg | AED 10 |
| ≤ 5 kg | AED 20 |
| ≤ 10 kg | AED 35 |
| > 10 kg | AED 50 |

**Called by:** `sp_place_order` — calculates total weight by summing `ci.quantity * COALESCE(p.weight_kg, 0.5)` across all cart items (0.5 kg default if weight not specified).

---

### Function 7: `fn_zone_shipping_fee`

**Signature:** `fn_zone_shipping_fee(emirate, is_express) → DECIMAL(10,2)`  
**Purpose:** Look up per-emirate shipping rate from SHIPPING_ZONES table.

```sql
SELECT IF(p_is_express, express_fee, base_fee) INTO v_fee
FROM SHIPPING_ZONES WHERE emirate = p_emirate AND is_active = 1 LIMIT 1
RETURN COALESCE(v_fee, IF(p_is_express, 25.00, 10.00))
```

**`COALESCE` fallback:** If emirate not found in table, default to AED 10 (standard) or AED 25 (express). This prevents NULL returns that would break order total calculation.

**Example:** `fn_zone_shipping_fee('Dubai', 0)` → AED 10, `fn_zone_shipping_fee('Fujairah', 1)` → AED 45

---

### Function 7b: `fn_price_with_vat`

**Signature:** `fn_price_with_vat(price) → DECIMAL(10,2)`  
**Purpose:** Add UAE 5% VAT to a price. `ROUND(price * 1.05, 2)`

**Usage:** Display VAT-inclusive prices on invoices. UAE mandates VAT on all retail transactions above AED 375,000 annual revenue threshold.

---

## 8. Triggers

Triggers execute automatically when a specific event (INSERT/UPDATE/DELETE) occurs on a table. They enforce business rules at the database level regardless of which application makes the change.

---

### Trigger 1: `trg_check_stock_before_order`

**Event:** BEFORE INSERT on ORDER_ITEMS  
**Purpose:** Prevent over-ordering — if stock is insufficient, raise an error and abort the INSERT.

```sql
SELECT stock_qty, name INTO v_stock, v_name FROM PRODUCTS WHERE product_id = NEW.product_id;
IF v_stock < NEW.quantity THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for this product';
END IF
```

**`SIGNAL SQLSTATE '45000'`:** MySQL's way to raise a user-defined error. This aborts the INSERT and, if inside a transaction, rolls back everything. The `45000` code means "unhandled user-defined exception."

**BEFORE not AFTER:** We check BEFORE inserting so we can abort cleanly. If we used AFTER, the row would already be inserted.

---

### Trigger 2: `trg_deduct_stock_after_order`

**Event:** AFTER INSERT on ORDER_ITEMS  
**Purpose:** Automatically deduct stock when an order item is inserted.

```sql
UPDATE PRODUCTS SET stock_qty = stock_qty - NEW.quantity WHERE product_id = NEW.product_id;
```

**Why AFTER:** The stock check (Trigger 1) happens BEFORE. If it passes, we know stock is sufficient, so we deduct AFTER the insert is committed to ORDER_ITEMS.

**Atomic with Trigger 1:** Both fire in the same statement. If Trigger 1 signals an error, Trigger 2 never fires.

---

### Trigger 3: `trg_restore_stock_on_cancel`

**Event:** AFTER UPDATE on ORDERS  
**Purpose:** When an order is cancelled, restore stock for all items in that order.

```sql
IF NEW.status = 'cancelled' AND OLD.status NOT IN ('cancelled', 'refunded') THEN
  UPDATE PRODUCTS p
  JOIN ORDER_ITEMS oi ON p.product_id = oi.product_id
  SET p.stock_qty = p.stock_qty + oi.quantity
  WHERE oi.order_id = NEW.order_id;
  -- Also writes to AUDIT_LOG
END IF
```

**Guard condition:** `OLD.status NOT IN ('cancelled', 'refunded')` — prevents double-restoring if the trigger fires again on a second update.

**Multi-table UPDATE with JOIN:** Updates all products involved in the order in a single statement.

---

### Triggers 4, 5, 6: Rating Triggers

**Events:** AFTER INSERT, AFTER UPDATE, AFTER DELETE on REVIEWS  
**Purpose:** Keep `avg_rating` and `review_count` on PRODUCTS up-to-date automatically.

**Trigger 4 (INSERT) / Trigger 5 (UPDATE):**
```sql
UPDATE PRODUCTS
SET avg_rating   = (SELECT AVG(rating)  FROM REVIEWS WHERE product_id = NEW.product_id),
    review_count = (SELECT COUNT(*)     FROM REVIEWS WHERE product_id = NEW.product_id)
WHERE product_id = NEW.product_id;
```

**Trigger 6 (DELETE):**
```sql
UPDATE PRODUCTS
SET avg_rating   = COALESCE((SELECT AVG(rating) FROM REVIEWS WHERE product_id = OLD.product_id), 0),
    review_count = (SELECT COUNT(*) FROM REVIEWS WHERE product_id = OLD.product_id)
WHERE product_id = OLD.product_id;
```

**`COALESCE(..., 0)`:** When the last review is deleted, AVG() returns NULL. COALESCE converts to 0.

**Why denormalise rating:** Computing `AVG(rating)` on every product page load would require a JOIN to REVIEWS for every product displayed. Caching it in PRODUCTS avoids this cost.

---

### Trigger 7: `trg_increment_coupon_usage`

**Event:** AFTER INSERT on ORDERS  
**Purpose:** Automatically track how many times a coupon has been used.

```sql
IF NEW.coupon_id IS NOT NULL THEN
  UPDATE COUPONS SET used_count = used_count + 1 WHERE coupon_id = NEW.coupon_id;
END IF
```

**`IF NOT NULL`:** Only fires if a coupon was applied. Orders without coupons have `coupon_id = NULL`.

---

### Trigger 8: `trg_auto_slug_on_insert`

**Event:** BEFORE INSERT on PRODUCTS  
**Purpose:** Auto-generate URL slug from product name if not provided.

```sql
IF NEW.slug IS NULL OR NEW.slug = '' THEN
  SET NEW.slug = LOWER(REPLACE(REPLACE(REPLACE(NEW.name, ' ', '-'), '/', '-'), '"', ''));
END IF
```

**Nested REPLACE calls:** Replace spaces with dashes, then forward slashes with dashes, then double-quotes with nothing. Result: "iPhone 15 Pro" → "iphone-15-pro".

**BEFORE INSERT:** We can modify `NEW.slug` only in a BEFORE trigger. After the row is inserted, you can't modify it via trigger (only via UPDATE).

---

### Triggers 9 & 10: Product Audit Triggers

**Trigger 9 (AFTER INSERT PRODUCTS):** Logs new product creation to AUDIT_LOG with `JSON_OBJECT('name', name, 'price', price, 'stock', stock)`.

**Trigger 10 (AFTER UPDATE PRODUCTS):** Only logs if price or stock changed (`IF OLD.price != NEW.price OR OLD.stock_qty != NEW.stock_qty`). Records both old and new values. Useful for price history and inventory audit.

---

### Trigger 11: `trg_single_default_address`

**Event:** BEFORE INSERT on ADDRESSES  
**Purpose:** Enforce that each user has at most one default address.

```sql
IF NEW.is_default = 1 THEN
  IF EXISTS (SELECT 1 FROM ADDRESSES WHERE user_id = NEW.user_id AND is_default = 1) THEN
    SET NEW.is_default = 0;   -- silently downgrade to non-default
  END IF
END IF
```

**Why BEFORE:** We modify `NEW.is_default` before the row is inserted. A BEFORE trigger can modify NEW.column_name.

**Why not UPDATE existing default to 0:** MySQL does not allow updating the same table being modified in a trigger (prevents recursive trigger loops). Instead, we prevent the new row from becoming default if one already exists.

---

### Trigger 12: `trg_audit_user_register`

**Event:** AFTER INSERT on USERS  
**Purpose:** Log every new user registration with email and role to AUDIT_LOG.

---

### Trigger 13: `trg_order_status_history`

**Event:** AFTER UPDATE on ORDERS  
**Purpose:** Record every status transition + send a notification to the customer.

```sql
IF OLD.status <> NEW.status THEN
  INSERT INTO ORDER_STATUS_HISTORY (order_id, prev_status, new_status) VALUES (...);
  INSERT INTO NOTIFICATIONS (user_id, type, title, body) VALUES
    (NEW.user_id, 'order_update', CONCAT('Order #', order_id, ' — ', NEW.status), ...);
END IF
```

**Two INSERTs in one trigger:** Both happen atomically in the same transaction. If either fails, both are rolled back.

**Guard `OLD.status <> NEW.status`:** Only fires when status actually changes — not on every ORDERS update (e.g. tracking number update).

---

### Trigger 14: `trg_notify_restock`

**Event:** AFTER UPDATE on PRODUCTS  
**Purpose:** When a product goes from out-of-stock (0) to in-stock (>0), notify all users who wishlisted it.

```sql
IF OLD.stock_qty = 0 AND NEW.stock_qty > 0 THEN
  INSERT INTO NOTIFICATIONS (user_id, type, title, body, ref_id, ref_type)
  SELECT w.user_id, 'restock',
    CONCAT(NEW.name, ' is back in stock!'),
    CONCAT('Grab it before it sells out — only ', NEW.stock_qty, ' left.'),
    NEW.product_id, 'products'
  FROM WISHLISTS w WHERE w.product_id = NEW.product_id;
END IF
```

**INSERT...SELECT:** Inserts one notification row per wishlist entry — could be thousands of rows from a single product restock. This is an efficient set-based operation.

---

## 9. Stored Procedures

Procedures are pre-compiled SQL programs stored in the database. They accept parameters, contain control flow (IF, LOOP, CURSOR), and can execute multiple statements as a unit.

---

### Procedure 1: `sp_place_order` — Full Checkout

**Signature:** `sp_place_order(user_id, address_id, coupon_code, pay_method, ship_method, OUT order_id, OUT message)`

**This is the most complex object in the schema.** It handles the entire checkout flow in a transaction:

**Step-by-step logic:**

1. **Validate cart not empty** — `SELECT COUNT(*) FROM CART_ITEMS WHERE user_id = p_user_id`
2. **Validate address belongs to user** — Security check: can't ship to someone else's address
3. **Resolve coupon** — Lookup by code, check active + not expired + under max_uses
4. **Calculate subtotal** — calls `fn_cart_subtotal(user_id)`
5. **Validate coupon minimum order** — e.g. SUMMER20 requires AED 200
6. **Calculate discount** — calls `fn_apply_coupon(subtotal, type, val, max)`
7. **Calculate weight** — SUM of `quantity * weight_kg` across cart items
8. **Calculate shipping fee** — calls `fn_shipping_fee(total_weight)`, doubled for Express
9. **Calculate VAT** — 5% on `(subtotal - discount)`
10. **Calculate total** — `subtotal - discount + shipping + tax`
11. **`START TRANSACTION`** — Everything below is atomic
12. **INSERT ORDERS** — Creates the master order record
13. **CURSOR LOOP** — Iterates cart items, inserts each as ORDER_ITEMS (triggers fire here)
14. **INSERT PAYMENTS** — Creates payment record with status 'pending'
15. **DELETE CART_ITEMS** — Clears the cart
16. **`COMMIT`**

**CURSOR usage:** A cursor is a pointer that iterates over a result set row-by-row inside procedural SQL. Here it's used to loop through cart items and insert them one by one into ORDER_ITEMS (this is necessary because the stock-check trigger fires per INSERT, not as a set operation).

```sql
DECLARE cur_items CURSOR FOR
  SELECT ci.product_id, ci.quantity, p.price
  FROM CART_ITEMS ci JOIN PRODUCTS p ON ci.product_id = p.product_id
  WHERE ci.user_id = p_user_id;

OPEN cur_items;
read_loop: LOOP
  FETCH cur_items INTO v_pid, v_qty, v_price;
  IF v_done = 1 THEN LEAVE read_loop; END IF;
  INSERT INTO ORDER_ITEMS (order_id, product_id, quantity, unit_price) VALUES (...);
END LOOP;
CLOSE cur_items;
```

**EXIT HANDLER for SQLEXCEPTION:** If any SQL error occurs (including the stock-check SIGNAL from Trigger 1), this handler fires: ROLLBACK + set order_id = -1 + RESIGNAL the error to the caller.

**`LEAVE sp_place_order`:** MySQL's way to exit a labeled BEGIN...END block early (like a `return` statement for stored procedures).

---

### Procedure 2: `sp_dashboard_stats`

**Purpose:** Admin KPI dashboard — returns 10 key metrics in a single call.

Returns (all as single row):
- `total_customers` — active customer count
- `total_orders` — non-cancelled/refunded orders
- `total_revenue` — sum of delivered orders
- `active_products` — products with is_active=1
- `pending_orders` — orders awaiting processing
- `low_stock_count` — products with ≤10 stock
- `total_reviews` — all reviews
- `avg_order_value` — mean order value
- `items_in_carts` — total items across all active carts
- `revenue_last_30d` — delivered orders in last 30 days

Each metric is a correlated subquery inside the SELECT — MySQL evaluates them all in one pass.

---

### Procedure 3: `sp_top_selling_products`

**Signature:** `sp_top_selling_products(p_limit INT)`

Returns top N products by units sold, with revenue, brand, category, rating, and current stock.

**Key:** Only counts `status NOT IN ('cancelled', 'refunded')` — doesn't inflate sales with returned items.

**Usage:** `CALL sp_top_selling_products(10)` → top 10 bestsellers for homepage featured section.

---

### Procedure 4: `sp_user_order_history`

**Purpose:** Full order history for a specific user — joins 7 tables to return every piece of information a customer order page needs.

Returns per order line item: order status, subtotal, discount, shipping, tax, total, product name, brand, quantity, unit_price, line total, payment method, payment status, product image.

---

### Procedure 5: `sp_restock_product`

**Signature:** `sp_restock_product(product_id, quantity, admin_id)`

1. Reads current stock
2. `UPDATE PRODUCTS SET stock_qty = stock_qty + quantity`
3. Writes to AUDIT_LOG with old/new stock values and admin_id
4. Returns `{product_id, old_stock, new_stock}` as result set

Note: After this UPDATE, if stock goes from 0 to > 0, `trg_notify_restock` fires automatically and notifies wishlist users.

---

### Procedure 6: `sp_monthly_revenue`

**Signature:** `sp_monthly_revenue(p_year INT)`

Returns month-by-month revenue for the given year: month number, month name, order count, total revenue, average order value.

**Usage:** `CALL sp_monthly_revenue(2026)` → revenue chart data for admin dashboard.

---

### Procedure 7: `sp_search_products`

**Signature:** `sp_search_products(query, category_id, brand_id, min_price, max_price, sort, page, limit)`

Full-text + filtered product search with pagination. Dynamically builds a SQL string using `CONCAT` based on which filters are provided.

**Full-text search:** `MATCH(p.name, p.description) AGAINST(p_query IN BOOLEAN MODE)` uses the FULLTEXT index on PRODUCTS.

**Dynamic SQL pattern:**
```sql
SET @sql = CONCAT('SELECT ... FROM PRODUCTS WHERE is_active=1 ');
IF p_query != '' THEN SET @sql = CONCAT(@sql, 'AND MATCH(...) AGAINST(...)'); END IF;
-- add more filters...
SET @sql = CONCAT(@sql, 'ORDER BY ... LIMIT ... OFFSET ...');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

**`PREPARE / EXECUTE / DEALLOCATE`:** MySQL's prepared statement API used inside stored procedures for dynamic queries.

---

### Procedure 8: `sp_broadcast_promo`

**Signature:** `sp_broadcast_promo(title, body)`

Sends a promotional notification to ALL active customers in a single INSERT...SELECT:

```sql
INSERT INTO NOTIFICATIONS (user_id, type, title, body, ref_type)
SELECT user_id, 'promo', p_title, p_body, 'system'
FROM USERS WHERE is_active = 1 AND role = 'customer';
```

Returns `notifications_sent` count via `ROW_COUNT()`.

---

### Procedure 9: `sp_order_timeline`

**Signature:** `sp_order_timeline(order_id)`

Returns the full status history for an order in chronological order — used for the "Track Order" page.

```sql
SELECT h.prev_status, h.new_status, h.comment, h.changed_at,
  COALESCE(u.full_name, 'System') AS changed_by_name
FROM ORDER_STATUS_HISTORY h
LEFT JOIN USERS u ON h.changed_by = u.user_id
WHERE h.order_id = p_order_id ORDER BY h.changed_at ASC;
```

**`COALESCE(u.full_name, 'System')`:** If `changed_by` is NULL (trigger-initiated change), shows "System" instead of NULL.

---

## 10. Complex Queries

### Q1: Correlated Subquery — Products Above Category Average Price

A correlated subquery is one that references columns from the outer query. It executes once per row of the outer query.

```sql
SELECT p.product_id, p.name, p.price, c.name AS category,
  (SELECT ROUND(AVG(p2.price), 2) FROM PRODUCTS p2
   WHERE p2.category_id = p.category_id) AS cat_avg
FROM PRODUCTS p
JOIN CATEGORIES c ON p.category_id = c.category_id
WHERE p.price > (
  SELECT AVG(p3.price) FROM PRODUCTS p3
  WHERE p3.category_id = p.category_id   -- correlates to outer query's category
)
ORDER BY c.name, p.price DESC;
```

**How it works:** For each product row, MySQL runs the subquery `SELECT AVG(price)` restricted to that product's category. If the product's price exceeds its category average, it's included.

**Example result:** In Smartphones (avg ~4166), the iPhone 15 Pro (4999) and Samsung S24 Ultra (4499) are above average; OnePlus 12 (2999) is below.

---

### Q2: Nested Subquery — Customers Who Spent Above Average

```sql
SELECT u.full_name, u.email, SUM(o.total_amount) AS total_spent
FROM USERS u JOIN ORDERS o ON u.user_id = o.user_id
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

**Three levels of nesting:**
1. Innermost: `SELECT SUM(...) GROUP BY user_id` — total per customer
2. Middle: `SELECT AVG(s.tot)` — average of those totals
3. Outer: customers whose total > that average

**Why subquery not window function:** The average is computed over all customers, not per customer.

---

### Q3: Window Function — Rank Products by Revenue Within Category

```sql
SELECT product_name, category_name, revenue,
  RANK() OVER (PARTITION BY category_name ORDER BY revenue DESC) AS cat_rank
FROM vw_revenue_by_category;
```

**`RANK() OVER (PARTITION BY ... ORDER BY ...)`:**
- `PARTITION BY category_name` — resets rank counter for each category
- `ORDER BY revenue DESC` — highest revenue gets rank 1
- `RANK()` gives same rank to ties, skips numbers after ties (1, 1, 3). `DENSE_RANK()` would not skip.

**Result:** Within Electronics, MacBook Pro might be rank 1, iPhone rank 2, etc. Within Fashion, Nike AF1 might be rank 1.

---

### Q4: EXISTS / NOT EXISTS — Buyers Who Never Reviewed

```sql
SELECT u.user_id, u.full_name FROM USERS u
WHERE EXISTS (
  SELECT 1 FROM ORDERS o WHERE o.user_id = u.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM REVIEWS r WHERE r.user_id = u.user_id
);
```

**`EXISTS`:** Returns true if the subquery returns at least one row. `SELECT 1` is conventional — the actual column doesn't matter, only whether a row exists.

**`NOT EXISTS`:** Returns true if the subquery returns zero rows.

**This finds:** Customers who have placed at least one order but have never written a review — a useful target for review request emails.

**Why EXISTS over JOIN:** EXISTS stops scanning as soon as the first matching row is found (short-circuit evaluation). A JOIN would bring back all matching rows and deduplicate.

---

### Q5: Multi-Level Join — Full Order Breakdown

```sql
SELECT o.order_id, u.full_name, b.name AS brand, p.name AS product,
  oi.quantity, oi.unit_price, (oi.quantity * oi.unit_price) AS line_total
FROM ORDERS o
JOIN USERS u ON o.user_id = u.user_id
JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
JOIN PRODUCTS p ON oi.product_id = p.product_id
LEFT JOIN BRANDS b ON p.brand_id = b.brand_id
ORDER BY o.order_id;
```

**5-table join chain:** ORDERS → USERS (customer name) → ORDER_ITEMS (line items) → PRODUCTS (product name) → BRANDS (LEFT: books have no brand).

---

### Q8: Shipping Zone Fee Lookup (Function Call in Query)

```sql
SELECT sz.zone_name, sz.emirate,
  fn_zone_shipping_fee(sz.emirate, 0) AS std_fee,
  fn_zone_shipping_fee(sz.emirate, 1) AS express_fee,
  sz.free_above
FROM SHIPPING_ZONES sz WHERE sz.is_active = 1 ORDER BY sz.base_fee;
```

Demonstrates calling a stored function inside a SELECT.

---

## 11. Frontend Architecture

### Technology Stack
| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14.2.5 | App Router, TypeScript, React 18 |
| Styling | Tailwind CSS | Utility-first, no custom CSS files needed |
| Animation | Framer Motion | `whileInView`, `AnimatePresence`, spring transitions |
| Icons | Lucide React | Consistent SVG icon set |
| Font | Inter (Google Fonts) | Clean, legible, modern |
| Deployment | GitHub Pages (static export) | Free hosting for Next.js static builds |

### Next.js Configuration
```js
// next.config.js
output: "export"       // generates static HTML/CSS/JS — no server required
basePath: "/dbs2/shop" // because site is at github.com/user/dbs2 under /shop
assetPrefix: "/dbs2/shop" // ensures CSS/JS assets load from correct path
images: { unoptimized: true } // GitHub Pages can't run Next.js image optimizer
```

### Component Structure

```
app/
├── page.tsx          — Main page: state management, cart logic, Railway fetch
├── layout.tsx        — Root HTML wrapper, font loading
└── globals.css       — Tailwind base + section-divider + scrollbar styles

components/
├── Navbar.tsx        — Fixed top nav, scroll-aware shadow, mobile menu, cart button
├── HeroSection.tsx   — Featured product showcase, floating rating card, CTA button
├── ProductGrid.tsx   — Category filter pills, sort dropdown, AnimatePresence grid
├── ProductCard.tsx   — Individual product card with hover overlay and add-to-cart
├── StatsSection.tsx  — "50K+ customers, 4.9 stars" stats row
├── FeaturesSection.tsx — "Free shipping, 24/7 support" feature cards
└── TestimonialsSection.tsx — Customer review quotes

data/
└── products.ts       — MOCK_PRODUCTS array (8 products), FEATURED_PRODUCT

types/
└── product.ts        — TypeScript interfaces: Product, CartItem
```

### State Management (page.tsx)

All state lives in the root `HomePage` component and is passed down as props:

```typescript
const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
const [featuredProduct, setFeaturedProduct] = useState<Product>(FEATURED_PRODUCT);
const [liveData, setLiveData] = useState(false);    // Railway or mock?
const [cartItems, setCartItems] = useState<CartItem[]>([]);
const [cartOpen, setCartOpen] = useState(false);
const [toasts, setToasts] = useState<Toast[]>([]);
const [checkoutDone, setCheckoutDone] = useState(false);
```

**Why no Redux/Zustand:** The cart state is simple enough for prop drilling. With only 2 levels (page → components), a state management library would add complexity without benefit.

### Railway API Integration

```typescript
const RAILWAY_URL = "https://shopsphere-production-4454.up.railway.app";

useEffect(() => {
  fetch(`${RAILWAY_URL}/api/products`)
    .then(r => r.json())
    .then((data) => {
      // map Railway data → Product[] with MOCK_PRODUCTS as fallback for missing fields
      setProducts(mapped);
      setLiveData(true);
    })
    .catch(() => {}); // silently fall back to MOCK_PRODUCTS if Railway is offline
}, []);
```

**Fallback strategy:** If Railway is unreachable (offline, sleeping, CORS error), the catch block is empty — the app continues with `MOCK_PRODUCTS`. The "Offline · Mock data" badge in the bottom-right tells users which data source is active.

### Cart Logic

```typescript
const addToCart = useCallback((product: Product) => {
  setCartItems(prev => {
    const existing = prev.find(i => i.product.id === product.id);
    if (existing) 
      return prev.map(i => i.product.id === product.id 
        ? { ...i, quantity: i.quantity + 1 } : i);
    return [...prev, { product, quantity: 1 }];
  });
  showToast(`${product.name} added to cart`);
}, [showToast]);
```

**Functional update pattern:** `setCartItems(prev => ...)` uses the previous state directly, avoiding stale closure bugs when multiple updates happen quickly.

**`useCallback`:** Memoises the function reference so child components that receive it as a prop don't re-render unnecessarily.

### Checkout Flow

```typescript
const handleCheckout = async () => {
  const orderItems = cartItems.map(i => ({
    productId: i.product.id, quantity: i.quantity, price: i.product.price
  }));
  try {
    await fetch(`${RAILWAY_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: orderItems, total: subtotal }),
    });
  } catch { /* offline fallback — order still "completes" locally */ }
  setCheckoutDone(true);
  setCartItems([]);
  setTimeout(() => setCheckoutDone(false), 4000);
  showToast("Order placed successfully!");
};
```

**Graceful degradation:** The try/catch means if Railway is offline, the order is not saved to the DB but the user still sees a success confirmation. In production this would be a problem — here it's acceptable for a demo.

### Free Shipping Progress Bar

```typescript
const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
const shippingFee = subtotal >= 200 ? 0 : 15;

// In JSX:
<div style={{ width: `${Math.min((subtotal / 200) * 100, 100)}%` }} />
```

Progress bar fills from 0% to 100% as subtotal approaches AED 200. `Math.min(..., 100)` prevents overflow beyond 100%.

### Animations (Framer Motion)

The site uses toned-down animations — present but not distracting:

| Component | Animation | Config |
|---|---|---|
| ProductCard | Fade in on scroll | `whileInView={{ opacity:1, y:0 }}`, duration 0.4s |
| ProductCard | Lift on hover | `whileHover={{ y: -3 }}` |
| ProductCard overlay | Reveal on hover | CSS `opacity-0 group-hover:opacity-100` |
| Cart drawer | Spring slide in from right | `initial={{ x:"100%" }} animate={{ x:0 }}` |
| Toasts | Spring pop up | `initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}` |
| Product grid | AnimatePresence on filter change | `exit={{ opacity:0, y:10 }}` between filter switches |

---

## 12. Deployment

### Backend — Railway

**URL:** https://shopsphere-production-4454.up.railway.app

Railway is a cloud platform that hosts Node.js + PostgreSQL (the API was initially designed for MySQL but Railway uses Postgres-compatible syntax via the Node driver).

**API endpoints:**
- `GET /api/products` — returns all active products as JSON
- `POST /api/orders` — accepts `{ items, total }`, inserts order record

**Free tier behaviour:** Railway's free tier spins down services after 15 minutes of inactivity. The first request after sleep takes ~5–10 seconds (cold start). During evaluation, visit the site once to wake it up before the demo.

### Frontend — GitHub Pages

**URL:** https://292akhil2929-cmyk.github.io/dbs2/shop

**How the deployment works:**
1. `npm run build` runs in CI → generates static files in `/out` directory
2. GitHub Actions (`.github/workflows/deploy-frontend.yml`) pushes `/out` to the `main` branch root
3. GitHub Pages serves the `main` branch — `.nojekyll` file present to prevent Jekyll processing
4. Build output includes: `index.html`, `_next/static/` (JS/CSS chunks), `public/` assets

**Next.js static export constraints:**
- `output: "export"` removes all server-side features
- No `getServerSideProps`, no API routes, no image optimization
- All data fetching happens client-side (`useEffect` + `fetch`)

**Why `basePath: "/dbs2/shop"`:** The GitHub repo is named `dbs2` and the site is in a subfolder. Without `basePath`, all `/_next/static/` asset URLs would 404.

---

## 13. Quick-Reference Cheat Sheet

*For use during professor evaluation — quick answers to common questions.*

**Q: How many tables? What are they for?**  
20 tables. Core entities: USERS, PRODUCTS, ORDERS, ORDER_ITEMS, PAYMENTS. Supporting: CATEGORIES (self-ref hierarchy), BRANDS (extracted for BCNF), ADDRESSES (extracted for 2NF), PRODUCT_IMAGES/ATTRIBUTES/TAGS (1NF). Operational: CART_ITEMS, WISHLISTS, REVIEWS, COUPONS. System: AUDIT_LOG, NOTIFICATIONS, ORDER_STATUS_HISTORY, SHIPPING_ZONES, TAGS, PRODUCT_TAGS.

**Q: Why is BRANDS a separate table?**  
To achieve BCNF. If brand_country were in PRODUCTS, we'd have `product_id → brand_name → brand_country` — a transitive dependency. Separating gives us `brand_id → {name, country}` and `product_id → brand_id` only.

**Q: Why does ORDER_ITEMS store unit_price?**  
Price snapshot. Product prices change over time. Storing the price at order time ensures the order history always shows what the customer actually paid, not the current price.

**Q: What does the cursor in sp_place_order do?**  
It iterates over the user's cart items one by one and inserts each as an ORDER_ITEMS row. This is necessary because the stock-check trigger fires per INSERT, and we need to process each item individually.

**Q: What happens if stock runs out mid-order?**  
Trigger 1 (`trg_check_stock_before_order`) fires BEFORE each INSERT into ORDER_ITEMS. If stock < quantity, it raises `SIGNAL SQLSTATE '45000'`. The EXIT HANDLER in sp_place_order catches this, calls ROLLBACK, and returns error to the API.

**Q: How does the rating stay up to date without a cron job?**  
Three triggers: Trigger 4 (AFTER INSERT REVIEWS), Trigger 5 (AFTER UPDATE REVIEWS), Trigger 6 (AFTER DELETE REVIEWS) — each recalculates `avg_rating` and `review_count` in PRODUCTS by running `SELECT AVG(rating)` and `SELECT COUNT(*)` on REVIEWS.

**Q: What is the EAV pattern?**  
Entity-Attribute-Value. PRODUCT_ATTRIBUTES stores flexible specs as rows: `(product_id=1, attr_name='RAM', attr_value='8GB')`. Avoids adding 50+ nullable columns to PRODUCTS for attributes that differ by category.

**Q: How does the coupon system work?**  
fn_validate_coupon checks code exists, is_active=1, not expired, under max_uses, and cart meets min_order_amt. fn_apply_coupon calculates the discount (percentage or fixed, capped by max_discount). Trigger 7 auto-increments used_count when an order with that coupon is placed.

**Q: What is `SIGNAL SQLSTATE '45000'`?**  
MySQL's way to raise a user-defined exception from inside a trigger or procedure. `45000` = unhandled user-defined exception. It aborts the current statement and any enclosing transaction unless caught by a HANDLER.

**Q: Why does AUDIT_LOG have no foreign keys?**  
Intentional. If a user or product is deleted, the audit record of their actions must remain. Adding FKs would cause constraint violations on deletion or require CASCADE DELETE which would destroy the audit trail.

**Q: What normalization form is the schema in?**  
BCNF. We've addressed: 1NF (no multi-valued attributes — PRODUCT_IMAGES, PRODUCT_TAGS, PRODUCT_ATTRIBUTES), 2NF (addresses separated from users — partial dependency removed), 3NF/BCNF (brands extracted from products — transitive dependency removed).

**Q: How does the frontend work without a server?**  
Next.js `output: "export"` generates a fully static site. All data fetching is client-side via `fetch()` in a `useEffect`. The Railway backend is optional — if it's offline, the frontend falls back to hardcoded `MOCK_PRODUCTS`.

**Q: What are the 7 UAE shipping zones?**  
Dubai (AED 10 standard, free >AED 500), Abu Dhabi (AED 15, free >500), Sharjah (AED 15, free >500), Ajman (AED 20, free >700), Ras Al Khaimah (AED 20, free >700), Fujairah (AED 25, free >1000), Umm Al Quwain (AED 20, free >700).

**Q: What does trg_notify_restock do?**  
When a product's stock_qty changes from 0 to >0 (restock), it sends a notification to every user who has that product in their wishlist using INSERT...SELECT from WISHLISTS.

---

*Report prepared by Team ShopSphere — CS F212 DBMS, BITS Pilani Dubai, 2025–2026*
