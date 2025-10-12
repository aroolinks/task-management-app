import mongoose, { type Mongoose } from 'mongoose';

// Define the cache shape and read/write it from globalThis in a typed way
type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & { mongoose?: MongooseCache };

let cached = globalWithMongoose.mongoose as MongooseCache | undefined;

if (!cached) {
  cached = { conn: null, promise: null };
  globalWithMongoose.mongoose = cached;
}

async function dbConnect(): Promise<Mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Only throw when a DB connection is actually requested (avoids failing at import-time during builds)
    throw new Error('MONGODB_URI is not set. Define it in your hosting environment.');
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000, // fail fast instead of hanging
      connectTimeoutMS: 8000,
    } as const;

    cached!.promise = mongoose.connect(uri, opts);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn!;
}

export default dbConnect;
