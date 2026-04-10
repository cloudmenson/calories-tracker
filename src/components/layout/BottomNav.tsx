import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Refrigerator,
  BarChart3,
  CalendarDays,
  MessageCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Главная" },
  { to: "/diary", icon: CalendarDays, label: "Дневник" },
  { to: "/chat", icon: MessageCircle, label: "AI Чат" },
  { to: "/recipes", icon: BookOpen, label: "Рецепты" },
  { to: "/fridge", icon: Refrigerator, label: "Холодильник" },
  { to: "/analytics", icon: BarChart3, label: "Анализ" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
      <nav
        className="pointer-events-auto flex items-center gap-1 px-3 py-2 rounded-[2rem]
          bg-white/60 dark:bg-[#161622]/80 backdrop-blur-2xl
          border border-white/70 dark:border-white/[0.07]
          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
          dark:shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      >
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-[1.5rem]"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary-500/15 dark:bg-primary-500/20 rounded-[1.5rem]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  "h-[22px] w-[22px] relative z-10 transition-all duration-200",
                  active
                    ? "text-primary-600 drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]"
                    : "text-gray-400/80",
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-semibold tracking-wide relative z-10 transition-colors duration-200",
                  active ? "text-primary-600" : "text-gray-400/70",
                )}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
