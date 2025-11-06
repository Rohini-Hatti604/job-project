import { Router } from 'express';
import { ImportLog } from '../models/ImportLog.js';
import { getSubscriber, IMPORT_LOG_CHANNEL } from '../lib/pubsub.js';

const router = Router();

router.get('/', async (req, res) => {
  const { page = 1, pageSize = 20, sortBy = 'timestamp', sortOrder = 'desc', sourceUrl, hasFailures, start, end } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);

  const filter = {};
  if (sourceUrl) filter.sourceUrl = { $regex: String(sourceUrl), $options: 'i' };
  if (hasFailures === 'true') filter.failedJobs = { $gt: 0 };
  if (start || end) {
    filter.timestamp = {};
    if (start) filter.timestamp.$gte = new Date(String(start));
    if (end) filter.timestamp.$lte = new Date(String(end));
  }

  const sort = { [String(sortBy)]: sortOrder === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    ImportLog.find(filter).sort(sort).skip(skip).limit(Number(pageSize)).lean(),
    ImportLog.countDocuments(filter)
  ]);
  res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const sub = getSubscriber();
  const handler = (channel, message) => {
    if (channel !== IMPORT_LOG_CHANNEL) return;
    res.write(`event: message\n`);
    res.write(`data: ${message}\n\n`);
  };

  await sub.subscribe(IMPORT_LOG_CHANNEL);
  sub.on('message', handler);

  req.on('close', async () => {
    sub.off('message', handler);
    try { await sub.unsubscribe(IMPORT_LOG_CHANNEL); } catch {}
    res.end();
  });
});

export default router;


