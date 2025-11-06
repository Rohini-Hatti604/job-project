import Redis from 'ioredis';

let publisher;
let subscriber;

export function getRedisOptions() {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379)
  };
}

export function getPublisher() {
  if (!publisher) publisher = new Redis(getRedisOptions());
  return publisher;
}

export function getSubscriber() {
  if (!subscriber) subscriber = new Redis(getRedisOptions());
  return subscriber;
}

export const IMPORT_LOG_CHANNEL = 'import-log';



