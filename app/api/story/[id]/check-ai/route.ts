import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectAIImage } from "@/lib/sightengine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoryForCheck = {
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
  if (!process.env.SIGHTENGINE_API_USER || !process.env.SIGHTENGINE_API_SECRET) {
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

  const { data: story, error: storyError } = await db
    .from("stories")
    .select("id, author_id, image_path, ai_score, hidden_by_reports")
    .eq("id", id)
    .maybeSingle<StoryForCheck>();

  if (storyError) {
    return NextResponse.json({ error: storyError.message }, { status: 500 });
  }
  if (!story) {
    return NextResponse.json({ error: "story not found" }, { status: 404 });
  }
  if (story.ai_score !== null) {
    return NextResponse.json({ ok: true, skipped: "already_checked" });
  }
  if (!story.image_path) {
    return NextResponse.json({ error: "image_path missing" }, { status: 400 });
  }
  if (!admin && story.author_id !== user.id) {
    return NextResponse.json({
      ok: true,
      skipped: "service_role_missing_for_non_author",
    });
  }

  const { data: image, error: downloadError } = await db.storage
    .from("stories")
    .download(story.image_path);

  if (downloadError || !image) {
    return NextResponse.json(
      { error: downloadError?.message ?? "download failed" },
      { status: 502 }
    );
  }

  const filename = story.image_path.split("/").pop() || "story-image.jpg";
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
    .from("stories")
    .update(patch)
    .eq("id", story.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    score: result.score,
    isAI: !!result.isAI,
  });
}
