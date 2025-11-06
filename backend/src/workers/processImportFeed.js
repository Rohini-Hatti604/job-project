import { Job as JobModel } from '../models/Job.js';
import { ImportLog } from '../models/ImportLog.js';
import { fetchFeed } from '../services/fetchFeeds.js';
import { getPublisher, IMPORT_LOG_CHANNEL } from '../lib/pubsub.js';

export async function processImportFeed(url, trigger = 'manual') {
  const log = new ImportLog({ sourceUrl: url });
  try {
    const items = await fetchFeed(url);
    log.totalFetched = items.length;

    let newJobs = 0;
    let updatedJobs = 0;
    let failures = [];

    // Batch processing: process items in batches
    const batchSize = Number(process.env.BATCH_SIZE || 50);
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const query = { sourceUrl: item.sourceUrl };
            if (item.externalId) query.externalId = item.externalId;
            else query.link = item.link;

            const existing = await JobModel.findOne(query);
            if (!existing) {
              await JobModel.create(item);
              return { type: 'new' };
            } else {
              // Update basic fields if changed
              const update = { ...item };
              delete update.raw; // do not diff raw for performance; overwrite
              await JobModel.updateOne({ _id: existing._id }, { $set: update, raw: item.raw });
              return { type: 'updated' };
            }
          } catch (e) {
            throw { item, error: e };
          }
        })
      );

      // Aggregate batch results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.type === 'new') newJobs += 1;
          else if (result.value.type === 'updated') updatedJobs += 1;
        } else {
          // Handle both our custom error format and unexpected errors
          const reason = result.reason;
          if (reason && typeof reason === 'object' && reason.item && reason.error) {
            failures.push({ 
              externalId: reason.item.externalId, 
              link: reason.item.link, 
              reason: reason.error.message || String(reason.error)
            });
          } else {
            failures.push({ 
              externalId: undefined, 
              link: undefined, 
              reason: reason?.message || String(reason || 'Unknown error')
            });
          }
        }
      }
    }

    log.newJobs = newJobs;
    log.updatedJobs = updatedJobs;
    log.failedJobs = failures.length;
    log.totalImported = newJobs + updatedJobs;
    log.failures = failures.slice(0, 100); // cap to avoid huge docs
    await log.save();
    try {
      await getPublisher().publish(IMPORT_LOG_CHANNEL, JSON.stringify({ type: 'log', payload: log.toObject() }));
    } catch {}

    return { ok: true, newJobs, updatedJobs, failed: failures.length };
  } catch (err) {
    log.failedJobs = (log.failedJobs || 0) + 1;
    log.failures = [{ reason: err.message }];
    await log.save();
    try {
      await getPublisher().publish(IMPORT_LOG_CHANNEL, JSON.stringify({ type: 'log', payload: log.toObject() }));
    } catch {}
    throw err;
  }
}


