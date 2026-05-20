import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env.local');
const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');

const handleParseEnv = (content) => {
  return Object.fromEntries(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        const key = line.slice(0, separatorIndex);
        const value = line.slice(separatorIndex + 1).replace(/^"|"$/g, '');
        return [key, value];
      }),
  );
};

if (!fs.existsSync(envPath)) {
  console.error('.env.local 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const env = handleParseEnv(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const password = env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl || !password) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_DB_PASSWORD가 없습니다.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const regions = [
  'ap-northeast-2',
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ap-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'sa-east-1',
  'ca-central-1',
];

const connectionCandidates = [
  {
    label: 'direct',
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    user: 'postgres',
  },
  ...regions.flatMap((region) => [
    {
      label: `session-pooler-${region}`,
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${projectRef}`,
    },
    {
      label: `transaction-pooler-${region}`,
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${projectRef}`,
    },
  ]),
];

const handleApplyWithCandidate = async (candidate) => {
  const client = new pg.Client({
    host: candidate.host,
    port: candidate.port,
    database: 'postgres',
    user: candidate.user,
    password,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query(schemaSql);
    console.log(`Supabase schema applied successfully via ${candidate.label}.`);
    return true;
  } finally {
    await client.end().catch(() => {});
  }
};

try {
  const errors = [];

  for (const candidate of connectionCandidates) {
    try {
      const applied = await handleApplyWithCandidate(candidate);

      if (applied) {
        process.exit(0);
      }
    } catch (error) {
      errors.push(`${candidate.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.error('Supabase schema apply failed for all connection candidates.');
  console.error(errors.join('\n'));
  console.error('\n--------------------------------------------------------------');
  console.error('네트워크에서 Supabase pooler/direct DB에 도달할 수 없습니다.');
  console.error('Supabase Dashboard → SQL Editor 에 supabase/schema.sql 전체를');
  console.error('붙여넣어 한 번 실행해주세요. 실행 후 앱이 자동으로 Supabase를 사용합니다.');
  console.error('--------------------------------------------------------------');
  process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
