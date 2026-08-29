const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DKU_STATUS_WORDS = ["재학생", "휴학생", "졸업생", "제적", "수료", "자퇴"];

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

  // "학과/학부/전공" 키워드가 나오는 지점까지만 잘라서 쓴다. 상태 단어(재학/재학생/
  // 정회원 등)를 일일이 열거해서 뒤를 잘라내는 방식은 실제 화면 문구가 하나라도
  // 다르면 department 문자열에 꼬리표가 그대로 붙어버려 비교가 깨지기 쉬웠다.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, reason: "POST 요청만 지원해요." }, 405);
  }

  const apiKey = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");
  if (!apiKey) {
    return jsonResponse({
      ok: false,
      reason: "Google Vision API 키가 설정되지 않았어요.",
    }, 500);
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return jsonResponse({ ok: false, reason: "MY DKU 이미지가 전달되지 않았어요." }, 400);
    }

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64,
              },
              features: [
                {
                  type: "TEXT_DETECTION",
                  maxResults: 1,
                },
              ],
              imageContext: {
                languageHints: ["ko", "en"],
              },
            },
          ],
        }),
      },
    );

    const visionData = await visionResponse.json();

    if (!visionResponse.ok) {
      console.log("Google Vision OCR 오류:", visionData);
      return jsonResponse({
        ok: false,
        reason: "Google Vision OCR 요청에 실패했어요.",
      }, 502);
    }

    const text =
      visionData?.responses?.[0]?.fullTextAnnotation?.text ||
      visionData?.responses?.[0]?.textAnnotations?.[0]?.description ||
      "";

    if (!text) {
      return jsonResponse({
        ok: false,
        reason: "MY DKU 화면에서 글자를 찾지 못했어요.",
      });
    }

    return jsonResponse({
      ok: true,
      parsed: parseDkuOcrText(text),
    });
  } catch (error) {
    console.log("dku-auto-verification 오류:", error);
    return jsonResponse({
      ok: false,
      reason: "MY DKU 자동 인증 중 오류가 발생했어요.",
    }, 500);
  }
});
