import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { ChevronLeftIcon, PaperPlaneIcon } from "./Icons";
import { formatChatBubbleTime, formatChatDateDivider, isSameChatDay } from "../utils";

export function ChatRoom({ roomId, currentUserId, otherNickname, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

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
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_room_id", roomId)
        .order("created_at", { ascending: true });

      if (!mounted) return;

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

  const sendMessage = async () => {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    setInput("");

    const { error } = await supabase
      .from("chat_messages")
      .insert([{ chat_room_id: roomId, sender_user_id: currentUserId, body }]);

    if (error) {
      console.log(error);
    }
    setSending(false);
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
        <div ref={bottomRef} />
      </div>

      <div className="chatRoomInputBar">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
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
    </div>
  );
}
