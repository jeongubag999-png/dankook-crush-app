import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../supabase";
import { ChevronLeftIcon, DoorExitIcon, PaperPlaneIcon } from "./Icons";
import {
  formatChatBubbleTime,
  formatChatDateDivider,
  formatChatRoomRemaining,
  isChatRoomExpired,
  isSameChatDay,
} from "../utils";

export function ChatRoom({ roomId, currentUserId, otherNickname, onClose, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [instagramChoice, setInstagramChoice] = useState(null);
  const [instagramSubmitting, setInstagramSubmitting] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const bottomRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.classList.add("chatRoomOpen");
    return () => {
      document.body.classList.remove("chatRoomOpen");
    };
  }, []);

  useEffect(() => {
    let channel;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const [{ data: room, error: roomError }, { data, error }] = await Promise.all([
        supabase
          .from("chat_rooms")
          .select(
            "id, created_at, closed_at, sender_user_id, claimer_user_id, sender_instagram_consent, claimer_instagram_consent, instagram_revealed_at, sender_deleted_at, claimer_deleted_at"
          )
          .eq("id", roomId)
          .maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("chat_room_id", roomId)
          .order("created_at", { ascending: true }),
      ]);

      if (!mounted) return;

      if (roomError) {
        console.log(roomError);
        toast.error("채팅방 정보를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.");
      } else {
        setRoomInfo(room);
      }

      if (error) {
        console.log(error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    load();

    channel = supabase
      .channel(`chat_room_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoomInfo(payload.new);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const scrollToBottom = () => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    viewport.addEventListener("resize", scrollToBottom);
    return () => viewport.removeEventListener("resize", scrollToBottom);
  }, []);

  const isExpired = isChatRoomExpired(roomInfo?.created_at, roomInfo?.closed_at, now);
  const isSender = roomInfo?.sender_user_id === currentUserId;
  const myInstagramConsent = isSender
    ? roomInfo?.sender_instagram_consent
    : roomInfo?.claimer_instagram_consent;
  const otherInstagramConsent = isSender
    ? roomInfo?.claimer_instagram_consent
    : roomInfo?.sender_instagram_consent;
  const bothChoseInstagram =
    myInstagramConsent !== null &&
    myInstagramConsent !== undefined &&
    otherInstagramConsent !== null &&
    otherInstagramConsent !== undefined;
  const instagramRevealed =
    bothChoseInstagram && myInstagramConsent === true && otherInstagramConsent === true;

  const sendMessage = async () => {
    const body = input.trim();
    // 방금 만료됐을 수 있으니 60초 주기로만 갱신되는 `isExpired`가 아니라
    // 전송 시점 기준으로 다시 계산해 확인한다.
    if (!body || sending || isChatRoomExpired(roomInfo?.created_at, roomInfo?.closed_at, Date.now())) return;

    setSending(true);

    const { error } = await supabase
      .from("chat_messages")
      .insert([{ chat_room_id: roomId, sender_user_id: currentUserId, body }]);

    if (error) {
      console.log(error);
      toast.error(error.message || "메시지 전송에 실패했어요.");
    } else {
      setInput("");
    }
    setSending(false);
  };

  const submitInstagramConsent = async () => {
    if (!roomId || instagramChoice === null || instagramSubmitting) return;

    setInstagramSubmitting(true);
    const { data, error } = await supabase.rpc("set_chat_instagram_consent", {
      p_room_id: roomId,
      p_consent: instagramChoice,
    });

    if (error) {
      console.log(error);
      toast.error(error.message || "인스타 공개 선택 저장에 실패했어요.");
    } else {
      if (data) setRoomInfo(data);
      setInstagramChoice(null);
      toast.success("선택을 저장했어요.");
    }
    setInstagramSubmitting(false);
  };

  const leaveChatRoom = async () => {
    if (!roomId || leavingRoom || isExpired) return;
    const ok = window.confirm(
      "채팅방을 나가시겠어요? 나가면 채팅방이 바로 종료되고 더 이상 메시지를 보낼 수 없어요."
    );
    if (!ok) return;

    setLeavingRoom(true);
    const { data, error } = await supabase.rpc("close_chat_room", {
      p_room_id: roomId,
    });

    if (error) {
      console.log(error);
      toast.error(error.message || "채팅방 나가기에 실패했어요.");
      setLeavingRoom(false);
      return;
    }

    if (data) setRoomInfo(data);
    toast.success("채팅방을 나갔어요.");
    setLeavingRoom(false);
    onLeave?.();
    onClose?.();
  };

  const renderInstagramConsentPanel = () => {
    if (!isExpired || !roomInfo) return null;

    let statusText = "공개 여부를 선택해 저장하면, 상대도 선택을 마칠 때 결과를 알려드려요.";
    if (myInstagramConsent !== null && myInstagramConsent !== undefined && !bothChoseInstagram) {
      statusText = "내 선택을 저장했어요. 상대가 선택할 때까지 기다려주세요.";
    } else if (bothChoseInstagram && instagramRevealed) {
      statusText = "두 사람 모두 동의해 인스타그램 아이디가 공개됐어요. 아래 안내 메시지에서 확인하세요.";
    } else if (bothChoseInstagram) {
      statusText = "한 사람이라도 동의하지 않아 인스타그램 아이디는 공개되지 않아요.";
    }

    return (
      <div className="chatInstagramPanel">
        <div className="chatInstagramPanelHeader">
          <span className="chatInstagramCloud" aria-hidden="true">☁️</span>
          <div>
            <b>상대에게 내 인스타그램 아이디를 공개할까요?</b>
            <p>{statusText}</p>
          </div>
        </div>

        {(myInstagramConsent === null || myInstagramConsent === undefined) && (
          <>
            <div className="chatInstagramChoiceRow">
              <button
                type="button"
                className={instagramChoice === true ? "selected" : ""}
                onClick={() => setInstagramChoice(true)}
              >
                공개할게요
              </button>
              <button
                type="button"
                className={instagramChoice === false ? "selected" : ""}
                onClick={() => setInstagramChoice(false)}
              >
                공개하지 않을게요
              </button>
            </div>
            <button
              type="button"
              className="chatInstagramConfirmBtn"
              onClick={submitInstagramConsent}
              disabled={instagramChoice === null || instagramSubmitting}
            >
              {instagramSubmitting ? "저장 중..." : "선택 저장하기"}
            </button>
          </>
        )}
      </div>
    );
  };

  const nicknameInitial = (otherNickname || "구").trim().charAt(0) || "구";

  return (
    <div className="chatRoomScreen">
      <div className="chatRoomHeader">
        <button type="button" className="chatRoomBackBtn" onClick={onClose} aria-label="뒤로가기">
          <ChevronLeftIcon size={22} />
        </button>
        <div className="chatRoomHeaderInfo">
          <span className="chatRoomHeaderName" data-i18n-ignore>{otherNickname || "상대"}</span>
          {roomInfo && (
            <span className="chatRoomHeaderStatus">
              {formatChatRoomRemaining(roomInfo.created_at, roomInfo.closed_at, now)}
            </span>
          )}
        </div>
        {isExpired ? (
          <div className="chatRoomHeaderSpacer" aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="chatRoomLeaveBtn"
            onClick={leaveChatRoom}
            disabled={leavingRoom}
            aria-label="채팅방 나가기"
          >
            <DoorExitIcon size={20} />
          </button>
        )}
      </div>

      <div className="chatRoomMessages">
        {loading && <p className="notice">불러오는 중이에요...</p>}

        {!loading && messages.length === 0 && (
          <div className="chatEmptyState">
            <span className="chatEmptyIcon">💬</span>
            <p>아직 주고받은 메시지가 없어요.</p>
            <p className="helperText">부담 없이 짧은 인사부터 보내보세요.</p>
          </div>
        )}

        {messages.map((m, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const isMine = m.sender_user_id === currentUserId;

          const showDateDivider = !prev || !isSameChatDay(prev.created_at, m.created_at);

          const isNewGroup = !prev || prev.sender_user_id !== m.sender_user_id || showDateDivider;
          const showTime =
            !next ||
            next.sender_user_id !== m.sender_user_id ||
            !isSameChatDay(next.created_at, m.created_at) ||
            new Date(next.created_at).getMinutes() !== new Date(m.created_at).getMinutes() ||
            new Date(next.created_at).getHours() !== new Date(m.created_at).getHours();

          return (
            <div key={m.id}>
              {showDateDivider && (
                <div className="chatDateDivider">
                  <span>{formatChatDateDivider(m.created_at)}</span>
                </div>
              )}
              <div
                className={
                  isMine
                    ? "chatMessageRow mine"
                    : "chatMessageRow theirs"
                }
                style={{ marginTop: isNewGroup ? 18 : 6 }}
              >
                {isMine && showTime && (
                  <span className="chatBubbleTime">{formatChatBubbleTime(m.created_at)}</span>
                )}
                {!isMine && (
                  <div className="chatAvatar" aria-hidden="true">
                    {isNewGroup ? nicknameInitial : ""}
                  </div>
                )}
                <div className={isMine ? "chatBubble mine" : "chatBubble theirs"}>
                  {m.body}
                </div>
                {!isMine && showTime && (
                  <span className="chatBubbleTime">{formatChatBubbleTime(m.created_at)}</span>
                )}
              </div>
            </div>
          );
        })}
        {renderInstagramConsentPanel()}
        <div ref={bottomRef} />
      </div>

      {isExpired ? (
        <div className="chatRoomExpiredNotice">
          채팅 시작 후 24시간이 지나 대화가 종료됐어요. 채팅 목록에서 이 방을 삭제할 수 있어요.
        </div>
      ) : (
        <div className="chatRoomInputBar">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            onFocus={() => {
              setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
              }, 300);
            }}
            placeholder="메시지를 입력하세요"
          />
          <button
            type="button"
            className="chatSendBtn"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            aria-label="보내기"
          >
            <PaperPlaneIcon size={19} />
          </button>
        </div>
      )}
    </div>
  );
}
