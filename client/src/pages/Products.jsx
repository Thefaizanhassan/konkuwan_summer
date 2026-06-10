import { useState } from 'react';
import { Link } from 'react-router-dom';
import useProducts from '../hooks/useProducts';
import useCategories from '../hooks/useCategories';
import ProductCard from '../components/ui/ProductCard';
import ScrollReveal from '../components/ui/ScrollReveal';
import useScrollReveal from '../hooks/useScrollReveal';

export default function Products() {
  useScrollReveal();
  const [selectedCat, setSelectedCat] = useState(null);
  const [page, setPage] = useState(1);
  const { data: catData } = useCategories();
  const categories = catData?.data || [];
  const { data, isLoading } = useProducts({ category: selectedCat, page, limit: 12 });

  const products = data?.data || [];
  const pagination = data?.pagination;

  return (
    <>
      <section className="pt-28 pb-12 bg-cream border-b border-border">
        {/* <div className="max-w-6xl mx-auto px-6"> */}
        <div className="container-kk">
          <ScrollReveal>
            <span className="eyebrow">Products</span>
            <h1 className="font-display text-4xl md:text-6xl text-forest">Our Products</h1>
            <p className="text-lg text-muted mt-4 max-w-xl">
              Medicinal plants, spices, and superfoods — grown and processed across tribal farming belts in Central and North India.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-12">
        {/* <div className="max-w-6xl mx-auto px-6"> */}
        <div className="container-kk">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => { setSelectedCat(null); setPage(1); }}
              className={`px-4 py-1.5 text-sm rounded-sm border transition ${!selectedCat ? 'bg-forest text-white border-forest' : 'border-border text-muted hover:bg-forest hover:text-white'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCat(cat.slug); setPage(1); }}
                className={`px-4 py-1.5 text-sm rounded-sm border transition ${selectedCat === cat.slug ? 'bg-forest text-white border-forest' : 'border-border text-muted hover:bg-forest hover:text-white'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[2px] bg-border border border-border">
            {isLoading ? <p className="p-6">Loading...</p> : products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`w-8 h-8 text-sm rounded-full ${num === page ? 'bg-forest text-white' : 'border border-border hover:bg-cream'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-24 bg-forest text-center relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-white/5"></div>
        <div className="relative z-10 max-w-xl mx-auto px-4">
          <h2 className="font-display text-4xl text-white">Don't see what you need?</h2>
          <p className="text-white/60 mt-4">We work across 30+ crops seasonally. Get in touch — we can usually source it.</p>
          <Link to="/contact" className="inline-block mt-8 bg-white text-forest px-8 py-3 rounded-sm font-medium hover:bg-cream transition">Get in touch →</Link>
        </div>
      </section>
    </>
  );
}