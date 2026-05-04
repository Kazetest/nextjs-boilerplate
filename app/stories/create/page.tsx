import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StoryCreateClient } from "./StoryCreateClient";

export const dynamic = "force-dynamic";

export default async function StoryCreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <StoryCreateClient />;
}
