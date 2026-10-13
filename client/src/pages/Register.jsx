import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';
import { useAuth } from '../App';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await api.post('/auth/register', form);
      setToken(token);
      setUser(user);
      nav('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-bold">Create your account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Full name"
          value={form.name} onChange={set('name')} required />
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email"
          type="email" value={form.email} onChange={set('email')} required />
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Password (min 6 chars)"
          type="password" value={form.password} onChange={set('password')} required minLength={6} />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Register
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Already registered? <Link className="text-brand-600 hover:underline" to="/login">Sign in</Link>
      </p>
    </div>
  );
}
