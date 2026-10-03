// Internal growth-seeding script — NOT part of the app.
// Meant to run once per hour (cron fires hourly). Each run looks up the
// current Asia/Seoul day/hour and posts only the clouds scheduled for that
// hour, so the day's fake "crush cloud" posts trickle in instead of
// appearing all at once.
//
// 하루 분량 (캠퍼스별 시드 계정이 따로 올린다. 글의 campus는 계정 프로필에서 가져온다):
//   - 죽전 (test12~test26): 평일 25개, 주말 15개
//   - 천안 (test27~test31, 프로필 캠퍼스 = 천안): 평일 10개, 주말 6개
// 평일은 오전에 몰리고, 주말은 늦게 시작해서 적게 올린다. 23시 글은 학교 앞 술집·편의점이다.
// EXAM_SEASON이 true면 낮 시간 글의 대부분을 도서관 열람실에서 본 것으로 올린다.
// 시험기간이 끝나면 false로 바꾼다.
// Hours with no plan entry are a no-op.
//
// Run: node scripts/seed-daily-cloud-posts.mjs
// Preview: node scripts/seed-daily-cloud-posts.mjs --dry-run [YYYY-MM-DD]
import { createClient } from "@supabase/supabase-js";

// Public anon key (same one shipped in the client bundle) — safe to embed,
// this script runs outside the local checkout (cloud scheduled routine) so
// it can't rely on a local .env file.
const SUPABASE_URL = "https://ikoerlpcoqznercmteyg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2VybHBjb3F6bmVyY210ZXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzY2MDcsImV4cCI6MjA5NDUxMjYwN30.DPdVFRCMNHIupSxADP7G1ap-_o6dkIgcnmFJocg_pFE";

const makeAuthEmail = (loginId) => {
  const encodedId = Buffer.from(loginId.trim(), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `user-${encodedId}@dankum.app`;
};

const nowInSeoul = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
};

// 시험기간: 낮 시간 글 중 LIBRARY_SHARE 비율을 도서관 열람실 글로 올린다.
const EXAM_SEASON = true;
const LIBRARY_SHARE = 0.85;

const NIGHT_VENUES = ["볶신", "곰포차", "혜자", "낭만단대", "세븐일레븐"];
// 천안 안서동 상권은 가게 이름 대신 일반 명칭을 쓴다. 실제 가게 이름을 알게 되면 바꾼다.
const CHEONAN_NIGHT_VENUES = ["술집", "포차", "편의점"];

const CAMPUS_ACCOUNTS = {
  죽전: Array.from({ length: 15 }, (_, i) => `test${12 + i}`),
  천안: ["test27", "test28", "test29", "test30", "test31"],
};

// 게시 시각(KST hour) -> 그 시간에 올릴 개수. 23시 글은 술집·편의점(night) 글이다.
const DAILY_SCHEDULE = {
  weekday: {
    죽전: { 9: 3, 10: 4, 11: 4, 12: 3, 14: 2, 15: 2, 16: 2, 19: 2, 21: 2, 23: 1 }, // 25
    천안: { 9: 1, 10: 2, 11: 2, 14: 1, 15: 1, 19: 1, 21: 1, 23: 1 }, // 10
  },
  weekend: {
    죽전: { 11: 2, 12: 2, 13: 2, 14: 2, 15: 2, 17: 2, 20: 2, 23: 1 }, // 15
    천안: { 11: 1, 13: 1, 15: 1, 17: 1, 20: 1, 23: 1 }, // 6
  },
};
const NIGHT_HOUR = 23;

