import { BottomNav } from "@/components/BottomNav";
import { CalendarOverlay } from "@/components/CalendarOverlay";
import { CalendarProvider } from "@/components/CalendarProvider";
import { CategoriesProvider } from "@/components/CategoriesProvider";
import { ShoppingListOverlay } from "@/components/ShoppingListOverlay";
import { ShoppingListProvider } from "@/components/ShoppingListProvider";
import { SideNav } from "@/components/SideNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShoppingListProvider>
      <CalendarProvider>
        <CategoriesProvider>
          <div className="lg:flex">
            <SideNav />
            <div className="mx-auto min-h-dvh w-full max-w-lg pb-24 lg:mx-0 lg:max-w-none lg:flex-1 lg:pb-0">
              {children}
            </div>
          </div>
          <BottomNav />
          <CalendarOverlay />
          <ShoppingListOverlay />
        </CategoriesProvider>
      </CalendarProvider>
    </ShoppingListProvider>
  );
}
