import { AppHeader } from "@/components/layout/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
