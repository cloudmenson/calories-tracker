import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import { ChevronLeft, User } from "lucide-react";
import { cn } from "../../lib/utils";

interface TopBarProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
  transparent?: boolean;
}

export function TopBar({ title, showBack, right, transparent }: TopBarProps) {
  const navigate = useNavigate();
  const activeUser = useAppStore((s) => s.getActiveUser());

  return (
    <header
      className={cn(
        "sticky top-0 z-30 backdrop-blur-xl",
        transparent
          ? "bg-transparent"
          : "bg-white/80 dark:bg-[#161622]/80 border-b border-gray-100/60 dark:border-[#27273a]/60",
      )}
      style={{ WebkitBackdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#27273a] transition-colors -ml-1"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-lg truncate">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          <button
            onClick={() => navigate("/users")}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-full overflow-hidden transition-all ring-2 ring-transparent hover:ring-primary-200 dark:hover:ring-primary-500/30",
              activeUser
                ? "bg-primary-500 text-white"
                : "bg-gray-100 dark:bg-[#27273a] text-gray-500 dark:text-gray-400",
            )}
          >
            {activeUser?.avatar ? (
              <img
                src={activeUser.avatar}
                alt={activeUser.name}
                className="h-full w-full object-cover"
              />
            ) : activeUser ? (
              <span className="text-xs font-bold">
                {activeUser.name[0].toUpperCase()}
              </span>
            ) : (
              <User className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
