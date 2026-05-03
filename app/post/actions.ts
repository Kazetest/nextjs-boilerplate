"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReportReason =
  | "ai_suspect"
  | "origin_missing"
  | "spam_hate"
  | "other";

export type ActionResult = { error?: string; ok?: boolean };

export async function reportPost(
  postId: string,
  reason: ReportReason,
  detail?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { error } = await supabase.from("reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason,
    detail: detail ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 신고한 게시물입니다" };
    }
    return { error: error.message };
  }

  revalidatePath("/feed");
  return { ok: true };
}

export async function blockUser(blockedId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };
  if (user.id === blockedId) return { error: "본인은 차단할 수 없습니다" };

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });

  if (error) {
    if (error.code === "23505") return { ok: true }; // 이미 차단함 — 무시
    return { error: error.message };
  }

  revalidatePath("/feed");
  return { ok: true };
}

export async function unblockUser(blockedId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  if (error) return { error: error.message };
  revalidatePath("/feed");
  return { ok: true };
}
