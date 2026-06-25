import { PageHeader } from '@/components/common';

interface ExportTarget {
  label: string;
  href: string;
  description: string;
}

const EXPORTS: ExportTarget[] = [
  {
    label: 'Activity Weeks',
    href: '/api/export/activity-weeks.csv',
    description: 'One row per day across every activity-monitoring week.',
  },
  {
    label: 'Thought Records',
    href: '/api/export/thought-records.csv',
    description: 'One row per thought record.',
  },
  {
    label: 'Daily Moods',
    href: '/api/export/daily-moods.csv',
    description: 'One row per daily mood entry.',
  },
];

export function ExportPage() {
  return (
    <div>
      <PageHeader
        title="Export data"
        description="Download your records as CSV files. Each download is a plain comma-separated file you can open in any spreadsheet app."
      />

      <div className="space-y-3">
        {EXPORTS.map((target) => (
          <div key={target.href} className="card flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold text-ink">{target.label}</h2>
              <p className="mt-1 text-sm text-ink-soft">{target.description}</p>
            </div>
            {/* Same-origin <a download> sends the session cookie automatically. */}
            <a href={target.href} download className="btn-secondary shrink-0">
              Download CSV
            </a>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Tip: Open Google Sheets → File ▸ Import ▸ Upload to put each CSV in its own tab.
      </p>
    </div>
  );
}
