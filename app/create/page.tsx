import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateClient from "./CreateClient";

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
      <CreateClient />
    </div>
  );
}
