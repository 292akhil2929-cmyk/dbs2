"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
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
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let list =
      activeCategory === "all"
        ? products
        : products.filter((p) => p.categorySlug === activeCategory);

    switch (sortBy) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "reviews":
        list = [...list].sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      default:
        break;
    }
    return list;
  }, [products, activeCategory, sortBy]);

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Featured";

  return (
    <section id="products" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">
            Curated Collection
          </p>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-ink mb-4">
            Shop the range.
          </h2>
          <p className="text-muted text-lg max-w-xl">
            Every product hand-picked for build quality, longevity, and that
            just-right feel.
          </p>
        </motion.div>

        {/* Filter + Sort toolbar */}
        <div className="flex items-center justify-between gap-4 mb-10 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.slug
                    ? "bg-ink text-white shadow-sm"
                    : "bg-surface text-muted hover:text-ink border border-border"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white text-sm font-medium text-muted hover:text-ink transition-all"
            >
              <SlidersHorizontal size={14} strokeWidth={1.75} />
              {activeSortLabel}
              <ChevronDown
                size={13}
                strokeWidth={2}
                className={`transition-transform ${sortOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {sortOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-white border border-border rounded-2xl shadow-card-hover overflow-hidden z-30"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        onClick={() => {
                          setSortBy(opt.value);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-surface ${
                          sortBy === opt.value
                            ? "text-accent font-semibold"
                            : "text-ink"
                        }`}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted mb-8">
          Showing{" "}
          <span className="font-semibold text-ink">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "product" : "products"}
        </p>

        {/* Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory + sortBy}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                onAddToCart={onAddToCart}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-muted text-lg">No products in this category yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
