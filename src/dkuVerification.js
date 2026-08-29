import { supabase } from "./supabase";

const DKU_COLLEGE_PREFIXES = [
  "프리무스국제",
  "경영경제",
  "사회과학",
  "과학기술",
  "바이오융합",
  "스포츠과학",
  "공공인재",
  "보건과학",
  "음악예술",
  "음악·예술",
  "SW융합",
  "외국어",
  "문과",
  "법과",
  "공과",
  "사범",
  "예술",
  "의과",
  "간호",
  "치과",
  "약학",
];

const DKU_STATUS_WORDS = ["재학생", "휴학생", "졸업생", "제적", "수료", "자퇴"];

export const normalizeDkuDepartmentName = (value = "") => {
  let normalized = String(value)
    .replace(/\s+/g, "")
    .replace(/[()（）[\]{}·.,/\\|_\-:;'"“”‘’!@#$%^&*+=?~`<>]/g, "")
    .replace(/야간|학과|학부|전공|대학/g, "");

  for (const prefix of DKU_COLLEGE_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }

  return normalized;
};

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const parseDkuOcrText = (text = "") => {
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
      .map((line) => line.replace(new RegExp(`[-:·]?(?:${DKU_STATUS_WORDS.join("|")}).*$`), ""))
      .find((line) => /학과|학부|전공/.test(line) && normalizeDkuDepartmentName(line)) ||
    "";

  const statusLine =
    compactLines.find((line) => new RegExp(DKU_STATUS_WORDS.join("|")).test(line)) || "";

  return {
    rawText: text,
    cleanedText,
    ocrStudentId,
    ocrDepartment: departmentLine,
    ocrStatus: statusLine,
    isEnrolled: /재학생/.test(statusLine),
  };
};

export const runDkuVerificationOcr = async (file) => {
  try {
    const dataUrl = await readImageFile(file);
    const imageBase64 = String(dataUrl).split(",")[1] || "";

    if (!imageBase64) {
      return {
        available: false,
        reason: "MY DKU 이미지를 읽지 못했어요.",
        parsed: null,
      };
    }

    const { data, error } = await supabase.functions.invoke("dku-auto-verification", {
      body: {
        imageBase64,
        mimeType: file.type,
      },
    });

    if (error) {
      console.log("MY DKU 서버 OCR 호출 실패:", error);
      return {
        available: false,
        reason: "서버 자동 인증이 아직 준비되지 않았어요.",
        parsed: null,
      };
    }

    if (!data?.ok) {
      return {
        available: false,
        reason: data?.reason || "MY DKU 화면 글자 인식에 실패했어요.",
        parsed: null,
      };
    }

    return {
      available: true,
      reason: "",
      parsed: data.parsed || parseDkuOcrText(data.text || ""),
    };
  } catch (error) {
    console.log("MY DKU OCR 실패:", error);
    return {
      available: false,
      reason: "MY DKU 화면 글자 인식에 실패했어요.",
      parsed: null,
    };
  }
};

export const evaluateDkuAutoVerification = ({ signupStudentId, signupDepartment, parsed }) => {
  if (!parsed) {
    return {
      approved: false,
      reason: "MY DKU 화면을 자동으로 읽지 못했어요.",
    };
  }

  const inputStudentId = String(signupStudentId || "").replace(/\D/g, "");
  const ocrStudentId = String(parsed.ocrStudentId || "").replace(/\D/g, "");
  const inputDepartment = normalizeDkuDepartmentName(signupDepartment);
  const ocrDepartment = normalizeDkuDepartmentName(parsed.ocrDepartment);

  if (!inputStudentId || !ocrStudentId || inputStudentId !== ocrStudentId) {
    return {
      approved: false,
      reason: "회원가입 학번과 MY DKU 학번이 일치하지 않아요.",
      inputStudentId,
      ocrStudentId,
      inputDepartment,
      ocrDepartment,
    };
  }

  if (!inputDepartment || !ocrDepartment || inputDepartment !== ocrDepartment) {
    return {
      approved: false,
      reason: "회원가입 학과와 MY DKU 학과가 일치하지 않아요.",
      inputStudentId,
      ocrStudentId,
      inputDepartment,
      ocrDepartment,
    };
  }

  return {
    approved: true,
    reason: "학번과 학과가 자동 확인됐어요.",
    inputStudentId,
    ocrStudentId,
    inputDepartment,
    ocrDepartment,
  };
};
