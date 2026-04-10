import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  UserProfile,
  WeightEntry,
  Recipe,
  FridgeItem,
  DiaryEntry,
  Chat,
  StoredMessage,
} from "../types";

interface AppStore extends AppState {
  // User actions
  addUser: (user: UserProfile) => void;
  updateUser: (id: string, data: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  setActiveUser: (id: string | null) => void;

  // Weight history
  addWeightEntry: (userId: string, entry: WeightEntry) => void;

  // Recipes
  addRecipe: (userId: string, recipe: Recipe) => void;
  updateRecipe: (userId: string, id: string, data: Partial<Recipe>) => void;
  deleteRecipe: (userId: string, id: string) => void;

  // Fridge
  addFridgeItem: (userId: string, item: FridgeItem) => void;
  updateFridgeItem: (
    userId: string,
    id: string,
    data: Partial<FridgeItem>,
  ) => void;
  deleteFridgeItem: (userId: string, id: string) => void;

  // Diary
  addDiaryEntry: (userId: string, entry: DiaryEntry) => void;
  deleteDiaryEntry: (userId: string, id: string) => void;

  // Chats
  createChat: (userId: string, chat: Chat) => void;
  updateChatMessages: (
    userId: string,
    chatId: string,
    messages: StoredMessage[],
  ) => void;
  updateChatTitle: (userId: string, chatId: string, title: string) => void;
  deleteChat: (userId: string, chatId: string) => void;
  setActiveChatId: (chatId: string | null) => void;

  // Getters
  getActiveUser: () => UserProfile | null;
  getTodayEntries: (userId: string, date: string) => DiaryEntry[];
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      users: [],
      activeUserId: null,
      weightHistory: {},
      recipes: {},
      fridge: {},
      diary: {},
      chats: {},
      activeChatId: null,

      addUser: (user) => set((s) => ({ users: [...s.users, user] })),

      updateUser: (id, data) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
        })),

      deleteUser: (id) =>
        set((s) => ({
          users: s.users.filter((u) => u.id !== id),
          activeUserId: s.activeUserId === id ? null : s.activeUserId,
        })),

      setActiveUser: (id) => set({ activeUserId: id }),

      addWeightEntry: (userId, entry) =>
        set((s) => ({
          weightHistory: {
            ...s.weightHistory,
            [userId]: [...(s.weightHistory[userId] ?? []), entry],
          },
        })),

      addRecipe: (userId, recipe) =>
        set((s) => ({
          recipes: {
            ...s.recipes,
            [userId]: [...(s.recipes[userId] ?? []), recipe],
          },
        })),

      updateRecipe: (userId, id, data) =>
        set((s) => ({
          recipes: {
            ...s.recipes,
            [userId]: (s.recipes[userId] ?? []).map((r) =>
              r.id === id ? { ...r, ...data } : r,
            ),
          },
        })),

      deleteRecipe: (userId, id) =>
        set((s) => ({
          recipes: {
            ...s.recipes,
            [userId]: (s.recipes[userId] ?? []).filter((r) => r.id !== id),
          },
        })),

      addFridgeItem: (userId, item) =>
        set((s) => ({
          fridge: {
            ...s.fridge,
            [userId]: [...(s.fridge[userId] ?? []), item],
          },
        })),

      updateFridgeItem: (userId, id, data) =>
        set((s) => ({
          fridge: {
            ...s.fridge,
            [userId]: (s.fridge[userId] ?? []).map((i) =>
              i.id === id ? { ...i, ...data } : i,
            ),
          },
        })),

      deleteFridgeItem: (userId, id) =>
        set((s) => ({
          fridge: {
            ...s.fridge,
            [userId]: (s.fridge[userId] ?? []).filter((i) => i.id !== id),
          },
        })),

      addDiaryEntry: (userId, entry) =>
        set((s) => ({
          diary: {
            ...s.diary,
            [userId]: [...(s.diary[userId] ?? []), entry],
          },
        })),

      deleteDiaryEntry: (userId, id) =>
        set((s) => ({
          diary: {
            ...s.diary,
            [userId]: (s.diary[userId] ?? []).filter((e) => e.id !== id),
          },
        })),

      createChat: (userId, chat) =>
        set((s) => ({
          chats: {
            ...s.chats,
            [userId]: [chat, ...(s.chats[userId] ?? [])],
          },
          activeChatId: chat.id,
        })),

      updateChatMessages: (userId, chatId, messages) =>
        set((s) => ({
          chats: {
            ...s.chats,
            [userId]: (s.chats[userId] ?? []).map((c) =>
              c.id === chatId
                ? { ...c, messages, updatedAt: new Date().toISOString() }
                : c,
            ),
          },
        })),

      updateChatTitle: (userId, chatId, title) =>
        set((s) => ({
          chats: {
            ...s.chats,
            [userId]: (s.chats[userId] ?? []).map((c) =>
              c.id === chatId ? { ...c, title } : c,
            ),
          },
        })),

      deleteChat: (userId, chatId) =>
        set((s) => {
          const remaining = (s.chats[userId] ?? []).filter(
            (c) => c.id !== chatId,
          );
          return {
            chats: { ...s.chats, [userId]: remaining },
            activeChatId:
              s.activeChatId === chatId
                ? (remaining[0]?.id ?? null)
                : s.activeChatId,
          };
        }),

      setActiveChatId: (chatId) => set({ activeChatId: chatId }),

      getActiveUser: () => {
        const { users, activeUserId } = get();
        return users.find((u) => u.id === activeUserId) ?? null;
      },

      getTodayEntries: (userId, date) => {
        const { diary } = get();
        return (diary[userId] ?? []).filter((e) => e.date === date);
      },
    }),
    { name: "calories-tracker-store" },
  ),
);
