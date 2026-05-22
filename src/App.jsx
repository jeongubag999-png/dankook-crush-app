import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

const PLACES = [
  "혜당관 앞",
  "학생회관",
  "퇴계기념중앙도서관",
  "상경관",
  "인문관",
  "사범관",
  "공학관 1관",
  "공학관 2관",
  "공학관 3관",
  "미디어센터",
  "체육관",
  "폭포공원",
  "평화의 광장",
  "단국대 정문",
  "단국대 후문",
  "학교앞 상권",
  "기타",
];

const TIME_OPTIONS = [
  "08:00~09:00",
  "09:00~10:00",
  "10:00~11:00",
  "11:00~12:00",
  "12:00~13:00",
  "13:00~14:00",
  "14:00~15:00",
  "15:00~16:00",
  "16:00~17:00",
  "17:00~18:00",
  "18:00~19:00",
  "19:00~20:00",
  "20:00~21:00",
  "21:00~22:00",
  "22:00~08:00",
];

const MALE_HAIR_OPTIONS = [
  "짧은 머리",
  "댄디컷",
  "가르마펌",
  "쉐도우펌",
  "스포츠머리",
  "장발",
  "모자 착용",
  "잘 모르겠음",
];

const FEMALE_HAIR_OPTIONS = [
  "긴 생머리",
  "긴 웨이브",
  "중단발",
  "단발",
  "묶은 머리",
  "앞머리 있음",
  "모자 착용",
  "잘 모르겠음",
];

const TOP_OPTIONS = [
  "후드티",
  "맨투맨",
  "셔츠",
  "니트",
  "반팔티",
  "긴팔티",
  "자켓",
  "코트",
  "패딩",
  "원피스",
  "잘 모르겠음",
];

const BOTTOM_OPTIONS = [
  "청바지",
  "슬랙스",
  "트레이닝복",
  "반바지",
  "치마",
  "원피스",
  "잘 모르겠음",
];

const COLOR_OPTIONS = [
  "검정",
  "흰색",
  "회색",
  "베이지",
  "갈색",
  "파랑",
  "남색",
  "초록",
  "빨강",
  "분홍",
  "노랑",
  "잘 모르겠음",
];

const BAG_OPTIONS = [
  "백팩",
  "크로스백",
  "토트백",
  "에코백",
  "가방 없음",
  "잘 모르겠음",
];

const EARPHONE_OPTIONS = [
  "에어팟/무선이어폰",
  "유선이어폰",
  "헤드셋",
  "착용 안 함",
  "잘 모르겠음",
];

const emptyProfile = {
  nickname: "",
  gender: "",
  department: "",
  student_id: "",
  instagram: "",
  photo_url: "",
  introduction: "",
};

const emptyCrushPost = {
  seen_date: "",
  place: "혜당관 앞",
  time_period: "12:00~13:00",
  target_gender: "",
  target_hair_feature: "",
  top_type: "",
  top_color: "",
  bottom_type: "",
  bottom_color: "",
  bag_type: "",
  earphone_type: "",
  extra_description: "",
  message: "",
  question_1: "",
  question_2: "",
};

const emptyReceiveForm = {
  seen_date: "",
  hair_feature: "",
  top_type: "",
  top_color: "",
  bottom_type: "",
  bottom_color: "",
  bag_type: "",
  earphone_type: "",
  extra_description: "",
};

