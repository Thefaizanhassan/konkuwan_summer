import ScrollReveal from '../components/ui/ScrollReveal';
import useScrollReveal from '../hooks/useScrollReveal';

export default function About() {
  useScrollReveal();

  return (
    <>
      <section className="pt-28 pb-12 bg-cream border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">About Us</span>
            <h1 className="font-display text-5xl md:text-6xl text-forest mt-4">We started in a village called Konkuwa.</h1>
            <p className="text-lg text-muted mt-4 max-w-xl">Seven years of field work. Two founders. 2,500+ farming families.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 bg-forest text-white/80 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
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

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
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