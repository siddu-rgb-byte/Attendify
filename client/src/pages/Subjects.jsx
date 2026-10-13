import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { EligibilityBadge } from '../lib/format';

const emptyForm = {
  name: '', code: '', target_percent: 75,
  total_classes: '', attended_classes: '',
};

export default function Subjects() {
  const [subjects, setSubjects] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    const { subjects } = await api.get('/subjects');
    setSubjects(subjects);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      if (editingId) {
        // Edit: only update name / code / target
        await api.put(`/subjects/${editingId}`, {
          name: form.name,
          code: form.code,
          target_percent: form.target_percent,
        });
      } else {
        // Create subject
        const { subject } = await api.post('/subjects', {
          name: form.name,
          code: form.code,
          target_percent: form.target_percent,
        });
        // If user also entered current attendance, post a record immediately
        const total = Number(form.total_classes);
        const attended = Number(form.attended_classes);
        if (total > 0) {
          await api.post(`/subjects/${subject.id}/records`, {
            total_classes: total,
            attended_classes: Math.min(attended, total),
          });
        }
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this subject and all its attendance records?')) return;
    await api.del(`/subjects/${id}`);
    await load();
  }

  function startEdit(s) {
    setEditingId(s.id);
    setForm({ name: s.name, code: s.code || '', target_percent: s.target_percent, total_classes: '', attended_classes: '' });
  }

  if (!subjects) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Subjects</h1>

      {/* Add / Edit form */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
        <p className="text-sm font-semibold text-slate-700">{editingId ? 'Edit Subject' : 'Add New Subject'}</p>
        <form onSubmit={submit} className="space-y-3">
          {/* Row 1: name / code / target */}
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Subject name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Code (optional)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <div className="relative">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-7 text-sm"
                type="number" min={1} max={99}
                placeholder="Target %"
                value={form.target_percent}
                onChange={(e) => setForm({ ...form, target_percent: e.target.value })}
                required
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
            </div>
          </div>

          {/* Row 2: current attendance (only when adding a new subject) */}
          {!editingId && (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr] items-end">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Total classes held so far</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="number" min={0}
                  placeholder="e.g. 40"
                  value={form.total_classes}
                  onChange={(e) => setForm({ ...form, total_classes: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Classes you attended</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="number" min={0}
                  placeholder="e.g. 32"
                  value={form.attended_classes}
                  onChange={(e) => setForm({ ...form, attended_classes: e.target.value })}
                />
              </div>
              <p className="text-xs text-slate-400 pb-2">
                Optional — fill to see Current % &amp; Status right away.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              {editingId ? 'Save changes' : 'Add subject'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm(emptyForm); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {err && <p className="text-sm text-rose-600 mt-1">{err}</p>}
      </div>

      {/* Subjects table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Subject</th>
              <th className="px-5 py-3">Target %</th>
              <th className="px-5 py-3">Attended / Total</th>
              <th className="px-5 py-3">Current %</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => {
              const pct = s.latest?.percentage;
              const above = pct != null && pct >= s.target_percent;
              return (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    <Link className="text-brand-600 hover:underline" to={`/subjects/${s.id}`}>{s.name}</Link>
                    {s.code && <span className="ml-2 text-xs text-slate-400">{s.code}</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.target_percent}%</td>
                  <td className="px-5 py-3 text-slate-500">
                    {s.latest ? `${s.latest.attended_classes} / ${s.latest.total_classes}` : '—'}
                  </td>
                  <td className={`px-5 py-3 font-semibold ${!s.latest ? 'text-slate-400' : above ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {s.latest ? `${pct}%` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <EligibilityBadge eligible={s.latest?.eligible} totalClasses={s.latest?.total_classes || 0} />
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => startEdit(s)} className="text-slate-500 hover:text-brand-600 text-xs font-medium">Edit</button>
                    <button onClick={() => remove(s.id)} className="text-slate-500 hover:text-rose-600 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              );
            })}
            {subjects.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No subjects yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
