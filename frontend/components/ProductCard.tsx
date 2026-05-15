"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Star } from "lucide-react";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  index: number;
  onAddToCart: (product: Product) => void;
}

const calcDiscount = (p: Product) =>
  p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : null;

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const discount = calcDiscount(product);

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        <Image src={product.imageUrl} alt={product.name} fill
          className="object-cover hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {discount && (
            <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          {product.isNew && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              New
            </span>
          )}
          {product.stock <= 10 && product.stock > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Low stock
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[11px] text-gray-400 font-medium mb-0.5">
          {product.brand} · {product.category}
        </p>
        <h3 className="font-semibold text-black text-sm mb-2 truncate">{product.name}</h3>

        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={11} strokeWidth={0}
                fill={i < Math.floor(product.rating) ? "#FBBF24" : "#E5E7EB"} />
            ))}
          </div>
          <span className="text-[11px] text-gray-400">{product.rating} ({product.reviewCount.toLocaleString()})</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-black text-sm">AED {product.price}</span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">AED {product.originalPrice}</span>
            )}
          </div>
          <button onClick={handleAdd}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150
              ${added ? "bg-emerald-600 text-white" : "bg-black text-white hover:bg-gray-800"}`}>
            <ShoppingBag size={12} strokeWidth={2} />
            {added ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
