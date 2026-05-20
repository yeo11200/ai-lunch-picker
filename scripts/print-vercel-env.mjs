import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('.env.local 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

// Vercel에선 권장 안 되는 키 (로컬 전용)
const VERCEL_SKIP = new Set([
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_DB_CONNECTION_STRING',
  'SUPABASE_AUTO_APPLY_SCHEMA',
]);

// Vercel 전용 override 값
const VERCEL_OVERRIDE = {
  SUPABASE_AUTO_APPLY_SCHEMA: 'false',
};

console.log('=== Vercel 환경변수 (Dashboard → Settings → Environment Variables 에 그대로 등록) ===\n');

for (const line of lines) {
  const i = line.indexOf('=');
  if (i === -1) continue;
  const key = line.slice(0, i);
  const value = line.slice(i + 1).replace(/^"|"$/g, '');

  if (VERCEL_SKIP.has(key)) {
    console.log(`# (Vercel 불필요) ${key}`);
    continue;
  }

  console.log(`${key}=${value}`);
}

console.log();
for (const [key, value] of Object.entries(VERCEL_OVERRIDE)) {
  console.log(`# (Vercel 추가 권장)`);
  console.log(`${key}=${value}`);
}

console.log();
console.log('=== Vercel CLI 한 번에 등록 (선택) ===');
console.log('  vercel link              # 처음 한 번');
console.log('  cat .env.production | vercel env add production');
console.log();
console.log('또는 Dashboard에서 위 변수들을 복붙.');
