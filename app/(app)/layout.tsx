import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="lg:flex">
        <SideNav />
        <div className="mx-auto min-h-dvh w-full max-w-lg pb-24 lg:mx-0 lg:max-w-none lg:flex-1 lg:pb-0">
          {children}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
