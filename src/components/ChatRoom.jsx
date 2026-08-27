import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../supabase";
import { ChevronLeftIcon, PaperPlaneIcon, TrashIcon } from "./Icons";
import {
  formatChatBubbleTime,
  formatChatDateDivider,
  formatChatRoomRemaining,
  isChatRoomExpired,
  isSameChatDay,
} from "../utils";

export function ChatRoom({ roomId, currentUserId, otherNickname, onClose, onDeleted }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [instagramChoice, setInstagramChoice] = useState(null);
  const [instagramSubmitting, setInstagramSubmitting] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
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
    if (!body || sending || isExpired) return;

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

  const deleteEndedChatRoom = async () => {
    if (!roomId || deletingRoom) return;
    const ok = window.confirm("이 종료된 채팅방을 내 목록에서 삭제할까요? 상대방 목록에서는 사라지지 않아요.");
    if (!ok) return;

    setDeletingRoom(true);
    const { error } = await supabase.rpc("delete_my_chat_room_view", {
      p_room_id: roomId,
    });

    if (error) {
      console.log(error);
      toast.error(error.message || "채팅방 삭제에 실패했어요.");
      setDeletingRoom(false);
      return;
    }

    toast.success("내 채팅 목록에서 삭제했어요.");
    onDeleted?.();
  };

  const renderInstagramConsentPanel = () => {
    if (!isExpired || !roomInfo) return null;

    let statusText = "선택 후 확인을 누르면 상대의 선택이 끝날 때까지 기다려요.";
    if (myInstagramConsent !== null && myInstagramConsent !== undefined && !bothChoseInstagram) {
      statusText = "상대의 선택을 기다리고 있어요.";
    } else if (bothChoseInstagram && instagramRevealed) {
      statusText = "서로의 인스타가 공개됐어요. 아래 메시지에서 확인할 수 있어요.";
    } else if (bothChoseInstagram) {
      statusText = "서로의 인스타가 공개되지 않았어요.";
    }

    return (
      <div className="chatInstagramPanel">
        <div className="chatInstagramPanelHeader">
          <span className="chatInstagramCloud" aria-hidden="true">☁️</span>
          <div>
            <b>서로의 인스타 아이디를 공개하시겠습니까?</b>
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
                Yes
              </button>
              <button
                type="button"
                className={instagramChoice === false ? "selected" : ""}
                onClick={() => setInstagramChoice(false)}
              >
                No
              </button>
            </div>
            <button
              type="button"
              className="chatInstagramConfirmBtn"
              onClick={submitInstagramConsent}
              disabled={instagramChoice === null || instagramSubmitting}
            >
              {instagramSubmitting ? "저장 중..." : "확인"}
            </button>
          </>
        )}

        <button
          type="button"
          className="chatRoomDeleteBtn"
          onClick={deleteEndedChatRoom}
          disabled={deletingRoom}
        >
          <TrashIcon size={18} />
          {deletingRoom ? "삭제 중..." : "이 채팅방 삭제하기"}
        </button>
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
          <span className="chatRoomHeaderName">{otherNickname || "상대"}</span>
          {roomInfo && (
            <span className="chatRoomHeaderStatus">
              {formatChatRoomRemaining(roomInfo.created_at, roomInfo.closed_at, now)}
            </span>
          )}
        </div>
        <div className="chatRoomHeaderSpacer" aria-hidden="true" />
      </div>

      <div className="chatRoomMessages">
        {loading && <p className="notice">불러오는 중이에요...</p>}

        {!loading && messages.length === 0 && (
          <div className="chatEmptyState">
            <span className="chatEmptyIcon">💬</span>
            <p>아직 메시지가 없어요.</p>
            <p className="helperText">먼저 인사를 건네보세요!</p>
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
                style={{ marginTop: isNewGroup ? 14 : 2 }}
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
          24시간이 지나 채팅방이 종료됐어요. 더 이상 메시지를 보낼 수 없어요.
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
