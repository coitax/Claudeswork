import type { SaveStatus } from '@/lib/use-autosave';

const labels: Record<SaveStatus, string> = {
  idle: 'Not saved yet',
  saving: 'Saving…',
  saved: 'Draft saved',
  error: 'Save failed — retry',
};

export function AutosaveIndicator({ status }: { status: SaveStatus }) {
  const color =
    status === 'error'
      ? 'text-red-700'
      : status === 'saved'
        ? 'text-green-700'
        : 'text-ink-faint';
  return (
    <span className={`no-print text-xs ${color}`} role="status" aria-live="polite">
      {labels[status]}
    </span>
  );
}
