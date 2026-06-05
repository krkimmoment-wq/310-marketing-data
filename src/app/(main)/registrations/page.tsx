import { createClient } from "@/lib/supabase/server";
import RegForm from "./RegForm";
import RegList from "./RegList";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", "14기").single();
  const { data: regs } = await sb
    .from("registrations")
    .select("*")
    .eq("cohort_id", cohort?.id)
    .order("reg_date", { ascending: true });

  const list = regs ?? [];

  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">📝 14기 등록 관리</h1>

      <RegForm cohortId={cohort?.id} />

      <RegList regs={list} />
    </div>
  );
}
