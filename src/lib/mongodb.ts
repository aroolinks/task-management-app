import mongoose, { type Mongoose } from 'mongoose';

const isProd = process.env.NODE_ENV === 'production';
// In production, require MONGODB_URI to be set. In development, allow localhost fallback.
const MONGODB_URI = process.env.MONGODB_URI || (!isProd ? 'mongodb://localhost:27017/taskmanagement' : '');

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not set. In production, define it in your hosting environment.');
}

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

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000, // fail fast instead of hanging
      connectTimeoutMS: 8000,
    } as const;

    cached!.promise = mongoose.connect(MONGODB_URI, opts);
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
