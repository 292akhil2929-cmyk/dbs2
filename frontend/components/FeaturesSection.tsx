import { Truck, ShieldCheck, RefreshCw, Headphones, CreditCard, Award } from "lucide-react";

const FEATURES = [
  { icon: Truck,        title: "Free Shipping",    desc: "On all orders over AED 200. Express next-day delivery available." },
  { icon: ShieldCheck,  title: "2-Year Warranty",  desc: "Every product is covered. Hassle-free claims, no questions asked." },
  { icon: RefreshCw,    title: "30-Day Returns",   desc: "Changed your mind? Return anything within 30 days, no fuss." },
  { icon: Headphones,   title: "24/7 Support",     desc: "Our team is always on standby — chat, call, or email anytime." },
  { icon: CreditCard,   title: "Secure Checkout",  desc: "Bank-grade SSL encryption on every transaction. Always safe." },
  { icon: Award,        title: "Curated Quality",  desc: "Every SKU vetted by our team. Only the best makes the shelf." },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Why ShopSphere</p>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-black mb-3">Built around you.</h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            From discovery to delivery, every step is designed to be effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Icon size={17} strokeWidth={1.75} className="text-black" />
              </div>
              <h3 className="font-bold text-black text-sm mb-1.5">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
