import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const file = process.argv[2];
const shouldOpenSqlEditor = process.argv.includes('--open-sql-editor');

if (!file) {
  console.error('사용법: node scripts/copy-to-clipboard.mjs <파일경로> [--open-sql-editor]');
  process.exit(1);
}

// .env.local 에서 Supabase URL을 읽어 dashboard URL을 동적으로 생성
const handleGetSupabaseSqlEditorUrl = () => {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return null;

  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*"?(https:\/\/[^.]+)\.supabase\.co"?/);
  if (!match) return null;

  const projectRef = match[1].replace(/^https:\/\//, '');
  return `https://supabase.com/dashboard/project/${projectRef}/sql`;
};

if (!fs.existsSync(file)) {
  console.error(`파일을 찾을 수 없습니다: ${file}`);
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');
const platform = process.platform;

const handleCopy = () => {
  if (platform === 'darwin') {
    return spawnSync('pbcopy', { input: content });
  }
  if (platform === 'linux') {
    // 우선 xclip → 없으면 xsel
    const xclip = spawnSync('xclip', ['-selection', 'clipboard'], { input: content });
    if (xclip.status === 0) return xclip;
    return spawnSync('xsel', ['--clipboard', '--input'], { input: content });
  }
  if (platform === 'win32') {
    return spawnSync('clip', { input: content, shell: true });
  }
  return { status: 1, stderr: Buffer.from(`unsupported platform ${platform}`) };
};

const result = handleCopy();

if (result.status === 0) {
  console.log(`✅ ${file}을(를) 클립보드에 복사했습니다 (${content.length} bytes)`);
  console.log('   Supabase SQL Editor에서 ⌘V → Run');

  if (shouldOpenSqlEditor) {
    const url = handleGetSupabaseSqlEditorUrl();
    if (url) {
      const opener = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
      spawnSync(opener, [url], { stdio: 'inherit', shell: platform === 'win32' });
      console.log(`   브라우저에서 ${url} 열림`);
    } else {
      console.log('   (.env.local 에 NEXT_PUBLIC_SUPABASE_URL 이 없어 SQL Editor 자동 오픈 생략)');
    }
  }
} else {
  console.error('❌ 클립보드 복사 실패:', result.stderr?.toString() || 'unknown error');
  console.error();
  console.error('=== 직접 복사하실 SQL 내용 ===');
  console.error(content);
  process.exit(1);
}
