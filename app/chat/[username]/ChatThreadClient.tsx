"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCheck, Send, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { HumanAvatar } from "@/components/HumanAvatar";
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
  otherDisplayName,
  otherAvatarUrl,
  initialMessages,
}: {
  meId: string;
  otherId: string;
  otherUsername: string;
  otherDisplayName: string | null;
  otherAvatarUrl: string | null;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTsRef = useRef<string>(
    initialMessages.length > 0
      ? initialMessages[initialMessages.length - 1].created_at
      : new Date(0).toISOString()
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // 5초 폴링 — interval은 한 번만 생성 (deps에 messages 넣지 않음)
  useEffect(() => {
    const supabase = createClient();

    async function tick() {
      try {
        const { data } = await supabase
          .from("messages")
          .select("id, sender_id, body, created_at, read")
          .or(
            `and(sender_id.eq.${meId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${meId})`
          )
          .gt("created_at", lastTsRef.current)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          lastTsRef.current = data[data.length - 1].created_at;
          setMessages((prev) => {
            const existing = new Set(prev.map((m) => m.id));
            const additions = data.filter((m) => !existing.has(m.id));
            return additions.length > 0 ? [...prev, ...additions] : prev;
          });

          await supabase
            .from("messages")
            .update({ read: true })
            .eq("recipient_id", meId)
            .eq("sender_id", otherId)
            .eq("read", false);
        }
      } catch {
        /* swallow polling errors so the interval keeps ticking */
      }
    }

    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [meId, otherId]);

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
        className="flex-1 space-y-3 overflow-y-auto px-4 py-5"
        style={{ maxHeight: "calc(100vh - 230px)" }}
      >
        {messages.length === 0 ? (
          <div className="mx-auto max-w-sm border border-line bg-bg-card px-6 py-10 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center border border-line bg-bg text-ink-soft">
              <ShieldCheck size={20} />
            </div>
            <p className="font-serif text-lg text-ink">첫 메시지를 보내보세요</p>
            <p className="mt-2 font-serif text-sm leading-relaxed text-ink-soft">
              NOai의 대화는 관계를 만들기 위한 공간입니다.
            </p>
          </div>
        ) : (
          messages.map((m, index) => {
            const mine = m.sender_id === meId;
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const showDate =
              !previous || !isSameDay(previous.created_at, m.created_at);
            const groupedWithPrevious =
              !!previous &&
              previous.sender_id === m.sender_id &&
              isSameDay(previous.created_at, m.created_at);
            const showAvatar = !mine && !groupedWithPrevious;
            const showRead = mine && (!next || next.sender_id !== meId);

            return (
              <div key={m.id} className="space-y-3">
                {showDate && (
                  <div className="flex justify-center">
                    <span className="border border-line bg-bg-card px-2 py-1 font-sans text-[11px] text-ink-faint">
                      {formatDateLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex items-end gap-2 ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  {!mine && (
                    <div className="w-10 shrink-0">
                      {showAvatar && (
                        <HumanAvatar
                          username={otherUsername}
                          avatarUrl={otherAvatarUrl}
                          size="sm"
                        />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-3 py-2 font-serif text-sm whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-ink text-bg rounded-l-lg rounded-tr-lg"
                        : "bg-bg-card border border-line rounded-r-lg rounded-tl-lg"
                    } ${groupedWithPrevious ? "mt-[-6px]" : ""}`}
                  >
                    {!mine && showAvatar && (
                      <div className="mb-1 font-sans text-[11px] text-ink-faint">
                        {otherDisplayName || `@${otherUsername}`}
                      </div>
                    )}
                    {m.body}
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 font-sans text-[10px] ${
                        mine ? "text-bg/60" : "text-ink-faint"
                      }`}
                    >
                      {showRead && m.read && <CheckCheck size={12} />}
                      <span>{formatTime(m.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 grid grid-cols-[1fr_auto] gap-2 border-t border-line bg-bg/95 px-3 py-3 backdrop-blur"
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="메시지 입력 (직접 타이핑하세요)"
          maxLength={1000}
          className="min-w-0 border border-line bg-bg-card px-3 py-2 font-serif text-sm outline-none transition-colors focus:border-ink"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="grid h-10 w-10 place-items-center bg-ink text-bg transition-colors hover:bg-ink-soft disabled:opacity-40"
          aria-label="메시지 보내기"
        >
          <Send size={16} />
        </button>
      </form>

      {error && (
        <p className="text-xs text-warn text-center pb-2 font-serif">
          {error}
        </p>
      )}
    </>
  );
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
