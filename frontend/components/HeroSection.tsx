"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ShoppingBag, Star, ArrowRight, Sparkles } from "lucide-react";
import { Product } from "@/types/product";

interface HeroSectionProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

// Word-by-word stagger reveal
function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.55,
            delay: 0.3 + i * 0.07,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

const DISCOUNT = (p: Product) =>
  p.originalPrice
    ? Math.round((1 - p.price / p.originalPrice) * 100)
    : null;

export default function HeroSection({ product, onAddToCart }: HeroSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const imgY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const discount = DISCOUNT(product);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden bg-white"
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none" />

      {/* Large ambient blob */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 w-full pt-28 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Text ── */}
          <motion.div style={{ y: textY, opacity }} className="z-10">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-semibold mb-8"
            >
              <Sparkles size={11} strokeWidth={2.5} />
              Featured Pick
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black tracking-tighter text-ink leading-[0.95] mb-6">
              <WordReveal text="Sound that" />
              <br />
              <WordReveal
                text="disappears"
                className="bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent"
              />
              <br />
              <WordReveal text="into music." />
            </h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.75 }}
              className="text-muted text-lg leading-relaxed max-w-md mb-10"
            >
              {product.description}
            </motion.p>

            {/* Rating row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="flex items-center gap-4 mb-10"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    strokeWidth={0}
                    fill={
                      i < Math.floor(product.rating) ? "#FBBF24" : "#E5E7EB"
                    }
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-ink">
                {product.rating}
              </span>
              <span className="text-sm text-muted">
                ({product.reviewCount.toLocaleString()} reviews)
              </span>
            </motion.div>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95 }}
              className="flex items-center gap-4 flex-wrap"
            >
              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-ink">
                  AED {product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-subtle line-through">
                    AED {product.originalPrice}
                  </span>
                )}
                {discount && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    −{discount}%
                  </span>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => onAddToCart(product)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white rounded-2xl font-semibold text-sm hover:bg-ink-light active:scale-95 transition-all duration-200 shadow-float"
                >
                  <ShoppingBag size={15} strokeWidth={2} />
                  Add to Cart
                </button>
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 px-5 py-3 border border-border text-ink rounded-2xl font-semibold text-sm hover:border-ink transition-all duration-200"
                >
                  Browse all
                  <ArrowRight size={14} strokeWidth={2} />
                </a>
              </div>
            </motion.div>

            {/* Tags */}
            {product.tags && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.1 }}
                className="flex items-center gap-2 mt-8 flex-wrap"
              >
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-muted border border-border px-2.5 py-1 rounded-full capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* ── Right: Floating product card ── */}
          <motion.div
            style={{ y: imgY }}
            className="relative flex justify-center items-center z-10"
          >
            {/* Outer glow ring */}
            <div className="absolute inset-8 bg-gradient-to-br from-accent/10 to-purple-200/20 rounded-[40px] blur-2xl" />

            {/* Glassmorphism card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative glass rounded-[32px] shadow-float overflow-hidden w-full max-w-sm"
            >
              {/* Discount badge */}
              {discount && (
                <div className="absolute top-5 left-5 z-10 bg-ink text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  −{discount}% OFF
                </div>
              )}

              {/* Image */}
              <div className="relative w-full aspect-square bg-gradient-to-br from-surface to-white overflow-hidden">
                <motion.div
                  animate={{ y: [0, -14, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-full h-full"
                >
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </motion.div>
              </div>

              {/* Card footer */}
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted font-medium mb-0.5">
                      {product.brand}
                    </p>
                    <h3 className="font-bold text-ink text-base leading-tight">
                      {product.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-ink text-lg">
                      AED {product.price}
                    </p>
                    {product.originalPrice && (
                      <p className="text-xs text-subtle line-through">
                        AED {product.originalPrice}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stock indicator */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{
                        width: `${Math.min((product.stock / 50) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {product.stock} left
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Floating stats chips */}
            <motion.div
              initial={{ opacity: 0, x: 24, y: -16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -top-4 -right-4 glass rounded-2xl px-4 py-2.5 shadow-card flex items-center gap-2"
            >
              <Star size={13} fill="#FBBF24" strokeWidth={0} />
              <span className="font-bold text-sm text-ink">{product.rating}</span>
              <span className="text-xs text-muted">/ 5.0</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -24, y: 16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-4 -left-4 glass rounded-2xl px-4 py-2.5 shadow-card"
            >
              <p className="text-xs text-muted font-medium">Reviews</p>
              <p className="font-black text-ink text-lg leading-tight">
                {product.reviewCount.toLocaleString()}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-subtle font-medium tracking-widest uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-subtle to-transparent"
        />
      </motion.div>
    </section>
  );
}
