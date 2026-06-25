import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { ThoughtRecord } from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';
import { ThoughtRecordView } from './ThoughtRecordView';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function ThoughtRecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<ThoughtRecord | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (id) api.get<ThoughtRecord>(`/api/thought-records/${id}`).then(setRecord);
  }, [id]);

  if (!record) return <p className="text-ink-faint">Loading…</p>;

  async function handleDelete() {
    await api.del(`/api/thought-records/${record!.id}`);
    navigate('/app/thought-records');
  }

  return (
    <div>
      <PageHeader
        title={record.title || 'Thought Record'}
        description={record.is_draft ? 'Draft' : undefined}
        actions={
          <>
            <Link to={`/app/thought-records/${record.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <Link to={`/app/thought-records/${record.id}/print`} className="btn-primary">
              Print
            </Link>
            <button className="btn-ghost" onClick={() => setConfirming(true)}>Delete</button>
          </>
        }
      />
      <div className="card">
        <ThoughtRecordView record={record} />
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete this thought record?"
        message="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => { setConfirming(false); void handleDelete(); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
