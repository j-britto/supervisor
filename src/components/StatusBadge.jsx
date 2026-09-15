import React from 'react';

export default function StatusBadge({ status, type = 'review' }) {
  if (!status) return null;

  const statusLower = status.toLowerCase();

  let classes = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-200 ';

  if (statusLower.includes('completed') || statusLower.includes('published') || statusLower.includes('passed')) {
    classes += 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
  } else if (statusLower.includes('in progress') || statusLower.includes('attended') || statusLower.includes('submitted')) {
    classes += 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
  } else if (statusLower.includes('accepted') || statusLower.includes('warning') || statusLower.includes('under review')) {
    classes += 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
  } else if (statusLower.includes('not completed') || statusLower.includes('error') || statusLower.includes('not started')) {
    classes += 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  } else {
    classes += 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
  }

  return (
    <span className={classes}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {status}
    </span>
  );
}
