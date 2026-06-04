import { Link } from 'react-router-dom';
import ScrollReveal from '../components/ui/ScrollReveal';
import Counter from '../components/ui/Counter';
import StatsStrip from '../components/ui/StatsStrip';
import ProductCard from '../components/ui/ProductCard';
import useProducts from '../hooks/useProducts';
import useScrollReveal from '../hooks/useScrollReveal';
// import heroBg from '../../assets/hero-bg.jpg'; // or use a static image
// import heroBg from '../../assets/hero.png'; // or use a static image
import heroBg from '../assets/hero-bg.jpg'

export default function Home() {
  useScrollReveal();
  const { data, isLoading } = useProducts({ limit: 3, sort: 'created_at', order: 'DESC' });
  const featuredProducts = data?.data || [];

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-[10s]" style={{ backgroundImage: `url(${heroBg})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#05120A]/80 to-[#05120A]/85"></div>
        <div className="relative z-10 max-w-3xl px-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/90 mb-6 flex items-center justify-center gap-3 before:block before:w-7 before:h-px before:bg-white/50 after:block after:w-7 after:h-px after:bg-white/50">Medicinal plants · Spices · Superfoods</p>
          <h1 className="font-display italic text-5xl md:text-7xl text-white font-light leading-tight mb-6">
            <strong className="not-italic font-semibold text-[#C8D9B0]">Medicinal herbs and spices.</strong> Straight from the farmers.
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto mb-8">
            We grow, process, and supply raw materials to herbal manufacturers, nutraceutical brands, and wellness companies across India and for EU exporters.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/contact" className="bg-white text-forest px-8 py-3 rounded-sm font-medium text-sm hover:bg-cream transition">Request a Sample →</Link>
            <Link to="/partners" className="border border-white/40 text-white px-8 py-3 rounded-sm font-medium text-sm hover:bg-white/10 transition">For Investors</Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 text-xs uppercase tracking-widest">
          <div className="w-px h-10 bg-white/30 animate-pulse"></div>
          <span>Scroll</span>
        </div>
      </section>

      {/* Stats Strip */}
      <StatsStrip />

      {/* Why Konkuwan */}
      <section className="py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Why Konkuwan</span>
            <h2 className="font-display text-4xl text-forest mt-4">Your raw material problem is real.</h2>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              Herbal manufacturers know this: finding consistent, quality raw material is hard. Most suppliers are traders — they don't know the farm, don't test the lot, and disappear when you have a rejection problem.
            </p>
            <p className="mt-4 text-muted">
              Konkuwan works differently. We manage cultivation across farming communities in 7 states — processing, quality-checking, and dispatching directly to your facility.
            </p>
            <Link to="/supply" className="inline-flex items-center gap-2 mt-6 text-sage font-medium text-sm border-b border-sage hover:text-forest hover:border-forest transition">
              See how we supply → <span>→</span>
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
              <img src="https://static.wixstatic.com/media/c5590f_742380b7ceb44a518f0beacc9ac4c1ac~mv2.jpg" alt="Farmer" className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-4 bg-white px-5 py-3 rounded-sm text-sm font-medium text-forest shadow-lg">Direct farm sourcing across 7 states</div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Featured Products</span>
            <h2 className="font-display text-4xl text-forest mt-4">What we supply.</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[2px] bg-border border border-border mt-8">
            {isLoading ? <p>Loading...</p> : featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/products" className="text-sage font-medium text-sm border-b border-sage hover:text-forest hover:border-forest transition">View all products →</Link>
          </div>
        </div>
      </section>

      {/* Recognition (similar grid from original) */}
      <section className="py-24 bg-cream">
        {/* ... */}
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-forest text-center relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-white/5"></div>
        <div className="absolute bottom-[-100px] left-[-60px] w-[440px] h-[440px] rounded-full bg-white/5"></div>
        <div className="relative z-10 max-w-xl mx-auto px-4">
          <h2 className="font-display text-4xl text-white">Looking for a reliable herb and spice supplier?</h2>
          <p className="text-white/60 mt-4">We work with manufacturers, exporters, and wellness brands. Tell us what you need and we'll get back within two working days.</p>
          <Link to="/contact" className="inline-block mt-8 bg-white text-forest px-8 py-3 rounded-sm font-medium hover:bg-cream transition">Start a conversation →</Link>
        </div>
      </section>
    </>
  );
}