import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env.local');

const handleParseEnv = (content) => {
  return content.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return { raw: line, key: null, value: null };
    }
    const i = line.indexOf('=');
    return {
      raw: line,
      key: line.slice(0, i),
      value: line.slice(i + 1),
    };
  });
};

const handleUpdateEnv = (lines, updates) => {
  const used = new Set();
  const result = lines.map((entry) => {
    if (entry.key && updates[entry.key] !== undefined) {
      used.add(entry.key);
      return `${entry.key}=${updates[entry.key]}`;
    }
    return entry.raw;
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (!used.has(key)) {
      result.push(`${key}=${value}`);
    }
  });
  return result.join('\n');
};

const handleFetchPlaceCoordinate = async (placeId) => {
  const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`m.place.naver.com 응답 실패 ${response.status}`);
  }

  const html = await response.text();
  const idIndex = html.indexOf(`"id":"${placeId}"`);

  if (idIndex === -1) {
    throw new Error(`placeId ${placeId}을(를) HTML에서 찾지 못했습니다.`);
  }

  const window = html.slice(idIndex, idIndex + 4000);
  const xMatch = window.match(/"x":\s*"?([0-9.-]+)"?/);
  const yMatch = window.match(/"y":\s*"?([0-9.-]+)"?/);
  const nameMatch = window.match(/"name":"([^"]+)"/);

  if (!xMatch || !yMatch) {
    throw new Error(`placeId ${placeId} 주변에서 좌표를 찾지 못했습니다.`);
  }

  return {
    latitude: Number(yMatch[1]),
    longitude: Number(xMatch[1]),
    name: nameMatch ? nameMatch[1] : null,
  };
};

const envLines = handleParseEnv(fs.readFileSync(envPath, 'utf8'));
const envMap = Object.fromEntries(envLines.filter((line) => line.key).map((line) => [line.key, line.value]));

const placeId = process.argv[2] ?? envMap.BASE_PLACE_ID;

if (!placeId) {
  console.error('placeId 가 없습니다. 인자로 전달하거나 BASE_PLACE_ID 환경변수를 설정하세요.');
  process.exit(1);
}

console.log(`placeId ${placeId} 좌표를 m.place.naver.com 에서 조회합니다...`);

try {
  const result = await handleFetchPlaceCoordinate(placeId);
  console.log(`📍 ${result.name ?? '(이름 없음)'}`);
  console.log(`   위도: ${result.latitude}`);
  console.log(`   경도: ${result.longitude}`);

  const updates = {
    BASE_PLACE_ID: placeId,
    BASE_LATITUDE: result.latitude,
    BASE_LONGITUDE: result.longitude,
  };

  if (result.name) {
    updates.BASE_PLACE_NAME = result.name;
  }

  const updated = handleUpdateEnv(envLines, updates);
  fs.writeFileSync(envPath, updated, 'utf8');

  console.log('\n✅ .env.local 업데이트 완료. dev 서버를 재시작하면 새 기준 좌표가 적용됩니다.');
} catch (error) {
  console.error(`❌ 실패: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
