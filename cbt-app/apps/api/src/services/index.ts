import { storage } from '../storage/index.js';
import { ActivityService } from './activity-service.js';
import { ThoughtRecordService } from './thought-record-service.js';
import { DailyMoodService } from './daily-mood-service.js';
import { WorksheetService } from './worksheet-service.js';

/** Service singletons, wired to the configured storage adapter. */
export const services = {
  activity: new ActivityService(storage),
  thoughtRecord: new ThoughtRecordService(storage),
  dailyMood: new DailyMoodService(storage),
  worksheet: new WorksheetService(storage),
};
