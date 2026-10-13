import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';
import { useAuth } from '../App';

const DEMO_EMAIL = 'demo@attendify.app';
const DEMO_PASSWORD = 'demo1234';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { setUser } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { token, user } = await api.post('/auth/login', { email, password });
      setToken(token);
      setUser(user);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to track your attendance.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" autoComplete="off">
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email"
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="off" required />
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Password"
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password" required />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        No account? <Link className="text-brand-600 hover:underline" to="/register">Register</Link>
      </p>

      {/* Demo account quick-fill */}
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <p className="text-xs text-slate-500 mb-2">Want to explore? Use the demo account:</p>
        <button
          type="button"
          onClick={fillDemo}
          className="w-full rounded-lg border border-brand-600 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
        >
          ⚡ Fill Demo Credentials
        </button>
      </div>
    </div>
  );
}
