import cron from 'node-cron';
import { enqueueFeeds } from '../queues/producer.js';

export function registerCron() {
  const schedule = process.env.CRON_SCHEDULE || '0 * * * *';
  cron.schedule(schedule, async () => {
    await enqueueFeeds();
  });
}



