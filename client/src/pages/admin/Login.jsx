import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="bg-white p-8 rounded-sm shadow-lg w-full max-w-md">
        <h1 className="font-display text-3xl text-forest mb-6">Admin Login</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-border p-2 rounded-sm" required />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-border p-2 rounded-sm" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-forest text-white py-2 rounded-sm font-medium hover:bg-forest-mid transition">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <Link to="/" className="block mt-4 text-sm text-sage hover:text-forest transition text-center">← Back to site</Link>
      </div>
    </div>
  );
}