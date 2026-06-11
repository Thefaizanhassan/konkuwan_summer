import { Link } from 'react-router-dom';
import whiteLogo from '../../assets/konkuwan_logo_white.svg';

export default function Footer() {
  return (
    <footer className="bg-[#0A110C] text-white/50 py-12">
      {/* <div className="max-w-6xl mx-auto px-6"> */}
      <div className="container-kk">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-white/10">
          <div>
            <img src={whiteLogo} alt="Konkuwan Herbs" className="h-10 mb-4 opacity-80" />
            <p className="text-sm text-white/40 max-w-xs">
              Regenerating land. Transforming lives.<br />Farm‑direct medicinal herb supply across India.
            </p>
          </div>
          <div>
            <h5 className="text-xs font-medium uppercase tracking-widest text-white/30 mb-4">Site</h5>
            <ul className="space-y-2">
              {['Supply','Products','Impact','Partners','About','Contact'].map(item => (
                <li key={item}>
                  <Link to={`/${item.toLowerCase()}`} className="text-sm text-white/50 hover:text-white transition">
                    {item === 'Supply' ? 'How We Supply' : item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-medium uppercase tracking-widest text-white/30 mb-4">Contact</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:info@konkuwanherbs.com" className="hover:text-white">info@konkuwanherbs.com</a></li>
              <li><a href="tel:+918809227099" className="hover:text-white">+91 8809 227099</a></li>
              <li><a href="tel:+918010605859" className="hover:text-white">+91 8010 605859</a></li>
              <li><a href="https://linkedin.com/company/konkuwan-herbs" target="_blank" rel="noopener noreferrer" className="hover:text-white">LinkedIn ↗</a></li>
            </ul>
            <p className="text-xs text-white/30 mt-4">Baseli Sahi, Puri, Odisha 752001</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-white/25">
          <span>© 2025 Konkuwan Herbs Pvt. Ltd.</span>
          <span className="font-display italic text-sm text-white/30">Regenerating land. Transforming lives.</span>
          <span>CIN: U01400OR2018PTC029698 · DPIIT DIPP59802</span>
        </div>
      </div>
    </footer>
  );
}