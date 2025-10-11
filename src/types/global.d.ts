declare global {
  // Cache container on the global object for Mongoose connections
  // Use explicit import('mongoose').Mongoose types to avoid name collisions
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: import('mongoose').Mongoose | null;
    promise: Promise<import('mongoose').Mongoose> | null;
  } | undefined;
}

export {};
