import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function AdminPage({ onClose }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});
  const [filter, setFilter] = useState("pending");

  const loadVerifications = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("dku_verifications")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setVerifications(data || []);

    // 사진 URL 생성
    const urls = {};
    for (const item of data || []) {
      if (item.screenshot_path) {
        const { data: urlData } = await supabase.storage
          .from("dku-verifications")
          .createSignedUrl(item.screenshot_path, 3600);
        if (urlData?.signedUrl) {
          urls[item.id] = urlData.signedUrl;
        }
      }
    }
    setPhotoUrls(urls);
    setLoading(false);
  };

  useEffect(() => {
    loadVerifications();
  }, [filter]);

  const handleApprove = async (item) => {
    if (processingId) return;
    setProcessingId(item.id);

    const { error } = await supabase
      .from("dku_verifications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) {
      alert("승인 실패: " + error.message);
      console.log(error);
    } else {
      alert(`${item.name || "유저"} 승인 완료!`);
      loadVerifications();
    }

    setProcessingId(null);
  };

  const handleReject = async (item) => {
    if (processingId) return;

    const reason = window.prompt(`${item.name || "유저"}을(를) 거절하는 이유를 입력해주세요:`);
    if (reason === null) return; // 취소

    setProcessingId(item.id);

    const { error } = await supabase
      .from("dku_verifications")
      .update({
        status: "rejected",
        reject_reason: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert("거절 실패: " + error.message);
      console.log(error);
    } else {
      alert(`${item.name || "유저"} 거절 완료`);
      loadVerifications();
    }

    setProcessingId(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="card adminCard">
      <div className="adminHeader">
        <h2>관리자 페이지</h2>
        <button className="white" onClick={onClose}>닫기</button>
      </div>

      <div className="adminTabs">
        <button
          className={filter === "pending" ? "manageTab active" : "manageTab"}
          onClick={() => setFilter("pending")}
        >
          대기 중
        </button>
        <button
          className={filter === "approved" ? "manageTab active" : "manageTab"}
          onClick={() => setFilter("approved")}
        >
          승인됨
        </button>
        <button
          className={filter === "rejected" ? "manageTab active" : "manageTab"}
          onClick={() => setFilter("rejected")}
        >
          거절됨
        </button>
      </div>

      {loading && <p className="notice">불러오는 중...</p>}

      {!loading && verifications.length === 0 && (
        <p className="noticeBox">
          {filter === "pending" ? "대기 중인 인증 신청이 없어요." :
           filter === "approved" ? "승인된 계정이 없어요." : "거절된 계정이 없어요."}
        </p>
      )}

      {!loading && verifications.map((item) => (
        <div key={item.id} className="adminVerifyCard">
          <div className="adminVerifyInfo">
            <p><b>{item.name || "이름 없음"}</b></p>
            <p>학번: {item.student_id || "-"}</p>
            <p>학과: {item.department || "-"}</p>
            <p className="helperText">신청: {formatDate(item.created_at)}</p>
            {item.reject_reason && (
              <p className="retryErrorText">거절 사유: {item.reject_reason}</p>
            )}
          </div>

          {photoUrls[item.id] ? (
            <a href={photoUrls[item.id]} target="_blank" rel="noreferrer">
              <img
                src={photoUrls[item.id]}
                alt="인증 사진"
                className="adminVerifyPhoto"
              />
              <p className="helperText" style={{ textAlign: "center" }}>사진 클릭해서 크게 보기</p>
            </a>
          ) : (
            <div className="adminVerifyPhotoEmpty">사진 없음</div>
          )}

          {filter === "pending" && (
            <div className="adminVerifyActions">
              <button
                onClick={() => handleApprove(item)}
                disabled={processingId === item.id}
                className="adminApproveBtn"
              >
                {processingId === item.id ? "처리 중..." : "✅ 승인"}
              </button>
              <button
                onClick={() => handleReject(item)}
                disabled={processingId === item.id}
                className="dangerButton"
              >
                {processingId === item.id ? "처리 중..." : "❌ 거절"}
              </button>
            </div>
          )}
        </div>
      ))}

      <button className="white" onClick={loadVerifications} disabled={loading}>
        새로고침
      </button>
    </div>
  );
}
