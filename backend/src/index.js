import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectMongo } from './lib/mongo.js';
import { registerQueues } from './queues/index.js';
import { registerCron } from './lib/cron.js';
import logsRouter from './routes/logs.js';
import importRouter from './routes/import.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/logs', logsRouter);
app.use('/api/import', importRouter);

const port = process.env.PORT || 4000;

async function start() {
  await connectMongo();
  await registerQueues();
  registerCron();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});



