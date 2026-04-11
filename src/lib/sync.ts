import { useEffect, useRef } from "react";
import { useAppStore } from "../store";

const API_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/.netlify/functions"
    : "/api";

// Load state from MongoDB on app start
export async function loadRemoteState(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/sync`);
    if (!res.ok || res.status === 204) return; // not configured or empty
    const remote = (await res.json()) as Record<string, unknown>;
    if (!remote || typeof remote !== "object") return;

    // Merge: remote wins for users/diary/recipes/fridge/weights
    // but keep local activeChatId / chats (device-local UI state)
    const store = useAppStore.getState();
    const local = {
      users: store.users,
      activeUserId: store.activeUserId,
      weightHistory: store.weightHistory,
      recipes: store.recipes,
      fridge: store.fridge,
      diary: store.diary,
    };

    // Only apply if remote has actual data (non-empty users array)
    const remoteUsers = remote.users as unknown[];
    if (!Array.isArray(remoteUsers) || remoteUsers.length === 0) return;

    // Remote has more or equal data — use it
    useAppStore.setState({
      users: (remote.users as typeof local.users) ?? local.users,
      activeUserId:
        (remote.activeUserId as string | null) ?? local.activeUserId,
      weightHistory:
        (remote.weightHistory as typeof local.weightHistory) ??
        local.weightHistory,
      recipes: (remote.recipes as typeof local.recipes) ?? local.recipes,
      fridge: (remote.fridge as typeof local.fridge) ?? local.fridge,
      diary: (remote.diary as typeof local.diary) ?? local.diary,
    });
  } catch {
    // Silently ignore — offline or MongoDB not configured
  }
}

// Save state to MongoDB (debounced)
async function saveRemoteState(): Promise<void> {
  try {
    const store = useAppStore.getState();
    await fetch(`${API_BASE}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: store.users,
        activeUserId: store.activeUserId,
        weightHistory: store.weightHistory,
        recipes: store.recipes,
        fridge: store.fridge,
        diary: store.diary,
      }),
    });
  } catch {
    // Silently ignore
  }
}

// React hook — call once in App.tsx
export function useSyncWithMongo() {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load on mount
    loadRemoteState();

    // Subscribe to store changes and debounce-save
    const unsub = useAppStore.subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(saveRemoteState, 2000);
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);
}
