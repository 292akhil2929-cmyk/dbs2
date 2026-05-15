"use client";
import { motion } from "framer-motion";
import { Truck, ShieldCheck, RefreshCw, Headphones, CreditCard, Award } from "lucide-react";

const FEATURES = [
  {
    icon: Truck,
    title: "Free Shipping",
    desc: "On all orders over AED 200. Express next-day delivery available.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "2-Year Warranty",
    desc: "Every product is covered. Hassle-free claims, no questions asked.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: RefreshCw,
    title: "30-Day Returns",
    desc: "Changed your mind? Return anything within 30 days, no fuss.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Our team is always on standby — chat, call, or email anytime.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: CreditCard,
    title: "Secure Checkout",
    desc: "Bank-grade SSL encryption on every transaction. Always safe.",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Award,
    title: "Curated Quality",
    desc: "Every SKU vetted by our team. Only the best makes the shelf.",
    color: "bg-sky-50 text-sky-600",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">
            Why ShopSphere
          </p>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-ink mb-4">
            Built around you.
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            From discovery to delivery, every step is designed to be effortless.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="feature-card relative p-6 rounded-2xl border border-border bg-white transition-all duration-300 cursor-default"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-5`}>
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <h3 className="font-bold text-ink text-base mb-2">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
