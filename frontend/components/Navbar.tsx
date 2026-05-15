"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X, Zap } from "lucide-react";
import { CartItem } from "@/types/product";

interface NavbarProps {
  cartItems: CartItem[];
  onCartOpen: () => void;
}

const NAV_LINKS = [
  { label: "Shop", href: "#products" },
  { label: "Audio", href: "#products" },
  { label: "Peripherals", href: "#products" },
  { label: "About", href: "#about" },
];

export default function Navbar({ cartItems, onCartOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-200 bg-white ${scrolled ? "border-b border-gray-200 shadow-sm" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-black text-lg tracking-tight">ShopSphere</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href}
                className="text-sm font-medium text-gray-500 hover:text-black transition-colors duration-150">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onCartOpen}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-black hover:bg-gray-50 transition-colors duration-150"
              aria-label={`Cart — ${totalItems} items`}>
              <ShoppingBag size={16} strokeWidth={1.75} />
              Cart
              {totalItems > 0 && (
                <span className="w-5 h-5 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </button>

            <button className="md:hidden p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-50 transition-colors"
              onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex flex-col gap-1 md:hidden">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-black py-2.5 border-b border-gray-100 last:border-0">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
