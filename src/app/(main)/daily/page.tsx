import { getDayTable } from "@/lib/dayTable";
import DayTable from "@/components/DayTable";
import DayCohortPicker from "@/components/DayCohortPicker";
import VideoRankPanel from "@/components/VideoRankPanel";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function DailyPage({ searchParams }: { searchParams: Promise<{ cohorts?: string }> }) {
  const { cohorts } = await searchParams;
  const names = cohorts?.split(",").map((s) => s.trim()).filter(Boolean);
  const { data, all, chosen, ranks } = await getDayTable(names);

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon mb-4">🧮 기수 × Day 비교</h1>
      <DayCohortPicker all={all} chosen={chosen} />
      <DayTable data={data} />
      <VideoRankPanel ranks={ranks} />
    </div>
  );
}
