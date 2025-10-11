/*
  One-off script to verify MongoDB Atlas connectivity and fetch sample data.
  Usage:
    1) Ensure .env.local has MONGODB_URI set to your Atlas URI
    2) Run:
       node scripts/check_mongo.js
*/

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function loadURIFromEnvFiles() {
  const candidates = ['.env.local', '.env'];
  for (const name of candidates) {
    const p = path.join(__dirname, '..', name);
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line.startsWith('#')) continue;
          const m = line.match(/^MONGODB_URI\s*=\s*(.*)$/);
          if (m) {
            let val = m[1].trim();
            // Drop inline comments or trailing semicolons
            val = val.replace(/[;#].*$/, '').trim();
            // Remove surrounding quotes if present, or stray leading/trailing quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
              val = val.slice(1, -1);
            } else {
              if (val.startsWith('"') || val.startsWith('\'')) val = val.slice(1);
              if (val.endsWith('"') || val.endsWith('\'')) val = val.slice(0, -1);
            }
            return val;
          }
        }
      } catch (_) {
        // ignore parse errors and try next file
      }
    }
  }
  return null;
}

async function main() {
  const uri = process.env.MONGODB_URI || loadURIFromEnvFiles();
  if (!uri) {
    console.error('MONGODB_URI is not set. Please set it in .env.local (or .env).');
    process.exit(1);
  }

  // Basic validation without revealing secrets
  const schemeValid = uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  const atCount = (uri.match(/@/g) || []).length;
  let usedUri = uri;

  if (!schemeValid) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'Invalid connection string scheme',
          diagnostics: {
            schemeValid,
            tips: [
              'Ensure it starts with mongodb+srv:// (Atlas) or mongodb://'
            ]
          }
        },
        null,
        2
      )
    );
    process.exit(2);
  }

  // If there are multiple '@' characters, attempt to sanitize by encoding '@' in credentials
  if (atCount > 1) {
    const schemeIdx = usedUri.indexOf('://') + 3;
    const lastAt = usedUri.lastIndexOf('@');
    if (lastAt > schemeIdx) {
      const before = usedUri.slice(0, schemeIdx);
      const creds = usedUri.slice(schemeIdx, lastAt);
      const after = usedUri.slice(lastAt); // includes '@' and host
      // Replace any raw '@' in credentials with %40 (do not double-encode since '@' would not appear in encoded form)
      const credsSanitized = creds.replace(/@/g, '%40');
      usedUri = before + credsSanitized + after;
    }
    const afterAtCount = (usedUri.match(/@/g) || []).length;
    if (afterAtCount !== 1) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: 'Invalid connection string format',
            diagnostics: {
              schemeValid,
              atCount,
              afterAtCount,
              tips: [
                'Ensure only one @ separates credentials from host',
                'URL-encode special characters in the password (e.g., @ -> %40)'
              ]
            }
          },
          null,
          2
        )
      );
      process.exit(2);
    }
  }

  const client = new MongoClient(usedUri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = client.db(); // uses the database provided in the URI path

    const collection = db.collection('tasks'); // Mongoose model "Task" maps to "tasks" collection

    const count = await collection.countDocuments();
    const sample = await collection.find({}).sort({ createdAt: -1 }).limit(5).toArray();

    const output = {
      ok: true,
      db: db.databaseName,
      collection: 'tasks',
      totalDocuments: count,
      sampleDocuments: sample,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(2);
  } finally {
    await client.close().catch(() => {});
  }
}

main();
