import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { ActivityWeek, ActivityPhoto } from '@cbt/shared';
import { api, uploadPhoto } from '@/lib/api';
import { PageHeader } from '@/components/common';
import { WeeklyActivityGrid } from '@/components/WeeklyActivityGrid';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function ActivityDetailPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const [week, setWeek] = useState<ActivityWeek | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);

  useEffect(() => {
    if (weekId) {
      api.get<ActivityWeek>(`/api/activity-weeks/${weekId}`).then((w) => {
        setWeek(w);
        setPhotos(w.photos ?? []);
      });
    }
  }, [weekId]);

  if (!week) return <p className="text-ink-faint">Loading…</p>;

  async function handleDelete() {
    try {
      await api.del(`/api/activity-weeks/${week!.id}`);
      navigate('/app/activity');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = await uploadPhoto(week!.id, file);
      setPhotos((prev) => [...prev, p]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      e.target.value = '';
    }
  }

  async function onDeletePhoto(id: string) {
    await api.del(`/api/activity-weeks/${week!.id}/photos/${id}`);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <PageHeader
        title={week.title || `Week of ${week.week_start_date}`}
        description={`Week starting ${week.week_start_date}${week.is_draft ? ' · Draft' : ''}`}
        actions={
          <>
            <Link to={`/app/activity/${week.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <Link to={`/app/activity/${week.id}/print`} className="btn-primary">
              Print
            </Link>
            <button className="btn-ghost" onClick={() => setConfirming(true)}>Delete</button>
          </>
        }
      />
      {week.notes && <p className="mb-4 text-sm text-ink-soft">{week.notes}</p>}
      <div className="overflow-x-auto">
        <WeeklyActivityGrid week={week} />
      </div>
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Journal photos</h2>
        <p className="mt-1 text-sm text-ink-soft">JPEG, PNG, or WEBP only — iPhone HEIC isn't supported; your phone's photo picker usually uploads JPEG.</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} className="mt-2 text-sm" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="relative">
              <a href={`/api/activity-weeks/${week.id}/photos/${p.id}`} target="_blank" rel="noreferrer">
                <img src={`/api/activity-weeks/${week.id}/photos/${p.id}`} alt={p.filename}
                     className="h-32 w-full rounded-md object-cover" />
              </a>
              <button className="btn-ghost absolute right-1 top-1 bg-card/80 px-2 py-0.5 text-xs"
                      onClick={() => void onDeletePhoto(p.id)}>Delete</button>
            </figure>
          ))}
        </div>
      </section>
      <ConfirmDialog
        open={confirming}
        title="Delete this activity week?"
        message="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => { setConfirming(false); void handleDelete(); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
