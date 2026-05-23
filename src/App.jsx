import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

function App() {
  const [page, setPage] = useState("home");
  const [crushStep, setCrushStep] = useState(1);

  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(true);

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

  const femaleHairOptions = [
    "긴 생머리",
    "긴 웨이브",
    "중단발",
    "단발",
    "묶은 머리",
    "반묶음",
    "앞머리 있음",
    "앞머리 없음",
    "염색머리",
    "모자 착용",
    "잘 모르겠음",
  ];

  const maleHairOptions = [
    "짧은 머리",
    "댄디컷",
    "가르마펌",
    "애즈펌",
    "리젠트컷",
    "스포츠머리",
    "장발",
    "염색머리",
    "모자 착용",
    "잘 모르겠음",
  ];

  const getHairOptionsByGender = (gender) => {
    if (gender === "남자") return maleHairOptions;
    if (gender === "여자") return femaleHairOptions;

    return [
      ...femaleHairOptions,
      ...maleHairOptions.filter((option) => !femaleHairOptions.includes(option)),
    ];
  };

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
    gender: "",
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
    hair_feature: "",
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

  const [matchingClaims, setMatchingClaims] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  const [secondMessageForm, setSecondMessageForm] = useState({
    claimId: null,
    message: "",
  });

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
    const cleanId = loginId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    return `${cleanId}@dankum.local`;
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

  const loadMyProfile = async (user) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.log(error);
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
        student_year: user?.user_metadata?.student_id || "",
      }));
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true);

      const { data } = await supabase.auth.getSession();

      const savedSession = data.session;
      const savedUser = savedSession?.user || null;

      setSession(savedSession);
      setCurrentUser(savedUser);

      if (savedUser) {
        await loadMyProfile(savedUser);
      }

      setAuthLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const newUser = newSession?.user || null;

      setSession(newSession);
      setCurrentUser(newUser);

      if (newUser) {
        await loadMyProfile(newUser);
      } else {
        resetProfile();
        setPage("home");
      }

      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async () => {
    const loginId = authForm.login_id.trim().toLowerCase();
    const cleanId = loginId.replace(/[^a-z0-9_]/g, "");

    if (!authForm.name.trim()) {
      alert("이름을 입력해주세요.");
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

    if (loginId !== cleanId) {
      alert("아이디는 영어 소문자, 숫자, 밑줄(_)만 사용할 수 있어요.");
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
    const loginId = authForm.login_id.trim().toLowerCase();
    const cleanId = loginId.replace(/[^a-z0-9_]/g, "");

    if (!loginId || !authForm.password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    if (loginId !== cleanId) {
      alert("아이디는 영어 소문자, 숫자, 밑줄(_)만 사용할 수 있어요.");
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

    await loadMyProfile(data.user);

    setPage("home");
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

  const renderPostQuestionAnswer = (post) => {
    return (
      <div className="qaBox">
        <p className="qaTitle">상대가 기억한 내 정보</p>

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
          <strong>소지품:</strong> {post.accessory || "-"}
        </p>
      </div>
    );
  };

  const cleanMessage = (message) => {
    if (!message) return "";
    return message.replace(/\[찾는 성별:\s*.*?\]\s*/, "");
  };

  const selectAndNext = (key, value) => {
    updateCrushPost(key, value);
    setTimeout(() => {
      setCrushStep((prev) => Math.min(prev + 1, 8));
    }, 120);
  };

  const selectTargetGenderAndNext = (value) => {
    setCrushPost((prev) => ({
      ...prev,
      target_gender: value,
      hair_feature: "",
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

    setPage("search");
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

    const { error } = await supabase.from("crush_posts").insert([
      {
        seen_date: crushPost.seen_date,
        place: getFinalPlace(),
        time_period: crushPost.time_period,
        hair_feature: crushPost.hair_feature,
        clothes_color: crushPost.top_color,
        clothes_style: combinedStyle,
        accessory: combinedAccessory,
        message: crushPost.message,
        sender_user_id: currentUser.id,
        sender_nickname: profile.nickname,
        sender_instagram: cleanInstagram(profile.instagram_id),
        sender_gender: profile.gender,
        target_gender: crushPost.target_gender,
        second_message_count: 0,
      },
    ]);

    if (error) {
      alert("설렘 남기기에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("설렘을 남겼어요!");
    resetCrushPost();
    setPage("sent");
  };

  const searchCrushPosts = async () => {
    if (!checkProfileRequired()) return;

    if (!searchForm.seen_date) {
      alert("날짜를 선택해주세요.");
      return;
    }

    let query = supabase
      .from("crush_posts")
      .select("*")
      .eq("seen_date", searchForm.seen_date)
      .eq("target_gender", profile.gender);

    if (searchForm.hair_feature && searchForm.hair_feature !== "잘 모르겠음") {
      query = query.eq("hair_feature", searchForm.hair_feature);
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
      alert("응답할 설렘 글을 찾지 못했어요.");
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

  const openMatchingPage = async () => {
    if (!checkProfileRequired()) return;

    setMatchingLoading(true);
    setPage("matching");

    const { data: myPosts, error: postsError } = await supabase
      .from("crush_posts")
      .select("*")
      .eq("sender_user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (postsError) {
      alert("내 설렘 글을 불러오지 못했어요: " + postsError.message);
      console.log(postsError);
      setMatchingLoading(false);
      return;
    }

    if (!myPosts || myPosts.length === 0) {
      setMatchingClaims([]);
      setMatchingLoading(false);
      return;
    }

    const postIds = myPosts.map((post) => post.id);

    const { data: claimsData, error: claimsError } = await supabase
      .from("claims")
      .select("*")
      .in("crush_post_id", postIds)
      .order("created_at", { ascending: false });

    if (claimsError) {
      alert("응답 데이터를 불러오지 못했어요: " + claimsError.message);
      console.log(claimsError);
      setMatchingLoading(false);
      return;
    }

    const combinedData = (claimsData || []).map((claim) => {
      const post = myPosts.find((post) => post.id === claim.crush_post_id);

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

    alert("매칭을 수락했어요! 이제 서로의 인스타를 확인할 수 있어요.");
    openMatchingPage();
  };

  const sendSecondMessage = async (claim) => {
    if (!secondMessageForm.message.trim()) {
      alert("2차 설렘 메시지를 입력해주세요.");
      return;
    }

    if (claim.second_message_sent) {
      alert("이미 2차 설렘을 보냈어요.");
      return;
    }

    const { error } = await supabase
      .from("claims")
      .update({
        second_message: secondMessageForm.message.trim(),
        second_message_sent: true,
        second_message_created_at: new Date().toISOString(),
      })
      .eq("id", claim.id);

    if (error) {
      alert("2차 설렘 보내기에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("2차 설렘을 보냈어요.");

    setSecondMessageForm({
      claimId: null,
      message: "",
    });

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
            단꿈은 로그인 또는 회원가입 후 이용할 수 있어요. 설렘을 남기거나
            나에게 온 설렘을 확인하려면 먼저 계정을 만들어주세요.
          </p>

          {authMode === "signup" && (
            <>
              <div className="formGroup">
                <label className="formLabel">이름</label>
                <input
                  placeholder="이름 예: 박정우"
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
              placeholder="아이디 예: jungwoo23"
              value={authForm.login_id}
              onChange={(e) =>
                setAuthForm({ ...authForm, login_id: e.target.value })
              }
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호 6자리 이상"
              value={authForm.password}
              onChange={(e) =>
                setAuthForm({ ...authForm, password: e.target.value })
              }
            />
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
            로그인하지 않으면 홈 화면, 설렘 남기기, 설렘 확인 기능을 사용할 수
            없어요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {page === "home" && (
        <div className="card">
          <h1>단꿈</h1>
          <p className="subtitle">
            스쳐 지나간 설렘을, 서로가 원할 때만 연결해주는 단국대 익명 호감
            매칭 서비스
          </p>

          <button onClick={openSendPage}>설렘 남기기</button>

          <button onClick={openSearchPage} className="white">
            나에게 온 설렘 찾기
          </button>

          <button onClick={openMatchingPage} className="white">
            내 설렘 관리
          </button>

          <button onClick={() => setPage("profile")} className="white">
            내 프로필
          </button>

          <button onClick={handleLogout} className="white">
            로그아웃
          </button>

          <p className="notice">
            서로 응답하기 전까지 인스타 아이디는 공개되지 않습니다.
          </p>
        </div>
      )}

      {page === "profile" && (
        <div className="card">
          <h2>내 프로필</h2>

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
            onChange={(e) =>
              setProfile({ ...profile, nickname: e.target.value })
            }
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
          <h2>설렘 남기기</h2>

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
                설렘을 느낀 사람이 남자인지 여자인지 선택해주세요. 선택한
                성별에 맞춰 머리 스타일과 인상착의 질문이 달라져요.
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
                시간은 1시간 단위로 선택해주세요. 나중에 상대가 날짜와 착장을
                올리면 비슷한 설렘으로 보여져요.
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
                  onChange={(e) =>
                    updateCrushPost("custom_place", e.target.value)
                  }
                />
              </div>

              <p className="helperText">
                구체적인 위치는 선택사항이지만, 적을수록 상대가 알아보기
                쉬워요.
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
                {crushPost.target_gender || "상대"}의 머리 스타일이 기억나나요?
              </h3>
              <p className="questionDesc">
                찾는 사람의 성별에 맞춰 가장 비슷한 머리 특징을 선택해주세요.
              </p>

              <div className="optionGrid">
                {getHairOptionsByGender(crushPost.target_gender).map(
                  (option) => (
                    <OptionButton
                      key={option}
                      value={option}
                      selected={crushPost.hair_feature === option}
                      onClick={() => selectAndNext("hair_feature", option)}
                      full={option === "잘 모르겠음"}
                    />
                  )
                )}
              </div>
            </>
          )}

          {crushStep === 5 && (
            <>
              <h3 className="questionTitle">상의가 기억나나요?</h3>
              <p className="questionDesc">상의 종류와 색상을 각각 선택해주세요.</p>

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
              <p className="questionDesc">하의 종류와 색상을 각각 선택해주세요.</p>

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
                내가 찾는 사람의 성별과 인상착의가 맞는지 확인해주세요.
              </p>

              <textarea
                placeholder="짧은 메시지 예: 분위기가 좋아 보여서 조심스럽게 설렘 남겨요."
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

              <button onClick={saveCrushPost}>그날의 설렘 남기기</button>
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
          <h2>설렘을 남겼어요</h2>
          <p className="subtitle">
            상대가 자신의 날짜와 착장을 올리면, 당신의 설렘을 발견할 수 있어요.
          </p>

          <button onClick={openMatchingPage}>내 설렘 관리로 가기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "search" && (
        <div className="card">
          <h2>나에게 온 설렘 찾기</h2>
          <p className="subtitle">
            오늘의 착장과 인상착의를 올리면, 나를 찾고 있는 설렘 후보를 확인할
            수 있어요.
          </p>

          <div className="summaryBox">
            <p>
              <strong>내 성별:</strong> {profile.gender || "-"}
            </p>
            <p>프로필 성별 기준으로 나를 찾는 설렘만 자동으로 확인해요.</p>
          </div>

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
            <label className="formLabel">내 머리는 어땠나요?</label>
            <select
              value={searchForm.hair_feature}
              onChange={(e) =>
                setSearchForm({ ...searchForm, hair_feature: e.target.value })
              }
            >
              <option value="">머리 특징 선택</option>
              {getHairOptionsByGender(profile.gender).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label className="formLabel">상의 종류는 무엇이었나요?</label>
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
            <label className="formLabel">상의 색상은 무엇이었나요?</label>
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
            날짜는 필수예요. 머리, 상의, 하의 정보는 선택하면 더 정확하게 찾을
            수 있어요. 장소는 입력하지 않아도 돼요.
          </p>

          <button onClick={searchCrushPosts}>나를 찾는 설렘 확인하기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "result" && (
        <div className="card">
          <h2>나를 찾는 설렘 {searchResults.length}개</h2>

          {searchResults.length === 0 && (
            <p className="notice">
              아직 비슷한 설렘이 없어요. 날짜를 다시 확인하거나, 머리와 옷
              조건을 조금 줄여서 다시 찾아보세요.
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
          <h2>이 설렘에 응답하기</h2>

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
            설렘을 남긴 사람이 수락하면 서로의 인스타를 볼 수 있어요. 상대가
            확신하면 2차 설렘을 보낼 수도 있어요.
          </p>

          <button onClick={() => setPage("home")}>홈으로</button>
        </div>
      )}

      {page === "matching" && (
        <div className="card">
          <h2>내 설렘 관리</h2>

          {matchingLoading && <p className="notice">불러오는 중이에요...</p>}

          {!matchingLoading && matchingClaims.length === 0 && (
            <p className="notice">
              아직 내 설렘에 응답한 사람이 없어요. 상대가 본인 착장을 올리고
              응답하면 여기에 표시돼요.
            </p>
          )}

          {!matchingLoading &&
            matchingClaims.map((claim) => (
              <div className="post" key={claim.id}>
                <p>
                  <b>내 설렘에 온 응답</b>
                </p>

                {claim.post ? (
                  <>
                    <p>
                      내가 남긴 설렘: {claim.post.seen_date},{" "}
                      {claim.post.time_period}, {claim.post.place}
                    </p>

                    {renderPostQuestionAnswer(claim.post)}

                    <p className="message">
                      “{cleanMessage(claim.post.message)}”
                    </p>
                  </>
                ) : (
                  <p className="notice">연결된 설렘 글을 찾지 못했어요.</p>
                )}

                <hr />

                <p>
                  응답한 사람 닉네임: <b>{claim.claimer_nickname}</b>
                </p>

                <p className="message">“{claim.claimer_message}”</p>

                <p>
                  상태:{" "}
                  <b>
                    {claim.status === "accepted"
                      ? "매칭 수락됨"
                      : "응답 대기 중"}
                  </b>
                </p>

                {claim.status === "pending" && (
                  <>
                    <button onClick={() => acceptClaim(claim.id)}>
                      이 사람 맞아요, 인스타 교환하기
                    </button>

                    {!claim.second_message_sent && (
                      <>
                        {secondMessageForm.claimId === claim.id ? (
                          <div className="secondMessageBox">
                            <textarea
                              placeholder="2차 설렘 메시지 예: 혹시 오늘 혜당관 앞에서 파란 상의를 입고 계셨나요? 맞는 것 같아서 한 번 더 설렘을 보내요."
                              value={secondMessageForm.message}
                              onChange={(e) =>
                                setSecondMessageForm({
                                  ...secondMessageForm,
                                  message: e.target.value,
                                })
                              }
                            />

                            <button onClick={() => sendSecondMessage(claim)}>
                              2차 설렘 보내기
                            </button>

                            <button
                              className="white"
                              onClick={() =>
                                setSecondMessageForm({
                                  claimId: null,
                                  message: "",
                                })
                              }
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            className="white"
                            onClick={() =>
                              setSecondMessageForm({
                                claimId: claim.id,
                                message: "",
                              })
                            }
                          >
                            이 사람인 것 같아요, 한 번 더 설렘 보내기
                          </button>
                        )}
                      </>
                    )}

                    {claim.second_message_sent && (
                      <div className="noticeBox">
                        <p>2차 설렘을 이미 보냈어요.</p>
                        <p>“{claim.second_message}”</p>
                      </div>
                    )}
                  </>
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