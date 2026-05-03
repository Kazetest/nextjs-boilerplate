"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "../actions";

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read: boolean;
};

export function ChatThreadClient({
  meId,
  otherId,
  otherUsername,
  initialMessages,
}: {
  meId: string;
  otherId: string;
  otherUsername: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // 5초 폴링으로 새 메시지 가져오기 (realtime 없이 가벼운 MVP)
  useEffect(() => {
    const supabase = createClient();

    const interval = setInterval(async () => {
      const lastTs =
        messages.length > 0
          ? messages[messages.length - 1].created_at
          : new Date(0).toISOString();

      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at, read")
        .or(
          `and(sender_id.eq.${meId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${meId})`
        )
        .gt("created_at", lastTs)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const additions = data.filter((m) => !existing.has(m.id));
          return [...prev, ...additions];
        });

        await supabase
          .from("messages")
          .update({ read: true })
          .eq("recipient_id", meId)
          .eq("sender_id", otherId)
          .eq("read", false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [meId, otherId, messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;

    setSending(true);
    setError(null);

    const optimistic: Msg = {
      id: `optimistic-${Date.now()}`,
      sender_id: meId,
      body: body.trim(),
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    const sentBody = body;
    setBody("");

    const r = await sendMessage({
      recipientUsername: otherUsername,
      body: sentBody,
    });

    if (r?.error) {
      setError(r.error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(sentBody);
    }
    setSending(false);
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ maxHeight: "calc(100vh - 240px)" }}
      >
        {messages.length === 0 ? (
          <p className="text-center text-ink-soft text-sm font-serif py-10">
            첫 메시지를 보내보세요.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 font-serif text-sm whitespace-pre-wrap break-words ${
                    mine
                      ? "bg-ink text-bg rounded-l-lg rounded-tr-lg"
                      : "bg-bg-card border border-line rounded-r-lg rounded-tl-lg"
                  }`}
                >
                  {m.body}
                  <div
                    className={`text-[10px] mt-1 font-sans ${
                      mine ? "text-bg/60" : "text-ink-faint"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 bg-bg border-t border-line px-3 py-3 flex gap-2"
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="메시지 입력 (직접 타이핑하세요)"
          maxLength={1000}
          className="flex-1 px-3 py-2 bg-bg-card border border-line focus:border-ink outline-none font-serif text-sm"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="px-4 py-2 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 transition-colors font-serif text-sm"
        >
          {sending ? "..." : "보내기"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-warn text-center pb-2 font-serif">
          ⚠ {error}
        </p>
      )}
    </>
  );
}
