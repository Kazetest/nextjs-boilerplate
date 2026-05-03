"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SendResult = { error?: string; ok?: boolean };

export async function sendMessage({
  recipientUsername,
  body,
}: {
  recipientUsername: string;
  body: string;
}): Promise<SendResult> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "메시지를 입력해주세요" };
  if (trimmed.length > 1000) return { error: "1000자 이하로 작성해주세요" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const cleaned = recipientUsername.replace(/^@/, "").toLowerCase().trim();
  const { data: recipient } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", cleaned)
    .maybeSingle();
  if (!recipient) return { error: "상대방을 찾을 수 없습니다" };
  if (recipient.id === user.id) return { error: "자기 자신에게는 보낼 수 없어요" };

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    recipient_id: recipient.id,
    body: trimmed,
  });
  if (error) {
    if (error.message.includes("blocks") || error.code === "42501")
      return { error: "차단된 사용자에게는 보낼 수 없습니다" };
    return { error: error.message };
  }

  revalidatePath(`/chat/${cleaned}`);
  revalidatePath("/chat");
  return { ok: true };
}

export async function markThreadRead(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("recipient_id", user.id)
    .eq("sender_id", otherUserId)
    .eq("read", false);

  revalidatePath("/chat");
}

export async function startChat(formData: FormData) {
  const username = (formData.get("username") as string) || "";
  const cleaned = username.replace(/^@/, "").toLowerCase().trim();
  if (!cleaned) return;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", cleaned)
    .maybeSingle();
  if (!target) return;

  redirect(`/chat/${target.username}`);
}
