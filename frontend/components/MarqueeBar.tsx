"use client";

import { Zap, Truck, Shield, RefreshCw } from "lucide-react";

const ITEMS = [
  { icon: Truck, text: "Free shipping on orders over AED 200" },
  { icon: Zap, text: "Same-day dispatch before 2 PM" },
  { icon: Shield, text: "2-year warranty on all products" },
  { icon: RefreshCw, text: "30-day hassle-free returns" },
  { icon: Truck, text: "Tracked delivery to all Emirates" },
  { icon: Zap, text: "New arrivals every Monday" },
  { icon: Shield, text: "Secure payments — SSL encrypted" },
  { icon: RefreshCw, text: "Price-match guarantee" },
];

export default function MarqueeBar() {
  return (
    <div className="w-full bg-ink text-white py-3 overflow-hidden marquee-wrapper">
      {/* Double the items so the seamless loop works */}
      <div className="flex animate-marquee marquee-track whitespace-nowrap">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 mx-10 text-xs font-medium tracking-wide uppercase opacity-90"
          >
            <item.icon size={13} strokeWidth={2} />
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
