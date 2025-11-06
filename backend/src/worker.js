import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { getRedisConnection } from './queues/index.js';
import { connectMongo } from './lib/mongo.js';
import { processImportFeed } from './workers/processImportFeed.js';

dotenv.config();

async function startWorker() {
  await connectMongo();
  const queueName = process.env.QUEUE_NAME || 'job-import-queue';
  const concurrency = Number(process.env.MAX_CONCURRENCY || 5);
  const worker = new Worker(queueName, async (job) => {
    if (job.name === 'import-feed') {
      return processImportFeed(job.data.url, job.data.trigger);
    }
  }, {
    connection: getRedisConnection(),
    concurrency
  });

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error('Job failed', job?.name, job?.id, err?.message);
  });
}

startWorker().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Worker failed to start', err);
  process.exit(1);
});



