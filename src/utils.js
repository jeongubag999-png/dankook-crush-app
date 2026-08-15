import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { KOREA_TIME_ZONE, IMAGE_EXTENSIONS, MAX_IMAGE_SIZE } from "./constants";

export const isNativeApp = () => Capacitor.isNativePlatform();

export const pickImageFromLibrary = async () => {
  const photo = await Camera.getPhoto({
    quality: 80,
    resultType: CameraResultType.Base64,
    source: CameraSource.Photos,
  });
  if (!photo.base64String) return null;

  const mediaType = `image/${photo.format}`;
  const byteString = atob(photo.base64String);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new File([bytes], `verification.${photo.format}`, { type: mediaType });
};

export const getKoreaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getMainPlaceFromPost = (post) => {
  if (!post.place) return "장소 없음";
  return post.place.split(" - ")[0];
};

export const getSafeImageExtension = (file) => {
  const mimeExtension = IMAGE_EXTENSIONS[file.type];
  if (mimeExtension) return mimeExtension;
  return file.name.split(".").pop()?.toLowerCase() || "jpg";
};

export const makeStorageFilePath = (userId, file) => {
  const extension = getSafeImageExtension(file);
  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${file.lastModified}-${file.size}`;
  return `${userId}/${uniqueId}.${extension}`;
};

export const validateImageFile = (file, label) => {
  if (!file) return `${label} 파일을 선택해주세요.`;
  if (!file.type.startsWith("image/")) {
    return `${label}은 이미지 파일만 업로드할 수 있어요.`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `${label}은 5MB 이하 이미지만 업로드할 수 있어요.`;
  }
  return "";
};

export const makeAuthEmail = (loginId) => {
  const rawId = loginId.trim();
  const encodedId = btoa(unescape(encodeURIComponent(rawId)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `user-${encodedId}@dankum.app`;
};

export const cleanInstagram = (value) => {
  if (!value) return "";
  return value.trim().replace("@", "");
};

export const formatDateLabel = (dateText) => {
  if (!dateText) return "날짜 없음";
  const [year, month, day] = dateText.split("-");
  if (!year || !month || !day) return dateText;
  return `${Number(month)}월 ${Number(day)}일`;
};

export const formatShortDateTime = (dateTimeText) => {
  if (!dateTimeText) return "";
  const date = new Date(dateTimeText);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const WEEKDAY_LABELS_KR = ["일", "월", "화", "수", "목", "금", "토"];

export const formatChatBubbleTime = (dateTimeText) => {
  if (!dateTimeText) return "";
  const date = new Date(dateTimeText);
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getHours();
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const formatChatListTime = (dateTimeText) => {
  if (!dateTimeText) return "";
  const date = new Date(dateTimeText);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return formatChatBubbleTime(dateTimeText);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "어제";

  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const formatChatDateDivider = (dateTimeText) => {
  if (!dateTimeText) return "";
  const date = new Date(dateTimeText);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS_KR[date.getDay()]}요일`;
};

export const isSameChatDay = (aText, bText) => {
  const a = new Date(aText);
  const b = new Date(bText);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.toDateString() === b.toDateString();
};

export const cleanMessage = (message) => {
  if (!message) return "";
  return message.replace(/\[찾는 성별:\s*.*?\]\s*/, "");
};

export const getOxLabel = (option) => {
  if (!option || option === "잘 모르겠음") return option;
  return option.endsWith("없음") ? "X" : "O";
};

export const makeHairFeature = (style, color, hat, bangs) => {
  if (!color || !hat || !bangs) return "";
  return [style, color, hat, bangs].filter(Boolean).join(" / ");
};

export const cleanTagText = (text) => {
  if (!text) return "";
  return text
    .replace(/\/\s*상의 설명:.*/g, "")
    .replace(/\/\s*하의 설명:.*/g, "")
    .replace(/\/\s*소지품 설명:.*/g, "")
    .replace(/\/\s*신발 설명:.*/g, "")
    .replace(/\/\s*자세히:.*/g, "")
    .trim();
};

export const getPostTopText = (post) => {
  const clothesStyleText = post.clothes_style || "";
  if (!clothesStyleText) return "";
  const rawTopText = clothesStyleText.includes("하의:")
    ? clothesStyleText.split("하의:")[0].replace("상의:", "").trim()
    : clothesStyleText.replace("상의:", "").trim();
  return cleanTagText(rawTopText.replace(/\/\s*$/, "").trim());
};

export const getPostBottomText = (post) => {
  const clothesStyleText = post.clothes_style || "";
  if (!clothesStyleText || !clothesStyleText.includes("하의:")) return "";
  return cleanTagText(clothesStyleText.split("하의:")[1].trim());
};

export const getAccessoryValue = (post, label) => {
  const accessoryText = post.accessory || "";
  if (!accessoryText.includes(`${label}:`)) return "";
  const afterLabel = accessoryText.split(`${label}:`)[1] || "";
  return cleanTagText(afterLabel.split(" / ")[0].trim());
};

export const makeCloudTags = (post) => {
  const tags = [];
  const mainPlace = post.place ? post.place.split(" - ")[0] : "";
  const hairParts = (post.hair_feature || "")
    .split(" / ")
    .map((item) => item.trim())
    .filter((item) => item && item !== "잘 모르겠음");

  const topText = getPostTopText(post);
  const bottomText = getPostBottomText(post);
  const bagText = getAccessoryValue(post, "가방");
  const moodText = getAccessoryValue(post, "분위기");

  if (mainPlace) tags.push(mainPlace);
  if (post.time_period) tags.push(post.time_period);
  hairParts.slice(0, 2).forEach((item) => tags.push(item));
  if (topText && topText !== "-") tags.push(topText);
  if (bottomText && bottomText !== "-") tags.push(bottomText);
  if (bagText && bagText !== "잘 모르겠음") tags.push(bagText);
  if (moodText && moodText !== "잘 모르겠음") tags.push(moodText);

  return [...new Set(tags)].slice(0, 8);
};

export const getWeatherComment = (count) => {
  if (count >= 10) return "구름 폭주 중";
  if (count >= 5) return "구름이 꽤 많아요";
  if (count >= 2) return "구름이 조금 떠 있어요";
  return "작은 구름 하나";
};
