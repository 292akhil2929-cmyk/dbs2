"use client";

import { useState, useCallback, useEffect } from "react";
import { ShoppingBag, X, Plus, Minus, Trash2, CheckCircle2, ArrowRight, Wifi, WifiOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductGrid from "@/components/ProductGrid";
import StatsSection from "@/components/StatsSection";
import FeaturesSection from "@/components/FeaturesSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import { MOCK_PRODUCTS, FEATURED_PRODUCT } from "@/data/products";
import { CartItem, Product } from "@/types/product";

const RAILWAY_URL = "https://shopsphere-production-4454.up.railway.app";

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

  useEffect(() => {
    fetch(`${RAILWAY_URL}/api/products`)
      .then(r => r.json())
      .then((data: { id: number; name: string; price: number; description?: string }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
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
      .catch(() => {});
  }, []);

  const showToast = useCallback((message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
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

  const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const shippingFee = subtotal >= 200 ? 0 : 15;

  const handleCheckout = useCallback(async () => {
    const orderItems = cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price }));
    try {
      await fetch(`${RAILWAY_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderItems, total: subtotal }),
      });
    } catch { /* offline fallback */ }
    setCheckoutDone(true);
    setCartItems([]);
    setTimeout(() => setCheckoutDone(false), 4000);
    showToast("Order placed successfully!");
  }, [cartItems, subtotal, showToast]);

  return (
    <main className="min-h-screen bg-white">
      <Navbar cartItems={cartItems} onCartOpen={() => setCartOpen(true)} />
      <HeroSection product={featuredProduct} onAddToCart={addToCart} />
      <StatsSection />
      <div className="section-divider" />
      <ProductGrid products={products} onAddToCart={addToCart} />
      <div className="section-divider" />
      <FeaturesSection />
      <div className="section-divider" />
      <TestimonialsSection />

      {/* Newsletter */}
      <section className="bg-black py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Stay in the loop</p>
          <h2 className="text-3xl font-black tracking-tighter text-white mb-3">Get early access to drops.</h2>
          <p className="text-gray-400 text-sm mb-7">New arrivals, exclusive deals, and tech news — straight to your inbox.</p>
          <form onSubmit={e => e.preventDefault()} className="flex gap-3 max-w-md mx-auto">
            <input type="email" placeholder="you@example.com" required
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/40" />
            <button type="submit"
              className="px-5 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <span className="font-black text-black text-base tracking-tight">ShopSphere</span>
              </div>
              <p className="text-sm text-gray-400 max-w-[180px]">
                Premium tech, thoughtfully curated. Free shipping across the UAE.
              </p>
            </div>
            {[
              { title: "Shop",    links: ["Audio", "Peripherals", "Displays", "Accessories"] },
              { title: "Support", links: ["FAQ", "Shipping", "Returns", "Warranty"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-black text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-sm text-gray-400 hover:text-black transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-400">© 2025 ShopSphere. CS F212 DBMS Project — BITS Pilani Dubai.</p>
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-400">Next.js · Tailwind · Railway PostgreSQL</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-400">DB Live</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* DB status */}
      <div className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow border
        ${liveData ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
        {liveData
          ? <><Wifi size={11} /><span>Live · Railway DB</span></>
          : <><WifiOff size={11} /><span>Offline · Mock data</span></>}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setCartOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} strokeWidth={1.75} />
                <h2 className="font-bold text-black text-base">Your Cart</h2>
                {totalItems > 0 && (
                  <span className="w-5 h-5 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <button onClick={() => setCartOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {checkoutDone ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <CheckCircle2 size={44} strokeWidth={1.5} className="text-emerald-500 mb-3" />
                  <p className="font-bold text-black text-lg mb-1">Order Placed!</p>
                  <p className="text-sm text-gray-400">We&apos;ve received your order.</p>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ShoppingBag size={44} strokeWidth={1} className="text-gray-200 mb-3" />
                  <p className="font-semibold text-black mb-1">Your cart is empty</p>
                  <p className="text-sm text-gray-400 mb-5">Add something you love.</p>
                  <button onClick={() => setCartOpen(false)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                    Browse Products <ArrowRight size={14} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.product.id} className="flex gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{item.product.brand}</p>
                      <p className="font-semibold text-sm text-black truncate">{item.product.name}</p>
                      <p className="font-bold text-black text-sm mt-0.5">AED {item.product.price}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                          <button onClick={() => updateQty(item.product.id, -1)}
                            className="px-2 py-1 hover:bg-gray-100 transition-colors">
                            <Minus size={11} strokeWidth={2.5} />
                          </button>
                          <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.product.id, 1)}
                            className="px-2 py-1 hover:bg-gray-100 transition-colors">
                            <Plus size={11} strokeWidth={2.5} />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.product.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-black whitespace-nowrap">
                      AED {(item.product.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && !checkoutDone && (
              <div className="border-t border-gray-100 px-6 py-5 space-y-3">
                {subtotal < 200 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Free shipping at AED 200</span>
                      <span>AED {200 - subtotal} to go</span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((subtotal / 200) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-black">AED {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Shipping</span>
                  <span className={shippingFee === 0 ? "text-emerald-600 font-medium" : ""}>
                    {shippingFee === 0 ? "Free" : `AED ${shippingFee}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-black border-t border-gray-100 pt-3">
                  <span>Total</span>
                  <span>AED {(subtotal + shippingFee).toLocaleString()}</span>
                </div>
                <button onClick={handleCheckout}
                  className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
                  Place Order →
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {/* Toast */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium shadow-lg whitespace-nowrap">
            <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-400" />
            {toast.message}
          </div>
        ))}
      </div>
    </main>
  );
}