function App() {
  const [page, setPage] = useState("home");
  const [profile, setProfile] = useState(emptyProfile);
  const [crushPost, setCrushPost] = useState(emptyCrushPost);
  const [receiveForm, setReceiveForm] = useState(emptyReceiveForm);
  const [receivedResults, setReceivedResults] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [mySentPosts, setMySentPosts] = useState([]);
  const [myClaims, setMyClaims] = useState([]);

  const myHairOptions = useMemo(() => {
    return profile.gender === "남자" ? MALE_HAIR_OPTIONS : FEMALE_HAIR_OPTIONS;
  }, [profile.gender]);

  const targetHairOptions = useMemo(() => {
    return crushPost.target_gender === "남자"
      ? MALE_HAIR_OPTIONS
      : FEMALE_HAIR_OPTIONS;
  }, [crushPost.target_gender]);

  useEffect(() => {
    const savedProfile = localStorage.getItem("dankum_profile");

    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dankum_profile", JSON.stringify(profile));
  }, [profile]);

  const isProfileComplete =
    profile.nickname &&
    profile.gender &&
    profile.department &&
    profile.student_id &&
    profile.instagram;

  const convertImageToBase64 = (file, callback) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      callback(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!isProfileComplete) {
      alert("닉네임, 성별, 학과, 학번, 인스타 아이디를 모두 입력해주세요.");
      return;
    }

    localStorage.setItem("dankum_profile", JSON.stringify(profile));
    alert("프로필이 저장되었어요.");
    setPage("home");
  };

  const requireProfile = () => {
    if (!isProfileComplete) {
      alert("먼저 내 프로필을 입력해주세요.");
      setPage("profile");
      return false;
    }

    return true;
  };

  const submitCrushPost = async () => {
    if (!requireProfile()) return;

    if (
      !crushPost.seen_date ||
      !crushPost.place ||
      !crushPost.time_period ||
      !crushPost.target_gender ||
      !crushPost.target_hair_feature ||
      !crushPost.top_type ||
      !crushPost.top_color
    ) {
      alert("필수 항목을 입력해주세요.");
      return;
    }

    const payload = {
      ...crushPost,
      finder_nickname: profile.nickname,
      finder_gender: profile.gender,
      finder_department: profile.department,
      finder_student_id: profile.student_id,
      finder_instagram: profile.instagram,
      finder_photo_url: profile.photo_url,
      finder_introduction: profile.introduction,
      status: "waiting",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("crush_posts").insert([payload]);

    if (error) {
      alert("설렘 남기기에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("설렘을 남겼어요!");

    setCrushPost(emptyCrushPost);
    setPage("sent");
  };

  const calculateScore = (post) => {
    let score = 0;

    if (post.target_hair_feature === receiveForm.hair_feature) score += 25;
    if (post.top_type === receiveForm.top_type) score += 20;
    if (post.top_color === receiveForm.top_color) score += 20;
    if (post.bottom_type === receiveForm.bottom_type) score += 15;
    if (post.bottom_color === receiveForm.bottom_color) score += 10;
    if (post.bag_type === receiveForm.bag_type) score += 5;
    if (post.earphone_type === receiveForm.earphone_type) score += 5;

    return score;
  };

  const searchReceivedCrushes = async () => {
    if (!requireProfile()) return;

    if (!receiveForm.seen_date || !receiveForm.hair_feature || !receiveForm.top_type) {
      alert("날짜, 머리스타일, 상의 종류는 입력해주세요.");
      return;
    }

    const { data, error } = await supabase
      .from("crush_posts")
      .select("*")
      .eq("seen_date", receiveForm.seen_date)
      .eq("target_gender", profile.gender)
      .order("created_at", { ascending: false });

    if (error) {
      alert("검색에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    const scored = (data || [])
      .map((post) => ({
        ...post,
        match_score: calculateScore(post),
      }))
      .filter((post) => post.match_score >= 25)
      .sort((a, b) => b.match_score - a.match_score);

    setReceivedResults(scored);
    setPage("receiveResults");
  };

  const submitClaim = async (post) => {
    if (!requireProfile()) return;

    const { error } = await supabase.from("claims").insert([
      {
        crush_post_id: post.id,
        claimer_nickname: profile.nickname,
        claimer_gender: profile.gender,
        claimer_department: profile.department,
        claimer_student_id: profile.student_id,
        claimer_instagram: profile.instagram,
        claimer_photo_url: profile.photo_url,
        claimer_introduction: profile.introduction,
        response_message: "저인 것 같아요. 확인 부탁드려요.",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("응답 보내기에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("응답을 보냈어요. 상대가 확인하면 인스타를 교환할 수 있어요.");
    setPage("home");
  };

  const loadMyMatching = async () => {
    if (!requireProfile()) return;

    const { data: sentData, error: sentError } = await supabase
      .from("crush_posts")
      .select("*")
      .eq("finder_instagram", profile.instagram)
      .order("created_at", { ascending: false });

    if (sentError) {
      alert("내가 보낸 설렘을 불러오지 못했어요: " + sentError.message);
      return;
    }

    setMySentPosts(sentData || []);

    const ids = (sentData || []).map((post) => post.id);

    if (ids.length === 0) {
      setMyClaims([]);
      setPage("matching");
      return;
    }

    const { data: claimData, error: claimError } = await supabase
      .from("claims")
      .select("*")
      .in("crush_post_id", ids)
      .order("created_at", { ascending: false });

    if (claimError) {
      alert("응답 목록을 불러오지 못했어요: " + claimError.message);
      return;
    }

    setMyClaims(claimData || []);
    setPage("matching");
  };

  const sendSecondHeart = async (post) => {
    const { error } = await supabase.from("claims").insert([
      {
        crush_post_id: post.id,
        claimer_nickname: profile.nickname,
        claimer_gender: profile.gender,
        claimer_department: profile.department,
        claimer_student_id: profile.student_id,
        claimer_instagram: profile.instagram,
        claimer_photo_url: profile.photo_url,
        claimer_introduction: profile.introduction,
        response_message: "혹시 제가 찾던 분이 맞다면 한 번만 확인해주세요.",
        is_second_heart: true,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("2차 설렘 보내기에 실패했어요: " + error.message);
      return;
    }

    alert("2차 설렘을 보냈어요.");
  };

  return (
    <div className="app">
      {page === "home" && (
        <div className="card">
          <h1>단꿈</h1>
          <p className="subtitle">
            단국대에서 스친 인연에게, 조심스럽게 설렘을 남겨보세요.
          </p>

          <div className="home-buttons">
            <button onClick={() => setPage("profile")}>내 프로필</button>
            <button
              onClick={() => {
                if (requireProfile()) setPage("leave");
              }}
            >
              설렘 남기기
            </button>
            <button
              onClick={() => {
                if (requireProfile()) setPage("receive");
              }}
            >
              나에게 온 설렘 찾기
            </button>
            <button onClick={loadMyMatching}>매칭 관리</button>
          </div>

          {!isProfileComplete && (
            <p className="notice">처음 이용한다면 먼저 프로필을 입력해주세요.</p>
          )}
        </div>
      )}

      {page === "profile" && (
        <div className="card">
          <h2>내 프로필</h2>
          <p className="description">
            매칭이 성사되었을 때 상대에게 보여질 기본 정보예요.
          </p>

          <label>프로필 사진</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              convertImageToBase64(e.target.files[0], (base64) =>
                setProfile({ ...profile, photo_url: base64 })
              )
            }
          />

          {profile.photo_url && (
            <img className="profile-preview" src={profile.photo_url} alt="프로필" />
          )}

          <label>닉네임</label>
          <input
            value={profile.nickname}
            onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
            placeholder="예: 곰돌이23"
          />

          <label>성별</label>
          <div className="choice-grid two">
            <button
              className={profile.gender === "남자" ? "selected" : "white"}
              onClick={() => setProfile({ ...profile, gender: "남자" })}
            >
              남자
            </button>
            <button
              className={profile.gender === "여자" ? "selected" : "white"}
              onClick={() => setProfile({ ...profile, gender: "여자" })}
            >
              여자
            </button>
          </div>

          <label>학과</label>
          <input
            value={profile.department}
            onChange={(e) =>
              setProfile({ ...profile, department: e.target.value })
            }
            placeholder="예: 글로벌경영학과"
          />

          <label>학번</label>
          <input
            value={profile.student_id}
            onChange={(e) =>
              setProfile({ ...profile, student_id: e.target.value })
            }
            placeholder="예: 23학번"
          />

          <label>인스타 아이디</label>
          <input
            value={profile.instagram}
            onChange={(e) =>
              setProfile({ ...profile, instagram: e.target.value })
            }
            placeholder="예: dankum_official"
          />

          <label>한 줄 소개</label>
          <textarea
            value={profile.introduction}
            onChange={(e) =>
              setProfile({ ...profile, introduction: e.target.value })
            }
            placeholder="상대에게 보여질 짧은 소개를 적어주세요."
          />

          <button onClick={saveProfile}>저장하기</button>
          <button className="white" onClick={() => setPage("home")}>
            홈으로
          </button>
        </div>
      )}

      {page === "leave" && (
        <div className="card">
          <h2>설렘 남기기</h2>
          <p className="description">
            내가 찾고 싶은 사람의 인상착의와 상황을 선택해주세요.
          </p>

          <label>언제 봤나요?</label>
          <input
            type="date"
            value={crushPost.seen_date}
            onChange={(e) =>
              setCrushPost({ ...crushPost, seen_date: e.target.value })
            }
          />

          <label>어디서 봤나요?</label>
          <select
            value={crushPost.place}
            onChange={(e) =>
              setCrushPost({ ...crushPost, place: e.target.value })
            }
          >
            {PLACES.map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>

          <label>시간대</label>
          <select
            value={crushPost.time_period}
            onChange={(e) =>
              setCrushPost({ ...crushPost, time_period: e.target.value })
            }
          >
            {TIME_OPTIONS.map((time) => (
              <option key={time}>{time}</option>
            ))}
          </select>

          <label>내가 찾는 상대 성별</label>
          <div className="choice-grid two">
            <button
              className={crushPost.target_gender === "남자" ? "selected" : "white"}
              onClick={() =>
                setCrushPost({
                  ...crushPost,
                  target_gender: "남자",
                  target_hair_feature: "",
                })
              }
            >
              남자
            </button>
            <button
              className={crushPost.target_gender === "여자" ? "selected" : "white"}
              onClick={() =>
                setCrushPost({
                  ...crushPost,
                  target_gender: "여자",
                  target_hair_feature: "",
                })
              }
            >
              여자
            </button>
          </div>

          <label>상대 머리스타일</label>
          <select
            value={crushPost.target_hair_feature}
            onChange={(e) =>
              setCrushPost({
                ...crushPost,
                target_hair_feature: e.target.value,
              })
            }
          >
            <option value="">선택해주세요</option>
            {targetHairOptions.map((hair) => (
              <option key={hair}>{hair}</option>
            ))}
          </select>

          <label>상의 종류</label>
          <select
            value={crushPost.top_type}
            onChange={(e) =>
              setCrushPost({ ...crushPost, top_type: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {TOP_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>상의 색상</label>
          <select
            value={crushPost.top_color}
            onChange={(e) =>
              setCrushPost({ ...crushPost, top_color: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {COLOR_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>하의 종류</label>
          <select
            value={crushPost.bottom_type}
            onChange={(e) =>
              setCrushPost({ ...crushPost, bottom_type: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {BOTTOM_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>하의 색상</label>
          <select
            value={crushPost.bottom_color}
            onChange={(e) =>
              setCrushPost({ ...crushPost, bottom_color: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {COLOR_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>가방</label>
          <select
            value={crushPost.bag_type}
            onChange={(e) =>
              setCrushPost({ ...crushPost, bag_type: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {BAG_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>이어폰/헤드셋</label>
          <select
            value={crushPost.earphone_type}
            onChange={(e) =>
              setCrushPost({ ...crushPost, earphone_type: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {EARPHONE_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>기억나는 추가 특징</label>
          <textarea
            value={crushPost.extra_description}
            onChange={(e) =>
              setCrushPost({
                ...crushPost,
                extra_description: e.target.value,
              })
            }
            placeholder="예: 검은색 노트북 파우치를 들고 있었어요."
          />

          <label>상대에게 남길 메시지</label>
          <textarea
            value={crushPost.message}
            onChange={(e) =>
              setCrushPost({ ...crushPost, message: e.target.value })
            }
            placeholder="부담스럽지 않게 짧게 남겨주세요."
          />

          <label>상대가 확인할 수 있는 질문 1</label>
          <input
            value={crushPost.question_1}
            onChange={(e) =>
              setCrushPost({ ...crushPost, question_1: e.target.value })
            }
            placeholder="예: 그때 어느 방향으로 걸어가고 있었나요?"
          />

          <label>상대가 확인할 수 있는 질문 2</label>
          <input
            value={crushPost.question_2}
            onChange={(e) =>
              setCrushPost({ ...crushPost, question_2: e.target.value })
            }
            placeholder="예: 주변에 친구가 있었나요?"
          />

          <button onClick={submitCrushPost}>설렘 남기기</button>
          <button className="white" onClick={() => setPage("home")}>
            홈으로
          </button>
        </div>
      )}

      {page === "sent" && (
        <div className="card">
          <h2>설렘을 남겼어요</h2>
          <p className="description">
            상대가 본인이라고 생각하고 응답하면 매칭 관리에서 확인할 수 있어요.
          </p>

          <button onClick={loadMyMatching}>매칭 관리로 가기</button>
          <button className="white" onClick={() => setPage("home")}>
            홈으로
          </button>
        </div>
      )}

      {page === "receive" && (
        <div className="card">
          <h2>나에게 온 설렘 찾기</h2>
          <p className="description">
            장소는 입력하지 않고, 오늘의 착장과 인상착의만 입력해요.
          </p>

          <label>내가 그날 학교에 있었던 날짜</label>
          <input
            type="date"
            value={receiveForm.seen_date}
            onChange={(e) =>
              setReceiveForm({ ...receiveForm, seen_date: e.target.value })
            }
          />

          <label>내 머리스타일</label>
          <select
            value={receiveForm.hair_feature}
            onChange={(e) =>
              setReceiveForm({
                ...receiveForm,
                hair_feature: e.target.value,
              })
            }
          >
            <option value="">선택해주세요</option>
            {myHairOptions.map((hair) => (
              <option key={hair}>{hair}</option>
            ))}
          </select>

          <label>상의 종류</label>
          <select
            value={receiveForm.top_type}
            onChange={(e) =>
              setReceiveForm({ ...receiveForm, top_type: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {TOP_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>상의 색상</label>
          <select
            value={receiveForm.top_color}
            onChange={(e) =>
              setReceiveForm({ ...receiveForm, top_color: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {COLOR_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>하의 종류</label>
          <select
            value={receiveForm.bottom_type}
            onChange={(e) =>
              setReceiveForm({ ...receiveForm, bottom_type: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {BOTTOM_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>하의 색상</label>
          <select
            value={receiveForm.bottom_color}
            onChange={(e) =>
              setReceiveForm({ ...receiveForm, bottom_color: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {COLOR_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>가방</label>
          <select
            value={receiveForm.bag_type}
            onChange={(e) =>
              setReceiveForm({ ...receiveForm, bag_type: e.target.value })
            }
          >
            <option value="">선택해주세요</option>
            {BAG_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>이어폰/헤드셋</label>
          <select
            value={receiveForm.earphone_type}
            onChange={(e) =>
              setReceiveForm({
                ...receiveForm,
                earphone_type: e.target.value,
              })
            }
          >
            <option value="">선택해주세요</option>
            {EARPHONE_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>추가 특징</label>
          <textarea
            value={receiveForm.extra_description}
            onChange={(e) =>
              setReceiveForm({
                ...receiveForm,
                extra_description: e.target.value,
              })
            }
            placeholder="기억나는 내 착장을 적어주세요."
          />

          <button onClick={searchReceivedCrushes}>내 설렘 찾아보기</button>
          <button className="white" onClick={() => setPage("home")}>
            홈으로
          </button>
        </div>
      )}

      {page === "receiveResults" && (
        <div className="card">
          <h2>나에게 온 것 같은 설렘</h2>

          {receivedResults.length === 0 ? (
            <p className="description">
              아직 나와 비슷한 인상착의의 설렘이 없어요.
            </p>
          ) : (
            <div className="result-list">
              {receivedResults.map((post) => (
                <div className="result-card" key={post.id}>
                  <div className="score">{post.match_score}% 유사</div>
                  <p>
                    <b>날짜</b> {post.seen_date}
                  </p>
                  <p>
                    <b>장소</b> {post.place}
                  </p>
                  <p>
                    <b>시간</b> {post.time_period}
                  </p>
                  <p>
                    <b>착장</b> {post.top_color} {post.top_type} /{" "}
                    {post.bottom_color} {post.bottom_type}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedPost(post);
                      setPage("detail");
                    }}
                  >
                    이 설렘 확인하기
                  </button>
                </div>
              ))}
            </div>
          )}

          <button className="white" onClick={() => setPage("home")}>
            홈으로
          </button>
        </div>
      )}

      {page === "detail" && selectedPost && (
        <div className="card">
          <h2>설렘 상세 확인</h2>

          {selectedPost.finder_photo_url && (
            <img
              className="profile-preview"
              src={selectedPost.finder_photo_url}
              alt="상대 프로필"
            />
          )}

          <div className="info-box">
            <p>
              <b>상대 닉네임</b> {selectedPost.finder_nickname}
            </p>
            <p>
              <b>상대 학과</b> {selectedPost.finder_department}
            </p>
            <p>
              <b>상대 소개</b> {selectedPost.finder_introduction || "없음"}
            </p>
          </div>

          <div className="info-box">
            <p>
              <b>상대가 남긴 메시지</b>
            </p>
            <p>{selectedPost.message || "메시지가 없어요."}</p>
          </div>

          <div className="info-box">
            <p>
              <b>확인 질문 1</b>
            </p>
            <p>{selectedPost.question_1 || "없음"}</p>
            <p>
              <b>확인 질문 2</b>
            </p>
            <p>{selectedPost.question_2 || "없음"}</p>
          </div>

          <button onClick={() => submitClaim(selectedPost)}>
            저인 것 같아요, 응답하기
          </button>
          <button className="white" onClick={() => setPage("receiveResults")}>
            목록으로
          </button>
        </div>
      )}

      {page === "matching" && (
        <div className="card">
          <h2>매칭 관리</h2>
          <p className="description">
            내가 남긴 설렘과, 그 설렘에 응답한 사람들을 확인할 수 있어요.
          </p>

          {mySentPosts.length === 0 ? (
            <p className="description">아직 내가 남긴 설렘이 없어요.</p>
          ) : (
            mySentPosts.map((post) => {
              const claims = myClaims.filter(
                (claim) => claim.crush_post_id === post.id
              );

              return (
                <div className="result-card" key={post.id}>
                  <p>
                    <b>{post.seen_date}</b> / {post.place} / {post.time_period}
                  </p>
                  <p>
                    {post.top_color} {post.top_type} / {post.target_hair_feature}
                  </p>

                  {claims.length === 0 ? (
                    <>
                      <p className="small-text">
                        아직 응답한 사람이 없어요.
                      </p>
                      <button onClick={() => sendSecondHeart(post)}>
                        2차 설렘 보내기
                      </button>
                    </>
                  ) : (
                    claims.map((claim) => (
                      <div className="claim-box" key={claim.id}>
                        {claim.claimer_photo_url && (
                          <img
                            className="mini-profile"
                            src={claim.claimer_photo_url}
                            alt="응답자"
                          />
                        )}
                        <p>
                          <b>{claim.claimer_nickname}</b> 님이 응답했어요.
                        </p>
                        <p>{claim.claimer_department}</p>
                        <p>{claim.claimer_introduction}</p>
                        <p>
                          <b>인스타</b> @{claim.claimer_instagram}
                        </p>
                        <p className="small-text">{claim.response_message}</p>
                      </div>
                    ))
                  )}
                </div>
              );
            })
          )}

          <button className="white" onClick={() => setPage("home")}>
            홈으로
          </button>
        </div>
      )}
    </div>
  );
}

export default App;