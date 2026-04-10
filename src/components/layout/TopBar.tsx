import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import { ChevronLeft, User } from "lucide-react";
import { cn } from "../../lib/utils";

interface TopBarProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function TopBar({ title, showBack, right }: TopBarProps) {
  const navigate = useNavigate();
  const activeUser = useAppStore((s) => s.getActiveUser());

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#161622]/90 backdrop-blur-md border-b border-gray-100 dark:border-[#27273a]">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#27273a] transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <button
            onClick={() => navigate("/users")}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-xl overflow-hidden transition-all",
              activeUser
                ? "bg-primary-500 text-white"
                : "bg-gray-100 dark:bg-[#27273a] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333346]",
            )}
          >
            {activeUser?.avatar ? (
              <img
                src={activeUser.avatar}
                alt={activeUser.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
