import { useState } from 'react';
import ScrollReveal from '../components/ui/ScrollReveal';
import useScrollReveal from '../hooks/useScrollReveal';
import apiClient from '../services/api';

const inputLight =
  'w-full border border-border bg-cream/30 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest/40 transition';
const inputDark =
  'w-full bg-white/10 border border-white/20 px-4 py-3 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition';
 
function FormStatus({ status }) {
  if (!status) return null;
  const ok = status.type === 'success';
  return (
    <p
      className={`text-sm rounded-lg px-4 py-3 ${
        ok ? 'bg-leaf/15 text-leaf' : 'bg-red-500/15 text-red-400'
      }`}
    >
      {ok ? '✓ ' : '⚠ '}
      {status.message}
    </p>
  );
}

export default function Contact() {
  useScrollReveal();
  const emptyBuyer = { name: '', company: '', product: '', quantity: '', email: '', phone: '' };
  const emptyInvestor = { name: '', organisation: '', interest: '', email: '', message: '' };
 
  const [form, setForm] = useState(emptyBuyer);
  const [investorForm, setInvestorForm] = useState(emptyInvestor);
  const [buyerStatus, setBuyerStatus] = useState(null);
  const [investorStatus, setInvestorStatus] = useState(null);
  const [buyerSending, setBuyerSending] = useState(false);
  const [investorSending, setInvestorSending] = useState(false);

  const handleBuyerSubmit = async (e) => {
    e.preventDefault();
    setBuyerStatus(null);
    setBuyerSending(true);
    try {
      await apiClient.post('/contact/buyer', form); // or send to Formspree
      setBuyerStatus({ type: 'success', message: 'Request sent! We will get back within 2 working days.' });
      setForm(emptyBuyer);
    } catch (err) {
      setBuyerStatus({
        type: 'error',
        message: err?.response?.data?.message || 'Error sending. Please email us directly at info@konkuwanherbs.com.',
      });
    } finally {
      setBuyerSending(false);
    }
  };

  const handleInvestorSubmit = async (e) => {
    e.preventDefault();
    setInvestorStatus(null);
    setInvestorSending(true);
    try {
      await apiClient.post('/contact/investor', investorForm);
      setInvestorStatus({ type: 'success', message: 'Message sent! We will get back within 2 working days.' });
      setInvestorForm(emptyInvestor);
    } catch (err) {
      setInvestorStatus({
        type: 'error',
        message: err?.response?.data?.message || 'Error sending. Please email us directly at info@konkuwanherbs.com.',
      });
    } finally {
      setInvestorSending(false);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-14 bg-cream border-b border-border">
        <div className="container-kk">
          <ScrollReveal>
            <span className="text-xs uppercase tracking-widest text-sage">Contact</span>
            <h1 className="font-display text-5xl text-forest mt-4">Let's talk.</h1>
            <p className="text-lg text-muted mt-4 max-w-xl">
              Choose your path below. We respond within 2 working days.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Forms */}
      <section className="py-16">
        <div className="container-kk grid md:grid-cols-2 gap-8 items-stretch">
          {/* ── Buyer Card ── */}
          <div className="bg-white border border-border rounded-2xl p-8 lg:p-10 flex flex-col shadow-sm">
            <span className="text-xs uppercase tracking-widest text-sage">For Buyers</span>
            <h3 className="font-display text-2xl lg:text-3xl text-forest mt-3 leading-snug">
              Source medicinal herbs, spices, or superfoods.
            </h3>
            <p className="text-sm text-muted mt-3">
              Tell us what you need and we'll come back with availability, grades, and a sample plan.
            </p>
 
            <form onSubmit={handleBuyerSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
              <div className="grid sm:grid-cols-2 gap-4">
                <input required name="name" placeholder="Your name" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} className={inputLight} />
                <input required name="company" placeholder="Company name" value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })} className={inputLight} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <input required name="product" placeholder="Product(s) needed" value={form.product}
                  onChange={e => setForm({ ...form, product: e.target.value })} className={inputLight} />
                <input name="quantity" placeholder="Approx quantity (e.g., 5 MT)" value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })} className={inputLight} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <input required type="email" name="email" placeholder="Email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} className={inputLight} />
                <input name="phone" placeholder="Phone" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} className={inputLight} />
              </div>
 
              <FormStatus status={buyerStatus} />
 
              <div className="mt-auto pt-2">
                <button
                  type="submit"
                  disabled={buyerSending}
                  className="w-full bg-forest text-white py-3 rounded-lg font-medium hover:bg-forest-mid transition disabled:opacity-60"
                >
                  {buyerSending ? 'Sending…' : 'Request a Sample'}
                </button>
              </div>
            </form>

 
            <div className="mt-8 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-display text-xl text-forest">48h</p>
                <p className="text-xs text-muted mt-1">Response time</p>
              </div>
              <div>
                <p className="font-display text-xl text-forest">FSSAI</p>
                <p className="text-xs text-muted mt-1">Compliant supply</p>
              </div>
              <div>
                <p className="font-display text-xl text-forest">Farm-direct</p>
                <p className="text-xs text-muted mt-1">Traceable lots</p>
              </div>
            </div>
          </div>
 
          {/* ── Investor Card ── */}
          <div className="bg-forest text-white rounded-2xl p-8 lg:p-10 flex flex-col shadow-sm">
            <span className="text-xs uppercase tracking-widest text-leaf">For Investors & Partners</span>
            <h3 className="font-display text-2xl lg:text-3xl mt-3 leading-snug">
              Investing or partnering?
            </h3>
            <p className="text-sm text-white/70 mt-3">
              Get our investor brief with financials, farm network, and expansion plans.
            </p>
 
            <form onSubmit={handleInvestorSubmit} className="mt-8 space-y-4 flex-1 flex flex-col">
              <div className="grid sm:grid-cols-2 gap-4">
                <input required name="name" placeholder="Your name" value={investorForm.name}
                  onChange={e => setInvestorForm({ ...investorForm, name: e.target.value })} className={inputDark} />
                <input required name="organisation" placeholder="Organisation" value={investorForm.organisation}
                  onChange={e => setInvestorForm({ ...investorForm, organisation: e.target.value })} className={inputDark} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <select
                  name="interest"
                  value={investorForm.interest}
                  onChange={e => setInvestorForm({ ...investorForm, interest: e.target.value })}
                  className={`${inputDark} [&>option]:text-forest`}
                >
                  <option value="">I am a…</option>
                  <option>Investor</option>
                  <option>Grant</option>
                  <option>Strategic Partner</option>
                  <option>Other</option>
                </select>
                <input required type="email" name="email" placeholder="Email" value={investorForm.email}
                  onChange={e => setInvestorForm({ ...investorForm, email: e.target.value })} className={inputDark} />
              </div>
              <textarea
                required
                name="message"
                placeholder="Tell us about your interest…"
                value={investorForm.message}
                onChange={e => setInvestorForm({ ...investorForm, message: e.target.value })}
                rows={4}
                className={inputDark}
              />
 
              <FormStatus status={investorStatus} />
 
              <div className="mt-auto pt-2">
                <button
                  type="submit"
                  disabled={investorSending}
                  className="w-full bg-white text-forest py-3 rounded-lg font-medium hover:bg-cream transition disabled:opacity-60"
                >
                  {investorSending ? 'Sending…' : 'Request Investor Brief'}
                </button>
              </div>
            </form>
 
            <div className="mt-8 pt-6 border-t border-white/20 space-y-1.5">
              <p className="text-sm flex items-center gap-2"><span className="text-leaf">✉</span> info@konkuwanherbs.com</p>
              <p className="text-sm flex items-center gap-2"><span className="text-leaf">☎</span> +91 8809 227099</p>
              <p className="text-sm flex items-center gap-2"><span className="text-leaf">⌂</span> Baseli Sahi, Puri, Odisha 752001</p>
            </div>
          </div>
        </div>
        {/* {status && <p className="text-center mt-4 text-sage">{status}</p>} */}
      </section>
    </>
  );
}