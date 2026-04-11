import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
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
  { to: "/analytics", icon: BarChart3, label: "Анализ" },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/75 dark:bg-[#161622]/85 backdrop-blur-2xl border-t border-white/50 dark:border-white/[0.06] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      style={{
        WebkitBackdropFilter: "blur(24px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <nav className="flex items-center justify-around max-w-lg mx-auto px-2 py-1.5">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-col items-center justify-center min-w-[3.5rem] py-1.5 px-2 rounded-xl"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary-500/12 dark:bg-primary-500/20 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 relative z-10 transition-colors duration-200",
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-400 dark:text-gray-500",
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={cn(
                  "text-xs font-medium relative z-10 mt-0.5 transition-colors duration-200",
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-400 dark:text-gray-500",
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
