import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { PageHeader } from '@/components/common';

export function SettingsPage() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="card mb-4">
        <h2 className="font-semibold text-ink">Account</h2>
        <p className="mt-1 text-sm text-ink-soft">Username: {user?.username}</p>
        {user?.email && <p className="text-sm text-ink-soft">Email: {user.email}</p>}
        <p className="mt-2 text-xs text-ink-faint">
          To change your password, re-run the seed script with CBT_FORCE=1.
        </p>
      </div>
      <div className="card">
        <h2 className="font-semibold text-ink">Worksheet text review</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Confirm or correct worksheet wording that was uncertain at import time.
        </p>
        <Link to="/app/settings/worksheet-review" className="btn-secondary mt-3">
          Open worksheet review
        </Link>
      </div>
    </div>
  );
}
