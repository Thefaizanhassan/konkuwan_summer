import ScrollReveal from '../components/ui/ScrollReveal';
import useScrollReveal from '../hooks/useScrollReveal';
import { Link } from 'react-router-dom';

const STEPS = [
  { number: '01', title: 'Crop Planning', desc: 'We identify the right crop for each geography and season. Our team works with farming communities in 7 states to plan what to grow, when, and at what scale.' },
  { number: '02', title: 'Cultivation Support', desc: 'Farmers receive seed support, field guidance, and technical inputs through our field coordinators. We manage the growing cycle — not just the purchase.' },
  { number: '03', title: 'Harvest & Collection', desc: 'Post‑harvest, our team aggregates produce directly from farm clusters. This removes multiple layers of intermediaries and reduces contamination risk.' },
  { number: '04', title: 'Processing & Quality Check', desc: 'Raw material is dried, cleaned, graded, and checked before dispatch. We work to FSSAI compliance standards and provide COA documentation on request.' },
  { number: '05', title: 'Dispatch to Buyer', desc: 'Packed and labelled as per your requirement. We handle logistics to your facility or warehouse. Repeat orders are managed by our sales team directly.' },
];

const QUALITY = [
  { title: 'Lab‑Tested Lots', desc: 'Key product lots are tested through empanelled third‑party laboratories. Certificate of Analysis (COA) provided on request before or after dispatch.' },
  { title: 'COA Documentation', desc: 'We generate COA reports covering physical parameters, moisture, and pesticide residue screening. Documentation available as part of every B2B transaction.' },
  { title: 'Accountability on Rejections', desc: 'If a batch fails your internal quality check, you speak to us directly — not a broker, not a middleman. We investigate, replace or credit as appropriate.' },
];

const CAPACITY = [
  ['Dry Ginger', 'Up to 100 MT per season'],
  ['Moringa (dried leaves / powder)', 'Up to 100 MT per season'],
  ['Mucuna Pruriens', 'Up to 100 MT per season'],
  ['Chia Seeds', 'Up to 100 MT annually'],
  ['Turmeric', 'Available on inquiry'],
  ['Ashwagandha', 'Available on inquiry'],
  ['Safed Musli', 'Available on inquiry'],
];

export default function Supply() {
  useScrollReveal();

  return (
    <>
      <section className="pt-28 pb-12 bg-cream border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">How We Supply</span>
            <h1 className="font-display text-5xl md:text-6xl text-forest mt-4">From farm to dispatch — here is our process.</h1>
            <p className="text-lg text-muted mt-4 max-w-xl">Five steps, no intermediaries, no surprises. We manage every link in the chain.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">The Process</span>
            <h2 className="font-display text-3xl text-forest mt-2">Five steps from field to facility.</h2>
          </ScrollReveal>
          <div className="mt-8 space-y-12">
            {STEPS.map((step) => (
              <ScrollReveal key={step.number}>
                <div className="grid grid-cols-[72px_1fr] gap-8 items-start border-b border-border pb-10 last:border-none">
                  <div className="font-display text-5xl text-cream-dark">{step.number}</div>
                  <div>
                    <h3 className="font-display text-xl text-forest">{step.title}</h3>
                    <p className="text-muted mt-2 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Quality</span>
            <h2 className="font-display text-3xl text-forest mt-2">What we check before anything leaves.</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-2 bg-border border border-border mt-8">
            {QUALITY.map((q) => (
              <ScrollReveal key={q.title}>
                <div className="bg-white p-6 hover:bg-cream transition">
                  <h4 className="font-display text-lg text-forest">{q.title}</h4>
                  <p className="text-sm text-muted mt-2">{q.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Capacity</span>
            <h2 className="font-display text-3xl text-forest mt-2">Current supply capacity.</h2>
          </ScrollReveal>
          <div className="mt-8 border border-border overflow-hidden rounded-sm">
            <table className="w-full text-left">
              <thead className="bg-cream-dark text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {CAPACITY.map(([name, cap], i) => (
                  <tr key={name} className={i % 2 === 0 ? 'bg-white' : 'bg-cream/50'}>
                    <td className="p-4 font-medium">{name}</td>
                    <td className="p-4 text-muted">{cap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted mt-4 italic">Supply capacity scales with advance orders. Minimum order quantities and lead times confirmed on inquiry.</p>
          <div className="text-center mt-8">
            <Link to="/contact" className="inline-block bg-forest text-white px-8 py-3 rounded-sm font-medium hover:bg-forest-mid transition">
              Request a sample or discuss volumes →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-forest text-center relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-white/5"></div>
        <div className="relative z-10 max-w-xl mx-auto px-4">
          <h2 className="font-display text-4xl text-white">Ready to brief us?</h2>
          <p className="text-white/60 mt-4">Tell us the crop, the volume, and the timeline. We will respond within two working days.</p>
          <Link to="/contact" className="inline-block mt-8 bg-white text-forest px-8 py-3 rounded-sm font-medium hover:bg-cream transition">
            Start a conversation →
          </Link>
        </div>
      </section>
    </>
  );
}