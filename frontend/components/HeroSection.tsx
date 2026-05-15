"use client";

import Image from "next/image";
import { ShoppingBag, Star, ArrowRight } from "lucide-react";
import { Product } from "@/types/product";

interface HeroSectionProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const calcDiscount = (p: Product) =>
  p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : null;

export default function HeroSection({ product, onAddToCart }: HeroSectionProps) {
  const d = calcDiscount(product);

  return (
    <section className="bg-white pt-24 pb-16 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: Text */}
          <div>
            <span className="inline-block text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">
              Featured Pick
            </span>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black tracking-tighter text-black leading-tight mb-5">
              Sound that disappears into music.
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed max-w-md mb-8">
              {product.description}
            </p>

            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} strokeWidth={0}
                    fill={i < Math.floor(product.rating) ? "#FBBF24" : "#E5E7EB"} />
                ))}
              </div>
              <span className="text-sm font-semibold text-black">{product.rating}</span>
              <span className="text-sm text-gray-400">({product.reviewCount.toLocaleString()} reviews)</span>
            </div>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-3xl font-black text-black">AED {product.price}</span>
              {product.originalPrice && (
                <span className="text-lg text-gray-400 line-through">AED {product.originalPrice}</span>
              )}
              {d && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  -{d}%
                </span>
              )}
            </div>

            <div className="flex gap-3 flex-wrap mb-6">
              <button onClick={() => onAddToCart(product)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors duration-150">
                <ShoppingBag size={15} strokeWidth={2} />
                Add to Cart
              </button>
              <a href="#products"
                className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-black rounded-xl font-semibold text-sm hover:border-black transition-colors duration-150">
                Browse all
                <ArrowRight size={14} strokeWidth={2} />
              </a>
            </div>

            <div className="flex items-center gap-5 flex-wrap">
              {["Free shipping", "2-yr warranty", "30-day returns"].map(chip => (
                <span key={chip} className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Product image */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm rounded-2xl border border-gray-100 overflow-hidden bg-gray-50">
              {d && (
                <div className="absolute top-4 left-4 z-10 bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  -{d}% OFF
                </div>
              )}
              <div className="relative aspect-square">
                <Image src={product.imageUrl} alt={product.name} fill
                  className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
              </div>
              <div className="p-4 border-t border-gray-100 bg-white">
                <p className="text-xs text-gray-400 mb-0.5">{product.brand}</p>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-black text-sm">{product.name}</h3>
                  <p className="font-black text-black">AED {product.price}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
