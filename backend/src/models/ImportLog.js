import mongoose from 'mongoose';

const FailedJobSchema = new mongoose.Schema({
  externalId: String,
  link: String,
  reason: String
}, { _id: false });

const ImportLogSchema = new mongoose.Schema({
  sourceUrl: { type: String, index: true, required: true },
  timestamp: { type: Date, default: () => new Date(), index: true },
  totalFetched: { type: Number, default: 0 },
  totalImported: { type: Number, default: 0 },
  newJobs: { type: Number, default: 0 },
  updatedJobs: { type: Number, default: 0 },
  failedJobs: { type: Number, default: 0 },
  failures: { type: [FailedJobSchema], default: [] }
}, { timestamps: true, collection: 'import_logs' });

export const ImportLog = mongoose.models.ImportLog || mongoose.model('ImportLog', ImportLogSchema);



