import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import {
  sendChatMessage,
  buildAIContext,
  type ChatAction,
  type ChatHistoryItem,
} from "../lib/api";
import { cn, todayStr } from "../lib/utils";
import type { DiaryEntry, FridgeItem, Recipe } from "../types";
import {
  Send,
  Bot,
  Sparkles,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  Flame,
  UtensilsCrossed,
  ShoppingBasket,
  ChefHat,
  Zap,
  User,
  Trash2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: ChatAction[];
  actionStates: Record<number, "pending" | "confirmed" | "dismissed">;
  timestamp: Date;
  setupRequired?: boolean;
}

// ─── Quick suggestion chips ────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    text: "Что мне съесть сегодня?",
    icon: <UtensilsCrossed className="h-3.5 w-3.5" />,
  },
  {
    text: "Анализ питания за сегодня",
    icon: <Flame className="h-3.5 w-3.5" />,
  },
  {
    text: "Рецепт из холодильника",
    icon: <ShoppingBasket className="h-3.5 w-3.5" />,
  },
  { text: "Сколько калорий осталось?", icon: <Zap className="h-3.5 w-3.5" /> },
  {
    text: "Составь план питания на день",
    icon: <ChefHat className="h-3.5 w-3.5" />,
  },
  {
    text: "Как мой прогресс по весу?",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
];

// ─── Action icon map ───────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ReactNode> = {
  ADD_DIARY_ENTRY: <UtensilsCrossed className="h-4 w-4" />,
  ADD_FRIDGE_ITEM: <ShoppingBasket className="h-4 w-4" />,
  ADD_RECIPE: <ChefHat className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  ADD_DIARY_ENTRY:
    "border-green-300/40 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10",
  ADD_FRIDGE_ITEM:
    "border-blue-300/40 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
  ADD_RECIPE:
    "border-purple-300/40 bg-purple-50 dark:border-purple-500/20 dark:bg-purple-500/10",
};

const ACTION_BTN_COLORS: Record<string, string> = {
  ADD_DIARY_ENTRY: "bg-green-500 hover:bg-green-600",
  ADD_FRIDGE_ITEM: "bg-blue-500 hover:bg-blue-600",
  ADD_RECIPE: "bg-purple-500 hover:bg-purple-600",
};

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-md">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="bg-white dark:bg-[var(--surface-2)] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-[var(--border)]">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  action: ChatAction;
  index: number;
  state: "pending" | "confirmed" | "dismissed";
  onConfirm: () => void;
  onDismiss: () => void;
}

