const NON_RESTAURANT_CATEGORY_KEYWORDS = [
  '쇼핑',
  '유통',
  '화장품',
  '향수',
  '미용',
  '뷰티',
  '패션',
  '의류',
  '잡화',
  '생활용품',
  '가전',
  '가구',
  '병원',
  '의원',
  '약국',
  '교육',
  '학원',
  '부동산',
  '금융',
  '은행',
  '숙박',
  '호텔',
  '모텔',
  '관광',
  '스포츠',
  '오락',
  '문화',
];

const RESTAURANT_CATEGORY_KEYWORDS = [
  '음식점',
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '카페',
  '디저트',
  '베이커리',
  '술집',
  '뷔페',
  '도시락',
  '샐러드',
  '돈가스',
  '돈까스',
  '라멘',
  '우동',
  '쌀국수',
  '베트남음식',
  '아시아음식',
  '패스트푸드',
  '치킨',
  '피자',
];

const FOOD_NAME_KEYWORDS = [
  '식당',
  '밥',
  '국밥',
  '백반',
  '찌개',
  '김밥',
  '분식',
  '돈까스',
  '돈가스',
  '라멘',
  '우동',
  '카레',
  '덮밥',
  '쌀국수',
  '샐러드',
  '포케',
  '도시락',
  '뷔페',
  '파스타',
  '피자',
  '치킨',
  '카페',
  '커피',
  '베이커리',
];

const handleIncludesAny = (target: string, keywords: string[]) => {
  return keywords.some((keyword) => target.includes(keyword));
};

export const handleIsLunchCandidateCategory = (input: { name: string; category: string | null }) => {
  const name = input.name.trim();
  const category = input.category?.trim() ?? '';

  if (handleIncludesAny(category, NON_RESTAURANT_CATEGORY_KEYWORDS)) {
    return false;
  }

  if (handleIncludesAny(category, RESTAURANT_CATEGORY_KEYWORDS)) {
    return true;
  }

  return handleIncludesAny(name, FOOD_NAME_KEYWORDS);
};
