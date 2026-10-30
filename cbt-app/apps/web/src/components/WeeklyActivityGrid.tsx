import { worksheetConfigs, type ActivityWeek } from '@cbt/shared';

/**
 * Read-only weekly grid resembling the original worksheet table layout.
 * Used by both the detail view and the print view.
 */
export function WeeklyActivityGrid({ week }: { week: ActivityWeek }) {
  const cfg = worksheetConfigs['activity-monitoring-form'];
  const timeHeader = cfg?.print_layout.labels?.time_header ?? 'Time';
  const moodRow = cfg?.print_layout.labels?.mood_row ?? 'Overall Mood (0-10)';
  const slotCount = week.days[0]?.slots.length ?? 0;

  return (
    <table className="activity-grid w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border border-accent-soft bg-accent-soft/50 p-2 text-left">{timeHeader}</th>
          {week.days.map((d) => (
            <th key={d.day_of_week} className="border border-accent-soft bg-accent-soft/50 p-2 text-left">
              {d.day_of_week}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: slotCount }).map((_, rowIdx) => {
          const timeLabel = week.days[0]?.slots[rowIdx]?.time_label ?? '';
          return (
            <tr key={rowIdx}>
              <th className="border border-accent-soft p-2 text-left font-medium whitespace-nowrap">
                {timeLabel}
              </th>
              {week.days.map((d) => {
                const slot = d.slots[rowIdx];
                return (
                  <td key={d.day_of_week} className="border border-accent-soft p-2 align-top">
                    {slot?.activity_text && <div>{slot.activity_text}</div>}
                    {slot?.pm_rating_text && (
                      <div className="text-xs text-ink-faint">P/M: {slot.pm_rating_text}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
        <tr>
          <th className="border border-accent-soft p-2 text-left font-medium">{moodRow}</th>
          {week.days.map((d) => (
            <td key={d.day_of_week} className="border border-accent-soft p-2 text-center">
              {d.overall_mood_0_10 ?? ''}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