function ActionCard({ action, state, onConfirm, onDismiss }: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: state === "dismissed" ? 0.4 : 1, scale: 1, y: 0 }}
      className={cn(
        "mt-2 rounded-xl border p-3 transition-all",
        ACTION_COLORS[action.type] ??
          "border-gray-200 bg-gray-50 dark:border-[var(--border)] dark:bg-[var(--surface)]",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5 text-gray-500 dark:text-gray-400">
          {ACTION_ICONS[action.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {action.label}
          </p>
          {typeof action.data.name === "string" && action.data.name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {action.data.name}
            </p>
          )}
          {action.data.calories !== undefined && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(Number(action.data.calories))} ккал
              {action.data.portionWeight
                ? ` · ${action.data.portionWeight}г`
                : ""}
              {action.data.protein
                ? ` · Б${Number(action.data.protein).toFixed(1)}г`
                : ""}
            </p>
          )}
        </div>

        {state === "pending" && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={onConfirm}
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center text-white transition-all active:scale-95",
                ACTION_BTN_COLORS[action.type] ??
                  "bg-primary-500 hover:bg-primary-600",
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDismiss}
              className="h-7 w-7 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-[var(--surface)] dark:hover:bg-[var(--border)] flex items-center justify-center transition-all active:scale-95"
            >
              <X className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}

        {state === "confirmed" && (
          <div className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        )}

        {state === "dismissed" && (
          <div className="h-7 w-7 rounded-lg bg-gray-200 dark:bg-[var(--surface)] flex items-center justify-center shrink-0">
            <X className="h-3.5 w-3.5 text-gray-400" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  onAction: (
    msgId: string,
    idx: number,
    action: ChatAction,
    confirmed: boolean,
  ) => void;
  userName?: string;
}

function MessageBubble({ message, onAction, userName }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={cn(
        "flex items-end gap-2 mb-4",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-md text-sm font-bold",
          isUser
            ? "bg-primary-500 text-white"
            : "bg-gradient-to-br from-primary-400 to-emerald-600 text-white",
        )}
      >
        {isUser ? (
          userName ? (
            userName[0].toUpperCase()
          ) : (
            <User className="h-4 w-4" />
          )
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[78%]",
          isUser ? "items-end" : "items-start",
          "flex flex-col",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "px-4 py-3 shadow-sm",
            isUser
              ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl rounded-br-sm"
              : "bg-white dark:bg-[var(--surface-2)] border border-gray-100 dark:border-[var(--border)] text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm",
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.text}
            </p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="my-1 text-gray-900 dark:text-gray-100">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700 dark:text-gray-300">
                      {children}
                    </em>
                  ),
                  ul: ({ children }) => (
                    <ul className="ml-4 space-y-0.5 list-disc">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="ml-4 space-y-0.5 list-decimal">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-800 dark:text-gray-200">
                      {children}
                    </li>
                  ),
                  h1: ({ children }) => (
                    <p className="font-bold text-gray-900 dark:text-white">
                      {children}
                    </p>
                  ),
                  h2: ({ children }) => (
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {children}
                    </p>
                  ),
                  h3: ({ children }) => (
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {children}
                    </p>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 dark:text-primary-400 underline"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 dark:bg-[var(--surface)] text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p
          className={cn(
            "text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1",
            isUser ? "text-right" : "text-left",
          )}
        >
          {message.timestamp.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* Action cards */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="w-full space-y-1">
            {message.actions.map((action, idx) => (
              <ActionCard
                key={idx}
                action={action}
                index={idx}
                state={message.actionStates[idx] ?? "pending"}
                onConfirm={() => onAction(message.id, idx, action, true)}
                onDismiss={() => onAction(message.id, idx, action, false)}
              />
            ))}
          </div>
        )}

        {/* Setup required hint */}
        {message.setupRequired && (
          <div className="mt-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">🔑 Нужен API ключ</p>
            <p>Gemini API — полностью бесплатно до 1500 запросов в день</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ChatPage ─────────────────────────────────────────────────────────────

export function ChatPage() {
  const navigate = useNavigate();
  const {
    activeUserId,
    getActiveUser,
    addDiaryEntry,
    addFridgeItem,
    addRecipe,
  } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const user = getActiveUser();
  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Track scroll position for scroll-to-bottom FAB
  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(diff > 100);
  };

  // ─── Send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: text.trim(),
        actionStates: {},
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const history: ChatHistoryItem[] = messages.slice(-14).map((m) => ({
          role: m.role === "user" ? "user" : "model",
          text: m.text,
        }));

        const context = buildAIContext();
        const response = await sendChatMessage(text.trim(), history, context);

        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response.text,
          actions: response.actions ?? [],
          actionStates: Object.fromEntries(
            (response.actions ?? []).map((_, i) => [i, "pending"]),
          ),
          timestamp: new Date(),
          setupRequired: response.setupRequired,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const errMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `Ошибка соединения: ${err instanceof Error ? err.message : String(err)}. Убедись что приложение запущено через netlify dev или задеплоено.`,
          actionStates: {},
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [messages, isLoading],
  );

  // ─── Handle action confirm/dismiss ─────────────────────────────────────────

  const handleAction = useCallback(
    (
      msgId: string,
      actionIdx: number,
      action: ChatAction,
      confirmed: boolean,
    ) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                actionStates: {
                  ...m.actionStates,
                  [actionIdx]: confirmed ? "confirmed" : "dismissed",
                },
              }
            : m,
        ),
      );

      if (!confirmed || !activeUserId) return;

      const d = action.data;

      if (action.type === "ADD_DIARY_ENTRY") {
        const entry: DiaryEntry = {
          id: crypto.randomUUID(),
          userId: activeUserId,
          date: todayStr(),
          mealType: (d.mealType as DiaryEntry["mealType"]) ?? "lunch",
          name: String(d.name ?? "Блюдо"),
          portionWeight: Number(d.portionWeight ?? 100),
          calories: Number(d.calories ?? 0),
          protein: Number(d.protein ?? 0),
          fat: Number(d.fat ?? 0),
          carbs: Number(d.carbs ?? 0),
          createdAt: new Date().toISOString(),
        };
        addDiaryEntry(activeUserId, entry);
      } else if (action.type === "ADD_FRIDGE_ITEM") {
        const item: FridgeItem = {
          id: crypto.randomUUID(),
          name: String(d.name ?? "Продукт"),
          calories: Number(d.calories ?? 0),
          protein: Number(d.protein ?? 0),
          fat: Number(d.fat ?? 0),
          carbs: Number(d.carbs ?? 0),
          amount: Number(d.amount ?? 100),
          unit: String(d.unit ?? "г"),
          userId: activeUserId,
        };
        addFridgeItem(activeUserId, item);
      } else if (action.type === "ADD_RECIPE") {
        const recipe: Recipe = {
          id: crypto.randomUUID(),
          name: String(d.name ?? "Рецепт"),
          description: String(d.description ?? ""),
          photo: undefined,
          ingredients: (d.ingredients as Recipe["ingredients"]) ?? [],
          defaultPortionWeight: Number(d.defaultPortionWeight ?? 200),
          totalCalories: Number(d.totalCalories ?? 0),
          totalProtein: Number(d.totalProtein ?? 0),
          totalFat: Number(d.totalFat ?? 0),
          totalCarbs: Number(d.totalCarbs ?? 0),
          caloriesPer100g: Number(d.caloriesPer100g ?? 0),
          tags: (d.tags as string[]) ?? [],
          userId: activeUserId,
          createdAt: new Date().toISOString(),
        };
        addRecipe(activeUserId, recipe);
      }
    },
    [activeUserId, addDiaryEntry, addFridgeItem, addRecipe],
  );

  // ─── Keyboard submit ────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ─── Empty state — no profile ───────────────────────────────────────────────

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[100svh] bg-[var(--bg)] p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="h-24 w-24 bg-gradient-to-br from-primary-400 to-emerald-600 rounded-3xl flex items-center justify-center mb-5 shadow-lg"
        >
          <Bot className="h-12 w-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
          NutriAI
        </h2>
        <p className="text-[var(--muted)] mb-1">
          Ваш персональный AI-диетолог
        </p>
        <p className="text-sm text-[var(--muted)] opacity-70 mb-6">
          Создайте профиль чтобы начать
        </p>
        <button
          onClick={() => navigate("/users")}
          className="px-6 py-3 rounded-2xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors active:scale-95"
        >
          Создать профиль
        </button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[100svh] bg-[var(--bg)] max-w-lg mx-auto relative">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-gradient-to-r from-primary-500 to-emerald-500 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 shadow-lg">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors active:scale-95 shrink-0"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>

          {/* Bot avatar */}
          <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-base leading-tight">
                NutriAI
              </h1>
              <div className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
            </div>
            <p className="text-white/70 text-xs truncate">
              Персональный AI-диетолог
            </p>
          </div>

          {/* Clear chat */}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors active:scale-95 shrink-0"
              title="Очистить чат"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          )}
        </div>

        {/* Context pill — today's calories */}
        <div className="mt-2.5 flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
          <Flame className="h-3 w-3 text-white/80" />
          <span className="text-white/90 text-xs font-medium">
            Сегодня: {Math.round(buildAIContext()?.todayCalories ?? 0)} / {user.goalCalories ?? "—"} ккал
          </span>
        </div>
      </header>

      {/* ── Messages area ──────────────────────────────────────────────────── */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth overscroll-contain no-scrollbar"
      >
        {/* Welcome state */}
        {!hasMessages && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center pt-8 pb-4"
          >
            <div className="h-16 w-16 bg-gradient-to-br from-primary-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-bold text-[var(--text)] text-lg mb-1">
              Привет, {user.name.split(" ")[0]}! 👋
            </h3>
            <p className="text-[var(--muted)] text-sm max-w-xs leading-relaxed">
              Я знаю твой профиль, что в холодильнике и что ты уже съел сегодня.
              Спроси что угодно!
            </p>

            {/* Suggestion chips grid */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center px-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm transition-all active:scale-95 shadow-sm",
                    "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]",
                    "hover:border-primary-400 dark:hover:border-primary-500/40 hover:text-primary-600 dark:hover:text-primary-400",
                    "hover:bg-primary-50 dark:hover:bg-primary-500/10",
                  )}
                >
                  {s.icon}
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message list */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onAction={handleAction}
              userName={user.name}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* ── Scroll to bottom FAB ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className={cn(
              "absolute bottom-20 right-4 h-9 w-9 rounded-full flex items-center justify-center z-10 shadow-lg transition-colors",
              "bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)]",
            )}
          >
            <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t px-3 pt-2 bg-[var(--surface)] border-[var(--border)] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {/* Quick suggestion chips when conversation active */}
        {hasMessages && !isLoading && (
          <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button
                key={s.text}
                onClick={() => sendMessage(s.text)}
                className={cn(
                  "shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all active:scale-95",
                  "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]",
                  "hover:border-primary-400 dark:hover:border-primary-500/40 hover:text-primary-600 dark:hover:text-primary-400",
                )}
              >
                {s.icon}
                <span className="whitespace-nowrap">
                  {s.text.length > 22 ? s.text.slice(0, 22) + "…" : s.text}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спроси что угодно про питание..."
            disabled={isLoading}
            className={cn(
              "flex-1 h-11 rounded-2xl px-4 text-sm transition-all",
              "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)]",
              "focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400",
              isLoading && "opacity-50 cursor-not-allowed",
            )}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className={cn(
              "h-11 w-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 shrink-0",
              input.trim() && !isLoading
                ? "bg-primary-500 text-white shadow-md hover:bg-primary-600"
                : "bg-[var(--surface-2)] text-[var(--muted)] cursor-not-allowed",
            )}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
