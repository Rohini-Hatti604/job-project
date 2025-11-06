import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  externalId: { type: String, index: true },
  sourceUrl: { type: String, index: true, required: true },
  title: { type: String, required: true },
  company: { type: String },
  location: { type: String },
  type: { type: String },
  description: { type: String },
  link: { type: String },
  publishedAt: { type: Date },
  raw: { type: Object }
}, { timestamps: true });

JobSchema.index({ sourceUrl: 1, externalId: 1 }, { unique: true, sparse: true });
JobSchema.index({ title: 'text', company: 'text', description: 'text' });

export const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);



