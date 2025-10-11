import mongoose, { type Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/taskmanagement';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
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
