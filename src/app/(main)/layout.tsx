import Sidebar from "@/components/Sidebar";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* 배경·패딩은 각 페이지가 직접 결정 (대시보드=다크 / 입력=밝게) */}
      <main className="flex-1 overflow-x-auto min-w-0">{children}</main>
    </div>
  );
}
