import { supabase } from "./supabase";

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// OCR 판독, 자동승인 판정, dku_verifications insert를 모두 dku-auto-verification
// 엣지 함수(서비스 롤) 안에서 처리한다. 클라이언트는 판정 로직이나 status 값을
// 갖지 않는다 — RLS로 클라이언트의 직접 insert를 status:'pending'으로만 제한해도
// 정상적인 자동승인 흐름이 깨지지 않도록 하기 위함이다.
export const submitDkuVerification = async ({
  file,
  signupName,
  signupStudentId,
  signupDepartment,
  screenshotPath,
}) => {
  try {
    const dataUrl = await readImageFile(file);
    const imageBase64 = String(dataUrl).split(",")[1] || "";

    if (!imageBase64) {
      return { ok: false, reason: "MY DKU 이미지를 읽지 못했어요." };
    }

    const { data, error } = await supabase.functions.invoke("dku-auto-verification", {
      body: {
        imageBase64,
        signupName,
        signupStudentId,
        signupDepartment,
        screenshotPath,
      },
    });

    if (error) {
      console.log("MY DKU 자동 인증 서버 호출 실패:", error);
      return { ok: false, reason: "인증 신청 저장에 실패했어요. 잠시 후 다시 시도해주세요." };
    }

    if (!data?.ok) {
      return { ok: false, reason: data?.reason || "인증 신청 저장에 실패했어요." };
    }

    return { ok: true, status: data.status, reason: data.reason || "" };
  } catch (error) {
    console.log("MY DKU 자동 인증 실패:", error);
    return { ok: false, reason: "인증 신청 처리 중 오류가 발생했어요." };
  }
};
