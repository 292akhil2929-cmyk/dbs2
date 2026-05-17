const express = require("express");
const mysql   = require("mysql2/promise");
const cors    = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host    : process.env.MYSQLHOST     || "66.33.22.238",
  port    : process.env.MYSQLPORT     || 22686,
  user    : process.env.MYSQLUSER     || "root",
  password: process.env.MYSQLPASSWORD || "nCCLPExeEmVAsVtCFZbmnrERIoXaAwyR",
  database: process.env.MYSQLDATABASE || "shopsphere",
  waitForConnections: true,
  connectionLimit   : 10,
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ShopSphere API running", db: "Railway MySQL" });
});

// Products
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_product_catalog WHERE is_active = 1 ORDER BY is_featured DESC, created_at DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_product_catalog WHERE product_id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Categories
app.get("/api/categories", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM CATEGORIES WHERE is_active = 1 ORDER BY parent_id, name");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Brands
app.get("/api/brands", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM BRANDS WHERE is_active = 1 ORDER BY name");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dashboard stats
app.get("/api/stats", async (req, res) => {
  try {
    const [rows] = await pool.query("CALL sp_dashboard_stats()");
    res.json(rows[0][0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Top selling products
app.get("/api/top-products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const [rows] = await pool.query("CALL sp_top_selling_products(?)", [limit]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Revenue by category
app.get("/api/revenue-by-category", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_revenue_by_category ORDER BY revenue DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Low stock
app.get("/api/low-stock", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_low_stock");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Customer LTV
app.get("/api/customers", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_customer_ltv ORDER BY lifetime_value DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Orders
app.get("/api/orders", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_order_summary ORDER BY ordered_at DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Order timeline
app.get("/api/orders/:id/timeline", async (req, res) => {
  try {
    const [rows] = await pool.query("CALL sp_order_timeline(?)", [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Monthly revenue
app.get("/api/monthly-revenue/:year", async (req, res) => {
  try {
    const [rows] = await pool.query("CALL sp_monthly_revenue(?)", [req.params.year]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Validate coupon
app.get("/api/coupon/:code", async (req, res) => {
  try {
    const subtotal = parseFloat(req.query.subtotal) || 0;
    const [rows] = await pool.query("SELECT fn_validate_coupon(?, ?) AS discount", [req.params.code, subtotal]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Product search
app.get("/api/search", async (req, res) => {
  try {
    const { q, category, brand, min_price, max_price, sort, page, limit } = req.query;
    const [rows] = await pool.query("CALL sp_search_products(?,?,?,?,?,?,?,?)", [
      q || null,
      category ? parseInt(category) : null,
      brand    ? parseInt(brand)    : null,
      min_price ? parseFloat(min_price) : null,
      max_price ? parseFloat(max_price) : null,
      sort  || "featured",
      parseInt(page)  || 1,
      parseInt(limit) || 20,
    ]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`ShopSphere API on port ${PORT}`));
