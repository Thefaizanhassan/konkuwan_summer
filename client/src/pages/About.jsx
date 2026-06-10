import ScrollReveal from '../components/ui/ScrollReveal';
import useScrollReveal from '../hooks/useScrollReveal';

export default function About() {
  useScrollReveal();

  return (
    <>
      {/* <section className="pt-28 pb-12 bg-cream border-b border-border"> */}
        {/* <div className="max-w-6xl mx-auto px-6"> */}
      <section className="pt-[152px] pb-20 bg-cream border-b border-border">
        <div className="container-kk">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">About Us</span>
            <h1 className="font-display text-5xl md:text-6xl text-forest mt-4">We started in a village called Konkuwa.</h1>
            <p className="text-lg text-muted mt-4 max-w-xl">Seven years of field work. Two founders. 2,500+ farming families.</p>
          </ScrollReveal>
        </div>
      </section>

      {/* <section className="py-16 bg-forest text-white/80 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center"> */}
      <section className="section-kk bg-forest text-white/80 relative overflow-hidden">
        <div className="container-kk grid md:grid-cols-2 gap-20 items-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl text-white">From a tribal village to a national supply chain.</h2>
            <p className="mt-6 leading-relaxed">In 2018, Roopali and Rajeshwar began working with farming communities in tribal Jharkhand. The name <strong>Konkuwan</strong> comes from that first village — a reminder of why this work exists.</p>
            <p className="mt-4">The problem was simple and stubborn: herbal manufacturers needed quality raw material. Farmers had the land and the knowledge. Nobody was connecting them well enough, at scale.</p>
            <p className="mt-4">Seven years later, we operate across 7 states, work with 2,500+ farming families, and supply medicinal herbs and spices to manufacturers across India.</p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="aspect-[3/4] rounded-lg overflow-hidden">
              <img src="https://static.wixstatic.com/media/c5590f_465a42b3459843519939d12696f47177~mv2.jpg" alt="Roopali and farmers" className="w-full h-full object-cover" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* <section className="py-16">
        <div className="max-w-6xl mx-auto px-6"> */}
      <section className="section-kk">
        <div className="container-kk">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">The Team</span>
            <h2 className="font-display text-3xl text-forest mt-2">Founders.</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <TeamCard name="Roopali Dutta Mohapatra" title="CEO & Co-Founder" img="https://www.konkuwanherbs.com/images/roopali.png" bio="16+ years in rural livelihoods and NRLM..." />
            <TeamCard name="Rajeshwar Dhavala" title="COO & Co-Founder" img="https://www.konkuwanherbs.com/images/rajeshwar.png" bio="B.Tech Civil Engineering, NIT Srinagar..." />
          </div>
        </div>
      </section>

      {/* Advisors and Company Facts similar to original */}
      <section className="section-kk bg-cream">
        <div className="container-kk">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Advisors</span>
            <h2 className="font-display text-3xl text-forest mt-2">Advisors.</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 border border-border mt-12">
            {[
              { name: 'Dr. Alka Dangash', desc: 'PhD Plant Botany · 25+ years of medicinal-and-aromatic-plant (MAP) research.' },
              { name: 'Dr. Haldhar Mahato', desc: 'State Convenor PHRN · Public health & nutrition expert · former Member, Jharkhand State Food Commission.' },
            ].map((a) => (
              <div key={a.name} className="bg-white p-9 border-r border-border last:border-r-0 hover:bg-cream transition-colors">
                <strong className="block text-lg text-forest font-semibold mb-2">{a.name}</strong>
                <p className="text-sm text-muted">{a.desc}</p>
              </div>
            ))}
          </div>

          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage block mt-20">Company facts</span>
            <h2 className="font-display text-3xl text-forest mt-2">The company on paper.</h2>
          </ScrollReveal>
          <dl className="border border-border mt-12">
            {[
              ['Incorporated', '2018'],
              ['CIN', 'U01400OR2018PTC029698'],
              ['DPIIT Reg. No.', 'DIPP59802'],
              ['FSSAI', 'Registered'],
              ['Registered Office', 'Baseli Sahi, Puri, Odisha'],
              ['Branch Offices', 'Ranchi (Jharkhand) · Dehradun (Uttarakhand)'],
            ].map(([term, value]) => (
              <div key={term} className="grid grid-cols-1 md:grid-cols-[220px_1fr] border-b border-border last:border-b-0">
                <dt className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted bg-cream border-b md:border-b-0 md:border-r border-border">
                  {term}
                </dt>
                <dd className="px-6 py-4 text-[15px] text-forest">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

function TeamCard({ name, title, img, bio }) {
  return (
    <ScrollReveal>
      <div className="bg-white border border-border p-6 rounded-sm text-center">
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-forest to-sage">
          <img src={img} alt={name} className="w-full h-full object-cover object-top" />
        </div>
        <h3 className="font-display text-xl mt-4">{name}</h3>
        <p className="text-xs uppercase text-sage tracking-wider">{title}</p>
        <p className="text-sm text-muted mt-3">{bio}</p>
      </div>
    </ScrollReveal>
  );
}