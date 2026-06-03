import { Link } from 'react-router-dom';

export default function MobileMenu({ onClose }) {
  return (
    <div className="fixed top-18 left-0 right-0 bottom-0 bg-forest z-40 p-8 border-t border-white/10">
      <ul className="flex flex-col gap-6 mb-8">
        {['Supply','Products','Impact','Partners','About','Contact'].map(item => (
          <li key={item}>
            <Link
              to={`/${item.toLowerCase()}`}
              className="font-display text-2xl text-white/90"
              onClick={onClose}
            >
              {item}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/contact"
        className="inline-block bg-white text-forest px-6 py-3 rounded-sm font-medium text-sm"
        onClick={onClose}
      >
        Request a Sample →
      </Link>
    </div>
  );
}