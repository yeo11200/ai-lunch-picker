import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

let schemaPromise: Promise<boolean> | null = null;

const handleGetProjectRef = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  return new URL(supabaseUrl).hostname.split('.')[0] ?? null;
};

const handleGetConnectionConfig = (): pg.ClientConfig | null => {
  const connectionString = process.env.SUPABASE_DB_CONNECTION_STRING;

  if (connectionString) {
    return {
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 3500,
    };
  }

  const projectRef = handleGetProjectRef();
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!projectRef || !password) {
    return null;
  }

  return {
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 3500,
  };
};

const handleApplySchema = async () => {
  const config = handleGetConnectionConfig();

  if (!config) {
    return;
  }

  const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf8');
  const client = new pg.Client(config);

  try {
    await client.connect();
    await client.query(schemaSql);
  } finally {
    await client.end().catch(() => {});
  }
};

export const handleEnsureSupabaseSchema = async () => {
  if (process.env.SUPABASE_AUTO_APPLY_SCHEMA === 'false') {
    return true;
  }

  // Vercel 같은 serverless 환경에서는 매 cold start마다 schema 적용 시도하면 낭비 + 실패 잦음.
  // DB password 자체가 없으면 시도 안 하고 통과시킨다. (사용자가 SQL Editor로 한 번만 적용)
  if (process.env.VERCEL || !process.env.SUPABASE_DB_PASSWORD) {
    return true;
  }

  schemaPromise ??= handleApplySchema().then(() => true).catch((error) => {
    console.warn(`[supabase] schema auto-apply skipped: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  });

  return schemaPromise;
};
