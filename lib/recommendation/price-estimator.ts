import type { PriceConfidence } from '@/features/lunch/types/lunch.types';

// 14k 초과 가능성 높은 카테고리/키워드
export const EXPENSIVE_KEYWORDS = [
  '오마카세',
  '스테이크',
  '파인다이닝',
  '코스요리',
  '와인바',
  '고급',
  // 점심에도 14k 넘기 쉬운 류
  '한우',
  '소고기',
  '갈비',
  '횟집',
  '생선회',
  '활어',
  '초밥뷔페',
];

// 점심 영업/메뉴가 낮은(=저녁 위주) 식당 키워드 — 점심에 와도 단품·뷔페가 14k 이하인 경우 있지만
// 평균적으로 lunch-friendly가 아님. score 감점에 사용.
export const DINNER_LEANING_KEYWORDS = [
  '치킨',
  '호프',
  '맥주',
  '술집',
  '포차',
  '이자카야',
  '와인',
  '바(BAR)',
  '주점',
  '실내포차',
  '곱창',
  '막창',
  '족발',
  '보쌈',
  '삼겹살',
  '돼지갈비',
  '한우',
  '소갈비',
];

export const LUNCH_FRIENDLY_KEYWORDS = [
  '한식',
  '백반',
  '국밥',
  '찌개',
  '돈까스',
  '덮밥',
  '분식',
  '중식',
  '쌀국수',
  '샐러드',
  '김밥',
  '라멘',
  '우동',
  '카레',
  '비빔밥',
  '도시락',
  '컵밥',
  '샌드위치',
  '포케',
  '점심특선',
  '런치',
  '뷔페',
];

interface EstimatePriceInput {
  name: string;
  category: string | null;
  maxPrice: number;
  priceMin?: number | null;
  priceMax?: number | null;
}

interface EstimatePriceResult {
  priceConfidence: PriceConfidence;
  isLikelyUnderBudget: boolean;
  priceReason: string;
}

const handleIncludesAnyKeyword = (value: string, keywords: string[]) => {
  return keywords.some((keyword) => value.includes(keyword));
};

export const handleEstimatePrice = (input: EstimatePriceInput): EstimatePriceResult => {
  const target = `${input.name} ${input.category ?? ''}`;

  if (input.priceMax && input.priceMax <= input.maxPrice) {
    return {
      priceConfidence: 'HIGH',
      isLikelyUnderBudget: true,
      priceReason: `확인된 최대 가격이 ${input.maxPrice.toLocaleString('ko-KR')}원 이하입니다.`,
    };
  }

  if (input.priceMin && input.priceMin > input.maxPrice) {
    return {
      priceConfidence: 'HIGH',
      isLikelyUnderBudget: false,
      priceReason: `확인된 최소 가격이 ${input.maxPrice.toLocaleString('ko-KR')}원을 초과합니다.`,
    };
  }

  if (handleIncludesAnyKeyword(target, EXPENSIVE_KEYWORDS)) {
    return {
      priceConfidence: 'LOW',
      isLikelyUnderBudget: false,
      priceReason: '고가 가능성이 높은 키워드가 포함되어 가격 확인이 필요합니다.',
    };
  }

  if (handleIncludesAnyKeyword(target, LUNCH_FRIENDLY_KEYWORDS)) {
    return {
      priceConfidence: 'MEDIUM',
      isLikelyUnderBudget: true,
      priceReason: '점심 식사에 적합한 카테고리라 예산 이하 가능성이 높습니다.',
    };
  }

  return {
    priceConfidence: 'UNKNOWN',
    isLikelyUnderBudget: false,
    priceReason: '가격 정보가 부족해 가격 확인이 필요합니다.',
  };
};
