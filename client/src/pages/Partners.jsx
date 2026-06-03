import ScrollReveal from '../components/ui/ScrollReveal';
import useScrollReveal from '../hooks/useScrollReveal';
import { Link } from 'react-router-dom';

const INVESTORS = [
  { type: 'Equity Investor', name: 'IRMA iSeed', desc: 'Seed fund of Institute of Rural Management Anand. Equity investment.' },
  { type: 'Incubation', name: 'IIMA Ventures', desc: 'Early‑stage support and convertible debt from IIM Ahmedabad.' },
  { type: 'Incubation', name: 'IIMCIP — IIM Calcutta', desc: 'Selected by IIM Calcutta Innovation Park for the 2024 cohort.' },
  { type: 'Debt Support', name: 'Harit Bharat Fund / WRI', desc: 'Debt support for sustainable agriculture and land restoration.' },
  { type: 'Technical Partner', name: 'PUSA Krishi / IARI', desc: 'Indian Agricultural Research Institute. Technical partnership for crop research.' },
];

const PARTNERS = [
  { type: 'Land Restoration', name: 'WRI India', desc: 'World Resources Institute. Land Accelerator partner. Top 15 land‑restoration companies in South Asia.' },
  { type: 'Social Enterprise', name: 'Women on Wings', desc: 'Dutch social enterprise supporting women’s economic empowerment in India.' },
  { type: 'State Partner · Odisha', name: 'ORMAS', desc: 'Odisha Rural Development and Marketing Society. State government partner for farmer linkages.' },
  { type: 'State Partner · Manipur', name: 'MOMA', desc: 'Manipur Organic Mission Agency. State partner for the organic farming programme.' },
  { type: 'Incubation', name: 'MANAGE-CIA / RKVY', desc: 'National Institute of Agricultural Extension Management. Incubation programme 2020.' },
];

export default function Partners() {
  useScrollReveal();

  return (
    <>
      <section className="pt-28 pb-12 bg-cream border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Partners &amp; Investors</span>
            <h1 className="font-display text-5xl md:text-6xl text-forest mt-4">Who stands behind Konkuwan.</h1>
            <p className="text-lg text-muted mt-4 max-w-2xl">
              Investment, incubation, and strategic support from organisations at the intersection of rural livelihoods, sustainable agriculture, and impact.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Investors &amp; Capital</span>
            <h2 className="font-display text-3xl text-forest mt-2">Investors.</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-2 bg-border border border-border mt-8">
            {INVESTORS.map((p) => (
              <ScrollReveal key={p.name}>
                <div className="bg-white p-6 hover:bg-cream transition">
                  <div className="text-xs uppercase tracking-wider text-sage">{p.type}</div>
                  <h3 className="font-display text-xl text-forest mt-1">{p.name}</h3>
                  <p className="text-sm text-muted mt-2">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Strategic Partners</span>
            <h2 className="font-display text-3xl text-forest mt-2">Partners and supporters.</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-2 bg-border border border-border mt-8">
            {PARTNERS.map((p) => (
              <ScrollReveal key={p.name}>
                <div className="bg-white p-6 hover:bg-cream transition">
                  <div className="text-xs uppercase tracking-wider text-sage">{p.type}</div>
                  <h3 className="font-display text-xl text-forest mt-1">{p.name}</h3>
                  <p className="text-sm text-muted mt-2">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-forest text-center relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-white/5"></div>
        <div className="absolute bottom-[-100px] left-[-60px] w-[440px] h-[440px] rounded-full bg-white/5"></div>
        <div className="relative z-10 max-w-xl mx-auto px-4">
          <h2 className="font-display text-4xl text-white">We are building India’s most reliable supply chain for medicinal herbs.</h2>
          <p className="text-white/60 mt-4">If you invest in sustainable agriculture, rural livelihoods, or the global herbal economy — we’d like to talk.</p>
          <Link to="/contact" className="inline-block mt-8 bg-white text-forest px-8 py-3 rounded-sm font-medium hover:bg-cream transition">
            Request Investor Brief →
          </Link>
        </div>
      </section>
    </>
  );
}