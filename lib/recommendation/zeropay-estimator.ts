export type ZeropayConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

interface EstimateZeropayInput {
  name: string;
  category: string | null;
  address?: string | null;
}

interface EstimateZeropayResult {
  isZeropayLikely: boolean;
  zeropayConfidence: ZeropayConfidence;
  zeropayReason: string;
}

// 소상공인 친화 카테고리: 제로페이는 영세·소상공인 가맹이 주를 이루므로
// 이런 카테고리는 가맹점일 가능성이 높다고 추정한다.
const SMALL_BUSINESS_FRIENDLY = [
  '백반',
  '한식',
  '국밥',
  '찌개',
  '분식',
  '김밥',
  '덮밥',
  '국수',
  '쌀국수',
  '라멘',
  '우동',
  '돈까스',
  '도시락',
  '비빔밥',
  '카레',
  '떡볶이',
  '냉면',
  '족발',
  '보쌈',
];

// 프랜차이즈/대기업 외식 브랜드 — 가맹점 운영이라도 본사 결제망 이용이 일반적이라 제로페이 미가맹이 많음
const FRANCHISE_KEYWORDS = [
  '스타벅스',
  '맥도날드',
  '버거킹',
  '롯데리아',
  'KFC',
  '맘스터치',
  '서브웨이',
  '도미노',
  '피자헛',
  '미스터피자',
  '파파존스',
  '뚜레쥬르',
  '파리바게뜨',
  '빕스',
  'VIPS',
  '아웃백',
  '애슐리',
  '본죽',
  '본도시락',
  '교촌',
  'BHC',
  '굽네',
  '네네치킨',
  '엽기떡볶이',
  '투썸플레이스',
  '이디야',
  '메가커피',
  '컴포즈커피',
  '백다방',
  '공차',
  '설빙',
  '배스킨라빈스',
  '오마카세',
  '파인다이닝',
];

const handleIncludesAnyKeyword = (value: string, keywords: string[]) => {
  return keywords.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase()));
};

export const handleEstimateZeropay = (input: EstimateZeropayInput): EstimateZeropayResult => {
  const target = `${input.name} ${input.category ?? ''}`;
  const isFranchise = handleIncludesAnyKeyword(target, FRANCHISE_KEYWORDS);
  const isFriendly = handleIncludesAnyKeyword(target, SMALL_BUSINESS_FRIENDLY);

  if (isFranchise) {
    return {
      isZeropayLikely: false,
      zeropayConfidence: 'LOW',
      zeropayReason: '프랜차이즈/대형 브랜드는 제로페이 미가맹 비중이 높습니다.',
    };
  }

  if (isFriendly) {
    return {
      isZeropayLikely: true,
      zeropayConfidence: 'MEDIUM',
      zeropayReason: '소상공인 친화 카테고리라 제로페이 가맹 가능성이 높습니다.',
    };
  }

  return {
    isZeropayLikely: false,
    zeropayConfidence: 'UNKNOWN',
    zeropayReason: '제로페이 가맹 여부를 카테고리로 추정하기 어렵습니다.',
  };
};
