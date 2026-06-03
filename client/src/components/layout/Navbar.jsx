import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import MobileMenu from './MobileMenu';
import logo from '../../assets/konkuwan_logo_primary.svg';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-18 transition-colors duration-300 ${
        scrolled ? 'bg-forest/95 backdrop-blur-md border-white/10' : 'bg-cream/95 backdrop-blur-md border-border/50'
      } border-b`}
    >
      <Link to="/" className="flex items-center">
        <img src={logo} alt="Konkuwan Herbs" className="h-10" />
      </Link>
      <ul className="hidden lg:flex gap-8 items-center">
        {[
          { to: '/supply', label: 'Supply' },
          { to: '/products', label: 'Products' },
          { to: '/impact', label: 'Impact' },
          { to: '/partners', label: 'Partners' },
          { to: '/about', label: 'About' },
          { to: '/contact', label: 'Contact' },
        ].map(link => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  scrolled ? 'text-white/80 hover:text-white' : 'text-forest hover:text-sage'
                } ${isActive ? (scrolled ? 'text-white' : 'text-forest') : ''}`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <Link
        to="/contact"
        className={`hidden lg:inline-block px-6 py-2 rounded-sm text-sm font-medium transition-colors ${
          scrolled ? 'bg-white/10 text-white border border-white/30 hover:bg-white/20' : 'bg-forest text-white hover:bg-forest-mid'
        }`}
      >
        Request a Sample →
      </Link>
      <button
        className="lg:hidden flex flex-col gap-1 p-1"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`block w-6 h-0.5 transition ${scrolled ? 'bg-white' : 'bg-forest'}`}></span>
        <span className={`block w-6 h-0.5 transition ${scrolled ? 'bg-white' : 'bg-forest'}`}></span>
        <span className={`block w-6 h-0.5 transition ${scrolled ? 'bg-white' : 'bg-forest'}`}></span>
      </button>
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </nav>
  );
}