// 게시 시각 직전 2시간 안에서 "본 시간대"를 고른다. 0시부터 2시간 단위 슬롯.
const slotForHour = (hour) => {
  // 08시 이전에 본 것으로 쓰지 않는다(도서관·강의 시작 전이라 어색함).
  const seenHour = Math.max(8, hour - 1 - Math.floor(Math.random() * 2));
  const start = seenHour - (seenHour % 2);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(start)}:00~${pad(start + 2)}:00`;
};

// 그날의 이 시간 게시 목록. 계정은 날짜마다 시작점을 바꿔 돌아가며 쓴다(하루 최대 2회).
const buildEntriesForHour = (date, hour) => {
  // KST 정오는 UTC로도 같은 날짜라서 getUTCDay()가 서울 기준 요일이 된다.
  const isWeekend = [0, 6].includes(new Date(`${date}T12:00:00+09:00`).getUTCDay());
  const schedule = DAILY_SCHEDULE[isWeekend ? "weekend" : "weekday"];
  const dayIndex = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const entries = [];
  for (const [campus, perHour] of Object.entries(schedule)) {
    const accounts = CAMPUS_ACCOUNTS[campus];
    const hours = Object.keys(perHour).map(Number).sort((a, b) => a - b);
    let slotIndex = 0;
    for (const h of hours) {
      for (let k = 0; k < perHour[h]; k += 1) {
        if (h === hour) {
          entries.push({
            loginId: accounts[(dayIndex * 3 + slotIndex) % accounts.length],
            campus,
            kind: h === NIGHT_HOUR ? "night" : "day",
            hour,
            // 하루 안에서 문구가 겹치지 않도록 그날의 순번으로 문구를 고른다.
            order: dayIndex * 5 + slotIndex,
          });
        }
        slotIndex += 1;
      }
    }
  }
  return entries;
};

const PLACES = [
  "평화의광장/곰상", "국제관", "글로컬산학협력관", "난파음악관", "노천마당",
  "대운동장", "미디어센터", "미술관", "범정관/대학본부", "법학관/대학원동",
  "베어토피아", "보정동 카페거리", "사범관", "사회과학관", "상경관",
  "소프트웨어ICT관", "웅비홀", "인문관", "제1공학관", "제2공학관", "제3공학관",
  "종합실험동", "죽전역", "집현재1", "집현재2", "체육관", "퇴계기념중앙도서관",
  "학교 앞 상권/거리", "학생식당", "혜당관",
];

// src/constants.js의 LIBRARY_READING_ROOMS와 같은 열람실·좌석 수.
const LIBRARY_ROOMS = {
  죽전: {
    library: "퇴계기념중앙도서관",
    rooms: [
      { name: "1층 제1열람실", seats: 344 },
      { name: "1층 제6열람실", seats: 54 },
      { name: "2층 제2열람실", seats: 176 },
      { name: "2층 제3열람실", seats: 148 },
      { name: "2층 제4열람실", seats: 278 },
      { name: "2층 집중학습실", seats: 70 },
    ],
  },
  천안: {
    library: "율곡기념도서관",
    rooms: [
      { name: "1층 1열람실 A", seats: 120 },
      { name: "1층 1열람실 B", seats: 56 },
      { name: "1층 1열람실 C", seats: 60 },
      { name: "1층 1열람실 D", seats: 48 },
      { name: "1층 1열람실 E", seats: 30 },
      { name: "1층 1열람실 F", seats: 32 },
    ],
  },
};

// src/constants.js의 cheonanPlaceOptions에서 "잘 모르겠음"/"기타"를 뺀 목록.
const CHEONAN_PLACES = [
  "인문과학관", "사회과학관", "자연과학1관", "자연과학2관", "공학관(융합기술대학관)",
  "보건과학관", "생명자원과학관", "간호대 별관", "예술관 A/B동", "예술관 C/D동",
  "학생회관(웅무관)", "산학협력관", "율곡기념도서관", "체육관", "치의학관", "약학관",
  "의학관", "대운동장", "베어토피아", "단대호수(안서호/천호지)", "기숙사",
  "학교 앞 상권/거리", "버스정류장",
];

const TOP_TYPES = [
  "긴소매 티셔츠", "맨투맨/스웨트", "셔츠/블라우스", "후드 티셔츠", "반소매 티셔츠",
  "피케/카라 티셔츠", "니트/스웨터", "민소매 티셔츠", "원피스",
];
const OUTER_TYPES = [
  "후드 집업", "블루종/MA-1", "카디건", "경량 패딩/패딩 베스트", "트레이닝 재킷",
  "플리스/뽀글이", "코트", "숏패딩",
];
const BOTTOM_TYPES = [
  "데님 팬츠", "트레이닝/조거 팬츠", "코튼 팬츠", "슈트 팬츠/슬랙스", "숏 팬츠",
  "레깅스", "미니스커트", "미디스커트", "롱스커트",
];
const TOP_COLORS = ["흰색", "검정", "회색", "네이비", "파랑", "하늘", "분홍", "빨강", "베이지", "갈색", "초록", "노랑"];
const BOTTOM_COLORS = ["검정", "청색", "연청", "진청", "회색", "흰색", "베이지", "갈색"];
const HAIR_COLORS = ["검정색", "갈색", "탈색"];
const HAT_STATUSES = ["모자 있음", "모자 없음", "모자 없음", "모자 없음"];
const BANGS_STATUSES = ["앞머리 있음", "앞머리 없음"];
const GLASSES_STATUSES = ["안경 착용", "안경 없음", "안경 없음", "안경 없음"];
const SHOE_TYPES = ["운동화", "컨버스/반스", "구두/로퍼", "부츠", "샌들/슬리퍼"];
const BAG_TYPES = ["가방 있음", "가방 없음"];
const EARPHONE_TYPES = ["무선 이어폰", "유선 이어폰", "헤드셋", "없음"];

const MESSAGES = [
  "진짜 너무 예쁘시더라구요 꼭 찾고 싶어요",
  "지나가다가 눈에 딱 들어와서 계속 생각나요",
  "웃는 모습이 너무 예뻤어요 인연이었으면 좋겠어요",
  "분위기가 너무 좋아서 말 걸어보고 싶었는데 못 걸었어요",
  "스쳐 지나가는데 향도 좋고 너무 예쁘셔서 다시 보고 싶어요",
  "눈 마주친 순간 심장이 떨렸어요 혹시 보시면 연락주세요",
  "옆에서 통화하시는 목소리도 좋고 계속 눈이 갔어요",
  "계단에서 마주쳤는데 스타일이 너무 예뻐서 눈을 못 뗐어요",
  "친구랑 웃으면서 걸어가시는데 너무 사랑스러웠어요",
  "카페에서 책 읽고 계신 모습이 너무 분위기 있어서 기억에 남아요",
  "우산 없이 뛰어가시는 거 보고 계속 생각나서 올려요",
  "밥 먹으러 가는 길에 스쳤는데 너무 예뻐서 다시 보고 싶어요",
  "이어폰 끼고 걸어가시는데 그 모습도 너무 예뻤어요",
  "강의실 앞에서 잠깐 봤는데 계속 떠올라요 혹시 이 글 보시면",
  "버스 기다리시는 뒷모습부터 너무 눈에 띄었어요",
  "자전거 타고 지나가시는데 순간 심쿵했어요",
  "도서관에서 공부하시는 옆모습이 너무 예뻤어요",
  "운동하시는 모습 보고 완전 반했어요 인연이었으면",
  "편의점 앞에서 잠깐 스쳤는데 계속 생각나서 글 남겨요",
  "정류장에서 폰 보고 계셨는데 그 모습도 예뻤어요",
];

// 시험기간 도서관 글. 열람실에서 실제로 마주칠 법한 순간들.
const LIBRARY_MESSAGES = [
  "앞자리에서 공부하시던 분, 집중하는 모습이 너무 멋있어서 저는 공부를 못 했어요",
  "열람실 나가실 때 눈 마주쳤는데 계속 생각나요",
  "정수기 앞에서 잠깐 마주쳤는데 그 뒤로 한 글자도 안 읽혀요",
  "옆자리에서 조용히 공부하시던 분, 시험 끝나면 밥 한번 어때요",
  "자판기 앞에서 뭐 마실지 고민하시던 모습이 귀여웠어요",
  "늦게까지 남아서 공부하시던데 시험 잘 보세요 그리고 연락주세요",
  "휴게실에서 커피 드시던 분 계속 눈이 갔어요",
  "노트북으로 열심히 과제하시던 분 너무 멋있었어요",
  "열람실 들어오실 때마다 시선이 가서 집중이 안 됐어요",
  "포스트잇 붙일까 하다가 용기 내서 구름 띄워요",
  "졸다가 깨셨을 때 눈 마주쳤는데 잊혀지지가 않아요",
  "이어폰 끼고 공부하시던 옆모습이 너무 예뻤어요",
  "자리 정리하고 나가시는 뒷모습 보고 말 걸걸 후회했어요",
  "시험 끝나고 꼭 한번 얘기해보고 싶어요",
  "계단에서 책 들고 내려가시던 분 혹시 이 글 보시면 연락주세요",
  "열람실 출입구에서 자리 찍으시는데 순간 눈이 멈췄어요",
  "공부하다 기지개 켜시는 모습 보고 웃음이 나왔어요 귀여우셨어요",
  "제 대각선 자리에 앉으셨던 분 하루 종일 신경 쓰였어요",
  "필기하시는 글씨가 너무 예뻐서 계속 봤어요 죄송해요",
  "도서관 앞 벤치에서 쉬시던 분 다시 보고 싶어요",
  "시험기간이라 다들 힘든데 그 와중에 너무 빛나셨어요",
  "같은 열람실에서 며칠째 마주치는데 오늘은 용기 내볼게요",
];

const NIGHT_MESSAGES = [
  "술집에서 친구들이랑 계셨는데 너무 예뻐서 계속 쳐다봤어요",
  "혼자 계산하러 나오셨는데 그 잠깐 사이에 반했어요",
  "일행이랑 웃으면서 나오시는데 너무 눈에 띄었어요",
  "편의점에서 잠깐 마주쳤는데 계속 생각나서 올려봐요",
  "밤에 친구들이랑 걸어가시는 거 보고 인연이었으면 했어요",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickInOrder = (arr, order) => arr[order % arr.length];

const OUTFIT_PART_LABELS = { top: "상의", outer: "아우터", bottom: "하의" };

const buildRandomLook = () => {
  const topType = pick(TOP_TYPES);
  const top = { type: topType, color: pick(TOP_COLORS) };
  const outer = Math.random() < 0.35 ? { type: pick(OUTER_TYPES), color: pick(TOP_COLORS) } : null;
  const bottom = topType === "원피스" ? null : { type: pick(BOTTOM_TYPES), color: pick(BOTTOM_COLORS) };
  return { top, outer, bottom };
};

// 열람실은 좌석 수에 비례해 고른다(큰 열람실일수록 사람이 많으니까).
const pickLibraryRoom = (campus) => {
  const { library, rooms } = LIBRARY_ROOMS[campus];
  const total = rooms.reduce((sum, room) => sum + room.seats, 0);
  let roll = Math.random() * total;
  const room = rooms.find((item) => (roll -= item.seats) < 0) || rooms[0];
  return { library, room: room.name };
};

const buildPlanForEntry = (entry) => {
  if (entry.kind === "day") {
    const timePeriod = slotForHour(entry.hour);
    if (EXAM_SEASON && Math.random() < LIBRARY_SHARE) {
      // 앱에서 열람실을 고른 글과 같은 형식: place = "도서관 - 열람실"
      const { library, room } = pickLibraryRoom(entry.campus);
      return {
        timePeriod,
        place: `${library} - ${room}`,
        mainPlace: library,
        detailPlace: room,
        message: pickInOrder(LIBRARY_MESSAGES, entry.order),
      };
    }
    const places = (entry.campus === "천안" ? CHEONAN_PLACES : PLACES).filter(
      (place) => !EXAM_SEASON || !place.includes("도서관")
    );
    return { timePeriod, place: pick(places), mainPlace: null, detailPlace: "", message: pickInOrder(MESSAGES, entry.order) };
  }
  // night
  const mainPlace = "학교 앞 상권/거리";
  const venue = pick(entry.campus === "천안" ? CHEONAN_NIGHT_VENUES : NIGHT_VENUES);
  return {
    timePeriod: "22:00~24:00",
    place: `${mainPlace} - ${venue}`,
    mainPlace,
    detailPlace: venue,
    message: pick(NIGHT_MESSAGES),
  };
};

async function postOne(entry) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const email = makeAuthEmail(entry.loginId);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: entry.loginId,
  });
  if (signInError) return { ...entry, ok: false, step: "signIn", error: signInError.message };
  const user = signInData.user;

  const { data: profileRow, error: profileFetchError } = await supabase
    .from("profiles")
    .select("nickname, department, mbti, bio, instagram_id, campus")
    .eq("user_id", user.id)
    .single();
  if (profileFetchError) return { ...entry, ok: false, step: "profileFetch", error: profileFetchError.message };
  // 천안 장소 글이 죽전 게시판에 섞이지 않도록, 계정 캠퍼스가 계획과 다르면 올리지 않는다.
  if (entry.campus !== profileRow.campus) {
    return { ...entry, ok: false, step: "campusCheck", error: `프로필 캠퍼스가 ${profileRow.campus}임` };
  }

  const { date: seenDate } = nowInSeoul();
  const look = buildRandomLook();
  const { timePeriod, place, mainPlace, detailPlace, message } = buildPlanForEntry(entry);
  const hairColor = pick(HAIR_COLORS);
  const hat = pick(HAT_STATUSES);
  const bangs = pick(BANGS_STATUSES);
  const glasses = pick(GLASSES_STATUSES);
  const shoe = pick(SHOE_TYPES);
  const bag = pick(BAG_TYPES);
  const earphone = pick(EARPHONE_TYPES);

  const parts = ["top", "outer", "bottom"].filter((part) => look[part]);
  const structuredOutfitText = parts
    .map((part) => `${OUTFIT_PART_LABELS[part]}: ${look[part].color} ${look[part].type}`)
    .join(" / ");
  const clothesStyleText = [structuredOutfitText, message].filter(Boolean).join(" / 자세히: ");
  const hairFeatureText = [hairColor, hat, bangs, message].filter(Boolean).join(" / ");
  const accessoryText = [glasses, bag, earphone, shoe, message].filter(Boolean).join(" / ");
  const pickedColor = parts.map((part) => look[part].color).find(Boolean) || "";

  const postData = {
    sender_user_id: user.id,
    room: "crush",
    seen_date: seenDate,
    place,
    main_place: mainPlace || place,
    detail_place: detailPlace,
    time_period: timePeriod,
    hair_feature: hairFeatureText,
    hair_color: hairColor,
    hat_status: hat,
    bangs_status: bangs,
    glasses_status: glasses,
    top_type: look.top?.type || "",
    top_color: look.top?.color || "",
    top_detail: "",
    outer_type: look.outer?.type || "",
    outer_color: look.outer?.color || "",
    bottom_type: look.bottom?.type || "",
    bottom_color: look.bottom?.color || "",
    bottom_detail: "",
    shoe_type: shoe,
    shoe_detail: "",
    bag_type: bag,
    earphone_type: earphone,
    item_detail: "",
    clothes_color: pickedColor,
    clothes_style: clothesStyleText,
    accessory: accessoryText,
    message,
    sender_nickname: profileRow.nickname,
    sender_instagram: profileRow.instagram_id || "",
    sender_gender: "남자",
    sender_department: profileRow.department,
    sender_mbti: profileRow.mbti,
    sender_bio: profileRow.bio,
    target_gender: "여자",
    campus: profileRow.campus,
  };

  const { error: insertError } = await supabase.from("crush_posts").insert([postData]);
  if (insertError) return { ...entry, ok: false, step: "insert", error: insertError.message };

  return { ...entry, ok: true, place, timePeriod };
}

async function main() {
  const { date, hour } = nowInSeoul();
  const entries = buildEntriesForHour(date, hour);

  if (entries.length === 0) {
    console.log(`${date} ${hour}시 KST — 이 시간대에는 예정된 게시가 없습니다.`);
    return;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const results = [];
  for (const entry of entries) {
    // Small random gap so posts in the same hour don't land at the exact
    // same timestamp (a real person wouldn't post two clouds in the same
    // second either).
    if (results.length > 0) await sleep(5000 + Math.random() * 45000);
    results.push(await postOne(entry));
  }

  console.log(`\n=== ${date} ${hour}시 KST 구름 시딩 결과 ===`);
  for (const r of results) {
    console.log(
      r.ok
        ? `✅ ${r.loginId} (${r.kind}) — ${r.place} ${r.timePeriod}`
        : `❌ ${r.loginId} — 실패 at ${r.step}: ${r.error}`
    );
  }
  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n${okCount}/${entries.length} 완료`);
}

// --dry-run [YYYY-MM-DD]: 그날 올릴 글을 시간순으로 출력만 한다(로그인·게시 안 함).
function dryRun(date) {
  let total = 0;
  for (let hour = 0; hour < 24; hour += 1) {
    for (const entry of buildEntriesForHour(date, hour)) {
      const { timePeriod, place, message } = buildPlanForEntry(entry);
      console.log(`${String(hour).padStart(2, "0")}시 ${entry.campus} ${entry.loginId} | ${timePeriod} | ${place} | ${message}`);
      total += 1;
    }
  }
  console.log(`총 ${total}개`);
}

if (process.argv.includes("--dry-run")) {
  dryRun(process.argv.find((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg)) || nowInSeoul().date);
} else {
  main();
}
