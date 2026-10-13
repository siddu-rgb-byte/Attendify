/** Shared UI helpers + eligibility badge. */
export function pctColor(p, eligible) {
  if (p === 0) return 'text-slate-400';
  return eligible ? 'text-emerald-600' : 'text-rose-600';
}

export function EligibilityBadge({ eligible, totalClasses }) {
  if (!totalClasses) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">No data</span>;
  }
  return eligible ? (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Eligible ✓</span>
  ) : (
    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">Low attendance ⚠</span>
  );
}
