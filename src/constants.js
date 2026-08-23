export const placeOptions = [
  "평화의광장/곰상",
  "국제관",
  "글로컬산학협력관",
  "난파음악관",
  "노천마당",
  "대운동장",
  "무용관",
  "미디어센터",
  "미술관",
  "버스정류장",
  "범정관/대학본부",
  "법학관/대학원동",
  "베어토피아",
  "보정동 카페거리",
  "사범관",
  "사회과학관",
  "상경관",
  "석주선기념박물관",
  "소프트웨어ICT관",
  "웅비홀",
  "인문관",
  "제1공학관",
  "제2공학관",
  "제3공학관",
  "종합실험동",
  "죽전역",
  "집현재1",
  "집현재2",
  "체육관",
  "퇴계기념중앙도서관",
  "학교 앞 상권/거리",
  "학생식당",
  "혜당관",
  "잘 모르겠음",
  "기타/직접 입력",
];

export const jukjeonPlaceOptions = placeOptions;

// TODO: 나무위키 기반 초안 — 실제 서비스 반영 전 천안캠퍼스 재학생 검토 필요
export const cheonanPlaceOptions = [
  "인문과학관",
  "사회과학관",
  "자연과학1관",
  "자연과학2관",
  "공학관(융합기술대학관)",
  "보건과학관",
  "생명자원과학관",
  "간호대 별관",
  "예술관 A/B동",
  "예술관 C/D동",
  "학생회관(웅무관)",
  "산학협력관",
  "율곡기념도서관",
  "체육관",
  "치의학관",
  "약학관",
  "의학관",
  "대운동장",
  "베어토피아",
  "단대호수(안서호/천호지)",
  "기숙사",
  "학교 앞 상권/거리",
  "버스정류장",
  "잘 모르겠음",
  "기타/직접 입력",
];

export const getPlaceOptions = (campus) =>
  campus === "천안" ? cheonanPlaceOptions : jukjeonPlaceOptions;

export const campusOptions = ["죽전", "천안"];

export const timeOptions = [
  "00:00~02:00",
  "02:00~04:00",
  "04:00~06:00",
  "06:00~08:00",
  "08:00~10:00",
  "10:00~12:00",
  "12:00~14:00",
  "14:00~16:00",
  "16:00~18:00",
  "18:00~20:00",
  "20:00~22:00",
  "22:00~24:00",
  "잘 모르겠음",
];

export const genderOptions = ["여자", "남자"];

export const femaleHairStyleOptions = [
  "장발",
  "중단발",
  "단발",
  "묶음머리",
  "잘 모르겠음",
];

export const hairColorOptions = [
  "검정색",
  "갈색",
  "탈색",
  "기타",
  "잘 모르겠음",
];

export const hatOptions = ["모자 있음", "모자 없음", "잘 모르겠음"];

export const glassesOptions = ["안경 착용", "안경 없음", "잘 모르겠음"];

export const bangsOptions = ["앞머리 있음", "앞머리 없음", "잘 모르겠음"];

export const topTypeOptions = [
  "긴소매 티셔츠",
  "맨투맨/스웨트",
  "셔츠/블라우스",
  "후드 티셔츠",
  "반소매 티셔츠",
  "피케/카라 티셔츠",
  "니트/스웨터",
  "민소매 티셔츠",
  "기타 상의",
  "잘 모르겠음",
];

export const femaleTopTypeOptions = [
  "긴소매 티셔츠",
  "맨투맨/스웨트",
  "셔츠/블라우스",
  "후드 티셔츠",
  "반소매 티셔츠",
  "피케/카라 티셔츠",
  "니트/스웨터",
  "민소매 티셔츠",
  "원피스",
  "기타 상의",
  "잘 모르겠음",
];

export const outerTypeOptions = [
  "후드 집업",
  "블루종/MA-1",
  "레더/라이더스 재킷",
  "슈트/블레이저 재킷",
  "카디건",
  "경량 패딩/패딩 베스트",
  "사파리/헌팅 재킷",
  "트러커 재킷",
  "스타디움 재킷",
  "나일론/코치 재킷",
  "트레이닝 재킷",
  "아노락 재킷",
  "플리스/뽀글이",
  "환절기 코트",
  "베스트",
  "무스탕/퍼",
  "코트",
  "숏패딩",
  "롱패딩",
  "기타 아우터",
  "아우터 없음",
  "잘 모르겠음",
];

export const topColorOptions = [
  "흰색",
  "검정",
  "회색",
  "네이비",
  "파랑",
  "하늘",
  "분홍",
  "빨강",
  "베이지",
  "갈색",
  "초록",
  "노랑",
  "패턴/무늬",
  "잘 모르겠음",
];

export const bottomTypeOptions = [
  "데님 팬츠",
  "트레이닝/조거 팬츠",
  "코튼 팬츠",
  "슈트 팬츠/슬랙스",
  "숏 팬츠",
  "레깅스",
  "점프 슈트/오버올",
  "기타 하의",
  "잘 모르겠음",
];

export const femaleBottomTypeOptions = [
  "데님 팬츠",
  "트레이닝/조거 팬츠",
  "코튼 팬츠",
  "슈트 팬츠/슬랙스",
  "숏 팬츠",
  "레깅스",
  "점프 슈트/오버올",
  "미니스커트",
  "미디스커트",
  "롱스커트",
  "기타 하의",
  "잘 모르겠음",
];

export const bottomColorOptions = [
  "검정",
  "청색",
  "연청",
  "진청",
  "회색",
  "흰색",
  "베이지",
  "갈색",
  "잘 모르겠음",
];

export const bagOptions = ["가방 있음", "가방 없음", "잘 모르겠음"];

export const earphoneOptions = [
  "무선 이어폰",
  "유선 이어폰",
  "헤드셋",
  "없음",
  "잘 모르겠음",
];

export const shoeOptions = [
  "운동화",
  "컨버스/반스",
  "구두/로퍼",
  "부츠",
  "샌들/슬리퍼",
  "크록스",
  "잘 모르겠음",
];

export const matchOptions = ["거의 저 같아요", "조금 비슷해요", "잘 모르겠어요"];

export const KOREA_TIME_ZONE = "Asia/Seoul";
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
