// DB 트리거(2026_08_29_push_notification_triggers.sql)가 호출하는 웹훅.
// claims/chat_messages 변화를 받아서 OneSignal로 푸시 알림을 보냅니다.
// Supabase 대시보드 Edge Functions에서 아래 시크릿을 설정한 뒤 배포하세요:
//   supabase secrets set ONESIGNAL_APP_ID=... ONESIGNAL_REST_API_KEY=... PUSH_WEBHOOK_SECRET=...
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY는 Edge Function에 자동으로 주입됩니다.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const sendOneSignalPush = async (externalUserId: string, title: string, body: string) => {
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

  if (!appId || !apiKey) {
    console.log("OneSignal 시크릿이 설정되지 않아 푸시를 건너뜁니다.");
    return { skipped: "no_secrets" };
  }

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_aliases: { external_id: [externalUserId] },
      target_channel: "push",
      headings: { en: title, ko: title },
      contents: { en: body, ko: body },
    }),
  });

  const resBody = await res.text();
  if (!res.ok) {
    console.log("OneSignal 요청 실패", res.status, resBody);
  }
  return { oneSignalStatus: res.status, oneSignalResponse: resBody };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, reason: "POST 요청만 지원해요." }, 405);
  }

  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== Deno.env.get("PUSH_WEBHOOK_SECRET")) {
    return jsonResponse({ ok: false, reason: "인증 실패." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, reason: "Supabase 설정이 없어요." }, 500);
  }

  const restHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  try {
    const { type, record } = await req.json();
    let pushResult: Record<string, unknown> | null = null;

    if (type === "new_claim") {
      const postRes = await fetch(
        `${supabaseUrl}/rest/v1/crush_posts?id=eq.${record.crush_post_id}&select=sender_user_id`,
        { headers: restHeaders }
      );
      const [post] = await postRes.json();
      if (post?.sender_user_id) {
        pushResult = await sendOneSignalPush(
          post.sender_user_id,
          "새 구름 응답이 왔어요 ☁️",
          "누군가 내 구름에 응답했어요. 확인해보세요!"
        );
      } else {
        pushResult = { skipped: "no_sender_user_id" };
      }
    } else if (type === "claim_accepted") {
      if (record.claimer_user_id) {
        pushResult = await sendOneSignalPush(
          record.claimer_user_id,
          "응답이 수락됐어요 🎉",
          "채팅을 시작할 수 있어요!"
        );
      } else {
        pushResult = { skipped: "no_claimer_user_id" };
      }
    } else if (type === "new_message") {
      const roomRes = await fetch(
        `${supabaseUrl}/rest/v1/chat_rooms?id=eq.${record.chat_room_id}&select=sender_user_id,claimer_user_id,crush_post_id,claim_id`,
        { headers: restHeaders }
      );
      const [room] = await roomRes.json();
      if (room) {
        const targetUserId =
          room.sender_user_id === record.sender_user_id
            ? room.claimer_user_id
            : room.sender_user_id;
        if (targetUserId) {
          let senderNickname = "새 메시지가 도착했어요 💬";
          if (record.sender_user_id === room.sender_user_id) {
            const postRes = await fetch(
              `${supabaseUrl}/rest/v1/crush_posts?id=eq.${room.crush_post_id}&select=sender_nickname`,
              { headers: restHeaders }
            );
            const [post] = await postRes.json();
            if (post?.sender_nickname) senderNickname = post.sender_nickname;
          } else {
            const claimRes = await fetch(
              `${supabaseUrl}/rest/v1/claims?id=eq.${room.claim_id}&select=claimer_nickname`,
              { headers: restHeaders }
            );
            const [claim] = await claimRes.json();
            if (claim?.claimer_nickname) senderNickname = claim.claimer_nickname;
          }

          const preview =
            typeof record.body === "string" && record.body.length > 60
              ? `${record.body.slice(0, 60)}...`
              : record.body;
          pushResult = await sendOneSignalPush(targetUserId, senderNickname, preview || "");
        } else {
          pushResult = { skipped: "no_target_user_id" };
        }
      } else {
        pushResult = { skipped: "chat_room_not_found" };
      }
    }

    return jsonResponse({ ok: true, type, pushResult });
  } catch (err) {
    console.log(err);
    return jsonResponse({ ok: false, reason: "처리 중 오류가 발생했어요." }, 500);
  }
});
