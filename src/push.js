import { Capacitor } from "@capacitor/core";

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

let initialized = false;

const loadOneSignal = async () => {
  const mod = await import("onesignal-cordova-plugin");
  const candidates = [mod?.default?.default, mod?.default, mod];
  const found = candidates.find((c) => c && typeof c.initialize === "function");
  console.log(
    "[push] OneSignal 모듈 후보:",
    candidates.map((c) => typeof c?.initialize)
  );
  return found;
};

export const initPush = async () => {
  console.log("[push] initPush 호출됨. isNativePlatform:", Capacitor.isNativePlatform());
  if (!Capacitor.isNativePlatform() || initialized) return;
  if (!ONESIGNAL_APP_ID) {
    console.log("[push] VITE_ONESIGNAL_APP_ID가 설정되지 않아 푸시 알림을 건너뜁니다.");
    return;
  }

  try {
    console.log("[push] OneSignal App ID:", ONESIGNAL_APP_ID);
    const OneSignal = await loadOneSignal();
    if (!OneSignal) {
      console.log("[push] OneSignal 인스턴스를 찾지 못했어요.");
      return;
    }
    OneSignal.initialize(ONESIGNAL_APP_ID);
    console.log("[push] OneSignal.initialize 호출 완료");
    const accepted = await OneSignal.Notifications.requestPermission(true);
    console.log("[push] requestPermission 결과:", accepted);
    initialized = true;
  } catch (err) {
    console.log("[push] 초기화 중 에러:", err?.message || err);
  }
};

export const linkPushUser = async (userId) => {
  if (!Capacitor.isNativePlatform() || !initialized || !userId) return;
  const OneSignal = await loadOneSignal();
  OneSignal?.login(String(userId));
};

export const unlinkPushUser = async () => {
  if (!Capacitor.isNativePlatform() || !initialized) return;
  const OneSignal = await loadOneSignal();
  OneSignal?.logout();
};
