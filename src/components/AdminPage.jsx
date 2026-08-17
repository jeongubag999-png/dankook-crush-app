import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const PAGE_SIZE = 20;

export function AdminPage({ onClose }) {
  const [section, setSection] = useState("verification");
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});
  const [loadingPhotoId, setLoadingPhotoId] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState("pending");
  const [resolvingReportId, setResolvingReportId] = useState(null);

  const loadStats = async () => {
    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      supabase.from("dku_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("dku_verifications").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("dku_verifications").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    ]);

    setStats({
      pending: pendingRes.count || 0,
      approved: approvedRes.count || 0,
      rejected: rejectedRes.count || 0,
    });
  };

  const loadVerifications = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    setPhotoUrls({});

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("dku_verifications")
      .select("*", { count: "exact" })
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setVerifications(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    loadVerifications();
  }, [filter, page]);

  const togglePhoto = async (item) => {
    if (photoUrls[item.id]) {
      setPhotoUrls((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    if (!item.screenshot_path) return;

    setLoadingPhotoId(item.id);
    const { data: urlData, error } = await supabase.storage
      .from("dku-verifications")
      .createSignedUrl(item.screenshot_path, 3600);

    if (error) {
      console.log(error);
    } else if (urlData?.signedUrl) {
      setPhotoUrls((prev) => ({ ...prev, [item.id]: urlData.signedUrl }));
    }
    setLoadingPhotoId(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === verifications.length ? new Set() : new Set(verifications.map((v) => v.id))
    );
  };

  const loadReports = async () => {
    setReportsLoading(true);

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", reportFilter)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setReportsLoading(false);
      return;
    }

    setReports(data || []);
    setReportsLoading(false);
  };

  useEffect(() => {
    if (section === "reports") {
      loadReports();
    }
  }, [section, reportFilter]);

  const handleResolveReport = async (report) => {
    if (resolvingReportId) return;
    setResolvingReportId(report.id);

    const { error } = await supabase
      .from("reports")
      .update({ status: "reviewed" })
      .eq("id", report.id);

    if (error) {
      alert("처리 실패: " + error.message);
      console.log(error);
    } else {
      loadReports();
    }

    setResolvingReportId(null);
  };

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
      loadVerifications();
      loadStats();
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
      loadVerifications();
      loadStats();
    }

    setProcessingId(null);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0 || processingId) return;

    const ok = window.confirm(`선택한 ${selectedIds.size}명을 한 번에 승인할까요?`);
    if (!ok) return;

    setProcessingId("bulk");

    const { error } = await supabase
      .from("dku_verifications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .in("id", [...selectedIds]);

    if (error) {
      alert("일괄 승인 실패: " + error.message);
      console.log(error);
    } else {
      alert(`${selectedIds.size}명 승인 완료!`);
      loadVerifications();
      loadStats();
    }

    setProcessingId(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="card adminCard">
      <div className="adminHeader">
        <h2>관리자 페이지</h2>
        <button className="white" onClick={onClose}>닫기</button>
      </div>

      <div className="adminStatsBar">
        <div className="adminStatChip">
          <span className="adminStatLabel">대기 중</span>
          <span className="adminStatValue">{stats.pending}</span>
        </div>
        <div className="adminStatChip">
          <span className="adminStatLabel">승인됨</span>
          <span className="adminStatValue">{stats.approved}</span>
        </div>
        <div className="adminStatChip">
          <span className="adminStatLabel">거절됨</span>
          <span className="adminStatValue">{stats.rejected}</span>
        </div>
        <div className="adminStatChip">
          <span className="adminStatLabel">전체</span>
          <span className="adminStatValue">{stats.pending + stats.approved + stats.rejected}</span>
        </div>
      </div>

      <div className="adminTabs">
        <button
          className={section === "verification" ? "manageTab active" : "manageTab"}
          onClick={() => setSection("verification")}
        >
          학생 인증
        </button>
        <button
          className={section === "reports" ? "manageTab active" : "manageTab"}
          onClick={() => setSection("reports")}
        >
          신고 관리
        </button>
      </div>

      {section === "verification" && (
        <>
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

          {filter === "pending" && verifications.length > 0 && (
            <div className="adminBulkBar">
              <label className="adminSelectAllLabel">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === verifications.length}
                  onChange={toggleSelectAll}
                />
                이 페이지 전체 선택 ({selectedIds.size}명 선택됨)
              </label>
              <button
                className="adminApproveBtn adminBulkApproveBtn"
                onClick={handleBulkApprove}
                disabled={selectedIds.size === 0 || processingId === "bulk"}
              >
                {processingId === "bulk" ? "처리 중..." : `선택 ${selectedIds.size}명 일괄 승인`}
              </button>
            </div>
          )}

          {loading && <p className="notice">불러오는 중...</p>}

          {!loading && verifications.length === 0 && (
            <p className="noticeBox">
              {filter === "pending" ? "대기 중인 인증 신청이 없어요." :
               filter === "approved" ? "승인된 계정이 없어요." : "거절된 계정이 없어요."}
            </p>
          )}

          {!loading && verifications.map((item) => (
            <div key={item.id} className="adminVerifyCard">
              <div className="adminVerifyTopRow">
                {filter === "pending" && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                )}
                <div className="adminVerifyInfo">
                  <p><b>{item.name || "이름 없음"}</b></p>
                  <p>학번: {item.student_id || "-"}</p>
                  <p>학과: {item.department || "-"}</p>
                  <p className="helperText">신청: {formatDate(item.created_at)}</p>
                  {item.reject_reason && (
                    <p className="retryErrorText">거절 사유: {item.reject_reason}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="white adminPhotoToggleBtn"
                onClick={() => togglePhoto(item)}
                disabled={loadingPhotoId === item.id}
              >
                {loadingPhotoId === item.id
                  ? "사진 불러오는 중..."
                  : photoUrls[item.id]
                  ? "사진 숨기기"
                  : "📷 인증 사진 보기"}
              </button>

              {photoUrls[item.id] && (
                <a href={photoUrls[item.id]} target="_blank" rel="noreferrer">
                  <img
                    src={photoUrls[item.id]}
                    alt="인증 사진"
                    className="adminVerifyPhoto"
                  />
                  <p className="helperText" style={{ textAlign: "center" }}>사진 클릭해서 크게 보기</p>
                </a>
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

          {!loading && totalCount > 0 && (
            <div className="adminPagination">
              <button
                className="white"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ◀ 이전
              </button>
              <span className="helperText adminPaginationInfo">
                {rangeStart}-{rangeEnd} / 총 {totalCount}건 ({page}/{totalPages}페이지)
              </span>
              <button
                className="white"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                다음 ▶
              </button>
            </div>
          )}

          <button className="white" onClick={loadVerifications} disabled={loading}>
            새로고침
          </button>
        </>
      )}

      {section === "reports" && (
        <>
          <div className="adminTabs">
            <button
              className={reportFilter === "pending" ? "manageTab active" : "manageTab"}
              onClick={() => setReportFilter("pending")}
            >
              대기 중
            </button>
            <button
              className={reportFilter === "reviewed" ? "manageTab active" : "manageTab"}
              onClick={() => setReportFilter("reviewed")}
            >
              처리 완료
            </button>
          </div>

          {reportsLoading && <p className="notice">불러오는 중...</p>}

          {!reportsLoading && reports.length === 0 && (
            <p className="noticeBox">
              {reportFilter === "pending" ? "대기 중인 신고가 없어요." : "처리 완료된 신고가 없어요."}
            </p>
          )}

          {!reportsLoading && reports.map((item) => (
            <div key={item.id} className="adminVerifyCard">
              <div className="adminVerifyInfo">
                <p><b>{item.target_type === "post" ? "구름" : "응답"} 신고</b></p>
                <p>대상 ID: {item.target_id}</p>
                <p>신고 사유: {item.reason}</p>
                <p className="helperText">신고 시각: {formatDate(item.created_at)}</p>
              </div>

              {reportFilter === "pending" && (
                <div className="adminVerifyActions">
                  <button
                    onClick={() => handleResolveReport(item)}
                    disabled={resolvingReportId === item.id}
                    className="adminApproveBtn"
                  >
                    {resolvingReportId === item.id ? "처리 중..." : "✅ 처리 완료"}
                  </button>
                </div>
              )}
            </div>
          ))}

          <button className="white" onClick={loadReports} disabled={reportsLoading}>
            새로고침
          </button>
        </>
      )}
    </div>
  );
}
