import { useAppStore } from "../store";
import { calculateBMI, calculateBMR, calculateTDEE, todayStr } from "./utils";

// Determine API base depending on where we're running
const API_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/.netlify/functions"
    : "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatHistoryItem {
  role: "user" | "model";
  text: string;
}

export interface ChatAction {
  type: "ADD_DIARY_ENTRY" | "ADD_FRIDGE_ITEM" | "ADD_RECIPE";
  label: string;
  data: Record<string, unknown>;
}

export interface ChatResponse {
  text: string;
  actions: ChatAction[];
  setupRequired?: boolean;
  error?: string;
}

export interface AIContext {
  user: {
    name: string;
    age: number;
    height: number;
    weight: number;
    gender: string;
    activity: string;
    goalCalories: number;
    goalWeight?: number;
    bmi: number;
    tdee: number;
  };
  todayCalories: number;
  todayEntries: Array<{
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    mealType: string;
    portionWeight: number;
  }>;
  recipes: Array<{ name: string; calories: number; portionWeight: number }>;
  fridge: Array<{
    name: string;
    calories: number;
    amount: number;
    unit: string;
  }>;
  weightHistory: Array<{ date: string; weight: number }>;
}

// ─── Context builder ──────────────────────────────────────────────────────────

export function buildAIContext(): AIContext | null {
  const state = useAppStore.getState();
  const user = state.getActiveUser();
  if (!user) return null;

  const userId = state.activeUserId!;
  const today = todayStr();
  const entries = state.getTodayEntries(userId, today);
  const recipes = state.recipes[userId] ?? [];
  const fridgeItems = state.fridge[userId] ?? [];
  const weights = state.weightHistory[userId] ?? [];

  const bmi = calculateBMI(user.weight, user.height);
  const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);
  const tdee = calculateTDEE(bmr, user.activity);

  return {
    user: {
      name: user.name,
      age: user.age,
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      activity: user.activity,
      goalCalories: user.goalCalories ?? Math.round(tdee),
      goalWeight: user.goalWeight,
      bmi,
      tdee,
    },
    todayCalories: entries.reduce((a, e) => a + e.calories, 0),
    todayEntries: entries.map((e) => ({
      name: e.name,
      calories: e.calories,
      protein: e.protein,
      fat: e.fat,
      carbs: e.carbs,
      mealType: e.mealType,
      portionWeight: e.portionWeight,
    })),
    recipes: recipes.slice(0, 10).map((r) => ({
      name: r.name,
      calories: r.totalCalories,
      portionWeight: r.defaultPortionWeight,
    })),
    fridge: fridgeItems.slice(0, 15).map((f) => ({
      name: f.name,
      calories: f.calories,
      amount: f.amount,
      unit: f.unit,
    })),
    weightHistory: weights.slice(-10).map((w) => ({
      date: w.date,
      weight: w.weight,
    })),
  };
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  history: ChatHistoryItem[],
  context: AIContext | null,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, context }),
  });

  if (!res.ok && res.status !== 503) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<ChatResponse>;
}
