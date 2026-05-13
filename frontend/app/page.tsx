"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductGrid from "@/components/ProductGrid";
import MarqueeBar from "@/components/MarqueeBar";
import { MOCK_PRODUCTS, FEATURED_PRODUCT } from "@/data/products";
import { CartItem, Product } from "@/types/product";

const RAILWAY_URL = "https://shopsphere-production-4454.up.railway.app";

/* ─── Toast notification ───────────────────────────────────── */
interface Toast { id: number; message: string; }
let toastId = 0;

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [featuredProduct, setFeaturedProduct] = useState<Product>(FEATURED_PRODUCT);
  const [liveData, setLiveData] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [checkoutDone, setCheckoutDone] = useState(false);

  /* ── Fetch live products from Railway backend ── */
  useEffect(() => {
    fetch(`${RAILWAY_URL}/api/products`)
      .then(r => r.json())
      .then((data: { id: number; name: string; price: number; description?: string }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        // Map Railway schema → Product type, filling in mock image assets
        const mapped: Product[] = data.map((p, i) => ({
          id: p.id,
          name: p.name,
          slug: p.name.toLowerCase().replace(/\s+/g, "-"),
          description: p.description ?? MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].description,
          price: p.price,
          category: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].category,
          categorySlug: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].categorySlug,
          brand: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].brand,
          imageUrl: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].imageUrl,
          rating: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].rating,
          reviewCount: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].reviewCount,
          stock: 10 + (i * 3) % 50,
          tags: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].tags,
          isFeatured: i === 0,
          isNew: i % 3 === 0,
        }));
        setProducts(mapped);
        setFeaturedProduct(mapped[0]);
        setLiveData(true);
      })
      .catch(() => { /* stay on mock data */ });
  }, []);

  const showToast = useCallback((message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const addToCart = useCallback((product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`${product.name} added to cart`);
  }, [showToast]);

  const updateQty = useCallback((id: number, delta: number) => {
    setCartItems(prev =>
      prev.map(i => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    setCartItems(prev => prev.filter(i => i.product.id !== id));
  }, []);

  const handleCheckout = useCallback(async () => {
    const orderItems = cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price }));
    try {
      await fetch(`${RAILWAY_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderItems, total: subtotal }),
      });
    } catch { /* no-op if offline */ }
    setCheckoutDone(true);
    setCartItems([]);
    setTimeout(() => setCheckoutDone(false), 4000);
    showToast("Order placed successfully! 🎉");
  }, [cartItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const shippingFee = subtotal >= 200 ? 0 : 15;

  return (
    <main className="min-h-screen">
      <Navbar cartItems={cartItems} onCartOpen={() => setCartOpen(true)} />
      <MarqueeBar />
      <HeroSection product={featuredProduct} onAddToCart={addToCart} />
      <ProductGrid products={products} onAddToCart={addToCart} />

      {/* ── DB Status Banner ── */}
      <div className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow-lg transition-all
        ${liveData ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
        {liveData
          ? <><Wifi size={12} /><span>Live · Railway DB</span></>
          : <><WifiOff size={12} /><span>Offline · Mock data</span></>}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-black text-ink text-xl tracking-tight mb-3">ShopSphere</h3>
              <p className="text-sm text-muted leading-relaxed max-w-xs">
                Premium tech, thoughtfully curated. Free shipping across the UAE.
              </p>
            </div>
            {[
              { title: "Shop",    links: ["Audio", "Peripherals", "Displays", "Accessories"] },
              { title: "Support", links: ["FAQ", "Shipping", "Returns", "Warranty"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-ink text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-sm text-muted hover:text-ink transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-subtle">© 2025 ShopSphere. CS F212 DBMS Project — BITS Pilani Dubai.</p>
            <p className="text-xs text-subtle">Next.js · Tailwind · Railway PostgreSQL</p>
          </div>
        </div>
      </footer>

      {/* ── Cart Drawer ── */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setCartOpen(false)} />

            <motion.aside key="drawer"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 38 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={20} strokeWidth={1.75} />
                  <h2 className="font-bold text-ink text-lg">Your Cart</h2>
                  {totalItems > 0 && (
                    <span className="w-5 h-5 bg-ink text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </div>
                <button onClick={() => setCartOpen(false)}
                  className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {checkoutDone ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <CheckCircle2 size={48} strokeWidth={1.5} className="text-emerald-500 mb-4" />
                    <p className="font-bold text-ink text-lg mb-1">Order Placed!</p>
                    <p className="text-sm text-muted">We&apos;ve received your order. Check your email for confirmation.</p>
                  </div>
                ) : cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <ShoppingBag size={48} strokeWidth={1} className="text-border mb-4" />
                    <p className="font-semibold text-ink mb-1">Your cart is empty</p>
                    <p className="text-sm text-muted">Add something you love.</p>
                    <button onClick={() => setCartOpen(false)}
                      className="mt-6 flex items-center gap-2 text-sm font-semibold text-accent">
                      Browse Products <ArrowRight size={14} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <AnimatePresence>
                    {cartItems.map(item => (
                      <motion.div key={item.product.id} layout
                        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 24, height: 0 }} transition={{ duration: 0.25 }}
                        className="flex gap-4 p-4 rounded-2xl border border-border bg-surface">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted truncate">{item.product.brand}</p>
                          <p className="font-semibold text-sm text-ink truncate">{item.product.name}</p>
                          <p className="font-bold text-ink mt-1">AED {item.product.price}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-2 border border-border rounded-xl">
                              <button onClick={() => updateQty(item.product.id, -1)}
                                className="p-1.5 hover:bg-surface rounded-l-xl transition-colors">
                                <Minus size={12} strokeWidth={2.5} />
                              </button>
                              <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                              <button onClick={() => updateQty(item.product.id, 1)}
                                className="p-1.5 hover:bg-surface rounded-r-xl transition-colors">
                                <Plus size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                            <button onClick={() => removeItem(item.product.id)}
                              className="text-muted hover:text-red-500 transition-colors">
                              <Trash2 size={14} strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-ink whitespace-nowrap">
                          AED {(item.product.price * item.quantity).toLocaleString()}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {cartItems.length > 0 && !checkoutDone && (
                <div className="border-t border-border px-6 py-6 space-y-3">
                  {/* Free shipping progress */}
                  {subtotal < 200 && (
                    <div>
                      <div className="flex justify-between text-xs text-muted mb-1.5">
                        <span>Free shipping at AED 200</span>
                        <span>AED {200 - subtotal} to go</span>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <motion.div className="h-full bg-ink rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((subtotal / 200) * 100, 100)}%` }}
                          transition={{ duration: 0.4 }} />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted">
                    <span>Subtotal</span>
                    <span className="font-semibold text-ink">AED {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted">
                    <span>Shipping</span>
                    <span className={shippingFee === 0 ? "text-emerald-600 font-medium" : ""}>
                      {shippingFee === 0 ? "Free" : `AED ${shippingFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-ink text-base border-t border-border pt-3">
                    <span>Total</span>
                    <span>AED {(subtotal + shippingFee).toLocaleString()}</span>
                  </div>
                  <button onClick={handleCheckout}
                    className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-float">
                    Place Order →
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Toast stack ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex items-center gap-2.5 px-5 py-3 bg-ink text-white rounded-2xl text-sm font-medium shadow-toast whitespace-nowrap">
              <CheckCircle2 size={15} strokeWidth={2} className="text-emerald-400" />
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
