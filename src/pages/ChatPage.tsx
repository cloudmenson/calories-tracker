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
import type { Chat, DiaryEntry, Recipe, StoredMessage } from "../types";
import {
  Send,
  Sparkles,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ImagePlus,
  UtensilsCrossed,
  ShoppingBasket,
  ChefHat,
  Zap,
  Flame,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  PanelLeft,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  image?: string;
  actions?: ChatAction[];
  actionStates: Record<number, "pending" | "confirmed" | "dismissed">;
  timestamp: Date;
  setupRequired?: boolean;
}

function toStoredMessage(m: Message): StoredMessage {
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    image: m.image ? m.image.substring(0, 64) + "…" : undefined,
    actions: m.actions,
    actionStates: m.actionStates,
    timestamp:
      m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    setupRequired: m.setupRequired,
  };
}

function fromStoredMessage(m: StoredMessage): Message {
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    image: m.image?.endsWith("…") ? undefined : m.image,
    actions: m.actions as ChatAction[] | undefined,
    actionStates: m.actionStates,
    timestamp: new Date(m.timestamp),
    setupRequired: m.setupRequired,
  };
}

function chatTitle(text: string): string {
  return text.trim().slice(0, 40) + (text.trim().length > 40 ? "…" : "");
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════════ */

const SUGGESTIONS = [
  { text: "Что мне съесть?", icon: <UtensilsCrossed className="h-4 w-4" /> },
  { text: "Анализ за сегодня", icon: <Flame className="h-4 w-4" /> },
  {
    text: "Рецепт из холодильника",
    icon: <ShoppingBasket className="h-4 w-4" />,
  },
  { text: "Сколько калорий осталось?", icon: <Zap className="h-4 w-4" /> },
  { text: "Составь план питания", icon: <ChefHat className="h-4 w-4" /> },
];

const ACTION_ICONS: Record<string, React.ReactNode> = {
  ADD_DIARY_ENTRY: <UtensilsCrossed className="h-4 w-4" />,
  ADD_FRIDGE_ITEM: <ShoppingBasket className="h-4 w-4" />,
  ADD_RECIPE: <ChefHat className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  ADD_DIARY_ENTRY: "border-green-500/20 bg-green-500/5 hover:bg-green-500/10",
  ADD_FRIDGE_ITEM: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10",
  ADD_RECIPE: "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10",
};

const ACTION_BTN: Record<string, string> = {
  ADD_DIARY_ENTRY: "bg-green-500 hover:bg-green-600",
  ADD_FRIDGE_ITEM: "bg-blue-500 hover:bg-blue-600",
  ADD_RECIPE: "bg-purple-500 hover:bg-purple-600",
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Thinking dots
   ═══════════════════════════════════════════════════════════════════════════════ */

function ThinkingDots() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 py-4 px-1"
    >
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Action card
   ═══════════════════════════════════════════════════════════════════════════════ */

function ActionCard({
  action,
  state,
  onConfirm,
  onDismiss,
}: {
  action: ChatAction;
  state: "pending" | "confirmed" | "dismissed";
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: state === "dismissed" ? 0.4 : 1, y: 0 }}
      className={cn(
        "rounded-xl border p-3 transition-all",
        ACTION_COLORS[action.type] ??
          "border-[var(--border)] bg-[var(--surface)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="text-[var(--muted)]">{ACTION_ICONS[action.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text)] leading-tight">
            {action.label}
          </p>
          {action.data.calories !== undefined && (
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {Math.round(Number(action.data.calories))} ккал
              {action.data.portionWeight
                ? ` · ${action.data.portionWeight}г`
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
                ACTION_BTN[action.type] ??
                  "bg-primary-500 hover:bg-primary-600",
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDismiss}
              className="h-7 w-7 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] flex items-center justify-center transition-all active:scale-95"
            >
              <X className="h-3.5 w-3.5 text-[var(--muted)]" />
            </button>
          </div>
        )}
        {state === "confirmed" && (
          <div className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        )}
        {state === "dismissed" && (
          <div className="h-7 w-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center shrink-0">
            <X className="h-3.5 w-3.5 text-[var(--muted)]" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Message component
   ═══════════════════════════════════════════════════════════════════════════════ */

function GeminiMessage({
  message,
  onAction,
}: {
  message: Message;
  onAction: (
    msgId: string,
    idx: number,
    action: ChatAction,
    confirmed: boolean,
  ) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-end gap-1 mb-6"
      >
        {message.image && (
          <img
            src={message.image}
            alt="Фото"
            className="max-w-[220px] rounded-2xl border border-[var(--border)] shadow-sm"
          />
        )}
        <div className="max-w-[85%] bg-[var(--surface-2)] rounded-2xl rounded-tr-md px-4 py-2.5">
          <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
            {message.text}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">NutriAI</span>
      </div>

      <div className="pl-9 text-sm leading-relaxed text-[var(--text)]">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="text-[var(--text)]">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-[var(--text)]">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="text-[var(--muted)]">{children}</em>
              ),
              ul: ({ children }) => (
                <ul className="ml-4 space-y-0.5 list-disc marker:text-[var(--muted)]">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="ml-4 space-y-0.5 list-decimal marker:text-[var(--muted)]">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-[var(--text)]">{children}</li>
              ),
              h1: ({ children }) => (
                <p className="text-base font-bold text-[var(--text)]">
                  {children}
                </p>
              ),
              h2: ({ children }) => (
                <p className="text-base font-semibold text-[var(--text)]">
                  {children}
                </p>
              ),
              h3: ({ children }) => (
                <p className="text-sm font-semibold text-[var(--text)]">
                  {children}
                </p>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 underline underline-offset-2"
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-[var(--surface-2)] text-[var(--text)] px-1.5 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>

        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.actions.map((action, idx) => (
              <ActionCard
                key={idx}
                action={action}
                state={message.actionStates[idx] ?? "pending"}
                onConfirm={() => onAction(message.id, idx, action, true)}
                onDismiss={() => onAction(message.id, idx, action, false)}
              />
            ))}
          </div>
        )}

        {message.setupRequired && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
            <p className="font-semibold mb-1">🔑 Нужен API ключ</p>
            <p>Gemini API — бесплатно до 1500 запросов в день</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Image helpers
   ═══════════════════════════════════════════════════════════════════════════════ */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string, maxW = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, maxW / img.width);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Chat Sidebar
   ═══════════════════════════════════════════════════════════════════════════════ */

function ChatSidebar({
  chats,
  activeChatId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return "Сегодня";
    if (days === 1) return "Вчера";
    if (days < 7) return `${days} дн. назад`;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }

  const groups: Record<string, Chat[]> = {};
  for (const chat of chats) {
    const label = formatDate(chat.updatedAt);
    groups[label] ??= [];
    groups[label].push(chat);
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border-r border-[var(--border)]">
      <div className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-[var(--border)]">
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center transition active:scale-95"
        >
          <PanelLeft className="h-5 w-5 text-[var(--muted)]" />
        </button>
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="flex-1 text-sm font-semibold text-[var(--text)]">
          История
        </span>
        <button
          onClick={onNew}
          className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center transition active:scale-95"
          title="Новый чат"
        >
          <Plus className="h-5 w-5 text-[var(--muted)]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center py-12">
            <MessageSquare className="h-10 w-10 text-[var(--border)]" />
            <p className="text-sm text-[var(--muted)]">Нет бесед</p>
            <button
              onClick={onNew}
              className="text-sm text-primary-500 font-medium"
            >
              Начать новую
            </button>
          </div>
        ) : (
          Object.entries(groups).map(([label, groupChats]) => (
            <div key={label}>
              <p className="px-4 py-1.5 text-xs text-[var(--muted)] font-medium">
                {label}
              </p>
              {groupChats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-all",
                    activeChatId === chat.id
                      ? "bg-primary-500/10"
                      : "hover:bg-[var(--surface-2)]",
                  )}
                  onClick={() => {
                    onSelect(chat.id);
                    onClose();
                  }}
                >
                  <MessageSquare
                    className={cn(
                      "h-4 w-4 shrink-0",
                      activeChatId === chat.id
                        ? "text-primary-500"
                        : "text-[var(--muted)]",
                    )}
                  />
                  <span className="flex-1 text-sm text-[var(--text)] truncate leading-tight">
                    {chat.title}
                  </span>

                  {deleteConfirm === chat.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(chat.id);
                          setDeleteConfirm(null);
                        }}
                        className="h-6 w-6 rounded-md bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(null);
                        }}
                        className="h-6 w-6 rounded-md bg-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition"
                      >
                        <X className="h-3 w-3 text-[var(--muted)]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(chat.id);
                      }}
                      className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-500/10 transition shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[var(--muted)] hover:text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main ChatPage
   ═══════════════════════════════════════════════════════════════════════════════ */

export function ChatPage() {
  const navigate = useNavigate();
  const {
    activeUserId,
    activeChatId,
    getActiveUser,
    addDiaryEntry,
    addFridgeItem,
    addRecipe,
    createChat,
    updateChatMessages,
    updateChatTitle,
    deleteChat,
    setActiveChatId,
    chats: allChats,
  } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = getActiveUser();
  const userChats = activeUserId ? (allChats[activeUserId] ?? []) : [];
  const hasMessages = messages.length > 0;

  /* ─── Load messages when activeChatId changes ─── */
  // Blocks the load effect during first-message send to prevent race condition:
  // createChat() changes activeChatId → effect fires → resets messages to []
  const blockLoadRef = useRef(false);
  useEffect(() => {
    if (blockLoadRef.current) return;
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const chat = userChats.find((c) => c.id === activeChatId);
    setMessages(chat ? chat.messages.map(fromStoredMessage) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  /* ─── Persist messages to store on change ─── */
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeChatId || !activeUserId || messages.length === 0) return;
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      updateChatMessages(
        activeUserId,
        activeChatId,
        messages.map(toStoredMessage),
      );
    }, 400);
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  /* ─── Auto-scroll ─── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  /* ─── Auto-resize textarea ─── */
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  /* ─── Image pick ─── */
  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToBase64(file);
    const compressed = await compressImage(raw);
    setImagePreview(compressed);
    e.target.value = "";
  };

  /* ─── New chat ─── */
  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setInput("");
    setImagePreview(null);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [setActiveChatId]);

  /* ─── Send ─── */
  const sendMessage = useCallback(
    async (text: string) => {
      if ((!text.trim() && !imagePreview) || isLoading) return;
      if (!activeUserId) return;

      const currentImage = imagePreview;
      const isFirstMessage = messages.length === 0;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: text.trim() || (currentImage ? "Проанализируй это фото" : ""),
        image: currentImage ?? undefined,
        actionStates: {},
        timestamp: new Date(),
      };

      let chatId = activeChatId;
      if (isFirstMessage || !chatId) {
        blockLoadRef.current = true; // prevent activeChatId effect from wiping messages
        const now = new Date().toISOString();
        const newChat: Chat = {
          id: crypto.randomUUID(),
          userId: activeUserId,
          title: chatTitle(userMsg.text),
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        createChat(activeUserId, newChat);
        chatId = newChat.id;
        // Unblock after React flushes the activeChatId change
        requestAnimationFrame(() => {
          blockLoadRef.current = false;
        });
      }

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setImagePreview(null);
      setIsLoading(true);

      try {
        const history: ChatHistoryItem[] = messages.slice(-14).map((m) => ({
          role: m.role === "user" ? "user" : "model",
          text: m.text,
        }));
        const context = buildAIContext();
        const response = await sendChatMessage(
          userMsg.text,
          history,
          context,
          currentImage ?? undefined,
        );

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
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: `Ошибка: ${err instanceof Error ? err.message : String(err)}`,
            actionStates: {},
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [messages, isLoading, imagePreview, activeUserId, activeChatId, createChat],
  );

  /* ─── Action handler ─── */
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
        addDiaryEntry(activeUserId, {
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
        });
      } else if (action.type === "ADD_FRIDGE_ITEM") {
        addFridgeItem(activeUserId, {
          id: crypto.randomUUID(),
          name: String(d.name ?? "Продукт"),
          calories: Number(d.calories ?? 0),
          protein: Number(d.protein ?? 0),
          fat: Number(d.fat ?? 0),
          carbs: Number(d.carbs ?? 0),
          amount: Number(d.amount ?? 100),
          unit: String(d.unit ?? "г"),
          userId: activeUserId,
        });
      } else if (action.type === "ADD_RECIPE") {
        addRecipe(activeUserId, {
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
        });
      }
    },
    [activeUserId, addDiaryEntry, addFridgeItem, addRecipe],
  );

  /* ─── Key handler ─── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ─── No profile ─── */
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[100svh] bg-[var(--bg)] p-8 text-center">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center mb-5">
          <Sparkles className="h-9 w-9 text-white" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">NutriAI</h2>
        <p className="text-[var(--muted)] text-sm mb-6">
          Создайте профиль чтобы начать
        </p>
        <button
          onClick={() => navigate("/users")}
          className="px-6 py-3 rounded-full bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition active:scale-95"
        >
          Создать профиль
        </button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex h-[100svh] bg-[var(--bg)] w-full relative overflow-hidden">
      {/* ── Sidebar overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 z-20"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute left-0 top-0 h-full w-72 z-30"
            >
              <ChatSidebar
                chats={userChats}
                activeChatId={activeChatId}
                onSelect={(id) => setActiveChatId(id)}
                onNew={handleNewChat}
                onDelete={(id) => {
                  if (activeUserId) deleteChat(activeUserId, id);
                }}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 border-b border-[var(--border)] bg-[var(--bg)]">
          <button
            onClick={() => navigate("/")}
            className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center transition active:scale-95"
          >
            <ChevronLeft className="h-5 w-5 text-[var(--muted)]" />
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center transition active:scale-95"
            title="История чатов"
          >
            <PanelLeft className="h-5 w-5 text-[var(--muted)]" />
          </button>

          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text)] leading-tight truncate">
              {activeChatId
                ? (userChats.find((c) => c.id === activeChatId)?.title ??
                  "NutriAI")
                : "NutriAI"}
            </h1>
            <p className="text-xs text-[var(--muted)] truncate">
              {Math.round(buildAIContext()?.todayCalories ?? 0)} /{" "}
              {user.goalCalories ?? "—"} ккал сегодня
            </p>
          </div>

          <button
            onClick={handleNewChat}
            className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center transition active:scale-95"
            title="Новый чат"
          >
            <Plus className="h-5 w-5 text-[var(--muted)]" />
          </button>
        </header>

        {/* Messages */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scroll-smooth overscroll-contain no-scrollbar"
        >
          <div className="max-w-2xl mx-auto px-4 py-4">
            {!hasMessages && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center pt-12 pb-6"
              >
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center mb-5">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text)] mb-1">
                  Привет, {user.name.split(" ")[0]}
                </h2>
                <p className="text-sm text-[var(--muted)] text-center max-w-xs mb-8">
                  Чем могу помочь? Можешь написать или отправить фото блюда
                </p>
                <div className="w-full flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => sendMessage(s.text)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all active:scale-[0.97]",
                        "border-[var(--border)] text-[var(--text)] bg-transparent",
                        "hover:bg-[var(--surface-2)] hover:border-primary-500/30",
                      )}
                    >
                      <span className="text-[var(--muted)]">{s.icon}</span>
                      {s.text}
                    </button>
                  ))}
                </div>
                {userChats.length > 0 && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="mt-6 text-sm text-primary-500 flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {userChats.length}{" "}
                    {userChats.length === 1
                      ? "беседа"
                      : userChats.length < 5
                        ? "беседы"
                        : "бесед"}{" "}
                    сохранено
                  </button>
                )}
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <GeminiMessage
                  key={msg.id}
                  message={msg}
                  onAction={handleAction}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isLoading && <ThinkingDots key="thinking" />}
            </AnimatePresence>

            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Scroll FAB */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 right-4 h-9 w-9 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-lg flex items-center justify-center z-10 hover:bg-[var(--surface-2)] transition"
            >
              <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="shrink-0 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[var(--bg)]">
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="mb-2 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Фото"
                    className="h-20 rounded-xl border border-[var(--border)]"
                  />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-sm"
                  >
                    <X className="h-3 w-3 text-[var(--muted)]" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "flex items-end gap-1 rounded-3xl border transition-all",
              "bg-[var(--surface)] border-[var(--border)]",
              "focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/20",
              "px-2 py-1.5",
            )}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center transition shrink-0 active:scale-95"
            >
              <ImagePlus className="h-5 w-5 text-[var(--muted)]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              disabled={isLoading}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] py-2 px-1",
                "focus:outline-none max-h-[120px]",
                isLoading && "opacity-50",
              )}
            />

            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && !imagePreview) || isLoading}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95",
                (input.trim() || imagePreview) && !isLoading
                  ? "bg-primary-500 text-white shadow-sm hover:bg-primary-600"
                  : "text-[var(--muted)]",
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {hasMessages && !isLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-0.5">
                  {SUGGESTIONS.slice(0, 3).map((s) => (
                    <button
                      key={s.text}
                      onClick={() => sendMessage(s.text)}
                      className="shrink-0 text-xs rounded-full border border-[var(--border)] px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition active:scale-95"
                    >
                      {s.text}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
