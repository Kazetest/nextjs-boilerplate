import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="font-serif text-xl tracking-tight">
            NOai
          </Link>
          <span className="text-sm text-ink-soft font-serif">새 글</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 w-full text-center">
        <p className="font-serif text-2xl text-ink mb-4">곧 도착합니다</p>
        <p className="text-sm text-ink-soft font-serif">
          카메라 + 키스트로크 캡션 + 원작 태그 — Day 2 작업.
        </p>
      </main>
    </div>
  );
}
