import { Router } from 'express';
import { enqueueFeeds } from '../queues/producer.js';

const router = Router();

router.post('/trigger', async (req, res) => {
  const { url } = req.body || {};
  const result = await enqueueFeeds('api', url ? [url] : undefined);
  res.json({ status: 'enqueued', ...result });
});

export default router;


