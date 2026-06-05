import { useEffect } from 'react';

export default function Modal({ children, onClose, maxWidth = 'max-w-2xl' }) {
  useEffect(() => {
    const handleEsc = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(22,47,34,0.35)' }}>
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-6`}
        style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-lg transition-colors"
          style={{ color: '#999', background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f0ebe2'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

/* initial code
import { useEffect } from 'react';

export default function Modal({ children, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        {children}
      </div>
    </div>
  );
}
*/