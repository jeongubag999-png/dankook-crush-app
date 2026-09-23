import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const translationRequests = new Map();

const languageNames = {
  ko: { ko: "한국어", en: "Korean" },
  en: { ko: "영어", en: "English" },
  vi: { ko: "베트남어", en: "Vietnamese" },
  ja: { ko: "일본어", en: "Japanese" },
  zh: { ko: "중국어", en: "Chinese" },
  mn: { ko: "몽골어", en: "Mongolian" },
  ru: { ko: "러시아어", en: "Russian" },
};

const getLanguageName = (code, uiLanguage) =>
  languageNames[code]?.[uiLanguage] || (uiLanguage === "en" ? "Original language" : "원문 언어");

const requestTranslation = ({ text, targetLanguage, postId, field }) => {
  const cacheKey = `${targetLanguage}:${postId || "unknown"}:${field || "text"}:${text}`;
  if (!translationRequests.has(cacheKey)) {
    translationRequests.set(
      cacheKey,
      supabase.functions
        .invoke("translate-cloud-text", {
          body: {
            text,
            targetLanguage,
            postId: postId || null,
            field: field || "message",
          },
        })
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
        .catch((error) => {
          translationRequests.delete(cacheKey);
          throw error;
        })
    );
  }
  return translationRequests.get(cacheKey);
};

function TranslatedUserTextContent({
  sourceText,
  language,
  postId,
  field = "message",
  className = "",
  as: Tag = "p",
  quote = false,
}) {
  const [translation, setTranslation] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const isAlreadyKorean = language === "ko" && /[가-힣]/.test(sourceText);

  useEffect(() => {
    let cancelled = false;
    if (isAlreadyKorean) return undefined;

    requestTranslation({ text: sourceText, targetLanguage: language, postId, field })
      .then((result) => {
        if (!cancelled && result?.translatedText) setTranslation(result);
      })
      .catch(() => {
        if (!cancelled) {
          setTranslation({
            translatedText: sourceText,
            sourceLanguage: null,
            translated: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [field, isAlreadyKorean, language, postId, sourceText]);

  const resolvedTranslation = isAlreadyKorean
    ? { translatedText: sourceText, sourceLanguage: "ko", translated: false }
    : translation;

  const hasTranslation = Boolean(
    resolvedTranslation?.translated && resolvedTranslation.translatedText !== sourceText
  );
  const displayedText = showOriginal || !hasTranslation
    ? sourceText
    : resolvedTranslation.translatedText;
  const sourceLanguageName = getLanguageName(resolvedTranslation?.sourceLanguage, language);

  return (
    <Tag className={`translatedUserText ${className}`.trim()} data-i18n-ignore>
      <span className="translatedUserTextBody">
        {quote ? "“" : ""}{displayedText}{quote ? "”" : ""}
      </span>
      {hasTranslation && (
        <span className="translatedUserTextControls">
          <span className="translatedUserTextBadge">
            {showOriginal
              ? language === "en" ? `Original · ${sourceLanguageName}` : `원문 · ${sourceLanguageName}`
              : language === "en" ? "Auto-translated" : "자동 번역"}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowOriginal((value) => !value);
            }}
          >
            {showOriginal
              ? language === "en" ? "View translation" : "번역문 보기"
              : language === "en" ? "View original" : "원문 보기"}
          </button>
        </span>
      )}
    </Tag>
  );
}

export function TranslatedUserText(props) {
  const sourceText = String(props.text || "").trim();
  if (!sourceText) return null;

  return (
    <TranslatedUserTextContent
      key={`${props.language}:${props.postId || "unknown"}:${props.field || "message"}:${sourceText}`}
      {...props}
      sourceText={sourceText}
    />
  );
}
