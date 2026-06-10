import { useEffect, useState, useRef } from 'react';
import ScrollReveal from '../components/ui/ScrollReveal';
import Counter from '../components/ui/Counter';
import useScrollReveal from '../hooks/useScrollReveal';

export default function Impact() {
  useScrollReveal();

  return (
    <>
      <section className="pt-28 pb-12 bg-cream border-b border-border">
        {/* <div className="max-w-6xl mx-auto px-6"> */}
        <div className="container-kk">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Impact</span>
            <h1 className="font-display text-5xl text-forest mt-4">What seven years in the field looks like.</h1>
            <p className="text-lg text-muted mt-4 max-w-xl">Working with tribal and rural farming communities across Central and North India — at scale, with continuity.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-8 bg-forest">
        {/* <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 text-white text-center gap-4"> */}
        <div className="container-kk grid grid-cols-2 md:grid-cols-4 text-white text-center gap-4">
          {[ { target: 2500, suffix: '+', label: 'Farming families' },
             { target: 7, label: 'States' },
             { target: 8, label: 'Medicinal crops' },
             { target: 9, prefix: '₹', suffix: ' Cr+', label: 'Farmer income' } ].map(stat => (
            <div key={stat.label} className="p-6">
              <div className="font-display text-4xl md:text-5xl font-medium">
                {stat.prefix}<Counter target={stat.target} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-white/60 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-cream">
        {/* <div className="max-w-6xl mx-auto px-6"> */}
        <div className="container-kk">
          <ScrollReveal>
            <h2 className="font-display text-3xl text-forest">Where we work.</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 mt-8 bg-border border border-border">
            {[
              { state: 'Jharkhand', crops: 'Mucuna · Hibiscus · Moringa', desc: 'Tribal communities · Konkuwa hamlet origin — where it all started in 2018.' },
              { state: 'Odisha', crops: 'Ginger · Moringa · Turmeric · Chia', desc: 'Tribal and PVTG farmers · 1,500+ families' },
              { state: 'Chhattisgarh', crops: 'Moringa · Mucuna · Safed Musli · Shatavari', desc: 'Tribal communities in Central India.' },
              { state: 'Madhya Pradesh', crops: 'Chia · Ashwagandha · Quinoa', desc: 'Contract farmers · Neemuch region.' },
              { state: 'West Bengal', crops: 'Ashwagandha', desc: 'SC farming families · 500+ acres.' },
              { state: 'Manipur', crops: 'Turmeric · Ginger', desc: 'Tribal FPOs · currently on hold, conflict-affected.' },
              { state: 'Mizoram', crops: 'Sugandhmantri · Ginger', desc: 'Hill-state farming clusters.' },
            ].map(item => (
              <ScrollReveal key={item.state}>
                <div className="bg-white p-6 hover:bg-cream transition">
                  <h3 className="font-display text-xl">{item.state}</h3>
                  <p className="text-sm text-sage mt-1">{item.crops}</p>
                  <p className="text-xs text-muted mt-2">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Farmer Programme and Awards sections similar to original */}
    </>
  );
}