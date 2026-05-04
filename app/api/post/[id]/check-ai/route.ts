import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectAIImage } from "@/lib/sightengine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostForCheck = {
  id: string;
  author_id: string;
  image_path: string | null;
  ai_score: number | null;
  hidden_by_reports: boolean | null;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!apiUser || !apiSecret) {
    return NextResponse.json({ ok: true, skipped: "sightengine_disabled" });
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const db = admin ?? supabase;

  const { data: post, error: postError } = await db
    .from("posts")
    .select("id, author_id, image_path, ai_score, hidden_by_reports")
    .eq("id", id)
    .maybeSingle<PostForCheck>();

  if (postError) {
    return NextResponse.json(
      { error: postError.message },
      { status: 500 }
    );
  }
  if (!post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }
  if (post.ai_score !== null) {
    return NextResponse.json({ ok: true, skipped: "already_checked" });
  }
  if (!post.image_path) {
    return NextResponse.json({ error: "image_path missing" }, { status: 400 });
  }
  if (!admin && post.author_id !== user.id) {
    return NextResponse.json({
      ok: true,
      skipped: "service_role_missing_for_non_author",
    });
  }

  const { data: image, error: downloadError } = await db.storage
    .from("posts")
    .download(post.image_path);

  if (downloadError || !image) {
    return NextResponse.json(
      { error: downloadError?.message ?? "download failed" },
      { status: 502 }
    );
  }

  const filename = post.image_path.split("/").pop() || "post-image.jpg";
  const result = await detectAIImage(image, filename);

  if (!result.enabled) {
    return NextResponse.json({ ok: true, skipped: "sightengine_disabled" });
  }
  if (result.error || typeof result.score !== "number") {
    return NextResponse.json({
      ok: false,
      error: result.error ?? "score missing",
    });
  }

  const patch: Record<string, unknown> = { ai_score: result.score };
  if (result.isAI) patch.hidden_by_reports = true;

  const { error: updateError } = await db
    .from("posts")
    .update(patch)
    .eq("id", post.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    score: result.score,
    isAI: !!result.isAI,
  });
}
