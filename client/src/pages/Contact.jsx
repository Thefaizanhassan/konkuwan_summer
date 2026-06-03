import { useState } from 'react';
import ScrollReveal from '../components/ui/ScrollReveal';
import useScrollReveal from '../hooks/useScrollReveal';
import apiClient from '../services/api';

export default function Contact() {
  useScrollReveal();
  const [formType, setFormType] = useState('buyer'); // 'buyer' or 'investor'
  const [form, setForm] = useState({ name: '', company: '', product: '', quantity: '', email: '', phone: '' });
  const [investorForm, setInvestorForm] = useState({ name: '', organisation: '', interest: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleBuyerSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/contact/buyer', form); // or send to Formspree
      setStatus('Message sent! We will get back within 2 working days.');
      setForm({ name: '', company: '', product: '', quantity: '', email: '', phone: '' });
    } catch { setStatus('Error sending. Please email us directly.'); }
  };

  const handleInvestorSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/contact/investor', investorForm);
      setStatus('Message sent! We will get back within 2 working days.');
      setInvestorForm({ name: '', organisation: '', interest: '', email: '', message: '' });
    } catch { setStatus('Error sending. Please email us directly.'); }
  };

  return (
    <>
      <section className="pt-28 pb-12 bg-cream border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Contact</span>
            <h1 className="font-display text-5xl text-forest mt-4">Let's talk.</h1>
            <p className="text-lg text-muted mt-4">Choose your path below. We respond within 2 working days.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-2 bg-border border border-border">
          {/* Buyer Form */}
          <div className="bg-white p-8">
            <span className="text-xs uppercase tracking-widest text-sage">For Buyers</span>
            <h3 className="font-display text-2xl mt-2">Source medicinal herbs, spices, or superfoods.</h3>
            <form onSubmit={handleBuyerSubmit} className="mt-6 space-y-4">
              <input required name="name" placeholder="Your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border p-2 rounded-sm" />
              <input required name="company" placeholder="Company name" value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full border p-2 rounded-sm" />
              <input required name="product" placeholder="Product(s) needed" value={form.product} onChange={e => setForm({...form, product: e.target.value})} className="w-full border p-2 rounded-sm" />
              <input name="quantity" placeholder="Approx quantity (e.g., 5 MT)" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full border p-2 rounded-sm" />
              <input required type="email" name="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border p-2 rounded-sm" />
              <input name="phone" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border p-2 rounded-sm" />
              <button type="submit" className="w-full bg-forest text-white py-2 rounded-sm font-medium hover:bg-forest-mid">Request a Sample</button>
            </form>
          </div>
          {/* Investor Form */}
          <div className="bg-forest text-white p-8">
            <span className="text-xs uppercase tracking-widest text-leaf">For Investors & Partners</span>
            <h3 className="font-display text-2xl mt-2">Investing or partnering?</h3>
            <form onSubmit={handleInvestorSubmit} className="mt-6 space-y-4">
              <input required name="name" placeholder="Your name" value={investorForm.name} onChange={e => setInvestorForm({...investorForm, name: e.target.value})} className="w-full bg-white/10 border border-white/20 p-2 rounded-sm text-white placeholder-white/50" />
              <input required name="organisation" placeholder="Organisation" value={investorForm.organisation} onChange={e => setInvestorForm({...investorForm, organisation: e.target.value})} className="w-full bg-white/10 border border-white/20 p-2 rounded-sm text-white placeholder-white/50" />
              <select name="interest" value={investorForm.interest} onChange={e => setInvestorForm({...investorForm, interest: e.target.value})} className="w-full bg-white/10 border border-white/20 p-2 rounded-sm text-white">
                <option value="">Select…</option>
                <option>Investor</option>
                <option>Grant</option>
                <option>Strategic Partner</option>
                <option>Other</option>
              </select>
              <input required type="email" name="email" placeholder="Email" value={investorForm.email} onChange={e => setInvestorForm({...investorForm, email: e.target.value})} className="w-full bg-white/10 border border-white/20 p-2 rounded-sm text-white placeholder-white/50" />
              <textarea required name="message" placeholder="Tell us about your interest…" value={investorForm.message} onChange={e => setInvestorForm({...investorForm, message: e.target.value})} rows={3} className="w-full bg-white/10 border border-white/20 p-2 rounded-sm text-white placeholder-white/50" />
              <button type="submit" className="w-full bg-white text-forest py-2 rounded-sm font-medium hover:bg-cream">Request Investor Brief</button>
            </form>
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm">info@konkuwanherbs.com</p>
              <p className="text-sm">+91 8809 227099</p>
              <p className="text-sm">Baseli Sahi, Puri, Odisha 752001</p>
            </div>
          </div>
        </div>
        {status && <p className="text-center mt-4 text-sage">{status}</p>}
      </section>
    </>
  );
}