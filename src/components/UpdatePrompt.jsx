import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "../supabase";

const DISMISS_KEY = "dankum:update-dismissed-version";

// "1.6.1" vs "1.10.0" 처럼 자리별 숫자로 비교한다. 문자열 비교는 1.10 < 1.9가 된다.
const compareVersions = (a, b) => {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

const writeDismissed = (version) => {
  try {
    localStorage.setItem(DISMISS_KEY, version);
  } catch {
    // 저장이 안 되면 다음 실행 때 한 번 더 보일 뿐이라 무시한다.
  }
};

// 스토어에 새 버전이 있으면 앱 안에서 업데이트 팝업을 띄운다.
// 버전 정보는 app_release_config 테이블에서 읽는다(웹에서는 동작하지 않음).
export function UpdatePrompt() {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const platform = Capacitor.getPlatform();
    let cancelled = false;
    let listenerHandle;

    const check = async () => {
      try {
        const [{ version: currentVersion }, { data, error }] = await Promise.all([
          CapacitorApp.getInfo(),
          supabase
            .from("app_release_config")
            .select("latest_version, min_version, store_url, title, message")
            .eq("platform", platform)
            .maybeSingle(),
        ]);
        if (cancelled || error || !data || !currentVersion) return;

        const forced = compareVersions(currentVersion, data.min_version) < 0;
        const outdated = compareVersions(currentVersion, data.latest_version) < 0;
        if (!outdated && !forced) {
          setPrompt(null);
          return;
        }
        if (!forced && readDismissed() === data.latest_version) return;

        setPrompt({ ...data, forced });
      } catch (err) {
        console.log("[update] 버전 확인 중 에러:", err?.message || err);
      }
    };

    check();
    // 백그라운드에 오래 있다가 돌아왔을 때도 다시 확인한다.
    CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) check();
    }).then((handle) => {
      if (cancelled) {
        handle.remove();
      } else {
        listenerHandle = handle;
      }
    });

    return () => {
      cancelled = true;
      listenerHandle?.remove();
    };
  }, []);

  if (!prompt) return null;

  const dismiss = () => {
    writeDismissed(prompt.latest_version);
    setPrompt(null);
  };

  return (
    <div className="appGuideBackdrop" role="presentation">
      <section
        className="appGuideDialog updatePromptDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-prompt-title"
      >
        <header className="appGuideHeader">
          <div>
            <span>v{prompt.latest_version} 업데이트</span>
            <h2 id="update-prompt-title">{prompt.title}</h2>
          </div>
        </header>

        <div className="appGuideCopy">
          <p>{prompt.message}</p>
          {prompt.forced && (
            <p className="updatePromptForced">
              이전 버전에서는 일부 기능이 동작하지 않아요. 업데이트 후 이용해주세요.
            </p>
          )}
        </div>

        <div className={`appGuideActions${prompt.forced ? " single" : ""}`}>
          {!prompt.forced && (
            <button type="button" className="white" onClick={dismiss}>
              나중에
            </button>
          )}
          <button type="button" onClick={() => window.open(prompt.store_url, "_blank")}>
            업데이트하기
          </button>
        </div>
      </section>
    </div>
  );
}
