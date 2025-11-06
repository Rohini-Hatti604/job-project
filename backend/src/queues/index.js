import { Queue } from 'bullmq';

let importQueue;

export function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379)
  };
}

export async function registerQueues() {
  const queueName = process.env.QUEUE_NAME || 'job-import-queue';
  importQueue = new Queue(queueName, {
    connection: getRedisConnection()
  });
}

export function getImportQueue() {
  if (!importQueue) throw new Error('Queue not initialized');
  return importQueue;
}



