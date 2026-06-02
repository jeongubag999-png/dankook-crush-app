import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function VerificationPendingPage({ currentUser, onApproved, onLogout }) {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const checkVerificationStatus = async () => {
    if (!currentUser?.id) return;

    setChecking(true);

    const { data, error } = await supabase
      .from("dku_verifications")
      .select("status")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    setChecking(false);
    setLastChecked(new Date());

    if (error) {
      console.log(error);
      return;
    }

    if (data?.status === "approved") {
      onApproved();
    }
  };

  // 5초마다 자동 확인
  useEffect(() => {
    checkVerificationStatus();

    const interval = setInterval(() => {
      checkVerificationStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const formatTime = (date) => {
    if (!date) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  };

  return (
    <div className="app">
      <div className="card verificationPendingCard">
        <div className="pendingCloudIcon">☁️</div>

        <h2 className="pendingTitle">인증 검토 중이에요</h2>

        <p className="pendingDesc">
          단국대 재학생 확인을 위해 제출하신 MY DKU 캡처를 검토하고 있어요.
          보통 <b>수 시간 ~ 1일 이내</b>에 승인돼요.
        </p>

        <div className="pendingStepBox">
          <div className="pendingStep done">
            <span className="pendingStepIcon">✅</span>
            <span>회원가입 완료</span>
          </div>
          <div className="pendingStepDivider" />
          <div className="pendingStep active">
            <span className="pendingStepIcon">🔍</span>
            <span>학생 인증 검토 중</span>
          </div>
          <div className="pendingStepDivider" />
          <div className="pendingStep">
            <span className="pendingStepIcon">☁️</span>
            <span>단꿈 이용 시작</span>
          </div>
        </div>

        <div className="pendingAutoCheck">
          <div className={`pendingDot ${checking ? "pulse" : ""}`} />
          <span>
            {checking
              ? "승인 여부 확인 중..."
              : lastChecked
              ? `마지막 확인: ${formatTime(lastChecked)} · 5초마다 자동 확인`
              : "자동 확인 중..."}
          </span>
        </div>

        <button
          className="white"
          onClick={checkVerificationStatus}
          disabled={checking}
        >
          {checking ? "확인 중..." : "지금 바로 확인하기"}
        </button>

        <div className="pendingNotice">
          <p>📧 승인이 완료되면 이 화면이 자동으로 전환돼요.</p>
          <p>문의사항은 단꿈 공식 인스타그램으로 연락해주세요.</p>
        </div>

        <button onClick={onLogout} className="logoutTextButton">
          로그아웃
        </button>
      </div>
    </div>
  );
}
