export default function StatsSection() {
  const stats = [
    { value: "12,000+", label: "Customers" },
    { value: "98%", label: "Satisfaction" },
    { value: "500+", label: "Products" },
    { value: "2hr", label: "Support Response" },
  ];

  return (
    <section className="bg-black py-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black text-white mb-1">{value}</p>
              <p className="text-sm text-gray-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
