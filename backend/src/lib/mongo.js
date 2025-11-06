import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/job_importer';
  if (mongoose.connection.readyState === 1) return;

  const maxAttempts = 10;
  const delayMs = 2000;
  let attempt = 0;
  // simple retry to allow containers to come up
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      return;
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}


