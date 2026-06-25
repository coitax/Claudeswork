import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ThoughtRecord, WorksheetConfig } from '@cbt/shared';
import { api } from '@/lib/api';
import { PrintLayout } from '@/components/PrintLayout';
import { ThoughtRecordView } from './ThoughtRecordView';

interface PrintData {
  record: ThoughtRecord;
  configSideOne: WorksheetConfig;
  configSideTwo: WorksheetConfig;
}

export function ThoughtRecordPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState<PrintData | null>(null);

  useEffect(() => {
    if (id) api.get<PrintData>(`/api/thought-records/${id}/print-data`).then(setData);
  }, [id]);

  if (!data) return <p className="p-6 text-ink-faint">Loading…</p>;

  return (
    <PrintLayout>
      <header className="mb-4">
        <h1 className="text-xl font-bold">{data.configSideOne.title}</h1>
        {data.configSideOne.instructions && (
          <p className="mt-1 text-sm">{data.configSideOne.instructions}</p>
        )}
      </header>
      <ThoughtRecordView record={data.record} />
    </PrintLayout>
  );
}
