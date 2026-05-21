import type { RestaurantCandidate } from '@/features/lunch/types/lunch.types';

interface AiRecommendation {
  restaurantId: string;
  rank: number;
  summary: string;
  reason: string;
  caution: string;
}

interface AiResult {
  recommendations: AiRecommendation[];
  fallbackUsed: boolean;
  errorMessage: string | null;
  modelUsed: string | null;
}

// Vercel maxDuration 60초 안에서 안전. 너무 많은 모델을 chain하면 worst case에 timeout 발생.
const DEFAULT_FREE_MODEL_CHAIN = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'openai/gpt-oss-20b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

const DEFAULT_PER_MODEL_TIMEOUT_MS = 12_000;
const DEFAULT_OVERALL_TIMEOUT_MS = 25_000;

const handleReadPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const handleSplitModelList = (value: string | undefined) => {
  return value
    ? value
        .split(',')
        .map((model) => model.trim())
        .filter(Boolean)
    : [];
};

const handleGetModelChain = (): string[] => {
  const fromFreeModels = handleSplitModelList(process.env.OPENROUTER_FREE_MODELS);
  const fromModelChain = handleSplitModelList(process.env.OPENROUTER_MODEL_CHAIN);
  const fromEnv = process.env.OPENROUTER_MODEL;
  const fromFallback = handleSplitModelList(process.env.OPENROUTER_FALLBACK_MODELS);

  const primary = fromEnv && fromEnv.trim().length > 0 && fromEnv !== 'openrouter/auto' ? [fromEnv.trim()] : [];
  const allowPaidModels = process.env.OPENROUTER_ALLOW_PAID_MODELS === 'true';
  const merged = [...fromFreeModels, ...fromModelChain, ...primary, ...fromFallback, ...DEFAULT_FREE_MODEL_CHAIN];
  const uniqueModels = Array.from(new Set(merged));

  if (allowPaidModels) {
    return uniqueModels;
  }

  return uniqueModels.filter((model) => model.endsWith(':free'));
};

const handleStripCodeFence = (text: string): string => {
  const fenceMatch = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  return (fenceMatch ? fenceMatch[1] : text).trim();
};

const handleExtractJsonPayload = (raw: string): string => {
  const stripped = handleStripCodeFence(raw);

  if (stripped.startsWith('[') || stripped.startsWith('{')) {
    return stripped;
  }

  const arrayStart = stripped.indexOf('[');
  const arrayEnd = stripped.lastIndexOf(']');

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return stripped.slice(arrayStart, arrayEnd + 1);
  }

  const objectStart = stripped.indexOf('{');
  const objectEnd = stripped.lastIndexOf('}');

  if (objectStart !== -1 && objectEnd > objectStart) {
    return stripped.slice(objectStart, objectEnd + 1);
  }

  return stripped;
};

const handleParseRecommendations = (raw: string): AiRecommendation[] => {
  const payload = handleExtractJsonPayload(raw);

  if (!payload) {
    return [];
  }

  const parsed = JSON.parse(payload) as
    | AiRecommendation[]
    | { recommendations?: AiRecommendation[] }
    | Record<string, AiRecommendation[]>;

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray((parsed as { recommendations?: AiRecommendation[] }).recommendations)) {
    return (parsed as { recommendations: AiRecommendation[] }).recommendations;
  }

  const firstArray = Object.values(parsed).find((value) => Array.isArray(value));
  return Array.isArray(firstArray) ? (firstArray as AiRecommendation[]) : [];
};

const handleCallOpenRouter = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<{ ok: true; content: string } | { ok: false; status: number; message: string }> => {
  // 모델별 timeout + 외부 signal(전체 chain timeout)을 결합한다.
  const perModelController = new AbortController();
  const perModelTimeoutMs = handleReadPositiveInt(process.env.OPENROUTER_PER_MODEL_TIMEOUT_MS, DEFAULT_PER_MODEL_TIMEOUT_MS);
  const timeoutId = setTimeout(() => perModelController.abort(new Error('per-model timeout')), perModelTimeoutMs);
  signal.addEventListener('abort', () => perModelController.abort(signal.reason), { once: true });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: perModelController.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // 우선순위: OPENROUTER_APP_URL → VERCEL_URL (Vercel 자동주입) → 로컬 placeholder
        // 빈 string("")도 fallback 되도록 ?? 대신 || 사용
        'HTTP-Referer':
          (process.env.OPENROUTER_APP_URL || '').trim() ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ai-lunch-picker.local'),
        'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'AI Lunch Picker',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { ok: false, status: response.status, message: `${response.status} ${errorText.slice(0, 200)}` };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string; code?: number };
    };

    if (data.error) {
      return { ok: false, status: data.error.code ?? 500, message: data.error.message ?? 'OpenRouter error' };
    }

    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

    if (!content) {
      return { ok: false, status: 502, message: 'empty response content' };
    }

    return { ok: true, content };
  } catch (error) {
    return {
      ok: false,
      status: 504,
      message: error instanceof Error ? error.message : 'OpenRouter network error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const handleGenerateAiRecommendations = async (
  candidates: RestaurantCandidate[],
  context: string,
): Promise<AiResult> => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      recommendations: [],
      fallbackUsed: true,
      errorMessage: 'OpenRouter API 키가 없어 룰 기반 추천 이유를 사용했습니다.',
      modelUsed: null,
    };
  }

  const systemPrompt =
    '너는 회사 점심 추천 도우미다. 후보 목록 안에서만 추천하고, JSON 배열만 반환한다. 후보 밖 식당을 만들지 않는다. 마크다운 코드 블록 없이 순수 JSON만 출력한다.';
  const allowedIds = new Set(candidates.map((candidate) => candidate.id));
  const modelChain = handleGetModelChain();
  const errors: string[] = [];

  // 전체 chain hard timeout — Vercel maxDuration 60s 안에 무조건 끝나도록
  const overallController = new AbortController();
  const overallTimeoutMs = handleReadPositiveInt(process.env.OPENROUTER_OVERALL_TIMEOUT_MS, DEFAULT_OVERALL_TIMEOUT_MS);
  const overallTimeout = setTimeout(() => overallController.abort(new Error('overall timeout')), overallTimeoutMs);

  try {
  for (const model of modelChain) {
    if (overallController.signal.aborted) {
      errors.push(`${model}: chain timeout 초과로 시도 중단`);
      break;
    }

    const result = await handleCallOpenRouter(apiKey, model, systemPrompt, context, overallController.signal);

    if (!result.ok) {
      errors.push(`${model}: ${result.message}`);
      continue;
    }

    try {
      const parsed = handleParseRecommendations(result.content);
      const validRecommendations = parsed.filter((recommendation) => allowedIds.has(recommendation.restaurantId));

      if (validRecommendations.length === 0) {
        errors.push(`${model}: 응답에 유효한 후보 ID가 없습니다.`);
        continue;
      }

      return {
        recommendations: validRecommendations,
        fallbackUsed: false,
        errorMessage: null,
        modelUsed: model,
      };
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : 'JSON 파싱 실패'}`);
      continue;
    }
  }

  return {
    recommendations: [],
    fallbackUsed: true,
    errorMessage: `OpenRouter 무료 모델 호출에 모두 실패해 룰 기반 추천을 사용했습니다. (${errors.slice(0, 3).join(' / ')})`,
    modelUsed: null,
  };
  } finally {
    clearTimeout(overallTimeout);
  }
};
