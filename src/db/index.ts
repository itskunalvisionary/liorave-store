import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { getSqlConfig } from '../lib/env.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const sqlCfg = getSqlConfig();
    global._postgresPool = new Pool({
      host: sqlCfg.host,
      user: sqlCfg.user,
      password: sqlCfg.password,
      database: sqlCfg.database,
      port: sqlCfg.port,
      ...(sqlCfg.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
