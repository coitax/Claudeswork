import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/auth-context';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { HomePage } from '@/features/home/HomePage';
import { ActivityListPage } from '@/features/activity/ActivityListPage';
import { ActivityWizardPage } from '@/features/activity/ActivityWizardPage';
import { ActivityDetailPage } from '@/features/activity/ActivityDetailPage';
import { ActivityPrintPage } from '@/features/activity/ActivityPrintPage';
import { ThoughtRecordListPage } from '@/features/thought-record/ThoughtRecordListPage';
import { ThoughtRecordWizardPage } from '@/features/thought-record/ThoughtRecordWizardPage';
import { ThoughtRecordDetailPage } from '@/features/thought-record/ThoughtRecordDetailPage';
import { ThoughtRecordPrintPage } from '@/features/thought-record/ThoughtRecordPrintPage';
import { DailyMoodListPage } from '@/features/daily-mood/DailyMoodListPage';
import { DailyMoodFormPage } from '@/features/daily-mood/DailyMoodFormPage';
import { DailyMoodDetailPage } from '@/features/daily-mood/DailyMoodDetailPage';
import { DailyMoodPrintPage } from '@/features/daily-mood/DailyMoodPrintPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { WorksheetReviewPage } from '@/features/settings/WorksheetReviewPage';
import { ExportPage } from '@/features/settings/ExportPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            {/* Print routes render outside the app shell (clean print output). */}
            <Route path="/app/activity/:weekId/print" element={<ActivityPrintPage />} />
            <Route path="/app/thought-records/:id/print" element={<ThoughtRecordPrintPage />} />
            <Route path="/app/daily-mood/:id/print" element={<DailyMoodPrintPage />} />

            <Route path="/app" element={<AppShell />}>
              <Route index element={<HomePage />} />

              <Route path="activity" element={<ActivityListPage />} />
              <Route path="activity/new" element={<ActivityWizardPage />} />
              <Route path="activity/:weekId" element={<ActivityDetailPage />} />
              <Route path="activity/:weekId/edit" element={<ActivityWizardPage />} />

              <Route path="thought-records" element={<ThoughtRecordListPage />} />
              <Route path="thought-records/new" element={<ThoughtRecordWizardPage />} />
              <Route path="thought-records/:id" element={<ThoughtRecordDetailPage />} />
              <Route path="thought-records/:id/edit" element={<ThoughtRecordWizardPage />} />

              <Route path="daily-mood" element={<DailyMoodListPage />} />
              <Route path="daily-mood/new" element={<DailyMoodFormPage />} />
              <Route path="daily-mood/:id" element={<DailyMoodDetailPage />} />
              <Route path="daily-mood/:id/edit" element={<DailyMoodFormPage />} />

              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/worksheet-review" element={<WorksheetReviewPage />} />
              <Route path="settings/export" element={<ExportPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
