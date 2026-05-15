"use client";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const REVIEWS = [
  {
    name: "Arjun Mehta",
    role: "Software Engineer",
    avatar: "https://i.pravatar.cc/80?img=11",
    rating: 5,
    text: "The AirFlow Pro headphones are absolutely worth every dirham. Sound quality is cinema-grade and delivery was next morning.",
  },
  {
    name: "Sara Al Mansoori",
    role: "Product Designer",
    avatar: "https://i.pravatar.cc/80?img=47",
    rating: 5,
    text: "ShopSphere has the cleanest UI of any UAE tech store. Found what I needed in 30 seconds and checkout was smooth.",
  },
  {
    name: "Dev Krishnan",
    role: "Startup Founder",
    avatar: "https://i.pravatar.cc/80?img=68",
    rating: 5,
    text: "Bought the Obsidian keyboard for the office. Three months in, zero issues. The 2-year warranty just gives extra peace of mind.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">Customer Reviews</p>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-ink mb-4">
            Loved by thousands.
          </h2>
          <p className="text-muted text-lg">Don&apos;t take our word for it.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map(({ name, role, avatar, rating, text }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-5 transition-shadow duration-300 hover:shadow-card-hover"
            >
              {/* Quote icon */}
              <Quote size={20} strokeWidth={1.5} className="text-accent/30" />

              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: rating }).map((_, j) => (
                  <Star key={j} size={13} strokeWidth={0} fill="#FBBF24" />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-muted leading-relaxed flex-1">&ldquo;{text}&rdquo;</p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-ink">{name}</p>
                  <p className="text-xs text-muted">{role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
