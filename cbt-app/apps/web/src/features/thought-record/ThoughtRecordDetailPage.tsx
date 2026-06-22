import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ThoughtRecord } from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';
import { ThoughtRecordView } from './ThoughtRecordView';

export function ThoughtRecordDetailPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<ThoughtRecord | null>(null);

  useEffect(() => {
    if (id) api.get<ThoughtRecord>(`/api/thought-records/${id}`).then(setRecord);
  }, [id]);

  if (!record) return <p className="text-ink-faint">Loading…</p>;

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
          </>
        }
      />
      <div className="card">
        <ThoughtRecordView record={record} />
      </div>
    </div>
  );
}
