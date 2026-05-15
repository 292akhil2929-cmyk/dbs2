"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Stat { value: number; suffix: string; label: string; desc: string; }

const STATS: Stat[] = [
  { value: 12000, suffix: "+", label: "Happy Customers",   desc: "Across the UAE & GCC" },
  { value: 98,    suffix: "%", label: "Satisfaction Rate", desc: "Based on post-purchase surveys" },
  { value: 500,   suffix: "+", label: "Products Listed",   desc: "Curated tech & accessories" },
  { value: 2,     suffix: " hr", label: "Avg. Response",   desc: "Customer support turnaround" },
];

function CountUp({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const duration = 1600;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [active, target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-ink py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-white/10">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center lg:px-8"
            >
              <div className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-2">
                <CountUp target={s.value} suffix={s.suffix} active={inView} />
              </div>
              <div className="text-sm font-semibold text-white mb-1">{s.label}</div>
              <div className="text-xs text-white/40">{s.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
