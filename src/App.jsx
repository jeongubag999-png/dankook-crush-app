import { useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

function App() {
  const [page, setPage] = useState("home");
  const [crushStep, setCrushStep] = useState(1);

  const placeOptions = [
    "혜당관 앞",
    "혜당관 내부",
    "중앙도서관 앞",
    "중앙도서관 내부",
    "학생회관 앞",
    "학생회관 내부",
    "상경관 앞",
    "상경관 내부",
    "사범관 앞",
    "사범관 내부",
    "공학관 앞",
    "공학관 내부",
    "곰상 근처",
    "폭포공원 근처",
    "난파음악관 근처",
    "기숙사 방향 길",
    "정문",
    "버스정류장",
    "셔틀버스 탑승장",
    "운동장/체육관 근처",
    "학교 앞 상권",
    "기타/직접 입력",
  ];

  const timeOptions = [
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
    "잘 모르겠음",
  ];

  const genderOptions = ["여자", "남자"];

  const hairOptions = [
    "긴 생머리",
    "긴 웨이브",
    "중단발",
    "단발",
    "묶은 머리",
    "짧은 머리",
    "펌/웨이브",
    "모자 착용",
    "잘 모르겠음",
  ];

  const topTypeOptions = [
    "반팔 티셔츠",
    "긴팔 티셔츠",
    "셔츠",
    "후드티",
    "맨투맨",
    "니트",
    "자켓",
    "코트/패딩",
    "원피스",
    "잘 모르겠음",
  ];

  const topColorOptions = [
    "흰색",
    "검정",
    "회색",
    "네이비",
    "파랑",
    "하늘색",
    "분홍",
    "빨강",
    "베이지",
    "갈색",
    "초록",
    "노랑",
    "패턴/무늬",
    "잘 모르겠음",
  ];

  const bottomTypeOptions = [
    "청바지",
    "슬랙스",
    "면바지",
    "반바지",
    "치마",
    "트레이닝 바지",
    "레깅스",
    "잘 모르겠음",
  ];

  const bottomColorOptions = [
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

  const bagOptions = [
    "백팩",
    "에코백",
    "숄더백",
    "크로스백",
    "토트백",
    "작은 가방",
    "가방 없음",
    "잘 모르겠음",
  ];

  const earphoneOptions = [
    "무선 이어폰",
    "유선 이어폰",
    "헤드셋",
    "없음",
    "잘 모르겠음",
  ];

  const matchOptions = [
    "거의 저 같아요",
    "조금 비슷해요",
    "잘 모르겠어요",
  ];

  const [profile, setProfile] = useState({
    nickname: "",
    department: "",
    student_year: "",
    instagram_id: "",
    bio: "",
    profile_image_url: "",
  });

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");

  const [crushPost, setCrushPost] = useState({
    target_gender: "",
    seen_date: "",
    place: "",
    custom_place: "",
    time_period: "",
    hair_feature: "",
    top_type: "",
    top_color: "",
    bottom_type: "",
    bottom_color: "",
    bag_type: "",
    earphone_type: "",
    message: "",
  });

  const [searchForm, setSearchForm] = useState({
    seen_date: "",
    target_gender: "",
    hair_feature: "",
    clothes_color: "",
    clothes_style: "",
    bottom_type: "",
    bottom_color: "",
  });

  const [searchResults, setSearchResults] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  const [claimForm, setClaimForm] = useState({
    claimer_nickname: "",
    claimer_instagram: "",
    match_level: "",
    claimer_message: "",
  });

  const [matchingClaims, setMatchingClaims] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  const updateCrushPost = (key, value) => {
    setCrushPost((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getFinalPlace = () => {
    if (
      crushPost.place === "기타/직접 입력" ||
      crushPost.place === "학교 앞 상권"
    ) {
      return crushPost.custom_place.trim();
    }

    return crushPost.place;
  };

  const getTargetGenderFromMessage = (message) => {
    if (!message) return "-";

    const match = message.match(/\[찾는 성별:\s*(.*?)\]/);
    return match ? match[1] : "-";
  };

  const cleanMessage = (message) => {
    if (!message) return "";
    return message.replace(/\[찾는 성별:\s*.*?\]\s*/, "");
  };

  const renderPostQuestionAnswer = (post) => {
    return (
      <div className="qaBox">
        <p className="qaTitle">상대가 남긴 질의응답</p>

        <p>
          <strong>찾는 사람:</strong> {getTargetGenderFromMessage(post.message)}
        </p>

        <p>
          <strong>날짜:</strong> {post.seen_date || "-"}
        </p>

        <p>
          <strong>시간:</strong> {post.time_period || "-"}
        </p>

        <p>
          <strong>장소:</strong> {post.place || "-"}
        </p>

        <p>
          <strong>머리:</strong> {post.hair_feature || "-"}
        </p>

        <p>
          <strong>상의/하의:</strong> {post.clothes_color || "-"}{" "}
          {post.clothes_style || "-"}
        </p>

        <p>
          <strong>소지품:</strong> {post.accessory || "-"}
        </p>
      </div>
    );
  };

  const selectAndNext = (key, value) => {
    updateCrushPost(key, value);
    setTimeout(() => {
      setCrushStep((prev) => Math.min(prev + 1, 8));
    }, 120);
  };

  const goBackStep = () => {
    if (crushStep === 1) {
      setPage("home");
      return;
    }
    setCrushStep((prev) => prev - 1);
  };

  const openSendPage = () => {
    setCrushStep(1);
    setPage("send");
  };

  const resetCrushPost = () => {
    setCrushPost({
      target_gender: "",
      seen_date: "",
      place: "",
      custom_place: "",
      time_period: "",
      hair_feature: "",
      top_type: "",
      top_color: "",
      bottom_type: "",
      bottom_color: "",
      bag_type: "",
      earphone_type: "",
      message: "",
    });
    setCrushStep(1);
  };

  const saveProfile = async () => {
    let imageUrl = profile.profile_image_url;

    if (profileImageFile) {
      const fileExt = profileImageFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, profileImageFile);

      if (uploadError) {
        alert("프로필 사진 업로드에 실패했어요: " + uploadError.message);
        console.log(uploadError);
        return;
      }

      const { data } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("profiles").insert([
      {
        nickname: profile.nickname,
        department: profile.department,
        student_year: profile.student_year,
        instagram_id: profile.instagram_id,
        bio: profile.bio,
        profile_image_url: imageUrl,
      },
    ]);

    if (error) {
      alert("프로필 저장에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("프로필이 저장됐어요!");

    setProfileImageFile(null);
    setProfileImagePreview("");
    setPage("home");
  };

  const saveCrushPost = async () => {
    if (!crushPost.target_gender) {
      alert("찾는 이성 성별을 선택해주세요.");
      setCrushStep(1);
      return;
    }

    if (!crushPost.seen_date || !crushPost.time_period) {
      alert("날짜와 시간을 선택해주세요.");
      setCrushStep(2);
      return;
    }

    if (!getFinalPlace()) {
      alert("장소를 선택하거나 직접 입력해주세요.");
      setCrushStep(3);
      return;
    }

    if (!crushPost.hair_feature) {
      alert("머리 특징을 선택해주세요.");
      setCrushStep(4);
      return;
    }

    if (!crushPost.top_type || !crushPost.top_color) {
      alert("상의 종류와 색상을 선택해주세요.");
      setCrushStep(5);
      return;
    }

    if (!crushPost.bottom_type || !crushPost.bottom_color) {
      alert("하의 종류와 색상을 선택해주세요.");
      setCrushStep(6);
      return;
    }

    if (!crushPost.bag_type || !crushPost.earphone_type) {
      alert("가방과 이어폰 정보를 선택해주세요.");
      setCrushStep(7);
      return;
    }

    const combinedStyle = `상의:${crushPost.top_type} / 하의:${crushPost.bottom_type} ${crushPost.bottom_color}`;
    const combinedAccessory = `가방:${crushPost.bag_type} / 이어폰:${crushPost.earphone_type}`;
    const finalMessage = `[찾는 성별: ${crushPost.target_gender}] ${crushPost.message}`;

    const { error } = await supabase.from("crush_posts").insert([
      {
        seen_date: crushPost.seen_date,
        place: getFinalPlace(),
        time_period: crushPost.time_period,
        hair_feature: crushPost.hair_feature,
        clothes_color: crushPost.top_color,
        clothes_style: combinedStyle,
        accessory: combinedAccessory,
        message: finalMessage,
      },
    ]);

    if (error) {
      alert("마음 남기기에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("마음을 남겼어요!");
    resetCrushPost();
    setPage("sent");
  };

  const searchCrushPosts = async () => {
    if (!searchForm.seen_date) {
      alert("날짜를 선택해주세요.");
      return;
    }

    if (!searchForm.target_gender) {
      alert("내 성별을 선택해주세요.");
      return;
    }

    let query = supabase
      .from("crush_posts")
      .select("*")
      .eq("seen_date", searchForm.seen_date)
      .ilike("message", `%[찾는 성별: ${searchForm.target_gender}]%`);

    if (searchForm.hair_feature && searchForm.hair_feature !== "잘 모르겠음") {
      query = query.eq("hair_feature", searchForm.hair_feature);
    }

    if (searchForm.clothes_color && searchForm.clothes_color !== "잘 모르겠음") {
      query = query.eq("clothes_color", searchForm.clothes_color);
    }

    if (searchForm.clothes_style && searchForm.clothes_style !== "잘 모르겠음") {
      query = query.ilike("clothes_style", `%${searchForm.clothes_style}%`);
    }

    if (searchForm.bottom_type && searchForm.bottom_type !== "잘 모르겠음") {
      query = query.ilike("clothes_style", `%하의:${searchForm.bottom_type}%`);
    }

    if (searchForm.bottom_color && searchForm.bottom_color !== "잘 모르겠음") {
      query = query.ilike("clothes_style", `%${searchForm.bottom_color}%`);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      alert("검색에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    setSearchResults(data);
    setPage("result");
  };

  const saveClaim = async () => {
    if (!selectedPost) {
      alert("응답할 마음 글을 찾지 못했어요.");
      return;
    }

    if (!claimForm.claimer_nickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!claimForm.match_level) {
      alert("일치 정도를 선택해주세요.");
      return;
    }

    const finalMessage = `[일치 정도: ${claimForm.match_level}] ${claimForm.claimer_message}`;

    const { error } = await supabase.from("claims").insert([
      {
        crush_post_id: selectedPost.id,
        claimer_nickname: claimForm.claimer_nickname,
        claimer_instagram: claimForm.claimer_instagram,
        claimer_message: finalMessage,
        status: "pending",
      },
    ]);

    if (error) {
      alert("응답 저장에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("응답을 보냈어요!");

    setClaimForm({
      claimer_nickname: "",
      claimer_instagram: "",
      match_level: "",
      claimer_message: "",
    });

    setSelectedPost(null);
    setPage("claim");
  };

  const openMatchingPage = async () => {
    setMatchingLoading(true);
    setPage("matching");

    const { data: claimsData, error: claimsError } = await supabase
      .from("claims")
      .select("*")
      .order("created_at", { ascending: false });

    if (claimsError) {
      alert("매칭 데이터를 불러오지 못했어요: " + claimsError.message);
      console.log(claimsError);
      setMatchingLoading(false);
      return;
    }

    const postIds = claimsData.map((claim) => claim.crush_post_id);

    if (postIds.length === 0) {
      setMatchingClaims([]);
      setMatchingLoading(false);
      return;
    }

    const { data: postsData, error: postsError } = await supabase
      .from("crush_posts")
      .select("*")
      .in("id", postIds);

    if (postsError) {
      alert("마음 글 데이터를 불러오지 못했어요: " + postsError.message);
      console.log(postsError);
      setMatchingLoading(false);
      return;
    }

    const combinedData = claimsData.map((claim) => {
      const post = postsData.find((post) => post.id === claim.crush_post_id);

      return {
        ...claim,
        post,
      };
    });

    setMatchingClaims(combinedData);
    setMatchingLoading(false);
  };

  const acceptClaim = async (claimId) => {
    const { error } = await supabase
      .from("claims")
      .update({ status: "accepted" })
      .eq("id", claimId);

    if (error) {
      alert("수락에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("매칭을 수락했어요!");
    openMatchingPage();
  };

  const OptionButton = ({ value, selected, onClick, full }) => (
    <button
      type="button"
      className={`optionButton ${selected ? "selected" : ""} ${
        full ? "fullOption" : ""
      }`}
      onClick={onClick}
    >
      {value}
    </button>
  );

  const progressPercent = (crushStep / 8) * 100;

  return (
    <div className="app">
      {page === "home" && (
        <div className="card">
          <h1>단꿈</h1>
          <p className="subtitle">
            단국대에서 스친 인연에게, 조심스럽게 마음을 남겨보세요.
          </p>

          <button onClick={openSendPage}>스친 사람 찾기</button>

          <button onClick={() => setPage("search")} className="white">
            내가 받은 설렘 찾기
          </button>

          <button onClick={openMatchingPage} className="white">
            매칭 관리
          </button>

          <button onClick={() => setPage("profile")} className="white">
            내 프로필
          </button>

          <p className="notice">
            서로 수락하기 전까지 인스타 아이디는 공개되지 않습니다.
          </p>
        </div>
      )}

      {page === "profile" && (
        <div className="card">
          <h2>내 프로필</h2>

          <div className="profileImageBox">
            {profileImagePreview ? (
              <img src={profileImagePreview} alt="프로필 미리보기" />
            ) : (
              <div className="profileImagePlaceholder">프로필 사진</div>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];

              if (!file) return;

              setProfileImageFile(file);
              setProfileImagePreview(URL.createObjectURL(file));
            }}
          />

          <input
            placeholder="닉네임 예: 곰돌이23"
            value={profile.nickname}
            onChange={(e) =>
              setProfile({ ...profile, nickname: e.target.value })
            }
          />

          <input
            placeholder="학과 예: 글로벌경영학과"
            value={profile.department}
            onChange={(e) =>
              setProfile({ ...profile, department: e.target.value })
            }
          />

          <input
            placeholder="학번 예: 23학번"
            value={profile.student_year}
            onChange={(e) =>
              setProfile({ ...profile, student_year: e.target.value })
            }
          />

          <input
            placeholder="인스타 아이디"
            value={profile.instagram_id}
            onChange={(e) =>
              setProfile({ ...profile, instagram_id: e.target.value })
            }
          />

          <textarea
            placeholder="한 줄 소개"
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />

          <button onClick={saveProfile}>저장하기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "send" && (
        <div className="card">
          <h2>마음 남기기</h2>

          <p className="stepText">{crushStep} / 8</p>

          <div className="progressBar">
            <div
              className="progressFill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {crushStep === 1 && (
            <>
              <h3 className="questionTitle">누구를 찾고 있나요?</h3>
              <p className="questionDesc">
                내가 그날 마주친 사람의 성별을 선택해주세요.
              </p>

              <div className="optionGrid">
                {genderOptions.map((option) => (
                  <OptionButton
                    key={option}
                    value={option}
                    selected={crushPost.target_gender === option}
                    onClick={() => selectAndNext("target_gender", option)}
                  />
                ))}
              </div>
            </>
          )}

          {crushStep === 2 && (
            <>
              <h3 className="questionTitle">언제 마주쳤나요?</h3>
              <p className="questionDesc">
                시간은 1시간 단위로 선택해주세요. 매칭은 앞뒤 시간까지
                참고할 수 있어요.
              </p>

              <div className="formGroup">
                <label className="formLabel">날짜</label>
                <input
                  type="date"
                  value={crushPost.seen_date}
                  onChange={(e) =>
                    updateCrushPost("seen_date", e.target.value)
                  }
                />
              </div>

              <div className="formGroup">
                <label className="formLabel">시간</label>
                <select
                  value={crushPost.time_period}
                  onChange={(e) =>
                    updateCrushPost("time_period", e.target.value)
                  }
                >
                  <option value="">시간 선택</option>
                  {timeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (!crushPost.seen_date || !crushPost.time_period) {
                    alert("날짜와 시간을 선택해주세요.");
                    return;
                  }
                  setCrushStep(3);
                }}
              >
                다음
              </button>
            </>
          )}

          {crushStep === 3 && (
            <>
              <h3 className="questionTitle">어디에서 봤나요?</h3>
              <p className="questionDesc">
                장소는 최대한 가까운 구역을 선택해주세요. 학교 앞 상권이나
                기타 장소는 직접 입력할 수 있어요.
              </p>

              <select
                value={crushPost.place}
                onChange={(e) =>
                  setCrushPost({
                    ...crushPost,
                    place: e.target.value,
                    custom_place:
                      e.target.value === "기타/직접 입력" ||
                      e.target.value === "학교 앞 상권"
                        ? crushPost.custom_place
                        : "",
                  })
                }
              >
                <option value="">장소 선택</option>
                {placeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>

              {(crushPost.place === "기타/직접 입력" ||
                crushPost.place === "학교 앞 상권") && (
                <input
                  placeholder={
                    crushPost.place === "학교 앞 상권"
                      ? "학교 앞 상권 장소 예: 보정동 카페거리, 죽전역 근처"
                      : "장소를 직접 입력해주세요 예: 공학관 2층 복도"
                  }
                  value={crushPost.custom_place}
                  onChange={(e) =>
                    updateCrushPost("custom_place", e.target.value)
                  }
                />
              )}

              <button
                onClick={() => {
                  if (!getFinalPlace()) {
                    alert("장소를 선택하거나 직접 입력해주세요.");
                    return;
                  }
                  setCrushStep(4);
                }}
              >
                다음
              </button>
            </>
          )}

          {crushStep === 4 && (
            <>
              <h3 className="questionTitle">머리 스타일이 기억나나요?</h3>
              <p className="questionDesc">
                가장 비슷한 머리 특징을 선택해주세요.
              </p>

              <div className="optionGrid">
                {hairOptions.map((option) => (
                  <OptionButton
                    key={option}
                    value={option}
                    selected={crushPost.hair_feature === option}
                    onClick={() => selectAndNext("hair_feature", option)}
                    full={option === "잘 모르겠음"}
                  />
                ))}
              </div>
            </>
          )}

          {crushStep === 5 && (
            <>
              <h3 className="questionTitle">상의가 기억나나요?</h3>
              <p className="questionDesc">
                상의 종류와 색상을 각각 선택해주세요.
              </p>

              <div className="formGroup">
                <label className="formLabel">상의 종류</label>
                <select
                  value={crushPost.top_type}
                  onChange={(e) => updateCrushPost("top_type", e.target.value)}
                >
                  <option value="">상의 종류 선택</option>
                  {topTypeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">상의 색상</label>
                <select
                  value={crushPost.top_color}
                  onChange={(e) => updateCrushPost("top_color", e.target.value)}
                >
                  <option value="">상의 색상 선택</option>
                  {topColorOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (!crushPost.top_type || !crushPost.top_color) {
                    alert("상의 종류와 색상을 선택해주세요.");
                    return;
                  }
                  setCrushStep(6);
                }}
              >
                다음
              </button>
            </>
          )}

          {crushStep === 6 && (
            <>
              <h3 className="questionTitle">하의가 기억나나요?</h3>
              <p className="questionDesc">
                하의 종류와 색상을 각각 선택해주세요.
              </p>

              <div className="formGroup">
                <label className="formLabel">하의 종류</label>
                <select
                  value={crushPost.bottom_type}
                  onChange={(e) =>
                    updateCrushPost("bottom_type", e.target.value)
                  }
                >
                  <option value="">하의 종류 선택</option>
                  {bottomTypeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">하의 색상</label>
                <select
                  value={crushPost.bottom_color}
                  onChange={(e) =>
                    updateCrushPost("bottom_color", e.target.value)
                  }
                >
                  <option value="">하의 색상 선택</option>
                  {bottomColorOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (!crushPost.bottom_type || !crushPost.bottom_color) {
                    alert("하의 종류와 색상을 선택해주세요.");
                    return;
                  }
                  setCrushStep(7);
                }}
              >
                다음
              </button>
            </>
          )}

          {crushStep === 7 && (
            <>
              <h3 className="questionTitle">소지품이 기억나나요?</h3>
              <p className="questionDesc">
                가방과 이어폰/헤드셋 여부를 선택해주세요.
              </p>

              <div className="formGroup">
                <label className="formLabel">가방</label>
                <select
                  value={crushPost.bag_type}
                  onChange={(e) => updateCrushPost("bag_type", e.target.value)}
                >
                  <option value="">가방 선택</option>
                  {bagOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">이어폰/헤드셋</label>
                <select
                  value={crushPost.earphone_type}
                  onChange={(e) =>
                    updateCrushPost("earphone_type", e.target.value)
                  }
                >
                  <option value="">이어폰 선택</option>
                  {earphoneOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (!crushPost.bag_type || !crushPost.earphone_type) {
                    alert("가방과 이어폰 정보를 선택해주세요.");
                    return;
                  }
                  setCrushStep(8);
                }}
              >
                다음
              </button>
            </>
          )}

          {crushStep === 8 && (
            <>
              <h3 className="questionTitle">마지막으로 확인해주세요</h3>
              <p className="questionDesc">
                기억이 정확하지 않아도 괜찮아요. 조심스럽게 마음을
                남겨주세요.
              </p>

              <textarea
                placeholder="짧은 메시지 예: 분위기가 좋아 보여서 조심스럽게 마음 남겨요."
                value={crushPost.message}
                onChange={(e) => updateCrushPost("message", e.target.value)}
              />

              <div className="summaryBox">
                <p>
                  <strong>찾는 사람:</strong> {crushPost.target_gender || "-"}
                </p>
                <p>
                  <strong>날짜:</strong> {crushPost.seen_date || "-"}
                </p>
                <p>
                  <strong>시간:</strong> {crushPost.time_period || "-"}
                </p>
                <p>
                  <strong>장소:</strong> {getFinalPlace() || "-"}
                </p>
                <p>
                  <strong>머리:</strong> {crushPost.hair_feature || "-"}
                </p>
                <p>
                  <strong>상의:</strong> {crushPost.top_color || "-"}{" "}
                  {crushPost.top_type || "-"}
                </p>
                <p>
                  <strong>하의:</strong> {crushPost.bottom_color || "-"}{" "}
                  {crushPost.bottom_type || "-"}
                </p>
                <p>
                  <strong>소지품:</strong> {crushPost.bag_type || "-"},{" "}
                  {crushPost.earphone_type || "-"}
                </p>
              </div>

              <button onClick={saveCrushPost}>그날의 마음 남기기</button>
            </>
          )}

          <div className="stepActions">
            <button onClick={goBackStep} className="white">
              {crushStep === 1 ? "홈으로" : "이전"}
            </button>

            <button
              onClick={() => {
                resetCrushPost();
                setPage("home");
              }}
              className="white"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {page === "sent" && (
        <div className="card">
          <h2>마음을 남겼어요</h2>
          <p className="subtitle">
            상대가 본인이라고 생각하고 응답하면 매칭 관리에서 확인할 수
            있어요.
          </p>

          <button onClick={openMatchingPage}>매칭 관리로 가기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "search" && (
        <div className="card">
          <h2>내가 받은 설렘 찾기</h2>
          <p className="subtitle">
            오늘의 착장과 인상착의를 올리면, 나를 찾고 있는 마음을 확인할
            수 있어요.
          </p>

          <div className="formGroup">
            <label className="formLabel">언제 있었나요?</label>
            <input
              type="date"
              value={searchForm.seen_date}
              onChange={(e) =>
                setSearchForm({ ...searchForm, seen_date: e.target.value })
              }
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">나는 누구인가요?</label>
            <div className="optionGrid twoColumns">
              {genderOptions.map((option) => (
                <OptionButton
                  key={option}
                  value={option}
                  selected={searchForm.target_gender === option}
                  onClick={() =>
                    setSearchForm({ ...searchForm, target_gender: option })
                  }
                />
              ))}
            </div>
          </div>

          <div className="formGroup">
            <label className="formLabel">내 머리는 어땠나요?</label>
            <select
              value={searchForm.hair_feature}
              onChange={(e) =>
                setSearchForm({ ...searchForm, hair_feature: e.target.value })
              }
            >
              <option value="">머리 특징 선택</option>
              {hairOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label className="formLabel">상의 색상은 무엇이었나요?</label>
            <select
              value={searchForm.clothes_color}
              onChange={(e) =>
                setSearchForm({ ...searchForm, clothes_color: e.target.value })
              }
            >
              <option value="">상의 색상 선택</option>
              {topColorOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label className="formLabel">상의 종류는 무엇이었나요?</label>
            <select
              value={searchForm.clothes_style}
              onChange={(e) =>
                setSearchForm({ ...searchForm, clothes_style: e.target.value })
              }
            >
              <option value="">상의 종류 선택</option>
              {topTypeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label className="formLabel">하의 종류는 무엇이었나요?</label>
            <select
              value={searchForm.bottom_type}
              onChange={(e) =>
                setSearchForm({ ...searchForm, bottom_type: e.target.value })
              }
            >
              <option value="">하의 종류 선택</option>
              {bottomTypeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label className="formLabel">하의 색상은 무엇이었나요?</label>
            <select
              value={searchForm.bottom_color}
              onChange={(e) =>
                setSearchForm({ ...searchForm, bottom_color: e.target.value })
              }
            >
              <option value="">하의 색상 선택</option>
              {bottomColorOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <p className="helperText">
            날짜와 내 성별은 필수예요. 머리, 상의, 하의 정보는 선택하면 더
            정확하게 찾을 수 있어요.
          </p>

          <button onClick={searchCrushPosts}>나를 찾는 마음 확인하기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "result" && (
        <div className="card">
          <h2>나를 찾는 마음 {searchResults.length}개</h2>

          {searchResults.length === 0 && (
            <p className="notice">
              아직 비슷한 마음이 없어요. 날짜를 다시 확인하거나,
              머리와 옷 조건을 조금 줄여서 다시 찾아보세요.
            </p>
          )}

          {searchResults.map((post) => (
            <div className="post" key={post.id}>
              <p>
                <b>
                  {post.seen_date}, {post.time_period}, {post.place}
                </b>
              </p>

              {renderPostQuestionAnswer(post)}

              <p className="message">“{cleanMessage(post.message)}”</p>

              <button
                onClick={() => {
                  setSelectedPost(post);
                  setPage("claimForm");
                }}
              >
                이거 나인 것 같아요
              </button>
            </div>
          ))}

          <button onClick={() => setPage("search")} className="white">
            다시 찾아보기
          </button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "claimForm" && (
        <div className="card">
          <h2>이 마음에 응답하기</h2>

          {selectedPost && (
            <div className="post">
              <p>
                <b>
                  {selectedPost.seen_date}, {selectedPost.time_period},{" "}
                  {selectedPost.place}
                </b>
              </p>

              {renderPostQuestionAnswer(selectedPost)}

              <p className="message">“{cleanMessage(selectedPost.message)}”</p>
            </div>
          )}

          <select
            value={claimForm.match_level}
            onChange={(e) =>
              setClaimForm({
                ...claimForm,
                match_level: e.target.value,
              })
            }
          >
            <option value="">이 글이 나와 얼마나 비슷한가요?</option>
            {matchOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <input
            placeholder="내 닉네임 예: 파란하늘"
            value={claimForm.claimer_nickname}
            onChange={(e) =>
              setClaimForm({
                ...claimForm,
                claimer_nickname: e.target.value,
              })
            }
          />

          <input
            placeholder="내 인스타 아이디 선택사항 예: @dankum_test"
            value={claimForm.claimer_instagram}
            onChange={(e) =>
              setClaimForm({
                ...claimForm,
                claimer_instagram: e.target.value,
              })
            }
          />

          <textarea
            placeholder="상대에게 남길 말 예: 저 맞는 것 같아요!"
            value={claimForm.claimer_message}
            onChange={(e) =>
              setClaimForm({
                ...claimForm,
                claimer_message: e.target.value,
              })
            }
          />

          <button onClick={saveClaim}>응답 보내기</button>

          <button onClick={() => setPage("result")} className="white">
            뒤로가기
          </button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "claim" && (
        <div className="card">
          <h2>응답을 보냈어요</h2>
          <p className="subtitle">
            마음을 남긴 사람이 수락하면 서로의 프로필을 볼 수 있어요.
          </p>

          <button onClick={openMatchingPage}>매칭 관리로 가기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "matching" && (
        <div className="card">
          <h2>매칭 관리</h2>

          {matchingLoading && <p className="notice">불러오는 중이에요...</p>}

          {!matchingLoading && matchingClaims.length === 0 && (
            <p className="notice">아직 받은 응답이 없어요.</p>
          )}

          {!matchingLoading &&
            matchingClaims.map((claim) => (
              <div className="post" key={claim.id}>
                <p>
                  <b>나에게 온 응답</b>
                </p>

                {claim.post ? (
                  <>
                    <p>
                      원래 마음 글: {claim.post.seen_date},{" "}
                      {claim.post.time_period}, {claim.post.place}
                    </p>

                    {renderPostQuestionAnswer(claim.post)}

                    <p className="message">
                      “{cleanMessage(claim.post.message)}”
                    </p>
                  </>
                ) : (
                  <p className="notice">연결된 마음 글을 찾지 못했어요.</p>
                )}

                <hr />

                <p>
                  응답한 사람 닉네임: <b>{claim.claimer_nickname}</b>
                </p>

                <p className="message">“{claim.claimer_message}”</p>

                <p>상태: {claim.status}</p>

                {claim.status === "pending" && (
                  <button onClick={() => acceptClaim(claim.id)}>
                    수락하기
                  </button>
                )}

                {claim.status === "accepted" && (
                  <div className="notice">
                    <p>매칭이 수락됐어요.</p>
                    <p>
                      상대 인스타: <b>{claim.claimer_instagram}</b>
                    </p>
                  </div>
                )}
              </div>
            ))}

          <button onClick={openMatchingPage} className="white">
            새로고침
          </button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}
    </div>
  );
}

export default App;