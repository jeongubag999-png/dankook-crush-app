import { Capacitor } from "@capacitor/core";

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

let oneSignalInstance = null;
let initPromise = null;

const loadOneSignal = async () => {
  if (oneSignalInstance) return oneSignalInstance;
  const mod = await import("onesignal-cordova-plugin");
  const candidates = [mod?.default?.default, mod?.default, mod];
  oneSignalInstance = candidates.find((c) => c && typeof c.initialize === "function") || null;
  return oneSignalInstance;
};

// initPush()와 linkPushUser/unlinkPushUser는 서로 다른 useEffect에서 독립적으로
// 트리거된다. initPush의 비동기 초기화(권한 요청 포함)가 끝나기 전에 currentUser가
// 먼저 resolve되면 링크가 조용히 스킵되던 문제가 있어, 초기화 진행 상태를
// 하나의 Promise로 공유해 링크/언링크가 항상 그 완료를 기다리도록 한다.
const ensureInit = () => {
  if (!Capacitor.isNativePlatform() || !ONESIGNAL_APP_ID) return Promise.resolve(false);
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const OneSignal = await loadOneSignal();
        if (!OneSignal) {
          initPromise = null;
          return false;
        }
        OneSignal.initialize(ONESIGNAL_APP_ID);
        await OneSignal.Notifications.requestPermission(true);
        return true;
      } catch (err) {
        console.log("[push] 초기화 중 에러:", err?.message || err);
        initPromise = null;
        return false;
      }
    })();
  }
  return initPromise;
};

export const initPush = () => {
  ensureInit();
};

export const linkPushUser = async (userId) => {
  if (!userId) return;
  const ready = await ensureInit();
  if (!ready) return;
  const OneSignal = await loadOneSignal();
  OneSignal?.login(String(userId));
};

export const unlinkPushUser = async () => {
  const ready = await ensureInit();
  if (!ready) return;
  const OneSignal = await loadOneSignal();
  OneSignal?.logout();
};
