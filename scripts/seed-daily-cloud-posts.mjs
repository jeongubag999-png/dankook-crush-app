// Internal growth-seeding script — NOT part of the app.
// Signs in as the 15 seed accounts (test12..test26) and posts one new
// "crush" cloud each, dated today, with a random time slot strictly before
// 15:00 KST (so nothing ever looks like it happened in the future when this
// runs at 15:00 KST daily). Content (place/outfit/message) is randomized
// from the same option pools the real send-cloud form uses.
//
// Run: node scripts/seed-daily-cloud-posts.mjs
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

const todayInSeoul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const LOGIN_IDS = [
  "test12", "test13", "test14", "test15", "test16", "test17", "test18",
  "test19", "test20", "test21", "test22", "test23", "test24", "test25", "test26",
];

// Strictly before 15:00 so a 15:00 KST run never posts a "future" sighting.
const TIME_SLOTS = ["08:00~10:00", "10:00~12:00", "12:00~14:00"];

const PLACES = [
  "평화의광장/곰상", "국제관", "글로컬산학협력관", "난파음악관", "노천마당",
  "대운동장", "미디어센터", "미술관", "범정관/대학본부", "법학관/대학원동",
  "베어토피아", "보정동 카페거리", "사범관", "사회과학관", "상경관",
  "소프트웨어ICT관", "웅비홀", "인문관", "제1공학관", "제2공학관", "제3공학관",
  "종합실험동", "죽전역", "집현재1", "집현재2", "체육관", "퇴계기념중앙도서관",
  "학교 앞 상권/거리", "학생식당", "혜당관",
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

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const OUTFIT_PART_LABELS = { top: "상의", outer: "아우터", bottom: "하의" };

const buildRandomLook = () => {
  const topType = pick(TOP_TYPES);
  const top = { type: topType, color: pick(TOP_COLORS) };
  const outer = Math.random() < 0.35 ? { type: pick(OUTER_TYPES), color: pick(TOP_COLORS) } : null;
  const bottom = topType === "원피스" ? null : { type: pick(BOTTOM_TYPES), color: pick(BOTTOM_COLORS) };
  return { top, outer, bottom };
};

async function main() {
  const seenDate = todayInSeoul();
  // Assign slots round-robin across the 3 pre-3pm buckets, shuffled.
  const slotAssignment = shuffle(
    LOGIN_IDS.map((_, i) => TIME_SLOTS[i % TIME_SLOTS.length])
  );
  const messagePool = shuffle(MESSAGES);
  const placePool = shuffle(PLACES);

  const results = [];

  for (let i = 0; i < LOGIN_IDS.length; i++) {
    const loginId = LOGIN_IDS[i];
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const email = makeAuthEmail(loginId);

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: loginId,
      });
      if (signInError) {
        results.push({ loginId, ok: false, step: "signIn", error: signInError.message });
        continue;
      }
      const user = signInData.user;

      const { data: profileRow, error: profileFetchError } = await supabase
        .from("profiles")
        .select("nickname, department, mbti, bio, instagram_id, campus")
        .eq("user_id", user.id)
        .single();
      if (profileFetchError) {
        results.push({ loginId, ok: false, step: "profileFetch", error: profileFetchError.message });
        continue;
      }

      const look = buildRandomLook();
      const message = messagePool[i % messagePool.length];
      const place = placePool[i % placePool.length];
      const timePeriod = slotAssignment[i];
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
        main_place: place,
        detail_place: "",
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
      if (insertError) {
        results.push({ loginId, ok: false, step: "insert", error: insertError.message });
        continue;
      }

      results.push({ loginId, ok: true, place, timePeriod });
    } catch (e) {
      results.push({ loginId, ok: false, step: "exception", error: String(e) });
    }
  }

  console.log(`\n=== ${seenDate} 구름 시딩 결과 ===`);
  for (const r of results) {
    console.log(
      r.ok
        ? `✅ ${r.loginId} — ${r.place} ${r.timePeriod}`
        : `❌ ${r.loginId} — 실패 at ${r.step}: ${r.error}`
    );
  }
  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n${okCount}/${LOGIN_IDS.length} 완료`);
}

main();
