import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env.local');

const handleParseEnv = (content) => {
  return Object.fromEntries(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')];
      }),
  );
};

if (!fs.existsSync(envPath)) {
  console.error('.env.local 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const env = handleParseEnv(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 또는 publishable key가 없습니다.');
  process.exit(1);
}

const tables = [
  'users',
  'lunch_sessions',
  'restaurant_candidates',
  'votes',
  'visit_histories',
  'rejected_restaurants',
  'recommendation_logs',
];

const handleCheckTable = async (table) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (response.status === 200) {
    return { table, ok: true, message: 'OK' };
  }

  const body = await response.text().catch(() => '');
  return { table, ok: false, message: `${response.status} ${body.slice(0, 80)}` };
};

const handleCheckInsert = async () => {
  const testName = `__probe_${Date.now()}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ name: testName }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return { ok: false, message: `${response.status} ${body.slice(0, 120)}` };
  }

  const data = await response.json().catch(() => null);
  const insertedId = Array.isArray(data) ? data[0]?.id : data?.id;

  // 정리: probe로 만든 row 삭제
  if (insertedId) {
    await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${insertedId}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch(() => undefined);
  }

  return { ok: true, message: 'OK' };
};

console.log(`Supabase: ${supabaseUrl}`);
console.log('테이블 확인 중...\n');

let allOk = true;

for (const table of tables) {
  const result = await handleCheckTable(table);
  console.log(result.ok ? `✅ ${result.table}` : `❌ ${result.table} — ${result.message}`);
  if (!result.ok) {
    allOk = false;
  }
}

console.log();
console.log('INSERT 권한 확인 중...');
const insertResult = await handleCheckInsert();
console.log(insertResult.ok ? '✅ anon INSERT OK (RLS policy 정상)' : `❌ INSERT 거부 — ${insertResult.message}`);

console.log();
if (allOk && insertResult.ok) {
  console.log('🎉 모든 테이블 + INSERT 권한이 준비되었습니다. 다중 브라우저 동기화 가능.');
  console.log('   앱은 다음 추천 호출부터 자동으로 Supabase 영속 모드로 동작합니다.');
} else {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

  if (!allOk) {
    console.log('⚠️  일부 테이블이 없습니다.');
    console.log('   Supabase SQL Editor 에서 supabase/schema.sql 전체를 붙여넣어 실행해주세요:');
  } else if (!insertResult.ok) {
    console.log('⚠️  테이블은 있지만 INSERT가 RLS로 막혀있습니다.');
    console.log('   Supabase SQL Editor 에서 supabase/rls-policies.sql 만 붙여넣어 실행해주세요:');
  }

  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql`);
  process.exitCode = 1;
}
