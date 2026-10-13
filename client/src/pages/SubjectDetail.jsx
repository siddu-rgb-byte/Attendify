import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { api } from '../lib/api';
import { EligibilityBadge } from '../lib/format';

export default function SubjectDetail() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [records, setRecords] = useState([]);
  // today_total / today_attended = classes held/attended TODAY (incremental)
  const [form, setForm] = useState({ today_total: '', today_attended: '', note: '' });
  const [err, setErr] = useState('');

  async function load() {
    // FIX: fetch the specific subject by id, then pick it from the list
    const [{ subjects }, { records }] = await Promise.all([
      api.get('/subjects'),
      api.get(`/subjects/${id}/records`),
    ]);
    const found = subjects.find((s) => String(s.id) === String(id));
    setSubject(found || null);
    setRecords(records);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [id]);

  if (err) return <p className="text-rose-600">{err}</p>;
  if (!subject) return <p className="text-slate-500">Loading…</p>;

  const latest = subject.latest;
  const history = [...records].reverse().map((r) => ({ ...r, label: r.recorded_at.slice(0, 10) }));

  async function addRecord(e) {
    e.preventDefault();
    setErr('');
    try {
      const todayTotal = Number(form.today_total);
      const todayAttended = Number(form.today_attended);
      // Add today's classes on top of the running total
      const prevTotal = latest?.total_classes ?? 0;
      const prevAttended = latest?.attended_classes ?? 0;
      await api.post(`/subjects/${id}/records`, {
        total_classes: prevTotal + todayTotal,
        attended_classes: prevAttended + todayAttended,
        note: form.note || undefined,
      });
      setForm({ today_total: '', today_attended: '', note: '' });
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/subjects" className="text-sm text-brand-600 hover:underline">← All subjects</Link>
        <h1 className="mt-2 text-2xl font-bold">
          {subject.name} {subject.code && <span className="text-base font-normal text-slate-400">{subject.code}</span>}
        </h1>
        <p className="text-sm text-slate-500">Target attendance: {subject.target_percent}%</p>
      </div>

      {latest && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase text-slate-500">Attendance</p>
            <p className={`mt-1 text-3xl font-bold ${latest.eligible ? 'text-emerald-600' : 'text-rose-600'}`}>
              {latest.percentage}%
            </p>
            <p className="text-xs text-slate-500">{latest.attended_classes} / {latest.total_classes} classes</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase text-slate-500">Status</p>
            <p className="mt-2"><EligibilityBadge eligible={latest.eligible} totalClasses={latest.total_classes} /></p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase text-slate-500">To reach target</p>
            <p className="mt-1 text-3xl font-bold text-brand-600">
              {latest.eligible ? '—' : latest.classes_required_to_reach_target}
            </p>
            <p className="text-xs text-slate-500">
              {latest.eligible ? 'already eligible' : 'more classes (all present)'}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase text-slate-500">Can miss</p>
            <p className="mt-1 text-3xl font-bold text-amber-500">
              {latest.eligible ? latest.classes_can_miss : '—'}
            </p>
            <p className="text-xs text-slate-500">
              {latest.eligible ? 'classes and stay eligible' : 'not eligible yet'}
            </p>
          </div>
        </div>
      )}

      {/* Entry form — enter TODAY's classes; they get added to the running total */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 font-semibold text-sm">Update Attendance</h2>
        {latest && (
          <p className="mb-3 text-xs text-slate-500">
            Running total: <strong>{latest.attended_classes} attended</strong> out of <strong>{latest.total_classes} classes</strong> ({latest.percentage}%)
          </p>
        )}
        <form onSubmit={addRecord} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
          <label className="text-sm">
            Classes held today
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="number" min={0}
              placeholder="e.g. 2"
              value={form.today_total} onChange={(e) => setForm({ ...form, today_total: e.target.value })} required />
          </label>
          <label className="text-sm">
            You attended
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="number" min={0}
              placeholder="e.g. 2"
              value={form.today_attended} onChange={(e) => setForm({ ...form, today_attended: e.target.value })} required />
          </label>
          <label className="text-sm">
            Note (optional)
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. after midterms"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <button className="self-end rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Update
          </button>
        </form>
      </div>
      {err && <p className="text-sm text-rose-600">{err}</p>}

      {/* History chart */}
      {history.length > 1 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 font-semibold">Attendance history</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <ReferenceLine y={subject.target_percent} stroke="#ef4444" strokeDasharray="4 4" label={`target ${subject.target_percent}%`} />
              <Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Records table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Attended / Total</th>
              <th className="px-5 py-3">Percentage</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const eligible = r.percentage >= subject.target_percent;
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-slate-500">{r.recorded_at.slice(0, 10)}</td>
                  <td className="px-5 py-3">{r.attended_classes} / {r.total_classes}</td>
                  <td className={`px-5 py-3 font-semibold ${eligible ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.percentage}%
                  </td>
                  <td className="px-5 py-3"><EligibilityBadge eligible={eligible} totalClasses={r.total_classes} /></td>
                  <td className="px-5 py-3 text-slate-500">{r.note || '—'}</td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-500">No records yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
