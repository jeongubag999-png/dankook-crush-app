import { useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

function App() {
  const [page, setPage] = useState("home");

  const placeOptions = [
    "혜당관 앞",
    "퇴계기념중앙도서관",
    "학생회관",
    "상경관",
    "곰상 근처",
    "버스정류장",
    "기타",
  ];

  const timeOptions = ["아침", "점심", "오후", "저녁", "밤"];

  const hairOptions = [
    "짧은 머리",
    "중간 길이",
    "긴 머리",
    "묶은 머리",
    "모자 착용",
    "잘 모르겠음",
  ];

  const colorOptions = [
    "검정",
    "흰색",
    "회색",
    "파랑",
    "빨강",
    "초록",
    "베이지",
    "분홍",
    "기타",
    "잘 모르겠음",
  ];

  const styleOptions = [
    "후드티",
    "맨투맨",
    "셔츠",
    "니트",
    "자켓",
    "원피스",
    "운동복",
    "교복 느낌",
    "잘 모르겠음",
  ];

  const accessoryOptions = [
    "없음",
    "안경",
    "모자",
    "가방",
    "이어폰",
    "노트북",
    "책",
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
  });

  const [crushPost, setCrushPost] = useState({
    seen_date: "",
    place: "혜당관 앞",
    time_period: "아침",
    hair_feature: "",
    clothes_color: "",
    clothes_style: "",
    accessory: "",
    message: "",
  });

  const [searchForm, setSearchForm] = useState({
    seen_date: "",
    place: "혜당관 앞",
    hair_feature: "",
    clothes_color: "",
    clothes_style: "",
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

  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").insert([
      {
        nickname: profile.nickname,
        department: profile.department,
        student_year: profile.student_year,
        instagram_id: profile.instagram_id,
        bio: profile.bio,
      },
    ]);

    if (error) {
      alert("프로필 저장에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("프로필이 저장됐어요!");
    setPage("home");
  };

  const saveCrushPost = async () => {
    if (!crushPost.seen_date) {
      alert("날짜를 선택해주세요.");
      return;
    }

    if (!crushPost.hair_feature || !crushPost.clothes_color || !crushPost.clothes_style) {
      alert("기억나는 단서를 선택해주세요.");
      return;
    }

    const { error } = await supabase.from("crush_posts").insert([
      {
        seen_date: crushPost.seen_date,
        place: crushPost.place,
        time_period: crushPost.time_period,
        hair_feature: crushPost.hair_feature,
        clothes_color: crushPost.clothes_color,
        clothes_style: crushPost.clothes_style,
        accessory: crushPost.accessory,
        message: crushPost.message,
      },
    ]);

    if (error) {
      alert("마음 남기기에 실패했어요: " + error.message);
      console.log(error);
      return;
    }

    alert("마음을 남겼어요!");

    setCrushPost({
      seen_date: "",
      place: "혜당관 앞",
      time_period: "아침",
      hair_feature: "",
      clothes_color: "",
      clothes_style: "",
      accessory: "",
      message: "",
    });

    setPage("sent");
  };

  const searchCrushPosts = async () => {
    if (!searchForm.seen_date) {
      alert("날짜를 선택해주세요.");
      return;
    }

    const { data, error } = await supabase
      .from("crush_posts")
      .select("*")
      .eq("seen_date", searchForm.seen_date)
      .eq("place", searchForm.place);

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

  return (
    <div className="app">
      {page === "home" && (
        <div className="card">
          <h1>단꿈</h1>
          <p className="subtitle">
            단국대에서 스친 인연에게, 조심스럽게 마음을 남겨보세요.
          </p>

          <button onClick={() => setPage("send")}>마음 남기기</button>

          <button onClick={() => setPage("search")} className="white">
            나에게 온 마음 확인하기
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
          <p className="notice">
            기억나는 단서를 선택해주세요. 외모를 자세히 적기보다, 장소와 시간 중심으로 조심스럽게 남겨주세요.
          </p>

          <input
            type="date"
            value={crushPost.seen_date}
            onChange={(e) =>
              setCrushPost({ ...crushPost, seen_date: e.target.value })
            }
          />

          <select
            value={crushPost.place}
            onChange={(e) =>
              setCrushPost({ ...crushPost, place: e.target.value })
            }
          >
            {placeOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={crushPost.time_period}
            onChange={(e) =>
              setCrushPost({ ...crushPost, time_period: e.target.value })
            }
          >
            {timeOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={crushPost.hair_feature}
            onChange={(e) =>
              setCrushPost({ ...crushPost, hair_feature: e.target.value })
            }
          >
            <option value="">머리 특징 선택</option>
            {hairOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={crushPost.clothes_color}
            onChange={(e) =>
              setCrushPost({ ...crushPost, clothes_color: e.target.value })
            }
          >
            <option value="">상의 색상 선택</option>
            {colorOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={crushPost.clothes_style}
            onChange={(e) =>
              setCrushPost({ ...crushPost, clothes_style: e.target.value })
            }
          >
            <option value="">옷 스타일 선택</option>
            {styleOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={crushPost.accessory}
            onChange={(e) =>
              setCrushPost({ ...crushPost, accessory: e.target.value })
            }
          >
            <option value="">기억나는 소지품 선택</option>
            {accessoryOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <textarea
            placeholder="짧은 메시지 예: 분위기가 좋아 보여서 조심스럽게 마음 남겨요."
            value={crushPost.message}
            onChange={(e) =>
              setCrushPost({ ...crushPost, message: e.target.value })
            }
          />

          <button onClick={saveCrushPost}>마음 남기기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "sent" && (
        <div className="card">
          <h2>마음을 남겼어요</h2>
          <p>
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
          <h2>나에게 온 마음 확인</h2>
          <p className="notice">
            날짜와 장소를 먼저 선택하면 비슷한 마음을 찾아볼 수 있어요.
          </p>

          <input
            type="date"
            value={searchForm.seen_date}
            onChange={(e) =>
              setSearchForm({ ...searchForm, seen_date: e.target.value })
            }
          />

          <select
            value={searchForm.place}
            onChange={(e) =>
              setSearchForm({ ...searchForm, place: e.target.value })
            }
          >
            {placeOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={searchForm.hair_feature}
            onChange={(e) =>
              setSearchForm({ ...searchForm, hair_feature: e.target.value })
            }
          >
            <option value="">내 머리 특징 선택</option>
            {hairOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={searchForm.clothes_color}
            onChange={(e) =>
              setSearchForm({ ...searchForm, clothes_color: e.target.value })
            }
          >
            <option value="">내 상의 색상 선택</option>
            {colorOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={searchForm.clothes_style}
            onChange={(e) =>
              setSearchForm({ ...searchForm, clothes_style: e.target.value })
            }
          >
            <option value="">내 옷 스타일 선택</option>
            {styleOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <button onClick={searchCrushPosts}>비슷한 마음 찾기</button>

          <button onClick={() => setPage("home")} className="white">
            홈으로
          </button>
        </div>
      )}

      {page === "result" && (
        <div className="card">
          <h2>비슷한 마음 {searchResults.length}개</h2>

          {searchResults.length === 0 && (
            <p className="notice">
              아직 비슷한 마음이 없어요. 날짜와 장소를 다시 확인해보세요.
            </p>
          )}

          {searchResults.map((post) => (
            <div className="post" key={post.id}>
              <p>
                <b>
                  {post.seen_date}, {post.time_period}, {post.place}
                </b>
              </p>

              <p>
                {post.hair_feature}, {post.clothes_color} {post.clothes_style}
                {post.accessory && `, ${post.accessory}`} 분께 마음을
                남겼어요.
              </p>

              <p className="message">“{post.message}”</p>

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
            다시 검색하기
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

              <p>
                {selectedPost.hair_feature}, {selectedPost.clothes_color}{" "}
                {selectedPost.clothes_style}
                {selectedPost.accessory && `, ${selectedPost.accessory}`} 분께
                마음을 남겼어요.
              </p>

              <p className="message">“{selectedPost.message}”</p>
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
          <p>
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

                    <p>
                      {claim.post.hair_feature}, {claim.post.clothes_color}{" "}
                      {claim.post.clothes_style}
                      {claim.post.accessory && `, ${claim.post.accessory}`} 분께
                      남긴 마음
                    </p>

                    <p className="message">“{claim.post.message}”</p>
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
                  <button onClick={() => acceptClaim(claim.id)}>수락하기</button>
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