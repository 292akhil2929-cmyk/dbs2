import { Star } from "lucide-react";

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
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Customer Reviews</p>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-black mb-2">Loved by thousands.</h2>
          <p className="text-gray-400 text-base">Don&apos;t take our word for it.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {REVIEWS.map(({ name, role, avatar, rating, text }) => (
            <div key={name} className="bg-gray-50 rounded-xl border border-gray-100 p-5">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: rating }).map((_, j) => (
                  <Star key={j} size={13} strokeWidth={0} fill="#FBBF24" />
                ))}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-black">{name}</p>
                  <p className="text-xs text-gray-400">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
