import { useEffect, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

function App() {
  const [page, setPage] = useState("home");
  const [crushStep, setCrushStep] = useState(1);
  const [searchStep, setSearchStep] = useState(1);

  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const profileLoadedUserIdRef = useRef(null);

  const [authForm, setAuthForm] = useState({
    name: "",
    student_id: "",
    login_id: "",
    password: "",
  });

  const placeOptions = [
    "혜당관",
    "퇴계기념중앙도서관",
    "학생회관",
    "상경관",
    "사범관",
    "인문관",
    "사회과학관",
    "법학관/대학원동",
    "국제관",
    "미술관",
    "난파음악관",
    "무용관",
    "제1공학관",
    "제2공학관",
    "제3공학관",
    "소프트웨어ICT관",
    "종합실험동",
    "미디어센터",
    "범정관/대학본부",
    "석주선기념박물관",
    "체육관",
    "대운동장",
    "학군단",
    "복지관",
    "베어토피아",
    "웅비홀",
    "집현재1",
    "집현재2",
    "정문",
    "버스정류장",
    "셔틀버스 탑승장",
    "곰상 근처",
    "폭포공원 근처",
    "기숙사 방향 길",
    "학교 앞 상권/거리",
    "죽전역 근처",
    "보정동 카페거리",
    "잘 모르겠음",
    "기타/직접 입력",
  ];

  const timeOptions = [
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

  const genderOptions = ["여자", "남자"];

  const femaleHairStyleOptions = [
    "장발",
    "중단발",
    "단발",
    "묶음머리",
    "포니테일",
    "잘 모르겠음",
  ];

  const maleHairStyleOptions = [
    "짧은 머리",
    "댄디컷",
    "가르마펌",
    "애즈펌",
    "리젠트컷",
    "스포츠머리",
    "장발",
    "묶음머리",
    "포니테일",
    "잘 모르겠음",
  ];

  const hairColorOptions = [
    "검정/흑발",
    "갈색 계열",
    "금발/탈색",
    "빨강/와인",
    "회색/애쉬",
    "핑크/보라",
    "파랑",
    "초록",
    "잘 모르겠음",
  ];

  const hatOptions = ["모자 착용", "모자 없음", "잘 모르겠음"];

  const bangsOptions = ["앞머리 있음", "앞머리 없음", "잘 모르겠음"];

  const makeHairFeature = (style, color, hat, bangs) => {
    if (!style || !color || !hat || !bangs) return "";
    return `${style} / ${color} / ${hat} / ${bangs}`;
  };

  const getFinalHairFeature = () => {
    if (crushPost.target_gender === "여자") {
      return makeHairFeature(
        crushPost.female_hair_style,
        crushPost.female_hair_color,
        crushPost.female_hat,
        crushPost.female_bangs
      );
    }

    if (crushPost.target_gender === "남자") {
      return makeHairFeature(
        crushPost.male_hair_style,
        crushPost.male_hair_color,
        crushPost.male_hat,
        crushPost.male_bangs
      );
    }

    return "";
  };

  const getFinalSearchHairFeature = () => {
    if (profile.gender === "여자") {
      return makeHairFeature(
        searchForm.female_hair_style,
        searchForm.female_hair_color,
        searchForm.female_hat,
        searchForm.female_bangs
      );
    }

    if (profile.gender === "남자") {
      return makeHairFeature(
        searchForm.male_hair_style,
        searchForm.male_hair_color,
        searchForm.male_hat,
        searchForm.male_bangs
      );
    }

    return "";
  };

  const topTypeOptions = [
    "반팔 티셔츠",
    "긴팔 티셔츠",
    "셔츠/블라우스",
    "후드티",
    "맨투맨",
    "니트",
    "가디건",
    "자켓",
    "코트/패딩",
    "학잠/과잠",
    "원피스",
    "군복",
    "잘 모르겠음",
  ];

  const topColorOptions = [
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

  const bottomTypeOptions = [
    "청바지",
    "슬랙스",
    "면바지",
    "반바지",
    "치마",
    "트레이닝 바지",
    "레깅스",
    "기타",
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
    "헬스가방",
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

  const heightFeelingOptions = ["크다", "보통이다", "작다", "잘 모르겠음"];

  const shoeOptions = [
    "운동화",
    "컨버스/반스 느낌",
    "구두/로퍼",
    "부츠",
    "샌들/슬리퍼",
    "크록스",
    "잘 모르겠음",
  ];

  const togetherSituationOptions = [
    "이동 중이었음",
    "공부/과제 중이었음",
    "밥 먹는 중이었음",
    "카페에 있었음",
    "기다리는 중이었음",
    "통화 중이었음",
    "대화 중이었음",
    "술자리/모임 중이었음",
    "잘 모르겠음",
  ];

  const moodOptions = [
    "강아지상 느낌",
    "고양이상 느낌",
    "차분한 분위기",
    "밝고 활발한 분위기",
    "귀여운 분위기",
    "시크한 분위기",
    "깔끔한 분위기",
    "힙한 분위기",
    "따뜻한 분위기",
    "조용한 분위기",
    "잘 모르겠음",
  ];

  const matchOptions = ["거의 저 같아요", "조금 비슷해요", "잘 모르겠어요"];

  const [profile, setProfile] = useState({
    nickname: "",
    gender: "",
    department: "",
    student_year: "",
    instagram_id: "",
    bio: "",
    profile_image_url: "",
  });

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");

  const emptyCrushPost = {
    target_gender: "",
    seen_date: "",
    place: "",
    custom_place: "",
    time_period: "",
    hair_feature: "",
    female_hair_style: "",
    female_hair_color: "",
    female_hat: "",
    female_bangs: "",
    male_hair_style: "",
    male_hair_color: "",
    male_hat: "",
    male_bangs: "",
    top_type: "",
    top_color: "",
    bottom_type: "",
    bottom_color: "",
    bottom_custom: "",
    bag_type: "",
    earphone_type: "",
    height_feeling: "",
    shoe_type: "",
    together_situation: "",
    situation_detail: "",
    mood: "",
    mood_detail: "",
    message: "",
  };

  const [crushPost, setCrushPost] = useState(emptyCrushPost);

  const [searchForm, setSearchForm] = useState({
    seen_date: "",
    hair_feature: "",
    female_hair_style: "",
    female_hair_color: "",
    female_hat: "",
    female_bangs: "",
    male_hair_style: "",
    male_hair_color: "",
    male_hat: "",
    male_bangs: "",
    top_type: "",
    top_color: "",
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

  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingMode, setMatchingMode] = useState("sent");
  const [activityDate, setActivityDate] = useState("");

  const [mySentPosts, setMySentPosts] = useState([]);
  const [sentClaims, setSentClaims] = useState([]);
  const [receivedClaims, setReceivedClaims] = useState([]);

  const femaleHairGuideImage = "/hair-length-guide.png";

  const getDraftKey = () => {
    if (!currentUser?.id) return "dankum_crush_draft_guest";
    return `dankum_crush_draft_${currentUser.id}`;
  };

  const updateCrushPost = (key, value) => {
    setCrushPost((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const cleanInstagram = (value) => {
    if (!value) return "";
    return value.trim().replace("@", "");
  };

  const makeAuthEmail = (loginId) => {
    const rawId = loginId.trim();

    const encodedId = btoa(unescape(encodeURIComponent(rawId)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    return `user-${encodedId}@dankum.app`;
  };

  const getFinalPlace = () => {
    const mainPlace = crushPost.place;
    const detailPlace = crushPost.custom_place.trim();

    if (!mainPlace) return "";

    if (mainPlace === "기타/직접 입력") {
      return detailPlace;
    }

    if (detailPlace) {
      return `${mainPlace} - ${detailPlace}`;
    }

    return mainPlace;
  };

  const getFinalBottomType = () => {
    if (crushPost.bottom_type === "기타" && crushPost.bottom_custom.trim()) {
      return `기타:${crushPost.bottom_custom.trim()}`;
    }

    return crushPost.bottom_type;
  };

  const getFinalSituation = () => {
    if (crushPost.situation_detail.trim()) {
      return `${crushPost.together_situation} / 자세히:${crushPost.situation_detail.trim()}`;
    }

    return crushPost.together_situation;
  };

  const getFinalMood = () => {
    if (crushPost.mood_detail.trim()) {
      return `${crushPost.mood} / 자세히:${crushPost.mood_detail.trim()}`;
    }

    return crushPost.mood;
  };

  const resetProfile = () => {
    setProfile({
      nickname: "",
      gender: "",
      department: "",
      student_year: "",
      instagram_id: "",
      bio: "",
      profile_image_url: "",
    });

    setProfileImageFile(null);
    setProfileImagePreview("");
  };

  const loadMyProfile = async (user, force = false) => {
    if (!user) return;

    if (!force && profileLoadedUserIdRef.current === user.id) {
      return;
    }

    profileLoadedUserIdRef.current = user.id;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "nickname, gender, department, student_year, instagram_id, bio, profile_image_url"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.log(error);
      profileLoadedUserIdRef.current = null;
      return;
    }

    if (data) {
      setProfile({
        nickname: data.nickname || "",
        gender: data.gender || "",
        department: data.department || "",
        student_year: data.student_year || "",
        instagram_id: data.instagram_id || "",
        bio: data.bio || "",
        profile_image_url: data.profile_image_url || "",
      });
    } else {
      setProfile((prev) => ({
        ...prev,
        nickname: user?.user_metadata?.name || "",
        student_year: user?.user_metadata?.student_id || "",
      }));
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setAuthLoading(true);

      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      const savedSession = data.session;
      const savedUser = savedSession?.user || null;

      setSession(savedSession);
      setCurrentUser(savedUser);
      setAuthLoading(false);

      if (savedUser) {
        loadMyProfile(savedUser);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      const newUser = newSession?.user || null;

      setSession(newSession);
      setCurrentUser(newUser);
      setAuthLoading(false);

      if (newUser) {
        if (event !== "INITIAL_SESSION") {
          loadMyProfile(newUser);
        }
      } else {
        profileLoadedUserIdRef.current = null;
        resetProfile();
        setPage("home");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const scrollFocusedInputIntoView = (event) => {
      const target = event.target;
      const tagName = target?.tagName;

      if (!["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;

      setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 260);
    };

    window.addEventListener("focusin", scrollFocusedInputIntoView);

    return () => {
      window.removeEventListener("focusin", scrollFocusedInputIntoView);
    };
  }, []);

  const handleSignUp = async () => {
    const loginId = authForm.login_id.trim();

    if (!authForm.name.trim()) {
      alert("닉네임 또는 이름을 입력해주세요.");
      return;
    }

    if (!authForm.student_id.trim()) {
      alert("학번을 입력해주세요.");
      return;
    }

    if (!loginId) {
      alert("아이디를 입력해주세요.");
      return;
    }

    if (loginId.length < 4) {
      alert("아이디는 4자 이상으로 입력해주세요.");
      return;
    }

    if (loginId.length > 30) {
      alert("아이디는 30자 이하로 입력해주세요.");
      return;
    }

    if (authForm.password.length < 6) {
      alert("비밀번호는 6자리 이상으로 입력해주세요.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: makeAuthEmail(loginId),
      password: authForm.password,
      options: {
        data: {
          name: authForm.name.trim(),
          student_id: authForm.student_id.trim(),
          login_id: loginId,
        },
      },
    });

    if (error) {
      alert("회원가입에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    const signedUpUser = data.session?.user || data.user || null;

    setSession(data.session || null);
    setCurrentUser(signedUpUser);

    setProfile((prev) => ({
      ...prev,
      nickname: authForm.name.trim(),
      student_year: authForm.student_id.trim(),
    }));

    alert("회원가입이 완료됐어요. 이제 프로필을 작성해주세요.");

    if (signedUpUser) {
      setPage("profile");
    } else {
      setAuthMode("login");
    }
  };

  const handleLogin = async () => {
    const loginId = authForm.login_id.trim();

    if (!loginId || !authForm.password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: makeAuthEmail(loginId),
      password: authForm.password,
    });

    if (error) {
      alert("로그인에 실패했어요. 아이디와 비밀번호를 확인해주세요.");
      console.log(error);
      return;
    }

    setSession(data.session);
    setCurrentUser(data.user);
    setPage("home");

    loadMyProfile(data.user, true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setCurrentUser(null);
    resetProfile();

    setAuthForm({
      name: "",
      student_id: "",
      login_id: "",
      password: "",
    });

    setAuthMode("login");
    setPage("home");
  };

  const saveDraft = () => {
    if (!currentUser) {
      alert("로그인 후 임시저장을 사용할 수 있어요.");
      return;
    }

    localStorage.setItem(
      getDraftKey(),
      JSON.stringify({
        crushPost,
        crushStep,
        savedAt: new Date().toISOString(),
      })
    );

    alert("작성 중인 구름을 임시저장했어요.");
  };

  const loadDraft = () => {
    const saved = localStorage.getItem(getDraftKey());

    if (!saved) {
      alert("불러올 임시저장이 없어요.");
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      setCrushPost({
        ...emptyCrushPost,
        ...(parsed.crushPost || {}),
      });

      setCrushStep(parsed.crushStep || 1);
      setPage("send");

      alert("임시저장한 구름을 불러왔어요.");
    } catch (error) {
      console.log(error);
      alert("임시저장을 불러오지 못했어요.");
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(getDraftKey());
    alert("임시저장을 삭제했어요.");
  };

  const renderPostQuestionAnswer = (post) => {
    return (
      <div className="qaBox">
        <p className="qaTitle">상대가 기억한 정보</p>

        <p>
          <strong>찾는 사람:</strong> {post.target_gender || "-"}
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
          <strong>상의:</strong> {post.clothes_color || "-"}{" "}
          {post.clothes_style?.replace("상의:", "").split("/")[0] || "-"}
        </p>

        <p>
          <strong>하의:</strong>{" "}
          {post.clothes_style?.includes("하의:")
            ? post.clothes_style.split("하의:")[1]
            : "-"}
        </p>

        <p>
          <strong>소지품/상황:</strong> {post.accessory || "-"}
        </p>
      </div>
    );
  };

  const cleanMessage = (message) => {
    if (!message) return "";
    return message.replace(/\[찾는 성별:\s*.*?\]\s*/, "");
  };

  const formatDateLabel = (dateText) => {
    if (!dateText) return "날짜 없음";

    const [year, month, day] = dateText.split("-");

    if (!year || !month || !day) return dateText;

    return `${Number(month)}월 ${Number(day)}일`;
  };

  const formatShortDateTime = (dateTimeText) => {
    if (!dateTimeText) return "";

    const date = new Date(dateTimeText);

    if (Number.isNaN(date.getTime())) return "";

    return `${date.getMonth() + 1}/${date.getDate()} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const groupSentPostsByDate = (posts) => {
    return posts.reduce((acc, post) => {
      const key = post.seen_date || "날짜 없음";

      if (!acc[key]) acc[key] = [];
      acc[key].push(post);

      return acc;
    }, {});
  };

  const selectTargetGenderAndNext = (value) => {
    setCrushPost((prev) => ({
      ...prev,
      target_gender: value,
      hair_feature: "",
      female_hair_style: "",
      female_hair_color: "",
      female_hat: "",
      female_bangs: "",
      male_hair_style: "",
      male_hair_color: "",
      male_hat: "",
      male_bangs: "",
    }));

    setTimeout(() => {
      setCrushStep(2);
    }, 120);
  };

  const goBackStep = () => {
    if (crushStep === 1) {
      setPage("home");
      return;
    }

    setCrushStep((prev) => prev - 1);
  };

  const checkProfileRequired = () => {
    if (!currentUser) {
      alert("먼저 로그인 또는 회원가입을 해주세요.");
      return false;
    }

    if (!profile.nickname) {
      alert("먼저 내 프로필에서 닉네임을 입력해주세요.");
      setPage("profile");
      return false;
    }

    if (!profile.gender) {
      alert("먼저 내 프로필에서 성별을 선택해주세요.");
      setPage("profile");
      return false;
    }

    if (!profile.instagram_id) {
      alert("먼저 내 프로필에서 인스타 아이디를 입력해주세요.");
      setPage("profile");
      return false;
    }

    return true;
  };

  const openSendPage = () => {
    if (!checkProfileRequired()) return;

    setCrushStep(1);
    setPage("send");
  };

  const openSearchPage = () => {
    if (!checkProfileRequired()) return;

    setSearchStep(1);
    setPage("search");
  };

  const openProfilePage = async () => {
    if (!checkProfileRequired()) return;

    setPage("profile");
    await loadMyActivityData();
  };

  const resetCrushPost = () => {
    setCrushPost(emptyCrushPost);
    setCrushStep(1);
  };

  const saveProfile = async () => {
    if (!currentUser) {
      alert("먼저 로그인해주세요.");
      return;
    }

    if (!profile.nickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!profile.gender) {
      alert("성별을 선택해주세요.");
      return;
    }

    if (!profile.instagram_id) {
      alert("인스타 아이디를 입력해주세요.");
      return;
    }

    let imageUrl = profile.profile_image_url;

    if (profileImageFile) {
      const fileExt = profileImageFile.name.split(".").pop();
      const fileName = `${currentUser.id}/${Date.now()}-${Math.random()
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

    const { error } = await supabase.from("profiles").upsert(
      [
        {
          user_id: currentUser.id,
          nickname: profile.nickname,
          gender: profile.gender,
          department: profile.department,
          student_year: profile.student_year,
          instagram_id: cleanInstagram(profile.instagram_id),
          bio: profile.bio,
          profile_image_url: imageUrl,
        },
      ],
      { onConflict: "user_id" }
    );

    if (error) {
      alert("프로필 저장에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    setProfile({
      ...profile,
      instagram_id: cleanInstagram(profile.instagram_id),
      profile_image_url: imageUrl,
    });

    profileLoadedUserIdRef.current = currentUser.id;

    alert("프로필이 저장됐어요!");

    setProfileImageFile(null);
    setProfileImagePreview("");
    setPage("home");
  };

  const saveCrushPost = async () => {
    if (!checkProfileRequired()) return;

    if (!crushPost.target_gender) {
      alert("찾는 사람의 성별을 선택해주세요.");
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

    const finalHairFeature = getFinalHairFeature();

    if (!finalHairFeature) {
      alert("머리스타일, 머리 색깔, 모자 유무, 앞머리 유무를 선택해주세요.");
      setCrushStep(4);
      return;
    }

    if (!crushPost.top_type || !crushPost.top_color) {
      alert("상의 종류와 색상을 선택해주세요.");
      setCrushStep(5);
      return;
    }

    if (!getFinalBottomType() || !crushPost.bottom_color) {
      alert("하의 종류와 색상을 선택해주세요.");
      setCrushStep(6);
      return;
    }

    if (!crushPost.bag_type || !crushPost.earphone_type) {
      alert("가방과 이어폰 정보를 선택해주세요.");
      setCrushStep(7);
      return;
    }

    if (
      !crushPost.height_feeling ||
      !crushPost.shoe_type ||
      !crushPost.together_situation ||
      !crushPost.mood
    ) {
      alert("키 느낌, 신발, 같이 있었던 상황, 분위기를 선택해주세요.");
      setCrushStep(8);
      return;
    }

    const combinedStyle = `상의:${crushPost.top_type} / 하의:${getFinalBottomType()} ${crushPost.bottom_color}`;
    const combinedAccessory = `가방:${crushPost.bag_type} / 이어폰:${crushPost.earphone_type} / 키 느낌:${crushPost.height_feeling} / 신발:${crushPost.shoe_type} / 상황:${getFinalSituation()} / 분위기:${getFinalMood()}`;

    const { error } = await supabase.from("crush_posts").insert([
      {
        seen_date: crushPost.seen_date,
        place: getFinalPlace(),
        time_period: crushPost.time_period,
        hair_feature: finalHairFeature,
        clothes_color: crushPost.top_color,
        clothes_style: combinedStyle,
        accessory: combinedAccessory,
        message: crushPost.message,
        sender_user_id: currentUser.id,
        sender_nickname: profile.nickname,
        sender_instagram: cleanInstagram(profile.instagram_id),
        sender_gender: profile.gender,
        target_gender: crushPost.target_gender,
      },
    ]);

    if (error) {
      alert("구름 남기기에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    localStorage.removeItem(getDraftKey());

    alert("구름을 남겼어요!");
    resetCrushPost();
    setPage("sent");
  };

  const searchCrushPosts = async () => {
    if (!checkProfileRequired()) return;

    if (!searchForm.seen_date) {
      alert("날짜를 선택해주세요.");
      return;
    }

    const finalSearchHairFeature = getFinalSearchHairFeature();

    if (!finalSearchHairFeature) {
      alert(
        "머리 정보를 선택해주세요. 날짜, 성별, 머리스타일, 머리 색깔, 모자, 앞머리가 맞아야 구름을 확인할 수 있어요."
      );
      return;
    }

    let query = supabase
      .from("crush_posts")
      .select("*")
      .eq("seen_date", searchForm.seen_date)
      .eq("target_gender", profile.gender);

    const searchableHairParts = finalSearchHairFeature
      .split(" / ")
      .filter((part) => part && part !== "잘 모르겠음");

    if (searchableHairParts.length === 4) {
      query = query.eq("hair_feature", finalSearchHairFeature);
    } else {
      searchableHairParts.forEach((part) => {
        query = query.ilike("hair_feature", `%${part}%`);
      });
    }

    if (searchForm.top_color && searchForm.top_color !== "잘 모르겠음") {
      query = query.eq("clothes_color", searchForm.top_color);
    }

    if (searchForm.top_type && searchForm.top_type !== "잘 모르겠음") {
      query = query.ilike("clothes_style", `%상의:${searchForm.top_type}%`);
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

    setSearchResults(data || []);
    setPage("result");
  };

  const saveClaim = async () => {
    if (!selectedPost) {
      alert("응답할 구름 글을 찾지 못했어요.");
      return;
    }

    if (!checkProfileRequired()) return;

    if (!claimForm.match_level) {
      alert("일치 정도를 선택해주세요.");
      return;
    }

    const finalMessage = `[일치 정도: ${claimForm.match_level}] ${claimForm.claimer_message}`;

    const { error } = await supabase.from("claims").insert([
      {
        crush_post_id: selectedPost.id,
        claimer_user_id: currentUser.id,
        claimer_nickname: profile.nickname,
        claimer_instagram: cleanInstagram(profile.instagram_id),
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

  const loadMyActivityData = async () => {
    if (!currentUser) return false;

    setMatchingLoading(true);

    setMySentPosts([]);
    setSentClaims([]);
    setReceivedClaims([]);

    const { data: myPosts, error: postsError } = await supabase
      .from("crush_posts")
      .select("*")
      .eq("sender_user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (postsError) {
      alert("내가 띄운 구름을 불러오지 못했어요: " + postsError.message);
      console.log(postsError);
      setMatchingLoading(false);
      return false;
    }

    const finalMyPosts = myPosts || [];
    setMySentPosts(finalMyPosts);

    let finalSentClaims = [];

    if (finalMyPosts.length > 0) {
      const postIds = finalMyPosts.map((post) => post.id);

      const { data: claimsData, error: claimsError } = await supabase
        .from("claims")
        .select("*")
        .in("crush_post_id", postIds)
        .order("created_at", { ascending: false });

      if (claimsError) {
        alert("내 구름에 온 응답을 불러오지 못했어요: " + claimsError.message);
        console.log(claimsError);
        setMatchingLoading(false);
        return false;
      }

      finalSentClaims = (claimsData || []).map((claim) => {
        const post = finalMyPosts.find((item) => item.id === claim.crush_post_id);

        return {
          ...claim,
          post,
        };
      });
    }

    setSentClaims(finalSentClaims);

    const { data: myReceivedClaims, error: receivedError } = await supabase
      .from("claims")
      .select("*")
      .eq("claimer_user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (receivedError) {
      alert("내가 받은 구름 목록을 불러오지 못했어요: " + receivedError.message);
      console.log(receivedError);
      setMatchingLoading(false);
      return false;
    }

    const finalReceivedClaims = myReceivedClaims || [];
    let combinedReceivedClaims = finalReceivedClaims.map((claim) => ({
      ...claim,
      post: null,
    }));

    if (finalReceivedClaims.length > 0) {
      const receivedPostIds = [
        ...new Set(finalReceivedClaims.map((claim) => claim.crush_post_id)),
      ];

      const { data: receivedPosts, error: receivedPostsError } = await supabase
        .from("crush_posts")
        .select("*")
        .in("id", receivedPostIds);

      if (receivedPostsError) {
        alert(
          "내가 응답한 구름 글 정보를 불러오지 못했어요: " +
            receivedPostsError.message
        );
        console.log(receivedPostsError);
        setMatchingLoading(false);
        return false;
      }

      combinedReceivedClaims = finalReceivedClaims.map((claim) => {
        const post = (receivedPosts || []).find(
          (item) => item.id === claim.crush_post_id
        );

        return {
          ...claim,
          post,
        };
      });
    }

    setReceivedClaims(combinedReceivedClaims);
    setMatchingLoading(false);
    return true;
  };

  const openMatchingPage = async () => {
    if (!checkProfileRequired()) return;

    setPage("matching");
    await loadMyActivityData();
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

    alert("매칭을 수락했어요! 이제 서로의 인스타를 확인할 수 있어요.");
    openMatchingPage();
  };

  const deleteMyPost = async (postId) => {
    if (!currentUser) return;

    const ok = window.confirm(
      "이 구름을 정말 삭제할까요? 삭제하면 이 구름에 달린 응답도 함께 정리될 수 있어요."
    );

    if (!ok) return;

    const { error: claimsError } = await supabase
      .from("claims")
      .delete()
      .eq("crush_post_id", postId);

    if (claimsError) {
      alert("구름에 연결된 응답 삭제에 실패했어요: " + claimsError.message);
      console.log(claimsError);
      return;
    }

    const { error } = await supabase
      .from("crush_posts")
      .delete()
      .eq("id", postId)
      .eq("sender_user_id", currentUser.id);

    if (error) {
      alert("구름 삭제에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("구름을 삭제했어요.");
    await loadMyActivityData();
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

  const progressPercent = (crushStep / 9) * 100;
  const searchProgressPercent = (searchStep / 5) * 100;

  const sentClaimsByPostId = sentClaims.reduce((acc, claim) => {
    if (!acc[claim.crush_post_id]) {
      acc[claim.crush_post_id] = [];
    }

    acc[claim.crush_post_id].push(claim);
    return acc;
  }, {});

  const mySentPostsWithResponses = mySentPosts.filter(
    (post) => sentClaimsByPostId[post.id]?.length > 0
  );

  const mySentPostsWithoutResponses = mySentPosts.filter(
    (post) => !sentClaimsByPostId[post.id]?.length
  );

  const totalSentResponseCount = sentClaims.length;
  const acceptedMatchCount = [...sentClaims, ...receivedClaims].filter(
    (claim) => claim.status === "accepted"
  ).length;

  const sentPostsByDate = groupSentPostsByDate(mySentPosts);
  const sentDateKeys = Object.keys(sentPostsByDate).sort((a, b) =>
    b.localeCompare(a)
  );

  const activityDateOptions = [
    ...new Set([
      ...mySentPosts.map((post) => post.seen_date).filter(Boolean),
      ...receivedClaims.map((claim) => claim.post?.seen_date).filter(Boolean),
    ]),
  ].sort((a, b) => b.localeCompare(a));

  const selectedActivityDate = activityDate || activityDateOptions[0] || "";
  const selectedDateSentPosts = mySentPosts.filter(
    (post) => post.seen_date === selectedActivityDate
  );
  const selectedDateReceivedClaims = receivedClaims.filter(
    (claim) => claim.post?.seen_date === selectedActivityDate
  );

  const notificationItems = [
    ...sentClaims.map((claim) => ({
      id: `sent-${claim.id}`,
      type: claim.status === "accepted" ? "매칭 수락" : "응답 도착",
      title:
        claim.status === "accepted"
          ? "상대가 인스타 교환까지 연결됐어요"
          : "내가 띄운 구름에 응답이 도착했어요",
      description: `${claim.claimer_nickname || "상대"} · ${
        claim.post?.seen_date || "날짜 없음"
      }`,
      created_at: claim.created_at,
      active: claim.status === "accepted",
    })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const renderSentClaimCard = (claim) => {
    return (
      <div className="responseBox" key={claim.id}>
        <p className="miniTitle">도착한 응답</p>

        <p>
          응답한 사람 닉네임: <b>{claim.claimer_nickname || "-"}</b>
        </p>

        <p className="message">“{claim.claimer_message || "-"}”</p>

        <p>
          상태:{" "}
          <b>
            {claim.status === "accepted" ? "매칭 수락됨" : "응답 대기 중"}
          </b>
        </p>

        {claim.status === "pending" && (
          <button onClick={() => acceptClaim(claim.id)}>
            이 사람 맞아요, 인스타 교환하기
          </button>
        )}

        {claim.status === "accepted" && (
          <div className="noticeBox">
            <p>매칭이 수락됐어요.</p>
            <p>
              내 인스타: <b>@{profile.instagram_id}</b>
            </p>
            <p>
              상대 인스타: <b>@{claim.claimer_instagram}</b>
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderSentPostCard = (post, mode) => {
    const claims = sentClaimsByPostId[post.id] || [];

    return (
      <div className="post" key={post.id}>
        <div className="postTopLine">
          <span className={claims.length > 0 ? "statusPill active" : "statusPill"}>
            {claims.length > 0 ? `응답 ${claims.length}개` : "응답 없음"}
          </span>
        </div>

        <p>
          <b>
            {post.seen_date}, {post.time_period}, {post.place}
          </b>
        </p>

        {renderPostQuestionAnswer(post)}

        <p className="message">
          “{cleanMessage(post.message) || "남긴 메시지가 없어요."}”
        </p>

        {mode === "empty" && (
          <div className="noticeBox">
            <p>아직 이 구름에 응답한 사람이 없어요.</p>
            <p>상대가 본인 착장과 날짜를 올리고 응답하면 여기에 표시돼요.</p>
          </div>
        )}

        {mode === "answered" && claims.map((claim) => renderSentClaimCard(claim))}

        <button
          type="button"
          className="dangerButton"
          onClick={() => deleteMyPost(post.id)}
        >
          이 구름 삭제하기
        </button>
      </div>
    );
  };

  const renderReceivedClaimCard = (claim) => {
    const post = claim.post;

    return (
      <div className="post" key={claim.id}>
        <div className="postTopLine">
          <span className="statusPill">구름 확인 응답</span>
        </div>

        {post ? (
          <>
            <p>
              <b>
                {post.seen_date}, {post.time_period}, {post.place}
              </b>
            </p>

            {renderPostQuestionAnswer(post)}

            <p className="message">
              상대가 띄운 구름: “
              {cleanMessage(post.message) || "남긴 메시지가 없어요."}”
            </p>
          </>
        ) : (
          <p className="notice">연결된 구름 글을 찾지 못했어요.</p>
        )}

        <hr />

        <p>
          내가 보낸 응답: <b>{claim.claimer_message || "-"}</b>
        </p>

        <p>
          상태:{" "}
          <b>
            {claim.status === "accepted" ? "매칭 수락됨" : "상대 수락 대기 중"}
          </b>
        </p>

        {claim.status === "pending" && (
          <div className="noticeBox">
            <p>아직 상대가 인스타 교환을 수락하지 않았어요.</p>
            <p>상대가 수락하면 서로의 인스타가 공개돼요.</p>
          </div>
        )}

        {claim.status === "accepted" && (
          <div className="noticeBox">
            <p>매칭이 수락됐어요.</p>
            <p>
              내 인스타: <b>@{profile.instagram_id}</b>
            </p>
            <p>
              상대 인스타: <b>@{post?.sender_instagram || "-"}</b>
            </p>
          </div>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="app">
        <div className="card">
          <h1>단꿈</h1>
          <p className="subtitle">로그인 상태를 확인하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (!session || !currentUser) {
    return (
      <div className="app">
        <div className="card">
          <h1>단꿈</h1>

          <p className="subtitle">
            단꿈은 단국대 캠퍼스에서 우연히 스쳐간 사람에게 조심스럽게 구름을
            띄우고, 상대가 본인이라고 느낄 때만 이어지는 익명 인연 서비스예요.
          </p>

          <div className="appIntroBox">
            <p>
              <b>구름 띄우기</b>는 내가 마주친 사람의 날짜, 시간, 장소, 착장을
              남기는 기능이에요.
            </p>
            <p>
              <b>구름 확인하기</b>는 내 날짜와 인상착의에 맞는 구름을 찾아보는
              기능이에요.
            </p>
            <p>
              <b>내 구름 관리</b>에서는 내가 남긴 구름, 받은 응답, 매칭 상태를
              확인할 수 있어요.
            </p>
            <p>
              <b>마이페이지</b>에서는 닉네임과 프로필 정보를 관리해요.
            </p>
          </div>

          {authMode === "signup" && (
            <>
              <div className="formGroup">
                <label className="formLabel">닉네임 또는 이름</label>
                <input
                  placeholder="본명이 부담스러우면 닉네임으로 입력해도 돼요"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                />
              </div>

              <div className="formGroup">
                <label className="formLabel">학번</label>
                <input
                  placeholder="학번 예: 32240000"
                  value={authForm.student_id}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, student_id: e.target.value })
                  }
                />
              </div>
            </>
          )}

          <div className="formGroup">
            <label className="formLabel">아이디</label>
            <input
              placeholder="아이디 예: jungwoo23, jw_123, jw!2026"
              value={authForm.login_id}
              onChange={(e) =>
                setAuthForm({ ...authForm, login_id: e.target.value })
              }
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">비밀번호</label>
            <div className="passwordRow">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호 6자리 이상"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
              />
              <button
                type="button"
                className="passwordToggleButton"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          {authMode === "login" ? (
            <>
              <button onClick={handleLogin}>로그인하기</button>

              <button className="white" onClick={() => setAuthMode("signup")}>
                처음이라면 회원가입
              </button>
            </>
          ) : (
            <>
              <button onClick={handleSignUp}>회원가입하기</button>

              <button className="white" onClick={() => setAuthMode("login")}>
                이미 계정이 있어요
              </button>
            </>
          )}

          <p className="notice">
            로그인하지 않으면 홈 화면, 구름 남기기, 구름 확인 기능을 사용할 수
            없어요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {page === "home" && (
        <div className="homeCard skyHome">
          <div className="skyDecor cloudA">☁</div>
          <div className="skyDecor cloudB">☁</div>
          <div className="skyDecor starA">✦</div>
          <div className="skyDecor starB">✧</div>

          <div className="homeTop">
            <div className="brandBadge">DKU CLOUD MATCHING</div>

            <div className="cloudLogo">☁</div>

            <h1 className="homeLogo">단꿈</h1>

            <p className="homeSlogan">
              스쳐간 인연,
              <br />
              기억은 남기고
              <br />
              용기는 구름에 담아
            </p>

            <p className="homeDescription">
              단꿈은 단국대 캠퍼스에서 우연히 마주친 사람에게 조심스럽게 구름을
              띄우고, 서로가 원할 때만 이어지는 익명 인연 서비스예요.
            </p>
          </div>

          <div className="appIntroBox homeIntroBox">
            <p>
              <b>구름 띄우기</b> · 내가 본 사람의 날짜, 시간, 장소, 착장을 남겨요.
            </p>
            <p>
              <b>구름 확인하기</b> · 나를 찾는 것 같은 구름을 확인하고 응답해요.
            </p>
            <p>
              <b>내 구름 관리</b> · 내가 남긴 구름과 도착한 응답을 관리해요.
            </p>
            <p>
              <b>마이페이지</b> · 닉네임과 프로필 정보를 관리해요.
            </p>
          </div>

          <div className="homeMainAction cloudActionBox">
            <button
              onClick={openSendPage}
              className="primaryHomeButton cloudPrimaryButton"
            >
              <span className="buttonEmoji">☁</span>
              <span>
                <b>구름 띄우기</b>
                <small>시간, 장소, 착장을 선택해 스쳐간 사람을 떠올려요.</small>
              </span>
            </button>

            <button
              onClick={openSearchPage}
              className="secondaryHomeButton cloudSecondaryButton"
            >
              <span className="buttonEmoji">🔔</span>
              <span>
                <b>구름 확인하기</b>
                <small>내 날짜와 머리 정보에 맞는 구름을 확인해요.</small>
              </span>
            </button>
          </div>

          <div className="homeMiniMenu fourMenu cloudMiniMenu">
            <button onClick={openMatchingPage} className="miniMenuButton">
              내 구름
            </button>

            <button onClick={openProfilePage} className="miniMenuButton">
              마이페이지
            </button>

            <button
              onClick={() => {
                setMatchingMode("notifications");
                openMatchingPage();
              }}
              className="miniMenuButton"
            >
              알림
            </button>

            <button
              onClick={() => {
                setMatchingMode("calendar");
                openMatchingPage();
              }}
              className="miniMenuButton"
            >
              기록
            </button>
          </div>

          <div className="homeBottomNotice cloudNotice">
            <p>우리의 캠퍼스에서, 특별한 우연이 시작됩니다.</p>
          </div>

          <button onClick={handleLogout} className="logoutTextButton">
            로그아웃
          </button>
        </div>
      )}

      {page === "profile" && (
        <div className="card">
          <h2>마이페이지</h2>

          <div className="mypageHero">
            <p className="mypageGreeting">
              {profile.nickname || "단꿈러"}님의 구름 보관함
            </p>
            <p>프로필, 내가 띄운 구름, 받은 알림을 한곳에서 관리해요.</p>
          </div>

          <div className="mypageStatsGrid">
            <div className="mypageStat">
              <span>띄운 구름</span>
              <b>{mySentPosts.length}</b>
            </div>
            <div className="mypageStat">
              <span>도착 응답</span>
              <b>{totalSentResponseCount}</b>
            </div>
            <div className="mypageStat">
              <span>받은 구름</span>
              <b>{receivedClaims.length}</b>
            </div>
            <div className="mypageStat">
              <span>매칭</span>
              <b>{acceptedMatchCount}</b>
            </div>
          </div>

          <div className="mypageQuickMenu">
            <button
              className="white"
              onClick={() => {
                setMatchingMode("sent");
                openMatchingPage();
              }}
            >
              내가 보낸 구름 관리
            </button>
            <button
              className="white"
              onClick={() => {
                setMatchingMode("notifications");
                openMatchingPage();
              }}
            >
              알림 보기
            </button>
          </div>

          <div className="profileImageBox">
            {profileImagePreview || profile.profile_image_url ? (
              <img
                src={profileImagePreview || profile.profile_image_url}
                alt="프로필 미리보기"
              />
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
            placeholder="닉네임 예: 정우23"
            value={profile.nickname}
            onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
          />

          <div className="formGroup">
            <label className="formLabel">성별</label>
            <div className="optionGrid">
              {genderOptions.map((option) => (
                <OptionButton
                  key={option}
                  value={option}
                  selected={profile.gender === option}
                  onClick={() => setProfile({ ...profile, gender: option })}
                />
              ))}
            </div>
          </div>

          <input
            placeholder="학과 예: 글로벌경영학과"
            value={profile.department}
            onChange={(e) =>
              setProfile({ ...profile, department: e.target.value })
            }
          />

          <input
            placeholder="학번 표시 예: 23학번 또는 32240000"
            value={profile.student_year}
            onChange={(e) =>
              setProfile({ ...profile, student_year: e.target.value })
            }
          />

          <input
            placeholder="인스타 아이디 예: dankum_test"
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
          <h2>구름 남기기</h2>

          <p className="stepText">{crushStep} / 9</p>

          <div className="progressBar">
            <div
              className="progressFill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="draftActionRow">
            <button type="button" className="white smallButton" onClick={saveDraft}>
              임시저장
            </button>
            <button type="button" className="white smallButton" onClick={loadDraft}>
              불러오기
            </button>
            <button type="button" className="white smallButton" onClick={clearDraft}>
              임시저장 삭제
            </button>
          </div>

          {crushStep === 1 && (
            <>
              <h3 className="questionTitle">누구를 찾고 있나요?</h3>
              <p className="questionDesc">
                구름을 남기고 싶은 사람이 남자인지 여자인지 선택해주세요. 선택한
                성별에 맞춰 머리스타일과 인상착의 질문이 달라져요.
              </p>

              <div className="optionGrid">
                {genderOptions.map((option) => (
                  <OptionButton
                    key={option}
                    value={option}
                    selected={crushPost.target_gender === option}
                    onClick={() => selectTargetGenderAndNext(option)}
                  />
                ))}
              </div>
            </>
          )}

          {crushStep === 2 && (
            <>
              <h3 className="questionTitle">언제 마주쳤나요?</h3>
              <p className="questionDesc">
                시간은 24시간을 2시간 단위로 나누었어요. 기억나는 시간대를
                골라주세요.
              </p>

              <div className="formGroup">
                <label className="formLabel">날짜</label>
                <input
                  type="date"
                  value={crushPost.seen_date}
                  onChange={(e) => updateCrushPost("seen_date", e.target.value)}
                />
              </div>

              <div className="formGroup">
                <label className="formLabel">시간</label>
                <select
                  value={crushPost.time_period}
                  onChange={(e) => updateCrushPost("time_period", e.target.value)}
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
                먼저 큰 장소를 선택하고, 아래에 구체적인 위치를 적어주세요.
                예: 무용관 선택 후 “앞 편의점”, 학교 앞 상권/거리 선택 후
                “○○술집 앞”
              </p>

              <div className="formGroup">
                <label className="formLabel">큰 장소</label>
                <select
                  value={crushPost.place}
                  onChange={(e) =>
                    setCrushPost({
                      ...crushPost,
                      place: e.target.value,
                      custom_place: "",
                    })
                  }
                >
                  <option value="">장소 선택</option>
                  {placeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">구체적인 위치</label>
                <input
                  placeholder={
                    crushPost.place === "학교 앞 상권/거리"
                      ? "예: ○○술집 앞, ○○카페 앞, 편의점 앞"
                      : crushPost.place === "기타/직접 입력"
                      ? "예: 학교 근처 골목, 카페 앞"
                      : "예: 1층 편의점 앞, 건물 입구, 2층 복도"
                  }
                  value={crushPost.custom_place}
                  onChange={(e) => updateCrushPost("custom_place", e.target.value)}
                />
              </div>

              <p className="helperText">
                구체적인 위치는 선택사항이지만, 적을수록 상대가 알아보기 쉬워요.
              </p>

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
              <h3 className="questionTitle">
                {crushPost.target_gender || "상대"}의 머리 정보가 기억나나요?
              </h3>
              <p className="questionDesc">
                머리스타일, 머리 색깔, 모자 유무, 앞머리 유무를 순서대로
                선택해주세요.
              </p>

              {crushPost.target_gender === "여자" ? (
                <>
                  <div className="hairGuideBox">
                    <img
                      src={femaleHairGuideImage}
                      alt="여자 머리스타일 예시"
                      className="hairGuideImage"
                    />
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">머리스타일</label>
                    <div className="optionGrid">
                      {femaleHairStyleOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.female_hair_style === option}
                          onClick={() => updateCrushPost("female_hair_style", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">머리 색깔</label>
                    <div className="optionGrid">
                      {hairColorOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.female_hair_color === option}
                          onClick={() => updateCrushPost("female_hair_color", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">모자 유무</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.female_hat === option}
                          onClick={() => updateCrushPost("female_hat", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리 유무</label>
                    <div className="optionGrid">
                      {bangsOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.female_bangs === option}
                          onClick={() => updateCrushPost("female_bangs", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="formGroup">
                    <label className="formLabel">머리스타일</label>
                    <div className="optionGrid">
                      {maleHairStyleOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.male_hair_style === option}
                          onClick={() => updateCrushPost("male_hair_style", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">머리 색깔</label>
                    <div className="optionGrid">
                      {hairColorOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.male_hair_color === option}
                          onClick={() => updateCrushPost("male_hair_color", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">모자 유무</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.male_hat === option}
                          onClick={() => updateCrushPost("male_hat", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리 유무</label>
                    <div className="optionGrid">
                      {bangsOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.male_bangs === option}
                          onClick={() => updateCrushPost("male_bangs", option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  if (!getFinalHairFeature()) {
                    alert(
                      "머리스타일, 머리 색깔, 모자 유무, 앞머리 유무를 선택해주세요."
                    );
                    return;
                  }
                  setCrushStep(5);
                }}
              >
                다음
              </button>
            </>
          )}

          {crushStep === 5 && (
            <>
              <h3 className="questionTitle">상의가 기억나나요?</h3>
              <p className="questionDesc">
                상의 종류와 색상을 각각 선택해주세요. 정확히 몰라도 가장 가까운
                항목을 고르면 돼요. 예: 블라우스나 셔츠는 “셔츠/블라우스”로
                선택해주세요.
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
                하의 종류와 색상을 각각 선택해주세요. 정확히 몰라도 가장 가까운
                항목을 고르면 돼요. 예: 청반바지, 면반바지처럼 재질이 달라도
                짧은 바지면 “반바지”를 선택하면 돼요.
              </p>

              <div className="formGroup">
                <label className="formLabel">하의 종류</label>
                <select
                  value={crushPost.bottom_type}
                  onChange={(e) => updateCrushPost("bottom_type", e.target.value)}
                >
                  <option value="">하의 종류 선택</option>
                  {bottomTypeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              {crushPost.bottom_type === "기타" && (
                <div className="formGroup">
                  <label className="formLabel">하의 기타 설명</label>
                  <input
                    placeholder="예: 카고바지, 와이드 팬츠, 독특한 바지"
                    value={crushPost.bottom_custom}
                    onChange={(e) =>
                      updateCrushPost("bottom_custom", e.target.value)
                    }
                  />
                </div>
              )}

              <div className="formGroup">
                <label className="formLabel">하의 색상</label>
                <select
                  value={crushPost.bottom_color}
                  onChange={(e) => updateCrushPost("bottom_color", e.target.value)}
                >
                  <option value="">하의 색상 선택</option>
                  {bottomColorOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (!getFinalBottomType() || !crushPost.bottom_color) {
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
                  onChange={(e) => updateCrushPost("earphone_type", e.target.value)}
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
              <h3 className="questionTitle">그때의 느낌을 조금 더 알려주세요</h3>
              <p className="questionDesc">
                키 느낌, 신발, 같이 있었던 상황, 분위기는 상대가 본인인지
                알아보는 데 도움이 돼요.
              </p>

              <div className="formGroup">
                <label className="formLabel">키 느낌</label>
                <select
                  value={crushPost.height_feeling}
                  onChange={(e) =>
                    updateCrushPost("height_feeling", e.target.value)
                  }
                >
                  <option value="">키 느낌 선택</option>
                  {heightFeelingOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">신발</label>
                <select
                  value={crushPost.shoe_type}
                  onChange={(e) => updateCrushPost("shoe_type", e.target.value)}
                >
                  <option value="">신발 선택</option>
                  {shoeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">같이 있었던 상황</label>
                <select
                  value={crushPost.together_situation}
                  onChange={(e) =>
                    updateCrushPost("together_situation", e.target.value)
                  }
                >
                  <option value="">상황 선택</option>
                  {togetherSituationOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">상황 자세히 적기</label>
                <input
                  placeholder="예: 학식 먹는 중, 술집 앞에서 대화 중, 친구 기다리는 중"
                  value={crushPost.situation_detail}
                  onChange={(e) =>
                    updateCrushPost("situation_detail", e.target.value)
                  }
                />
              </div>

              <div className="formGroup">
                <label className="formLabel">분위기</label>
                <select
                  value={crushPost.mood}
                  onChange={(e) => updateCrushPost("mood", e.target.value)}
                >
                  <option value="">분위기 선택</option>
                  {moodOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">분위기 자세히 적기</label>
                <input
                  placeholder="예: 웃는 모습이 밝았음, 차분하고 조용한 느낌"
                  value={crushPost.mood_detail}
                  onChange={(e) => updateCrushPost("mood_detail", e.target.value)}
                />
              </div>

              <button
                onClick={() => {
                  if (
                    !crushPost.height_feeling ||
                    !crushPost.shoe_type ||
                    !crushPost.together_situation ||
                    !crushPost.mood
                  ) {
                    alert("키 느낌, 신발, 같이 있었던 상황, 분위기를 선택해주세요.");
                    return;
                  }
                  setCrushStep(9);
                }}
              >
                다음
              </button>
            </>
          )}

          {crushStep === 9 && (
            <>
              <h3 className="questionTitle">마지막으로 확인해주세요</h3>
              <p className="questionDesc">
                내가 찾는 사람의 성별과 인상착의가 맞는지 확인해주세요.
              </p>

              <textarea
                placeholder="짧은 메시지 예: 분위기가 좋아 보여서 조심스럽게 구름 남겨요."
                value={crushPost.message}
                onChange={(e) => updateCrushPost("message", e.target.value)}
              />

              <div className="summaryBox">
                <p>
                  <strong>보내는 사람:</strong> {profile.nickname || "-"}
                </p>
                <p>
                  <strong>내 성별:</strong> {profile.gender || "-"}
                </p>
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
                  <strong>머리:</strong> {getFinalHairFeature() || "-"}
                </p>
                <p>
                  <strong>상의:</strong> {crushPost.top_color || "-"}{" "}
                  {crushPost.top_type || "-"}
                </p>
                <p>
                  <strong>하의:</strong> {crushPost.bottom_color || "-"}{" "}
                  {getFinalBottomType() || "-"}
                </p>
                <p>
                  <strong>소지품:</strong> {crushPost.bag_type || "-"},{" "}
                  {crushPost.earphone_type || "-"}
                </p>
                <p>
                  <strong>키 느낌:</strong> {crushPost.height_feeling || "-"}
                </p>
                <p>
                  <strong>신발:</strong> {crushPost.shoe_type || "-"}
                </p>
                <p>
                  <strong>상황:</strong> {getFinalSituation() || "-"}
                </p>
                <p>
                  <strong>분위기:</strong> {getFinalMood() || "-"}
                </p>
              </div>

              <button onClick={saveCrushPost}>그날의 구름 남기기</button>
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
          <h2>구름을 남겼어요</h2>
          <p className="subtitle">
            상대가 자신의 날짜와 착장을 올리면, 당신의 구름을 발견할 수 있어요.
          </p>

          <button onClick={openMatchingPage}>내 구름 관리로 가기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "search" && (
        <div className="card">
          <h2>구름 확인하기</h2>

          <p className="stepText">{searchStep} / 5</p>

          <div className="progressBar">
            <div
              className="progressFill"
              style={{ width: `${searchProgressPercent}%` }}
            />
          </div>

          <p className="subtitle">
            한 번에 전부 고르지 않고, 구름 띄우기처럼 한 단계씩 확인해요.
            날짜와 머리 정보는 필수이고, 착장은 기억나는 만큼만 골라주세요.
          </p>

          <div className="summaryBox">
            <p>
              <strong>내 성별:</strong> {profile.gender || "-"}
            </p>
            <p>프로필 성별 기준으로 나를 찾는 구름만 자동으로 확인해요.</p>
          </div>

          {searchStep === 1 && (
            <>
              <h3 className="questionTitle">언제 있었나요?</h3>
              <p className="questionDesc">
                상대가 구름을 남긴 날짜와 내가 그 사람을 마주쳤던 날짜가 맞아야
                확인할 수 있어요. 정확하지 않다면 가장 가까운 날짜를 선택해보세요.
              </p>

              <div className="formGroup">
                <label className="formLabel">날짜</label>
                <input
                  type="date"
                  value={searchForm.seen_date}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, seen_date: e.target.value })
                  }
                />
              </div>

              <button
                onClick={() => {
                  if (!searchForm.seen_date) {
                    alert("날짜를 선택해주세요.");
                    return;
                  }
                  setSearchStep(2);
                }}
              >
                다음
              </button>
            </>
          )}

          {searchStep === 2 && (
            <>
              <h3 className="questionTitle">내 머리 정보가 기억나나요?</h3>
              <p className="questionDesc">
                머리스타일, 머리 색깔, 모자 유무, 앞머리 유무를 골라주세요.
                잘 모르겠는 항목은 “잘 모르겠음”을 선택해도 돼요.
              </p>

              {profile.gender === "여자" ? (
                <>
                  <div className="hairGuideBox">
                    <img
                      src={femaleHairGuideImage}
                      alt="여자 머리스타일 예시"
                      className="hairGuideImage"
                    />
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">내 머리스타일</label>
                    <div className="optionGrid">
                      {femaleHairStyleOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.female_hair_style === option}
                          onClick={() =>
                            setSearchForm({
                              ...searchForm,
                              female_hair_style: option,
                            })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">머리 색깔</label>
                    <div className="optionGrid">
                      {hairColorOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.female_hair_color === option}
                          onClick={() =>
                            setSearchForm({
                              ...searchForm,
                              female_hair_color: option,
                            })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">모자 유무</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.female_hat === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, female_hat: option })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리 유무</label>
                    <div className="optionGrid">
                      {bangsOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.female_bangs === option}
                          onClick={() =>
                            setSearchForm({
                              ...searchForm,
                              female_bangs: option,
                            })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="formGroup">
                    <label className="formLabel">내 머리스타일</label>
                    <div className="optionGrid">
                      {maleHairStyleOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.male_hair_style === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, male_hair_style: option })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">머리 색깔</label>
                    <div className="optionGrid">
                      {hairColorOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.male_hair_color === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, male_hair_color: option })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">모자 유무</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.male_hat === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, male_hat: option })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리 유무</label>
                    <div className="optionGrid">
                      {bangsOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.male_bangs === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, male_bangs: option })
                          }
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  if (!getFinalSearchHairFeature()) {
                    alert("머리 정보를 선택해주세요.");
                    return;
                  }
                  setSearchStep(3);
                }}
              >
                다음
              </button>
            </>
          )}

          {searchStep === 3 && (
            <>
              <h3 className="questionTitle">상의가 기억나나요?</h3>
              <p className="questionDesc">
                정확히 몰라도 가장 가까운 걸 골라주세요. 예: 블라우스나 셔츠는
                “셔츠/블라우스”를 선택하면 돼요. 기억이 안 나면 “잘 모르겠음”을
                선택해주세요.
              </p>

              <div className="formGroup">
                <label className="formLabel">상의 종류</label>
                <select
                  value={searchForm.top_type}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, top_type: e.target.value })
                  }
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
                  value={searchForm.top_color}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, top_color: e.target.value })
                  }
                >
                  <option value="">상의 색상 선택</option>
                  {topColorOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button onClick={() => setSearchStep(4)}>다음</button>
            </>
          )}

          {searchStep === 4 && (
            <>
              <h3 className="questionTitle">하의가 기억나나요?</h3>
              <p className="questionDesc">
                청반바지, 면반바지처럼 재질이 달라도 짧은 바지면 “반바지”를
                선택하면 돼요. 기억이 안 나면 “잘 모르겠음”을 선택해주세요.
              </p>

              <div className="formGroup">
                <label className="formLabel">하의 종류</label>
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
                <label className="formLabel">하의 색상</label>
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

              <button onClick={() => setSearchStep(5)}>다음</button>
            </>
          )}

          {searchStep === 5 && (
            <>
              <h3 className="questionTitle">마지막으로 확인해주세요</h3>
              <p className="questionDesc">
                아래 정보로 나를 찾는 구름을 확인해요. 상의와 하의는 선택하지
                않았거나 “잘 모르겠음”이면 검색 조건에서 제외돼요.
              </p>

              <div className="summaryBox">
                <p>
                  <strong>날짜:</strong> {searchForm.seen_date || "-"}
                </p>
                <p>
                  <strong>내 성별:</strong> {profile.gender || "-"}
                </p>
                <p>
                  <strong>머리:</strong> {getFinalSearchHairFeature() || "-"}
                </p>
                <p>
                  <strong>상의:</strong> {searchForm.top_color || "-"}{" "}
                  {searchForm.top_type || "-"}
                </p>
                <p>
                  <strong>하의:</strong> {searchForm.bottom_color || "-"}{" "}
                  {searchForm.bottom_type || "-"}
                </p>
              </div>

              <button onClick={searchCrushPosts}>구름 확인하기</button>
            </>
          )}

          <div className="stepActions">
            <button
              onClick={() => {
                if (searchStep === 1) {
                  setPage("home");
                  return;
                }
                setSearchStep((prev) => prev - 1);
              }}
              className="white"
            >
              {searchStep === 1 ? "홈으로" : "이전"}
            </button>

            <button onClick={() => setPage("home")} className="white">
              취소
            </button>
          </div>
        </div>
      )}

      {page === "result" && (
        <div className="card">
          <h2>나를 찾는 구름 {searchResults.length}개</h2>

          {searchResults.length === 0 && (
            <p className="notice">
              아직 비슷한 구름이 없어요. 날짜를 다시 확인하거나, 머리와 옷
              상의와 하의 조건을 조금 줄여서 다시 찾아보세요.
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

          <button
            onClick={() => {
              setSearchStep(1);
              setPage("search");
            }}
            className="white"
          >
            다시 찾아보기
          </button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "claimForm" && (
        <div className="card">
          <h2>이 구름에 응답하기</h2>

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
            구름을 남긴 사람이 수락하면 서로의 인스타를 볼 수 있어요.
          </p>

          <button onClick={openMatchingPage}>내 구름 관리로 가기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "matching" && (
        <div className="card manageCard">
          <h2>내 구름 관리</h2>

          <p className="subtitle">
            내가 띄운 구름, 받은 구름, 알림, 날짜별 활동 기록을 한눈에 확인할 수
            있어요.
          </p>

          <div className="manageTabs fourTabs">
            <button
              className={matchingMode === "sent" ? "manageTab active" : "manageTab"}
              onClick={() => setMatchingMode("sent")}
            >
              보낸 구름
            </button>

            <button
              className={
                matchingMode === "received" ? "manageTab active" : "manageTab"
              }
              onClick={() => setMatchingMode("received")}
            >
              받은 구름
            </button>

            <button
              className={
                matchingMode === "notifications" ? "manageTab active" : "manageTab"
              }
              onClick={() => setMatchingMode("notifications")}
            >
              알림
            </button>

            <button
              className={
                matchingMode === "calendar" ? "manageTab active" : "manageTab"
              }
              onClick={() => setMatchingMode("calendar")}
            >
              날짜별 기록
            </button>
          </div>

          <div className="manageSummaryGrid">
            <div className="manageSummaryItem">
              <span>띄운 구름</span>
              <b>{mySentPosts.length}</b>
            </div>

            <div className="manageSummaryItem">
              <span>도착 응답</span>
              <b>{totalSentResponseCount}</b>
            </div>

            <div className="manageSummaryItem">
              <span>받은 구름</span>
              <b>{receivedClaims.length}</b>
            </div>
          </div>

          {matchingLoading && <p className="notice">불러오는 중이에요...</p>}

          {!matchingLoading && matchingMode === "sent" && (
            <>
              <div className="manageSection">
                <h3 className="manageSectionTitle">
                  응답 도착 {mySentPostsWithResponses.length}개
                </h3>

                {mySentPostsWithResponses.length === 0 && (
                  <p className="noticeBox">아직 응답이 도착한 구름이 없어요.</p>
                )}

                {mySentPostsWithResponses.map((post) =>
                  renderSentPostCard(post, "answered")
                )}
              </div>

              <div className="manageSection">
                <h3 className="manageSectionTitle">
                  응답 대기 중 {mySentPostsWithoutResponses.length}개
                </h3>

                {mySentPostsWithoutResponses.length === 0 && (
                  <p className="noticeBox">응답을 기다리는 구름이 없어요.</p>
                )}

                {mySentPostsWithoutResponses.map((post) =>
                  renderSentPostCard(post, "empty")
                )}
              </div>
            </>
          )}

          {!matchingLoading && matchingMode === "received" && (
            <div className="manageSection">
              <h3 className="manageSectionTitle">
                구름 확인 응답 {receivedClaims.length}개
              </h3>

              {receivedClaims.length === 0 && (
                <p className="noticeBox">아직 내가 응답한 구름이 없어요.</p>
              )}

              {receivedClaims.map((claim) => renderReceivedClaimCard(claim))}
            </div>
          )}

          {!matchingLoading && matchingMode === "notifications" && (
            <div className="manageSection">
              <h3 className="manageSectionTitle">알림 {notificationItems.length}개</h3>

              {notificationItems.length === 0 && (
                <p className="noticeBox">
                  아직 새 알림이 없어요. 응답이 오거나 매칭이 수락되면 여기에
                  표시돼요.
                </p>
              )}

              {notificationItems.map((item) => (
                <div className="notificationCard" key={item.id}>
                  <div className="postTopLine">
                    <span className={item.active ? "statusPill active" : "statusPill"}>
                      {item.type}
                    </span>
                  </div>
                  <p>
                    <b>{item.title}</b>
                  </p>
                  <p>{item.description}</p>
                  <p className="helperText">{formatShortDateTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {!matchingLoading && matchingMode === "calendar" && (
            <div className="manageSection">
              <h3 className="manageSectionTitle">날짜별 활동 기록</h3>

              {activityDateOptions.length === 0 ? (
                <p className="noticeBox">아직 날짜별로 보여줄 활동이 없어요.</p>
              ) : (
                <>
                  <div className="formGroup">
                    <label className="formLabel">확인할 날짜</label>
                    <select
                      value={selectedActivityDate}
                      onChange={(e) => setActivityDate(e.target.value)}
                    >
                      {activityDateOptions.map((date) => (
                        <option key={date} value={date}>
                          {formatDateLabel(date)} · {date}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="activitySummaryBox">
                    <div>
                      <span>띄운 구름</span>
                      <b>{selectedDateSentPosts.length}</b>
                    </div>
                    <div>
                      <span>받은 구름</span>
                      <b>{selectedDateReceivedClaims.length}</b>
                    </div>
                  </div>

                  <div className="manageSection">
                    <h3 className="manageSectionTitle">
                      {formatDateLabel(selectedActivityDate)}에 내가 띄운 구름
                    </h3>
                    {selectedDateSentPosts.length === 0 && (
                      <p className="noticeBox">이 날짜에 내가 띄운 구름은 없어요.</p>
                    )}
                    {selectedDateSentPosts.map((post) =>
                      renderSentPostCard(
                        post,
                        sentClaimsByPostId[post.id]?.length ? "answered" : "empty"
                      )
                    )}
                  </div>

                  <div className="manageSection">
                    <h3 className="manageSectionTitle">
                      {formatDateLabel(selectedActivityDate)}에 내가 받은 구름
                    </h3>
                    {selectedDateReceivedClaims.length === 0 && (
                      <p className="noticeBox">이 날짜에 내가 받은 구름은 없어요.</p>
                    )}
                    {selectedDateReceivedClaims.map((claim) =>
                      renderReceivedClaimCard(claim)
                    )}
                  </div>
                </>
              )}
            </div>
          )}

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