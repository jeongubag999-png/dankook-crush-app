import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { makeStorageFilePath, validateImageFile } from "../utils";

export function VerificationPendingPage({ currentUser, onApproved, onLogout }) {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [retryFile, setRetryFile] = useState(null);
  const [retryUploading, setRetryUploading] = useState(false);
  const [retryError, setRetryError] = useState("");
  const fileInputRef = useRef(null);

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

    if (error) { console.log(error); return; }

    if (!data) { setIsIncomplete(true); return; }

    setIsIncomplete(false);
    if (data.status === "approved") onApproved();
  };

  useEffect(() => {
    checkVerificationStatus();
    const interval = setInterval(checkVerificationStatus, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleRetryUpload = async () => {
    if (!retryFile || retryUploading) return;

    setRetryUploading(true);
    setRetryError("");

    try {
      const filePath = makeStorageFilePath(currentUser.id, retryFile);

      const { error: uploadError } = await supabase.storage
        .from("dku-verifications")
        .upload(filePath, retryFile, { contentType: retryFile.type, upsert: false });

      if (uploadError) {
        setRetryError("업로드에 실패했어요. 다시 시도해주세요.");
        console.log(uploadError);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nickname, student_year, department")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      const { error: insertError } = await supabase
        .from("dku_verifications")
        .insert([{
          user_id: currentUser.id,
          name: profileData?.nickname || "",
          student_id: profileData?.student_year || "",
          department: profileData?.department || "",
          screenshot_path: filePath,
          status: "pending",
        }]);

      if (insertError) {
        setRetryError("신청 저장에 실패했어요. 다시 시도해주세요.");
        console.log(insertError);
        return;
      }

      setRetryFile(null);
      setIsIncomplete(false);
      await checkVerificationStatus();
    } finally {
      setRetryUploading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  };

  // 사진 미완성 → 재업로드 화면
  if (isIncomplete) {
    return (
      <div className="app">
        <div className="card verificationPendingCard">
          <div className="pendingCloudIcon">☁️</div>
          <h2 className="pendingTitle">인증 사진을 올려주세요</h2>
          <p className="pendingDesc">
            MY DKU 첫 화면 캡처를 올려주시면<br />
            관리자 확인 후 이용할 수 있어요.
          </p>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const err = validateImageFile(file, "학생 인증 이미지");
              if (err) { setRetryError(err); return; }
              setRetryFile(file);
              setRetryError("");
            }}
          />

          <button
            type="button"
            className={retryFile ? "white" : ""}
            onClick={() => fileInputRef.current?.click()}
            disabled={retryUploading}
          >
            {retryFile ? `📷 ${retryFile.name}` : "📷 MY DKU 캡처 선택하기"}
          </button>

          {retryError && <p className="retryErrorText">{retryError}</p>}

          <button
            onClick={handleRetryUpload}
            disabled={!retryFile || retryUploading}
          >
            {retryUploading ? "제출 중..." : "제출하기"}
          </button>

          <button onClick={onLogout} className="logoutTextButton">로그아웃</button>
        </div>
      </div>
    );
  }

  // 정상 대기 화면
  return (
    <div className="app">
      <div className="card verificationPendingCard">
        <div className="pendingCloudIcon">☁️</div>
        <h2 className="pendingTitle">인증 검토 중이에요</h2>
        <p className="pendingDesc">
          제출하신 MY DKU 캡처를 확인하고 있어요.<br />
          승인되면 이 화면이 자동으로 전환돼요.
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
              ? "확인 중..."
              : lastChecked
              ? `마지막 확인: ${formatTime(lastChecked)} · 5초마다 자동 확인`
              : "자동 확인 중..."}
          </span>
        </div>

        <button className="white" onClick={checkVerificationStatus} disabled={checking}>
          {checking ? "확인 중..." : "지금 바로 확인하기"}
        </button>

        <div className="pendingNotice">
          <p>문의사항은 단꿈 공식 인스타그램으로 연락해주세요.</p>
        </div>

        <button onClick={onLogout} className="logoutTextButton">로그아웃</button>
      </div>
    </div>
  );
}
