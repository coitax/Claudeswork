import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Print layout wrapper. Renders worksheet-faithful content with a print button
 * that is hidden when printing. App chrome is excluded because print routes are
 * rendered outside the AppShell.
 */
export function PrintLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl p-6 print-page">
      <div className="no-print mb-6 flex justify-between gap-2">
        <button className="btn-ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {children}
    </div>
  );
}
