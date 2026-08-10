import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

export function ChatRoom({ roomId, currentUserId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

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

  return (
    <div className="card chatRoomCard">
      <div className="manageHeaderRow">
        <h2>채팅</h2>
        <button type="button" className="dismissTextButton" onClick={onClose}>
          닫기
        </button>
      </div>

      {loading && <p className="notice">불러오는 중이에요...</p>}

      <div className="chatMessageList">
        {!loading && messages.length === 0 && (
          <p className="notice">아직 메시지가 없어요. 먼저 인사해보세요!</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender_user_id === currentUserId
                ? "chatBubble mine"
                : "chatBubble theirs"
            }
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chatInputRow">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="메시지를 입력하세요"
        />
        <button type="button" onClick={sendMessage} disabled={sending}>
          보내기
        </button>
      </div>
    </div>
  );
}
