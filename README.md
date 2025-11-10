## Scalable Job Importer with Queue Processing & History Tracking

Tech stack:
- Backend: Node.js (Express), BullMQ, node-cron
- DB: MongoDB (Mongoose)
- Queue store: Redis
- Frontend: Next.js (App Router)

### Features
- Fetch and normalize XML job feeds (RSS/Atom) to JSON from 9+ job feed APIs
- Queue-based processing with BullMQ workers and configurable concurrency
- Retry logic with exponential backoff (3 attempts: 5s, 30s, 5min delays)
- Batch processing with configurable batch size (BATCH_SIZE env var)
- Import dedupe/update by `(sourceUrl, externalId|link)`
- Import logs in `import_logs` with counts and capped failure reasons
- Hourly cron to enqueue all feeds (configurable schedule)
- Admin UI with real-time updates (SSE), filtering, sorting, pagination
- View failure details with expandable rows

### Project Structure
```
backend/
  src/
    index.js            # Express API + cron
    worker.js           # BullMQ worker
    lib/cron.js         # Cron registration
    lib/mongo.js        # Mongo connection
    models/Job.js
    models/ImportLog.js
    services/fetchFeeds.js
    queues/index.js     # Queue init
    queues/producer.js  # Enqueue jobs
    routes/import.js    # POST /api/import/trigger
    routes/logs.js      # GET /api/logs
frontend/
  src/app/page.tsx      # Import History UI
```

### Environment
Create `.env` files for backend and frontend:

Backend `.env`:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/job_importer
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
QUEUE_NAME=job-import-queue
CRON_SCHEDULE=0 * * * *
MAX_CONCURRENCY=5
BATCH_SIZE=50
FEED_URLS=https://jobicy.com/?feed=job_feed,https://jobicy.com/?feed=job_feed&job_categories=data-science,https://www.higheredjobs.com/rss/articleFeed.cfm
```

Frontend `.env.local`:
```
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### Run Locally
Prereqs: Node 18+, MongoDB, Redis

1) Install deps
```
cd backend && npm i
cd ../frontend && npm i
```

2) Start services
```
# Terminal A - API
cd backend && npm run dev

# Terminal B - Worker
cd backend && npm run worker

# Terminal C - Frontend
cd frontend && npm run dev
```

3) Visit UI: http://localhost:3000

Use "Trigger Import Now" to enqueue all feeds, and see rows appear in the table after the worker processes them.

### Run with Docker Compose
```
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Mongo: mongodb://localhost:27017 (db: job_importer)
- Redis: localhost:6379

Compose services: `mongo`, `redis`, `backend` (API), `worker`, `frontend`.

### Notes & Decisions
- XML parsing via `fast-xml-parser` to support multiple RSS/Atom shapes.
- Upsert strategy: query by `(sourceUrl + externalId)` (fallback to `link`), create if missing; otherwise update fields.
- Import logs capture counts and up to 100 failure reasons to avoid oversized documents.
- Cron adds jobs; worker concurrency via `MAX_CONCURRENCY`.
- **Retry Logic**: Jobs automatically retry 3 times with exponential backoff (5s → 30s → 5min) on transient failures.
- **Batch Processing**: Items processed in parallel batches (configurable via `BATCH_SIZE`, default 50) for better throughput.
- **Real-time Updates**: SSE endpoint (`/api/logs/stream`) broadcasts new import logs as they complete.

### Extensions (Bonus - All Implemented )
-  Real-time updates via Server-Sent Events (SSE)
-  Retry logic with exponential backoff
-  Environment-configurable batch size and max concurrency
-  Docker Compose for Node, MongoDB, and Redis
-  Deployment documentation for Render/Vercel with MongoDB Atlas + Redis Cloud

## Production Deployment

### Backend (Render)
1) Create a new Web Service from `backend/` with Dockerfile.
2) Environment variables:
   - `PORT=4000`
   - `MONGODB_URI` from MongoDB Atlas connection string
   - `REDIS_HOST`, `REDIS_PORT` from Redis Cloud (or `REDIS_URL` if using a TLS proxy; switch to `ioredis` URL form if needed)
   - `QUEUE_NAME`, `CRON_SCHEDULE`, `MAX_CONCURRENCY`, `FEED_URLS`
3) Create a background worker from `backend/` using `backend/Dockerfile.worker` to run the BullMQ worker.

### Database (MongoDB Atlas)
1) Create a free/shared cluster.
2) Add IP allowlist (Render egress) and create a user.
3) Get the SRV connection string and set it as `MONGODB_URI`.

### Redis (Redis Cloud)
1) Create a free subscription.
2) Get host/port/password; set env in Render.

### Frontend (Vercel)
1) Import the `frontend/` project.
2) Set environment variables:
   - `BACKEND_ORIGIN` to Render backend URL (e.g. `https://your-api.onrender.com`)
3) The Next.js rewrite proxies `/api/*` to the backend origin.

### Environment Summary
- Backend: `MONGODB_URI`, `REDIS_HOST`/`REDIS_PORT`, `PORT`, `QUEUE_NAME`, `CRON_SCHEDULE`, `MAX_CONCURRENCY`, `FEED_URLS`
- Worker: same as backend minus `PORT`
- Frontend: `BACKEND_ORIGIN` (or use `NEXT_PUBLIC_API_BASE` directly)



#
