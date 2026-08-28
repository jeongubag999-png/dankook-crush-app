import { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { App as CapacitorApp } from "@capacitor/app";
import "./App.css";
import "./theme-v2.css";
import { supabase } from "./supabase";
import { initPush, linkPushUser, unlinkPushUser } from "./push";
import { OptionButton } from "./components/OptionButton";
import { SearchableSelect } from "./components/SearchableSelect";
import { ChatRoom } from "./components/ChatRoom";
import {
  GenderFemaleIcon,
  GenderMaleIcon,
  HomeIcon,
  PlusIcon,
  SearchIcon,
  ListIcon,
  BellIcon,
  PersonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  UsersIcon,
  TrashIcon,
  CalendarIcon,
  GearIcon,
  PaperPlaneIcon,
  ChatIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
} from "./components/Icons";
import { StepProgress } from "./components/StepProgress";
import { VerificationPendingPage } from "./components/VerificationPendingPage";
import { AdminPage } from "./components/AdminPage";
import { PrivacyPolicyPage } from "./components/PrivacyPolicyPage";

const ADMIN_LOGIN_IDS = ["pjwo12356", "djkim5882", "tjdgns02"];
const PUBLIC_APP_URL = "https://dankook-crush-app.vercel.app";
import {
  getPlaceOptions,
  campusOptions,
  timeOptions,
  genderOptions,
  femaleHairStyleOptions,
  hairColorOptions,
  hatOptions,
  glassesOptions,
  bangsOptions,
  topTypeOptions,
  femaleTopTypeOptions,
  topColorOptions,
  outerTypeOptions,
  bottomTypeOptions,
  femaleBottomTypeOptions,
  bottomColorOptions,
  bagOptions,
  earphoneOptions,
  shoeOptions,
  matchOptions,
} from "./constants";
import {
  getKoreaDateString,
  getMainPlaceFromPost,
  makeStorageFilePath,
  validateImageFile,
  compressImage,
  makeAuthEmail,
  cleanInstagram,
  formatDateLabel,
  formatShortDateTime,
  cleanMessage,
  formatChatListTime,
  formatChatRoomRemaining,
  isChatRoomExpired,
  makeHairFeature,
  getOxLabel,
  cleanTagText,
  getPostTopText,
  getPostBottomText,
  getAccessoryValue,
  makeCloudTags,
  getWeatherComment,
  isNativeApp,
  pickImageFromLibrary,
} from "./utils";
import {
  evaluateDkuAutoVerification,
  runDkuVerificationOcr,
} from "./dkuVerification";

const CLOUD_SEND_MAX_SECONDS = 180;
const CLOUD_SEND_STEP_NAMES = {
  1: "누구를 찾고 있나요?",
  2: "언제, 어디에서 마주쳤나요?",
  3: "헤어 정보",
  4: "상의·아우터·하의·신발",
  5: "소지품",
  6: "짧은 메시지",
};
const CLOUD_CHECK_STEP_NAMES = {
  1: "확인할 날짜",
  2: "헤어 정보",
  3: "상의·아우터·하의·신발",
  4: "소지품",
  5: "최종 확인",
};

const createCloudSendFlowId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `cloud-send-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createStepTimingState = () => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
});
const createSearchStepTimingState = () => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
});

const capCloudSendSeconds = (seconds) =>
  Math.min(CLOUD_SEND_MAX_SECONDS, Math.max(0, Math.floor(seconds || 0)));

const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMonths = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getMonthMatrix = (monthDate) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  ).getDate();
  const leadingBlanks = Array.from({ length: firstDay.getDay() }, (_, index) => ({
    isBlank: true,
    dateKey: `blank-${monthDate.getFullYear()}-${monthDate.getMonth()}-${index}`,
  }));

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1);
    return {
      date,
      dateKey: formatLocalDateKey(date),
      day: date.getDate(),
      dayOfWeek: date.getDay(),
    };
  });

  return [...leadingBlanks, ...currentMonthDays];
};

const getKoreanWeekdayLabel = (dateString) => {
  const date = parseLocalDate(dateString);
  if (!date) return "";
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
};

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
  const activityLoadedUserIdRef = useRef(null);
  const isSigningUpRef = useRef(false); // 회원가입 진행 중 플래그
  const cloudSendFlowIdRef = useRef(null);
  const cloudSendStartedAtRef = useRef(null);
  const cloudSendStepEnteredAtRef = useRef(null);
  const cloudSendStepSecondsRef = useRef(createStepTimingState());
  const cloudSendPreviousCountRef = useRef(0);
  const cloudSendPreviousStepsRef = useRef([]);
  const cloudCheckFlowIdRef = useRef(null);
  const cloudCheckStartedAtRef = useRef(null);
  const cloudCheckStepEnteredAtRef = useRef(null);
  const cloudCheckStepSecondsRef = useRef(createSearchStepTimingState());
  const cloudCheckPreviousCountRef = useRef(0);
  const cloudCheckPreviousStepsRef = useRef([]);

  const [authForm, setAuthForm] = useState({
  name: "",
  student_id: "",
  department: "",
  campus: "",
  login_id: "",
  password: "",
});

const [verificationFile, setVerificationFile] = useState(null);

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

  const getSelectedHairDetails = () => {
    if (crushPost.target_gender === "여자") {
      return {
        hair_color: crushPost.female_hair_color,
        hat_status: crushPost.female_hat,
        bangs_status: crushPost.female_bangs,
      };
    }

    if (crushPost.target_gender === "남자") {
      return {
        hair_color: crushPost.male_hair_color,
        hat_status: crushPost.male_hat,
        bangs_status: crushPost.male_bangs,
      };
    }

    return {
      hair_color: "",
      hat_status: "",
      bangs_status: "",
    };
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


  const [profile, setProfile] = useState({
    nickname: "",
    gender: "",
    department: "",
    campus: "",
    student_year: "",
    instagram_id: "",
    bio: "",
  });
  const [profileReady, setProfileReady] = useState(false);
  const [sharedPostId, setSharedPostId] = useState(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("post");
  });
  const [sharedPost, setSharedPost] = useState(null);
  const [guestSharedPreview, setGuestSharedPreview] = useState(false);
  const [sharedPostLoading, setSharedPostLoading] = useState(false);
  const guestPreviewFetchedRef = useRef(false);


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
    top_detail: "",
    outer_type: "",
    outer_color: "",
    bottom_type: "",
    bottom_color: "",
    bottom_custom: "",
    bottom_detail: "",
    bag_type: "",
    earphone_type: "",
    glasses_type: "",
    item_detail: "",
    shoe_type: "",
    shoe_detail: "",
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
    outer_type: "",
    outer_color: "",
    bottom_type: "",
    bottom_color: "",
    shoe_type: "",
    bag_type: "",
    earphone_type: "",
    glasses_type: "",
  });

  const [searchResults, setSearchResults] = useState([]);
  const [hiddenResultIds, setHiddenResultIds] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [sentResultPost, setSentResultPost] = useState(null);
  const [sentCheckResults, setSentCheckResults] = useState([]);
  const [sentCheckResultMeta, setSentCheckResultMeta] = useState({
    rawCount: 0,
    scoredCount: 0,
    blockedCount: 0,
  });
  const [maybeReactionIds, setMaybeReactionIds] = useState([]);

  const [claimForm, setClaimForm] = useState({
    claimer_nickname: "",
    claimer_instagram: "",
    match_level: "",
    claimer_message: "",
  });

  const [editingPost, setEditingPost] = useState(null); // 수정 중인 빠른 구름 post
  const [signupProgress, setSignupProgress] = useState(""); // 회원가입 진행 단계
  const [showAdmin, setShowAdmin] = useState(false); // 관리자 페이지
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const [accountDeleting, setAccountDeleting] = useState(false);

  const isAdmin = ADMIN_LOGIN_IDS.includes(currentUser?.user_metadata?.login_id);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingMode, setMatchingMode] = useState("sent");
  const [notificationFilter, setNotificationFilter] = useState("sent");
  const [expandedSentPostId, setExpandedSentPostId] = useState(null);
  const [notificationSeenAt, setNotificationSeenAt] = useState(() => {
    try {
      return Number(localStorage.getItem("dankkum_notification_seen_at") || 0);
    } catch {
      return 0;
    }
  });
  const [sentNotificationSeenAt, setSentNotificationSeenAt] = useState(() => {
    try {
      return Number(localStorage.getItem("dankkum_sent_notification_seen_at") || 0);
    } catch {
      return 0;
    }
  });
  const [receivedNotificationSeenAt, setReceivedNotificationSeenAt] = useState(() => {
    try {
      return Number(localStorage.getItem("dankkum_received_notification_seen_at") || 0);
    } catch {
      return 0;
    }
  });
  const [activityDate, setActivityDate] = useState("");
  const [weatherDate, setWeatherDate] = useState(() => getKoreaDateString());
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherClouds, setWeatherClouds] = useState([]);
  const [selectedWeatherPlace, setSelectedWeatherPlace] = useState("");
  const [homeTopWeatherPlace, setHomeTopWeatherPlace] = useState(null);
  const [homeTodayClouds, setHomeTodayClouds] = useState([]);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [searchSubmitting, setSearchSubmitting] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [claimActionSubmittingId, setClaimActionSubmittingId] = useState(null);
  const [chatPreviewClaim, setChatPreviewClaim] = useState(null);
  const [chatPreviewProfile, setChatPreviewProfile] = useState(null);
  const [chatActionSubmitting, setChatActionSubmitting] = useState(false);
  const [activeChatRoomId, setActiveChatRoomId] = useState(null);
  const [activeChatRoomNickname, setActiveChatRoomNickname] = useState("");
  const [chatLastMessages, setChatLastMessages] = useState({});
  const [chatRoomStatusMap, setChatRoomStatusMap] = useState({});
  const [chatListNowTick, setChatListNowTick] = useState(() => Date.now());
  const pageRef = useRef(page);
  const matchingModeRef = useRef(matchingMode);
  const activeChatRoomIdRef = useRef(null);
  const pendingChatRequestClaimIdRef = useRef(null);
  const mySentPostsRef = useRef([]);
  const receivedClaimsRef = useRef([]);
  const sentClaimsRef = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setChatListNowTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    matchingModeRef.current = matchingMode;
  }, [matchingMode]);

  useEffect(() => {
    activeChatRoomIdRef.current = activeChatRoomId;
  }, [activeChatRoomId]);

  const [mySentPosts, setMySentPosts] = useState([]);
  const [sentClaims, setSentClaims] = useState([]);
  const [receivedClaims, setReceivedClaims] = useState([]);
  const [myReceivedCloudViews, setMyReceivedCloudViews] = useState([]);
  const [senderCheckCandidates, setSenderCheckCandidates] = useState([]);
  const [senderCheckPicks, setSenderCheckPicks] = useState([]);
  const [receivedSenderCheckPicks, setReceivedSenderCheckPicks] = useState([]);
  const [myCloudChecks, setMyCloudChecks] = useState([]);
  const [cloudCalendarRecords, setCloudCalendarRecords] = useState([]);
  const [cloudCalendarLoading, setCloudCalendarLoading] = useState(false);
  const [cloudCalendarMonth, setCloudCalendarMonth] = useState(() =>
    parseLocalDate(getKoreaDateString()) || new Date()
  );
  const [selectedCloudCalendarDate, setSelectedCloudCalendarDate] = useState(() =>
    getKoreaDateString()
  );

  const femaleHairGuideImage = "/hair-length-guide.png";

  useEffect(() => {
    mySentPostsRef.current = mySentPosts;
  }, [mySentPosts]);

  useEffect(() => {
    receivedClaimsRef.current = receivedClaims;
  }, [receivedClaims]);

  useEffect(() => {
    sentClaimsRef.current = sentClaims;
  }, [sentClaims]);

  const resetActivityData = (nextUserId = null) => {
    setMySentPosts([]);
    setSentClaims([]);
    setReceivedClaims([]);
    setMyReceivedCloudViews([]);
    setSenderCheckCandidates([]);
    setSenderCheckPicks([]);
    setReceivedSenderCheckPicks([]);
    setMyCloudChecks([]);
    setCloudCalendarRecords([]);
    setChatLastMessages({});
    setChatRoomStatusMap({});
    setSentResultPost(null);
    setSentCheckResults([]);
    setSentCheckResultMeta({ rawCount: 0, scoredCount: 0, blockedCount: 0 });
    activityLoadedUserIdRef.current = nextUserId;
  };

  const resetActivityDataIfUserChanged = (nextUserId) => {
    if (activityLoadedUserIdRef.current === nextUserId) return;
    resetActivityData(nextUserId);
  };

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

  const loadHomeTopWeatherPlace = useCallback(async () => {
    if (!profile.campus) return;

    const today = getKoreaDateString();

    const { data, error } = await supabase
      .from("crush_posts")
      .select(
        "id, created_at, seen_date, place, time_period, target_gender, message, sender_nickname"
      )
      .eq("seen_date", today)
      .eq("campus", profile.campus)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setHomeTopWeatherPlace(null);
      setHomeTodayClouds([]);
      return;
    }

    const countMap = {};
    const todayClouds = data || [];

    todayClouds.forEach((post) => {
      const place = getMainPlaceFromPost(post);

      if (!countMap[place]) {
        countMap[place] = {
          place,
          count: 0,
        };
      }

      countMap[place].count += 1;
    });

    const topPlace = Object.values(countMap).sort((a, b) => b.count - a.count)[0];

    setHomeTopWeatherPlace(topPlace || null);
    setHomeTodayClouds(todayClouds);
  }, [profile.campus]);

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
    if (crushPost.bottom_type === "기타 하의" && crushPost.bottom_custom.trim()) {
      return `기타 하의:${crushPost.bottom_custom.trim()}`;
    }

    return crushPost.bottom_type;
  };

  const getFinalOuter = () => {
    if (!crushPost.outer_type) return "";
    if (crushPost.outer_type === "아우터 없음") return "아우터 없음";
    return `${crushPost.outer_type}${crushPost.outer_color ? ` ${crushPost.outer_color}` : ""}`;
  };

  const resetProfile = () => {
    setProfile({
      nickname: "",
      gender: "",
      department: "",
      campus: "",
      student_year: "",
      instagram_id: "",
      bio: "",
    });
    setProfileReady(false);
  };

  const checkVerificationStatus = async (user) => {
    if (!user) return "none";

    // 관리자는 인증 없이 바로 통과
    if (ADMIN_LOGIN_IDS.includes(user?.user_metadata?.login_id)) return "approved";

    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_deleted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileData?.is_deleted) {
      await supabase.auth.signOut();
      return "deleted";
    }

    const { data, error } = await supabase
      .from("dku_verifications")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.log(error);
      return "none";
    }

    // 레코드 자체가 없으면 → 사진 업로드 실패 등으로 인증이 미완성된 상태
    if (!data) return "incomplete";

    return data.status; // "pending" | "approved"
  };

  const loadMyProfile = async (user, force = false) => {
    if (!user) return;

    if (!force && profileLoadedUserIdRef.current === user.id) {
      return;
    }

    profileLoadedUserIdRef.current = user.id;

    const { data, error } = await supabase
      .from("profiles")
      .select("nickname, gender, department, campus, student_year, instagram_id, bio")
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
        campus: data.campus || "",
        student_year: data.student_year || "",
        instagram_id: data.instagram_id || "",
        bio: data.bio || "",
      });
    } else {
      setProfile((prev) => ({
        ...prev,
        nickname: user?.user_metadata?.name || "",
        student_year: user?.user_metadata?.student_id || "",
      }));
    }

    setProfileReady(true);
  };

  const fetchPublicProfile = async (userId) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles_public")
      .select("nickname, department, student_year, bio")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.log(error);
      toast.error("프로필을 불러오지 못했어요.");
      return null;
    }

    return data;
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
      resetActivityDataIfUserChanged(savedUser?.id || null);

      if (savedUser) {
        // 인증 확인이 끝날 때까지 authLoading 유지 (홈 화면 노출 방지)
        const verifyStatus = await checkVerificationStatus(savedUser);
        if (!mounted) return;
        if (verifyStatus === "deleted") {
          setSession(null);
          setCurrentUser(null);
          toast.error("탈퇴 처리된 계정이에요.");
        } else if (verifyStatus === "pending" || verifyStatus === "incomplete") {
          setPage("verificationPending");
        } else {
          loadMyProfile(savedUser);
        }
      }

      setAuthLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // 회원가입 중이면 onAuthStateChange가 state를 건드리지 않음
      // handleSignUp이 모든 상태를 직접 제어함
      if (isSigningUpRef.current) return;

      const newUser = newSession?.user || null;

      setSession(newSession);
      setCurrentUser(newUser);
      resetActivityDataIfUserChanged(newUser?.id || null);
      setAuthLoading(false);

      if (newUser) {
        if (event !== "INITIAL_SESSION") {
          // 로그인 이벤트는 handleLogin이 직접 처리하므로 건너뜀
          // (handleLogin이 이미 verification 체크 후 page 설정함)
        }
      } else {
        profileLoadedUserIdRef.current = null;
        resetProfile();
        resetActivityData(null);
        setPage("home");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const applySharedPostUrl = (url) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const postId = parsed.searchParams.get("post");
        if (postId) {
          guestPreviewFetchedRef.current = false;
          setSharedPostId(postId);
        }
      } catch (e) {
        console.log(e);
      }
    };

    let cancelled = false;
    let listenerHandle;

    // 앱이 완전히 꺼진 상태(콜드 스타트)에서 링크로 열렸을 때 처리
    CapacitorApp.getLaunchUrl()
      .then((result) => {
        if (!cancelled) applySharedPostUrl(result?.url);
      })
      .catch((e) => console.log(e));

    // 앱이 이미 떠있거나 백그라운드에 있을 때 링크로 다시 열렸을 때 처리
    CapacitorApp.addListener("appUrlOpen", (event) => {
      applySharedPostUrl(event.url);
    }).then((handle) => {
      if (cancelled) {
        handle.remove();
      } else {
        listenerHandle = handle;
      }
    });

    return () => {
      cancelled = true;
      listenerHandle?.remove();
    };
  }, []);

  useEffect(() => {
    initPush();
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      linkPushUser(currentUser.id);
    } else {
      unlinkPushUser();
    }
  }, [currentUser]);

  const openSharedPost = async (postId) => {
    try {
      const { data, error } = await supabase
        .from("crush_posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();

      if (error || !data) {
        toast.error("이 구름을 찾지 못했어요. 삭제됐거나 링크가 잘못됐을 수 있어요.");
        setPage("home");
        setSharedPostId(null);
        setGuestSharedPreview(false);
        return;
      }

      setSharedPost(data);
      setPage("sharedPost");
    } finally {
      setSharedPostLoading(false);
    }
  };

  useEffect(() => {
    if (!sharedPostId) return;
    if (authLoading) return;

    if (!currentUser) {
      // 로그인 안 한 상태: 미리보기만 한 번 보여주고, 로그인은 강제하지 않음
      if (guestPreviewFetchedRef.current) return;
      guestPreviewFetchedRef.current = true;
      setGuestSharedPreview(true);
      setSharedPostLoading(true);
      openSharedPost(sharedPostId);
      return;
    }

    if (!profileReady) return;
    if (!profile.nickname || !profile.gender || !profile.instagram_id) return;

    const postId = sharedPostId;
    setSharedPostId(null);
    setGuestSharedPreview(false);
    window.history.replaceState({}, "", window.location.pathname);

    if (sharedPost && String(sharedPost.id) === String(postId)) {
      setPage("sharedPost");
    } else {
      openSharedPost(postId);
    }
  }, [
    sharedPostId,
    authLoading,
    currentUser,
    profileReady,
    profile.nickname,
    profile.gender,
    profile.instagram_id,
    sharedPost,
  ]);

  useEffect(() => {
    if (!currentUser) {
      setBlockedUserIds([]);
      return;
    }

    supabase
      .from("blocks")
      .select("blocked_user_id")
      .eq("blocker_user_id", currentUser.id)
      .then(({ data, error }) => {
        if (error) {
          console.log(error);
          return;
        }
        setBlockedUserIds((data || []).map((row) => row.blocked_user_id));
      });
  }, [currentUser]);

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

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [page, crushStep]);

  useEffect(() => {
    if (!currentUser) return;

    Promise.resolve().then(loadHomeTopWeatherPlace);
  }, [currentUser, loadHomeTopWeatherPlace]);

  const handlePickVerificationFile = async () => {
    try {
      const file = await pickImageFromLibrary();
      if (!file) return;

      const fileError = validateImageFile(file, "학생 인증 이미지");
      if (fileError) {
        toast.error(fileError);
        return;
      }
      setVerificationFile(file);
    } catch (error) {
      const message = error?.message || "";
      if (message.toLowerCase().includes("cancel")) return;

      if (message.toLowerCase().includes("denied")) {
        toast.error("사진 접근 권한이 꺼져 있어요. 설정 > 단꿈 > 사진에서 권한을 켜주세요.");
        return;
      }

      toast.error("사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      console.log(error);
    }
  };

  const handleSignUp = async () => {
    if (authSubmitting) return;

    const loginId = authForm.login_id.trim();

    // ── 필드 검증 ──
    if (!authForm.name.trim()) {
      toast.error("닉네임 또는 이름을 입력해주세요.");
      return;
    }
    if (!authForm.student_id.trim()) {
      toast.error("학번을 입력해주세요.");
      return;
    }
    if (!authForm.department.trim()) {
      toast.error("학과를 입력해주세요.");
      return;
    }
    if (!authForm.campus) {
      toast.error("캠퍼스를 선택해주세요.");
      return;
    }
    if (!verificationFile) {
      toast.error("MY DKU 첫 화면 캡처를 업로드해주세요.");
      return;
    }
    const verificationFileError = validateImageFile(verificationFile, "학생 인증 이미지");
    if (verificationFileError) {
      toast.error(verificationFileError);
      return;
    }
    if (!loginId) {
      toast.error("아이디를 입력해주세요.");
      return;
    }
    if (loginId.length < 4) {
      toast.error("아이디는 4자 이상으로 입력해주세요.");
      return;
    }
    if (loginId.length > 30) {
      toast.error("아이디는 30자 이하로 입력해주세요.");
      return;
    }
    if (!/^[a-zA-Z0-9_!@#$%^&*]*$/.test(loginId)) {
      toast.error("아이디는 영문, 숫자, 특수문자(!@#$%^&*_)만 사용할 수 있어요.");
      return;
    }
    if (authForm.password.length < 6) {
      toast.error("비밀번호는 6자리 이상으로 입력해주세요.");
      return;
    }
    if (!privacyConsent) {
      toast.error("개인정보처리방침에 동의해주세요.");
      return;
    }

    setAuthSubmitting(true);
    isSigningUpRef.current = true;

    try {
      // ── 1단계: 계정 생성 ──
      setSignupProgress("1단계: 계정 생성 중...");
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
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          toast.error("이미 사용 중인 아이디예요. 다른 아이디를 입력하거나 로그인해주세요.");
        } else {
          toast.error("회원가입에 실패했어요. 잠시 후 다시 시도해주세요.");
        }
        console.log(error);
        return;
      }

      const signedUpUser = data.session?.user || data.user || null;

      if (!signedUpUser) {
        toast.error("계정 생성은 완료됐지만 세션을 확인하지 못했어요. 로그인을 시도해주세요.");
        setAuthMode("login");
        return;
      }

      // ── 2단계: MY DKU 자동 인증 시도 ──
      setSignupProgress("2단계: MY DKU 자동 인증 확인 중...");
      const ocrResult = await runDkuVerificationOcr(verificationFile);
      const autoReview = evaluateDkuAutoVerification({
        signupStudentId: authForm.student_id.trim(),
        signupDepartment: authForm.department.trim(),
        parsed: ocrResult.parsed,
      });

      let filePath = null;
      let finalVerificationStatus = "pending";
      let finalReviewedAt = null;

      if (ocrResult.available && autoReview.approved) {
        finalVerificationStatus = "approved";
        finalReviewedAt = new Date().toISOString();
      } else {
        // 자동 승인 실패/미지원이면 그때만 사진을 임시 보관하고 관리자 검수로 넘긴다.
        setSignupProgress("3단계: 인증 사진 임시 업로드 중...");
        const compressedFile = await compressImage(verificationFile);
        filePath = makeStorageFilePath(signedUpUser.id, compressedFile);

        const { error: uploadError } = await supabase.storage
          .from("dku-verifications")
          .upload(filePath, compressedFile, {
            contentType: compressedFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.log(uploadError);
          setProfile((prev) => ({
            ...prev,
            nickname: authForm.name.trim(),
            student_year: authForm.student_id.trim(),
          }));
          setSession(data.session || null);
          setCurrentUser(signedUpUser);
          resetActivityData(signedUpUser?.id || null);
          toast.error("인증 사진 업로드에 실패했어요. 단꿈 인스타그램으로 문의해주세요.");
          setPage("verificationPending");
          return;
        }
      }

      // ── 4단계: 인증 신청 저장 ──
      setSignupProgress("4단계: 인증 결과 저장 중...");
      const verificationPayload = {
        user_id: signedUpUser.id,
        name: finalVerificationStatus === "pending" ? authForm.name.trim() : null,
        student_id: finalVerificationStatus === "pending" ? authForm.student_id.trim() : null,
        department: authForm.department.trim(),
        screenshot_path: finalVerificationStatus === "pending" ? filePath : null,
        status: finalVerificationStatus,
        reviewed_at: finalReviewedAt,
        auto_review_status: finalVerificationStatus === "approved" ? "approved" : "manual_required",
        auto_review_reason: autoReview.reason || ocrResult.reason || "",
        ocr_student_id: ocrResult.parsed?.ocrStudentId || "",
        ocr_department: ocrResult.parsed?.ocrDepartment || "",
        ocr_enrollment_status: ocrResult.parsed?.ocrStatus || "",
        auto_reviewed_at: new Date().toISOString(),
      };

      const { error: verificationError } = await supabase
        .from("dku_verifications")
        .insert([verificationPayload]);

      if (verificationError) {
        console.log(verificationError);
        const fallbackPayload = {
          user_id: signedUpUser.id,
          name: finalVerificationStatus === "pending" ? authForm.name.trim() : null,
          student_id: finalVerificationStatus === "pending" ? authForm.student_id.trim() : null,
          department: authForm.department.trim(),
          screenshot_path: finalVerificationStatus === "pending" ? filePath : null,
          status: finalVerificationStatus,
          reviewed_at: finalReviewedAt,
        };
        const { error: fallbackError } = await supabase
          .from("dku_verifications")
          .insert([fallbackPayload]);

        if (fallbackError) {
          toast.error("인증 신청 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          console.log(fallbackError);
          return;
        }
      }

      // ── profiles 테이블에 기본 정보 자동 저장 ──
      const { error: profileUpsertError } = await supabase.from("profiles").upsert(
        [{
          user_id: signedUpUser.id,
          nickname: authForm.name.trim(),
          student_year: authForm.student_id.trim(),
          department: authForm.department.trim(),
          campus: authForm.campus,
          gender: "",
          instagram_id: "",
          bio: "",
        }],
        { onConflict: "user_id" }
      );

      if (profileUpsertError) {
        toast.error("프로필 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
        console.log(profileUpsertError);
        return;
      }

      // ── 완료: 세션/유저/페이지 한 번에 설정 ──
      setProfile((prev) => ({
        ...prev,
        nickname: authForm.name.trim(),
        student_year: authForm.student_id.trim(),
        department: authForm.department.trim(),
        campus: authForm.campus,
      }));
      setSession(data.session || null);
      setCurrentUser(signedUpUser);
      resetActivityData(signedUpUser?.id || null);
      if (finalVerificationStatus === "approved") {
        toast.success("MY DKU 자동 인증 완료! 바로 이용할 수 있어요.");
        setPage("profile");
      } else {
        const manualReason = autoReview.reason || ocrResult.reason;
        if (manualReason) {
          toast("자동 인증 보류: " + manualReason);
        }
        toast.success("회원가입 신청 완료! 학생 인증 승인 후 이용할 수 있어요.");
        setPage("verificationPending");
      }

    } catch (e) {
      toast.error("예상치 못한 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
      console.log(e);
    } finally {
      isSigningUpRef.current = false;
      setSignupProgress("");
      setAuthSubmitting(false);
    }
  };

const handleLogin = async () => {
    if (authSubmitting) return;

    const loginId = authForm.login_id.trim();

    if (!loginId || !authForm.password) {
      toast.error("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setAuthSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: makeAuthEmail(loginId),
        password: authForm.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("아이디 또는 비밀번호가 틀렸어요.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("이메일 인증이 필요해요.");
        } else {
          toast.error("로그인에 실패했어요. 잠시 후 다시 시도해주세요.");
        }
        console.log(error);
        return;
      }

      // 로그인 후 인증 상태 확인
      const verifyStatus = await checkVerificationStatus(data.user);

      if (verifyStatus === "deleted") {
        toast.error("탈퇴 처리된 계정이에요.");
        return;
      }

      setSession(data.session);
      setCurrentUser(data.user);
      resetActivityDataIfUserChanged(data.user?.id || null);

      if (verifyStatus === "pending" || verifyStatus === "incomplete") {
        toast.error("학생 인증이 아직 승인되지 않았어요. 승인될 때까지 기다려주세요.");
        setPage("verificationPending");
      } else {
        setPage("home");
        loadMyProfile(data.user, true);
      }
    } catch (e) {
      toast.error("예상치 못한 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
      console.log(e);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setCurrentUser(null);
    resetProfile();
    resetActivityData(null);
    setSharedPostId(null);
    setSharedPost(null);
    setGuestSharedPreview(false);

    setAuthForm({
      name: "",
      student_id: "",
      department: "",
      campus: "",
      login_id: "",
      password: "",
    });

    setVerificationFile(null);

    setAuthMode("login");
    setPage("home");
  };

  const handleAccountDeletion = async () => {
    if (accountDeleting || !currentUser) return;

    const ok = window.confirm(
      "정말 탈퇴하시겠어요? 내가 띄운 구름, 받은 응답, 인증 정보가 모두 삭제되고 되돌릴 수 없어요."
    );
    if (!ok) return;

    setAccountDeleting(true);

    try {
      const { data: myPosts } = await supabase
        .from("crush_posts")
        .select("id")
        .eq("sender_user_id", currentUser.id);

      const myPostIds = (myPosts || []).map((post) => post.id);

      if (myPostIds.length > 0) {
        await supabase.from("claims").delete().in("crush_post_id", myPostIds);
        await supabase.from("cloud_views").delete().in("crush_post_id", myPostIds);
      }

      await supabase.from("claims").delete().eq("claimer_user_id", currentUser.id);
      await supabase.from("cloud_views").delete().eq("viewer_user_id", currentUser.id);
      await supabase.from("cloud_checks").delete().eq("checker_user_id", currentUser.id);
      await supabase.from("crush_posts").delete().eq("sender_user_id", currentUser.id);

      const { data: myVerifications } = await supabase
        .from("dku_verifications")
        .select("screenshot_path")
        .eq("user_id", currentUser.id);

      await supabase.from("dku_verifications").delete().eq("user_id", currentUser.id);

      const screenshotPaths = (myVerifications || [])
        .map((v) => v.screenshot_path)
        .filter(Boolean);

      if (screenshotPaths.length > 0) {
        await supabase.storage.from("dku-verifications").remove(screenshotPaths);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: "탈퇴한 사용자",
          instagram_id: "",
          bio: "",
          department: "",
          student_year: "",
          gender: "",
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("user_id", currentUser.id);

      if (error) {
        toast.error("탈퇴 처리에 실패했어요: " + error.message);
        console.log(error);
        return;
      }

      await supabase.auth.signOut();
      setSession(null);
      setCurrentUser(null);
      resetProfile();
      resetActivityData(null);
      setPage("home");
      toast.success("탈퇴가 완료됐어요. 그동안 이용해주셔서 감사해요.");
    } finally {
      setAccountDeleting(false);
    }
  };

  const reportContent = async (targetType, targetId, targetUserId) => {
    const reason = window.prompt(
      "신고 사유를 간단히 적어주세요. (예: 부적절한 내용, 허위 정보 등)"
    );
    if (reason === null) return;

    if (!reason.trim()) {
      toast.error("신고 사유를 입력해주세요.");
      return;
    }

    const { error } = await supabase.from("reports").insert([
      {
        reporter_user_id: currentUser.id,
        target_type: targetType,
        target_id: String(targetId),
        target_user_id: targetUserId || null,
        reason: reason.trim(),
      },
    ]);

    if (error) {
      toast.error("신고 접수에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    toast.success("신고가 접수됐어요. 확인 후 조치할게요.");
  };

  const blockUser = async (targetUserId, targetLabel) => {
    if (!targetUserId) return;

    const ok = window.confirm(
      `${targetLabel || "이 사용자"}을(를) 차단할까요? 차단하면 서로의 구름을 볼 수 없어요.`
    );
    if (!ok) return;

    const { error } = await supabase.from("blocks").upsert(
      [{ blocker_user_id: currentUser.id, blocked_user_id: targetUserId }],
      { onConflict: "blocker_user_id,blocked_user_id", ignoreDuplicates: true }
    );

    if (error) {
      toast.error("차단에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    setBlockedUserIds((prev) => [...new Set([...prev, targetUserId])]);
    toast.success("차단했어요.");
  };

// 날짜·성별은 DB 쿼리에서 이미 정확히 일치하는 것만 가져오므로(or/not 필터),
// 점수에는 관여하지 않음. 30%는 "머리만 입력하고 그게 전부 맞은 경우"의
// 점수와 같아서, 이걸 최소 통과선으로 잡음.
const MATCH_THRESHOLD = 30;

const HAIR_WEIGHT = 30;

// "탈부착 난이도" 기준 배점: 하루 종일 잘 안 바뀌는 항목(상의/하의/신발)이 가장 높고,
// 실내외 이동하며 벗었다 입었다 하는 항목(안경/아우터)은 중간, 두고 다니거나
// 뺐다 꼈다 하는 항목(가방/이어폰)이 가장 낮음. 머리 30 + 나머지 70 = 100점 만점.
// "잘 모르겠음"은 해당 항목 절반 점수(소수점 올림), "아우터 없음"은 12점으로 본다.
const FIELD_WEIGHTS = {
  top_type: 9,
  top_color: 9,
  bottom_type: 9,
  bottom_color: 9,
  shoe_type: 9,
  glasses_type: 6,
  outer_type: 6,
  outer_color: 6,
  bag_type: 4,
  earphone_type: 3,
};

const UNKNOWN_MATCH_VALUES = ["잘 모르겠음", "잘 모르겠어요"];

const isUnknownMatchValue = (value) => UNKNOWN_MATCH_VALUES.includes(value);

const getUnknownMatchScore = (weight) => Math.ceil(weight / 2);

const normalizeMatchText = (value) => {
  if (!value || isUnknownMatchValue(value)) return "";
  return String(value).replace(/\s/g, "").toLowerCase();
};

const containsMatch = (source, target) => {
  const normalizedSource = normalizeMatchText(source);
  const normalizedTarget = normalizeMatchText(target);

  if (!normalizedSource || !normalizedTarget) return false;

  return (
    normalizedSource.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedSource)
  );
};

const getCheckHairFeature = (checkInput) => {
  if (checkInput.hair_feature) return checkInput.hair_feature;

  const gender = checkInput.checker_gender || profile.gender;

  if (gender === "여자") {
    return makeHairFeature(
      checkInput.female_hair_style,
      checkInput.female_hair_color,
      checkInput.female_hat,
      checkInput.female_bangs
    );
  }

  if (gender === "남자") {
    return makeHairFeature(
      checkInput.male_hair_style,
      checkInput.male_hair_color,
      checkInput.male_hat,
      checkInput.male_bangs
    );
  }

  return "";
};

const getCloudMatchScore = (post, checkInput) => {
  let score = 0;
  const reasons = [];

  // 머리: 항목(스타일/색/모자/앞머리)별 부분 배점.
  // "잘 모르겠음"은 해당 머리 항목의 절반 점수로 계산한다.
  const checkHair = getCheckHairFeature(checkInput);
  if (checkHair) {
    const checkHairParts = checkHair
      .split(" / ")
      .filter(Boolean);
    if (checkHairParts.length > 0) {
      let matchedHairCount = 0;
      let hairMatchUnits = 0;

      checkHairParts.forEach((part) => {
        if (isUnknownMatchValue(part)) {
          hairMatchUnits += 0.5;
        } else if (containsMatch(post.hair_feature, part)) {
          matchedHairCount += 1;
          hairMatchUnits += 1;
        }
      });

      if (hairMatchUnits > 0) {
        score += Math.ceil(HAIR_WEIGHT * (hairMatchUnits / checkHairParts.length));
      }
      if (matchedHairCount > 0) {
        reasons.push(`헤어 ${matchedHairCount}개 항목 일치`);
      } else if (hairMatchUnits > 0) {
        reasons.push("헤어 일부 불확실");
      }
    }
  }

  const checkField = (checkValue, weight, postValue, fallbackSource, label) => {
    if (!checkValue) return;
    if (isUnknownMatchValue(checkValue)) {
      score += getUnknownMatchScore(weight);
      reasons.push(`${label} 불확실`);
      return;
    }
    if (containsMatch(postValue, checkValue) || containsMatch(fallbackSource, checkValue)) {
      score += weight;
      reasons.push(`${label} 일치`);
    }
  };

  const postStyleSource = post.clothes_style || "";
  const postAccessorySource = post.accessory || "";

  checkField(checkInput.glasses_type, FIELD_WEIGHTS.glasses_type, post.glasses_status, postAccessorySource, "안경");
  checkField(checkInput.top_type, FIELD_WEIGHTS.top_type, post.top_type, postStyleSource, "상의 종류");
  checkField(checkInput.top_color, FIELD_WEIGHTS.top_color, post.top_color, postStyleSource, "상의 색상");
  if (checkInput.outer_type === "아우터 없음") {
    if (containsMatch(post.outer_type, "아우터 없음") || containsMatch(postStyleSource, "아우터 없음")) {
      score += FIELD_WEIGHTS.outer_type + FIELD_WEIGHTS.outer_color;
      reasons.push("아우터 없음 일치");
    }
  } else {
    checkField(checkInput.outer_type, FIELD_WEIGHTS.outer_type, post.outer_type, postStyleSource, "아우터");
    checkField(checkInput.outer_color, FIELD_WEIGHTS.outer_color, post.outer_color, postStyleSource, "아우터 색상");
  }
  checkField(checkInput.bottom_type, FIELD_WEIGHTS.bottom_type, post.bottom_type, postStyleSource, "하의 종류");
  checkField(checkInput.bottom_color, FIELD_WEIGHTS.bottom_color, post.bottom_color, postStyleSource, "하의 색상");
  checkField(checkInput.shoe_type, FIELD_WEIGHTS.shoe_type, post.shoe_type, postAccessorySource, "신발");
  checkField(checkInput.bag_type, FIELD_WEIGHTS.bag_type, post.bag_type, postAccessorySource, "가방");
  checkField(checkInput.earphone_type, FIELD_WEIGHTS.earphone_type, post.earphone_type, postAccessorySource, "이어폰");

  return {
    score: Math.round(Math.min(100, score)),
    reasons: [...new Set(reasons)].slice(0, 4),
  };
};

const getPostMatchScore = (post) => {
  const match = getCloudMatchScore(post, {
    ...searchForm,
    checker_gender: profile.gender,
    hair_feature: getFinalSearchHairFeature(),
  });

  if (match.score > 0) return match;

  let score = 0;
  const reasons = [];

  const checkField = (formValue, weight, matchSource, label) => {
    if (!formValue) return;
    if (isUnknownMatchValue(formValue)) {
      score += getUnknownMatchScore(weight);
      reasons.push(`${label} 불확실`);
      return;
    }
    if (containsMatch(matchSource, formValue)) {
      score += weight;
      reasons.push(`${label} 일치`);
    }
  };

  const searchHair = getFinalSearchHairFeature();
  if (searchHair) {
    const searchHairParts = searchHair
      .split(" / ")
      .filter(Boolean);
    if (searchHairParts.length > 0) {
      let matchedHairCount = 0;
      let hairMatchUnits = 0;

      searchHairParts.forEach((part) => {
        if (isUnknownMatchValue(part)) {
          hairMatchUnits += 0.5;
        } else if (containsMatch(post.hair_feature, part)) {
          matchedHairCount += 1;
          hairMatchUnits += 1;
        }
      });

      if (hairMatchUnits > 0) {
        score += Math.ceil(HAIR_WEIGHT * (hairMatchUnits / searchHairParts.length));
      }
      if (matchedHairCount > 0) {
        reasons.push(`헤어 ${matchedHairCount}개 항목 일치`);
      } else if (hairMatchUnits > 0) {
        reasons.push("헤어 일부 불확실");
      }
    }
  }

  checkField(searchForm.glasses_type, FIELD_WEIGHTS.glasses_type, post.accessory, "안경");
  checkField(searchForm.top_type, FIELD_WEIGHTS.top_type, post.clothes_style, "상의 종류");
  checkField(searchForm.top_color, FIELD_WEIGHTS.top_color, post.clothes_style, "상의 색상");
  if (searchForm.outer_type === "아우터 없음") {
    if (containsMatch(post.clothes_style, "아우터 없음")) {
      score += FIELD_WEIGHTS.outer_type + FIELD_WEIGHTS.outer_color;
      reasons.push("아우터 없음 일치");
    }
  } else {
    checkField(searchForm.outer_type, FIELD_WEIGHTS.outer_type, post.clothes_style, "아우터");
    checkField(searchForm.outer_color, FIELD_WEIGHTS.outer_color, post.clothes_style, "아우터 색상");
  }
  checkField(searchForm.bottom_type, FIELD_WEIGHTS.bottom_type, post.clothes_style, "하의 종류");
  checkField(searchForm.bottom_color, FIELD_WEIGHTS.bottom_color, post.clothes_style, "하의 색상");
  checkField(searchForm.shoe_type, FIELD_WEIGHTS.shoe_type, post.accessory, "신발");
  checkField(searchForm.bag_type, FIELD_WEIGHTS.bag_type, post.accessory, "가방");
  checkField(searchForm.earphone_type, FIELD_WEIGHTS.earphone_type, post.accessory, "이어폰");

  return {
    score: Math.round(Math.min(100, score)),
    reasons: [...new Set(reasons)].slice(0, 4),
  };
};

const hideSearchResult = (postId) => {
  setHiddenResultIds((prev) => {
    if (prev.includes(postId)) return prev;
    return [...prev, postId];
  });
};
  const renderPostQuestionAnswer = (post) => {
    const accessoryText = post.accessory || "";
    const topText = getPostTopText(post) || "-";
    const bottomText = getPostBottomText(post) || "-";

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

        <details className="qaDetails">
          <summary className="qaToggleLabel" />

          <div className="qaBody">
            <p>
              <strong>헤어:</strong> {post.hair_feature || "-"}
            </p>

            <p>
              <strong>상의:</strong> {topText || "-"}
            </p>

            <p>
              <strong>하의:</strong> {bottomText || "-"}
            </p>

            <p>
              <strong>소지품/상황:</strong> {accessoryText || "-"}
            </p>
          </div>
        </details>
      </div>
    );
  };

  const renderCloudActionButtons = (post) => (
    <>
      {(!currentUser || post.sender_user_id !== currentUser.id) && (
      <button
        onClick={() => {
          if (!currentUser) {
            toast.error("로그인하고 확인해보세요!");
            setGuestSharedPreview(false);
            return;
          }
          setSelectedPost(post);
          setPage("claimForm");
        }}
      >
        이거 나인 것 같아요
      </button>
      )}

      <button
        type="button"
        className="findOwnerButton"
        onClick={async () => {
          const topText = getPostTopText(post);
          const hairParts = (post.hair_feature || "")
            .split(" / ")
            .filter((p) => p && p !== "잘 모르겠음")
            .slice(0, 2)
            .join(", ");

          const shareText = [
            `야 단꿈에 이거 너 아니야? ☁️`,
            ``,
            `${post.seen_date ? `${formatDateLabel(post.seen_date)} ` : ""}${post.time_period || ""} ${post.place || ""}`,
            `${post.target_gender || ""} / ${hairParts || ""}${topText ? ` / ${topText}` : ""}`,
            ``,
            `확인해봐 👇`,
            `${PUBLIC_APP_URL}/?post=${post.id}`,
          ].join("\n");

          if (navigator.share) {
            try {
              await navigator.share({
                title: "☁️ 단꿈 - 이 구름 주인 찾아주기",
                text: shareText,
              });
            } catch (e) {
              if (e.name !== "AbortError") {
                await navigator.clipboard.writeText(shareText);
                toast.success("복사됐어요! 친구에게 보내보세요.");
              }
            }
          } else {
            await navigator.clipboard.writeText(shareText);
            toast.success("복사됐어요! 친구에게 보내보세요.");
          }
        }}
      >
        ☁️ 이 구름 주인 찾아주기
      </button>
    </>
  );

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
      moveCloudSendStep(2, "next", { targetGender: value });
    }, 120);
  };

  const goBackStep = async () => {
    if (crushStep === 1) {
      setEditingPost(null);
      await leaveCloudSendFlow("home_exit", "home");
      return;
    }

    cloudSendPreviousCountRef.current += 1;
    cloudSendPreviousStepsRef.current = [
      ...cloudSendPreviousStepsRef.current,
      String(crushStep),
    ];

    await moveCloudSendStep(crushStep - 1, "previous");
  };

  const checkProfileRequired = () => {
    if (!currentUser) {
      toast.error("먼저 로그인 또는 회원가입을 해주세요.");
      return false;
    }

    if (!profile.nickname) {
      toast.error("먼저 내 프로필에서 닉네임을 입력해주세요.");
      setPage("profile");
      return false;
    }

    if (!profile.gender) {
      toast.error("먼저 내 프로필에서 성별을 선택해주세요.");
      setPage("profile");
      return false;
    }

    if (!profile.instagram_id) {
      toast.error("먼저 내 프로필에서 인스타 아이디를 입력해주세요.");
      setPage("profile");
      return false;
    }

    return true;
  };

  const openSendPage = async () => {
    if (!checkProfileRequired()) return;

    if (page === "send") return;

    if (page === "search" && cloudCheckFlowIdRef.current) {
      await finishCloudCheckFlowLog({
        exitType: "bottom_send",
        completed: false,
      });
    }

    resetCrushPost();
    await startCloudSendFlowLog({ targetGender: "" });
    setPage("send");
  };

  const openEditQuickCloud = async (post) => {
    if (!checkProfileRequired()) return;

    // 기존 빠른 구름의 기본 정보를 crushPost에 미리 채워줌
    setCrushPost({
      ...emptyCrushPost,
      target_gender: post.target_gender || "",
      seen_date: post.seen_date || "",
      place: post.place ? post.place.split(" - ")[0] : "",
      custom_place: post.place && post.place.includes(" - ") ? post.place.split(" - ")[1] : "",
      time_period: post.time_period || "",
      message: post.message || "",
    });

    setEditingPost(post);
    setCrushStep(1);
    await startCloudSendFlowLog({ targetGender: post.target_gender || "" });
    setPage("send");
  };

  const openSearchPage = async () => {
    if (!checkProfileRequired()) return;

    if (page === "search") return;

    if (page === "send" && cloudSendFlowIdRef.current) {
      await finishCloudSendFlowLog({
        exitType: "bottom_search",
        completed: false,
      });
    }

    setSearchStep(1);
    await startCloudCheckFlowLog();
    setPage("search");
  };

  const openNewCloudPage = async () => {
    if (!checkProfileRequired()) return;

    resetCrushPost();
    await startCloudSendFlowLog({ targetGender: "" });
    setPage("send");
  };

  const openProfilePage = async () => {
    if (!checkProfileRequired()) return;

    await leaveActiveFlow("profile_exit", "profile");
    await loadMyActivityData();
  };

  const resetCrushPost = () => {
    setCrushPost(emptyCrushPost);
    setCrushStep(1);
  };

  const getCloudSendSecondsSnapshot = () => ({
    ...cloudSendStepSecondsRef.current,
  });

  const addCurrentCloudSendStepTime = () => {
    if (!cloudSendFlowIdRef.current || !cloudSendStepEnteredAtRef.current) {
      return getCloudSendSecondsSnapshot();
    }

    const now = Date.now();
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now - cloudSendStepEnteredAtRef.current) / 1000)
    );

    if (elapsedSeconds > 0) {
      const currentSeconds = cloudSendStepSecondsRef.current[crushStep] || 0;
      cloudSendStepSecondsRef.current = {
        ...cloudSendStepSecondsRef.current,
        [crushStep]: capCloudSendSeconds(currentSeconds + elapsedSeconds),
      };
    }

    cloudSendStepEnteredAtRef.current = now;
    return getCloudSendSecondsSnapshot();
  };

  const saveCloudSendFlowLog = async ({
    exitType,
    completed = false,
    targetGender,
    ended = false,
    stepNumber = crushStep,
  } = {}) => {
    if (!cloudSendFlowIdRef.current || !currentUser) return;

    const stepSeconds = getCloudSendSecondsSnapshot();
    const totalSeconds = capCloudSendSeconds(
      Object.values(stepSeconds).reduce((sum, value) => sum + (value || 0), 0)
    );

    const payload = {
      id: cloudSendFlowIdRef.current,
      user_id: currentUser.id,
      nickname: profile.nickname || "",
      target_gender: targetGender ?? crushPost.target_gender ?? "",
      started_at: cloudSendStartedAtRef.current,
      ended_at: ended ? new Date().toISOString() : null,
      completed,
      exit_step: stepNumber,
      exit_step_name: CLOUD_SEND_STEP_NAMES[stepNumber] || "",
      exit_type: exitType || "step_update",
      total_seconds: totalSeconds,
      step_1_seconds: stepSeconds[1] || 0,
      step_2_seconds: stepSeconds[2] || 0,
      step_3_seconds: stepSeconds[3] || 0,
      step_4_seconds: stepSeconds[4] || 0,
      step_5_seconds: stepSeconds[5] || 0,
      step_6_seconds: stepSeconds[6] || 0,
      previous_count: cloudSendPreviousCountRef.current,
      previous_steps: cloudSendPreviousStepsRef.current.join(","),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("cloud_send_exit_logs")
      .upsert([payload], { onConflict: "id" });

    if (error) {
      console.log(error);
    }
  };

  const startCloudSendFlowLog = async ({ targetGender = "" } = {}) => {
    if (!currentUser) return;

    cloudSendFlowIdRef.current = createCloudSendFlowId();
    cloudSendStartedAtRef.current = new Date().toISOString();
    cloudSendStepEnteredAtRef.current = Date.now();
    cloudSendStepSecondsRef.current = createStepTimingState();
    cloudSendPreviousCountRef.current = 0;
    cloudSendPreviousStepsRef.current = [];

    await saveCloudSendFlowLog({
      exitType: "started",
      stepNumber: 1,
      targetGender,
    });
  };

  const finishCloudSendFlowLog = async ({
    exitType,
    completed = false,
    targetGender,
  }) => {
    if (!cloudSendFlowIdRef.current) return;

    addCurrentCloudSendStepTime();
    await saveCloudSendFlowLog({
      exitType,
      completed,
      targetGender,
      ended: true,
    });

    cloudSendFlowIdRef.current = null;
    cloudSendStartedAtRef.current = null;
    cloudSendStepEnteredAtRef.current = null;
    cloudSendStepSecondsRef.current = createStepTimingState();
    cloudSendPreviousCountRef.current = 0;
    cloudSendPreviousStepsRef.current = [];
  };

  const moveCloudSendStep = async (nextStep, exitType, options = {}) => {
    if (cloudSendFlowIdRef.current) {
      addCurrentCloudSendStepTime();
      await saveCloudSendFlowLog({
        exitType,
        targetGender: options.targetGender,
      });
      cloudSendStepEnteredAtRef.current = Date.now();
    }

    setCrushStep(nextStep);
  };

  const leaveCloudSendFlow = async (exitType, nextPage) => {
    if (page === "send" && cloudSendFlowIdRef.current) {
      await finishCloudSendFlowLog({
        exitType,
        completed: false,
      });
    }

    setPage(nextPage);
  };

  const getCloudCheckSecondsSnapshot = () => ({
    ...cloudCheckStepSecondsRef.current,
  });

  const addCurrentCloudCheckStepTime = () => {
    if (!cloudCheckFlowIdRef.current || !cloudCheckStepEnteredAtRef.current) {
      return getCloudCheckSecondsSnapshot();
    }

    const now = Date.now();
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now - cloudCheckStepEnteredAtRef.current) / 1000)
    );

    if (elapsedSeconds > 0) {
      const currentSeconds = cloudCheckStepSecondsRef.current[searchStep] || 0;
      cloudCheckStepSecondsRef.current = {
        ...cloudCheckStepSecondsRef.current,
        [searchStep]: capCloudSendSeconds(currentSeconds + elapsedSeconds),
      };
    }

    cloudCheckStepEnteredAtRef.current = now;
    return getCloudCheckSecondsSnapshot();
  };

  const saveCloudCheckFlowLog = async ({
    exitType,
    completed = false,
    ended = false,
    resultCount = null,
    stepNumber = searchStep,
  } = {}) => {
    if (!cloudCheckFlowIdRef.current || !currentUser) return;

    const stepSeconds = getCloudCheckSecondsSnapshot();
    const totalSeconds = capCloudSendSeconds(
      Object.values(stepSeconds).reduce((sum, value) => sum + (value || 0), 0)
    );

    const payload = {
      id: cloudCheckFlowIdRef.current,
      user_id: currentUser.id,
      nickname: profile.nickname || "",
      checker_gender: profile.gender || "",
      started_at: cloudCheckStartedAtRef.current,
      ended_at: ended ? new Date().toISOString() : null,
      completed,
      exit_step: stepNumber,
      exit_step_name: CLOUD_CHECK_STEP_NAMES[stepNumber] || "",
      exit_type: exitType || "step_update",
      total_seconds: totalSeconds,
      step_1_seconds: stepSeconds[1] || 0,
      step_2_seconds: stepSeconds[2] || 0,
      step_3_seconds: stepSeconds[3] || 0,
      step_4_seconds: stepSeconds[4] || 0,
      step_5_seconds: stepSeconds[5] || 0,
      previous_count: cloudCheckPreviousCountRef.current,
      previous_steps: cloudCheckPreviousStepsRef.current.join(","),
      result_count: resultCount,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("cloud_check_exit_logs")
      .upsert([payload], { onConflict: "id" });

    if (error) {
      console.log(error);
    }
  };

  const startCloudCheckFlowLog = async () => {
    if (!currentUser) return;

    cloudCheckFlowIdRef.current = createCloudSendFlowId();
    cloudCheckStartedAtRef.current = new Date().toISOString();
    cloudCheckStepEnteredAtRef.current = Date.now();
    cloudCheckStepSecondsRef.current = createSearchStepTimingState();
    cloudCheckPreviousCountRef.current = 0;
    cloudCheckPreviousStepsRef.current = [];

    await saveCloudCheckFlowLog({ exitType: "started", stepNumber: 1 });
  };

  const finishCloudCheckFlowLog = async ({
    exitType,
    completed = false,
    resultCount = null,
  }) => {
    if (!cloudCheckFlowIdRef.current) return;

    addCurrentCloudCheckStepTime();
    await saveCloudCheckFlowLog({
      exitType,
      completed,
      ended: true,
      resultCount,
    });

    cloudCheckFlowIdRef.current = null;
    cloudCheckStartedAtRef.current = null;
    cloudCheckStepEnteredAtRef.current = null;
    cloudCheckStepSecondsRef.current = createSearchStepTimingState();
    cloudCheckPreviousCountRef.current = 0;
    cloudCheckPreviousStepsRef.current = [];
  };

  const moveCloudCheckStep = async (nextStep, exitType) => {
    if (cloudCheckFlowIdRef.current) {
      addCurrentCloudCheckStepTime();
      await saveCloudCheckFlowLog({ exitType });
      cloudCheckStepEnteredAtRef.current = Date.now();
    }

    setSearchStep(nextStep);
  };

  const goBackSearchStep = async () => {
    if (searchStep === 1) {
      await leaveCloudCheckFlow("home_exit", "home");
      return;
    }

    cloudCheckPreviousCountRef.current += 1;
    cloudCheckPreviousStepsRef.current = [
      ...cloudCheckPreviousStepsRef.current,
      String(searchStep),
    ];

    await moveCloudCheckStep(searchStep - 1, "previous");
  };

  const leaveCloudCheckFlow = async (exitType, nextPage) => {
    if (page === "search" && cloudCheckFlowIdRef.current) {
      await finishCloudCheckFlowLog({
        exitType,
        completed: false,
      });
    }

    setPage(nextPage);
  };

  const leaveActiveFlow = async (exitType, nextPage) => {
    if (page === "send" && cloudSendFlowIdRef.current) {
      await finishCloudSendFlowLog({
        exitType,
        completed: false,
      });
    } else if (page === "search" && cloudCheckFlowIdRef.current) {
      await finishCloudCheckFlowLog({
        exitType,
        completed: false,
      });
    }

    setPage(nextPage);
  };

  useEffect(() => {
    const saveExitOnPageClose = () => {
      if (page !== "send" || !cloudSendFlowIdRef.current) return;

      addCurrentCloudSendStepTime();
      saveCloudSendFlowLog({
        exitType: "page_unload",
        completed: false,
        ended: true,
      });
    };

    const saveExitOnVisibilityHidden = () => {
      if (document.visibilityState === "hidden") {
        saveExitOnPageClose();
      }
    };

    window.addEventListener("pagehide", saveExitOnPageClose);
    document.addEventListener("visibilitychange", saveExitOnVisibilityHidden);

    return () => {
      window.removeEventListener("pagehide", saveExitOnPageClose);
      document.removeEventListener("visibilitychange", saveExitOnVisibilityHidden);
    };
  }, [page, crushStep, currentUser, profile.nickname, crushPost.target_gender]);

  useEffect(() => {
    const saveExitOnPageClose = () => {
      if (page !== "search" || !cloudCheckFlowIdRef.current) return;

      addCurrentCloudCheckStepTime();
      saveCloudCheckFlowLog({
        exitType: "page_unload",
        completed: false,
        ended: true,
      });
    };

    const saveExitOnVisibilityHidden = () => {
      if (document.visibilityState === "hidden") {
        saveExitOnPageClose();
      }
    };

    window.addEventListener("pagehide", saveExitOnPageClose);
    document.addEventListener("visibilitychange", saveExitOnVisibilityHidden);

    return () => {
      window.removeEventListener("pagehide", saveExitOnPageClose);
      document.removeEventListener("visibilitychange", saveExitOnVisibilityHidden);
    };
  }, [page, searchStep, currentUser, profile.nickname, profile.gender]);

  const saveProfile = async () => {
    if (profileSubmitting) return;

    if (!currentUser) {
      toast.error("먼저 로그인해주세요.");
      return;
    }

    if (!profile.nickname) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }

    if (!profile.gender) {
      toast.error("성별을 선택해주세요.");
      return;
    }

    if (!profile.instagram_id) {
      toast.error("인스타 아이디를 입력해주세요.");
      return;
    }

    setProfileSubmitting(true);

    try {
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
          },
        ],
        { onConflict: "user_id" }
      );

      if (error) {
        toast.error("프로필 저장에 실패했어요: " + error.message);
        console.log(error);
        return;
      }

      setProfile({
        ...profile,
        instagram_id: cleanInstagram(profile.instagram_id),
      });

      profileLoadedUserIdRef.current = currentUser.id;

      toast.success("프로필이 저장됐어요!");
      setPage("home");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const saveCrushPost = async () => {
    if (postSubmitting) return;

    if (!checkProfileRequired()) return;

    if (!crushPost.target_gender) {
      toast.error("찾는 사람의 성별을 선택해주세요.");
      await moveCloudSendStep(1, "validation_back");
      return;
    }

    if (
      !crushPost.seen_date ||
      !crushPost.time_period ||
      !getFinalPlace()
    ) {
      toast.error("날짜, 시간, 장소를 모두 선택해주세요.");
      await moveCloudSendStep(2, "validation_back");
      return;
    }

    const finalHairFeature = getFinalHairFeature();
    const selectedHairDetails = getSelectedHairDetails();

    if (!finalHairFeature || !crushPost.glasses_type) {
      toast.error("헤어 색깔, 모자, 앞머리, 안경를 선택해주세요.");
      await moveCloudSendStep(3, "validation_back");
      return;
    }

    if (
      !crushPost.top_type ||
      !crushPost.top_color ||
      !crushPost.outer_type ||
      (crushPost.outer_type !== "아우터 없음" && !crushPost.outer_color) ||
      !getFinalBottomType() ||
      !crushPost.bottom_color ||
      !crushPost.shoe_type
    ) {
      toast.error("상의, 아우터, 하의, 신발을 선택해주세요.");
      await moveCloudSendStep(4, "validation_back");
      return;
    }

    if (!crushPost.bag_type || !crushPost.earphone_type) {
      toast.error("가방과 이어폰 정보를 선택해주세요.");
      await moveCloudSendStep(5, "validation_back");
      return;
    }

    const topDetailText = crushPost.top_detail.trim()
      ? ` / 상의 설명:${crushPost.top_detail.trim()}`
      : "";

    const bottomDetailText = crushPost.bottom_detail.trim()
      ? ` / 하의 설명:${crushPost.bottom_detail.trim()}`
      : "";

    const itemDetailText = crushPost.item_detail.trim()
      ? ` / 소지품 설명:${crushPost.item_detail.trim()}`
      : "";

    const shoeDetailText = crushPost.shoe_detail.trim()
      ? ` / 신발 설명:${crushPost.shoe_detail.trim()}`
      : "";

    const combinedStyle = `상의:${crushPost.top_type} ${crushPost.top_color}${topDetailText} / 아우터:${getFinalOuter()} / 하의:${getFinalBottomType()} ${crushPost.bottom_color}${bottomDetailText}`;
    const combinedAccessory = `가방:${crushPost.bag_type} / 이어폰:${crushPost.earphone_type} / 안경:${crushPost.glasses_type || "잘 모르겠음"}${itemDetailText} / 신발:${crushPost.shoe_type}${shoeDetailText}`;

    setPostSubmitting(true);

    try {
      const postData = {
        seen_date: crushPost.seen_date,
        place: getFinalPlace(),
        main_place: crushPost.place,
        detail_place: crushPost.custom_place.trim(),
        time_period: crushPost.time_period,
        hair_feature: finalHairFeature,
        hair_color: selectedHairDetails.hair_color,
        hat_status: selectedHairDetails.hat_status,
        bangs_status: selectedHairDetails.bangs_status,
        glasses_status: crushPost.glasses_type,
        top_type: crushPost.top_type,
        top_color: crushPost.top_color,
        top_detail: crushPost.top_detail.trim(),
        outer_type: crushPost.outer_type,
        outer_color: crushPost.outer_type === "아우터 없음" ? "" : crushPost.outer_color,
        bottom_type: getFinalBottomType(),
        bottom_color: crushPost.bottom_color,
        bottom_detail: crushPost.bottom_detail.trim(),
        shoe_type: crushPost.shoe_type,
        shoe_detail: crushPost.shoe_detail.trim(),
        bag_type: crushPost.bag_type,
        earphone_type: crushPost.earphone_type,
        item_detail: crushPost.item_detail.trim(),
        clothes_color: crushPost.top_color,
        clothes_style: combinedStyle,
        accessory: combinedAccessory,
        message: crushPost.message,
        sender_nickname: profile.nickname,
        sender_instagram: cleanInstagram(profile.instagram_id),
        sender_gender: profile.gender,
        target_gender: crushPost.target_gender,
        campus: profile.campus,
      };

      let error;
      let savedPost = null;

      if (editingPost) {
        // 빠른 구름 → 자세한 구름으로 업데이트
        const { data, error: updateError } = await supabase
          .from("crush_posts")
          .update(postData)
          .eq("id", editingPost.id)
          .eq("sender_user_id", currentUser.id)
          .select()
          .maybeSingle();
        error = updateError;
        savedPost = data || { ...editingPost, ...postData };
      } else {
        // 새 구름 생성
        const { data, error: insertError } = await supabase
          .from("crush_posts")
          .insert([{ ...postData, sender_user_id: currentUser.id }])
          .select()
          .maybeSingle();
        error = insertError;
        savedPost = data;
      }

      if (error) {
        toast.error("구름 보내기에 실패했어요: " + error.message);
        console.log(error);
        return;
      }

      localStorage.removeItem(getDraftKey());

      toast.success(editingPost ? "구름을 자세하게 업데이트했어요!" : "구름을 남겼어요!");
      await finishCloudSendFlowLog({
        exitType: "submit",
        completed: true,
        targetGender: crushPost.target_gender,
      });
      setEditingPost(null);
      resetCrushPost();
      if (savedPost) {
        await loadSentCheckResultsForPost(savedPost);
      }
      setPage("sentResult");
    } finally {
      setPostSubmitting(false);
    }
  };

  const saveCloudCalendarRecord = async (matchedCloudCount) => {
    if (!currentUser || !searchForm.seen_date) return;

    const finalSearchHairFeature = getFinalSearchHairFeature();
    const payload = {
      user_id: currentUser.id,
      checked_date: searchForm.seen_date,
      matched_cloud_count: matchedCloudCount,
      hair_feature: finalSearchHairFeature,
      female_hair_style: searchForm.female_hair_style,
      female_hair_color: searchForm.female_hair_color,
      female_hat: searchForm.female_hat,
      female_bangs: searchForm.female_bangs,
      male_hair_style: searchForm.male_hair_style,
      male_hair_color: searchForm.male_hair_color,
      male_hat: searchForm.male_hat,
      male_bangs: searchForm.male_bangs,
      top_type: searchForm.top_type,
      top_color: searchForm.top_color,
      outer_type: searchForm.outer_type,
      outer_color: searchForm.outer_type === "아우터 없음" ? "" : searchForm.outer_color,
      bottom_type: searchForm.bottom_type,
      bottom_color: searchForm.bottom_color,
      shoe_type: searchForm.shoe_type,
      bag_type: searchForm.bag_type,
      earphone_type: searchForm.earphone_type,
      glasses_type: searchForm.glasses_type,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("cloud_calendar_records")
      .upsert([payload], { onConflict: "user_id,checked_date" });

    if (error) {
      console.log(error);
    }
  };

  const loadSentCheckResultsForPost = async (post) => {
    if (!currentUser || !post?.id) return [];

    setSentResultPost(post);
    setSentCheckResults([]);
    setSentCheckResultMeta({ rawCount: 0, scoredCount: 0, blockedCount: 0 });

    const { data, error } = await supabase
      .from("cloud_checks")
      .select(
        "id, checker_user_id, checker_nickname, checker_gender, seen_date, checked_at, hair_feature, female_hair_style, female_hair_color, female_hat, female_bangs, male_hair_style, male_hair_color, male_hat, male_bangs, top_type, top_color, outer_type, outer_color, bottom_type, bottom_color, shoe_type, bag_type, earphone_type, glasses_type, result_count"
      )
      .eq("seen_date", post.seen_date)
      .eq("checker_gender", post.target_gender)
      .order("checked_at", { ascending: false })
      .limit(100);

    if (error) {
      console.log(error);
      toast.error("구름 확인 내역을 불러오지 못했어요. Supabase SQL 적용이 필요할 수 있어요.");
      return [];
    }

    const checkRows = data || [];
    const availableRows = checkRows
      .filter((check) => check.checker_user_id !== currentUser.id)
      .filter((check) => !blockedUserIds.includes(check.checker_user_id));
    const scoredRows = availableRows.map((check) => {
        const match = getCloudMatchScore(post, check);
        return {
          ...check,
          crush_post_id: post.id,
          match_score: match.score,
          match_reasons: match.reasons,
        };
      });
    const results = scoredRows
      .filter((check) => check.match_score >= MATCH_THRESHOLD)
      .sort(
        (a, b) =>
          (b.match_score || 0) - (a.match_score || 0) ||
          new Date(b.checked_at) - new Date(a.checked_at)
      );

    setSentCheckResultMeta({
      rawCount: checkRows.length,
      scoredCount: scoredRows.length,
      blockedCount: checkRows.length - availableRows.length,
    });
    setSentCheckResults(results);
    return results;
  };

  const searchCrushPosts = async () => {
  if (searchSubmitting) return;

  if (!checkProfileRequired()) return;

  if (!searchForm.seen_date) {
    toast.error("날짜를 선택해주세요.");
    return;
  }

  setSearchSubmitting(true);

  try {
    const { data, error } = await supabase
      .from("crush_posts")
      .select("*")
      .eq("seen_date", searchForm.seen_date)
      .eq("target_gender", profile.gender)
      .eq("campus", profile.campus)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      toast.error("검색에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    const scoredResults = (data || [])
      .filter((post) => post.sender_user_id !== currentUser.id)
      .map((post) => {
        const match = getPostMatchScore(post);
        return {
          ...post,
          match_score: match.score,
          match_reasons: match.reasons,
        };
      })
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    const finalResults = scoredResults.filter(
      (post) => post.match_score >= MATCH_THRESHOLD
    );
    const finalSearchHairFeature = getFinalSearchHairFeature();

    const { error: checkLogError } = await supabase.from("cloud_checks").insert([
    {
      checker_user_id: currentUser.id,
      checker_nickname: profile.nickname,
      checker_gender: profile.gender,
      checker_instagram: cleanInstagram(profile.instagram_id),

      seen_date: searchForm.seen_date,

      hair_feature: finalSearchHairFeature,

      female_hair_style: searchForm.female_hair_style,
      female_hair_color: searchForm.female_hair_color,
      female_hat: searchForm.female_hat,
      female_bangs: searchForm.female_bangs,

      male_hair_style: searchForm.male_hair_style,
      male_hair_color: searchForm.male_hair_color,
      male_hat: searchForm.male_hat,
      male_bangs: searchForm.male_bangs,

      top_type: searchForm.top_type,
      top_color: searchForm.top_color,
      outer_type: searchForm.outer_type,
      outer_color: searchForm.outer_type === "아우터 없음" ? "" : searchForm.outer_color,
      bottom_type: searchForm.bottom_type,
      bottom_color: searchForm.bottom_color,
      shoe_type: searchForm.shoe_type,
      bag_type: searchForm.bag_type,
      earphone_type: searchForm.earphone_type,
      glasses_type: searchForm.glasses_type,

      result_count: finalResults.length,
    },
  ]);

  if (checkLogError) {
    console.log(checkLogError);
  }

    await saveCloudCalendarRecord(finalResults.length);

    if (finalResults.length > 0) {
      const viewedAt = new Date().toISOString();
      const viewRows = finalResults.map((post) => ({
        crush_post_id: String(post.id),
        viewer_user_id: currentUser.id,
        viewer_nickname: profile.nickname,
        viewer_instagram: cleanInstagram(profile.instagram_id),
        viewed_at: viewedAt,
        match_score: post.match_score,
      }));

      const { error: viewError } = await supabase
        .from("cloud_views")
        .upsert(viewRows, {
          onConflict: "crush_post_id,viewer_user_id",
          ignoreDuplicates: true,
        });

      if (viewError) {
        console.log(viewError);
      }
    }

    await finishCloudCheckFlowLog({
      exitType: "submit",
      completed: true,
      resultCount: finalResults.length,
    });

    setSearchResults(finalResults);
    setHiddenResultIds([]);
    setPage("result");
  } finally {
    setSearchSubmitting(false);
  }
};

  const saveClaim = async () => {
  if (claimSubmitting) return;

  if (!selectedPost) {
      toast.error("요청할 구름 글을 찾지 못했어요.");
    return;
  }

  if (!checkProfileRequired()) return;

  if (selectedPost.sender_user_id === currentUser.id) {
    toast.error("본인이 올린 구름에는 응답할 수 없어요.");
    return;
  }

  if (!claimForm.match_level) {
    toast.error("일치 정도를 선택해주세요.");
    return;
  }

  const finalMessage = `[일치 정도: ${claimForm.match_level}] ${claimForm.claimer_message}`;

  setClaimSubmitting(true);

  try {
    const { data: existingClaim, error: existingError } = await supabase
      .from("claims")
      .select("*")
      .eq("crush_post_id", selectedPost.id)
      .eq("claimer_user_id", currentUser.id)
      .maybeSingle();

    if (existingError) {
      toast.error("채팅방 요청 확인에 실패했어요: " + existingError.message);
      console.log(existingError);
      return;
    }

    let claimError;
    let savedClaim = existingClaim;

    if (existingClaim) {
      const { data, error } = await supabase
        .from("claims")
        .update({
          claimer_nickname: profile.nickname,
          claimer_instagram: cleanInstagram(profile.instagram_id),
          claimer_message: finalMessage,
        })
        .eq("id", existingClaim.id)
        .select()
        .maybeSingle();

      claimError = error;
      savedClaim = data || existingClaim;
    } else {
      const { data, error } = await supabase.from("claims").insert([
        {
          crush_post_id: selectedPost.id,
          claimer_user_id: currentUser.id,
          claimer_nickname: profile.nickname,
          claimer_instagram: cleanInstagram(profile.instagram_id),
          claimer_message: finalMessage,
          status: "pending",
        },
      ]).select().maybeSingle();

      claimError = error;
      savedClaim = data;
    }

    if (claimError) {
      toast.error("채팅방 요청 저장에 실패했어요: " + claimError.message);
      console.log(claimError);
      return;
    }

    const { data: senderPick, error: senderPickError } = await supabase
      .from("sender_cloud_check_picks")
      .select("id")
      .eq("crush_post_id", selectedPost.id)
      .eq("checker_user_id", currentUser.id)
      .eq("status", "interested")
      .maybeSingle();

    if (!senderPickError && senderPick?.id && savedClaim?.id) {
      const { error: mutualError } = await supabase
        .from("claims")
        .update({ status: "chat_requested", responded_at: new Date().toISOString() })
        .eq("id", savedClaim.id);

      if (mutualError) {
        console.log(mutualError);
      } else {
        savedClaim = { ...savedClaim, status: "chat_requested" };
      }
    } else if (senderPickError) {
      console.log(senderPickError);
    }

    await supabase.from("cloud_views").upsert(
      [
        {
          crush_post_id: String(selectedPost.id),
          viewer_user_id: currentUser.id,
          viewer_nickname: profile.nickname,
          viewer_instagram: cleanInstagram(profile.instagram_id),
          viewed_at: new Date().toISOString(),
        },
      ],
      {
        onConflict: "crush_post_id,viewer_user_id",
        ignoreDuplicates: true,
      }
    );

    toast.success(
      savedClaim?.status === "chat_requested"
        ? "서로 확인했어요. 대화 요청이 도착했어요!"
        : "구름 채팅방 요청을 보냈어요!"
    );

    setClaimForm({
      claimer_nickname: "",
      claimer_instagram: "",
      match_level: "",
      claimer_message: "",
    });

    pendingChatRequestClaimIdRef.current = savedClaim?.id || null;
    setSelectedPost(null);
    setPage("claim");
  } finally {
    setClaimSubmitting(false);
  }
};

  const loadChatPreviews = async (roomIds) => {
    if (!roomIds || roomIds.length === 0) {
      setChatLastMessages({});
      setChatRoomStatusMap({});
      return;
    }

    const [{ data, error }, { data: roomsData, error: roomsError }] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("chat_room_id, body, created_at")
        .in("chat_room_id", roomIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("chat_rooms")
        .select("id, created_at, closed_at, sender_user_id, claimer_user_id, sender_deleted_at, claimer_deleted_at")
        .in("id", roomIds),
    ]);

    if (roomsError) {
      console.log(roomsError);
    } else {
      const statusMap = {};
      (roomsData || []).forEach((r) => {
        statusMap[r.id] = {
          created_at: r.created_at,
          closed_at: r.closed_at,
          sender_user_id: r.sender_user_id,
          claimer_user_id: r.claimer_user_id,
          sender_deleted_at: r.sender_deleted_at,
          claimer_deleted_at: r.claimer_deleted_at,
        };
      });
      setChatRoomStatusMap(statusMap);
    }

    if (error) {
      console.log(error);
      return;
    }

    const map = {};
    (data || []).forEach((m) => {
      if (!map[m.chat_room_id]) {
        map[m.chat_room_id] = { body: m.body, created_at: m.created_at };
      }
    });
    setChatLastMessages(map);
  };

  const loadCloudCalendarRecords = async () => {
    if (!currentUser) return false;

    setCloudCalendarLoading(true);

    const { data, error } = await supabase
      .from("cloud_calendar_records")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("checked_date", { ascending: false });

    if (error) {
      toast.error("구름 달력을 불러오지 못했어요: " + error.message);
      console.log(error);
      setCloudCalendarLoading(false);
      return false;
    }

    setCloudCalendarRecords(data || []);
    setCloudCalendarLoading(false);
    return true;
  };

  const loadMyActivityData = async () => {
    if (!currentUser) {
      resetActivityData(null);
      return false;
    }

    const activityUserId = currentUser.id;

    setMatchingLoading(true);
    setMySentPosts([]);
    setSentClaims([]);
    setReceivedClaims([]);
    setMyReceivedCloudViews([]);
    setSenderCheckCandidates([]);
    setSenderCheckPicks([]);
    setReceivedSenderCheckPicks([]);
    setMyCloudChecks([]);

    // Round 1: 독립 쿼리 병렬 실행
    const [
      checksResult,
      postsResult,
      receivedClaimsResult,
      receivedViewsResult,
      receivedSenderPicksResult,
    ] =
      await Promise.all([
        supabase
          .from("cloud_checks")
          .select("*")
          .eq("checker_user_id", activityUserId)
          .order("checked_at", { ascending: false }),
        supabase
          .from("crush_posts")
          .select("*")
          .eq("sender_user_id", activityUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("claims")
          .select("*")
          .eq("claimer_user_id", activityUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("cloud_views")
          .select("*")
          .eq("viewer_user_id", activityUserId)
          .order("viewed_at", { ascending: false }),
        supabase
          .from("sender_cloud_check_picks")
          .select("*")
          .eq("checker_user_id", activityUserId)
          .eq("status", "interested")
          .order("updated_at", { ascending: false }),
      ]);

    if (checksResult.error) {
      toast.error("구름 확인 기록을 불러오지 못했어요: " + checksResult.error.message);
      console.log(checksResult.error);
      setMatchingLoading(false);
      return false;
    }
    if (postsResult.error) {
      toast.error("내가 띄운 구름을 불러오지 못했어요: " + postsResult.error.message);
      console.log(postsResult.error);
      setMatchingLoading(false);
      return false;
    }
    if (receivedClaimsResult.error) {
      toast.error("내가 받은 구름 목록을 불러오지 못했어요: " + receivedClaimsResult.error.message);
      console.log(receivedClaimsResult.error);
      setMatchingLoading(false);
      return false;
    }
    if (receivedViewsResult.error) {
      toast.error("구름 확인 결과를 불러오지 못했어요: " + receivedViewsResult.error.message);
      console.log(receivedViewsResult.error);
      setMatchingLoading(false);
      return false;
    }
    if (receivedSenderPicksResult.error) {
      console.log(receivedSenderPicksResult.error);
    }

    setMyCloudChecks(checksResult.data || []);

    const finalMyPosts = postsResult.data || [];
    setMySentPosts(finalMyPosts);

    const finalReceivedClaims = receivedClaimsResult.data || [];
    const finalReceivedViews = (receivedViewsResult.data || []).filter(
      (view) => !view.match_score || view.match_score >= MATCH_THRESHOLD
    );

    // Round 2: Round 1 결과가 필요한 쿼리 병렬 실행
    const round2Promises = [];

    const sentPostIds = finalMyPosts.map((post) => post.id);
    const sentPostDates = [...new Set(finalMyPosts.map((post) => post.seen_date).filter(Boolean))];
    const myCheckDates = [
      ...new Set((checksResult.data || []).map((check) => check.seen_date).filter(Boolean)),
    ];
    const receivedClaimPostIds = [...new Set(finalReceivedClaims.map((c) => c.crush_post_id))];
    const receivedViewPostIds = [...new Set(finalReceivedViews.map((v) => v.crush_post_id))];
    const receivedSenderPickPostIds = [
      ...new Set((receivedSenderPicksResult.data || []).map((pick) => pick.crush_post_id)),
    ];
    const receivedPostIds = [
      ...new Set([
        ...receivedClaimPostIds,
        ...receivedViewPostIds,
        ...receivedSenderPickPostIds,
      ]),
    ];

    round2Promises.push(
      sentPostIds.length > 0
        ? supabase.from("claims").select("*").in("crush_post_id", sentPostIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      receivedPostIds.length > 0
        ? supabase.from("crush_posts").select("*").in("id", receivedPostIds)
        : Promise.resolve({ data: [], error: null }),
      sentPostDates.length > 0
        ? supabase
            .from("cloud_checks")
            .select(
              "id, checker_user_id, checker_nickname, checker_gender, seen_date, checked_at, hair_feature, female_hair_style, female_hair_color, female_hat, female_bangs, male_hair_style, male_hair_color, male_hat, male_bangs, top_type, top_color, outer_type, outer_color, bottom_type, bottom_color, shoe_type, bag_type, earphone_type, glasses_type, result_count"
            )
            .in("seen_date", sentPostDates)
            .order("checked_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      sentPostIds.length > 0
        ? supabase
            .from("sender_cloud_check_picks")
            .select("*")
            .eq("sender_user_id", activityUserId)
            .in("crush_post_id", sentPostIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      myCheckDates.length > 0 && profile.gender && profile.campus
        ? supabase
            .from("crush_posts")
            .select("*")
            .in("seen_date", myCheckDates)
            .eq("target_gender", profile.gender)
            .eq("campus", profile.campus)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    );

    const [
      claimsResult,
      receivedPostsResult,
      senderChecksResult,
      senderPicksResult,
      receivedCandidatePostsResult,
    ] =
      await Promise.all(round2Promises);

    if (claimsResult.error) {
      toast.error("내 구름에 온 응답을 불러오지 못했어요: " + claimsResult.error.message);
      console.log(claimsResult.error);
      setMatchingLoading(false);
      return false;
    }
    if (receivedPostsResult.error) {
      toast.error("내가 응답한 구름 글 정보를 불러오지 못했어요: " + receivedPostsResult.error.message);
      console.log(receivedPostsResult.error);
      setMatchingLoading(false);
      return false;
    }
    if (senderChecksResult.error) {
      console.log(senderChecksResult.error);
    }
    if (senderPicksResult.error) {
      console.log(senderPicksResult.error);
    }
    if (receivedCandidatePostsResult.error) {
      console.log(receivedCandidatePostsResult.error);
    }

    const finalSentClaims = (claimsResult.data || []).map((claim) => ({
      ...claim,
      post: finalMyPosts.find((item) => item.id === claim.crush_post_id),
    }));
    setSentClaims(finalSentClaims);
    setSenderCheckPicks(senderPicksResult.error ? [] : senderPicksResult.data || []);

    const claimedCheckerKeys = new Set(
      finalSentClaims.map((claim) => `${claim.crush_post_id}:${claim.claimer_user_id}`)
    );
    const finalSenderCheckCandidates = (senderChecksResult.error ? [] : senderChecksResult.data || [])
      .filter((check) => check.checker_user_id !== activityUserId)
      .filter((check) => !blockedUserIds.includes(check.checker_user_id))
      .flatMap((check) =>
        finalMyPosts
          .filter((post) => post.seen_date === check.seen_date)
          .filter((post) => post.target_gender === check.checker_gender)
          .filter((post) => !claimedCheckerKeys.has(`${post.id}:${check.checker_user_id}`))
          .map((post) => {
            const match = getCloudMatchScore(post, check);
            return {
              ...check,
              crush_post_id: post.id,
              match_score: match.score,
              match_reasons: match.reasons,
            };
          })
      )
      .filter((check) => check.match_score >= MATCH_THRESHOLD)
      .sort(
        (a, b) =>
          (b.match_score || 0) - (a.match_score || 0) ||
          new Date(b.checked_at) - new Date(a.checked_at)
      );
    setSenderCheckCandidates(finalSenderCheckCandidates);

    const receivedPosts = receivedPostsResult.data || [];
    const combinedReceivedClaims = finalReceivedClaims.map((claim) => ({
      ...claim,
      post: receivedPosts.find((item) => item.id === claim.crush_post_id) || null,
    }));
    setReceivedClaims(combinedReceivedClaims);
    const claimedPostIds = new Set(
      finalReceivedClaims.map((claim) => String(claim.crush_post_id))
    );
    const existingReceivedViewPostIds = new Set(
      finalReceivedViews.map((view) => String(view.crush_post_id))
    );
    const combinedReceivedViews = finalReceivedViews
      .filter((view) => !claimedPostIds.has(String(view.crush_post_id)))
      .map((view) => ({
        ...view,
        post: receivedPosts.find((item) => String(item.id) === String(view.crush_post_id)) || null,
      }))
      .filter((view) => view.post)
      .filter((view) => !blockedUserIds.includes(view.post.sender_user_id));
    const retroReceivedViews = (receivedCandidatePostsResult.error
      ? []
      : receivedCandidatePostsResult.data || []
    )
      .filter((post) => post.sender_user_id !== activityUserId)
      .filter((post) => !claimedPostIds.has(String(post.id)))
      .filter((post) => !existingReceivedViewPostIds.has(String(post.id)))
      .filter((post) => !blockedUserIds.includes(post.sender_user_id))
      .map((post) => {
        const bestMatch = (checksResult.data || [])
          .filter((check) => check.seen_date === post.seen_date)
          .filter((check) => check.checker_gender === post.target_gender)
          .map((check) => {
            const match = getCloudMatchScore(post, check);
            return { check, match };
          })
          .sort(
            (a, b) =>
              (b.match.score || 0) - (a.match.score || 0) ||
              new Date(b.check.checked_at) - new Date(a.check.checked_at)
          )[0];

        if (!bestMatch || bestMatch.match.score < MATCH_THRESHOLD) return null;

        return {
          id: `retro-${post.id}-${bestMatch.check.id}`,
          crush_post_id: post.id,
          viewer_user_id: activityUserId,
          viewed_at: bestMatch.check.checked_at,
          match_score: bestMatch.match.score,
          match_reasons: bestMatch.match.reasons,
          post,
        };
      })
      .filter(Boolean);
    const allReceivedViews = [...combinedReceivedViews, ...retroReceivedViews].sort(
      (a, b) =>
        new Date(b.viewed_at || b.post?.created_at || 0) -
        new Date(a.viewed_at || a.post?.created_at || 0)
    );
    setMyReceivedCloudViews(allReceivedViews);

    const existingReceivedClaimPostIds = new Set(
      combinedReceivedClaims.map((claim) => String(claim.crush_post_id))
    );
    const finalReceivedSenderPicks = (receivedSenderPicksResult.error
      ? []
      : receivedSenderPicksResult.data || []
    )
      .map((pick) => ({
        ...pick,
        post: receivedPosts.find((item) => String(item.id) === String(pick.crush_post_id)) || null,
      }))
      .filter((pick) => pick.post)
      .filter((pick) => !existingReceivedClaimPostIds.has(String(pick.crush_post_id)))
      .filter((pick) => !blockedUserIds.includes(pick.sender_user_id));
    setReceivedSenderCheckPicks(finalReceivedSenderPicks);

    const chatRoomIds = [
      ...finalSentClaims,
      ...combinedReceivedClaims,
    ]
      .filter((claim) => claim.status === "chat_accepted" && claim.chat_room_id)
      .map((claim) => claim.chat_room_id);

    loadChatPreviews([...new Set(chatRoomIds)]);

    activityLoadedUserIdRef.current = activityUserId;
    setMatchingLoading(false);
    return true;
  };

  const openMatchingPage = async () => {
    if (!checkProfileRequired()) return;

    await leaveActiveFlow("bottom_matching", "matching");
    await loadMyActivityData();
  };
  const openCloudCalendarPage = async () => {
    if (!checkProfileRequired()) return;

    const today = getKoreaDateString();
    await leaveActiveFlow("profile_cloud_calendar", "cloudCalendar");
    setCloudCalendarMonth(parseLocalDate(today) || new Date());
    setSelectedCloudCalendarDate(today);
    await loadCloudCalendarRecords();
  };
  const openCloudCheckFromCalendar = async () => {
    if (!selectedCloudCalendarDate) return;

    setSearchForm((prev) => ({
      ...prev,
      seen_date: selectedCloudCalendarDate,
    }));
    setSearchStep(1);
    await openSearchPage();
  };
  const openChatsPage = async () => {
    if (!checkProfileRequired()) return;

    await leaveActiveFlow("bottom_chats", "chats");
    await loadMyActivityData();
  };
  const loadCloudWeather = async (targetDate = weatherDate) => {
  if (!checkProfileRequired()) return;

  if (!targetDate) {
    toast.error("날짜를 선택해주세요.");
    return;
  }

  setWeatherLoading(true);
  setSelectedWeatherPlace("");

  const { data, error } = await supabase
    .from("crush_posts")
    .select("*")
    .eq("seen_date", targetDate)
    .eq("campus", profile.campus)
    .order("created_at", { ascending: false });

  if (error) {
    toast.error("단국대학교 날씨를 불러오지 못했어요: " + error.message);
    console.log(error);
    setWeatherLoading(false);
    return;
  }

  setWeatherClouds(data || []);
  setWeatherLoading(false);
};

const openWeatherPage = async () => {
  if (!checkProfileRequired()) return;

  setPage("weather");
  await loadCloudWeather(weatherDate);
};

const getWeatherPlaceCounts = () => {
  const countMap = {};

  weatherClouds.forEach((post) => {
    const place = getMainPlaceFromPost(post);

    if (!countMap[place]) {
      countMap[place] = {
        place,
        count: 0,
        posts: [],
      };
    }

    countMap[place].count += 1;
    countMap[place].posts.push(post);
  });

  return Object.values(countMap).sort((a, b) => b.count - a.count);
};

  const requestChat = async (claimId) => {
    if (claimActionSubmittingId) return;

    setClaimActionSubmittingId(claimId);

    try {
      const { error } = await supabase
        .from("claims")
        .update({ status: "chat_requested", responded_at: new Date().toISOString() })
        .eq("id", claimId);

      if (error) {
        toast.error("대화 요청에 실패했어요: " + error.message);
        console.log(error);
        return;
      }

      toast.success("대화 요청을 보냈어요.");
      openMatchingPage();
    } finally {
      setClaimActionSubmittingId(null);
    }
  };

  const rejectClaim = async (claimId, rejectedBy) => {
    if (!claimId || claimActionSubmittingId) return;

    const ok = window.confirm("거절 의사를 상대에게 표시할까요?");
    if (!ok) return;

    setClaimActionSubmittingId(claimId);

    try {
      const { error } = await supabase
        .from("claims")
        .update({
          status: "rejected",
          rejected_by: rejectedBy,
          responded_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      if (error) {
        toast.error("거절에 실패했어요: " + error.message);
        console.log(error);
        return;
      }

      toast.success("거절했어요.");
      openMatchingPage();
    } finally {
      setClaimActionSubmittingId(null);
    }
  };

  const openChatPreview = async (claim) => {
    setChatPreviewClaim(claim);
    setChatPreviewProfile(null);
    setPage("chatPreview");

    const senderUserId = claim.post?.sender_user_id;
    if (!senderUserId) return;

    const p = await fetchPublicProfile(senderUserId);
    setChatPreviewProfile(p);
  };

  const openSenderPickChatPreview = async (pick) => {
    if (!currentUser || !pick?.post || claimActionSubmittingId) return;

    setClaimActionSubmittingId(`sender-pick-${pick.id}`);

    try {
      const claimPayload = {
        crush_post_id: pick.crush_post_id,
        claimer_user_id: currentUser.id,
        claimer_nickname: profile.nickname,
        claimer_instagram: cleanInstagram(profile.instagram_id),
        claimer_message: "구름 확인 기록을 통해 연결됐어요.",
        status: "chat_requested",
        responded_at: new Date().toISOString(),
      };

      const { data: existingClaim, error: existingError } = await supabase
        .from("claims")
        .select("*")
        .eq("crush_post_id", pick.crush_post_id)
        .eq("claimer_user_id", currentUser.id)
        .maybeSingle();

      if (existingError) {
        toast.error("대화 요청을 불러오지 못했어요: " + existingError.message);
        console.log(existingError);
        return;
      }

      let claim = existingClaim;

      if (existingClaim) {
        const { data, error } = await supabase
          .from("claims")
          .update({
            claimer_nickname: claimPayload.claimer_nickname,
            claimer_instagram: claimPayload.claimer_instagram,
            claimer_message: existingClaim.claimer_message || claimPayload.claimer_message,
            status:
              existingClaim.status === "chat_accepted"
                ? existingClaim.status
                : "chat_requested",
            responded_at: claimPayload.responded_at,
          })
          .eq("id", existingClaim.id)
          .select()
          .maybeSingle();

        if (error) {
          toast.error("대화 요청 준비에 실패했어요: " + error.message);
          console.log(error);
          return;
        }

        claim = data || existingClaim;
      } else {
        const { data, error } = await supabase
          .from("claims")
          .insert([claimPayload])
          .select()
          .maybeSingle();

        if (error) {
          toast.error("대화 요청 준비에 실패했어요: " + error.message);
          console.log(error);
          return;
        }

        claim = data;
      }

      if (!claim) return;

      const claimWithPost = { ...claim, post: pick.post };

      if (claimWithPost.status === "chat_accepted" && claimWithPost.chat_room_id) {
        openChatRoom(claimWithPost.chat_room_id, pick.post.sender_nickname);
        return;
      }

      await openChatPreview(claimWithPost);
    } finally {
      setClaimActionSubmittingId(null);
    }
  };

  const openChatRoom = (roomId, nickname = "") => {
    if (!roomId) return;
    pendingChatRequestClaimIdRef.current = null;
    setActiveChatRoomId(roomId);
    setActiveChatRoomNickname(nickname);
    setPage("chatRoom");
  };

  const acceptChatRequest = async (claim, otherNickname = "") => {
    if (!claim?.id || chatActionSubmitting) return;

    setChatActionSubmitting(true);

    try {
      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .upsert(
          [
            {
              claim_id: claim.id,
              crush_post_id: claim.crush_post_id,
              sender_user_id: claim.post?.sender_user_id,
              claimer_user_id: claim.claimer_user_id,
            },
          ],
          { onConflict: "claim_id", ignoreDuplicates: true }
        )
        .select()
        .maybeSingle();

      if (roomError) {
        toast.error("채팅방을 여는데 실패했어요: " + roomError.message);
        console.log(roomError);
        return;
      }

      let roomId = room?.id;

      if (!roomId) {
        const { data: existingRoom, error: fetchRoomError } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("claim_id", claim.id)
          .maybeSingle();

        if (fetchRoomError) {
          console.log(fetchRoomError);
        }
        roomId = existingRoom?.id;
      }

      if (!roomId) {
        toast.error("채팅방을 찾지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      const { error: chatRoomLinkError } = await supabase
        .from("claims")
        .update({
          status: "chat_accepted",
          chat_room_id: roomId,
          responded_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      if (chatRoomLinkError) {
        toast.error("수락 상태 저장에 실패했어요: " + chatRoomLinkError.message);
        console.log(chatRoomLinkError);
        return;
      }

      toast.success("대화를 수락했어요!");
      openChatRoom(
        roomId,
        otherNickname ||
          chatPreviewProfile?.nickname ||
          (claim.claimer_user_id === currentUser?.id
            ? claim.post?.sender_nickname
            : claim.claimer_nickname) ||
          ""
      );
    } finally {
      setChatActionSubmitting(false);
    }
  };

  const handleAcceptedClaim = useCallback(
    (claim) => {
      if (!currentUser || !claim || claim.status !== "chat_accepted" || !claim.chat_room_id) {
        return;
      }

      const isMyClaim = claim.claimer_user_id === currentUser.id;
      const isOnMySentPost = mySentPostsRef.current.some(
        (post) => post.id === claim.crush_post_id
      );
      if (!isMyClaim && !isOnMySentPost) return;

      if (isOnMySentPost) {
        setSentClaims((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          const post =
            mySentPostsRef.current.find((item) => item.id === claim.crush_post_id) ||
            byId.get(claim.id)?.post;
          byId.set(claim.id, { ...byId.get(claim.id), ...claim, post });
          return [...byId.values()].sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
          );
        });
      }

      if (isMyClaim) {
        setReceivedClaims((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          const post = byId.get(claim.id)?.post;
          byId.set(claim.id, { ...byId.get(claim.id), ...claim, post });
          return [...byId.values()].sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
          );
        });
      }

      if (pageRef.current !== "claim") return;

      const pendingClaimId = pendingChatRequestClaimIdRef.current;
      if (
        !pendingClaimId ||
        claim.id !== pendingClaimId ||
        claim.chat_room_id === activeChatRoomIdRef.current
      ) {
        return;
      }

      const post =
        mySentPostsRef.current.find((item) => item.id === claim.crush_post_id) ||
        receivedClaimsRef.current.find((c) => c.id === claim.id)?.post;

      toast.success("상대가 대화를 수락했어요.");
      pendingChatRequestClaimIdRef.current = null;
      setActiveChatRoomId(claim.chat_room_id);
      setActiveChatRoomNickname(
        isMyClaim ? post?.sender_nickname || "" : claim.claimer_nickname || ""
      );
      setPage("chatRoom");
    },
    [currentUser]
  );

  // 내가 응답한(claimer) 요청이 수락되는 순간을 realtime으로 감지.
  // (앱을 닫아둔 동안 이미 수락된 건이 있을 수 있어 구독 전에 한 번 조회해 따라잡는다.)
  useEffect(() => {
    if (!currentUser) return undefined;
    let cancelled = false;

    supabase
      .from("claims")
      .select("*")
      .eq("claimer_user_id", currentUser.id)
      .eq("status", "chat_accepted")
      .not("chat_room_id", "is", null)
      .order("responded_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        (data || []).forEach(handleAcceptedClaim);
      });

    const channel = supabase
      .channel(`claims_as_claimer_${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "claims",
          filter: `claimer_user_id=eq.${currentUser.id}`,
        },
        (payload) => handleAcceptedClaim(payload.new)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUser, handleAcceptedClaim]);

  // 내가 보낸 구름에 달린 응답이 수락되는 순간을 realtime으로 감지.
  const mySentPostIdsKey = mySentPosts.map((post) => post.id).filter(Boolean).join(",");
  useEffect(() => {
    if (!currentUser || !mySentPostIdsKey) return undefined;
    let cancelled = false;

    supabase
      .from("claims")
      .select("*")
      .in("crush_post_id", mySentPostIdsKey.split(","))
      .eq("status", "chat_accepted")
      .not("chat_room_id", "is", null)
      .order("responded_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        (data || []).forEach(handleAcceptedClaim);
      });

    const channel = supabase
      .channel(`claims_on_sent_posts_${currentUser.id}_${mySentPostIdsKey}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "claims",
          filter: `crush_post_id=in.(${mySentPostIdsKey})`,
        },
        (payload) => handleAcceptedClaim(payload.new)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUser, mySentPostIdsKey, handleAcceptedClaim]);

  const deleteMyPost = async (postId) => {
    if (!currentUser) return;
    if (deletingPostId) return;

    const ok = window.confirm(
      "이 구름을 정말 삭제할까요? 삭제하면 이 구름에 달린 응답도 함께 정리될 수 있어요."
    );

    if (!ok) return;

    setDeletingPostId(postId);

    try {
      const { error: rpcError } = await supabase.rpc("delete_my_crush_post", {
        p_post_id: postId,
      });

      if (!rpcError) {
        toast.success("구름을 삭제했어요.");
        await loadMyActivityData();
        return;
      }

      console.log(rpcError);

      const { error: pickError } = await supabase
        .from("sender_cloud_check_picks")
        .delete()
        .eq("crush_post_id", postId)
        .eq("sender_user_id", currentUser.id);

      if (pickError && pickError.code !== "42P01") {
        toast.error("구름 확인 선택 내역 삭제에 실패했어요: " + pickError.message);
        console.log(pickError);
        return;
      }

      const { error: viewsError } = await supabase
        .from("cloud_views")
        .delete()
        .eq("crush_post_id", postId);

      if (viewsError) {
        toast.error("구름 조회 기록 삭제에 실패했어요: " + viewsError.message);
        console.log(viewsError);
        return;
      }

      const { error: claimsError } = await supabase
        .from("claims")
        .delete()
        .eq("crush_post_id", postId);

      if (claimsError) {
        toast.error("구름에 연결된 응답 삭제에 실패했어요: " + claimsError.message);
        console.log(claimsError);
        return;
      }

      const { error: postError } = await supabase
        .from("crush_posts")
        .delete()
        .eq("id", postId)
        .eq("sender_user_id", currentUser.id);

      if (postError) {
        toast.error("구름 삭제에 실패했어요: " + postError.message);
        console.log(postError);
        return;
      }

      toast.success("구름을 삭제했어요.");
      await loadMyActivityData();
    } finally {
      setDeletingPostId(null);
    }
  };


  const saveSenderCheckPick = async (post, check, status) => {
    if (!currentUser || !post?.id || !check?.id) return;
    if (claimActionSubmittingId) return;

    setClaimActionSubmittingId(`check-${check.id}`);

    try {
      const { error } = await supabase.from("sender_cloud_check_picks").upsert(
        [
          {
            crush_post_id: post.id,
            cloud_check_id: String(check.id),
            sender_user_id: currentUser.id,
            checker_user_id: check.checker_user_id,
            status,
            match_score: check.match_score || 0,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "crush_post_id,cloud_check_id,sender_user_id" }
      );

      if (error) {
        toast.error("확인 내역 선택 저장에 실패했어요. Supabase SQL 적용이 필요할 수 있어요.");
        console.log(error);
        return;
      }

      setSenderCheckPicks((prev) => {
        const next = prev.filter(
          (pick) =>
            !(
              pick.crush_post_id === post.id &&
              String(pick.cloud_check_id) === String(check.id) &&
              pick.sender_user_id === currentUser.id
            )
        );
        return [
          {
            crush_post_id: post.id,
            cloud_check_id: String(check.id),
            sender_user_id: currentUser.id,
            checker_user_id: check.checker_user_id,
            status,
            match_score: check.match_score || 0,
            updated_at: new Date().toISOString(),
          },
          ...next,
        ];
      });

      if (status === "interested") {
        const { data: existingClaim, error: claimFetchError } = await supabase
          .from("claims")
          .select("id, status")
          .eq("crush_post_id", post.id)
          .eq("claimer_user_id", check.checker_user_id)
          .maybeSingle();

        if (!claimFetchError && existingClaim?.id && existingClaim.status === "pending") {
          const { error: claimUpdateError } = await supabase
            .from("claims")
            .update({ status: "chat_requested", responded_at: new Date().toISOString() })
            .eq("id", existingClaim.id);

          if (claimUpdateError) {
            console.log(claimUpdateError);
          } else {
            toast.success("서로 확인했어요. 대화 요청을 보냈어요!");
            await loadMyActivityData();
            return;
          }
        } else if (claimFetchError) {
          console.log(claimFetchError);
        }
      }

      toast.success(status === "interested" ? "상대의 확인을 기다릴게요." : "목록에서 낮춰둘게요.");
    } finally {
      setClaimActionSubmittingId(null);
    }
  };

  const getSenderCheckPick = (postId, checkId) =>
    senderCheckPicks.find(
      (pick) =>
        pick.crush_post_id === postId &&
        String(pick.cloud_check_id) === String(checkId) &&
        pick.sender_user_id === currentUser?.id
    );

  const renderCloudCheckAnswer = (check) => {
    const joinKnownValues = (...values) =>
      values.filter((value) => value && value !== "-").join(" ") || "-";

    return (
      <div className="qaBox">
        <p className="qaTitle">상대가 구름 확인하기에서 입력한 내용</p>
        <p>
          <strong>날짜:</strong> {check.seen_date || "-"}
        </p>
        <p>
          <strong>내 성별:</strong> {check.checker_gender || "-"}
        </p>
        <p>
          <strong>헤어:</strong> {getCheckHairFeature(check) || "-"}
        </p>
        <p>
          <strong>안경:</strong> {check.glasses_type || "-"}
        </p>
        <p>
          <strong>상의:</strong> {joinKnownValues(check.top_color, check.top_type)}
        </p>
        <p>
          <strong>아우터:</strong>{" "}
          {check.outer_type === "아우터 없음"
            ? "아우터 없음"
            : joinKnownValues(check.outer_color, check.outer_type)}
        </p>
        <p>
          <strong>하의:</strong> {joinKnownValues(check.bottom_color, check.bottom_type)}
        </p>
        <p>
          <strong>신발:</strong> {check.shoe_type || "-"}
        </p>
        <p>
          <strong>가방:</strong> {check.bag_type || "-"}
        </p>
        <p>
          <strong>이어폰:</strong> {check.earphone_type || "-"}
        </p>
      </div>
    );
  };

  const renderSenderCheckCandidateCard = (post, check) => {
    const pick = getSenderCheckPick(post.id, check.id);
    const isSubmitting = claimActionSubmittingId === `check-${check.id}`;

    if (pick?.status === "dismissed") return null;

    return (
      <div className="cloudCheckCard senderCheckCandidateCard" key={`${post.id}-${check.id}`}>
        <div className="postTopLine">
          <span className="statusPill active">☁ 단서 일치 {check.match_score || 0}%</span>
          {pick?.status === "interested" && (
            <span className="statusPill">상대 확인 대기</span>
          )}
        </div>

        <p>
          <b>{formatShortDateTime(check.checked_at)}</b>
        </p>

        {check.match_reasons?.length > 0 && (
          <div className="matchScoreBox">
            <b>비슷하게 겹친 단서</b>
            <span>{check.match_reasons.join(" · ")}</span>
          </div>
        )}

        {renderCloudCheckAnswer(check)}

        <div className="senderCheckActionRow">
          <button
            type="button"
            onClick={() => saveSenderCheckPick(post, check, "interested")}
            disabled={isSubmitting || pick?.status === "interested"}
          >
            {pick?.status === "interested" ? "요청 완료" : "이 사람인 거 같아요"}
          </button>
          <button
            type="button"
            className="white"
            onClick={() => saveSenderCheckPick(post, check, "dismissed")}
            disabled={isSubmitting}
          >
            아닌 것 같아요
          </button>
        </div>
      </div>
    );
  };

  const getSenderCheckCandidatesForPost = (postId) =>
    senderCheckCandidates.filter((check) => {
      const pick = getSenderCheckPick(postId, check.id);
      return check.crush_post_id === postId && pick?.status !== "dismissed";
    });

  const sentClaimsByPostId = sentClaims
    .filter((claim) => !blockedUserIds.includes(claim.claimer_user_id))
    .reduce((acc, claim) => {
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
  const completedClaimStatuses = ["accepted", "chat_accepted", "rejected"];
  const mySentPostsWithCompletedResponses = mySentPosts.filter((post) =>
    (sentClaimsByPostId[post.id] || []).some((claim) =>
      completedClaimStatuses.includes(claim.status)
    )
  );
  const receivedCloudCount = new Set(
    [
      ...receivedClaims.map((claim) => String(claim.crush_post_id)),
      ...myReceivedCloudViews.map((view) => String(view.crush_post_id)),
      ...receivedSenderCheckPicks.map((pick) => String(pick.crush_post_id)),
    ]
  ).size;

  const receivedCloudItems = receivedClaims;
  const receivedViewItems = myReceivedCloudViews;
  const receivedSenderPickItems = receivedSenderCheckPicks;
  const receivedPendingClaimItems = receivedCloudItems.filter(
    (claim) => !completedClaimStatuses.includes(claim.status)
  );
  const receivedCompletedClaimItems = receivedCloudItems.filter((claim) =>
    completedClaimStatuses.includes(claim.status)
  );
  const sortByCloudActivityDate = (a, b) =>
    new Date(b.sortDate || 0) - new Date(a.sortDate || 0);
  const receivedPendingCloudItems = [
    ...receivedSenderPickItems.map((pick) => ({
      kind: "senderPick",
      id: `sender-pick-${pick.id || `${pick.crush_post_id}-${pick.cloud_check_id}`}`,
      sortDate: pick.updated_at || pick.created_at,
      data: pick,
    })),
    ...receivedViewItems.map((view) => ({
      kind: "view",
      id: `view-${view.id || view.crush_post_id}`,
      sortDate: view.viewed_at || view.post?.created_at,
      data: view,
    })),
    ...receivedPendingClaimItems.map((claim) => ({
      kind: "claim",
      id: `claim-${claim.id}`,
      sortDate: claim.responded_at || claim.created_at,
      data: claim,
    })),
  ].sort(sortByCloudActivityDate);
  const receivedCompletedCloudItems = receivedCompletedClaimItems
    .map((claim) => ({
      kind: "claim",
      id: `claim-${claim.id}`,
      sortDate: claim.responded_at || claim.created_at,
      data: claim,
    }))
    .sort(sortByCloudActivityDate);

  const totalSentResponseCount = sentClaims.length;
  const acceptedMatchCount = [...sentClaims, ...receivedClaims].filter(
    (claim) => claim.status === "accepted"
  ).length;

  const myChatRooms = [
    ...sentClaims
      .filter((claim) => claim.status === "chat_accepted" && claim.chat_room_id)
      .map((claim) => ({
        chatRoomId: claim.chat_room_id,
        otherNickname: claim.claimer_nickname || "상대",
        updatedAt: claim.responded_at || claim.created_at,
        role: "sender",
      })),
    ...receivedClaims
      .filter((claim) => claim.status === "chat_accepted" && claim.chat_room_id)
      .map((claim) => ({
        chatRoomId: claim.chat_room_id,
        otherNickname: claim.post?.sender_nickname || "상대",
        updatedAt: claim.responded_at || claim.created_at,
        role: "claimer",
      })),
  ]
    .filter((room) => {
      const roomStatus = chatRoomStatusMap[room.chatRoomId];
      if (!roomStatus) return true;
      return room.role === "sender"
        ? !roomStatus.sender_deleted_at
        : !roomStatus.claimer_deleted_at;
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const activityDateOptions = [
  ...new Set([
    ...mySentPosts.map((post) => post.seen_date).filter(Boolean),
    ...receivedClaims.map((claim) => claim.post?.seen_date).filter(Boolean),
    ...myReceivedCloudViews.map((view) => view.post?.seen_date).filter(Boolean),
    ...receivedSenderCheckPicks.map((pick) => pick.post?.seen_date).filter(Boolean),
    ...myCloudChecks.map((check) => check.seen_date).filter(Boolean),
  ]),
].sort((a, b) => b.localeCompare(a));

  const selectedActivityDate = activityDate || activityDateOptions[0] || "";
  const selectedDateSentPosts = mySentPosts.filter(
    (post) => post.seen_date === selectedActivityDate
  );
  const selectedDateReceivedClaims = receivedClaims.filter(
    (claim) => claim.post?.seen_date === selectedActivityDate
  );
  const selectedDateReceivedViews = myReceivedCloudViews.filter(
    (view) => view.post?.seen_date === selectedActivityDate
  );
  const selectedDateReceivedSenderPicks = receivedSenderCheckPicks.filter(
    (pick) => pick.post?.seen_date === selectedActivityDate
  );

  const selectedDateReceivedCloudCount = new Set(
    [
      ...selectedDateReceivedClaims.map((claim) => String(claim.crush_post_id)),
      ...selectedDateReceivedViews.map((view) => String(view.crush_post_id)),
      ...selectedDateReceivedSenderPicks.map((pick) => String(pick.crush_post_id)),
    ]
  ).size;
  const selectedDateReceivedCloudItems = selectedDateReceivedClaims;
  const selectedDateReceivedViewItems = selectedDateReceivedViews;
  const selectedDateReceivedSenderPickItems = selectedDateReceivedSenderPicks;
  const selectedDateCloudChecks = myCloudChecks.filter(
  (check) => check.seen_date === selectedActivityDate
);

  const selectedDateTotalCheckResultCount = selectedDateCloudChecks.reduce(
  (sum, check) => sum + (check.result_count || 0),
  0
);

  const visibleSearchResults = searchResults.filter(
  (post) =>
    !hiddenResultIds.includes(post.id) &&
    !blockedUserIds.includes(post.sender_user_id)
);
  const todayPlaceCounts = homeTodayClouds.reduce((acc, post) => {
    const place = getMainPlaceFromPost(post);

    if (!acc[place]) {
      acc[place] = {
        place,
        count: 0,
      };
    }

    acc[place].count += 1;
    return acc;
  }, {});
  const topTodayPlaces = Object.values(todayPlaceCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const todayCloudMessages = homeTodayClouds
    .filter((post) => cleanMessage(post.message))
    .slice(0, 3);
  const homeWeatherCloudCount = Math.ceil(homeTodayClouds.length * 1.5);

  const notificationItems = [
  ...sentClaims.map((claim) => ({
    id: `sent-${claim.id}`,
    group: "sent",
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
    onClick: () => {
      markNotificationGroupSeen("sent");
      setExpandedSentPostId(claim.crush_post_id);
      setMatchingMode("sentResponsesAll");
    },
  })),
  ...receivedSenderCheckPicks.map((pick) => ({
    id: `sender-pick-${pick.id || `${pick.crush_post_id}-${pick.cloud_check_id}`}`,
    group: "received",
    type: "나를 선택함",
    title: "상대가 내 구름 확인 기록을 선택했어요",
    description: `${pick.post?.seen_date || "날짜 없음"} · ${
      pick.post?.time_period || "시간 없음"
    } · ${pick.post?.place || "장소 없음"}`,
    created_at: pick.updated_at || pick.created_at,
    active: true,
    actionLabel: "채팅방 수락 / 거절하기",
    onClick: () => {
      markNotificationGroupSeen("received");
      openSenderPickChatPreview(pick);
    },
  })),
].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const sentNotificationItems = notificationItems.filter((item) => item.group === "sent");
  const receivedNotificationItems = notificationItems.filter((item) => item.group === "received");
  const visibleNotificationItems =
    notificationFilter === "sent" ? sentNotificationItems : receivedNotificationItems;
  const getItemTime = (item) => new Date(item.created_at || 0).getTime();
  const sentNotificationUnreadCount = sentNotificationItems.filter(
    (item) => getItemTime(item) > sentNotificationSeenAt
  ).length;
  const receivedNotificationUnreadCount = receivedNotificationItems.filter(
    (item) => getItemTime(item) > receivedNotificationSeenAt
  ).length;
  const notificationBadgeCount = Math.min(
    notificationItems.filter((item) => getItemTime(item) > notificationSeenAt).length,
    99
  );

  const markNotificationSeen = () => {
    const now = Date.now();
    setNotificationSeenAt(now);
    try {
      localStorage.setItem("dankkum_notification_seen_at", String(now));
    } catch {}
  };

  const markNotificationGroupSeen = (group) => {
    const now = Date.now();
    if (group === "sent") {
      setSentNotificationSeenAt(now);
      try {
        localStorage.setItem("dankkum_sent_notification_seen_at", String(now));
      } catch {}
      return;
    }
    setReceivedNotificationSeenAt(now);
    try {
      localStorage.setItem("dankkum_received_notification_seen_at", String(now));
    } catch {}
  };

  const openNotificationsPage = () => {
    markNotificationSeen();
    markNotificationGroupSeen(notificationFilter);
    setMatchingMode("notifications");
  };

  const renderBellWithBadge = (size = 21) => (
    <span className="notificationBellWrap">
      <BellIcon size={size} />
      {notificationBadgeCount > 0 && (
        <span className="notificationBadge">{notificationBadgeCount}</span>
      )}
    </span>
  );

  const cloudCalendarRecordMap = cloudCalendarRecords.reduce((acc, record) => {
    if (record.checked_date) {
      acc[record.checked_date] = record;
    }
    return acc;
  }, {});
  const cloudCalendarDays = getMonthMatrix(cloudCalendarMonth);
  const selectedCloudCalendarRecord =
    cloudCalendarRecordMap[selectedCloudCalendarDate] || null;
  const selectedCloudCalendarDateObject = parseLocalDate(selectedCloudCalendarDate);
  const selectedCloudCalendarLabel = selectedCloudCalendarDateObject
    ? `${selectedCloudCalendarDateObject.getMonth() + 1}월 ${selectedCloudCalendarDateObject.getDate()}일`
    : "";
  const cloudCalendarMonthTitle = `${cloudCalendarMonth.getFullYear()}년 ${
    cloudCalendarMonth.getMonth() + 1
  }월`;

  const getCloudCalendarOutfitRows = (record) => {
    if (!record) return [];

    return [
      ["헤어", record.hair_feature || "-"],
      ["상의", `${record.top_color || "-"} ${record.top_type || ""}`.trim()],
      [
        "아우터",
        record.outer_type === "아우터 없음"
          ? "아우터 없음"
          : `${record.outer_color || "-"} ${record.outer_type || ""}`.trim(),
      ],
      ["하의", `${record.bottom_color || "-"} ${record.bottom_type || ""}`.trim()],
      ["신발", record.shoe_type || "-"],
      ["소지품", `가방 ${record.bag_type || "-"} · 이어폰 ${record.earphone_type || "-"}`],
      ["안경", record.glasses_type || "-"],
    ];
  };

  const formatCloudSummaryDate = (date) => {
    if (!date) return "--/--";
    const parts = String(date).split("-");
    if (parts.length < 3) return date;
    return `${parts[1]}/${parts[2]}`;
  };

  const formatCloudListSummary = (post) =>
    [
      `☁ ${formatCloudSummaryDate(post?.seen_date)}`,
      post?.place || "장소 없음",
      post?.sender_nickname || "닉네임 없음",
    ].join(", ");

  const renderCloudFolderButton = ({ title, count, newCount = 0, onClick }) => (
    <button
      type="button"
      className="cloudFolderButton"
      onClick={onClick}
    >
      <span className="cloudFolderTitle">
        {title} <b>{count}개</b>
        {newCount > 0 && (
          <span className="cloudFolderNewBadge">{Math.min(newCount, 99)}</span>
        )}
      </span>
      <span className="cloudFolderHint">전체보기</span>
      <span className="cloudFolderArrow" aria-hidden="true">
        <ChevronRightIcon size={18} />
      </span>
    </button>
  );

  const renderReceivedCloudListItem = (item) => {
    if (item.kind === "senderPick") return renderReceivedSenderPickCard(item.data);
    if (item.kind === "view") return renderReceivedCloudViewCard(item.data);
    return renderReceivedClaimCard(item.data);
  };

  const renderChatRequestPostDetail = (post, title = "상대가 띄운 구름 상세목록") => {
    if (!post) return null;

    return (
      <div className="noticeBox chatRequestDetailBox">
        <p className="qaTitle">{title}</p>
        <p>
          <b>
            {post.seen_date || "-"}, {post.time_period || "-"}, {post.place || "-"}
          </b>
        </p>
        {renderPostQuestionAnswer(post)}
        <p className="message">
          “{cleanMessage(post.message) || "남긴 메시지가 없어요."}”
        </p>
      </div>
    );
  };

  const renderSentClaimCard = (claim) => {
  return (
    <div className="responseBox" key={claim.id}>
      <p className="miniTitle">
        {claim.status === "chat_requested"
          ? "내가 보낸 채팅방 요청"
          : "내가 찾는 사람인거 같아요"}
      </p>

      <p>
        요청한 사람 닉네임: <b>{claim.claimer_nickname || "-"}</b>
      </p>

      <p className="message">“{claim.claimer_message || "-"}”</p>

      <p>
        상태:{" "}
        <b>
          {claim.status === "accepted" && "매칭 수락됨(레거시)"}
            {claim.status === "chat_requested" && "채팅방 요청함"}
            {claim.status === "chat_accepted" && "대화 중"}
            {claim.status === "rejected" && "거절됨"}
            {claim.status === "pending" && "수락/거절 선택 필요"}
        </b>
      </p>

      {claim.status === "pending" && (
        <>
          <p className="requestDecisionTitle">내가 찾는 사람인거 같아요</p>
          <div className="claimActionRow">
            <button
              onClick={() => acceptChatRequest(claim, claim.claimer_nickname)}
              disabled={claimActionSubmittingId === claim.id}
            >
              {claimActionSubmittingId === claim.id ? "수락 중..." : "채팅방 수락하기"}
            </button>
            <button
              type="button"
              className="white"
              onClick={() => rejectClaim(claim.id, "sender")}
              disabled={claimActionSubmittingId === claim.id}
            >
              거절 의사 보내기
            </button>
          </div>
        </>
      )}

      {claim.status === "chat_requested" && (
        <div className="noticeBox">
          <p>상대에게 채팅방 요청을 보냈어요. 상대의 수락을 기다리고 있어요.</p>
        </div>
      )}

      {claim.status === "chat_accepted" && (
        <button onClick={() => openChatRoom(claim.chat_room_id, claim.claimer_nickname)}>
          채팅방 열기
        </button>
      )}

      {claim.status === "rejected" && (
        <p className="notice">
          {claim.rejected_by === "sender"
            ? "이 응답을 거절했어요."
            : "상대가 대화를 원하지 않았어요."}
        </p>
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

      <div className="safetyActionRow">
        <button
          type="button"
          className="dismissTextButton"
          onClick={() => reportContent("claim", claim.id, claim.claimer_user_id)}
        >
          신고하기
        </button>
        <button
          type="button"
          className="dismissTextButton"
          onClick={() => blockUser(claim.claimer_user_id, claim.claimer_nickname)}
        >
          차단하기
        </button>
      </div>
    </div>
  );
};

  const renderSentPostCard = (post, mode, defaultOpen = false) => {
    const claims = sentClaimsByPostId[post.id] || [];
    const checkCandidates = getSenderCheckCandidatesForPost(post.id);
    const detailsProps = defaultOpen ? { open: true } : {};

    return (
      <details className="post postCollapsible" key={post.id} {...detailsProps}>
        <summary className="postSummary">
          <span className={claims.length > 0 ? "statusPill active" : "statusPill"}>
            {claims.length > 0 ? `응답 ${claims.length}개` : "응답 없음"}
          </span>
          <span className="postSummaryText">
            {formatCloudListSummary(post)}
          </span>
          <span className="postSummaryArrow" aria-hidden="true">›</span>
        </summary>

        <div className="postBody">
          {renderPostQuestionAnswer(post)}

          <p className="message">
            “{cleanMessage(post.message) || "남긴 메시지가 없어요."}”
          </p>

          {mode === "empty" && (
    <div className="noticeBox">
      <p>아직 이 구름에 채팅방을 요청한 사람이 없어요.</p>
      <p>상대가 구름 게시판에서 이 구름을 발견하면 여기에 표시돼요.</p>
    </div>
  )}

          {mode === "answered" && claims.map((claim) => renderSentClaimCard(claim))}

          <div className="senderCheckSection">
            <h3 className="manageSectionTitle">구름 확인 내역 {checkCandidates.length}개</h3>
            {checkCandidates.length === 0 ? (
              <p className="noticeBox">
                아직 이 구름과 비슷한 확인 내역이 없어요. 상대가 구름 확인하기에서
                날짜와 착장을 입력하면 여기에 표시돼요.
              </p>
            ) : (
              <>
                <p className="helperText">
                  상대의 프로필이 아니라 구름 확인하기에서 실제 입력한 내용만 보여줘요.
                </p>
                {checkCandidates.map((check) =>
                  renderSenderCheckCandidateCard(post, check)
                )}
              </>
            )}
          </div>

          {post.clothes_style === "빠른 구름" && (
            <div className="upgradeCloudBox">
              <p>📝 빠른 구름이에요. 헤어·옷 정보를 추가하면 상대가 본인인지 더 잘 알아볼 수 있어요.</p>
              <button
                type="button"
                className="upgradeCloudButton"
                onClick={() => openEditQuickCloud(post)}
              >
                ✎ 자세하게 수정하기
              </button>
            </div>
          )}

          <button
            type="button"
            className="dangerButton"
            onClick={() => deleteMyPost(post.id)}
            disabled={deletingPostId === post.id}
          >
            {deletingPostId === post.id ? "삭제 중..." : "이 구름 삭제하기"}
          </button>
        </div>
      </details>
    );
  };

	  const renderReceivedClaimCard = (claim) => {
    const post = claim.post;

    return (
      <details className="post postCollapsible" key={claim.id}>
        <summary className="postSummary">
          <span className="statusPill">구름 확인 응답</span>
          <span className="postSummaryText">
            {post
              ? formatCloudListSummary(post)
              : "연결된 구름 글을 찾지 못했어요"}
          </span>
          <span className="postSummaryArrow" aria-hidden="true">›</span>
        </summary>

        <div className="postBody">
        {post ? (
          <>
            <p>
              구름을 보낸 사람: <b>{post.sender_nickname || "-"}</b>
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
          내가 보낸 채팅방 요청: <b>{claim.claimer_message || "-"}</b>
        </p>

        <p>
          상태:{" "}
          <b>
            {claim.status === "accepted" && "매칭 수락됨(레거시)"}
            {claim.status === "chat_requested" && "대화 요청 도착"}
            {claim.status === "chat_accepted" && "대화 중"}
            {claim.status === "rejected" && "거절됨"}
            {claim.status === "pending" && "상대 수락 대기 중"}
          </b>
        </p>

        {claim.status === "pending" && (
          <div className="noticeBox">
            <p>아직 상대가 수락하지 않았어요.</p>
          </div>
        )}

        {claim.status === "chat_requested" && (
          <button onClick={() => openChatPreview(claim)}>
            상대가 대화를 원해요, 확인하기
          </button>
        )}

        {claim.status === "chat_accepted" && (
          <button onClick={() => openChatRoom(claim.chat_room_id, claim.post?.sender_nickname)}>
            채팅방 열기
          </button>
        )}

        {claim.status === "rejected" && (
          <p className="notice">
            {claim.rejected_by === "claimer"
              ? "이 대화를 거절했어요."
              : "아쉽지만 이번엔 연결되지 않았어요."}
          </p>
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
	      </details>
	    );
	  };

  const renderReceivedSenderPickCard = (pick) => {
    const post = pick.post;
    if (!post) return null;

    const isSubmitting = claimActionSubmittingId === `sender-pick-${pick.id}`;

    return (
      <details
        className="post postCollapsible"
        key={`sender-pick-card-${pick.id || `${pick.crush_post_id}-${pick.cloud_check_id}`}`}
      >
        <summary className="postSummary">
          <span className="statusPill active">채팅방 요청 도착</span>
          <span className="postSummaryText">
            {formatCloudListSummary(post)}
          </span>
          <span className="postSummaryArrow" aria-hidden="true">›</span>
        </summary>

        <div className="postBody">
          <p className="miniTitle">상대가 내 구름 확인 기록을 선택했어요</p>
          <p className="helperText">
            상대가 띄운 구름 상세목록을 보고 채팅방을 수락하거나 거절할 수 있어요.
          </p>

          {renderChatRequestPostDetail(post)}

          <button
            type="button"
            onClick={() => openSenderPickChatPreview(pick)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "여는 중..." : "채팅방 수락 / 거절하기"}
          </button>

          <div className="safetyActionRow">
            <button
              type="button"
              className="dismissTextButton"
              onClick={() => reportContent("post", post.id, post.sender_user_id)}
            >
              신고하기
            </button>
            <button
              type="button"
              className="dismissTextButton"
              onClick={() => blockUser(post.sender_user_id, post.sender_nickname)}
            >
              차단하기
            </button>
          </div>
        </div>
      </details>
    );
  };

  const renderReceivedCloudViewCard = (view) => {
    const post = view.post;
    if (!post) return null;

    const tags = makeCloudTags(post);

    return (
      <details
        className="post postCollapsible resultPost"
        key={`view-${view.id || view.crush_post_id}`}
      >
        <summary className="postSummary">
          <span className="statusPill active">
            ☁ 확인한 구름 {view.match_score ? `${view.match_score}%` : ""}
          </span>
          <span className="postSummaryText">{formatCloudListSummary(post)}</span>
          <span className="postSummaryArrow" aria-hidden="true">›</span>
        </summary>

        <div className="postBody">

        {tags.length > 0 && (
          <div className="cloudTagBox">
            {tags.map((tag) => (
              <span className="cloudTag" key={`${view.crush_post_id}-${tag}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <p>
          <b>
            {post.seen_date}, {post.time_period}, {post.place}
          </b>
        </p>

        {renderPostQuestionAnswer(post)}

        <p className="message">
          “{cleanMessage(post.message) || "남긴 메시지가 없어요."}”
        </p>

        {renderCloudActionButtons(post)}

        <div className="safetyActionRow">
          <button
            type="button"
            className="dismissTextButton"
            onClick={() => reportContent("post", post.id, post.sender_user_id)}
          >
            신고하기
          </button>
          <button
            type="button"
            className="dismissTextButton"
            onClick={() => blockUser(post.sender_user_id, post.sender_nickname)}
          >
            차단하기
          </button>
        </div>
        </div>
      </details>
    );
  };

  const renderBottomNav = () => {
    const navItems = [
      {
        key: "home",
        label: "홈",
        icon: <HomeIcon size={20} />,
        active: page === "home",
        onClick: () => leaveActiveFlow("bottom_home", "home"),
      },
      {
        key: "send",
        label: "보내기",
        icon: <PlusIcon size={20} />,
        active: page === "send" || page === "sent",
        onClick: openSendPage,
      },
      {
        key: "search",
        label: "확인",
        icon: <SearchIcon size={20} />,
        active: page === "search" || page === "result" || page === "reply",
        onClick: openSearchPage,
      },
      {
        key: "matching",
        label: "내 구름",
        icon: <ListIcon size={20} />,
        active: page === "matching" || page === "claim",
        onClick: () => {
          setMatchingMode("sent");
          openMatchingPage();
        },
      },
      {
        key: "chats",
        label: "채팅",
        icon: <ChatIcon size={20} />,
        active: page === "chats" || page === "chatRoom" || page === "chatPreview",
        onClick: openChatsPage,
      },
    ];

    return (
      <nav className="bottomNav" aria-label="주요 메뉴">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.key}
            className={item.active ? "bottomNavItem active" : "bottomNavItem"}
            onClick={item.onClick}
          >
            <span className="bottomNavIcon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    );
  };

  if (authLoading) {
    return (
      <div className="app">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: "14px", maxWidth: "320px" } }} />
        <div className="card">
          <h1>단꿈</h1>
          <p className="subtitle">로그인 상태를 확인하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (sharedPostLoading && !currentUser) {
    return (
      <div className="app">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: "14px", maxWidth: "320px" } }} />
        <div className="card">
          <h1>단꿈</h1>
          <p className="subtitle">공유된 구름을 불러오고 있어요...</p>
        </div>
      </div>
    );
  }

  if (showPrivacyPolicy) {
    return (
      <div className="app">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: "14px", maxWidth: "320px" } }} />
        <PrivacyPolicyPage onClose={() => setShowPrivacyPolicy(false)} />
      </div>
    );
  }

  if (page === "verificationPending" && session && currentUser) {
    return (
      <VerificationPendingPage
        currentUser={currentUser}
        onApproved={async () => {
          await loadMyProfile(currentUser, true);
          // 프로필 미완성이면 프로필 설정 페이지로, 완성됐으면 홈으로
          setPage("profile");
          toast.success("인증이 승인됐어요! 프로필을 먼저 설정해주세요.");
        }}
        onLogout={handleLogout}
      />
    );
  }

  if ((!session || !currentUser) && !(page === "sharedPost" && guestSharedPreview)) {
    return (
      <div className="app">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: "14px", maxWidth: "320px" } }} />
        <div className="card">
          <h1>단꿈</h1>

	          <p className="subtitle">
	            호감이라는 말보다 조금 덜 부담스럽게, 몽글한 구름으로 마음을 전해요.
	          </p>

	          <div className="authTrustRow">
	            <div className="authTrustItem">
	              <span className="authTrustIcon">
	                <ShieldCheckIcon size={17} />
	              </span>
	              <b>학생 인증</b>
	              <span>단국대 구성원 중심</span>
	            </div>
	            <div className="authTrustItem">
	              <span className="authTrustIcon">
	                <UsersIcon size={17} />
	              </span>
	              <b>상호 수락</b>
	              <span>원할 때만 인스타 공개</span>
	            </div>
	            <div className="authTrustItem">
	              <span className="authTrustIcon">
	                <TrashIcon size={17} />
	              </span>
	              <b>내가 관리</b>
	              <span>띄운 구름 삭제 가능</span>
	            </div>
	          </div>

          {authMode === "signup" && (
            <>
              <div className="privacyConsentPanel">
                <label className="privacyConsentBox">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    disabled={authSubmitting}
                  />
                  <span className="privacyConsentText">
                    <strong>모두 동의합니다.</strong>
                    <span>
                      단꿈 이용을 위한 개인정보 수집·이용 및 개인정보처리방침에 동의합니다.
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  className="privacyPolicyOpenButton"
                  onClick={() => setShowPrivacyPolicy(true)}
                >
                  개인정보처리방침 보기
                </button>
              </div>

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
              <div className="formGroup">
  <label className="formLabel">학과</label>
  <input
    placeholder="예: 경영경제 글로벌경영학과"
    value={authForm.department}
    onChange={(e) =>
      setAuthForm({ ...authForm, department: e.target.value })
    }
  />
</div>

<div className="formGroup">
  <label className="formLabel">캠퍼스</label>
  <div className="optionGrid">
    {campusOptions.map((option) => (
      <OptionButton
        key={option}
        value={option}
        selected={authForm.campus === option}
        onClick={() => setAuthForm({ ...authForm, campus: option })}
      />
    ))}
  </div>
</div>

	<div className="formGroup">
	  <label className="formLabel">단국대 학생 인증 캡처</label>
	  <div className="verificationGuide">
	    <div>
	      <p className="verificationGuideTitle">MY DKU 첫 화면을 캡처해주세요</p>
	      <p>
	        예시처럼 이름, 학번, 학과, 학부/재학 상태가 한 화면에 보이면 인증이
	        더 빠르게 진행돼요.
	      </p>
	    </div>
	    <img
	      src="/my-dku-verification-example-thumb.png"
	      alt="MY DKU 학생 인증 캡처 예시"
	      width="92"
	      height="199"
	      loading="eager"
	      decoding="async"
	    />
	  </div>
	  <ul className="verificationChecklist">
	    <li>MY DKU 앱 홈 화면</li>
	    <li>이름과 학번이 보이는 화면</li>
	    <li>학과와 재학 상태가 보이는 화면</li>
	  </ul>
	  {isNativeApp() ? (
	    <button type="button" onClick={handlePickVerificationFile}>
	      {verificationFile ? `📷 ${verificationFile.name}` : "📷 MY DKU 캡처 선택하기"}
	    </button>
	  ) : (
	    <input
	      type="file"
	      accept="image/*"
	      onChange={(e) => {
	        const file = e.target.files[0];
	        if (!file) {
	          setVerificationFile(null);
	          return;
	        }

	        const fileError = validateImageFile(file, "학생 인증 이미지");

	        if (fileError) {
	          toast.error(fileError);
	          e.target.value = "";
	          setVerificationFile(null);
	          return;
	        }

	        setVerificationFile(file);
	      }}
	    />
	  )}
	  <p className="helperText">
	    민감한 알림 내용은 가려도 괜찮아요. 단, 이름/학번/학과는 확인 가능해야 해요.
	  </p>
	</div>
            </>
          )}

          <div className="formGroup">
            <label className="formLabel">아이디</label>
            <input
              placeholder="아이디 입력"
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
                placeholder="비밀번호 입력"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
              />
              <button
                type="button"
                className="passwordToggleButton"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
              </button>
            </div>
          </div>

          {authMode === "login" ? (
            <>
	              <button onClick={handleLogin} disabled={authSubmitting}>
	                {authSubmitting ? "로그인 중..." : "로그인하기"}
	              </button>

	              <button
	                className="white"
	                onClick={() => setAuthMode("signup")}
	                disabled={authSubmitting}
	              >
	                처음이라면 회원가입
	              </button>
            </>
          ) : (
            <>
              <button onClick={handleSignUp} disabled={authSubmitting || !privacyConsent}>
                {authSubmitting ? (signupProgress || "처리 중...") : "회원가입하기"}
              </button>

              {signupProgress && (
                <div className="signupProgressBox">
                  <div className="signupProgressDot" />
                  <span>{signupProgress}</span>
                </div>
              )}

              <button
                className="white"
                onClick={() => {
                  setAuthMode("login");
                  setPrivacyConsent(false);
                }}
                disabled={authSubmitting}
              >
                이미 계정이 있어요
              </button>
            </>
          )}

          <p className="notice">
            로그인하지 않으면 홈 화면, 구름 보내기, 구름 확인 기능을 사용할 수
            없어요.
          </p>

        </div>
      </div>
    );
  }

  if (showAdmin && isAdmin) {
    return (
      <div className="app">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: "14px", maxWidth: "320px" } }} />
        <AdminPage onClose={() => setShowAdmin(false)} />
      </div>
    );
  }

  return (
    <div className="app">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { fontSize: "14px", maxWidth: "320px" },
        }}
      />
      {page === "home" && (
        <div className="homeV2">
          <div className="homeV2Header">
            <div className="homeV2Greeting">
              <h1>구름, 단꿈</h1>
            </div>
            <div className="homeV2CloudMark" aria-hidden="true">
              <img src="/app-icon-cloud.png" alt="" />
            </div>
            <div className="homeV2IconRow">
              <button
                type="button"
                className="homeV2IconBtn"
                aria-label="알림"
                onClick={() => {
                  openNotificationsPage();
                  openMatchingPage();
                }}
              >
                {renderBellWithBadge(19)}
              </button>
              <button
                type="button"
                className="homeV2IconBtn"
                aria-label="프로필"
                onClick={openProfilePage}
              >
                <PersonIcon size={19} />
              </button>
            </div>
          </div>

          <div className="homeV2Banner">
            <span className="homeWeatherTickerTrack">
              <span className="homeWeatherTickerCloud" aria-hidden="true">☁</span>
              <span className="homeWeatherTickerText">
                오늘 구름 <b>{homeWeatherCloudCount}개</b>가 떴어요
              </span>
              <span className="homeWeatherTickerCloud" aria-hidden="true">☁</span>
            </span>
          </div>

          <button type="button" onClick={openNewCloudPage} className="homeV2ActionCard">
            <span className="homeV2ActionIcon">☁️</span>
            <span className="homeV2ActionText">
              <b>구름 보내기</b>
              <small>스쳐간 마음을 구름으로 남겨요.</small>
            </span>
            <span className="homeV2ActionChevron">
              <ChevronRightIcon />
            </span>
          </button>

          <button type="button" onClick={openSearchPage} className="homeV2ActionCard">
            <span className="homeV2ActionIcon amber">🔔</span>
            <span className="homeV2ActionText">
              <b>구름 확인하기</b>
              <small>나를 찾는 구름이 있는지 확인해요.</small>
            </span>
            <span className="homeV2ActionChevron">
              <ChevronRightIcon />
            </span>
          </button>

          <div className="homeV2TodayCard">
            <div className="homeV2TodayHeader">
              <div>
                <b>오늘의 단국대 구름</b>
              </div>
              <button
                type="button"
                className="homeV2SeeAll"
                onClick={() => {
                  setWeatherDate(getKoreaDateString());
                  openWeatherPage();
                }}
              >
                전체 보기 ›
              </button>
            </div>

            {topTodayPlaces.length > 0 ? (
              <div className="placeChipRow">
                {topTodayPlaces.map((item, index) => (
                  <button
                    type="button"
                    key={item.place}
                    className="placeCloudChip"
                    onClick={() => {
                      setWeatherDate(getKoreaDateString());
                      openWeatherPage();
                    }}
                  >
                    <span className="placeCloudRank">{index + 1}</span>
                    <span className="placeCloudName">{item.place}</span>
                    <b>{item.count}</b>
                  </button>
                ))}
              </div>
            ) : (
              <div className="homeV2TodayEmpty">
                <span className="homeV2TodayEmoji">☁️ ☁️</span>
                <p>
                  아직 오늘 떠오른 구름이 없어요.
                  <br />
                  첫 구름의 주인공이 되어보세요!
                </p>
              </div>
            )}
          </div>

          <div className="homeV2TrustRow">
            <div className="homeV2TrustItem">
              <span className="homeV2TrustIcon">
                <ShieldCheckIcon size={17} />
              </span>
              <b>단국대 구성원 중심</b>
              <span>안전한 캠퍼스 서비스</span>
            </div>
            <div className="homeV2TrustItem">
              <span className="homeV2TrustIcon">
                <UsersIcon size={17} />
              </span>
              <b>서로 동의할 때만 공개</b>
              <span>원할 때만 인스타 공개</span>
            </div>
            <div className="homeV2TrustItem">
              <span className="homeV2TrustIcon">
                <TrashIcon size={17} />
              </span>
              <b>내가 남긴 구름은 삭제 가능</b>
              <span>언제든 관리할 수 있어요</span>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="adminAccessButton"
            >
              🔧 관리자 페이지
            </button>
          )}
        </div>
      )}

	      {page === "profile" && (
	        <div className="card">
          <div className="mypageHeaderRow">
            <h2>마이페이지</h2>
            <button
              type="button"
              className="mypageGearBtn"
              aria-label="설정"
              onClick={() => setShowPrivacyPolicy(true)}
            >
              <GearIcon size={18} />
            </button>
          </div>

          <div className="mypageHero">
            <div className="mypageAvatar">☁️</div>
            <div className="mypageHeroBody">
              <div className="mypageHeroNameRow">
                <b>{profile.nickname || "단꿈러"}</b>
                <span className="mypageEditBadge">프로필 편집</span>
              </div>
              <p>내가 남긴 구름과 받은 알림을 한곳에서 관리해요.</p>
            </div>
          </div>

          <div className="myCloudHeroBox">
             <p className="myCloudHeroTitle">☁️ 나에게 온 구름 {receivedCloudCount}개</p>
             <p className="myCloudHeroDesc">
               오늘도 누군가의 기억 속에 머물렀어요.
             </p>
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
              <span>나에게 온 구름</span>
              <b>{receivedCloudCount}</b>
            </div>
            <div className="mypageStat">
              <span>매칭</span>
              <b>{acceptedMatchCount}</b>
            </div>
          </div>

          <div className="mypageQuickMenu">
            <button
              type="button"
              className="mypageMenuRow"
              onClick={() => {
                setMatchingMode("sent");
                openMatchingPage();
              }}
            >
              <span className="mypageMenuIcon blue">
                <PaperPlaneIcon size={18} />
              </span>
              <span className="mypageMenuBody">
                <b>내가 띄운 구름 관리</b>
                <span>내가 남긴 구름과 응답 현황을 확인해요.</span>
              </span>
              <span className="mypageMenuChevron">
                <ChevronRightIcon size={18} />
              </span>
            </button>
            <button
              type="button"
              className="mypageMenuRow"
              onClick={openCloudCalendarPage}
            >
              <span className="mypageMenuIcon calendarOutline">
                <CalendarIcon size={18} />
              </span>
              <span className="mypageMenuBody">
                <b>구름 달력</b>
                <span>구름 개수는 나에게만 보여요!</span>
              </span>
              <span className="mypageMenuChevron">
                <ChevronRightIcon size={18} />
              </span>
            </button>
            <button
              type="button"
              className="mypageMenuRow"
              onClick={() => {
                openNotificationsPage();
                openMatchingPage();
              }}
            >
              <span className="mypageMenuIcon amber">
                {renderBellWithBadge(18)}
              </span>
              <span className="mypageMenuBody">
                <b>알림 보기</b>
                <span>새로운 구름, 응답 등 알림을 확인해요.</span>
              </span>
              <span className="mypageMenuChevron">
                <ChevronRightIcon size={18} />
              </span>
            </button>
          </div>

          <h3 className="manageSectionTitle" style={{ marginTop: 22, textAlign: "left" }}>
            프로필 정보 수정
          </h3>

          <div className="formGroup">
            <label className="formLabel">캠퍼스</label>
            <p className="profileCampusValue">
              단국대 {profile.campus || "-"}캠퍼스
              <span className="profileCampusNote">변경 불가</span>
            </p>
          </div>

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

	          <button onClick={saveProfile} disabled={profileSubmitting}>
	            {profileSubmitting ? "저장 중..." : "저장하기"}
	          </button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>

          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="logoutTextButton"
          >
            개인정보처리방침
          </button>

          <button onClick={handleLogout} className="logoutTextButton">
            로그아웃
          </button>

          <button
            onClick={handleAccountDeletion}
            disabled={accountDeleting}
            className="dangerButton"
          >
            {accountDeleting ? "탈퇴 처리 중..." : "회원탈퇴"}
          </button>
	        </div>
	      )}

	      {page === "cloudCalendar" && (
	        <div className="card cloudCalendarCard">
          <div className="cloudCalendarTop">
            <div>
              <h2>구름 달력</h2>
              <p className="subtitle">
                구름 개수는 나에게만 보여요!
              </p>
            </div>
          </div>

          <div className="cloudCalendarMonthNav">
            <button
              type="button"
              className="cloudCalendarIconButton"
              aria-label="이전 달"
              onClick={() => setCloudCalendarMonth((prev) => addMonths(prev, -1))}
            >
              <ChevronLeftIcon size={22} />
            </button>
            <div className="cloudCalendarMonthTitle">{cloudCalendarMonthTitle}</div>
            <button
              type="button"
              className="cloudCalendarIconButton"
              aria-label="다음 달"
              onClick={() => setCloudCalendarMonth((prev) => addMonths(prev, 1))}
            >
              <ChevronRightIcon size={22} />
            </button>
          </div>

          {cloudCalendarLoading ? (
            <p className="noticeBox">구름 달력을 불러오는 중이에요...</p>
          ) : (
            <>
              <div className="cloudCalendarWeekdays">
                {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
                  <span
                    key={day}
                    className={
                      index === 0
                        ? "sunday"
                        : index === 6
                          ? "saturday"
                          : ""
                    }
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="cloudCalendarGrid">
                {cloudCalendarDays.map((day) => {
                  if (day.isBlank) {
                    return (
                      <div
                        key={day.dateKey}
                        className="cloudCalendarBlank"
                        aria-hidden="true"
                      />
                    );
                  }

                  const record = cloudCalendarRecordMap[day.dateKey];
                  const hasRecord = Boolean(record);
                  const isSelected = day.dateKey === selectedCloudCalendarDate;
                  const matchedCount = record?.matched_cloud_count || 0;
                  const dayClasses = [
                    "cloudCalendarDay",
                    hasRecord ? "checked" : "unchecked",
                    day.dayOfWeek === 0 ? "sunday" : "",
                    day.dayOfWeek === 6 ? "saturday" : "",
                    isSelected ? "selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      type="button"
                      key={day.dateKey}
                      className={dayClasses}
                      onClick={() => setSelectedCloudCalendarDate(day.dateKey)}
                    >
                      <span className="cloudCalendarDateNumber">{day.day}</span>
                      <span
                        className={
                          matchedCount > 0
                            ? "cloudCalendarCloudCount"
                            : "cloudCalendarCloudCount empty"
                        }
                        aria-hidden={matchedCount === 0}
                      >
                        {matchedCount > 0 ? `☁️ ${matchedCount}` : "0"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="cloudCalendarSelectedDate">
                <b>{selectedCloudCalendarLabel}</b>
                <span>{getKoreanWeekdayLabel(selectedCloudCalendarDate)}요일</span>
              </div>

              {selectedCloudCalendarRecord && (
                <div className="cloudCalendarDetailCard">
                  <div className="cloudCalendarDetailHeader">
                    <span className="cloudCalendarDetailIcon">☁️</span>
                    <div>
                      <b>구름 확인 기록</b>
                      <span>
                        매칭된 구름 {selectedCloudCalendarRecord.matched_cloud_count || 0}개
                      </span>
                    </div>
                  </div>

                  <div className="cloudCalendarOutfitGrid">
                    {getCloudCalendarOutfitRows(selectedCloudCalendarRecord).map(
                      ([label, value]) => (
                        <div key={label} className="cloudCalendarOutfitRow">
                          <span>{label}</span>
                          <b>{value || "-"}</b>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {selectedCloudCalendarRecord ? (
            <button onClick={loadCloudCalendarRecords} className="white">
              새로고침
            </button>
          ) : (
            <button onClick={openCloudCheckFromCalendar}>
              구름 확인하기
            </button>
          )}

          <button onClick={() => setPage("profile")} className="white">
            마이페이지로
          </button>
	        </div>
	      )}

	      {page === "send" && (
        <div className="card">
          {editingPost && (
            <div className="editingBanner">
              ✏️ 빠른 구름을 자세하게 수정하고 있어요. 완료하면 기존 구름이 업데이트돼요.
            </div>
          )}

          <p className="stepText">{crushStep} / 6</p>

          <StepProgress total={6} current={crushStep} />

          {crushStep === 1 && (
            <>
              <h3 className="questionTitle">누구를 찾고 있나요?</h3>
              <div className="optionGrid">
                {genderOptions.map((option) => (
                  <OptionButton
                    key={option}
                    value={option}
                    icon={option === "여자" ? <GenderFemaleIcon /> : <GenderMaleIcon />}
                    selected={crushPost.target_gender === option}
                    onClick={() => selectTargetGenderAndNext(option)}
                  />
                ))}
              </div>
            </>
          )}

          {crushStep === 2 && (
            <>
              <h3 className="questionTitle">언제, 어디에서 마주쳤나요?</h3>
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

              <div className="formGroup">
                <label className="formLabel">장소</label>
                <SearchableSelect
                  options={getPlaceOptions(profile.campus)}
                  value={crushPost.place}
                  placeholder="장소 검색 또는 선택 (예: 도서관)"
                  onChange={(option) =>
                    setCrushPost({
                      ...crushPost,
                      place: option,
                      custom_place: "",
                    })
                  }
                />
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

              <div className="stepActions">
                <button onClick={goBackStep} className="white">
                  이전
                </button>
                <button
                  onClick={async () => {
                    if (!crushPost.seen_date || !crushPost.time_period) {
                      toast.error("날짜와 시간을 선택해주세요.");
                      return;
                    }
                    if (!getFinalPlace()) {
                      toast.error("장소를 선택하거나 직접 입력해주세요.");
                      return;
                    }
                    await moveCloudSendStep(3, "next");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}

          {crushStep === 3 && (
            <>
              <h3 className="questionTitle">
                {crushPost.target_gender === "여자"
                  ? "그녀"
                  : crushPost.target_gender === "남자"
                  ? "그"
                  : "상대"}
                의 헤어가 기억나나요?
              </h3>
              {crushPost.target_gender === "여자" ? (
                <>
                  <details className="hairGuideBox">
                    <summary className="hairGuideSummary">
                      <span>헤어 길이 참고 사진 보기</span>
                      <span className="hairGuideArrow" aria-hidden="true">
                        ›
                      </span>
                    </summary>
                    <img
                      src={femaleHairGuideImage}
                      alt="여자 헤어스타일 예시"
                      className="hairGuideImage"
                    />
                  </details>

                  <div className="formGroup">
                    <label className="formLabel">헤어스타일</label>
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
                    <label className="formLabel">헤어 색깔</label>
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
                    <label className="formLabel">모자</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.female_hat === option}
                          onClick={() => updateCrushPost("female_hat", option)}
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리</label>
                    <div className="optionGrid">
                      {bangsOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.female_bangs === option}
                          onClick={() => updateCrushPost("female_bangs", option)}
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="formGroup">
                    <label className="formLabel">헤어 색깔</label>
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
                    <label className="formLabel">모자</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.male_hat === option}
                          onClick={() => updateCrushPost("male_hat", option)}
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리</label>
                    <div className="optionGrid">
                      {bangsOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={crushPost.male_bangs === option}
                          onClick={() => updateCrushPost("male_bangs", option)}
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="formGroup">
                <label className="formLabel">안경</label>
                <div className="optionGrid">
                  {glassesOptions.map((option) => (
                    <OptionButton
                      key={option}
                      value={option}
                      selected={crushPost.glasses_type === option}
                      onClick={() => updateCrushPost("glasses_type", option)}
                      label={getOxLabel(option)}
                      full={option === "잘 모르겠음"}
                    />
                  ))}
                </div>
              </div>

              <div className="stepActions">
                <button onClick={goBackStep} className="white">
                  이전
                </button>
                <button
                  onClick={async () => {
                    if (!getFinalHairFeature() || !crushPost.glasses_type) {
                      toast.error(
                        "헤어 색깔, 모자, 앞머리, 안경를 선택해주세요."
                      );
                      return;
                    }
                    await moveCloudSendStep(4, "next");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}

          {crushStep === 4 && (
            <>
              <h3 className="questionTitle">상의·아우터·하의가 기억나나요?</h3>
              <div className="formGroup">
                <label className="formLabel">상의 종류</label>
                <select
                  value={crushPost.top_type}
                  onChange={(e) => updateCrushPost("top_type", e.target.value)}
                >
                  <option value="">상의 종류 선택</option>
                  {(crushPost.target_gender === "여자"
                    ? femaleTopTypeOptions
                    : topTypeOptions
                  ).map((option) => (
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

              <div className="formGroup">
                <label className="formLabel">상의 추가 설명 선택사항</label>
                <input
                  placeholder="예: 흰 셔츠 안에 검정 반팔, 하늘색 스트라이프 셔츠, 로고 있는 후드티"
                  value={crushPost.top_detail}
                  onChange={(e) => updateCrushPost("top_detail", e.target.value)}
                />
                <p className="helperText">
                  필수는 아니지만, 정확히 기억나는 특징이 있으면 적어주세요.
                </p>
              </div>

              <div className="formGroup">
                <label className="formLabel">아우터 종류</label>
                <select
                  value={crushPost.outer_type}
                  onChange={(e) => updateCrushPost("outer_type", e.target.value)}
                >
                  <option value="">아우터 종류 선택</option>
                  {outerTypeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              {crushPost.outer_type && crushPost.outer_type !== "아우터 없음" && (
                <div className="formGroup">
                  <label className="formLabel">아우터 색상</label>
                  <select
                    value={crushPost.outer_color}
                    onChange={(e) => updateCrushPost("outer_color", e.target.value)}
                  >
                    <option value="">아우터 색상 선택</option>
                    {topColorOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="formGroup">
                <label className="formLabel">하의 종류</label>
                <select
                  value={crushPost.bottom_type}
                  onChange={(e) => updateCrushPost("bottom_type", e.target.value)}
                >
                  <option value="">하의 종류 선택</option>
                  {(crushPost.target_gender === "여자"
                    ? femaleBottomTypeOptions
                    : bottomTypeOptions
                  ).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              {crushPost.bottom_type === "기타 하의" && (
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

              <div className="formGroup">
                <label className="formLabel">하의 추가 설명 선택사항</label>
                <input
                  placeholder="예: 연청 와이드 청바지, 검정 카고바지, 무릎 위 반바지"
                  value={crushPost.bottom_detail}
                  onChange={(e) => updateCrushPost("bottom_detail", e.target.value)}
                />
                <p className="helperText">
                  바지 핏, 길이, 무늬처럼 기억나는 특징이 있으면 적어주세요.
                </p>
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
                <label className="formLabel">신발 추가 설명 선택사항</label>
                <input
                  placeholder="예: 흰색 나이키 운동화 느낌, 검정 컨버스, 크록스에 지비츠"
                  value={crushPost.shoe_detail}
                  onChange={(e) => updateCrushPost("shoe_detail", e.target.value)}
                />
                <p className="helperText">
                  브랜드를 몰라도 색, 모양, 느낌만 적어도 괜찮아요.
                </p>
              </div>

              <div className="stepActions">
                <button onClick={goBackStep} className="white">
                  이전
                </button>
                <button
                  onClick={async () => {
                    if (
                      !crushPost.top_type ||
                      !crushPost.top_color ||
                      !crushPost.outer_type ||
                      (crushPost.outer_type !== "아우터 없음" && !crushPost.outer_color) ||
                      !getFinalBottomType() ||
                      !crushPost.bottom_color ||
                      !crushPost.shoe_type
                    ) {
                      toast.error("상의, 아우터, 하의, 신발을 선택해주세요.");
                      return;
                    }
                    await moveCloudSendStep(5, "next");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}

          {crushStep === 5 && (
            <>
              <h3 className="questionTitle">소지품이 기억나나요?</h3>
              <div className="formGroup">
                <label className="formLabel">가방</label>
                <div className="optionGrid">
                  {bagOptions.map((option) => (
                    <OptionButton
                      key={option}
                      value={option}
                      selected={crushPost.bag_type === option}
                      onClick={() => updateCrushPost("bag_type", option)}
                      label={getOxLabel(option)}
                      full={option === "잘 모르겠음"}
                    />
                  ))}
                </div>
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

              <div className="formGroup">
                <label className="formLabel">소지품 추가 설명 선택사항</label>
                <input
                  placeholder="예: 검정 백팩에 키링, 노트북 파우치, 에어팟 맥스 느낌"
                  value={crushPost.item_detail}
                  onChange={(e) => updateCrushPost("item_detail", e.target.value)}
                />
                <p className="helperText">
                  가방 색, 키링, 들고 있던 물건처럼 기억나는 특징이 있으면 적어주세요.
                </p>
              </div>

              <div className="stepActions">
                <button onClick={goBackStep} className="white">
                  이전
                </button>
                <button
                  onClick={async () => {
                    if (!crushPost.bag_type || !crushPost.earphone_type) {
                      toast.error("가방과 이어폰 정보를 선택해주세요.");
                      return;
                    }
                    await moveCloudSendStep(6, "next");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}

          {crushStep === 6 && (
            <>
              <h3 className="questionTitle">마지막으로 확인해주세요</h3>
              <textarea
                placeholder="짧은 메시지 예: 분위기가 좋아 보여서 조심스럽게 구름 남겨요."
                value={crushPost.message}
                onChange={(e) => updateCrushPost("message", e.target.value)}
              />

              <div className="summaryBox">
                <p>
                  <strong>찾는 사람:</strong>{" "}
                  {crushPost.target_gender === "여자" ? (
                    <span className="inlineGenderIcon">
                      <GenderFemaleIcon />
                    </span>
                  ) : crushPost.target_gender === "남자" ? (
                    <span className="inlineGenderIcon">
                      <GenderMaleIcon />
                    </span>
                  ) : (
                    "-"
                  )}
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
                  <strong>헤어:</strong> {getFinalHairFeature() || "-"}
                </p>
                <p>
                  <strong>상의:</strong> {crushPost.top_color || "-"}{" "}
                  {crushPost.top_type || "-"}
                </p>
                {crushPost.top_detail.trim() && (
                  <p>
                    <strong>상의 추가 설명:</strong> {crushPost.top_detail.trim()}
                  </p>
                )}
                <p>
                  <strong>아우터:</strong> {getFinalOuter() || "-"}
                </p>
                <p>
                  <strong>하의:</strong> {crushPost.bottom_color || "-"}{" "}
                  {getFinalBottomType() || "-"}
                </p>
                {crushPost.bottom_detail.trim() && (
                  <p>
                    <strong>하의 추가 설명:</strong> {crushPost.bottom_detail.trim()}
                  </p>
                )}
                <p>
                  <strong>신발:</strong> {crushPost.shoe_type || "-"}
                </p>
                {crushPost.shoe_detail.trim() && (
                  <p>
                    <strong>신발 추가 설명:</strong> {crushPost.shoe_detail.trim()}
                  </p>
                )}
                <p>
                  <strong>소지품:</strong> {crushPost.bag_type || "-"},{" "}
                  {crushPost.earphone_type || "-"}
                </p>
                {crushPost.item_detail.trim() && (
                  <p>
                    <strong>소지품 추가 설명:</strong> {crushPost.item_detail.trim()}
                  </p>
                )}
              </div>

              <div className="stepActions">
                <button onClick={goBackStep} className="white">
                  이전
                </button>
                <button onClick={saveCrushPost} disabled={postSubmitting}>
                  {postSubmitting ? "구름 보내는 중..." : "구름 보내기"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {page === "sent" && (
        <div className="card">
          <h2>구름을 남겼어요 ☁️</h2>
          <p className="subtitle">
            상대가 자신의 날짜와 착장을 올리면, 당신의 구름을 발견할 수 있어요.
          </p>

          <div className="shareBox">
            <p className="shareTitle">친구에게 단꿈 알리기</p>
            <p className="shareDesc">
              "나 단꿈에 구름 남겼어, 혹시 너야?" 한 마디로 퍼뜨려요.
            </p>
            <button
              className="shareButton"
              onClick={async () => {
                const shareData = {
                  title: "단꿈 ☁️",
                  text: "단꿈에 너한테 보내는 구름 남겼어 ☁️ 확인해봐",
                  url: PUBLIC_APP_URL,
                };
                if (navigator.share) {
                  try {
                    await navigator.share(shareData);
                  } catch (e) {
                    if (e.name !== "AbortError") {
                      toast.error("공유에 실패했어요.");
                    }
                  }
                } else {
                  try {
                    await navigator.clipboard.writeText(PUBLIC_APP_URL);
                    toast.success("링크가 복사됐어요! 친구에게 보내보세요.");
                  } catch (e) {
                    toast.error("복사에 실패했어요.");
                  }
                }
              }}
            >
              ☁️ 친구에게 알리기
            </button>
          </div>

          <button onClick={openMatchingPage}>내 구름 관리로 가기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "search" && (
        <div className="card">
          <h2 className="sendStepTitle">구름 확인하기</h2>

          <p className="stepText">{searchStep} / 5</p>

          <StepProgress total={5} current={searchStep} />

          <div className="summaryBox">
            <p>
              <strong>내 성별:</strong> {profile.gender || "-"}
              {profile.gender === "여자" && (
                <span className="inlineGenderIcon">
                  <GenderFemaleIcon />
                </span>
              )}
              {profile.gender === "남자" && (
                <span className="inlineGenderIcon">
                  <GenderMaleIcon />
                </span>
              )}
            </p>
            <p>프로필 성별 기준으로 나를 찾는 구름만 자동으로 확인해요.</p>
          </div>

          {searchStep === 1 && (
            <>
              <h3 className="questionTitle">
                구름을 확인하고 싶은 날짜는 언제인가요?
              </h3>
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

              <div className="stepActions">
                <button
                  onClick={() => leaveCloudCheckFlow("home_exit", "home")}
                  className="white"
                >
                  홈으로
                </button>
                <button
                  onClick={async () => {
                    if (!searchForm.seen_date) {
                      toast.error("날짜를 선택해주세요.");
                      return;
                    }
                    await moveCloudCheckStep(2, "next");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}

          {searchStep === 2 && (
            <>
              <h3 className="questionTitle">내 헤어 정보가 기억나나요?</h3>
              {profile.gender === "여자" ? (
                <>
                  <details className="hairGuideBox">
                    <summary className="hairGuideSummary">
                      <span>헤어 길이 참고 사진 보기</span>
                      <span className="hairGuideArrow" aria-hidden="true">
                        ›
                      </span>
                    </summary>
                    <img
                      src={femaleHairGuideImage}
                      alt="여자 헤어스타일 예시"
                      className="hairGuideImage"
                    />
                  </details>

                  <div className="formGroup">
                    <label className="formLabel">내 헤어스타일</label>
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
                    <label className="formLabel">헤어 색깔</label>
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
                    <label className="formLabel">모자</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.female_hat === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, female_hat: option })
                          }
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리</label>
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
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="formGroup">
                    <label className="formLabel">헤어 색깔</label>
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
                    <label className="formLabel">모자</label>
                    <div className="optionGrid">
                      {hatOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.male_hat === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, male_hat: option })
                          }
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label className="formLabel">앞머리</label>
                    <div className="optionGrid">
                      {bangsOptions.map((option) => (
                        <OptionButton
                          key={option}
                          value={option}
                          selected={searchForm.male_bangs === option}
                          onClick={() =>
                            setSearchForm({ ...searchForm, male_bangs: option })
                          }
                          label={getOxLabel(option)}
                          full={option === "잘 모르겠음"}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="formGroup">
                <label className="formLabel">안경</label>
                <div className="optionGrid">
                  {glassesOptions.map((option) => (
                    <OptionButton
                      key={option}
                      value={option}
                      selected={searchForm.glasses_type === option}
                      onClick={() => setSearchForm({ ...searchForm, glasses_type: option })}
                      label={getOxLabel(option)}
                      full={option === "잘 모르겠음"}
                    />
                  ))}
                </div>
              </div>

              <div className="stepActions">
                <button
                  onClick={goBackSearchStep}
                  className="white"
                >
                  이전
                </button>
                <button
                  onClick={async () => {
                    if (!getFinalSearchHairFeature()) {
                      toast.error("헤어 정보를 선택해주세요.");
                      return;
                    }
                    await moveCloudCheckStep(3, "next");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}

          {searchStep === 3 && (
            <>
              <h3 className="questionTitle">상의·아우터·하의가 기억나나요?</h3>
              <div className="formGroup">
                <label className="formLabel">상의 종류</label>
                <select
                  value={searchForm.top_type}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, top_type: e.target.value })
                  }
                >
                  <option value="">상의 종류 선택</option>
                  {(profile.gender === "여자"
                    ? femaleTopTypeOptions
                    : topTypeOptions
                  ).map((option) => (
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

              <div className="formGroup">
                <label className="formLabel">아우터 종류</label>
                <select
                  value={searchForm.outer_type}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, outer_type: e.target.value })
                  }
                >
                  <option value="">아우터 종류 선택</option>
                  {outerTypeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              {searchForm.outer_type && searchForm.outer_type !== "아우터 없음" && (
                <div className="formGroup">
                  <label className="formLabel">아우터 색상</label>
                  <select
                    value={searchForm.outer_color}
                    onChange={(e) =>
                      setSearchForm({ ...searchForm, outer_color: e.target.value })
                    }
                  >
                    <option value="">아우터 색상 선택</option>
                    {topColorOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="formGroup">
                <label className="formLabel">하의 종류</label>
                <select
                  value={searchForm.bottom_type}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, bottom_type: e.target.value })
                  }
                >
                  <option value="">하의 종류 선택</option>
                  {(profile.gender === "여자"
                    ? femaleBottomTypeOptions
                    : bottomTypeOptions
                  ).map((option) => (
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

              <div className="formGroup">
                <label className="formLabel">신발</label>
                <select
                  value={searchForm.shoe_type}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, shoe_type: e.target.value })
                  }
                >
                  <option value="">신발 선택</option>
                  {shoeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="stepActions">
                <button
                  onClick={goBackSearchStep}
                  className="white"
                >
                  이전
                </button>
                <button onClick={() => moveCloudCheckStep(4, "next")}>다음</button>
              </div>
            </>
          )}

          {searchStep === 4 && (
            <>
              <h3 className="questionTitle">소지품이 기억나나요?</h3>
              <div className="formGroup">
                <label className="formLabel">가방</label>
                <div className="optionGrid">
                  {bagOptions.map((option) => (
                    <OptionButton
                      key={option}
                      value={option}
                      selected={searchForm.bag_type === option}
                      onClick={() => setSearchForm({ ...searchForm, bag_type: option })}
                      label={getOxLabel(option)}
                      full={option === "잘 모르겠음"}
                    />
                  ))}
                </div>
              </div>

              <div className="formGroup">
                <label className="formLabel">이어폰/헤드셋</label>
                <select
                  value={searchForm.earphone_type}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, earphone_type: e.target.value })
                  }
                >
                  <option value="">이어폰 선택</option>
                  {earphoneOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="stepActions">
                <button
                  onClick={goBackSearchStep}
                  className="white"
                >
                  이전
                </button>
                <button onClick={() => moveCloudCheckStep(5, "next")}>다음</button>
              </div>
            </>
          )}

          {searchStep === 5 && (
            <>
              <h3 className="questionTitle">마지막으로 확인해주세요</h3>
              <div className="summaryBox">
                <p>
                  <strong>날짜:</strong> {searchForm.seen_date || "-"}
                </p>
                <p>
                  <strong>내 성별:</strong> {profile.gender || "-"}
                </p>
                <p>
                  <strong>헤어:</strong> {getFinalSearchHairFeature() || "-"}
                </p>
                <p>
                  <strong>안경:</strong> {searchForm.glasses_type || "-"}
                </p>
                <p>
                  <strong>상의:</strong> {searchForm.top_color || "-"}{" "}
                  {searchForm.top_type || "-"}
                </p>
                <p>
                  <strong>아우터:</strong> {searchForm.outer_type || "-"}{" "}
                  {searchForm.outer_type && searchForm.outer_type !== "아우터 없음"
                    ? searchForm.outer_color || ""
                    : ""}
                </p>
                <p>
                  <strong>하의:</strong> {searchForm.bottom_color || "-"}{" "}
                  {searchForm.bottom_type || "-"}
                </p>
                <p>
                  <strong>신발:</strong> {searchForm.shoe_type || "-"}
                </p>
                <p>
                  <strong>가방:</strong> {searchForm.bag_type || "-"}
                </p>
                <p>
                  <strong>이어폰:</strong> {searchForm.earphone_type || "-"}
                </p>
              </div>

              <div className="stepActions">
                <button
                  onClick={goBackSearchStep}
                  className="white"
                >
                  이전
                </button>
                <button onClick={searchCrushPosts} disabled={searchSubmitting}>
                  {searchSubmitting ? "확인 중..." : "구름 확인하기"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {page === "result" && (
  <div className="card">
    <h2>나를 찾는 구름 {visibleSearchResults.length}개</h2>

    {searchResults.length > 0 && hiddenResultIds.length > 0 && (
      <p className="notice">
        아닌 것 같은 구름 {hiddenResultIds.length}개를 숨겼어요.
      </p>
    )}

    {visibleSearchResults.length === 0 && (
      <p className="notice">
        지금 화면에 보이는 구름이 없어요. 날짜를 다시 확인하거나 다시 찾아보기를
        눌러주세요.
      </p>
    )}

	    {visibleSearchResults.map((post) => {
	      const tags = makeCloudTags(post);
	      const maybeReacted = maybeReactionIds.includes(post.id);
	
	      return (
	        <div className="post resultPost" key={post.id}>
	          <div className="postTopLine">
	            <span className="statusPill active">
	              ☁ 일치도 {post.match_score || 0}%
	            </span>
	          </div>

	          {post.match_reasons?.length > 0 && (
	            <div className="matchScoreBox">
	              <b>나일 가능성이 높은 이유</b>
	              <span>{post.match_reasons.join(" · ")}</span>
	            </div>
	          )}

          {tags.length > 0 && (
            <div className="cloudTagBox">
              {tags.map((tag) => (
                <span className="cloudTag" key={`${post.id}-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p>
            <b>
              {post.seen_date}, {post.time_period}, {post.place}
            </b>
          </p>

          {renderPostQuestionAnswer(post)}

          <p className="message">
            “{cleanMessage(post.message) || "남긴 메시지가 없어요."}”
          </p>

          {renderCloudActionButtons(post)}

          <button
            type="button"
            className="dismissTextButton"
            onClick={() => hideSearchResult(post.id)}
          >
            이건 아닌 것 같아요
          </button>

          <div className="safetyActionRow">
            <button
              type="button"
              className="dismissTextButton"
              onClick={() => reportContent("post", post.id, post.sender_user_id)}
            >
              신고하기
            </button>
            <button
              type="button"
              className="dismissTextButton"
              onClick={() => blockUser(post.sender_user_id, post.sender_nickname)}
            >
              차단하기
            </button>
          </div>
        </div>
      );
    })}

    <button
      onClick={async () => {
        setSearchStep(1);
        await startCloudCheckFlowLog();
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

      {page === "sentResult" && (
        <div className="card">
          <h2>구름 확인 내역 {sentCheckResults.length}개</h2>

          <p className="subtitle">
            내가 띄운 구름과 비슷하게 입력된 구름 확인 내역을 살펴봐요.
          </p>

          {sentResultPost && (
            <div className="noticeBox">
              <p>
                <b>
                  {sentResultPost.seen_date}, {sentResultPost.time_period},{" "}
                  {sentResultPost.place}
                </b>
              </p>
              <p>찾는 사람: {sentResultPost.target_gender || "-"}</p>
            </div>
          )}

          {sentCheckResults.length === 0 && (
            <div className="noticeBox">
              {sentCheckResultMeta.rawCount === 0 ? (
                <>
                  <p>같은 날짜와 성별로 조회 가능한 구름 확인 내역이 아직 없어요.</p>
                  <p className="helperText">
                    test1이 이미 구름 확인하기를 했다면 Supabase SQL/RLS 적용 여부를 확인해야 해요.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    확인 내역 {sentCheckResultMeta.rawCount}개를 찾았지만, 단서 일치 기준을
                    넘은 내역이 없어요.
                  </p>
                  <p className="helperText">
                    차단/본인 제외 {sentCheckResultMeta.blockedCount}개 · 점수 계산 대상{" "}
                    {sentCheckResultMeta.scoredCount}개
                  </p>
                </>
              )}
            </div>
          )}

          {sentResultPost &&
            sentCheckResults.map((check) =>
              renderSenderCheckCandidateCard(sentResultPost, check)
            )}

          <button
            onClick={async () => {
              if (sentResultPost) {
                await loadSentCheckResultsForPost(sentResultPost);
              }
            }}
            className="white"
          >
            다시 확인하기
          </button>

          <button onClick={openMatchingPage} className="white">
            내 구름 관리로 가기
          </button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "claimForm" && (
        <div className="card">
          <h2>구름 채팅방 요청하기</h2>

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

	          <button onClick={saveClaim} disabled={claimSubmitting}>
	            {claimSubmitting ? "요청 보내는 중..." : "구름 채팅방 요청하기"}
	          </button>

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
          <h2>채팅방 요청을 보냈어요</h2>
          <p className="subtitle">
            구름을 남긴 사람이 수락하면 채팅방이 열려요.
          </p>

          <button onClick={openMatchingPage}>내 구름 관리로 가기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}
      {page === "chatPreview" && (
        <div className="card">
          <h2>구름 채팅방 요청이 왔어요</h2>

          {!chatPreviewProfile ? (
            <p className="notice">불러오는 중이에요...</p>
          ) : (
            <div className="noticeBox">
              <p>
                <b>{chatPreviewProfile.nickname}</b>
              </p>
              <p>
                {chatPreviewProfile.department} {chatPreviewProfile.student_year}학번
              </p>
              <p className="message">
                “{chatPreviewProfile.bio || "한줄소개가 없어요."}”
              </p>
            </div>
          )}

          {renderChatRequestPostDetail(chatPreviewClaim?.post)}

          <p className="helperText">
            수락하면 구름 채팅방이 바로 열리고, 거절하면 상대에게 거절 의사가 표시돼요.
          </p>

          <button
            onClick={() => acceptChatRequest(chatPreviewClaim)}
            disabled={chatActionSubmitting || !chatPreviewProfile}
          >
            {chatActionSubmitting ? "수락 중..." : "채팅방 수락하기"}
          </button>

          <button
            type="button"
            className="white"
            onClick={() => rejectClaim(chatPreviewClaim?.id, "claimer")}
            disabled={chatActionSubmitting || !chatPreviewClaim?.id}
          >
            거절 의사 보내기
          </button>

          <button onClick={() => setPage("matching")} className="white">
            내 구름 관리로 가기
          </button>
        </div>
      )}
      {page === "chatRoom" && activeChatRoomId && (
        <ChatRoom
          roomId={activeChatRoomId}
          currentUserId={currentUser.id}
          otherNickname={activeChatRoomNickname}
          onClose={() => setPage("chats")}
          onLeave={() => loadMyActivityData()}
          onDeleted={() => {
            setActiveChatRoomId(null);
            setActiveChatRoomNickname("");
            setPage("chats");
            loadMyActivityData();
          }}
        />
      )}
      {page === "chats" && (
        <div className="card manageCard">
          <div className="manageHeaderRow">
            <div>
              <h2>채팅</h2>
              <p className="subtitle">
                대화가 수락된 상대와 여기서 이어갈 수 있어요.
              </p>
            </div>
          </div>

          {matchingLoading && <p className="notice">불러오는 중이에요...</p>}

          {!matchingLoading && (
            <div className="manageSection">
              {myChatRooms.length === 0 && (
                <p className="noticeBox">
                  아직 대화 중인 채팅방이 없어요. 대화 요청이 수락되면 여기에
                  표시돼요.
                </p>
              )}

              {myChatRooms.map((room) => {
                const preview = chatLastMessages[room.chatRoomId];
                const previewTime = preview?.created_at || room.updatedAt;
                const initial = (room.otherNickname || "구").trim().charAt(0) || "구";
                const roomStatus = chatRoomStatusMap[room.chatRoomId];
                const expired = roomStatus
                  ? isChatRoomExpired(roomStatus.created_at, roomStatus.closed_at, chatListNowTick)
                  : false;

                return (
                  <button
                    type="button"
                    key={room.chatRoomId}
                    className="chatRoomListItem"
                    onClick={() => openChatRoom(room.chatRoomId, room.otherNickname)}
                  >
                    <span className="chatRoomListAvatar">{initial}</span>
                    <span className="chatRoomListInfo">
                      <span className="chatRoomListTopRow">
                        <b>{room.otherNickname}</b>
                        <span className="chatRoomListTime">
                          {formatChatListTime(previewTime)}
                        </span>
                      </span>
                      <span className="chatRoomListPreview">
                        {preview?.body || "대화를 시작해보세요."}
                      </span>
                      <span className={expired ? "chatRoomListStatus expired" : "chatRoomListStatus"}>
                        {roomStatus
                          ? formatChatRoomRemaining(roomStatus.created_at, roomStatus.closed_at, chatListNowTick)
                          : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {page === "sharedPost" && (
        <div className="card">
          <h2>☁️ 공유된 구름</h2>

          {sharedPost ? (
            <div className="post resultPost">
              <p>
                <b>
                  {sharedPost.seen_date}, {sharedPost.time_period}, {sharedPost.place}
                </b>
              </p>

              {renderPostQuestionAnswer(sharedPost)}

              <p className="message">
                “{cleanMessage(sharedPost.message) || "남긴 메시지가 없어요."}”
              </p>

              {renderCloudActionButtons(sharedPost)}
            </div>
          ) : (
            <p className="notice">이 구름을 찾지 못했어요.</p>
          )}

          <button
            onClick={() => {
              setPage("home");
              setSharedPostId(null);
              setSharedPost(null);
              setGuestSharedPreview(false);
            }}
            className="white"
          >
            홈으로
          </button>
        </div>
      )}
      {page === "weather" && (
  <div className="card weatherCard">
    <h2>단국대학교 날씨 확인하기</h2>

    <p className="subtitle">
      날짜를 선택하면 단국대 건물 또는 특정 장소에 구름이 몇 개 떴는지
      확인할 수 있어요.
    </p>

    <div className="weatherHeroBox">
      <div className="weatherIcon">☁️</div>
      <div>
        <p className="weatherHeroTitle">오늘의 단국대 구름</p>
        <p className="weatherHeroDesc">
          많이 언급된 장소일수록 구름이 많이 뜬 곳이에요.
        </p>
      </div>
    </div>

    <div className="formGroup">
      <label className="formLabel">확인할 날짜</label>
      <input
        type="date"
        value={weatherDate}
        onChange={(e) => setWeatherDate(e.target.value)}
      />
    </div>

	    <button
	      onClick={() => loadCloudWeather(weatherDate)}
	      disabled={weatherLoading}
	    >
	      {weatherLoading ? "날씨 확인 중..." : "이 날짜 날씨 확인하기"}
	    </button>

    {weatherLoading && (
      <p className="notice">단국대 하늘을 확인하는 중이에요...</p>
    )}

    {!weatherLoading && weatherClouds.length === 0 && (
      <div className="noticeBox">
        <p>이 날짜에는 아직 뜬 구름이 없어요.</p>
        <p>첫 번째 구름을 띄워보면 이곳에 표시돼요.</p>
      </div>
    )}

    {!weatherLoading && weatherClouds.length > 0 && (
      <>
        <div className="weatherSummaryGrid">
          <div className="weatherSummaryItem">
            <span>전체 구름</span>
            <b>{weatherClouds.length}</b>
          </div>

          <div className="weatherSummaryItem">
            <span>구름 뜬 장소</span>
            <b>{getWeatherPlaceCounts().length}</b>
          </div>
        </div>

        <div className="weatherPlaceList">
          {getWeatherPlaceCounts().map((item, index) => (
            <button
              type="button"
              key={item.place}
              className={
                selectedWeatherPlace === item.place
                  ? "weatherPlaceCard active"
                  : "weatherPlaceCard"
              }
              onClick={() =>
                setSelectedWeatherPlace(
                  selectedWeatherPlace === item.place ? "" : item.place
                )
              }
            >
              <div className="weatherRank">#{index + 1}</div>

              <div className="weatherPlaceInfo">
                <b>{item.place}</b>
                <span>{getWeatherComment(item.count)}</span>
              </div>

              <div className="weatherCount">
                <b>{item.count}</b>
                <span>개</span>
              </div>
            </button>
          ))}
        </div>

        {selectedWeatherPlace && (
          <div className="weatherDetailBox">
            <h3 className="manageSectionTitle">
              {selectedWeatherPlace}에 뜬 구름
            </h3>

            {weatherClouds
              .filter(
                (post) => getMainPlaceFromPost(post) === selectedWeatherPlace
              )
              .map((post) => (
                <div className="post resultPost" key={post.id}>
                  <div className="postTopLine">
                    <span className="statusPill active">
                      ☁ {selectedWeatherPlace} 구름
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

                  {renderCloudActionButtons(post)}
                </div>
              ))}
          </div>
        )}
      </>
    )}

    <button onClick={() => setPage("home")} className="white">
      홈으로
    </button>
  </div>
)}
      {page === "matching" && (
        <div className="card manageCard">
          <div className="manageHeaderRow">
            <div>
              <button
                type="button"
                className="manageTitleButton"
                onClick={loadMyActivityData}
                disabled={matchingLoading}
              >
                내 구름
              </button>
            </div>
            <div className="manageHeaderIcons">
              <button
                type="button"
                className={
                  matchingMode === "notifications"
                    ? "manageHeaderIconBtn active"
                    : "manageHeaderIconBtn"
                }
                aria-label="알림"
                onClick={openNotificationsPage}
              >
                {renderBellWithBadge(21)}
              </button>
              <button
                type="button"
                className={
                  matchingMode === "calendar"
                    ? "manageHeaderIconBtn active"
                    : "manageHeaderIconBtn"
                }
                aria-label="날짜별 기록"
                onClick={() => setMatchingMode("calendar")}
              >
                <CalendarIcon size={21} />
              </button>
            </div>
          </div>

          <div className="manageTabs fourTabs">
            <button
              className={
                matchingMode === "notifications"
                  ? notificationFilter === "sent"
                    ? "manageTab active"
                    : "manageTab"
                  : matchingMode.startsWith("sent")
                    ? "manageTab active"
                    : "manageTab"
              }
              onClick={() => {
                if (matchingMode === "notifications") {
                  markNotificationGroupSeen("sent");
                  setNotificationFilter("sent");
                } else {
                  setMatchingMode("sent");
                }
              }}
            >
              띄운 구름
            </button>

            <button
              className={
                matchingMode === "notifications"
                  ? notificationFilter === "received"
                    ? "manageTab active"
                    : "manageTab"
                  : matchingMode.startsWith("received")
                    ? "manageTab active"
                    : "manageTab"
              }
              onClick={() => {
                if (matchingMode === "notifications") {
                  markNotificationGroupSeen("received");
                  setNotificationFilter("received");
                } else {
                  setMatchingMode("received");
                }
              }}
            >
              받은 구름
            </button>
          </div>

          {matchingLoading && <p className="notice">불러오는 중이에요...</p>}

          {!matchingLoading && matchingMode === "sent" && (
            <div className="cloudFolderList">
              {renderCloudFolderButton({
                title: "☁ 응답 도착",
                count: mySentPostsWithResponses.length,
                newCount: sentNotificationUnreadCount,
                onClick: () => {
                  markNotificationGroupSeen("sent");
                  setMatchingMode("sentResponsesAll");
                },
              })}
              {renderCloudFolderButton({
                title: "☁ 요청 대기 중",
                count: mySentPostsWithoutResponses.length,
                onClick: () => setMatchingMode("sentWaitingAll"),
              })}
              {renderCloudFolderButton({
                title: "☁ 응답 완료 구름",
                count: mySentPostsWithCompletedResponses.length,
                onClick: () => setMatchingMode("sentCompletedAll"),
              })}
            </div>
          )}

          {!matchingLoading && matchingMode === "sentResponsesAll" && (
            <div className="manageSection">
              <button
                type="button"
                className="white backListButton"
                onClick={() => setMatchingMode("sent")}
              >
                띄운 구름으로 돌아가기
              </button>
              <h3 className="manageSectionTitle">
                ☁ 응답 도착 전체 {mySentPostsWithResponses.length}개
              </h3>
              {mySentPostsWithResponses.length === 0 && (
                <p className="noticeBox">아직 응답이 도착한 구름이 없어요.</p>
              )}
              {mySentPostsWithResponses.map((post) =>
                renderSentPostCard(post, "answered", String(post.id) === String(expandedSentPostId))
              )}
            </div>
          )}

          {!matchingLoading && matchingMode === "sentWaitingAll" && (
            <div className="manageSection">
              <button
                type="button"
                className="white backListButton"
                onClick={() => setMatchingMode("sent")}
              >
                띄운 구름으로 돌아가기
              </button>
              <h3 className="manageSectionTitle">
                ☁ 요청 대기 중 전체 {mySentPostsWithoutResponses.length}개
              </h3>
              {mySentPostsWithoutResponses.length === 0 && (
                <p className="noticeBox">요청을 기다리는 구름이 없어요.</p>
              )}
              {mySentPostsWithoutResponses.map((post) =>
                renderSentPostCard(post, "empty")
              )}
            </div>
          )}

          {!matchingLoading && matchingMode === "sentCompletedAll" && (
            <div className="manageSection">
              <button
                type="button"
                className="white backListButton"
                onClick={() => setMatchingMode("sent")}
              >
                띄운 구름으로 돌아가기
              </button>
              <h3 className="manageSectionTitle">
                ☁ 응답 완료 구름 전체 {mySentPostsWithCompletedResponses.length}개
              </h3>
              {mySentPostsWithCompletedResponses.length === 0 && (
                <p className="noticeBox">아직 응답이 완료된 구름이 없어요.</p>
              )}
              {mySentPostsWithCompletedResponses.map((post) =>
                renderSentPostCard(post, "answered")
              )}
            </div>
          )}

          {!matchingLoading && matchingMode === "received" && (
            <div className="cloudFolderList">
              {renderCloudFolderButton({
                title: "☁ 응답 대기 구름",
                count: receivedPendingCloudItems.length,
                newCount: receivedNotificationUnreadCount,
                onClick: () => {
                  markNotificationGroupSeen("received");
                  setMatchingMode("receivedPendingAll");
                },
              })}
              {renderCloudFolderButton({
                title: "☁ 응답 완료 구름",
                count: receivedCompletedCloudItems.length,
                onClick: () => setMatchingMode("receivedCompletedAll"),
              })}
            </div>
          )}

          {!matchingLoading && matchingMode === "receivedPendingAll" && (
            <div className="manageSection">
              <button
                type="button"
                className="white backListButton"
                onClick={() => setMatchingMode("received")}
              >
                받은 구름으로 돌아가기
              </button>
              <h3 className="manageSectionTitle">
                ☁ 응답 대기 구름 전체 {receivedPendingCloudItems.length}개
              </h3>
              {receivedPendingCloudItems.length === 0 && (
                <p className="noticeBox">응답을 기다리는 받은 구름이 없어요.</p>
              )}
              {receivedPendingCloudItems.map((item) => renderReceivedCloudListItem(item))}
            </div>
          )}

          {!matchingLoading && matchingMode === "receivedCompletedAll" && (
            <div className="manageSection">
              <button
                type="button"
                className="white backListButton"
                onClick={() => setMatchingMode("received")}
              >
                받은 구름으로 돌아가기
              </button>
              <h3 className="manageSectionTitle">
                ☁ 응답 완료 구름 전체 {receivedCompletedCloudItems.length}개
              </h3>
              {receivedCompletedCloudItems.length === 0 && (
                <p className="noticeBox">응답이 완료된 받은 구름이 없어요.</p>
              )}
              {receivedCompletedCloudItems.map((item) => renderReceivedCloudListItem(item))}
            </div>
          )}

          {!matchingLoading && matchingMode === "notifications" && (
            <div className="manageSection">
              <h3 className="manageSectionTitle">
                알림 {visibleNotificationItems.length}개
              </h3>

              {visibleNotificationItems.length === 0 && (
                <p className="noticeBox">
                  {notificationFilter === "sent"
                    ? "띄운 구름에 온 새 알림이 없어요."
                    : "받은 구름에 온 새 알림이 없어요."}
                </p>
              )}

              {visibleNotificationItems.map((item) => (
                <div className="notificationCard" key={item.id}>
                  {item.onClick && (
                    <button
                      type="button"
                      className="notificationArrowButton"
                      aria-label="알림 상세로 이동"
                      onClick={item.onClick}
                      disabled={claimActionSubmittingId === item.id}
                    >
                      <ChevronRightIcon size={18} />
                    </button>
                  )}
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

                  <div className="activitySummaryBox threeBox">
                   <div>
                     <span>띄운 구름</span>
                      <b>{selectedDateSentPosts.length}</b>
                   </div>
                   <div>
                     <span>나에게 온 구름</span>
                     <b>{selectedDateReceivedCloudCount}</b>
                   </div>
                   <div>
                     <span>확인 결과</span>
                      <b>{selectedDateTotalCheckResultCount}</b>
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
    {formatDateLabel(selectedActivityDate)} 구름 확인 기록
  </h3>

  {selectedDateCloudChecks.length === 0 && (
    <p className="noticeBox">
      이 날짜에 구름 확인하기를 한 기록이 없어요.
    </p>
  )}

  {selectedDateCloudChecks.map((check) => (
    <div className="cloudCheckCard" key={check.id}>
      <div className="postTopLine">
        <span className="statusPill active">
          ☁ 확인 결과 {check.result_count || 0}개
        </span>
      </div>

      <p>
        <b>{formatShortDateTime(check.checked_at)}</b>
      </p>

      <div className="qaBox">
        <p className="qaTitle">그날 내가 입력한 모습</p>

        <p>
          <strong>헤어:</strong> {check.hair_feature || "-"}
        </p>

        <p>
          <strong>상의:</strong>{" "}
          {check.top_color || "-"} {check.top_type || "-"}
        </p>

        <p>
          <strong>하의:</strong>{" "}
          {check.bottom_color || "-"} {check.bottom_type || "-"}
        </p>
      </div>

      <p className="helperText">
        이 기록이 쌓이면 어떤 옷이나 헤어일 때 구름을 많이 받았는지 분석할 수 있어요.
      </p>
    </div>
  ))}
</div>
            
                  <div className="manageSection">
                    <h3 className="manageSectionTitle">
                      {formatDateLabel(selectedActivityDate)}에 내가 받은 구름
                    </h3>
                    {selectedDateReceivedCloudCount === 0 && (
                      <p className="noticeBox">이 날짜에 내가 받은 구름은 없어요.</p>
                    )}
                    {selectedDateReceivedCloudItems.map((claim) =>
                      renderReceivedClaimCard(claim)
                    )}
                    {selectedDateReceivedSenderPickItems.map((pick) =>
                      renderReceivedSenderPickCard(pick)
                    )}
                    {selectedDateReceivedViewItems.map((view) =>
                      renderReceivedCloudViewCard(view)
                    )}
                  </div>
                </>
              )}
            </div>
          )}

	        </div>
	      )}
	      {page !== "chatRoom" && renderBottomNav()}
	    </div>
	  );
	}

export default App;
