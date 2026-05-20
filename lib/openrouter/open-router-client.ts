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

const DEFAULT_FREE_MODEL_CHAIN = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

const handleGetModelChain = (): string[] => {
  const fromEnv = process.env.OPENROUTER_MODEL;
  const fromFallback = process.env.OPENROUTER_FALLBACK_MODELS;

  const primary = fromEnv && fromEnv.trim().length > 0 && fromEnv !== 'openrouter/auto' ? [fromEnv.trim()] : [];
  const fallbacks = fromFallback
    ? fromFallback
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  const merged = [...primary, ...fallbacks, ...DEFAULT_FREE_MODEL_CHAIN];
  return Array.from(new Set(merged));
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
): Promise<{ ok: true; content: string } | { ok: false; status: number; message: string }> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer':
        process.env.OPENROUTER_APP_URL ??
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

  for (const model of modelChain) {
    const result = await handleCallOpenRouter(apiKey, model, systemPrompt, context);

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
};
