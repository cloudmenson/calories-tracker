import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function AppLayout() {
  const { pathname } = useLocation();
  const isChatPage = pathname === "/chat";

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-[#0d0d14] flex flex-col max-w-lg mx-auto relative overflow-x-hidden">
      {isChatPage ? (
        <Outlet />
      ) : (
        <main
          className="flex-1"
          style={{
            paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      )}
      {!isChatPage && <BottomNav />}
    </div>
  );
}
