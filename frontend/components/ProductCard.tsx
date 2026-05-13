"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Heart, Star, Eye } from "lucide-react";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  index: number;
  onAddToCart: (product: Product) => void;
}

const DISCOUNT = (p: Product) =>
  p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : null;

export default function ProductCard({
  product,
  index,
  onAddToCart,
}: ProductCardProps) {
  const [wished, setWished] = useState(false);
  const [hovered, setHovered] = useState(false);
  const discount = DISCOUNT(product);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.55,
        delay: index * 0.07,
        ease: [0.16, 1, 0.3, 1],
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative bg-white rounded-3xl border border-border overflow-hidden cursor-pointer"
      style={{ boxShadow: hovered ? undefined : "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)" }}
      whileHover={{ y: -6, boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 32px 64px -12px rgba(0,0,0,0.1)" }}
    >
      {/* Image zone */}
      <div className="relative aspect-[4/3] bg-surface overflow-hidden">
        <motion.div
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full"
        >
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </motion.div>

        {/* Overlay on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-ink/10 backdrop-blur-[1px]"
            />
          )}
        </AnimatePresence>

        {/* Badges top-left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {discount && (
            <span className="bg-ink text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              −{discount}%
            </span>
          )}
          {product.isNew && (
            <span className="bg-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              New
            </span>
          )}
          {product.stock <= 10 && product.stock > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              Low stock
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setWished((v) => !v);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full glass flex items-center justify-center shadow-sm"
          aria-label="Wishlist"
        >
          <motion.div
            animate={{ scale: wished ? [1, 1.35, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              size={14}
              strokeWidth={2}
              className={wished ? "text-red-500" : "text-muted"}
              fill={wished ? "#EF4444" : "transparent"}
            />
          </motion.div>
        </button>

        {/* Hover action row */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
              className="absolute bottom-3 left-3 right-3 z-10 flex gap-2"
            >
              <button
                onClick={() => onAddToCart(product)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-ink text-white rounded-xl text-xs font-semibold hover:bg-ink-light active:scale-95 transition-all"
              >
                <ShoppingBag size={13} strokeWidth={2} />
                Add to Cart
              </button>
              <button className="w-10 flex items-center justify-center glass rounded-xl border border-border hover:border-ink transition-all">
                <Eye size={14} strokeWidth={1.75} className="text-muted" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="text-[11px] text-muted font-medium truncate">
              {product.brand} · {product.category}
            </p>
            <h3 className="font-semibold text-ink text-sm leading-snug mt-0.5 truncate">
              {product.name}
            </h3>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={11}
                strokeWidth={0}
                fill={i < Math.floor(product.rating) ? "#FBBF24" : "#E5E7EB"}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted font-medium">
            {product.rating} ({product.reviewCount.toLocaleString()})
          </span>
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-ink text-base">
              AED {product.price}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-subtle line-through">
                AED {product.originalPrice}
              </span>
            )}
          </div>
          <button
            onClick={() => onAddToCart(product)}
            className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-muted hover:bg-ink hover:text-white transition-all duration-200 active:scale-90"
            aria-label="Quick add"
          >
            <ShoppingBag size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
