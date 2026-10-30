import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { PageHeader } from '@/components/common';

const cards = [
  {
    to: '/app/activity',
    title: 'Activity Monitoring',
    body: 'Track weekly activities and overall mood.',
  },
  {
    to: '/app/thought-records',
    title: 'Thought Records',
    body: 'Work through situations, thoughts, and adaptive responses.',
  },
  { to: '/app/daily-mood', title: 'Daily Mood', body: 'A short daily check-in and diary.' },
];

export function HomePage() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.username ?? ''}`} description="What would you like to work on?" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-ink">{c.title}</h2>
            <p className="mt-1 text-sm text-ink-faint">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
