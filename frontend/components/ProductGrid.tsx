"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import ProductCard from "./ProductCard";
import { Product } from "@/types/product";
import { CATEGORIES } from "@/data/products";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Price: Low → High", value: "price-asc" },
  { label: "Price: High → Low", value: "price-desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Most Reviewed", value: "reviews" },
];

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  const filtered = useMemo(() => {
    let list = activeCategory === "all"
      ? products
      : products.filter((p) => p.categorySlug === activeCategory);
    switch (sortBy) {
      case "price-asc":  return [...list].sort((a, b) => a.price - b.price);
      case "price-desc": return [...list].sort((a, b) => b.price - a.price);
      case "rating":     return [...list].sort((a, b) => b.rating - a.rating);
      case "reviews":    return [...list].sort((a, b) => b.reviewCount - a.reviewCount);
      default:           return list;
    }
  }, [products, activeCategory, sortBy]);

  return (
    <section id="products" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="mb-10">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Curated Collection</p>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-black mb-2">Shop the range.</h2>
          <p className="text-gray-400 text-base">Every product hand-picked for build quality, longevity, and that just-right feel.</p>
        </div>

        {/* Filter + Sort */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button key={cat.slug} onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  activeCategory === cat.slug
                    ? "bg-black text-white"
                    : "bg-gray-50 text-gray-500 hover:text-black border border-gray-200"
                }`}>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} strokeWidth={1.75} className="text-gray-400" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-sm text-black border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-gray-400 cursor-pointer">
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Showing <span className="font-semibold text-black">{filtered.length}</span> {filtered.length === 1 ? "product" : "products"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} onAddToCart={onAddToCart} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400">No products in this category yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
