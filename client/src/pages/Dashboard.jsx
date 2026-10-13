import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { EligibilityBadge } from '../lib/format';

const COLORS = ['#4f46e5', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/summary').then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-rose-600">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading dashboard…</p>;

  const { overall, warnings, subjects } = data;
  const hasData = overall.total_classes > 0;
  const eligible = hasData && overall.percentage >= 75;
  const chartData = subjects.filter((s) => s.total_classes > 0).map((s) => ({
    name: s.code || s.name,
    percentage: s.percentage,
    target: s.target_percent,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Overall summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase text-slate-500">Overall attendance</p>
          <p className={`mt-1 text-3xl font-bold ${!hasData ? 'text-slate-400' : eligible ? 'text-emerald-600' : 'text-rose-600'}`}>
            {hasData ? `${overall.percentage}%` : '—'}
          </p>
          <p className="text-xs text-slate-500">{hasData ? `${overall.attended_classes} / ${overall.total_classes} classes` : 'No attendance records yet'}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase text-slate-500">Subjects</p>
          <p className="mt-1 text-3xl font-bold">{overall.subject_count}</p>
          <p className="text-xs text-slate-500">tracked</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase text-slate-500">Eligible</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{overall.eligible_count}</p>
          <p className="text-xs text-slate-500">subjects at/above target</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase text-slate-500">Warnings</p>
          <p className="mt-1 text-3xl font-bold text-rose-600">{overall.low_attendance_count}</p>
          <p className="text-xs text-slate-500">below target</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-semibold text-rose-700">⚠ Low attendance warnings</h2>
          <ul className="mt-2 space-y-1 text-sm text-rose-700">
            {warnings.map((w) => (
              <li key={w.id}>
                <Link to={`/subjects/${w.id}`} className="underline">{w.name}</Link> — {w.percentage}% (target{' '}
                {w.target_percent}%). Attend <b>{w.classes_required_to_reach_target}</b> more class
                {w.classes_required_to_reach_target === 1 ? '' : 'es'} (all present) to reach target.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart: subject % vs target */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 font-semibold">Attendance % by subject</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance data yet. <Link className="text-brand-600 underline" to="/subjects">Add a subject</Link>.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label="75% target" />
                <Bar dataKey="percentage" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie: eligible vs low */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 font-semibold">Eligibility split</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500">Add attendance records to see the split.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Eligible', value: overall.eligible_count },
                    { name: 'Below target', value: overall.low_attendance_count },
                  ]}
                  dataKey="value" innerRadius={60} outerRadius={100}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Subject table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Subject</th>
              <th className="px-5 py-3">Target %</th>
              <th className="px-5 py-3">Attended / Total</th>
              <th className="px-5 py-3">Current %</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Can miss</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => {
              const hasRecord = s.total_classes > 0;
              const above = hasRecord && s.percentage >= s.target_percent;
              return (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    <Link className="text-brand-600 hover:underline" to={`/subjects/${s.id}`}>{s.name}</Link>
                    {s.code && <span className="ml-2 text-xs text-slate-400">{s.code}</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.target_percent}%</td>
                  <td className="px-5 py-3 text-slate-500">
                    {hasRecord ? `${s.attended_classes} / ${s.total_classes}` : '—'}
                  </td>
                  <td className={`px-5 py-3 font-semibold ${!hasRecord ? 'text-slate-400' : above ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {hasRecord ? `${s.percentage}%` : '—'}
                  </td>
                  <td className="px-5 py-3"><EligibilityBadge eligible={s.eligible} totalClasses={s.total_classes} /></td>
                  <td className="px-5 py-3">{s.eligible && s.total_classes ? s.classes_can_miss : '—'}</td>
                </tr>
              );
            })}
            {subjects.length === 0 && (
              <tr><td className="px-5 py-6 text-center text-slate-500" colSpan={6}>
                No subjects yet. <Link className="text-brand-600 underline" to="/subjects">Add your first subject</Link>.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
