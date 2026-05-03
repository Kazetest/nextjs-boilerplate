import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Step = { stage: string; ok: boolean; detail: string; hint?: string; ms?: number };

export async function POST() {
  const t0 = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const steps: Step[] = [];
  const tick = () => Date.now() - t0;

  // 1. storage 'posts' bucket — list 자기 폴더
  {
    const stageStart = tick();
    try {
      const { data: list, error } = await supabase.storage
        .from("posts")
        .list(user.id, { limit: 1 });
      const ms = tick() - stageStart;
      if (error) {
        steps.push({
          stage: "storage 'posts' bucket",
          ok: false,
          detail: error.message,
          hint: "_full_setup.sql 미적용 또는 bucket 수동 삭제",
          ms,
        });
      } else {
        steps.push({
          stage: "storage 'posts' bucket",
          ok: true,
          detail: `${list?.length ?? 0}개 객체`,
          ms,
        });
      }
    } catch (e) {
      steps.push({
        stage: "storage 'posts' bucket",
        ok: false,
        detail: e instanceof Error ? e.message : "unknown",
        ms: tick() - stageStart,
      });
    }
  }

  // 2. upload probe
  const probePath = `${user.id}/__probe-${Date.now()}.txt`;
  {
    const stageStart = tick();
    try {
      const blob = new Blob(["x"], { type: "text/plain" });
      const { error } = await supabase.storage
        .from("posts")
        .upload(probePath, blob, { contentType: "text/plain", upsert: false });
      const ms = tick() - stageStart;
      if (error) {
        steps.push({
          stage: "storage upload probe",
          ok: false,
          detail: error.message,
          hint: "RLS 'posts storage upload' 확인",
          ms,
        });
      } else {
        steps.push({
          stage: "storage upload probe",
          ok: true,
          detail: "OK (즉시 정리)",
          ms,
        });
        await supabase.storage.from("posts").remove([probePath]);
      }
    } catch (e) {
      steps.push({
        stage: "storage upload probe",
        ok: false,
        detail: e instanceof Error ? e.message : "unknown",
        ms: tick() - stageStart,
      });
    }
  }

  // 3. posts insert probe
  {
    const stageStart = tick();
    try {
      const { data: dummy, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          image_url: "https://probe.invalid/x.jpg",
          image_path: "__probe__",
          caption: "__publish_probe__",
          origin_type: "original",
        })
        .select("id")
        .single();
      const ms = tick() - stageStart;
      if (error) {
        const m = error.message;
        let hint: string | undefined;
        if (/profiles/i.test(m)) hint = "profile row 없음 — /onboarding";
        else if (/hidden_by_reports|report_count/i.test(m))
          hint = "002_moderation 미적용 — _full_setup.sql 재실행";
        else if (/violates row-level security/i.test(m))
          hint = "RLS 거부 — auth.uid() != author_id";
        steps.push({ stage: "posts insert probe", ok: false, detail: m, hint, ms });
      } else if (dummy) {
        steps.push({
          stage: "posts insert probe",
          ok: true,
          detail: `OK id=${dummy.id.slice(0, 8)}…`,
          ms,
        });
        await supabase.from("posts").delete().eq("id", dummy.id);
      }
    } catch (e) {
      steps.push({
        stage: "posts insert probe",
        ok: false,
        detail: e instanceof Error ? e.message : "unknown",
        ms: tick() - stageStart,
      });
    }
  }

  // 4. SightEngine (env 활성 시 1x1 PNG ping, timeout 3초로 짧게)
  const seUser = process.env.SIGHTENGINE_API_USER;
  const seSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!seUser || !seSecret) {
    steps.push({
      stage: "SightEngine env",
      ok: true,
      detail: "비활성 (환경변수 없음 — AI 검사 스킵)",
    });
  } else {
    const stageStart = tick();
    try {
      const tinyPng = Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        ),
        (c) => c.charCodeAt(0)
      );
      const fd = new FormData();
      fd.append("media", new Blob([tinyPng], { type: "image/png" }), "p.png");
      fd.append("models", "genai");
      fd.append("api_user", seUser);
      fd.append("api_secret", seSecret);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch("https://api.sightengine.com/1.0/check.json", {
        method: "POST",
        body: fd,
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
      const ms = tick() - stageStart;
      if (!res.ok) {
        steps.push({
          stage: "SightEngine ping",
          ok: false,
          detail: `${res.status} ${res.statusText}`,
          hint: "API 키 무효 또는 quota 초과 (게시는 fail-open이라 stuck 원인 아님)",
          ms,
        });
      } else {
        steps.push({
          stage: "SightEngine ping",
          ok: true,
          detail: ms > 2500 ? "느림 — Vercel timeout risk" : "OK",
          ms,
        });
      }
    } catch (e) {
      const ms = tick() - stageStart;
      steps.push({
        stage: "SightEngine ping",
        ok: false,
        detail: e instanceof Error ? e.message : "unknown",
        hint: ms >= 2900 ? "3초 timeout — SightEngine 응답 hang" : "외부 도달 실패",
        ms,
      });
    }
  }

  return NextResponse.json({
    ok: steps.every((s) => s.ok),
    totalMs: tick(),
    steps,
  });
}
