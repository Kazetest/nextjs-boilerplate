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
    if (error.code === "23505") return { ok: true };
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

export async function toggleReaction(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data: existing } = await supabase
    .from("reactions")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("reactions")
      .insert({ user_id: user.id, post_id: postId });
    if (error) return { error: error.message };
  }

  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function addComment(
  postId: string,
  body: string,
  keystrokesJson: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const text = body.trim();
  if (!text) return { error: "내용을 입력하세요" };
  if (text.length > 140) return { error: "댓글은 140자 이하" };

  let parsed;
  try {
    parsed = JSON.parse(keystrokesJson);
    if (!parsed?.strokes || !Array.isArray(parsed.strokes)) {
      return { error: "타이핑 데이터 누락" };
    }
    if (parsed.strokes.length < Math.max(2, text.length * 0.3)) {
      return { error: "타이핑 흔적이 부족합니다" };
    }
    if (parsed.durationMs < text.length * 20) {
      return { error: "타이핑이 너무 빠릅니다" };
    }
  } catch {
    return { error: "키스트로크 데이터 오류" };
  }

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    body: text,
    keystrokes: parsed,
  });

  if (error) return { error: error.message };
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function toggleFollow(targetId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };
  if (user.id === targetId) return { error: "본인은 팔로우 불가" };

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetId });
    if (error) return { error: error.message };
  }

  return { ok: true };
}
