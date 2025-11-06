import { getImportQueue } from './index.js';

function getFeedUrls() {
  const envList = process.env.FEED_URLS;
  if (envList && envList.trim()) {
    return envList.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [
    'https://jobicy.com/?feed=job_feed',
    'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
    'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
    'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
    'https://jobicy.com/?feed=job_feed&job_categories=data-science',
    'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
    'https://jobicy.com/?feed=job_feed&job_categories=business',
    'https://jobicy.com/?feed=job_feed&job_categories=management',
    'https://www.higheredjobs.com/rss/articleFeed.cfm'
  ];
}

export async function enqueueFeeds(trigger = 'cron', listOverride) {
  const queue = getImportQueue();
  const feeds = Array.isArray(listOverride) && listOverride.length ? listOverride : getFeedUrls();
  
  // Retry with exponential backoff: 3 attempts, delays: 5s, 30s, 5min
  const retryConfig = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // Start with 5 seconds
    }
  };
  
  const jobs = feeds.map((url) => ({
    name: 'import-feed',
    data: { url, trigger },
    opts: retryConfig
  }));
  
  await queue.addBulk(jobs);
  return { enqueued: jobs.length };
}


