import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

const mergedEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) {
  if (typeof v === 'string' && v.trim() !== '') mergedEnv[k] = v;
}
for (const file of ['.env.example', '.env']) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const parsed = dotenv.parse(fs.readFileSync(fullPath));
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim() !== '') mergedEnv[k] = v.trim();
    }
  }
}

const sqlHost = mergedEnv.SQL_HOST;
const sqlDbName = mergedEnv.SQL_DB_NAME;
const user = mergedEnv.SQL_ADMIN_USER || mergedEnv.SQL_USER;
const password = mergedEnv.SQL_ADMIN_PASSWORD || mergedEnv.SQL_PASSWORD;
const portNum = Number(mergedEnv.SQL_PORT || 5432);
const sslEnabled = (mergedEnv.SQL_SSL || '').toLowerCase() === 'true';

if (!sqlHost) {
  throw new Error('SQL_HOST must be set in environment variables.');
}
if (!sqlDbName) {
  throw new Error('SQL_DB_NAME must be set in environment variables.');
}
if (!user) {
  throw new Error('SQL_ADMIN_USER must be set in environment variables.');
}
if (!password) {
  throw new Error('SQL_ADMIN_PASSWORD must be set in environment variables.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: {
    host: sqlHost,
    user,
    password,
    database: sqlDbName,
    port: Number.isFinite(portNum) && portNum > 0 ? portNum : 5432,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
});
