// MY DKU 학생 인증 처리. OCR 판독부터 자동승인 판정, dku_verifications insert까지
// 전부 이 함수(서비스 롤) 안에서 끝냅니다.
//
// 예전에는 이 함수가 OCR 결과(텍스트)만 클라이언트에 돌려주고, 클라이언트가 그 결과를
// 스스로 판정해서 status: 'approved'/'pending'을 골라 dku_verifications에 직접 insert
// 했습니다. dku_verifications의 insert RLS는 auth.uid() = user_id만 검사하고 status
// 컬럼은 전혀 제한하지 않았기 때문에, 로그인한 사용자가 브라우저 콘솔에서
// supabase.from('dku_verifications').insert([{ status: 'approved', ... }])를 직접
// 호출하면 MY DKU 인증 전체를 우회할 수 있었습니다.
//
// 지금은 dku_verifications의 insert 정책이 status = 'pending'인 행만 허용하도록
// 좁혀졌고(2026_08_30_restrict_dku_verification_status_insert.sql), 'approved' 행은
// 오직 이 함수가 서비스 롤로 직접 insert할 때만 만들어집니다. 클라이언트는 더 이상
// 판정 로직이나 status 값을 갖고 있지 않습니다.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DKU_STATUS_WORDS = ["재학생", "휴학생", "졸업생", "제적", "수료", "자퇴"];

const parseDkuOcrText = (text: string = "") => {
  const cleanedText = text.replace(/\s+/g, " ").trim();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const compactLines = lines.map((line) => line.replace(/\s+/g, ""));

  const studentIdMatch =
    cleanedText.match(/\((\d{7,10})\)/) ||
    cleanedText.match(/(?:^|[^0-9])(\d{7,10})(?:[^0-9]|$)/);
  const ocrStudentId = studentIdMatch?.[1] || "";

  const departmentLine =
    compactLines
      .map((line) => line.match(/^.*?(?:학과|학부|전공)/)?.[0] || "")
      .find(Boolean) ||
    "";

  const statusLine =
    compactLines.find((line) => new RegExp(DKU_STATUS_WORDS.join("|")).test(line)) || "";

  return {
    ocrStudentId,
    ocrDepartment: departmentLine,
    ocrStatus: statusLine,
    isEnrolled: /재학생/.test(statusLine),
    cleanedText,
  };
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

// verify_jwt = true(기본값)라서 이 함수에 도달했다는 것 자체가 게이트웨이가 이미
// 서명/만료를 검증했다는 뜻입니다. 여기서는 재검증 없이 payload만 디코드해 sub만 꺼냅니다.
const getUserIdFromAuthHeader = (authHeader: string | null): string | null => {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payloadPart = token.split(".")[1];
  if (!payloadPart) return null;
  try {
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, reason: "POST 요청만 지원해요." }, 405);
  }

  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) {
    return jsonResponse({ ok: false, reason: "로그인이 필요해요." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, reason: "Supabase 설정이 없어요." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, reason: "요청 형식이 올바르지 않아요." }, 400);
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const screenshotPath = typeof body.screenshotPath === "string" ? body.screenshotPath : "";
  const signupName = typeof body.signupName === "string" ? body.signupName : "";
  const signupStudentId = typeof body.signupStudentId === "string" ? body.signupStudentId : "";
  const signupDepartment = typeof body.signupDepartment === "string" ? body.signupDepartment : "";

  if (!imageBase64 || !screenshotPath) {
    return jsonResponse({ ok: false, reason: "인증 이미지 정보가 전달되지 않았어요." }, 400);
  }

  // ── OCR 시도: 실패하거나 학번이 일치하지 않아도 예외를 던지지 않고 "수동검토 필요"로
  //    수렴시킨다. 자동승인 실패가 곧 인증 신청 실패가 되어서는 안 되기 때문. ──
  let ocrStudentId = "";
  let ocrDepartment = "";
  let ocrEnrollmentStatus = "";
  let manualReason = "";
  let approved = false;

  const apiKey = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");
  if (!apiKey) {
    manualReason = "서버 자동 인증이 아직 준비되지 않았어요.";
  } else {
    try {
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageBase64 },
                features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
                imageContext: { languageHints: ["ko", "en"] },
              },
            ],
          }),
        },
      );

      const visionData = await visionResponse.json();

      if (!visionResponse.ok) {
        console.log("Google Vision OCR 오류:", visionData);
        manualReason = "MY DKU 화면 글자 인식에 실패했어요.";
      } else {
        const text =
          visionData?.responses?.[0]?.fullTextAnnotation?.text ||
          visionData?.responses?.[0]?.textAnnotations?.[0]?.description ||
          "";

        if (!text) {
          manualReason = "MY DKU 화면에서 글자를 찾지 못했어요.";
        } else {
          const parsed = parseDkuOcrText(text);
          ocrStudentId = parsed.ocrStudentId;
          ocrDepartment = parsed.ocrDepartment;
          ocrEnrollmentStatus = parsed.ocrStatus;

          const inputStudentId = signupStudentId.replace(/\D/g, "");
          const matchedStudentId = ocrStudentId.replace(/\D/g, "");

          if (!inputStudentId || !matchedStudentId || inputStudentId !== matchedStudentId) {
            manualReason = "회원가입 학번과 MY DKU 학번이 일치하지 않아요.";
          } else {
            approved = true;
          }
        }
      }
    } catch (error) {
      console.log("dku-auto-verification OCR 오류:", error);
      manualReason = "MY DKU 자동 인증 중 오류가 발생했어요.";
    }
  }

  const status = approved ? "approved" : "pending";
  const reviewedAt = approved ? new Date().toISOString() : null;

  // 자동승인 여부와 무관하게 인증 사진은 항상 보관한다 (사후 검토/이의제기 대비 증빙).
  // 승인된 건은 수동검토가 필요 없으므로 이름/학번은 남기지 않는다.
  const verificationPayload = {
    user_id: userId,
    name: approved ? null : signupName,
    student_id: approved ? null : signupStudentId,
    department: signupDepartment,
    screenshot_path: screenshotPath,
    status,
    reviewed_at: reviewedAt,
    auto_review_status: approved ? "approved" : "manual_required",
    auto_review_reason: approved ? "학번이 자동 확인됐어요." : manualReason,
    ocr_student_id: ocrStudentId,
    ocr_department: ocrDepartment,
    ocr_enrollment_status: ocrEnrollmentStatus,
    auto_reviewed_at: new Date().toISOString(),
  };

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/dku_verifications`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([verificationPayload]),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    console.log("dku_verifications insert 실패:", insertRes.status, errText);
    return jsonResponse(
      { ok: false, reason: "인증 신청 저장에 실패했어요. 잠시 후 다시 시도해주세요." },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    status,
    reason: approved ? "" : manualReason,
  });
});
