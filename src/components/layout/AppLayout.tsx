import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d14] flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
